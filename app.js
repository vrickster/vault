// Prompt for password
let password = prompt("Enter password:");

if (password !== "alphaco2") {
  document.body.innerHTML = "<h1>Access Denied</h1>";
} else {
  // Create content if password is correct
  document.body.innerHTML = `
    <h1>Pirate Vault</h1>
    <ul>
      <li onclick="showContent('movies')">Movies and TV Shows</li>
      <li onclick="showContent('anime')">Animes</li>
      <li onclick="showContent('manga')">Manga</li>
    </ul>
    <div id="content">
      <h2 id="category-title"></h2>
      <p id="category-description"></p>
    </div>
  `;
}

// Function to show content based on category selection
function showContent(category) {
  const title = document.getElementById('category-title');
  const description = document.getElementById('category-description');
  
  // Show the content div
  document.getElementById('content').style.display = 'block';

  // Set the title and description based on the clicked category
  if (category === 'movies') {
    title.textContent = "Movies and TV Shows";
    description.textContent = "Here you'll find a collection of the latest and greatest movies and TV shows.";
  } else if (category === 'anime') {
    title.textContent = "Animes";
    description.textContent = "Dive into your favorite anime series here.";
  } else if (category === 'manga') {
    title.textContent = "Manga";
    description.textContent = "Explore the world of manga comics with our extensive collection.";
  }
}
