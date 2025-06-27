import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

export default async function handler(req, res) {
  try {
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreDefaultArgs: ['--disable-extensions'],
    });
    await browser.close();
    res.status(200).send('Chromium launched successfully!');
  } catch (error) {
    res.status(500).send('Chromium failed: ' + error.message);
  }
} 