const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const OUT_DIR = path.join(__dirname, '../out');
const INLINE_SCRIPTS_DIR = path.join(OUT_DIR, 'assets', 'js');

// Ensure assets/js exists
if (!fs.existsSync(INLINE_SCRIPTS_DIR)) {
    fs.mkdirSync(INLINE_SCRIPTS_DIR, { recursive: true });
}

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });
    return arrayOfFiles;
}

const calculateHash = (content) => {
    return crypto.createHash('sha256').update(content).digest('hex');
};

const extractInlineScripts = () => {
    console.log('Extracting inline scripts to external files...');

    const htmlFiles = getAllFiles(OUT_DIR).filter(file => file.endsWith('.html'));

    console.log(`Found ${htmlFiles.length} HTML files.`);

    htmlFiles.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let hasChanges = false;

        // Regex to find inline scripts: <script>...</script>
        // Use a more robust approach to replace them one by one
        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;

        content = content.replace(scriptRegex, (match, scriptContent) => {
            // Check if it's already an external script (has src)
            const openingTag = match.match(/<script\b[^>]*>/)[0];
            if (openingTag.includes('src=')) {
                return match;
            }

            if (!scriptContent || !scriptContent.trim()) {
                return match;
            }

            // Generate filename based on hash
            const hash = calculateHash(scriptContent);
            const scriptFilename = `inline-${hash}.js`;
            const scriptPath = path.join(INLINE_SCRIPTS_DIR, scriptFilename);

            // Allow duplicates (Next.js might reuse same hydration script across pages)
            if (!fs.existsSync(scriptPath)) {
                fs.writeFileSync(scriptPath, scriptContent);
                console.log(`Created ${scriptFilename}`);
            }

            // Return new script tag
            // We use absolute path /assets/js/... so it resolves from root of extension
            hasChanges = true;
            return `<script src="/assets/js/${scriptFilename}"></script>`;
        });

        if (hasChanges) {
            fs.writeFileSync(file, content);
            console.log(`Updated ${path.basename(file)}`);
        }
    });

    console.log('Inline script extraction complete.');
};

extractInlineScripts();
