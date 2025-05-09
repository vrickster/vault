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
  
  // Add retry button functionality
  document.body.appendChild(errorOverlay);
  errorOverlay.querySelector('.retry-button').addEventListener('click', () => {
    // Remove error overlay
    document.body.removeChild(errorOverlay);
    // Retry initial loading
    initializeContent();
  });
}

// Initialize trending content for all categories
async function initializeContent() {
  try {
    // Show loading state
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
    
    // Hide loading state
    hideLoadingState();
  } catch (error) {
    console.error('Failed to initialize content:', error);
    showErrorState('Failed to load content. Please try again later.');
  }
}

// Initialize search functionality for a category
function initializeCategorySearch(category) {
  // Check if we already have a search bar
  let searchBar = document.querySelector('.search-bar');
  
  // Create search bar if it doesn't exist
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
    
    // Add search bar to the content section before the grid
    document.getElementById('content').insertBefore(
      searchBar, 
      document.getElementById('content-items')
    );
    
    // Add event listeners for search
    const searchInput = document.getElementById('search-input');
    const clearButton = document.querySelector('.clear-search');
    
    searchInput.addEventListener('input', function() {
      // Show/hide clear button
      clearButton.style.display = this.value.length > 0 ? 'block' : 'none';
      
      // Debounce search requests
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      searchTimeout = setTimeout(() => {
        if (this.value.length >= 2) {
          // Perform search
          fetchAndDisplayContent(category, this.value);
        } else if (this.value.length === 0) {
          // Show trending content
          fetchAndDisplayContent(category);
        }
      }, 500);
    });
    
    // Clear search
    clearButton.addEventListener('click', function() {
      searchInput.value = '';
      this.style.display = 'none';
      fetchAndDisplayContent(category);
    });
  } else {
    // Update existing search bar for new category
    document.getElementById('search-input').placeholder = `Search ${category}...`;
    document.getElementById('search-input').value = '';
    document.querySelector('.clear-search').style.display = 'none';
  }
}

// Show content for selected category
async function showContent(category) {
  // Update current category in global state
  window.vricksterData.currentCategory = category;
  
  const title = document.getElementById('category-title');
  const description = document.getElementById('category-description');
  const contentSection = document.getElementById('content');
  
  // Display the content section with animation
  contentSection.style.display = 'block';
  contentSection.classList.remove('fadeIn');
  void contentSection.offsetWidth; // Trigger reflow
  contentSection.classList.add('fadeIn');
  
  // Set the category title and description
  if (category === 'movies') {
    title.textContent = "Movies and TV Shows";
    description.textContent = "Here you'll find a collection of the latest and greatest movies and TV shows.";
    
    // Fetch and display the trending movies/shows
    fetchAndDisplayContent('movies');
  } else if (category === 'anime') {
    title.textContent = "Anime";
    description.textContent = "Dive into your favorite anime series here.";
    
    // Fetch and display the trending anime
    fetchAndDisplayContent('anime');
  } else if (category === 'manga') {
    title.textContent = "Manga";
    description.textContent = "Explore the world of manga comics with our extensive collection.";
    
    // Fetch and display the trending manga
    fetchAndDisplayContent('manga');
  }
  
  // Initialize search for this category
  initializeCategorySearch(category);
}

// Fetch and display content for a category
async function fetchAndDisplayContent(category, searchQuery = null) {
  const contentGrid = document.getElementById('content-items');
  
  // Show loading state
  contentGrid.innerHTML = '<div class="loading">Loading content...</div>';
  
  try {
    let items = [];
    
    // Get content based on whether this is a search or trending request
    if (searchQuery) {
      // Get the appropriate API for this category
      const categoryAPI = api.getAPI(category);
      if (!categoryAPI) {
        throw new Error(`Invalid category: ${category}`);
      }
      
      // Fetch search results
      items = await categoryAPI.search(searchQuery);
    } else {
      // Use cached trending data if available
      items = window.vricksterData[category]?.trending || [];
      
      // If no cached data, fetch it
      if (items.length === 0) {
        const categoryAPI = api.getAPI(category);
        if (!categoryAPI) {
          throw new Error(`Invalid category: ${category}`);
        }
        
        items = await categoryAPI.getTrending();
        
        // Cache the results
        if (!window.vricksterData[category]) window.vricksterData[category] = {};
        window.vricksterData[category].trending = items;
      }
    }
    
    // Display the content
    displayContent(items, contentGrid, category);
  } catch (error) {
    console.error(`Error fetching ${category} content:`, error);
    contentGrid.innerHTML = `<div class="error">Error loading ${category}. Please try again later.</div>`;
  }
}

