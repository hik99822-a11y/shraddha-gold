const { spawn } = require('child_process');
const path = require('path');

// ==========================================
// CONFIGURATION
// ==========================================
const PORT = 8080;
let urlFound = false;

console.log("==================================================");
console.log("🚀 SHRADDHA GOLD - AUTOMATED STARTUP SCRIPT");
console.log("==================================================\n");

// 1. Start Local Image Server
console.log("▶️ Starting Image Server...");
const serveImagesProc = spawn('node', [path.join(__dirname, 'serveImages.cjs'), PORT.toString()], {
    stdio: ['ignore', 'pipe', 'pipe']
});

serveImagesProc.stdout.on('data', data => process.stdout.write(`[Image Server] ${data}`));
serveImagesProc.stderr.on('data', data => process.stderr.write(`[Image Server Error] ${data}`));

serveImagesProc.on('close', code => {
    console.log(`[Image Server] Exited with code ${code}`);
    process.exit(1); // Exit wrapper so batch script can restart it
});

// 2. Start Cloudflare Tunnel
console.log("\n▶️ Starting Cloudflare Tunnel...\n");
const cloudflaredProc = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe']
});

// Cloudflared logs everything (including the URL) to stderr
cloudflaredProc.stderr.on('data', data => {
    const output = data.toString();
    process.stdout.write(`[Cloudflare] ${output}`);
    
    // Look for the TryCloudflare URL in the logs
    if (!urlFound) {
        // Example: https://random-words.trycloudflare.com
        const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        
        if (match) {
            urlFound = true;
            const tunnelUrl = match[0];
            console.log(`\n==================================================`);
            console.log(`✅ EXTRACTED TUNNEL URL: ${tunnelUrl}`);
            console.log(`==================================================\n`);
            
            // 3. Start Sync Agent with the new URL
            console.log("▶️ Starting Sync Agent to update Admin Panel...\n");
            const syncProc = spawn('node', [path.join(__dirname, 'syncAgent.cjs'), tunnelUrl], {
                stdio: 'inherit'
            });
            
            syncProc.on('close', code => {
                console.log(`\n[Sync Agent] Finished with code ${code}`);
                console.log(`\n✨ AUTOMATION COMPLETE. Server and Tunnel are running in the background.`);
                console.log(`(Keep this window open to keep the server online)`);
            });
        }
    }
});

cloudflaredProc.stdout.on('data', data => process.stdout.write(`[Cloudflare] ${data}`));

cloudflaredProc.on('close', code => {
    console.log(`[Cloudflare] Exited with code ${code}`);
    process.exit(1); // Exit wrapper so batch script can restart it
});

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log("\n🛑 Shutting down services...");
    serveImagesProc.kill();
    cloudflaredProc.kill();
    process.exit(0);
});
