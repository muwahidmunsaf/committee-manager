import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Button, SunIcon, MoonIcon } from './UIComponents';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
// @ts-ignore: Importing PNG as a module
import logo from '../assets/logo.png';
import { UserGroupIcon, CalendarDaysIcon, BanknotesIcon, IdentificationIcon, UserIcon, ClipboardDocumentCheckIcon, PhoneIcon, HomeIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { DEFAULT_PROFILE_PIC } from '../constants';
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const UserCommitteeDetail: React.FC = () => {
  const { committeeId, memberId } = useParams<{ committeeId: string; memberId: string }>();
  const { committees, members, t, theme, setTheme } = useAppContext();
  const navigate = useNavigate();

  // All hooks at the top
  useEffect(() => {
    const lastResults = sessionStorage.getItem('userPortalLastResults');
    const lastSearchType = sessionStorage.getItem('userPortalLastSearchType');
    if ((!lastResults || !lastSearchType) && (document.referrer === '' || (window.performance && (performance as any).navigation && (performance as any).navigation.type === 1))) {
      sessionStorage.removeItem('userPortalLastResults');
      sessionStorage.removeItem('userPortalLastSearchType');
      sessionStorage.removeItem('userPortalScrollToResults');
      navigate('/user', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Now do your logic
  const committee = committees.find(c => c.id === committeeId);
  const member = members.find(m => m.id === memberId);

  // Only after all hooks, do conditional rendering
  if (!committee || !member) return <div className="p-8 text-center text-red-500">{t('noCommitteesFound')}</div>;
  const memberPayments = committee.payments.filter((p: any) => p.memberId === member.id);
  const totalPaid = memberPayments.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);
  const remainingAmount = committee.amountPerMember * (committee.duration || 1) - totalPaid;
  const duePayment = memberPayments.find((p: any) => p.status !== 'Cleared');
  const hasDue = !!duePayment;
  const dueDate = duePayment?.paymentDate;
  const payoutHistory = committee.payoutTurns?.filter((pt: any) => String(pt.memberId) === String(member.id) && pt.paidOut === true);
  const startDate = committee.startDate;
  const endDate = (() => {
    const d = new Date(committee.startDate);
    d.setMonth(d.getMonth() + (committee.duration || 0));
    return d.toISOString();
  })();
  const remainingCommittees = (committee.duration || 0) - memberPayments.filter((p: any) => p.status === 'Cleared').length;

  const currentMonthDue = memberPayments.find((p: any) => {
    const now = new Date();
    const payDate = new Date(p.paymentDate);
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear() && p.status !== 'Cleared';
  });

  const now = new Date();
  const currentMonthPayment = memberPayments.find((p: any) => {
    const payDate = new Date(p.paymentDate);
    return payDate.getMonth() === now.getMonth() && payDate.getFullYear() === now.getFullYear();
  });

  // Calculate member's share count
  const memberShareCount = committee.memberIds.filter((id: string) => id === member.id).length;

  // Calculate total amount and remaining amount for this user (declare only once)
  const totalAmount = memberShareCount * (committee.duration || 1) * committee.amountPerMember;
  const remainingUserAmount = totalAmount - totalPaid;
  const progress = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  // For each month, sum payments for that month (if multiple shares, sum all payments for that month)
  const paymentsByMonth: { [key: string]: any[] } = {};
  memberPayments.forEach((p: any) => {
    const month = new Date(p.paymentDate).toISOString().slice(0, 7); // 'YYYY-MM'
    if (!paymentsByMonth[month]) paymentsByMonth[month] = [];
    paymentsByMonth[month].push(p);
  });

  // In the stat cards section, add share info
  <StatCard icon={<UserIcon className="w-6 h-6 text-cyan-700" />} label="Shares" value={memberShareCount} />

  // In the alert logic, for current month, sum all payments and only show alert if total < shares * amountPerMember and payout not done
  const nowMonth = new Date().toISOString().slice(0, 7);
  const currentMonthPayments = paymentsByMonth[nowMonth] || [];
  const currentMonthTotalPaid = currentMonthPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
  const currentMonthPayoutDone = (committee.payoutTurns || []).some((pt: any) => pt.memberId === member.id && pt.paid && new Date(pt.payoutDate).toISOString().slice(0, 7) === nowMonth);
  const isCurrentMonthUncleared = currentMonthTotalPaid < memberShareCount * committee.amountPerMember && !currentMonthPayoutDone;

  const handleDownloadPdf = async () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pdfWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(6, 182, 212);
    doc.rect(0, 0, pdfWidth, 70, 'F');
    doc.addImage(logo, 'PNG', pdfWidth/2 - 60, 10, 40, 35, '', 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor('#fff');
    doc.text("Faisal Mobile's", pdfWidth/2 + 10, 35, { align: 'left' });
    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(2);
    doc.line(40, 75, pdfWidth - 40, 75);
    let y = 110;
    const infoFields = [
      ['Committee Title:', committee.title],
      ['Committee Type:', capitalizeWords(committee.type?.toLowerCase())],
      ['Start Date:', formatDate(committee.startDate)],
      ['End Date:', formatDate(endDate)],
      ['Duration:', `${committee.duration}`],
      ['Amount per Member:', `PKR ${committee.amountPerMember?.toLocaleString()}`],
      ['Total Members:', committee.memberIds?.length],
      ['Member Name:', member?.name],
      ['CNIC:', member?.cnic],
      ['Remaining Committees:', remainingCommittees],
      ['Remaining Amount:', `PKR ${remainingAmount > 0 ? remainingAmount.toLocaleString() : 0}`],
    ];
    infoFields.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor('#222');
      doc.text(capitalizeWords(String(label ?? '')), 60, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(value ?? '-'), 200 + 6, y);
      y += 20;
    });
    y += 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor('#0e7490');
    doc.text('Payment History', 60, y);
    y += 20;
    const tableHead = [[ '#', 'Month', 'Amount Paid', 'Status', 'Date', 'Remaining' ]];
    const tableBody = Object.entries(paymentsByMonth).map(([month, payments], idx) => {
      const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const required = memberShareCount * committee.amountPerMember;
      const status = totalPaid >= required ? 'Cleared' : 'Uncleared';
      const remaining = Math.max(0, required - totalPaid);
      return [
        String(idx + 1),
        getMonthName(payments[0].paymentDate),
        `PKR ${totalPaid.toLocaleString()}`,
        status,
        formatDate(payments[0].paymentDate),
        `PKR ${remaining.toLocaleString()}`
      ];
    });
    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 0, fontStyle: 'bold' },
      styles: { fontSize: 11, cellPadding: 4, font: undefined, halign: 'left', textColor: 0 },
      margin: { left: 40, right: 40, top: 120, bottom: 60 },
    });
    // Add footer
    doc.setFontSize(10);
    doc.setTextColor('#888');
    doc.text('Generated by Faisal Mobiles Committee System', pdfWidth/2, doc.internal.pageSize.getHeight() - 30, { align: 'center' });
    doc.save(`committee_${String(committee.title || '').replace(/\s/g, '_')}_${member?.name || ''}.pdf`);
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
      {isCurrentMonthUncleared && (
        <div className="flex items-center gap-2 bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-4 rounded shadow text-sm md:text-base w-full max-w-2xl mb-4">
          <ExclamationTriangleIcon className="w-6 h-6" />
          <span>Attention: Your payment for this month is pending or incomplete!</span>
        </div>
      )}
      <div className="w-full max-w-2xl flex flex-col gap-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex justify-center md:block">
            <img
              src={member.profilePictureUrl || DEFAULT_PROFILE_PIC}
              alt={member.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-cyan-500 shadow mb-2 md:mb-0 cursor-pointer"
              onClick={() => setIsImageModalOpen(true)}
            />
          </div>
          <div className="flex-1 flex flex-wrap gap-4 min-w-[250px]">
            <StatCard icon={<UserIcon className="w-6 h-6 text-cyan-700" />} label="Name" value={capitalizeWords(member.name)} />
            <StatCard icon={<PhoneIcon className="w-6 h-6 text-cyan-700" />} label="Phone" value={member.phone || '-'} />
            <StatCard icon={<IdentificationIcon className="w-6 h-6 text-cyan-700" />} label="CNIC" value={member.cnic} />
            <StatCard icon={<HomeIcon className="w-6 h-6 text-cyan-700" />} label="Address" value={member.address || '-'} />
            <StatCard icon={<UserIcon className="w-6 h-6 text-cyan-700" />} label="Shares" value={memberShareCount} />
            <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label="Total Amount" value={`PKR ${totalAmount.toLocaleString()}`} />
            <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label="Remaining Amount" value={`PKR ${remainingUserAmount.toLocaleString()}`} />
            {(() => {
              const now = new Date();
              const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });
              const currentMonthKey = now.toISOString().slice(0, 7);
              const currentMonthPayments = paymentsByMonth[currentMonthKey] || [];
              const currentMonthTotalPaid = currentMonthPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
              const currentMonthTotalDue = memberShareCount * committee.amountPerMember;
              const currentMonthRemaining = Math.max(0, currentMonthTotalDue - currentMonthTotalPaid);
              return [
                <StatCard key="month-total" icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label={`Total for ${monthLabel}`} value={`PKR ${currentMonthTotalDue.toLocaleString()}`} />,
                <StatCard key="month-remaining" icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label={`Remaining for ${monthLabel}`} value={`PKR ${currentMonthRemaining.toLocaleString()}`} />
              ];
            })()}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 min-w-[250px]">
          <StatCard icon={<UserGroupIcon className="w-6 h-6 text-cyan-700" />} label="Committee" value={capitalizeWords(committee.title || '')} />
          <StatCard icon={<CalendarDaysIcon className="w-6 h-6 text-cyan-700" />} label="Start Date" value={formatDate(startDate || '')} />
          <StatCard icon={<CalendarDaysIcon className="w-6 h-6 text-cyan-700" />} label="End Date" value={formatDate(endDate || '')} />
          <StatCard icon={<CalendarDaysIcon className="w-6 h-6 text-cyan-700" />} label="Duration" value={`${committee.duration} Months`} />
          <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label="Amount/Member" value={`PKR ${committee.amountPerMember?.toLocaleString()}`} />
          <StatCard icon={<ClipboardDocumentCheckIcon className="w-6 h-6 text-cyan-700" />} label="Total Paid" value={`PKR ${totalPaid.toLocaleString()}`} />
          <StatCard icon={<ClipboardDocumentCheckIcon className="w-6 h-6 text-cyan-700" />} label="Remaining Committees" value={remainingCommittees} />
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
        {currentMonthDue && (
          <div className="flex items-center gap-2 bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-4 rounded shadow">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <span>Please pay your committee for this month.</span>
          </div>
        )}
        {hasDue && (
          <div className="flex items-center gap-2 bg-orange-100 border-l-4 border-orange-400 text-orange-700 p-4 rounded shadow">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <span>Payment due! Please pay your committee installment by <b>{formatDate(dueDate || '')}</b>.</span>
          </div>
        )}
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl mb-6 overflow-x-auto">
        <h2 className="text-xl font-semibold text-cyan-800 flex items-center gap-2 mb-4">
          <BanknotesIcon className="w-6 h-6 text-cyan-600" /> Payment History
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-cyan-50">
              <tr>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">#</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Month</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Amount Paid</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Status</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Date</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Remaining</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Receipt</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {Object.entries(paymentsByMonth).map(([month, payments], idx) => {
                const totalPaid = payments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
                const required = memberShareCount * committee.amountPerMember;
                const status = totalPaid >= required ? 'Cleared' : 'Uncleared';
                const remaining = Math.max(0, required - totalPaid);
                return (
                  <tr key={month} className="hover:bg-cyan-50 transition">
                    <td className="px-4 py-2 text-center font-semibold text-cyan-900">{idx + 1}</td>
                    <td className="px-4 py-2 text-center text-black">{getMonthName(payments[0].paymentDate)}</td>
                    <td className="px-4 py-2 text-center text-cyan-800 font-semibold">PKR {totalPaid.toLocaleString()}</td>
                    <td className={`px-4 py-2 text-center font-semibold ${status === 'Cleared' ? 'text-green-600' : 'text-orange-500'}`}>{status}</td>
                    <td className="px-4 py-2 text-center text-black">{formatDate(payments[0].paymentDate)}</td>
                    <td className="px-4 py-2 text-center text-cyan-800 font-semibold">PKR {remaining.toLocaleString()}</td>
                    <td className="px-4 py-2 text-center">
                      <Button size="sm" variant="ghost" onClick={() => handleDownloadPdf()} className="text-cyan-700 hover:bg-cyan-100">PDF</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-2xl mb-6 overflow-x-auto">
        <h2 className="text-xl font-semibold text-cyan-800 flex items-center gap-2 mb-4">
          <ClipboardDocumentCheckIcon className="w-6 h-6 text-cyan-600" /> Payout History
        </h2>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-cyan-50">
              <tr>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center">#</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Month</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Amount</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Status</th>
                <th className="px-4 py-2 text-xs font-bold text-cyan-700 uppercase tracking-wider text-center text-black">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {payoutHistory && payoutHistory.length > 0 ? (
                payoutHistory.map((pt: any, idx: number) => (
                  <tr key={idx} className="hover:bg-cyan-50 transition">
                    <td className="px-4 py-2 text-center font-semibold text-cyan-900">{idx + 1}</td>
                    <td className="px-4 py-2 text-center text-black">{getMonthName(String(pt.payoutDate || ''))}</td>
                    <td className="px-4 py-2 text-center text-cyan-800 font-semibold">{(committee.amountPerMember * committee.memberIds.length).toLocaleString()}</td>
                    <td className="px-4 py-2 text-center text-green-600 font-semibold">Paid</td>
                    <td className="px-4 py-2 text-center text-black">{formatDate(String(pt.payoutDate || ''))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-gray-400">No payouts yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Image Preview Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={() => setIsImageModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <img
              src={member.profilePictureUrl || DEFAULT_PROFILE_PIC}
              alt={member.name}
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

export default UserCommitteeDetail;