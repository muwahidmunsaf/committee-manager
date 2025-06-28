import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Helper to reverse word order for Urdu
function reverseUrduWords(str) {
  return str.split(' ').reverse().join(' ');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  const { rows = [], totalCollected = '', totalRemaining = '', ownerPhone = '', ownerEmail = '', ownerAddress = '' } = JSON.parse(body);

  // Paths to assets
  const fontPath = path.join(process.cwd(), 'assets', 'JameelNooriNastaleeqKasheeda.ttf');
  const logoPath = path.join(process.cwd(), 'assets', 'logo.png');

  // Create PDF in landscape orientation
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=urdu-report.pdf');
    res.status(200).end(pdfData);
  });

  // Register Urdu font
  doc.registerFont('Urdu', fontPath);

  // Table and layout setup
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 30;
  const footerHeight = 50;
  const headerHeight = 80; // minimal space for logo/title
  const rowHeight = 20;
  const headerRowHeight = 24;
  const headers = [
    'خریدار کا نام', 'شناختی کارڈ', 'فون', 'موبائل کا نام', 'کل رقم', 'ایڈوانس', 'جمع شدہ رقم', 'باقی رقم', 'مدت', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'
  ].map(reverseUrduWords);
  const colWidths = [65, 85, 75, 75, 75, 65, 85, 85, 50, 65, 75];
  const numCols = headers.length;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableLeft = (pageWidth - tableWidth) / 2;

  // Helper to draw header (logo + title)
  function drawHeader() {
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, pageWidth / 2 - 40, 10, { width: 80, align: 'center' });
    }
    doc.font('Urdu').fontSize(20).fillColor('#0e7490').text(reverseUrduWords('مجموعی اقساط رپورٹ'), 0, 55, { align: 'center', width: pageWidth });
  }

  // Helper to draw footer (owner info in English)
  function drawFooter() {
    const footerY = pageHeight - footerHeight;
    doc.rect(0, footerY, pageWidth, 40).fill('#06b6d4');
    const footerText = `${ownerPhone} | ${ownerEmail} | ${ownerAddress}`;
    doc.font('Urdu').fontSize(11).fillColor('#fff').text(footerText, 0, footerY + 10, { align: 'center', width: pageWidth });
    doc.fillColor('#000');
  }

  // Helper to draw table header row
  function drawTableHeader(y) {
    let x = tableLeft + tableWidth;
    doc.font('Urdu').fontSize(11);
    for (let i = 0; i < numCols; i++) {
      x -= colWidths[i];
      doc.save();
      doc.rect(x, y, colWidths[i], headerRowHeight).fillAndStroke('#06b6d4', '#06b6d4');
      doc.fillColor('#fff').text(headers[i], x + 2, y + 6, { width: colWidths[i] - 4, align: 'center' });
      doc.restore();
    }
  }

  // Start first page
  drawHeader();
  drawFooter();
  let y = headerHeight + 10;
  drawTableHeader(y);
  y += headerRowHeight;

  // Draw table rows with auto page break and status color
  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    // If next row would overlap footer, add new page
    if (y + rowHeight + footerHeight > pageHeight - margin) {
      doc.addPage();
      drawHeader();
      drawFooter();
      y = headerHeight + 10;
      drawTableHeader(y);
      y += headerRowHeight;
    }
    let x = tableLeft + tableWidth;
    if (rowIdx % 2 === 0) {
      doc.save();
      doc.rect(tableLeft, y, tableWidth, rowHeight).fill('#f0fafd');
      doc.restore();
    }
    for (let i = 0; i < numCols; i++) {
      x -= colWidths[i];
      doc.save();
      doc.rect(x, y, colWidths[i], rowHeight).stroke('#06b6d4');
      let cellText = typeof rows[rowIdx][i] === 'string' ? reverseUrduWords(rows[rowIdx][i]) : rows[rowIdx][i];
      // Status color
      if (i === numCols - 1) {
        if (rows[rowIdx][i] === 'کھلا') {
          doc.font('Urdu').fontSize(10).fillColor('#16a34a'); // green
        } else if (rows[rowIdx][i] === 'بند') {
          doc.font('Urdu').fontSize(10).fillColor('#dc2626'); // red
        } else {
          doc.font('Urdu').fontSize(10).fillColor('#222');
        }
      } else {
        doc.font('Urdu').fontSize(10).fillColor('#222');
      }
      doc.text(cellText, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center' });
      doc.restore();
    }
    y += rowHeight;
  }

  // Draw totals row immediately after last table row
  if (y + rowHeight + footerHeight > pageHeight - margin) {
    doc.addPage();
    drawHeader();
    drawFooter();
    y = headerHeight + 10 + headerRowHeight;
  }
  doc.font('Urdu').fontSize(12).fillColor('#0e7490').text(reverseUrduWords(`کل جمع شدہ: PKR ${totalCollected}`), tableLeft, y, { align: 'left', width: tableWidth / 2 });
  doc.font('Urdu').fontSize(12).fillColor('#0e7490').text(reverseUrduWords(`کل باقی: PKR ${totalRemaining}`), tableLeft + tableWidth / 2, y, { align: 'left', width: tableWidth / 2 });
  doc.fillColor('#000');

  doc.end();
} 