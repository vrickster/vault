// Enhanced API Integration for OneVault
// This file handles all API connections for fetching anime, movies, and manga content

// API Configuration
const API_CONFIG = {
  // Main API endpoints (Consumet API as default)
  consumet: {
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
  },
  // Backup APIs in case main ones fail
  backup: {
    anime: {
      base: 'https://api.anify.tv',
      search: '/search',
      info: '/info'
    }
  },
  // Metadata APIs for enhanced info
  metadata: {
    tmdb: {
      base: 'https://api.themoviedb.org/3',
      key: 'YOUR_TMDB_API_KEY' // Replace with your actual API key
    }
  }
};

// Improved cache management with TTL
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
      localStorage.setItem('onevault_cache_' + key, JSON.stringify(this.data[key]));
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
        const storedItem = localStorage.getItem('onevault_cache_' + key);
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
        localStorage.removeItem('onevault_cache_' + key);
      } catch (e) {
        console.warn('Cache removal failed:', e);
      }
    }
    
    return null;
  },
  clear: function() {
    this.data = {};
    // Clear localStorage cache
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('onevault_cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.warn('Cache clearing failed:', e);
    }
  }
};

// Improved API request handler with fallback and retry logic
async function apiRequest(url, options = {}, cacheKey = null, cacheTime = 3600, retries = 2) {
  // Check cache first if a cacheKey is provided
  if (cacheKey) {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }
  }
  
  let lastError = null;
  
  // Try making the request with retries
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Show loading UI (handled by the UI module)
      document.dispatchEvent(new CustomEvent('api:loading', { 
        detail: { resource: cacheKey, attempt: attempt + 1 } 
      }));
      
      // Add timeout to request options
      const requestOptions = {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      };
      
      // Perform the fetch
      const response = await fetch(url, requestOptions);
      
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
      console.warn(`API request attempt ${attempt + 1} failed:`, error);
      lastError = error;
      
      // If it's not the last attempt, wait a bit before retrying
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  // All attempts failed, notify error
  document.dispatchEvent(new CustomEvent('api:error', { 
    detail: { resource: cacheKey, error: lastError.message }
  }));
  
  throw lastError;
}

