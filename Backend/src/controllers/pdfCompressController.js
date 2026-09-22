import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';
import os from 'os';
import { configService } from '../services/configService.js';

const execPromise = util.promisify(exec);

export const compressPdf = async (req, res) => {
  // Start chunking to prevent Nginx 504 Timeout for long compressions
  res.setHeader('Content-Type', 'application/json');
  // Express handles chunked encoding automatically if we use res.write()

  if (!req.file) {
    res.write(JSON.stringify({ success: false, message: 'No PDF file uploaded' }));
    return res.end();
  }

  // Send a space character every 15 seconds to keep the Nginx connection alive
  const keepAliveInterval = setInterval(() => {
    res.write(' ');
  }, 15000);

  try {
    const { quality } = req.body;
    const inputPath = req.file.path;
    
    // Determine output file path
    const parsedPath = path.parse(inputPath);
    const outputFilename = `${parsedPath.name}_compressed_${quality}.pdf`;
    const outputPath = path.join(parsedPath.dir, outputFilename);

    // Use a local temporary directory for both input and output to completely avoid Ghostscript UNC/network path issues
    const tempOutputPath = path.join(os.tmpdir(), `out_${outputFilename}`);
    const tempInputPath = path.join(os.tmpdir(), `in_${Date.now()}_${parsedPath.base}`);

    // Map quality settings to exact Ghostscript downsampling DPI
    let pdfSettings = '/screen';
    let imageRes = 72; // Default to low quality

    switch (quality) {
      case 'print':
        pdfSettings = '/prepress';
        imageRes = 600;
        break;
      case 'high':
        pdfSettings = '/printer';
        imageRes = 300;
        break;
      case 'medium':
        pdfSettings = '/ebook';
        imageRes = 150;
        break;
      case 'low':
      default:
        pdfSettings = '/screen';
        imageRes = 72;
        break;
    }

    const gsInputPath = tempInputPath.replace(/\\/g, '/');
    const gsTempOutputPath = tempOutputPath.replace(/\\/g, '/');

    // Ghostscript command for PDF compression
    const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${pdfSettings} \
      -dDownsampleColorImages=true -dDownsampleGrayImages=true -dDownsampleMonoImages=true \
      -dColorImageResolution=${imageRes} -dGrayImageResolution=${imageRes} -dMonoImageResolution=${imageRes} \
      -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${gsTempOutputPath}" "${gsInputPath}"`;

    try {
      // 1. Copy the input file to the local temp directory
      await fs.promises.copyFile(inputPath, tempInputPath);
      
      // 2. Run Ghostscript strictly on local temp files (Increased buffer for 5GB files)
      await execPromise(gsCommand, { maxBuffer: 1024 * 1024 * 100 });
      
      // 3. Copy the compressed output from the local temp directory to the final network destination
      await fs.promises.copyFile(tempOutputPath, outputPath);
      
      // 4. Clean up temporary files
      await fs.promises.unlink(tempOutputPath).catch(() => {});
      await fs.promises.unlink(tempInputPath).catch(() => {});
    } catch (gsError) {
      console.error('Ghostscript compression failed:', gsError);
      // Try to clean up temp files on error too
      await fs.promises.unlink(tempOutputPath).catch(() => {});
      await fs.promises.unlink(tempInputPath).catch(() => {});
      clearInterval(keepAliveInterval);
      res.write(JSON.stringify({ success: false, message: 'Failed to compress PDF. Is Ghostscript installed?' }));
      return res.end();
    }

    // Calculate file size differences
    const inputStats = await fs.promises.stat(inputPath);
    const outputStats = await fs.promises.stat(outputPath);

    const originalSize = inputStats.size;
    const compressedSize = outputStats.size;
    const spaceSaved = originalSize - compressedSize;
    const percentageSaved = originalSize > 0 ? ((spaceSaved / originalSize) * 100).toFixed(2) : 0;

    const fileUrl = `/admin/pdf-compress/download?original=${path.basename(inputPath)}&compressed=${outputFilename}`;
    
    // Auto-cleanup after 30 minutes if not downloaded
    setTimeout(() => {
      fs.unlink(inputPath, () => {});
      fs.unlink(outputPath, () => {});
    }, 30 * 60 * 1000);

    clearInterval(keepAliveInterval);
    res.write(JSON.stringify({
      success: true,
      data: {
        originalSize,
        compressedSize,
        spaceSaved,
        percentageSaved: Number(percentageSaved),
        url: fileUrl,
        filename: outputFilename
      }
    }));
    return res.end();
  } catch (error) {
    console.error('compressPdf error:', error);
    clearInterval(keepAliveInterval);
    res.write(JSON.stringify({ success: false, message: 'Server error compressing PDF' }));
    return res.end();
  }
};

export const downloadAndCleanPdf = async (req, res) => {
  const { original, compressed } = req.query;
  const uploadsDir = process.env.DESKTOP_SERVER_DIR && fs.existsSync(process.env.DESKTOP_SERVER_DIR)
    ? process.env.DESKTOP_SERVER_DIR
    : (process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'));

  const originalPath = path.join(uploadsDir, original);
  const compressedPath = path.join(uploadsDir, compressed);

  res.download(compressedPath, compressed, (err) => {
    // Delete files after download completes or fails
    fs.unlink(originalPath, () => {});
    fs.unlink(compressedPath, () => {});
  });
};
