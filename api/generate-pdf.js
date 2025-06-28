import { IncomingMessage, ServerResponse } from 'http';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  // Allow CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end('Method Not Allowed');
    return;
  }

  // Read body as buffer if not already parsed
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  const { html } = JSON.parse(body);

  if (!html) {
    res.statusCode = 400;
    res.end('No HTML provided');
    return;
  }

  let browser = null;
  try {
    const executablePath = await chromium.executablePath();

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 20, bottom: 20, left: 20, right: 20 },
    });

    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=urdu-report.pdf');
    res.setHeader('Content-Length', pdfBuffer.length.toString());
    res.statusCode = 200;
    res.end(pdfBuffer);
  } catch (error) {
    console.error('PDF generation failed:', error);
    if (browser) await browser.close();
    res.statusCode = 500;
    res.end('PDF generation failed: ' + error.message);
  }
}