// Enhanced Anime API with fallback providers
const animeAPI = {
  // Current provider (can be changed if one fails)
  currentProvider: 'gogoanime',
  
  // Get provider URL
  getProviderURL(endpoint = '') {
    return `${API_CONFIG.consumet.base}${API_CONFIG.consumet.anime[this.currentProvider]}${endpoint}`;
  },
  
  // Switch to a different provider
  switchProvider() {
    const providers = Object.keys(API_CONFIG.consumet.anime);
    const currentIndex = providers.indexOf(this.currentProvider);
    const nextIndex = (currentIndex + 1) % providers.length;
    this.currentProvider = providers[nextIndex];
    console.log(`Switched anime provider to ${this.currentProvider}`);
    return this.currentProvider;
  },
  
  // Get recent episodes
  async getRecentEpisodes(page = 1) {
    const cacheKey = `anime_recent_${page}_${this.currentProvider}`;
    
    try {
      return await apiRequest(
        `${this.getProviderURL()}/recent-episodes?page=${page}`,
        {},
        cacheKey,
        1800 // Cache for 30 minutes
      );
    } catch (error) {
      // Try switching provider if this one fails
      this.switchProvider();
      throw error;
    }
  },
  
  // Get trending anime
  async getTrending(page = 1, perPage = 20) {
    const cacheKey = `anime_trending_${page}_${perPage}`;
    
    try {
      // Try using AniList for trending data
      const query = `
        query {
          Page(page: ${page}, perPage: ${perPage}) {
            media(type: ANIME, sort: TRENDING_DESC) {
              id
              title {
                romaji
                english
                native
              }
              coverImage {
                large
                medium
              }
              bannerImage
              description
              genres
              seasonYear
              episodes
              duration
              averageScore
              popularity
              status
              nextAiringEpisode {
                episode
                airingAt
              }
            }
          }
        }
      `;
      
      const data = await apiRequest(
        `${API_CONFIG.consumet.base}${API_CONFIG.consumet.meta.anilist}/advanced-search`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            query: query 
          })
        },
        cacheKey,
        3600 // Cache for 1 hour
      );
      
      return data.data.Page.media.map(item => ({
        id: item.id,
        title: item.title.english || item.title.romaji || item.title.native,
        image: item.coverImage.large || item.coverImage.medium,
        banner: item.bannerImage,
        description: item.description,
        year: item.seasonYear,
        episodes: item.episodes,
        duration: item.duration,
        score: item.averageScore ? `${item.averageScore}%` : 'N/A',
        popularity: item.popularity,
        status: item.status,
        genres: item.genres,
        nextEpisode: item.nextAiringEpisode,
        type: 'anime'
      }));
    } catch (error) {
      console.error('Failed to get trending anime:', error);
      
      // Fallback to backup API
      try {
        const backupData = await apiRequest(
          `${API_CONFIG.backup.anime.base}/trending?type=anime&count=${perPage}`,
          {},
          `anime_trending_backup_${page}_${perPage}`,
          3600
        );
        
        return backupData.map(item => ({
          id: item.id,
          title: item.title.english || item.title.romaji || item.title.native,
          image: item.coverImage,
          year: item.year,
          episodes: item.totalEpisodes || 'Unknown',
          score: item.rating ? `${item.rating}%` : 'N/A',
          type: 'anime'
        }));
      } catch (backupError) {
        console.error('Backup API also failed:', backupError);
        return [];
      }
    }
  },
  
  // Search for anime
  async search(query, page = 1) {
    const cacheKey = `anime_search_${query}_${page}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/search?q=${encodeURIComponent(query)}&page=${page}`,
        {},
        cacheKey,
        1800 // Cache for 30 minutes
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        releaseDate: item.releaseDate,
        subOrDub: item.subOrDub,
        type: 'anime'
      }));
    } catch (error) {
      console.error('Failed to search anime:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/search?q=${encodeURIComponent(query)}&page=${page}`,
          {},
          `anime_search_${query}_${page}_${this.currentProvider}`,
          1800
        );
        
        return data.results.map(item => ({
          id: item.id,
          title: item.title,
          image: item.image,
          releaseDate: item.releaseDate,
          subOrDub: item.subOrDub,
          type: 'anime'
        }));
      } catch (retryError) {
        console.error('Retry search failed:', retryError);
        return [];
      }
    }
  },
  
  // Get anime details and episodes
  async getDetails(id) {
    const cacheKey = `anime_details_${id}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/info?id=${id}`,
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
        releaseDate: data.releaseDate,
        episodes: data.episodes,
        type: 'anime',
        subOrDub: data.subOrDub,
        otherNames: data.otherName,
        totalEpisodes: data.totalEpisodes
      };
    } catch (error) {
      console.error('Failed to get anime details:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/info?id=${id}`,
          {},
          `anime_details_${id}_${this.currentProvider}`,
          7200
        );
        
        return {
          id: data.id,
          title: data.title,
          image: data.image,
          cover: data.cover || data.image,
          description: data.description,
          genres: data.genres,
          status: data.status,
          releaseDate: data.releaseDate,
          episodes: data.episodes,
          type: 'anime',
          subOrDub: data.subOrDub,
          otherNames: data.otherName,
          totalEpisodes: data.totalEpisodes
        };
      } catch (retryError) {
        console.error('Retry get details failed:', retryError);
        return null;
      }
    }
  },
  
  // Get streaming sources for an episode
  async getEpisodeSources(episodeId, server = 'default') {
    const cacheKey = `anime_sources_${episodeId}_${server}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/watch?episodeId=${episodeId}${server !== 'default' ? `&server=${server}` : ''}`,
        {},
        cacheKey,
        900 // Cache for 15 minutes (shorter time since sources can expire)
      );
      
      return {
        sources: data.sources.map(source => ({
          url: source.url,
          isM3U8: source.isM3U8,
          quality: source.quality
        })),
        subtitles: data.subtitles || []
      };
    } catch (error) {
      console.error('Failed to get episode sources:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/watch?episodeId=${episodeId}${server !== 'default' ? `&server=${server}` : ''}`,
          {},
          `anime_sources_${episodeId}_${server}_${this.currentProvider}`,
          900
        );
        
        return {
          sources: data.sources.map(source => ({
            url: source.url,
            isM3U8: source.isM3U8,
            quality: source.quality
          })),
          subtitles: data.subtitles || []
        };
      } catch (retryError) {
        console.error('Retry get sources failed:', retryError);
        return { sources: [], subtitles: [] };
      }
    }
  }
};

