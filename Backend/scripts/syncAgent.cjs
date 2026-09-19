const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION: SET THESE ON THE WINDOWS PC
// ==========================================
const TARGET_FOLDER = "\\\\SRV\\gatisogttech\\SJEP IMAGES"; 
// const API_URL = "http://lol-grad-advertisements-scheduling.trycloudflare.com/api/admin/style-images/agent-sync";
const API_URL = "http://192.168.1.5:5000/api/admin/style-images/agent-sync"; // For local testing

// Optional security key to prevent unauthorized syncs
const AGENT_SYNC_SECRET = "shraddha-gold-sync-secret-2026";
// ==========================================

console.log("---------------------------------------------------");
console.log("🚀 SHRADDHA GOLD - REMOTE SYNC AGENT");
console.log("---------------------------------------------------");
console.log(`Scanning directory: ${TARGET_FOLDER}`);

if (!fs.existsSync(TARGET_FOLDER)) {
    console.error(`\n❌ ERROR: Directory does not exist or is not reachable: ${TARGET_FOLDER}`);
    process.exit(1);
}

// 1. Recursive function to find all image files
const getAllImageFiles = (dir, rootDir = dir) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'thumbs.db') continue;

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                results = results.concat(getAllImageFiles(fullPath, rootDir));
            } else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp', '.avif'].includes(ext)) {
                    // Normalize the relative path to use forward slashes for the server
                    const rawRelativePath = path.relative(rootDir, fullPath);
                    const relativePath = rawRelativePath.split(path.sep).join('/');
                    const stat = fs.statSync(fullPath);
                    
                    results.push({
                        filename: entry.name,
                        relativePath: relativePath,
                        ext: ext,
                        size: stat.size
                    });
                }
            }
        }
    } catch (err) {
        console.error(`[Error on ${dir}]:`, err.message);
    }
    return results;
};

// 2. Scan and execute
const runSync = async () => {
    console.log("Scanning... Please wait.");
    const imageFiles = getAllImageFiles(TARGET_FOLDER);
    
    console.log(`✅ Found ${imageFiles.length} images.`);
    
    if (imageFiles.length === 0) {
        console.log("Nothing to sync.");
        return;
    }

    console.log(`\n📤 Sending data to Live Server: ${API_URL}`);

    try {
        // Send data in chunks if it's too large, but for now we send all at once
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-agent-secret': AGENT_SYNC_SECRET
            },
            body: JSON.stringify({ imageFiles })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Server returned status ${response.status}: ${errText}`);
        }

        const result = await response.json();
        
        console.log("\n===========================================");
        console.log("🎉 SYNC COMPLETE!");
        console.log("===========================================");
        console.log(`- Total Files Sent:    ${result.totalScanned}`);
        console.log(`- Matched Styles:      ${result.matchedCount}`);
        console.log(`- Updated in Database: ${result.updatedCount}`);
        console.log(`- Unmatched Files:     ${result.unmatchedCount}`);
        console.log("===========================================\n");
        
    } catch (err) {
        console.error("\n❌ FAILED TO SYNC WITH SERVER!");
        console.error(err.message);
    }
};

runSync();
