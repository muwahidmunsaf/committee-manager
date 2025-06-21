import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import { Committee, Member, CommitteeType, PayoutMethod, CommitteePayment, CommitteeMemberTurn, Language } from '../types'; 
import { Button, Input, Select, Modal, LoadingSpinner, PlusCircleIcon, TrashIcon, PencilSquareIcon, Textarea, UsersIcon, DocumentTextIcon, ArrowDownTrayIcon, UserCircleIcon as DefaultUserIcon, ArrowLeftIcon, ArrowRightIcon, ArrowDownTrayIcon as DownloadIcon, XMarkIcon } from './UIComponents';
import { isValidPakistaniCnic, isValidPakistaniPhone, formatDate, getCommitteeMonthName, calculateTotalPool, getMemberName, initializePayoutTurns } from '../utils/appUtils';
import { DEFAULT_PROFILE_PIC } from '../constants';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import logo from '../assets/logo.png'; // Import logo for PDF
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
    if (window.confirm(t('confirmDelete'))) {
      deleteCommittee(committeeId);
    }
  };


  if (appIsLoading) {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className={`p-4 md:p-6 ${language === Language.UR ? 'font-notoNastaliqUrdu text-right' : ''}`}>
      <div className={`flex justify-between items-center mb-6 ${language === Language.UR ? 'flex-row-reverse' : ''}`}>
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-darker dark:text-neutral-light">{t('committees')}</h1>
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
                  <Button size="sm" onClick={() => navigate(`/committees/${committee.id}`)} className="flex-grow">{t('viewDetails')}</Button>
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
    const { committeeId } = useParams<{ committeeId: string }>();
    const { 
        committees, getCommitteeById, members: allMembers, getMemberById, 
        addMemberToCommittee, removeMemberFromCommittee, 
        recordPayment, updatePayoutTurn, t, language, isLoading: appIsLoading,
        setIsLoading: setAppIsLoading, 
        deleteMember, getPaymentsForMemberByMonth, userProfile,
        updateCommittee
    } = useAppContext();
    const navigate = useNavigate();

    const [committee, setCommittee] = useState<Committee | null | undefined>(null);
    const [committeeMembers, setCommitteeMembers] = useState<Member[]>([]);
    
    const [isMemberFormModalOpen, setIsMemberFormModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | undefined>(undefined);
    
    const [isAddExistingMemberModalOpen, setIsAddExistingMemberModalOpen] = useState(false);
    const [selectedExistingMemberId, setSelectedExistingMemberId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [currentPaymentContext, setCurrentPaymentContext] = useState<{ memberId: string; monthIndex: number } | null>(null);
    const [installmentAmount, setInstallmentAmount] = useState<number>(0);
    const [installmentDate, setInstallmentDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [paymentError, setPaymentError] = useState<string>('');


    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState<{
        committeeName: string;
        payerName: string;
        amount: number; 
        paymentDate: string;
        month: string; 
        committeeId?: string;
        memberId?: string;
    } | null>(null);

    const [selectedMonthForReceipts, setSelectedMonthForReceipts] = useState<number>(0);

    // Add state for editing receipt
    const [isEditReceiptModalOpen, setIsEditReceiptModalOpen] = useState(false);
    const [editReceiptAmount, setEditReceiptAmount] = useState<number>(0);
    const [editReceiptDate, setEditReceiptDate] = useState<string>('');
    const [editReceiptError, setEditReceiptError] = useState<string>('');

    useEffect(() => {
        if (committeeId) {
            const fetchedCommittee = getCommitteeById(committeeId);
            setCommittee(fetchedCommittee);
            if (fetchedCommittee) {
                const membersOfCommittee = fetchedCommittee.memberIds
                    .map(id => getMemberById(id))
                    .filter(Boolean) as Member[];
                setCommitteeMembers(membersOfCommittee);
                 if (fetchedCommittee.duration > 0 && selectedMonthForReceipts >= fetchedCommittee.duration) {
                    setSelectedMonthForReceipts(0); 
                }
            }
        } else {
            navigate('/committees'); 
        }
    }, [committeeId, getCommitteeById, getMemberById, allMembers, navigate, committees, selectedMonthForReceipts]);

    const availableMembersForCommittee = allMembers.filter(
      m => !committee?.memberIds.includes(m.id) && 
           (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.cnic.includes(searchTerm))
    );

    useEffect(() => {
        if (isAddExistingMemberModalOpen && availableMembersForCommittee.length === 1 && !selectedExistingMemberId) {
            setSelectedExistingMemberId(availableMembersForCommittee[0].id);
        }
        if (isAddExistingMemberModalOpen && availableMembersForCommittee.length === 0) {
            setSelectedExistingMemberId(''); // Clear selection if no members match
        }
    }, [isAddExistingMemberModalOpen, availableMembersForCommittee, selectedExistingMemberId]);


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
        if (committeeId && window.confirm(t('confirmDelete') + " " + getMemberName(memberId, allMembers) + " " + (language === Language.UR ? "کو اس کمیٹی سے؟" : "from this committee?"))) {
            removeMemberFromCommittee(committeeId, memberId);
        }
    };
    
    const handleDeleteMemberGloballyWrapper = (memberId: string) => {
        if (window.confirm(t('confirmDelete') + " " + getMemberName(memberId, allMembers) + " " + (language === Language.UR ? "کو مکمل طور پر؟ اس سے یہ رکن تمام کمیٹیوں سے ہٹا دیا جائے گا۔" : "completely? This will remove the member from ALL committees."))) {
            deleteMember(memberId); 
            // If the current committee detail screen is for a committee this member was in,
            // the main useEffect will refetch members and update the view.
        }
    };

    const handleAddExistingMember = () => {
        if (committeeId && selectedExistingMemberId) {
            addMemberToCommittee(committeeId, selectedExistingMemberId);
            setIsAddExistingMemberModalOpen(false);
            setSelectedExistingMemberId('');
            setSearchTerm(''); // Reset search term
        }
    };
    
    const handleOpenPaymentModal = (memberId: string, monthIndex: number) => {
        setCurrentPaymentContext({ memberId, monthIndex });
        setInstallmentAmount(0); 
        setInstallmentDate(new Date().toISOString().split('T')[0]);
        setPaymentError('');
        setPaymentModalOpen(true);
    };

    const handleRecordInstallment = () => {
        if (committee && currentPaymentContext && installmentAmount > 0) {
            const paidInstallmentsThisMonth = getPaymentsForMemberByMonth(committee.id, currentPaymentContext.memberId, currentPaymentContext.monthIndex);
            const totalAlreadyPaidThisMonth = paidInstallmentsThisMonth.reduce((sum, p) => sum + p.amountPaid, 0);
            const maxAllowableNewInstallment = committee.amountPerMember - totalAlreadyPaidThisMonth;

            if (installmentAmount > maxAllowableNewInstallment) {
                setPaymentError(t('maxInstallmentReached', {amount: committee.amountPerMember, maxAllowed: maxAllowableNewInstallment}));
                return;
            }

            const paymentDetails: Omit<CommitteePayment, 'id'> = {
                memberId: currentPaymentContext.memberId,
                monthIndex: currentPaymentContext.monthIndex,
                amountPaid: installmentAmount,
                paymentDate: installmentDate,
                status: 'Cleared', 
                receiptGenerated: true, 
            };
            recordPayment(committee.id, paymentDetails);
            setPaymentModalOpen(false);
            setCurrentPaymentContext(null);
            setInstallmentAmount(0);
            setPaymentError('');
        } else if (installmentAmount <= 0) {
            setPaymentError(language === Language.UR ? "قسط کی رقم مثبت ہونی چاہیے۔" : "Installment amount must be positive.");
        }
    };
    
    const handleTogglePayout = (turn: CommitteeMemberTurn) => {
        if (committee) {
          updatePayoutTurn(committee.id, { 
            ...turn, 
            paidOut: !turn.paidOut,
            payoutDate: !turn.paidOut ? new Date().toISOString().split('T')[0] : undefined
          });
        }
    };

    const handleGenerateReceiptForInstallment = (payment: CommitteePayment) => {
      if(!committee) return;
      const member = getMemberById(payment.memberId);
      if(!member) return;

      setReceiptData({
        committeeName: committee.title,
        payerName: member.name,
        amount: payment.amountPaid, 
        paymentDate: payment.paymentDate,
        month: getCommitteeMonthName(committee?.startDate ?? '', payment.monthIndex, language),
        committeeId: committee.id,
        memberId: member.id,
      });
      setReceiptModalOpen(true);
    };

    // Helper to get base64 logo for PDF
    const getLogoBase64 = async () => {
      const response = await fetch(logo || '');
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
      membersForMonth: Member[],
      memberPaymentsMap: Map<string, number>,
      totalCollected: number,
      totalRemaining: number,
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
      hiddenDiv.style.width = '600px';
      hiddenDiv.style.padding = '20px';
      hiddenDiv.style.backgroundColor = 'white';
      hiddenDiv.style.fontFamily = language === Language.UR ? 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' : 'Arial, sans-serif';
      hiddenDiv.style.direction = language === Language.UR ? 'rtl' : 'ltr';
      hiddenDiv.style.fontSize = '12px';

      // Build table content
      let tableRows = '';
      membersForMonth.forEach((member, idx) => {
        const paid = memberPaymentsMap.get(member.id) || 0;
        const remaining = committee.amountPerMember - paid;
        tableRows += `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${member.name || ''}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${paid.toLocaleString()}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${remaining.toLocaleString()}</td>
          </tr>
        `;
      });

      // Add totals row
      tableRows += `
        <tr style="font-weight: bold; background-color: #f0f9ff;">
          <td style="border: 1px solid #ddd; padding: 8px;"></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${t('totalCollected')}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${totalCollected.toLocaleString()}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">PKR ${totalRemaining.toLocaleString()}</td>
        </tr>
      `;

      const tableContent = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0e7490; font-size: 20px; margin: 0 0 20px 0; border-bottom: 2px solid #06b6d4; padding-bottom: 10px;">
            ${t('monthly')} Report - ${getCommitteeMonthName(committee?.startDate ?? '', monthIndex, language)}
          </h1>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #06b6d4; color: white;">
              <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">${t('serialNo') || 'S.No'}</th>
              <th style="border: 1px solid #ddd; padding: 8px;">${t('memberName')}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t('amountPaid')}</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">${t('remainingAmount')}</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
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

      const hiddenDiv = document.createElement('div');
      hiddenDiv.style.position = 'absolute';
      hiddenDiv.style.left = '-9999px';
      hiddenDiv.style.top = '0';
      hiddenDiv.style.width = `${pdfWidth}px`;
      hiddenDiv.style.backgroundColor = 'white';
      hiddenDiv.style.fontFamily = language === Language.UR ? 'Jameel Noori Nastaleeq, Noto Nastaliq Urdu, serif' : 'Arial, sans-serif';
      hiddenDiv.style.direction = language === Language.UR ? 'rtl' : 'ltr';
      hiddenDiv.style.fontSize = '12px';
      hiddenDiv.style.lineHeight = '1.6';
      
      let committeesContent = '';
      memberCommittees.forEach(committee => {
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

        const payoutsForCommittee = committee.payoutTurns.filter(pt => pt.memberId === member.id && pt.paidOut)
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
                  </tr>
                </thead>
                <tbody>
                  ${payoutsForCommittee.map(pt => `
                    <tr style="page-break-inside: avoid;">
                      <td style="border: 1px solid #ddd; padding: 5px;">${getCommitteeMonthName(committee?.startDate ?? '', pt.turnMonthIndex, language) || ''}</td>
                      <td style="border: 1px solid #ddd; padding: 5px; text-align: ${language === Language.UR ? 'right' : 'left'};">PKR ${(committee.amountPerMember * committee.memberIds.length).toLocaleString()}</td>
                      <td style="border: 1px solid #ddd; padding: 5px;">${pt.payoutDate ? formatDate(pt.payoutDate, language) : 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `;
        } else {
            payoutHistoryContent = `<div style="margin: 15px 0; color: #666;">${t('noPayoutsReceived')}</div>`
        }

        committeesContent += `
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
      });

      const memberHistoryContent = `
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
            ${memberCommittees.length > 0 ? committeesContent : `<div style="color: #666;">${language === Language.UR ? 'یہ رکن کسی کمیٹی میں شامل نہیں۔' : 'This member is not part of any committees.'}</div>`}
          </div>
        </div>
      `;
      
      hiddenDiv.innerHTML = memberHistoryContent.replace(/<strong>(.*?)<\/strong>/g, '<span style="font-weight: bold;">$1</span>');
      document.body.appendChild(hiddenDiv);

      try {
        const topMargin = 20;
        const bottomMargin = 70; // Increased margin
        const usablePageHeight = pdfHeight - topMargin - bottomMargin;

        const canvas = await html2canvas(hiddenDiv, {
          backgroundColor: '#ffffff',
          scale: 2,
          useCORS: true,
          allowTaint: true,
          width: hiddenDiv.scrollWidth,
          height: hiddenDiv.scrollHeight,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position + topMargin, imgWidth, imgHeight);
        heightLeft -= usablePageHeight;

        while (heightLeft > 0) {
          position -= usablePageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position + topMargin, imgWidth, imgHeight);
          heightLeft -= usablePageHeight;
        }
        
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
        document.body.removeChild(hiddenDiv);
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
      setAppIsLoading(true);
      const monthIndex = selectedMonthForReceipts;
      const membersForMonth = committee.memberIds.map(id => getMemberById(id)).filter((m): m is Member => Boolean(m));
      const paymentsForMonth = committee.payments.filter(p => p.monthIndex === monthIndex && p.status === 'Cleared');
      const memberPaymentsMap = new Map();
      membersForMonth.forEach(member => {
        const paid = paymentsForMonth.filter(p => p.memberId === member.id).reduce((sum, p) => sum + p.amountPaid, 0);
        memberPaymentsMap.set(member.id, paid);
      });
      const totalDue = committee.amountPerMember * membersForMonth.length;
      let totalCollected = 0;
      let totalRemaining = 0;
      const tableBody = membersForMonth
        .filter((member): member is Member => Boolean(member))
        .map((member, idx) => {
          const paid = memberPaymentsMap.get(member.id) || 0;
          const remaining = committee.amountPerMember - paid;
          totalCollected += paid;
          totalRemaining += remaining;
          return [
            (idx + 1).toString(),
            member.name || '',
            `PKR ${paid.toLocaleString()}`,
            `PKR ${remaining.toLocaleString()}`
          ];
        });

      const logoBase64 = await getLogoBase64();
      
      if (language === Language.UR) {
        await generateImageBasedMonthlyReceiptsPdf(
          committee, monthIndex, membersForMonth, memberPaymentsMap, 
          totalCollected, totalRemaining, userProfile, logoBase64, 
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
      pdf.setFontSize(12);
      pdf.setTextColor('#222');
      autoTable(pdf, {
        startY: 170,
        head: [[t('serialNo') || 'S.No', t('memberName'), t('amountPaid'), t('remainingAmount')]],
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
      pdf.save(`monthly_report_${committee.title.replace(/\s/g, '_')}_${getCommitteeMonthName(committee?.startDate ?? '', monthIndex, 'en').replace(/\s/g, '_')}.pdf`);
      }
      setAppIsLoading(false);
    };

    // Update handleDownloadMemberHistory to use image-based PDF for Urdu
    const handleDownloadMemberHistory = async (memberId) => {
      const member = getMemberById(memberId);
      if (!member) return;
      setAppIsLoading(true);
      const memberCommittees = committees.filter(c => c.memberIds.includes(memberId));
      const logoBase64 = await getLogoBase64();
      
      if (language === Language.UR) {
        await generateImageBasedMemberHistoryPdf(member, memberCommittees, userProfile, logoBase64, t('appName'), t, language);
      } else {
        await generateTextMemberHistoryPdf(member, memberCommittees, userProfile, logoBase64, t('appName'), t, language);
      }
      setAppIsLoading(false);
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

        const paymentIndex = committee.payments.findIndex(p => 
          p.memberId === receiptData.memberId && 
          p.monthIndex === getCommitteeMonthIndex(receiptData.month, committee.startDate, language)
        );

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

          const paymentIndex = committee.payments.findIndex(p => 
            p.memberId === receiptData.memberId && 
            p.monthIndex === getCommitteeMonthIndex(receiptData.month, committee.startDate, language)
          );

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
      pdf.setFont(undefined, 'bold');
      pdf.text(t('name') + ':', margin, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(member.name || '', margin + 70, currentY);
      currentY += 20;
      
      pdf.setFont(undefined, 'bold');
      pdf.text(t('phone') + ':', margin, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(member.phone || '', margin + 70, currentY);
      currentY += 20;
      
      pdf.setFont(undefined, 'bold');
      pdf.text(t('cnic') + ':', margin, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(member.cnic || '', margin + 70, currentY);
      currentY += 20;
      
      if (member.address) {
        pdf.setFont(undefined, 'bold');
        pdf.text(t('address') + ':', margin, currentY);
        pdf.setFont(undefined, 'normal');
        pdf.text(member.address, margin + 70, currentY);
        currentY += 20;
      }
      
      pdf.setFont(undefined, 'bold');
      pdf.text(t('joiningDate') + ':', margin, currentY);
      pdf.setFont(undefined, 'normal');
      pdf.text(formatDate(member.joiningDate ?? '', language), margin + 70, currentY);
      
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
        // Process each committee
        for (const committee of memberCommittees) {
          // Check if we need a new page for committee header
          checkPageBreak(100);
          
          // Committee title
          pdf.setFontSize(13);
          pdf.setTextColor('#1f2937');
          pdf.setFont(undefined, 'bold');
          pdf.text(`${committee.title || ''}`, margin, currentY);
          currentY += 20;
          
          // Committee details
          pdf.setFontSize(12);
          pdf.setTextColor('#222');
          pdf.setFont(undefined, 'bold');
          pdf.text(`${t('startDate')}:`, margin, currentY);
          pdf.setFont(undefined, 'normal');
          pdf.text(`${formatDate(committee.startDate ?? '', language)}`, margin + 90, currentY);
          currentY += 16;
          
          pdf.setFont(undefined, 'bold');
          pdf.text(`${t('duration')}:`, margin, currentY);
          pdf.setFont(undefined, 'normal');
          const durationLabelWidth = pdf.getTextWidth(`${t('duration')}:`);
          pdf.text(`${(committee.duration ?? '') + ' ' + t((committee.type?.toLowerCase?.() === 'monthly' ? 'months' : committee.type?.toLowerCase?.() === 'weekly' ? 'weeks' : 'days') ?? 'months')}`,
            margin + durationLabelWidth + 20, currentY);
          currentY += 16;
          
          pdf.setFont(undefined, 'bold');
          pdf.text(`${t('amountPerMember')}:`, margin, currentY);
          pdf.setFont(undefined, 'normal');
          pdf.text(`PKR ${(typeof committee.amountPerMember === 'number' ? committee.amountPerMember.toLocaleString() : '0')}`, margin + 120, currentY);
          currentY += 20;
          
          // Payment History
          const paymentsForCommittee = committee.payments.filter(p => p.memberId === member.id && p.status === 'Cleared')
            .sort((a,b) => a.monthIndex - b.monthIndex || new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());
          
          if (paymentsForCommittee.length > 0) {
            checkPageBreak(50);
            pdf.setFontSize(12);
            pdf.setTextColor('#0e7490');
            pdf.setFont(undefined, 'bold');
            pdf.text(`${t('paymentHistory')}`, margin, currentY);
            currentY += 15;
            
            // Use autoTable with page break handling
            const tableData = paymentsForCommittee.map(p => [
              getCommitteeMonthName((committee?.startDate ?? '') as string, p.monthIndex, language) || '',
              `PKR ${typeof p.amountPaid === 'number' ? p.amountPaid.toLocaleString() : '0'}`,
              p.paymentDate ? formatDate((p.paymentDate ?? '') as string, language) : 'N/A',
              t((p.status || '').toLowerCase())
            ]);
            
            autoTable(pdf, {
              startY: currentY,
              head: [[t('month'), t('installmentAmount'), t('paymentDate'), t('status')]],
              body: tableData,
              theme: 'grid',
              headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
              styles: { fontSize: 10, cellPadding: 4 },
              margin: { left: margin, right: margin },
              pageBreak: 'auto',
              didParseCell: function (data) {
                if (data.section === 'body' && data.column.index === 3 && data.cell.raw === t('cleared')) {
                  data.cell.styles.textColor = [34, 197, 94];
                  data.cell.styles.fontStyle = 'bold';
                }
              },
            });
            
            currentY = pdf.lastAutoTable.finalY + 20;
            
            // Summary after payment table
            checkPageBreak(50);
            pdf.setFontSize(11);
            pdf.setTextColor('#222');
            pdf.setFont(undefined, 'bold');
            pdf.text(`${t('totalContributedThisCommittee')}:`, margin, currentY);
            const contributedLabelWidth = pdf.getTextWidth(`${t('totalContributedThisCommittee')}:`);
            const totalContributed = paymentsForCommittee.reduce((sum, p) => sum + (p.amountPaid || 0), 0);
            pdf.setFont(undefined, 'normal');
            pdf.text(`PKR ${totalContributed.toLocaleString()}`, margin + contributedLabelWidth + 20, currentY);
            currentY += 16;
            
            const totalDue = (committee.amountPerMember || 0) * (committee.duration || 0);
            const remainingAmount = totalDue - totalContributed;
            pdf.setFont(undefined, 'bold');
            pdf.text(`${t('remainingAmount')}:`, margin, currentY);
            const remainingLabelWidth = pdf.getTextWidth(`${t('remainingAmount')}:`);
            pdf.setFont(undefined, 'normal');
            pdf.text(`PKR ${remainingAmount.toLocaleString()}`, margin + remainingLabelWidth + 20, currentY);
            currentY += 20;
          } else {
            pdf.setFontSize(12);
            pdf.setTextColor('#222');
            pdf.setFont(undefined, 'normal');
            pdf.text(t('noPaymentsMade'), margin, currentY);
            currentY += 20;
          }
          
          // Payout History
          const payoutsForCommittee = committee.payoutTurns.filter(pt => pt.memberId === member.id && pt.paidOut)
            .sort((a,b) => a.turnMonthIndex - b.turnMonthIndex);
          
          if (payoutsForCommittee.length > 0) {
            checkPageBreak(50);
            pdf.setFontSize(12);
            pdf.setTextColor('#0e7490');
            pdf.setFont(undefined, 'bold');
            pdf.text(`${t('payoutHistory')}`, margin, currentY);
            currentY += 15;
            
            const payoutTableData = payoutsForCommittee.map(pt => [
              getCommitteeMonthName(committee?.startDate ?? '', pt.turnMonthIndex, language) || '',
              `PKR ${(committee.amountPerMember * committee.memberIds.length).toLocaleString()}`,
              pt.payoutDate ? formatDate(pt.payoutDate, language) : 'N/A'
            ]);
            
            autoTable(pdf, {
              startY: currentY,
              head: [[t('turnMonth'), t('amountPKR'), t('date')]],
              body: payoutTableData,
              theme: 'grid',
              headStyles: { fillColor: [6, 182, 212], textColor: 255, fontStyle: 'bold' },
              styles: { fontSize: 10, cellPadding: 4 },
              margin: { left: margin, right: margin },
              pageBreak: 'auto',
            });
            
            currentY = pdf.lastAutoTable.finalY + 20;
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
    
    const paymentGridHeader = Array.from({ length: committee.duration }, (_, i) => getCommitteeMonthName(committee?.startDate ?? '', i, language));
    const monthOptions = Array.from({ length: committee.duration }, (_, i) => ({
        value: i,
        label: getCommitteeMonthName(committee?.startDate ?? '', i, language)
    }));


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
                        <UsersIcon className={`h-6 w-6 text-primary dark:text-primary-light ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {t('committeeMembers')} ({committeeMembers.length})
                    </h2>
                    <div className={`flex space-x-2 ${language === Language.UR ? 'space-x-reverse' : ''}`}>
                        <Button size="sm" onClick={() => setIsAddExistingMemberModalOpen(true)}>{t('addExistingMember')}</Button>
                        <Button size="sm" onClick={() => handleOpenMemberForm()}>{t('createNewMember')}</Button>
                    </div>
                </div>
                {committeeMembers.length === 0 ? (
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
                                    <th scope="col" className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider text-center`}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-darker divide-y divide-gray-200 dark:divide-gray-700">
                                {committeeMembers.map(member => (
                                    <tr key={member.id}>
                                        <td className="px-2 py-2 whitespace-nowrap">
                                            <img src={member.profilePictureUrl || DEFAULT_PROFILE_PIC} alt={member.name} className="w-10 h-10 rounded-full object-cover"/>
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-darker dark:text-neutral-light">{member.name}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{member.phone}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{member.cnic}</td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium text-center`}>
                                            <div className={`flex items-center justify-center space-x-1 ${language === Language.UR ? 'space-x-reverse' : ''}`}>
                                                <Button variant="ghost" size="sm" onClick={() => handleOpenMemberForm(member)} aria-label={t('edit')} title={t('edit')}><PencilSquareIcon className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDownloadMemberHistory(member.id)} aria-label={t('downloadMemberHistory')} title={t('downloadMemberHistory')}><ArrowDownTrayIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleRemoveMemberWrapper(member.id)} aria-label={t('delete')} title={language === Language.UR ? "اس کمیٹی سے ہٹائیں" : "Remove from this committee"}><TrashIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" /></Button>
                                                <Button variant="ghost" size="sm" onClick={() => handleDeleteMemberGloballyWrapper(member.id)} title={language === Language.UR ? "مکمل طور پر حذف کریں" : "Delete Globally"} aria-label={language === Language.UR ? "مکمل طور پر حذف کریں" : "Delete Globally"}><TrashIcon className="w-4 h-4 text-red-600 dark:text-red-400" /></Button>
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
                        <DocumentTextIcon className={`h-6 w-6 text-primary dark:text-primary-light ${language === Language.UR ? 'ml-2' : 'mr-2'}`} /> {t('paymentTracking')}
                    </h2>
                    {committeeMembers.length > 0 && committee.duration > 0 && (
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

                {committeeMembers.length > 0 ? (
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
                                {committeeMembers.map(member => {
                                    return (
                                    <tr key={member.id}>
                                        <td className={`sticky ${language === Language.UR ? 'right-0' : 'left-0'} bg-white dark:bg-neutral-darker z-10 px-3 py-2 whitespace-nowrap text-sm font-medium text-neutral-darker dark:text-neutral-light border-l border-r border-gray-200 dark:border-gray-700`}>{member.name}</td>
                                        {Array.from({ length: committee.duration }, (_, monthIndex) => {
                                            const memberInstallmentsForMonth = committee.payments.filter(p => p.memberId === member.id && p.monthIndex === monthIndex && p.status === 'Cleared');
                                            const totalPaidForMonth = memberInstallmentsForMonth.reduce((sum, p) => sum + p.amountPaid, 0);
                                            
                                            let derivedMonthlyStatus: 'Paid' | 'Unpaid' | 'Partial' = 'Unpaid';
                                            if (totalPaidForMonth >= committee.amountPerMember) {
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
                                                      <Button size="sm" variant="ghost" className="text-xs p-1" onClick={() => handleOpenPaymentModal(member.id, monthIndex)}>{t('addInstallment')}</Button>
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
                <h2 className="text-xl font-semibold text-neutral-darker dark:text-neutral-light mb-4">{t('payouts')}</h2>
                 {committee.payoutTurns && committee.payoutTurns.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                             <thead className="bg-gray-50 dark:bg-neutral-dark">
                                <tr>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('turnMonth')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('memberName')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('payout Amount')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('status')}</th>
                                    <th className={`px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${language === Language.UR ? 'text-right' : 'text-left'}`}>{t('actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-neutral-darker divide-y divide-gray-200 dark:divide-gray-700">
                                {committee.payoutTurns.sort((a,b) => a.turnMonthIndex - b.turnMonthIndex).map(turn => (
                                    <tr key={`${turn.memberId}-${turn.turnMonthIndex}`}>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{getCommitteeMonthName(committee?.startDate ?? '', turn.turnMonthIndex, language)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-darker dark:text-neutral-light">{getMemberName(turn.memberId, allMembers)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-neutral-darker dark:text-neutral-light">PKR {(committee.amountPerMember * committee.memberIds.length).toLocaleString()}</td>
                                        <td className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${turn.paidOut ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {turn.paidOut ? t('paidOut') + (turn.payoutDate ? ` (${formatDate(turn.payoutDate, language)})` : '') : t('pending')}
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                            <Button size="sm" onClick={() => handleTogglePayout(turn)}>
                                                {turn.paidOut ? t('markUnpaid') : t('markPaidOut')}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
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
                        <img src={logo || ''} alt="Logo" className="h-16 w-16 mb-2" />
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
        </div>
    );
};


export default CommitteeManagement;