// Generate player/reader content based on category and details
async function generatePlayerContent(details, category) {
  if (category === 'anime') {
    // For anime, show episode selection
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
    // For movies, either show direct player or episode/season selection for shows
    if (details.type && details.type.toLowerCase() === 'tv' && details.episodes && details.episodes.length > 0) {
      // TV Show with episodes
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
      // Movie with direct play
      return `
        <div class="video-player-container">
          <video id="video-player" controls crossorigin="anonymous"></video>
          <div class="player-loading">Loading video...</div>
        </div>
      `;
    }
  } else if (category === 'manga') {
    // For manga, show chapter selection
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
  // If this is a TV show or anime, add click event listeners to episodes
  if ((category === 'anime' || (details.type && details.type.toLowerCase() === 'tv')) && 
      details.episodes && details.episodes.length > 0) {
    
    const episodeItems = modalElement.querySelectorAll('.episode-item');
    
    episodeItems.forEach(item => {
      item.addEventListener('click', async () => {
        // Show loading
        const playerContainer = modalElement.querySelector('.video-player-container');
        playerContainer.style.display = 'block';
        playerContainer.innerHTML = '<div class="player-loading">Loading video...</div>';
        
        try {
          // Get episode ID and other required parameters
          const episodeId = item.getAttribute('data-id');
          const mediaId = item.getAttribute('data-media-id'); // Only for movies/TV
          
          // Get sources based on category
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
          
          // Create video element
          playerContainer.innerHTML = '<video id="video-player" controls crossorigin="anonymous"></video>';
          const videoElement = document.getElementById('video-player');
          
          // Initialize player
          const player = api.player.initVideoPlayer(videoElement);
          
          // Set sources
          api.player.setVideoSource(player, sources, subtitles);
          
          // Highlight the selected episode
          episodeItems.forEach(ep => ep.classList.remove('selected'));
          item.classList.add('selected');
          
        } catch (error) {
          console.error('Failed to load video:', error);
          playerContainer.innerHTML = '<div class="error">Failed to load video. Please try again later.</div>';
        }
      });
    });
    
    // Auto-play first episode if available
    if (episodeItems.length > 0) {
      episodeItems[0].click();
    }
  } 
  // For direct movie playback
  else if (category === 'movies' && (!details.type || details.type.toLowerCase() === 'movie')) {
    const playerContainer = modalElement.querySelector('.video-player-container');
    
    try {
      // For direct movies, use the first episode (which should be the movie itself)
      if (details.episodes && details.episodes.length > 0) {
        const movieEpisode = details.episodes[0];
        const sourceData = await api.movies.getStreamingSources(movieEpisode.id, details.id);
        
        // Create video element
        playerContainer.innerHTML = '<video id="video-player" controls crossorigin="anonymous"></video>';
        const videoElement = document.getElementById('video-player');
        
        // Initialize player
        const player = api.player.initVideoPlayer(videoElement);
        
        // Set sources
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
  
  // Initialize the manga reader
  const reader = api.player.initMangaReader(readerContainer);
  
  // Add click event to chapters
  chapterItems.forEach(item => {
    item.addEventListener('click', async () => {
      // Show loading
      readerContainer.style.display = 'block';
      readerContainer.innerHTML = '<div class="reader-loading">Loading chapter...</div>';
      
      try {
        const chapterId = item.getAttribute('data-id');
        
        // Get chapter pages
        const pages = await api.manga.getChapterPages(chapterId);
        
        // Load pages into reader
        reader.loadPages(pages);
        
        // Highlight selected chapter
        chapterItems.forEach(ch => ch.classList.remove('selected'));
        item.classList.add('selected');
        
      } catch (error) {
        console.error('Failed to load chapter:', error);
        readerContainer.innerHTML = '<div class="error">Failed to load chapter. Please try again later.</div>';
      }
    });
  });
  
  // Auto-open first chapter
  if (chapterItems.length > 0) {
    chapterItems[0].click();
  }
}

// Function to display content
function displayContent(data, container, category) {
  // Clear container
  container.innerHTML = '';
  
  // Check if we have content
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="no-content">No content available in this category.</div>';
    return;
  }
  
  // Loop through data and create content items
  data.forEach(item => {
    // Create content item
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item fadeIn';
    
    // Determine the content details based on category
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
    
    // Populate the content item
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
    
    // Add click handler for the content item
    contentItem.addEventListener('click', () => {
      // Show content details and player
      showContentDetails(item, category);
    });
    
    // Add to container
    container.appendChild(contentItem);
  });
}

// Show content details and player/reader
async function showContentDetails(item, category) {
  try {
    // Create a modal for displaying the content
    const modal = document.createElement('div');
    modal.className = 'content-modal';
    
    // Add a loading indicator
    modal.innerHTML = '<div class="loading">Loading content details...</div>';
    
    // Add to the document
    document.body.appendChild(modal);
    
    // Get the appropriate API for this category
    const categoryAPI = api.getAPI(category);
    if (!categoryAPI) {
      throw new Error(`Invalid category: ${category}`);
    }
    
    // Fetch the content details
    const details = await categoryAPI.getDetails(item.id);
    
    if (!details) {
      throw new Error('Failed to load content details');
    }
    
    // Create the modal content based on the category
    let modalContent = '';
    
    // Common header for all content types
    modalContent = `
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
    
    // Update the modal content
    modal.innerHTML = modalContent;
    
    // Add close event listener
    modal.querySelector('.close-moda
