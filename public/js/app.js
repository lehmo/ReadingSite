document.addEventListener('DOMContentLoaded', () => {
  console.log('App initialized');
  fetchBooks();
});

async function fetchBooks() {
  try {
    console.log('Fetching books...');
    const response = await fetch('/api/books');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const books = await response.json();
    console.log('Books loaded:', books);
    renderBooks(books);
  } catch (error) {
    console.error('Error loading books:', error);
    document.getElementById('app').innerHTML = `
      <div class="p-4 text-red-600">
        <h2 class="text-xl font-bold">Error Loading Books</h2>
        <p>${error.message}</p>
        <p>Please check the console for more details.</p>
      </div>
    `;
  }
}

function renderBooks(books) {
  const app = document.getElementById('app');
  if (!books || books.length === 0) {
    app.innerHTML = '<p>No books found.</p>';
    return;
  }

  app.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      ${books.map(book => `
        <div class="bg-white rounded-lg shadow-md overflow-hidden">
          ${book.cover ? `
            <img src="${book.cover}" alt="${book.title}" class="w-full h-48 object-cover">
          ` : ''}
          <div class="p-4">
            <h2 class="text-xl font-semibold">${book.title}</h2>
            <p class="text-gray-600">${book.author}</p>
            <div class="mt-2">
              <span class="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                ${book.type}
              </span>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}
