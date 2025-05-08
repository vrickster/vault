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