// Enhanced Movies & TV Shows API with fallback providers
const moviesAPI = {
  // Current provider
  currentProvider: 'flixhq',
  
  // Get provider URL
  getProviderURL(endpoint = '') {
    return `${API_CONFIG.consumet.base}${API_CONFIG.consumet.movies[this.currentProvider]}${endpoint}`;
  },
  
  // Switch to a different provider
  switchProvider() {
    const providers = Object.keys(API_CONFIG.consumet.movies);
    const currentIndex = providers.indexOf(this.currentProvider);
    const nextIndex = (currentIndex + 1) % providers.length;
    this.currentProvider = providers[nextIndex];
    console.log(`Switched movies provider to ${this.currentProvider}`);
    return this.currentProvider;
  },
  
  // Get trending/popular movies
  async getTrending(page = 1) {
    const cacheKey = `movies_trending_${page}_${this.currentProvider}`;
    
    try {
      // Try using FlixHQ's home page
      const data = await apiRequest(
        `${this.getProviderURL()}/home?page=${page}`,
        {},
        cacheKey,
        3600 // Cache for 1 hour
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        type: item.type,
        releaseDate: item.releaseDate,
        genres: item.genres || [],
        duration: item.duration || 'Unknown',
        rating: item.rating || 'N/A'
      }));
    } catch (error) {
      console.error('Failed to get trending movies/shows:', error);
      
      // Fallback to TMDB API if available
      if (API_CONFIG.metadata.tmdb.key !== 'YOUR_TMDB_API_KEY') {
        try {
          const data = await apiRequest(
            `${API_CONFIG.metadata.tmdb.base}/trending/all/week?api_key=${API_CONFIG.metadata.tmdb.key}&page=${page}`,
            {},
            `movies_trending_tmdb_${page}`,
            3600
          );
          
          return data.results.map(item => ({
            id: item.id.toString(),
            title: item.title || item.name,
            image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
            releaseDate: (item.release_date || item.first_air_date || '').substring(0, 4),
            rating: `${Math.round(item.vote_average * 10)}%`,
            type: item.media_type === 'movie' ? 'Movie' : 'TV Series',
            overview: item.overview
          }));
        } catch (tmdbError) {
          console.error('TMDB API also failed:', tmdbError);
          return [];
        }
      }
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/home?page=${page}`,
          {},
          `movies_trending_${page}_${this.currentProvider}`,
          3600
        );
        
        return data.results.map(item => ({
          id: item.id,
          title: item.title,
          image: item.image,
          type: item.type,
          releaseDate: item.releaseDate,
          genres: item.genres || [],
          duration: item.duration || 'Unknown',
          rating: item.rating || 'N/A'
        }));
      } catch (retryError) {
        console.error('Retry trending failed:', retryError);
        return [];
      }
    }
  },
  
  // Search for movies/shows
  async search(query, page = 1) {
    const cacheKey = `movies_search_${query}_${page}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/search?q=${encodeURIComponent(query)}&page=${page}`,
        {},
        cacheKey,
        1800 // Cache for 30 minutes
      );
      
      return data.results.map(item => ({
        id: item.id,
        title: item.title,
        image: item.image,
        releaseDate: item.releaseDate,
        type: item.type // 'Movie' or 'TV Series'
      }));
    } catch (error) {
      console.error('Failed to search movies/shows:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/search?q=${encodeURIComponent(query)}&page=${page}`,
          {},
          `movies_search_${query}_${page}_${this.currentProvider}`,
          1800
        );
        
        return data.results.map(item => ({
          id: item.id,
          title: item.title,
          image: item.image,
          releaseDate: item.releaseDate,
          type: item.type // 'Movie' or 'TV Series'
        }));
      } catch (retryError) {
        console.error('Retry search failed:', retryError);
        return [];
      }
    }
  },
  
  // Get details for a movie/show
  async getDetails(id) {
    const cacheKey = `movies_details_${id}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/info?id=${id}`,
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
        releaseDate: data.releaseDate,
        duration: data.duration,
        rating: data.rating,
        production: data.production,
        casts: data.casts,
        tags: data.tags,
        episodes: data.episodes || [],
        type: data.type, // 'Movie' or 'TV Series'
        recommendations: data.recommendations
      };
    } catch (error) {
      console.error('Failed to get movie/show details:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/info?id=${id}`,
          {},
          `movies_details_${id}_${this.currentProvider}`,
          7200
        );
        
        return {
          id: data.id,
          title: data.title,
          image: data.image,
          cover: data.cover || data.image,
          description: data.description,
          genres: data.genres,
          status: data.status,
          releaseDate: data.releaseDate,
          duration: data.duration,
          rating: data.rating,
          production: data.production,
          casts: data.casts,
          tags: data.tags,
          episodes: data.episodes || [],
          type: data.type, // 'Movie' or 'TV Series'
          recommendations: data.recommendations
        };
      } catch (retryError) {
        console.error('Retry get details failed:', retryError);
        return null;
      }
    }
  },
  
  // Get streaming sources for a movie or episode
  async getStreamingSources(episodeId, mediaId, server = 'upcloud') {
    const cacheKey = `movies_sources_${episodeId}_${mediaId}_${server}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/watch?episodeId=${episodeId}&mediaId=${mediaId}&server=${server}`,
        {},
        cacheKey,
        900 // Cache for 15 minutes (shorter time since sources can expire)
      );
      
      return {
        sources: data.sources.map(source => ({
          url: source.url,
          isM3U8: source.isM3U8,
          quality: source.quality
        })),
        subtitles: data.subtitles || []
      };
    } catch (error) {
      console.error('Failed to get streaming sources:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/watch?episodeId=${episodeId}&mediaId=${mediaId}&server=${server}`,
          {},
          `movies_sources_${episodeId}_${mediaId}_${server}_${this.currentProvider}`,
          900
        );
        
        return {
          sources: data.sources.map(source => ({
            url: source.url,
            isM3U8: source.isM3U8,
            quality: source.quality
          })),
          subtitles: data.subtitles || []
        };
      } catch (retryError) {
        console.error('Retry get sources failed:', retryError);
        return { sources: [], subtitles: [] };
      }
    }
  },
  
  // Get streaming servers for a movie or episode
  async getServers(episodeId, mediaId) {
    const cacheKey = `movies_servers_${episodeId}_${mediaId}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/servers?episodeId=${episodeId}&mediaId=${mediaId}`,
        {},
        cacheKey,
        1800 // Cache for 30 minutes
      );
      
      return data.map(server => ({
        name: server.name,
        url: server.url
      }));
    } catch (error) {
      console.error('Failed to get streaming servers:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/servers?episodeId=${episodeId}&mediaId=${mediaId}`,
          {},
          `movies_servers_${episodeId}_${mediaId}_${this.currentProvider}`,
          1800
        );
        
        return data.map(server => ({
          name: server.name,
          url: server.url
        }));
      } catch (retryError) {
        console.error('Retry get servers failed:', retryError);
        return [];
      }
    }
  }
};

