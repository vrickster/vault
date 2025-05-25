
// Updated API using local proxy to bypass CORS issues

const API = {
  base: '/proxy',
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
  providers: {
    anime: 'gogoanime',
    movies: 'flixhq',
    manga: 'mangadex'
  },

  async fetchAPI(endpoint, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const url = \`\${API.base}\${endpoint}\${queryParams ? '?' + queryParams : ''}\`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(\`API error: \${response.status} \${response.statusText}\`);
      }

      return await response.json();
    } catch (err) {
      console.error('API fetch failed:', err);
      return null;
    }
  }
};
