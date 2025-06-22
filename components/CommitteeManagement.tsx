import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Committee, Member, CommitteeType, PayoutMethod, CommitteePayment, CommitteeMemberTurn, Language } from '../types'; 
import { Button, Input, Select, Modal, LoadingSpinner, PlusCircleIcon, TrashIcon, PencilSquareIcon, Textarea, UserGroupIcon, DocumentTextIcon, ArrowDownTrayIcon, UserCircleIcon as DefaultUserIcon, ArrowLeftIcon, ArrowRightIcon, ArrowDownTrayIcon as DownloadIcon, XMarkIcon, HomeIcon, CreditCardIcon, ClockIcon, StarIcon, HeartIcon, TrophyIcon, GiftIcon, FireIcon, RocketLaunchIcon, AcademicCapIcon, BuildingOfficeIcon, HandRaisedIcon, LightBulbIcon, PuzzlePieceIcon, SparklesIcon2, ChartBarIcon, FolderIcon, BellIcon, ShieldCheckIcon, GlobeAltIcon, PaintBrushIcon } from './UIComponents';
import { isValidPakistaniCnic, isValidPakistaniPhone, formatDate, getCommitteeMonthName, calculateTotalPool, getMemberName, initializePayoutTurns } from '../utils/appUtils';
import { DEFAULT_PROFILE_PIC } from '../constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
// Import and register the JameelNooriNastaleeq font for jsPDF
let registerJameelNooriNastaleeq: any = (null as any);
try {
  // Try to support both default and named exports
  const fontModule = require('../assets/JameelNooriNastaleeq-normal.js');
  registerJameelNooriNastaleeq = fontModule.default || fontModule;
  if (typeof registerJameelNooriNastaleeq === 'function') {
    registerJameelNooriNastaleeq(jsPDF);
  }
} catch (e) {
  // Font registration failed, fallback or warn
  console.warn('JameelNooriNastaleeq font registration failed:', e);
}

// Form for Committee
const CommitteeForm: React.FC<{ initialData?: Committee; onClose: () => void; onSuccess: (committee: Committee) => void; }> = ({ initialData, onClose, onSuccess }) => {
  const { t, addCommittee, updateCommittee, language } = useAppContext();
  const [formData, setFormData] = useState<Partial<Committee>>({
    title: '',
    type: CommitteeType.MONTHLY,
    startDate: new Date().toISOString().split('T')[0],
    duration: 12,
    amountPerMember: 1000,
    payoutMethod: PayoutMethod.MANUAL, 
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'duration' || name === 'amountPerMember' ? parseFloat(value) || 0 : value }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title?.trim()) newErrors.title = language === Language.UR ? "عنوان ضروری ہے۔" : "Title is required.";
    if (!formData.duration || formData.duration <= 0) newErrors.duration = language === Language.UR ? "مدت مثبت ہونی چاہیے۔" : "Duration must be positive.";
    if (!formData.amountPerMember || formData.amountPerMember <= 0) newErrors.amountPerMember = language === Language.UR ? "رقم مثبت ہونی چاہیے۔" : "Amount must be positive.";
    if (!formData.startDate) newErrors.startDate = language === Language.UR ? "آغاز کی تاریخ ضروری ہے۔" : "Start date is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    if (initialData?.id) { 
      // Ensure memberIds, payments, and payoutTurns are preserved if not meant to be changed by this form
      const fullInitialData = initialData as Committee;
      const updatedCommitteeData = {
        ...fullInitialData, // start with all existing data
        ...formData, // override with form changes
      } as Committee;
      await updateCommittee(updatedCommitteeData); 
      onSuccess(updatedCommitteeData);
    } else { 
      const newCommittee = await addCommittee(formData as Omit<Committee, 'id' | 'payments' | 'payoutTurns' | 'memberIds'>);
      onSuccess(newCommittee);
    }
  };

  const typeOptions = Object.values(CommitteeType).map(type => ({ value: type, label: t(type.toLowerCase()) }));
  const payoutMethodOptions = Object.values(PayoutMethod).map(method => ({ value: method, label: t(method.toLowerCase()) }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input name="title" label={t('committeeTitle')} value={formData.title || ''} onChange={handleChange} error={errors.title} required />
      <Select name="type" label={t('committeeType')} value={formData.type} onChange={handleChange} options={typeOptions} />
      <Input name="startDate" type="date" label={t('startDate')} value={formData.startDate || ''} onChange={handleChange} error={errors.startDate} required />
      <Input name="duration" type="number" label={t('duration')} value={formData.duration?.toString() || ''} onChange={handleChange} error={errors.duration} min="1" required />
      <Input name="amountPerMember" type="number" label={t('amountPerMember')} value={formData.amountPerMember?.toString() || ''} onChange={handleChange} error={errors.amountPerMember} min="1" required />
      <Select name="payoutMethod" label={t('payoutMethod')} value={formData.payoutMethod} onChange={handleChange} options={payoutMethodOptions} />
      <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit">{initialData ? t('saveChanges') : t('createCommittee')}</Button>
      </div>
    </form>
  );
};


