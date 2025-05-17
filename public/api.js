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
