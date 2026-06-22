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
                // decrease inline gaps: gap: 16 -> gap: 8, etc
                content = content.replace(/gap:\s*(\d+)/g, (match, p1) => {
                    const val = parseInt(p1);
                    return `gap: ${val > 8 ? val - 8 : 0}`;
                });
            } else if (fullPath.endsWith('.css')) {
                content = content.replace(/gap:\s*(\d+)px/g, (match, p1) => {
                    const val = parseInt(p1);
                    return `gap: ${val > 8 ? val - 8 : 0}px`;
                });
            }

            if (content !== originalContent) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Reverted gaps in ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'frontend', 'src'));
console.log('Done reverting gaps.');
