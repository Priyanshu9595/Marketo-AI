const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
                processDir(fullPath);
            }
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js') || fullPath.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;
            
            if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
                // increase inline gaps: gap: 8 -> gap: 16, etc
                content = content.replace(/gap:\s*(\d+)/g, (match, p1) => {
                    return `gap: ${parseInt(p1) + 8}`;
                });
                // increase margin/padding slightly maybe? let's stick to gap
                // increase padding if it's like padding: '10px 12px'
            } else if (fullPath.endsWith('.css')) {
                content = content.replace(/gap:\s*(\d+)px/g, (match, p1) => {
                    return `gap: ${parseInt(p1) + 8}px`;
                });
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'frontend', 'src'));
console.log('Done increasing gaps.');
