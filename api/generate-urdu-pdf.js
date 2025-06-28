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
  const { rows = [], totalCollected = '', totalRemaining = '' } = JSON.parse(body);

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

  // Header: Centered logo and title
  const pageWidth = doc.page.width;
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, pageWidth / 2 - 40, 20, { width: 80, align: 'center' });
  }
  doc.font('Urdu').fontSize(20).fillColor('#0e7490').text(reverseUrduWords('مجموعی اقساط رپورٹ'), 0, 110, { align: 'center', width: pageWidth });
  doc.moveDown(1.2);

  // Table headers (Urdu, RTL columns, text as-is)
  const headers = [
    'خریدار کا نام', 'شناختی کارڈ', 'فون', 'موبائل کا نام', 'کل رقم', 'ایڈوانس', 'جمع شدہ رقم', 'باقی رقم', 'مدت', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'
  ].map(reverseUrduWords);
  // Slightly reduced widths to fit all columns
  const colWidths = [65, 85, 75, 75, 75, 65, 85, 85, 50, 65, 75];
  const numCols = headers.length;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableLeft = (pageWidth - tableWidth) / 2;
  let y = 150;

  // Draw table headers with background (RTL: first col on right, last on left)
  let x = tableLeft + tableWidth;
  doc.font('Urdu').fontSize(11);
  for (let i = 0; i < numCols; i++) {
    x -= colWidths[i];
    doc.save();
    doc.rect(x, y, colWidths[i], 24).fillAndStroke('#06b6d4', '#06b6d4');
    doc.fillColor('#fff').text(headers[i], x + 2, y + 6, { width: colWidths[i] - 4, align: 'center' });
    doc.restore();
  }

  // Draw table rows with alternating background (RTL columns, text as-is)
  y += 24;
  rows.forEach((row, rowIdx) => {
    x = tableLeft + tableWidth;
    if (rowIdx % 2 === 0) {
      doc.save();
      doc.rect(tableLeft, y, tableWidth, 20).fill('#f0fafd');
      doc.restore();
    }
    for (let i = 0; i < numCols; i++) {
      x -= colWidths[i];
      doc.save();
      doc.rect(x, y, colWidths[i], 20).stroke('#06b6d4');
      // Reverse word order for Urdu cell text
      const cellText = typeof row[i] === 'string' ? reverseUrduWords(row[i]) : row[i];
      doc.font('Urdu').fontSize(10).fillColor('#222').text(cellText, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center' });
      doc.restore();
    }
    y += 20;
  });

  // Totals row (styled, RTL, match English style)
  y += 10;
  doc.font('Urdu').fontSize(12).fillColor('#0e7490').text(reverseUrduWords(`کل جمع شدہ: PKR ${totalCollected}`), tableLeft, y, { align: 'left', width: tableWidth / 2 });
  doc.font('Urdu').fontSize(12).fillColor('#0e7490').text(reverseUrduWords(`کل باقی: PKR ${totalRemaining}`), tableLeft + tableWidth / 2, y, { align: 'left', width: tableWidth / 2 });
  doc.fillColor('#000');

  // Footer (styled bar, all details in one line, in Urdu)
  const footerY = doc.page.height - 50;
  doc.rect(0, footerY, pageWidth, 40).fill('#06b6d4');
  doc.font('Urdu').fontSize(11).fillColor('#fff').text(reverseUrduWords('0300-1234567 | muhammadumaru3615@gmail.com | چونگی سٹاپ، درگاہ والا، لاہور'), 0, footerY + 10, { align: 'center', width: pageWidth });
  doc.end();
} 