// Main Committee Management Component
const CommitteeManagement: React.FC = () => {
  const { committees, deleteCommittee, t, language, isLoading: appIsLoading } = useAppContext();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCommittee, setEditingCommittee] = useState<Committee | undefined>(undefined);
  const navigate = useNavigate();

  const handleOpenFormModal = (committee?: Committee) => {
    setEditingCommittee(committee);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setEditingCommittee(undefined);
    setIsFormModalOpen(false);
  };
  
  const handleFormSuccess = (committee: Committee) => {
    handleCloseFormModal();
  };

  const handleDeleteCommitteeWrapper = (committeeId: string) => {
    const committee = committees.find(c => c.id === committeeId);
    const committeeName = committee?.title || 'this committee';
    
    if (window.confirm(language === Language.UR 
      ? `کیا آپ واقعی "${committeeName}" کو حذف کرنا چاہتے ہیں؟ یہ عمل واپس نہیں کیا جا سکتا۔`
      : `Are you sure you want to delete "${committeeName}"? This action cannot be undone.`)) {
      deleteCommittee(committeeId);
    }
  };


  if (appIsLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className={`p-4 md:p-6 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
      <div className={`flex justify-between items-center mb-6 ${language === Language.UR ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light flex items-center">
          <BuildingOfficeIcon className="h-8 w-8 mr-3 text-primary" />
          {t('committees')}
        </h1>
        <Button onClick={() => handleOpenFormModal()} >
          <PlusCircleIcon className={`h-5 w-5 ${language === Language.UR ? 'ml-2' : 'mr-2'}`} />
          {t('newCommittee')}
        </Button>
      </div>

      {committees.length === 0 ? (
        <p className="text-center text-neutral-DEFAULT dark:text-gray-400 py-8">{t('noCommittees')}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {committees.map(committee => (
            <div key={committee.id} className="bg-white dark:bg-neutral-darker rounded-lg shadow-lg overflow-hidden transition-all hover:shadow-xl flex flex-col">
              {/* Committee profile picture removed */}
              <div className="p-5 flex flex-col flex-grow">
                <h2 className={`text-xl font-semibold text-primary dark:text-primary-light mb-2 truncate ${language === Language.UR ? 'text-right' : 'text-left'}`}>{committee.title}</h2>
                <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-1">Type: {t(committee.type.toLowerCase())}</p>
                <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-1">{t('totalMembers')}: {committee.memberIds.length}</p>
                <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-3">{t('totalPool')}: PKR {(committee.amountPerMember * committee.memberIds.length * committee.duration).toLocaleString()}</p>
                <div className={`mt-auto flex space-x-2 ${language === Language.UR ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <Button size="sm" onClick={() => navigate(`/committees/${committee.id}`)} className="flex-grow flex items-center justify-center">
                    <FolderIcon className="w-4 h-4 mr-1" />
                    {t('viewDetails')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleOpenFormModal(committee)} aria-label={t('edit')}>
                    <PencilSquareIcon className="w-5 h-5" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDeleteCommitteeWrapper(committee.id)} aria-label={t('delete')}>
                    <TrashIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={editingCommittee ? t('edit') + " " + t('committee') : t('newCommittee')}>
        <CommitteeForm 
          initialData={editingCommittee} 
          onClose={handleCloseFormModal}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </div>
  );
};


// Form for Member (within committee context)
const MemberForm: React.FC<{ committeeId?: string; initialData?: Member; onClose: () => void; onSuccess: (member: Member) => void; }> = ({ committeeId, initialData, onClose, onSuccess }) => {
  const { t, addMember, updateMember, addMemberToCommittee, language, members: allMembers } = useAppContext();
  const [formData, setFormData] = useState<Partial<Member>>({
    name: '',
    phone: '',
    cnic: '',
    address: '',
    joiningDate: new Date().toISOString().split('T')[0],
    notes: '',
    profilePictureUrl: initialData?.profilePictureUrl || DEFAULT_PROFILE_PIC,
    ...initialData,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue = value;

    if (name === 'name') {
      // Capitalize first letter of each word
      processedValue = value.replace(/\b\w/g, c => c.toUpperCase());
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

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name?.trim()) newErrors.name = language === Language.UR ? "نام ضروری ہے۔" : "Name is required.";
    if (!formData.phone?.trim()) newErrors.phone = language === Language.UR ? "فون نمبر ضروری ہے۔" : "Phone is required.";
    else if (!isValidPakistaniPhone(formData.phone)) newErrors.phone = language === Language.UR ? "غلط فون فارمیٹ۔" : "Invalid phone format (03XX-XXXXXXX).";
    if (!formData.cnic?.trim()) newErrors.cnic = language === Language.UR ? "شناختی کارڈ نمبر ضروری ہے۔" : "CNIC is required.";
    else if (!isValidPakistaniCnic(formData.cnic)) newErrors.cnic = language === Language.UR ? "غلط شناختی کارڈ فارمیٹ۔" : "Invalid CNIC format (XXXXX-XXXXXXX-X).";
    
    if (!initialData?.id || (initialData.cnic !== formData.cnic)) { 
        if(allMembers.some(m => m.cnic === formData.cnic && m.id !== initialData?.id)) newErrors.cnic = language === Language.UR ? "یہ شناختی کارڈ پہلے سے موجود ہے۔" : "This CNIC already exists.";
    }
    if (!initialData?.id || (initialData.phone !== formData.phone)) { 
        if(allMembers.some(m => m.phone === formData.phone && m.id !== initialData?.id)) newErrors.phone = language === Language.UR ? "یہ فون نمبر پہلے سے موجود ہے۔" : "This phone number already exists.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    let member: Member;
    if (initialData?.id) { 
      member = { ...initialData, ...formData } as Member;
      await updateMember(member);
    } else { 
      const memberDataToSave = { ...formData, profilePictureUrl: formData.profilePictureUrl || DEFAULT_PROFILE_PIC };
      member = await addMember(memberDataToSave as Omit<Member, 'id'>);
    }
    
    if (committeeId && member.id && !initialData?.id) { // Only add to committee if it's a new member being created in committee context
      await addMemberToCommittee(committeeId, member.id);
    }
    onSuccess(member);
  };
  
  // Function to open camera modal and request camera access
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

  // Function to close camera modal and stop stream
  const closeCameraModal = () => {
    setShowCameraModal(false);
    setCameraError('');
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  // Function to capture photo from video
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="relative flex flex-col items-center space-y-2 mb-3">
        <img 
          src={formData.profilePictureUrl || DEFAULT_PROFILE_PIC} 
          alt={t('profilePicture')} 
          className="w-24 h-24 rounded-full object-cover border-2 border-primary-light dark:border-primary-dark cursor-pointer"
          onClick={() => setShowPhotoMenu(true)}
        />
        {showPhotoMenu && (
          <div className="absolute top-24 left-1/2 transform -translate-x-1/2 bg-white dark:bg-neutral-dark border border-gray-200 dark:border-gray-700 rounded shadow-lg z-20 p-2 flex flex-col space-y-1">
            <button type="button" className="text-sm text-primary hover:underline text-left px-4 py-2" onClick={() => { setShowPhotoMenu(false); document.getElementById('memberProfilePicUpload')?.click(); }}>
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
        <input type="file" id="memberProfilePicUpload" className="hidden" accept="image/*" onChange={handleFileUpload} />
        <input type="file" id="memberProfilePicCamera" className="hidden" accept="image/*" capture="environment" onChange={handleFileUpload} />
        {formData.profilePictureUrl && formData.profilePictureUrl !== DEFAULT_PROFILE_PIC && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="ml-2 rtl:mr-2 rtl:ml-0 text-xs text-red-500 hover:text-red-700"
            onClick={() => setFormData(prev => ({...prev, profilePictureUrl: DEFAULT_PROFILE_PIC}))}
          >
            {t('removePicture')}
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
                <Button type="button" variant="ghost" onClick={closeCameraModal}>{t('cancel')}</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Input name="name" label={t('memberName')} value={formData.name || ''} onChange={handleChange} error={errors.name} required />
      <Input name="phone" label={t('memberPhone')} value={formData.phone || ''} onChange={handleChange} error={errors.phone} required maxLength={12} />
      <Input name="cnic" label={t('memberCNIC')} value={formData.cnic || ''} onChange={handleChange} error={errors.cnic} required maxLength={15} />
      <Input name="address" label={t('memberAddress')} value={formData.address || ''} onChange={handleChange} />
      <Input name="joiningDate" type="date" label={t('joiningDate')} value={formData.joiningDate || ''} onChange={handleChange} required />
      <Textarea name="notes" label={t('notes')} value={formData.notes || ''} onChange={handleChange} rows={3} />
      <div className="flex justify-end space-x-2 rtl:space-x-reverse pt-4">
        <Button type="button" variant="ghost" onClick={onClose}>{t('cancel')}</Button>
        <Button type="submit">{initialData ? t('saveChanges') : (committeeId ? t('addMember') : t('createNewMember'))}</Button>
      </div>
    </form>
  );
};


// Committee Detail View
export const CommitteeDetailScreen: React.FC = () => {
    const { 
        committees, 
        members: allMembers, 
        updatePayoutTurn, 
        t, 
        language, 
        userProfile, 
        isLoading: appIsLoading,
        setIsLoading,
        removeMemberFromCommittee,
        removeOneShareFromCommittee,
        deleteMember,
        addMemberToCommittee,
        getPaymentsForMemberByMonth,
        updateCommittee,
        recordPayment,
        getMemberById
    } = useAppContext();
    const { committeeId } = useParams<{ committeeId: string }>();
    const navigate = useNavigate();
    // Find committee by id (not slugified title)
    const committee = committees.find(c => c.id === committeeId);
    const [isMemberFormModalOpen, setIsMemberFormModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
    const [isAddExistingMemberModalOpen, setIsAddExistingMemberModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedExistingMemberId, setSelectedExistingMemberId] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
    const [installmentAmount, setInstallmentAmount] = useState(0);
    const [installmentDate, setInstallmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentError, setPaymentError] = useState('');
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState<{
        committeeName: string;
        payerName: string;
        amount: number; 
        paymentDate: string;
        month: string; 
        monthIndex?: number;
        paymentId?: string;
    } | null>(null);
    const [isEditReceiptModalOpen, setIsEditReceiptModalOpen] = useState(false);
    const [editReceiptAmount, setEditReceiptAmount] = useState(0);
    const [editReceiptDate, setEditReceiptDate] = useState('');
    const [editReceiptError, setEditReceiptError] = useState('');
    
    // Lucky Draw State
    const [isLuckyDrawModalOpen, setIsLuckyDrawModalOpen] = useState(false);
    const [luckyDrawWinner, setLuckyDrawWinner] = useState<Member | null>(null);
    const [winningTurn, setWinningTurn] = useState<CommitteeMemberTurn | null>(null);
    const [showPartyEffects, setShowPartyEffects] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const soundIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Additional state for existing functionality
    const [currentPaymentContext, setCurrentPaymentContext] = useState<{ memberId: string; monthIndex: number } | null>(null);
    const [selectedMonthForReceipts, setSelectedMonthForReceipts] = useState(0);

    const availableMembersForCommittee = allMembers.filter(
      m => (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cnic.includes(searchTerm))
    );

    // Get committee members with share counts
    const committeeMembersWithShares = committee ? 
      committee.memberIds.reduce((acc: Array<{ member: Member; shares: number }>, memberId) => {
        const member = allMembers.find(m => m.id === memberId);
        if (member) {
          const existingEntry = acc.find(entry => entry.member.id === memberId);
          if (existingEntry) {
            existingEntry.shares += 1;
          } else {
            acc.push({ member, shares: 1 });
          }
        }
        return acc;
      }, [])
      : [];

    // Month options for receipts
    const monthOptions = committee ? 
      Array.from({ length: committee.duration }, (_, i) => ({
        value: i.toString(),
        label: getCommitteeMonthName(committee.startDate, i, language)
      })) : [];

    // Payment grid header
    const paymentGridHeader = committee ? 
      Array.from({ length: committee.duration }, (_, i) => 
        getCommitteeMonthName(committee.startDate, i, language)
      ) : [];

    const handleOpenMemberForm = (member?: Member) => {
        setEditingMember(member);
        setIsMemberFormModalOpen(true);
    };
    const handleCloseMemberForm = () => {
        setEditingMember(undefined);
        setIsMemberFormModalOpen(false);
    };
    const handleMemberFormSuccess = (member: Member) => { 
        handleCloseMemberForm();
    };

    const handleRemoveMemberWrapper = (memberId: string) => {
      if (!committee) return;
      
      const member = getMemberById(memberId);
      const memberName = member?.name || 'this member';
      
      if (window.confirm(language === Language.UR 
        ? `کیا آپ واقعی "${memberName}" کو اس کمیٹی سے ہٹانا چاہتے ہیں؟`
        : `Are you sure you want to remove "${memberName}" from this committee?`)) {
        removeMemberFromCommittee(committee.id, memberId);
        }
    };
    
    const handleRemoveShare = (memberId: string) => {
      if (!committee) return;
      
      const member = getMemberById(memberId);
      const memberName = member?.name || 'this member';
      
      if (window.confirm(language === Language.UR 
        ? `کیا آپ واقعی "${memberName}" کی ایک شیئر ہٹانا چاہتے ہیں؟`
        : `Are you sure you want to remove one share of "${memberName}"?`)) {
        removeOneShareFromCommittee(committee.id, memberId);
        }
    };
    
    const handleDeleteMemberGloballyWrapper = (memberId: string) => {
      const member = getMemberById(memberId);
      const memberName = member?.name || 'this member';
      
      if (window.confirm(language === Language.UR 
        ? `کیا آپ واقعی "${memberName}" کو مکمل طور پر حذف کرنا چاہتے ہیں؟ یہ عمل واپس نہیں کیا جا سکتا۔`
        : `Are you sure you want to permanently delete "${memberName}"? This action cannot be undone.`)) {
            deleteMember(memberId); 
        }
    };

    const handleAddExistingMember = () => {
      if (!committee || !selectedExistingMemberId) return;
      addMemberToCommittee(committee.id, selectedExistingMemberId);
            setIsAddExistingMemberModalOpen(false);
            setSelectedExistingMemberId('');
    };
    
    const handleOpenPaymentModal = (memberId: string, monthIndex: number) => {
        setSelectedMemberId(memberId);
        setSelectedMonthIndex(monthIndex);
        setCurrentPaymentContext({ memberId, monthIndex });
        setPaymentModalOpen(true);
    };

    const handleRecordInstallment = () => {
        if (!committee || !currentPaymentContext) return;
        
        const existingPayments = getPaymentsForMemberByMonth(committee.id, currentPaymentContext.memberId, currentPaymentContext.monthIndex);
        const totalPaid = existingPayments.reduce((sum: number, p: CommitteePayment) => sum + p.amountPaid, 0);
        
        // Calculate how many shares this member has
        const memberShares = committee.memberIds.filter(id => id === currentPaymentContext.memberId).length;
        const totalAmountDue = committee.amountPerMember * memberShares;
        const remainingAmount = totalAmountDue - totalPaid;
        
        if (installmentAmount > remainingAmount) {
          setPaymentError(t('maxInstallmentReached', { amount: totalAmountDue, maxAllowed: remainingAmount }));
                return;
            }

        recordPayment(committee.id, {
                memberId: currentPaymentContext.memberId,
                monthIndex: currentPaymentContext.monthIndex,
                amountPaid: installmentAmount,
                paymentDate: new Date().toISOString(), // Use full ISO string for recent activity
                status: 'Cleared'
        });
        
            setPaymentModalOpen(false);
            setInstallmentAmount(0);
        setInstallmentDate(new Date().toISOString().split('T')[0]);
            setPaymentError('');
        setCurrentPaymentContext(null);
    };

    const handleGenerateReceiptForInstallment = (payment: CommitteePayment) => {
        if (!committee) return;
        
      const member = getMemberById(payment.memberId);
        if (!member) return;

      setReceiptData({
        committeeName: committee.title,
        payerName: member.name,
        amount: payment.amountPaid, 
        paymentDate: payment.paymentDate,
          month: getCommitteeMonthName(committee.startDate, payment.monthIndex, language),
          monthIndex: payment.monthIndex,
          paymentId: payment.id
      });
      setReceiptModalOpen(true);
    };

    const handleTogglePayout = (turn: CommitteeMemberTurn) => {
        if (!committee) return;

        // If trying to mark as PAID
        if (!turn.paidOut) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();

            // Check if any other turn was already paid in the current calendar month
            const paidThisMonth = committee.payoutTurns.find(pt => {
                if (!pt.paidOut || !pt.payoutDate) return false;
                const payoutDate = new Date(pt.payoutDate);
                return payoutDate.getMonth() === currentMonth && payoutDate.getFullYear() === currentYear;
            });

            if (paidThisMonth) {
                const monthName = new Date().toLocaleString(language === Language.UR ? 'ur-PK' : 'en-US', { month: 'long' });
                alert(t('onePayoutPerMonth', { monthName }));
                return; // Stop the action
            }
        }

        // If validation passes or we are un-marking, proceed with the update
        const updatedTurn = !turn.paidOut
            ? {
                ...turn,
                paidOut: true,
                payoutDate: new Date().toISOString()
              }
            : {
                ...turn,
                paidOut: false,
                payoutDate: undefined
              };

        updatePayoutTurn(committee.id, updatedTurn);
    };

    // Lucky Draw Functions
    const handleLuckyDraw = () => {
      if (!committee) return;

      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      // Check if any turn was already paid in the current calendar month
      const paidThisMonth = committee.payoutTurns.find(pt => {
          if (!pt.paidOut || !pt.payoutDate) return false;
          const payoutDate = new Date(pt.payoutDate);
          return payoutDate.getMonth() === currentMonth && payoutDate.getFullYear() === currentYear;
      });

      if (paidThisMonth) {
        const monthName = new Date().toLocaleString(language === Language.UR ? 'ur-PK' : 'en-US', { month: 'long' });
        alert(t('luckyDrawOnePayoutPerMonth', { monthName }));
        return;
      }
      
      // Get eligible members (not paid out yet)
      const eligibleTurns = committee.payoutTurns.filter(turn => !turn.paidOut);
      
      if (eligibleTurns.length === 0) {
        alert(t('allMembersPaidOut'));
        return;
      }
      
      setIsDrawing(true);
      setIsLuckyDrawModalOpen(true);
      
      // Simulate drawing animation
      setTimeout(() => {
        // Randomly select a winner
        const randomIndex = Math.floor(Math.random() * eligibleTurns.length);
        const winningTurn = eligibleTurns[randomIndex];
        const winner = allMembers.find(m => m.id === winningTurn.memberId);
        
        if (winner) {
          setLuckyDrawWinner(winner);
          setWinningTurn(winningTurn);
          setShowPartyEffects(true);
          
          // Play continuous celebration sound
          playContinuousSound();
          
          // Mark the winner as paid out
          const updatedTurn = {
            ...winningTurn,
            paidOut: true,
            payoutDate: new Date().toISOString()
          };
          
          updatePayoutTurn(committee.id, updatedTurn);
        }
        
        setIsDrawing(false);
      }, 2000); // 2 second animation
    };

    const handleCloseLuckyDrawModal = () => {
        setIsLuckyDrawModalOpen(false);
        setLuckyDrawWinner(null);
        setWinningTurn(null);
        setShowPartyEffects(false);
        setIsDrawing(false);
        stopContinuousSound();
    };

    // Play winning sound effect
    const playWinningSound = () => {
      try {
        // Create audio context for sound effect
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Create a party popper/fire sound effect
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set up the party popper sound (sharp pop followed by sparkles)
        oscillator1.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator1.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.1);
        oscillator1.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.2);
        
        oscillator2.frequency.setValueAtTime(400, audioContext.currentTime + 0.1);
        oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
        oscillator2.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.4);
        oscillator2.start(audioContext.currentTime + 0.1);
        oscillator2.stop(audioContext.currentTime + 0.4);
      } catch (error) {
        console.log('Sound effect not supported');
      }
    };

    // Play continuous celebration sound
    const playContinuousSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        const playCelebrationSound = () => {
          const oscillator1 = audioContext.createOscillator();
          const oscillator2 = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator1.connect(gainNode);
          oscillator2.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          // Celebration sound (higher pitched, more festive)
          oscillator1.frequency.setValueAtTime(600, audioContext.currentTime);
          oscillator1.frequency.exponentialRampToValueAtTime(1000, audioContext.currentTime + 0.2);
          oscillator1.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.4);
          
          oscillator2.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
          oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.3);
          oscillator2.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.5);
          
          gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          
          oscillator1.start(audioContext.currentTime);
          oscillator1.stop(audioContext.currentTime + 0.5);
          oscillator2.start(audioContext.currentTime + 0.1);
          oscillator2.stop(audioContext.currentTime + 0.5);
        };
        
        // Play first sound immediately
        playCelebrationSound();
        
        // Set up interval to play sound every 2 seconds
        soundIntervalRef.current = setInterval(playCelebrationSound, 2000);
        
      } catch (error) {
        console.log('Continuous sound effect not supported');
      }
    };

    // Stop continuous sound
    const stopContinuousSound = () => {
      if (soundIntervalRef.current) {
        clearInterval(soundIntervalRef.current);
        soundIntervalRef.current = null;
      }
    };

    // Helper to get base64 logo for PDF
    const getLogoBase64 = async () => {
      const response = await fetch('/logo.png');
      const blob = await response.blob();
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };

    const drawTextLetterhead = (
      pdf: jsPDF,
      pdfWidth: number,
      pdfHeight: number,
      userProfile: { phone?: string; email?: string; address?: string },
      logoBase64: string,
      appName: string,
      language: string = Language.EN
    ) => {
      // Set up Urdu font if needed
      if (language === Language.UR) {
        pdf.setFont('JameelNooriNastaleeq', 'normal');
      }
      // Header
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', pdfWidth/2-30, 20, 60, 60);
      }
      pdf.setFontSize(18);
      pdf.setTextColor('#0e7490');
      if (language === Language.UR) {
        pdf.setFont('JameelNooriNastaleeq', 'normal');
      }
      pdf.text(appName, pdfWidth/2, 95, { align: 'center' });
      pdf.setDrawColor('#06b6d4');
      pdf.setLineWidth(1);
      pdf.line(40, 110, pdfWidth-40, 110);
      // Footer
      const footerY = pdfHeight-40;
      pdf.setFillColor('#06b6d4');
      pdf.rect(0, footerY-10, pdfWidth, 30, 'F');
      pdf.setFontSize(11);
      pdf.setTextColor('#fff');
      const details = [userProfile.phone, userProfile.email, userProfile.address].filter(Boolean).join(' | ');
      if (language === Language.UR) {
        pdf.setFont('JameelNooriNastaleeq', 'normal');
      }
      pdf.text(details, pdfWidth/2, footerY+8, { align: 'center' });
      pdf.setTextColor('#222'); // Reset for content
    };

    // Generate selectable text PDF for a single receipt
    const generateTextReceiptPdf = async (
      receiptData: {
        committeeName: string;
        payerName: string;
        amount: number;
        paymentDate: string;
        month: string;
        monthIndex?: number;
        paymentId?: string;
      },
      userProfile: { phone?: string; email?: string; address?: string },
      logoBase64: string,
      appName: string,
      t: (key: string) => string,
      language: string
    ) => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
      drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoBase64, appName, language);
      pdf.setFontSize(15);
      pdf.setTextColor('#0e7490');
      pdf.setFont(undefined, 'bold');
      pdf.text(t('receipt'), pdfWidth/2, 140, { align: 'center' });
      pdf.setTextColor('#222');
      pdf.setFontSize(12);
      let y = 180;
      const lineGap = 28;

      // Committee Name with bold title
      pdf.setFont(undefined, 'bold');
      pdf.text(`${t('committeeName')}:`, 60, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(receiptData.committeeName || '', 180, y);
      y += lineGap;

      // Payer Name with bold title
      pdf.setFont(undefined, 'bold');
      pdf.text(`${t('payerName')}:`, 60, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(receiptData.payerName || '', 180, y);
      y += lineGap;

      // Month with bold title
      pdf.setFont(undefined, 'bold');
      pdf.text(`${t('month')}:`, 60, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(receiptData.month || '', 180, y);
      y += lineGap;

      // Amount Paid with bold title
      pdf.setFont(undefined, 'bold');
      pdf.text(`${t('amountPaid')}:`, 60, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(`PKR ${(receiptData.amount ?? 0).toLocaleString()}`, 180, y);
      y += lineGap;

      // Date with bold title
      pdf.setFont(undefined, 'bold');
      pdf.text(`${t('date')}:`, 60, y);
      pdf.setFont(undefined, 'normal');
      pdf.text(formatDate(receiptData.paymentDate ?? '', language) || '', 180, y);
      y += lineGap + 10;

      // Auto-generated note at the bottom
      const footerY = pdfHeight - 40;
      const noteY = footerY - 50;
      pdf.setFontSize(10);
      pdf.setTextColor('#6c757d');
      pdf.text(t('autoGeneratedReceiptNote'), pdfWidth/2, noteY, { align: 'center' });
      pdf.save(`receipt_${receiptData.committeeName.replace(/\s/g, '_')}_${receiptData.payerName.replace(/\s/g, '_')}.pdf`);
    };

    // Generate image-based PDF for Urdu content (ensures proper font rendering)
    const generateImageBasedReceiptPdf = async (
      receiptData: {
        committeeName: string;
        payerName: string;
        amount: number;
        paymentDate: string;
        month: string;
        monthIndex?: number;
        paymentId?: string;
      },
      userProfile: { phone?: string; email?: string; address?: string },
      logoBase64: string,
      appName: string,
      t: (key: string) => string,
      language: string
    ) => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add header with logo
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', pdfWidth/2-30, 20, 60, 60);
      }

      // Create hidden div for Urdu content rendering
      const hiddenDiv = document.createElement('div');
      hiddenDiv.style.position = 'absolute';
      hiddenDiv.style.left = '-9999px';
      hiddenDiv.style.top = '-9999px';
      hiddenDiv.style.width = '500px';
      hiddenDiv.style.padding = '20px';
      hiddenDiv.style.backgroundColor = 'white';
      hiddenDiv.style.fontFamily = language === Language.UR ? 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' : 'Arial, sans-serif';
      hiddenDiv.style.direction = language === Language.UR ? 'rtl' : 'ltr';
      hiddenDiv.style.textAlign = language === Language.UR ? 'right' : 'left';
      hiddenDiv.style.fontSize = '14px';
      hiddenDiv.style.lineHeight = '1.6';
      hiddenDiv.style.color = '#333';

      // Build receipt content
      const receiptContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0e7490; font-size: 24px; margin: 0 0 20px 0; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">
            ${t('receipt')}
          </h1>
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>${t('committeeName')}:</strong> ${receiptData.committeeName || ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>${t('payerName')}:</strong> ${receiptData.payerName || ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>${t('month')}:</strong> ${receiptData.month || ''}
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>${t('amountPaid')}:</strong> PKR ${(receiptData.amount ?? 0).toLocaleString()}
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong>${t('date')}:</strong> ${formatDate(receiptData.paymentDate ?? '', language) || ''}
        </div>
        
        <div style="margin-top: 40px; text-align: center; font-size: 12px; color: #6c757d;">
          ${t('autoGeneratedReceiptNote')}
        </div>
      `;

      hiddenDiv.innerHTML = receiptContent;
      document.body.appendChild(hiddenDiv);

      try {
        // Capture the content as image
        const canvas = await html2canvas(hiddenDiv, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Calculate image dimensions to fit in PDF
        const imgWidth = 400;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, 120, imgWidth, imgHeight);

        // Add footer
        const footerY = pdfHeight - 40;
        pdf.setFillColor('#06b6d4');
        pdf.rect(0, footerY - 10, pdfWidth, 30, 'F');
        pdf.setFontSize(11);
        pdf.setTextColor('#fff');
        const details = [userProfile.phone, userProfile.email, userProfile.address].filter(Boolean).join(' | ');
        pdf.text(details, pdfWidth/2, footerY + 8, { align: 'center' });

        pdf.save(`receipt_${receiptData.committeeName.replace(/\s/g, '_')}_${receiptData.payerName.replace(/\s/g, '_')}.pdf`);
      } finally {
        // Clean up
        document.body.removeChild(hiddenDiv);
      }
    };

    // Generate image-based PDF for monthly receipts
    const generateImageBasedMonthlyReceiptsPdf = async (
      committee: Committee,
      monthIndex: number,
      membersWithShares: Array<{ member: Member; shares: number }>,
      memberPaymentsMap: Map<string, number>,
      totalCollected: number,
      totalRemaining: number,
      totalDue: number,
      payoutHistory: Array<{
        memberName: string;
        shares: number;
        payoutAmount: number;
        paidOut: boolean;
        payoutDate?: string;
      }>,
      userProfile: { phone?: string; email?: string; address?: string },
      logoBase64: string,
      appName: string,
      t: (key: string) => string,
      language: string
    ) => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Add header with logo
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', pdfWidth/2-30, 20, 60, 60);
      }

      // Create hidden div for table rendering
      const hiddenDiv = document.createElement('div');
      hiddenDiv.style.position = 'absolute';
      hiddenDiv.style.left = '-9999px';
      hiddenDiv.style.top = '-9999px';
      hiddenDiv.style.width = '700px';
      hiddenDiv.style.padding = '20px';
      hiddenDiv.style.backgroundColor = 'white';
      hiddenDiv.style.fontFamily = language === Language.UR ? 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' : 'Arial, sans-serif';
      hiddenDiv.style.direction = language === Language.UR ? 'rtl' : 'ltr';
      hiddenDiv.style.fontSize = '12px';

      // Build summary section
      const summarySection = `
        <div style="margin-bottom: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px;">
          <h3 style="color: #0e7490; margin: 0 0 15px 0; font-size: 16px;">${t('summary')}</h3>
          <div><strong>${t('committeeName')}:</strong> ${committee.title}</div>
          <div><strong>${t('type')}:</strong> ${t(committee.type.toLowerCase())}</div>
          <div><strong>${t('duration')}:</strong> ${committee.duration} ${t(committee.type === CommitteeType.MONTHLY ? 'months' : committee.type === CommitteeType.WEEKLY ? 'weeks' : 'days')}</div>
          <div><strong>${t('startDate')}:</strong> ${formatDate(committee.startDate, language)}</div>
          <div><strong>${t('amountPerMember')}:</strong> PKR ${committee.amountPerMember.toLocaleString()}</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 10px;">
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #0e7490;">${t('totalDue')}</div>
              <div style="font-size: 18px; font-weight: bold;">PKR ${totalDue.toLocaleString()}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #16a34a;">${t('totalCollected')}</div>
              <div style="font-size: 18px; font-weight: bold; color: #16a34a;">PKR ${totalCollected.toLocaleString()}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold; color: #dc2626;">${t('totalRemaining')}</div>
              <div style="font-size: 18px; font-weight: bold; color: #dc2626;">PKR ${totalRemaining.toLocaleString()}</div>
            </div>
          </div>
        </div>
      `;

      // Build member payments table
      let memberTableRows = '';
      membersWithShares.forEach((memberData, idx) => {
        const paid = memberPaymentsMap.get(memberData.member.id) || 0;
        const memberTotalDue = committee.amountPerMember * memberData.shares;
        const remaining = memberTotalDue - paid;
        memberTableRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${memberData.member.name || ''}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${memberData.shares}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${memberTotalDue.toLocaleString()}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${paid.toLocaleString()}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${remaining.toLocaleString()}</td>
          </tr>
        `;
      });

      const memberPaymentsTable = `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #0e7490; margin: 0 0 15px 0; font-size: 16px;">${t('memberPayments')}</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #06b6d4; color: white;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${t('serialNo') || 'S.No'}</th>
                <th style="border: 1px solid #ddd; padding: 8px;">${t('memberName')}</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${t('shares')}</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t('totalDue')}</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t('amountPaid')}</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t('remainingAmount')}</th>
        </tr>
            </thead>
            <tbody>
              ${memberTableRows}
            </tbody>
          </table>
        </div>
      `;

      // Build payout history section
      let payoutHistorySection = '';
      if (payoutHistory.length > 0) {
        let payoutTableRows = '';
        payoutHistory.forEach((payout, idx) => {
          payoutTableRows += `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${payout.memberName}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${payout.shares}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${payout.payoutAmount.toLocaleString()}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">
                <span style="color: ${payout.paidOut ? '#16a34a' : '#dc2626'}; font-weight: bold;">
                  ${payout.paidOut ? t('paid') : t('pending')}
                </span>
              </td>
              <td style="border: 1px solid #ddd; padding: 8px;">${payout.payoutDate ? formatDate(payout.payoutDate, language) : '-'}</td>
            </tr>
          `;
        });

        payoutHistorySection = `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #0e7490; margin: 0 0 15px 0; font-size: 16px;">${t('payoutHistory')}</h3>
            <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #06b6d4; color: white;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">S.No</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('memberName')}</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${t('shares')}</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t('payoutAmount')}</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${t('status')}</th>
                  <th style="border: 1px solid #ddd; padding: 8px;">${t('payoutDate')}</th>
            </tr>
          </thead>
          <tbody>
                ${payoutTableRows}
          </tbody>
        </table>
          </div>
        `;
      }

      const tableContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0e7490; font-size: 20px; margin: 0 0 20px 0; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">
            ${t('monthly')} Report - ${getCommitteeMonthName(committee?.startDate ?? '', monthIndex, language)}
          </h1>
        </div>
        ${summarySection}
        ${memberPaymentsTable}
        ${payoutHistorySection}
      `;

      hiddenDiv.innerHTML = tableContent;
      document.body.appendChild(hiddenDiv);

      try {
        // Capture the content as image
        const canvas = await html2canvas(hiddenDiv, {
          backgroundColor: '#ffffff',
          scale: 2, // Higher resolution
          useCORS: true,
          allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        
        // Calculate image dimensions to fit in PDF
        const imgWidth = 500;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add image to PDF
        pdf.addImage(imgData, 'PNG', (pdfWidth - imgWidth) / 2, 120, imgWidth, imgHeight);

        // Add footer
        const footerY = pdfHeight - 40;
        pdf.setFillColor('#06b6d4');
        pdf.rect(0, footerY - 10, pdfWidth, 30, 'F');
        pdf.setFontSize(11);
        pdf.setTextColor('#fff');
        const details = [userProfile.phone, userProfile.email, userProfile.address].filter(Boolean).join(' | ');
        pdf.text(details, pdfWidth/2, footerY + 8, { align: 'center' });

        pdf.save(`monthly_report_${committee.title.replace(/\s/g, '_')}_${getCommitteeMonthName(committee?.startDate ?? '', monthIndex, 'en').replace(/\s/g, '_')}.pdf`);
      } finally {
        // Clean up
        document.body.removeChild(hiddenDiv);
      }
    };

    const generateImageBasedMemberHistoryPdf = async (
      member: Member,
      memberCommittees: Committee[],
      userProfile: { phone?: string; email?: string; address?:string },
      logoBase64: string,
      appName: string,
      t: (key: string) => string,
      language: string
    ) => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const topMargin = 20;
      const bottomMargin = 70; // Increased margin

      // --- 1. Personal Details + Committee Participation Heading + First Committee ---
      const firstPageDiv = document.createElement('div');
      firstPageDiv.style.position = 'absolute';
      firstPageDiv.style.left = '-9999px';
      firstPageDiv.style.top = '0';
      firstPageDiv.style.width = `${pdfWidth}px`;
      firstPageDiv.style.backgroundColor = 'white';
      firstPageDiv.style.fontFamily = language === Language.UR ? 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' : 'Arial, sans-serif';
      firstPageDiv.style.direction = language === Language.UR ? 'rtl' : 'ltr';
      firstPageDiv.style.fontSize = '12px';
      firstPageDiv.style.lineHeight = '1.6';

      // Prepare first committee details (if any)
      let firstCommitteeContent = '';
      if (memberCommittees.length > 0) {
        const committee = memberCommittees[0];
        const paymentsForCommittee = committee.payments.filter(p => p.memberId === member.id && p.status === 'Cleared')
          .sort((a,b) => a.monthIndex - b.monthIndex || new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
        const totalContributed = paymentsForCommittee.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
        const totalDue = (committee.amountPerMember || 0) * (committee.duration || 0);
        const remainingAmount = totalDue - totalContributed;
        let paymentsTable = '';
        if (paymentsForCommittee.length > 0) {
          paymentsTable = `
            <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px;">
              <thead>
                <tr style="background-color: #06b6d4; color: white;">
                  <th style="border: 1px solid #ddd; padding: 5px;">${t('month')}</th>
                  <th style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">${t('installmentAmount')}</th>
                  <th style="border: 1px solid #ddd; padding: 5px;">${t('paymentDate')}</th>
                  <th style="border: 1px solid #ddd; padding: 5px;">${t('status')}</th>
                </tr>
              </thead>
              <tbody>
                ${paymentsForCommittee.map(p => `
                  <tr style="page-break-inside: avoid;">
                    <td style="border: 1px solid #ddd; padding: 5px;">${getCommitteeMonthName(committee?.startDate ?? '', p.monthIndex, language) || ''}</td>
                    <td style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">PKR ${typeof p.amountPaid === 'number' ? p.amountPaid.toLocaleString() : '0'}</td>
                    <td style="border: 1px solid #ddd; padding: 5px;">${p.paymentDate ? formatDate(p.paymentDate, language) : 'N/A'}</td>
                    <td style="border: 1px solid #ddd; padding: 5px; color: #16a34a; font-weight: bold;">${t((p.status || '').toLowerCase())}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `;
        }
        // Payout history: show ALL payout turns (not just paidOut)
        const payoutsForCommittee = committee.payoutTurns.filter(pt => pt.memberId === member.id)
          .sort((a,b) => a.turnMonthIndex - b.turnMonthIndex);
        let payoutHistoryContent = '';
        if (payoutsForCommittee.length > 0) {
          payoutHistoryContent = `
            <div style="margin: 20px 0; page-break-inside: avoid;">
              <h4 style="color: #0e7490; margin: 0 0 10px 0; font-size: 14px;">${t('payoutHistory')}</h4>
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <thead>
                  <tr style="background-color: #06b6d4; color: white;">
                    <th style="border: 1px solid #ddd; padding: 5px;">${t('turnMonth')}</th>
                    <th style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">${t('amountPKR')}</th>
                    <th style="border: 1px solid #ddd; padding: 5px;">${t('date')}</th>
                    <th style="border: 1px solid #ddd; padding: 5px;">${t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${payoutsForCommittee.map(pt => `
                    <tr style="page-break-inside: avoid;">
                      <td style="border: 1px solid #ddd; padding: 5px;">${getCommitteeMonthName(committee?.startDate ?? '', pt.turnMonthIndex, language) || ''}</td>
                      <td style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">PKR ${(committee.amountPerMember * committee.memberIds.length).toLocaleString()}</td>
                      <td style="border: 1px solid #ddd; padding: 5px;">${pt.payoutDate ? formatDate(pt.payoutDate, language) : 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 5px; color: ${pt.paidOut ? '#16a34a' : '#dc2626'}; font-weight: bold;">${pt.paidOut ? t('cleared') : t('unpaid')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        } else {
          payoutHistoryContent = `<div style="margin: 15px 0; color: #666;">${t('noPayoutsReceived')}</div>`;
        }
        firstCommitteeContent = `
          <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 5px; page-break-inside: avoid;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 15px;">
              ${committee.title || ''}
            </h3>
            <div style="margin-bottom: 10px;"><strong>${t('startDate')}:</strong> ${formatDate(committee.startDate ?? '', language)}</div>
            <div style="margin-bottom: 10px;"><strong>${t('duration')}:</strong> ${(committee.duration ?? '') + ' ' + t((committee.type?.toLowerCase?.() === 'monthly' ? 'months' : committee.type?.toLowerCase?.() === 'weekly' ? 'weeks' : 'days') ?? 'months')}</div>
            <div style="margin-bottom: 10px;"><strong>${t('amountPerMember')}:</strong> PKR ${(typeof committee.amountPerMember === 'number' ? committee.amountPerMember.toLocaleString() : '0')}</div>
            ${paymentsForCommittee.length > 0 ? `
              <div style="margin: 15px 0; page-break-inside: avoid;">
                <h4 style="color: #0e7490; margin: 0 0 10px 0; font-size: 14px;">${t('paymentHistory')}</h4>
                ${paymentsTable}
                <div style="margin-top: 10px; text-align: ${language === Language.UR ? 'right' : 'left'};"><strong>${t('totalContributedThisCommittee')}:</strong> PKR ${totalContributed.toLocaleString()}</div>
                <div style="text-align: ${language === Language.UR ? 'right' : 'left'};"><strong>${t('remainingAmount')}:</strong> PKR ${remainingAmount.toLocaleString()}</div>
              </div>
            ` : `<div style="margin: 15px 0; color: #666;">${t('noPaymentsMade')}</div>`}
            ${payoutHistoryContent}
          </div>
        `;
      }

      firstPageDiv.innerHTML = `
        <div style="padding: 0 20px;">
          <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 15px;">
            ${logoBase64 ? `<img src="${logoBase64}" style="width: 60px; height: 60px;"/>` : ''}
            <h2 style="margin: 5px 0 0 0; color: #333; font-size: 14px;">${appName}</h2>
          </div>
          <div style="text-align: center; margin-bottom: 25px;">
            <h1 style="color: #0e7490; font-size: 22px; margin: 0 0 15px 0; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">
              ${t('memberHistoryReport')}
            </h1>
          </div>
          <div style="margin-bottom: 25px; border: 1px solid #eee; padding: 15px; border-radius: 5px;">
            <h2 style="color: #0e7490; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 16px;">
              ${t('personalDetails')}
            </h2>
            <div style="position: relative; min-height: 120px;">
              <div style="position: absolute; top: 0; ${language === Language.UR ? 'right: 0;' : 'left: 0;'} padding-${language === Language.UR ? 'left' : 'right'}: 100px;">
                <div><strong>${t('name')}:</strong> ${member.name || ''}</div>
                <div><strong>${t('phone')}:</strong> ${member.phone || ''}</div>
                <div><strong>${t('cnic')}:</strong> ${member.cnic || ''}</div>
                ${member.address ? `<div><strong>${t('address')}:</strong> ${member.address}</div>` : ''}
                <div><strong>${t('joiningDate')}:</strong> ${formatDate(member.joiningDate ?? '', language)}</div>
              </div>
              ${member.profilePictureUrl && member.profilePictureUrl !== DEFAULT_PROFILE_PIC ? 
                `<div style="position: absolute; top: 0; ${language === Language.UR ? 'left: 10px;' : 'right: 10px;'}">
                  <img src="${member.profilePictureUrl}" alt="Profile" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 2px solid #06b6d4;" />
                </div>` : ''
              }
            </div>
          </div>
          <div>
            <h2 style="color: #0e7490; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 16px;">
              ${t('committeeParticipation')}
            </h2>
            ${memberCommittees.length === 0 ? `<div style="color: #666;">${language === Language.UR ? 'یہ رکن کسی کمیٹی میں شامل نہیں۔' : 'This member is not part of any committees.'}</div>` : ''}
            ${firstCommitteeContent}
          </div>
        </div>
      `;
      document.body.appendChild(firstPageDiv);

      try {
        // Render first page (summary + heading + first committee)
        const firstPageCanvas = await html2canvas(firstPageDiv, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          width: firstPageDiv.scrollWidth,
          height: firstPageDiv.scrollHeight,
        });
        const firstPageImgData = firstPageCanvas.toDataURL('image/png');
        const firstPageImgWidth = pdfWidth;
        const firstPageImgHeight = (firstPageCanvas.height * firstPageImgWidth) / firstPageCanvas.width;
        pdf.addImage(firstPageImgData, 'PNG', 0, topMargin, firstPageImgWidth, firstPageImgHeight);
        pdf.addPage();

        // --- 2. Each subsequent committee as a separate page ---
        for (let i = 1; i < memberCommittees.length; i++) {
          const committee = memberCommittees[i];
          const committeeDiv = document.createElement('div');
          committeeDiv.style.position = 'absolute';
          committeeDiv.style.left = '-9999px';
          committeeDiv.style.top = '0';
          committeeDiv.style.width = `${pdfWidth}px`;
          committeeDiv.style.backgroundColor = 'white';
          committeeDiv.style.fontFamily = language === Language.UR ? 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' : 'Arial, sans-serif';
          committeeDiv.style.direction = language === Language.UR ? 'rtl' : 'ltr';
          committeeDiv.style.fontSize = '12px';
          committeeDiv.style.lineHeight = '1.6';

          // Payment history table
          const paymentsForCommittee = committee.payments.filter(p => p.memberId === member.id && p.status === 'Cleared')
            .sort((a,b) => a.monthIndex - b.monthIndex || new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
          const totalContributed = paymentsForCommittee.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
          const totalDue = (committee.amountPerMember || 0) * (committee.duration || 0);
          const remainingAmount = totalDue - totalContributed;
          let paymentsTable = '';
          if (paymentsForCommittee.length > 0) {
            paymentsTable = `
              <table style="width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px;">
                <thead>
                  <tr style="background-color: #06b6d4; color: white;">
                    <th style="border: 1px solid #ddd; padding: 5px;">${t('month')}</th>
                    <th style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">${t('installmentAmount')}</th>
                    <th style="border: 1px solid #ddd; padding: 5px;">${t('paymentDate')}</th>
                    <th style="border: 1px solid #ddd; padding: 5px;">${t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentsForCommittee.map(p => `
                    <tr style="page-break-inside: avoid;">
                      <td style="border: 1px solid #ddd; padding: 5px;">${getCommitteeMonthName(committee?.startDate ?? '', p.monthIndex, language) || ''}</td>
                      <td style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">PKR ${typeof p.amountPaid === 'number' ? p.amountPaid.toLocaleString() : '0'}</td>
                      <td style="border: 1px solid #ddd; padding: 5px;">${p.paymentDate ? formatDate(p.paymentDate, language) : 'N/A'}</td>
                      <td style="border: 1px solid #ddd; padding: 5px; color: #16a34a; font-weight: bold;">${t((p.status || '').toLowerCase())}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `;
          }
          // Payout history: show ALL payout turns (not just paidOut)
          const payoutsForCommittee = committee.payoutTurns.filter(pt => pt.memberId === member.id)
            .sort((a,b) => a.turnMonthIndex - b.turnMonthIndex);
          let payoutHistoryContent = '';
          if (payoutsForCommittee.length > 0) {
            payoutHistoryContent = `
              <div style="margin: 20px 0; page-break-inside: avoid;">
                <h4 style="color: #0e7490; margin: 0 0 10px 0; font-size: 14px;">${t('payoutHistory')}</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                  <thead>
                    <tr style="background-color: #06b6d4; color: white;">
                      <th style="border: 1px solid #ddd; padding: 5px;">${t('turnMonth')}</th>
                      <th style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">${t('amountPKR')}</th>
                      <th style="border: 1px solid #ddd; padding: 5px;">${t('date')}</th>
                      <th style="border: 1px solid #ddd; padding: 5px;">${t('status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${payoutsForCommittee.map(pt => `
                      <tr style="page-break-inside: avoid;">
                        <td style="border: 1px solid #ddd; padding: 5px;">${getCommitteeMonthName(committee?.startDate ?? '', pt.turnMonthIndex, language) || ''}</td>
                        <td style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">PKR ${(committee.amountPerMember * committee.memberIds.length).toLocaleString()}</td>
                        <td style="border: 1px solid #ddd; padding: 5px;">${pt.payoutDate ? formatDate(pt.payoutDate, language) : 'N/A'}</td>
                        <td style="border: 1px solid #ddd; padding: 5px; color: ${pt.paidOut ? '#16a34a' : '#dc2626'}; font-weight: bold;">${pt.paidOut ? t('cleared') : t('unpaid')}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          } else {
            payoutHistoryContent = `<div style="margin: 15px 0; color: #666;">${t('noPayoutsReceived')}</div>`;
          }
          committeeDiv.innerHTML = `
            <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 5px; page-break-inside: avoid;">
              <h3 style="color: #1f2937; margin: 0 0 15px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; font-size: 15px;">
                ${committee.title || ''}
              </h3>
              <div style="margin-bottom: 10px;"><strong>${t('startDate')}:</strong> ${formatDate(committee.startDate ?? '', language)}</div>
              <div style="margin-bottom: 10px;"><strong>${t('duration')}:</strong> ${(committee.duration ?? '') + ' ' + t((committee.type?.toLowerCase?.() === 'monthly' ? 'months' : committee.type?.toLowerCase?.() === 'weekly' ? 'weeks' : 'days') ?? 'months')}</div>
              <div style="margin-bottom: 10px;"><strong>${t('amountPerMember')}:</strong> PKR ${(typeof committee.amountPerMember === 'number' ? committee.amountPerMember.toLocaleString() : '0')}</div>
              ${paymentsForCommittee.length > 0 ? `
                <div style="margin: 15px 0; page-break-inside: avoid;">
                  <h4 style="color: #0e7490; margin: 0 0 10px 0; font-size: 14px;">${t('paymentHistory')}</h4>
                  ${paymentsTable}
                  <div style="margin-top: 10px; text-align: ${language === Language.UR ? 'right' : 'left'};"><strong>${t('totalContributedThisCommittee')}:</strong> PKR ${totalContributed.toLocaleString()}</div>
                  <div style="text-align: ${language === Language.UR ? 'right' : 'left'};"><strong>${t('remainingAmount')}:</strong> PKR ${remainingAmount.toLocaleString()}</div>
                </div>
              ` : `<div style="margin: 15px 0; color: #666;">${t('noPaymentsMade')}</div>`}
              ${payoutHistoryContent}
            </div>
          `;
          document.body.appendChild(committeeDiv);
          // Render committee page
          const committeeCanvas = await html2canvas(committeeDiv, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            allowTaint: true,
            width: committeeDiv.scrollWidth,
            height: committeeDiv.scrollHeight,
          });
          const committeeImgData = committeeCanvas.toDataURL('image/png');
          const committeeImgWidth = pdfWidth;
          const committeeImgHeight = (committeeCanvas.height * committeeImgWidth) / committeeCanvas.width;
          pdf.addImage(committeeImgData, 'PNG', 0, topMargin, committeeImgWidth, committeeImgHeight);
          pdf.addPage();
          document.body.removeChild(committeeDiv);
        }

        // Remove last blank page if any committees were added
        if (memberCommittees.length > 0) {
          pdf.deletePage(pdf.getNumberOfPages());
        }

        // Add footers to all pages
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          pdf.setPage(i);
          const footerY = pdfHeight - 50; // Adjusted for new margin
          pdf.setFillColor('#06b6d4');
          pdf.rect(0, footerY, pdfWidth, 50, 'F');
          pdf.setFontSize(10);
          pdf.setTextColor('#fff');
          const details = [userProfile.phone, userProfile.email, userProfile.address].filter(Boolean).join(' | ');
          pdf.text(details, pdfWidth / 2, footerY + 20, { align: 'center' });
          pdf.text(`${t('page')} ${i} / ${pageCount}`, pdfWidth - 55, footerY + 20, { align: 'right' });
        }

        pdf.save(`member_history_${member.name.replace(/\s/g, '_')}.pdf`);
      } finally {
        document.body.removeChild(firstPageDiv);
      }
    };
    
    // Update handleDownloadSingleReceiptPdf to use image-based PDF for Urdu
    const handleDownloadSingleReceiptPdf = async () => {
        if (!receiptData) return;
      const logoBase64 = await getLogoBase64();
      
      if (language === Language.UR) {
        await generateImageBasedReceiptPdf(receiptData, userProfile, logoBase64, t('appName'), t, language);
      } else {
      await generateTextReceiptPdf(receiptData, userProfile, logoBase64, t('appName'), t, language);
      }
    };

    // Update handleDownloadMonthlyReceipts to use image-based PDF for Urdu
    const handleDownloadMonthlyReceipts = async () => {
      if (!committee) return;
      setIsLoading(true);
      const monthIndex = selectedMonthForReceipts;
      
      // Get members with their share counts
      const membersWithShares = committee.memberIds.reduce((acc: Array<{ member: Member; shares: number }>, memberId) => {
        const member = allMembers.find(m => m.id === memberId);
        if (member) {
          const existingEntry = acc.find(entry => entry.member.id === memberId);
          if (existingEntry) {
            existingEntry.shares += 1;
          } else {
            acc.push({ member, shares: 1 });
          }
        }
        return acc;
      }, []);
      
      const paymentsForMonth = committee.payments.filter(p => p.monthIndex === monthIndex && p.status === 'Cleared');
      const memberPaymentsMap = new Map();
      
      // Calculate payments considering shares
      membersWithShares.forEach(memberData => {
        const paid = paymentsForMonth.filter(p => p.memberId === memberData.member.id).reduce((sum, p) => sum + p.amountPaid, 0);
        memberPaymentsMap.set(memberData.member.id, paid);
      });
      
      // Calculate totals considering shares
      let totalDue = 0;
      let totalCollected = 0;
      let totalRemaining = 0;
      
      const tableBody = membersWithShares.map((memberData, idx) => {
        const paid = memberPaymentsMap.get(memberData.member.id) || 0;
        const memberTotalDue = committee.amountPerMember * memberData.shares;
        const remaining = memberTotalDue - paid;
        
        totalDue += memberTotalDue;
          totalCollected += paid;
          totalRemaining += remaining;
        
          return [
            (idx + 1).toString(),
          memberData.member.name || '',
          memberData.shares.toString(),
          `PKR ${memberTotalDue.toLocaleString()}`,
            `PKR ${paid.toLocaleString()}`,
            `PKR ${remaining.toLocaleString()}`
          ];
      });

      // Get payout history for this month - ONLY show who was actually paid
      const payoutHistory = committee.payoutTurns
        .filter(turn => turn.turnMonthIndex === monthIndex && turn.paidOut)
        .map(turn => {
          const member = allMembers.find(m => m.id === turn.memberId);
          const memberShares = committee.memberIds.filter(id => id === turn.memberId).length;
          // Corrected payout amount (per month)
          const payoutAmount = committee.amountPerMember * committee.memberIds.length;
          return {
            memberName: member?.name || 'Unknown',
            shares: memberShares,
            payoutAmount,
            paidOut: turn.paidOut,
            payoutDate: turn.payoutDate
          };
        });

      const logoBase64 = await getLogoBase64();
      
      if (language === Language.UR) {
        await generateImageBasedMonthlyReceiptsPdf(
          committee, monthIndex, membersWithShares, memberPaymentsMap, 
          totalCollected, totalRemaining, totalDue, payoutHistory, userProfile, logoBase64, 
          t('appName'), t, language
        );
      } else {
        // Use existing text-based PDF for English
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoBase64, t('appName'));
      pdf.setFontSize(16);
      pdf.setTextColor('#0e7490');
      pdf.text(`${t('monthly')} Report - ${getCommitteeMonthName(committee?.startDate ?? '', monthIndex, language)}`, pdfWidth/2, 140, { align: 'center' });
      
      // Add summary information
      pdf.setFontSize(12);
      pdf.setTextColor('#222');
      let yPosition = 170;
      
      // Member payments table
      pdf.setFont(undefined, 'bold');
      pdf.text('Member Payments:', 40, yPosition);
      yPosition += 20;
      
      autoTable(pdf, {
        startY: yPosition,
        head: [[t('serialNo') || 'S.No', t('memberName'), 'Shares', 'Total Due', t('amountPaid'), t('remainingAmount')]],
          body: tableBody.map(row => row.map(cell => cell || '')),
        theme: 'grid',
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 4 },
        margin: { left: 40, right: 40 },
        didParseCell: function (data) {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      
      // Payout history section
      if (payoutHistory.length > 0) {
        const tableEndY = (pdf as any).lastAutoTable.finalY;
        yPosition = tableEndY + 20;
        
        pdf.setFont(undefined, 'bold');
        pdf.text('Payout History:', 40, yPosition);
        yPosition += 20;
        
        const payoutTableBody = payoutHistory.map((payout, idx) => [
          (idx + 1).toString(),
          payout.memberName,
          payout.shares.toString(),
          `PKR ${payout.payoutAmount.toLocaleString()}`,
          payout.paidOut ? 'Paid' : 'Pending',
          payout.payoutDate ? formatDate(payout.payoutDate, language) : '-'
        ]);
        
        autoTable(pdf, {
          startY: yPosition,
          head: [['S.No', t('memberName'), 'Shares', 'Payout Amount', 'Status', 'Payout Date']],
          body: payoutTableBody,
          theme: 'grid',
          headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 10, cellPadding: 4 },
          margin: { left: 40, right: 40 },
        });
      }
      
      pdf.save(`monthly_report_${committee.title.replace(/\s/g, '_')}_${getCommitteeMonthName(committee?.startDate ?? '', monthIndex, 'en').replace(/\s/g, '_')}.pdf`);
      }
      setIsLoading(false);
    };

    // Update handleDownloadMemberHistory to use image-based PDF for Urdu
    const handleDownloadMemberHistory = async (memberId) => {
      const member = getMemberById(memberId);
      if (!member) return;
      setIsLoading(true);
      const memberCommittees = committees.filter(c => c.memberIds.includes(memberId));
      const logoBase64 = await getLogoBase64();
      
      if (language === Language.UR) {
        await generateImageBasedMemberHistoryPdf(member, memberCommittees, userProfile, logoBase64, t('appName'), t, language);
      } else {
        await generateTextMemberHistoryPdf(member, memberCommittees, userProfile, logoBase64, t('appName'), t, language);
      }
      setIsLoading(false);
    };

    // Add missing receipt editing functions
    const handleEditReceipt = () => {
      if (!receiptData) return;
      setEditReceiptAmount(receiptData.amount);
      setEditReceiptDate(receiptData.paymentDate);
      setEditReceiptError('');
      setIsEditReceiptModalOpen(true);
    };

    const handleSaveEditReceipt = async () => {
      if (!receiptData) return;
      
      // Validate inputs
      if (!editReceiptAmount || editReceiptAmount <= 0) {
        setEditReceiptError(language === Language.UR ? 'رقم مثبت ہونی چاہیے۔' : 'Amount must be positive.');
        return;
      }
      
      if (!editReceiptDate) {
        setEditReceiptError(language === Language.UR ? 'تاریخ ضروری ہے۔' : 'Date is required.');
        return;
      }

      try {
        // Find the payment in the committee and update it
        const committee = committees.find(c => c.id === committeeId);
        if (!committee) {
          setEditReceiptError(language === Language.UR ? 'کمیٹی نہیں ملی۔' : 'Committee not found.');
          return;
        }

        // Use paymentId if available, otherwise fall back to memberId and monthIndex
        let paymentIndex = -1;
        if (receiptData.paymentId) {
          paymentIndex = committee.payments.findIndex(p => p.id === receiptData.paymentId);
        } else if (receiptData.memberId && receiptData.monthIndex !== undefined) {
          paymentIndex = committee.payments.findIndex(p => 
          p.memberId === receiptData.memberId && 
            p.monthIndex === receiptData.monthIndex
        );
        }

        if (paymentIndex === -1) {
          setEditReceiptError(language === Language.UR ? 'ادائیگی نہیں ملی۔' : 'Payment not found.');
          return;
        }

        // Update the payment
        const updatedCommittee = {
          ...committee,
          payments: [...committee.payments]
        };
        updatedCommittee.payments[paymentIndex] = {
          ...updatedCommittee.payments[paymentIndex],
          amountPaid: editReceiptAmount,
          paymentDate: editReceiptDate
        };

        await updateCommittee(updatedCommittee);

        // Update receipt data
        setReceiptData({
          ...receiptData,
          amount: editReceiptAmount,
          paymentDate: editReceiptDate
        });

        setIsEditReceiptModalOpen(false);
        setEditReceiptError('');
      } catch (error) {
        setEditReceiptError(language === Language.UR ? 'ادائیگی اپ ڈیٹ کرنے میں خرابی۔' : 'Error updating payment.');
      }
    };

    const handleDeleteReceipt = () => {
      if (!receiptData) return;
      
      if (window.confirm(language === Language.UR ? 'کیا آپ واقعی اس رسید کو حذف کرنا چاہتے ہیں؟' : 'Are you sure you want to delete this receipt?')) {
        try {
          // Find the payment in the committee and remove it
          const committee = committees.find(c => c.id === committeeId);
          if (!committee) {
            alert(language === Language.UR ? 'کمیٹی نہیں ملی۔' : 'Committee not found.');
            return;
          }

          // Use paymentId if available, otherwise fall back to memberId and monthIndex
          let paymentIndex = -1;
          if (receiptData.paymentId) {
            paymentIndex = committee.payments.findIndex(p => p.id === receiptData.paymentId);
          } else if (receiptData.memberId && receiptData.monthIndex !== undefined) {
            paymentIndex = committee.payments.findIndex(p => 
            p.memberId === receiptData.memberId && 
              p.monthIndex === receiptData.monthIndex
          );
          }

          if (paymentIndex === -1) {
            alert(language === Language.UR ? 'ادائیگی نہیں ملی۔' : 'Payment not found.');
            return;
          }

          // Remove the payment
          const updatedCommittee = {
            ...committee,
            payments: committee.payments.filter((_, index) => index !== paymentIndex)
          };

          updateCommittee(updatedCommittee);
          setReceiptModalOpen(false);
        } catch (error) {
          alert(language === Language.UR ? 'رسید حذف کرنے میں خرابی۔' : 'Error deleting receipt.');
        }
      }
    };

    // Helper function to get month index from month name
    const getCommitteeMonthIndex = (monthName: string, startDate: string, language: string) => {
      for (let i = 0; i < 12; i++) {
        if (getCommitteeMonthName(startDate, i, language) === monthName) {
          return i;
        }
      }
      return 0;
    };

    // Generate selectable text PDF for member history
    const generateTextMemberHistoryPdf = async (
      member: Member,
      memberCommittees: Committee[],
      userProfile: { phone?: string; email?: string; address?: string },
      logoBase64: string,
      appName: string,
      t: (key: string) => string,
      language: string
    ) => {
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Page margins and content area
      const margin = 60;
      const contentWidth = pdfWidth - (margin * 2);
      const contentStartY = 140;
      const contentEndY = pdfHeight - 100; // Leave space for footer
      
      let currentY = contentStartY;
      
      // Function to add new page with header and footer
      const addNewPage = () => {
        pdf.addPage();
        currentY = contentStartY;
        drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoBase64, appName);
      };
      
      // Function to check if we need a new page
      const checkPageBreak = (requiredHeight: number) => {
        if (currentY + requiredHeight > contentEndY) {
          addNewPage();
          return true;
        }
        return false;
      };
      
      // Start with header on first page
      drawTextLetterhead(pdf, pdfWidth, pdfHeight, userProfile, logoBase64, appName);
      
      // Member History Report Title
      pdf.setFontSize(16);
      pdf.setTextColor('#0e7490');
      pdf.setFont(undefined, 'bold');
      pdf.text(t('memberHistoryReport'), margin, currentY);
      currentY += 30;
      
      // Member Info Section
      pdf.setFontSize(12);
      pdf.setTextColor('#222');
      
      // Calculate member info height
      const memberInfoHeight = 120 + (member.address ? 25 : 0);
      checkPageBreak(memberInfoHeight);
      
      // Member details section with profile picture on the right
      const detailsStartY = currentY;
      
      // Member details (left side)
      const labelX = margin;
      const valueX = margin + 120;
      pdf.setFont(undefined, 'bold');
      pdf.text(t('name') + ':', labelX, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(member.name || '', valueX, currentY);
      currentY += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text(t('phone') + ':', labelX, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(member.phone || '', valueX, currentY);
      currentY += 20;
      pdf.setFont(undefined, 'bold');
      pdf.text(t('cnic') + ':', labelX, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(member.cnic || '', valueX, currentY);
      currentY += 20;
      if (member.address) {
        pdf.setFont(undefined, 'bold');
        pdf.text(t('address') + ':', labelX, currentY);
        pdf.setFont(undefined, 'normal');
        pdf.text(member.address, valueX, currentY);
        currentY += 20;
      }
      pdf.setFont(undefined, 'bold');
      pdf.text(t('joiningDate') + ':', labelX, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(formatDate(member.joiningDate ?? '', language), valueX, currentY);
      currentY += 30;
      
      // Add profile picture on the right side
      if (member.profilePictureUrl && member.profilePictureUrl !== DEFAULT_PROFILE_PIC) {
        try {
          // Convert profile picture to base64 if it's a URL
          const profilePicResponse = await fetch(member.profilePictureUrl);
          const profilePicBlob = await profilePicResponse.blob();
          const profilePicBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(profilePicBlob);
          });
          
          // Add profile picture to PDF on the right side
          const pictureX = pdfWidth - margin - 80; // Right side with margin
          const pictureY = detailsStartY;
          pdf.addImage(profilePicBase64, 'JPEG', pictureX, pictureY, 80, 80);
          
          // Add border around the picture
          pdf.setDrawColor('#06b6d4');
          pdf.setLineWidth(2);
          pdf.rect(pictureX - 2, pictureY - 2, 84, 84);
          
        } catch (error) {
          console.warn('Could not load profile picture:', error);
        }
      }
      
      currentY += 30;
      
      // Committee Participation Section
      pdf.setFontSize(14);
      pdf.setTextColor('#0e7490');
      pdf.setFont(undefined, 'bold');
      pdf.text(t('committeeParticipation'), margin, currentY);
      currentY += 25;
      
      if (memberCommittees.length === 0) {
        pdf.setFontSize(12);
        pdf.setTextColor('#222');
        pdf.setFont(undefined, 'normal');
        pdf.text(language === Language.UR ? 'یہ رکن کسی کمیٹی میں شامل نہیں۔' : 'This member is not part of any committees.', margin, currentY);
        currentY += 30;
      } else {
        let committeeIndex = 0;
        for (const committee of memberCommittees) {
          committeeIndex++;
          // Page break for each committee except the first
          if (committeeIndex > 1) {
            addNewPage();
          }
          // ... existing code ...
          // Payment History
          const paymentsForCommittee = committee.payments.filter(p => p.memberId === member.id && p.status === 'Cleared')
            .sort((a,b) => a.monthIndex - b.monthIndex || new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
          const totalContributed = paymentsForCommittee.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
          const totalDue = (committee.amountPerMember || 0) * (committee.duration || 0);
          const remainingAmount = totalDue - totalContributed;
          if (paymentsForCommittee.length > 0) {
            checkPageBreak(60 + paymentsForCommittee.length * 20);
            pdf.setFont(undefined, 'bold');
            pdf.text(t('paymentHistory'), 40, currentY);
            currentY += 20;
            const tableBody = paymentsForCommittee.map(p => [
              getCommitteeMonthName(committee.startDate, p.monthIndex, language),
              `PKR ${p.amountPaid.toLocaleString()}`,
              formatDate(p.paymentDate, language),
              t((p.status || '').toLowerCase())
            ]);
            autoTable(pdf, {
              startY: currentY,
              head: [[t('month'), t('installmentAmount'), t('paymentDate'), t('status')]],
              body: tableBody,
              theme: 'grid',
              headStyles: { fillColor: [6, 182, 212], textColor: 255 },
              styles: { fontSize: 9, cellPadding: 4, font: 'helvetica' },
              margin: { left: 40, right: 40 },
              pageBreak: 'auto',
            });
            currentY = (pdf as any).lastAutoTable.finalY + 10;
            // Add total contributed and remaining
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor('#0e7490');
            pdf.text(`${t('totalContributedThisCommittee')}: PKR ${totalContributed.toLocaleString()}`, 40, currentY);
            currentY += 16;
            pdf.text(`${t('remainingAmount')}: PKR ${remainingAmount.toLocaleString()}`, 40, currentY);
            pdf.setTextColor('#222');
            currentY += 10;
          } else {
            checkPageBreak(20);
            pdf.setFontSize(12);
            pdf.setTextColor('#222');
            pdf.setFont(undefined, 'normal');
            pdf.text(t('noPaymentsMade'), margin, currentY);
            currentY += 20;
          }
          // Payout History
          // Count cleared and unpaid payouts
          const payoutsForCommittee = committee.payoutTurns.filter(pt => pt.memberId === member.id);
          const clearedPayouts = payoutsForCommittee.filter(pt => pt.paidOut).length;
          const unpaidPayouts = payoutsForCommittee.length - clearedPayouts;
          if (payoutsForCommittee.length > 0) {
            checkPageBreak(50 + payoutsForCommittee.length * 20);
            pdf.setFontSize(12);
            pdf.setTextColor('#0e7490');
            pdf.setFont(undefined, 'bold');
            pdf.text(`${t('payoutHistory')}`, margin, currentY);
            currentY += 15;
            // Show summary of payouts
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.setTextColor('#16a34a');
            pdf.text(`${t('clearedPayouts')}: ${clearedPayouts}`, margin, currentY);
            pdf.setTextColor('#dc2626');
            pdf.text(`${t('unpaidPayouts')}: ${unpaidPayouts}`, margin + 120, currentY);
            pdf.setTextColor('#222');
            currentY += 15;
            // Table with status coloring
            const payoutTableData = payoutsForCommittee.map(pt => [
              getCommitteeMonthName(committee?.startDate ?? '', pt.turnMonthIndex, language) || '',
              `PKR ${(committee.amountPerMember * committee.memberIds.length).toLocaleString()}`,
              pt.payoutDate ? formatDate(pt.payoutDate, language) : 'N/A',
              pt.paidOut ? t('cleared') : t('unpaid')
            ]);
            autoTable(pdf, {
              startY: currentY,
              head: [[t('turnMonth'), t('amountPKR'), t('date'), t('status')]],
              body: payoutTableData,
              theme: 'grid',
              headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
              styles: { fontSize: 10, cellPadding: 4 },
              margin: { left: margin, right: margin },
              pageBreak: 'auto',
              didParseCell: function (data) {
                if (data.column.index === 3) {
                  data.cell.styles.textColor = data.cell.raw === t('cleared') ? [22, 163, 74] : [220, 38, 38];
                  data.cell.styles.fontStyle = 'bold';
                }
              },
            });
            currentY = (pdf as any).lastAutoTable.finalY + 20;
          } else {
            pdf.setFontSize(12);
            pdf.setTextColor('#222');
            pdf.setFont(undefined, 'normal');
            pdf.text(t('noPayoutsReceived'), margin, currentY);
            currentY += 20;
          }
          currentY += 15; // Space between committees
        }
      }
      
      // Add page numbers below the footer
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        const pageNumberY = pdfHeight - 8; // Moved down by 3pt (0.1cm) from -11 to -8
        pdf.setFontSize(10);
        pdf.setTextColor('#666');
        pdf.setFont(undefined, 'normal');
        const pageText = `Page ${i} of ${pageCount}`;
        const pageTextWidth = pdf.getTextWidth(pageText);
        const centerX = (pdfWidth - pageTextWidth) / 2; // Center horizontally
        pdf.text(pageText, centerX, pageNumberY);
      }
      
      pdf.save(`member_history_${member.name.replace(/\s/g, '_')}.pdf`);
    };

    if (appIsLoading && !committee) {
        return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="lg" /></div>;
    }

    if (!committee) {
        return <div className="p-6 text-center text-red-500">{language === Language.UR ? "کمیٹی نہیں ملی۔" : "Committee not found."}</div>;
    }


    return (
        <div className={`p-4 md:p-6 space-y-6 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
            <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
                <div className={`flex flex-col md:flex-row justify-between items-start md:items-center ${language === Language.UR ? 'md:flex-row-reverse' : ''}`}>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-primary dark:text-primary-light mb-1">{committee.title}</h1>
                        <p className="text-neutral-DEFAULT dark:text-gray-400 text-sm">
                          <span className="font-semibold">Type:</span> {t(committee.type.toLowerCase())} |
                          <span className="font-semibold ml-1">{t('startDate')}:</span> {formatDate(committee?.startDate ?? '', language)} |
                          <span className="font-semibold ml-1">{t('duration')}:</span> {committee.duration} {t(committee.type === CommitteeType.MONTHLY ? 'months' : committee.type === CommitteeType.WEEKLY ? 'weeks' : 'days')}
                        </p>
                        <p className="text-neutral-DEFAULT dark:text-gray-400 text-sm">
                          <span className="font-semibold">{t('amountPerMember')}:</span> PKR {committee.amountPerMember.toLocaleString()} |
                          <span className="font-semibold ml-1">{t('totalPool')}:</span> PKR {(committee.amountPerMember * committee.memberIds.length * committee.duration).toLocaleString()}
                        </p>
                        <p className="text-neutral-DEFAULT dark:text-gray-400 text-sm">
                          <span className="font-semibold">{t('payoutMethod')}:</span> {t(committee.payoutMethod.toLowerCase())}
                        </p>
                    </div>
                    <Link to="/committees" className={`mt-4 md:mt-0 text-primary dark:text-primary-light hover:underline flex items-center ${language === Language.UR ? 'text-right flex-row-reverse' : 'text-left'}`}>
                        {language === Language.UR ? <ArrowRightIcon className="h-4 w-4 ml-1" /> : <ArrowLeftIcon className="h-4 w-4 mr-1" />} 
                        {t('backToAllCommittees')}
                    </Link>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
                 <div className={`flex justify-between items-center mb-4 ${language === Language.UR ? 'flex-row-reverse' : ''}`}>
                    <h2 className="text-xl font-semibold text-neutral-darker dark:text-neutral-light flex items-center">
                        <UserGroupIcon className={`h-6 w-6 text-primary dark:text-primary-light ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {t('committeeMembers')} ({committeeMembersWithShares.length})
                    </h2>
                    <div className={`flex space-x-2 ${language === Language.UR ? 'space-x-reverse' : ''}`}>
                        <Button size="sm" onClick={() => setIsAddExistingMemberModalOpen(true)}>{t('addExistingMember')}</Button>
                        <Button size="sm" onClick={() => handleOpenMemberForm()}>{t('createNewMember')}</Button>
                    </div>
                </div>
                {committeeMembersWithShares.length === 0 ? (
                    <p className="text-center text-neutral-DEFAULT dark:text-gray-400 py-4">{t('noMembers')}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-neutral-dark">
                                <tr>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}></th> {/* For Pic */}
                                    <th scope="col" className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('memberName')}</th>
                                    <th scope="col" className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('memberPhone')}</th>
                                    <th scope="col" className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('memberCNIC')}</th>
                                    <th scope="col" className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>Shares</th>
                                    <th scope="col" className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-darker divide-y divide-gray-200 dark:divide-gray-700">
                                {committeeMembersWithShares.map(member => (
                                    <tr key={member.member.id}>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <img src={member.member.profilePictureUrl || DEFAULT_PROFILE_PIC} alt={member.member.name} className="w-10 h-10 rounded-full object-cover"/>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-darker dark:text-neutral-light">{member.member.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{member.member.phone}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{member.member.cnic}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                {member.shares} {member.shares === 1 ? 'Share' : 'Shares'}
                                            </span>
                                            {member.shares > 1 && (
                                                <div className="mt-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        onClick={() => handleRemoveShare(member.member.id)}
                                                        className="text-xs text-red-600 hover:text-red-800"
                                                        title={language === Language.UR ? t('removeOneShare_ur') : t('removeOneShare')}
                                                    >
                                                        {language === Language.UR ? t('removeShare_ur') : t('removeShare')}
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-center`}>
                                            <div className={`flex items-center justify-center space-x-1 ${language === Language.UR ? 'space-x-reverse' : ''}`}>
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenMemberForm(member.member)} aria-label={t('edit')} title={t('edit')}><PencilSquareIcon className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDownloadMemberHistory(member.member.id)} aria-label={t('downloadMemberHistory')} title={t('downloadMemberHistory')}><ArrowDownTrayIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveMemberWrapper(member.member.id)} aria-label={t('delete')} title={language === Language.UR ? "اس کمیٹی سے ہٹائیں" : "Remove from this committee"}><TrashIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteMemberGloballyWrapper(member.member.id)} title={language === Language.UR ? "مکمل طور پر حذف کریں" : "Delete Globally"} aria-label={language === Language.UR ? "مکمل طور پر حذف کریں" : "Delete Globally"}><TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
                <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 ${language === Language.UR ? 'sm:flex-row-reverse' : ''}`}>
                    <h2 className="text-xl font-semibold text-neutral-darker dark:text-neutral-light flex items-center mb-2 sm:mb-0">
                        <CreditCardIcon className={`h-6 w-6 text-primary dark:text-primary-light ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {t('paymentTracking')}
                    </h2>
                    {committeeMembersWithShares.length > 0 && committee.duration > 0 && (
                        <div className={`flex items-center space-x-2 ${language === Language.UR ? 'space-x-reverse' : ''} self-start sm:self-center`}>
                            <Select 
                                options={monthOptions}
                                value={selectedMonthForReceipts}
                                onChange={(e) => setSelectedMonthForReceipts(parseInt(e.target.value))}
                                label="" 
                                className="w-48"
                            />
                            <Button size="sm" onClick={handleDownloadMonthlyReceipts} disabled={appIsLoading}>
                                <ArrowDownTrayIcon className={`h-4 w-4 ${language === Language.UR ? 'ml-1' : 'mr-1'}`} />
                                {t('downloadMonthlyReceipts')}
                            </Button>
                        </div>
                    )}
                </div>

                {committeeMembersWithShares.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700">
                            <thead className="bg-gray-50 dark:bg-neutral-dark">
                                <tr>
                                    <th className={`sticky ${language === Language.UR ? 'right-0' : 'left-0'} bg-gray-50 dark:bg-neutral-dark z-10 px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('memberName')}</th>
                                    {paymentGridHeader.map(monthName => (
                                        <th key={monthName} className={`px-3 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{monthName}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-darker divide-y divide-gray-200 dark:divide-gray-700">
                                {committeeMembersWithShares.map(member => {
                                    return (
                                    <tr key={member.member.id}>
                                        <td className={`sticky ${language === Language.UR ? 'right-0' : 'left-0'} bg-white dark:bg-neutral-darker z-10 px-3 py-2 whitespace-nowrap text-sm font-medium text-neutral-darker dark:text-neutral-light border-l border-r border-gray-200 dark:border-gray-700`}>{member.member.name}</td>
                                        {Array.from({ length: committee.duration }, (_, monthIndex) => {
                                            const memberInstallmentsForMonth = committee.payments.filter(p => p.memberId === member.member.id && p.monthIndex === monthIndex && p.status === 'Cleared');
                                            const totalPaidForMonth = memberInstallmentsForMonth.reduce((sum, p) => sum + p.amountPaid, 0);
                                            
                                            // Calculate total amount due for this member (considering shares)
                                            const totalAmountDueForMember = committee.amountPerMember * member.shares;
                                            
                                            let derivedMonthlyStatus: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
                                            if (totalPaidForMonth >= totalAmountDueForMember) {
                                                derivedMonthlyStatus = 'Paid';
                                            } else if (totalPaidForMonth > 0) {
                                                derivedMonthlyStatus = 'Partial';
                                            }

                                            let bgColor = 'dark:bg-neutral-darker hover:bg-gray-50 dark:hover:bg-neutral-dark';
                                            let statusTextColor = 'text-neutral-darker dark:text-neutral-light';

                                            if (derivedMonthlyStatus === 'Paid') {
                                                bgColor = 'bg-green-50 dark:bg-green-900 hover:bg-green-100 dark:hover:bg-green-800';
                                                statusTextColor = 'text-green-700 dark:text-green-300';
                                            } else if (derivedMonthlyStatus === 'Partial') {
                                                bgColor = 'bg-yellow-50 dark:bg-yellow-900 hover:bg-yellow-100 dark:hover:bg-yellow-800';
                                                statusTextColor = 'text-yellow-700 dark:text-yellow-300';
                                            } else if (derivedMonthlyStatus === 'Unpaid' && new Date() > new Date(new Date(committee?.startDate ?? '').setMonth(new Date(committee?.startDate ?? '').getMonth() + monthIndex))) { // Simplified check for overdue if committee month has passed.
                                                bgColor = 'bg-red-50 dark:bg-red-900 hover:bg-red-100 dark:hover:bg-red-800';
                                                statusTextColor = 'text-red-700 dark:text-red-300';
                                            }
                                            
                                            return (
                                                <td key={monthIndex} className={`px-3 py-2 whitespace-nowrap text-sm text-center border-l border-r border-gray-200 dark:border-gray-700 ${bgColor}`}>
                                                    <span className={`block font-medium ${statusTextColor}`}>
                                                        PKR {totalPaidForMonth.toLocaleString()}
                                                    </span>
                                                    <span className={`text-xs ${statusTextColor}`}>({t(derivedMonthlyStatus.toLowerCase())})</span>
                                                    <div className="mt-1 space-x-1 rtl:space-x-reverse">
                                                      <Button size="sm" variant="ghost" className="text-xs p-1" onClick={() => handleOpenPaymentModal(member.member.id, monthIndex)}>{t('addInstallment')}</Button>
                                                      {memberInstallmentsForMonth.map(inst => (
                                                        <Button key={inst.id} size="sm" variant="ghost" className="text-xs p-1 text-blue-600 dark:text-blue-400" onClick={() => handleGenerateReceiptForInstallment(inst)}>
                                                          {t('receipt')} (PKR {inst.amountPaid})
                                                        </Button>
                                                      ))}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-center text-neutral-DEFAULT dark:text-gray-400 py-4">{t('addMember')} {language === Language.UR ? "تاکہ ادائیگیوں کو ٹریک کیا جا سکے۔" : "to track payments."}</p>}
            </div>

            <div className="bg-white dark:bg-neutral-darker p-6 rounded-lg shadow-md">
                <div className={`flex justify-between items-center mb-4 ${language === Language.UR ? 'flex-row-reverse' : ''}`}>
                    <h2 className="text-xl font-semibold text-neutral-darker dark:text-neutral-light flex items-center">
                        <TrophyIcon className={`h-6 w-6 text-primary dark:text-primary-light ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {t('payouts')}
                    </h2>
                    {committee?.payoutMethod === PayoutMethod.RANDOM && (
                        <Button 
                            onClick={handleLuckyDraw}
                            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white flex items-center"
                        >
                            <SparklesIcon2 className="h-5 w-5 mr-2" />
                            {t('luckyDraw')}
                        </Button>
                    )}
                </div>
                 {committee.payoutTurns && committee.payoutTurns.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                             <thead className="bg-gray-50 dark:bg-neutral-dark">
                                <tr>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>SR NO.</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('memberName')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{t('shares')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{t('payoutAmount')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{t('status')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{t('payoutDate')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-darker divide-y divide-gray-200 dark:divide-gray-700">
                                {committee.payoutTurns.sort((a,b) => a.turnMonthIndex - b.turnMonthIndex).map((turn, idx) => {
                                    const member = allMembers.find(m => m.id === turn.memberId);
                                    const memberShares = committee.memberIds.filter(id => id === turn.memberId).length;
                                    const payoutAmount = committee.amountPerMember * committee.memberIds.length;
                                    return (
                                    <tr key={`${turn.memberId}-${turn.turnMonthIndex}`}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center font-medium">{idx + 1}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-darker dark:text-neutral-light">{member?.name || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{memberShares}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">PKR {payoutAmount.toLocaleString()}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                            {turn.paidOut ? <span className="text-green-600 font-semibold">{t('paid')}</span> : <span className="text-yellow-600 font-semibold">{t('pending')}</span>}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">{turn.payoutDate ? formatDate(turn.payoutDate, language) : '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleTogglePayout(turn)}
                                                aria-label={turn.paidOut ? t('markUnpaid') : t('markPaid')}
                                                title={turn.paidOut ? t('markUnpaid') : t('markPaid')}
                                            >
                                                {turn.paidOut ? t('markUnpaid') : t('markPaid')}
                                            </Button>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                ) : <p className="text-center text-neutral-DEFAULT dark:text-gray-400 py-4">{language === Language.UR ? "ادائیگی کی باری ابھی تک تفویض نہیں کی گئی۔" : "Payout turns not assigned yet."}</p>}
            </div>

            <Modal isOpen={isMemberFormModalOpen} onClose={handleCloseMemberForm} title={editingMember ? t('edit') + " " + t('addMember') : t('createNewMember')}>
                <MemberForm committeeId={committeeId} initialData={editingMember} onClose={handleCloseMemberForm} onSuccess={handleMemberFormSuccess} />
            </Modal>

            <Modal isOpen={isAddExistingMemberModalOpen} onClose={() => setIsAddExistingMemberModalOpen(false)} title={t('addExistingMember')}>
                <div className="space-y-4">
                    <Input 
                        type="text" 
                        placeholder={t('searchMember')} 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                     {availableMembersForCommittee.length > 0 ? (
                        <Select 
                            value={selectedExistingMemberId} 
                            onChange={(e) => setSelectedExistingMemberId(e.target.value)}
                            options={[{value: '', label: t('selectMember')}, ...availableMembersForCommittee.map(m => ({ value: m.id, label: `${m.name} (${m.cnic})` }))]}
                            label={t('selectMember')}
                        />
                    ) : (
                        <p className="text-sm text-neutral-DEFAULT dark:text-gray-400">{language === Language.UR ? "کوئی رکن نہیں ملا یا تمام اہل اراکین پہلے ہی شامل ہیں۔" : "No members found or all eligible members already added."}</p>
                    )}
                    <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                        <Button variant="ghost" onClick={() => setIsAddExistingMemberModalOpen(false)}>{t('cancel')}</Button>
                        <Button onClick={handleAddExistingMember} disabled={!selectedExistingMemberId}>{t('addMember')}</Button>
                    </div>
                </div>
            </Modal>
            
            <Modal
              isOpen={receiptModalOpen}
              onClose={() => setReceiptModalOpen(false)}
              header={
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold">{t('receipt')}</span>
                    <Button onClick={handleDownloadSingleReceiptPdf} isLoading={appIsLoading} aria-label={t('downloadPdf')} variant="ghost">
                      <ArrowDownTrayIcon className="h-5 w-5" />
                    </Button>
                    <Button onClick={handleEditReceipt} aria-label={t('edit')} variant="ghost">
                      <PencilSquareIcon className="h-5 w-5" />
                    </Button>
                    <Button onClick={handleDeleteReceipt} aria-label={t('delete')} variant="danger">
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  </div>
                  <button onClick={() => setReceiptModalOpen(false)} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
              }
              size="md"
              isPrintable={true}
            >
                {receiptData && (
                    <>
                     {/* Header (logo/app name), receipt content, footer as before */}
                     <div className="receipt-header flex flex-col items-center mb-4">
                        <img src="/logo.png" alt="Logo" className="h-16 w-16 mb-2" />
                        <div className="text-xl font-bold text-primary mb-1">{t('appName')}</div>
                        <hr className="border-primary w-full mb-2" />
                     </div>
                     <div id="actual-receipt-render-area" className="receipt-render-area" dir={language === Language.UR ? 'rtl' : 'ltr'}>
                        <h2>{t('receipt')}</h2>
                        <p><strong>{t('committeeName')}:</strong> {receiptData.committeeName}</p>
                        <p><strong>{t('payerName')}:</strong> {receiptData.payerName}</p>
                        <p><strong>{t('month')}:</strong> {receiptData.month}</p>
                        <p><strong>{t('amountPaid')}:</strong> PKR {(receiptData.amount ?? 0).toLocaleString()}</p>
                        <p><strong>{t('date')}:</strong> {formatDate(receiptData.paymentDate ?? '', language)}</p>
                        <p className="auto-generated-note">{t('autoGeneratedReceiptNote')}</p>
                     </div>
                     <div className="receipt-footer mt-4 text-center text-xs text-neutral-dark dark:text-neutral-light">
                        <hr className="border-primary w-full mb-2" />
                        <div>{(userProfile.phone || '')} {(userProfile.email ? `| ${userProfile.email}` : '')} {(userProfile.address ? `| ${userProfile.address}` : '')}</div>
                     </div>
                    </>
                )}
            </Modal>

            <Modal isOpen={isEditReceiptModalOpen} onClose={() => setIsEditReceiptModalOpen(false)} title={t('edit') + ' ' + t('receipt')} size="sm">
              <div className="space-y-4">
                <Input
                  label={t('amountPaid')}
                  type="number"
                  value={editReceiptAmount}
                  onChange={e => setEditReceiptAmount(Number(e.target.value))}
                  min={1}
                  required
                />
                <Input
                  label={t('date')}
                  type="date"
                  value={editReceiptDate}
                  onChange={e => setEditReceiptDate(e.target.value)}
                  required
                />
                {editReceiptError && <div className="text-red-500 text-sm">{editReceiptError}</div>}
                <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                  <Button variant="ghost" onClick={() => setIsEditReceiptModalOpen(false)}>{t('cancel')}</Button>
                  <Button onClick={handleSaveEditReceipt}>{t('saveChanges')}</Button>
                </div>
              </div>
            </Modal>

            <Modal isOpen={paymentModalOpen} onClose={() => setPaymentModalOpen(false)} title={t('addInstallment')} size="sm">
              <div className="space-y-4">
                <Input
                  label={t('installmentAmount')}
                  type="number"
                  value={installmentAmount === 0 ? '' : installmentAmount}
                  onChange={e => setInstallmentAmount(Number(e.target.value))}
                  min={1}
                  required
                />
                <Input
                  label={t('installmentDate')}
                  type="date"
                  value={installmentDate}
                  onChange={e => setInstallmentDate(e.target.value)}
                  required
                />
                {paymentError && <div className="text-red-500 text-sm">{paymentError}</div>}
                <div className="flex justify-end space-x-2 rtl:space-x-reverse">
                  <Button variant="ghost" onClick={() => setPaymentModalOpen(false)}>{t('cancel')}</Button>
                  <Button onClick={handleRecordInstallment}>{t('pay')}</Button>
                </div>
              </div>
            </Modal>
            
            {/* Lucky Draw Modal */}
            <Modal 
                isOpen={isLuckyDrawModalOpen} 
                onClose={handleCloseLuckyDrawModal} 
                title={isDrawing ? t('drawingInProgress') : t('winnerSelected')}
                size="lg"
            >
                <div className="text-center py-8">
                    {isDrawing ? (
                        <div className="space-y-6">
                            <div className="text-6xl animate-bounce">🎲</div>
                            <div className="text-2xl font-bold text-primary">{t('drawingInProgress')}</div>
                            <div className="flex justify-center">
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 w-16 h-16 border-4 border-secondary border-b-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                                    <div className="absolute inset-2 w-12 h-12 border-4 border-green-500 border-l-transparent rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
                                </div>
                            </div>
                            <div className="text-lg text-neutral-DEFAULT dark:text-gray-400 animate-pulse">
                                SELECTING WINNER...
                            </div>
                        </div>
                    ) : luckyDrawWinner ? (
                        <div className={`space-y-6 ${showPartyEffects ? 'animate-pulse' : ''}`}>
                            {/* Enhanced Party Effects */}
                            {showPartyEffects && (
                                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                    {/* Confetti-like effects */}
                                    <div className="absolute top-2 left-4 text-4xl animate-bounce">🎉</div>
                                    <div className="absolute top-6 right-6 text-3xl animate-bounce" style={{animationDelay: '0.3s'}}>🎊</div>
                                    <div className="absolute bottom-6 left-6 text-3xl animate-bounce" style={{animationDelay: '0.6s'}}>🎈</div>
                                    <div className="absolute bottom-2 right-2 text-4xl animate-bounce" style={{animationDelay: '0.9s'}}>✨</div>
                                    <div className="absolute top-1/3 left-1/4 text-2xl animate-bounce" style={{animationDelay: '0.2s'}}>🌟</div>
                                    <div className="absolute top-1/3 right-1/4 text-2xl animate-bounce" style={{animationDelay: '0.5s'}}>💫</div>
                                    <div className="absolute top-2/3 left-1/3 text-3xl animate-bounce" style={{animationDelay: '0.8s'}}>🎆</div>
                                    <div className="absolute top-2/3 right-1/3 text-3xl animate-bounce" style={{animationDelay: '1.1s'}}>🎇</div>
                                    
                                    {/* Floating balloons */}
                                    <div className="absolute top-4 left-1/2 text-2xl animate-bounce" style={{animationDelay: '0.4s'}}>🎈</div>
                                    <div className="absolute top-8 right-1/3 text-2xl animate-bounce" style={{animationDelay: '0.7s'}}>🎈</div>
                                    <div className="absolute bottom-8 left-1/3 text-2xl animate-bounce" style={{animationDelay: '1.0s'}}>🎈</div>
                                    
                                    {/* Sparkles */}
                                    <div className="absolute top-1/4 left-1/6 text-xl animate-ping" style={{animationDelay: '0.1s'}}>✨</div>
                                    <div className="absolute top-1/4 right-1/6 text-xl animate-ping" style={{animationDelay: '0.3s'}}>✨</div>
                                    <div className="absolute bottom-1/4 left-1/6 text-xl animate-ping" style={{animationDelay: '0.5s'}}>✨</div>
                                    <div className="absolute bottom-1/4 right-1/6 text-xl animate-ping" style={{animationDelay: '0.7s'}}>✨</div>
                                    
                                    {/* Rotating stars */}
                                    <div className="absolute top-1/2 left-1/8 text-2xl animate-spin" style={{animationDuration: '3s'}}>⭐</div>
                                    <div className="absolute top-1/2 right-1/8 text-2xl animate-spin" style={{animationDuration: '3s', animationDelay: '1.5s'}}>⭐</div>
                                    
                                    {/* Additional celebration effects */}
                                    <div className="absolute top-1/6 left-1/6 text-3xl animate-bounce" style={{animationDelay: '0.4s'}}>🎊</div>
                                    <div className="absolute top-1/6 right-1/6 text-3xl animate-bounce" style={{animationDelay: '0.7s'}}>🎉</div>
                                    <div className="absolute bottom-1/6 left-1/6 text-3xl animate-bounce" style={{animationDelay: '1.0s'}}>🎊</div>
                                    <div className="absolute bottom-1/6 right-1/6 text-3xl animate-bounce" style={{animationDelay: '1.3s'}}>🎉</div>
                                    
                                    {/* Fireworks effect */}
                                    <div className="absolute top-1/4 left-1/2 text-4xl animate-ping" style={{animationDelay: '0.2s'}}>🎆</div>
                                    <div className="absolute top-1/4 right-1/4 text-4xl animate-ping" style={{animationDelay: '0.6s'}}>🎇</div>
                                    <div className="absolute bottom-1/4 left-1/4 text-4xl animate-ping" style={{animationDelay: '1.0s'}}>🎆</div>
                                    <div className="absolute bottom-1/4 right-1/2 text-4xl animate-ping" style={{animationDelay: '1.4s'}}>🎇</div>
                                </div>
                            )}
                            
                            {/* Winner Display */}
                            <div className="relative z-10">
                                <div className="text-6xl mb-4 animate-bounce">🏆</div>
                                <h3 className="text-3xl font-bold text-green-600 mb-2">{t('congratulations')}</h3>
                                <h4 className="text-xl text-neutral-darker dark:text-neutral-light mb-2">{t('luckyWinner')}</h4>
                                
                                {/* Month Information */}
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700 mb-4">
                                    <p className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                                        🎯 Committee Win of {getCommitteeMonthName(committee?.startDate ?? '', winningTurn?.monthIndex ?? 0, language)} 🎯
                                    </p>
                                </div>
                                
                                {/* Winner Profile */}
                                <div className="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 p-6 rounded-lg border-2 border-yellow-300 dark:border-yellow-600 shadow-lg">
                                    <div className="flex items-center justify-center mb-4">
                                        <img 
                                            src={luckyDrawWinner.profilePictureUrl || DEFAULT_PROFILE_PIC} 
                                            alt={luckyDrawWinner.name}
                                            className="w-20 h-20 rounded-full border-4 border-yellow-400 dark:border-yellow-500 object-cover shadow-lg"
                                        />
                                    </div>
                                    <h5 className="text-2xl font-bold text-neutral-darker dark:text-neutral-light mb-2">
                                        {luckyDrawWinner.name}
                                    </h5>
                                    <p className="text-neutral-DEFAULT dark:text-gray-400 mb-2">
                                        {luckyDrawWinner.phone}
                                    </p>
                                    <p className="text-neutral-DEFAULT dark:text-gray-400 mb-4">
                                        {luckyDrawWinner.cnic}
                                    </p>
                                    
                                    {/* Payout Amount */}
                                    <div className="bg-white dark:bg-neutral-darker p-4 rounded-lg border border-yellow-300 dark:border-yellow-600 shadow-md">
                                        <p className="text-sm text-neutral-DEFAULT dark:text-gray-400 mb-1">
                                            Payout Amount
                                        </p>
                                        <p className="text-2xl font-bold text-green-600">
                                            PKR {(committee?.amountPerMember || 0) * (committee?.memberIds.length || 0) * (committee?.duration || 0)}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="mt-6 text-sm text-neutral-DEFAULT dark:text-gray-400">
                                    {t('partyEffects')} {t('partyEffects')} {t('partyEffects')}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="text-4xl mb-4">😔</div>
                            <p className="text-lg text-neutral-DEFAULT dark:text-gray-400">
                                {t('noEligibleMembers')}
                            </p>
                        </div>
                    )}
                    
                    <div className="mt-8">
                        <Button onClick={handleCloseLuckyDrawModal} className="w-full">
                            {t('close')}
                        </Button>
                </div>
              </div>
            </Modal>
        </div>
    );
};

// Helper to slugify committee title for URL
export function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')      // Remove all non-word chars
    .replace(/\-\-+/g, '-');       // Replace multiple - with single -
}

export default CommitteeManagement;
