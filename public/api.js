// Patched API using TMDb for movies and AniList for anime

const API_KEYS = { 
  tmdb: 'f12eb41a7dd6599ee636b9e3c588a932' // Replace with your own TMDb API key 
};

const API_BASES = { 
  tmdb: 'https://api.themoviedb.org/3', 
  anilist: 'https://graphql.anilist.co' 
};

const api = {
  movies: {
    async search(query) {
      const url = `${API_BASES.tmdb}/search/movie?api_key=${API_KEYS.tmdb}&query=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.results.map(item => ({
        id: item.id.toString(),
        title: item.title,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        year: item.release_date?.split('-')[0] || 'N/A',
        rating: `${Math.round(item.vote_average * 10)}%`,
        description: item.overview,
        overview: item.overview,
        type: 'movie',
        mediaType: 'Movie'
      }));
    },

    async getDetails(id) {
      const url = `${API_BASES.tmdb}/movie/${id}?api_key=${API_KEYS.tmdb}`;
      const res = await fetch(url);
      const item = await res.json();
      return {
        id: item.id.toString(),
        title: item.title,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        year: item.release_date?.split('-')[0] || 'N/A',
        rating: `${Math.round(item.vote_average * 10)}%`,
        description: item.overview,
        overview: item.overview,
        genres: item.genres?.map(g => g.name) || [],
        type: 'movie',
        mediaType: 'Movie',
        status: item.status,
        duration: `${item.runtime} min`,
        episodes: [] // Movies don't have episodes
      };
    },

    async getTrending() {
      const url = `${API_BASES.tmdb}/trending/movie/week?api_key=${API_KEYS.tmdb}`;
      const res = await fetch(url);
      const data = await res.json();
      return data.results.map(item => ({
        id: item.id.toString(),
        title: item.title,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        year: item.release_date?.split('-')[0] || 'N/A',
        rating: `${Math.round(item.vote_average * 10)}%`,
        description: item.overview,
        overview: item.overview,
        type: 'movie',
        mediaType: 'Movie'
      }));
    },

    async getStreamingSources(movieId) {
      // In a real app, this would fetch from a streaming API
      // For this demo, we'll return a placeholder video
      return {
        sources: [
          {
            url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.mp4/.m3u8',
            type: 'application/x-mpegURL'
          },
          {
            url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            type: 'video/mp4'
          }
        ],
        subtitles: [
          {
            lang: 'en',
            label: 'English',
            url: 'https://example.com/subtitles/en.vtt'
          }
        ]
      };
    },
    
    // Updated to get real TV show episodes from TMDb API
    async getEpisodes(showId) {
      try {
        // First, let's get the first season data (or all seasons if needed)
        const seasonsUrl = `${API_BASES.tmdb}/tv/${showId}/seasons?api_key=${API_KEYS.tmdb}`;
        const seasonsRes = await fetch(seasonsUrl);
        const seasonsData = await seasonsRes.json();
        
        // If no seasons available, return empty array
        if (!seasonsData.seasons || seasonsData.seasons.length === 0) {
          return [];
        }
        
        // Get episodes for the first season (we can expand this later)
        const firstSeason = seasonsData.seasons[0].season_number;
        const episodesUrl = `${API_BASES.tmdb}/tv/${showId}/season/${firstSeason}?api_key=${API_KEYS.tmdb}`;
        const episodesRes = await fetch(episodesUrl);
        const episodesData = await episodesRes.json();
        
        // Map and return episode data
        return episodesData.episodes.map(episode => ({
          id: episode.id.toString(),
          number: episode.episode_number.toString(),
          season: firstSeason.toString(),
          title: episode.name,
          duration: `${episode.runtime || 45} min`,
          description: episode.overview,
          still: episode.still_path ? `https://image.tmdb.org/t/p/w300${episode.still_path}` : null,
          airDate: episode.air_date
        }));
      } catch (error) {
        console.error("Error fetching episodes:", error);
        return [];
      }
    }
  },

  anime: {
    async search(query) {
      const body = {
        query: `query ($search: String) {
          Page(page: 1, perPage: 20) {
            media(search: $search, type: ANIME) {
              id
              title { romaji }
              coverImage { large }
              description
              averageScore
              seasonYear
            }
          }
        }`,
        variables: { search: query }
      };
      const res = await fetch(API_BASES.anilist, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      return json.data.Page.media.map(item => ({
        id: item.id,
        title: item.title.romaji,
        image: item.coverImage.large,
        poster: item.coverImage.large,
        year: item.seasonYear,
        rating: item.averageScore ? `${item.averageScore}%` : 'N/A',
        type: 'anime',
        mediaType: 'Anime',
        description: item.description,
        overview: item.description
      }));
    },

    async getDetails(id) {
      const body = {
        query: `query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji }
            coverImage { large }
            description
            averageScore
            seasonYear
            genres
            status
            episodes
            duration
            nextAiringEpisode {
              episode
              airingAt
            }
          }
        }`,
        variables: { id: parseInt(id) }
      };
      const res = await fetch(API_BASES.anilist, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const item = (await res.json()).data.Media;
      return {
        id: item.id,
        title: item.title.romaji,
        image: item.coverImage.large,
        poster: item.coverImage.large,
        description: item.description,
        overview: item.description,
        rating: item.averageScore ? `${item.averageScore}%` : 'N/A',
        year: item.seasonYear,
        genres: item.genres,
        status: item.status,
        type: 'anime',
        mediaType: 'Anime',
        episodes: item.episodes,
        duration: item.duration ? `${item.duration} min` : 'N/A',
        nextEpisode: item.nextAiringEpisode ? {
          number: item.nextAiringEpisode.episode,
          airingAt: item.nextAiringEpisode.airingAt
        } : null
      };
    },

    async getTrending() {
      const body = {
        query: `query {
          Page(page: 1, perPage: 20) {
            media(type: ANIME, sort: TRENDING_DESC) {
              id
              title { romaji }
              coverImage { large }
              description
              averageScore
              seasonYear
            }
          }
        }`
      };
      const res = await fetch(API_BASES.anilist, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      return json.data.Page.media.map(item => ({
        id: item.id,
        title: item.title.romaji,
        image: item.coverImage.large,
        poster: item.coverImage.large,
        year: item.seasonYear,
        rating: item.averageScore ? `${item.averageScore}%` : 'N/A',
        type: 'anime',
        mediaType: 'Anime',
        description: item.description,
        overview: item.description
      }));
    },

    // Updated to get real anime episodes from AniList API
    async getEpisodes(animeId) {
      try {
        // First fetch anime details to get episode count
        const detailsBody = {
          query: `query ($id: Int) {
            Media(id: $id, type: ANIME) {
              id
              episodes
              title { romaji }
              duration
            }
          }`,
          variables: { id: parseInt(animeId) }
        };
        
        const detailsRes = await fetch(API_BASES.anilist, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(detailsBody)
        });
        
        const detailsData = await detailsRes.json();
        const animeDetails = detailsData.data.Media;
        
        if (!animeDetails || !animeDetails.episodes) {
          return [];
        }
        
        // Then fetch episode details if available through another API
        // Note: AniList doesn't provide detailed episode info, so we'll construct from what we have
        
        // Generate episode list based on total count
        const totalEpisodes = animeDetails.episodes;
        const episodeDuration = animeDetails.duration || 24;
        
        return Array.from({ length: totalEpisodes }, (_, i) => {
          const episodeNum = i + 1;
          return {
            id: `${animeId}-${episodeNum}`,
            number: episodeNum.toString(),
            title: `Episode ${episodeNum}`,
            duration: `${episodeDuration} min`,
            description: `Episode ${episodeNum} of ${animeDetails.title.romaji}`,
            // Include placeholder image URL that could be replaced with real data
            still: `/api/placeholder/300/170`
          };
        });
      } catch (error) {
        console.error("Error fetching anime episodes:", error);
        return [];
      }
    },

    async getEpisodeSources(episodeId) {
      // For demo purposes - would normally fetch from a streaming API
      return {
        sources: [
          {
            url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
            type: 'video/mp4'
          }
        ],
        subtitles: [
          {
            lang: 'en',
            label: 'English',
            url: 'https://example.com/subtitles/en.vtt'
          }
        ]
      };
    }
  },

  manga: {
    async search(query) {
      // For now, return empty array since manga API is not implemented
      return [];
    },
    async getDetails(id) {
      return null;
    },
    async getTrending() {
      return [];
    }
  },

  // Added missing methods that are called from HTML
  async getTopPerformers(category) {
    // Return trending content as top performers
    if (category === 'movies') {
      return this.movies.getTrending();
    } else if (category === 'anime') {
      return this.anime.getTrending();
    } else if (category === 'manga') {
      return this.manga.getTrending();
    }
    return [];
  },

  async getCategoryContent(category) {
    // Return trending content for the category
    if (category === 'movies') {
      return this.movies.getTrending();
    } else if (category === 'anime') {
      return this.anime.getTrending();
    } else if (category === 'manga') {
      return this.manga.getTrending();
    }
    return [];
  },

  async getContentDetails(id, type) {
    if (type === 'movie' || type === 'movies') {
      return this.movies.getDetails(id);
    } else if (type === 'tv') {
      // Fetch TV show details using movie API but with TV endpoint
      const url = `${API_BASES.tmdb}/tv/${id}?api_key=${API_KEYS.tmdb}`;
      const res = await fetch(url);
      const item = await res.json();
      return {
        id: item.id.toString(),
        title: item.name,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        poster: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        year: item.first_air_date?.split('-')[0] || 'N/A',
        rating: `${Math.round(item.vote_average * 10)}%`,
        description: item.overview,
        overview: item.overview,
        genres: item.genres?.map(g => g.name) || [],
        type: 'tv',
        mediaType: 'TV Show',
        status: item.status,
        seasons: item.number_of_seasons,
        totalEpisodes: item.number_of_episodes
      };
    } else if (type === 'anime') {
      return this.anime.getDetails(id);
    } else if (type === 'manga') {
      return this.manga.getDetails(id);
    }
    return null;
  },

  async getStreamUrl(id, type, episode) {
    // For demo purposes
    if (type === 'movie' || type === 'movies') {
      const sources = await this.movies.getStreamingSources(id);
      return {
        url: sources.sources[0].url,
        type: 'video'
      };
    } else if (type === 'tv') {
      // Add specific TV show streaming
      return {
        url: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        type: 'video'
      };
    } else if (type === 'anime') {
      const sources = await this.anime.getEpisodeSources(episode);
      return {
        url: sources.sources[0].url,
        type: 'video'
      };
    }
    return null;
  },

  async getEpisodes(id, type) {
    if (type === 'tv') {
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
      filteredResults.sort((a, b) => (b.year || 0) - (a.year || 0));
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
        size: 720
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
            img.alt = `Page ${page.id}`;
            img.className = 'manga-page';
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
  }
};

// Automatically expose API to global scope 
window.api = api;
