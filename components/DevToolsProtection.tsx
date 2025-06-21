import React, { useState, useEffect } from 'react';
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

  // Detect developer tools opening
  useEffect(() => {
    let devtools = {
      open: false,
      orientation: null as string | null
    };

    const threshold = 160;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true;
          devtools.orientation = widthThreshold ? 'vertical' : 'horizontal';
          setIsDevToolsOpen(true);
          setShowAuthModal(true);
        }
      } else {
        devtools.open = false;
        devtools.orientation = null;
      }
    };

    // Listen for custom event from HTML script
    const handleDevToolsDetected = () => {
      setIsDevToolsOpen(true);
      setShowAuthModal(true);
    };

    // Check on key combinations
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 key
      if (e.key === 'F12') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
      }
      
      // Ctrl+Shift+I (Windows/Linux) or Cmd+Option+I (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
      }
      
      // Ctrl+Shift+C (Windows/Linux) or Cmd+Option+C (Mac)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
      }
      
      // Ctrl+U (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
        e.preventDefault();
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
      }
    };

    // Check on right-click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      setIsDevToolsOpen(true);
      setShowAuthModal(true);
    };

    // Check on devtools opening via console
    const checkConsole = () => {
      const startTime = new Date();
      debugger;
      const endTime = new Date();
      if (endTime.getTime() - startTime.getTime() > 100) {
        setIsDevToolsOpen(true);
        setShowAuthModal(true);
      }
    };

    // Set up event listeners
    window.addEventListener('devtools-detected', handleDevToolsDetected);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Periodic check for devtools
    const interval = setInterval(checkDevTools, 1000);
    
    // Check console access
    const consoleInterval = setInterval(checkConsole, 2000);

    return () => {
      window.removeEventListener('devtools-detected', handleDevToolsDetected);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(interval);
      clearInterval(consoleInterval);
    };
  }, []);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    if (authKey === DEV_TOOLS_AUTH_KEY) {
      setIsAuthenticated(true);
      setShowAuthModal(false);
      setIsDevToolsOpen(false);
      setAuthKey('');
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
                onChange={(e) => setAuthKey(e.target.value)}
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