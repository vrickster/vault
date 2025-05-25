// Global state management
window.vricksterData = {
  anime: { trending: [] },
  movies: { trending: [] },
  manga: { trending: [] },
  currentCategory: null
};

// Search timeout for debouncing
let searchTimeout = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  initializeApplication();
});

// Initialize trending content for all categories
async function initializeApplication() {
  try {
    // Only initialize if we're on the homepage
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      await initializeContent();
    }
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
}

// Loading and error state management
function showLoadingState() {
  const loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'loading-overlay';
  loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
  document.body.appendChild(loadingOverlay);
}

function hideLoadingState() {
  const loadingOverlay = document.querySelector('.loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.classList.add('fade-out');
    setTimeout(() => {
      if (loadingOverlay.parentNode) {
        loadingOverlay.parentNode.removeChild(loadingOverlay);
      }
    }, 300);
  }
}

function showErrorState(message) {
  const errorOverlay = document.createElement('div');
  errorOverlay.className = 'error-overlay';
  errorOverlay.innerHTML = `
    <div class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <p>${message}</p>
      <button class="retry-button">Retry</button>
    </div>
  `;
  
  document.body.appendChild(errorOverlay);
  errorOverlay.querySelector('.retry-button').addEventListener('click', () => {
    document.body.removeChild(errorOverlay);
    initializeContent();
  });
}

// Initialize trending content for all categories
async function initializeContent() {
  try {
    showLoadingState();
    
    // Fetch trending content for all categories in parallel
    const [trendingAnime, trendingMovies, trendingManga] = await Promise.all([
      api.anime.getTrending(),
      api.movies.getTrending(),
      api.manga.getTrending()
    ]);
    
    // Store data in global state for quick access
    window.vricksterData = {
      anime: { trending: trendingAnime },
      movies: { trending: trendingMovies },
      manga: { trending: trendingManga },
      currentCategory: null
    };
    
    hideLoadingState();
  } catch (error) {
    console.error('Failed to initialize content:', error);
    hideLoadingState();
    showErrorState('Failed to load content. Please try again later.');
  }
}

// Initialize search functionality for a category
function initializeCategorySearch(category) {
  let searchBar = document.querySelector('.search-bar');
  
  if (!searchBar) {
    searchBar = document.createElement('div');
    searchBar.className = 'search-bar';
    searchBar.innerHTML = `
      <div class="search-input-container">
        <i class="fas fa-search"></i>
        <input type="text" id="search-input" placeholder="Search ${category}...">
        <i class="fas fa-times clear-search" style="display: none;"></i>
      </div>
    `;
    
    const contentSection = document.getElementById('content');
    if (contentSection) {
      contentSection.insertBefore(searchBar, document.getElementById('content-items'));
    }
    
    const searchInput = document.getElementById('search-input');
    const clearButton = document.querySelector('.clear-search');
    
    searchInput.addEventListener('input', function() {
      clearButton.style.display = this.value.length > 0 ? 'block' : 'none';
      
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      searchTimeout = setTimeout(() => {
        if (this.value.length >= 2) {
          fetchAndDisplayContent(category, this.value);
        } else if (this.value.length === 0) {
          fetchAndDisplayContent(category);
        }
      }, 500);
    });
    
    clearButton.addEventListener('click', function() {
      searchInput.value = '';
      this.style.display = 'none';
      fetchAndDisplayContent(category);
    });
  } else {
    document.getElementById('search-input').placeholder = `Search ${category}...`;
    document.getElementById('search-input').value = '';
    document.querySelector('.clear-search').style.display = 'none';
  }
}

// Show content for selected category (called from HTML)
async function showContent(category) {
  window.vricksterData.currentCategory = category;
  
  const title = document.getElementById('category-title');
  const description = document.getElementById('category-description');
  const contentSection = document.getElementById('content');
  
  contentSection.style.display = 'block';
  contentSection.classList.remove('fadeIn');
  void contentSection.offsetWidth;
  contentSection.classList.add('fadeIn');
  
  if (category === 'movies') {
    title.textContent = "Movies and TV Shows";
    description.textContent = "Here you'll find a collection of the latest and greatest movies and TV shows.";
  } else if (category === 'anime') {
    title.textContent = "Anime";
    description.textContent = "Dive into your favorite anime series here.";
  } else if (category === 'manga') {
    title.textContent = "Manga";
    description.textContent = "Explore the world of manga comics with our extensive collection.";
  }
  
  initializeCategorySearch(category);
  await fetchAndDisplayContent(category);
}

