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
  const { urduText, title } = JSON.parse(body);

  // Path to your Urdu font
  const fontPath = path.join(process.cwd(), 'assets', 'JameelNooriNastaleeqKasheeda.ttf');

  // Create PDF
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  let buffers = [];
  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {
    const pdfData = Buffer.concat(buffers);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=urdu-report.pdf');
    res.status(200).end(pdfData);
  });

  // Use Urdu font
  doc.registerFont('Urdu', fontPath);

  // Title (centered)
  doc.font('Urdu').fontSize(24).text(title || 'اردو رپورٹ', { align: 'center' });

  doc.moveDown();

  // Urdu content (RTL)
  doc.font('Urdu').fontSize(16).text(urduText || 'یہ ایک نمونہ اردو پی ڈی ایف ہے۔', {
    align: 'right',
    direction: 'rtl'
  });

  doc.end();
} 