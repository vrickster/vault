// API Integration Module for Vrickster Vault
// This file handles all API connections and data fetching

// API Configuration
const API_CONFIG = {
  // Consumet API endpoints
  consumet: {
    base: 'https://api.consumet.org',
    anime: {
      zoro: '/anime/zoro',
      gogoanime: '/anime/gogoanime'
    },
    movies: {
      flixhq: '/movies/flixhq'
    },
    manga: {
      mangadex: '/manga/mangadex'
    }
  },
  // Metadata APIs
  metadata: {
    tmdb: {
      base: 'https://api.themoviedb.org/3',
      key: 'YOUR_TMDB_API_KEY' // Replace with your actual API key
    },
    anilist: {
      base: 'https://graphql.anilist.co',
    }
  },
  // Search indexing
  search: {
    // Replace with your actual Meilisearch endpoint and key
    meilisearch: {
      base: 'https://YOUR_MEILISEARCH_INSTANCE.com',
      key: 'YOUR_MEILISEARCH_KEY'
    }
  }
};

// Cache management
const cache = {
  data: {},
  set: function(key, data, expiresIn = 3600) { // Default: 1 hour cache
    const now = new Date();
    this.data[key] = {
      data: data,
      expires: now.getTime() + (expiresIn * 1000)
    };
    // Store in localStorage for persistence
    try {
      localStorage.setItem('vrickster_cache_' + key, JSON.stringify(this.data[key]));
    } catch (e) {
      console.warn('Cache storage failed:', e);
    }
  },
  get: function(key) {
    // Try to get from memory first
    let item = this.data[key];
    
    // If not in memory, try localStorage
    if (!item) {
      try {
        const storedItem = localStorage.getItem('vrickster_cache_' + key);
        if (storedItem) {
          item = JSON.parse(storedItem);
          this.data[key] = item; // Restore to memory
        }
      } catch (e) {
        console.warn('Cache retrieval failed:', e);
        return null;
      }
    }
    
    // Check expiration
    if (item && item.expires > new Date().getTime()) {
      return item.data;
    }
    
    // Clear expired item
    if (item) {
      delete this.data[key];
      try {
        localStorage.removeItem('vrickster_cache_' + key);
      } catch (e) {
        console.warn('Cache removal failed:', e);
      }
    }
    
    return null;
  }
};

// Generic API request handler with error handling and caching
async function apiRequest(url, options = {}, cacheKey = null, cacheTime = 3600) {
  // Check cache first if a cacheKey is provided
  if (cacheKey) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  try {
    // Show loading UI (handled by the UI module)
    document.dispatchEvent(new CustomEvent('api:loading', { detail: { resource: cacheKey } }));
    
    // Perform the fetch
    const response = await fetch(url, options);
    
    // Check if the request was successful
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    // Parse the JSON response
    const data = await response.json();
    
    // Cache the result if a cacheKey is provided
    if (cacheKey) {
      cache.set(cacheKey, data, cacheTime);
    }
    
    // Notify success
    document.dispatchEvent(new CustomEvent('api:success', { 
      detail: { resource: cacheKey, data: data }
    }));
    
    return data;
  } catch (error) {
    // Handle errors
    console.error('API request failed:', error);
    
    // Notify error
    document.dispatchEvent(new CustomEvent('api:error', { 
      detail: { resource: cacheKey, error: error.message }
    }));
    
    throw error;
  }
}