// Fetch and display content for a category
async function fetchAndDisplayContent(category, searchQuery = null) {
  const contentGrid = document.getElementById('content-items');
  
  contentGrid.innerHTML = '<div class="loading">Loading content...</div>';
  
  try {
    let items = [];
    
    if (searchQuery) {
      const categoryAPI = api.getAPI(category);
      if (!categoryAPI) {
        throw new Error(`Invalid category: ${category}`);
      }
      items = await categoryAPI.search(searchQuery);
    } else {
      items = window.vricksterData[category]?.trending || [];
      
      if (items.length === 0) {
        const categoryAPI = api.getAPI(category);
        if (!categoryAPI) {
          throw new Error(`Invalid category: ${category}`);
        }
        
        items = await categoryAPI.getTrending();
        
        if (!window.vricksterData[category]) window.vricksterData[category] = {};
        window.vricksterData[category].trending = items;
      }
    }
    
    displayContent(items, contentGrid, category);
  } catch (error) {
    console.error(`Error fetching ${category} content:`, error);
    contentGrid.innerHTML = `<div class="error">Error loading ${category}. Please try again later.</div>`;
  }
}

// Display content items (used by homepage)
function displayContent(data, container, category) {
  container.innerHTML = '';
  
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="no-content">No content available in this category.</div>';
    return;
  }
  
  data.forEach(item => {
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item fadeIn';
    
    let year = item.year || 'N/A';
    let meta = '';
    
    switch (category) {
      case 'anime':
        meta = item.episodes || 'Unknown episodes';
        break;
      case 'movies':
        meta = item.rating || 'Not rated';
        break;
      case 'manga':
        meta = item.status || 'Unknown status';
        break;
    }
    
    contentItem.innerHTML = `
      <div class="content-thumbnail">
        <img src="${item.image || '/api/placeholder/400/320'}" alt="${item.title || 'Content'}">
        <div class="play-button"></div>
      </div>
      <div class="content-info">
        <div class="content-title">${item.title || 'Untitled'}</div>
        <div class="content-meta">
          <span>${year}</span>
          <span>${meta}</span>
        </div>
      </div>
    `;
    
    contentItem.addEventListener('click', () => {
      showContentDetails(item, category);
    });
    
    container.appendChild(contentItem);
  });
}

// Functions called by the HTML files for API integration

// Load content for a category (called by HTML)
async function loadContent(category) {
  const topPerformersGrid = document.getElementById('top-performers-grid');
  const contentItems = document.getElementById('content-items');
  
  topPerformersGrid.innerHTML = '<div class="loading">Loading top performers...</div>';
  contentItems.innerHTML = '<div class="loading">Loading content...</div>';
  
  try {
    // Load content using the new API structure
    const categoryAPI = api.getAPI(category);
    if (!categoryAPI) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    // Get trending content
    const trendingData = await categoryAPI.getTrending();
    
    // Display both top performers and regular content
    displayContentItems(trendingData.slice(0, 6), topPerformersGrid); // Top 6 as top performers
    displayContentItems(trendingData, contentItems);
    
  } catch (error) {
    console.error(`Error loading ${category} content:`, error);
    topPerformersGrid.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load top performers: ${error.message}</p>
        <button class="retry-button" onclick="loadTopPerformers('${category}')">Retry</button>
      </div>
    `;
    contentItems.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load content: ${error.message}</p>
        <button class="retry-button" onclick="loadCategoryContent('${category}')">Retry</button>
      </div>
    `;
  }
}

