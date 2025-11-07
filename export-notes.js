const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration - Update these paths to match your setup
const OBSIDIAN_VAULT_PATH = '/Users/belogos/Library/Mobile Documents/com~apple~CloudDocs/SaveObsidian/ObsStrands';
const BOOKS_FOLDER = 'ibooks-highlights';
const OUTPUT_FILE = './data/books.json';

// Ensure output directory exists
const outputDir = path.dirname(OUTPUT_FILE);
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

// Generate a unique ID for each book
function generateId(title, author) {
    return crypto.createHash('md5').update(`${title}-${author}`).digest('hex').substring(0, 8);
}

// Parse book content from Obsidian note
function parseBookContent(content, filePath) {
    const lines = content.split('\n');
    const book = {
        id: '',
        title: path.basename(filePath, '.md').replace(/^\d{4}-\d{2}-\d{2}\s*/, ''), // Remove date prefix if exists
        author: 'Unknown',
        type: 'Uncategorized',
        cover: '',
        lastUpdated: fs.statSync(filePath).mtime.toISOString().split('T')[0],
        annotations: [],
        tags: []
    };

    let currentAnnotation = null;
    let inFrontmatter = false;
    let inAnnotationsSection = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Check for frontmatter
        if (line === '---') {
            inFrontmatter = !inFrontmatter;
            continue;
        }

        // Parse frontmatter
        if (inFrontmatter) {
            const match = line.match(/^([^:]+):\s*(.*)$/);
            if (match) {
                const key = match[1].trim().toLowerCase();
                const value = match[2].trim();
                
                switch (key) {
                    case 'title':
                        book.title = value.replace(/^📕\s*/, '');
                        break;
                    case 'author':
                        book.author = value;
                        break;
                    case 'type':
                    case 'genre':
                        book.type = value;
                        break;
                    case 'cover':
                        book.cover = value;
                        break;
                    case 'tags':
                        book.tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
                        break;
                }
            }
            continue;
        }

        // Parse metadata (Title::, Author::, etc.)
        const metadataMatch = line.match(/^([^:]+)::\s*(.*)$/);
        if (metadataMatch && !inAnnotationsSection) {
            const key = metadataMatch[1].trim().toLowerCase();
            const value = metadataMatch[2].trim();
            
            switch (key) {
                case 'title':
                    book.title = value.replace(/^📕\s*/, '');
                    break;
                case 'author':
                    book.author = value;
                    break;
                case 'type':
                case 'genre':
                    book.type = value;
                    break;
                case 'cover':
                    book.cover = value;
                    break;
                case 'tags':
                    book.tags = value.split(',').map(tag => tag.trim()).filter(Boolean);
                    break;
            }
            continue;
        }

        // Check for Annotations section
        if (line === '## Annotations' || line === '# Annotations') {
            inAnnotationsSection = true;
            continue;
        }

        // Process annotations
        if (inAnnotationsSection) {
            if (line.startsWith('---') || line === '----') {
                if (currentAnnotation && (currentAnnotation.highlight || currentAnnotation.note)) {
                    book.annotations.push(currentAnnotation);
                }
                currentAnnotation = { chapter: '', highlight: '', note: '', context: '' };
                continue;
            }

            if (!currentAnnotation) continue;

            if (line.startsWith('- 📖') || line.startsWith('- Chapter:')) {
                currentAnnotation.chapter = line.replace(/^-\s*(📖|Chapter:)\s*/, '').trim();
            } 
            else if (line.startsWith('- 🔖') || line.startsWith('- Context:')) {
                currentAnnotation.context = line.replace(/^-\s*(🔖|Context:)\s*/, '').trim();
            }
            else if (line.startsWith('- 🎯') || line.startsWith('- Highlight:')) {
                currentAnnotation.highlight = line.replace(/^-\s*(🎯|Highlight:)\s*/, '').trim();
                // Check if next line is a note
                if (i + 1 < lines.length && 
                    (lines[i + 1].trim().startsWith('- 📝') || 
                     lines[i + 1].trim().startsWith('- Note:'))) {
                    currentAnnotation.note = lines[++i].replace(/^-\s*(📝|Note:)\s*/, '').trim();
                }
            }
            else if (line.startsWith('- 📝') || line.startsWith('- Note:')) {
                currentAnnotation.note = line.replace(/^-\s*(📝|Note:)\s*/, '').trim();
            }
            else if (line.startsWith('- ')) {
                // If it's a simple bullet point, treat it as a highlight
                currentAnnotation.highlight = line.substring(2).trim();
            }
            else if (currentAnnotation.highlight) {
                // If we already have a highlight, append to it (for multi-line highlights)
                currentAnnotation.highlight += ' ' + line.trim();
            }
        }
    }

    // Add the last annotation if it exists
    if (currentAnnotation && (currentAnnotation.highlight || currentAnnotation.note)) {
        book.annotations.push(currentAnnotation);
    }

    // Generate ID after we have all the data
    book.id = generateId(book.title, book.author);

    return book;
}

// Main function to process all notes
function exportNotes() {
    const booksPath = path.join(OBSIDIAN_VAULT_PATH, BOOKS_FOLDER);
    
    if (!fs.existsSync(booksPath)) {
        console.error(`Books folder not found at: ${booksPath}`);
        process.exit(1);
    }
    
    // Get all markdown files recursively
    const getAllFiles = (dir, fileList = []) => {
        const files = fs.readdirSync(dir);
        files.forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                getAllFiles(filePath, fileList);
            } else if (file.endsWith('.md')) {
                fileList.push(filePath);
            }
        });
        return fileList;
    };

    const markdownFiles = getAllFiles(booksPath);
    const books = [];
    
    markdownFiles.forEach(filePath => {
        try {
            console.log(`Processing: ${filePath}`);
            const content = fs.readFileSync(filePath, 'utf8');
            const book = parseBookContent(content, filePath);
            
            if (book.title) {
                console.log(`  Found book: ${book.title} by ${book.author}`);
                console.log(`  Annotations: ${book.annotations.length}`);
                books.push(book);
            }
        } catch (error) {
            console.error(`Error processing ${filePath}:`, error.message);
        }
    });

    // Save to file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(books, null, 2));
    console.log(`\nExported ${books.length} books to ${OUTPUT_FILE}`);
    
    // Print sample output
    if (books.length > 0) {
        console.log("\nSample output:");
        const sample = {
            title: books[0].title,
            author: books[0].author,
            type: books[0].type,
            annotations_count: books[0].annotations.length,
            first_annotation: books[0].annotations[0] || 'No annotations found'
        };
        console.log(JSON.stringify(sample, null, 2));
    } else {
        console.log("No books were processed. Please check your input directory and file formats.");
    }
}

// Run the export
exportNotes();
