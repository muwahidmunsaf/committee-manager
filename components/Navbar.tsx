import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Language } from '../types';
import { Button, UserCircleIcon, Cog6ToothIcon, Bars3Icon, XMarkIcon, LanguageIcon, LockClosedIcon, SunIcon, MoonIcon } from './UIComponents';
// @ts-ignore
import logo from '../assets/logo.png';

const Navbar: React.FC = () => {
  const { language, setLanguage, t, userProfile, lockApp, theme, setTheme } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-primary-dark text-white' : 'text-neutral-light hover:bg-primary-dark hover:text-white'
    } ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`;

  const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-base font-medium ${
      isActive ? 'bg-primary-dark dark:bg-primary text-white' : 'text-neutral-dark dark:text-neutral-light hover:bg-primary-dark dark:hover:bg-primary hover:text-white dark:hover:text-white'
    } ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`;

  return (
    <nav className="bg-primary shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between h-16 ${language === Language.UR ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center">
            <img src={logo} alt="Logo" className="h-10 w-10 mr-2" />
            <NavLink to="/" className={`flex-shrink-0 text-white text-xl font-bold ${language === Language.UR ? 'font-notoNastaliqUrdu ml-4' : 'mr-4'}`}>
              {t('appName')}
            </NavLink>
            <div className="hidden md:block">
              <div className={`flex items-baseline space-x-4 ${language === Language.UR ? 'space-x-reverse' : ''}`}>
                <NavLink to="/" className={navLinkClasses}>{t('dashboard')}</NavLink>
                <NavLink to="/committees" className={navLinkClasses}>{t('committees')}</NavLink>
                <NavLink to="/settings" className={navLinkClasses}>{t('settings')}</NavLink> 
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-3 rtl:space-x-reverse">
             <Button onClick={() => lockApp()} variant="ghost" size="sm" className="text-white hover:text-secondary">
              <LockClosedIcon className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              variant="ghost"
              size="sm"
              className="text-white hover:text-secondary"
              aria-label={t('theme')}
            >
              {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </Button>
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:text-secondary"
                onClick={() => handleLanguageChange(language === Language.EN ? Language.UR : Language.EN)}
                aria-label={t('language')}
              >
                <LanguageIcon className={`h-5 w-5 ${language === Language.UR ? 'ml-1' : 'mr-1'}`} /> {language === Language.EN ? 'اردو' : 'English'}
              </Button>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="p-1 rounded-full text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-dark focus:ring-white"
              aria-label={t('profile')}
            >
              <UserCircleIcon className="h-8 w-8" />
            </button>
          </div>
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-neutral-light hover:text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-darker border-t border-primary-light dark:border-primary-dark" id="mobile-menu">
          <div className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 ${language === Language.UR ? 'text-right' : 'text-left'}`}>
            <NavLink to="/" className={mobileNavLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>{t('dashboard')}</NavLink>
            <NavLink to="/committees" className={mobileNavLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>{t('committees')}</NavLink>
            <NavLink to="/profile" className={mobileNavLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>{t('profile')}</NavLink>
            <NavLink to="/settings" className={mobileNavLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>{t('settings')}</NavLink>
             <button
                onClick={() => {
                  handleLanguageChange(language === Language.EN ? Language.UR : Language.EN);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium text-neutral-dark dark:text-neutral-light hover:bg-primary-dark dark:hover:bg-primary hover:text-white ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}
              >
               <LanguageIcon className={`h-5 w-5 inline ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {language === Language.EN ? 'اردو' : 'English'}
            </button>
            <button
              onClick={() => { lockApp(); setIsMobileMenuOpen(false); }}
              className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium text-neutral-dark dark:text-neutral-light hover:bg-primary-dark dark:hover:bg-primary hover:text-white ${language === Language.UR ? 'text-right' : ''}`}
            >
              <LockClosedIcon className={`h-5 w-5 inline ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {t('appLock')}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
