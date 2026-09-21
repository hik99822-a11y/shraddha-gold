const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// ============================================================================
// CONFIGURATION
// ============================================================================
// Default port: 8080 (or pass as 1st CLI argument: node serveImages.cjs 8080)
const PORT = process.env.PORT || parseInt(process.argv[2], 10) || 8080;

// Default folder: \\SRV\gatisogttech\SJEP IMAGES (or pass as 2nd CLI argument)
const TARGET_FOLDER = process.env.TARGET_FOLDER || process.argv[3] || "\\\\SRV\\gatisogttech\\SJEP IMAGES";

// Supported image MIME types
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp'
};

// ============================================================================
// IN-MEMORY FAST INDEX (O(1) instant lookup for filenames across subfolders)
// ============================================================================
const fileIndex = new Map(); // lowercase filename -> full absolute path
let totalFilesIndexed = 0;
let isIndexing = false;

const buildIndex = (dir) => {
  if (!fs.existsSync(dir)) return;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.toLowerCase() === 'thumbs.db') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        buildIndex(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (MIME_TYPES[ext]) {
          fileIndex.set(entry.name.toLowerCase(), fullPath);
          totalFilesIndexed++;
        }
      }
    }
  } catch (err) {
    console.error(`[Index Warning on ${dir}]:`, err.message);
  }
};

const refreshIndex = () => {
  if (isIndexing) return;
  isIndexing = true;
  fileIndex.clear();
  totalFilesIndexed = 0;
  console.log(`\n⏳ Scanning and indexing folder: ${TARGET_FOLDER}...`);
  const start = Date.now();
  buildIndex(TARGET_FOLDER);
  isIndexing = false;
  console.log(`✅ Indexed ${totalFilesIndexed} images in ${Date.now() - start}ms.`);
};

