const fs = require('fs');
const path = require('path');
const glob = require('glob');

const OUT_DIR = path.join(__dirname, '../out');

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

const processBuild = async () => {
    console.log('Starting extension post-build processing...');

    const nextDir = path.join(OUT_DIR, '_next');
    const newNextDir = path.join(OUT_DIR, 'next');

    // 1. Rename _next to next
    if (fs.existsSync(nextDir)) {
        console.log('Renaming _next directory to next...');
        fs.renameSync(nextDir, newNextDir);
    }

    // 2. Remove other underscore files commonly found in static exports
    const filesToRemove = [
        '_not-found.html',
        '_not-found.txt',
        '__next.__PAGE__.txt',
        '__next._full.txt',
        '__next._head.txt',
        '__next._index.txt',
        '__next._tree.txt'
    ];

    filesToRemove.forEach(file => {
        const filePath = path.join(OUT_DIR, file);
        if (fs.existsSync(filePath)) {
            console.log(`Removing ${file}...`);
            fs.unlinkSync(filePath);
        }
    });

    const notFoundDir = path.join(OUT_DIR, '_not-found');
    if (fs.existsSync(notFoundDir)) {
        console.log('Removing _not-found directory...');
        fs.rmSync(notFoundDir, { recursive: true, force: true });
    }


    // 3. Update references in all HTML, JS, CSS files
    console.log('Updating file references...');
    const allFiles = getAllFiles(OUT_DIR);

    let processedCount = 0;

    allFiles.forEach(file => {
        const ext = path.extname(file);
        if (['.html', '.js', '.css', '.json'].includes(ext)) {
            let content = fs.readFileSync(file, 'utf8');
            let hasChanges = false;

            // Replace /_next/ with /next/
            // and "_next/" with "next/"
            const regexAbs = /\/_next\//g;
            const regexRel = /_next\//g; // careful with this one, likely safer to check context or just do it if unique enough

            if (content.match(regexAbs)) {
                content = content.replace(regexAbs, '/next/');
                hasChanges = true;
            }
            // For relative paths in JS chunks
            if (content.match(regexRel)) {
                content = content.replace(regexRel, 'next/');
                hasChanges = true;
            }

            if (hasChanges) {
                fs.writeFileSync(file, content);
                processedCount++;
            }
        }
    });

    console.log(`Processed ${processedCount} files.`);
    console.log('Extension post-build processing complete.');
};

processBuild();
