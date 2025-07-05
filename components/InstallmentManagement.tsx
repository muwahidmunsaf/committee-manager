import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Installment, Language, Committee } from '../types';
import { Button, Input, Modal, PlusCircleIcon, FolderIcon, PencilSquareIcon, TrashIcon, CreditCardIcon } from './UIComponents';
import { useAppContext } from '../contexts/AppContext';
import { DEFAULT_PROFILE_PIC } from '../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Cropper, { ReactCropperElement } from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import { optimizeImageWithCanvas } from '../utils/appUtils';

const openCameraWithBackPreference = async (
  onStream: (stream: MediaStream) => void,
  onError: (err: any) => void
) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
    onStream(stream);
  } catch (err) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      onStream(stream);
    } catch (err2) {
      onError(err2);
    }
  }
};

const InstallmentForm: React.FC<{ initialData?: Partial<Installment>; onClose: () => void; onSuccess: (installment: Installment) => void; }> = ({ initialData, onClose, onSuccess }) => {
  const { t, language } = useAppContext();
  const [formData, setFormData] = useState<Partial<Installment>>({
    buyerName: '',
    phone: '',
    cnic: '',
    address: '',
    mobileName: '',
    advancePayment: 0,
    totalPayment: 0,
    monthlyInstallment: 0,
    startDate: new Date().toISOString().split('T')[0],
    duration: 12,
    profilePictureUrl: '',
    cnicImageUrl: '',
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showProfilePhotoMenu, setShowProfilePhotoMenu] = useState(false);
  const [showCnicPhotoMenu, setShowCnicPhotoMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [photoType, setPhotoType] = useState<'profile' | 'cnic' | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const { addInstallment, updateInstallment } = useAppContext();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cropType, setCropType] = useState<'profile' | 'cnic' | null>(null);
  const cropperRef = useRef<ReactCropperElement>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const overlayAspect = 1.6; // ATM card aspect ratio (width:height)
  const overlayWidth = 320; // px
  const overlayHeight = overlayWidth / overlayAspect;
  const overlayBox = { x: 80, y: 40, width: overlayWidth, height: overlayHeight };

  const capitalizeWords = (str: string) => str.replace(/\b\w/g, c => c.toUpperCase());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue = value;
    if (name === 'buyerName' || name === 'mobileName') {
      processedValue = capitalizeWords(value);
    }
    if (name === 'cnic') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 5) {
        processedValue = digits;
      } else if (digits.length <= 12) {
        processedValue = `${digits.slice(0, 5)}-${digits.slice(5)}`;
      } else {
        processedValue = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
      }
      processedValue = processedValue.slice(0, 15);
    } else if (name === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length <= 4) {
        processedValue = digits;
      } else {
        processedValue = `${digits.slice(0,4)}-${digits.slice(4,11)}`;
      }
      processedValue = processedValue.slice(0, 12);
    }
    setFormData(prev => {
      const updated = { ...prev, [name]: type === 'number' ? parseFloat(processedValue) || 0 : processedValue };
      if (
        (name === 'advancePayment' || name === 'totalPayment' || name === 'monthlyInstallment') &&
        updated.totalPayment && updated.monthlyInstallment
      ) {
        const advance = updated.advancePayment || 0;
        const total = updated.totalPayment || 0;
        const perMonth = updated.monthlyInstallment || 1;
        const months = Math.ceil((total - advance) / perMonth);
        updated.duration = months > 0 ? months : 1;
      }
      return updated;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cnic') => {
    const file = event.target.files?.[0];
    if (file) {
      const optimizedBlob = await optimizeImageWithCanvas(file, 1000, 0.7);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropSrc(reader.result as string);
        setCropType(type);
        setShowCropper(true);
      };
      reader.readAsDataURL(optimizedBlob);
    }
  };

  useEffect(() => {
    if (!showCameraModal) return;

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: cameraFacingMode,
            width: { ideal: 640 },
            height: { ideal: 384 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
          setCameraStream(stream);
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('Camera error:', error);
        setCameraError('Failed to access camera');
      }
    };

    startCamera();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCameraModal]);

  const openCameraModal = useCallback((type: 'profile' | 'cnic') => {
    setCameraError('');
    setShowProfilePhotoMenu(false);
    setShowCnicPhotoMenu(false);
    setPhotoType(type);
    setShowCameraModal(true);
    setCameraFacingMode(type === 'profile' ? 'user' : 'environment');
  }, []);

  const closeCameraModal = () => {
    setShowCameraModal(false);
    setCameraError('');
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };
  const capturePhoto = () => {
    if (!videoRef.current || !photoType) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    if (photoType === 'cnic') {
      // Crop to overlay box (centered 240x150px in 640x384px video)
      const videoW = video.videoWidth;
      const videoH = video.videoHeight;
      const cropW = 240;
      const cropH = 150;
      const scale = videoH / 256; // 256 is h-64 in px, so scale overlay to video size
      const cropWidth = cropW * scale;
      const cropHeight = cropH * scale;
      const cropX = (videoW - cropWidth) / 2;
      const cropY = (videoH - cropHeight) / 2;
      canvas.width = cropWidth;
      canvas.height = cropHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        setCropSrc(canvas.toDataURL('image/png'));
        setCropType('cnic');
        setShowCropper(true);
      }
      closeCameraModal();
      return;
    }
    // Profile: full frame
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      setCropSrc(canvas.toDataURL('image/png'));
      setCropType(photoType);
      setShowCropper(true);
    }
      closeCameraModal();
  };

  const handleCropConfirm = () => {
    if (cropperRef.current && cropperRef.current.cropper) {
      const croppedDataUrl = cropperRef.current.cropper.getCroppedCanvas().toDataURL();
      if (cropType === 'profile') {
        setFormData(prev => ({ ...prev, profilePictureUrl: croppedDataUrl }));
      } else if (cropType === 'cnic') {
        setFormData(prev => ({ ...prev, cnicImageUrl: croppedDataUrl }));
      }
      setShowCropper(false);
      setCropSrc(null);
      setCropType(null);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.buyerName?.trim()) newErrors.buyerName = t('buyerNameRequired');
    if (!formData.phone?.trim()) newErrors.phone = t('phoneRequired');
    if (!formData.cnic?.trim()) newErrors.cnic = t('cnicRequired');
    if (!formData.mobileName?.trim()) newErrors.mobileName = t('mobileNameRequired');
    if (!formData.totalPayment || formData.totalPayment <= 0) newErrors.totalPayment = t('totalPaymentRequired');
    if (!formData.monthlyInstallment || formData.monthlyInstallment <= 0) newErrors.monthlyInstallment = t('monthlyInstallmentRequired');
    if (!formData.startDate) newErrors.startDate = t('startDateRequired');
    if (!formData.duration || formData.duration <= 0) newErrors.duration = t('durationRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (formData.id) {
      const updated = { ...(formData as Installment) };
      await updateInstallment(updated);
      onSuccess(updated);
    } else {
      const created = await addInstallment(formData as Omit<Installment, 'id' | 'payments' | 'status'>);
      onSuccess(created);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative flex flex-col items-center space-y-2 mb-3">
        <img
          src={formData.profilePictureUrl || DEFAULT_PROFILE_PIC || ''}
          alt="Buyer Picture"
          className="w-24 h-24 rounded-full object-cover border-2 border-primary-light dark:border-primary-dark cursor-pointer"
          onClick={() => {
            if (formData.profilePictureUrl && formData.profilePictureUrl !== DEFAULT_PROFILE_PIC) {
              setPreviewImage(formData.profilePictureUrl as string);
            }
          }}
        />
        <div
          className="text-xs text-primary mt-1 cursor-pointer underline hover:text-primary-dark"
          onClick={() => { setShowProfilePhotoMenu(true); setShowCnicPhotoMenu(false); }}
        >
          {t('uploadPhoto')}
        </div>
        {(showProfilePhotoMenu || showCnicPhotoMenu) && (
          <div className="fixed inset-0 z-[1001] flex items-end justify-center bg-black bg-opacity-40">
            <div className="bg-white dark:bg-neutral-dark rounded-t-lg shadow-lg w-full max-w-md mx-auto p-4 flex flex-col gap-2 mb-0">
        {showProfilePhotoMenu && (
                <>
                  <Button type="button" className="w-full" onClick={() => { setShowProfilePhotoMenu(false); document.getElementById('buyerProfilePicUpload')?.click(); }}>{t('uploadPhoto')}</Button>
                  <Button type="button" className="w-full" onClick={() => {
                    setShowProfilePhotoMenu(false);
                    if (isMobile) {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'user';
                      input.onchange = (e: any) => handleFileUpload(e, 'profile');
                      input.click();
                    } else {
                      openCameraModal('profile');
                    }
                  }}>{t('takePhoto')}</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowProfilePhotoMenu(false)}>{t('cancel')}</Button>
                </>
              )}
              {showCnicPhotoMenu && (
                <>
                  <Button type="button" className="w-full" onClick={() => { setShowCnicPhotoMenu(false); document.getElementById('buyerCnicPicUpload')?.click(); }}>{t('uploadCnicImage')}</Button>
                  <Button type="button" className="w-full" onClick={() => {
                    setShowCnicPhotoMenu(false);
                    if (isMobile) {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.capture = 'environment';
                      input.onchange = (e: any) => handleFileUpload(e, 'cnic');
                      input.click();
                    } else {
                      openCameraModal('cnic');
                    }
                  }}>{t('takePicture')}</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowCnicPhotoMenu(false)}>{t('cancel')}</Button>
                </>
              )}
            </div>
          </div>
        )}
        <input type="file" id="buyerProfilePicUpload" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'profile')} />
        <input type="file" id="buyerProfilePicCamera" className="hidden" accept="image/*" capture="environment" onChange={e => handleFileUpload(e, 'profile')} />
        <input type="file" id="buyerCnicPicUpload" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'cnic')} />
        {formData.profilePictureUrl && formData.profilePictureUrl !== DEFAULT_PROFILE_PIC && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 rtl:mr-2 rtl:ml-0 text-xs text-red-500 hover:text-red-700"
            onClick={() => setFormData(prev => ({ ...prev, profilePictureUrl: DEFAULT_PROFILE_PIC }))}
          >
            {t('removePicture')}
          </Button>
        )}
      </div>
      <Input name="buyerName" label={t('buyerName')} value={formData.buyerName || ''} onChange={handleChange} error={errors.buyerName} required />
      <Input name="phone" label={t('phone')} value={formData.phone || ''} onChange={handleChange} error={errors.phone} required maxLength={12} />
      <Input name="cnic" label={t('cnic')} value={formData.cnic || ''} onChange={handleChange} error={errors.cnic} required maxLength={15} />
      <Input name="address" label={t('address')} value={formData.address || ''} onChange={handleChange} />
      <Input name="mobileName" label={t('mobileName')} value={formData.mobileName || ''} onChange={handleChange} error={errors.mobileName} required />
      <Input name="advancePayment" type="number" label={t('advancePayment')} value={formData.advancePayment?.toString() || ''} onChange={handleChange} />
      <Input name="totalPayment" type="number" label={t('totalPayment')} value={formData.totalPayment?.toString() || ''} onChange={handleChange} error={errors.totalPayment} required />
      <Input name="monthlyInstallment" type="number" label={t('monthlyInstallment')} value={formData.monthlyInstallment?.toString() || ''} onChange={handleChange} error={errors.monthlyInstallment} required />
      <Input name="startDate" type="date" label={t('startDate')} value={formData.startDate || ''} onChange={handleChange} error={errors.startDate} required />
      <Input name="duration" type="number" label={t('duration')} value={formData.duration?.toString() || ''} onChange={handleChange} error={errors.duration} required />
      {formData.duration && formData.payments && (
        <div className="text-sm text-neutral-DEFAULT dark:text-gray-400">{t('remainingInstallments')}: {formData.duration - formData.payments.length}</div>
      )}
      {formData.totalPayment && (
        <div className="text-sm text-neutral-DEFAULT dark:text-gray-400">{t('remainingAmount')}: PKR {(formData.totalPayment - (formData.advancePayment || 0)).toLocaleString()}</div>
      )}
      <div className="mt-4 flex flex-col items-center">
        <img
          src={formData.cnicImageUrl || ''}
          alt="CNIC"
          className="w-24 h-16 object-cover border-2 border-primary-light dark:border-primary-dark cursor-pointer"
          onClick={() => {
            if (formData.cnicImageUrl) setPreviewImage(formData.cnicImageUrl as string);
          }}
          style={{ display: formData.cnicImageUrl ? 'block' : 'none' }}
        />
        <Button type="button" size="sm" onClick={() => { setShowCnicPhotoMenu(true); setShowProfilePhotoMenu(false); }}>
          {formData.cnicImageUrl ? t('changeCnicImage') : t('uploadCnicImage')}
        </Button>
      </div>
      {showCameraModal && (
        <div className="fixed inset-0 z-[1000] flex flex-col justify-center items-center bg-black bg-opacity-80 w-full h-full">
          <div className="bg-white dark:bg-neutral-dark rounded-lg shadow-lg p-4 flex flex-col items-center w-full max-w-xs mx-auto">
            <h3 className="text-lg font-semibold mb-2">{photoType === 'cnic' ? t('captureCnic') : t('captureProfilePicture')}</h3>
            {cameraError && <div className="text-red-500 mb-2 text-center">{cameraError}</div>}
            <div className="relative w-full h-64 mb-4">
              <video ref={videoRef} className="w-full h-64 bg-black rounded" autoPlay playsInline style={{ display: 'block' }} />
              {photoType === 'cnic' && (
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  width: '240px',
                  height: '150px',
                  transform: 'translate(-50%, -50%)',
                  border: '3px solid #0e7490',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  pointerEvents: 'none',
                }} />
              )}
            </div>
            <div className="flex flex-col gap-2 w-full">
              <Button type="button" className="w-full" onClick={capturePhoto}>{t('capture')}</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={closeCameraModal}>{t('cancel')}</Button>
              {photoType === 'profile' && (
                <Button variant="ghost" className="w-full" onClick={() => setCameraFacingMode(cameraFacingMode === 'user' ? 'environment' : 'user')}>
                  {cameraFacingMode === 'user' ? 'Switch to Back Camera' : 'Switch to Front Camera'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white dark:bg-neutral-dark rounded-lg shadow-lg p-4 flex flex-col items-center relative">
            <img src={previewImage || ''} alt="Preview" className="max-w-xs max-h-[70vh] rounded" />
            <Button type="button" className="mt-4" onClick={() => setPreviewImage(null)}>{t('cancel')}</Button>
          </div>
        </div>
      )}
      {showCropper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
          <div className="bg-white dark:bg-neutral-dark rounded-lg shadow-lg p-4 flex flex-col items-center relative w-full max-w-md mx-auto">
            <Cropper
              src={cropSrc || ''}
              style={{ height: 300, width: '100%' }}
              aspectRatio={cropType === 'profile' ? 1 : 1.6}
              guides={true}
              viewMode={1}
              dragMode="move"
              scalable={true}
              cropBoxResizable={true}
              cropBoxMovable={true}
              ref={cropperRef}
            />
            <div className="flex gap-2 mt-4">
              <Button onClick={handleCropConfirm}>{t('confirm')}</Button>
              <Button variant="ghost" onClick={() => setShowCropper(false)}>{t('cancel')}</Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit">{formData.id ? t('saveChanges') : t('createInstallment')}</Button>
      </div>
    </form>
  );
};

