const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION: SET THESE ON THE WINDOWS PC
// ==========================================
const TARGET_FOLDER = process.env.TARGET_FOLDER || "\\\\SRV\\gatisogttech\\SJEP IMAGES"; 

// Live EC2 Backend API (Accessible directly over internet)
const API_URL = process.env.API_URL || "http://13.126.225.2:5000/api/admin/style-images/agent-sync";

// Optional Cloudflare Tunnel URL passed as CLI argument
// Usage: node scripts/syncAgent.cjs https://xxxx.trycloudflare.com
let desktopServerUrl = null;
if (process.argv[2] && process.argv[2].startsWith('http')) {
  desktopServerUrl = process.argv[2].replace(/\/+$/, '');
}

// Security secret to authenticate agent with server
const AGENT_SYNC_SECRET = process.env.AGENT_SYNC_SECRET || "shraddha-gold-sync-secret-2026";
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

    const CHUNK_SIZE = 500;
    const totalChunks = Math.ceil(imageFiles.length / CHUNK_SIZE);
    console.log(`\n📤 Sending data to Live Server: ${API_URL}`);
    console.log(`📦 Payload will be sent in ${totalChunks} chunks of ${CHUNK_SIZE} images.`);
    if (desktopServerUrl) {
        console.log(`🌐 Attaching Cloudflare Tunnel URL: ${desktopServerUrl}`);
    }

    let totalScanned = 0;
    let totalMatched = 0;
    let totalUpdated = 0;
    let totalUnmatched = 0;

    try {
        for (let i = 0; i < imageFiles.length; i += CHUNK_SIZE) {
            const chunk = imageFiles.slice(i, i + CHUNK_SIZE);
            const payload = { imageFiles: chunk };
            if (desktopServerUrl) {
                payload.desktopServerUrl = desktopServerUrl;
            }

            const currentChunkNum = Math.floor(i / CHUNK_SIZE) + 1;
            console.log(`\n⏳ Sending chunk ${currentChunkNum} of ${totalChunks}... (${chunk.length} images)`);

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-agent-secret': AGENT_SYNC_SECRET
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Server returned status ${response.status} on chunk ${currentChunkNum}: ${errText}`);
            }

            const result = await response.json();
            console.log(`✅ Chunk ${currentChunkNum} Success: ${result.matchedCount || 0} matched`);
            
            totalScanned += result.totalScanned || 0;
            totalMatched += result.matchedCount || 0;
            totalUpdated += result.updatedCount || 0;
            totalUnmatched += result.unmatchedCount || 0;
        }

        console.log("\n===========================================");
        console.log("🎉 SYNC COMPLETE!");
        console.log("===========================================");
        console.log(`- Total Files Sent:    ${totalScanned}`);
        console.log(`- Matched Styles:      ${totalMatched}`);
        console.log(`- Updated in Database: ${totalUpdated}`);
        console.log(`- Unmatched Files:     ${totalUnmatched}`);
        if (desktopServerUrl) {
            console.log(`- Live Image URL:      ${desktopServerUrl}`);
        }
        console.log("===========================================\n");
        
    } catch (err) {
        console.error("\n❌ FAILED TO SYNC WITH SERVER!");
        console.error("Error Message:", err.message);
        if (err.cause) {
            console.error("Error Cause:", err.cause);
        }
        console.error("Stack Trace:", err.stack);
    }
};

runSync();

