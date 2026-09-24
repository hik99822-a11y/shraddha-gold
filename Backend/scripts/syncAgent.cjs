const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURATION: SET THESE ON THE WINDOWS PC
// ==========================================
const TARGET_FOLDER = process.env.TARGET_FOLDER || "\\\\SRV\\gatisogttech\\SJEP IMAGES"; 

// Live EC2 Backend API (Accessible directly over internet)
const API_URL = process.env.API_URL || "https://api.shraddhagold.com/api/admin/style-images/agent-sync";

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

const STATE_FILE = path.join(__dirname, '.sync-state.json');

const loadState = () => {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (e) {
        console.error("Error reading state file:", e.message);
    }
    return {};
};

const saveState = (state) => {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (e) {
        console.error("Error writing state file:", e.message);
    }
};

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
                        size: stat.size,
                        mtimeMs: stat.mtimeMs
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
    
    const previousState = loadState();
    const newState = {};
    
    const allImageFiles = getAllImageFiles(TARGET_FOLDER);
    
    const imageFiles = [];
    for (const file of allImageFiles) {
        const fileKey = file.relativePath;
        const fileHash = `${file.size}_${file.mtimeMs}`;
        
        newState[fileKey] = fileHash;

        if (previousState[fileKey] !== fileHash) {
            imageFiles.push(file);
        }
    }
    
    console.log(`✅ Found ${allImageFiles.length} total images in folder.`);
    console.log(`🚀 ${imageFiles.length} images are NEW or MODIFIED since last sync.`);
    
    if (imageFiles.length === 0) {
        if (!desktopServerUrl) {
            console.log("Nothing to sync.");
            saveState(newState); // Save state just in case some were deleted
            return;
        } else {
            console.log("No new images to sync. Updating Cloudflare URL only...");
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-agent-secret': AGENT_SYNC_SECRET },
                    body: JSON.stringify({ imageFiles: [], desktopServerUrl })
                });
                if (response.ok) {
                    console.log("✅ Cloudflare URL updated successfully!");
                    saveState(newState);
                } else {
                    console.error("❌ Failed to update Cloudflare URL.");
                }
            } catch(e) {
                console.error("❌ Network error:", e.message);
            }
            return;
        }
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
        const CONCURRENCY_LIMIT = 2; // Reduced to 3 to avoid Nginx 504 Gateway Timeout
        
        // 1. Prepare all chunks first
        const chunks = [];
        for (let i = 0; i < imageFiles.length; i += CHUNK_SIZE) {
            chunks.push(imageFiles.slice(i, i + CHUNK_SIZE));
        }

        console.log(`\n🚀 Sending ${totalChunks} chunks to the server (Processing ${CONCURRENCY_LIMIT} batches concurrently)...`);

        // 2. Process chunks in groups of CONCURRENCY_LIMIT
        for (let i = 0; i < chunks.length; i += CONCURRENCY_LIMIT) {
            const batchPromises = [];
            const currentBatchGroup = chunks.slice(i, i + CONCURRENCY_LIMIT);
            
            for (let j = 0; j < currentBatchGroup.length; j++) {
                const chunk = currentBatchGroup[j];
                const currentChunkNum = i + j + 1;
                
                const payload = { imageFiles: chunk };
                if (desktopServerUrl) {
                    payload.desktopServerUrl = desktopServerUrl;
                }

                console.log(`⏳ Preparing chunk ${currentChunkNum} of ${totalChunks}...`);

                const requestPromise = fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-agent-secret': AGENT_SYNC_SECRET
                    },
                    body: JSON.stringify(payload)
                }).then(async response => {
                    if (!response.ok) {
                        const errText = await response.text();
                        throw new Error(`Server returned status ${response.status} on chunk ${currentChunkNum}: ${errText}`);
                    }
                    const result = await response.json();
                    console.log(`✅ Chunk ${currentChunkNum} Success: ${result.matchedCount || 0} matched`);
                    return result;
                });
                
                batchPromises.push(requestPromise);
            }
            
            // Wait for this specific group of 5 to finish before sending the next 5
            const results = await Promise.all(batchPromises);
            
            results.forEach(result => {
                totalScanned += result.totalScanned || 0;
                totalMatched += result.matchedCount || 0;
                totalUpdated += result.updatedCount || 0;
                totalUnmatched += result.unmatchedCount || 0;
            });
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
        
        // Save the state after a successful sync
        saveState(newState);
        
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

