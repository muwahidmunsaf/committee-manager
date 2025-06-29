const axios = require('axios');

const HTML2PDF_API_KEY = 'fGeTPbYrO7jauGJnZyCJBYFouC9TBDVFOipDHFlNsO99glJc4bD99zdIXg6JMvHJ';
const HTML2PDF_API_URL = 'https://api.html2pdf.app/v1/generate';

async function generatePdfFromHtml(html) {
  const response = await axios.post(
    HTML2PDF_API_URL,
    {
      html,
      fileName: 'installment.pdf',
      // You can add more options here if needed
    },
    {
      headers: {
        'Authorization': `Bearer ${HTML2PDF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer', // To get PDF as buffer
    }
  );
  return Buffer.from(response.data);
}

module.exports = { generatePdfFromHtml }; 