// Load top performers (called by HTML)
async function loadTopPerformers(category) {
  const topPerformersGrid = document.getElementById('top-performers-grid');
  topPerformersGrid.innerHTML = '<div class="loading">Loading top performers...</div>';
  
  try {
    const categoryAPI = api.getAPI(category);
    if (!categoryAPI) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    const data = await categoryAPI.getTrending();
    displayContentItems(data.slice(0, 6), topPerformersGrid); // Top 6 as top performers
  } catch (error) {
    console.error(`Error loading top performers for ${category}:`, error);
    topPerformersGrid.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load top performers: ${error.message}</p>
        <button class="retry-button" onclick="loadTopPerformers('${category}')">Retry</button>
      </div>
    `;
  }
}

// Load category content (called by HTML)
async function loadCategoryContent(category) {
  const contentItems = document.getElementById('content-items');
  contentItems.innerHTML = '<div class="loading">Loading content...</div>';
  
  try {
    const categoryAPI = api.getAPI(category);
    if (!categoryAPI) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    const data = await categoryAPI.getTrending();
    displayContentItems(data, contentItems);
  } catch (error) {
    console.error(`Error loading category content for ${category}:`, error);
    contentItems.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load content: ${error.message}</p>
        <button class="retry-button" onclick="loadCategoryContent('${category}')">Retry</button>
      </div>
    `;
  }
}

// Display content items (called by HTML)
function displayContentItems(items, container) {
  container.innerHTML = '';
  
  if (!items || items.length === 0) {
    container.innerHTML = `
      <div class="no-content">
        <i class="fas fa-search fa-3x"></i>
        <h3>No Content Found</h3>
        <p>Try a different category or check back later.</p>
      </div>
    `;
    return;
  }
  
  const template = document.getElementById('content-item-template');
  
  items.forEach(item => {
    const contentItem = template.content.cloneNode(true);
    
    const itemElement = contentItem.querySelector('.content-item');
    itemElement.setAttribute('data-id', item.id);
    itemElement.setAttribute('data-type', item.type || 'unknown');
    itemElement.addEventListener('click', () => openContentDetails(item));
    
    contentItem.querySelector('.poster-image').src = item.image || '/api/placeholder/400/320';
    contentItem.querySelector('.poster-image').alt = item.title + ' Poster';
    
    if (item.rating) {
      contentItem.querySelector('.content-rating span').textContent = item.rating;
    } else {
      contentItem.querySelector('.content-rating').style.display = 'none';
    }
    
    contentItem.querySelector('.content-title').textContent = item.title;
    contentItem.querySelector('.content-year').textContent = item.year || 'Unknown';
    contentItem.querySelector('.content-type').textContent = item.type || 'Unknown';
    
    container.appendChild(contentItem);
  });
}