// ANIME API FUNCTIONS
const animeAPI = {
  // Get trending anime
  async getTrending(page = 1, perPage = 20) {
    const cacheKey = `anime_trending_${page}_${perPage}`;
    
    // Use the AniList GraphQL API
    const query = `
      query {
        Page(page: ${page}, perPage: ${perPage}) {
          media(type: ANIME, sort: TRENDING_DESC) {
            id
            title {
              romaji
              english
            }
            coverImage {
              large
            }
            genres
            seasonYear
            episodes
            averageScore
          }
        }
      }
    `;
    
    try {
      const data = await apiRequest(
        API_CONFIG.metadata.anilist.base,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ query })
        },
        cacheKey,
        3600 // Cache for 1 hour
      );
      
      return data.data.Page.media.map(item => ({
        id: item.id,
        title: item.title.english || item.title.romaji,
        image: item.coverImage.large,
        year: item.seasonYear,
        episodes: `${item.episodes} Episodes`,
        score: item.averageScore ? `${item.averageScore}%` : 'N/A',
        type: 'anime'
      }));
    } catch (error) {
      console.error('Failed to get trending anime:', error);
      return [];
    }
  },
  
  // Search for anime
  async search(query, page = 1) {
    const cacheKey = `anime_search_${query}_${page}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.anime.zoro}/search?q=${encodeURIComponent(query)}&page=${page}`,
        {},
        cacheKey,
        1800 // Cache for 30 minutes
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        year: item.releaseDate,
        episodes: item.subOrDub,
        type: 'anime'
      }));
    } catch (error) {
      console.error('Failed to search anime:', error);
      return [];
    }
  },
  
  // Get anime details and episodes
  async getDetails(id) {
    const cacheKey = `anime_details_${id}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.anime.zoro}/info?id=${id}`,
        {},
        cacheKey,
        7200 // Cache for 2 hours
      );
      
      return {
        id: data.id,
        title: data.title,
        image: data.image,
        cover: data.cover || data.image,
        description: data.description,
        genres: data.genres,
        status: data.status,
        year: data.releaseDate,
        episodes: data.episodes,
        type: 'anime'
      };
    } catch (error) {
      console.error('Failed to get anime details:', error);
      return null;
    }
  },
  
  // Get streaming sources for an episode
  async getEpisodeSources(episodeId) {
    const cacheKey = `anime_sources_${episodeId}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.anime.zoro}/watch?episodeId=${episodeId}`,
        {},
        cacheKey,
        900 // Cache for 15 minutes (shorter time since sources can expire)
      );
      
      return {
        sources: data.sources,
        subtitles: data.subtitles
      };
    } catch (error) {
      console.error('Failed to get episode sources:', error);
      return { sources: [], subtitles: [] };
    }
  }
};

// MOVIES & TV SHOWS API FUNCTIONS
const moviesAPI = {
  // Get trending/popular movies
  async getTrending(page = 1) {
    const cacheKey = `movies_trending_${page}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.metadata.tmdb.base}/trending/all/week?api_key=${API_CONFIG.metadata.tmdb.key}&page=${page}`,
        {},
        cacheKey,
        3600 // Cache for 1 hour
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title || item.name,
        image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
        year: (item.release_date || item.first_air_date || '').substring(0, 4),
        rating: `${Math.round(item.vote_average * 10)}%`,
        mediaType: item.media_type, // 'movie' or 'tv'
        type: 'movie'
      }));
    } catch (error) {
      console.error('Failed to get trending movies/shows:', error);
      return [];
    }
  },
  
  // Search for movies/shows using FlixHQ
  async search(query, page = 1) {
    const cacheKey = `movies_search_${query}_${page}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.movies.flixhq}/search?q=${encodeURIComponent(query)}&page=${page}`,
        {},
        cacheKey,
        1800 // Cache for 30 minutes
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        year: item.releaseDate,
        type: item.type // 'Movie' or 'TV Series'
      }));
    } catch (error) {
      console.error('Failed to search movies/shows:', error);
      return [];
    }
  },
  
  // Get details for a movie/show
  async getDetails(id, type = 'movie') {
    const cacheKey = `movies_details_${id}_${type}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.movies.flixhq}/info?id=${id}`,
        {},
        cacheKey,
        7200 // Cache for 2 hours
      );
      
      return {
        id: data.id,
        title: data.title,
        image: data.image,
        cover: data.cover || data.image,
        description: data.description,
        genres: data.genres,
        status: data.status,
        year: data.releaseDate,
        duration: data.duration,
        rating: data.rating,
        episodes: data.episodes || [],
        type: data.type.toLowerCase()
      };
    } catch (error) {
      console.error('Failed to get movie/show details:', error);
      return null;
    }
  },
  
  // Get streaming sources for a movie or episode
  async getStreamingSources(episodeId, mediaId, server = 'upcloud') {
    const cacheKey = `movies_sources_${episodeId}_${mediaId}_${server}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.movies.flixhq}/watch?episodeId=${episodeId}&mediaId=${mediaId}&server=${server}`,
        {},
        cacheKey,
        900 // Cache for 15 minutes (shorter time since sources can expire)
      );
      
      return {
        sources: data.sources,
        subtitles: data.subtitles
      };
    } catch (error) {
      console.error('Failed to get streaming sources:', error);
      return { sources: [], subtitles: [] };
    }
  }
};

