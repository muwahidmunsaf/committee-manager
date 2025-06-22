import React, { useState, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Language, Theme, Committee, Member, CommitteePayment, CommitteeMemberTurn, AuthMethod, PinLength } from '../types';
import { Button, Input, Select, LoadingSpinner } from './UIComponents';
import * as XLSX from 'xlsx'; // For Excel export

const SettingsScreen: React.FC = () => {
  const { 
    t, language, setLanguage, theme, setTheme, appPin, updateAppPin, 
    committees, members, isLoading, setIsLoading,
    authMethod, setAuthMethod, pinLength, setPinLength 
  } = useAppContext();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');
  const [previousAuthMethod, setPreviousAuthMethod] = useState(authMethod);
  const [selectedPinLength, setSelectedPinLength] = useState(pinLength); // Temporary selection
  const [selectedAuthMethod, setSelectedAuthMethod] = useState(authMethod); // Temporary auth method selection

  // Update previousAuthMethod when authMethod changes
  useEffect(() => {
    setPreviousAuthMethod(authMethod);
  }, [authMethod]);

  // Update selectedPinLength when pinLength changes from context
  useEffect(() => {
    setSelectedPinLength(pinLength);
  }, [pinLength]);

  // Update selectedAuthMethod when authMethod changes from context
  useEffect(() => {
    setSelectedAuthMethod(authMethod);
  }, [authMethod]);

  const handleThemeChange = (selectedTheme: Theme) => {
    setTheme(selectedTheme);
  };

  const handleLanguageChange = (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setPinSuccess('');

    // Validate input based on selected auth method
    if (selectedAuthMethod === AuthMethod.PIN) {
      // Check if inputs contain only digits for new PIN
      if (!/^\d+$/.test(newPin) || !/^\d+$/.test(confirmNewPin)) {
        setPinError(language === Language.UR 
          ? 'پن صرف نمبروں پر مشتمل ہونا چاہیے۔'
          : 'PIN must contain only digits.');
        return;
      }
    }

    if (newPin !== confirmNewPin) {
      setPinError(language === Language.UR 
        ? (selectedAuthMethod === AuthMethod.PIN ? 'پن مماثل نہیں ہیں۔' : 'پاس ورڈ مماثل نہیں ہیں۔')
        : (selectedAuthMethod === AuthMethod.PIN ? 'PINs do not match.' : 'Passwords do not match.'));
      return;
    }

    if (selectedAuthMethod === AuthMethod.PIN && newPin.length !== selectedPinLength) {
      setPinError(language === Language.UR 
        ? `پن ${selectedPinLength} ہندسوں کا ہونا چاہیے۔`
        : `PIN must be exactly ${selectedPinLength} digits.`);
      return;
    } else if (selectedAuthMethod === AuthMethod.PASSWORD && newPin.length < 6) {
      setPinError(language === Language.UR 
        ? 'پاس ورڈ کم از کم 6 حروف کا ہونا چاہیے۔'
        : 'Password must be at least 6 characters.');
      return;
    }

    try {
      const success = await updateAppPin(currentPin, newPin);
    if (success) {
        // Update authentication method if it was changed
        if (selectedAuthMethod !== authMethod) {
          await setAuthMethod(selectedAuthMethod);
        }
        // Only update PIN length if it was changed and PIN was successfully updated
        if (selectedAuthMethod === AuthMethod.PIN && selectedPinLength !== pinLength) {
          await setPinLength(selectedPinLength);
        }
        setPinSuccess(language === Language.UR 
          ? (selectedAuthMethod === AuthMethod.PIN ? 'پن کامیابی سے تبدیل ہو گیا۔' : 'پاس ورڈ کامیابی سے تبدیل ہو گیا۔')
          : (selectedAuthMethod === AuthMethod.PIN ? 'PIN changed successfully.' : 'Password changed successfully.'));
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
    } else {
        setPinError(language === Language.UR 
          ? (previousAuthMethod === AuthMethod.PIN ? 'موجودہ پن درست نہیں ہے۔' : 'موجودہ پاس ورڈ درست نہیں ہے۔')
          : (previousAuthMethod === AuthMethod.PIN ? 'Current PIN is incorrect.' : 'Current password is incorrect.'));
      }
    } catch (error) {
      setPinError(language === Language.UR 
        ? 'کوئی خرابی پیش آگئی۔ دوبارہ کوشش کریں۔'
        : 'An error occurred. Please try again.');
    }
  };

  const handleExportData = () => {
    setIsLoading(true);
    try {
      // Helper function to truncate text to Excel's limit
      const truncateForExcel = (text: string, maxLength: number = 32000) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
      };

      // Helper function to get member's payment history
      const getMemberPaymentHistory = (memberId: string) => {
        const history: any[] = [];
        committees.forEach((committee, committeeIndex) => {
          const memberPayments = committee.payments.filter(p => p.memberId === memberId);
          const totalPaid = memberPayments.reduce((sum, p) => sum + p.amountPaid, 0);
          const totalDue = committee.amountPerMember * committee.duration;
          const remaining = totalDue - totalPaid;
          
          history.push({
            CommitteeName: committee.title,
            Duration: `${committee.duration} months`,
            AmountPerMonth: committee.amountPerMember,
            TotalDue: totalDue,
            TotalPaid: totalPaid,
            Remaining: remaining,
            Status: remaining <= 0 ? 'Completed' : 'Pending',
            LastPaymentDate: memberPayments.length > 0 
              ? memberPayments[memberPayments.length - 1].paymentDate 
              : 'No payments'
          });
        });
        return history;
      };

      // 1. Members Sheet with Payment History
      const membersData: any[] = [];
      members.forEach((member, index) => {
        const paymentHistory = getMemberPaymentHistory(member.id);
        const totalCommittees = paymentHistory.length;
        const completedCommittees = paymentHistory.filter(h => h.Status === 'Completed').length;
        const totalAmountDue = paymentHistory.reduce((sum, h) => sum + h.TotalDue, 0);
        const totalAmountPaid = paymentHistory.reduce((sum, h) => sum + h.TotalPaid, 0);
        const totalRemaining = totalAmountDue - totalAmountPaid;

        // Add member info
        membersData.push({
          'S.No': index + 1,
          'Member Name': truncateForExcel(member.name, 50),
          'Phone': member.phone,
          'CNIC': member.cnic,
          'Address': truncateForExcel(member.address || '', 100),
          'Joining Date': member.joiningDate,
          'Total Committees': totalCommittees,
          'Completed Committees': completedCommittees,
          'Total Amount Due': totalAmountDue,
          'Total Amount Paid': totalAmountPaid,
          'Total Remaining': totalRemaining,
          'Payment Status': totalRemaining <= 0 ? 'Fully Paid' : 'Pending',
          'Notes': truncateForExcel(member.notes || '', 200)
        });

        // Add payment history for this member (with visual separator)
        if (paymentHistory.length > 0) {
          membersData.push({
            'S.No': '',
            'Member Name': `--- Payment History for ${member.name} ---`,
            'Phone': '',
            'CNIC': '',
            'Address': '',
            'Joining Date': '',
            'Total Committees': '',
            'Completed Committees': '',
            'Total Amount Due': '',
            'Total Amount Paid': '',
            'Total Remaining': '',
            'Payment Status': '',
            'Notes': ''
          });

          paymentHistory.forEach((history, historyIndex) => {
            membersData.push({
              'S.No': '',
              'Member Name': `  ${historyIndex + 1}. ${history.CommitteeName}`,
              'Phone': history.Duration,
              'CNIC': history.AmountPerMonth,
              'Address': history.TotalDue,
              'Joining Date': history.TotalPaid,
              'Total Committees': history.Remaining,
              'Completed Committees': history.Status,
              'Total Amount Due': history.LastPaymentDate,
              'Total Amount Paid': '',
              'Total Remaining': '',
              'Payment Status': '',
              'Notes': ''
            });
          });

          // Add separator line
          membersData.push({
            'S.No': '',
            'Member Name': '='.repeat(50),
            'Phone': '',
            'CNIC': '',
            'Address': '',
            'Joining Date': '',
            'Total Committees': '',
            'Completed Committees': '',
            'Total Amount Due': '',
            'Total Amount Paid': '',
            'Total Remaining': '',
            'Payment Status': '',
            'Notes': ''
          });
        }
      });

      const membersSheet = XLSX.utils.json_to_sheet(membersData);

      // 2. Committees Sheet with Calculations
      const committeesData: any[] = [];
      committees.forEach((committee, index) => {
        const totalMembers = committee.memberIds.length;
        const totalCollection = committee.payments.reduce((sum, p) => sum + p.amountPaid, 0);
        const expectedCollection = totalMembers * committee.amountPerMember * committee.duration;
        const collectionPercentage = expectedCollection > 0 ? (totalCollection / expectedCollection * 100).toFixed(1) : 0;
        const completedPayouts = committee.payoutTurns.filter(pt => pt.paidOut).length;
        const totalPayouts = committee.payoutTurns.length;

        committeesData.push({
          'S.No': index + 1,
          'Committee Name': truncateForExcel(committee.title, 50),
          'Type': committee.type,
          'Duration': `${committee.duration} months`,
          'Amount Per Member': committee.amountPerMember,
          'Total Members': totalMembers,
          'Expected Collection': expectedCollection,
          'Actual Collection': totalCollection,
          'Collection %': `${collectionPercentage}%`,
          'Completed Payouts': completedPayouts,
          'Total Payouts': totalPayouts,
          'Payout Progress': `${completedPayouts}/${totalPayouts}`,
          'Start Date': committee.startDate,
          'Payout Method': committee.payoutMethod
        });
      });

      const committeesSheet = XLSX.utils.json_to_sheet(committeesData);

      // 3. Detailed Payments Sheet
      const paymentsData: any[] = [];
      let paymentIndex = 1;
      
      committees.forEach((committee, committeeIndex) => {
        // Add committee header
        paymentsData.push({
          'S.No': '',
          'Committee': `=== ${committee.title} (${committee.type}) ===`,
          'Member': '',
          'Month': '',
          'Amount': '',
          'Date': '',
          'Status': '',
          'Notes': ''
        });

        committee.payments.forEach(payment => {
          const member = members.find(m => m.id === payment.memberId);
          paymentsData.push({
            'S.No': paymentIndex++,
            'Committee': committee.title,
            'Member': member?.name || payment.memberId,
            'Month': `Month ${payment.monthIndex + 1}`,
            'Amount': payment.amountPaid,
            'Date': payment.paymentDate,
            'Status': payment.status,
            'Notes': ''
          });
        });

        // Add committee summary
        const committeeTotal = committee.payments.reduce((sum, p) => sum + p.amountPaid, 0);
        paymentsData.push({
          'S.No': '',
          'Committee': `Total for ${committee.title}:`,
          'Member': '',
          'Month': '',
          'Amount': committeeTotal,
          'Date': '',
          'Status': '',
          'Notes': ''
        });

        // Add separator
        paymentsData.push({
          'S.No': '',
          'Committee': '='.repeat(40),
          'Member': '',
          'Month': '',
          'Amount': '',
          'Date': '',
          'Status': '',
          'Notes': ''
        });
      });

      const paymentsSheet = XLSX.utils.json_to_sheet(paymentsData);

      // 4. Payouts Sheet
      const payoutsData: any[] = [];
      let payoutIndex = 1;

      committees.forEach((committee, committeeIndex) => {
        // Add committee header
        payoutsData.push({
          'S.No': '',
          'Committee': `=== ${committee.title} Payouts ===`,
          'Member': '',
          'Turn': '',
          'Amount': '',
          'Date': '',
          'Status': ''
        });

        committee.payoutTurns.forEach(payout => {
          const member = members.find(m => m.id === payout.memberId);
          payoutsData.push({
            'S.No': payoutIndex++,
            'Committee': committee.title,
            'Member': member?.name || payout.memberId,
            'Turn': `Turn ${payout.turnMonthIndex + 1}`,
            'Amount': committee.amountPerMember,
            'Date': payout.payoutDate || 'Pending',
            'Status': payout.paidOut ? 'Paid' : 'Pending'
          });
        });

        // Add committee summary
        const paidPayouts = committee.payoutTurns.filter(pt => pt.paidOut).length;
        const totalPayouts = committee.payoutTurns.length;
            payoutsData.push({
          'S.No': '',
          'Committee': `Summary for ${committee.title}:`,
          'Member': '',
          'Turn': '',
          'Amount': `${paidPayouts}/${totalPayouts} paid`,
          'Date': '',
          'Status': ''
        });

        // Add separator
        payoutsData.push({
          'S.No': '',
          'Committee': '='.repeat(40),
          'Member': '',
          'Turn': '',
          'Amount': '',
          'Date': '',
          'Status': ''
        });
      });

      const payoutsSheet = XLSX.utils.json_to_sheet(payoutsData);

      // Set column widths and styles
      const setColumnWidths = (sheet: any, widths: { [key: string]: number }) => {
        sheet['!cols'] = Object.keys(widths).map(key => ({ width: widths[key] }));
      };

      // Set reasonable column widths
      setColumnWidths(membersSheet, {
        'A': 8,  // S.No
        'B': 25, // Member Name
        'C': 15, // Phone
        'D': 20, // CNIC
        'E': 30, // Address
        'F': 15, // Joining Date
        'G': 12, // Total Committees
        'H': 15, // Completed Committees
        'I': 15, // Total Amount Due
        'J': 15, // Total Amount Paid
        'K': 15, // Total Remaining
        'L': 12, // Payment Status
        'M': 30  // Notes
      });

      setColumnWidths(committeesSheet, {
        'A': 8,  // S.No
        'B': 30, // Committee Name
        'C': 15, // Type
        'D': 12, // Duration
        'E': 15, // Amount Per Member
        'F': 12, // Total Members
        'G': 15, // Expected Collection
        'H': 15, // Actual Collection
        'I': 12, // Collection %
        'J': 15, // Completed Payouts
        'K': 12, // Total Payouts
        'L': 12, // Payout Progress
        'M': 15, // Start Date
        'N': 15  // Payout Method
      });

      setColumnWidths(paymentsSheet, {
        'A': 8,  // S.No
        'B': 25, // Committee
        'C': 20, // Member
        'D': 10, // Month
        'E': 12, // Amount
        'F': 15, // Date
        'G': 10, // Status
        'H': 20  // Notes
      });

      setColumnWidths(payoutsSheet, {
        'A': 8,  // S.No
        'B': 25, // Committee
        'C': 20, // Member
        'D': 10, // Turn
        'E': 12, // Amount
        'F': 15, // Date
        'G': 10  // Status
      });

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, membersSheet, "Members & History");
      XLSX.utils.book_append_sheet(workbook, committeesSheet, "Committees");
      XLSX.utils.book_append_sheet(workbook, paymentsSheet, "Payments");
      XLSX.utils.book_append_sheet(workbook, payoutsSheet, "Payouts");

      XLSX.writeFile(workbook, "Detailed_Report.xlsx");
      alert(t('dataExported'));

    } catch (err) {
      console.error("Error exporting data to Excel");
      alert(language === Language.UR 
        ? 'ڈیٹا ایکسپورٹ کرنے میں خرابی پیش آگئی۔ براہ کرم دوبارہ کوشش کریں۔'
        : 'Error exporting data. Please try again.');
    }
    setIsLoading(false);
  };


  return (
    <div className={`max-w-3xl mx-auto p-4 md:p-6 space-y-8 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light mb-6">{t('settings')}</h1>

      {/* General Settings */}
      <section className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b pb-2 dark:border-gray-700">{t('settingsGeneral')}</h2>
        <div className="space-y-4">
          {/* Language Setting */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark dark:text-neutral-light mb-1">{t('language')}</label>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <Button 
                variant={language === Language.EN ? 'primary' : 'ghost'} 
                onClick={() => handleLanguageChange(Language.EN)}
              >
                {t('english')}
              </Button>
              <Button 
                variant={language === Language.UR ? 'primary' : 'ghost'} 
                onClick={() => handleLanguageChange(Language.UR)}
              >
                {t('urdu')}
              </Button>
            </div>
          </div>

          {/* Theme Setting */}
          <div>
            <label className="block text-sm font-medium text-neutral-dark dark:text-neutral-light mb-1">{t('theme')}</label>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <Button 
                variant={theme === Theme.LIGHT ? 'primary' : 'ghost'}
                onClick={() => handleThemeChange(Theme.LIGHT)}
              >
                {t('lightMode')}
              </Button>
              <Button 
                variant={theme === Theme.DARK ? 'primary' : 'ghost'}
                onClick={() => handleThemeChange(Theme.DARK)}
              >
                {t('darkMode')}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Security Settings */}
      <section className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b pb-2 dark:border-gray-700">{t('settingsSecurity')}</h2>
        
        {/* Authentication Method */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-neutral-dark dark:text-neutral-light mb-2">
            {language === Language.UR ? 'تصدیق کا طریقہ' : 'Authentication Method'}
          </label>
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Button 
              variant={selectedAuthMethod === AuthMethod.PIN ? 'primary' : 'ghost'} 
              onClick={() => setSelectedAuthMethod(AuthMethod.PIN)}
              className={authMethod === AuthMethod.PIN ? 'ring-2 ring-green-500' : ''}
            >
              PIN
              {authMethod === AuthMethod.PIN && (
                <span className="ml-1 text-xs">({language === Language.UR ? 'موجودہ' : 'Current'})</span>
              )}
            </Button>
            <Button 
              variant={selectedAuthMethod === AuthMethod.PASSWORD ? 'primary' : 'ghost'} 
              onClick={() => setSelectedAuthMethod(AuthMethod.PASSWORD)}
              className={authMethod === AuthMethod.PASSWORD ? 'ring-2 ring-green-500' : ''}
            >
              {language === Language.UR ? 'پاس ورڈ' : 'Password'}
              {authMethod === AuthMethod.PASSWORD && (
                <span className="ml-1 text-xs">({language === Language.UR ? 'موجودہ' : 'Current'})</span>
              )}
            </Button>
          </div>
          {/* Show current authentication method */}
          <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mt-2">
            {language === Language.UR 
              ? `موجودہ تصدیق کا طریقہ: ${authMethod === AuthMethod.PIN ? 'پن' : 'پاس ورڈ'}`
              : `Current authentication method: ${authMethod === AuthMethod.PIN ? 'PIN' : 'Password'}`}
          </p>
          {/* Show warning if auth method changed but not updated */}
          {selectedAuthMethod !== authMethod && (
            <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {language === Language.UR 
                  ? `آپ نے تصدیق کا طریقہ تبدیل کیا ہے۔ یہ تبدیلی تب تک لاگو نہیں ہوگی جب تک آپ نیا ${selectedAuthMethod === AuthMethod.PIN ? 'پن' : 'پاس ورڈ'} درج نہیں کرتے۔`
                  : `You've changed the authentication method. This change will only take effect when you enter a new ${selectedAuthMethod === AuthMethod.PIN ? 'PIN' : 'password'}.`}
              </p>
            </div>
          )}
        </div>

        {/* PIN Length Selection (only show when PIN is selected) */}
        {selectedAuthMethod === AuthMethod.PIN && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-neutral-dark dark:text-neutral-light mb-2">
              {language === Language.UR ? 'پن کی لمبائی' : 'PIN Length'}
            </label>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <Button 
                variant={selectedPinLength === PinLength.FOUR ? 'primary' : 'ghost'} 
                onClick={() => setSelectedPinLength(PinLength.FOUR)}
                className={pinLength === PinLength.FOUR ? 'ring-2 ring-green-500' : ''}
              >
                4 {language === Language.UR ? 'ہندسے' : 'Digits'}
                {pinLength === PinLength.FOUR && (
                  <span className="ml-1 text-xs">({language === Language.UR ? 'موجودہ' : 'Current'})</span>
                )}
              </Button>
              <Button 
                variant={selectedPinLength === PinLength.SIX ? 'primary' : 'ghost'} 
                onClick={() => setSelectedPinLength(PinLength.SIX)}
                className={pinLength === PinLength.SIX ? 'ring-2 ring-green-500' : ''}
              >
                6 {language === Language.UR ? 'ہندسے' : 'Digits'}
                {pinLength === PinLength.SIX && (
                  <span className="ml-1 text-xs">({language === Language.UR ? 'موجودہ' : 'Current'})</span>
                )}
              </Button>
              <Button 
                variant={selectedPinLength === PinLength.EIGHT ? 'primary' : 'ghost'} 
                onClick={() => setSelectedPinLength(PinLength.EIGHT)}
                className={pinLength === PinLength.EIGHT ? 'ring-2 ring-green-500' : ''}
              >
                8 {language === Language.UR ? 'ہندسے' : 'Digits'}
                {pinLength === PinLength.EIGHT && (
                  <span className="ml-1 text-xs">({language === Language.UR ? 'موجودہ' : 'Current'})</span>
                )}
              </Button>
            </div>
            {/* Show current PIN length */}
            <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mt-2">
              {language === Language.UR 
                ? `موجودہ پن کی لمبائی: ${pinLength} ہندسے`
                : `Current PIN length: ${pinLength} digits`}
            </p>
            {/* Show warning if length changed but PIN not updated */}
            {selectedPinLength !== pinLength && (
              <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  {language === Language.UR 
                    ? `آپ نے پن کی لمبائی ${pinLength} سے ${selectedPinLength} میں تبدیل کی ہے۔ یہ تبدیلی تب تک لاگو نہیں ہوگی جب تک آپ نیا پن درج نہیں کرتے۔`
                    : `You've changed PIN length from ${pinLength} to ${selectedPinLength} digits. This change will only take effect when you enter a new PIN.`}
                </p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleChangePin} className="space-y-4">
          <Input
            type="password"
            label={previousAuthMethod === AuthMethod.PIN ? t('currentPin') : (language === Language.UR ? 'موجودہ پاس ورڈ' : 'Current Password')}
            value={currentPin}
            onChange={(e) => {
              // Only allow digits for current PIN if previous method was PIN
              if (previousAuthMethod === AuthMethod.PIN) {
                const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                setCurrentPin(onlyDigits);
              } else {
                setCurrentPin(e.target.value);
              }
            }}
            inputMode={previousAuthMethod === AuthMethod.PIN ? "numeric" : "text"}
            showPasswordToggle={previousAuthMethod === AuthMethod.PASSWORD}
          />
          <Input
            type="password"
            label={selectedAuthMethod === AuthMethod.PIN ? t('newPin') : (language === Language.UR ? 'نیا پاس ورڈ' : 'New Password')}
            value={newPin}
            onChange={(e) => {
              // Only allow digits in PIN mode
              if (selectedAuthMethod === AuthMethod.PIN) {
                const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                setNewPin(onlyDigits);
              } else {
                setNewPin(e.target.value);
              }
            }}
            maxLength={selectedAuthMethod === AuthMethod.PIN ? selectedPinLength : undefined}
            inputMode={selectedAuthMethod === AuthMethod.PIN ? "numeric" : "text"}
            showPasswordToggle={selectedAuthMethod === AuthMethod.PASSWORD}
          />
          <Input
            type="password"
            label={selectedAuthMethod === AuthMethod.PIN ? t('confirmNewPin') : (language === Language.UR ? 'نئے پاس ورڈ کی تصدیق کریں' : 'Confirm New Password')}
            value={confirmNewPin}
            onChange={(e) => {
              // Only allow digits in PIN mode
              if (selectedAuthMethod === AuthMethod.PIN) {
                const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                setConfirmNewPin(onlyDigits);
              } else {
                setConfirmNewPin(e.target.value);
              }
            }}
            maxLength={selectedAuthMethod === AuthMethod.PIN ? selectedPinLength : undefined}
            inputMode={selectedAuthMethod === AuthMethod.PIN ? "numeric" : "text"}
            showPasswordToggle={selectedAuthMethod === AuthMethod.PASSWORD}
          />
          {pinError && <p className="text-red-500 text-sm">{pinError}</p>}
          {pinSuccess && <p className="text-green-500 text-sm">{pinSuccess}</p>}
          <Button type="submit" className="w-full">
            {language === Language.UR 
              ? (selectedAuthMethod === AuthMethod.PIN ? 'پن تبدیل کریں' : 'پاس ورڈ تبدیل کریں')
              : (selectedAuthMethod === AuthMethod.PIN ? 'Change PIN' : 'Change Password')}
          </Button>
        </form>
      </section>

      {/* Data Management */}
      <section className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-primary mb-4 border-b pb-2 dark:border-gray-700">{t('settingsDataManagement')}</h2>
        <div className="space-y-4">
            <Button onClick={handleExportData} isLoading={isLoading} className="w-full md:w-auto">
                {t('exportAllData')}
            </Button>
            <p className="text-xs text-neutral-DEFAULT dark:text-gray-400">
              {language === Language.UR ? "تمام اراکین، کمیٹیوں، ادائیگیوں اور وصولیوں کا ڈیٹا ایکسل فائل میں ایکسپورٹ کریں۔" : "Export all members, committees, payments, and payouts data to an Excel file."}
            </p>
        </div>
      </section>
    </div>
  );
};

export default SettingsScreen;
