// Patched API using TMDb for movies and AniList for anime

const API_KEYS = { tmdb: 'f12eb41a7dd6599ee636b9e3c588a932' // Replace with your own TMDb API key };

const API_BASES = { tmdb: 'https://api.themoviedb.org/3', anilist: 'https://graphql.anilist.co' };

const api = { movies: { async search(query) { const url = ${API_BASES.tmdb}/search/movie?api_key=${API_KEYS.tmdb}&query=${encodeURIComponent(query)}; const res = await fetch(url); const data = await res.json(); return data.results.map(item => ({ id: item.id.toString(), title: item.title, image: https://image.tmdb.org/t/p/w500${item.poster_path}, year: item.release_date?.split('-')[0] || 'N/A', rating: ${Math.round(item.vote_average * 10)}%, description: item.overview, type: 'movie' })); },

async getDetails(id) {
  const url = `${API_BASES.tmdb}/movie/${id}?api_key=${API_KEYS.tmdb}`;
  const res = await fetch(url);
  const item = await res.json();
  return {
    id: item.id.toString(),
    title: item.title,
    image: `https://image.tmdb.org/t/p/w500${item.poster_path}`,
    year: item.release_date?.split('-')[0] || 'N/A',
    rating: `${Math.round(item.vote_average * 10)}%`,
    description: item.overview,
    genres: item.genres?.map(g => g.name) || [],
    type: 'movie',
    status: item.status,
    duration: `${item.runtime} min`
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
    year: item.release_date?.split('-')[0] || 'N/A',
    rating: `${Math.round(item.vote_average * 10)}%`,
    description: item.overview,
    type: 'movie'
  }));
}

},

anime: { async search(query) { const body = { query: query ($search: String) { Page(page: 1, perPage: 20) { media(search: $search, type: ANIME) { id title { romaji } coverImage { large } description averageScore seasonYear } } }, variables: { search: query } }; const res = await fetch(API_BASES.anilist, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const json = await res.json(); return json.data.Page.media.map(item => ({ id: item.id, title: item.title.romaji, image: item.coverImage.large, year: item.seasonYear, rating: ${item.averageScore}%, type: 'anime', description: item.description })); },

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
      }
    }`,
    variables: { id }
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
    description: item.description,
    rating: `${item.averageScore}%`,
    year: item.seasonYear,
    genres: item.genres,
    status: item.status,
    type: 'anime',
    episodes: item.episodes
  };
},

async getTrending() {
  return this.search('');
}

},

manga: { async search() { return []; }, async getDetails() { return null; }, async getTrending() { return []; } },

getAPI(category) { if (category === 'anime') return this.anime; if (category === 'movies') return this.movies; if (category === 'manga') return this.manga; return null; },

player: { initVideoPlayer(videoElement) { return new Plyr(videoElement, { controls: ['play', 'progress', 'volume', 'fullscreen'] }); }, setVideoSource(player, sources) { if (!sources || sources.length === 0) return; player.source = { type: 'video', sources: sources.map(src => ({ src: src.url, type: src.type || 'video/mp4', size: 720 })) }; }, initMangaReader(container) { return { loadPages(pagesData) { container.innerHTML = ''; const pages = pagesData.pages || []; if (pages.length === 0) { container.innerHTML = '<div class="no-content">No pages available.</div>'; return; } const fragment = document.createDocumentFragment(); pages.forEach(page => { const img = document.createElement('img'); img.src = page.url; img.alt = Page ${page.id}; img.className = 'manga-page'; fragment.appendChild(img); }); container.appendChild(fragment); } }; } } };

// Automatically expose API to global scope 
window.api = api;

  