// MANGA API FUNCTIONS
const mangaAPI = {
  // Get trending manga
  async getTrending(page = 1) {
    const cacheKey = `manga_trending_${page}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.manga.mangadex}/trending?page=${page}`,
        {},
        cacheKey,
        3600 // Cache for 1 hour
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        description: item.description,
        status: item.status,
        type: 'manga'
      }));
    } catch (error) {
      console.error('Failed to get trending manga:', error);
      return [];
    }
  },
  
  // Search for manga
  async search(query, page = 1) {
    const cacheKey = `manga_search_${query}_${page}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.manga.mangadex}/search?q=${encodeURIComponent(query)}&page=${page}`,
        {},
        cacheKey,
        1800 // Cache for 30 minutes
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        description: item.description,
        status: item.status,
        type: 'manga'
      }));
    } catch (error) {
      console.error('Failed to search manga:', error);
      return [];
    }
  },
  
  // Get manga details and chapters
  async getDetails(id) {
    const cacheKey = `manga_details_${id}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.manga.mangadex}/info/${id}`,
        {},
        cacheKey,
        7200 // Cache for 2 hours
      );
      
      return {
        id: data.id,
        title: data.title,
        image: data.image,
        description: data.description,
        genres: data.genres,
        status: data.status,
        chapters: data.chapters,
        type: 'manga'
      };
    } catch (error) {
      console.error('Failed to get manga details:', error);
      return null;
    }
  },
  
  // Get chapter pages
  async getChapterPages(chapterId) {
    const cacheKey = `manga_chapter_${chapterId}`;
    
    try {
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.manga.mangadex}/chapter/${chapterId}`,
        {},
        cacheKey,
        3600 // Cache for 1 hour
      );
      
      return data.pages;
    } catch (error) {
      console.error('Failed to get chapter pages:', error);
      return [];
    }
  }
};

// SEARCH INDEXING FUNCTIONS
const searchAPI = {
  // Initialize Meilisearch client (if using external search)
  // This is a placeholder - in production, you'd use the MeiliSearch JS client
  async initMeilisearch() {
    console.log('Initializing Meilisearch...');
    // In a real implementation, you would import and initialize the Meilisearch client here
  },
  
  // Search across all content types
  async searchAll(query, page = 1) {
    // This is a simple implementation that aggregates results from different APIs
    // In production, you'd use a proper search index like Meilisearch
    
    try {
      // Search in parallel for better performance
      const [animeResults, movieResults, mangaResults] = await Promise.all([
        animeAPI.search(query, page),
        moviesAPI.search(query, page),
        mangaAPI.search(query, page)
      ]);
      
      // Combine and sort results (basic implementation)
      return {
        anime: animeResults.slice(0, 5),  // Limit to top 5 of each category
        movies: movieResults.slice(0, 5),
        manga: mangaResults.slice(0, 5),
        // Add a combined array for UI that needs a single list
        all: [
          ...animeResults.slice(0, 5).map(item => ({...item, category: 'anime'})),
          ...movieResults.slice(0, 5).map(item => ({...item, category: 'movies'})),
          ...mangaResults.slice(0, 5).map(item => ({...item, category: 'manga'}))
        ]
      };
    } catch (error) {
      console.error('Search failed:', error);
      return { anime: [], movies: [], manga: [], all: [] };
    }
  }
};

// PLAYER INTEGRATION
const playerAPI = {
  // Initialize video player with Plyr.js
  initVideoPlayer(videoElement, options = {}) {
    // Check if Plyr is available
    if (typeof Plyr === 'undefined') {
      console.error('Plyr.js is not loaded. Make sure to include it in your HTML.');
      return null;
    }
    
    // Default options
    const defaultOptions = {
      controls: [
        'play-large', 'play', 'progress', 'current-time', 'mute', 
        'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen'
      ],
      autoplay: false,
      captions: { active: true, language: 'auto', update: true }
    };
    
    // Create and return the player instance
    return new Plyr(videoElement, {...defaultOptions, ...options});
  },
  
  // Set video source and subtitles
  setVideoSource(player, sources, subtitles = []) {
    if (!player) {
      console.error('Player not initialized');
      return;
    }
    
    // Format sources for Plyr
    const formattedSources = sources.map(source => ({
      src: source.url,
      type: source.type || 'video/mp4',
      size: source.quality ? parseInt(source.quality) : undefined
    }));
    
    // Format subtitles for Plyr
    const formattedCaptions = subtitles.map(subtitle => ({
      kind: 'captions',
      label: subtitle.lang,
      srclang: subtitle.lang.substring(0, 2).toLowerCase(),
      src: subtitle.url,
      default: subtitle.lang.toLowerCase().includes('english')
    }));
    
    // Set the sources and tracks
    player.source = {
      type: 'video',
      sources: formattedSources,
      tracks: formattedCaptions
    };
  },
  
  // Initialize manga reader (simple implementation)
  initMangaReader(containerElement) {
    // This is a basic implementation
    // For a real manga reader, you might want to use a dedicated library
    return {
      container: containerElement,
      pages: [],
      currentPage: 0,
      
      // Load pages
      loadPages(pages) {
        this.pages = pages;
        this.currentPage = 0;
        this.render();
      },
      
      // Render current page
      render() {
        if (this.pages.length === 0) {
          this.container.innerHTML = '<div class="manga-no-pages">No pages available</div>';
          return;
        }
        
        // Clear container
        this.container.innerHTML = '';
        
        // Add navigation controls
        const controls = document.createElement('div');
        controls.className = 'manga-controls';
        controls.innerHTML = `
          <button class="prev-page" ${this.currentPage === 0 ? 'disabled' : ''}>Previous</button>
          <span class="page-indicator">${this.currentPage + 1} / ${this.pages.length}</span>
          <button class="next-page" ${this.currentPage >= this.pages.length - 1 ? 'disabled' : ''}>Next</button>
        `;
        
        // Add event listeners
        controls.querySelector('.prev-page').addEventListener('click', () => this.prevPage());
        controls.querySelector('.next-page').addEventListener('click', () => this.nextPage());
        
        // Add the current page image
        const pageImg = document.createElement('img');
        pageImg.src = this.pages[this.currentPage];
        pageImg.className = 'manga-page';
        pageImg.alt = `Page ${this.currentPage + 1}`;
        
        // Add to container
        this.container.appendChild(controls);
        this.container.appendChild(pageImg);
      },
      
      // Navigate to next page
      nextPage() {
        if (this.currentPage < this.pages.length - 1) {
          this.currentPage++;
          this.render();
        }
      },
      
      // Navigate to previous page
      prevPage() {
        if (this.currentPage > 0) {
          this.currentPage--;
          this.render();
        }
      }
    };
  }
};

// global api
window.api = {
  anime: animeAPI,
  movies: moviesAPI,
  manga: mangaAPI,
  search: searchAPI,
  player: playerAPI,
  getAPI(category) {
    switch(category.toLowerCase()) {
      case 'anime': return animeAPI;
      case 'movies': 
      case 'tv': 
      case 'shows': return moviesAPI;
      case 'manga': return mangaAPI;
      default: return null;
    }
  }
};
