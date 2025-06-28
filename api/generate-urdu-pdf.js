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

  // Header with logo and title
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, doc.page.width - 120, 20, { width: 80, align: 'right' });
  }
  doc.font('Urdu').fontSize(22).text('مجموعی اقساط رپورٹ', 40, 40, { align: 'right' });
  doc.moveDown(2);

  // Table headers (Urdu)
  const headers = [
    'خریدار کا نام', 'شناختی کارڈ', 'فون', 'پروڈکٹ', 'کل رقم', 'ایڈوانس', 'جمع شدہ رقم', 'باقی رقم', 'مدت', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'
  ];

  // Table start position
  let tableTop = 100;
  let colWidths = [70, 80, 70, 60, 60, 60, 70, 70, 40, 60, 70];
  let x = doc.page.width - 40;

  // Draw table headers
  doc.font('Urdu').fontSize(12);
  headers.forEach((header, i) => {
    x -= colWidths[i];
    doc.rect(x, tableTop, colWidths[i], 25).fillAndStroke('#06b6d4', '#06b6d4');
    doc.fillColor('#fff').text(header, x + 2, tableTop + 6, { width: colWidths[i] - 4, align: 'center' });
    doc.fillColor('#000');
  });

  // Draw table rows
  let y = tableTop + 25;
  rows.forEach(row => {
    x = doc.page.width - 40;
    row.forEach((cell, i) => {
      x -= colWidths[i];
      doc.rect(x, y, colWidths[i], 22).stroke();
      doc.font('Urdu').fontSize(11).text(cell, x + 2, y + 5, { width: colWidths[i] - 4, align: 'center' });
    });
    y += 22;
  });

  // Totals row
  y += 10;
  doc.font('Urdu').fontSize(13).fillColor('#0e7490').text(`کل جمع شدہ: ${totalCollected}`, 40, y, { align: 'right' });
  doc.font('Urdu').fontSize(13).fillColor('#0e7490').text(`کل باقی: ${totalRemaining}`, 250, y, { align: 'right' });
  doc.fillColor('#000');

  // Footer
  doc.rect(0, doc.page.height - 50, doc.page.width, 40).fill('#06b6d4');
  doc.font('Urdu').fontSize(12).fillColor('#fff').text('0300-1234567 | muhammadumaru3615@gmail.com | چونگی سٹاپ، درگاہ والا، لاہور', 0, doc.page.height - 40, { align: 'center', width: doc.page.width });
  doc.end();
} 