import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, Theme, Translations, Committee, Member, CommitteePayment, UserProfile, PayoutMethod, CommitteeType, AuthMethod, PinLength, Notification, NotificationType } from '../types';
import { APP_DATA_STORAGE_KEY, DEFAULT_PROFILE_PIC, DEFAULT_APP_PIN } from '../constants'; // Added DEFAULT_APP_PIN
import { generateId, initializePayoutTurns } from '../utils/appUtils';
import { db } from '../services/firebaseService';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

const initialTranslations: Translations = {
  [Language.EN]: {
    appName: "Asad Mobile's Shop",
    dashboard: "Dashboard",
    committees: "Committees",
    members: "Members",
    settings: "Settings",
    newCommittee: "New Committee",
    addMember: "Add Member",
    committeeTitle: "Committee Title",
    committeeType: "Committee Type",
    startDate: "Start Date",
    duration: "Duration (Months/Weeks/Days)",
    amountPerMember: "Amount per Member",
    totalMembers: "Total Members",
    totalPool: "Total Pool",
    payoutMethod: "Payout Method",
    createCommittee: "Create Committee",
    saveChanges: "Save Changes",
    cancel: "Cancel",
    memberName: "Member Name",
    memberPhone: "Phone (03XX-XXXXXXX)",
    memberCNIC: "CNIC (XXXXX-XXXXXXX-X)",
    memberAddress: "Address (Optional)",
    joiningDate: "Joining Date",
    notes: "Notes",
    viewDetails: "View Details",
    monthly: "Monthly",
    weekly: "Weekly",
    daily: "Daily",
    manual: "Manual",
    random: "Random",
    bidding: "Bidding",
    activeCommittees: "Active Committees",
    activeCommitteesDesc: "Committees currently in progress.",
    completedCommittees: "Completed Committees",
    completedCommitteesDesc: "Committees that have finished.",
    totalCollected: "Total Collected",
    totalCollectedDesc: "Sum of all payments received.",
    overallTotalMembers: "Overall Total Members",
    overallTotalMembersDesc: "Unique members across all committees.",
    upcomingPayouts: "Upcoming Payouts",
    paymentTracking: "Payment Tracking",
    markPaid: "Mark Paid", // May change to "Add Payment"
    markUnpaid: "Mark Unpaid",
    status: "Status",
    paid: "Paid", // Overall month status
    unpaid: "Unpaid", // Overall month status
    partial: "Partial", // Overall month status
    cleared: "Cleared", // Individual installment status
    pending: "Pending", // Individual installment status
    amountPaid: "Amount Paid",
    paymentDate: "Payment Date",
    generateReceipt: "Generate Receipt",
    aiAssistant: "AI Assistant",
    getSummary: "Get AI Summary",
    errorFetchingSummary: "Error fetching AI summary.",
    appLock: "App Lock",
    enterPin: "Enter PIN",
    unlock: "Unlock",
    language: "Language",
    english: "English",
    urdu: "Urdu",
    profile: "Profile",
    name: "Name",
    phone: "Phone",
    cnic: "CNIC",
    email: "Email",
    address: "Home Address",
    manageCommittee: "Manage Committee",
    noCommittees: "No committees yet. Create one!",
    noMembers: "No members in this committee yet.",
    actions: "Actions",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this item?",
    manageMembers: "Manage Members",
    committeeMembers: "Committee Members",
    month: "Month",
    payments: "Payments", // Title for section showing individual installments
    payouts: "Payouts",
    assignTurn: "Assign Turn",
    turnMonth: "Turn Month",
    paidOut: "Paid Out",
    markPaidOut: "Mark Paid Out",
    searchMember: "Search Member by Name/CNIC",
    addExistingMember: "Add Existing Member",
    createNewMember: "Create New Member",
    selectMember: "Select Member",
    confirm: "Confirm",
    pay: "Add Payment", // Changed from "Pay"
    receipt: "Receipt",
    committeeName: "Committee Name",
    payerName: "Payer Name",
    date: "Date",
    signature: "Signature",
    print: "Print",
    close: "Close",
    loading: "Loading...",
    downloadPdf: "Download PDF",
    kمیتی: "Committee", 
    greeting_ur: "خوش آمدید",
    paymentDue_ur: "آپ کی قسط واجب الادا ہے۔",
    latePaymentRisk_ur: "{memberName} کی جانب سے ادائیگی میں تاخیر کا امکان ہے۔",
    summaryReport_ur: "اس ماہ، {count} ممبران کی ادائیگیاں باقی ہیں۔",
    createCommitteeVoice_ur: "نئی کمیٹی بنائیں",
    paymentNotReceived_ur: "آپ کی قسط ادا نہیں ہوئی۔",
    financialOverview: "Financial Overview",
    committeePoolComparison: "Active Committees: Pool vs. Collected",
    topContributors: "Top {count} Members by Contribution",
    amountPKR: "Amount (PKR)",
    noUpcomingPayouts: "No upcoming payouts.",
    selectMonth: "Select Month",
    downloadMonthlyReceipts: "Download Monthly Receipts",
    downloadMemberHistory: "Download Member History",
    memberHistoryReport: "Member History Report",
    personalDetails: "Personal Details",
    committeeParticipation: "Committee Participation",
    paymentHistory: "Payment History",
    payoutHistory: "Payout History",
    totalContributedThisCommittee: "Total Contributed to this Committee",
    noPaymentsMade: "No payments made for this period.", // For member history report
    noInstallmentsMade: "No installments made for this month yet.", // For payment modal
    noPayoutsReceived: "No payouts received for this period.",
    errorGeneratingPDF: "Error generating PDF.",
    noPaidReceiptsForMonth: "No paid receipts found for the selected month.",
    months: "Months", 
    weeks: "Weeks",
    days: "Days",
    theme: "Theme",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    changePin: "Change PIN",
    currentPin: "Current PIN",
    newPin: "New PIN",
    confirmNewPin: "Confirm New PIN",
    pinChangedSuccessfully: "PIN changed successfully.",
    pinChangeFailed: "PIN change failed. Check current PIN.",
    pinMismatch: "New PINs do not match.",
    exportAllData: "Export All Data (Excel)",
    dataExported: "Data exported successfully.",
    errorExportingData: "Error exporting data.",
    addInstallment: "Add Installment",
    installmentAmount: "Installment Amount",
    installmentDate: "Installment Date",
    existingInstallments: "Existing Installments",
    totalDue: "Total Due",
    alreadyPaid: "Already Paid",
    remainingAmount: "Remaining Amount",
    uploadProfilePicture: "Upload Profile Picture",
    removePicture: "Remove Picture",
    profilePicture: "Profile Picture",
    reports: "Reports",
    changeProfilePicture: "Change Profile Picture",
    settingsGeneral: "General Settings",
    settingsSecurity: "Security",
    settingsDataManagement: "Data Management",
    appSettingsSaved: "App settings saved.",
    errorSavingSettings: "Error saving settings.",
    autoGeneratedReceiptNote: "This is an auto-generated receipt and does not require a manual signature for verification.",
    remainingCollectionThisMonth: "Remaining This Month",
    remainingCollectionThisMonthDesc: "Total amount yet to be collected in the current period from active committees.",
    maxInstallmentReached: "Cannot add installment. Total payments for this month would exceed the amount per member (PKR {amount}). Max allowed for this installment: PKR {maxAllowed}.",
    backToAllCommittees: "Back to All Committees",
    payoutMethodDisplay: "Payout Method: {method}",
    luckyDraw: "Lucky Draw",
    luckyDrawDesc: "Randomly select a member for payout",
    congratulations: "Congratulations!",
    winnerSelected: "Winner Selected",
    luckyWinner: "Lucky Winner",
    noEligibleMembers: "No eligible members for lucky draw",
    allMembersPaidOut: "All members have been paid out",
    clickToDraw: "Click to Draw",
    drawingInProgress: "Drawing in progress...",
    partyEffects: "🎉🎊🎈",
    removeShare: "Remove Share",
    removeShare_ur: "شیئر ہٹائیں",
    removeOneShare: "Remove one share",
    removeOneShare_ur: "ایک شیئر ہٹائیں",
    summary: "Summary",
    summary_ur: "خلاصہ",
    totalDue_ur: "کل واجب",
    totalCollected_ur: "کل جمع شدہ",
    totalRemaining: "Total Remaining",
    totalRemaining_ur: "کل باقی",
    memberPayments: "Member Payments",
    memberPayments_ur: "ارکان کی ادائیگیاں",
    shares: "Shares",
    shares_ur: "شیئرز",
    payoutHistory_ur: "ادائیگی کی تاریخ",
    payoutAmount: "Payout Amount",
    payoutAmount_ur: "ادائیگی کی رقم",
    status_ur: "حیثیت",
    paid_ur: "ادا شدہ",
    pending_ur: "زیر التوا",
    payoutDate: "Payout Date",
    payoutDate_ur: "ادائیگی کی تاریخ",
    payoutAlreadyDone: "Payout of this month is already done.",
    payoutAlreadyDone_ur: "اس مہینے کی ادائیگی پہلے ہی ہو چکی ہے۔",
    payoutAlreadyDoneTryNext: "Payout for this month is already done. Try next month.",
    payoutAlreadyDoneTryNext_ur: "اس مہینے کی ادائیگی پہلے ہی ہو چکی ہے۔ اگلے مہینے کوشش کریں۔",
    onePayoutPerMonth: "A payout has already been made for {monthName}. Only one payout is allowed per month.",
    onePayoutPerMonth_ur: "{monthName} کی ادائیگی پہلے ہی ہو چکی ہے۔ ہر مہینے صرف ایک ادائیگی کی اجازت ہے۔",
    luckyDrawOnePayoutPerMonth: "Payout for {monthName} has already been done. Try again next month.",
    luckyDrawOnePayoutPerMonth_ur: "{monthName} کی ادائیگی پہلے ہی ہو چکی ہے۔ اگلے مہینے کوشش کریں۔",
    notifications: "Notifications",
    markAllRead: "Mark all read",
    noNotifications: "No notifications",
    paymentOverdue: "Payment Overdue",
    upcomingPayout: "Upcoming Payout",
    committeeUpdate: "Committee Update",
    justNow: "Just now",
    minutesAgo: "{minutes}m ago",
    hoursAgo: "{hours}h ago",
    daysAgo: "{days}d ago"
  },
  [Language.UR]: {
    appName: "اسد موبائل شاپ",
    dashboard: "ڈیش بورڈ",
    committees: "کمیٹیاں",
    members: "اراکین",
    settings: "ترتیبات",
    newCommittee: "نئی کمیٹی",
    addMember: "رکن شامل کریں",
    committeeTitle: "کمیٹی کا عنوان",
    committeeType: "کمیٹی کی قسم",
    startDate: "آغاز کی تاریخ",
    duration: "مدت (ماہ/ہفتے/دن)",
    amountPerMember: "فی رکن رقم",
    totalMembers: "کل اراکین",
    totalPool: "کل پول",
    payoutMethod: "ادائیگی کا طریقہ",
    createCommittee: "کمیٹی بنائیں",
    saveChanges: "تبدیلیاں محفوظ کریں",
    cancel: "منسوخ کریں",
    memberName: "رکن کا نام",
    memberPhone: "فون (03XX-XXXXXXX)",
    memberCNIC: "شناختی کارڈ (XXXXX-XXXXXXX-X)",
    memberAddress: "پتہ (اختیاری)",
    joiningDate: "شمولیت کی تاریخ",
    notes: "نوٹس",
    viewDetails: "تفصیلات دیکھیں",
    monthly: "ماہانہ",
    weekly: "ہفتہ وار",
    daily: "روزانہ",
    manual: "دستی",
    random: "بے ترتیب",
    bidding: "بولی",
    activeCommittees: "فعال کمیٹیاں",
    activeCommitteesDesc: "کمیٹیاں جو ابھی چل رہی ہیں۔",
    completedCommittees: "مکمل شدہ کمیٹیاں",
    completedCommitteesDesc: "وہ کمیٹیاں جو مکمل ہو چکی ہیں۔",
    totalCollected: "کل جمع شدہ رقم",
    totalCollectedDesc: "تمام موصول شدہ ادائیگیوں کا مجموعہ۔",
    overallTotalMembers: "کل اراکین",
    overallTotalMembersDesc: "تمام کمیٹیوں میں منفرد اراکین۔",
    upcomingPayouts: "آنے والی ادائیگیاں",
    paymentTracking: "ادائیگی ٹریکنگ",
    markPaid: "ادائیگی کریں", 
    markUnpaid: "غیر ادا شدہ نشان زد کریں",
    status: "حیثیت",
    paid: "ادا شدہ",
    unpaid: "غیر ادا شدہ",
    partial: "جزوی",
    cleared: "کلیئرڈ", // انفرادی قسط کی حیثیت
    pending: "زیر التواء", // انفرادی قسط کی حیثیت
    amountPaid: "ادا شدہ رقم",
    paymentDate: "ادائیگی کی تاریخ",
    generateReceipt: "رسید بنائیں",
    aiAssistant: "اے آئی اسسٹنٹ",
    getSummary: "اے آئی خلاصہ حاصل کریں",
    errorFetchingSummary: "اے آئی خلاصہ حاصل کرنے میں خرابی۔",
    appLock: "ایپ لاک",
    enterPin: "پن درج کریں",
    unlock: "انلاک",
    language: "زبان",
    english: "English",
    urdu: "اردو",
    profile: "پروفائل",
    name: "نام",
    phone: "فون",
    cnic: "شناختی کارڈ",
    email: "ای میل",
    address: "گھر کا پتہ",
    manageCommittee: "کمیٹی کا انتظام کریں",
    noCommittees: "ابھی تک کوئی کمیٹی نہیں ہے۔ ایک بنائیں!",
    noMembers: "اس کمیٹی میں ابھی تک کوئی رکن نہیں ہے۔",
    actions: "کاروائیاں",
    edit: "ترمیم",
    delete: "حذف کریں",
    confirmDelete: "کیا آپ واقعی اس آئٹم کو حذف کرنا چاہتے ہیں؟",
    manageMembers: "اراکین کا انتظام کریں",
    committeeMembers: "کمیٹی کے اراکین",
    month: "مہینہ",
    payments: "ادائیگیاں", // انفرادی قسطوں کے سیکشن کا عنوان
    payouts: "ادائیگیاں",
    assignTurn: "باری تفویض کریں",
    turnMonth: "باری کا مہینہ",
    paidOut: "ادا کر دیا گیا",
    markPaidOut: "ادا شدہ نشان زد کریں",
    searchMember: "رکن کا نام/شناختی کارڈ سے تلاش کریں",
    addExistingMember: "موجودہ رکن شامل کریں",
    createNewMember: "نیا رکن بنائیں",
    selectMember: "رکن منتخب کریں",
    confirm: "تصدیق کریں",
    pay: "ادائیگی شامل کریں", // "ادا کریں" سے تبدیل کیا گیا
    receipt: "رسید",
    committeeName: "کمیٹی کا نام",
    payerName: "ادا کنندہ کا نام",
    date: "تاریخ",
    signature: "دستخط",
    print: "پرنٹ",
    close: "بند کریں",
    loading: "لوڈ ہو رہا ہے۔۔۔",
    downloadPdf: "پی ڈی ایف ڈاؤن لوڈ کریں",
    kمیتی: "کمیٹی",
    greeting_ur: "خوش آمدید",
    paymentDue_ur: "آپ کی قسط واجب الادا ہے",
    latePaymentRisk_ur: "{memberName} کی جانب سے ادائیگی میں تاخیر کا امکان ہے۔",
    summaryReport_ur: "اس ماہ، {count} ممبران کی ادائیگیاں باقی ہیں۔",
    createCommitteeVoice_ur: "نئی کمیٹی بنائیں",
    paymentNotReceived_ur: "آپ کی قسط ادا نہیں ہوئی۔",
    financialOverview: "مالی جائزہ",
    committeePoolComparison: "فعال کمیٹیاں: کل پول بمقابلہ جمع شدہ",
    topContributors: "سب سے زیادہ حصہ ڈالنے والے {count} اراکین",
    amountPKR: "رقم (PKR)",
    noUpcomingPayouts: "کوئی آنے والی ادائیگیاں نہیں ہیں۔",
    selectMonth: "مہینہ منتخب کریں",
    downloadMonthlyReceipts: "ماہانہ رسیدیں ڈاؤن لوڈ کریں",
    downloadMemberHistory: "رکن کی مکمل تاریخ ڈاؤن لوڈ کریں",
    memberHistoryReport: "رکن کی مکمل تاریخی رپورٹ",
    personalDetails: "ذاتی تفصیلات",
    committeeParticipation: "کمیٹی میں شرکت",
    paymentHistory: "ادائیگی کی تاریخ",
    payoutHistory: "ادائیگی کی تاریخ",
    totalContributedThisCommittee: "اس کمیٹی میں کل حصہ",
    noPaymentsMade: "اس مدت کے لئے کوئی ادائیگی نہیں کی گئی۔",
    noInstallmentsMade: "اس مہینے ابھی تک کوئی قسط ادا نہیں کی گئی۔",
    noPayoutsReceived: "اس مدت کے لئے کوئی ادائیگی موصول نہیں ہوئی۔",
    errorGeneratingPDF: "پی ڈی ایف بنانے میں خرابی۔",
    noPaidReceiptsForMonth: "منتخب مہینے کے لئے کوئی ادا شدہ رسیدیں نہیں ملیں۔",
    months: "مہینے",
    weeks: "ہفتے",
    days: "دن",
    theme: "تھیم",
    lightMode: "لائٹ موڈ",
    darkMode: "ڈارک موڈ",
    changePin: "پن تبدیل کریں",
    currentPin: "موجودہ پن",
    newPin: "نیا پن",
    confirmNewPin: "نئے پن کی تصدیق کریں",
    pinChangedSuccessfully: "پن کامیابی سے تبدیل کر دیا گیا۔",
    pinChangeFailed: "پن تبدیل کرنے میں ناکامی۔ موجودہ پن چیک کریں۔",
    pinMismatch: "نئے پن مماثل نہیں ہیں۔",
    exportAllData: "تمام ڈیٹا ایکسپورٹ کریں (ایکسل)",
    dataExported: "ڈیٹا کامیابی سے ایکسپورٹ ہوگیا۔",
    errorExportingData: "ڈیٹا ایکسپورٹ کرنے میں خرابی۔",
    addInstallment: "قسط شامل کریں",
    installmentAmount: "قسط کی رقم",
    installmentDate: "قسط کی تاریخ",
    existingInstallments: "موجودہ اقساط",
    totalDue: "کل واجب الادا",
    alreadyPaid: "پہلے سے ادا شدہ",
    remainingAmount: "باقی رقم",
    uploadProfilePicture: "پروفائل تصویر اپلوڈ کریں",
    removePicture: "تصویر ہٹائیں",
    profilePicture: "پروفائل تصویر",
    reports: "رپورٹس",
    changeProfilePicture: "پروفائل تصویر تبدیل کریں",
    settingsGeneral: "عمومی ترتیبات",
    settingsSecurity: "سیکیورٹی",
    settingsDataManagement: "ڈیٹا کا انتظام",
    appSettingsSaved: "ایپ کی ترتیبات محفوظ کر دی گئیں۔",
    errorSavingSettings: "ترتیبات محفوظ کرنے میں خرابی۔",
    autoGeneratedReceiptNote: "یہ ایک خودکار طور پر تیار کردہ رسید ہے اور اسے تصدیق کے لیے دستی دستخط کی ضرورت نہیں ہے۔",
    remainingCollectionThisMonth: "اس ماہ کا بقایا",
    remainingCollectionThisMonthDesc: "فعال کمیٹیوں سے موجودہ مدت میں جمع کی جانے والی کل بقایا رقم۔",
    maxInstallmentReached: "قسط شامل نہیں کی جا سکتی۔ اس ماہ کی کل ادائیگیاں فی رکن رقم (PKR {amount}) سے تجاوز کر جائیں گی۔ اس قسط کے لیے زیادہ سے زیادہ قابل اجازت رقم: PKR {maxAllowed}۔",
    backToAllCommittees: "تمام کمیٹیوں پر واپس جائیں",
    payoutMethodDisplay: "ادائیگی کا طریقہ: {method}",
    luckyDraw: "خوش قسمت ڈرا",
    luckyDrawDesc: "ادائیگی کے لیے بے ترتیب طور پر رکن منتخب کریں",
    congratulations: "مبارک ہو!",
    winnerSelected: "فاتح منتخب",
    luckyWinner: "خوش قسمت فاتح",
    noEligibleMembers: "خوش قسمت ڈرا کے لیے کوئی اہل رکن نہیں",
    allMembersPaidOut: "تمام اراکین کو ادائیگی ہو چکی ہے",
    clickToDraw: "ڈرا کرنے کے لیے کلک کریں",
    drawingInProgress: "ڈرا جاری ہے...",
    partyEffects: "🎉🎊🎈",
    removeShare: "Remove Share",
    removeShare_ur: "شیئر ہٹائیں",
    removeOneShare: "Remove one share",
    removeOneShare_ur: "ایک شیئر ہٹائیں",
    summary: "Summary",
    summary_ur: "خلاصہ",
    totalDue_ur: "کل واجب",
    totalCollected_ur: "کل جمع شدہ",
    totalRemaining: "Total Remaining",
    totalRemaining_ur: "کل باقی",
    memberPayments: "Member Payments",
    memberPayments_ur: "ارکان کی ادائیگیاں",
    shares: "Shares",
    shares_ur: "شیئرز",
    payoutHistory_ur: "ادائیگی کی تاریخ",
    payoutAmount: "Payout Amount",
    payoutAmount_ur: "ادائیگی کی رقم",
    status_ur: "حیثیت",
    paid_ur: "ادا شدہ",
    pending_ur: "زیر التوا",
    payoutDate: "Payout Date",
    payoutDate_ur: "ادائیگی کی تاریخ",
    payoutAlreadyDone: "Payout of this month is already done.",
    payoutAlreadyDone_ur: "اس مہینے کی ادائیگی پہلے ہی ہو چکی ہے۔",
    payoutAlreadyDoneTryNext: "Payout for this month is already done. Try next month.",
    payoutAlreadyDoneTryNext_ur: "اس مہینے کی ادائیگی پہلے ہی ہو چکی ہے۔ اگلے مہینے کوشش کریں۔",
    onePayoutPerMonth: "A payout has already been made for {monthName}. Only one payout is allowed per month.",
    onePayoutPerMonth_ur: "{monthName} کی ادائیگی پہلے ہی ہو چکی ہے۔ ہر مہینے صرف ایک ادائیگی کی اجازت ہے۔",
    luckyDrawOnePayoutPerMonth: "Payout for {monthName} has already been done. Try again next month.",
    luckyDrawOnePayoutPerMonth_ur: "{monthName} کی ادائیگی پہلے ہی ہو چکی ہے۔ اگلے مہینے کوشش کریں۔",
    notifications: "Notifications",
    markAllRead: "Mark all read",
    noNotifications: "No notifications",
    paymentOverdue: "Payment Overdue",
    upcomingPayout: "Upcoming Payout",
    committeeUpdate: "Committee Update",
    justNow: "Just now",
    minutesAgo: "{minutes}m ago",
    hoursAgo: "{hours}h ago",
    daysAgo: "{days}d ago"
  },
};


