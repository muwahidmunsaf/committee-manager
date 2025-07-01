import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Button, SunIcon, MoonIcon } from './UIComponents';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore: Importing PNG as a module
import logo from '../assets/logo.png';
import { DEFAULT_PROFILE_PIC } from '../constants';
import { UserIcon, PhoneIcon, IdentificationIcon, HomeIcon, BanknotesIcon, CalendarDaysIcon, ClipboardDocumentCheckIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { Theme } from '../types';

const capitalizeWords = (str: string) => str.replace(/\b\w/g, c => c.toUpperCase()).replace(/_/g, ' ');

const StatCard = ({ icon, label, value, className = '' }: { icon: React.ReactNode; label: string; value: React.ReactNode; className?: string }) => (
  <div className={`flex items-center gap-3 bg-cyan-50 rounded-lg shadow p-4 flex-1 min-w-[140px] ${className}`}>
    <div className="bg-cyan-200 p-2 rounded-full">{icon}</div>
    <div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className="text-lg font-bold text-cyan-900">{value}</div>
    </div>
  </div>
);

const getMonthName = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const UserInstallmentDetail: React.FC = () => {
  const { installmentId } = useParams<{ installmentId: string }>();
  const { installments, t, theme, setTheme } = useAppContext();
  const navigate = useNavigate();
  const installment = installments.find(i => i.id === installmentId);

  // Redirect to /user if data is missing (after refresh or direct URL)
  useEffect(() => {
    if (!installment) {
      navigate('/user', { replace: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [installment, navigate]);

  if (!installment) return <div className="p-8 text-center text-red-500">{t('noInstallmentsFound')}</div>;
  const totalPaid = installment.payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const remainingAmount = installment.totalPayment - (installment.advancePayment || 0) - totalPaid;
  const isClosed = remainingAmount <= 0;
  const progress = installment.totalPayment > 0 ? Math.round(((installment.advancePayment || 0) + totalPaid) / installment.totalPayment * 100) : 0;
  const duePayment = installment.payments.find((p: any) => p.status !== 'Paid');
  const hasDue = !!duePayment;
  const dueDate = duePayment?.paymentDate;

  // Find current month unpaid installment
  const now = new Date();
  const currentMonthUnpaid = installment.payments.find((p: any) => {
    const payDate = new Date(p.paymentDate);
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear() && p.status !== 'Paid';
  });

  const currentMonthPayment = installment.payments.find((p: any) => {
    const payDate = new Date(p.paymentDate);
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
  });

  // For current month, sum all payments and only show alert if total < monthlyInstallment
  const nowMonth = new Date().toISOString().slice(0, 7);
  const paymentsByMonth: { [key: string]: any[] } = {};
  installment.payments.forEach((p: any) => {
    const month = new Date(p.paymentDate).toISOString().slice(0, 7);
    if (!paymentsByMonth[month]) paymentsByMonth[month] = [];
    paymentsByMonth[month].push(p);
  });
  const currentMonthPayments = paymentsByMonth[nowMonth] || [];
  const currentMonthTotalPaid = currentMonthPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const isCurrentMonthUncleared = currentMonthTotalPaid < installment.monthlyInstallment;

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(6, 182, 212);
    doc.rect(0, 0, pdfWidth, 70, 'F');
    doc.addImage(logo, 'PNG', pdfWidth/2 - 40, 10, 40, 35, '', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor('#fff');
    doc.text("Faisal Mobile's", pdfWidth/2 + 10, 35, { align: 'left' });
    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(2);
    doc.line(40, 75, pdfWidth - 40, 75);
    let y = 110;
    const infoFields = [
      [t('buyerName') + ':', installment.buyerName],
      [t('phone') + ':', installment.phone],
      [t('cnic') + ':', installment.cnic],
      [t('mobileName') + ':', installment.mobileName],
      [t('address') + ':', installment.address],
      [t('totalPayment') + ':', `PKR ${installment.totalPayment?.toLocaleString?.() || '0'}`],
      [t('advancePayment') + ':', `PKR ${(installment.advancePayment || 0).toLocaleString()}`],
      ['Monthly Installment:', `PKR ${installment.monthlyInstallment?.toLocaleString?.() || '0'}`],
      ['Duration:', `${installment.duration ?? '-'}`],
      [t('status') + ':', isClosed ? t('closed') : t('open')],
      [t('totalCollected') + ':', `PKR ${totalPaid?.toLocaleString?.() || '0'}`],
      [t('remainingAmount') + ':', `PKR ${remainingAmount?.toLocaleString?.() || '0'}`],
    ];
    infoFields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor('#222');
      doc.text(capitalizeWords(String(label ?? '')), 60, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value ?? '-'), 200, y);
      y += 20;
    });
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor('#0e7490');
    doc.text('Installments Detail', 60, y);
    y += 20;
    const tableHead = [[ '#', t('amountPaid'), t('paymentDate'), t('status') ]];
    const tableBody = installment.payments.map((p, idx) => [
      String(idx + 1),
      `PKR ${p.amountPaid?.toLocaleString?.() || '0'}`,
      String(p.paymentDate || '-'),
      p.status ? capitalizeWords(t(p.status.toLowerCase())) : '-'
    ]);
    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 4, font: undefined, halign: 'left' },
      margin: { left: 40, right: 40, top: 120, bottom: 60 },
    });
    // Add footer
    doc.setFontSize(10);
    doc.setTextColor('#888');
    doc.text('Generated by Faisal Mobiles Installment System', pdfWidth/2, doc.internal.pageSize.getHeight() - 30, { align: 'center' });
    doc.save(`receipt_${String(installment.buyerName || '').replace(/\s/g, '_')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-white dark:from-neutral-darkest dark:to-neutral-dark flex flex-col items-center py-8 px-2 md:px-0 relative">
      {/* Theme Toggle Button */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-cyan-100 dark:bg-neutral-darker shadow hover:bg-cyan-200 dark:hover:bg-neutral-dark transition"
        onClick={() => setTheme(theme === 'dark' ? Theme.LIGHT : Theme.DARK)}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-cyan-700" />}
      </button>
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-cyan-700 hover:bg-cyan-100 w-full max-w-xs md:max-w-none">
        <span className="text-xl">&larr;</span> Back to Portal
      </Button>
      {/* Only show alert if account is not closed */}
      {isCurrentMonthUncleared && !isClosed && (
        <div className="flex items-center gap-2 bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-4 rounded shadow text-sm md:text-base w-full max-w-2xl mb-4">
          <ExclamationCircleIcon className="w-6 h-6" />
          <span>Attention: Your installment for this month is pending or incomplete!</span>
        </div>
      )}
      <div className="w-full max-w-2xl flex flex-col gap-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex justify-center md:block">
            <img
              src={installment.profilePictureUrl || DEFAULT_PROFILE_PIC}
              alt={installment.buyerName}
              className="w-20 h-20 rounded-full object-cover border-2 border-cyan-500 shadow mb-2 md:mb-0 cursor-pointer"
              onClick={() => setIsImageModalOpen(true)}
            />
          </div>
          <div className="flex-1 flex flex-wrap gap-4">
            <StatCard icon={<UserIcon className="w-6 h-6 text-cyan-700" />} label="Buyer Name" value={capitalizeWords(installment.buyerName)} />
            <StatCard icon={<PhoneIcon className="w-6 h-6 text-cyan-700" />} label="Phone" value={installment.phone} />
            <StatCard icon={<IdentificationIcon className="w-6 h-6 text-cyan-700" />} label="CNIC" value={installment.cnic} />
            <StatCard icon={<HomeIcon className="w-6 h-6 text-cyan-700" />} label="Address" value={capitalizeWords(installment.address)} />
            <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label="Mobile Name" value={capitalizeWords(installment.mobileName)} />
            <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label="Advance Payment" value={`PKR ${(installment.advancePayment || 0).toLocaleString()}`} />
            <StatCard icon={isClosed ? <CheckCircleIcon className="w-6 h-6 text-red-600" /> : <ExclamationCircleIcon className="w-6 h-6 text-green-600" />} label="Account Status" value={<span className={`font-bold ${isClosed ? 'text-red-600' : 'text-green-600'}`}>{isClosed ? 'Closed' : 'Open'}</span>} />
        </div>
      </div>
        <div className="flex flex-wrap gap-4">
          <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label="Total Payment" value={`PKR ${installment.totalPayment.toLocaleString()}`} />
          <StatCard icon={<ClipboardDocumentCheckIcon className="w-6 h-6 text-cyan-700" />} label="Total Collected" value={`PKR ${totalPaid.toLocaleString()}`} />
          <StatCard icon={<ClipboardDocumentCheckIcon className="w-6 h-6 text-cyan-700" />} label="Remaining" value={`PKR ${remainingAmount.toLocaleString()}`} />
        </div>
        <div className="w-full bg-gray-100 rounded-lg p-4 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-medium text-gray-700">Progress</span>
            <span className="font-semibold text-cyan-700">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-cyan-100 rounded">
            <div className="h-3 rounded bg-cyan-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        {/* Only show due alert if account is not closed */}
        {hasDue && !isClosed && (
          <div className="flex items-center gap-2 bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-4 rounded shadow">
            <ExclamationCircleIcon className="w-6 h-6" />
            <span>Installment due! Please pay your installment by <b>{dueDate}</b>.</span>
          </div>
        )}
        {currentMonthUnpaid && (
          <div className="flex items-center gap-2 bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-4 rounded shadow">
            <ExclamationCircleIcon className="w-6 h-6" />
            <span>Your installment for this month is unpaid. Please pay as soon as possible.</span>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl mb-6 overflow-x-auto">
        <h2 className="text-xl font-semibold text-cyan-800 flex items-center gap-2 mb-4">
          <BanknotesIcon className="w-6 h-6 text-cyan-600" /> Payments
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-cyan-50">
              <tr>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">#</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">Month</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">Amount Paid</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">Status</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">Date</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {installment.payments.map((p, idx) => (
                <tr key={p.id} className="hover:bg-cyan-50 transition">
                  <td className="px-4 py-2 text-center font-semibold text-cyan-900">{idx + 1}</td>
                  <td className="px-4 py-2 text-center text-black">{getMonthName(p.paymentDate)}</td>
                  <td className="px-4 py-2 text-center text-cyan-800 font-semibold">PKR {p.amountPaid.toLocaleString()}</td>
                  <td className={`px-4 py-2 text-center font-semibold ${p.status === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>{capitalizeWords(p.status)}</td>
                  <td className="px-4 py-2 text-center text-black">{p.paymentDate}</td>
                  <td className="px-4 py-2 text-center">
                    <Button size="sm" variant="ghost" onClick={handleDownloadPdf} className="text-cyan-700 hover:bg-cyan-100">PDF</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Image Preview Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setIsImageModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={installment.profilePictureUrl || DEFAULT_PROFILE_PIC}
              alt={installment.buyerName}
              className="max-w-xs max-h-[70vh] rounded-lg border-2 border-cyan-500 shadow-lg"
            />
            <button
              className="mt-4 px-6 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition"
              onClick={() => setIsImageModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserInstallmentDetail; 