// Open content details modal (called by HTML)
async function openContentDetails(item) {
  const modal = document.getElementById('content-modal');
  const modalContent = document.getElementById('modal-content-details');
  
  modalContent.innerHTML = '<div class="loading-spinner"></div>';
  modal.style.display = 'block';
  
  try {
    // Determine category based on item type or current category
    let category = window.vricksterData.currentCategory;
    if (!category) {
      // Try to determine from item type
      if (item.type === 'anime') category = 'anime';
      else if (item.type === 'manga') category = 'manga';
      else category = 'movies';
    }
    
    const categoryAPI = api.getAPI(category);
    if (!categoryAPI) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    const details = await categoryAPI.getDetails(item.id);
    
    modalContent.innerHTML = `
      <div class="modal-header">
        <h2>${details.title}</h2>
        <div class="modal-meta">
          <span>${details.year || 'Unknown'}</span>
          <span>${details.type || 'Unknown'}</span>
          ${details.rating ? `<span>Rating: ${details.rating}</span>` : ''}
        </div>
      </div>
      <div class="modal-body">
        <div class="modal-poster">
          <img src="${details.image || '/api/placeholder/400/320'}" alt="${details.title} Poster">
        </div>
        <div class="modal-info">
          <p>${details.description || 'No description available.'}</p>
          
          ${details.genres ? `
          <div class="modal-genres">
            <h3>Genres</h3>
            <div class="genre-tags">
              ${details.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
            </div>
          </div>` : ''}
        </div>
      </div>
      <div class="modal-actions">
        <button class="play-button" onclick="playContent('${details.id}', '${category}')">
          <i class="fas fa-play"></i> Play
        </button>
      </div>
    `;
  } catch (error) {
    console.error('Error loading content details:', error);
    modalContent.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load content details: ${error.message}</p>
        <button class="retry-button" onclick="openContentDetails(${JSON.stringify(item)})">Retry</button>
      </div>
    `;
  }
}

// Play content (called by HTML)
function playContent(id, category) {
  console.log(`Playing content: ${id} of category ${category}`);
  document.getElementById('content-modal').style.display = 'none';
  showContentDetails({id: id}, category);
}

// Show content details and player/reader
async function showContentDetails(item, category) {
  try {
    const modal = document.createElement('div');
    modal.className = 'content-modal';
    modal.innerHTML = '<div class="loading">Loading content details...</div>';
    document.body.appendChild(modal);
    
    const categoryAPI = api.getAPI(category);
    if (!categoryAPI) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    const details = await categoryAPI.getDetails(item.id);
    
    if (!details) {
      throw new Error('Failed to load content details');
    }
    
    let modalContent = `
      <div class="modal-header">
        <button class="close-modal">&times;</button>
        <h2>${details.title}</h2>
      </div>
      <div class="modal-body">
        <div class="content-details">
          <div class="content-poster">
            <img src="${details.image || '/api/placeholder/400/320'}" alt="${details.title}">
          </div>
          <div class="content-info">
            <div class="content-meta">
              ${details.year ? `<span class="year">${details.year}</span>` : ''}
              ${details.status ? `<span class="status">${details.status}</span>` : ''}
              ${details.rating ? `<span class="rating">${details.rating}</span>` : ''}
              ${details.duration ? `<span class="duration">${details.duration}</span>` : ''}
              ${details.episodes && details.episodes.length ? `<span class="episodes">${details.episodes.length} Episodes</span>` : ''}
            </div>
            <div class="content-description">${details.description || 'No description available.'}</div>
            <div class="content-genres">${details.genres ? details.genres.join(', ') : 'No genres available'}</div>
          </div>
        </div>
        <div class="content-player-container">
          ${await generatePlayerContent(details, category)}
        </div>
      </div>
    `;
    
    modal.innerHTML = modalContent;
    
    modal.querySelector('.close-modal').addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal);
      }
    });
    
    // Initialize player based on category
    if (category === 'anime' || category === 'movies') {
      await initializeVideoPlayer(details, modal, category);
    } else if (category === 'manga') {
      initializeMangaReader(details, modal);
    }
    
  } catch (error) {
    console.error('Error showing content details:', error);
    const errorModal = document.createElement('div');
    errorModal.className = 'content-modal';
    errorModal.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>Failed to load content: ${error.message}</p>
        <button class="retry-button" onclick="this.closest('.content-modal').remove(); showContentDetails(${JSON.stringify(item)}, '${category}')">Retry</button>
        <button class="close-button" onclick="this.closest('.content-modal').remove()">Close</button>
      </div>
    `;
    document.body.appendChild(errorModal);
  }
}

// Generate player/reader content based on category and details
async function generatePlayerContent(details, category) {
  if (category === 'anime') {
    if (!details.episodes || details.episodes.length === 0) {
      return `<div class="no-content">No episodes available.</div>`;
    }
    
    return `
      <div class="episode-selection">
        <h3>Episodes</h3>
        <div class="episodes-grid">
          ${details.episodes.map(ep => `
            <div class="episode-item" data-id="${ep.id}" data-number="${ep.number}">
              Episode ${ep.number}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="video-player-container" style="display: none;">
        <video id="video-player" controls crossorigin="anonymous"></video>
      </div>
    `;
  } else if (category === 'movies') {
    if (details.type && details.type.toLowerCase() === 'tv' && details.episodes && details.episodes.length > 0) {
      return `
        <div class="episode-selection">
          <h3>Episodes</h3>
          <div class="episodes-grid">
            ${details.episodes.map(ep => `
              <div class="episode-item" data-id="${ep.id}" data-media-id="${details.id}">
                ${ep.title || `Episode ${ep.number || 'Unknown'}`}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="video-player-container" style="display: none;">
          <video id="video-player" controls crossorigin="anonymous"></video>
        </div>
      `;
    } else {
      return `
        <div class="video-player-container">
          <video id="video-player" controls crossorigin="anonymous"></video>
          <div class="player-loading">Loading video...</div>
        </div>
      `;
    }
  } else if (category === 'manga') {
    if (!details.chapters || details.chapters.length === 0) {
      return `<div class="no-content">No chapters available.</div>`;
    }
    
    return `
      <div class="chapter-selection">
        <h3>Chapters</h3>
        <div class="chapters-grid">
          ${details.chapters.map(ch => `
            <div class="chapter-item" data-id="${ch.id}">
              ${ch.title || `Chapter ${ch.number || 'Unknown'}`}
            </div>
          `).join('')}
        </div>
      </div>
      <div class="manga-reader-container" style="display: none;"></div>
    `;
  }
  
  return `<div class="no-content">No playable content available.</div>`;
}

// Initialize video player for anime or movies/shows
async function initializeVideoPlayer(details, modalElement, category) {
  if ((category === 'anime' || (details.type && details.type.toLowerCase() === 'tv')) && 
      details.episodes && details.episodes.length > 0) {
    
    const episodeItems = modalElement.querySelectorAll('.episode-item');
    
    episodeItems.forEach(item => {
      item.addEventListener('click', async () => {
        const playerContainer = modalElement.querySelector('.video-player-container');
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = '<div class="player-loading">Loading video...</div>';
        
        try {
          const episodeId = item.getAttribute('data-id');
          const mediaId = item.getAttribute('data-media-id');
          
          let sources, subtitles;
          
          if (category === 'anime') {
            const sourceData = await api.anime.getEpisodeSources(episodeId);
            sources = sourceData.sources;
            subtitles = sourceData.subtitles;
          } else {
            const sourceData = await api.movies.getStreamingSources(episodeId, mediaId);
            sources = sourceData.sources;
            subtitles = sourceData.subtitles;
          }
          
          playerContainer.innerHTML = '<video id="video-player" controls crossorigin="anonymous"></video>';
          const videoElement = document.getElementById('video-player');
          
          const player = api.player.initVideoPlayer(videoElement);
          api.player.setVideoSource(player, sources, subtitles);
          
          episodeItems.forEach(ep => ep.classList.remove('selected'));
          item.classList.add('selected');
          
        } catch (error) {
          console.error('Failed to load video:', error);
          playerContainer.innerHTML = '<div class="error">Failed to load video. Please try again later.</div>';
        }
      });
    });
    
    if (episodeItems.length > 0) {
      episodeItems[0].click();
    }
  } else if (category === 'movies' && (!details.type || details.type.toLowerCase() === 'movie')) {
    const playerContainer = modalElement.querySelector('.video-player-container');
    
    try {
      if (details.episodes && details.episodes.length > 0) {
        const movieEpisode = details.episodes[0];
        const sourceData = await api.movies.getStreamingSources(movieEpisode.id, details.id);
        
        playerContainer.innerHTML = '<video id="video-player" controls crossorigin="anonymous"></video>';
        const videoElement = document.getElementById('video-player');
        
        const player = api.player.initVideoPlayer(videoElement);
        api.player.setVideoSource(player, sourceData.sources, sourceData.subtitles);
      } else {
        playerContainer.innerHTML = '<div class="error">No playable sources found for this movie.</div>';
      }
    } catch (error) {
      console.error('Failed to load movie:', error);
      playerContainer.innerHTML = '<div class="error">Failed to load video. Please try again later.</div>';
    }
  }
}

// Initialize manga reader
function initializeMangaReader(details, modalElement) {
  if (!details.chapters || details.chapters.length === 0) {
    return;
  }
  
  const chapterItems = modalElement.querySelectorAll('.chapter-item');
  const readerContainer = modalElement.querySelector('.manga-reader-container');
  
  const reader = api.player.initMangaReader(readerContainer);
  
  chapterItems.forEach(item => {
    item.addEventListener('click', async () => {
      readerContainer.style.display = 'block';
      readerContainer.innerHTML = '<div class="reader-loading">Loading chapter...</div>';
      
      try {
        const chapterId = item.getAttribute('data-id');
        const pages = await api.manga.getChapterPages(chapterId);
        
        reader.loadPages(pages);
        
        chapterItems.forEach(ch => ch.classList.remove('selected'));
        item.classList.add('selected');
        
      } catch (error) {
        console.error('Failed to load chapter:', error);
        readerContainer.innerHTML = '<div class="error">Failed to load chapter. Please try again later.</div>';
      }
    });
  });
  
  if (chapterItems.length > 0) {
    chapterItems[0].click();
  }
}