export enum Language {
  EN = 'en',
  UR = 'ur',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

export enum AuthMethod {
  PIN = 'pin',
  PASSWORD = 'password',
}

export enum PinLength {
  FOUR = 4,
  SIX = 6,
  EIGHT = 8,
}

export interface UserProfile {
  name: string;
  phone: string;
  cnic: string;
  email?: string;
  address?: string;
  profilePictureUrl?: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  cnic: string;
  address?: string;
  profilePictureUrl?: string; // For member's photo
  joiningDate: string; // ISO Date string
  emergencyContact?: string;
  notes?: string;
}

export enum CommitteeType {
  MONTHLY = 'Monthly',
  WEEKLY = 'Weekly',
  DAILY = 'Daily',
}

export enum PayoutMethod {
  MANUAL = 'Manual',
  RANDOM = 'Random',
}

// Represents an individual payment/installment
export interface CommitteePayment {
  id: string; // Unique ID for this specific payment/installment
  memberId: string;
  monthIndex: number; // 0-indexed month of committee duration this payment applies to
  amountPaid: number;
  paymentDate: string; // ISO Date string for this specific installment
  // Status of this specific installment (e.g., "Cleared", "Pending Verification")
  status: 'Cleared' | 'Pending'; 
  receiptGenerated?: boolean; // If a receipt was generated for THIS installment
}

export interface CommitteeMemberTurn {
  memberId: string;
  turnMonthIndex: number; // 0-indexed month for payout
  paidOut: boolean;
  payoutDate?: string; // ISO Date string
}

export interface Committee {
  id:string;
  title: string;
  type: CommitteeType;
  startDate: string; // ISO Date string
  duration: number; // e.g., 6 (months, weeks, days depending on type)
  amountPerMember: number; // This is the amount due per period (e.g., per month)
  memberIds: string[];
  payments: CommitteePayment[]; // Array of individual payment transactions/installments
  payoutTurns: CommitteeMemberTurn[]; 
  autoReminderDays?: number; 
  payoutMethod: PayoutMethod;
}

export interface AppTranslations {
  [key: string]: string;
}

export interface Translations {
  [Language.EN]: AppTranslations;
  [Language.UR]: AppTranslations;
}

// For Gemini
export interface AISummaryRequest {
  committeeTitle: string;
  totalMembers: number;
  pendingPayments: number; // This might refer to members with outstanding balances for current month
  language: Language;
}

export interface GroundingChunkWeb {
  uri: string;
  title: string;
}
export interface GroundingChunk {
  web?: GroundingChunkWeb;
  retrievedContext?: {
    uri: string;
    title: string;
  };
}
export interface GroundingMetadata {
  searchQuery?: string;
  groundingChunks?: GroundingChunk[];
}

export interface Candidate {
  groundingMetadata?: GroundingMetadata;
  // other candidate properties
}

export interface GeminiResponseData {
  text: string;
  candidates?: Candidate[];
}

// Data structure for settings that might be persisted beyond AppContext's main data key
export interface SettingsData {
    language: Language;
    theme: Theme;
    appPin: string;
    authMethod: AuthMethod;
    pinLength: PinLength;
    // Potentially other app-wide settings not directly tied to core data
}

// Notification types
export enum NotificationType {
  PAYMENT_DUE = 'payment_due',
  PAYMENT_OVERDUE = 'payment_overdue',
  PAYOUT_UPCOMING = 'payout_upcoming',
  COMMITTEE_UPDATE = 'committee_update',
  SYSTEM = 'system'
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string; // ISO Date string
  isRead: boolean;
  committeeId?: string;
  memberId?: string;
  actionUrl?: string; // URL to navigate to when notification is clicked
}
