import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './contexts/AppContext';
import Navbar from './components/Navbar';
import DashboardScreen from './components/DashboardScreen';
import CommitteeManagement, { CommitteeDetailScreen } from './components/CommitteeManagement';
import UserProfileScreen from './components/UserProfileScreen';
import SettingsScreen from './components/SettingsScreen'; // Import SettingsScreen
import DevToolsProtection from './components/DevToolsProtection'; // Import DevToolsProtection
import { Button, Input, LoadingSpinner, LockClosedIcon } from './components/UIComponents';
import { Language, AuthMethod } from './types'; 
import { sendLoginNotification } from './services/emailService';

const AppLockScreen: React.FC = () => {
  const { t, unlockApp, language, userProfile, updateAppPin, forceUpdateAppPin, authMethod, pinLength } = useAppContext();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotData, setForgotData] = useState({ name: '', phone: '', cnic: '', email: '' });
  const [forgotError, setForgotError] = useState('');
  const [canReset, setCanReset] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Login attempt tracking
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockEndTime, setLockEndTime] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Check if user is locked out on component mount
  React.useEffect(() => {
    const savedAttempts = localStorage.getItem('auth_attempts');
    const savedLockEndTime = localStorage.getItem('lock_expiry');
    
    if (savedAttempts) {
      setLoginAttempts(parseInt(savedAttempts));
    }
    
    if (savedLockEndTime) {
      const lockEnd = new Date(savedLockEndTime);
      const now = new Date();
      
      if (lockEnd > now) {
        setIsLocked(true);
        setLockEndTime(lockEnd);
        const remaining = Math.ceil((lockEnd.getTime() - now.getTime()) / 1000);
        setTimeRemaining(remaining);
      } else {
        // Lock period has expired, reset
        localStorage.removeItem('auth_attempts');
        localStorage.removeItem('lock_expiry');
        setLoginAttempts(0);
        setIsLocked(false);
        setLockEndTime(null);
        setTimeRemaining(0);
      }
    }
  }, []);

  // Timer for countdown
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isLocked && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Lock period has ended
            setIsLocked(false);
            setLockEndTime(null);
            setLoginAttempts(0);
            localStorage.removeItem('auth_attempts');
            localStorage.removeItem('lock_expiry');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isLocked, timeRemaining]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is locked out
    if (isLocked) {
      setError(language === Language.UR 
        ? `بہت زیادہ کوششیں۔ براہ کرم ${formatTime(timeRemaining)} منٹ انتظار کریں۔`
        : `Too many attempts. Please wait ${formatTime(timeRemaining)} minutes.`);
      return;
    }
    
    setError('');
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    // Validate input based on auth method
    if (authMethod === AuthMethod.PIN) {
      if (!/^\d+$/.test(pin)) {
        setError(language === Language.UR 
          ? 'پن صرف نمبروں پر مشتمل ہونا چاہیے۔'
          : 'PIN must contain only digits.');
        setLoading(false);
        setPin('');
        return;
      }
      if (pin.length !== pinLength) {
        setError(language === Language.UR 
          ? `پن ${pinLength} ہندسوں کا ہونا چاہیے۔`
          : `PIN must be exactly ${pinLength} digits.`);
        setLoading(false);
        return;
      }
    }

    try {
      const success = await unlockApp(pin);
    if (!success) {
        // Increment failed attempts
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('auth_attempts', newAttempts.toString());
        
        if (newAttempts >= 3) {
          // Lock user out for 2 minutes
          const lockEnd = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
          setIsLocked(true);
          setLockEndTime(lockEnd);
          setTimeRemaining(120); // 2 minutes in seconds
          localStorage.setItem('lock_expiry', lockEnd.toISOString());
          
          setError(language === Language.UR 
            ? 'بہت زیادہ غلط کوششیں۔ براہ کرم 2 منٹ انتظار کریں۔'
            : 'Too many failed attempts. Please wait 2 minutes.');
        } else {
          setError(language === Language.UR 
            ? (authMethod === AuthMethod.PIN ? 'غلط پن۔ دوبارہ کوشش کریں۔' : 'غلط پاس ورڈ۔ دوبارہ کوشش کریں۔')
            : `Incorrect ${authMethod === AuthMethod.PIN ? 'PIN' : 'password'}. Try again.`);
    }
      } else {
        // Successful login - reset attempts
        setLoginAttempts(0);
        setIsLocked(false);
        setLockEndTime(null);
        setTimeRemaining(0);
        localStorage.removeItem('auth_attempts');
        localStorage.removeItem('lock_expiry');
        
        // Send login notification
        try {
          const deviceInfo = `${navigator.platform} - ${navigator.userAgent}`;
          const loginTime = new Date().toLocaleString();
          if (userProfile.email) {
            await sendLoginNotification(
              userProfile.email,
              userProfile.name,
              loginTime,
              deviceInfo
            );
          }
        } catch (emailError) {
          console.error('Failed to send login notification');
          // Don't block the login process if email fails
        }
      }
    } catch (error) {
      setError(language === Language.UR 
        ? 'کوئی خرابی پیش آگئی۔ دوبارہ کوشش کریں۔'
        : 'An error occurred. Please try again.');
    } finally {
    setLoading(false);
    setPin(''); 
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (authMethod === AuthMethod.PIN) {
      // Only allow digits in PIN mode
      const onlyDigits = value.replace(/[^0-9]/g, '');
      setPin(onlyDigits);
    } else {
      setPin(value);
    }
  };

  const handleForgotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'cnic') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 5) {
        processedValue = digits;
      } else if (digits.length <= 12) {
        processedValue = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      } else {
        processedValue = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
      }
      processedValue = processedValue.slice(0, 15); // XXXXX-XXXXXXX-X
    } else if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 4) {
        processedValue = digits;
      } else {
        processedValue = `${digits.slice(0,4)}-${digits.slice(4,11)}`;
      }
      processedValue = processedValue.slice(0, 12); // 03XX-XXXXXXX
    }
    setForgotData({ ...forgotData, [name]: processedValue });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (
      forgotData.name.trim() === userProfile.name.trim() &&
      forgotData.phone.trim() === userProfile.phone.trim() &&
      forgotData.cnic.trim() === userProfile.cnic.trim() &&
      (userProfile.email ? forgotData.email.trim() === userProfile.email.trim() : true)
    ) {
      setCanReset(true);
    } else {
      setForgotError(language === Language.UR ? "درج کردہ معلومات درست نہیں ہیں۔" : "Provided information does not match our records.");
    }
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setResetSuccess('');
    if (newPin !== confirmPin) {
      setForgotError(language === Language.UR ? "پن مماثل نہیں ہیں۔" : "PINs do not match.");
      return;
    }
    if (newPin.length < pinLength) {
      setForgotError(language === Language.UR 
        ? `پن کم از کم ${pinLength} ہندسوں کا ہونا چاہیے۔` 
        : `${authMethod === AuthMethod.PIN ? 'PIN' : 'Password'} must be at least ${pinLength} digits.`);
      return;
    }
    try {
      await forceUpdateAppPin(newPin);
      setResetSuccess(language === Language.UR 
        ? (authMethod === AuthMethod.PIN ? 'پن کامیابی سے تبدیل ہو گیا!' : 'پاس ورڈ کامیابی سے تبدیل ہو گیا!')
        : (authMethod === AuthMethod.PIN ? 'PIN has been reset successfully!' : 'Password has been reset successfully!'));
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setCanReset(false);
        setShowForgot(false);
        setNewPin('');
        setConfirmPin('');
      }, 2000);
    } catch (err) {
      setForgotError(language === Language.UR 
        ? "پن تبدیل نہیں ہو سکا۔" 
        : `Failed to reset ${authMethod === AuthMethod.PIN ? 'PIN' : 'password'}.`);
    }
  };

  return (
    <div className="fixed inset-0 bg-primary bg-opacity-95 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-neutral-darker p-8 rounded-xl shadow-2xl w-full max-w-sm text-center">
        <img src="/assets/logo.png" alt="Asad Mobile's Shop Logo" className="h-24 w-auto mx-auto mb-2" />
        <LockClosedIcon className="w-16 h-16 text-primary mx-auto mb-2" />
        <h2 className={`text-2xl font-bold text-neutral-darker dark:text-neutral-light mb-2 ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>
          {showForgot 
            ? (language === Language.UR ? 'پن ری سیٹ کریں' : `Reset ${authMethod === AuthMethod.PIN ? 'PIN' : 'Password'}`) 
            : t('appLock')}
        </h2>
        {!showForgot && (
          <>
            <p className={`text-sm text-neutral-dark dark:text-neutral-light mb-4 ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>
              {authMethod === AuthMethod.PIN 
                ? (language === Language.UR 
                    ? `براہ کرم ${pinLength} ہندسوں کا پن درج کریں`
                    : `Please enter your ${pinLength}-digit PIN`)
                : (language === Language.UR 
                    ? 'براہ کرم اپنا پاس ورڈ درج کریں'
                    : 'Please enter your password')}
            </p>
            
            {/* Show remaining attempts */}
            {!isLocked && loginAttempts > 0 && (
              <p className={`text-sm text-orange-600 dark:text-orange-400 mb-2 ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>
                {language === Language.UR 
                  ? `${3 - loginAttempts} کوششیں باقی ہیں`
                  : `${3 - loginAttempts} attempts remaining`}
              </p>
            )}
            
            {/* Show lockout status */}
            {isLocked && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                <p className={`text-sm text-red-600 dark:text-red-400 text-center ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>
                  {language === Language.UR 
                    ? `اکاؤنٹ لاک ہو گیا ہے۔ براہ کرم ${formatTime(timeRemaining)} انتظار کریں۔`
                    : `Account locked. Please wait ${formatTime(timeRemaining)}.`}
                </p>
              </div>
            )}
            
        <form onSubmit={handleSubmit} className="space-y-6">
          <Input 
            type="password" 
            value={pin}
                onChange={(e) => {
                  // Only allow digits in PIN mode
                  if (authMethod === AuthMethod.PIN) {
                    const onlyDigits = e.target.value.replace(/[^0-9]/g, '');
                    setPin(onlyDigits);
                  } else {
                    setPin(e.target.value);
                  }
                }}
                maxLength={authMethod === AuthMethod.PIN ? pinLength : undefined}
                placeholder={authMethod === AuthMethod.PIN ? '●'.repeat(pinLength) : ''}
                className="text-center"
                inputMode={authMethod === AuthMethod.PIN ? "numeric" : "text"}
                showPasswordToggle={authMethod === AuthMethod.PASSWORD}
            error={error}
                disabled={isLocked}
          />
              <Button 
                type="submit" 
                className="w-full" 
                isLoading={loading} 
                size="lg"
                disabled={isLocked}
              >
            {t('unlock')}
          </Button>
        </form>
            <button 
              className="mt-4 text-primary underline text-sm" 
              onClick={() => setShowForgot(true)}
              disabled={isLocked}
            >
              {language === Language.UR 
                ? (authMethod === AuthMethod.PIN ? 'پن بھول گئے؟' : 'پاس ورڈ بھول گئے؟')
                : `Forgot ${authMethod === AuthMethod.PIN ? 'PIN' : 'password'}?`}
            </button>
          </>
        )}
        {showForgot && !canReset && (
          <>
            <div className="mb-2 text-sm text-neutral-dark dark:text-neutral-light text-left">
              {language === Language.UR ? 'براہ کرم اپنی شناخت کی تصدیق کریں۔' : 'Please verify your identity to reset your PIN.'}
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-2 mt-1 text-left">
              <Input label={t('name')} name="name" value={forgotData.name} onChange={handleForgotChange} required />
              <Input label={t('phone')} name="phone" value={forgotData.phone} onChange={handleForgotChange} required maxLength={12} />
              <Input label={t('cnic')} name="cnic" value={forgotData.cnic} onChange={handleForgotChange} required maxLength={15} />
              <Input label={t('email')} name="email" value={forgotData.email} onChange={handleForgotChange} required={!!userProfile.email} type="email" />
              {forgotError && <p className="text-red-500 text-sm">{forgotError}</p>}
              <div className="flex justify-between gap-2 mt-2">
                <Button type="button" variant="ghost" className="w-1/2" onClick={() => { setShowForgot(false); setForgotError(''); setForgotData({ name: '', phone: '', cnic: '', email: '' }); }}>
                  {t('cancel')}
                </Button>
                <Button type="submit" className="w-1/2">{language === Language.UR ? 'تصدیق کریں' : 'Verify'}</Button>
              </div>
            </form>
          </>
        )}
        {showForgot && canReset && !showSuccess && (
          <form onSubmit={handleResetPin} className="space-y-2 mt-2 text-left">
            <Input 
              label={authMethod === AuthMethod.PIN 
                ? (language === Language.UR ? 'نیا پن' : 'New PIN')
                : (language === Language.UR ? 'نیا پاس ورڈ' : 'New Password')}
              type="password" 
              value={newPin} 
              onChange={e => setNewPin(e.target.value)} 
              required 
              maxLength={authMethod === AuthMethod.PASSWORD ? undefined : pinLength}
              showPasswordToggle={authMethod === AuthMethod.PASSWORD}
            />
            <Input 
              label={authMethod === AuthMethod.PIN
                ? (language === Language.UR ? 'پن کی تصدیق کریں' : 'Confirm PIN')
                : (language === Language.UR ? 'پاس ورڈ کی تصدیق کریں' : 'Confirm Password')}
              type="password" 
              value={confirmPin} 
              onChange={e => setConfirmPin(e.target.value)} 
              required 
              maxLength={authMethod === AuthMethod.PASSWORD ? undefined : pinLength}
              showPasswordToggle={authMethod === AuthMethod.PASSWORD}
            />
            {forgotError && <p className="text-red-500 text-sm">{forgotError}</p>}
            <div className="flex justify-between gap-2 mt-2">
              <Button type="button" variant="ghost" className="w-1/2" onClick={() => { setShowForgot(false); setCanReset(false); setForgotError(''); setForgotData({ name: '', phone: '', cnic: '', email: '' }); }}>
                {t('cancel')}
              </Button>
              <Button type="submit" className="w-1/2">
                {language === Language.UR 
                  ? (authMethod === AuthMethod.PIN ? 'پن سیٹ کریں' : 'پاس ورڈ سیٹ کریں')
                  : (authMethod === AuthMethod.PIN ? 'Set PIN' : 'Set Password')}
              </Button>
            </div>
          </form>
        )}
        {showSuccess && (
          <div className="mt-6 text-green-600 text-lg font-semibold">
            {resetSuccess}
          </div>
        )}
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const { language, isLocked, isLoading: appIsLoading } = useAppContext();

  return (
    <DevToolsProtection>
      <BrowserRouter>
        <div className={`min-h-screen flex flex-col bg-neutral-light dark:bg-neutral-darkest text-neutral-darker dark:text-neutral-light ${language === Language.UR ? 'font-notoNastaliqUrdu' : 'font-inter'}`} dir={language === Language.UR ? 'rtl' : 'ltr'}>
          {isLocked && <AppLockScreen />}
          {!isLocked && <Navbar />}
          <main className={`flex-grow w-full max-w-7xl mx-auto ${isLocked ? 'blur-sm pointer-events-none' : ''}`}>
            {appIsLoading && !isLocked && ( 
              <div className="fixed inset-0 bg-white bg-opacity-75 dark:bg-neutral-darkest dark:bg-opacity-75 flex items-center justify-center z-[999]">
                <LoadingSpinner size="lg" />
              </div>
            )}
            <Routes>
              <Route path="/" element={isLocked ? <Navigate to="/" /> : <DashboardScreen />} />
              <Route path="/committees" element={isLocked ? <Navigate to="/" /> : <CommitteeManagement />} />
              <Route path="/committees/:committeeId" element={isLocked ? <Navigate to="/" /> : <CommitteeDetailScreen />} />
              <Route path="/profile" element={isLocked ? <Navigate to="/" /> : <UserProfileScreen />} />
              <Route path="/settings" element={isLocked ? <Navigate to="/" /> : <SettingsScreen />} /> {/* Add Settings route */}
              <Route path="*" element={<Navigate to="/" />} /> 
            </Routes>
          </main>
          {!isLocked && (
            <footer className={`py-4 text-center text-sm text-neutral-DEFAULT dark:text-gray-400 ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>
              © {new Date().getFullYear()} Asad Mobile's Shop. {language === Language.UR ? "جملہ حقوق محفوظ ہیں." : "All rights reserved."}
            </footer>
          )}
        </div>
      </BrowserRouter>
    </DevToolsProtection>
  );
};

export default App;
