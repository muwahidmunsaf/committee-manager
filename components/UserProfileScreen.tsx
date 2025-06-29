import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { UserProfile, Language } from '../types';
import { Button, Input } from './UIComponents';
import { isValidPakistaniCnic, isValidPakistaniPhone } from '../utils/appUtils';
import { DEFAULT_PROFILE_PIC } from '../constants';

const UserProfileScreen: React.FC = () => {
  const { t, userProfile, updateUserProfile, language } = useAppContext();
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setFormData(userProfile); // Sync with context if it changes elsewhere
  }, [userProfile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
        processedValue = processedValue.slice(0, 15); // Max length for XXXXX-XXXXXXX-X
    } else if (name === 'phone') {
        const digits = value.replace(/\D/g, '');
        if (digits.length <= 4) {
            processedValue = digits;
        } else {
            processedValue = `${digits.slice(0,4)}-${digits.slice(4,11)}`;
        }
        processedValue = processedValue.slice(0, 12); // Max length for 03XX-XXXXXXX
    }

    setFormData(prev => ({ ...prev, [name]: processedValue }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = language === Language.UR ? "نام ضروری ہے۔" : "Name is required.";
    if (!formData.phone.trim()) newErrors.phone = language === Language.UR ? "فون نمبر ضروری ہے۔" : "Phone is required.";
    else if (!isValidPakistaniPhone(formData.phone)) newErrors.phone = language === Language.UR ? "غلط فون فارمیٹ۔" : "Invalid phone format (03XX-XXXXXXX).";
    if (!formData.cnic.trim()) newErrors.cnic = language === Language.UR ? "شناختی کارڈ نمبر ضروری ہے۔" : "CNIC is required.";
    else if (!isValidPakistaniCnic(formData.cnic)) newErrors.cnic = language === Language.UR ? "غلط شناختی کارڈ فارمیٹ۔" : "Invalid CNIC format (XXXXX-XXXXXXX-X).";
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = language === Language.UR ? "غلط ای میل فارمیٹ۔" : "Invalid email format.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      updateUserProfile(formData);
      setIsEditing(false);
      // Could add a success toast/message here
    }
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profilePictureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera modal logic
  const openCameraModal = async () => {
    setCameraError('');
    setShowPhotoMenu(false);
    setShowCameraModal(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      setCameraError('Unable to access camera. Please allow camera access in your browser.');
    }
  };
  const closeCameraModal = () => {
    setShowCameraModal(false);
    setCameraError('');
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/png');
      setFormData(prev => ({ ...prev, profilePictureUrl: dataUrl }));
      closeCameraModal();
    }
  };

  return (
    <div className={`max-w-2xl mx-auto p-4 md:p-6 space-y-6 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
      <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light mb-6">{t('profile')}</h1>
      
      <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
        <div className="flex flex-col items-center space-y-4 mb-6 relative">
          <img 
            src={formData.profilePictureUrl || DEFAULT_PROFILE_PIC} 
            alt={t('profile')} 
            className="w-32 h-32 rounded-full object-cover border-4 border-primary-light dark:border-primary-dark cursor-pointer"
            onClick={() => isEditing && setShowPhotoMenu(true)}
          />
          {isEditing && showPhotoMenu && (
            <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-dark border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 p-2 flex flex-col space-y-1">
              <button type="button" className="text-sm text-primary hover:underline text-left px-4 py-2" onClick={() => { setShowPhotoMenu(false); document.getElementById('profilePicUpload')?.click(); }}>
                Choose Photo
              </button>
              <button type="button" className="text-sm text-primary hover:underline text-left px-4 py-2" onClick={openCameraModal}>
                Take Photo
              </button>
              <button type="button" className="text-xs text-gray-500 hover:underline text-left px-4 py-1" onClick={() => setShowPhotoMenu(false)}>
                Cancel
              </button>
            </div>
          )}
              <input type="file" id="profilePicUpload" className="hidden" accept="image/*" onChange={handleFileUpload} />
          <input type="file" id="profilePicCamera" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
          {isEditing && formData.profilePictureUrl && formData.profilePictureUrl !== DEFAULT_PROFILE_PIC && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              className="ml-2 rtl:mr-2 rtl:ml-0 text-xs text-red-500 hover:text-red-700"
              onClick={() => setFormData(prev => ({...prev, profilePictureUrl: DEFAULT_PROFILE_PIC}))}
            >
              {language === Language.UR ? "تصویر ہٹائیں" : "Remove Picture"}
            </Button>
          )}
          {/* Camera Modal */}
          {showCameraModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
              <div className="bg-white dark:bg-neutral-dark rounded-lg shadow-lg p-6 flex flex-col items-center">
                <h3 className="text-lg font-semibold mb-2">Take Photo</h3>
                {cameraError && <div className="text-red-500 mb-2">{cameraError}</div>}
                <video ref={videoRef} className="w-64 h-48 bg-black rounded mb-4" autoPlay playsInline />
                <div className="flex space-x-2">
                  <Button type="button" onClick={capturePhoto}>Capture</Button>
                  <Button type="button" variant="ghost" onClick={closeCameraModal}>{language === Language.UR ? "منسوخ کریں" : "Cancel"}</Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <ProfileField label={t('name')} value={formData.name} name="name" onChange={handleChange} error={errors.name} isEditing={isEditing} />
          <ProfileField label={t('phone')} value={formData.phone} name="phone" onChange={handleChange} error={errors.phone} isEditing={isEditing} maxLength={12} />
          <ProfileField label={t('cnic')} value={formData.cnic} name="cnic" onChange={handleChange} error={errors.cnic} isEditing={isEditing} maxLength={15} />
          <ProfileField label={t('email')} value={formData.email || ''} name="email" onChange={handleChange} error={errors.email} isEditing={isEditing} type="email" />
          <ProfileField label={t('address')} value={formData.address || ''} name="address" onChange={handleChange} error={errors.address} isEditing={isEditing} isTextarea={true} />
        </div>

        <div className={`mt-8 flex ${isEditing ? 'justify-between' : 'justify-end'} ${language === Language.UR ? 'flex-row-reverse space-x-reverse' : 'space-x-2'}`}>
          {isEditing ? (
            <>
              <Button variant="ghost" onClick={() => { setIsEditing(false); setFormData(userProfile); setErrors({}); }}>{t('cancel')}</Button>
              <Button onClick={handleSave}>{t('saveChanges')}</Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>{t('edit')} {t('profile')}</Button>
          )}
        </div>
      </div>
    </div>
  );
};

interface ProfileFieldProps {
  label: string;
  value: string;
  name: keyof UserProfile;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  isEditing: boolean;
  type?: string;
  isTextarea?: boolean;
  maxLength?: number;
}

const ProfileField: React.FC<ProfileFieldProps> = ({ label, value, name, onChange, error, isEditing, type = 'text', isTextarea = false, maxLength }) => {
  const { language, t } = useAppContext();
  const dir = language === Language.UR ? 'rtl' : 'ltr';

  if (isEditing) {
    if (isTextarea) {
      return (
        <div className="w-full">
          <label htmlFor={name} className={`block text-sm font-medium text-neutral-darker dark:text-neutral-light mb-1 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{label}</label>
          <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            rows={3}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none sm:text-sm text-neutral-darker dark:text-neutral-light bg-white dark:bg-neutral-dark 
              ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-primary focus:border-primary'} 
              ${dir === 'rtl' ? 'text-right' : 'text-left'}`}
          />
          {error && <p className={`mt-1 text-xs text-red-600 dark:text-red-400 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{error}</p>}
        </div>
      );
    }
    return <Input label={label} id={name} name={name} type={type} value={value} onChange={onChange} error={error} maxLength={maxLength} />;
  }

  return (
    <div>
      <p className={`text-sm font-medium text-gray-500 dark:text-gray-400 ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{label}</p>
      <p className={`mt-1 text-md text-neutral-darker dark:text-neutral-light ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>{value || (language === Language.UR ? 'فراہم نہیں کیا گیا' : 'Not provided')}</p>
    </div>
  );
};

export default UserProfileScreen;