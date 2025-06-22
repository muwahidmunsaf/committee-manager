import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Committee, Member, Language, CommitteeType } from '../types';
import { calculateTotalPool, getMemberName, formatDate, getCommitteeMonthName, getCurrentPeriodIndex, calculateRemainingCollectionForPeriod } from '../utils/appUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { ChartPieIcon, UserGroupIcon, DocumentTextIcon, WalletIcon, CalendarDaysIcon, HomeIcon, CreditCardIcon, ClockIcon, StarIcon, HeartIcon, TrophyIcon, GiftIcon, FireIcon, RocketLaunchIcon, AcademicCapIcon, BuildingOfficeIcon, HandRaisedIcon, LightBulbIcon, PuzzlePieceIcon, SparklesIcon2, ChartBarIcon, FolderIcon, BellIcon, ShieldCheckIcon, GlobeAltIcon, PaintBrushIcon } from './UIComponents';
import { ClipboardDocumentCheckIcon, CheckCircleIcon, BanknotesIcon, ArrowTrendingUpIcon, ExclamationCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

const DashboardScreen: React.FC = () => {
  const { t, committees, members, language } = useAppContext();

  const activeCommittees = committees.filter(c => {
    const sDate = new Date(c.startDate);
    const today = new Date();
    if (sDate > today) return false; // Not started yet

    const endDate = new Date(sDate);
    // Adjust end date based on committee type and duration
    switch (c.type) {
        case CommitteeType.MONTHLY:
            endDate.setMonth(sDate.getMonth() + c.duration);
            break;
        case CommitteeType.WEEKLY:
            endDate.setDate(sDate.getDate() + c.duration * 7);
            break;
        case CommitteeType.DAILY:
            endDate.setDate(sDate.getDate() + c.duration);
            break;
        default: // Default to monthly if type is somehow undefined
            endDate.setMonth(sDate.getMonth() + c.duration);
            break;
    }
    return endDate > today; // Active if end date is in the future
  });
  const completedCommitteesCount = committees.length - activeCommittees.length;

  // Calculate total collected and expected pool for all committees
  const totalExpectedPool = committees.reduce((sum, committee) => {
    return sum + (committee.amountPerMember * committee.memberIds.length * committee.duration);
  }, 0);

  const totalCollectedOverall = committees.reduce((sum, committee) => {
    return sum + committee.payments.filter(p => p.status === 'Cleared').reduce((committeeSum, payment) => committeeSum + payment.amountPaid, 0);
  }, 0);

  // Calculate remaining collection for all active committees (all periods)
  const remainingCollectionOverall = committees.reduce((sum, committee) => {
    const expected = committee.amountPerMember * committee.memberIds.length * committee.duration;
    const collected = committee.payments.filter(p => p.status === 'Cleared').reduce((committeeSum, payment) => committeeSum + payment.amountPaid, 0);
    return sum + Math.max(expected - collected, 0);
  }, 0);

  // Data for charts (show full pool and collected for each active committee)
  const committeePoolData = activeCommittees.map(c => ({
    name: c.title.substring(0, 15) + (c.title.length > 15 ? '...' : ''),
    [t('totalPool')]: c.memberIds.length * c.amountPerMember * c.duration, // Full pool for all periods
    [t('totalCollected')]: c.payments.filter(p => p.status === 'Cleared').reduce((s, p) => s + p.amountPaid, 0), // Only cleared payments
  })).slice(0, 7);

  const memberContributionData = members.map(member => {
    let totalContributed = 0;
    committees.forEach(committee => {
      if (committee.memberIds.includes(member.id)) {
        committee.payments.filter(p => p.memberId === member.id).forEach(p => totalContributed += p.amountPaid);
      }
    });
    return { name: member.name, [t('totalCollected')]: totalContributed };
  }).filter(m => (m[t('totalCollected')] as number) > 0)
    .sort((a, b) => (b[t('totalCollected')] as number) - (a[t('totalCollected')] as number)) 
    .slice(0, 5); 

  const COLORS = ['#06b6d4', '#facc15', '#34d399', '#fb923c', '#818cf8', '#f87171', '#a78bfa'];

  // Add a helper for progress bar
  const ProgressBar = ({ percent }: { percent: number }) => (
    <div className="w-full h-2 bg-gray-200 dark:bg-neutral-dark rounded mt-1">
      <div className="h-2 rounded bg-green-500" style={{ width: `${percent}%` }}></div>
    </div>
  );

  // In the BarChart, add a custom tooltip that shows the progress bar
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const totalPool = payload.find((e: any) => e.name === t('totalPool'))?.value || 0;
      const totalCollected = payload.find((e: any) => e.name === t('totalCollected'))?.value || 0;
      const percent = totalPool > 0 ? Math.round((totalCollected / totalPool) * 100) : 0;
      return (
        <div className="bg-white dark:bg-neutral-darker p-3 border border-gray-300 dark:border-gray-700 rounded shadow-lg">
          <p className="font-semibold text-neutral-darker dark:text-neutral-light">{label}</p>
          {payload.map((entry: any, index: number) => (
             <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
                {`${entry.name}: PKR ${entry.value.toLocaleString()}`}
             </p>
          ))}
          <div className="mt-2">
            <span className="text-xs text-gray-500">Progress:</span>
            <ProgressBar percent={percent} />
            <span className="text-xs text-gray-500">{percent}% collected</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for PieChart - shows member contribution details without progress bar
  const PieChartTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const memberName = data.name;
      const memberContribution = data.value;
      
      // Find the member to get their total expected amount
      const member = members.find(m => m.name === memberName);
      let totalExpected = 0;
      let totalPaid = memberContribution;
      
      if (member) {
        // Calculate total expected amount for this member across all committees
        committees.forEach(committee => {
          if (committee.memberIds.includes(member.id)) {
            // Count how many shares this member has in this committee
            const memberShares = committee.memberIds.filter(id => id === member.id).length;
            // Total expected for this committee
            const committeeExpected = committee.amountPerMember * memberShares * committee.duration;
            totalExpected += committeeExpected;
          }
        });
      }
      
      const paymentProgress = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
      
      return (
        <div className="bg-white dark:bg-neutral-darker p-3 border border-gray-300 dark:border-gray-700 rounded shadow-lg">
          <p className="font-semibold text-neutral-darker dark:text-neutral-light">{memberName}</p>
          <p style={{ color: data.color }} className="text-sm">
            {`Paid: PKR ${totalPaid.toLocaleString()}`}
          </p>
          <p className="text-xs text-gray-500">
            {`Expected: PKR ${totalExpected.toLocaleString()}`}
          </p>
          <div className="mt-2">
            <span className="text-xs text-gray-500">Payment Progress:</span>
            <div className="w-full h-2 bg-gray-200 dark:bg-neutral-dark rounded mt-1">
              <div 
                className="h-2 rounded bg-green-500" 
                style={{ width: `${Math.min(paymentProgress, 100)}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-500">{paymentProgress}% paid</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const upcomingPayoutsList = activeCommittees.flatMap(c => 
    c.payoutTurns
      .filter(pt => !pt.paidOut)
      .map(pt => ({
        ...pt, 
        committeeTitle: c.title, 
        committeeId: c.id, 
        amount: c.amountPerMember * c.memberIds.length,
        committeeStartDate: c.startDate, 
      }))
  ).sort((a,b) => { 
      const dateA = new Date(new Date(a.committeeStartDate).setMonth(new Date(a.committeeStartDate).getMonth() + a.turnMonthIndex));
      const dateB = new Date(new Date(b.committeeStartDate).setMonth(new Date(b.committeeStartDate).getMonth() + b.turnMonthIndex));
      return dateA.getTime() - dateB.getTime();
  }).slice(0, 5); 

  // Helper to get initials from a name
  function getInitials(name: string) {
    return name
      .split(' ')
      .map(word => word[0]?.toUpperCase() || '')
      .join('');
  }

  // Custom label renderer for PieChart
  const renderPieLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
    const RADIAN = Math.PI / 180;
    // Position label inside the slice
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    // Show initials if name is too long
    const displayName = name.length > 12 ? getInitials(name) : name;
    return (
      <text x={x} y={y} fill="#222" textAnchor="middle" dominantBaseline="central" fontSize={12} style={{ pointerEvents: 'none' }}>
        {displayName} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  // Helper for info tooltip
  const InfoTooltip = ({ text }: { text: string }) => (
    <span className="relative group inline-block align-middle ml-1">
      <InformationCircleIcon className="w-4 h-4 text-gray-400 inline cursor-pointer" />
      <span className="absolute z-10 hidden group-hover:block bg-white dark:bg-neutral-darker text-xs text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap shadow-lg">
        {text}
      </span>
    </span>
  );

  // Compute recent activity (latest 5 payments and payouts)
  const recentPayments = committees.flatMap(c => c.payments.map(p => ({
    type: 'Payment',
    committeeTitle: c.title,
    memberId: p.memberId,
    amount: p.amountPaid,
    date: p.paymentDate,
    status: p.status,
  }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const recentPayouts = committees.flatMap(c => c.payoutTurns.filter(pt => pt.paidOut && pt.payoutDate).map(pt => ({
    type: 'Payout',
    committeeTitle: c.title,
    memberId: pt.memberId,
    amount: c.amountPerMember * c.memberIds.length,
    date: pt.payoutDate!,
    status: 'Paid',
  }))).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  const recentActivity = [...recentPayments, ...recentPayouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Compute overdue payments (for current period)
  const overduePayments = activeCommittees.flatMap(committee => {
    const currentPeriod = getCurrentPeriodIndex(committee);
    if (currentPeriod < 0 || currentPeriod >= committee.duration) return [];
    return committee.memberIds.filter(memberId => {
      const paid = committee.payments.some(p => p.memberId === memberId && p.monthIndex === currentPeriod && p.status === 'Cleared');
      return !paid;
    }).map(memberId => ({
      committeeTitle: committee.title,
      memberId,
      period: currentPeriod,
    }));
  });

  // Compute upcoming payouts (next 7 days)
  const now = new Date();
  const upcomingPayoutsSoon = activeCommittees.flatMap(committee =>
    committee.payoutTurns.filter(pt => !pt.paidOut).map(pt => {
      const payoutDate = new Date(new Date(committee.startDate).setMonth(new Date(committee.startDate).getMonth() + pt.turnMonthIndex));
      return {
        committeeTitle: committee.title,
        memberId: pt.memberId,
        payoutDate,
        daysUntil: Math.ceil((payoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      };
    }).filter(pt => pt.daysUntil >= 0 && pt.daysUntil <= 7)
  );

  // Calculate amount collected and remaining in current month (all committees)
  const currentMonthCollected = activeCommittees.reduce((sum, committee) => {
    const currentPeriod = getCurrentPeriodIndex(committee);
    if (currentPeriod < 0 || currentPeriod >= committee.duration) return sum;
    // Sum cleared payments for this period
    return sum + committee.payments.filter(p => p.monthIndex === currentPeriod && p.status === 'Cleared').reduce((s, p) => s + p.amountPaid, 0);
  }, 0);

  const currentMonthExpected = activeCommittees.reduce((sum, committee) => {
    const currentPeriod = getCurrentPeriodIndex(committee);
    if (currentPeriod < 0 || currentPeriod >= committee.duration) return sum;
    return sum + (committee.amountPerMember * committee.memberIds.length);
  }, 0);

  const currentMonthRemaining = Math.max(currentMonthExpected - currentMonthCollected, 0);

  const [showAlert, setShowAlert] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  return (
    <div className={`p-4 md:p-6 space-y-8 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
      {/* <div className="flex justify-center mb-6">
        <img src="/assets/logo.png" alt="Asad Mobile's Shop Logo" className="h-28 w-auto" />
      </div> */}
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light">{t('financialOverview')}</h1>

      {/* Add alert at the top of the dashboard */}
      {showAlert && (overduePayments.length > 0 || upcomingPayoutsSoon.length > 0) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-l-4 border-amber-500 dark:border-amber-400 text-amber-800 dark:text-amber-200 p-6 mb-6 rounded-lg shadow-lg relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full -translate-y-16 translate-x-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500 rounded-full translate-y-12 -translate-x-12"></div>
          </div>
          
          {/* Close button */}
          <button 
            className="absolute top-3 right-3 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors duration-200 p-1 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800/30"
            onClick={() => setShowAlert(false)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center mb-3">
              <div className="flex-shrink-0 mr-3">
                <div className="w-10 h-10 bg-amber-500 dark:bg-amber-400 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">Attention Needed</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">Action required for committee management</p>
              </div>
            </div>
            
            {/* Content */}
            <div className="space-y-3">
              {overduePayments.length > 0 && (
                <div className="flex items-start space-x-3 rtl:space-x-reverse">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      <span className="font-bold text-red-600 dark:text-red-400">{overduePayments.length}</span> member(s) have overdue payments for the current period
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Review payment status and follow up with members
                    </p>
                  </div>
                </div>
              )}
              
              {upcomingPayoutsSoon.length > 0 && (
                <div className="flex items-start space-x-3 rtl:space-x-reverse">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      <span className="font-bold text-blue-600 dark:text-blue-400">{upcomingPayoutsSoon.length}</span> payout(s) due in the next 7 days
                    </p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      Prepare for upcoming committee payouts
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action buttons */}
            <div className="mt-4 flex flex-wrap gap-2">
              <button 
                onClick={() => setShowDetailsModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center space-x-2 rtl:space-x-reverse"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>View Details</span>
              </button>
              <button 
                onClick={() => setShowAlert(false)}
                className="px-4 py-2 bg-transparent border border-amber-500 dark:border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-800/30 text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4">
          <div className="bg-white dark:bg-neutral-darker rounded-lg shadow-xl p-0 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-neutral-darker dark:text-neutral-light flex items-center">
                <svg className="w-6 h-6 text-amber-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Attention Details
              </h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-grow overflow-y-auto p-4 md:p-6">
              <div className="space-y-6">
                {/* Overdue Payments Section */}
                {overduePayments.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      Overdue Payments ({overduePayments.length})
                    </h4>
                    <div className="space-y-3">
                      {overduePayments.map((payment, index) => (
                        <div key={index} className="bg-white dark:bg-neutral-darker p-3 rounded border border-red-200 dark:border-red-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-neutral-darker dark:text-neutral-light">
                                {getMemberName(payment.memberId, members)}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Committee: {payment.committeeTitle}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400">
                                Period: {payment.period + 1}
                              </p>
                            </div>
                            <span className="text-xs bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                              Overdue
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Payouts Section */}
                {upcomingPayoutsSoon.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                      Upcoming Payouts ({upcomingPayoutsSoon.length})
                    </h4>
                    <div className="space-y-3">
                      {upcomingPayoutsSoon.map((payout, index) => (
                        <div key={index} className="bg-white dark:bg-neutral-darker p-3 rounded border border-blue-200 dark:border-blue-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-neutral-darker dark:text-neutral-light">
                                {getMemberName(payout.memberId, members)}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Committee: {payout.committeeTitle}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Due in: {payout.daysUntil} day{payout.daysUntil !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                              {payout.daysUntil === 0 ? 'Today' : `${payout.daysUntil} day${payout.daysUntil !== 1 ? 's' : ''}`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-2 rtl:space-x-reverse p-4 md:p-6 border-t border-gray-200 dark:border-gray-700">
              <button 
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        <StatCard title={<span>{t('activeCommittees')} <InfoTooltip text="Committees currently running (not completed)." /></span>} value={activeCommittees.length.toString()} icon={<BuildingOfficeIcon className="w-7 h-7 text-blue-600"/>} description={t('activeCommitteesDesc')} />
        <StatCard title={<span>{t('completedCommittees')} <InfoTooltip text="Committees that have finished all payout cycles." /></span>} value={completedCommitteesCount.toString()} icon={<TrophyIcon className="w-7 h-7 text-green-500" />} description={t('completedCommitteesDesc')} />
        <StatCard title={<span>{t('totalCollected')} <InfoTooltip text="Sum of all cleared payments for all committees." /></span>} value={`PKR ${totalCollectedOverall.toLocaleString()}`} icon={<CreditCardIcon className="w-7 h-7 text-emerald-600" />} description={t('totalCollectedDesc')} />
        <StatCard title={<span>Collected This Month <InfoTooltip text="Sum of all cleared payments for the current period (all committees)." /></span>} value={`PKR ${currentMonthCollected.toLocaleString()}`} icon={<ChartBarIcon className="w-7 h-7 text-blue-500" />} description="Amount collected in current month (all committees)" />
        <StatCard title={<span>Remaining This Month <InfoTooltip text="Expected collection for the current period minus cleared payments (all committees)." /></span>} value={`PKR ${currentMonthRemaining.toLocaleString()}`} icon={<ClockIcon className="w-7 h-7 text-orange-500" />} description="Remaining amount in current month (all committees)" />
        <StatCard title={<span>{t('overallTotalMembers')} <InfoTooltip text="Total number of unique members across all committees." /></span>} value={members.length.toString()} icon={<UserGroupIcon className="w-7 h-7 text-violet-600" />} description={t('overallTotalMembersDesc')} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-neutral-darker p-4 md:p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-neutral-darker dark:text-neutral-light mb-1">{t('committeePoolComparison')} <InfoTooltip text="Comparison of total expected pool (all periods) vs. total collected for each active committee." /></h2>
          <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-4">{language === Language.UR ? "فعال کمیٹیوں کے فی رکن رقم اور جمع شدہ رقم کا موازنہ۔" : "Comparison of amount per member vs collected amount for active committees."}</p>
          {committeePoolData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={committeePoolData} margin={{ top: 5, right: 0, left: language === Language.UR ? 10 : 0, bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="name" 
                    angle={language === Language.UR ? 0 : -30} 
                    textAnchor={language === Language.UR ? 'middle' : "end"} 
                    height={70} 
                    interval={0}
                    tick={{ fontSize: 11, fill: '#4b5563' }} 
                />
                <YAxis tickFormatter={(value) => `PKR ${value/1000}k`} tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={language === Language.UR ? {transform: 'translate(10, 0)'} : {}}/>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{fontSize: "12px"}} />
                <Bar dataKey={t('totalPool')} fill={COLORS[0]} radius={[4, 4, 0, 0]} barSize={25}/>
                <Bar dataKey={t('totalCollected')} fill={COLORS[1]} radius={[4, 4, 0, 0]} barSize={25}/>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-neutral-DEFAULT dark:text-gray-400 py-10 text-center">{t('noCommittees')}</p>}
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-neutral-darker p-4 md:p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-neutral-darker dark:text-neutral-light mb-1">{t('topContributors', {count: 5})}</h2>
          <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-4">{language === Language.UR ? "سب سے زیادہ حصہ ڈالنے والے سرفہرست 5 اراکین۔" : "Top 5 members by their total contributions."}</p>
          {memberContributionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={memberContributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={110}
                fill="#8884d8"
                dataKey={t('totalCollected')}
                nameKey="name"
                label={renderPieLabel}
                stroke="none"
              >
                {memberContributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieChartTooltip />} />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{fontSize: "12px", marginTop: "15px"}}/>
            </PieChart>
          </ResponsiveContainer>
          ) : <p className="text-neutral-DEFAULT dark:text-gray-400 py-10 text-center">{t('noMembers')}</p>}
        </div>
      </div>
      
      {/* Upcoming Payouts Section */}
      <div className="bg-white dark:bg-neutral-darker p-4 md:p-6 rounded-lg shadow-lg">
        <h2 className="text-lg font-semibold text-neutral-darker dark:text-neutral-light mb-4">{t('upcomingPayouts')}</h2>
        {upcomingPayoutsList.length > 0 ? (
            <div className="space-y-4">
              {upcomingPayoutsList.map((payout, index) => (
                <div key={`${payout.committeeId}-${payout.memberId}-${index}`} className={`p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-start space-x-4 rtl:space-x-reverse ${language === Language.UR ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`p-2 bg-primary-light dark:bg-primary-dark rounded-full text-primary dark:text-white mt-1 ${language === Language.UR ? 'ml-3' : 'mr-3'}`}>
                    <CalendarDaysIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-grow">
                    <p className="font-semibold text-neutral-darker dark:text-neutral-light">{getMemberName(payout.memberId, members)}</p>
                    <p className="text-sm text-neutral-DEFAULT dark:text-gray-400">{payout.committeeTitle}</p>
                     <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('month')}: {getCommitteeMonthName(payout.committeeStartDate, payout.turnMonthIndex, language)}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold text-primary dark:text-primary-light ${language === Language.UR ? 'text-left' : 'text-right'}`}>
                    PKR {payout.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neutral-DEFAULT dark:text-gray-400 py-6 text-center">{t('noUpcomingPayouts')}</p>
          )}
        </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-neutral-darker p-4 md:p-6 rounded-lg shadow-lg mt-6">
        <h2 className="text-lg font-semibold text-neutral-darker dark:text-neutral-light mb-4">Recent Activity</h2>
        {recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Member</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Committee</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                  <th className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentActivity.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-medium text-neutral-darker dark:text-neutral-light">{getMemberName(item.memberId, members)}</td>
                    <td className="px-3 py-2 text-sm text-gray-500">{item.committeeTitle}</td>
                    <td className="px-3 py-2 text-xs"><span className={`px-2 py-1 rounded ${item.type === 'Payment' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{item.type}</span></td>
                    <td className="px-3 py-2 text-sm font-semibold">PKR {item.amount.toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs text-gray-400">{formatDate(item.date, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-neutral-DEFAULT dark:text-gray-400 py-4 text-center">No recent activity.</p>
        )}
      </div>

    </div>
  );
};

interface StatCardProps {
  title: React.ReactNode;
  value: string;
  icon: React.ReactNode;
  description: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description }) => {
  const { language } = useAppContext();
  return (
    <div className={`bg-white dark:bg-neutral-darker p-5 rounded-xl shadow-lg flex flex-col justify-between h-full ${language === Language.UR ? 'text-right' : 'text-left'}`}>
      <div>
        <div className={`flex items-center mb-3 ${language === Language.UR ? 'flex-row-reverse' : ''}`}>
            <div className={`p-3 bg-primary-light dark:bg-primary-dark rounded-full text-primary dark:text-white ${language === Language.UR ? 'ml-3' : 'mr-3'}`}>
              {icon}
            </div>
            <p className="text-md font-semibold text-neutral-darker dark:text-neutral-light">{title}</p>
        </div>
        <p className={`text-2xl font-bold text-neutral-darker dark:text-neutral-light mb-1 ${language === Language.UR ? 'text-right' : 'text-left'}`}>{value}</p>
      </div>
      <p className="text-xs text-neutral-DEFAULT dark:text-gray-400 mt-1">{description}</p>
    </div>
  );
};


export default DashboardScreen;