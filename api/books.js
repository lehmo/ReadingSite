const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
    try {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'application/json');
        
        const booksPath = path.join(process.cwd(), 'data', 'books.json');
        
        if (!fs.existsSync(booksPath)) {
            return res.status(404).json({ 
                error: 'Books data not found',
                path: booksPath
            });
        }

        const booksData = fs.readFileSync(booksPath, 'utf8');
        const books = JSON.parse(booksData);
        
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
        res.status(200).json(books);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ 
            error: 'Failed to load books',
            details: error.message
        });
    }
};
