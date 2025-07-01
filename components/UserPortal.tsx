import React, { useState, useRef, useEffect } from 'react';
// @ts-ignore: Importing PNG as a module
import logo from '../assets/logo.png';
import { Button, LoadingSpinner, SunIcon, MoonIcon } from './UIComponents';
import { useAppContext } from '../contexts/AppContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DEFAULT_PROFILE_PIC } from '../constants';
import { FolderIcon, ExclamationTriangleIcon, UserIcon, ClipboardDocumentCheckIcon, BanknotesIcon, CalendarDaysIcon, IdentificationIcon, HomeIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { Theme } from '../types';

// Utility to capitalize first letter and proper word spacing
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

const UserPortal: React.FC = () => {
  const { t, language, committees, installments, members, theme, setTheme } = useAppContext();
  const [step, setStep] = useState<'landing' | 'committee' | 'installment' | 'results'>('landing');
  const [searchType, setSearchType] = useState<'committee' | 'installment' | null>(null);
  const [cnic, setCnic] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const navigate = useNavigate();
  const resultsRef = useRef<HTMLDivElement>(null);
  const [welcomeName, setWelcomeName] = useState<string | null>(null);
  const [lastResults, setLastResults] = useState<any[]>([]);
  const [lastStep, setLastStep] = useState<'landing' | 'committee' | 'installment' | 'results'>('landing');
  const [shouldScrollToResults, setShouldScrollToResults] = useState(false);

  const handleSelect = (type: 'committee' | 'installment') => {
    setSearchType(type);
    if (lastResults.length > 0 && lastStep === type) {
      setResults(lastResults);
      setStep('results');
    } else {
    setStep(type);
    setResults([]);
    }
    setCnic('');
    setSearched(false);
  };

  // CNIC input auto-formatting
  const handleCnicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5 && value.length <= 12) {
      value = value.slice(0, 5) + '-' + value.slice(5);
    } else if (value.length > 12) {
      value = value.slice(0, 5) + '-' + value.slice(5, 12) + '-' + value.slice(12, 13);
    }
    value = value.slice(0, 15);
    setCnic(value);
  };

  const handleSearch = () => {
    if (!cnic.trim()) return;
    setLoading(true);
    setTimeout(() => {
      let found: any[] = [];
      let summaryName = null;
      if (searchType === 'installment') {
        found = installments.filter(i => i.cnic === cnic);
        summaryName = found[0]?.buyerName || null;
      } else if (searchType === 'committee') {
        const member = members.find(m => m.cnic === cnic);
        if (!member) {
          setResults([]);
          setSearched(true);
          setStep('results');
          setLoading(false);
          setWelcomeName(null);
          setLastResults([]);
          setLastStep('results');
          sessionStorage.setItem('userPortalLastResults', JSON.stringify([]));
          sessionStorage.setItem('userPortalLastSearchType', searchType || '');
          return;
        }
        found = committees.filter(c => c.memberIds.includes(member.id)).map(c => ({ committee: c, member }));
        summaryName = member.name;
      }
      setResults(found);
      setWelcomeName(summaryName);
      setSearched(true);
      setStep('results');
      setLoading(false);
      setAlertDismissed(false);
      setLastResults(found);
      setLastStep('results');
      sessionStorage.setItem('userPortalLastResults', JSON.stringify(found));
      sessionStorage.setItem('userPortalLastSearchType', searchType || '');
    }, 600);
  };

  // Auto-scroll to results after search
  useEffect(() => {
    if (step === 'results' && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [step]);

  // When coming back from detail, if lastResults exist, show results and scroll
  useEffect(() => {
    if (shouldScrollToResults && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
      setShouldScrollToResults(false);
    }
  }, [shouldScrollToResults]);

  // When navigating to detail, set a flag in sessionStorage
  const handleNavigateToDetail = (url: string) => {
    sessionStorage.setItem('userPortalScrollToResults', 'true');
    navigate(url);
  };

  // On mount, check if we should scroll to results
  useEffect(() => {
    const lastResults = JSON.parse(sessionStorage.getItem('userPortalLastResults') || '[]');
    const lastSearchType = sessionStorage.getItem('userPortalLastSearchType');
    if (sessionStorage.getItem('userPortalScrollToResults') === 'true') {
      if (lastResults.length > 0) {
        setResults(lastResults);
        setStep('results');
        if (lastSearchType === 'committee' || lastSearchType === 'installment') {
          setSearchType(lastSearchType as 'committee' | 'installment');
        }
      } else {
        setStep('landing');
      }
      setShouldScrollToResults(true);
      sessionStorage.removeItem('userPortalScrollToResults');
    }
  }, []);

  // On mount, clear search history if loaded via browser refresh
  useEffect(() => {
    let navType: any = undefined;
    const navEntries = window.performance.getEntriesByType && window.performance.getEntriesByType('navigation');
    if (navEntries && navEntries.length > 0 && 'type' in navEntries[0]) {
      navType = (navEntries[0] as any).type;
    } else if (window.performance && (window.performance as any).navigation) {
      navType = (window.performance as any).navigation.type;
    }
    if (navType === 'reload' || navType === 1) {
      sessionStorage.removeItem('userPortalLastResults');
      sessionStorage.removeItem('userPortalLastSearchType');
      sessionStorage.removeItem('userPortalScrollToResults');
    }
  }, []);

  // PDF download logic (English only, similar to InstallmentDetailScreen)
  const handleDownloadPdf = async (item: any, member?: any) => {
    setPdfLoading(true);
    if (searchType === 'installment') {
      const installment = item;
      const totalPaid = installment.payments.reduce((sum: number, p: any) => sum + (p.amountPaid || 0), 0);
      const remainingAmount = installment.totalPayment - (installment.advancePayment || 0) - totalPaid;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      doc.setFillColor(6, 182, 212);
      doc.rect(0, 0, pdfWidth, 70, 'F');
      doc.addImage(logo, 'PNG', pdfWidth/2 - 25, 10, 50, 35, '', 'FAST');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor('#fff');
      doc.text("Faisal Mobile's", pdfWidth/2, 55, { align: 'center' });
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
        [t('monthlyInstallment') + ':', `PKR ${installment.monthlyInstallment?.toLocaleString?.() || '0'}`],
        [t('duration') + ':', `${installment.duration ?? '-'} ${t('months')}`],
        [t('status') + ':', remainingAmount <= 0 ? t('closed') : t('open')],
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
      const tableBody = installment.payments.map((p: any, idx: number) => [
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
      doc.save(`receipt_${String(installment.buyerName || '').replace(/\s/g, '_')}.pdf`);
    } else if (searchType === 'committee') {
      const committee = item;
      const memberId = member?.id;
      const memberPayments = committee.payments.filter((p: any) => p.memberId === memberId);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = doc.internal.pageSize.getWidth();
      doc.setFillColor(6, 182, 212);
      doc.rect(0, 0, pdfWidth, 70, 'F');
      doc.addImage(logo, 'PNG', pdfWidth/2 - 25, 10, 50, 35, '', 'FAST');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.setTextColor('#fff');
      doc.text("Faisal Mobile's", pdfWidth/2, 55, { align: 'center' });
      doc.setDrawColor(6, 182, 212);
      doc.setLineWidth(2);
      doc.line(40, 75, pdfWidth - 40, 75);
      let y = 110;
      const infoFields = [
        [t('committeeTitle') + ':', committee.title],
        [t('committeeType') + ':', capitalizeWords(t(committee.type?.toLowerCase()))],
        [t('startDate') + ':', committee.startDate],
        [t('duration') + ':', `${committee.duration} ${t('months')}`],
        [t('amountPerMember') + ':', `PKR ${committee.amountPerMember?.toLocaleString()}`],
        [t('totalMembers') + ':', committee.memberIds?.length],
        [t('memberName') + ':', member?.name],
        [t('cnic') + ':', member?.cnic],
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
      doc.text('Payment History', 60, y);
      y += 20;
      const tableHead = [[ '#', t('month'), t('amountPaid'), t('status'), t('paymentDate') ]];
      const tableBody = memberPayments.map((p: any, idx: number) => [
        String(idx + 1),
        String(p.monthIndex + 1),
        `PKR ${p.amountPaid?.toLocaleString?.() || '0'}`,
        p.status ? capitalizeWords(t(p.status.toLowerCase())) : '-',
        p.paymentDate || '-'
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
      doc.save(`committee_${String(committee.title || '').replace(/\s/g, '_')}_${member?.name || ''}.pdf`);
    }
    setPdfLoading(false);
  };

  // Alerts for due/overdue payments
  const getInstallmentAlerts = (item: any) => {
    const today = new Date();
    const alerts: string[] = [];
    item.payments.forEach((p: any) => {
      const dueDate = new Date(p.paymentDate);
      if (dueDate < today && p.status !== 'Paid') {
        alerts.push(`${capitalizeWords(t('installmentDueAlert'))}: ${p.paymentDate}`);
      }
    });
    return alerts;
  };
  const getCommitteeAlerts = (committee: any, member: any) => {
    const today = new Date();
    const alerts: string[] = [];
    committee.payments.filter((p: any) => p.memberId === member.id).forEach((p: any) => {
      const dueDate = new Date(p.paymentDate);
      if (dueDate < today && p.status !== 'Paid') {
        alerts.push(`${capitalizeWords(t('committeeDueAlert'))}: ${p.paymentDate}`);
      }
    });
    return alerts;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-white dark:from-neutral-darkest dark:to-neutral-dark flex flex-col items-center py-8 px-2 relative">
      {/* Theme Toggle Button */}
      <button
        className="absolute top-4 right-4 p-2 rounded-full bg-cyan-100 dark:bg-neutral-darker shadow hover:bg-cyan-200 dark:hover:bg-neutral-dark transition"
        onClick={() => setTheme(theme === 'dark' ? Theme.LIGHT : Theme.DARK)}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <SunIcon className="w-6 h-6 text-yellow-400" /> : <MoonIcon className="w-6 h-6 text-cyan-700" />}
      </button>
      <div className="w-full max-w-2xl flex flex-col gap-8 mb-8">
        <div className="flex flex-col items-center gap-4 mb-8">
          <img src={logo} alt="Logo" className="w-28 h-28" />
          <h1 className="text-3xl font-bold text-cyan-800 dark:text-cyan-300 tracking-tight">Welcome to User Portal</h1>
          <p className="text-gray-600 dark:text-neutral-200 text-center max-w-md">Check your committee or installment details by searching with your CNIC.</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 justify-center mb-4">
          <Button onClick={() => handleSelect('committee')} className={`flex-1 py-3 text-lg font-semibold rounded-lg shadow bg-cyan-700 text-white hover:bg-cyan-800`}>Search Committee</Button>
          <Button onClick={() => handleSelect('installment')} className={`flex-1 py-3 text-lg font-semibold rounded-lg shadow bg-cyan-700 text-white hover:bg-cyan-800`}>Search Installment</Button>
          </div>
        {(searchType && step !== 'landing') && (
          <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col gap-6">
            <label className="text-gray-700 font-medium mb-1 flex items-center gap-2" htmlFor="cnic-input">
              <IdentificationIcon className="w-5 h-5 text-cyan-600" /> Enter your CNIC
            </label>
            <input
              id="cnic-input"
              type="text"
              value={cnic}
              onChange={handleCnicChange}
              placeholder="xxxxx-xxxxxxx-x"
              className="border border-cyan-300 rounded px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 transition text-black"
              maxLength={15}
              autoFocus
            />
            <Button onClick={handleSearch} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-3 rounded shadow transition disabled:opacity-50" disabled={loading || !cnic.trim()}>
              {loading ? <span className="animate-spin mr-2">🔄</span> : null}
              Search
            </Button>
          </div>
        )}
        {step === 'results' && (
          <div ref={resultsRef} className="bg-white rounded-xl shadow-lg p-8 flex flex-col gap-6 mt-4">
            {welcomeName && (
              <div className="text-center text-2xl font-bold text-cyan-700 mb-2 animate-fadeIn">
                {language === 'ur' ? `خوش آمدید، ${welcomeName}` : `Welcome, ${welcomeName}!`}
              </div>
            )}
            {(welcomeName && results.length > 0) && (
              <div className="text-center text-lg text-gray-700 mb-4">
                {searchType === 'committee'
                  ? (language === 'ur'
                      ? `آپ ${results.length} فعال کمیٹی(وں) میں شامل ہیں۔`
                      : `You are active in ${results.length} committee${results.length !== 1 ? 's' : ''}.`)
                  : (language === 'ur'
                      ? `آپ کی ${results.length} چل رہی قسط(یں) ہیں۔`
                      : `You have ${results.length} running installment${results.length !== 1 ? 's' : ''}.`)
                }
              </div>
            )}
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <span className="text-cyan-600 font-semibold text-xl">{t('loading') || 'Loading...'}</span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <ExclamationTriangleIcon className="w-12 h-12 text-orange-400" />
                <span className="text-gray-500 text-xl font-medium">No Record Found</span>
              </div>
            ) : (
              <>
                {searchType === 'committee' && results.map(({ committee, member }, idx) => (
                  <div key={committee.id} className="border border-cyan-100 rounded-lg shadow p-6 mb-6 flex flex-col gap-4 hover:shadow-lg transition bg-cyan-50">
                    <div className="flex flex-wrap gap-4 mb-2">
                      <StatCard icon={<UserIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('memberName'))} value={capitalizeWords(member.name)} />
                      <StatCard icon={<IdentificationIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('cnic'))} value={member.cnic} />
                      <StatCard icon={<UserIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('committeeTitle'))} value={capitalizeWords(committee.title)} />
                          </div>
                    <div className="flex flex-wrap gap-4 mb-2">
                      <StatCard icon={<CalendarDaysIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('duration'))} value={`${committee.duration} ${capitalizeWords(t('months'))}`} />
                      <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('amountPerMember'))} value={`PKR ${committee.amountPerMember?.toLocaleString()}`} />
                        </div>
                    <Button onClick={() => handleNavigateToDetail(`/user/committee/${committee.id}/${member.id}`)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded shadow transition w-fit mt-2">View Details</Button>
                      </div>
                ))}
                {searchType === 'installment' && results.map((installment, idx) => (
                  <div key={installment.id} className="border border-cyan-100 rounded-lg shadow p-6 mb-6 flex flex-col gap-4 hover:shadow-lg transition bg-cyan-50">
                    <div className="flex flex-wrap gap-4 mb-2">
                      <StatCard icon={<UserIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('buyerName'))} value={capitalizeWords(installment.buyerName)} />
                      <StatCard icon={<PhoneIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('phone'))} value={installment.phone} />
                      <StatCard icon={<IdentificationIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('cnic'))} value={installment.cnic} />
                    </div>
                    <div className="flex flex-wrap gap-4 mb-2">
                      <StatCard icon={<HomeIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('address'))} value={capitalizeWords(installment.address)} />
                      <StatCard icon={<BanknotesIcon className="w-6 h-6 text-cyan-700" />} label={capitalizeWords(t('totalPayment'))} value={`PKR ${installment.totalPayment.toLocaleString()}`} />
                    </div>
                    <Button onClick={() => handleNavigateToDetail(`/user/installment/${installment.id}`)} className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-4 py-2 rounded shadow transition w-fit mt-2">View Details</Button>
              </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      <footer className="w-full text-center text-gray-400 text-xs py-4 border-t mt-auto">&copy; {new Date().getFullYear()} Faisal Mobiles. All rights reserved.</footer>
    </div>
  );
};

export default UserPortal; 