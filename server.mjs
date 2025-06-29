import express from 'express';
import cors from 'cors';
import { generatePdfFromHtml } from './services/html2pdfService.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

console.log("Registering /generate-urdu-pdf route");
app.post('/generate-urdu-pdf', async (req, res) => {
  console.log("Received POST /generate-urdu-pdf");
  console.log("Request body:", req.body);
  try {
    const { html } = req.body;
    if (!html) {
      console.log("Missing html in request body");
      return res.status(400).json({ error: 'Missing html in request body' });
    }
    const pdfBuffer = await generatePdfFromHtml(html);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=\"installment.pdf\"',
    });
    res.send(pdfBuffer);
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

app.get('/test', (req, res) => {
  res.json({ message: 'Backend is reachable!' });
});

app.listen(3002, () => console.log('PDF server running on port 3002')); 