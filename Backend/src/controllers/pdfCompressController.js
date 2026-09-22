import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export const compressPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded' });
    }

    const { quality } = req.body;
    const inputPath = req.file.path;
    
    // Determine output file path
    const parsedPath = path.parse(inputPath);
    const outputFilename = `${parsedPath.name}_compressed_${quality}.pdf`;
    const outputPath = path.join(parsedPath.dir, outputFilename);

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

    const gsInputPath = inputPath.replace(/\\/g, '/');
    const gsOutputPath = outputPath.replace(/\\/g, '/');

    // Ghostscript command for PDF compression
    // Enforcing exact image resolution downsampling to match user selection
    const gsCommand = `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=${pdfSettings} \
      -dDownsampleColorImages=true -dDownsampleGrayImages=true -dDownsampleMonoImages=true \
      -dColorImageResolution=${imageRes} -dGrayImageResolution=${imageRes} -dMonoImageResolution=${imageRes} \
      -dNOPAUSE -dQUIET -dBATCH -sOutputFile="${gsOutputPath}" "${gsInputPath}"`;

    try {
      await execPromise(gsCommand);
    } catch (gsError) {
      console.error('Ghostscript compression failed:', gsError);
      return res.status(500).json({ success: false, message: 'Failed to compress PDF. Is Ghostscript installed?' });
    }

    // Calculate file size differences
    const inputStats = await fs.promises.stat(inputPath);
    const outputStats = await fs.promises.stat(outputPath);

    const originalSize = inputStats.size;
    const compressedSize = outputStats.size;
    const spaceSaved = originalSize - compressedSize;
    const percentageSaved = originalSize > 0 ? ((spaceSaved / originalSize) * 100).toFixed(2) : 0;

    // Optional: We can delete the original uploaded file if we don't need it anymore,
    // but the requirements say "Keep the original uploaded PDF unchanged".
    // So we'll keep both, or we can just send the new one back.
    
    // Construct the URL to return to the frontend
    // The server serves the PDFs from /uploads/pdfs directory
    const desktopServerUrl = process.env.DESKTOP_SERVER_URL;
    const baseUrl = desktopServerUrl || `${req.protocol}://${req.get('host')}`;
    const fileUrl = `${baseUrl}/uploads/pdfs/${outputFilename}`;

    res.status(200).json({
      success: true,
      data: {
        originalSize,
        compressedSize,
        spaceSaved,
        percentageSaved: Number(percentageSaved),
        url: fileUrl,
        filename: outputFilename
      }
    });
  } catch (error) {
    console.error('compressPdf error:', error);
    res.status(500).json({ success: false, message: 'Server error compressing PDF' });
  }
};
