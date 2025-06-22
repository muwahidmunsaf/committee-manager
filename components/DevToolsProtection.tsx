import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Button, Input, LockClosedIcon } from './UIComponents';
import { DEV_TOOLS_AUTH_KEY } from '../constants';

interface DevToolsProtectionProps {
  children: React.ReactNode;
}

const DevToolsProtection: React.FC<DevToolsProtectionProps> = ({ children }) => {
  const { language, t, userProfile } = useAppContext();
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authKey, setAuthKey] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyPressRef = useRef<number>(Date.now());

  // Enhanced developer tools detection - CATCH ALL METHODS
  useEffect(() => {
    let devtools = {
      open: false,
      orientation: null as string | null
    };

    const threshold = 160;

    // Method 1: Window size detection
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true;
          devtools.orientation = widthThreshold ? 'vertical' : 'horizontal';
          setIsDevToolsOpen(true);
          setShowAuthModal(true);
          startRedirectTimer();
        }
      } else {
        devtools.open = false;
        devtools.orientation = null;
      }
    };

    // Method 2: Listen for custom event from HTML script
    const handleDevToolsDetected = () => {
      setIsDevToolsOpen(true);
      setShowAuthModal(true);
      startRedirectTimer();
    };

    // Method 3: Enhanced key combinations - BLOCK ALL DEVTools METHODS
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key - always block
      if (e.key === 'F12') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
        startRedirectTimer();
        return false;
      }
      
      // Block all devtools shortcuts regardless of authentication state
      // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
        startRedirectTimer();
        return false;
      }
      
      // Ctrl+Shift+C (Windows/Linux) or Cmd+Option+C (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
        startRedirectTimer();
        return false;
      }
      
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
        startRedirectTimer();
        return false;
      }
      
      // Ctrl+Shift+J (Windows/Linux) or Cmd+Option+J (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
        startRedirectTimer();
        return false;
      }
    };

    // Method 4: Right-click detection
    const handleContextMenu = (e: MouseEvent) => {
      // Block right-click if devtools are detected and user is not authenticated
      if (isDevToolsOpen && !isAuthenticated) {
        e.preventDefault();
        setShowAuthModal(true);
        startRedirectTimer();
      }
    };

    // Method 5: Additional console detection (stealthy)
    const checkConsoleAccess = () => {
      try {
        const start = performance.now();
        // Use a stealthy approach that doesn't expose file info
        const testElement = document.createElement('div');
        testElement.style.display = 'none';
        testElement.id = 'devtools-test-react';
        document.body.appendChild(testElement);
        
        // Use a different approach that doesn't log to console
        const test = new Function('return performance.now()');
        const end = test();
        
        document.body.removeChild(testElement);
        
        if (end - start > 50) {
          if (!isDevToolsOpen) {
            setIsDevToolsOpen(true);
            setShowAuthModal(true);
            startRedirectTimer();
          }
        }
      } catch (e) {
        // Silent catch - don't expose any information
      }
    };

    // Method 6: Focus/blur detection
    const handleFocusChange = () => {
      // Check if devtools might have opened
      setTimeout(() => {
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
          if (!isDevToolsOpen) {
            setIsDevToolsOpen(true);
            setShowAuthModal(true);
            startRedirectTimer();
          }
        }
      }, 100);
    };

    // Method 7: Persistent devtools check - ALWAYS MONITOR
    const persistentCheck = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        // Devtools are open, ensure protection is active
        if (!isDevToolsOpen || !showAuthModal) {
          setIsDevToolsOpen(true);
          setShowAuthModal(true);
          startRedirectTimer();
        }
      }
    };

    // Set up event listeners
    window.addEventListener('devtools-detected', handleDevToolsDetected);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);
    
    // Periodic checks
    const interval = setInterval(checkDevTools, 500);
    const consoleInterval = setInterval(checkConsoleAccess, 2000);
    const persistentInterval = setInterval(persistentCheck, 1000); // Check every second

    return () => {
      window.removeEventListener('devtools-detected', handleDevToolsDetected);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
      clearInterval(interval);
      clearInterval(consoleInterval);
      clearInterval(persistentInterval);
    };
  }, [isAuthenticated, isDevToolsOpen, showAuthModal]);

  // Redirect timer functionality - SILENT BACKGROUND TIMER
  const startRedirectTimer = () => {
    // Clear any existing timers
    if (redirectTimer) {
      clearTimeout(redirectTimer);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Reset time left
    setTimeLeft(10);
    lastKeyPressRef.current = Date.now();
    
    // Start silent countdown (no visible display)
    const countdown = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdown);
          // Force redirect to Google.com regardless of devtools state
          forceRedirectToGoogle();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Set the main redirect timer
    const timer = setTimeout(() => {
      forceRedirectToGoogle();
    }, 10000);
    
    setRedirectTimer(timer);
    countdownIntervalRef.current = countdown;
  };

  const stopRedirectTimer = () => {
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      setRedirectTimer(null);
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    setTimeLeft(10);
  };

  // Force redirect function
  const forceRedirectToGoogle = () => {
    // Clear all timers
    stopRedirectTimer();
    
    // Force redirect regardless of current state
    try {
      window.location.replace('https://www.google.com');
    } catch (e) {
      // Fallback if replace fails
      window.location.href = 'https://www.google.com';
    }
  };

  // Handle key input with inactivity detection
  const handleKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setAuthKey(newValue);
    
    // Update last key press time
    lastKeyPressRef.current = Date.now();
    
    // Clear existing inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    // Set new inactivity timer (5 seconds)
    inactivityTimerRef.current = setTimeout(() => {
      // Check if user has been inactive for 5 seconds
      const timeSinceLastKeyPress = Date.now() - lastKeyPressRef.current;
      if (timeSinceLastKeyPress >= 5000) {
        forceRedirectToGoogle();
      }
    }, 5000);
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authKey === DEV_TOOLS_AUTH_KEY) {
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setIsDevToolsOpen(false);
      setAuthKey('');
      stopRedirectTimer();
    } else {
      setAuthError(
        language === 'ur' 
          ? 'غلط تصدیقی کلید۔ براہ کرم دوبارہ کوشش کریں۔' 
          : 'Invalid authentication key. Please try again.'
      );
      setAuthKey('');
    }
  };

  const handleCancel = () => {
    setShowAuthModal(false);
    setIsDevToolsOpen(false);
    setAuthKey('');
    setAuthError('');
    stopRedirectTimer();
  };

  // If authenticated or devtools not detected, show normal content
  if (isAuthenticated || !isDevToolsOpen) {
    return <>{children}</>;
  }

  // Show authentication modal
  return (
    <>
      {children}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white dark:bg-neutral-darker p-8 rounded-xl shadow-2xl w-full max-w-md text-center">
            <LockClosedIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className={`text-2xl font-bold text-neutral-darker dark:text-neutral-light mb-4 ${language === 'ur' ? 'font-notoNastaliqUrdu' : ''}`}>
              {language === 'ur' ? 'ڈویلپر ٹولز تک رسائی' : 'Developer Tools Access'}
            </h2>
            <p className={`text-sm text-neutral-dark dark:text-neutral-light mb-6 ${language === 'ur' ? 'font-notoNastaliqUrdu' : ''}`}>
              {language === 'ur' 
                ? 'ڈویلپر ٹولز تک رسائی کے لیے تصدیقی کلید درکار ہے۔' 
                : 'Authentication key required to access developer tools.'}
            </p>
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <Input
                label={language === 'ur' ? 'تصدیقی کلید' : 'Authentication Key'}
                type="password"
                value={authKey}
                onChange={handleKeyInput}
                required
                placeholder={language === 'ur' ? 'کلید درج کریں' : 'Enter key'}
              />
              
              {authError && (
                <p className="text-red-500 text-sm">{authError}</p>
              )}
              
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleCancel}
                  className="flex-1"
                >
                  {language === 'ur' ? 'منسوخ کریں' : 'Cancel'}
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1"
                >
                  {language === 'ur' ? 'تصدیق کریں' : 'Authenticate'}
                </Button>
              </div>
            </form>
            
            <p className={`text-xs text-neutral-DEFAULT dark:text-gray-400 mt-4 ${language === 'ur' ? 'font-notoNastaliqUrdu' : ''}`}>
              {language === 'ur' 
                ? 'یہ حفاظتی اقدام آپ کی ایپلیکیشن کی حفاظت کے لیے ہے۔' 
                : 'This security measure protects your application.'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default DevToolsProtection; 