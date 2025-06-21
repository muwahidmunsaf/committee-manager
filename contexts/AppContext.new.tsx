import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Language, Theme, Translations, Committee, Member, CommitteePayment, UserProfile, PayoutMethod, CommitteeType, AuthMethod, PinLength } from '../types';
import { APP_DATA_STORAGE_KEY, DEFAULT_PROFILE_PIC, DEFAULT_APP_PIN } from '../constants';
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
  recordPayment: (committeeId: string, paymentDetails: Omit<CommitteePayment, 'id'>) => void;
  getPaymentsForMemberByMonth: (committeeId: string, memberId: string, monthIndex: number) => CommitteePayment[];
  updatePayoutTurn: (committeeId: string, turn: Committee['payoutTurns'][0]) => void;
  isLocked: boolean;
  unlockApp: (pin: string) => boolean; 
  lockApp: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [languageState, setLanguageState] = useState<Language>(Language.EN);
  const [themeState, setThemeState] = useState<Theme>(Theme.LIGHT);
  const [appPinState, setAppPinState] = useState<string>(DEFAULT_APP_PIN);
  const [authMethodState, setAuthMethodState] = useState<AuthMethod>(AuthMethod.PIN);
  const [pinLengthState, setPinLengthState] = useState<PinLength>(PinLength.FOUR);
  const [isLockedState, setIsLockedState] = useState<boolean>(true);
  const [isLoadingState, setIsLoadingState] = useState<boolean>(false);
  const [userProfileState, setUserProfileState] = useState<UserProfile>({
    name: '',
    phone: '',
    cnic: '',
  });
  const [committeesState, setCommitteesState] = useState<Committee[]>([]);
  const [membersState, setMembersState] = useState<Member[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoadingState(true);
        const settingsDoc = await getDoc(doc(db, 'settings', 'app'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setLanguageState(data.language || Language.EN);
          setThemeState(data.theme || Theme.LIGHT);
          setAppPinState(data.appPin || DEFAULT_APP_PIN);
          setAuthMethodState(data.authMethod || AuthMethod.PIN);
          setPinLengthState(data.pinLength || PinLength.FOUR);
        }
        // ... rest of the existing fetchData function ...
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoadingState(false);
      }
    };
    fetchData();
  }, []);

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
      console.error('Error updating auth method:', error);
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
      console.error('Error updating PIN length:', error);
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
        console.error('Error updating PIN:', error);
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
      console.error('Error force updating PIN:', error);
      throw error;
    }
  };

  // ... rest of the existing functions ...

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
      recordPayment,
      getPaymentsForMemberByMonth,
      updatePayoutTurn,
      isLocked: isLockedState,
      unlockApp,
      lockApp,
      isLoading: isLoadingState,
      setIsLoading: setIsLoadingState,
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

export default AppContext; 