// ============================================================================
// HTTP SERVER (Native Node.js - Zero external dependencies)
// ============================================================================
const server = http.createServer((req, res) => {
  // Common CORS and security headers for all responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  // Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only GET, HEAD, POST, and DELETE requests supported
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'POST' && req.method !== 'DELETE') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  let pathname = parsedUrl.pathname || '/';

  // 1. Health check endpoint
  if (pathname === '/health' || pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'Shraddha Gold - Windows Image Server',
      folder: TARGET_FOLDER,
      folderExists: fs.existsSync(TARGET_FOLDER),
      indexedImages: totalFilesIndexed,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  // 2. Re-index endpoint
  if (pathname === '/refresh-index') {
    refreshIndex();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, indexedImages: totalFilesIndexed }));
    return;
  }

  // 3. Welcome page for root URL
  if (pathname === '/' || pathname === '') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head><title>Shraddha Gold - Windows Image Server</title></head>
        <body style="font-family: system-ui, sans-serif; max-width: 650px; margin: 50px auto; padding: 20px; line-height: 1.6; background: #0f172a; color: #f8fafc;">
          <h2 style="color: #38bdf8;">🚀 Shraddha Gold Windows Image Server</h2>
          <p>This server streams CAD & jewelry images live from network storage.</p>
          <ul style="background: #1e293b; padding: 15px 30px; border-radius: 8px;">
            <li><b>Directory:</b> <code>${TARGET_FOLDER}</code></li>
            <li><b>Status:</b> <span style="color: #4ade80;">Active</span></li>
            <li><b>Images Indexed:</b> ${totalFilesIndexed}</li>
            <li><b>Port:</b> ${PORT}</li>
          </ul>
          <p>Cloudflare Tunnel should point to: <code>http://localhost:${PORT}</code></p>
          <p><a href="/health" style="color: #38bdf8;">Check /health status JSON</a></p>
        </body>
      </html>
    `);
    return;
  }

  // 4. Handle Reverse Proxy Uploads (from AWS -> Windows)
  if (req.method === 'POST' && pathname === '/upload') {
    const fileName = req.headers['file-name'] ? decodeURIComponent(req.headers['file-name']) : `upload_${Date.now()}.jpg`;
    const styleCode = req.headers['style-code'] ? decodeURIComponent(req.headers['style-code']) : 'Misc';
    const ktPurity = req.headers['kt-purity'] ? decodeURIComponent(req.headers['kt-purity']) : '';
    const imageSlot = req.headers['image-slot'] ? decodeURIComponent(req.headers['image-slot']) : '';
    
    // Save directly to the style-images directory
    const uploadDir = path.join(TARGET_FOLDER, 'style-images');
    if (!fs.existsSync(uploadDir)) {
      try { fs.mkdirSync(uploadDir, { recursive: true }); } catch(e) {}
    }

    const uniqueSuffix = Date.now().toString().slice(-4);
    const ext = path.extname(fileName) || '.jpg';
    
    let finalFilename;
    if (ktPurity && imageSlot) {
      // Requested format: ALB003585_G18 Rose_Slot3.jpg
      finalFilename = `${styleCode}_${ktPurity}_Slot${imageSlot}${ext}`;
    } else {
      // Fallback for bulk uploads
      const baseName = path.basename(fileName, ext);
      finalFilename = `${styleCode}_${baseName}_${uniqueSuffix}${ext}`;
    }
    
    const finalPath = path.join(uploadDir, finalFilename);

    const writeStream = fs.createWriteStream(finalPath);
    req.pipe(writeStream);

    req.on('end', () => {
      // Normalize relative path for the AWS database
      const relativePath = path.relative(TARGET_FOLDER, finalPath).split(path.sep).join('/');
      
      // Instantly add to index so it's streamable immediately
      fileIndex.set(finalFilename.toLowerCase(), finalPath);
      totalFilesIndexed++;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        success: true, 
        message: 'File saved on Windows successfully', 
        relativePath: relativePath,
        absolutePath: finalPath
      }));
    });

    req.on('error', (err) => {
      console.error('[Upload Error]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // 4.5. Handle Reverse Proxy Deletes (from AWS -> Windows)
  if (req.method === 'DELETE' && pathname === '/image') {
    const fileToDelete = req.headers['file-path'] ? decodeURIComponent(req.headers['file-path']) : '';
    if (!fileToDelete) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'file-path header is required' }));
      return;
    }

    const fullPath = path.join(TARGET_FOLDER, fileToDelete);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        const baseFilename = path.basename(fullPath).toLowerCase();
        fileIndex.delete(baseFilename); // Remove from in-memory index
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'File deleted from Windows successfully' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'File not found on Windows PC' }));
    }
    return;
  }

  // 5. Resolve Image File
  try {
    // Decode URI path (handles spaces, parentheses, special characters)
    let decodedPath = decodeURIComponent(pathname);
    // Remove leading /server-images or /uploads if present
    decodedPath = decodedPath.replace(/^\/(?:server-images|uploads)\/?/i, '');
    decodedPath = decodedPath.replace(/^\/+/, ''); // remove any leading slashes

    // A. Check direct relative path inside TARGET_FOLDER
    let candidatePath = path.join(TARGET_FOLDER, decodedPath);
    let resolvedFilePath = null;

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      resolvedFilePath = candidatePath;
    } else {
      // B. If not found at direct path, try looking up filename in our in-memory index
      const baseFilename = path.basename(decodedPath).toLowerCase();
      if (fileIndex.has(baseFilename)) {
        resolvedFilePath = fileIndex.get(baseFilename);
      }
    }

    if (!resolvedFilePath || !fs.existsSync(resolvedFilePath)) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Image not found',
        requestedPath: pathname,
        searchedFolder: TARGET_FOLDER
      }));
      return;
    }

    // Determine MIME type
    const ext = path.extname(resolvedFilePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const stat = fs.statSync(resolvedFilePath);

    // Stream image with cache headers
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': 'public, max-age=86400', // 24 hours browser cache
      'Last-Modified': stat.mtime.toUTCString()
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    // Stream directly from disk/network share
    const stream = fs.createReadStream(resolvedFilePath);
    stream.on('error', (streamErr) => {
      console.error(`[Stream Error on ${resolvedFilePath}]:`, streamErr.message);
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
      }
      res.end();
    });
    stream.pipe(res);

  } catch (err) {
    console.error(`[Request Error]:`, err.message);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
  }
});

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log("==================================================================");
  console.log("🚀 SHRADDHA GOLD - WINDOWS LOCAL IMAGE STREAMING SERVER");
  console.log("==================================================================");
  console.log(`📂 Serving Directory: ${TARGET_FOLDER}`);
  console.log(`🌐 Local Server URL:   http://localhost:${PORT}`);
  console.log(`🏥 Health Check:       http://localhost:${PORT}/health`);
  console.log("------------------------------------------------------------------");
  console.log("👉 NEXT STEP (Run in separate Command Prompt window):");
  console.log(`   cloudflared tunnel --url http://localhost:${PORT}`);
  console.log("==================================================================\n");

  if (!fs.existsSync(TARGET_FOLDER)) {
    console.warn(`⚠️  WARNING: Directory does not exist or network share is disconnected:`);
    console.warn(`   ${TARGET_FOLDER}`);
    console.warn(`   Please check network credentials or folder path.\n`);
  } else {
    // Initial indexing in background so server is instantly ready
    setTimeout(refreshIndex, 100);
  }
});
