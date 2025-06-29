import { PAKISTANI_CNIC_REGEX, PAKISTANI_PHONE_REGEX } from '../constants';
import { Member, Committee, CommitteePayment, PayoutMethod, CommitteeType } from '../types';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const isValidPakistaniPhone = (phone: string): boolean => {
  return PAKISTANI_PHONE_REGEX.test(phone);
};

export const isValidPakistaniCnic = (cnic: string): boolean => {
  return PAKISTANI_CNIC_REGEX.test(cnic);
};

export const formatDate = (dateString?: string | Date, locale: string = 'en-US'): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    return 'Invalid Date';
  }
};

export const getCommitteeMonthName = (committeeStartDate: string, monthIndex: number, locale: string = 'en-US'): string => {
  const startDate = new Date(committeeStartDate);
  const targetDate = new Date(startDate.getFullYear(), startDate.getMonth() + monthIndex, startDate.getDate()); // Use start date's day
  return targetDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
};


export const calculateTotalPool = (committee: Committee): number => {
  return committee.memberIds.length * committee.amountPerMember * committee.duration; // Total pool is for the entire duration
};

export const getCurrentPeriodIndex = (committee: Committee): number => {
    const today = new Date();
    const startDate = new Date(committee.startDate);
    let currentPeriodIndex = 0;

    if (startDate > today) return -1; // Committee hasn't started

    switch (committee.type) {
        case CommitteeType.MONTHLY:
            currentPeriodIndex = (today.getFullYear() - startDate.getFullYear()) * 12 + (today.getMonth() - startDate.getMonth());
            break;
        case CommitteeType.WEEKLY:
            currentPeriodIndex = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));
            break;
        case CommitteeType.DAILY:
            currentPeriodIndex = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            break;
        default:
            currentPeriodIndex = 0;
    }
    // Ensure currentPeriodIndex is within committee duration and non-negative
    return Math.max(0, Math.min(currentPeriodIndex, committee.duration - 1));
};


export const calculateRemainingCollectionForPeriod = (committee: Committee, periodIndex: number): number => {
  let totalDueForPeriod = 0;
  let totalPaidForPeriod = 0;

  committee.memberIds.forEach(memberId => {
    totalDueForPeriod += committee.amountPerMember;
    const memberPaymentsForPeriod = committee.payments.filter(
        p => p.memberId === memberId && p.monthIndex === periodIndex && p.status === 'Cleared'
    );
    memberPaymentsForPeriod.forEach(payment => {
        totalPaidForPeriod += payment.amountPaid;
    });
  });
  const remaining = totalDueForPeriod - totalPaidForPeriod;
  return remaining > 0 ? remaining : 0;
};

export const getMemberName = (memberId: string, members: Member[]): string => {
  const member = members.find(m => m.id === memberId);
  return member ? member.name : 'Unknown Member';
};

export const initializeCommitteePayments = (_committee: Committee): CommitteePayment[] => {
  const payments: CommitteePayment[] = [];
  // This function is currently not used to pre-populate. Payments are added on-the-fly.
  // If pre-population were desired, it would look like this:
  // for (let i = 0; i < committee.duration; i++) {
  //   committee.memberIds.forEach(memberId => {
  //     payments.push({
  //       id: generateId(),
  //       memberId,
  //       monthIndex: i,
  //       amountPaid: 0,
  //       status: 'Pending', 
  //       paymentDate: '', 
  //       receiptGenerated: false,
  //     });
  //   });
  // }
  return payments;
};

export const initializePayoutTurns = (committee: Committee, payoutMethod: PayoutMethod): Committee['payoutTurns'] => {
  let memberIdsForTurns = [...committee.memberIds];

  if (payoutMethod === PayoutMethod.RANDOM) {
    // Simple Fisher-Yates shuffle
    for (let i = memberIdsForTurns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [memberIdsForTurns[i], memberIdsForTurns[j]] = [memberIdsForTurns[j], memberIdsForTurns[i]];
    }
  }
  // For PayoutMethod.MANUAL, we use sequential assignment.

  return memberIdsForTurns.map((memberId, index) => ({
    memberId,
    turnMonthIndex: index % committee.duration, 
    paidOut: false,
  }));
};

export function parseGeminiJsonResponse<T,>(jsonString: string): T | null {
  if (!jsonString) return null;
  let cleanedJsonString = jsonString.trim();
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanedJsonString.match(fenceRegex);
  if (match && match[2]) {
    cleanedJsonString = match[2].trim();
  }
  try {
    return JSON.parse(cleanedJsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON response');
    // Don't expose sensitive error details or original string content
    return null;
  }
}

/**
 * Optimizes an image using the Canvas API: resizes and compresses to JPEG.
 * @param file The image File or Blob to optimize.
 * @param maxSize The maximum width or height in pixels (default 800).
 * @param quality JPEG quality (0-1, default 0.7).
 * @returns Promise<Blob> The optimized image as a JPEG Blob.
 */
export async function optimizeImageWithCanvas(
  file: File | Blob,
  maxSize: number = 800,
  quality: number = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        let { width, height } = img;
        // Calculate new dimensions
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Image compression failed'));
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for optimization'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}