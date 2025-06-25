import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Button, Input, Modal, CreditCardIcon } from './UIComponents';
import { DEFAULT_PROFILE_PIC } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Language } from '../types';
import '../assets/JameelNooriNastaleeq-normal.js'; // Register Urdu font for jsPDF
import html2canvas from 'html2canvas';

const InstallmentDetailScreen: React.FC = () => {
  const { installmentId } = useParams<{ installmentId: string }>();
  const { installments, updateInstallment, t, language } = useAppContext();
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
    pdf.addImage(String(logoImg || ''), 'PNG', pdfWidth/2 - 25, 10, 50, 35, '', 'FAST');
    pdf.setFontSize(24);
    pdf.setTextColor('#fff');
    pdf.setFont(undefined, 'bold');
    pdf.text("Faisal Mobile's", pdfWidth/2, 55, { align: 'center' });
    pdf.setDrawColor(6, 182, 212);
    pdf.setLineWidth(2);
    pdf.line(40, 75, pdfWidth - 40, 75);
  };
  const drawPdfFooter = (pdf: jsPDF, pdfWidth: number, pdfHeight: number, pageNum = 1, pageCount = 1) => {
    pdf.setFillColor(6, 182, 212);
    pdf.rect(0, pdfHeight - 50, pdfWidth, 40, 'F');
    pdf.setFontSize(13);
    pdf.setTextColor('#fff');
    pdf.setFont(undefined, 'bold');
    pdf.text('0300-1234567 | muhammadumaru3615@gmail.com | Chungi Stop Darghowala, Lahore', pdfWidth/2, pdfHeight - 28, { align: 'center' });
    pdf.setFontSize(11);
    pdf.setTextColor('#444');
    pdf.text(`Page ${String(pageNum ?? 1)} of ${String(pageCount ?? 1)}`, pdfWidth/2, pdfHeight - 8, { align: 'center' });
  };

  const drawTextLetterhead = (
    pdf: jsPDF,
    pdfWidth: number,
    pdfHeight: number,
    userProfile: { phone?: string; email?: string; address?: string },
    logoBase64: string,
    appName: string,
    language: string = 'EN'
  ) => {
    if (language === 'UR') {
      pdf.setFont('JameelNooriNastaleeq', 'normal');
      pdf.setFontSize(16);
    }
    if (logoBase64) {
      pdf.addImage(String(logoBase64 || ''), 'PNG', pdfWidth/2-30, language === 'EN' ? 31.3 : 20, 60, 60, '', 'FAST');
    }
    pdf.setFontSize(18);
    pdf.setTextColor('#0e7490');
    if (language === 'UR') {
      pdf.setFont('JameelNooriNastaleeq', 'normal');
    }
    // pdf.text(appName, pdfWidth/2, language === 'EN' ? 106.3 : 95, { align: 'center' });
    pdf.setDrawColor('#06b6d4');
    pdf.setLineWidth(1);
    pdf.line(40, language === 'EN' ? 121.3 : 110, pdfWidth-40, language === 'EN' ? 121.3 : 110);
    // Footer
    const footerY = pdfHeight-40;
    pdf.setFillColor('#06b6d4');
    pdf.rect(0, footerY-10, pdfWidth, 30, 'F');
    pdf.setFontSize(11);
    pdf.setTextColor('#fff');
    const details = [userProfile.phone, userProfile.email, userProfile.address].filter(Boolean).join(' | ');
    if (language === 'UR') {
      pdf.setFont('JameelNooriNastaleeq', 'normal');
    }
    pdf.text(details || '', pdfWidth/2, footerY+8, { align: 'center' });
    pdf.setTextColor('#222');
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
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgWidth = pdfWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
          pdf.save(`receipt_${String(installment?.buyerName || '').replace(/\s/g, '_')}_${String(payment.paymentDate || '')}.pdf`);
        }
        setExportingUrduReceipt(false);
        setUrduReceiptPayment(null);
        setPdfLoading(false);
      }, 100);
      return;
    }
    const userProfile = { phone: '0300-1234567', email: 'muhammadumaru3615@gmail.com', address: 'Chungi Stop Darghowala, Lahore' };
    const appName = t('appName');
    const logoImg = await fetch('/assets/logo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); }));
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoImg, appName, language);
    let y = 130;
    const monthNamesEN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const monthNamesUR = ["جنوری", "فروری", "مارچ", "اپریل", "مئی", "جون", "جولائی", "اگست", "ستمبر", "اکتوبر", "نومبر", "دسمبر"];
    const paymentDateObj = payment.paymentDate ? new Date(payment.paymentDate) : new Date();
    const monthNames = language === Language.UR ? monthNamesUR : monthNamesEN;
    const receiptMonth = `${monthNames[paymentDateObj.getMonth()]} ${paymentDateObj.getFullYear()}`;
    pdf.setFontSize(15);
    pdf.setTextColor('#0e7490');
    pdf.setFont(undefined, 'bold');
    pdf.text(`${t('receipt')}: ${receiptMonth}`, pdfWidth/2, y + 20, { align: 'center' });
    y += 40;
    pdf.setFontSize(13);
    pdf.setTextColor('#222');
    let imageY = y;
    const lineGap = 20;
    // --- Improved two-column layout for receipt PDF ---
    const leftX = 60;
    const rightColWidth = 80; // image width
    const rightMargin = 72; // 1 inch
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
        pdf.circle(rightX + 40, rightY + 30, 30, 'S');
        pdf.addImage(String(picBase64 || ''), 'JPEG', rightX, rightY, rightColWidth, 60, '', 'FAST');
        rightY += 70;
      } catch {}
    }
    if (installment.cnicImageUrl) {
      try {
        pdf.setFont(undefined, 'bold');
        pdf.text('CNIC Image:', rightX, rightY);
        const cnicResp = await fetch(installment.cnicImageUrl);
        const cnicBlob = await cnicResp.blob();
        const cnicBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(cnicBlob); });
        pdf.addImage(String(cnicBase64 || ''), 'JPEG', rightX, rightY + 10, rightColWidth, 50, '', 'FAST');
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
    ];
    infoFields.forEach(([label, value]) => {
      if (language === Language.UR) {
        pdf.setFont('JameelNooriNastaleeq', 'normal');
        pdf.setFontSize(16);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(13);
      }
      pdf.setFont(undefined, 'bold');
      pdf.text(String(label || ''), leftX, leftY);
      pdf.setFont(undefined, 'normal');
      const splitValueReceipt = pdf.splitTextToSize(String(value || '-'), leftColWidth - 140);
      pdf.text(String(Array.isArray(splitValueReceipt) ? splitValueReceipt.join('\n') : splitValueReceipt || ''), leftX + 140, leftY);
      leftY += lineGap * (Array.isArray(splitValueReceipt) ? splitValueReceipt.length : 1);
    });
    // Ensure y for table is below both columns
    y = Math.max(leftY, rightY) + 10;
    // Payment details calculations as of this payment
    const paymentIndex = installment.payments.findIndex(p => p.id === payment.id);
    const paidUpToThis = installment.payments.slice(0, paymentIndex + 1);
    const totalPaidUpToThis = paidUpToThis.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
    const remainingAmountAtThis = installment.totalPayment - (installment.advancePayment || 0) - totalPaidUpToThis;
    const remainingInstallmentsAtThis = installment.duration - (paymentIndex + 1);
    // Payment Details Table
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor('#0e7490');
    pdf.text(t('payments'), 60, y);
    y += 10;
    const paymentTableBody = [
      [t('amountPaid'), `PKR ${payment.amountPaid?.toLocaleString?.() || '0'}`],
      [t('totalPayment'), `PKR ${installment.totalPayment?.toLocaleString?.() || '0'}`],
      [t('startDate'), installment.startDate || '-'],
      [t('remainingInstallments'), `${remainingInstallmentsAtThis ?? '-'}`],
      [t('status'), capitalizeWords(remainingAmountAtThis <= 0 ? t('closed') : t('open'))],
      [t('remainingAmount'), `PKR ${remainingAmountAtThis?.toLocaleString?.() || '0'}`],
      [t('paymentDate'), String(payment.paymentDate || '-')],
    ];
    autoTable(pdf, {
      startY: y,
      head: [],
      body: paymentTableBody,
      theme: 'grid',
      styles: { fontSize: 11, cellPadding: 4 },
      margin: { left: 60, right: 60 },
      tableLineColor: [6, 182, 212],
      tableLineWidth: 0.5,
      didDrawPage: () => {},
    });
    y = (pdf as any).lastAutoTable.finalY + 20;
    // Add new auto-generated note
    pdf.setFontSize(10);
    pdf.setTextColor('#6c757d');
    pdf.text(t('autoGeneratedReceiptNote'), pdfWidth/2, y, { align: 'center' });
    drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoImg, appName, language);
    pdf.save(`receipt_${String(installment.buyerName || '').replace(/\s/g, '_')}_${String(payment.paymentDate || '')}.pdf`);
    setPdfLoading(false);
  };

  const handleDownloadHistory = async () => {
    setPdfLoading(true);
    if (language === Language.UR) {
      setExportingUrduPdf(true);
      setTimeout(async () => {
        const urduDiv = urduPdfDivRef.current;
        if (urduDiv) {
          const canvas = await html2canvas(urduDiv, { background: '#fff' });
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgWidth = pdfWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          pdf.addImage(imgData, 'PNG', 20, 20, imgWidth, imgHeight);
          pdf.save(`Buyer_History_${String(installment?.buyerName || '').replace(/\s/g, '_')}.pdf`);
        }
        setExportingUrduPdf(false);
        setPdfLoading(false);
      }, 100);
      return;
    }
    const userProfile = { phone: '0300-1234567', email: 'muhammadumaru3615@gmail.com', address: 'Chungi Stop Darghowala, Lahore' };
    const appName = "Faisal Mobile's";
    const logoImg = await fetch('/assets/logo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); }));
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoImg, appName, language);
    let y = 160;
    const lineGap = 20;
    pdf.setFontSize(16);
    pdf.setTextColor('#0e7490');
    pdf.setFont(undefined, 'bold');
    pdf.text('Buyer History Report', pdfWidth/2, y, { align: 'center' });
    y += 20;
    pdf.setFontSize(13);
    pdf.setTextColor('#222');
    // --- Improved two-column layout for buyer history PDF ---
    const leftX = 60;
    const rightColWidth = 80; // image width
    const rightMargin = 72; // 1 inch
    const rightX = pdfWidth - rightMargin - rightColWidth;
    const leftColWidth = rightX - leftX - 40; // 40px gap between columns
    let leftYHistory = y;
    let rightY = y;
    // Draw images on right (stacked, with vertical spacing)
    if (installment.profilePictureUrl && installment.profilePictureUrl !== DEFAULT_PROFILE_PIC) {
      try {
        const picResp = await fetch(installment.profilePictureUrl);
        const picBlob = await picResp.blob();
        const picBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(picBlob); });
        pdf.setDrawColor(6, 182, 212);
        pdf.setLineWidth(2);
        pdf.circle(rightX + 40, rightY + 30, 30, 'S');
        pdf.addImage(String(picBase64 || ''), 'JPEG', rightX, rightY, rightColWidth, 60, '', 'FAST');
        rightY += 70;
      } catch {}
    }
    if (installment.cnicImageUrl) {
      try {
        pdf.setFont(undefined, 'bold');
        pdf.text('CNIC Image:', rightX, rightY);
        const cnicResp = await fetch(installment.cnicImageUrl);
        const cnicBlob = await cnicResp.blob();
        const cnicBase64 = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(cnicBlob); });
        pdf.addImage(String(cnicBase64 || ''), 'JPEG', rightX, rightY + 10, rightColWidth, 50, '', 'FAST');
        rightY += 80;
      } catch {}
    }
    // Buyer details fields in the requested order
    const buyerFields = [
      [t('buyerName') + ':', capitalizeWords(installment.buyerName || '')],
      [t('phone') + ':', formatPhone(installment.phone || '')],
      [t('cnic') + ':', formatCNIC(installment.cnic || '')],
      [t('mobileName') + ':', capitalizeWords(installment.mobileName || '')],
      [t('address') + ':', installment.address || '-'],
      [t('totalPayment') + ':', `PKR ${installment.totalPayment?.toLocaleString?.() || '0'}`],
      [t('advancePayment') + ':', `PKR ${(installment.advancePayment || 0).toLocaleString()}`],
      [t('monthlyInstallment').replace(' Amount', '') + ':', `PKR ${installment.monthlyInstallment?.toLocaleString?.() || '0'}`],
      [t('totalCollected') + ':', `PKR ${totalPaid?.toLocaleString?.() || '0'}`],
      [t('remainingAmount') + ':', `PKR ${remainingAmount?.toLocaleString?.() || '0'}`],
      [t('duration').replace(' (Months/Weeks/Days)', '') + ':', `${installment.duration ?? '-'} Months`],
      ['Left Installment:', `${remainingInstallments ?? '-'}`],
      ['Account Status:', capitalizeWords(isClosed ? t('closed') : t('open'))],
    ];
    const labelWidth = 140;
    // Simulate left column rendering to get contentHeight
    let leftYSim = y;
    buyerFields.forEach(([label, value]) => {
      const splitValueSim = pdf.splitTextToSize(String(value || '-'), leftColWidth - labelWidth);
      leftYSim += lineGap * (Array.isArray(splitValueSim) ? splitValueSim.length : 1);
    });
    const contentHeight = leftYSim - y;
    // Calculate imagesHeight
    let imagesHeight = 0;
    if (installment.profilePictureUrl && installment.profilePictureUrl !== DEFAULT_PROFILE_PIC) imagesHeight += 70;
    if (installment.cnicImageUrl) imagesHeight += 80;
    // Calculate vertical offset
    let imagesYOffset = 0;
    if (imagesHeight < contentHeight) {
      imagesYOffset = (contentHeight - imagesHeight) / 2;
    }
    let rightYCentered = y + imagesYOffset;
    // Render left column (actual)
    buyerFields.forEach(([label, value]) => {
      let splitValueHistory: string[] = [];
      if (language === Language.UR) {
        pdf.setFont('JameelNooriNastaleeq', 'normal');
        pdf.setFontSize(16);
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(13);
      }
      pdf.setFont(undefined, 'bold');
      pdf.text(String(label || ''), leftX, leftYHistory);
      pdf.setFont(undefined, 'normal');
      // Account Status color
      if (label === 'Account Status:') {
        pdf.setTextColor(isClosed ? '#dc2626' : '#16a34a');
        const statusText = String(value || '-');
        pdf.text(statusText, leftX + labelWidth, leftYHistory);
        pdf.setTextColor('#222');
        splitValueHistory = [statusText];
      } else {
        splitValueHistory = pdf.splitTextToSize(String(value || '-'), leftColWidth - labelWidth);
        pdf.text(Array.isArray(splitValueHistory) ? splitValueHistory.join('\n') : String(splitValueHistory || ''), leftX + labelWidth, leftYHistory);
      }
      leftYHistory += lineGap * (Array.isArray(splitValueHistory) ? splitValueHistory.length : 1);
    });
    // Ensure y for table is below both columns
    y = Math.max(leftYHistory, rightYCentered) + 10;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(15);
    pdf.setTextColor('#0e7490');
    pdf.text('Installments Detail', leftX, y);
    y += 10;
    pdf.setFontSize(12);
    pdf.setTextColor('#222');
    autoTable(pdf, {
      startY: y,
      head: [[
        '#',
        t('amountPaid'),
        t('paymentDate'),
        t('status')
      ]],
      body: installment.payments.map((p, idx) => [
        String(idx + 1),
        `PKR ${p.amountPaid?.toLocaleString?.() || '0'}`,
        String(p.paymentDate || '-'),
        p.status ? t(p.status.toLowerCase()) : '-'
      ]),
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 4 },
      margin: { left: 60, right: 60 },
    });
    drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoImg, appName, language);
    pdf.save(`Buyer History_${String(installment.buyerName || '').replace(/\s/g, '_')}.pdf`);
    setPdfLoading(false);
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
            fontFamily: 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif',
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
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{(() => {
                      const paymentIndex = installment.payments.findIndex(p => p.id === urduReceiptPayment.id);
                      const paidUpToThis = installment.payments.slice(0, paymentIndex + 1);
                      const totalPaidUpToThis = paidUpToThis.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                      const remainingAmountAtThis = installment.totalPayment - (installment.advancePayment || 0) - totalPaidUpToThis;
                      return remainingAmountAtThis <= 0 ? t('closed') : t('open');
                    })()}</td>
                  </tr>
                  <tr>
                    <td style={{ border: '1px solid #06b6d4', padding: 8, fontWeight: 'bold' }}>{t('remainingAmount')}</td>
                    <td style={{ border: '1px solid #06b6d4', padding: 8 }}>{(() => {
                      const paymentIndex = installment.payments.findIndex(p => p.id === urduReceiptPayment.id);
                      const paidUpToThis = installment.payments.slice(0, paymentIndex + 1);
                      const totalPaidUpToThis = paidUpToThis.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                      const remainingAmountAtThis = installment.totalPayment - (installment.advancePayment || 0) - totalPaidUpToThis;
                      return remainingAmountAtThis.toLocaleString();
                    })()}</td>
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
            fontSize: 18,
            borderBottomLeftRadius: 8,
            borderBottomRightRadius: 8
          }}>
            0300-1234567 | muhammadumaru3615@gmail.com | Chungi Stop Darghowala, Lahore
          </div>
        </div>
      )}
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <Button variant="ghost" onClick={() => navigate('/installments')} className="mb-4">&larr; {t('backToAllCommittees')}</Button>
        <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md mb-6">
          <div className="flex items-center mb-4">
            <img src={installment.profilePictureUrl || DEFAULT_PROFILE_PIC} alt={installment.buyerName} className="w-20 h-20 rounded-full object-cover mr-4 border-2 border-primary" />
            <div>
              <h1 className="text-2xl font-bold text-primary mb-1">{installment.buyerName}</h1>
              <div className="space-y-1">
                <div className="flex items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('mobile')}:</span><span className="ml-3">{installment.mobileName}</span></div>
                <div className="flex items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('phone')}:</span><span className="ml-3">{installment.phone}</span></div>
                <div className="flex items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('cnic')}:</span><span className="ml-3">{installment.cnic}</span></div>
                <div className="flex items-center text-sm text-neutral-DEFAULT dark:text-gray-400"><span className="min-w-[90px] font-medium">{t('address')}:</span><span className="ml-3">{installment.address}</span></div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4 mb-2">
            <div>{t('totalPayment')}: <span className="font-semibold">PKR {installment.totalPayment.toLocaleString()}</span></div>
            <div>{t('advancePayment')}: <span className="font-semibold">PKR {installment.advancePayment?.toLocaleString?.() || 0}</span></div>
            <div>{t('monthlyInstallment')}: <span className="font-semibold">PKR {installment.monthlyInstallment.toLocaleString()}</span></div>
            <div>{t('startDate')}: <span className="font-semibold">{installment.startDate}</span></div>
            <div>{t('duration')}: <span className="font-semibold">{installment.duration} {t('months')}</span></div>
          </div>
          <div className="flex gap-4 mt-2">
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