interface AppContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  appPin: string;
  authMethod: AuthMethod;
  setAuthMethod: (method: AuthMethod) => void;
  pinLength: PinLength;
  setPinLength: (length: PinLength) => void;
  updateAppPin: (currentPin: string, newPin: string) => Promise<boolean>;
  forceUpdateAppPin: (newPin: string) => Promise<void>;
  t: (key: string, substitutions?: Record<string, string | number>) => string;
  userProfile: UserProfile;
  updateUserProfile: (profile: UserProfile) => void;
  committees: Committee[];
  addCommittee: (committee: Omit<Committee, 'id' | 'payments' | 'payoutTurns' | 'memberIds'> & { memberIds?: string[] }) => Promise<Committee>;
  updateCommittee: (committee: Committee) => void;
  deleteCommittee: (committeeId: string) => void;
  getCommitteeById: (committeeId: string) => Committee | undefined;
  members: Member[];
  addMember: (member: Omit<Member, 'id'>) => Promise<Member>;
  updateMember: (member: Member) => void;
  deleteMember: (memberId: string) => void;
  getMemberById: (memberId: string) => Member | undefined;
  addMemberToCommittee: (committeeId: string, memberId: string) => void;
  removeMemberFromCommittee: (committeeId: string, memberId: string) => void;
  removeOneShareFromCommittee: (committeeId: string, memberId: string) => void;
  recordPayment: (committeeId: string, paymentDetails: Omit<CommitteePayment, 'id'>) => void;
  getPaymentsForMemberByMonth: (committeeId: string, memberId: string, monthIndex: number) => CommitteePayment[];
  updatePayoutTurn: (committeeId: string, turn: Committee['payoutTurns'][0]) => void;
  isLocked: boolean;
  unlockApp: (pin: string) => Promise<boolean>;
  lockApp: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  isAuthSettingsLoaded: boolean; // New loading state for auth settings
  resetAutoLockTimer: () => void;
  getAutoLockTimeRemaining: () => number;
  // Notification methods
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  getUnreadNotificationCount: () => number;
  setCommittees: (committees: Committee[]) => void;
  setMembers: (members: Member[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USER_SETTINGS_DOC_ID = 'singleton'; // For now, use a single document for settings

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [languageState, setLanguageState] = useState<Language>(Language.EN);
  const [themeState, setThemeState] = useState<Theme>(Theme.LIGHT);
  const [appPinState, setAppPinState] = useState<string>(DEFAULT_APP_PIN);
  const [authMethodState, setAuthMethodState] = useState<AuthMethod>(AuthMethod.PIN);
  const [pinLengthState, setPinLengthState] = useState<PinLength>(PinLength.FOUR);
  const [isLockedState, setIsLockedState] = useState<boolean>(true);
  const [isLoadingState, setIsLoadingState] = useState<boolean>(false);
  const [isAuthSettingsLoaded, setIsAuthSettingsLoaded] = useState<boolean>(false); // New loading state for auth settings
  const [userProfileState, setUserProfileState] = useState<UserProfile>({
    name: '',
    phone: '',
    cnic: '',
  });
  const [committeesState, setCommitteesState] = useState<Committee[]>([]);
  const [membersState, setMembersState] = useState<Member[]>([]);

  // Notification state
  const [notificationsState, setNotificationsState] = useState<Notification[]>([]);

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('notifications');
    if (savedNotifications) {
      try {
        const parsed = JSON.parse(savedNotifications);
        setNotificationsState(parsed);
      } catch (error) {
        console.error('Error loading notifications from localStorage');
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notificationsState));
  }, [notificationsState]);

  const t = useCallback((key: string, substitutions?: Record<string, string | number>): string => {
    let translation = initialTranslations[languageState][key as keyof typeof initialTranslations[Language.EN]] || initialTranslations[Language.EN][key as keyof typeof initialTranslations[Language.EN]] || key;
    if (substitutions) {
      Object.keys(substitutions).forEach(subKey => {
        translation = translation.replace(`{${subKey}}`, String(substitutions[subKey]));
      });
    }
    return translation;
  }, [languageState]);

  // Generate notifications based on committee data
  const generateNotificationsFromCommittees = useCallback(() => {
    const newNotifications: Notification[] = [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    committeesState.forEach(committee => {
      const committeeStartDate = new Date(committee.startDate);
      const currentMonthIndex = Math.floor((now.getTime() - committeeStartDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      // Check for overdue payments
      committee.memberIds.forEach(memberId => {
        const member = membersState.find(m => m.id === memberId);
        if (!member) return;

        const paymentsForCurrentMonth = committee.payments.filter(p => 
          p.memberId === memberId && p.monthIndex === currentMonthIndex
        );
        
        const totalPaidThisMonth = paymentsForCurrentMonth.reduce((sum, p) => sum + p.amountPaid, 0);
        const expectedAmount = committee.amountPerMember;
        
        if (totalPaidThisMonth < expectedAmount) {
          const dueDate = new Date(committeeStartDate);
          dueDate.setMonth(dueDate.getMonth() + currentMonthIndex);
          dueDate.setDate(dueDate.getDate() + 7); // Assume due date is 7 days after month start
          
          if (today > dueDate) {
            // Payment is overdue
            newNotifications.push({
              id: `overdue-${committee.id}-${memberId}-${currentMonthIndex}`,
              type: NotificationType.PAYMENT_OVERDUE,
              title: t('paymentOverdue'),
              message: `${member.name} ${t('paymentDue_ur')} ${committee.title}`,
              timestamp: new Date().toISOString(),
              isRead: false,
              committeeId: committee.id,
              memberId: memberId,
              actionUrl: '/committees'
            });
          }
        }
      });

      // Check for upcoming payouts
      const upcomingPayouts = committee.payoutTurns.filter(turn => 
        !turn.paidOut && turn.turnMonthIndex === currentMonthIndex
      );
      
      if (upcomingPayouts.length > 0) {
        const payoutDate = new Date(committeeStartDate);
        payoutDate.setMonth(payoutDate.getMonth() + currentMonthIndex);
        payoutDate.setDate(payoutDate.getDate() + 15); // Assume payout is on 15th of month
        
        const daysUntilPayout = Math.ceil((payoutDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilPayout <= 3 && daysUntilPayout > 0) {
          newNotifications.push({
            id: `payout-${committee.id}-${currentMonthIndex}`,
            type: NotificationType.PAYOUT_UPCOMING,
            title: t('upcomingPayout'),
            message: `${committee.title} ${t('payoutUpcoming_ur')} ${daysUntilPayout} ${t('days')}`,
            timestamp: new Date().toISOString(),
            isRead: false,
            committeeId: committee.id,
            actionUrl: '/committees'
          });
        }
      }
    });

    // Add new notifications without duplicates
    setNotificationsState(prev => {
      const existingIds = new Set(prev.map(n => n.id));
      const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));
      return [...prev, ...uniqueNewNotifications];
    });
  }, [committeesState, membersState, t]);

  // Generate notifications when committees or members change
  useEffect(() => {
    // Generate notifications whenever committees or members change
    generateNotificationsFromCommittees();
  }, [committeesState, membersState, generateNotificationsFromCommittees]);

  // Auto-lock functionality
  const [autoLockTimer, setAutoLockTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const AUTO_LOCK_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Fetch committees, members, and user profile only after unlock
  useEffect(() => {
    if (!isLockedState) {
      setIsLoadingState(true);
      const fetchData = async () => {
        try {
          const [committeesSnapshot, membersSnapshot, settingsDoc] = await Promise.all([
            getDocs(collection(db, 'committees')),
            getDocs(collection(db, 'members')),
            getDoc(doc(db, 'settings', USER_SETTINGS_DOC_ID)),
          ]);
          const committeesData: Committee[] = committeesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as Omit<Committee, 'id'>) }));
          setCommitteesState(committeesData);
          const membersData: Member[] = membersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...(docSnap.data() as Omit<Member, 'id'>) }));
          setMembersState(membersData);
          if (settingsDoc.exists()) {
            const data = settingsDoc.data();
            if (data.userProfile) setUserProfileState(data.userProfile);
          }
        } catch (error) {
          console.error('Error fetching data from Firestore');
        } finally {
          setIsLoadingState(false);
        }
      };
      fetchData();
    }
  }, [isLockedState]);

  // Separate useEffect for auth settings to prevent flash
  useEffect(() => {
    const loadAuthSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          // Update auth method if different
          if (data.authMethod !== authMethodState) {
            setAuthMethodState(data.authMethod || AuthMethod.PIN);
          }
          // Update pin length if different
          if (data.pinLength !== pinLengthState) {
            setPinLengthState(data.pinLength || PinLength.FOUR);
          }
          // Update PIN if different
          if (data.appPin !== appPinState) {
            setAppPinState(data.appPin || DEFAULT_APP_PIN);
          }
          // Update language and theme if they exist
          if (data.language) setLanguageState(data.language);
          if (data.theme) setThemeState(data.theme);
        }
      } catch (error) {
        console.error('Error loading auth settings');
        // Don't expose sensitive error details
      } finally {
        setIsAuthSettingsLoaded(true);
      }
    };
    loadAuthSettings();
  }, []); // Only run once on mount

  useEffect(() => {
    document.documentElement.lang = languageState;
    document.documentElement.dir = languageState === Language.UR ? 'rtl' : 'ltr';
    if (themeState === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [languageState, themeState]);

  const setLanguage = (lang: Language) => setLanguageState(lang);
  const setTheme = (selectedTheme: Theme) => setThemeState(selectedTheme);

  const setAuthMethod = async (method: AuthMethod) => {
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        language: languageState,
        theme: themeState,
        appPin: appPinState,
        authMethod: method,
        pinLength: pinLengthState,
      }, { merge: true });
      setAuthMethodState(method);
    } catch (error) {
      console.error('Error updating auth method');
      // Don't expose sensitive error details
    }
  };

  const setPinLength = async (length: PinLength) => {
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        language: languageState,
        theme: themeState,
        appPin: appPinState,
        authMethod: authMethodState,
        pinLength: length,
      }, { merge: true });
      setPinLengthState(length);
    } catch (error) {
      console.error('Error updating PIN length');
      // Don't expose sensitive error details
    }
  };

  const updateAppPin = async (currentPin: string, newPin: string): Promise<boolean> => {
    if (currentPin === appPinState) {
      try {
        await setDoc(doc(db, 'settings', 'app'), {
          language: languageState,
          theme: themeState,
          appPin: newPin,
          authMethod: authMethodState,
          pinLength: pinLengthState,
        }, { merge: true });
        setAppPinState(newPin);
        return true;
      } catch (error) {
        console.error('Error updating PIN');
        // Don't expose sensitive error details
        return false;
      }
    }
    return false;
  };

  const forceUpdateAppPin = async (newPin: string): Promise<void> => {
    try {
      await setDoc(doc(db, 'settings', 'app'), {
        language: languageState,
        theme: themeState,
        appPin: newPin,
        authMethod: authMethodState,
        pinLength: pinLengthState,
      }, { merge: true });
      setAppPinState(newPin);
    } catch (error) {
      console.error('Error force updating PIN');
      // Don't expose sensitive error details
      throw error;
    }
  };

  const updateUserProfile = async (profile: UserProfile) => {
    setUserProfileState(profile);
    try {
      await setDoc(doc(db, 'settings', USER_SETTINGS_DOC_ID), { userProfile: profile }, { merge: true });
    } catch (error) {
      console.error('Error updating userProfile in Firestore');
      // Don't expose sensitive error details
    }
  };

  // Firestore CRUD for Committees
  const addCommittee = async (committeeData: Omit<Committee, 'id' | 'payments' | 'payoutTurns' | 'memberIds'> & { memberIds?: string[] }): Promise<Committee> => {
    const payoutMethod = committeeData.payoutMethod || PayoutMethod.MANUAL;
    const newCommittee: Committee = {
      id: generateId(),
      title: committeeData.title,
      type: committeeData.type || CommitteeType.MONTHLY,
      startDate: committeeData.startDate || new Date().toISOString().split('T')[0],
      duration: committeeData.duration || 12,
      amountPerMember: committeeData.amountPerMember || 1000,
      payoutMethod: payoutMethod,
      memberIds: committeeData.memberIds || [],
      payments: [], 
      payoutTurns: [],
    };
    newCommittee.payoutTurns = initializePayoutTurns(newCommittee, payoutMethod);
    try {
      await setDoc(doc(db, 'committees', newCommittee.id), newCommittee as any);
      setCommitteesState((prev: Committee[]) => [...prev, newCommittee]);
      
      // Add notification for new committee
      const notification: Notification = {
        id: generateId(),
        type: NotificationType.COMMITTEE_UPDATE,
        title: t('committeeUpdate'),
        message: `${t('newCommittee')}: ${newCommittee.title}`,
        timestamp: new Date().toISOString(),
        isRead: false,
        committeeId: newCommittee.id,
        actionUrl: '/committees'
      };
      setNotificationsState(prev => [...prev, notification]);
    } catch (error) {
      console.error('Error adding committee to Firestore');
      // Don't expose sensitive error details
    }
    return newCommittee;
  };

  const updateCommittee = async (updatedCommittee: Committee) => {
    try {
      // Check if payout turns need to be recalculated
      const existingCommittee = committeesState.find(c => c.id === updatedCommittee.id);
      if (existingCommittee && (existingCommittee.payoutMethod !== updatedCommittee.payoutMethod || JSON.stringify(existingCommittee.memberIds.sort()) !== JSON.stringify(updatedCommittee.memberIds.sort()))) {
        console.log('Payout method or members changed, recalculating payout turns');
        console.log('Existing payout method:', existingCommittee.payoutMethod);
        console.log('New payout method:', updatedCommittee.payoutMethod);
        console.log('Existing payout turns:', existingCommittee.payoutTurns);
        
        // If only payout method changed (not members), preserve existing payout turns
        if (JSON.stringify(existingCommittee.memberIds.sort()) === JSON.stringify(updatedCommittee.memberIds.sort())) {
          console.log('Only payout method changed, preserving existing payout turns');
          
          // Keep the existing payout turns exactly as they are
          // This preserves all paid out statuses and dates
          updatedCommittee.payoutTurns = existingCommittee.payoutTurns;
          console.log('Preserved existing payout turns:', updatedCommittee.payoutTurns);
        } else {
          console.log('Members changed, generating new payout turns');
          // If members changed, use completely new payout turns
          const newPayoutTurns = initializePayoutTurns(updatedCommittee, updatedCommittee.payoutMethod);
          updatedCommittee.payoutTurns = newPayoutTurns;
        }
      }
      
      await updateDoc(doc(db, 'committees', updatedCommittee.id), updatedCommittee as any);
      setCommitteesState((prev: Committee[]) => prev.map((c: Committee) => {
        if (c.id === updatedCommittee.id) {
            return updatedCommittee;
        }
        return c;
    }));
    } catch (error) {
      console.error('Error updating committee in Firestore');
      // Don't expose sensitive error details
    }
  };
  
  const deleteCommittee = async (committeeId: string) => {
    try {
      const committeeToDelete = committeesState.find(c => c.id === committeeId);
      await deleteDoc(doc(db, 'committees', committeeId));
      setCommitteesState((prev: Committee[]) => prev.filter(c => c.id !== committeeId));
      
      // Add notification for deleted committee
      if (committeeToDelete) {
        const notification: Notification = {
          id: generateId(),
          type: NotificationType.COMMITTEE_UPDATE,
          title: t('committeeUpdate'),
          message: `${t('delete')}: ${committeeToDelete.title}`,
          timestamp: new Date().toISOString(),
          isRead: false,
          actionUrl: '/committees'
        };
        setNotificationsState(prev => [...prev, notification]);
      }
    } catch (error) {
      console.error('Error deleting committee from Firestore');
      // Don't expose sensitive error details
    }
  };

  const getCommitteeById = (committeeId: string) => committeesState.find(c => c.id === committeeId);

  // Firestore CRUD for Members
  const addMember = async (memberData: Omit<Member, 'id'>): Promise<Member> => {
    const newMember: Member = { ...memberData, id: generateId(), profilePictureUrl: memberData.profilePictureUrl || DEFAULT_PROFILE_PIC };
    try {
      await setDoc(doc(db, 'members', newMember.id), newMember as any);
      setMembersState((prev: Member[]) => [...prev, newMember]);
    } catch (error) {
      console.error('Error adding member to Firestore');
      // Don't expose sensitive error details
    }
    return newMember;
  };

  const updateMember = async (updatedMember: Member) => {
    try {
      await updateDoc(doc(db, 'members', updatedMember.id), updatedMember as any);
      setMembersState((prev: Member[]) => prev.map((m: Member) => m.id === updatedMember.id ? updatedMember : m));
    } catch (error) {
      console.error('Error updating member in Firestore');
      // Don't expose sensitive error details
    }
  };

  const deleteMember = async (memberId: string) => {
    console.log('Attempting to delete member:', memberId);
    try {
      await deleteDoc(doc(db, 'members', memberId));
      console.log('Member deleted from Firestore successfully');
      setMembersState((prev: Member[]) => prev.filter((m: Member) => m.id !== memberId));
      console.log('Member removed from local state');
    } catch (error) {
      console.error('Error deleting member from Firestore:', error);
      // Don't expose sensitive error details
    }
  };
  
  const getMemberById = (memberId: string) => membersState.find(m => m.id === memberId);

  const addMemberToCommittee = async (committeeId: string, memberId: string) => {
    try {
    setCommitteesState((prev: Committee[]) => prev.map((c: Committee) => {
        if (c.id === committeeId) {
        const updatedCommittee = { ...c, memberIds: [...c.memberIds, memberId] };
        updatedCommittee.payoutTurns = initializePayoutTurns(updatedCommittee, updatedCommittee.payoutMethod);
        // Update Firestore
        updateDoc(doc(db, 'committees', committeeId), {
          memberIds: updatedCommittee.memberIds,
          payoutTurns: updatedCommittee.payoutTurns
        });

        // Add notification for new member
        const member = membersState.find(m => m.id === memberId);
        if (member) {
            const notification: Notification = {
                id: generateId(),
                type: NotificationType.COMMITTEE_UPDATE,
                title: t('committeeUpdate'),
                message: `${member.name} was added to committee: ${c.title}`,
                timestamp: new Date().toISOString(),
                isRead: false,
                committeeId: c.id,
                memberId: member.id,
                actionUrl: `/committees/manage/${c.id}`
            };
            setNotificationsState(prev => [...prev, notification]);
        }

        return updatedCommittee;
      }
      return c;
    }));
    } catch (error) {
      console.error('Error adding member to committee in Firestore');
      // Don't expose sensitive error details
    }
  };
  
  const removeMemberFromCommittee = async (committeeId: string, memberId: string) => {
    console.log('Attempting to remove member from committee:', { committeeId, memberId });
    try {
    setCommitteesState(prev => prev.map(c => {
      if (c.id === committeeId) {
        const updatedMemberIds = c.memberIds.filter(id => id !== memberId);
        const updatedPayments = c.payments.filter(p => p.memberId !== memberId);
        const tempCommitteeForPayoutReinit = { ...c, memberIds: updatedMemberIds };
        const updatedPayoutTurns = initializePayoutTurns(tempCommitteeForPayoutReinit, c.payoutMethod);
          const updatedCommittee = {
          ...c,
          memberIds: updatedMemberIds,
          payments: updatedPayments, 
          payoutTurns: updatedPayoutTurns,
        };
          
          // Update Firestore
          updateDoc(doc(db, 'committees', committeeId), {
            memberIds: updatedMemberIds,
            payments: updatedPayments,
            payoutTurns: updatedPayoutTurns
          });
          
          console.log('Member removed from committee successfully');
          
          // Add notification for removed member
            const member = membersState.find(m => m.id === memberId);
            if (member) {
                const notification: Notification = {
                    id: generateId(),
                    type: NotificationType.COMMITTEE_UPDATE,
                    title: t('committeeUpdate'),
                    message: `${member.name} was removed from committee: ${c.title}`,
                    timestamp: new Date().toISOString(),
                    isRead: false,
                    committeeId: c.id,
                    memberId: member.id,
                    actionUrl: `/committees/manage/${c.id}`
                };
                setNotificationsState(prev => [...prev, notification]);
            }
          
          return updatedCommittee;
      }
      return c;
    }));
    } catch (error) {
      console.error('Error removing member from committee in Firestore:', error);
      // Don't expose sensitive error details
    }
  };

  const removeOneShareFromCommittee = async (committeeId: string, memberId: string) => {
    console.log('Attempting to remove one share from committee:', { committeeId, memberId });
    try {
      setCommitteesState(prev => prev.map(c => {
        if (c.id === committeeId) {
          // Find the first occurrence of the memberId and remove only that one
          const memberIndex = c.memberIds.indexOf(memberId);
          if (memberIndex === -1) {
            console.log('Member not found in committee');
            return c;
          }
          
          const updatedMemberIds = [...c.memberIds];
          updatedMemberIds.splice(memberIndex, 1);
          
          const tempCommitteeForPayoutReinit = { ...c, memberIds: updatedMemberIds };
          const updatedPayoutTurns = initializePayoutTurns(tempCommitteeForPayoutReinit, c.payoutMethod);
          const updatedCommittee = {
            ...c,
            memberIds: updatedMemberIds,
            payoutTurns: updatedPayoutTurns,
          };
          
          // Update Firestore
          updateDoc(doc(db, 'committees', committeeId), {
            memberIds: updatedMemberIds,
            payoutTurns: updatedPayoutTurns
          });
          
          console.log('One share removed from committee successfully');
          
          // Add notification for payout
          if (updatedPayoutTurns.some(turn => turn.memberId === memberId && turn.paidOut)) {
            const member = membersState.find(m => m.id === memberId);
            if (member) {
              const notification: Notification = {
                id: generateId(),
                type: NotificationType.COMMITTEE_UPDATE,
                title: t('payoutHistory'),
                message: `Payout of ${c.amountPerMember * c.memberIds.length} made to ${member.name} for committee: ${c.title}`,
                timestamp: new Date().toISOString(),
                isRead: false,
                committeeId: c.id,
                memberId: member.id,
                actionUrl: `/committees/manage/${c.id}`
              };
              setNotificationsState(prev => [...prev, notification]);
            }
          }
          
          return updatedCommittee;
        }
        return c;
      }));
    } catch (error) {
      console.error('Error removing one share from committee in Firestore:', error);
      // Don't expose sensitive error details
    }
  };

  const recordPayment = async (committeeId: string, paymentDetails: Omit<CommitteePayment, 'id'>) => {
    try {
    setCommitteesState((prev: Committee[]) => prev.map((c: Committee) => {
      if (c.id === committeeId) {
        const newPayment: CommitteePayment = {
          ...paymentDetails,
          id: generateId(), 
          status: (paymentDetails.status === 'Cleared' || paymentDetails.status === 'Pending') ? paymentDetails.status : 'Cleared',
        };
        const updatedCommittee = { ...c, payments: [...c.payments, newPayment] };
        // Update Firestore
        updateDoc(doc(db, 'committees', committeeId), { payments: updatedCommittee.payments });
        
        // Add notification for new payment
        const member = membersState.find(m => m.id === newPayment.memberId);
        if (member) {
            const notification: Notification = {
                id: generateId(),
                type: NotificationType.COMMITTEE_UPDATE,
                title: t('paymentHistory'),
                message: `Payment of ${newPayment.amountPaid} by ${member.name} for: ${c.title}`,
                timestamp: new Date().toISOString(),
                isRead: false,
                committeeId: c.id,
                memberId: newPayment.memberId,
                actionUrl: `/committees/manage/${c.id}`
            };
            setNotificationsState(prev => [...prev, notification]);
        }
        
        return updatedCommittee;
      }
      return c;
    }));
    } catch (error) {
      console.error('Error recording payment in Firestore');
      // Don't expose sensitive error details
    }
  };

  const getPaymentsForMemberByMonth = (committeeId: string, memberId: string, monthIndex: number): CommitteePayment[] => {
    const committee = committeesState.find(c => c.id === committeeId);
    if (!committee) return [];
    return committee.payments.filter(p => p.memberId === memberId && p.monthIndex === monthIndex && p.status === 'Cleared');
  };

  const updatePayoutTurn = async (committeeId: string, turnToUpdate: Committee['payoutTurns'][0]) => {
    try {
      console.log('Updating payout turn:', turnToUpdate);
      
    setCommitteesState((prev: Committee[]) => prev.map((c: Committee) => {
      if (c.id === committeeId) {
        const updatedCommittee = {
          ...c,
          payoutTurns: c.payoutTurns.map(pt => 
            (pt.memberId === turnToUpdate.memberId && pt.turnMonthIndex === turnToUpdate.turnMonthIndex) 
              ? { 
                  ...pt, 
                  paidOut: turnToUpdate.paidOut,
                  ...(turnToUpdate.payoutDate ? { payoutDate: turnToUpdate.payoutDate } : {})
                }
            : pt
          )
        };
          
          // Remove payoutDate property if it's undefined
          updatedCommittee.payoutTurns = updatedCommittee.payoutTurns.map(pt => {
            if (pt.memberId === turnToUpdate.memberId && pt.turnMonthIndex === turnToUpdate.turnMonthIndex) {
              const newPt = { ...pt };
              if (!turnToUpdate.payoutDate) {
                delete newPt.payoutDate;
              }
              return newPt;
            }
            return pt;
          });
          
          console.log('Updated committee payout turns:', updatedCommittee.payoutTurns);
          
        // Update Firestore
        updateDoc(doc(db, 'committees', committeeId), { payoutTurns: updatedCommittee.payoutTurns });
        
        // Add notification for payout
        if (turnToUpdate.paidOut) {
          const member = membersState.find(m => m.id === turnToUpdate.memberId);
          if (member) {
            const notification: Notification = {
              id: generateId(),
              type: NotificationType.COMMITTEE_UPDATE,
              title: t('payoutHistory'),
              message: `Payout of ${c.amountPerMember * c.memberIds.length} made to ${member.name} for committee: ${c.title}`,
              timestamp: new Date().toISOString(),
              isRead: false,
              committeeId: c.id,
              memberId: member.id,
              actionUrl: `/committees/manage/${c.id}`
            };
            setNotificationsState(prev => [...prev, notification]);
          }
        }
        
        return updatedCommittee;
      }
      return c;
    }));
    } catch (error) {
      console.error('Error updating payout turn in Firestore:', error);
      // Don't expose sensitive error details
    }
  };

  // Add a ref to track if settings have been loaded this session
  const settingsLoadedRef = React.useRef(false);

  const unlockApp = async (pin: string) => {
    try {
      // Only fetch from Firestore if settings not loaded this session
      if (!settingsLoadedRef.current) {
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          const currentPin = data.appPin || DEFAULT_APP_PIN;
          const currentAuthMethod = data.authMethod || AuthMethod.PIN;
          const currentPinLength = data.pinLength || PinLength.FOUR;
          // Update local states if different
          if (currentAuthMethod !== authMethodState) {
            setAuthMethodState(currentAuthMethod);
          }
          if (currentPinLength !== pinLengthState) {
            setPinLengthState(currentPinLength);
          }
          if (currentPin !== appPinState) {
            setAppPinState(currentPin);
          }
          settingsLoadedRef.current = true;
        }
      }
      // Check against the latest PIN from state
      if (pin === appPinState) {
        setIsLockedState(false);
        setTimeout(() => {
          resetAutoLockTimer();
        }, 100);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error checking PIN');
      return false;
    }
  };
  const lockApp = () => setIsLockedState(true);

  // Activity tracking functions
  const handleAutoLock = () => {
    setIsLockedState(true);
  };

  const resetAutoLockTimer = () => {
    if (autoLockTimer) {
      clearTimeout(autoLockTimer);
    }
    const newTimer = setTimeout(handleAutoLock, AUTO_LOCK_DURATION);
    setAutoLockTimer(newTimer);
    setLastActivity(Date.now());
  };

  const getAutoLockTimeRemaining = () => {
    const timeElapsed = Date.now() - lastActivity;
    const timeRemaining = AUTO_LOCK_DURATION - timeElapsed;
    return Math.max(0, timeRemaining);
  };

  // Track user activity
  useEffect(() => {
    const handleActivity = () => {
      if (!isLockedState) {
        resetAutoLockTimer();
      }
    };

    // Add event listeners for user activity - more selective to avoid interfering with inputs
    const events = [
      'mousedown', 'mousemove', 'scroll', 'touchstart', 'click',
      'wheel', 'drag', 'drop', 'contextmenu', 'dblclick', 'mouseenter', 'mouseleave'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, false); // Remove capture phase
    });

    // Also track window focus/blur events
    const handleWindowFocus = () => {
      if (!isLockedState) {
        resetAutoLockTimer();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && !isLockedState) {
        resetAutoLockTimer();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial timer setup
    if (!isLockedState) {
      resetAutoLockTimer();
    }

    return () => {
      // Cleanup event listeners
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, false);
      });
      
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Cleanup timer
      if (autoLockTimer) {
        clearTimeout(autoLockTimer);
      }
    };
  }, [isLockedState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoLockTimer) {
        clearTimeout(autoLockTimer);
      }
    };
  }, [autoLockTimer]);

  return (
    <AppContext.Provider value={{
      language: languageState,
      setLanguage,
      theme: themeState,
      setTheme,
      appPin: appPinState,
      authMethod: authMethodState,
      setAuthMethod,
      pinLength: pinLengthState,
      setPinLength,
      updateAppPin,
      forceUpdateAppPin,
      t,
      userProfile: userProfileState,
      updateUserProfile,
      committees: committeesState,
      addCommittee,
      updateCommittee,
      deleteCommittee,
      getCommitteeById,
      members: membersState,
      addMember,
      updateMember,
      deleteMember,
      getMemberById,
      addMemberToCommittee,
      removeMemberFromCommittee,
      removeOneShareFromCommittee,
      recordPayment,
      getPaymentsForMemberByMonth,
      updatePayoutTurn,
      isLocked: isLockedState,
      unlockApp,
      lockApp,
      isLoading: isLoadingState,
      setIsLoading: setIsLoadingState,
      isAuthSettingsLoaded,
      resetAutoLockTimer,
      getAutoLockTimeRemaining,
      // Notification methods
      notifications: notificationsState,
      addNotification: (notification) => {
        setNotificationsState((prev: Notification[]) => [...prev, { ...notification, id: generateId(), timestamp: new Date().toISOString(), isRead: false }]);
      },
      markNotificationAsRead: (id) => {
        setNotificationsState((prev: Notification[]) => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      },
      markAllNotificationsAsRead: () => {
        setNotificationsState((prev: Notification[]) => prev.map(n => ({ ...n, isRead: true })));
      },
      deleteNotification: (id) => {
        setNotificationsState((prev: Notification[]) => prev.filter(n => n.id !== id));
      },
      clearAllNotifications: () => setNotificationsState([]),
      getUnreadNotificationCount: () => notificationsState.filter(n => !n.isRead).length,
      setCommittees: setCommitteesState,
      setMembers: setMembersState,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};