// Enhanced Manga API with fallback providers
const mangaAPI = {
  // Current provider
  currentProvider: 'mangadex',
  
  // Get provider URL
  getProviderURL(endpoint = '') {
    return `${API_CONFIG.consumet.base}${API_CONFIG.consumet.manga[this.currentProvider]}${endpoint}`;
  },
  
  // Switch to a different provider
  switchProvider() {
    const providers = Object.keys(API_CONFIG.consumet.manga);
    const currentIndex = providers.indexOf(this.currentProvider);
    const nextIndex = (currentIndex + 1) % providers.length;
    this.currentProvider = providers[nextIndex];
    console.log(`Switched manga provider to ${this.currentProvider}`);
    return this.currentProvider;
  },
  
  // Get trending manga
  async getTrending(page = 1, limit = 20) {
    const cacheKey = `manga_trending_${page}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/trending?page=${page}&limit=${limit}`,
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
        releaseDate: item.releaseDate,
        genres: item.genres || [],
        type: 'manga'
      }));
    } catch (error) {
      console.error('Failed to get trending manga:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/trending?page=${page}&limit=${limit}`,
          {},
          `manga_trending_${page}_${this.currentProvider}`,
          3600
        );
        
        return data.results.map(item => ({
          id: item.id,
          title: item.title,
          image: item.image,
          description: item.description,
          status: item.status,
          releaseDate: item.releaseDate,
          genres: item.genres || [],
          type: 'manga'
        }));
      } catch (retryError) {
        console.error('Retry trending failed:', retryError);
        return [];
      }
    }
  },
  
  // Search for manga
  async search(query, page = 1) {
    const cacheKey = `manga_search_${query}_${page}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/search?q=${encodeURIComponent(query)}&page=${page}`,
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
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/search?q=${encodeURIComponent(query)}&page=${page}`,
          {},
          `manga_search_${query}_${page}_${this.currentProvider}`,
          1800
        );
        
        return data.results.map(item => ({
          id: item.id,
          title: item.title,
          image: item.image,
          description: item.description,
          status: item.status,
          type: 'manga'
        }));
      } catch (retryError) {
        console.error('Retry search failed:', retryError);
        return [];
      }
    }
  },
  
  // Get manga details and chapters
  async getDetails(id) {
    const cacheKey = `manga_details_${id}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/info/${id}`,
        {},
        cacheKey,
        7200 // Cache for 2 hours
      );
      
      return {
        id: data.id,
        title: data.title,
        altTitles: data.altTitles,
        description: data.description,

image: data.image,
        genres: data.genres,
        status: data.status,
        releaseDate: data.releaseDate,
        chapters: data.chapters,
        type: 'manga',
        authors: data.authors || [],
        rating: data.rating || 'N/A',
        views: data.views,
        lastReleaseDate: data.lastReleaseDate
      };
    } catch (error) {
      console.error('Failed to get manga details:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/info/${id}`,
          {},
          `manga_details_${id}_${this.currentProvider}`,
          7200
        );
        
        return {
          id: data.id,
          title: data.title,
          altTitles: data.altTitles,
          description: data.description,
          image: data.image,
          genres: data.genres,
          status: data.status,
          releaseDate: data.releaseDate,
          chapters: data.chapters,
          type: 'manga',
          authors: data.authors || [],
          rating: data.rating || 'N/A',
          views: data.views,
          lastReleaseDate: data.lastReleaseDate
        };
      } catch (retryError) {
        console.error('Retry get details failed:', retryError);
        return null;
      }
    }
  },
  
  // Get chapter pages for reading
  async getChapterPages(chapterId) {
    const cacheKey = `manga_chapter_${chapterId}_${this.currentProvider}`;
    
    try {
      const data = await apiRequest(
        `${this.getProviderURL()}/read/${chapterId}`,
        {},
        cacheKey,
        3600 // Cache for 1 hour
      );
      
      return {
        id: data.id,
        title: data.title,
        pages: data.pages.map((page, index) => ({
          id: index + 1,
          url: page,
          index: index
        }))
      };
    } catch (error) {
      console.error('Failed to get chapter pages:', error);
      
      // Try switching provider if this one fails
      this.switchProvider();
      
      // Try one more time with new provider
      try {
        const data = await apiRequest(
          `${this.getProviderURL()}/read/${chapterId}`,
          {},
          `manga_chapter_${chapterId}_${this.currentProvider}`,
          3600
        );
        
        return {
          id: data.id,
          title: data.title,
          pages: data.pages.map((page, index) => ({
            id: index + 1,
            url: page,
            index: index
          }))
        };
      } catch (retryError) {
        console.error('Retry get chapter pages failed:', retryError);
        return { pages: [] };
      }
    }
  }
};

