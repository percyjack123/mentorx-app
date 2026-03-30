const Tesseract = require('tesseract.js');
const pdf = require('pdf-poppler');
const pdfParse = require('pdf-parse');
const path = require('path');
const fs = require('fs');

/**
 * Converts the first page of a PDF to an image.
 * @param {string} filePath 
 */
async function convertPdfToImage(filePath) {
  const outputDir = path.dirname(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const options = {
    format: 'png',
    out_dir: outputDir,
    out_prefix: baseName,
    page: 1
  };

  await pdf.convert(filePath, options);
  return path.join(outputDir, `${baseName}-1.png`);
}

/**
 * Extracts CGPA, Attendance, and Placement details from an image or PDF.
 * @param {string} filePath 
 */
async function extractDataFromImage(filePath) {
  let tempImagePath = null;
  let text = '';
  const isPdf = filePath.toLowerCase().endsWith('.pdf');

  try {
    if (isPdf) {
      // 1. Fast path: Try pdf-parse first
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      text = data.text;

      // 2. Fallback path: If direct text extraction fails (scanned PDF), use OCR
      if (text.trim().length <= 50) {
        tempImagePath = await convertPdfToImage(filePath);
        const { data: { text: ocrText } } = await Tesseract.recognize(tempImagePath, 'eng');
        text = ocrText;
      }
    } else {
      // Image path: use Tesseract OCR
      const { data: { text: ocrText } } = await Tesseract.recognize(filePath, 'eng');
      text = ocrText;
    }

    console.log('--- EXTRACTED TEXT START ---');
    console.log(text);
    console.log('--- EXTRACTED TEXT END ---');
    
    // CGPA Extraction
    const cgpaMatch = text.match(/(?:CGPA|GPA|SGPA|Cumulative Grade Point Average)[:\s]*(\d+(?:\.\d+)?)/i);
    const cgpa = cgpaMatch ? parseFloat(cgpaMatch[1]) : null;

    // Attendance Extraction
    const attendanceMatch = text.match(/(?:Attendance|Present|Overall Attendance)[:\s]*(\d+(?:\.\d+)?)%?/i);
    const attendance = attendanceMatch ? parseFloat(attendanceMatch[1]) : null;

    // Placement Detection logic
    const placementKeywords = ["offer letter", "we are pleased to offer", "appointed as", "joining date", "ctc", "salary", "package"];
    const isPlacement = placementKeywords.some(kw => text.toLowerCase().includes(kw));
    const placementStatus = isPlacement ? "Placed" : "Not Placed";

    // Company Extraction
    let company = null;
    if (isPlacement) {
      const companyMatch = text.match(/(?:Company|Organization|Company Name)[:\s]*([^\n]+)/i);
      if (companyMatch) {
        company = companyMatch[1].trim();
      } else {
        const ltdMatch = text.match(/([A-Z][A-Za-z0-9\s&]+?)\s+(?:Ltd|Inc|Pvt Ltd|Limited|Corporation)/i);
        if (ltdMatch) company = ltdMatch[0].trim();
      }
    }

    // Determine File Type
    let fileType = "other";
    if (isPlacement) fileType = "placement";
    else if (cgpa !== null) fileType = "report";
    else if (attendance !== null) fileType = "attendance";

    return { 
      cgpa, 
      attendance, 
      placementStatus, 
      company, 
      fileType,
      rawText: text 
    };
  } catch (err) {
    console.error('Extraction Error:', err);
    return { 
      cgpa: null, 
      attendance: null, 
      placementStatus: "Not Placed", 
      company: null, 
      fileType: "other",
      rawText: '' 
    };
  } finally {
    // Cleanup temp image if created
    if (tempImagePath && fs.existsSync(tempImagePath)) {
      fs.unlinkSync(tempImagePath);
    }
  }
}

module.exports = { extractDataFromImage };
