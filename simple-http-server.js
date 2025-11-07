const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 4000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    console.log(`Request: ${req.method} ${req.url}`); // Log all requests
    
    // API endpoint for books
    if (parsedUrl.pathname === '/api/books') {
        const booksPath = path.join(DATA_DIR, 'books.json');
        console.log(`Reading books from: ${booksPath}`); // Log file path
        
        // Check if file exists
        if (!fs.existsSync(booksPath)) {
            console.error('Books file not found!'); // Log error
            res.writeHead(404, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Books data not found' }));
        }

        // Read and parse the file
        fs.readFile(booksPath, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading books file:', err); // Log error
                res.writeHead(500);
                return res.end('Error loading books data');
            }
            
            try {
                const books = JSON.parse(data);
                console.log(`Serving ${books.length} books`); // Log number of books
                res.setHeader('Content-Type', 'application/json');
                res.end(data);
            } catch (parseError) {
                console.error('Error parsing books JSON:', parseError); // Log parse error
                res.writeHead(500);
                res.end('Error parsing books data');
            }
        });
        return;
    }

    // Serve static files
    let filePath = path.join(
        PUBLIC_DIR,
        parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname
    );

    const extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Log file serving
    console.log(`Serving file: ${filePath}`); // Log file being served

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // Page not found, serve index.html for SPA routing
                const indexPath = path.join(PUBLIC_DIR, 'index.html');
                console.log(`File not found, serving index.html: ${indexPath}`); // Log fallback
                
                fs.readFile(indexPath, (err, content) => {
                    if (err) {
                        console.error('Error reading index.html:', err); // Log error
                        res.writeHead(500);
                        res.end('Error loading index.html');
                        return;
                    }
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                // Server error
                console.error('Server error:', error); // Log server error
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            // Success
            console.log(`Serving ${filePath} with content-type: ${contentType}`); // Log success
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log('Public directory:', PUBLIC_DIR);
    console.log('Data directory:', DATA_DIR);
    console.log('Press Ctrl+C to stop the server');
});
