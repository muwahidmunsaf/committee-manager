import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Committee, Member, Language, CommitteeType } from '../types';
import { calculateTotalPool, getMemberName, formatDate, getCommitteeMonthName, getCurrentPeriodIndex, calculateRemainingCollectionForPeriod } from '../utils/appUtils';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { ChartPieIcon, UsersIcon, DocumentTextIcon, WalletIcon, CalendarDaysIcon, CurrencyDollarIcon } from './UIComponents'; // Added CurrencyDollarIcon

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

  const totalCollectedOverall = committees.reduce((sum, committee) => {
    return sum + committee.payments.reduce((committeeSum, payment) => committeeSum + payment.amountPaid, 0);
  }, 0);
  
  const remainingCollectionThisMonth = activeCommittees.reduce((sum, committee) => {
    const currentPeriod = getCurrentPeriodIndex(committee);
    if (currentPeriod >= 0 && currentPeriod < committee.duration) { // Ensure committee is active in current period
        return sum + calculateRemainingCollectionForPeriod(committee, currentPeriod);
    }
    return sum;
  }, 0);


  // Data for charts
  const committeePoolData = activeCommittees.map(c => ({
    name: c.title.substring(0, 15) + (c.title.length > 15 ? '...' : ''),
    [t('totalPool')]: c.memberIds.length * c.amountPerMember, // Pool for one period
    [t('totalCollected')]: c.payments.reduce((s, p) => s + p.amountPaid, 0), // Total collected ever for this committee
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-neutral-darker p-3 border border-gray-300 dark:border-gray-700 rounded shadow-lg">
          <p className="font-semibold text-neutral-darker dark:text-neutral-light">{label}</p>
          {payload.map((entry: any, index: number) => (
             <p key={`item-${index}`} style={{ color: entry.color }} className="text-sm">
                {`${entry.name}: PKR ${entry.value.toLocaleString()}`}
             </p>
          ))}
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
        amount: c.amountPerMember,
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

  return (
    <div className={`p-4 md:p-6 space-y-8 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
      {/* <div className="flex justify-center mb-6">
        <img src="/assets/logo.png" alt="Asad Mobile's Shop Logo" className="h-28 w-auto" />
      </div> */}
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light">{t('financialOverview')}</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
        <StatCard title={t('activeCommittees')} value={activeCommittees.length.toString()} icon={<DocumentTextIcon className="w-7 h-7"/>} description={t('activeCommitteesDesc')} />
        <StatCard title={t('completedCommittees')} value={completedCommitteesCount.toString()} icon={<DocumentTextIcon className="w-7 h-7 text-green-500" />} description={t('completedCommitteesDesc')} />
        <StatCard title={t('totalCollected')} value={`PKR ${totalCollectedOverall.toLocaleString()}`} icon={<WalletIcon className="w-7 h-7" />} description={t('totalCollectedDesc')} />
        <StatCard title={t('overallTotalMembers')} value={members.length.toString()} icon={<UsersIcon className="w-7 h-7" />} description={t('overallTotalMembersDesc')} />
        <StatCard title={t('remainingCollectionThisMonth')} value={`PKR ${remainingCollectionThisMonth.toLocaleString()}`} icon={<CurrencyDollarIcon className="w-7 h-7 text-orange-500" />} description={t('remainingCollectionThisMonthDesc')} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-white dark:bg-neutral-darker p-4 md:p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold text-neutral-darker dark:text-neutral-light mb-1">{t('committeePoolComparison')}</h2>
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

    </div>
  );
};

interface StatCardProps {
  title: string;
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