const InstallmentManagement: React.FC = () => {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | undefined>(undefined);
  const [search, setSearch] = useState('');
  const { installments, deleteInstallment, isLoading, t, language, committees, members, userProfile } = useAppContext();
  const navigate = useNavigate();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openReportModal, setOpenReportModal] = useState<null | { installment: Installment, memberCommittees: Committee[] }>(null);
  const [showReportDropdown, setShowReportDropdown] = useState(false);

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Closed'>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(false);

  const handleOpenFormModal = (installment?: Installment) => {
    setEditingInstallment(installment);
    setIsFormModalOpen(true);
  };
  const handleCloseFormModal = () => {
    setEditingInstallment(undefined);
    setIsFormModalOpen(false);
  };
  const handleFormSuccess = () => {
    handleCloseFormModal();
  };
  const handleDeleteInstallment = (id: string) => {
    if (window.confirm(t('confirmDeleteInstallment'))) {
      deleteInstallment(id);
    }
  };

  // Enhanced filtering and sorting logic
  const filteredAndSorted = installments
    .filter(i => {
      // Text search filter
      const matchesSearch = 
        i.buyerName.toLowerCase().includes(search.toLowerCase()) ||
        i.phone.includes(search) ||
        i.cnic.includes(search) ||
        i.mobileName.toLowerCase().includes(search.toLowerCase());

      // Status filter
      const totalPaid = i.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
      const remainingAmount = (i.totalPayment || 0) - (i.advancePayment || 0) - totalPaid;
      const currentStatus = remainingAmount <= 0 ? 'Closed' : 'Open';
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

      // Date filter
      const matchesDate = !dateFilter || i.startDate === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.buyerName?.toLowerCase() || '';
          bValue = b.buyerName?.toLowerCase() || '';
          break;
        case 'date':
          aValue = new Date(a.startDate || '');
          bValue = new Date(b.startDate || '');
          break;
        case 'status':
          const aTotalPaid = a.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
          const bTotalPaid = b.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
          const aRemaining = (a.totalPayment || 0) - (a.advancePayment || 0) - aTotalPaid;
          const bRemaining = (b.totalPayment || 0) - (b.advancePayment || 0) - bTotalPaid;
          aValue = aRemaining <= 0 ? 'Closed' : 'Open';
          bValue = bRemaining <= 0 ? 'Closed' : 'Open';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Clear all filters
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setDateFilter('');
    setSortBy('name');
    setSortOrder('asc');
  };

  // Get unique dates for date filter dropdown
  const uniqueDates = [...new Set(installments.map(i => i.startDate))].sort();

  const drawPdfHeader = (pdf: jsPDF, pdfWidth: number, logoImg: string) => {
    // No background color, no app name, just logo centered
    pdf.addImage(String(logoImg ?? ''), 'PNG', pdfWidth/2 - 25, 10, 50, 35, '', 'FAST');
    // Add extra vertical space below logo
    // (No app name, no colored bar)
  };
  const drawPdfFooter = (pdf: jsPDF, pdfWidth: number, pdfHeight: number) => {
    pdf.setFillColor(6, 182, 212);
    pdf.rect(0, pdfHeight - 50, pdfWidth, 40, 'F');
    pdf.setFontSize(13);
    pdf.setTextColor('#fff');
    pdf.setFont(undefined, 'bold');
    // Compose owner details from userProfile (no name)
    const ownerPhone = userProfile?.phone || 'Phone N/A';
    const ownerEmail = userProfile?.email || 'Email N/A';
    const ownerAddress = userProfile?.address || 'Address N/A';
    const footerText = `${ownerPhone} | ${ownerEmail} | ${ownerAddress}`;
    pdf.text(String(footerText), pdfWidth/2, pdfHeight - 28, { align: 'center' });
  };

  const handleDownloadAllBuyersPDF = async () => {
    const logoImg = await fetch('/assets/logo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); }));
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    drawPdfHeader(pdf, pdfWidth, logoImg || '');
    let y = 60;
    let totalCollected = 0;
    let totalRemaining = 0;
    let totalAmount = 0;
    const rows = filteredAndSorted.map((inst, idx) => {
      const totalPaid = inst.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
      const collectedAmount = (inst.advancePayment || 0) + totalPaid;
      const remainingAmount = (inst.totalPayment || 0) - collectedAmount;
      totalCollected += collectedAmount;
      totalRemaining += remainingAmount > 0 ? remainingAmount : 0;
      totalAmount += inst.totalPayment || 0;
      // Remaining installments logic
      let remainingInstallments = 0;
      if (remainingAmount <= 0) {
        remainingInstallments = 0;
      } else {
        remainingInstallments = (inst.duration || 0) - (inst.payments?.length || 0);
      }
      return [
        (idx + 1).toString(),
        inst.buyerName,
        inst.cnic,
        inst.phone,
        inst.mobileName,
        inst.totalPayment?.toLocaleString?.() || '',
        inst.advancePayment?.toLocaleString?.() || '',
        collectedAmount.toLocaleString(),
        (remainingAmount > 0 ? remainingAmount : 0).toLocaleString(),
        remainingInstallments.toString(),
        (language === Language.UR ? ((inst.status === 'Closed') ? 'بند' : 'کھلا') : inst.status)
      ];
    });
    let columns = [];
    let heading = '';
    if (language === Language.UR) {
      await document.fonts.load('18px "Jameel Noori Nastaleeq"');
      heading = 'مجموعی قسط رپورٹ';
      columns = [
        'نمبر', 'خریدار کا نام', 'شناختی کارڈ', 'فون', 'موبائل کا نام', 'کل رقم', 'پیشگی', 'جمع شدہ رقم', 'باقی رقم', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'
      ];
    } else {
      heading = 'Overall Installment Report';
      columns = [
        'S.No', 'Buyer Name', 'CNIC', 'Phone', 'Product Name', 'Total Amount', 'Advance', 'Collected Amount', 'Remaining Amount', 'Remaining Installments', 'Account Status'
      ];
    }
    pdf.setFont(language === Language.UR ? 'JameelNooriNastaleeq' : 'helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor('#0e7490');
    pdf.text(String(heading ?? ''), pdfWidth/2, y + 30, { align: 'center' });
    y += 50;
    autoTable(pdf, {
      startY: y,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: language === Language.UR ? 14 : 10, cellPadding: 4, font: language === Language.UR ? 'JameelNooriNastaleeq' : undefined, halign: language === Language.UR ? 'right' : 'left' },
      margin: { left: 40, right: 40 },
      didParseCell: function (data) {
        if (data.column.index === columns.length - 2 && data.cell.raw) {
          // Remaining Installments column
          if (data.cell.raw === '0') {
            data.cell.styles.textColor = [22, 163, 74]; // green
          }
        }
        if (data.column.index === columns.length - 1 && data.cell.raw) {
          if (data.cell.raw === 'Open' || data.cell.raw === 'کھلا') {
            data.cell.styles.textColor = [22, 163, 74]; // green
          } else if (data.cell.raw === 'Closed' || data.cell.raw === 'بند') {
            data.cell.styles.textColor = [220, 38, 38]; // red
          }
        }
      },
      didDrawPage: (data) => {
        drawPdfHeader(pdf, pdfWidth, logoImg || '');
        drawPdfFooter(pdf, pdfWidth, pdfHeight);
      }
    });
    let lastY = (pdf as any).lastAutoTable.finalY + 20;
    // Ensure there is enough space for the summary, otherwise add a new page
    const summaryHeight = 40; // estimated height needed for summary lines
    if (lastY + summaryHeight > pdfHeight - 60) { // leave space for footer
      pdf.addPage();
      lastY = 60; // top margin for new page
    }
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor('#0e7490');
    pdf.text('Total Collected: PKR ' + String(totalCollected?.toLocaleString?.() ?? '0'), 60, lastY);
    pdf.text('Total Remaining: PKR ' + String(totalRemaining?.toLocaleString?.() ?? '0'), 320, lastY);
    pdf.text('Total Amount: PKR ' + String(totalAmount?.toLocaleString?.() ?? '0'), 540, lastY);
    drawPdfFooter(pdf, pdfWidth, pdfHeight);
    pdf.save('overall_installments_report.pdf');
  };

  // Helper to get current month string (YYYY-MM)
  const getCurrentMonthStr = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Helper to get current month name
  const getCurrentMonthName = () => {
    const now = new Date();
    return now.toLocaleString(language === Language.UR ? 'ur-PK' : 'en-US', { month: 'long', year: 'numeric' });
  };

  // New: Download current month report
  const handleDownloadCurrentMonthPDF = async () => {
    const logoImg = await fetch('/assets/logo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); }));
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    drawPdfHeader(pdf, pdfWidth, logoImg || '');
    let y = 60;
    const currentMonthStr = getCurrentMonthStr();
    const currentMonthName = getCurrentMonthName();
    let totalCollected = 0;
    let totalRemaining = 0;
    let totalAmount = 0;
    // Use filteredAndSorted and then filter for current month, exclude closed accounts
    const filteredInstallments = filteredAndSorted.filter(inst => {
      const totalPaid = inst.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
      const remainingAmount = (inst.totalPayment || 0) - (inst.advancePayment || 0) - totalPaid;
      const status = remainingAmount <= 0 ? 'Closed' : 'Open';
      return status !== 'Closed';
    });
    const rows = filteredInstallments.map((inst, idx) => {
      // Payments for current month
      const monthPayments = (inst.payments || []).filter(p => {
        if (!p.paymentDate) return false;
        const d = new Date(p.paymentDate);
        const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return mStr === currentMonthStr;
      });
      const collectedAmount = monthPayments.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
      const remainingAmount = (inst.monthlyInstallment || 0) - collectedAmount;
      totalCollected += collectedAmount;
      totalRemaining += remainingAmount > 0 ? remainingAmount : 0;
      totalAmount += inst.monthlyInstallment || 0;
      // Remaining installments logic
      let remainingInstallments = 0;
      if (remainingAmount === 0) {
        remainingInstallments = 0;
      } else {
        remainingInstallments = 1; // Only current month
      }
      return [
        (idx + 1).toString(),
        inst.buyerName,
        inst.cnic,
        inst.phone,
        inst.mobileName,
        inst.monthlyInstallment?.toLocaleString?.() || '',
        collectedAmount.toLocaleString(),
        (remainingAmount > 0 ? remainingAmount : 0).toLocaleString(),
        remainingInstallments.toString(),
        (language === Language.UR ? ((inst.status === 'Closed') ? 'بند' : 'کھلا') : inst.status)
      ];
    });
    let columns;
    let heading;
    if (language === Language.UR) {
      await document.fonts.load('18px "Jameel Noori Nastaleeq"');
      heading = `${currentMonthName} کی قسط رپورٹ`;
      columns = ['نمبر', 'خریدار کا نام', 'شناختی کارڈ', 'فون', 'موبائل کا نام', 'ماہانہ قسط', 'جمع شدہ', 'باقی', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'];
    } else {
      heading = `${currentMonthName} Installment Report`;
      columns = ['S.No', 'Buyer Name', 'CNIC', 'Phone', 'Product Name', 'Monthly Installment', 'Collected', 'Remaining', 'Remaining Installments', 'Account Status'];
    }
    pdf.setFont(language === Language.UR ? 'JameelNooriNastaleeq' : 'helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor('#0e7490');
    pdf.text(String(heading ?? ''), pdfWidth/2, y + 30, { align: 'center' });
    y += 50;
    autoTable(pdf, {
      startY: y,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: language === Language.UR ? 14 : 10, cellPadding: 4, font: language === Language.UR ? 'JameelNooriNastaleeq' : undefined, halign: language === Language.UR ? 'right' : 'left' },
      margin: { left: 40, right: 40 },
      didParseCell: function (data) {
        if (data.column.index === columns.length - 2 && data.cell.raw) {
          // Remaining Installments column
          if (data.cell.raw === '0') {
            data.cell.styles.textColor = [22, 163, 74]; // green
          }
        }
        if (data.column.index === columns.length - 1 && data.cell.raw) {
          if (data.cell.raw === 'Open' || data.cell.raw === 'کھلا') {
            data.cell.styles.textColor = [22, 163, 74]; // green
          } else if (data.cell.raw === 'Closed' || data.cell.raw === 'بند') {
            data.cell.styles.textColor = [220, 38, 38]; // red
          }
        }
      },
      didDrawPage: (data) => {
        drawPdfHeader(pdf, pdfWidth, logoImg || '');
        drawPdfFooter(pdf, pdfWidth, pdfHeight);
      }
    });
    let lastY = (pdf as any).lastAutoTable.finalY + 20;
    // Ensure there is enough space for the summary, otherwise add a new page
    const summaryHeight = 40; // estimated height needed for summary lines
    if (lastY + summaryHeight > pdfHeight - 60) { // leave space for footer
      pdf.addPage();
      lastY = 60; // top margin for new page
    }
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor('#0e7490');
    pdf.text('Total Collected: PKR ' + String(totalCollected?.toLocaleString?.() ?? '0'), 60, lastY);
    pdf.text('Total Remaining: PKR ' + String(totalRemaining?.toLocaleString?.() ?? '0'), 320, lastY);
    pdf.text('Total Amount: PKR ' + String(totalAmount?.toLocaleString?.() ?? '0'), 540, lastY);
    drawPdfFooter(pdf, pdfWidth, pdfHeight);
    pdf.save(`${currentMonthName.replace(/\s/g, '_')}_Installment_Report.pdf`);
  };

  // Handler for dropdown actions
  const handleDownloadDropdown = async (type: 'overall' | 'installment' | 'committee', installment: Installment, committee?: any) => {
    if (type === 'overall') {
      await handleDownloadAllBuyersPDF();
    } else if (type === 'installment') {
      alert('Download report for ' + (installment.buyerName || '') + ' - ' + (installment.mobileName || ''));
    } else if (type === 'committee' && committee) {
      alert('Download report for committee: ' + (committee && committee.title ? committee.title : ''));
    }
  };

  useEffect(() => {
    const handleClick = () => setOpenDropdownId(null);
    if (openDropdownId) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openDropdownId]);

  return (
    <>
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light flex items-center">
          <CreditCardIcon className="h-8 w-8 mr-3 text-primary" />
          {t('installments')}
        </h1>
        <div className="relative">
          <Button onClick={() => setShowReportDropdown(v => !v)} className="w-full sm:w-auto font-bold border-2 border-primary bg-primary text-white hover:bg-primary-dark hover:text-white transition" variant="primary">
          <FolderIcon className="h-5 w-5 mr-2" />
            Download Report
        </Button>
          {showReportDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-dark rounded shadow-lg z-10">
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-darker"
                onClick={() => { setShowReportDropdown(false); handleDownloadAllBuyersPDF(); }}
              >
                Overall Report
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-neutral-darker"
                onClick={() => { setShowReportDropdown(false); handleDownloadCurrentMonthPDF(); }}
              >
                {getCurrentMonthName()} Report
              </button>
            </div>
          )}
        </div>
        <Button onClick={() => handleOpenFormModal()} className="w-full sm:w-auto">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          {t('createInstallment')}
        </Button>
      </div>
      <div className="mb-6 space-y-4">
        {/* Search Input */}
        <Input
          name="search"
          label={t('searchInstallments')}
          value={search}
          onChange={e => {
            let value = e.target.value;
            // Phone formatting: starts with 03
            if (value.startsWith('03')) {
              const digits = value.replace(/\D/g, '');
              if (digits.length <= 4) {
                value = digits;
              } else {
                value = `${digits.slice(0,4)}-${digits.slice(4,11)}`;
              }
              value = value.slice(0, 12);
            } else if (/^\d{5,}/.test(value)) {
              // CNIC formatting: 5-7-1
              const digits = value.replace(/\D/g, '');
              if (digits.length <= 5) {
                value = digits;
              } else if (digits.length <= 12) {
                value = `${digits.slice(0, 5)}-${digits.slice(5)}`;
              } else {
                value = `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
              }
              value = value.slice(0, 15);
            }
            setSearch(value);
          }}
          className="max-w-md"
        />

        {/* Filter and Sort Controls */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
          {/* Filter Toggle Button */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="ghost"
            className="flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>

          {/* Clear Filters Button */}
          {(search || statusFilter !== 'all' || dateFilter || sortBy !== 'name' || sortOrder !== 'asc') && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              className="text-red-600 hover:text-red-700"
            >
              Clear All Filters
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-neutral-darker rounded-lg">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Open' | 'Closed')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-neutral-dark text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-neutral-dark text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All Dates</option>
                {uniqueDates.map(date => (
                  <option key={date} value={date}>
                    {new Date(date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date' | 'status')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-neutral-dark text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="name">Name</option>
                <option value="date">Date</option>
                <option value="status">Status</option>
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sort Order
              </label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-neutral-dark text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAndSorted.length} of {installments.length} installments
        </div>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">{t('loading')}</div>
      ) : filteredAndSorted.length === 0 ? (
        <p className="text-center text-neutral-DEFAULT dark:text-gray-400 py-8">{t('noInstallmentsFound')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSorted.map(installment => {
              // Find the member by CNIC or phone (assuming unique)
              const member = members.find(m => m.cnic === installment.cnic || m.phone === installment.phone);
              // Find all committees this member is part of
              const memberCommittees = member ? committees.filter(c => c.memberIds.includes(member.id)) : [];
            const totalPaid = installment.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
            const remainingAmount = (installment.totalPayment || 0) - (installment.advancePayment || 0) - totalPaid;
            const status = remainingAmount <= 0 ? 'Closed' : 'Open';
            return (
              <div key={installment.id} className="bg-white dark:bg-neutral-darker rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl flex flex-col">
                <div className="p-5 flex flex-col flex-grow">
                    <h2 className="text-xl font-semibold text-primary dark:text-primary-light mb-2 truncate">{installment.buyerName || ''}</h2>
                    <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-1">{t('mobile')}: {installment.mobileName || ''}</p>
                    <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-1">{t('phone')}: {installment.phone || ''}</p>
                    <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-1">{t('cnic')}: {installment.cnic || ''}</p>
                  <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-3">{t('total')}: PKR {installment.totalPayment.toLocaleString()}</p>
                  <p className="text-sm font-semibold mb-2">
                    Account Status: <span className={status === 'Closed' ? 'text-red-600' : 'text-green-600'}>{status}</span>
                  </p>
                    <div className="mt-auto flex space-x-2 relative">
                    <Button size="sm" onClick={() => navigate(`/installments/${installment.id}`)} className="flex-grow flex items-center justify-center">
                      <FolderIcon className="w-4 h-4 mr-1" />
                      {t('details')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleOpenFormModal(installment)} aria-label="Edit">
                      <PencilSquareIcon className="w-5 h-5" />
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDeleteInstallment(installment.id)} aria-label="Delete">
                      <TrashIcon className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={editingInstallment ? t('editInstallment') : t('createInstallment')}>
        <InstallmentForm
          initialData={editingInstallment}
          onClose={handleCloseFormModal}
          onSuccess={handleFormSuccess}
        />
      </Modal>
        {openReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-neutral-dark rounded-lg shadow-lg p-6 min-w-[300px] flex flex-col items-center">
              <h2 className="text-lg font-semibold mb-4">Download Report</h2>
              <button
                className="w-full px-4 py-2 mb-2 rounded text-left hover:bg-gray-100 focus:bg-gray-100 text-neutral-darker"
                onClick={() => { handleDownloadDropdown('overall', openReportModal.installment); setOpenReportModal(null); }}
              >
                Overall Report
              </button>
              {openReportModal.memberCommittees.map((committee) => (
                <button
                  key={committee.id}
                  className="w-full px-4 py-2 mb-2 rounded text-left hover:bg-gray-100 focus:bg-gray-100 text-neutral-darker"
                  onClick={() => { handleDownloadDropdown('committee', openReportModal.installment, committee); setOpenReportModal(null); }}
                >
                  {committee.title} Report
                </button>
              ))}
              <button
                className="w-full px-4 py-2 mt-2 rounded text-left text-red-500 hover:bg-gray-100 focus:bg-gray-100"
                onClick={() => setOpenReportModal(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
    </div>
    </>
  );
};

export default InstallmentManagement; 