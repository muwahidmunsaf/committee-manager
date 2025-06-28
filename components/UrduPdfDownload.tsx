import React, { useRef } from 'react';

const UrduPdfDownload: React.FC = () => {
  const urduDivRef = useRef<HTMLDivElement>(null);

  const downloadUrduPdf = async () => {
    // Sample data for demonstration - in real app this would come from props or context
    const sampleRows = [
      ['منصف', '12345-1234567-1', '0333-3333333', 'iPhone 15', '150000', '50000', '75000', '25000', '12', '6', 'کھلا'],
      ['شہرام', '54321-7654321-2', '0333-3333334', 'Samsung S24', '120000', '40000', '80000', '0', '10', '0', 'بند'],
    ];
    
    const totalCollected = '155000';
    const totalRemaining = '25000';

    const response = await fetch('/api/generate-urdu-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: sampleRows, totalCollected, totalRemaining })
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
    </div>
  );
};

export default UrduPdfDownload; 