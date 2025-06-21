import React, { ReactNode, InputHTMLAttributes } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Language } from '../types'; 

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  ...props
}) => {
  const { t } = useAppContext();
  const baseStyle = "font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-darkest transition-colors duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center";
  
  const variantStyles = {
    primary: "bg-primary text-white hover:bg-primary-dark focus:ring-primary dark:bg-primary-dark dark:hover:bg-primary",
    secondary: "bg-secondary text-neutral-darker hover:bg-secondary-dark focus:ring-secondary",
    danger: "bg-red-500 text-white hover:bg-red-700 focus:ring-red-500",
    ghost: "bg-transparent text-primary dark:text-primary-light hover:bg-primary-light dark:hover:bg-neutral-dark hover:text-primary-dark dark:hover:text-primary focus:ring-primary",
  };

  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <LoadingSpinner size="sm" color={variant === 'primary' || variant === 'danger' ? "text-white" : (variant === 'ghost' ? "text-primary dark:text-primary-light" : "text-primary")} />
      ) : (
        children
      )}
    </button>
  );
};

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  showPasswordToggle?: boolean;
}

export const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  className = '', 
  size = 'md',
  showPasswordToggle = false,
  type,
  ...props 
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg'
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-neutral-darker dark:text-neutral-light mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={showPassword ? 'text' : type}
          className={`
            w-full rounded-lg border
            ${error ? 'border-red-500 dark:border-red-400' : 'border-neutral-light dark:border-neutral-dark'}
            bg-white dark:bg-neutral-darker
            text-neutral-darker dark:text-neutral-light
            focus:ring-2 focus:ring-primary focus:ring-opacity-50 focus:border-primary
            disabled:bg-neutral-lightest dark:disabled:bg-neutral-dark disabled:cursor-not-allowed
            ${sizeClasses[size]}
            ${className}
          `}
          {...props}
        />
        {showPasswordToggle && type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-dark dark:text-neutral-light hover:text-primary dark:hover:text-primary-light focus:outline-none"
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}
export const Textarea: React.FC<TextareaProps> = ({ label, id, error, className, ...props }) => {
  const { language } = useAppContext();
  const dir = language === Language.UR ? 'rtl' : 'ltr';
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className={`block text-sm font-medium text-neutral-darker dark:text-neutral-light mb-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{label}</label>}
      <textarea
        id={id}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none sm:text-sm text-neutral-darker dark:text-neutral-light bg-white dark:bg-neutral-dark
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'} 
          ${className || ''} ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
        {...props}
      />
      {error && <p className={`mt-1 text-xs text-red-600 dark:text-red-400 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{error}</p>}
    </div>
  );
};


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, id, error, options, className, ...props }) => {
  const { language } = useAppContext();
  const dir = language === Language.UR ? 'rtl' : 'ltr';
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className={`block text-sm font-medium text-neutral-darker dark:text-neutral-light mb-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{label}</label>}
      <select
        id={id}
        className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none sm:text-sm bg-white dark:bg-neutral-dark text-neutral-darker dark:text-neutral-light
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'} 
          ${className || ''} ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error && <p className={`mt-1 text-xs text-red-600 dark:text-red-400 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{error}</p>}
    </div>
  );
};


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  header?: React.ReactNode;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  isPrintable?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, header, children, size = 'md', isPrintable = false }) => {
  const { t, language } = useAppContext();
  const dir = language === Language.UR ? 'rtl' : 'ltr';

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-full h-full',
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70 p-4 print:bg-transparent print:p-0 ${isPrintable ? 'print-this-modal' : ''}`} dir={dir}>
      <div className={`bg-white dark:bg-neutral-darker rounded-lg shadow-xl p-0 w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col print:shadow-none print:rounded-none print:max-h-full print:h-full`}>
        <div className={`flex justify-between items-center p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 ${dir === 'rtl' ? 'flex-row-reverse' : ''} ${isPrintable ? 'modal-header-print-hide' : ''} print:border-none`}>
          {header ? header : (
            <>
          <h3 className={`text-lg font-semibold text-neutral-darker dark:text-neutral-light ${language === Language.UR ? 'font-notoNastaliqUrdu' : ''}`}>{title}</h3>
          <button onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
            <XMarkIcon className="h-6 w-6" />
          </button>
            </>
          )}
        </div>
        <div className="flex-grow overflow-y-auto p-4 md:p-6 print:overflow-visible print:p-0">
          {children}
        </div>
      </div>
    </div>
  );
};

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string; 
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', color = 'text-primary dark:text-primary-light', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-[6px]',
  };
  return (
    <div className={`animate-spin rounded-full border-solid border-t-transparent ${sizeClasses[size]} ${color} ${className || ''}`} role="status">
      <span className="sr-only">Loading...</span>
    </div>
  );
};


export const UserCircleIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

export const Cog6ToothIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-1.007 1.11-.962a5.249 5.249 0 0 1 .432.062l.343.106c.435.134.84.349 1.196.638l.45.289c.351.226.732.408 1.13.541l.415.138a5.249 5.249 0 0 1 .062.432c.045.55.52.992 1.072.992.553 0 1.028-.442 1.073-.992a5.25 5.25 0 0 1 .062-.432l.415-.138c.398-.133.78-.315 1.13-.541l.45-.289c.356-.289.761-.504 1.196-.638l.343-.106a5.25 5.25 0 0 1 .432-.062c.551-.045.936.42.98.962.048.55-.283 1.018-.758 1.255l-.42.21a5.249 5.249 0 0 1-1.383.678l-.362.133c-.407.15-.776.355-1.103.607l-.317.247c-.287.225-.538.488-.732.778l-.203.303c-.15.222-.28.46-.388.712l-.11.258c-.143.34-.238.705-.288 1.082l-.02.327a5.25 5.25 0 0 1-.432.062c-.551.045-1.007-.42-1.007-.962 0-.55.455-.992.992-1.072l.02-.327c.05-.377.145-.742.288-1.082l.11-.258c.108-.252.238-.49.388-.712l.203-.303c.194-.29.445-.553.732-.778l.317-.247c.327-.252.696-.457 1.103-.607l.362-.133a5.25 5.25 0 0 1 1.383-.678l.42-.21c.475-.236.806-.704.758-1.255-.046-.542-.518-.917-.98-.962a5.25 5.25 0 0 1-.432.062l-.343.106c-.435.134-.84.349-1.196.638l-.45.289c-.351.226-.732.408-1.13.541l-.415.138a5.25 5.25 0 0 1-.062.432c-.045.55-.52.992-1.072.992s-1.028-.442-1.073-.992a5.25 5.25 0 0 1-.062-.432l-.415-.138c-.398-.133-.78-.315-1.13-.541l-.45-.289c-.356-.289-.761-.504-1.196-.638l-.343-.106a5.25 5.25 0 0 1-.432-.062c-.551-.045-.936.42-.98.962-.048.55.283 1.018.758 1.255l.42.21a5.25 5.25 0 0 1 1.383.678l.362.133c.407.15.776.355 1.103.607l.317.247c.287.225.538.488.732.778l-.203.303c-.15.222-.28.46-.388.712l-.11.258c-.143.34-.238.705-.288 1.082l-.02.327a5.25 5.25 0 0 1-.432.062c-.551.045-1.007-.42-1.007-.962s.455-.992.992-1.072l.02-.327c.05-.377.145-.742.288-1.082l.11-.258c.108-.252.238-.49.388-.712l.203-.303c.194-.29.445-.553.732-.778l.317-.247c.327-.252.696-.457 1.103-.607l.362-.133a5.25 5.25 0 0 1 1.383-.678l.42-.21c.475-.236.806-.704.758-1.255Z" />
  </svg>
);

export const Bars3Icon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
);

export const XMarkIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
  </svg>
);

export const PlusCircleIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.56 0c1.153 0 2.24.032 3.22.096A48.108 48.108 0 0 1 12 5.493m2.752.297C13.686 5.617 12.872 5.5 12 5.5s-1.686.117-2.752.297M8.38 7.525c.307-.123.63-.235.966-.334M15.62 7.525c-.307-.123-.63-.235-.966-.334m0 0a52.502 52.502 0 0 0-3.328 0M12 18.75a.75.75 0 0 1-.75-.75V13.5a.75.75 0 0 1 1.5 0v4.5a.75.75 0 0 1-.75-.75Z" />
  </svg>
);

export const PencilSquareIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
</svg>
);

export const ChartPieIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 1 0 7.5 7.5h-7.5V6Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0 0 13.5 3v7.5Z" />
  </svg>
);

export const DocumentTextIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
</svg>
);

export const UsersIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.742-.511.75.75 0 0 0 .421-.655V8.084a.75.75 0 0 0-.421-.655A9.091 9.091 0 0 0 18 6.92m-12 0a9.091 9.091 0 0 0-3.742.511.75.75 0 0 0-.421.655V17.55a.75.75 0 0 0 .421.655A9.094 9.094 0 0 0 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m-10.118 3.197c-.341-.536-.626-1.12-.796-1.742M12 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 9a9 9 0 1 0-18 0 9 9 0 0 0 18 0Z" />
  </svg>
);

export const LanguageIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 .437-.246m-.437.246V3.545M3 5.621a47.904 47.904 0 0 0 .448 4.093l.365 2.404M3 5.621a32.915 32.915 0 0 0 .195-1.928M3 5.621a32.61 32.61 0 0 0-.528 1.954m1.954-2.482a48.474 48.474 0 0 1 .437-.246m4.739 10.128c.744-.452 1.396-1.026 1.93-1.648m-1.93 1.648L5.75 7.5m2.71 11.25L5.75 7.5m0 0a24.792 24.792 0 0 1-1.382-.016M5.75 7.5c-.347.345-.694.704-1.033 1.079" />
  </svg>
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L21 5.25l-.813 2.846a4.5 4.5 0 0 0-3.09 3.09L14.25 12l2.846.813a4.5 4.5 0 0 0 3.09 3.09L21 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09Z" />
  </svg>
);

export const ArrowPathIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

export const LockClosedIcon: React.FC<{className?: string}> = ({className = ""}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={`w-6 h-6 ${className}`}>
    <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
  </svg>
);

export const CalendarDaysIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5m-9-3.75h.008v.008H12v-.008ZM12 15h.008v.008H12V15Zm0 2.25h.008v.008H12v-.008ZM9.75 15h.008v.008H9.75V15Zm0 2.25h.008v.008H9.75v-.008ZM7.5 15h.008v.008H7.5V15Zm0 2.25h.008v.008H7.5v-.008Zm6.75-4.5h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V15Zm0 2.25h.008v.008h-.008v-.008Zm2.25-4.5h.008v.008H16.5v-.008Zm0 2.25h.008v.008H16.5V15Z" />
  </svg>
);

export const WalletIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 12m18 0v6.75A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V12m18 0v-6.75A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25V12m15-3.75h-6m6 3.75h-6m6 3.75h-6M9 12v9.75M15 12v9.75M12 12v9.75" />
  </svg>
);

export const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

export const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
  </svg>
);

export const ArrowRightIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

export const CurrencyDollarIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m0 0c-3.314 0-6-2.239-6-5s2.686-5 6-5 6 2.239 6 5-2.686 5-6 5z" />
  </svg>
);

// Sun icon for light mode
export const SunIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07 6.07l-1.42-1.42M6.34 6.34L4.92 4.92m12.02 0l-1.42 1.42M6.34 17.66l-1.42 1.42" />
  </svg>
);

// Moon icon for dark mode
export const MoonIcon: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-6 h-6 ${className}`}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
  </svg>
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export const EyeSlashIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
  </svg>
);