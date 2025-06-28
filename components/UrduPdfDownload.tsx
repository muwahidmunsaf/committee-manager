import React, { useRef } from 'react';

const UrduPdfDownload: React.FC = () => {
  const urduDivRef = useRef<HTMLDivElement>(null);

  const downloadUrduPdf = async () => {
    const urduDiv = urduDivRef.current;
    if (!urduDiv) return;
    // Compose a minimal HTML document with styles and the Urdu content
    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body { font-family: 'Jameel Noori Nastaleeq', 'Noto Nastaliq Urdu', serif; direction: rtl; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #06b6d4; padding: 8px; }
            th { background: #06b6d4; color: #fff; }
          </style>
        </head>
        <body>
          ${urduDiv.innerHTML}
        </body>
      </html>
    `;
    const response = await fetch('https://committee-manager.fly.dev/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html })
    });
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'urdu-report.pdf';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button onClick={downloadUrduPdf} style={{ marginBottom: 16, background: '#06b6d4', color: '#fff', padding: '8px 16px', border: 'none', borderRadius: 4 }}>Download Urdu PDF</button>
      <div ref={urduDivRef} style={{ display: 'none' }}>
        <h2 style={{ color: '#0e7490', textAlign: 'center' }}>اردو رپورٹ</h2>
        <table>
          <thead>
            <tr>
              <th>نام</th>
              <th>فون</th>
              <th>پتہ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>منصف</td>
              <td>0333-3333333</td>
              <td>لاہور</td>
            </tr>
            <tr>
              <td>شہرام</td>
              <td>0333-3333334</td>
              <td>کراچی</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UrduPdfDownload; 