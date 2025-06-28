const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');
const app = express();

// CORS middleware for all routes and errors
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/generate-pdf', async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).send('No HTML provided');

  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: 20, bottom: 20, left: 20, right: 20 }
  });
  await browser.close();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename=urdu-report.pdf',
    'Content-Length': pdfBuffer.length
  });
  res.send(pdfBuffer);
});

app.options('/generate-pdf', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`PDF server running on port ${PORT}`)); 