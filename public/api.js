// Updated API using Consumet for movies, anime, and manga

// Main API endpoints
const API = {
  base: 'https://api.consumet.org',
  anime: {
    gogoanime: '/anime/gogoanime',
    animepahe: '/anime/animepahe',
    zoro: '/anime/zoro'
  },
  movies: {
    flixhq: '/movies/flixhq',
    dramacool: '/movies/dramacool'
  },
  manga: {
    mangadex: '/manga/mangadex',
    mangakakalot: '/manga/mangakakalot'
  },
  meta: {
    anilist: '/meta/anilist'
  }
};

const api = {
  // Providers
  providers: {
    anime: 'gogoanime', // Default anime provider
    movies: 'flixhq', // Default movie provider
    manga: 'mangadex' // Default manga provider
  },

  // Helper function for API calls
  async fetchAPI(endpoint, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = `${API.base}${endpoint}${queryParams ? '?' + queryParams : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API fetch error:', error);
      throw error;
    }
  },

  movies: {
    async search(query) {
      const provider = api.providers.movies;
      const endpoint = `${API.movies[provider]}/search`;
      const data = await api.fetchAPI(endpoint, { query });
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        year: item.releaseDate,
        rating: item.rating ? `${item.rating}%` : 'N/A',
        description: item.description || 'No description available',
        overview: item.description || 'No description available',
        type: item.type?.toLowerCase() || 'movie',
        mediaType: item.type || 'Movie'
      }));
    },

    async getDetails(id) {
      const provider = api.providers.movies;
      const endpoint = `${API.movies[provider]}/info`;
      const item = await api.fetchAPI(endpoint, { id });
      
      return {
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        cover: item.cover,
        year: item.releaseDate,
        rating: item.rating ? `${item.rating}%` : 'N/A',
        description: item.description || 'No description available',
        overview: item.description || 'No description available',
        genres: item.genres || [],
        type: item.type?.toLowerCase() || 'movie',
        mediaType: item.type || 'Movie',
        status: item.status || 'Released',
        duration: item.duration || 'N/A',
        production: item.production || 'N/A',
        casts: item.casts || [],
        tags: item.tags || [],
        totalEpisodes: item.episodes?.length || 0,
        seasons: item.seasons || [],
        episodes: []  // Will be populated by getEpisodes when needed
      };
    },

    async getTrending() {
      const provider = api.providers.movies;
      const endpoint = `${API.movies[provider]}/trending`;
      const data = await api.fetchAPI(endpoint);
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        year: item.releaseDate,
        rating: item.rating ? `${item.rating}%` : 'N/A',
        description: item.description || 'No description available',
        overview: item.description || 'No description available',
        type: item.type?.toLowerCase() || 'movie',
        mediaType: item.type || 'Movie'
      }));
    },

    async getEpisodes(id) {
      try {
        const provider = api.providers.movies;
        const endpoint = `${API.movies[provider]}/info`;
        const data = await api.fetchAPI(endpoint, { id });
        
        if (!data.episodes || data.episodes.length === 0) {
          return [];
        }
        
        return data.episodes.map(episode => ({
          id: episode.id,
          number: episode.number?.toString() || '1',
          season: episode.season?.toString() || '1',
          title: episode.title || `Episode ${episode.number}`,
          duration: episode.duration || 'N/A',
          description: episode.description || `Episode ${episode.number}`,
          still: episode.image || data.image
        }));
      } catch (error) {
        console.error("Error fetching episodes:", error);
        return [];
      }
    },
    
    async getStreamingSources(episodeId, mediaId) {
      try {
        const provider = api.providers.movies;
        const endpoint = `${API.movies[provider]}/watch`;
        const data = await api.fetchAPI(endpoint, { episodeId, mediaId });
        
        const sources = data.sources.map(source => ({
          url: source.url,
          type: source.isM3U8 ? 'application/x-mpegURL' : 'video/mp4',
          quality: source.quality
        }));
        
        const subtitles = data.subtitles?.map(subtitle => ({
          lang: subtitle.lang,
          label: subtitle.lang,
          url: subtitle.url
        })) || [];
        
        return { sources, subtitles };
      } catch (error) {
        console.error("Error fetching streaming sources:", error);
        return { sources: [], subtitles: [] };
      }
    }
  },

  anime: {
    async search(query) {
      const provider = api.providers.anime;
      const endpoint = `${API.anime[provider]}/search`;
      const data = await api.fetchAPI(endpoint, { query });
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        year: item.releaseDate,
        rating: item.rating ? `${item.rating}%` : 'N/A',
        type: 'anime',
        mediaType: 'Anime',
        description: item.description || 'No description available',
        overview: item.description || 'No description available',
        status: item.status,
        subOrDub: item.subOrDub
      }));
    },

    async getDetails(id) {
      const provider = api.providers.anime;
      const endpoint = `${API.anime[provider]}/info`;
      const item = await api.fetchAPI(endpoint, { id });
      
      // Also fetch more detailed metadata from AniList if available
      let anilistData = {};
      if (item.malId) {
        try {
          const metaEndpoint = `${API.meta.anilist}/info`;
          anilistData = await api.fetchAPI(metaEndpoint, { id: item.malId });
        } catch (error) {
          console.error("Error fetching AniList metadata:", error);
        }
      }
      
      return {
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        cover: anilistData.cover || item.image,
        description: item.description || anilistData.description || 'No description available',
        overview: item.description || anilistData.description || 'No description available',
        rating: anilistData.rating ? `${anilistData.rating}%` : 'N/A',
        year: item.releaseDate || anilistData.releaseDate,
        genres: item.genres || anilistData.genres || [],
        status: item.status || anilistData.status,
        type: 'anime',
        mediaType: 'Anime',
        episodes: item.totalEpisodes || anilistData.totalEpisodes,
        duration: item.duration || anilistData.duration ? `${anilistData.duration} min` : 'N/A',
        subOrDub: item.subOrDub || 'sub',
        season: anilistData.season || '',
        studios: anilistData.studios || [],
        synonyms: anilistData.synonyms || []
      };
    },

    async getTrending() {
      // For anime, we'll use the trending/popular endpoint from AniList meta
      const endpoint = `${API.meta.anilist}/trending`;
      const data = await api.fetchAPI(endpoint);
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title.romaji || item.title.english || item.title.native,
        image: item.image,
        poster: item.image,
        cover: item.cover,
        year: item.releaseDate,
        rating: item.rating ? `${item.rating}%` : 'N/A',
        type: 'anime',
        mediaType: 'Anime',
        description: item.description || 'No description available',
        overview: item.description || 'No description available'
      }));
    },

    async getEpisodes(animeId) {
      try {
        const provider = api.providers.anime;
        const endpoint = `${API.anime[provider]}/info`;
        const data = await api.fetchAPI(endpoint, { id: animeId });
        
        if (!data.episodes || data.episodes.length === 0) {
          return [];
        }
        
        return data.episodes.map(episode => ({
          id: episode.id,
          number: episode.number.toString(),
          title: episode.title || `Episode ${episode.number}`,
          duration: episode.duration || 'N/A',
          description: episode.description || `Episode ${episode.number} of ${data.title}`,
          still: episode.image || data.image
        }));
      } catch (error) {
        console.error("Error fetching anime episodes:", error);
        return [];
      }
    },

    async getEpisodeSources(episodeId) {
      try {
        const provider = api.providers.anime;
        const endpoint = `${API.anime[provider]}/watch`;
        const data = await api.fetchAPI(endpoint, { episodeId });
        
        const sources = data.sources.map(source => ({
          url: source.url,
          type: source.isM3U8 ? 'application/x-mpegURL' : 'video/mp4',
          quality: source.quality
        }));
        
        const subtitles = data.subtitles?.map(subtitle => ({
          lang: subtitle.lang,
          label: subtitle.lang,
          url: subtitle.url
        })) || [];
        
        return { sources, subtitles };
      } catch (error) {
        console.error("Error fetching episode sources:", error);
        return { sources: [], subtitles: [] };
      }
    }
  },

  manga: {
    async search(query) {
      const provider = api.providers.manga;
      const endpoint = `${API.manga[provider]}/search`;
      const data = await api.fetchAPI(endpoint, { query });
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        year: item.releaseDate || 'N/A',
        rating: item.rating ? `${item.rating}%` : 'N/A',
        type: 'manga',
        mediaType: 'Manga',
        description: item.description || 'No description available',
        overview: item.description || 'No description available'
      }));
    },
    
    async getDetails(id) {
      const provider = api.providers.manga;
      const endpoint = `${API.manga[provider]}/info`;
      const item = await api.fetchAPI(endpoint, { id });
      
      return {
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        cover: item.cover || item.image,
        description: item.description || 'No description available',
        overview: item.description || 'No description available',
        rating: item.rating ? `${item.rating}%` : 'N/A',
        year: item.releaseDate || 'N/A',
        genres: item.genres || [],
        status: item.status || 'Unknown',
        type: 'manga',
        mediaType: 'Manga',
        chapters: item.chapters?.length || 0,
        author: item.author || 'Unknown',
        altTitles: item.altTitles || []
      };
    },
    
    async getTrending() {
      const provider = api.providers.manga;
      const endpoint = `${API.manga[provider]}/trending`;
      const data = await api.fetchAPI(endpoint);
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        poster: item.image,
        year: item.releaseDate || 'N/A',
        rating: item.rating ? `${item.rating}%` : 'N/A',
        type: 'manga',
        mediaType: 'Manga',
        description: item.description || 'No description available',
        overview: item.description || 'No description available'
      }));
    },
    
    async getChapters(mangaId) {
      try {
        const provider = api.providers.manga;
        const endpoint = `${API.manga[provider]}/info`;
        const data = await api.fetchAPI(endpoint, { id: mangaId });
        
        if (!data.chapters || data.chapters.length === 0) {
          return [];
        }
        
        return data.chapters.map(chapter => ({
          id: chapter.id,
          number: chapter.number?.toString() || '0',
          title: chapter.title || `Chapter ${chapter.number}`,
          releaseDate: chapter.releaseDate || 'N/A'
        }));
      } catch (error) {
        console.error("Error fetching manga chapters:", error);
        return [];
      }
    },
    
    async getChapterPages(chapterId) {
      try {
        const provider = api.providers.manga;
        const endpoint = `${API.manga[provider]}/read`;
        const data = await api.fetchAPI(endpoint, { chapterId });
        
        if (!data.pages || data.pages.length === 0) {
          return { pages: [] };
        }
        
        return {
          pages: data.pages.map((page, index) => ({
            id: index + 1,
            url: page,
            number: index + 1
          }))
        };
      } catch (error) {
        console.error("Error fetching chapter pages:", error);
        return { pages: [] };
      }
    }
  },

  // Additional helper methods to retrieve content
  async getTopPerformers(category) {
    if (category === 'movies' || category === 'movie') {
      return this.movies.getTrending();
    } else if (category === 'anime') {
      return this.anime.getTrending();
    } else if (category === 'manga') {
      return this.manga.getTrending();
    }
    return [];
  },

  async getCategoryContent(category) {
    return this.getTopPerformers(category);
  },

  async getContentDetails(id, type) {
    if (type === 'movie' || type === 'movies') {
      return this.movies.getDetails(id);
    } else if (type === 'tv') {
      return this.movies.getDetails(id);
    } else if (type === 'anime') {
      return this.anime.getDetails(id);
    } else if (type === 'manga') {
      return this.manga.getDetails(id);
    }
    return null;
  },

  async getStreamUrl(id, type, episodeId) {
    if (type === 'movie' || type === 'movies' || type === 'tv') {
      const sources = await this.movies.getStreamingSources(episodeId, id);
      if (sources.sources && sources.sources.length > 0) {
        return {
          url: sources.sources[0].url,
          type: sources.sources[0].type
        };
      }
    } else if (type === 'anime') {
      const sources = await this.anime.getEpisodeSources(episodeId);
      if (sources.sources && sources.sources.length > 0) {
        return {
          url: sources.sources[0].url,
          type: sources.sources[0].type
        };
      }
    }
    return null;
  },

  async getEpisodes(id, type) {
    if (type === 'tv' || type === 'movies' || type === 'movie') {
      return this.movies.getEpisodes(id);
    } else if (type === 'anime') {
      return this.anime.getEpisodes(id);
    }
    return [];
  },

  async searchContent(query, category, options = {}) {
    const results = [];
    
    if (category === 'all' || category === 'movies') {
      const movieResults = await this.movies.search(query);
      results.push(...movieResults);
    }
    
    if (category === 'all' || category === 'anime') {
      const animeResults = await this.anime.search(query);
      results.push(...animeResults);
    }
    
    if (category === 'all' || category === 'manga') {
      const mangaResults = await this.manga.search(query);
      results.push(...mangaResults);
    }
    
    // Apply filters and sorting if needed
    let filteredResults = results;
    
    if (options.filter && options.filter !== 'all') {
      filteredResults = results.filter(item => {
        if (options.filter === 'movie') return item.type === 'movie';
        if (options.filter === 'tv') return item.type === 'tv';
        if (options.filter === 'anime') return item.type === 'anime';
        if (options.filter === 'manga') return item.type === 'manga';
        return true;
      });
    }
    
    // Sort results
    if (options.sort === 'newest') {
      filteredResults.sort((a, b) => {
        const yearA = parseInt(a.year) || 0;
        const yearB = parseInt(b.year) || 0;
        return yearB - yearA;
      });
    } else if (options.sort === 'rating') {
      filteredResults.sort((a, b) => {
        const ratingA = parseFloat(a.rating?.replace('%', '') || 0);
        const ratingB = parseFloat(b.rating?.replace('%', '') || 0);
        return ratingB - ratingA;
      });
    }
    
    return filteredResults;
  },

  getAPI(category) {
    if (category === 'anime') return this.anime;
    if (category === 'movies') return this.movies;
    if (category === 'manga') return this.manga;
    return null;
  },

  player: {
    initVideoPlayer(videoElement) {
      return new Plyr(videoElement, {
        controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen']
      });
    },
    
    setVideoSource(player, sources, subtitles = []) {
      if (!sources || sources.length === 0) return;
      
      const sourcesConfig = sources.map(src => ({
        src: src.url,
        type: src.type || 'video/mp4',
        size: src.quality?.replace('p', '') || 720
      }));
      
      const trackConfig = subtitles.map(sub => ({
        kind: 'subtitles',
        label: sub.label,
        srclang: sub.lang,
        src: sub.url,
        default: sub.lang === 'en'
      }));
      
      player.source = {
        type: 'video',
        sources: sourcesConfig,
        tracks: trackConfig
      };
    },
    
    initMangaReader(container) {
      return {
        loadPages(pagesData) {
          container.innerHTML = '';
          const pages = pagesData.pages || [];
          if (pages.length === 0) {
            container.innerHTML = '<div class="no-content">No pages available.</div>';
            return;
          }
          const fragment = document.createDocumentFragment();
          pages.forEach(page => {
            const img = document.createElement('img');
            img.src = page.url;
            img.alt = `Page ${page.number}`;
            img.className = 'manga-page';
            img.loading = 'lazy';
            fragment.appendChild(img);
          });
          container.appendChild(fragment);
        }
      };
    }
  },
  
  // Helper function to render episode list in UI
  renderEpisodesList(container, episodes, mediaId, mediaType, onEpisodeClick) {
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Create episodes list
    if (!episodes || episodes.length === 0) {
      container.innerHTML = '<div class="no-episodes">No episodes available for this content.</div>';
      return;
    }
    
    // Create list container
    const episodesList = document.createElement('div');
    episodesList.className = 'episodes-list';
    
    // Add each episode
    episodes.forEach(episode => {
      const episodeItem = document.createElement('div');
      episodeItem.className = 'episode-item';
      episodeItem.dataset.id = episode.id;
      episodeItem.dataset.number = episode.number;
      
      // Create thumbnail if available
      if (episode.still) {
        const thumbnail = document.createElement('div');
        thumbnail.className = 'episode-thumbnail';
        const img = document.createElement('img');
        img.src = episode.still;
        img.alt = `Episode ${episode.number}`;
        img.loading = 'lazy';
        thumbnail.appendChild(img);
        episodeItem.appendChild(thumbnail);
      }
      
      // Episode info
      const info = document.createElement('div');
      info.className = 'episode-info';
      
      const title = document.createElement('h3');
      title.className = 'episode-title';
      title.textContent = episode.title;
      
      const details = document.createElement('div');
      details.className = 'episode-details';
      details.innerHTML = `
        <span class="episode-number">Episode ${episode.number}</span>
        ${episode.season ? `<span class="episode-season">Season ${episode.season}</span>` : ''}
        <span class="episode-duration">${episode.duration}</span>
      `;
      
      const description = document.createElement('p');
      description.className = 'episode-description';
      description.textContent = episode.description || 'No description available.';
      
      info.appendChild(title);
      info.appendChild(details);
      info.appendChild(description);
      
      episodeItem.appendChild(info);
      
      // Play button
      const playBtn = document.createElement('button');
      playBtn.className = 'episode-play-btn';
      playBtn.innerHTML = '<i class="fas fa-play"></i>';
      episodeItem.appendChild(playBtn);
      
      // Add click event
      episodeItem.addEventListener('click', () => {
        if (typeof onEpisodeClick === 'function') {
          onEpisodeClick(episode, mediaId, mediaType);
        } else {
          // Default action - redirect to video player
          window.location.href = `videoplayer.html?id=${mediaId}&type=${mediaType}&episode=${episode.id}`;
        }
      });
      
      episodesList.appendChild(episodeItem);
    });
    
    container.appendChild(episodesList);
  },
  
  // Helper function to render manga chapter list in UI
  renderChaptersList(container, chapters, mangaId, onChapterClick) {
    if (!container) return;
    
    // Clear container
    container.innerHTML = '';
    
    // Create chapters list
    if (!chapters || chapters.length === 0) {
      container.innerHTML = '<div class="no-chapters">No chapters available for this manga.</div>';
      return;
    }
    
    // Create list container
    const chaptersList = document.createElement('div');
    chaptersList.className = 'chapters-list';
    
    // Add each chapter
    chapters.forEach(chapter => {
      const chapterItem = document.createElement('div');
      chapterItem.className = 'chapter-item';
      chapterItem.dataset.id = chapter.id;
      chapterItem.dataset.number = chapter.number;
      
      // Chapter info
      const info = document.createElement('div');
      info.className = 'chapter-info';
      
      const title = document.createElement('h3');
      title.className = 'chapter-title';
      title.textContent = chapter.title;
      
      const details = document.createElement('div');
      details.className = 'chapter-details';
      details.innerHTML = `
        <span class="chapter-number">Chapter ${chapter.number}</span>
        <span class="chapter-release-date">${chapter.releaseDate}</span>
      `;
      
      info.appendChild(title);
      info.appendChild(details);
      
      chapterItem.appendChild(info);
      
      // Read button
      const readBtn = document.createElement('button');
      readBtn.className = 'chapter-read-btn';
      readBtn.innerHTML = '<i class="fas fa-book-open"></i>';
      chapterItem.appendChild(readBtn);
      
      // Add click event
      chapterItem.addEventListener('click', () => {
        if (typeof onChapterClick === 'function') {
          onChapterClick(chapter, mangaId);
        } else {
          // Default action - redirect to manga reader
          window.location.href = `mangareader.html?id=${mangaId}&chapter=${chapter.id}`;
        }
      });
      
      chaptersList.appendChild(chapterItem);
    });
    
    container.appendChild(chaptersList);
  }
};

// Expose API to global scope
window.api = api;
