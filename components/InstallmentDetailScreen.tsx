import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Button, Input, Modal, CreditCardIcon } from './UIComponents';
import { DEFAULT_PROFILE_PIC } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language } from '../types';
import html2canvas from 'html2canvas';

const InstallmentDetailScreen: React.FC = () => {
  const { installmentId } = useParams<{ installmentId: string }>();
  const { installments, updateInstallment, t, language, userProfile } = useAppContext();
  const installment = installments.find(i => i.id === installmentId);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const navigate = useNavigate();
  const [editPayment, setEditPayment] = useState<import('../types').InstallmentPayment | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editError, setEditError] = useState('');
  const [deletePayment, setDeletePayment] = useState<import('../types').InstallmentPayment | null>(null);
  const [exportingUrduPdf, setExportingUrduPdf] = useState(false);
  const urduPdfDivRef = useRef<HTMLDivElement>(null);
  const [exportingUrduReceipt, setExportingUrduReceipt] = useState(false);
  const [urduReceiptPayment, setUrduReceiptPayment] = useState<import('../types').InstallmentPayment | null>(null);
  const urduReceiptDivRef = useRef<HTMLDivElement>(null);

  if (!installment) {
    return <div className="p-6 text-center text-red-500">{t('noInstallmentsFound')}</div>;
  }

  const totalPaid = installment.payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const remainingAmount = installment.totalPayment - (installment.advancePayment || 0) - totalPaid;
  const remainingInstallments = installment.duration - installment.payments.length;
  const isClosed = remainingAmount <= 0;

  const handleAddPayment = () => {
    setIsPaymentModalOpen(true);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  const handleSavePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      setError(t('enterValidAmount'));
      return;
    }
    if (amount > remainingAmount) {
      setError(t('amountExceedsBalance'));
      return;
    }
    const newPayment = {
      id: Math.random().toString(),
      installmentId: installment.id,
      amountPaid: amount,
      paymentDate,
      status: 'Paid' as const,
    };
    const updated = {
      ...installment,
      payments: [...installment.payments, newPayment],
      status: (remainingAmount - amount <= 0 ? 'Closed' : 'Open') as 'Closed' | 'Open',
    };
    await updateInstallment(updated);
    setIsPaymentModalOpen(false);
  };

  const handleEditPayment = (payment: import('../types').InstallmentPayment) => {
    setEditPayment(payment);
    setEditAmount(payment.amountPaid.toString());
    setEditDate(payment.paymentDate);
    setEditError('');
  };

  const handleSaveEditPayment = async () => {
    const amount = parseFloat(editAmount);
    if (!amount || amount <= 0) {
      setEditError(t('enterValidAmount'));
      return;
    }
    if (!editDate) {
      setEditError(t('enterValidDate'));
      return;
    }
    if (!editPayment) return;
    const updatedPayments = installment.payments.map(p =>
      p.id === editPayment.id ? { ...p, amountPaid: amount, paymentDate: editDate } : p
    );
    const updated = {
      ...installment,
      payments: updatedPayments,
    };
    await updateInstallment(updated);
    setEditPayment(null);
  };

  const handleDeletePayment = async () => {
    if (!deletePayment) return;
    const updatedPayments = installment.payments.filter(p => p.id !== deletePayment.id);
    const updated = {
      ...installment,
      payments: updatedPayments,
    };
    await updateInstallment(updated);
    setDeletePayment(null);
  };

  // Helper functions
  const capitalizeWords = (str: string) => str.replace(/\b\w/g, c => c.toUpperCase());
  const formatPhone = (phone: string) => phone.replace(/(\d{4})(\d{7})/, '$1-$2').slice(0, 12);
  const formatCNIC = (cnic: string) => cnic.replace(/(\d{5})(\d{7})(\d{1})/, '$1-$2-$3').slice(0, 15);

  // Helper for header/footer
  const drawPdfHeader = (pdf: jsPDF, pdfWidth: number, logoImg: string) => {
    pdf.setFillColor(6, 182, 212);
    pdf.rect(0, 0, pdfWidth, 70, 'F');
    pdf.addImage(String(logoImg ?? ''), 'PNG', 60, 10, 50, 50, '', 'FAST');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor('#fff');
    pdf.text("Faisal Mobile's", 130, 45, { align: 'left' });
    pdf.setDrawColor(6, 182, 212);
    pdf.setLineWidth(2);
    pdf.line(40, 75, pdfWidth - 40, 75);
  };
  const drawPdfFooter = (pdf: jsPDF, pdfWidth: number, pdfHeight: number, pageNum = 1, pageCount = 1) => {
    pdf.setFillColor(6, 182, 212);
    pdf.rect(0, pdfHeight - 50, pdfWidth, 40, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.setTextColor('#fff');
    const ownerPhone = userProfile?.phone || 'Phone N/A';
    const ownerEmail = userProfile?.email || 'Email N/A';
    const ownerAddress = userProfile?.address || 'Address N/A';
    const footerText = `${ownerPhone} | ${ownerEmail} | ${ownerAddress}`;
    pdf.text(footerText, pdfWidth/2, pdfHeight - 28, { align: 'center' });
  };

  const handleDownloadReceipt = async (payment: import('../types').InstallmentPayment) => {
    setPdfLoading(true);
    if (language === Language.UR) {
      setUrduReceiptPayment(payment);
      setExportingUrduReceipt(true);
      setTimeout(async () => {
        const urduDiv = urduReceiptDivRef.current;
        if (urduDiv) {
          const canvas = await html2canvas(urduDiv, { background: '#fff' });
          const imgData = canvas.toDataURL('image/jpeg', 0.85);
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgWidth = pdfWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'JPEG', 20, 20, imgWidth, imgHeight);
          pdf.save(`receipt_${String(installment?.buyerName || '').replace(/\s/g, '_')}_${String(payment.paymentDate || '')}.pdf`);
        }
        setExportingUrduReceipt(false);
        setUrduReceiptPayment(null);
        setPdfLoading(false);
      }, 100);
      return;
    }
    const appName = t('appName');
    const logoImg = await fetch('/assets/logo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); }));
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    // --- Professional Receipt Layout ---
    const receiptNumber = payment.id?.slice(-6).toUpperCase() || Math.floor(Math.random()*1000000).toString().padStart(6, '0');
    // Professional Header
    pdf.setFillColor(6, 182, 212);
    pdf.rect(0, 0, pdfWidth, 70, 'F');
    // Logo to the left, company name to the right
    pdf.addImage(String(logoImg ?? ''), 'PNG', 60, 10, 50, 50, '', 'FAST');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(28);
    pdf.setTextColor('#fff');
    pdf.text("Faisal Mobile's", 130, 45, { align: 'left' });
    pdf.setDrawColor(6, 182, 212);
    pdf.setLineWidth(2);
    pdf.line(40, 75, pdfWidth - 40, 75);
    let y = 110;
    // Receipt Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.setTextColor('#0e7490');
    pdf.text(`Installment Payment Receipt`, pdfWidth/2, y, { align: 'center' });
    y += 30;
    // Receipt Number and Date
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.setTextColor('#222');
    pdf.text(`Receipt #: ${receiptNumber}`, 60, y);
    pdf.text(`Date: ${payment.paymentDate || '-'}`, pdfWidth - 200, y);
    y += 20;
    // Two-column Info Section
        pdf.setFont('helvetica', 'bold');
    pdf.text('Buyer Details', 60, y);
    pdf.text('Installment Details', pdfWidth/2 + 40, y);
    // Underline both titles
    const buyerTitleWidth = pdf.getTextWidth('Buyer Details');
    pdf.setDrawColor(6, 182, 212);
    pdf.setLineWidth(1.2);
    pdf.line(60, y + 2, 60 + buyerTitleWidth, y + 2);
    const instTitleWidth = pdf.getTextWidth('Installment Details');
    pdf.line(pdfWidth/2 + 40, y + 2, pdfWidth/2 + 40 + instTitleWidth, y + 2);
    y += 18;
    pdf.setFont('helvetica', 'normal');
    const leftInfo = [
      [`Name:`, capitalizeWords(installment.buyerName || '-')],
      [`Phone:`, formatPhone(installment.phone || '-')],
      [`CNIC:`, formatCNIC(installment.cnic || '-')],
      [`Address:`, installment.address || '-'],
    ];
    const rightInfo = [
      [`Mobile:`, capitalizeWords(installment.mobileName || '-')],
      [`Total Payment:`, `PKR ${installment.totalPayment?.toLocaleString?.() || '0'}`],
      [`Advance:`, `PKR ${(installment.advancePayment || 0).toLocaleString()}`],
      [`Monthly:`, `PKR ${installment.monthlyInstallment?.toLocaleString?.() || '0'}`],
      [`Duration:`, `${installment.duration ?? '-'} Months`],
      [`Status:`, { value: capitalizeWords(remainingAmount <= 0 ? t('closed') : t('open')), color: remainingAmount <= 0 ? '#dc2626' : '#16a34a' }],
    ];
    let infoY = y;
    let maxRows = Math.max(leftInfo.length, rightInfo.length);
    for (let i = 0; i < maxRows; i++) {
      // Left column
      if (leftInfo[i]) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(leftInfo[i][0], 60, infoY);
        pdf.setFont('helvetica', 'normal');
        pdf.text(String(leftInfo[i][1]), 140, infoY);
      }
      // Right column
      if (rightInfo[i]) {
      pdf.setFont('helvetica', 'bold');
        pdf.text(rightInfo[i][0], pdfWidth/2 + 40, infoY);
      pdf.setFont('helvetica', 'normal');
        const rightValue = rightInfo[i][1];
        if (typeof rightValue === 'object' && rightValue !== null && 'value' in rightValue && 'color' in rightValue) {
          pdf.setTextColor(rightValue.color);
          pdf.text(String(rightValue.value), pdfWidth/2 + 130, infoY);
          pdf.setTextColor('#222');
        } else {
          pdf.text(String(rightValue), pdfWidth/2 + 130, infoY);
        }
      }
      infoY += 16;
    }
    y = infoY + 16;
    // Only show the current payment in the table
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor('#0e7490');
    pdf.text('Installment Payment Detail', 60, y);
    y += 10;
    const tableHead = [[ '#', 'Amount Paid', 'Payment Date', 'Status' ]];
    // Calculate total paid and remaining as of this payment
    const sortedPayments = [...installment.payments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
    let runningTotal = 0;
    let found = false;
    for (const p of sortedPayments) {
      runningTotal += p.amountPaid || 0;
      if (p.id === payment.id) {
        found = true;
        break;
      }
    }
    const paidAsOfThis = runningTotal;
    const remainingAsOfThis = installment.totalPayment - (installment.advancePayment || 0) - paidAsOfThis;
    const tableBody = [[
      '1',
      `PKR ${payment.amountPaid?.toLocaleString?.() || '0'}`,
      String(payment.paymentDate || '-') ,
      payment.status ? t(payment.status.toLowerCase()) : '-'
    ]];
    // Add summary row (bold, shaded) for this payment
    tableBody.push([
      '',
      `Total Paid: PKR ${paidAsOfThis.toLocaleString()}`,
      '',
      `Remaining: PKR ${remainingAsOfThis.toLocaleString()}`
    ]);
    autoTable(pdf, {
      startY: y + 10,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { fontSize: 11, cellPadding: 4, font: undefined, halign: 'left' },
      margin: { left: 40, right: 40, top: 120, bottom: 60 },
      didParseCell: function (data) {
        // Make summary row bold and shaded
        if (data.row.index === tableBody.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [224, 242, 254];
        }
      },
      didDrawPage: (data) => {
        // PAID stamp if paid
        if (payment.status && payment.status.toLowerCase() === 'paid') {
          pdf.saveGraphicsState();
          pdf.setTextColor(220, 38, 38);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(48);
          pdf.setDrawColor(220, 38, 38);
          pdf.setLineWidth(2);
          pdf.setGState(new pdf.GState({ opacity: 0.18 }));
          pdf.text('PAID', pdfWidth/2, pdfHeight/2, { align: 'center', angle: -20 });
          pdf.restoreGraphicsState();
          // Computer generated note just after PAID stamp
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(10);
          pdf.setTextColor('#888');
          pdf.text('This is a computer generated receipt and does not require a signature.', pdfWidth/2, pdfHeight/2 + 40, { align: 'center' });
        }
        // Professional Footer
        pdf.setFillColor(6, 182, 212);
        pdf.rect(0, pdfHeight - 50, pdfWidth, 40, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor('#fff');
        const ownerPhone = userProfile?.phone || 'Phone N/A';
        const ownerEmail = userProfile?.email || 'Email N/A';
        const ownerAddress = userProfile?.address || 'Address N/A';
        const footerText = `${ownerPhone} | ${ownerEmail} | ${ownerAddress}`;
        pdf.text(footerText, pdfWidth/2, pdfHeight - 28, { align: 'center' });
      }
    });
    pdf.save(`receipt_${String(installment.buyerName || '').replace(/\s/g, '_')}_${String(payment.paymentDate || '')}.pdf`);
    setPdfLoading(false);
  };

  const handleDownloadHistory = async () => {
    setPdfLoading(true);
    const appName = t('appName');
    const logoImg = await fetch('/assets/logo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); }));
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    if (language === Language.UR) {
      // --- Multi-page image-based export for Urdu ---
      const rowsPerPage = 16; // Adjust as needed for fitting table rows per page
      // 1. Buyer details page
      const footerText = (userProfile?.email || 'Email N/A') + ' | ' + (userProfile?.address || 'Address N/A') + ' | ' + (userProfile?.phone || 'Phone N/A');
      const detailsDiv = document.createElement('div');
      detailsDiv.style.position = 'absolute';
      detailsDiv.style.left = '-9999px';
      detailsDiv.style.top = '0';
      detailsDiv.style.width = `${pdfWidth}px`;
      detailsDiv.style.backgroundColor = 'white';
      detailsDiv.style.fontFamily = 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif';
      detailsDiv.style.direction = 'rtl';
      detailsDiv.style.fontSize = '13px';
      detailsDiv.style.lineHeight = '1.7';
      detailsDiv.innerHTML = `
        <div style="min-height: 100vh; display: flex; flex-direction: column; background: #fff; position: relative;">
          <div style="width: 100%; background: #06b6d4; height: 70px; display: flex; flex-direction: row; align-items: center; justify-content: center; position: relative;">
            <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; height: 70px; gap: 16px;">
              <div style="position: relative; width: 54px; height: 54px; display: flex; align-items: center; justify-content: center;">
                <div style="width: 54px; height: 54px; background: #fff; border-radius: 50%; position: absolute; top: 0; left: 0;"></div>
                ${logoImg ? `<img src="${logoImg}" style="width: 36px; height: 36px; object-fit: contain; position: absolute; top: 9px; left: 9px; z-index: 1;"/>` : ''}
              </div>
              <span style="color: #fff; font-size: 22px; font-weight: bold;">${appName}</span>
            </div>
          </div>
          <div style="flex: 1; padding: 0 20px; margin-top: 20px; box-sizing: border-box;">
            <div style="text-align: center; margin-bottom: 25px;">
              <h1 style="color: #0e7490; font-size: 22px; margin: 0 0 15px 0; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">
                خریدار کی ہسٹری رپورٹ
              </h1>
            </div>
            <div style="margin-bottom: 25px; border: 1px solid #eee; padding: 15px; border-radius: 5px;">
              <h2 style="color: #0e7490; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 16px;">
                ${t('personalDetails')}
              </h2>
              <div style="min-height: 120px; display: flex; flex-direction: row; ${language === Language.UR ? 'flex-direction: row-reverse;' : ''} align-items: flex-start; gap: 32px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 12px; min-width: 120px;">
                  ${installment.profilePictureUrl && installment.profilePictureUrl !== DEFAULT_PROFILE_PIC ? `<img src="${installment.profilePictureUrl}" alt="${t('buyerName') || ''}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #06b6d4;" />` : ''}
                  ${installment.cnicImageUrl ? `<img src="${installment.cnicImageUrl}" alt="${t('cnic') || ''}" style="width: 120px; height: 80px; object-fit: cover; border: 1.5px solid #06b6d4;" />` : ''}
                </div>
                <table style="border-collapse: collapse; width: auto; min-width: 320px;">
                  <tbody>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('buyerName')}:</td><td style="padding: 2px 0;">${installment.buyerName || ''}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('phone')}:</td><td style="padding: 2px 0;">${installment.phone || ''}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('cnic')}:</td><td style="padding: 2px 0;">${installment.cnic || ''}</td></tr>
                    ${installment.address ? `<tr><td style=\"font-weight:bold; padding: 2px 12px 2px 0; color:#222;\">${t('address')}:</td><td style=\"padding: 2px 0;\">${installment.address}</td></tr>` : ''}
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('mobileName')}:</td><td style="padding: 2px 0;">${installment.mobileName || ''}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('totalPayment')}:</td><td style="padding: 2px 0;">PKR ${installment.totalPayment?.toLocaleString?.() || '0'}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('advancePayment')}:</td><td style="padding: 2px 0;">PKR ${(installment.advancePayment || 0).toLocaleString()}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('monthlyInstallment')}:</td><td style="padding: 2px 0;">PKR ${installment.monthlyInstallment?.toLocaleString?.() || '0'}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('duration')}:</td><td style="padding: 2px 0;">${(installment.duration ?? '-') + ' ' + t('months')}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('status')}:</td><td style="padding: 2px 0; color: ${remainingAmount <= 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">${capitalizeWords(remainingAmount <= 0 ? t('closed') : t('open'))}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('totalCollected')}:</td><td style="padding: 2px 0;">PKR ${totalPaid?.toLocaleString?.() || '0'}</td></tr>
                    <tr><td style="font-weight:bold; padding: 2px 12px 2px 0; color:#222;">${t('remainingAmount')}:</td><td style="padding: 2px 0;">PKR ${remainingAmount?.toLocaleString?.() || '0'}</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div style="width: 100%; background: #06b6d4; height: 40px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; position: absolute; left: 0; bottom: 0;">
            ${footerText}
          </div>
        </div>
      `;
      document.body.appendChild(detailsDiv);
      const detailsCanvas = await html2canvas(detailsDiv, { background: '#fff', useCORS: true, allowTaint: true, width: detailsDiv.scrollWidth, height: detailsDiv.scrollHeight });
      const detailsImgData = detailsCanvas.toDataURL('image/jpeg', 1.0);
      const detailsImgWidth = pdfWidth;
      const detailsImgHeight = (detailsCanvas.height * detailsImgWidth) / detailsCanvas.width;
      pdf.addImage(detailsImgData, 'JPEG', 0, 0, detailsImgWidth, detailsImgHeight);
      document.body.removeChild(detailsDiv);
      // 2. Table pages
      const tableRows = installment.payments.map((p, idx) => [
        String(idx + 1),
        `PKR ${p.amountPaid?.toLocaleString?.() || '0'}`,
        String(p.paymentDate || '-'),
        p.status ? t(p.status.toLowerCase()) : '-'
      ]);
      const tableHead = [
        ['#', t('amountPaid'), t('paymentDate'), t('status')]
      ];
      for (let i = 0; i < tableRows.length; i += rowsPerPage) {
        const pageRows = tableRows.slice(i, i + rowsPerPage);
        const tableDiv = document.createElement('div');
        tableDiv.style.position = 'absolute';
        tableDiv.style.left = '-9999px';
        tableDiv.style.top = '0';
        tableDiv.style.width = `${pdfWidth}px`;
        tableDiv.style.backgroundColor = 'white';
        tableDiv.style.fontFamily = 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif';
        tableDiv.style.direction = 'rtl';
        tableDiv.style.fontSize = '13px';
        tableDiv.style.lineHeight = '1.7';
        tableDiv.innerHTML = `
          <div style="min-height: 100vh; display: flex; flex-direction: column; background: #fff; position: relative;">
            <div style="width: 100%; background: #06b6d4; height: 70px; display: flex; flex-direction: row; align-items: center; justify-content: center; position: relative;">
              <div style="display: flex; flex-direction: row; align-items: center; justify-content: center; height: 70px; gap: 16px;">
                <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: flex-end; justify-content: center;">
                  <div style="width: 36px; height: 36px; background: #fff; border-radius: 50%; position: absolute; bottom: 0; left: 0;"></div>
                  ${logoImg ? `<img src="${logoImg}" style="width: 26px; height: 26px; object-fit: contain; position: absolute; top: 0; left: 5px; z-index: 1;"/>` : ''}
                </div>
                <span style="color: #fff; font-size: 16px; font-weight: bold;">${appName}</span>
              </div>
            </div>
            <div style="flex: 1; padding: 0 20px; margin-top: 20px; box-sizing: border-box;">
              <div style="text-align: center; margin-bottom: 10px;">
                <h2 style="color: #0e7490; font-size: 16px; margin: 0 0 8px 0; border-bottom: 1px solid #06b6d4; padding-bottom: 4px;">
                  ادائیگیوں کی تفصیل
                </h2>
              </div>
              <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px;">
                <thead>
                  <tr style="background-color: #06b6d4; color: white;">
                    ${tableHead[0].map(h => `<th style='border: 1px solid #ddd; padding: 5px;'>${h}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${pageRows.map(row => `
                    <tr style="page-break-inside: avoid;">
                      ${row.map(cell => `<td style='border: 1px solid #ddd; padding: 5px;'>${cell}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style="width: 100%; background: #06b6d4; height: 40px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 10px; position: absolute; left: 0; bottom: 0;">
              ${footerText}
            </div>
          </div>
        `;
        document.body.appendChild(tableDiv);
        const tableCanvas = await html2canvas(tableDiv, { background: '#fff', useCORS: true, allowTaint: true, width: tableDiv.scrollWidth, height: tableDiv.scrollHeight });
        const tableImgData = tableCanvas.toDataURL('image/jpeg', 1.0);
        const tableImgWidth = pdfWidth;
        const tableImgHeight = (tableCanvas.height * tableImgWidth) / tableCanvas.width;
        pdf.addPage();
        pdf.addImage(tableImgData, 'JPEG', 0, 0, tableImgWidth, tableImgHeight);
        document.body.removeChild(tableDiv);
      }
      pdf.save(`Buyer_History_${String(installment.buyerName || '').replace(/\s/g, '_')}.pdf`);
        setPdfLoading(false);
      return;
    }
    // --- English: add header/footer to all pages ---
    // Restore drawHeader function for English PDF
    const drawHeader = () => {
      pdf.setFillColor(6, 182, 212);
      pdf.rect(0, 0, pdfWidth, 70, 'F');
      const logoX = 60;
      const logoY = 10;
      pdf.addImage(String(logoImg ?? ''), 'PNG', logoX, logoY, 50, 50, '', 'FAST');
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(24);
      pdf.setTextColor('#fff');
      pdf.text(appName, logoX + 70, 40, { align: 'left' });
      pdf.setDrawColor(6, 182, 212);
      pdf.setLineWidth(2);
      pdf.line(40, 75, pdfWidth - 40, 75);
    };
    let y = 110;
    drawHeader();
    // Two-column layout for info and images
    const leftX = 60;
    const rightColWidth = 100;
    const rightMargin = 72;
    const rightX = pdfWidth - rightMargin - rightColWidth;
    const leftColWidth = rightX - leftX - 40; // 40px gap between columns
    let leftY = y;
    let rightY = y;
    // Draw images on right (stacked, with vertical spacing)
    if (installment.profilePictureUrl && installment.profilePictureUrl !== DEFAULT_PROFILE_PIC) {
      try {
        const picResp = await fetch(installment.profilePictureUrl);
        const picBlob = await picResp.blob();
        const picBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(picBlob); });
        pdf.setDrawColor(6, 182, 212);
        pdf.setLineWidth(2);
        pdf.circle(rightX + rightColWidth/2, rightY + 40, 40, 'S');
        pdf.addImage(String(picBase64 ?? ''), 'JPEG', rightX, rightY, rightColWidth, 80, '', 'FAST');
        rightY += 90;
      } catch {}
    }
    if (installment.cnicImageUrl) {
      try {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.text('CNIC Image:', rightX, rightY);
        const cnicResp = await fetch(installment.cnicImageUrl);
        const cnicBlob = await cnicResp.blob();
        const cnicBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(cnicBlob); });
        pdf.addImage(String(cnicBase64 ?? ''), 'JPEG', rightX, rightY + 10, rightColWidth, 60, '', 'FAST');
        rightY += 80;
      } catch {}
    }
    // Info fields in the requested order
    const infoFields = [
      [t('buyerName') + ':', capitalizeWords(installment.buyerName || '')],
      [t('phone') + ':', formatPhone(installment.phone || '')],
      [t('cnic') + ':', formatCNIC(installment.cnic || '')],
      [t('mobileName') + ':', capitalizeWords(installment.mobileName || '')],
      [t('address') + ':', installment.address || '-'],
      [t('totalPayment') + ':', `PKR ${installment.totalPayment?.toLocaleString?.() || '0'}`],
      [t('advancePayment') + ':', `PKR ${(installment.advancePayment || 0).toLocaleString()}`],
      [t('monthlyInstallment') + ':', { value: `PKR ${installment.monthlyInstallment?.toLocaleString?.() || '0'}`, extraSpace: 40 }],
      [t('duration') + ':', { value: `${installment.duration ?? '-'} ${t('months') || ''}`, extraSpace: 100 }],
      [t('status') + ':', { value: capitalizeWords(remainingAmount <= 0 ? t('closed') || '' : t('open') || ''), color: remainingAmount <= 0 ? '#dc2626' : '#16a34a', labelColor: '#222' }],
      [t('totalCollected') + ':', `PKR ${totalPaid?.toLocaleString?.() || '0'}`],
      [t('remainingAmount') + ':', `PKR ${remainingAmount?.toLocaleString?.() || '0'}`],
    ];
    infoFields.forEach(([label, value]) => {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.setTextColor('#222');
      pdf.text(String(label ?? ''), leftX, leftY);
      pdf.setFont('helvetica', 'normal');
      if (typeof value === 'object' && value !== null && 'value' in value) {
        let xOffset = 140;
        if ('extraSpace' in value && typeof value.extraSpace === 'number') {
          xOffset += value.extraSpace;
        }
        if ('color' in value && value.color) {
          pdf.setTextColor(value.color);
        }
        pdf.text(String(value.value ?? ''), leftX + xOffset, leftY);
        pdf.setTextColor('#222');
      } else {
        const splitValue = pdf.splitTextToSize(String(value ?? '-'), leftColWidth - 140);
        pdf.text(String(Array.isArray(splitValue) ? splitValue.join('\n') : splitValue ?? '-'), leftX + 140, leftY);
        leftY += 20 * (Array.isArray(splitValue) ? splitValue.length : 1) - 20;
      }
      leftY += 20;
    });
    // Ensure y for table is below both columns
    y = Math.max(leftY, rightY) + 10;
    // Add heading before table
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor('#0e7490');
    pdf.text('Installments Detail', leftX, y + 10);
    y += 30;
    const tableHead = [
      [
        '#',
        t('amountPaid'),
        t('paymentDate'),
        t('status')
      ]
    ];
    const tableBody = installment.payments.map((p, idx) => [
        String(idx + 1),
        `PKR ${p.amountPaid?.toLocaleString?.() || '0'}`,
        String(p.paymentDate || '-'),
        p.status ? t(p.status.toLowerCase()) : '-'
    ]);
    autoTable(pdf, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      styles: {
        fontSize: 11,
        cellPadding: 4,
        font: undefined,
        halign: 'left',
      },
      margin: { left: 40, right: 40, top: 120, bottom: 60 },
      didDrawPage: (data) => {
        drawHeader();
        drawPdfFooter(pdf, pdfWidth, pdfHeight);
      }
    });
    pdf.save(`Buyer_History_${String(installment.buyerName || '').replace(/\s/g, '_')}.pdf`);
    setPdfLoading(false);
  };

  // CAMERA FIX: Add a function to open camera with back camera preference
  const openCameraWithBackPreference = async (onStream: (stream: MediaStream) => void, onError: (err: any) => void) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
      onStream(stream);
    } catch (err) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        onStream(stream);
      } catch (err2) {
        onError(err2);
      }
    }
  };

  return (
    <>
      {/* Urdu Receipt Hidden Div */}
      {exportingUrduReceipt && urduReceiptPayment && (
        <div
          ref={urduReceiptDivRef}
          className="receipt-render-area"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            minWidth: 800,
            width: 'fit-content',
            background: '#fff',
            color: '#222',
            fontFamily: 'Arial',
            direction: 'rtl',
            textAlign: 'right',
            padding: 0,
            zIndex: -1,
          }}
          dir="rtl"
        >
          {/* Header */}
          <div style={{ background: '#06b6d4', padding: '24px 32px 16px 32px', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{
                width: 70,
                height: 70,
                background: '#fff',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #fff',
                overflow: 'hidden',
                marginLeft: 16
              }}>
            <img
              src={'/assets/logo.png'}
              alt="logo"
                  style={{ width: 60, height: 60, objectFit: 'contain', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
            />
              </div>
              <h2 style={{ color: '#fff', fontWeight: 'bold', fontSize: 32, margin: 0 }}>{t('appName')}</h2>
            </div>
          </div>
          <div style={{ borderBottom: '4px solid #06b6d4', marginBottom: 24 }} />
          {/* Main content */}
          <div style={{ padding: 32 }}>
            {/* Title with receipt month */}
            <div style={{ fontWeight: 'bold', fontSize: 24, color: '#0e7490', marginBottom: 16 }}>
              {(() => {
                const monthNamesEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                const monthNamesUR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
                const paymentDateObj = urduReceiptPayment.paymentDate ? new Date(urduReceiptPayment.paymentDate) : new Date();
                const monthNames = language === Language.UR ? monthNamesUR : monthNamesEN;
                const receiptMonth = `${monthNames[paymentDateObj.getMonth()]} ${paymentDateObj.getFullYear()}`;
                return `${t('receipt')}: ${receiptMonth}`;
              })()}
            </div>
          <div style={{ display: 'flex', flexDirection: 'row-reverse', marginBottom: 24, gap: 16 }}>
            {/* Images column */}
            <div style={{ minWidth: 120, marginLeft: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {installment.profilePictureUrl && installment.profilePictureUrl !== DEFAULT_PROFILE_PIC && (
                <img
                  src={installment.profilePictureUrl || '/assets/logo.png'}
                  alt={t('buyerName') || ''}
                  style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #06b6d4', marginBottom: 8 }}
                  onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                />
              )}
              {installment.cnicImageUrl && (
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>شناختی کارڈ</div>
                  <img
                    src={installment.cnicImageUrl || ''}
                    alt={t('cnic') || ''}
                      style={{ width: 120, height: 80, objectFit: 'cover', border: '1.5px solid #06b6d4' }}
                  />
                </div>
              )}
            </div>
            {/* Details column */}
              <div style={{ flex: 1, fontFamily: 'inherit', fontSize: 18 }}>
                <div style={{ marginBottom: 2 }}><strong>{t('buyerName')}:</strong> {installment?.buyerName}</div>
                <div style={{ marginBottom: 2 }}><strong>{t('phone')}:</strong> {installment?.phone}</div>
                <div style={{ marginBottom: 2 }}><strong>{t('cnic')}:</strong> {installment?.cnic}</div>
                <div style={{ marginBottom: 2 }}><strong>{t('mobileName')}:</strong> {installment?.mobileName}</div>
                <div style={{ marginBottom: 2 }}><strong>{t('address')}:</strong> {installment?.address}</div>
              </div>
            </div>
            {/* Payment Info Table - match English PDF */}
          <div style={{ marginBottom: 16, fontFamily: 'inherit' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 20 }}>{t('payments')}:</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, fontFamily: 'inherit', fontSize: 16 }}>
                <tbody>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('amountPaid')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{urduReceiptPayment?.amountPaid?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('totalPayment')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{installment?.totalPayment?.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('startDate')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{installment?.startDate}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('remainingInstallments')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{(() => {
                      const paymentIndex = installment.payments.findIndex(p => p.id === urduReceiptPayment.id);
                      return installment.duration - (paymentIndex + 1);
                    })()}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('status')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{((() => {
                      const paymentIndex = installment.payments.findIndex(p => p.id === urduReceiptPayment.id);
                      const paidUpToThis = installment.payments.slice(0, paymentIndex + 1);
                      const totalPaidUpToThis = paidUpToThis.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                      const remainingAmountAtThis = installment.totalPayment - (installment.advancePayment || 0) - totalPaidUpToThis;
                      return remainingAmountAtThis <= 0 ? t('closed') : t('open');
                    })())}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('remainingAmount')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{((() => {
                      const paymentIndex = installment.payments.findIndex(p => p.id === urduReceiptPayment.id);
                      const paidUpToThis = installment.payments.slice(0, paymentIndex + 1);
                      const totalPaidUpToThis = paidUpToThis.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                      const remainingAmountAtThis = installment.totalPayment - (installment.advancePayment || 0) - totalPaidUpToThis;
                      return remainingAmountAtThis.toLocaleString();
                    })())}</td>
                </tr>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('paymentDate')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{urduReceiptPayment?.paymentDate}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          {/* Footer */}
          <div style={{
            borderTop: '4px solid #06b6d4',
            background: '#06b6d4',
            color: '#fff',
            padding: '16px 32px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 10,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8
          }}>
            0300-1234567 | muhammadumaru3615@gmail.com | Chungi Stop Darghowala, Lahore
          </div>
        </div>
      )}
      {/* Urdu Buyer Report Hidden Div */}
      {exportingUrduPdf && (
        <div
          ref={urduPdfDivRef}
          className="receipt-render-area"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            minWidth: 800,
            width: 'fit-content',
            background: '#fff',
            color: '#222',
            fontFamily: 'Arial',
            direction: 'rtl',
            textAlign: 'right',
            padding: 0,
            zIndex: -1,
            minHeight: '1122px', // A4 at 96dpi
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          dir="rtl"
        >
          {/* Header and Main Content */}
          <div style={{ flex: 1 }}>
            {/* Header */}
            <div style={{ background: '#06b6d4', padding: '24px 32px 16px 32px', borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: 70,
                  height: 70,
                  background: '#fff',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #fff',
                  overflow: 'hidden',
                  marginLeft: 16
                }}>
                  <img
                    src={'/assets/logo.png'}
                    alt="logo"
                    style={{ width: 60, height: 60, objectFit: 'contain', display: 'block' }}
                    onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                  />
                </div>
                <h2 style={{ color: '#fff', fontWeight: 'bold', fontSize: 32, margin: 0 }}>{t('appName')}</h2>
              </div>
            </div>
            <div style={{ borderBottom: '4px solid #06b6d4', marginBottom: 24 }} />
            {/* Main content */}
            <div style={{ padding: 32 }}>
              <div style={{ fontWeight: 'bold', fontSize: 28, color: '#0e7490', marginBottom: 16, textAlign: 'center' }}>
                {language === Language.UR ? 'خریدار کی ہسٹری رپورٹ' : t('buyerHistoryReport')}
              </div>
              <div style={{ display: 'flex', flexDirection: 'row-reverse', marginBottom: 24, gap: 16 }}>
                {/* Images column */}
                <div style={{ minWidth: 120, marginLeft: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  {installment.profilePictureUrl && installment.profilePictureUrl !== DEFAULT_PROFILE_PIC && (
                    <img
                      src={installment.profilePictureUrl || '/assets/logo.png'}
                      alt={t('buyerName') || ''}
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #06b6d4', marginBottom: 8 }}
                      onError={e => { (e.target as HTMLImageElement).src = '/assets/logo.png'; }}
                    />
                  )}
                  {installment.cnicImageUrl && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 15, marginBottom: 4 }}>شناختی کارڈ</div>
                      <img
                        src={installment.cnicImageUrl || ''}
                        alt={t('cnic') || ''}
                        style={{ width: 120, height: 80, objectFit: 'cover', border: '1.5px solid #06b6d4' }}
                      />
                    </div>
                  )}
                </div>
                {/* Details column */}
                <div style={{ flex: 1, fontFamily: 'inherit', fontSize: 18 }}>
                  <div style={{ marginBottom: 2 }}><strong>{t('buyerName')}:</strong> {installment?.buyerName}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('phone')}:</strong> {installment?.phone}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('cnic')}:</strong> {installment?.cnic}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('mobileName')}:</strong> {installment?.mobileName}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('address')}:</strong> {installment?.address}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('totalPayment')}:</strong> {installment?.totalPayment?.toLocaleString()}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('advancePayment')}:</strong> {installment?.advancePayment?.toLocaleString()}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('monthlyInstallment')}:</strong> {installment?.monthlyInstallment?.toLocaleString()}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('duration')}:</strong> {installment?.duration} {t('months')}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('status')}:</strong> {capitalizeWords(isClosed ? t('closed') : t('open'))}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('totalCollected')}:</strong> {totalPaid.toLocaleString()}</div>
                  <div style={{ marginBottom: 2 }}><strong>{t('remainingAmount')}:</strong> {remainingAmount.toLocaleString()}</div>
                </div>
              </div>
              {/* Installments Table */}
              <div style={{ marginBottom: 16, fontFamily: 'inherit' }}>
                <div style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 20 }}>{t('installments')}:</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, fontFamily: 'inherit', fontSize: 16 }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #06b6d4', padding: 8 }}>{'#'}</th>
                      <th style={{ border: '1px solid #06b6d4', padding: 8 }}>{t('amountPaid')}</th>
                      <th style={{ border: '1px solid #06b6d4', padding: 8 }}>{t('paymentDate')}</th>
                      <th style={{ border: '1px solid #06b6d4', padding: 8 }}>{t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installment.payments.map((p, idx) => (
                      <tr key={p.id}>
                        <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{p.amountPaid.toLocaleString()}</td>
                        <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{p.paymentDate}</td>
                        <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{p.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          {/* Footer always at bottom */}
          <div style={{
            borderTop: '4px solid #06b6d4',
            background: '#06b6d4',
            color: '#fff',
            padding: '16px 32px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 10,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8
          }}>
            0300-1234567 | muhammadumaru3615@gmail.com | Chungi Stop Darghowala, Lahore
          </div>
        </div>
      )}
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/installments')} className="mb-4">
          &larr; {language === Language.UR ? t('backToAllInstallments') || 'تمام اقساط پر واپس جائیں' : 'Back to All Installments'}
        </Button>
        <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md mb-6 w-full max-w-2xl mx-auto flex flex-col sm:flex-row gap-4 items-center">
          <img src={installment.profilePictureUrl || DEFAULT_PROFILE_PIC} alt={installment.buyerName} className="w-24 h-24 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-primary mb-4 sm:mb-0" />
          <div className="flex-1 w-full">
            <h1 className="text-2xl font-bold text-primary mb-1 break-words">{installment.buyerName}</h1>
              <div className="space-y-1">
              <div className="flex flex-wrap items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('mobile')}:</span><span className="ml-3 break-all">{installment.mobileName}</span></div>
              <div className="flex flex-wrap items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('phone')}:</span><span className="ml-3 break-all">{installment.phone}</span></div>
              <div className="flex flex-wrap items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('cnic')}:</span><span className="ml-3 break-all">{installment.cnic}</span></div>
              <div className="flex flex-wrap items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('address')}:</span><span className="ml-3 break-all">{installment.address}</span></div>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md mb-6 flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 mb-2">
            <div>{t('totalPayment')}: <span className="font-semibold">PKR {installment.totalPayment.toLocaleString()}</span></div>
            <div>{t('advancePayment')}: <span className="font-semibold">PKR {installment.advancePayment?.toLocaleString?.() || 0}</span></div>
            <div>{t('monthlyInstallment')}: <span className="font-semibold">PKR {installment.monthlyInstallment.toLocaleString()}</span></div>
            <div>{t('startDate')}: <span className="font-semibold">{installment.startDate}</span></div>
            <div>{t('duration')}: <span className="font-semibold">{installment.duration} {t('months')}</span></div>
          </div>
          <div className="flex flex-wrap gap-4 mt-2">
            <div>{t('status')}: <span className={`font-bold ${isClosed ? 'text-green-600' : 'text-orange-500'}`}>{capitalizeWords(isClosed ? t('closed') : t('open'))}</span></div>
            <div>{t('totalCollected')}: <span className="font-semibold">PKR {totalPaid.toLocaleString()}</span></div>
            <div>{t('remainingAmount')}: <span className="font-semibold">{remainingAmount.toLocaleString()}</span></div>
          </div>
        </div>
        <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-primary flex items-center"><CreditCardIcon className="h-6 w-6 mr-2" />{t('payments')}</h2>
            {!isClosed && <Button onClick={handleAddPayment}>{t('pay')}</Button>}
          </div>
          {installment.payments.length === 0 ? (
            <p className="text-neutral-DEFAULT dark:text-gray-400">{t('noInstallmentsMade')}</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
              <thead className="bg-gray-50 dark:bg-neutral-dark">
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('amountPaid')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('paymentDate')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('status')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('receipt')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('edit')}</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">{t('delete')}</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-neutral-darker divide-y divide-gray-200 dark:divide-gray-700">
                {installment.payments.map((p, idx) => (
                  <tr key={p.id}>
                    <td className="px-3 py-2 text-center">{idx + 1}</td>
                    <td className="px-3 py-2 text-center">PKR {p.amountPaid.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">{p.paymentDate}</td>
                    <td className="px-3 py-2 text-center">{p.status}</td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" onClick={() => handleDownloadReceipt(p)} disabled={pdfLoading}>PDF</Button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" onClick={() => handleEditPayment(p)}>{t('edit')}</Button>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button size="sm" variant="ghost" color="red" onClick={() => setDeletePayment(p)}>{t('delete')}</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
        <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-primary mb-2">Download Buyer Report</h2>
          <Button variant="primary" className="font-bold ring-2 ring-primary/60" onClick={handleDownloadHistory} disabled={pdfLoading}>Download PDF</Button>
        </div>
        <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title={t('pay')}>
          <div className="space-y-4">
            <Input name="amount" label={t('amountPaid')} type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} required />
            <Input name="date" label={t('paymentDate')} type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSavePayment}>{t('pay')}</Button>
            </div>
          </div>
        </Modal>
        <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title={t('edit')}>
          <div className="space-y-4">
            <Input name="editAmount" label={t('amountPaid')} type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} required />
            <Input name="editDate" label={t('paymentDate')} type="date" value={editDate} onChange={e => setEditDate(e.target.value)} required />
            {editError && <div className="text-red-500 text-sm">{editError}</div>}
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <Button variant="ghost" onClick={() => setEditPayment(null)}>{t('cancel')}</Button>
              <Button onClick={handleSaveEditPayment}>{t('saveChanges')}</Button>
            </div>
          </div>
        </Modal>
        <Modal isOpen={!!deletePayment} onClose={() => setDeletePayment(null)} title={t('confirmDelete')}>
          <div className="space-y-4">
            <div>{t('confirmDelete')}</div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
              <Button variant="ghost" onClick={() => setDeletePayment(null)}>{t('cancel')}</Button>
              <Button color="red" onClick={handleDeletePayment}>{t('delete')}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </>
  );
};

export default InstallmentDetailScreen; 