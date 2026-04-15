const fs = require('fs');
const path = require('path');
const glob = require('glob');
const crypto = require('crypto');

const OUT_DIR = path.join(__dirname, '../out');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

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
    return crypto.createHash('sha256').update(content).digest('base64');
};

const updateCSP = () => {
    console.log('Scanning for inline scripts to generate content_security_policy...');

    if (!fs.existsSync(MANIFEST_PATH)) {
        console.error('Manifest file not found!');
        return;
    }

    const hashes = new Set();
    const htmlFiles = getAllFiles(OUT_DIR).filter(file => file.endsWith('.html'));

    console.log(`Found ${htmlFiles.length} HTML files.`);

    htmlFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        // Regex to find inline scripts: <script>...</script>
        // We need to be careful not to capture <script src="...">
        const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gm;
        let match;
        while ((match = scriptRegex.exec(content)) !== null) {
            const scriptContent = match[1];
            // Check if it has a src attribute (if regex was too greedy or loose, but proper way is check opening tag)
            // My regex captures content between tags. If tag had src, content is usually empty or ignored, 
            // but Next.js inline scripts don't have src.
            // We should ensure the opening tag didn't have 'src'.

            // Re-check the opening tag for 'src'
            const fullMatch = match[0];
            const openingTag = fullMatch.match(/<script\b[^>]*>/)[0];

            if (!openingTag.includes('src=')) {
                if (scriptContent && scriptContent.trim()) {
                    const hash = `sha256-${calculateHash(scriptContent)}`;
                    hashes.add(hash);
                }
            }
        }
    });

    console.log(`Found ${hashes.size} unique inline scripts.`);

    // Read manifest
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

    // Construct CSP string
    // Construct CSP string
    // Always include 'self' as base. Removed 'wasm-unsafe-eval' to see if it fixes "Insecure CSP value"
    let parts = ["'self'"];

    hashes.forEach(hash => {
        parts.push(`'${hash}'`);
    });

    // Add object-src
    let cspString = `script-src ${parts.join(" ")}; object-src 'self';`;

    manifest.content_security_policy = {
        extension_pages: cspString
    };

    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 4));
    console.log('Updated manifest.json with CSP hashes.');
};

updateCSP();
