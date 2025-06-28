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

  // Create PDF
  const doc = new PDFDocument({ size: 'A4', margin: 30 });
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

  // Table headers (Urdu)
  const headers = [
    'خریدار کا نام', 'شناختی کارڈ', 'فون', 'پروڈکٹ', 'کل رقم', 'ایڈوانس', 'جمع شدہ رقم', 'باقی رقم', 'مدت', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'
  ];
  const colWidths = [70, 80, 70, 60, 60, 60, 70, 70, 40, 60, 70];
  const tableLeft = pageWidth - 40 - colWidths.reduce((a, b) => a + b, 0);
  let y = 150;

  // Draw table headers with background
  let x = pageWidth - 40;
  doc.font('Urdu').fontSize(12);
  headers.forEach((header, i) => {
    x -= colWidths[i];
    doc.save();
    doc.rect(x, y, colWidths[i], 25).fillAndStroke('#06b6d4', '#06b6d4');
    doc.fillColor('#fff').text(header, x + 2, y + 6, { width: colWidths[i] - 4, align: 'center' });
    doc.restore();
  });

  // Draw table rows with alternating background
  y += 25;
  rows.forEach((row, rowIdx) => {
    x = pageWidth - 40;
    if (rowIdx % 2 === 0) {
      doc.save();
      doc.rect(tableLeft, y, pageWidth - 40 - tableLeft, 22).fill('#f0fafd');
      doc.restore();
    }
    row.forEach((cell, i) => {
      x -= colWidths[i];
      doc.save();
      doc.rect(x, y, colWidths[i], 22).stroke('#06b6d4');
      doc.font('Urdu').fontSize(11).fillColor('#222').text(cell, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center' });
      doc.restore();
    });
    y += 22;
  });

  // Totals row (styled)
  y += 10;
  doc.font('Urdu').fontSize(13).fillColor('#0e7490').text(`کل جمع شدہ: ${totalCollected}`, tableLeft, y, { align: 'right', width: pageWidth / 2 - tableLeft });
  doc.font('Urdu').fontSize(13).fillColor('#0e7490').text(`کل باقی: ${totalRemaining}`, pageWidth / 2, y, { align: 'right', width: pageWidth / 2 - 40 });
  doc.fillColor('#000');

  // Footer (styled bar)
  const footerY = doc.page.height - 50;
  doc.rect(0, footerY, pageWidth, 40).fill('#06b6d4');
  doc.font('Urdu').fontSize(12).fillColor('#fff').text('0300-1234567 | muhammadumaru3615@gmail.com | چونگی سٹاپ، درگاہ والا، لاہور', 0, footerY + 10, { align: 'center', width: pageWidth });
  doc.end();
} 