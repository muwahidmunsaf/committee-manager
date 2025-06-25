import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Language, Theme } from '../types';
import { Button, UserCircleIcon, CogIcon, Bars3Icon, XMarkIcon, GlobeAltIcon, LockClosedIcon, SunIcon, MoonIcon, HomeIcon, UserGroupIcon, CreditCardIcon, BellIcon, ChartBarIcon, FolderIcon, ClockIcon, StarIcon, HeartIcon, TrophyIcon, GiftIcon, FireIcon, RocketLaunchIcon, AcademicCapIcon, BuildingOfficeIcon, HandRaisedIcon, LightBulbIcon, PuzzlePieceIcon, SparklesIcon2 } from './UIComponents';

const Navbar: React.FC = () => {
  const { language, setLanguage, t, userProfile, lockApp, theme, setTheme, notifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, getUnreadNotificationCount } = useAppContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setIsNotificationDropdownOpen(false);
      }
    };

    if (isNotificationDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationDropdownOpen]);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleNotificationClick = (notification: any) => {
    markNotificationAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    setIsNotificationDropdownOpen(false);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - notificationTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return t('justNow');
    if (diffInMinutes < 60) return t('minutesAgo', { minutes: diffInMinutes });
    if (diffInMinutes < 1440) return t('hoursAgo', { hours: Math.floor(diffInMinutes / 60) });
    return t('daysAgo', { days: Math.floor(diffInMinutes / 1440) });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment_overdue':
        return <ClockIcon className="h-4 w-4 text-red-500" />;
      case 'payout_upcoming':
        return <TrophyIcon className="h-4 w-4 text-yellow-500" />;
      case 'committee_update':
        return <BuildingOfficeIcon className="h-4 w-4 text-blue-500" />;
      case 'installment_update':
        return <CreditCardIcon className="h-4 w-4 text-purple-500" />;
      case 'installment_overdue':
        return <ClockIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <BellIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${
      isActive ? 'bg-primary-dark text-white' : 'text-neutral-light hover:bg-primary-dark hover:text-white'
    } ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`;

  const mobileNavLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `block px-3 py-2 rounded-md text-base font-medium ${
      isActive ? 'bg-primary-dark dark:bg-primary text-white' : 'text-neutral-dark dark:text-neutral-light hover:bg-primary-dark dark:hover:bg-primary hover:text-white dark:hover:text-white'
    } ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`;

  const unreadCount = getUnreadNotificationCount();

  return (
    <nav className="bg-primary shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between h-16 ${language === Language.UR ? 'flex-row-reverse' : ''}`}>
          <div className="flex items-center">
            <img src='/logo.png' alt="Logo" className="h-10 w-10 mr-2" />
            <NavLink to="/" className={`flex-shrink-0 text-white text-xl font-bold ${language === Language.UR ? 'font-notoNastaliqUrdu ml-4' : 'mr-4'}`}>
              {t('appName')}
            </NavLink>
            <div className="hidden md:block">
              <div className={`flex items-baseline space-x-4 ${language === Language.UR ? 'space-x-reverse' : ''}`}>
                <NavLink to="/" className={navLinkClasses}>{t('dashboard')}</NavLink>
                <NavLink to="/committees" className={navLinkClasses}>{t('committees')}</NavLink>
                <NavLink to="/installments" className={navLinkClasses}>{t('installments')}</NavLink>
                <NavLink to="/settings" className={navLinkClasses}>{t('settings')}</NavLink> 
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center space-x-3 rtl:space-x-reverse">
            {/* Notification Bell */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                className="p-2 rounded-md text-white hover:text-secondary hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white relative"
                aria-label="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown */}
              {isNotificationDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-darker rounded-lg shadow-lg border border-gray-200 dark:border-neutral-dark z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-neutral-dark">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('notifications')}</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            markAllNotificationsAsRead();
                            setIsNotificationDropdownOpen(false);
                          }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {t('markAllRead')}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('noNotifications')}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 dark:border-neutral-dark hover:bg-gray-50 dark:hover:bg-neutral-dark cursor-pointer transition-colors ${
                            !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

             <button
              onClick={() => lockApp()}
              className="p-2 rounded-md text-white hover:text-secondary hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              aria-label={t('appLock')}
            >
              <LockClosedIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK)}
              className="p-2 rounded-md text-white hover:text-secondary hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
              aria-label={t('theme')}
            >
              {theme === Theme.DARK ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <div className="relative">
              <button
                className="p-2 rounded-md text-white hover:text-secondary hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
                onClick={() => handleLanguageChange(language === Language.EN ? Language.UR : Language.EN)}
                aria-label={t('language')}
              >
                <GlobeAltIcon className={`h-5 w-5 ${language === Language.UR ? 'ml-1' : 'mr-1'}`} /> {language === Language.EN ? 'اردو' : 'English'}
              </button>
            </div>
            <button
              onClick={() => navigate('/profile')}
              className="p-1 rounded-full text-white hover:text-secondary hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-white"
              aria-label={t('profile')}
            >
              <UserCircleIcon className="h-8 w-8" />
            </button>
          </div>
          <div className="md:hidden flex items-center space-x-2 rtl:space-x-reverse">
            {/* Notification Bell for Mobile */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                onClick={() => setIsNotificationDropdownOpen(!isNotificationDropdownOpen)}
                className="p-2 rounded-md text-white hover:text-secondary hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white relative"
                aria-label="Notifications"
              >
                <BellIcon className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notification Dropdown for Mobile */}
              {isNotificationDropdownOpen && (
                <div className="absolute mt-2 w-72 -right-6 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-neutral-darker dark:ring-neutral-dark z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-neutral-dark">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('notifications')}</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={() => {
                            markAllNotificationsAsRead();
                            setIsNotificationDropdownOpen(false);
                          }}
                          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                          {t('markAllRead')}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                        {t('noNotifications')}
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 border-b border-gray-100 dark:border-neutral-dark hover:bg-gray-50 dark:hover:bg-neutral-dark cursor-pointer transition-colors ${
                            !notification.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start space-x-3">
                            {getNotificationIcon(notification.type)}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                                {formatTimeAgo(notification.timestamp)}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-secondary hover:bg-white/10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
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
            <NavLink to="/installments" className={mobileNavLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>{t('installments')}</NavLink>
            <NavLink to="/profile" className={mobileNavLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>{t('profile')}</NavLink>
            <NavLink to="/settings" className={mobileNavLinkClasses} onClick={() => setIsMobileMenuOpen(false)}>{t('settings')}</NavLink>
            <button
              onClick={() => { lockApp(); setIsMobileMenuOpen(false); }}
              className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium text-neutral-dark dark:text-neutral-light hover:bg-primary-dark dark:hover:bg-primary hover:text-white transition-all duration-200 ${language === Language.UR ? 'text-right' : ''}`}
            >
              <LockClosedIcon className={`h-5 w-5 inline ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {t('appLock')}
            </button>
            <button
              onClick={() => { setTheme(theme === Theme.DARK ? Theme.LIGHT : Theme.DARK); setIsMobileMenuOpen(false); }}
              className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium text-neutral-dark dark:text-neutral-light hover:bg-primary-dark dark:hover:bg-primary hover:text-white transition-all duration-200 ${language === Language.UR ? 'text-right' : ''}`}
              aria-label={t('theme')}
            >
              {theme === Theme.DARK ? <SunIcon className="h-5 w-5 inline mr-2" /> : <MoonIcon className="h-5 w-5 inline mr-2" />} {t('theme')}
            </button>
            <button
              className={`w-full text-left block px-3 py-2 rounded-md text-base font-medium text-neutral-dark dark:text-neutral-light hover:bg-primary-dark dark:hover:bg-primary hover:text-white transition-all duration-200 ${language === Language.UR ? 'text-right' : ''}`}
              onClick={() => { handleLanguageChange(language === Language.EN ? Language.UR : Language.EN); setIsMobileMenuOpen(false); }}
              aria-label={t('language')}
            >
              <GlobeAltIcon className={`h-5 w-5 inline ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {language === Language.EN ? 'اردو' : 'English'}
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
