import React, { useState, useEffect, useRef } from 'react';
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

const openCameraWithBackPreference = async (onStream, onError) => {
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cnic') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropSrc(reader.result as string);
        setCropType(type);
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (showCameraModal && photoType) {
      (async () => {
        try {
          let stream;
          if (photoType === 'profile') {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacingMode } });
            } catch (err) {
              stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }
          } else {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            const backCamera = videoDevices.find(device =>
              device.label.toLowerCase().includes('back') ||
              device.label.toLowerCase().includes('environment')
            );
            if (backCamera) {
              stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: backCamera.deviceId } } });
            } else {
              try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: 'environment' } } });
              } catch (err) {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
              }
            }
          }
          setCameraStream(stream);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play();
            }
          }, 100);
        } catch (err) {
          setCameraError(t('unableToAccessCamera') || 'Unable to access camera. Please allow camera access in your browser.');
          setShowCameraModal(false);
        }
      })();
    }
    // Clean up on modal close
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, [cameraFacingMode, showCameraModal, photoType]);

  const openCameraModal = (type: 'profile' | 'cnic') => {
    setCameraError('');
    setShowProfilePhotoMenu(false);
    setShowCnicPhotoMenu(false);
    setPhotoType(type);
    setShowCameraModal(true);
    setCameraFacingMode(type === 'profile' ? 'user' : 'environment');
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
                  <Button type="button" className="w-full" onClick={() => { openCameraModal('profile'); setShowProfilePhotoMenu(false); }}>{t('takePhoto')}</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowProfilePhotoMenu(false)}>{t('cancel')}</Button>
                </>
              )}
              {showCnicPhotoMenu && (
                <>
                  <Button type="button" className="w-full" onClick={() => { setShowCnicPhotoMenu(false); document.getElementById('buyerCnicPicUpload')?.click(); }}>{t('uploadCnicImage')}</Button>
                  <Button type="button" className="w-full" onClick={() => { openCameraModal('cnic'); setShowCnicPhotoMenu(false); }}>{t('takePicture')}</Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={() => setShowCnicPhotoMenu(false)}>{t('cancel')}</Button>
                </>
              )}
            </div>
          </div>
        )}
        <input type="file" id="buyerProfilePicUpload" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'profile')} />
        <input type="file" id="buyerProfilePicCamera" className="hidden" accept="image/*" capture="environment" onChange={e => handleFileUpload(e, 'profile')} />
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
  const { installments, deleteInstallment, isLoading, t, language, committees, members } = useAppContext();
  const navigate = useNavigate();
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openReportModal, setOpenReportModal] = useState<null | { installment: Installment, memberCommittees: Committee[] }>(null);

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

  const filtered = installments.filter(i =>
    i.buyerName.toLowerCase().includes(search.toLowerCase()) ||
    i.phone.includes(search) ||
    i.cnic.includes(search) ||
    i.mobileName.toLowerCase().includes(search.toLowerCase())
  );

  const drawPdfHeader = (pdf: jsPDF, pdfWidth: number, logoImg: string) => {
    // No background color, no app name, just logo centered
    pdf.addImage(String(logoImg ?? ''), 'PNG', pdfWidth/2 - 25, 10, 50, 35, String(''), 'FAST');
    // Add extra vertical space below logo
    // (No app name, no colored bar)
  };
  const drawPdfFooter = (pdf: jsPDF, pdfWidth: number, pdfHeight: number) => {
    pdf.setFillColor(6, 182, 212);
    pdf.rect(0, pdfHeight - 50, pdfWidth, 40, 'F');
    pdf.setFontSize(13);
    pdf.setTextColor('#fff');
    pdf.setFont(undefined, 'bold');
    pdf.text(String('0300-1234567 | muhammadumaru3615@gmail.com | Chungi Stop Darghowala, Lahore'), pdfWidth/2, pdfHeight - 28, { align: 'center' });
    // Page number removed from footer
  };

  const handleDownloadAllBuyersPDF = async () => {
    const logoImg = await fetch('/assets/logo.png').then(r => r.blob()).then(blob => new Promise<string>((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); }));
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    drawPdfHeader(pdf, pdfWidth, logoImg);
    let y = 60;
    // Calculate totals for Urdu mode
    let totalCollected = 0;
    let totalRemaining = 0;
    installments.forEach(inst => {
      const totalPaid = inst.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
      const collectedAmount = (inst.advancePayment || 0) + totalPaid;
      const remainingAmount = (inst.totalPayment || 0) - collectedAmount;
      totalCollected += collectedAmount;
      totalRemaining += remainingAmount > 0 ? remainingAmount : 0;
    });
    if (language === Language.UR) {
      // Ensure font is loaded before rendering
      await document.fonts.load('18px "Jameel Noori Nastaleeq"');
      // Wait for the table to be rendered in the DOM
      await new Promise(resolve => setTimeout(resolve, 200));
      // Render hidden Urdu table as image
      const urduTable = document.getElementById('urdu-overall-report-table');
      if (urduTable) {
        const canvas = await html2canvas(urduTable);
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth - 80;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 40, y, imgWidth, imgHeight);
        y += imgHeight + 20;
        pdf.setFontSize(15);
        pdf.setTextColor('#0e7490');
        pdf.setFont(undefined, 'bold');
        pdf.text(String(`کل جمع شدہ: PKR ${totalCollected.toLocaleString()}`), 60, y);
        pdf.text(String(`کل باقی: PKR ${totalRemaining.toLocaleString()}`), pdfWidth - 320, y);
        drawPdfFooter(pdf, pdfWidth, pdfHeight);
        pdf.save('overall_installments_report.pdf');
        return;
      }
    }
    let columns: string[] = [];
    let heading: string = '';
    let safeTotalCollected: number = typeof totalCollected === 'number' ? totalCollected : 0;
    let safeTotalRemaining: number = typeof totalRemaining === 'number' ? totalRemaining : 0;
    if (language === Language.UR) {
      pdf.setFont('JameelNooriNastaleeq', 'normal');
      pdf.setFontSize(20);
      pdf.setTextColor('#0e7490');
      heading = 'مجموعی قسط رپورٹ';
      columns = [
        'خریدار کا نام', 'شناختی کارڈ', 'فون', 'موبائل کا نام', 'کل رقم', 'پیشگی', 'جمع شدہ رقم', 'باقی رقم', 'مدت', 'باقی اقساط', 'اکاؤنٹ اسٹیٹس'
      ];
    } else {
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor('#0e7490');
      heading = 'Overall Installment Report';
      columns = [
        'Buyer Name', 'CNIC', 'Phone', 'Product Name', 'Total Amount', 'Advance', 'Collected Amount', 'Remaining Amount', 'Duration', 'Remaining Installments', 'Account Status'
      ];
    }
    pdf.text(heading, pdfWidth/2, y + 30, { align: 'center' });
    y += 50;
    // Table rows
    const rows = installments.map(inst => {
      const totalPaid = inst.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
      const collectedAmount = (inst.advancePayment || 0) + totalPaid;
      const remainingAmount = (inst.totalPayment || 0) - collectedAmount;
      const remainingInstallments = (inst.duration || 0) - (inst.payments?.length || 0);
      totalCollected += collectedAmount;
      totalRemaining += remainingAmount > 0 ? remainingAmount : 0;
      // New status logic: Closed if remainingAmount <= 0, otherwise Open
      let status, statusUr;
      if (remainingAmount <= 0) {
        status = 'Closed';
        statusUr = 'بند';
      } else {
        status = 'Open';
        statusUr = 'کھلا';
      }
      if (language === Language.UR) {
        return [
          inst.buyerName || '',
          inst.cnic || '',
          inst.phone || '',
          inst.mobileName || '',
          `PKR ${(inst.totalPayment || 0).toLocaleString()}`,
          `PKR ${(inst.advancePayment || 0).toLocaleString()}`,
          `PKR ${collectedAmount.toLocaleString()}`,
          `PKR ${remainingAmount.toLocaleString()}`,
          inst.duration,
          remainingInstallments,
          statusUr,
        ];
      } else {
        return [
          inst.buyerName || '',
          inst.cnic || '',
          inst.phone || '',
          inst.mobileName || '',
          `PKR ${(inst.totalPayment || 0).toLocaleString()}`,
          `PKR ${(inst.advancePayment || 0).toLocaleString()}`,
          `PKR ${collectedAmount.toLocaleString()}`,
          `PKR ${remainingAmount.toLocaleString()}`,
          inst.duration,
          remainingInstallments,
          status,
        ];
      }
    }).filter(Boolean);
    autoTable(pdf, {
      startY: y,
      head: [columns],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: language === Language.UR ? 14 : 10, cellPadding: 4, font: language === Language.UR ? 'JameelNooriNastaleeq' : undefined, halign: language === Language.UR ? 'right' : 'left' },
      margin: { left: 40, right: 40 },
      didParseCell: function (data) {
        if (data.column.index === columns.length - 1 && data.cell.raw) {
          if (data.cell.raw === 'Open' || data.cell.raw === 'کھلا') {
            data.cell.styles.textColor = [22, 163, 74]; // green
          } else if (data.cell.raw === 'Closed' || data.cell.raw === 'بند') {
            data.cell.styles.textColor = [220, 38, 38]; // red
          }
        }
      },
      didDrawPage: (data) => {
        drawPdfHeader(pdf, pdfWidth, logoImg);
        drawPdfFooter(pdf, pdfWidth, pdfHeight);
      }
    });
    let lastY = (pdf as any).lastAutoTable.finalY + 20;
    pdf.setFont(undefined, 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor('#0e7490');
    pdf.text('Total Collected: PKR ' + safeTotalCollected.toLocaleString(), 60, lastY);
    pdf.text('Total Remaining: PKR ' + safeTotalRemaining.toLocaleString(), 320, lastY);
    drawPdfFooter(pdf, pdfWidth, pdfHeight);
    pdf.save('overall_installments_report.pdf');
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
        <Button onClick={handleDownloadAllBuyersPDF} className="w-full sm:w-auto font-bold border-2 border-primary bg-primary text-white hover:bg-primary-dark hover:text-white transition" variant="primary">
          <FolderIcon className="h-5 w-5 mr-2" />
          Download Overall Report
        </Button>
        <Button onClick={() => handleOpenFormModal()} className="w-full sm:w-auto">
          <PlusCircleIcon className="h-5 w-5 mr-2" />
          {t('createInstallment')}
        </Button>
      </div>
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
        className="mb-4 max-w-md"
      />
      {isLoading ? (
        <div className="flex justify-center items-center h-64">{t('loading')}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-neutral-DEFAULT dark:text-gray-400 py-8">{t('noInstallmentsFound')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(installment => {
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
                      <div className="relative">
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label="Download"
                          onClick={() => setOpenReportModal({ installment, memberCommittees })}
                        >
                          <ArrowDownTrayIcon className="w-5 h-5" />
                        </Button>
                      </div>
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
      {/* Hidden Urdu table for PDF export */}
      <div
        id="urdu-overall-report-table"
        style={{
          visibility: 'hidden',
          position: 'absolute',
          left: '-9999px',
          direction: 'rtl',
          fontFamily: 'Jameel Noori Nastaleeq, serif',
          fontSize: 18,
          background: '#fff',
          color: '#222',
          padding: 16,
          width: '100%',
          top: 0,
          zIndex: -1,
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 18 }}>
          <thead>
            <tr style={{ background: '#06b6d4', color: '#fff', fontWeight: 'bold' }}>
              <th>خریدار کا نام</th>
              <th>شناختی کارڈ</th>
              <th>فون</th>
              <th>موبائل کا نام</th>
              <th>کل رقم</th>
              <th>پیشگی</th>
              <th>جمع شدہ رقم</th>
              <th>باقی رقم</th>
              <th>مدت</th>
              <th>باقی اقساط</th>
              <th>اکاؤنٹ اسٹیٹس</th>
            </tr>
          </thead>
          <tbody>
            {installments.map(inst => {
              const totalPaid = inst.payments?.reduce((sum, p) => sum + (p.amountPaid || 0), 0) || 0;
              const collectedAmount = (inst.advancePayment || 0) + totalPaid;
              const remainingAmount = (inst.totalPayment || 0) - collectedAmount;
              const remainingInstallments = (inst.duration || 0) - (inst.payments?.length || 0);
              const statusUr = remainingAmount <= 0 ? 'بند' : 'کھلا';
              const statusColor = remainingAmount <= 0 ? 'red' : 'green';
              return (
                <tr key={inst.id}>
                    <td>{inst.buyerName || ''}</td>
                    <td>{inst.cnic || ''}</td>
                    <td>{inst.phone || ''}</td>
                    <td>{inst.mobileName || ''}</td>
                  <td>{`PKR ${(inst.totalPayment || 0).toLocaleString()}`}</td>
                  <td>{`PKR ${(inst.advancePayment || 0).toLocaleString()}`}</td>
                  <td>{`PKR ${collectedAmount.toLocaleString()}`}</td>
                  <td>{`PKR ${remainingAmount.toLocaleString()}`}</td>
                  <td>{inst.duration}</td>
                  <td>{remainingInstallments}</td>
                  <td style={{ color: statusColor, fontWeight: 'bold' }}>{statusUr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default InstallmentManagement; 