// Unified metadata service with enhanced details
const metadataService = {
  // Get enhanced metadata for any content
  async getEnhancedMetadata(id, type, sourceData = null) {
    // Skip if no TMDB key is configured
    if (API_CONFIG.metadata.tmdb.key === 'YOUR_TMDB_API_KEY') {
      return sourceData;
    }
    
    const cacheKey = `metadata_${type}_${id}`;
    let searchQuery = '';
    
    if (sourceData) {
      searchQuery = encodeURIComponent(sourceData.title);
      if (sourceData.releaseDate && !isNaN(parseInt(sourceData.releaseDate))) {
        searchQuery += `&year=${parseInt(sourceData.releaseDate)}`;
      }
    } else {
      return null; // Need source data for search
    }
    
    try {
      let endpoint = '';
      if (type === 'anime' || type === 'manga') {
        // Search for anime/manga as TV shows first, then movies if necessary
        endpoint = `${API_CONFIG.metadata.tmdb.base}/search/tv?api_key=${API_CONFIG.metadata.tmdb.key}&query=${searchQuery}`;
      } else if (type === 'Movie') {
        endpoint = `${API_CONFIG.metadata.tmdb.base}/search/movie?api_key=${API_CONFIG.metadata.tmdb.key}&query=${searchQuery}`;
      } else if (type === 'TV Series') {
        endpoint = `${API_CONFIG.metadata.tmdb.base}/search/tv?api_key=${API_CONFIG.metadata.tmdb.key}&query=${searchQuery}`;
      } else {
        return sourceData; // Unsupported type
      }
      
      const data = await apiRequest(
        endpoint,
        {},
        cacheKey,
        86400 // Cache for 24 hours (metadata rarely changes)
      );
      
      if (data.results && data.results.length > 0) {
        // Find the best match
        const bestMatch = data.results.find(item => {
          const title = item.title || item.name;
          const year = item.release_date || item.first_air_date;
          return title && title.toLowerCase() === sourceData.title.toLowerCase();
        }) || data.results[0];
        
        const tmdbId = bestMatch.id;
        
        // Get detailed data
        const detailEndpoint = type === 'Movie' || (type === 'anime' && bestMatch.title) ?
          `${API_CONFIG.metadata.tmdb.base}/movie/${tmdbId}?api_key=${API_CONFIG.metadata.tmdb.key}&append_to_response=videos,credits,recommendations` :
          `${API_CONFIG.metadata.tmdb.base}/tv/${tmdbId}?api_key=${API_CONFIG.metadata.tmdb.key}&append_to_response=videos,credits,recommendations`;
        
        const detailData = await apiRequest(
          detailEndpoint,
          {},
          `metadata_detail_${type}_${tmdbId}`,
          86400 // Cache for 24 hours
        );
        
        // Merge the data, preferring TMDB when available
        return {
          ...sourceData,
          tmdbId: tmdbId,
          backdropPath: detailData.backdrop_path ? `https://image.tmdb.org/t/p/original${detailData.backdrop_path}` : null,
          posterPath: detailData.poster_path ? `https://image.tmdb.org/t/p/w500${detailData.poster_path}` : sourceData.image,
          genres: detailData.genres ? detailData.genres.map(g => g.name) : sourceData.genres,
          overview: detailData.overview || sourceData.description,
          popularity: detailData.popularity,
          voteAverage: detailData.vote_average,
          voteCount: detailData.vote_count,
          videos: detailData.videos?.results || [],
          cast: detailData.credits?.cast || sourceData.casts || [],
          recommendations: detailData.recommendations?.results || sourceData.recommendations || [],
          // Keep original data
          title: sourceData.title,
          id: sourceData.id,
          type: sourceData.type,
          episodes: sourceData.episodes,
          chapters: sourceData.chapters
        };
      }
      
      return sourceData; // Return original data if no match found
    } catch (error) {
      console.error('Failed to get enhanced metadata:', error);
      return sourceData; // Fall back to original data
    }
  }
};

