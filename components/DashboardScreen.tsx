import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Committee, Member, Language, CommitteeType } from '../types';
import { calculateTotalPool, getMemberName, formatDate, getCommitteeMonthName, getCurrentPeriodIndex, calculateRemainingCollectionForPeriod } from '../utils/appUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { ChartPieIcon, UsersIcon, DocumentTextIcon, WalletIcon, CalendarDaysIcon } from './UIComponents';
import { ClipboardDocumentCheckIcon, CheckCircleIcon, BanknotesIcon, ArrowTrendingUpIcon, ExclamationCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

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
    date: pt.payoutDate,
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

  return (
    <div className={`p-4 md:p-6 space-y-8 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
      {/* <div className="flex justify-center mb-6">
        <img src="/assets/logo.png" alt="Asad Mobile's Shop Logo" className="h-28 w-auto" />
      </div> */}
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light">{t('financialOverview')}</h1>

      {/* Add alert at the top of the dashboard */}
      {showAlert && (overduePayments.length > 0 || upcomingPayoutsSoon.length > 0) && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded relative">
          <button className="absolute top-2 right-2 text-yellow-700" onClick={() => setShowAlert(false)}>&times;</button>
          <div className="font-bold mb-1">Attention Needed</div>
          {overduePayments.length > 0 && (
            <div className="mb-1">Overdue payments for {overduePayments.length} member(s) in current period.</div>
          )}
          {upcomingPayoutsSoon.length > 0 && (
            <div>Upcoming payouts due in next 7 days for {upcomingPayoutsSoon.length} member(s).</div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
        <StatCard title={<span>{t('activeCommittees')} <InfoTooltip text="Committees currently running (not completed)." /></span>} value={activeCommittees.length.toString()} icon={<ClipboardDocumentCheckIcon className="w-7 h-7 text-blue-600"/>} description={t('activeCommitteesDesc')} />
        <StatCard title={<span>{t('completedCommittees')} <InfoTooltip text="Committees that have finished all payout cycles." /></span>} value={completedCommitteesCount.toString()} icon={<CheckCircleIcon className="w-7 h-7 text-green-500" />} description={t('completedCommitteesDesc')} />
        <StatCard title={<span>{t('totalCollected')} <InfoTooltip text="Sum of all cleared payments for all committees." /></span>} value={`PKR ${totalCollectedOverall.toLocaleString()}`} icon={<BanknotesIcon className="w-7 h-7 text-emerald-600" />} description={t('totalCollectedDesc')} />
        <StatCard title={<span>Collected This Month <InfoTooltip text="Sum of all cleared payments for the current period (all committees)." /></span>} value={`PKR ${currentMonthCollected.toLocaleString()}`} icon={<ArrowTrendingUpIcon className="w-7 h-7 text-blue-500" />} description="Amount collected in current month (all committees)" />
        <StatCard title={<span>Remaining This Month <InfoTooltip text="Expected collection for the current period minus cleared payments (all committees)." /></span>} value={`PKR ${currentMonthRemaining.toLocaleString()}`} icon={<ExclamationCircleIcon className="w-7 h-7 text-orange-500" />} description="Remaining amount in current month (all committees)" />
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
              <Tooltip content={<CustomTooltip />} />
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