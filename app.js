// Password verification
function checkPassword() {
  const input = document.getElementById('password-input').value;
  if (input === "alphaco2") {
    document.getElementById('login').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
    // Add animation class
    document.getElementById('main-content').classList.add('fadeIn');
  } else {
    alert("Access Denied");
    document.getElementById('password-input').value = '';
  }
}

// Handle Enter key press for password input
document.getElementById('password-input').addEventListener('keydown', function(event) {
  if (event.key === 'Enter') {
    checkPassword();
  }
});

// Category descriptions
const categoryDescriptions = {
  movies: "Here you'll find a collection of the latest and greatest movies and TV shows.",
  anime: "Dive into your favorite anime series here.",
  manga: "Explore the world of manga comics with our extensive collection."
};

// Show content for selected category
function showContent(category) {
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
    description.textContent = categoryDescriptions.movies;
    // Here you would fetch data from your API instead of using hardcoded data
    fetchContentFromAPI(category);
  } else if (category === 'anime') {
    title.textContent = "Anime";
    description.textContent = categoryDescriptions.anime;
    // Here you would fetch data from your API instead of using hardcoded data
    fetchContentFromAPI(category);
  } else if (category === 'manga') {
    title.textContent = "Manga";
    description.textContent = categoryDescriptions.manga;
    // Here you would fetch data from your API instead of using hardcoded data
    fetchContentFromAPI(category);
  }
}

// Function to fetch content from an API
function fetchContentFromAPI(category) {
  // This is a placeholder function where you would integrate your third-party API
  const contentGrid = document.getElementById('content-items');
  
  // Clear previous content
  contentGrid.innerHTML = '';
  
  // Show loading state
  contentGrid.innerHTML = '<div class="loading">Loading content...</div>';
  
  // Simulating API call with setTimeout
  // In a real implementation, you would replace this with an actual fetch call
  setTimeout(() => {
    // This is where you would process the API response
    contentGrid.innerHTML = `<div class="api-message">Content for ${category} would be loaded from your API here.</div>`;
  }, 1000);
  
  /* 
  // Example of how you might fetch from an actual API:
  fetch('https://your-api-endpoint.com/content/' + category)
    .then(response => response.json())
    .then(data => {
      // Process the data and update UI
      displayContent(data, contentGrid);
    })
    .catch(error => {
      contentGrid.innerHTML = '<div class="error">Error loading content. Please try again later.</div>';
      console.error('Error fetching content:', error);
    });
  */
}

// Function to display content (to be used with actual API data)
function displayContent(data, container) {
  // Clear container
  container.innerHTML = '';
  
  // Check if we have content
  if (!data || data.length === 0) {
    container.innerHTML = '<div class="no-content">No content available in this category.</div>';
    return;
  }
  
  // Loop through data and create content items
  data.forEach(item => {
    // Create content item based on the data you receive from your API
    const contentItem = document.createElement('div');
    contentItem.className = 'content-item fadeIn';
    
    // Populate the content item based on your API data structure
    // This is just an example - adjust according to your actual data
    contentItem.innerHTML = `
      <div class="content-thumbnail">
        <img src="${item.image || '/api/placeholder/400/320'}" alt="${item.title || 'Content'}">
        <div class="play-button"></div>
      </div>
      <div class="content-info">
        <div class="content-title">${item.title || 'Untitled'}</div>
        <div class="content-meta">
          <span>${item.year || 'N/A'}</span>
          <span>${item.duration || item.episodes || item.chapters || 'N/A'}</span>
        </div>
      </div>
    `;
    
    // Add click handler for the content item
    contentItem.addEventListener('click', () => {
      // Handle item click (e.g., play video, open manga reader, etc.)
      console.log('Item clicked:', item);
      // Implement your action here
    });
    
    // Add to container
    container.appendChild(contentItem);
  });
    }