// Unified search across all content types
const unifiedSearch = {
  async search(query, types = ['anime', 'movies', 'manga'], page = 1) {
    const results = {};
    const promises = [];
    
    if (types.includes('anime')) {
      promises.push(
        animeAPI.search(query, page)
          .then(data => {
            results.anime = data;
          })
          .catch(error => {
            console.error('Anime search failed:', error);
            results.anime = [];
          })
      );
    }
    
    if (types.includes('movies')) {
      promises.push(
        moviesAPI.search(query, page)
          .then(data => {
            results.movies = data;
          })
          .catch(error => {
            console.error('Movies search failed:', error);
            results.movies = [];
          })
      );
    }
    
    if (types.includes('manga')) {
      promises.push(
        mangaAPI.search(query, page)
          .then(data => {
            results.manga = data;
          })
          .catch(error => {
            console.error('Manga search failed:', error);
            results.manga = [];
          })
      );
    }
    
    await Promise.allSettled(promises);
    
    return results;
  }
};

// User history and bookmarks manager
const userPreferences = {
  // Save to localStorage
  saveWatchHistory(item) {
    try {
      let history = JSON.parse(localStorage.getItem('onevault_watch_history')) || [];
      
      // Check if item already exists
      const existingIndex = history.findIndex(i => i.id === item.id && i.type === item.type);
      
      if (existingIndex !== -1) {
        // Update existing item
        history[existingIndex] = {
          ...history[existingIndex],
          ...item,
          lastWatched: new Date().toISOString()
        };
      } else {
        // Add new item
        history.unshift({
          ...item,
          lastWatched: new Date().toISOString()
        });
      }
      
      // Limit history to 100 items
      history = history.slice(0, 100);
      
      localStorage.setItem('onevault_watch_history', JSON.stringify(history));
      
      // Notify UI
      document.dispatchEvent(new CustomEvent('history:updated', { 
        detail: { item: item, action: 'added' }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to save watch history:', error);
      return false;
    }
  },
  
  // Get watch history
  getWatchHistory() {
    try {
      return JSON.parse(localStorage.getItem('onevault_watch_history')) || [];
    } catch (error) {
      console.error('Failed to get watch history:', error);
      return [];
    }
  },
  
  // Toggle bookmark
  toggleBookmark(item) {
    try {
      let bookmarks = JSON.parse(localStorage.getItem('onevault_bookmarks')) || [];
      
      // Check if item already exists
      const existingIndex = bookmarks.findIndex(i => i.id === item.id && i.type === item.type);
      
      if (existingIndex !== -1) {
        // Remove item
        bookmarks.splice(existingIndex, 1);
        
        // Notify UI
        document.dispatchEvent(new CustomEvent('bookmarks:updated', { 
          detail: { item: item, action: 'removed' }
        }));
      } else {
        // Add new item
        bookmarks.unshift({
          ...item,
          bookmarkedAt: new Date().toISOString()
        });
        
        // Notify UI
        document.dispatchEvent(new CustomEvent('bookmarks:updated', { 
          detail: { item: item, action: 'added' }
        }));
      }
      
      localStorage.setItem('onevault_bookmarks', JSON.stringify(bookmarks));
      
      return true;
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      return false;
    }
  },
  
  // Check if item is bookmarked
  isBookmarked(id, type) {
    try {
      const bookmarks = JSON.parse(localStorage.getItem('onevault_bookmarks')) || [];
      return bookmarks.some(item => item.id === id && item.type === type);
    } catch (error) {
      console.error('Failed to check bookmark status:', error);
      return false;
    }
  },
  
  // Get all bookmarks
  getBookmarks() {
    try {
      return JSON.parse(localStorage.getItem('onevault_bookmarks')) || [];
    } catch (error) {
      console.error('Failed to get bookmarks:', error);
      return [];
    }
  },
  
  // Save user settings
  saveSettings(settings) {
    try {
      localStorage.setItem('onevault_settings', JSON.stringify(settings));
      
      // Notify UI
      document.dispatchEvent(new CustomEvent('settings:updated', { 
        detail: { settings: settings }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  },
  
  // Get user settings
  getSettings() {
    try {
      return JSON.parse(localStorage.getItem('onevault_settings')) || {
        preferredAnimeProvider: 'gogoanime',
        preferredMoviesProvider: 'flixhq',
        preferredMangaProvider: 'mangadex',
        preferredVideoQuality: '1080p',
        autoPlayNextEpisode: true,
        enableNotifications: true,
        darkMode: true,
        subtitlesEnabled: true,
        subtitlesLanguage: 'english',
        downloadEnabled: false
      };
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        preferredAnimeProvider: 'gogoanime',
        preferredMoviesProvider: 'flixhq',
        preferredMangaProvider: 'mangadex',
        preferredVideoQuality: '1080p',
        autoPlayNextEpisode: true,
        enableNotifications: true,
        darkMode: true,
        subtitlesEnabled: true,
        subtitlesLanguage: 'english',
        downloadEnabled: false
      };
    }
  },
  
  // Apply user settings
  applySettings() {
    const settings = this.getSettings();
    
    // Apply provider preferences
    animeAPI.currentProvider = settings.preferredAnimeProvider;
    moviesAPI.currentProvider = settings.preferredMoviesProvider;
    mangaAPI.currentProvider = settings.preferredMangaProvider;
    
    // Apply theme
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Notify UI
    document.dispatchEvent(new CustomEvent('settings:applied', { 
      detail: { settings: settings }
    }));
    
    return settings;
  }
};

// Initialize API settings on load
document.addEventListener('DOMContentLoaded', () => {
  userPreferences.applySettings();
  
  // Check for service availability
  checkAPIAvailability();
});

// Check API availability
async function checkAPIAvailability() {
  try {
    // Try a simple API request to check if service is available
    await apiRequest(
      `${API_CONFIG.consumet.base}/anime/gogoanime/info?id=spy-x-family`,
      {},
      null,
      0
    );
    
    console.log('API service is available');
  } catch (error) {
    console.error('API service is unavailable:', error);
    
    // Show error notification
    document.dispatchEvent(new CustomEvent('api:unavailable', { 
      detail: { error: 'Content service is currently unavailable. Please try again later.' }
    }));
  }
}

// Export all modules for use in other files
export {
  animeAPI,
  moviesAPI,
  mangaAPI,
  metadataService,
  unifiedSearch,
  userPreferences,
  cache
};
