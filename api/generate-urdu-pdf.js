import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

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
  doc.font('Urdu').fontSize(22).fillColor('#0e7490').text('مجموعی اقساط رپورٹ', 0, 110, { align: 'center', width: pageWidth });
  doc.moveDown(1.5);

  // Table headers (Urdu, RTL columns, but text as-is)
  const headers = [
    'خریدار کا نام', 'شناختی کارڈ', 'فون', 'موبائل کا نام', 'کل رقم', 'ایڈوانس', 'جمع شدہ رقم', 'باقی رقم', 'مدت', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'
  ];
  const colWidths = [80, 100, 90, 90, 90, 80, 100, 100, 60, 80, 90];
  const numCols = headers.length;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableLeft = (pageWidth - tableWidth) / 2;
  let y = 150;

  // Draw table headers with background (RTL columns, text as-is)
  let x = tableLeft;
  doc.font('Urdu').fontSize(13);
  for (let i = numCols - 1; i >= 0; i--) {
    doc.save();
    doc.rect(x, y, colWidths[i], 30).fillAndStroke('#06b6d4', '#06b6d4');
    doc.fillColor('#fff').text(headers[i], x + 4, y + 8, { width: colWidths[i] - 8, align: 'center' });
    doc.restore();
    x += colWidths[i];
  }

  // Draw table rows with alternating background (RTL columns, text as-is)
  y += 30;
  rows.forEach((row, rowIdx) => {
    x = tableLeft;
    if (rowIdx % 2 === 0) {
      doc.save();
      doc.rect(tableLeft, y, tableWidth, 28).fill('#f0fafd');
      doc.restore();
    }
    for (let i = numCols - 1; i >= 0; i--) {
      doc.save();
      doc.rect(x, y, colWidths[i], 28).stroke('#06b6d4');
      doc.font('Urdu').fontSize(12).fillColor('#222').text(row[i], x + 4, y + 8, { width: colWidths[i] - 8, align: 'center' });
      doc.restore();
      x += colWidths[i];
    }
    y += 28;
  });

  // Totals row (styled, RTL, match English style)
  y += 12;
  doc.font('Urdu').fontSize(14).fillColor('#0e7490').text(`کل جمع شدہ: PKR ${totalCollected}`, tableLeft, y, { align: 'left', width: tableWidth / 2 });
  doc.font('Urdu').fontSize(14).fillColor('#0e7490').text(`کل باقی: PKR ${totalRemaining}`, tableLeft + tableWidth / 2, y, { align: 'left', width: tableWidth / 2 });
  doc.fillColor('#000');

  // Footer (styled bar, all details in one line, in Urdu)
  const footerY = doc.page.height - 50;
  doc.rect(0, footerY, pageWidth, 40).fill('#06b6d4');
  doc.font('Urdu').fontSize(13).fillColor('#fff').text('0300-1234567 | muhammadumaru3615@gmail.com | چونگی سٹاپ، درگاہ والا، لاہور', 0, footerY + 12, { align: 'center', width: pageWidth });
  doc.end();
} 