"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import * as XLSX from 'xlsx';
import {
  Bell,
  Settings,
  User,
  BarChart2,
  Home,
  Briefcase,
  MessagesSquare,
  X,
  Send,
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  MoreVertical,
  Star,
  Activity,
  FileText,
  GraduationCap,
  Check,
  ChevronDown,
  Loader2,
  Eye,
  EyeOff,
  Video,
  HelpCircle,
  Upload,
  FileSignature,
  Cake,
  ArrowLeft,
  CreditCard,
  Ruler,
  Edit2,
  Key,
  ExternalLink,
  ClipboardList,
  Thermometer
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import AdminNavigation from "@/components/AdminNavigation";
import AdminEddieAssistant from "@/components/AdminEddieAssistant";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import KrankenstandHistoryPopover from "@/components/admin/promotors/KrankenstandHistoryPopover";

function TooltipButton({ tooltip, isActive, onClick, children }: { tooltip: string; isActive: boolean; onClick: () => void; children: React.ReactNode }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const button = buttonRef.current;
    if (!button) return;

    const handleMouseEnter = () => {
      timeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 2000);
    };

    const handleMouseLeave = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setShowTooltip(false);
    };

    button.addEventListener('mouseenter', handleMouseEnter);
    button.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      button.removeEventListener('mouseenter', handleMouseEnter);
      button.removeEventListener('mouseleave', handleMouseLeave);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        style={{
          boxShadow: '0 2px 4px -1px rgba(0, 0, 0, 0.15), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
        }}
        className={`flex items-center justify-center rounded px-2 py-1 transition-all duration-200 ${
          isActive
            ? 'bg-gradient-to-r from-green-500/60 to-green-800/60'
            : 'bg-gray-200 hover:bg-gray-300'
        }`}
      >
        {children}
      </button>
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-black/85 text-white text-xs rounded-md whitespace-nowrap pointer-events-none z-50">
          {tooltip}
        </div>
      )}
    </div>
  );
}

export default function PromotorenPage() {
  const router = useRouter();
  const pathname = usePathname();

  // Simple skeleton fade animation CSS
  const skeletonStyles = `
    .animate-skeleton-fade {
      animation: skeleton-fade 0.7s ease-in-out infinite alternate;
    }
    @keyframes skeleton-fade {
      0% {
        background-color: #f9fafb;
      }
      100% {
        background-color: #f3f4f6;
      }
    }
  `;

type DienstvertragFileRow = {
  id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  file_ext: 'pdf' | 'doc' | 'docx' | string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  mime_type?: string;
  hours_per_week?: number | null;
};
type UpcomingAssignmentRow = {
  id: string;
  title?: string | null;
  location_text?: string | null;
  postal_code?: string | null;
  city?: string | null;
  start_ts?: string | null;
  end_ts?: string | null;
  status?: string | null;
  user_role?: string | null;
  buddy_name?: string | null;
  buddy_display_name?: string | null;
  buddy_user_id?: string | null;
  promotor?: string | null;
};

type AccessImportStage = 'upload' | 'preview_mapping' | 'resolve_promotors';
type AccessImportMapping = {
  fullNameCol: string;
  huebnerEmailCol: string;
  huebnerPasswordCol: string;
  demotoolEmailCol: string;
  demotoolPasswordCol: string;
  tmaEmailCol: string;
  tmaPasswordCol: string;
  boostAppEmailCol: string;
  boostAppPasswordCol: string;
};
type AccessImportUnresolvedPromotor = {
  rowKey: string;
  rowNumber: number;
  importedName: string;
  reason?: string;
  candidatePromotors?: Array<{ user_id: string; name: string }>;
};
type AccessImportResult = {
  updated: number;
  updatedRows?: number;
  skipped: number;
  unresolved: number;
};
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [marketFilter, setMarketFilter] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [onboardingFilters, setOnboardingFilters] = useState<string[]>([]);
  


  // Notes functionality
  const [notesOpen, setNotesOpen] = useState<number | null>(null);
  const [notes, setNotes] = useState<{[key: number]: string}>({});
  const [notesPosition, setNotesPosition] = useState<Record<number, 'left' | 'right'>>({});
  const [detailedViewOpen, setDetailedViewOpen] = useState<number | null>(null);
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const notesRef = useRef<HTMLDivElement>(null);
  const notesSaveTimeouts = useRef<{[key: string]: NodeJS.Timeout}>({});
  
  // Magic touch functionality (copied from admin/statistiken)
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [magicTouchCategories, setMagicTouchCategories] = useState<Record<number, string>>({});

  // Magic touch categories (copied from admin/statistiken)
  const categories = [
    { name: 'Neutral', color: '#f8f9fa', bgColor: '#f8f9fa', borderColor: '#e9ecef', icon: <GraduationCap className="h-3 w-3" /> },
    { name: 'Beeindruckt', color: '#d1f7eb', bgColor: '#d1f7eb', borderColor: '#a7f3d0', icon: <Star className="h-3 w-3" /> },
    { name: 'Zufrieden', color: '#fff0c7', bgColor: '#fff0c7', borderColor: '#fde68a', icon: <CheckCircle className="h-3 w-3" /> },
    { name: 'Verbesserung', color: '#d7ecfb', bgColor: '#d7ecfb', borderColor: '#bfdbfe', icon: <TrendingUp className="h-3 w-3" /> },
    { name: 'Motivierend (unzufrieden)', color: '#eadaff', bgColor: '#eadaff', borderColor: '#ddd6fe', icon: <Activity className="h-3 w-3" /> },
    { name: 'Verschlechterung', color: '#ffe3e3', bgColor: '#ffe3e3', borderColor: '#fecaca', icon: <AlertCircle className="h-3 w-3" /> }
  ];
  
  // Dienstvertrag functionality
  const [showDienstvertragPopup, setShowDienstvertragPopup] = useState(false);
  const [showDienstvertragContent, setShowDienstvertragContent] = useState(false);
  const [selectedPromotorForContract, setSelectedPromotorForContract] = useState<string | null>(null);
  const [loadingContractPreview, setLoadingContractPreview] = useState(false);
  const [contractPreviewUrl, setContractPreviewUrl] = useState<string>('');
  const [contractPreviewExt, setContractPreviewExt] = useState<'pdf' | 'doc' | 'docx' | 'unknown'>('unknown');
  const [selectedContractPreviewId, setSelectedContractPreviewId] = useState<string | null>(null);
  const [contractPreviewError, setContractPreviewError] = useState(false);
  const [uploadingContractFile, setUploadingContractFile] = useState(false);
  const [isContractDropActive, setIsContractDropActive] = useState(false);
  // Contracts for selected promotor
  const [promotorContracts, setPromotorContracts] = useState<DienstvertragFileRow[] | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(false);

  const refreshPromotorContracts = async (promotorId: string) => {
    try {
      setLoadingContracts(true);
      const res = await fetch(`/api/promotors/${promotorId}/contracts`, { cache: 'no-store' });
      const j = await res.json();
      setPromotorContracts(Array.isArray(j.contracts) ? j.contracts : []);
    } catch {
      setPromotorContracts([]);
    } finally { setLoadingContracts(false); }
  };

  useEffect(() => {
    const uid = selectedPromotorForContract;
    if (uid && showDienstvertragPopup) {
      refreshPromotorContracts(uid);
    }
  }, [selectedPromotorForContract, showDienstvertragPopup]);

  // Bank details functionality - for showing/hiding IBAN
  const [ibanVisible, setIbanVisible] = useState<Record<number, boolean>>({});
  const [ibanTimeouts, setIbanTimeouts] = useState<Record<number, NodeJS.Timeout>>({});
  const [ibanCopied, setIbanCopied] = useState<Record<number, boolean>>({});
  const [accountHolderCopied, setAccountHolderCopied] = useState<Record<number, boolean>>({});
  const [bicCopied, setBicCopied] = useState<Record<number, boolean>>({});
  
  // Market filter states
  const [marketDropdownOpen, setMarketDropdownOpen] = useState(false);
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([]);
  const marketDropdownRef = useRef<HTMLDivElement>(null);

  // Status confirmation modal state
  const [showStatusConfirmation, setShowStatusConfirmation] = useState(false);
  const [statusChangePromotorId, setStatusChangePromotorId] = useState<number | null>(null);
  
  // Document management state
  const [documentStatuses, setDocumentStatuses] = useState<Record<string, string>>({});
  
  // Track if Strafregister is deactivated
  const [strafregisterDeactivated, setStrafregisterDeactivated] = useState(false);
  
  // Track which documents have files submitted (variable based on actual submissions)
  const [documentsWithFiles, setDocumentsWithFiles] = useState<Record<string, boolean>>({});
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const regionDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showStammdatenblatt, setShowStammdatenblatt] = useState(false);
  const [showPhotoMenu, setShowPhotoMenu] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveForm, setApproveForm] = useState<{email: string; display_name: string; password: string; applicationId: string | null}>({ email: '', display_name: '', password: '', applicationId: null });
  const [approveError, setApproveError] = useState<string | null>(null);
  const [approveResultPw, setApproveResultPw] = useState<string | null>(null);
  const [showEmailTemplate, setShowEmailTemplate] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [promotorStammdaten, setPromotorStammdaten] = useState<Record<number, any>>({});
  const [openStammdatenPreviewFor, setOpenStammdatenPreviewFor] = useState<number | null>(null);
  const [openKrankenstandFor, setOpenKrankenstandFor] = useState<number | null>(null);
  
  // Access credentials modal
  const [showAccessCredentials, setShowAccessCredentials] = useState(false);
  const [accessCredentials, setAccessCredentials] = useState<any>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});
  const [editingCredentials, setEditingCredentials] = useState<Record<string, boolean>>({});
  const [editCredentialsForm, setEditCredentialsForm] = useState<Record<string, any>>({});

  // Zugänge Excel import (header action)
  const [showAccessImportModal, setShowAccessImportModal] = useState(false);
  const [accessImportStage, setAccessImportStage] = useState<AccessImportStage>('upload');
  const [accessImportSourceFileName, setAccessImportSourceFileName] = useState('');
  const [accessImportSheetRows, setAccessImportSheetRows] = useState<any[][]>([]);
  const [accessImportMapping, setAccessImportMapping] = useState<AccessImportMapping>({
    fullNameCol: 'A',
    huebnerEmailCol: 'B',
    huebnerPasswordCol: 'C',
    demotoolEmailCol: 'D',
    demotoolPasswordCol: 'E',
    tmaEmailCol: 'F',
    tmaPasswordCol: 'G',
    boostAppEmailCol: 'H',
    boostAppPasswordCol: 'I',
  });
  const [accessImportSkipFirstRow, setAccessImportSkipFirstRow] = useState(true);
  const [accessImportBusy, setAccessImportBusy] = useState(false);
  const [accessImportRowErrors, setAccessImportRowErrors] = useState<Array<{ rowKey: string; rowNumber: number; message: string }>>([]);
  const [accessImportUnresolvedPromotors, setAccessImportUnresolvedPromotors] = useState<AccessImportUnresolvedPromotor[]>([]);
  const [accessImportResolutionSelections, setAccessImportResolutionSelections] = useState<Record<string, string>>({});
  const [accessImportResult, setAccessImportResult] = useState<AccessImportResult | null>(null);
  
  // Edit states for promotor details
  const [editingBankData, setEditingBankData] = useState<Record<string, boolean>>({});
  const [editingClothingData, setEditingClothingData] = useState<Record<string, boolean>>({});
  const [editingWorkingDays, setEditingWorkingDays] = useState<Record<string, boolean>>({});
  const [savingBankData, setSavingBankData] = useState<Record<string, boolean>>({});
  const [savingClothingData, setSavingClothingData] = useState<Record<string, boolean>>({});
  const [savingWorkingDays, setSavingWorkingDays] = useState<Record<string, boolean>>({});
  const [editBankForm, setEditBankForm] = useState<Record<string, any>>({});
  const [editClothingForm, setEditClothingForm] = useState<Record<string, any>>({});
  const [editWorkingDaysForm, setEditWorkingDaysForm] = useState<Record<string, string[]>>({});
  
  // Onboarding steps per promotor
  const [onboardingSteps, setOnboardingSteps] = useState<Record<string, any[]>>({});
  
  // Stammdatenblatt (submitted onboarding data)
  const [submittedOnboardingData, setSubmittedOnboardingData] = useState<any[]>([
    {
      id: 1,
      submittedAt: "2024-01-15T10:30:00Z",
      firstName: "Maria",
      lastName: "Huber",
      title: "",
      gender: "weiblich",
      pronouns: "",
      address: "Mariahilfer Straße 45",
      postalCode: "1060",
      city: "Wien",
      phone: "+43 664 789 0123",
      email: "maria.huber@email.at",
      socialSecurityNumber: "1234567890",
      birthDate: "15.03.1995",
      citizenship: "Österreich",
      workPermit: null,
      drivingLicense: true,
      carAvailable: true,
      willingToDrive: true,
      clothingSize: "M",
      height: "165",
      education: "Matura",
      qualifications: "Verkaufserfahrung im Einzelhandel",
      currentJob: "Teilzeit im Einzelhandel",
      spontaneity: "mittel",
      preferredRegion: "wien-noe-bgl",
      workingDays: ["Mo", "Di", "Mi", "Do", "Fr"],
      hoursPerWeek: "25"
    },
    {
      id: 2,
      submittedAt: "2024-01-14T14:20:00Z",
      firstName: "Stefan",
      lastName: "Mayer",
      title: "Mag.",
      gender: "männlich",
      pronouns: "",
      address: "Herrengasse 12",
      postalCode: "8010",
      city: "Graz",
      phone: "+43 676 456 7890",
      email: "stefan.mayer@gmail.com",
      socialSecurityNumber: "0987654321",
      birthDate: "22.07.1992",
      citizenship: "Deutschland",
      workPermit: true,
      drivingLicense: true,
      carAvailable: false,
      willingToDrive: false,
      clothingSize: "L",
      height: "180",
      education: "Universitätsabschluss",
      qualifications: "Marketing Studium",
      currentJob: "Student",
      spontaneity: "sehr",
      preferredRegion: "steiermark",
      workingDays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa"],
      hoursPerWeek: "30"
    },
    {
      id: 3,
      submittedAt: "2024-01-13T09:15:00Z",
      firstName: "Jennifer",
      lastName: "Schmidt",
      title: "",
      gender: "divers",
      pronouns: "sie/ihr",
      address: "Mozartplatz 3",
      postalCode: "5020",
      city: "Salzburg",
      phone: "+43 650 123 4567",
      email: "j.schmidt@outlook.com",
      socialSecurityNumber: "1122334455",
      birthDate: "08.11.1998",
      citizenship: "Österreich",
      workPermit: null,
      drivingLicense: false,
      carAvailable: false,
      willingToDrive: false,
      clothingSize: "S",
      height: "160",
      education: "Lehre",
      qualifications: "Einzelhandelskauffrau",
      currentJob: "Arbeitslos",
      spontaneity: "wenig",
      preferredRegion: "salzburg",
      workingDays: ["Mo", "Mi", "Fr"],
      hoursPerWeek: "20"
    }
  ]);

  // Submit application to backend
  const submitApplication = async (entry: any) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: `${entry.firstName} ${entry.lastName}`.trim(),
          email: entry.email,
          phone: entry.phone,
          notes: `region=${entry.preferredRegion}; hours=${entry.hoursPerWeek}`
        })
      });
      if (!res.ok) throw new Error('Fehler beim Absenden des Stammdatenblatts');
      setToastMsg('Stammdatenblatt gespeichert');
    } catch (e: any) {
      setToastMsg(e.message || 'Fehler');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMsg(null), 2500);
    }
  };

  function generateRandomPassword(length: number = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let out = '';
    for (let i = 0; i < length; i++) out += chars[Math.floor(Math.random() * chars.length)];
    return out;
  }

  const copyEmailToClipboard = async () => {
    const emailText = `Hallo ${approveForm.display_name},

Willkommen in der Zukunft der Nespresso Promotions!

Deine Login-Daten sind:
E-Mail: ${approveForm.email}
Passwort: ${approveResultPw}

Wir freuen uns, dich im Team zu haben!

Beste Grüße,
Dein Nespresso Team`;

    try {
      await navigator.clipboard.writeText(emailText);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  }

  // (Dialog JSX is rendered once at root to avoid remounts that cause input selection/focus jumps)

  // Approve (Annehmen) → create promotor account from submission
  const approveSubmission = async (entry: any) => {
    try {
      setSubmitting(true);
      const res = await fetch('/api/auth/create-promotor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: approveForm.email,
          display_name: approveForm.display_name,
          password: approveForm.password?.trim() ? approveForm.password : undefined,
          applicationId: approveForm.applicationId ?? entry.id,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Fehler bei Annehmen');
      setApproveResultPw(data?.password ?? null);
      setApproveError(null);
      setToastMsg(`Promotor angelegt`);
      setShowEmailTemplate(true);
      // Create a promotor card locally from the matching Stammdaten submission
      const applicationId = approveForm.applicationId ?? entry.id;
      const matchedSubmission = submittedOnboardingData.find((s: any) => String(s.id) === String(applicationId));
      if (matchedSubmission) {
        const newPromotor = {
          id: Date.now(),
          name: `${matchedSubmission.firstName} ${matchedSubmission.lastName}`.trim() || approveForm.display_name,
          email: matchedSubmission.email || approveForm.email,
          phone: matchedSubmission.phone || '',
          address: [matchedSubmission.address, matchedSubmission.postalCode, matchedSubmission.city].filter(Boolean).join(', '),
          birthDate: matchedSubmission.birthDate || '',
          region: matchedSubmission.preferredRegion || 'wien-noe-bgl',
          workingDays: matchedSubmission.workingDays || [],
          status: 'active',
          lastActivity: new Date().toISOString().slice(0, 10),
          performance: { mcet: 0, tma: 0, vlshare: 0 },
          assignments: 0,
          completedTrainings: 0,
          onboardingProgress: 0,
          ausfaelle: { krankenstand: 0, notfaelle: 0 },
      avatar: "/placeholder.svg",
          bankDetails: { accountHolder: '', bankName: '', iban: '', bic: '' },
          clothingInfo: { height: matchedSubmission.height || '', size: matchedSubmission.clothingSize || '' }
        } as any;
        setPromotors(prev => [newPromotor, ...prev]);
        setPromotorStammdaten(prev => ({ ...prev, [newPromotor.id]: matchedSubmission }));
      }
      await loadSubmissions();
    } catch (e: any) {
      setApproveError(e.message || 'Fehler');
    } finally {
      setSubmitting(false);
      setTimeout(() => setToastMsg(null), 2500);
    }
  };

  // Load real applications from backend
  // Edit handlers for promotor details
  const handleEditBankData = async (promotorId: string) => {
    const isEditing = editingBankData[promotorId];
    
    if (isEditing) {
      // Save changes
      try {
      setSavingBankData(prev => ({ ...prev, [promotorId]: true }));
        const formData = editBankForm[promotorId];
        console.log('Updating bank data for promotor:', promotorId, formData);
        const response = await fetch(`/api/promotors/${promotorId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bank_holder: formData.accountHolder,
            bank_name: formData.bankName,
            bank_iban: formData.iban,
            bank_bic: formData.bic,
            // Also allow updating SV number which lives in personal data
            social_security_number: formData.social_security_number
          })
        });
        
        console.log('Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        if (response.ok) {
          // Update local state
          const { accountHolder, bankName, iban, bic, social_security_number } = formData || {};
          setPromotors(prev => prev.map(p => {
            if (p.id !== promotorId) return p;
            return {
              ...p,
              bankDetails: {
                accountHolder: accountHolder ?? p.bankDetails?.accountHolder ?? '',
                bankName: bankName ?? p.bankDetails?.bankName ?? '',
                iban: iban ?? p.bankDetails?.iban ?? '',
                bic: bic ?? p.bankDetails?.bic ?? ''
              },
              personalData: {
                ...(p.personalData || {}),
                social_security_number: social_security_number ?? p.personalData?.social_security_number ?? ''
              }
            };
          }));
          setToastMsg('Bankdaten erfolgreich aktualisiert');
        } else {
          throw new Error('Fehler beim Speichern');
        }
      } catch (e) {
        setToastMsg('Fehler beim Speichern der Bankdaten');
    } finally {
      setSavingBankData(prev => ({ ...prev, [promotorId]: false }));
    }
    } else {
      // Enter edit mode
      const promotor = promotors.find(p => p.id === promotorId);
      if (promotor) {
        setEditBankForm(prev => ({
          ...prev,
          [promotorId]: { 
            ...promotor.bankDetails,
            // Prefill SV number from personal data for editing
            social_security_number: promotor.personalData?.social_security_number || ''
          }
        }));
      }
    }
    
    setEditingBankData(prev => ({ ...prev, [promotorId]: !isEditing }));
  };


  const handleEditClothingData = async (promotorId: string) => {
    const isEditing = editingClothingData[promotorId];
    
    if (isEditing) {
      // Save changes
      try {
      setSavingClothingData(prev => ({ ...prev, [promotorId]: true }));
        const formData = editClothingForm[promotorId];
        console.log('Updating clothing data for promotor:', promotorId, formData);
        
        // Debug: Check current user session
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current browser session user:', user?.id);
        const response = await fetch(`/api/promotors/${promotorId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            height: formData.height,
            clothing_size: formData.size
          })
        });
        
        console.log('Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        if (response.ok) {
          // Update local state
          setPromotors(prev => prev.map(p => 
            p.id === promotorId 
              ? { ...p, clothingInfo: formData }
              : p
          ));
          setToastMsg('Kleidergröße erfolgreich aktualisiert');
        } else {
          throw new Error('Fehler beim Speichern');
        }
      } catch (e) {
        setToastMsg('Fehler beim Speichern der Kleidergröße');
    } finally {
      setSavingClothingData(prev => ({ ...prev, [promotorId]: false }));
    }
    } else {
      // Enter edit mode
      const promotor = promotors.find(p => p.id === promotorId);
      if (promotor) {
        setEditClothingForm(prev => ({
          ...prev,
          [promotorId]: { ...promotor.clothingInfo }
        }));
      }
    }
    
    setEditingClothingData(prev => ({ ...prev, [promotorId]: !isEditing }));
  };

  const handleEditWorkingDays = async (promotorId: string) => {
    const isEditing = editingWorkingDays[promotorId];
    
    if (isEditing) {
      // Save changes
      try {
      setSavingWorkingDays(prev => ({ ...prev, [promotorId]: true }));
        const formData = editWorkingDaysForm[promotorId];
        console.log('Updating working days for promotor:', promotorId, formData);
        
        const response = await fetch(`/api/promotors/${promotorId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            working_days: formData
          })
        });
        
        console.log('Response status:', response.status);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error:', errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        if (response.ok) {
          // Update local state
          setPromotors(prev => prev.map(p => 
            p.id === promotorId 
              ? { ...p, workingDays: formData }
              : p
          ));
          setToastMsg('Arbeitstage erfolgreich aktualisiert');
        } else {
          throw new Error('Fehler beim Speichern');
        }
      } catch (e) {
        setToastMsg('Fehler beim Speichern der Arbeitstage');
    } finally {
      setSavingWorkingDays(prev => ({ ...prev, [promotorId]: false }));
    }
    } else {
      // Enter edit mode
      const promotor = promotors.find(p => p.id === promotorId);
      if (promotor) {
        setEditWorkingDaysForm(prev => ({
          ...prev,
          [promotorId]: [...(promotor.workingDays || [])]
        }));
      }
    }
    
    setEditingWorkingDays(prev => ({ ...prev, [promotorId]: !isEditing }));
  };

  const loadSubmissions = async () => {
    try {
      const res = await fetch('/api/applications', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && Array.isArray(json.applications)) {
        // Map server shape to UI shape expected here
        const mapped = json.applications.map((a: any) => ({
          id: a.id as string, // keep DB id (uuid) for actions like approve
          submittedAt: a.created_at ?? new Date().toISOString(),
          firstName: (a.full_name ?? '').split(' ')[0] ?? '',
          lastName: (a.full_name ?? '').split(' ').slice(1).join(' ') ?? '',
          title: a.title ?? '',
          gender: a.gender ?? '',
          pronouns: a.pronouns ?? '',
          address: a.address ?? '',
          postalCode: a.postalCode ?? '',
          city: a.city ?? '',
          phone: a.phone ?? '',
          email: a.email ?? '',
          socialSecurityNumber: a.socialSecurityNumber ?? '',
          birthDate: a.birthDate ?? '',
          citizenship: a.citizenship ?? '',
          workPermit: a.workPermit ?? null,
          drivingLicense: a.drivingLicense ?? null,
          carAvailable: a.carAvailable ?? null,
          willingToDrive: a.willingToDrive ?? null,
          clothingSize: a.clothingSize ?? '',
          height: a.height ?? '',
          education: a.education ?? '',
          qualifications: a.qualifications ?? '',
          currentJob: a.currentJob ?? '',
          spontaneity: a.spontaneity ?? '',
          preferredRegion: a.preferredRegion ?? '',
          workingDays: a.workingDays ?? [],
          hoursPerWeek: a.hoursPerWeek ?? '',
          status: a.status ?? 'received'
        }));
        setSubmittedOnboardingData(mapped);
      }
    } catch (e) {
      // fail silent for now
    }
  };

  useEffect(() => {
    // Always load initially and whenever toggled
    loadSubmissions();
    loadPromotors();
  }, []);

  // When a detailed promotor view opens, load their document statuses from backend
  useEffect(() => {
    if (detailedViewOpen) {
      try {
        const uid = String(detailedViewOpen)
        loadPromotorDocuments(uid)
      } catch {}
    }
  }, [detailedViewOpen]);

  // Load documents for selected promotor into the documentStatuses/withFiles maps
  const loadPromotorDocuments = async (uid: string) => {
    try {
      const res = await fetch(`/api/promotors/${uid}/documents`, { cache: 'no-store' })
      const json = await res.json()
      const rows: Array<{ doc_type: string; status: string; file_path?: string }> = Array.isArray(json.documents) ? json.documents : []
      const nameFromType = (t: string) => t === 'passport' ? 'Pass' : t === 'fuehrerschein' ? 'Führerschein' : t === 'citizenship' ? 'Staatsbürgerschaftsnachweis' : t === 'arbeitserlaubnis' ? 'Arbeitserlaubnis' : t === 'strafregister' ? 'Strafregister Bescheinigung' : 'Zusätzliche Dokumente'
      const statuses: Record<string, string> = {}
      const files: Record<string, boolean> = {}
      for (const r of rows) {
        const name = nameFromType(r.doc_type)
        if (r.status === 'approved') {
          statuses[name] = 'approved'
          files[name] = !!r.file_path
        } else if (r.status === 'uploaded') {
          statuses[name] = 'pending'
          files[name] = !!r.file_path
        } else if (r.status === 'rejected') {
          statuses[name] = 'missing'
          files[name] = false
        }
      }
      setDocumentStatuses(statuses)
      setDocumentsWithFiles(files)
    } catch {}
  }
  useEffect(() => {
    if (showStammdatenblatt) loadSubmissions();
  }, [showStammdatenblatt]);



  // Promotors state (real data only; no mock fallback)
  const [promotors, setPromotors] = useState<any[]>([]);
  const [promotorsLoading, setPromotorsLoading] = useState(true); // Start loading immediately
  const [promotorsError, setPromotorsError] = useState(false);
  const [promotorMarkets, setPromotorMarkets] = useState<Record<string, string[]>>({});

  // Load promotors from backend
  const loadPromotors = async () => {
    try {
      setPromotorsLoading(true);
      setPromotorsError(false);
      const res = await fetch('/api/promotors', { cache: 'no-store' });
      const json = await res.json();
      if (res.ok && Array.isArray(json.promotors)) {
        const normalized = json.promotors.map((p: any) => ({
          id: p.id,
          name: p.name || 'Unbekannt',
          email: p.email || '',
          phone: p.phone || '',
          address: p.address || '',
          birthDate: p.birthDate || '',
          region: p.region || 'wien-noe-bgl',
          workingDays: Array.isArray(p.workingDays) ? p.workingDays : [],
          status: p.status || 'active',
          lastActivity: p.lastActivity || new Date().toISOString().slice(0, 10),
          // keep UI-specific metrics from existing data; only set if provided
          performance: p.performance && typeof p.performance === 'object' ? p.performance : undefined,
          assignments: typeof p.assignments === 'number' ? p.assignments : undefined,
          completedTrainings: typeof p.completedTrainings === 'number' ? p.completedTrainings : undefined,
          onboardingProgress: typeof p.onboardingProgress === 'number' ? p.onboardingProgress : undefined,
          ausfaelle: p.ausfaelle && typeof p.ausfaelle === 'object' ? p.ausfaelle : undefined,
          avatar: p.avatar || undefined,
          bankDetails: p.bankDetails && typeof p.bankDetails === 'object' ? p.bankDetails : undefined,
          clothingInfo: p.clothingInfo || undefined,
          personalData: p.personalData && typeof p.personalData === 'object' ? p.personalData : undefined,
          applicationId: p.applicationId || null,
        }));

        // Check assignment history for each promotor to determine New Joiner status
        const userIds = normalized.map((p: any) => p.id);
        let assignmentHistory: Map<string, boolean> = new Map();
        
        try {
          console.log('Checking assignment history for userIds:', userIds);
          const historyRes = await fetch('/api/promotors/assignment-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_ids: userIds })
          });
          
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            const userIdsWithHistory = historyData.user_ids_with_history || [];
            console.log('Users with assignment history:', userIdsWithHistory);
            
            // Create map of users who have assignment history
            userIdsWithHistory.forEach((userId: string) => {
              console.log('Setting assignmentHistory for user:', userId);
              assignmentHistory.set(userId, true);
            });
            
            console.log('Final assignmentHistory map:', Array.from(assignmentHistory.entries()));
          } else {
            console.error('Failed to fetch assignment history:', historyRes.status);
          }
        } catch (e) {
          console.error('Failed to load assignment history:', e);
        }

        // Use backend data only; map to UI shape with safe KPI defaults
        const cards = normalized.map((inc: any) => ({
          id: inc.id,
          name: inc.name,
          email: inc.email,
          phone: inc.phone,
          address: inc.address,
          birthDate: inc.birthDate,
          region: inc.region,
          workingDays: inc.workingDays,
          status: assignmentHistory.has(inc.id) ? 'active' : 'newjoiner', // Set status based on assignment history
          lastActivity: inc.lastActivity,
          performance: { mcet: 0, tma: 0, vlshare: 0 },
          assignments: 0,
          completedTrainings: 0,
          onboardingProgress: 0,
          ausfaelle: { krankenstand: 0, notfaelle: 0 },
          avatar: inc.avatar || '/placeholder.svg',
      bankDetails: {
            accountHolder: inc.bankDetails?.accountHolder ?? '',
            bankName: inc.bankDetails?.bankName ?? '',
            iban: inc.bankDetails?.iban ?? '',
            bic: inc.bankDetails?.bic ?? ''
      },
      clothingInfo: {
            height: inc.clothingInfo?.height ?? '',
            size: inc.clothingInfo?.size ?? ''
          },
          personalData: {
            birth_date: inc.personalData?.birth_date ?? '',
            social_security_number: inc.personalData?.social_security_number ?? '',
            citizenship: inc.personalData?.citizenship ?? ''
          },
          applicationId: inc.applicationId ?? null,
        }));
        // Fetch onboarding status per promotor and compute progress
        const withProgress = await Promise.all(cards.map(async (card: any) => {
          try {
            const r = await fetch(`/api/promotors/${card.id}/onboarding`, { cache: 'no-store' });
            const j = await r.json();
            const steps = Array.isArray(j.steps) ? j.steps : [];
            if (!steps.length) return card;
            // Only count the 4 steps we display (exclude first_training)
            const displayedSteps = ['profile_basics', 'documents', 'dienstvertrag', 'bank_details'];
            const relevantSteps = steps.filter((s: any) => displayedSteps.includes(s.step_key));
            const done = relevantSteps.filter((s: any) => s.status === 'done').length;
            const progress = relevantSteps.length > 0 ? Math.round((done / relevantSteps.length) * 100) : 0;
            // Store steps for icon display
            setOnboardingSteps(prev => ({ ...prev, [card.id]: steps }));
            return { ...card, onboardingProgress: progress };
          } catch { return card; }
        }));
        setPromotors(withProgress);
      } else {
        setPromotorsError(true);
        setPromotors([]);
      }
    } catch {
      setPromotorsError(true);
      setPromotors([]);
    } finally {
      setPromotorsLoading(false);
    }
  };

  // Fetch markets from assignments for each promotor
  useEffect(() => {
    const fetchMarkets = async () => {
      if (!promotors.length) return;
      
      try {
        // Fetch all assignments to extract unique markets
        const res = await fetch('/api/assignments');
        if (!res.ok) return;
        
        const data = await res.json();
        const assignments = data.assignments || [];
        
        // Extract unique markets from assignment metadata or title
        const marketsSet = new Set<string>();
        const promotorMarketsMap: Record<string, string[]> = {};
        
        assignments.forEach((assignment: any) => {
          const market = assignment.metadata?.market || assignment.title || '';
          if (market && market.trim()) {
            marketsSet.add(market.trim());
            
            // Associate market with promotor (lead_user_id)
            if (assignment.lead_user_id) {
              if (!promotorMarketsMap[assignment.lead_user_id]) {
                promotorMarketsMap[assignment.lead_user_id] = [];
              }
              if (!promotorMarketsMap[assignment.lead_user_id].includes(market.trim())) {
                promotorMarketsMap[assignment.lead_user_id].push(market.trim());
              }
            }
          }
        });
        
        setAvailableMarkets(Array.from(marketsSet).sort());
        setPromotorMarkets(promotorMarketsMap);
      } catch (error) {
        console.error('Failed to fetch markets:', error);
      }
    };
    
    fetchMarkets();
  }, [promotors]);

  // Link promotor -> stammdaten when both lists are available
  useEffect(() => {
    try {
      const map: Record<string | number, any> = {};
      promotors.forEach((p: any) => {
        if (p?.applicationId) {
          const s = submittedOnboardingData.find((x: any) => String(x.id) === String(p.applicationId));
          if (s) map[p.id] = s;
        } else {
          // Fallback matching by email or name when no explicit link exists
          const byEmail = p.email ? submittedOnboardingData.find((x: any) => String(x.email || '').toLowerCase() === String(p.email || '').toLowerCase()) : null;
          if (byEmail) {
            map[p.id] = byEmail;
          } else {
            const pName = String(p.name || '').trim().toLowerCase();
            const byName = submittedOnboardingData.find((x: any) => `${String(x.firstName||'').trim()} ${String(x.lastName||'').trim()}`.toLowerCase() === pName);
            if (byName) map[p.id] = byName;
          }
        }
      });
      if (Object.keys(map).length) setPromotorStammdaten((prev) => ({ ...prev, ...map }));
      // Also enrich promotor cards with contact/address fields from matched stammdaten
      let needsUpdate = false;
      const updated = promotors.map((p: any) => {
        const s = map[p.id];
        if (!s) return p;
        const mergedAddress = [s.address, s.postalCode, s.city].filter(Boolean).join(', ');
        const next = {
          ...p,
          email: p.email || s.email || '',
          phone: p.phone || s.phone || '',
          address: p.address || mergedAddress,
          birthDate: p.birthDate || s.birthDate || '',
          region: p.region || s.preferredRegion || p.region,
          workingDays: (p.workingDays && p.workingDays.length) ? p.workingDays : (s.workingDays || []),
          clothingInfo: {
            height: p.clothingInfo?.height ?? s?.height ?? '',
            size: p.clothingInfo?.size ?? s?.clothingSize ?? ''
          },
        };
        if (
          next.email !== p.email ||
          next.phone !== p.phone ||
          next.address !== p.address ||
          next.birthDate !== p.birthDate ||
          next.region !== p.region ||
          (Array.isArray(next.workingDays) && Array.isArray(p.workingDays) && next.workingDays.join(',') !== p.workingDays.join(',')) ||
          next.clothingInfo?.height !== p.clothingInfo?.height ||
          next.clothingInfo?.size !== p.clothingInfo?.size
        ) {
          needsUpdate = true;
        }
        return next;
      });
      if (needsUpdate) setPromotors(updated);
    } catch {}
  }, [promotors, submittedOnboardingData]);

  // Region mapping for display
  const regionNames = {
    "wien-noe-bgl": "Wien/NÖ/Bgl",
    "steiermark": "Steiermark",
    "salzburg": "Salzburg",
    "oberoesterreich": "Oberösterreich",
    "tirol": "Tirol",
    "vorarlberg": "Vorarlberg",
    "kaernten": "Kärnten"
  };

  // Region colors for badges - matching admin dashboard popup styling
  const getRegionGradient = (region: string) => {
    // Match add-promotor window pastel colors (dashboard helper)
    switch (region) {
      case "wien-noe-bgl": return "bg-[#E8F0FE]"; // pastel blue
      case "steiermark": return "bg-[#E7F5ED]"; // pastel green
      case "salzburg": return "bg-[#F0E9FF]"; // pastel indigo
      case "oberoesterreich": return "bg-[#FFF3E6]"; // pastel orange
      case "tirol": return "bg-[#FDEBF3]"; // pastel pink
      case "vorarlberg": return "bg-[#EAF8FF]"; // pastel cyan
      case "kaernten": return "bg-[#EAF6FF]"; // soft sky
      default: return "bg-gray-50";
    }
  };

  const getRegionBorder = (region: string) => {
    // Matching soft borders per cluster
    switch (region) {
      case "wien-noe-bgl": return "border-[#CBD7F5]";
      case "steiermark": return "border-[#CFECDD]";
      case "salzburg": return "border-[#DDD4FF]";
      case "oberoesterreich": return "border-[#FFE3C7]";
      case "tirol": return "border-[#F8D5E5]";
      case "vorarlberg": return "border-[#CFEFFF]";
      case "kaernten": return "border-[#D6ECFF]";
      default: return "border-gray-200";
    }
  };

  const getRegionPillColors = (region: string) => {
    return `${getRegionGradient(region)} ${getRegionBorder(region)} text-gray-700`;
  };

  const getRegionHoverClass = (region: string) => {
    switch (region) {
      case "wien-noe-bgl": return "hover:bg-red-100/50";
      case "steiermark": return "hover:bg-green-100/50";
      case "salzburg": return "hover:bg-blue-100/50";
      case "oberoesterreich": return "hover:bg-yellow-100/50";
      case "tirol": return "hover:bg-purple-100/50";
      case "vorarlberg": return "hover:bg-orange-100/50";
      case "kaernten": return "hover:bg-teal-100/50";
      default: return "hover:bg-gray-50";
    }
  };

  // KPI color functions - matching statistics page rules
  const getKpiColor = (category: "mcet" | "tma" | "vlshare", value: number) => {
    if (category === "mcet") {
      if (value >= 4.5) return "text-green-600";
      if (value >= 4.0) return "text-[#FD7E14]";
      return "text-red-600";
    } else if (category === "tma") {
      if (value >= 75) return "text-green-600";
      if (value >= 65) return "text-[#FD7E14]";
      return "text-red-600";
    } else if (category === "vlshare") {
      if (value >= 10) return "text-green-600";
      if (value >= 6) return "text-[#FD7E14]";
      return "text-red-600";
    }
    return "text-gray-600";
  };

  const getKpiStyle = (colorClass: string) => {
    if (colorClass === "text-[#FD7E14]") {
      return { color: "#FD7E14" };
    }
    return {};
  };

  // Magic touch functions (copied from admin/statistiken)
  const handleMagicTouchClick = (promotorId: number) => {
    setOpenDropdown(openDropdown === promotorId ? null : promotorId);
  };

  const handleCategorySelect = (promotorId: number, category: string) => {
    setMagicTouchCategories(prev => ({ ...prev, [promotorId]: category }));
    setOpenDropdown(null);
  };

  const getMagicTouchStyle = (promotorId: number) => {
    const selectedCategory = magicTouchCategories[promotorId];
    if (!selectedCategory) return {};
    
    // If Neutral is selected, return empty object to use default styling
    if (selectedCategory === 'Neutral') return {};
    
    const category = categories.find(c => c.name === selectedCategory);
    if (!category) return {};
    
    // Convert hex to rgba with 80% opacity for background
    const hexToRgba = (hex: string, alpha: number) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    return { 
      backgroundColor: hexToRgba(category.bgColor, 0.8),
      borderColor: category.borderColor,
      boxShadow: `0 1px 3px 0 ${category.borderColor}40, 0 1px 2px 0 ${category.borderColor}60`
    };
  };

  // Admin-side stats for detailed view (completed, krankenstand, attendance)
  const [promotorStats, setPromotorStats] = useState<Record<number, { completed: number; krankenstand: number; attendanceRate: number }>>({});
  const [promotorStatsLoading, setPromotorStatsLoading] = useState<Record<number, boolean>>({});
  const [kpiByPromotor, setKpiByPromotor] = useState<Record<number, { mcet: number; tma: number; vlshare: number }>>({});
  const [kpiLoading, setKpiLoading] = useState<Record<number, boolean>>({});
  const [upcomingAssignmentsByPromotor, setUpcomingAssignmentsByPromotor] = useState<Record<string, UpcomingAssignmentRow[]>>({});
  const [upcomingAssignmentsLoading, setUpcomingAssignmentsLoading] = useState<Record<string, boolean>>({});
  const [upcomingAssignmentsError, setUpcomingAssignmentsError] = useState<Record<string, boolean>>({});

  const loadPromotorStats = useCallback(async (promotorId: number) => {
    try {
      setPromotorStatsLoading(prev => ({ ...prev, [promotorId]: true }));
      const res = await fetch(`/api/admin/promotors/${promotorId}/profile-stats`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPromotorStats(prev => ({
          ...prev,
          [promotorId]: {
            completed: Number(data.completed || 0),
            krankenstand: Number(data.krankenstand || 0),
            attendanceRate: Number(data.attendanceRate || 0),
          }
        }));
      }
    } catch {
      // ignore
    } finally {
      setPromotorStatsLoading(prev => ({ ...prev, [promotorId]: false }));
    }
  }, []);

  useEffect(() => {
    if (detailedViewOpen) {
      loadPromotorStats(detailedViewOpen);
    }
  }, [detailedViewOpen, loadPromotorStats]);

  const loadUpcomingAssignments = useCallback(async (promotorId: string) => {
    try {
      setUpcomingAssignmentsLoading(prev => ({ ...prev, [promotorId]: true }));
      setUpcomingAssignmentsError(prev => ({ ...prev, [promotorId]: false }));

      const res = await fetch(`/api/promotors/${promotorId}/upcoming-assignments?include_all_future=1`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data.assignments) ? data.assignments : [];
      const sorted = [...rows].sort((a: any, b: any) => {
        const aTime = new Date(a?.start_ts || 0).getTime();
        const bTime = new Date(b?.start_ts || 0).getTime();
        return aTime - bTime;
      });
      setUpcomingAssignmentsByPromotor(prev => ({ ...prev, [promotorId]: sorted }));
    } catch {
      setUpcomingAssignmentsByPromotor(prev => ({ ...prev, [promotorId]: [] }));
      setUpcomingAssignmentsError(prev => ({ ...prev, [promotorId]: true }));
    } finally {
      setUpcomingAssignmentsLoading(prev => ({ ...prev, [promotorId]: false }));
    }
  }, []);

  useEffect(() => {
    if (!detailedViewOpen) return;
    const promotorId = String(detailedViewOpen);
    loadUpcomingAssignments(promotorId);
  }, [detailedViewOpen, loadUpcomingAssignments]);

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 60) return "text-[#FD7E14]";
    return "text-red-600";
  };

  // Load KPI (all-time) for promotors (used in both list and detailed view)
  const loadPromotorKpi = useCallback(async (promotorId: number) => {
    try {
      setKpiLoading(prev => ({ ...prev, [promotorId]: true }));
      const res = await fetch(`/api/admin/promotors/${promotorId}/kpi`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setKpiByPromotor(prev => ({
          ...prev,
          [promotorId]: {
            mcet: Number(data.mcet || 0),
            tma: Number(data.tma || 0),
            vlshare: Number(data.vlshare || 0),
          }
        }));
      }
    } catch {
      // ignore
    } finally {
      setKpiLoading(prev => ({ ...prev, [promotorId]: false }));
    }
  }, []);

  useEffect(() => {
    if (!promotors.length) return;
    // Load KPIs for visible cards (basic approach: fetch for all current list)
    promotors.forEach(p => {
      if (kpiByPromotor[p.id] === undefined && !kpiLoading[p.id]) {
        loadPromotorKpi(p.id);
      }
    });
  }, [promotors, loadPromotorKpi]); 

  // Status indicator
  const getStatusIcon = (status: string) => {
    if (status === "active") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === "newjoiner") return <UserCheck className="h-4 w-4 text-blue-500" />;
    return <AlertCircle className="h-4 w-4 text-gray-400" />;
  };

  // Filter promotors
  const filteredPromotors = promotors.filter(promotor => {
    const matchesSearch = promotor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         promotor.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === "all" || promotor.region === regionFilter;
    const matchesStatus = statusFilter === "all" || promotor.status === statusFilter;
    const matchesMarket = marketFilter === "all" || (promotorMarkets[promotor.id] && promotorMarkets[promotor.id].includes(marketFilter));
    
    // Onboarding filter: if any filters are active, check if promotor has all selected steps completed
    const matchesOnboarding = onboardingFilters.length === 0 || (() => {
      const steps = onboardingSteps[promotor.id] || [];
      return onboardingFilters.every(filterKey => {
        const step = steps.find((s: any) => s.step_key === filterKey);
        return step?.status === 'done';
      });
    })();
    
    return matchesSearch && matchesRegion && matchesStatus && matchesMarket && matchesOnboarding;
  }).sort((a, b) => {
    // Sort by status: active first, newjoiner second, inactive last
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    if (a.status === 'newjoiner' && b.status === 'inactive') return -1;
    if (b.status === 'newjoiner' && a.status === 'inactive') return 1;
    return 0;
  });

  // Filter submitted onboarding data
  const filteredSubmittedData = submittedOnboardingData.filter(submission => {
    const fullName = `${submission.firstName} ${submission.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase()) ||
                         submission.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRegion = regionFilter === "all" || submission.preferredRegion === regionFilter;
    const notApproved = submission.status !== 'approved';
    return matchesSearch && matchesRegion && notApproved;
  });

  // Format submitted date
  const formatSubmittedDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format boolean values for display
  const formatBooleanValue = (value: boolean | null) => {
    if (value === null) return "N/A";
    return value ? "Ja" : "Nein";
  };

  // Format working days for display
  const formatWorkingDays = (days: string[]) => {
    return days.join(", ");
  };

  // Format spontaneity for display
  const formatSpontaneity = (value: string) => {
    const spontaneityMap = {
      "sehr": "Sehr spontan (gleicher Tag)",
      "mittel": "Mittel (1-2 Tage Vorlauf)",
      "wenig": "Wenig (1 Woche Vorlauf)",
      "nie": "Nie"
    };
    return spontaneityMap[value as keyof typeof spontaneityMap] || value;
  };

  // Format last activity
  const formatLastActivity = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Heute";
    if (diffDays === 2) return "Gestern";
    return `vor ${diffDays - 1} Tagen`;
  };

  const formatIsoTimeNoTZ = (iso: string | null | undefined) => {
    if (!iso) return "--:--";
    const s = String(iso);
    return s.includes("T") ? s.substring(11, 16) : s;
  };

  const getAssignmentDateLabel = (iso: string | null | undefined) => {
    if (!iso) return "Unbekannt";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Unbekannt";

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const assignmentDay = new Date(date);
    assignmentDay.setHours(0, 0, 0, 0);

    if (assignmentDay.getTime() === today.getTime()) return "Heute";
    if (assignmentDay.getTime() === tomorrow.getTime()) return "Morgen";

    return date.toLocaleDateString("de-DE", {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  };



  // Notes functions
  const toggleNotes = (promotorId: number) => {
    setNotesOpen(notesOpen === promotorId ? null : promotorId);
  };

  // Click outside handler for notes
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notesRef.current && !notesRef.current.contains(event.target as Node)) {
        // Check if click is not on the notes button itself
        const target = event.target as HTMLElement;
        const isNotesButton = target.closest('button')?.querySelector('.h-4.w-4');
        if (!isNotesButton) {
          setNotesOpen(null);
        }
      }
    };

    if (notesOpen !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [notesOpen]);

  // Check if notes should open to the left (when card is too close to right edge)
  const shouldOpenLeft = (cardElement: HTMLElement) => {
    const rect = cardElement.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const spaceToRight = windowWidth - rect.right;
    return spaceToRight < 320; // 320px is the width of notes panel
  };

  const resetAccessImportState = () => {
    setAccessImportStage('upload');
    setAccessImportSourceFileName('');
    setAccessImportSheetRows([]);
    setAccessImportMapping({
      fullNameCol: 'A',
      huebnerEmailCol: 'B',
      huebnerPasswordCol: 'C',
      demotoolEmailCol: 'D',
      demotoolPasswordCol: 'E',
      tmaEmailCol: 'F',
      tmaPasswordCol: 'G',
      boostAppEmailCol: 'H',
      boostAppPasswordCol: 'I',
    });
    setAccessImportSkipFirstRow(true);
    setAccessImportBusy(false);
    setAccessImportRowErrors([]);
    setAccessImportUnresolvedPromotors([]);
    setAccessImportResolutionSelections({});
    setAccessImportResult(null);
  };

  const isValidColumnLetter = (value: string) => /^[A-Z]+$/.test(String(value || '').trim().toUpperCase());
  const normalizeColumnLetter = (value: string) => String(value || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  const columnIndexToLetter = (index: number): string => {
    let n = index + 1;
    let letter = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      letter = String.fromCharCode(65 + rem) + letter;
      n = Math.floor((n - 1) / 26);
    }
    return letter;
  };

  const prepareAccessImportPreview = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        alert('Keine Tabelle in der Datei gefunden.');
        return;
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const rows2d = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: '' }) as any[][];
      setAccessImportSheetRows(rows2d);
      setAccessImportSourceFileName(file.name || firstSheetName);
      setAccessImportStage('preview_mapping');
      setAccessImportRowErrors([]);
      setAccessImportUnresolvedPromotors([]);
      setAccessImportResolutionSelections({});
      setAccessImportResult(null);
    } catch (error) {
      console.error('Fehler beim Lesen der Excel-Datei:', error);
      alert('Excel-Datei konnte nicht gelesen werden.');
    }
  };

  const buildAccessImportMappingForApi = () => ({
    fullNameCol: normalizeColumnLetter(accessImportMapping.fullNameCol),
    huebnerEmailCol: normalizeColumnLetter(accessImportMapping.huebnerEmailCol),
    huebnerPasswordCol: normalizeColumnLetter(accessImportMapping.huebnerPasswordCol),
    demotoolEmailCol: normalizeColumnLetter(accessImportMapping.demotoolEmailCol),
    demotoolPasswordCol: normalizeColumnLetter(accessImportMapping.demotoolPasswordCol),
    tmaEmailCol: normalizeColumnLetter(accessImportMapping.tmaEmailCol),
    tmaPasswordCol: normalizeColumnLetter(accessImportMapping.tmaPasswordCol),
    boostAppEmailCol: normalizeColumnLetter(accessImportMapping.boostAppEmailCol),
    boostAppPasswordCol: normalizeColumnLetter(accessImportMapping.boostAppPasswordCol),
  });

  const validateAccessImportMapping = (mapping: ReturnType<typeof buildAccessImportMappingForApi>): string | null => {
    const requiredValues = Object.values(mapping);
    if (requiredValues.some((value) => !value)) return 'Bitte alle Spalten (A,B,C...) ausfüllen.';
    if (requiredValues.some((value) => !isValidColumnLetter(value))) return 'Ungültige Spaltenangabe. Nur A-Z erlaubt.';
    const unique = new Set(requiredValues);
    if (unique.size !== requiredValues.length) return 'Jede Spalte darf nur einmal verwendet werden.';
    return null;
  };

  const buildAccessResolutionOverridesPayload = () => {
    const overrides: Record<string, string> = {};
    Object.entries(accessImportResolutionSelections).forEach(([rowKey, userId]) => {
      if (!userId) return;
      overrides[rowKey] = userId;
    });
    return overrides;
  };

  const runAccessImportCommit = async (resolutionOverrides?: Record<string, string>) => {
    const mapping = buildAccessImportMappingForApi();
    const mappingErr = validateAccessImportMapping(mapping);
    if (mappingErr) {
      alert(mappingErr);
      return false;
    }

    const response = await fetch('/api/admin/team/access-credentials-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'commit',
        sheetRows: accessImportSheetRows,
        mapping,
        skipFirstRow: accessImportSkipFirstRow,
        resolutionOverrides: resolutionOverrides || {},
      }),
    });

    const data = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      throw new Error(data?.error || `HTTP ${response.status}`);
    }

    setAccessImportRowErrors(Array.isArray(data.rowErrors) ? data.rowErrors : []);
    setAccessImportUnresolvedPromotors(Array.isArray(data.unresolvedPromotors) ? data.unresolvedPromotors : []);
    const updated = Number(data.updated ?? 0);
    const updatedRows = Number(data.updatedRows ?? 0);
    const skipped = Number(data.skipped ?? 0);
    const unresolved = Number(data.unresolved ?? 0);
    setAccessImportResult({ updated, updatedRows, skipped, unresolved });
    setToastMsg(`Zugänge importiert: ${updated} aktualisiert, ${skipped} übersprungen, ${unresolved} offen`);
    setAccessImportStage('preview_mapping');
    setTimeout(() => setToastMsg(null), 3500);
    return true;
  };

  const handleAccessImportPreviewAndImport = async () => {
    if (accessImportBusy) return;
    try {
      setAccessImportBusy(true);
      setAccessImportResult(null);
      const mapping = buildAccessImportMappingForApi();
      const mappingErr = validateAccessImportMapping(mapping);
      if (mappingErr) {
        alert(mappingErr);
        return;
      }

      const response = await fetch('/api/admin/team/access-credentials-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'preview',
          sheetRows: accessImportSheetRows,
          mapping,
          skipFirstRow: accessImportSkipFirstRow,
        }),
      });
      const data = await response.json().catch(() => ({} as any));
      if (!response.ok) throw new Error(data?.error || `HTTP ${response.status}`);

      const unresolved = Array.isArray(data.unresolvedPromotors) ? data.unresolvedPromotors : [];
      const rowErrors = Array.isArray(data.rowErrors) ? data.rowErrors : [];
      setAccessImportRowErrors(rowErrors);
      setAccessImportUnresolvedPromotors(unresolved);

      if (unresolved.length > 0) {
        const defaults: Record<string, string> = {};
        unresolved.forEach((item: AccessImportUnresolvedPromotor) => {
          const candidateIds = Array.isArray(item.candidatePromotors) ? item.candidatePromotors.map((c) => c.user_id) : [];
          defaults[item.rowKey] = candidateIds.length === 1 ? candidateIds[0] : '__none__';
        });
        setAccessImportResolutionSelections(defaults);
        setAccessImportStage('resolve_promotors');
        return;
      }

      await runAccessImportCommit({});
    } catch (error: any) {
      alert(error?.message || 'Fehler beim Prüfen des Imports.');
    } finally {
      setAccessImportBusy(false);
    }
  };

  const handleFinalizeResolvedAccessImport = async () => {
    if (accessImportBusy) return;
    try {
      setAccessImportBusy(true);
      setAccessImportResult(null);
      await runAccessImportCommit(buildAccessResolutionOverridesPayload());
    } catch (error: any) {
      alert(error?.message || 'Fehler beim Finalisieren des Imports.');
    } finally {
      setAccessImportBusy(false);
    }
  };

  const updateNotes = (promotorId: string, noteText: string) => {
    setNotes(prev => ({
      ...prev,
      [promotorId]: noteText
    }));

    // Clear existing timeout for this promotor
    if (notesSaveTimeouts.current[promotorId]) {
      clearTimeout(notesSaveTimeouts.current[promotorId]);
    }

    // Set new timeout to save after 1 second of no typing
    notesSaveTimeouts.current[promotorId] = setTimeout(async () => {
      try {
        await fetch(`/api/promotors/${promotorId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note_text: noteText })
        });
      } catch (error) {
        console.error('Error saving note:', error);
      }
    }, 1000);
  };

  // Load notes from database when promotors are loaded
  useEffect(() => {
    const loadNotes = async () => {
      for (const promotor of promotors) {
        try {
          const res = await fetch(`/api/promotors/${promotor.id}/notes`);
          const data = await res.json();
          if (data.note && data.note.note_text) {
            setNotes(prev => ({
              ...prev,
              [promotor.id]: data.note.note_text
            }));
          }
        } catch (error) {
          console.error(`Error loading note for promotor ${promotor.id}:`, error);
        }
      }
    };

    if (promotors.length > 0) {
      loadNotes();
    }
  }, [promotors]);

  // Load access credentials for a promotor
  const loadAccessCredentials = async (promotorId: number) => {
    try {
      setLoadingCredentials(true);
      const response = await fetch(`/api/promotors/${promotorId}/access-credentials`);
      
      if (response.ok) {
        const data = await response.json();
        setAccessCredentials(data.credentials);
        
        // Initialize edit form with current data
        if (data.credentials) {
          setEditCredentialsForm({
            demotool: {
              email: data.credentials.demotool_email || '',
              password: data.credentials.demotool_password || ''
            },
            tma: {
              email: data.credentials.tma_email || '',
              password: data.credentials.tma_password || ''
            },
            boost_app: {
              email: data.credentials.boost_app_email || '',
              password: data.credentials.boost_app_password || ''
            }
          });
        }
      } else {
        setAccessCredentials(null);
      }
    } catch (error) {
      console.error('Error loading access credentials:', error);
      setAccessCredentials(null);
    } finally {
      setLoadingCredentials(false);
    }
  };

  // Toggle password visibility
  const togglePasswordVisibility = (service: string) => {
    setPasswordVisibility(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  // Toggle edit mode for credentials
  const toggleEditCredentials = async (service: string) => {
    const isCurrentlyEditing = editingCredentials[service];
    
    if (isCurrentlyEditing) {
      // Save changes
      try {
        const formData = editCredentialsForm[service];
        if (!formData) return;
        
        const updateData: any = {};
        updateData[`${service}_email`] = formData.email;
        updateData[`${service}_password`] = formData.password;
        
        const response = await fetch(`/api/promotors/${detailedViewOpen}/access-credentials`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
          // Reload credentials to get fresh data
          await loadAccessCredentials(detailedViewOpen!);
        } else {
          console.error('Failed to save credentials');
        }
      } catch (error) {
        console.error('Error saving credentials:', error);
      }
    }
    
    setEditingCredentials(prev => ({
      ...prev,
      [service]: !prev[service]
    }));
  };

  const handleAdminPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>, promotorUserId: string) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadingPhoto(true)
      const supabase = createSupabaseBrowserClient()

      // Delete old profile picture first
      const filePath = `${promotorUserId}/profile.jpg`
      await supabase.storage
        .from('profilbilder-promotoren')
        .remove([filePath])
      
      // Upload new profile picture
      const { error: uploadError } = await supabase.storage
        .from('profilbilder-promotoren')
        .upload(filePath, file, {
          contentType: file.type
        })

      if (uploadError) throw uploadError

      // Get public URL with cache-busting timestamp
      const { data: urlData } = supabase.storage
        .from('profilbilder-promotoren')
        .getPublicUrl(filePath)
      
      const urlWithTimestamp = `${urlData.publicUrl}?t=${Date.now()}`

      // Update promotor_profiles with new URL
      const { error: updateError } = await supabase
        .from('promotor_profiles')
        .update({ profile_picture_url: urlWithTimestamp })
        .eq('user_id', promotorUserId)

      if (updateError) throw updateError

      alert('Profilfoto erfolgreich hochgeladen!')
      await loadPromotors() // Reload to show new picture
    } catch (error: any) {
      console.error('Photo upload error:', error)
      alert(error.message || 'Fehler beim Hochladen des Fotos')
    } finally {
      setUploadingPhoto(false)
      setShowPhotoMenu(false)
    }
  }

  // Detailed view functions
  const toggleDetailedView = (promotorId: number) => {
    setDetailedViewOpen(detailedViewOpen === promotorId ? null : promotorId);
  };

  // Copy function
  const copyToClipboard = async (text: string, type: 'email' | 'phone', promotorId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      const key = `${promotorId}-${type}`;
      setCopiedItems(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Document action functions
  const handleDocumentApprove = (documentName: string) => {
    setDocumentStatuses(prev => ({ ...prev, [documentName]: "approved" }));
  };

  const handleDocumentDecline = (documentName: string) => {
    setDocumentStatuses(prev => ({ ...prev, [documentName]: "pending" }));
  };

  const handleViewDocument = async (documentName: string) => {
    try {
      const type = documentName === 'Pass' ? 'passport' : documentName === 'Führerschein' ? 'fuehrerschein' : documentName === 'Staatsbürgerschaftsnachweis' ? 'citizenship' : documentName === 'Arbeitserlaubnis' ? 'arbeitserlaubnis' : documentName === 'Strafregister' ? 'strafregister' : 'additional'
      const uid = String(promotors.find(p=>p.id===detailedViewOpen)?.id || detailedViewOpen || '')
      if (!uid) return
      const r = await fetch(`/api/promotors/${uid}/documents/signed-url?doc_type=${encodeURIComponent(type)}`)
      const j = await r.json()
      if (j?.url) window.open(j.url, '_blank')
    } catch {}
  };

  // Dienstvertrag handler functions
  const handleDienstvertragSelect = async (contractId?: string) => {
    const targetContract = contractId
      ? (promotorContracts || []).find((c) => c.id === contractId)
      : (promotorContracts || []).find((c) => c.is_active) || (promotorContracts || [])[0];
    if (!targetContract || !selectedPromotorForContract) return;

    setSelectedContractPreviewId(targetContract.id);
    setContractPreviewError(false);
    setShowDienstvertragPopup(false);
    setLoadingContractPreview(true);
    setShowDienstvertragContent(true);

    try {
      const res = await fetch(
        `/api/admin/promotors/${selectedPromotorForContract}/contracts/signed-url?contract_id=${targetContract.id}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!data?.url) {
        throw new Error(data?.error || 'Keine Vorschau verfügbar');
      }

      const extFromPath = String(targetContract.file_path || targetContract.file_name || '').split('.').pop()?.toLowerCase();
      const ext = String(targetContract.file_ext || extFromPath || '').toLowerCase();
      setContractPreviewExt(ext === 'pdf' || ext === 'doc' || ext === 'docx' ? ext : 'unknown');
      const cacheBustedUrl = `${data.url}${String(data.url).includes('?') ? '&' : '?'}cb=${Date.now()}`;
      setContractPreviewUrl(cacheBustedUrl);
      setContractPreviewError(false);
    } catch (error) {
      console.error('Error loading contract preview:', error);
      setToastMsg('Vorschau konnte nicht geladen werden');
      setContractPreviewUrl('');
      setContractPreviewError(true);
    } finally {
      setLoadingContractPreview(false);
    }
  };

  const refreshContractPreview = async () => {
    if (!selectedPromotorForContract || !selectedContractPreviewId) return;
    const targetContract = (promotorContracts || []).find((c) => c.id === selectedContractPreviewId);
    if (!targetContract) return;

    setLoadingContractPreview(true);
    try {
      const res = await fetch(
        `/api/admin/promotors/${selectedPromotorForContract}/contracts/signed-url?contract_id=${selectedContractPreviewId}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (!data?.url) throw new Error(data?.error || 'Keine Vorschau verfügbar');

      const extFromPath = String(targetContract.file_path || targetContract.file_name || '').split('.').pop()?.toLowerCase();
      const ext = String(targetContract.file_ext || extFromPath || '').toLowerCase();
      setContractPreviewExt(ext === 'pdf' || ext === 'doc' || ext === 'docx' ? ext : 'unknown');
      const cacheBustedUrl = `${data.url}${String(data.url).includes('?') ? '&' : '?'}cb=${Date.now()}`;
      setContractPreviewUrl(cacheBustedUrl);
      setContractPreviewError(false);
    } catch (error) {
      console.error('Error refreshing contract preview:', error);
      setContractPreviewError(true);
      setToastMsg('Vorschau konnte nicht neu geladen werden');
    } finally {
      setLoadingContractPreview(false);
    }
  };

  const handleAdminContractImport = async (file: File) => {
    const uid = selectedPromotorForContract;
    if (!uid) return;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      setToastMsg('Nur PDF, DOC und DOCX sind erlaubt');
      return;
    }

    try {
      setUploadingContractFile(true);
      const supabase = createSupabaseBrowserClient();

      const upRes = await fetch('/api/admin/contracts/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: uid,
          file_ext: ext,
        }),
      });
      const up = await upRes.json();
      if (!upRes.ok || !up?.path || !up?.token) {
        throw new Error(up?.error || 'Upload-URL konnte nicht erstellt werden');
      }

      const { error: uploadErr } = await supabase.storage
        .from('dienstvertraege')
        .uploadToSignedUrl(up.path, up.token, file);
      if (uploadErr) {
        throw new Error(uploadErr.message || 'Datei-Upload fehlgeschlagen');
      }

      const saveRes = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: uid,
          path: up.path,
          file_name: file.name,
          mime_type: file.type || (ext === 'pdf' ? 'application/pdf' : ext === 'doc' ? 'application/msword' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          file_ext: ext,
          is_active: true,
        }),
      });
      const saved = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        throw new Error(saved?.error || 'Dienstvertrag konnte nicht gespeichert werden');
      }

      await refreshPromotorContracts(uid);
      setToastMsg('Dienstvertrag erfolgreich eingespielt');
    } catch (e: any) {
      console.error(e);
      setToastMsg(e?.message || 'Fehler beim Einspielen des Dienstvertrags');
    } finally {
      setUploadingContractFile(false);
    }
  };

  // Handle Strafregister special logic
  const handleStrafregisterAction = (action: 'approve' | 'decline') => {
    if (action === 'approve') {
      // When check is pressed, promotor must submit (simulate file submission)
      setDocumentStatuses(prev => ({ ...prev, "Strafregister": "pending" }));
      setDocumentsWithFiles(prev => ({ ...prev, "Strafregister": true })); // File submitted
      setStrafregisterDeactivated(false);
    } else {
      // When X is pressed, deactivate
      setStrafregisterDeactivated(true);
    }
  };

  // IBAN masking and click functionality
  const maskIban = (iban: string) => {
    if (iban.length <= 5) return iban;
    return "x".repeat(iban.length - 5) + iban.slice(-5);
  };

  const handleIbanClick = async (promotorId: number) => {
    const promotor = promotors.find(p => p.id === promotorId);
    if (!promotor) return;

    if (ibanVisible[promotorId]) {
      // IBAN is already visible, copy it
      try {
        await navigator.clipboard.writeText(promotor.bankDetails.iban);
        
        // Show copied state
        setIbanCopied(prev => ({ ...prev, [promotorId]: true }));
        
        // Hide copied state after 2 seconds
        setTimeout(() => {
          setIbanCopied(prev => ({ ...prev, [promotorId]: false }));
        }, 2000);
      } catch (error) {
        console.error('Failed to copy IBAN:', error);
      }
    } else {
      // Show full IBAN
      setIbanVisible(prev => ({ ...prev, [promotorId]: true }));
      
      // Clear any existing timeout for this promotor
      if (ibanTimeouts[promotorId]) {
        clearTimeout(ibanTimeouts[promotorId]);
      }
      
      // Set timeout to hide IBAN after 3 seconds
      const timeout = setTimeout(() => {
        setIbanVisible(prev => ({ ...prev, [promotorId]: false }));
        setIbanTimeouts(prev => {
          const newTimeouts = { ...prev };
          delete newTimeouts[promotorId];
          return newTimeouts;
        });
      }, 3000);
      
      setIbanTimeouts(prev => ({ ...prev, [promotorId]: timeout }));
    }
  };

  const handleAccountHolderClick = async (promotorId: number) => {
    const promotor = promotors.find(p => p.id === promotorId);
    if (!promotor) return;

    try {
      await navigator.clipboard.writeText(promotor.bankDetails.accountHolder);
      
      // Show copied state
      setAccountHolderCopied(prev => ({ ...prev, [promotorId]: true }));
      
      // Hide copied state after 2 seconds
      setTimeout(() => {
        setAccountHolderCopied(prev => ({ ...prev, [promotorId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy account holder:', error);
    }
  };

  const handleBicClick = async (promotorId: number) => {
    const promotor = promotors.find(p => p.id === promotorId);
    if (!promotor) return;

    try {
      await navigator.clipboard.writeText(promotor.bankDetails.bic);
      
      // Show copied state
      setBicCopied(prev => ({ ...prev, [promotorId]: true }));
      
      // Hide copied state after 2 seconds
      setTimeout(() => {
        setBicCopied(prev => ({ ...prev, [promotorId]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy BIC:', error);
    }
  };

  // Handle status change
  const handleStatusClick = (promotorId: number) => {
    const promotor = promotors.find(p => p.id === promotorId);
    if (promotor && promotor.status === 'active') {
      setStatusChangePromotorId(promotorId);
      setShowStatusConfirmation(true);
    }
  };

  const handleStatusChange = () => {
    if (statusChangePromotorId) {
      // In a real app, this would update the database
      setPromotors(prev => prev.map(promotor => 
        promotor.id === statusChangePromotorId 
          ? { ...promotor, status: 'inactive' }
          : promotor
      ));
      setShowStatusConfirmation(false);
      setStatusChangePromotorId(null);
    }
  };

  // Handle outside click for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(event.target as Node)) {
        setRegionDropdownOpen(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
      if (marketDropdownRef.current && !marketDropdownRef.current.contains(event.target as Node)) {
        setMarketDropdownOpen(false);
      }
      
      // Close magic touch dropdown
      if (!event.target || !(event.target as HTMLElement).closest('.magic-touch-dropdown')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup IBAN timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(ibanTimeouts).forEach(timeout => clearTimeout(timeout));
    };
  }, [ibanTimeouts]);

  return (
    <>
      {/* Vercel-style skeleton animation styles */}
      <style dangerouslySetInnerHTML={{ __html: skeletonStyles }} />
      
      <div className="min-h-screen bg-gray-50/30">
      {/* Approval Dialog (mounted once at root) */}
      <Dialog open={approveOpen} onOpenChange={(open) => { 
        setApproveOpen(open); 
        if (!open) { 
          setShowEmailTemplate(false); 
          setCopiedEmail(false); 
          setApproveError(null); 
          setApproveResultPw(null); 
        } 
      }}>
        <DialogContent>
          {!showEmailTemplate ? (
            <>
              <DialogHeader>
                <DialogTitle>Promotor anlegen</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-sm text-gray-600">Name</label>
                  <Input value={approveForm.display_name} onChange={(e) => setApproveForm(f => ({...f, display_name: e.target.value}))} className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">E-Mail</label>
                  <Input value={approveForm.email} onChange={(e) => setApproveForm(f => ({...f, email: e.target.value}))} className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Passwort</label>
                  <Input value={approveForm.password} onChange={(e) => setApproveForm(f => ({...f, password: e.target.value}))} className="bg-white focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
                  <div className="mt-1 text-xs text-gray-500">Dieses Passwort wird für den neuen Account verwendet.</div>
                </div>
                {approveError && <p className="text-sm text-red-600">{approveError}</p>}
                {approveResultPw && <p className="text-sm text-green-600">Erstellt. Initiales Passwort: <strong>{approveResultPw}</strong></p>}
              </div>
              <DialogFooter>
                <Button variant="outline" className="focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" onClick={() => setApproveOpen(false)}>Schließen</Button>
                <Button className="text-white focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0" style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)'}} onClick={() => approveSubmission({ id: approveForm.applicationId })} disabled={submitting}>
                  {submitting ? 'Erstelle...' : 'Erstellen'}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="relative min-h-[400px] bg-white rounded-lg cursor-pointer" onClick={copyEmailToClipboard}>
              <div className="p-8 text-center">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">E-Mail Template</h2>
                <div className="bg-gray-50 p-6 rounded-lg text-left space-y-4 text-sm text-gray-700 leading-relaxed">
                  <p>Hallo {approveForm.display_name},</p>
                  <p>Willkommen in der Zukunft der Nespresso Promotions!</p>
                  <div className="bg-white p-4 rounded border">
                    <p className="font-medium">Deine Login-Daten sind:</p>
                    <p>E-Mail: <span className="font-mono text-blue-600">{approveForm.email}</span></p>
                    <p>Passwort: <span className="font-mono text-blue-600">{approveResultPw}</span></p>
                  </div>
                  <p>Wir freuen uns, dich im Team zu haben!</p>
                  <p>Beste Grüße,<br />Dein Nespresso Team</p>
                </div>
                <p className="mt-4 text-xs text-gray-500">Klicken um E-Mail-Text zu kopieren</p>
              </div>
              
              {/* Copy confirmation icon */}
              {copiedEmail && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-green-600">Kopiert!</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Admin Navigation */}
      <AdminNavigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-14'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-6">
          <div className="flex items-center justify-between">
              <div>
              <h1 className="text-2xl font-semibold text-gray-900">{showStammdatenblatt ? 'Stammdatenblatt' : 'Promotoren'}</h1>
              <p className="text-gray-500 text-sm">{showStammdatenblatt ? 'Stammdaten-Verwaltung' : 'Team Management'}</p>
            </div>
            <div className="flex items-center space-x-3">
              {!showStammdatenblatt && (
                <button
                  onClick={() => {
                    resetAccessImportState();
                    setShowAccessImportModal(true);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-all duration-200 bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Import Zugänge</span>
                </button>
              )}
              <button
                onClick={() => setShowStammdatenblatt(false)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                  !showStammdatenblatt 
                    ? 'bg-gray-100 text-gray-900 border-gray-300 scale-[1.02] shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>Promotoren</span>
              </button>
              <button 
                onClick={() => setShowStammdatenblatt(true)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                  showStammdatenblatt 
                    ? 'bg-gray-100 text-gray-900 border-gray-300 scale-[1.02] shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span>Bewerber</span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-8">
          {showStammdatenblatt ? (
            /* Stammdatenblatt View */
            <>
              {/* Search and Filters */}
              <div className="mb-6 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Stammdaten suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-gray-200 focus:border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
                
                <div className="flex gap-3">
                  {/* Region Filter Dropdown */}
                  <div className="relative" ref={regionDropdownRef}>
                    <button
                      onClick={() => setRegionDropdownOpen(!regionDropdownOpen)}
                      className="flex items-center justify-between min-w-[140px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-gray-300 transition-all duration-200"
                    >
                      <span>{regionFilter === "all" ? "Alle Regionen" : regionNames[regionFilter as keyof typeof regionNames]}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${regionDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {regionDropdownOpen && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              setRegionFilter("all");
                              setRegionDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              regionFilter === "all" 
                                ? "bg-gray-50 text-gray-900" 
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            Alle Regionen
                          </button>
                          {Object.entries(regionNames).map(([key, name]) => (
                            <button
                              key={key}
                              onClick={() => {
                                setRegionFilter(key);
                                setRegionDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                regionFilter === key 
                                  ? "bg-gray-50 text-gray-900" 
                                  : `text-gray-600 ${getRegionHoverClass(key)}`
                              }`}
                            >
                              {name}
                            </button>
                          ))}
                        </div>
              </div>
            )}
          </div>

                  {/* Status Filter Dropdown */}
                  <div className="relative" ref={statusDropdownRef}>
              <button
                      onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                      className="flex items-center justify-between min-w-[120px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-gray-300 transition-all duration-200"
                    >
                      <span>{statusFilter === "all" ? "Alle Status" : statusFilter === "active" ? "Aktiv" : statusFilter === "newjoiner" ? "New Joiner" : "Inaktiv"}</span>
                      <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {statusDropdownOpen && (
                      <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                        <div className="py-1">
                          <button
                onClick={() => {
                              setStatusFilter("all");
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              statusFilter === "all" 
                                ? "bg-gray-50 text-gray-900" 
                                : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            Alle Status
              </button>
                          <button
                            onClick={() => {
                              setStatusFilter("active");
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              statusFilter === "active" 
                                ? "bg-gray-50 text-gray-900" 
                                : "text-gray-600 hover:bg-green-100/50"
                            }`}
                          >
                            Aktiv
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter("newjoiner");
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              statusFilter === "newjoiner" 
                                ? "bg-gray-50 text-gray-900" 
                                : "text-gray-600 hover:bg-blue-100/50"
                            }`}
                          >
                            New Joiner
                          </button>
                          <button
                            onClick={() => {
                              setStatusFilter("inactive");
                              setStatusDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              statusFilter === "inactive" 
                                ? "bg-gray-50 text-gray-900" 
                                : "text-gray-600 hover:bg-red-100/50"
                            }`}
                          >
                            Inaktiv
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stammdatenblatt Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubmittedData.map((submission) => (
                  <Card 
                    key={submission.id} 
                    className="group hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm relative overflow-hidden"
                  >
                    {/* Subtle gradient border effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-200/20 via-transparent to-gray-200/20 rounded-lg"></div>
                    <div className="absolute inset-[1px] bg-white rounded-lg"></div>
                    
                    <CardContent className="relative p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base text-gray-900 truncate">
                            {submission.firstName} {submission.lastName}
                            {submission.title && ` (${submission.title})`}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatSubmittedDate(submission.submittedAt)}
                          </p>
                        </div>
                        <Badge className={`${getRegionPillColors(submission.preferredRegion)} border text-xs px-2.5 py-1 pointer-events-none`}>
                          {regionNames[submission.preferredRegion as keyof typeof regionNames]}
                        </Badge>
                      </div>

                      {/* Contact Information with Icons */}
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => copyToClipboard(submission.phone, 'phone', submission.id)}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            copiedItems[`${submission.id}-phone`] ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {copiedItems[`${submission.id}-phone`] ? (
                              <Check className="h-2.5 w-2.5 text-green-600" />
                            ) : (
                              <Phone className="h-2.5 w-2.5 text-gray-500" />
                            )}
                          </div>
                          <span className="text-xs text-gray-600 truncate group-hover:text-gray-800 transition-colors">{submission.phone}</span>
                        </div>
                        <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => copyToClipboard(submission.email, 'email', submission.id)}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                            copiedItems[`${submission.id}-email`] ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            {copiedItems[`${submission.id}-email`] ? (
                              <Check className="h-2.5 w-2.5 text-green-600" />
                            ) : (
                              <Mail className="h-2.5 w-2.5 text-gray-500" />
                            )}
                          </div>
                          <span className="text-xs text-gray-600 truncate group-hover:text-gray-800 transition-colors">{submission.email}</span>
                        </div>
                        <div className="flex items-center space-x-2 cursor-pointer group" onClick={() => window.open(`https://maps.google.com?q=${encodeURIComponent(`${submission.address}, ${submission.postalCode} ${submission.city}`)}`,'_blank')}>
                          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-2.5 w-2.5 text-gray-500" />
                          </div>
                          <span className="text-xs text-gray-600 truncate group-hover:text-gray-600 transition-colors">{submission.address}, {submission.postalCode} {submission.city}</span>
                        </div>
                      </div>

                      {/* Personal Info Grid */}
                      <div className="bg-slate-50/30 border border-slate-200/40 rounded-lg p-3 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg"></div>
                        <div className="relative grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-gray-500">Geschlecht</span>
                            <p className="font-medium capitalize text-gray-900">{submission.gender}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Geboren</span>
                            <p className="font-medium text-gray-900">{submission.birthDate}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Körpergröße</span>
                            <p className="font-medium text-gray-900">{submission.height} cm</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Kleidergröße</span>
                            <p className="font-medium text-gray-900">{submission.clothingSize}</p>
                          </div>
                        </div>
                      </div>

                      {/* Working Days - Reusing Promotor Style */}
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">Arbeitstage</p>
                        <div className="flex space-x-1.5">
                          {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                            <div
                              key={day}
                              className={`relative w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center transition-all duration-200 ${
                                submission.workingDays.includes(day)
                                  ? 'bg-slate-100 text-slate-700 shadow-sm border border-slate-200/60'
                                  : 'bg-gray-50/50 text-gray-400 border border-transparent'
                              }`}
                            >
                              {submission.workingDays.includes(day) && (
                                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent"></div>
                              )}
                              <span className="relative z-10">{day[0]}</span>
                            </div>
                          ))}
        </div>
      </div>

                      {/* Mobility Status */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <span className="text-xs text-gray-500 block mb-1">Führerschein</span>
                          <div 
                            className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs font-bold text-white ${!submission.drivingLicense ? 'bg-gray-400' : ''}`}
                            style={submission.drivingLicense ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}}
                          >
                            {submission.drivingLicense ? '✓' : '✗'}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-gray-500 block mb-1">Auto</span>
                          <div 
                            className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs font-bold text-white ${!submission.carAvailable ? 'bg-gray-400' : ''}`}
                            style={submission.carAvailable ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}}
                          >
                            {submission.carAvailable ? '✓' : '✗'}
                          </div>
                        </div>
                        <div className="text-center">
                          <span className="text-xs text-gray-500 block mb-1">Fahrbereit</span>
                          <div 
                            className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs font-bold text-white ${!submission.willingToDrive ? 'bg-gray-400' : ''}`}
                            style={submission.willingToDrive ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}}
                          >
                            {submission.willingToDrive ? '✓' : '✗'}
                          </div>
                        </div>
                      </div>

                      {/* Education & Experience */}
                      <div className="space-y-2 text-xs">
            <div>
                          <span className="text-gray-500">Ausbildung:</span>
                          <p className="font-medium text-gray-900">{submission.education}</p>
            </div>
                        {submission.qualifications && (
                          <div>
                            <span className="text-gray-500">Qualifikationen:</span>
                            <p className="font-medium text-gray-900">{submission.qualifications}</p>
          </div>
                        )}
                        {submission.currentJob && (
                          <div>
                            <span className="text-gray-500">Aktueller Job:</span>
                            <p className="font-medium text-gray-900">{submission.currentJob}</p>
                          </div>
                        )}
                      </div>

                      {/* Work Preferences - Pill Style */}
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                          {submission.hoursPerWeek}h/Woche
                        </span>
                        <span className={`px-2.5 py-1 rounded-full font-medium ${
                          submission.spontaneity === "oft" ? "text-green-700 bg-green-50" :
                          submission.spontaneity === "selten" ? "text-orange-700 bg-orange-50" :
                          submission.spontaneity === "nie" ? "text-red-700 bg-red-50" :
                          "text-gray-600 bg-gray-50"
                        }`}>
                          {submission.spontaneity === "oft" ? "Oft spontan" : 
                           submission.spontaneity === "selten" ? "Selten spontan" :
                           submission.spontaneity === "nie" ? "Nie spontan" : "Unbekannt"}
                        </span>
                      </div>

                      {/* Citizenship & Work Permit */}
              {/* Approval dialog is mounted at root to preserve input focus state */}
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-500">Staatsbürgerschaft:</span>
                          <p className="font-medium text-gray-900">{submission.citizenship}</p>
                        </div>
                        {submission.workPermit !== null && (
                          <div>
                            <span className="text-gray-500">Arbeitserlaubnis:</span>
                            <p className={`font-medium ${submission.workPermit ? 'text-green-600' : 'text-red-600'}`}>
                              {formatBooleanValue(submission.workPermit)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-3 border-t border-gray-100">
                        <Button
                          size="sm"
                          className="flex-1 text-white text-xs"
                          style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)', opacity: 0.85}}
                          onClick={() => { setApproveOpen(true); setApproveForm({ email: submission.email || '', display_name: `${submission.firstName} ${submission.lastName}`.trim(), password: generateRandomPassword(12), applicationId: String(submission.id ?? '') }); setApproveResultPw(null); setApproveError(null); }}
                        >
                          Annehmen
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 text-red-600 hover:text-red-700 text-xs">
                          Ablehnen
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State for Stammdatenblatt */}
              {filteredSubmittedData.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Keine Stammdaten gefunden
                  </h3>
                  <p className="text-gray-500">
                    Es wurden noch keine Bewerbungen eingereicht oder sie entsprechen nicht den Filterkriterien.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Promotoren View */
            <>
          {/* Search and Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Promotor suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white border-gray-200 focus:border-gray-200 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
            
            <div className="flex gap-3 ml-auto">
              {/* Onboarding Filter Button */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg">
                {[
                  { key: 'profile_basics', icon: User, tooltip: 'Profildaten' },
                  { key: 'documents', icon: FileText, tooltip: 'Dokumente' },
                  { key: 'dienstvertrag', icon: FileSignature, tooltip: 'Dienstvertrag' },
                  { key: 'bank_details', icon: CreditCard, tooltip: 'Bankdaten' },
                ].map((config) => {
                  const IconComponent = config.icon;
                  const isActive = onboardingFilters.includes(config.key);
                  return (
                    <TooltipButton
                      key={config.key}
                      tooltip={config.tooltip}
                      isActive={isActive}
                      onClick={() => {
                        setOnboardingFilters(prev => 
                          prev.includes(config.key)
                            ? prev.filter(k => k !== config.key)
                            : [...prev, config.key]
                        );
                      }}
                    >
                      <IconComponent 
                        className={`h-3.5 w-3.5 pointer-events-none ${
                          isActive ? 'text-white' : 'text-gray-400'
                        }`}
                      />
                    </TooltipButton>
                  );
                })}
              </div>
              
              {/* Region Filter Dropdown */}
              <div className="relative" ref={regionDropdownRef}>
                <button
                  onClick={() => setRegionDropdownOpen(!regionDropdownOpen)}
                  className="flex items-center justify-between min-w-[140px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-gray-300 transition-all duration-200"
                >
                  <span>{regionFilter === "all" ? "Alle Regionen" : regionNames[regionFilter as keyof typeof regionNames]}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${regionDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {regionDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setRegionFilter("all");
                          setRegionDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          regionFilter === "all" 
                            ? "bg-gray-50 text-gray-900" 
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Alle Regionen
                      </button>
                      {Object.entries(regionNames).map(([key, name]) => (
                        <button
                          key={key}
                          onClick={() => {
                            setRegionFilter(key);
                            setRegionDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                            regionFilter === key 
                              ? "bg-gray-50 text-gray-900" 
                              : `text-gray-600 ${getRegionHoverClass(key)}`
                          }`}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Filter Dropdown */}
              <div className="relative" ref={statusDropdownRef}>
                <button
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="flex items-center justify-between min-w-[120px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-400 hover:border-gray-300 transition-all duration-200"
                >
                  <span>{statusFilter === "all" ? "Alle Status" : statusFilter === "active" ? "Aktiv" : statusFilter === "newjoiner" ? "New Joiner" : "Inaktiv"}</span>
                  <ChevronDown className={`h-4 w-4 text-gray-300 transition-transform duration-200 ${statusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {statusDropdownOpen && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setStatusFilter("all");
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          statusFilter === "all" 
                            ? "bg-gray-50 text-gray-900" 
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Alle Status
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("active");
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          statusFilter === "active" 
                            ? "bg-gray-50 text-gray-900" 
                            : "text-gray-600 hover:bg-green-100/50"
                        }`}
                      >
                        Aktiv
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("newjoiner");
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          statusFilter === "newjoiner" 
                            ? "bg-gray-50 text-gray-900" 
                            : "text-gray-600 hover:bg-blue-100/50"
                        }`}
                      >
                        New Joiner
                      </button>
                      <button
                        onClick={() => {
                          setStatusFilter("inactive");
                          setStatusDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                          statusFilter === "inactive" 
                            ? "bg-gray-50 text-gray-900" 
                            : "text-gray-600 hover:bg-red-100/50"
                        }`}
                      >
                        Inaktiv
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Removed Market Filter Dropdown per request */}
            </div>
          </div>

          {/* Promotor Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {promotorsLoading ? (
              // Simple Loading Skeletons - plain grey cards matching real card dimensions
              [...Array(6)].map((_, index) => (
                <div key={`skeleton-${index}`} className="relative">
                  <Card className="h-[33.14rem] border-0 bg-white/80 backdrop-blur-sm relative overflow-hidden animate-skeleton-fade">
                  </Card>
                </div>
              ))
            ) : !promotorsLoading && filteredPromotors.length === 0 ? (
              // Empty/Error State - only show after loading is complete
              <div className="col-span-full text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {promotorsError ? 'Fehler beim Laden der Promotoren' : 'Keine Promotoren gefunden'}
                </h3>
                <p className="text-gray-500">
                  {promotorsError ? 'Versuchen Sie es später erneut.' : 'Versuchen Sie andere Suchkriterien oder Filter.'}
                </p>
              </div>
            ) : (
              // Real Promotor Cards
              filteredPromotors.map((promotor) => (
              <div key={promotor.id} className="relative">
                <Card 
                  className="group shadow-md hover:shadow-lg transition-all duration-300 border-0 bg-white/80 backdrop-blur-sm relative overflow-hidden cursor-pointer"
                  style={getMagicTouchStyle(promotor.id)}
                  onClick={() => toggleDetailedView(promotor.id)}
                >
                  {/* Subtle gradient border effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200/20 via-transparent to-gray-200/20 rounded-lg"></div>
                  <div className="absolute inset-[1px] bg-white rounded-lg"></div>
                
                <CardContent className="relative p-6 space-y-5">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-11 w-11 ring-2 ring-gray-100 ring-offset-2">
                          <AvatarImage src={promotor.avatar} alt={promotor.name} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-700 font-medium text-sm">
                            {promotor.name.split(' ').map((n: string) => (n && typeof n === 'string' ? n[0] : '')).join('')}
                          </AvatarFallback>
                        </Avatar>
                        {/* Status indicator dot */}
                        <div className="absolute -bottom-0.5 -right-0.5">
                          {promotor.status === 'active' ? (
                            <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                          ) : promotor.status === 'newjoiner' ? (
                            <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                          ) : (
                            <div className="w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"></div>
                          )}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 text-base truncate">{promotor.name}</h3>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">{promotor.status}</p>
                      </div>
                    </div>

                  </div>

                  {/* Region Badge */}
                  <div>
                    <Badge className={`${getRegionPillColors(promotor.region)} border text-xs px-2.5 py-1 pointer-events-none`}>
                      {regionNames[promotor.region as keyof typeof regionNames]}
                    </Badge>
                  </div>

                  {/* Working Days */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-3">Arbeitstage</p>
                    <div className="flex space-x-1.5">
                      {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                        <div
                          key={day}
                          className={`relative w-7 h-7 rounded-full text-xs font-medium flex items-center justify-center transition-all duration-200 ${
                            promotor.workingDays.includes(day)
                              ? 'bg-slate-100 text-slate-700 shadow-sm border border-slate-200/60'
                              : 'bg-gray-50/50 text-gray-400 border border-transparent'
                          }`}
                        >
                          {promotor.workingDays.includes(day) && (
                            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/20 to-transparent"></div>
                          )}
                          <span className="relative z-10">{day[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 mb-2">Performance</p>
                    <div className="bg-slate-50/30 border border-slate-200/40 rounded-lg p-2.5 backdrop-blur-sm relative overflow-hidden">
                      {/* Subtle gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-lg"></div>
                      
                      <div className="relative grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p 
                            className={`text-sm font-semibold transition-colors ${getKpiColor("mcet", kpiByPromotor[promotor.id]?.mcet ?? 0)}`}
                            style={getKpiStyle(getKpiColor("mcet", kpiByPromotor[promotor.id]?.mcet ?? 0))}
                          >
                            {(kpiByPromotor[promotor.id]?.mcet ?? 0).toFixed(1)}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">MC/ET</p>
                        </div>
                        <div className="text-center border-l border-r border-slate-200/40">
                          <p 
                            className={`text-sm font-semibold transition-colors ${getKpiColor("tma", kpiByPromotor[promotor.id]?.tma ?? 0)}`}
                            style={getKpiStyle(getKpiColor("tma", kpiByPromotor[promotor.id]?.tma ?? 0))}
                          >
                            {(kpiByPromotor[promotor.id]?.tma ?? 0)}%
                          </p>
                          <p className="text-xs text-gray-500 font-medium">TMA</p>
                        </div>
                        <div className="text-center">
                          <p 
                            className={`text-sm font-semibold transition-colors ${getKpiColor("vlshare", kpiByPromotor[promotor.id]?.vlshare ?? 0)}`}
                            style={getKpiStyle(getKpiColor("vlshare", kpiByPromotor[promotor.id]?.vlshare ?? 0))}
                          >
                            {(kpiByPromotor[promotor.id]?.vlshare ?? 0)}%
                          </p>
                          <p className="text-xs text-gray-500 font-medium">VL Share</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full text-xs font-medium">
                      {promotor.assignments} Einsätze
                    </span>
                    <span className="text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full text-xs font-medium">
                      {promotor.completedTrainings} Schulungen
                    </span>
                  </div>

                  {/* Onboarding Progress as Icons */}
                  <div className="pt-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-600">Onboarding status:</p>
                      <span className="text-xs text-gray-500 font-medium">{promotor.onboardingProgress}%</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      {(() => {
                        const steps = onboardingSteps[promotor.id] || [];
                        const stepConfig = [
                          { key: 'profile_basics', icon: User, label: 'Profil' },
                          { key: 'documents', icon: FileText, label: 'Dokumente' },
                          { key: 'dienstvertrag', icon: FileSignature, label: 'Vertrag' },
                          { key: 'bank_details', icon: CreditCard, label: 'Bank' },
                        ];
                        
                        return stepConfig.map((config) => {
                          const step = steps.find((s: any) => s.step_key === config.key);
                          const isDone = step?.status === 'done';
                          const IconComponent = config.icon;
                          
                          return (
                            <div
                              key={config.key}
                              className={`flex-1 flex items-center justify-center rounded-lg py-2 transition-all duration-300 ${
                                isDone
                            ? 'bg-gradient-to-r from-green-500/60 to-green-800/60' 
                                  : 'bg-gray-200'
                              }`}
                            >
                              <IconComponent 
                                className={`h-4 w-4 ${
                                  isDone ? 'text-white' : 'text-gray-400'
                                }`}
                              />
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Contact & Last Activity */}
                  <div className="space-y-3 pt-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Mail className="h-3 w-3 text-gray-500" />
                      </div>
                      <span className="text-xs text-gray-600 truncate">{promotor.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="h-3 w-3 text-gray-500" />
                      </div>
                      <span className="text-xs text-gray-600">
                        Letzte Aktivität: {formatLastActivity(promotor.lastActivity)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Notes Icon */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening detailed view
                      const cardElement = e.currentTarget.closest('.relative') as HTMLElement;
                      const openLeft = shouldOpenLeft(cardElement);
                      setNotesPosition(prev => ({ ...prev, [promotor.id]: openLeft ? 'left' : 'right' }));
                      toggleNotes(promotor.id);
                    }}
                    className="absolute bottom-4 right-4 p-2 text-gray-400/30 hover:text-gray-600 hover:bg-gray-100/60 rounded-lg transition-all duration-200"
                  >
                    <FileText className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>

              {/* Notes Panel */}
              {notesOpen === promotor.id && (
                <div 
                  ref={notesRef}
                  className={`absolute top-1/2 -translate-y-1/2 w-80 h-80 bg-transparent z-20 ${
                  notesPosition[promotor.id] === 'left' 
                    ? 'right-full' 
                    : 'left-full'
                  }`}
                >
                  <textarea
                    value={notes[promotor.id] || ''}
                    onChange={(e) => updateNotes(promotor.id, e.target.value)}
                    placeholder="Notizen zu diesem Promotor hinzufügen..."
                    className="w-full h-full p-3 border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-gray-200 text-sm bg-white shadow-xl [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  />
                </div>
              )}
            </div>
              ))
            )}
          </div>
            </>
          )}
        </main>
      </div>

      {/* Detailed Promotor View Modal */}
      {detailedViewOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 transition-opacity duration-300 z-[60]"
            onClick={() => {
              if (!showDienstvertragPopup && !showDienstvertragContent) {
                setDetailedViewOpen(null);
              }
            }}
          ></div>

          {/* Modal Content */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden relative">
              {/* Dark overlay when Dienstvertrag is open */}
              {(showDienstvertragPopup || showDienstvertragContent) && (
                <div className="absolute inset-0 bg-black/40 z-[5] rounded-2xl"></div>
              )}
              {(() => {
                const promotor = promotors.find(p => p.id === detailedViewOpen);
                if (!promotor) return null;

                return (
                  <>
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 relative">
                      <div className="absolute top-4 right-4 flex items-center gap-2">
                        {/* Stammdaten Preview Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenKrankenstandFor(promotor.id);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Freigegebene Einsätze (Krankenstand)"
                        >
                          <Thermometer className="h-5 w-5 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenStammdatenPreviewFor(prev => prev === promotor.id ? null : promotor.id);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Stammdatenblatt anzeigen"
                        >
                          <FileText className="h-5 w-5" />
                        </button>
                        
                        {/* Access Credentials Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAccessCredentials(true);
                            loadAccessCredentials(promotor.id);
                          }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          title="Zugänge anzeigen"
                        >
                          <Key className="h-5 w-5" />
                        </button>
                        
                      <button
                        onClick={() => {
                          if (!showDienstvertragPopup && !showDienstvertragContent) {
                            setDetailedViewOpen(null);
                          }
                        }}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                      </div>
                      {/* Krankenstand History Popover */}
                      {openKrankenstandFor === promotor.id && (
                        <div className="absolute top-14 right-6 z-[80] w-[420px] max-w-[90vw]">
                          <KrankenstandHistoryPopover
                            userId={String(promotor.id)}
                            displayName={promotor.name}
                            onClose={() => setOpenKrankenstandFor(null)}
                          />
                        </div>
                      )}
                      
                      {/* Dropdown-like Stammdaten preview */}
                      {openStammdatenPreviewFor === promotor.id && (
                        <div className="absolute top-14 right-6 z-[80] w-[380px] max-w-[90vw]">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10 rounded-xl blur-md"></div>
                            <div className="relative rounded-xl border border-white/20 bg-white text-gray-900 shadow-2xl overflow-hidden">
                              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">Stammdatenblatt</p>
                                  <h3 className="text-sm font-semibold truncate">{promotor.name}</h3>
                                </div>
                                <button
                                  className="p-1.5 rounded-md hover:bg-gray-50"
                                  onClick={() => setOpenStammdatenPreviewFor(null)}
                                >
                                  <X className="h-4 w-4 text-gray-500" />
                                </button>
                              </div>
                              <div className="p-4 max-h-[520px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {(() => {
                                  const s = promotorStammdaten[promotor.id];
                                  if (!s) {
                                    return <p className="text-sm text-gray-500">Keine Stammdaten verfügbar.</p>;
                                  }
                                  return (
                                    <div className="space-y-3 text-sm">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <p className="text-gray-500">Name</p>
                                          <p className="font-medium">{s.firstName} {s.lastName}{s.title ? ` (${s.title})` : ''}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">E-Mail</p>
                                          <p className="font-medium truncate">{s.email || '-'}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">Telefon</p>
                                          <p className="font-medium">{s.phone || '-'}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">Geburtsdatum</p>
                                          <p className="font-medium">{s.birthDate || '-'}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Adresse</p>
                                        <p className="font-medium">{[s.address, s.postalCode, s.city].filter(Boolean).join(', ') || '-'}</p>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <p className="text-gray-500">Region</p>
                                          <p className="font-medium">{s.preferredRegion || '-'}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">Kleidergröße</p>
                                          <p className="font-medium">{s.clothingSize || '-'}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">Körpergröße</p>
                                          <p className="font-medium">{s.height ? `${s.height} cm` : '-'}</p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500">Geschlecht</p>
                                          <p className="font-medium capitalize">{s.gender || '-'}</p>
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-gray-500">Arbeitstage</p>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {(s.workingDays || []).map((d: string) => (
                                            <span key={d} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700 border border-gray-200">{d}</span>
                                          ))}
                                          {(!s.workingDays || s.workingDays.length === 0) && (
                                            <span className="text-gray-400">-</span>
                                          )}
                                        </div>
                                      </div>
                                      {/* Mobility */}
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className="text-center">
                                          <span className="text-xs text-gray-500 block mb-1">Führerschein</span>
                                          <div 
                                            className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs font-bold text-white ${!s.drivingLicense ? 'bg-gray-400' : ''}`}
                                            style={s.drivingLicense ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}}
                                          >
                                            {s.drivingLicense ? '✓' : '✗'}
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <span className="text-xs text-gray-500 block mb-1">Auto</span>
                                          <div 
                                            className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs font-bold text-white ${!s.carAvailable ? 'bg-gray-400' : ''}`}
                                            style={s.carAvailable ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}}
                                          >
                                            {s.carAvailable ? '✓' : '✗'}
                                          </div>
                                        </div>
                                        <div className="text-center">
                                          <span className="text-xs text-gray-500 block mb-1">Fahrbereit</span>
                                          <div 
                                            className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center text-xs font-bold text-white ${!s.willingToDrive ? 'bg-gray-400' : ''}`}
                                            style={s.willingToDrive ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}}
                                          >
                                            {s.willingToDrive ? '✓' : '✗'}
                                          </div>
                                        </div>
                                      </div>
                                      {/* Education & Experience */}
                                      <div className="space-y-1 text-xs">
                                        <div>
                                          <span className="text-gray-500">Ausbildung:</span>
                                          <p className="font-medium text-gray-900">{s.education || '-'}</p>
                                        </div>
                                        {s.qualifications && (
                                          <div>
                                            <span className="text-gray-500">Qualifikationen:</span>
                                            <p className="font-medium text-gray-900">{s.qualifications}</p>
                                          </div>
                                        )}
                                        {s.currentJob && (
                                          <div>
                                            <span className="text-gray-500">Aktueller Job:</span>
                                            <p className="font-medium text-gray-900">{s.currentJob}</p>
                                          </div>
                                        )}
                                      </div>
                                      {/* Work Preferences */}
                                      <div className="flex justify-between text-xs">
                                        <span className="text-gray-600 bg-gray-50 px-2.5 py-1 rounded-full font-medium">
                                          {s.hoursPerWeek ? `${s.hoursPerWeek}h/Woche` : 'Stunden unbekannt'}
                                        </span>
                                        <span className={`px-2.5 py-1 rounded-full font-medium ${
                                          s.spontaneity === 'oft' ? 'text-green-700 bg-green-50' :
                                          s.spontaneity === 'selten' ? 'text-orange-700 bg-orange-50' :
                                          s.spontaneity === 'nie' ? 'text-red-700 bg-red-50' :
                                          'text-gray-600 bg-gray-50'
                                        }`}>
                                          {s.spontaneity === 'oft' ? 'Oft spontan' : s.spontaneity === 'selten' ? 'Selten spontan' : s.spontaneity === 'nie' ? 'Nie spontan' : 'Spontanität unbekannt'}
                                        </span>
                                      </div>
                                      {/* Citizenship & Work Permit */}
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                          <span className="text-gray-500">Staatsbürgerschaft:</span>
                                          <p className="font-medium text-gray-900">{s.citizenship || '-'}</p>
                                        </div>
                                        {s.workPermit !== null && (
                                          <div>
                                            <span className="text-gray-500">Arbeitserlaubnis:</span>
                                            <p className={`font-medium ${s.workPermit ? 'text-green-600' : 'text-red-600'}`}>
                                              {s.workPermit ? 'Ja' : 'Nein'}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <Avatar 
                            className="h-16 w-16 ring-4 ring-white/20 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setShowPhotoMenu(!showPhotoMenu)}
                          >
                          <AvatarImage src={promotor.avatar} alt={promotor.name} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-lg font-medium">
                            {promotor.name.split(' ').map((n: string) => (n as string)[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                          
                          {/* Photo Menu */}
                          {showPhotoMenu && (
                            <div className="absolute left-20 top-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                              <button
                                onClick={() => {
                                  photoInputRef.current?.click();
                                  setShowPhotoMenu(false);
                                }}
                                disabled={uploadingPhoto}
                                className="whitespace-nowrap px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors disabled:opacity-50"
                              >
                                {uploadingPhoto ? 'Wird hochgeladen...' : 'Foto hochladen'}
                              </button>
                            </div>
                          )}
                          
                          {/* Hidden File Input */}
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleAdminPhotoUpload(e, promotor.id)}
                            className="hidden"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold">{promotor.name}</h2>
                          <p className="text-white/80">{promotor.email}</p>
                          <div className="flex items-center space-x-4 mt-2">
                            <Badge className={`${getRegionPillColors(promotor.region)} border text-xs`}>
                              {regionNames[promotor.region as keyof typeof regionNames]}
                            </Badge>
                            <span 
                              className={`text-sm font-medium cursor-pointer hover:underline ${
                              promotor.status === 'active' ? 'text-green-300' : promotor.status === 'newjoiner' ? 'text-blue-300' : 'text-gray-400'
                              }`}
                              onClick={() => handleStatusClick(promotor.id)}
                            >
                              {promotor.status === 'active' ? 'Aktiv' : promotor.status === 'newjoiner' ? 'New Joiner' : 'Inaktiv'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(95vh-140px)] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        
                        {/* Left Column - Personal & Contact */}
                        <div className="space-y-6">
                          {/* Personal Information */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                <User className="h-4 w-4 mr-2 text-blue-500" />
                                Persönliche Daten
                              </h3>
                                                             <div className="space-y-3 text-sm">
                                 <div 
                                   className="flex items-center space-x-2 cursor-pointer"
                                   onClick={() => copyToClipboard(promotor.phone, 'phone', promotor.id)}
                                 >
                                   {copiedItems[`${promotor.id}-phone`] ? (
                                     <Check className="h-4 w-4 text-green-500" />
                                   ) : (
                                     <Phone className="h-4 w-4 text-gray-400" />
                                   )}
                                   <span>{promotor.phone}</span>
                                 </div>
                                 <div 
                                   className="flex items-center space-x-2 cursor-pointer"
                                   onClick={() => copyToClipboard(promotor.email, 'email', promotor.id)}
                                 >
                                   {copiedItems[`${promotor.id}-email`] ? (
                                     <Check className="h-4 w-4 text-green-500" />
                                   ) : (
                                     <Mail className="h-4 w-4 text-gray-400" />
                                   )}
                                   <span>{promotor.email}</span>
                                 </div>
                                <div 
                                  className="flex items-center space-x-2 cursor-pointer"
                                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(promotor.address)}`, '_blank')}
                                >
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span>{promotor.address}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <span>Dabei seit März 2023</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Cake className="h-4 w-4 text-gray-400" />
                                  <span>{promotor.birthDate}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Documents */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                <FileText className="h-4 w-4 mr-2 text-green-500" />
                                Dokumente
                              </h3>
                              <div className="space-y-3">
                                {[
                                  "Pass",
                                  "Führerschein", 
                                  "Strafregister Bescheinigung",
                                  "Staatsbürgerschaftsnachweis",
                                  "Arbeitserlaubnis",
                                  "Zusätzliche Dokumente"
                                ].map((docName, index) => {
                                  const status = documentStatuses[docName];
                                  return (
                                    <div key={index} className="flex items-center justify-between">
                                      <span className="text-sm text-gray-600 dark:text-gray-300">{docName}</span>
                                      <div className="flex items-center space-x-2">
                                                                                {status === "pending" ? (
                                          <div className="flex items-center space-x-1">
                                            {documentsWithFiles[docName] && (
                                              <button
                                                onClick={() => handleViewDocument(docName)}
                                                className="p-0 hover:bg-transparent transition-all duration-300 opacity-40 hover:opacity-80"
                                              >
                                                <Eye className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                              </button>
                                            )}
                                            <button
                                              onClick={async () => {
                                                // Admin approve
                                                const type = docName === 'Pass' ? 'passport' : docName === 'Führerschein' ? 'fuehrerschein' : docName === 'Staatsbürgerschaftsnachweis' ? 'citizenship' : docName === 'Arbeitserlaubnis' ? 'arbeitserlaubnis' : (docName.startsWith('Strafregister') ? 'strafregister' : docName === 'Zusätzliche Dokumente' ? 'additional' : 'additional')
                                                const uid = String(promotors.find(p=>p.id===detailedViewOpen)?.id || detailedViewOpen || '')
                                                if (!uid) return
                                                await fetch('/api/admin/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: uid, doc_type: type, status: 'approved' })})
                                                await loadPromotorDocuments(uid)
                                              }}
                                              className="p-0 hover:bg-transparent transition-all duration-300 opacity-60 hover:opacity-100"
                                            >
                                              <Check className="h-4 w-4 text-green-500 hover:text-green-600" />
                                            </button>
                                            <button
                                              onClick={async () => {
                                                const type = docName === 'Pass' ? 'passport' : docName === 'Führerschein' ? 'fuehrerschein' : docName === 'Staatsbürgerschaftsnachweis' ? 'citizenship' : docName === 'Arbeitserlaubnis' ? 'arbeitserlaubnis' : (docName.startsWith('Strafregister') ? 'strafregister' : docName === 'Zusätzliche Dokumente' ? 'additional' : 'additional')
                                                const uid = String(promotors.find(p=>p.id===detailedViewOpen)?.id || detailedViewOpen || '')
                                                if (!uid) return
                                                await fetch('/api/admin/documents', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: uid, doc_type: type, status: 'rejected' })})
                                                await loadPromotorDocuments(uid)
                                              }}
                                              className="p-0 hover:bg-transparent transition-all duration-300 opacity-60 hover:opacity-100"
                                            >
                                              <X className="h-4 w-4 text-red-500 hover:text-red-600" />
                                            </button>
                                            <Loader2 className="h-4 w-4 text-orange-400 animate-spin ml-1" />
                                          </div>
                                        ) : status === "approved" ? (
                                          <div className="flex items-center space-x-1">
                                            {documentsWithFiles[docName] && (
                                              <button
                                                onClick={() => handleViewDocument(docName)}
                                                className="p-0 hover:bg-transparent transition-all duration-300 opacity-40 hover:opacity-80"
                                              >
                                                <Eye className="h-3 w-3 text-gray-400 hover:text-gray-600" />
                                              </button>
                                            )}
                                            <Check className="h-4 w-4 text-green-500" />
                                          </div>
                                        ) : docName === "Strafregister" && strafregisterDeactivated ? (
                                          <X className="h-4 w-4 text-gray-400" />
                                        ) : (
                                          <X className="h-4 w-4 text-red-500" />
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Working Days */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Arbeitstage</h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 rounded-full opacity-30 hover:opacity-100 transition-opacity"
                                  onClick={() => handleEditWorkingDays(promotor.id)}
                                  disabled={!!savingWorkingDays[promotor.id]}
                                >
                                  {editingWorkingDays[promotor.id] ? (
                                    savingWorkingDays[promotor.id] ? (
                                      <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3 text-green-500" />
                                    )
                                  ) : (
                                    <Edit2 className="h-3 w-3 text-gray-400" />
                                  )}
                                </Button>
                              </div>
                              <div className="flex justify-center space-x-2">
                                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => {
                                  const isSelected = editingWorkingDays[promotor.id] 
                                    ? (editWorkingDaysForm[promotor.id] || []).includes(day)
                                    : (promotor.personalData?.working_days || promotor.workingDays || []).includes(day);
                                  
                                  return (
                                    <div
                                      key={day}
                                      className={`w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                                          : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                      } ${editingWorkingDays[promotor.id] ? 'hover:scale-105' : ''}`}
                                      onClick={() => {
                                        if (editingWorkingDays[promotor.id]) {
                                          const current = editWorkingDaysForm[promotor.id] || [];
                                          const updated = current.includes(day)
                                            ? current.filter(d => d !== day)
                                            : [...current, day];
                                          setEditWorkingDaysForm(prev => ({
                                            ...prev,
                                            [promotor.id]: updated
                                          }));
                                        }
                                      }}
                                    >
                                      {day[0]}
                                    </div>
                                  );
                                })}
                              </div>
                            </CardContent>
                          </Card>

                          {/* Dienstvertrag */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                <FileSignature className="h-4 w-4 mr-2 text-blue-500" />
                                Dienstvertrag
                              </h3>
                              <div className="space-y-3">
                                {(() => {
                                  const contracts = Array.isArray(promotorContracts) ? promotorContracts : [];
                                  const activeContract = contracts.find((c: any) => c.is_active);
                                  
                                  return (
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-semibold text-blue-700">
                                          {activeContract ? 'Aktiver Dienstvertrag' : 'Kein aktiver Dienstvertrag'}
                                        </span>
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                          {activeContract ? 'Aktiv' : 'Offen'}
                                        </span>
                                      </div>
                                      <div className="text-xs text-gray-600 mb-2">
                                        <div>Datei: {activeContract?.file_name || activeContract?.file_path?.split('/').pop() || '/'}</div>
                                        <div>Zuletzt hinterlegt: {activeContract?.created_at ? new Date(activeContract.created_at).toLocaleDateString('de-DE') : '/'}</div>
                                      </div>
                                      <button 
                                        className="w-full p-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm font-medium rounded-lg transition-all duration-200"
                                        onClick={() => {
                                          setSelectedPromotorForContract(String(promotor.id));
                                          setShowDienstvertragPopup(true);
                                        }}
                                      >
                                        {activeContract ? 'Aktiver Dienstvertrag' : 'Dienstvertrag einspielen'}
                                      </button>
                                    </div>
                                  );
                                })()}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Middle Column - Performance & Training */}
                        <div className="space-y-6">
                          {/* Performance Metrics */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                <BarChart2 className="h-4 w-4 mr-2 text-purple-500" />
                                Performance KPIs
                              </h3>
                              {kpiLoading[promotor.id] && !kpiByPromotor[promotor.id] ? (
                                <div className="grid grid-cols-3 gap-4">
                                  {[0,1,2].map(i => (
                                    <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                                      <div className="mx-auto h-6 w-10 bg-gray-200 rounded animate-skeleton-fade mb-1.5"></div>
                                      <p className="text-xs text-gray-400 font-medium">—</p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                              <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p 
                                      className={`text-lg font-bold ${getKpiColor("mcet", kpiByPromotor[promotor.id]?.mcet ?? 0)}`}
                                      style={getKpiStyle(getKpiColor("mcet", kpiByPromotor[promotor.id]?.mcet ?? 0))}
                                  >
                                      {(kpiByPromotor[promotor.id]?.mcet ?? 0).toFixed(1)}
                                  </p>
                                  <p className="text-xs text-gray-500 font-medium">MC/ET</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p 
                                      className={`text-lg font-bold ${getKpiColor("tma", kpiByPromotor[promotor.id]?.tma ?? 0)}`}
                                      style={getKpiStyle(getKpiColor("tma", kpiByPromotor[promotor.id]?.tma ?? 0))}
                                  >
                                      {(kpiByPromotor[promotor.id]?.tma ?? 0)}%
                                  </p>
                                  <p className="text-xs text-gray-500 font-medium">TMA</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p 
                                      className={`text-lg font-bold ${getKpiColor("vlshare", kpiByPromotor[promotor.id]?.vlshare ?? 0)}`}
                                      style={getKpiStyle(getKpiColor("vlshare", kpiByPromotor[promotor.id]?.vlshare ?? 0))}
                                  >
                                      {(kpiByPromotor[promotor.id]?.vlshare ?? 0)}%
                                  </p>
                                  <p className="text-xs text-gray-500 font-medium">VL Share</p>
                                </div>
                              </div>
                              )}
                            </CardContent>
                          </Card>

                          {/* Training Progress */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                                <GraduationCap className="h-4 w-4 mr-2 text-indigo-500" />
                                Schulungen & Training
                              </h3>
                              <div className="relative h-48">
                                <div className="space-y-2 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {[
                                  { 
                                    name: "Grundlagen des Verkaufs", 
                                    status: "erledigt",
                                    components: {
                                      video: { required: true, completed: true },
                                      pdf: { required: true, completed: true },
                                      quiz: { required: true, completed: true }
                                    }
                                  },
                                  { 
                                    name: "Produktpräsentation", 
                                    status: "unterbrochen",
                                    components: {
                                      video: { required: true, completed: true },
                                      pdf: { required: true, completed: false },
                                      quiz: { required: true, completed: false }
                                    }
                                  },
                                  { 
                                    name: "Kundeneinwände behandeln", 
                                    status: "nicht erledigt",
                                    components: {
                                      video: { required: false, completed: false },
                                      pdf: { required: true, completed: false },
                                      quiz: { required: true, completed: false }
                                    }
                                  },
                                  { 
                                    name: "Teamarbeit & Kommunikation", 
                                    status: "erledigt",
                                    components: {
                                      video: { required: true, completed: true },
                                      pdf: { required: false, completed: false },
                                      quiz: { required: true, completed: true }
                                    }
                                  },
                                  { 
                                    name: "Digitale Tools & Apps", 
                                    status: "nicht erledigt",
                                    components: {
                                      video: { required: true, completed: false },
                                      pdf: { required: true, completed: false },
                                      quiz: { required: true, completed: false }
                                    }
                                  }
                                ].map((training, index) => {
                                  // Component indicators
                                  const indicators = [];
                                  if (training.components.video.required) {
                                    indicators.push({ icon: Video, completed: training.components.video.completed, key: 'video' });
                                  }
                                  if (training.components.pdf.required) {
                                    indicators.push({ icon: FileText, completed: training.components.pdf.completed, key: 'pdf' });
                                  }
                                  if (training.components.quiz.required) {
                                    indicators.push({ icon: HelpCircle, completed: training.components.quiz.completed, key: 'quiz' });
                                  }

                                  // Status icon
                                  const getStatusIcon = (status: string) => {
                                    switch (status) {
                                      case "erledigt":
                                        return <Check className="h-4 w-4 text-green-500" />
                                      case "unterbrochen":
                                        return <Loader2 className="h-4 w-4 text-orange-500 animate-spin" />
                                      case "nicht erledigt":
                                        return <X className="h-4 w-4 text-red-500" />
                                      default:
                                        return <X className="h-4 w-4 text-red-500" />
                                    }
                                  };

                                  return (
                                    <div key={index} className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-700">{training.name}</span>
                                          <div className="scale-75">
                                            {getStatusIcon(training.status)}
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                          {indicators.map((indicator) => {
                                            const IconComponent = indicator.icon;
                                            return (
                                              <div key={indicator.key} className="relative">
                                                <IconComponent 
                                                  className={`h-3 w-3 ${
                                                    indicator.completed 
                                                      ? 'text-green-500' 
                                                      : 'text-gray-300'
                                                  }`} 
                                                />
                                                {indicator.completed && (
                                                  <Check className="h-1.5 w-1.5 text-green-500 absolute -top-0.5 -right-0.5 bg-white rounded-full" />
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-gray-900/40 to-black/30 rounded-lg flex items-center justify-center pointer-events-none z-10 backdrop-blur-[2px]">
                                  <div className="relative text-center px-3">
                                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-emerald-500/30 blur-xl rounded-lg scale-110"></div>
                                    <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 rounded-lg shadow-2xl inline-block">
                                      <span className="text-white text-sm font-semibold tracking-wide">kommt bald!</span>
                                    </div>
                                    <p className="mt-3 text-xs text-white/90">Keine Schulungen verfügbar</p>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Onboarding Progress */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-2 text-emerald-500" />
                                Onboarding status:
                              </h3>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">Fortschritt</span>
                                  <span className="text-sm font-bold text-gray-900">{promotor.onboardingProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      promotor.onboardingProgress >= 75
                        ? 'bg-gradient-to-r from-green-500 to-green-800' 
                                        : promotor.onboardingProgress >= 50 
                                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-red-600 to-red-500'
                                    }`}
                                    style={{ width: `${promotor.onboardingProgress}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs text-gray-500">
                                  {promotor.onboardingProgress === 100 ? 'Onboarding abgeschlossen' : 
                                   promotor.onboardingProgress >= 75 ? 'Fast abgeschlossen' :
                                   promotor.onboardingProgress >= 50 ? 'In Bearbeitung' : 'Gerade begonnen'}
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Bank Details */}
                          <Card className="shadow-sm border-gray-200/60">
                            <CardContent className="p-4">
                              <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
                                <div className="flex items-center">
                                  <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                                  Bankdaten
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 rounded-full opacity-30 hover:opacity-100 transition-opacity"
                                  onClick={() => handleEditBankData(promotor.id)}
                                  disabled={!!savingBankData[promotor.id]}
                                >
                                  {editingBankData[promotor.id] ? (
                                    savingBankData[promotor.id] ? (
                                      <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3 text-green-500" />
                                    )
                                  ) : (
                                    <Edit2 className="h-3 w-3 text-gray-400" />
                                  )}
                                </Button>
                              </h3>
                              <div className="space-y-2">
                                {/* Account Holder and Bank Name - Side by Side */}
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-0.5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                      Kontoinhaber
                                    </label>
                                    {editingBankData[promotor.id] ? (
                                      <Input
                                        type="text"
                                        value={editBankForm[promotor.id]?.accountHolder || ''}
                                        onChange={(e) => setEditBankForm(prev => ({
                                          ...prev,
                                          [promotor.id]: { ...prev[promotor.id], accountHolder: e.target.value }
                                        }))}
                                        className="text-sm"
                                      />
                                    ) : (
                                      <div className="flex items-center space-x-2">
                                        <p 
                                          className="text-sm font-medium text-gray-900 cursor-pointer"
                                          onClick={() => handleAccountHolderClick(promotor.id)}
                                        >
                                          {promotor.bankDetails.accountHolder || 'Keine Daten'}
                                        </p>
                                        {accountHolderCopied[promotor.id] && (
                                          <Check className="h-3 w-3 text-green-500" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                      Bankname
                                    </label>
                                    {editingBankData[promotor.id] ? (
                                      <Input
                                        type="text"
                                        value={editBankForm[promotor.id]?.bankName || ''}
                                        onChange={(e) => setEditBankForm(prev => ({
                                          ...prev,
                                          [promotor.id]: { ...prev[promotor.id], bankName: e.target.value }
                                        }))}
                                        className="text-sm"
                                      />
                                    ) : (
                                      <p className="text-sm font-medium text-gray-900">
                                        {promotor.bankDetails.bankName || 'Keine Daten'}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* IBAN */}
                                <div className="space-y-0.5">
                                  <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                    IBAN
                                  </label>
                                  {editingBankData[promotor.id] ? (
                                    <Input
                                      type="text"
                                      value={editBankForm[promotor.id]?.iban || ''}
                                      onChange={(e) => setEditBankForm(prev => ({
                                        ...prev,
                                        [promotor.id]: { ...prev[promotor.id], iban: e.target.value }
                                      }))}
                                      className="text-sm font-mono"
                                    />
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <p 
                                        className="text-sm font-mono font-medium text-gray-900 tracking-wider cursor-pointer"
                                        onClick={() => handleIbanClick(promotor.id)}
                                      >
                                        {promotor.bankDetails.iban ? (ibanVisible[promotor.id] ? promotor.bankDetails.iban : maskIban(promotor.bankDetails.iban)) : 'Keine Daten'}
                                      </p>
                                      {ibanCopied[promotor.id] && (
                                        <Check className="h-3 w-3 text-green-500" />
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* BIC and SV Nummer - Side by Side */}
                                <div className="grid grid-cols-2 gap-3" style={{marginTop: '1px'}}>
                                  <div className="space-y-0.5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                      BIC
                                    </label>
                                    {editingBankData[promotor.id] ? (
                                      <Input
                                        type="text"
                                        value={editBankForm[promotor.id]?.bic || ''}
                                        onChange={(e) => setEditBankForm(prev => ({
                                          ...prev,
                                          [promotor.id]: { ...prev[promotor.id], bic: e.target.value }
                                        }))}
                                        className="text-sm font-mono"
                                      />
                                    ) : (
                                      <div className="flex items-center space-x-2">
                                        <p 
                                          className="text-sm font-mono font-medium text-gray-900 tracking-wider cursor-pointer"
                                          onClick={() => handleBicClick(promotor.id)}
                                        >
                                          {promotor.bankDetails.bic || 'Keine Daten'}
                                        </p>
                                        {bicCopied[promotor.id] && (
                                          <Check className="h-3 w-3 text-green-500" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                      SV Nummer
                                    </label>
                                    {editingBankData[promotor.id] ? (
                                      <Input
                                        type="text"
                                        value={editBankForm[promotor.id]?.social_security_number || ''}
                                        onChange={(e) => setEditBankForm(prev => ({
                                          ...prev,
                                          [promotor.id]: { ...prev[promotor.id], social_security_number: e.target.value }
                                        }))}
                                        className="text-sm font-mono"
                                      />
                                    ) : (
                                      <p className="text-sm font-medium text-gray-900">
                                        {(() => {
                                          console.log('Debug SV Nummer for promotor:', promotor.id, {
                                            personalData: promotor.personalData,
                                            socialSecurityNumber: promotor.personalData?.social_security_number,
                                            fullPromotor: promotor
                                          });
                                          return promotor.personalData?.social_security_number || 'Keine Daten';
                                        })()}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Right Column - Activity & Assignments */}
                        <div className="space-y-6">
                                                     {/* Recent Activity */}
                           <Card className="shadow-sm border-gray-200/60">
                             <CardContent className="p-4">
                               <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                 <Activity className="h-4 w-4 mr-2 text-orange-500" />
                                 Aktivität & Einsätze
                               </h3>
                               <div className="space-y-3 text-sm">
                                 <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                   <span className="font-medium">Gesamte Einsätze</span>
                                   {promotorStatsLoading[promotor.id] && promotorStats[promotor.id] === undefined ? (
                                     <span className="inline-block h-4 w-6 bg-gray-200 rounded animate-skeleton-fade" />
                                   ) : (
                                     <span className="font-bold text-blue-600">
                                       {promotorStats[promotor.id]?.completed ?? 0}
                                     </span>
                                   )}
                                 </div>
                                 <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                   <span className="font-medium">Abgeschlossene Schulungen</span>
                                   <span className="font-bold text-gray-400">—</span>
                                 </div>
                                 <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                   <span className="font-medium">Krankenstand</span>
                                   {promotorStatsLoading[promotor.id] && promotorStats[promotor.id] === undefined ? (
                                     <span className="inline-block h-4 w-6 bg-gray-200 rounded animate-skeleton-fade" />
                                   ) : (
                                     <span className="font-bold text-red-600">
                                       {promotorStats[promotor.id]?.krankenstand ?? 0}
                                     </span>
                                   )}
                                 </div>
                                 <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                   <span className="font-medium">Notfälle</span>
                                   <span className="font-bold text-gray-400">—</span>
                                 </div>
                                 <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                   <span className="font-medium">Anwesenheitsrate</span>
                                   {promotorStatsLoading[promotor.id] && promotorStats[promotor.id] === undefined ? (
                                     <span className="inline-block h-4 w-10 bg-gray-200 rounded animate-skeleton-fade" />
                                   ) : (
                                     <span className={`font-bold ${getAttendanceColor(promotorStats[promotor.id]?.attendanceRate ?? 0)}`}>
                                       {(promotorStats[promotor.id]?.attendanceRate ?? 0)}%
                                     </span>
                                   )}
                                 </div>
                               </div>
                             </CardContent>
                           </Card>

                                                     {/* Upcoming Assignments */}
                           <Card className="shadow-sm border-gray-200/60">
                             <CardContent className="p-4">
                               <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                                 <Briefcase className="h-4 w-4 mr-2 text-teal-500" />
                                 Kommende Einsätze
                               </h3>
                              <div className="h-[260px]">
                                {(() => {
                                  const promotorId = String(promotor.id);
                                  const isLoading = !!upcomingAssignmentsLoading[promotorId];
                                  const hasError = !!upcomingAssignmentsError[promotorId];
                                  const assignments = [...(upcomingAssignmentsByPromotor[promotorId] || [])].sort((a, b) => {
                                    const aTime = new Date(a?.start_ts || 0).getTime();
                                    const bTime = new Date(b?.start_ts || 0).getTime();
                                    return aTime - bTime;
                                  });

                                  if (isLoading) {
                                    return (
                                      <div className="space-y-3 h-full">
                                        {[0, 1, 2].map((i) => (
                                          <div key={i} className="p-3 border border-gray-200 rounded-lg animate-skeleton-fade">
                                            <div className="flex items-center justify-between mb-2">
                                              <div className="h-4 w-20 rounded bg-gray-200" />
                                              <div className="h-5 w-20 rounded-full bg-gray-200" />
                                            </div>
                                            <div className="h-3 w-24 rounded bg-gray-200 mb-1" />
                                            <div className="h-3 w-36 rounded bg-gray-200" />
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  }

                                  if (hasError) {
                                    return (
                                      <div className="h-full flex items-center justify-center p-4 border border-dashed border-gray-200 rounded-lg text-center">
                                        <div>
                                          <p className="text-sm font-medium text-gray-700">Einsätze konnten nicht geladen werden</p>
                                          <p className="text-xs text-gray-500 mt-1">Bitte später erneut versuchen.</p>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (assignments.length === 0) {
                                    return (
                                      <div className="h-full flex items-center justify-center p-4 border border-dashed border-gray-200 rounded-lg text-center">
                                        <div>
                                          <Calendar className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                                          <p className="text-sm font-medium text-gray-700">Keine kommenden Einsätze</p>
                                          <p className="text-xs text-gray-500 mt-1">Dieser Promotor ist aktuell nicht verplant.</p>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-3 h-full overflow-y-auto [&::-webkit-scrollbar]:hidden pr-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                      {assignments.map((assignment: UpcomingAssignmentRow) => {
                                        const isBuddyTag = assignment.user_role === 'buddy'
                                          || assignment.status === 'buddy_tag'
                                          || !!(assignment.buddy_name || assignment.buddy_display_name || assignment.buddy_user_id);
                                        const typeLabel = isBuddyTag ? 'Buddy Tag' : 'Promotion';
                                        const start = formatIsoTimeNoTZ(assignment.start_ts);
                                        const end = formatIsoTimeNoTZ(assignment.end_ts);
                                        const timeLabel = end !== '--:--' ? `${start}-${end}` : start;
                                        const location = assignment.location_text
                                          || [assignment.postal_code, assignment.city].filter(Boolean).join(' ')
                                          || 'Unbekannter Einsatzort';

                                        return (
                                          <div key={`${assignment.id}-${assignment.user_role || 'unknown'}`} className="p-3 border border-gray-200 rounded-lg">
                                            <div className="flex items-center justify-between mb-1">
                                              <span className="text-sm font-medium text-gray-900">{getAssignmentDateLabel(assignment.start_ts)}</span>
                                              <Badge
                                                variant="outline"
                                                className={`text-xs border-0 text-white font-medium ${
                                                  typeLabel === "Promotion"
                                                    ? "bg-gradient-to-r from-blue-500 to-blue-600"
                                                    : "bg-gradient-to-r from-purple-500 to-pink-500"
                                                }`}
                                              >
                                                {typeLabel}
                                              </Badge>
                                            </div>
                                            <p className="text-xs text-gray-600">{timeLabel}</p>
                                            <p className="text-xs text-gray-500">{location}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                             </CardContent>
                           </Card>

                           {/* Clothing Size Information */}
                           <Card className="shadow-sm border-gray-200/60">
                             <CardContent className="p-4">
                               <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
                                 <div className="flex items-center">
                                   <Ruler className="h-4 w-4 mr-2 text-purple-500" />
                                   Kleidergröße
                                 </div>
                                <Button
                                   variant="ghost"
                                   size="sm"
                                   className="h-6 w-6 rounded-full opacity-30 hover:opacity-100 transition-opacity"
                                   onClick={() => handleEditClothingData(promotor.id)}
                                  disabled={!!savingClothingData[promotor.id]}
                                 >
                                  {editingClothingData[promotor.id] ? (
                                    savingClothingData[promotor.id] ? (
                                      <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                                    ) : (
                                      <Check className="h-3 w-3 text-green-500" />
                                    )
                                  ) : (
                                     <Edit2 className="h-3 w-3 text-gray-400" />
                                   )}
                                 </Button>
                               </h3>
                               <div className="space-y-3">
                                 <div className="grid grid-cols-2 gap-3">
                                   <div className="space-y-1 text-center">
                                     <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                       Körpergröße
                                     </label>
                                     {editingClothingData[promotor.id] ? (
                                       <Input
                                         type="text"
                                         value={editClothingForm[promotor.id]?.height || ''}
                                         onChange={(e) => setEditClothingForm(prev => ({
                                           ...prev,
                                           [promotor.id]: { ...prev[promotor.id], height: e.target.value }
                                         }))}
                                         className="text-sm text-center"
                                         placeholder="180"
                                       />
                                     ) : (
                                       <div className="bg-gray-50 rounded-lg py-4 px-3 flex items-center justify-center">
                                         <p className="text-lg font-bold text-gray-900">
                                           {promotor.clothingInfo.height}
                                         </p>
                                         <span className="text-xs text-gray-500 ml-1 font-medium">cm</span>
                                       </div>
                                     )}
                                   </div>
                                   <div className="space-y-1 text-center">
                                     <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">
                                       Kleidergröße
                                     </label>
                                     {editingClothingData[promotor.id] ? (
                                       <Input
                                         type="text"
                                         value={editClothingForm[promotor.id]?.size || ''}
                                         onChange={(e) => setEditClothingForm(prev => ({
                                           ...prev,
                                           [promotor.id]: { ...prev[promotor.id], size: e.target.value }
                                         }))}
                                         className="text-sm text-center"
                                         placeholder="L"
                                       />
                                     ) : (
                                       <div className="bg-gray-50 rounded-lg py-4 px-3 flex items-center justify-center">
                                         <p className="text-lg font-bold text-gray-900">
                                           {promotor.clothingInfo.size}
                                         </p>
                                       </div>
                                     )}
                                   </div>
                                 </div>
                               </div>
                             </CardContent>
                           </Card>

                          
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* Dienstvertrag Popup */}
      {showDienstvertragPopup && (
        <>
          <div 
            className="fixed inset-0 bg-black/30 z-[75] backdrop-blur-sm"
            onClick={() => {
              setShowDienstvertragPopup(false);
              setSelectedPromotorForContract(null);
            }}
          ></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-xl z-[80] p-0 w-[640px] max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="text-white p-6 rounded-t-xl" style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)'}}>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Dienstvertrag Management</h3>
                <button
                  onClick={() => {
                    setShowDienstvertragPopup(false);
                    setSelectedPromotorForContract(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6 max-h-[calc(85vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-900">Dienstvertrag einspielen</h4>
                <p className="text-sm text-gray-600">
                  Lade einen bereits unterschriebenen Dienstvertrag als PDF, DOC oder DOCX hoch.
                  Beim Upload wird der neue Vertrag sofort aktiv, der bisher aktive wird automatisch archiviert.
                </p>

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${
                    isContractDropActive ? 'border-green-400 bg-green-50' : 'border-gray-300 bg-gray-50'
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsContractDropActive(true);
                  }}
                  onDragLeave={() => setIsContractDropActive(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsContractDropActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    await handleAdminContractImport(file);
                  }}
                >
                  <Upload className="h-7 w-7 text-gray-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-700 mb-1">Datei hier ablegen oder auswählen</p>
                  <p className="text-xs text-gray-500 mb-3">Erlaubt: PDF, DOC, DOCX</p>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                      input.style.display = 'none';
                      document.body.appendChild(input);
                      input.onchange = async () => {
                        const file = input.files?.[0];
                        document.body.removeChild(input);
                        if (!file) return;
                        await handleAdminContractImport(file);
                      };
                      input.click();
                    }}
                    disabled={uploadingContractFile}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-70"
                  >
                    {uploadingContractFile ? (
                      <span className="inline-flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        wird hochgeladen
                      </span>
                    ) : (
                      'Datei auswählen'
                    )}
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Vertragshistorie</h4>
                <div className="space-y-3">
                  {(Array.isArray(promotorContracts) ? promotorContracts : []).length === 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                      <span className="text-sm text-gray-600">Kein Dienstvertrag verfügbar</span>
                    </div>
                  )}

                  {(Array.isArray(promotorContracts) ? promotorContracts : []).map((contract) => {
                    const isActive = !!contract.is_active;
                    const created = contract.created_at ? new Date(contract.created_at).toLocaleDateString('de-DE') : 'N/A';
                    return (
                      <div
                        key={contract.id}
                        className={`rounded-lg p-4 border ${
                          isActive
                            ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-semibold ${isActive ? 'text-green-700' : 'text-gray-700'}`}>
                            {isActive ? 'Aktiver Dienstvertrag' : 'Vergangener Dienstvertrag'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'
                          }`}>
                            {isActive ? 'Aktiv' : 'Archiv'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mb-3">
                          <div>Datei: {contract.file_name || contract.file_path?.split('/').pop() || 'N/A'}</div>
                          <div>Hinterlegt am: {created}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                            onClick={() => handleDienstvertragSelect(contract.id)}
                          >
                            {isActive ? 'Aktiver Dienstvertrag' : 'Archiv ansehen'}
                          </button>
                          <button
                            className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                            onClick={() => handleDienstvertragSelect(contract.id)}
                            title="Vorschau öffnen"
                          >
                            <Eye className="h-4 w-4 text-gray-700" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dienstvertrag Content Popup */}
      {showDienstvertragContent && (
        <>
          <div 
            className="fixed inset-0 bg-black/40 z-[75] backdrop-blur-sm"
            onClick={() => setShowDienstvertragContent(false)}
          ></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-[80] p-0 w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="sticky top-0 text-white p-4 rounded-t-lg" style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)'}}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => {
                      setShowDienstvertragContent(false);
                      setShowDienstvertragPopup(true);
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                <h3 className="text-xl font-bold">Dienstvertrag</h3>
                </div>
                <div className="flex items-center gap-2">
                  {(contractPreviewExt === 'doc' || contractPreviewExt === 'docx') && (
                    <>
                      <button
                        onClick={refreshContractPreview}
                        className="px-2.5 py-1.5 text-xs bg-white/15 hover:bg-white/25 rounded-lg transition-colors"
                      >
                        Neu laden
                      </button>
                      {contractPreviewUrl && (
                        <button
                          onClick={() => window.open(contractPreviewUrl, '_blank')}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          title="In neuem Tab öffnen"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                  <button 
                    onClick={() => setShowDienstvertragContent(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-8 [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
              {loadingContractPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                </div>
              ) : contractPreviewUrl ? (
                <iframe
                  src={contractPreviewExt === 'pdf'
                    ? contractPreviewUrl
                    : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(contractPreviewUrl)}`}
                  className="w-full h-[70vh] rounded-lg border border-gray-200"
                  title="Dienstvertrag Vorschau"
                  onError={() => setContractPreviewError(true)}
                />
              ) : (
                <div className="text-sm text-gray-600 text-center py-12">Keine Vorschau verfügbar</div>
              )}
              {contractPreviewError && (
                <div className="mt-3 text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  Die Vorschau konnte nicht zuverlässig geladen werden. Bitte "Neu laden" versuchen oder im neuen Tab öffnen.
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Zugänge Excel Import Modal */}
      {showAccessImportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
          <div
            className={`bg-white rounded-xl shadow-2xl w-full ${
              accessImportStage === 'upload' ? 'max-w-lg' : 'max-w-6xl'
            } max-h-[90vh] overflow-hidden`}
          >
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Zugänge Import</h3>
                  <p className="text-xs text-white/80 mt-1">Excel-Mapping für Hübner, Demotool, TMA und Boost App</p>
                </div>
                <button
                  onClick={() => {
                    setShowAccessImportModal(false);
                    resetAccessImportState();
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {accessImportStage === 'upload' && (
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    if (!/\.(xlsx|xls)$/i.test(file.name)) {
                      alert('Bitte eine .xlsx oder .xls Datei auswählen.');
                      return;
                    }
                    await prepareAccessImportPreview(file);
                  }}
                >
                  <div className="space-y-3">
                    <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Upload className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Excel-Datei hier ablegen oder</p>
                      <button
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.xlsx,.xls';
                          input.style.display = 'none';
                          document.body.appendChild(input);
                          input.onchange = async () => {
                            const file = input.files?.[0];
                            document.body.removeChild(input);
                            if (!file) return;
                            await prepareAccessImportPreview(file);
                          };
                          input.click();
                        }}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Datei auswählen
                      </button>
                    </div>
                    <p className="text-xs text-gray-400">Unterstützte Formate: .xlsx, .xls</p>
                  </div>
                </div>
              )}

              {accessImportStage === 'preview_mapping' && (
                <div className="space-y-4">
                  <div className="text-xs text-gray-500">
                    Datei: <span className="font-medium text-gray-700">{accessImportSourceFileName || '-'}</span>
                  </div>

                  <div className="border border-gray-200 rounded-lg">
                    <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-700">
                      Vorschau (horizontal + vertikal scrollbar)
                    </div>
                    <div className="max-h-[320px] overflow-auto">
                      {(() => {
                        const previewMaxCols = accessImportSheetRows.reduce((max, row) => {
                          const rowLen = Array.isArray(row) ? row.length : 0;
                          return Math.max(max, rowLen);
                        }, 0);
                        return (
                          <table className="min-w-max text-xs">
                            <thead className="sticky top-0 z-10">
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="sticky left-0 bg-gray-50 border-r border-gray-200 px-2 py-1 text-gray-500 w-10 text-left">#</th>
                                {Array.from({ length: previewMaxCols }).map((_, colIndex) => (
                                  <th
                                    key={`zugang-preview-col-${colIndex}`}
                                    className="px-2 py-1 text-[11px] font-semibold text-gray-600 border-r border-gray-200 whitespace-nowrap text-left"
                                  >
                                    {columnIndexToLetter(colIndex)}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {accessImportSheetRows.map((row, rowIndex) => (
                                <tr key={`zugang-preview-row-${rowIndex}`} className="border-b border-gray-100 last:border-b-0">
                                  <td className="sticky left-0 bg-white border-r border-gray-200 px-2 py-1 text-gray-400 w-10">{rowIndex + 1}</td>
                                  {Array.from({ length: previewMaxCols }).map((_, cellIndex) => (
                                    <td key={`zugang-preview-cell-${rowIndex}-${cellIndex}`} className="px-2 py-1 whitespace-nowrap text-gray-700 border-r border-gray-100">
                                      {String((Array.isArray(row) ? row[cellIndex] : '') ?? '')}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { key: 'fullNameCol', label: 'Vollname' },
                      { key: 'huebnerEmailCol', label: 'Hübner E-Mail' },
                      { key: 'huebnerPasswordCol', label: 'Hübner Passwort' },
                      { key: 'demotoolEmailCol', label: 'Demotool E-Mail' },
                      { key: 'demotoolPasswordCol', label: 'Demotool Passwort' },
                      { key: 'tmaEmailCol', label: 'TMA E-Mail' },
                      { key: 'tmaPasswordCol', label: 'TMA Passwort' },
                      { key: 'boostAppEmailCol', label: 'Boost App E-Mail' },
                      { key: 'boostAppPasswordCol', label: 'Boost App Passwort' },
                    ].map((field) => (
                      <div key={field.key} className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">{field.label}</label>
                        <input
                          value={(accessImportMapping as any)[field.key] || ''}
                          onChange={(e) =>
                            {
                              setAccessImportResult(null);
                              setAccessImportMapping((prev) => ({
                                ...prev,
                                [field.key]: normalizeColumnLetter(e.target.value),
                              }));
                            }
                          }
                          placeholder="A"
                          className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={accessImportSkipFirstRow}
                      onChange={(e) => {
                        setAccessImportResult(null);
                        setAccessImportSkipFirstRow(e.target.checked);
                      }}
                      className="h-4 w-4"
                    />
                    Erste Zeile überspringen (Header)
                  </label>

                  {accessImportResult && (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                      <div className="font-semibold mb-1">Letztes Import-Ergebnis</div>
                      <div>Aktualisierte Promotoren: {accessImportResult.updated}</div>
                      <div>Aktualisierte Zeilen: {Number(accessImportResult.updatedRows ?? 0)}</div>
                      <div>Übersprungen: {accessImportResult.skipped}</div>
                      <div>Nicht zugeordnet: {accessImportResult.unresolved}</div>
                    </div>
                  )}

                  {accessImportRowErrors.length > 0 && (
                    <div className="max-h-28 overflow-auto rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      <div className="font-semibold mb-1">Hinweise aus letzter Vorschau:</div>
                      <div className="space-y-1">
                        {accessImportRowErrors.slice(0, 8).map((err) => (
                          <div key={`${err.rowKey}-${err.message}`}>Zeile {err.rowNumber}: {err.message}</div>
                        ))}
                        {accessImportRowErrors.length > 8 && (
                          <div>+{accessImportRowErrors.length - 8} weitere</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {accessImportStage === 'resolve_promotors' && (
                <div className="space-y-4">
                  <div className="text-sm font-medium text-gray-800">
                    Promotor-Zuordnung prüfen ({accessImportUnresolvedPromotors.length})
                  </div>
                  <div className="max-h-[360px] overflow-auto space-y-3 pr-1">
                    {accessImportUnresolvedPromotors.map((item) => (
                      <div key={item.rowKey} className="rounded-lg border border-gray-200 p-3">
                        <div className="text-xs text-gray-500 mb-2">Zeile {item.rowNumber}</div>
                        <div className="text-sm text-gray-800 mb-1">
                          Importierter Name: <span className="font-semibold">{item.importedName}</span>
                        </div>
                        <div className="text-xs text-gray-500 mb-2">Grund: {item.reason || 'unresolved'}</div>
                        <select
                          value={accessImportResolutionSelections[item.rowKey] || '__none__'}
                          onChange={(e) =>
                            setAccessImportResolutionSelections((prev) => ({
                              ...prev,
                              [item.rowKey]: e.target.value,
                            }))
                          }
                          className="w-full h-9 rounded-md border border-gray-200 px-2 text-sm"
                        >
                          <option value="__none__">Kein Promotor zuweisen</option>
                          {promotors.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    if (accessImportStage === 'resolve_promotors') {
                      setAccessImportStage('preview_mapping');
                      return;
                    }
                    if (accessImportStage === 'preview_mapping') {
                      if (accessImportResult) {
                        setShowAccessImportModal(false);
                        resetAccessImportState();
                        return;
                      }
                      resetAccessImportState();
                      return;
                    }
                    setShowAccessImportModal(false);
                    resetAccessImportState();
                  }}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {accessImportStage === 'resolve_promotors'
                    ? 'Zurück'
                    : accessImportStage === 'preview_mapping'
                      ? (accessImportResult ? 'Schließen' : 'Zurück')
                      : 'Abbrechen'}
                </button>

                {accessImportStage === 'preview_mapping' && (
                  <button
                    onClick={handleAccessImportPreviewAndImport}
                    disabled={accessImportBusy || accessImportSheetRows.length === 0}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {accessImportBusy ? 'Wird geprüft...' : 'Importieren'}
                  </button>
                )}

                {accessImportStage === 'resolve_promotors' && (
                  <button
                    onClick={handleFinalizeResolvedAccessImport}
                    disabled={accessImportBusy}
                    className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {accessImportBusy ? 'Import läuft...' : 'Import finalisieren'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Confirmation Modal */}
      {showStatusConfirmation && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
            onClick={() => setShowStatusConfirmation(false)}
          ></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl z-[100] p-6 w-[400px]">
            <div className="text-center">
              <div className="mb-4">
                <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Promotor als inaktiv setzen?
                </h3>
                <p className="text-sm text-gray-600">
                  Möchten Sie diesen Promotor wirklich als inaktiv markieren? Diese Aktion kann später rückgängig gemacht werden.
                </p>
                </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowStatusConfirmation(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleStatusChange}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-red-600 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        </>
      )}

        {/* Eddie KI Assistant */}
        {/* Access Credentials Modal */}
        {showAccessCredentials && (
          <>
            <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
              onClick={() => setShowAccessCredentials(false)}
            ></div>
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[100] w-[500px] max-h-[80vh] overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-6 w-6" />
                    <h3 className="text-xl font-semibold">Zugänge</h3>
                  </div>
                  <button
                    onClick={() => setShowAccessCredentials(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Content */}
              <div className="p-6 max-h-[calc(80vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {loadingCredentials ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Hübner */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/60">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                        Hübner
                      </h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">E-Mail</span>
                          <div className="bg-white rounded-md px-3 py-2 border border-gray-200">
                            <p className="font-medium text-gray-900">
                              {accessCredentials?.huebner_email || (
                                <span className="text-gray-400 italic">Keine E-Mail hinterlegt</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Passwort</span>
                          <div className="bg-white rounded-md px-3 py-2 border border-gray-200">
                            <p className="font-mono text-gray-900">
                              {accessCredentials?.huebner_password ? (
                                <span>••••••••••••</span>
                              ) : (
                                <span className="text-gray-400 italic font-sans">Kein Passwort hinterlegt</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* DemoTool */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/60">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          DemoTool
                        </div>
                        <button
                          onClick={() => toggleEditCredentials('demotool')}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title={editingCredentials.demotool ? "Speichern" : "Bearbeiten"}
                        >
                          {editingCredentials.demotool ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Edit2 className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">E-Mail</span>
                          <div 
                            className="bg-white rounded-md px-3 py-2 border border-gray-200"
                            style={editingCredentials.demotool ? { boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)' } : {}}
                          >
                            {editingCredentials.demotool ? (
                              <input
                                type="email"
                                value={editCredentialsForm.demotool?.email || ''}
                                onChange={(e) => setEditCredentialsForm(prev => ({
                                  ...prev,
                                  demotool: { ...prev.demotool, email: e.target.value }
                                }))}
                                className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-none focus:shadow-none p-0 m-0"
                                style={{ all: 'unset', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}
                              />
                            ) : (
                              <p className="font-medium text-gray-900">
                                {accessCredentials?.demotool_email || (
                                  <span className="text-gray-400 italic">Keine E-Mail hinterlegt</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Passwort</span>
                          <div 
                            className="bg-white rounded-md px-3 py-2 border border-gray-200 flex items-center justify-between"
                            style={editingCredentials.demotool ? { boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)' } : {}}
                          >
                            {editingCredentials.demotool ? (
                              <input
                                type="text"
                                value={editCredentialsForm.demotool?.password || ''}
                                onChange={(e) => setEditCredentialsForm(prev => ({
                                  ...prev,
                                  demotool: { ...prev.demotool, password: e.target.value }
                                }))}
                                className="w-full text-sm font-mono text-gray-900 bg-transparent border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-none focus:shadow-none p-0 m-0 flex-1"
                                style={{ all: 'unset', fontFamily: 'monospace', fontSize: 'inherit', color: 'inherit' }}
                              />
                            ) : (
                              <>
                                <p className="font-mono text-gray-900 flex-1">
                                  {accessCredentials?.demotool_password ? (
                                    passwordVisibility.demotool ? 
                                      accessCredentials.demotool_password : 
                                      '••••••••••••'
                                  ) : (
                                    <span className="text-gray-400 italic font-sans">Kein Passwort hinterlegt</span>
                                  )}
                                </p>
                                {accessCredentials?.demotool_password && (
                                  <button
                                    onClick={() => togglePasswordVisibility('demotool')}
                                    className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    {passwordVisibility.demotool ? (
                                      <EyeOff className="h-3 w-3 text-gray-500" />
                                    ) : (
                                      <Eye className="h-3 w-3 text-gray-500" />
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* TMA */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/60">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mr-2"></div>
                          TMA
                        </div>
                        <button
                          onClick={() => toggleEditCredentials('tma')}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title={editingCredentials.tma ? "Speichern" : "Bearbeiten"}
                        >
                          {editingCredentials.tma ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Edit2 className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">E-Mail</span>
                          <div 
                            className="bg-white rounded-md px-3 py-2 border border-gray-200"
                            style={editingCredentials.tma ? { boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)' } : {}}
                          >
                            {editingCredentials.tma ? (
                              <input
                                type="email"
                                value={editCredentialsForm.tma?.email || ''}
                                onChange={(e) => setEditCredentialsForm(prev => ({
                                  ...prev,
                                  tma: { ...prev.tma, email: e.target.value }
                                }))}
                                className="w-full text-sm font-medium text-gray-900 bg-transparent border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-none focus:shadow-none p-0 m-0"
                                style={{ all: 'unset', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit', color: 'inherit' }}
                              />
                            ) : (
                              <p className="font-medium text-gray-900">
                                {accessCredentials?.tma_email || (
                                  <span className="text-gray-400 italic">Keine E-Mail hinterlegt</span>
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Passwort</span>
                          <div 
                            className="bg-white rounded-md px-3 py-2 border border-gray-200 flex items-center justify-between"
                            style={editingCredentials.tma ? { boxShadow: '0 4px 20px rgba(34, 197, 94, 0.3)' } : {}}
                          >
                            {editingCredentials.tma ? (
                              <input
                                type="text"
                                value={editCredentialsForm.tma?.password || ''}
                                onChange={(e) => setEditCredentialsForm(prev => ({
                                  ...prev,
                                  tma: { ...prev.tma, password: e.target.value }
                                }))}
                                className="w-full text-sm font-mono text-gray-900 bg-transparent border-0 outline-none focus:outline-none ring-0 focus:ring-0 shadow-none focus:shadow-none p-0 m-0 flex-1"
                                style={{ all: 'unset', fontFamily: 'monospace', fontSize: 'inherit', color: 'inherit' }}
                              />
                            ) : (
                              <>
                                <p className="font-mono text-gray-900 flex-1">
                                  {accessCredentials?.tma_password ? (
                                    passwordVisibility.tma ? 
                                      accessCredentials.tma_password : 
                                      '••••••••••••'
                                  ) : (
                                    <span className="text-gray-400 italic font-sans">Kein Passwort hinterlegt</span>
                                  )}
                                </p>
                                {accessCredentials?.tma_password && (
                                  <button
                                    onClick={() => togglePasswordVisibility('tma')}
                                    className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
                                  >
                                    {passwordVisibility.tma ? (
                                      <EyeOff className="h-3 w-3 text-gray-500" />
                                    ) : (
                                      <Eye className="h-3 w-3 text-gray-500" />
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Boost App (read-only like Hübner) */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200/60">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                          <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                          Boost App
                      </h4>
                      
                      <div className="space-y-3 text-sm">
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">E-Mail</span>
                          <div className="bg-white rounded-md px-3 py-2 border border-gray-200">
                              <p className="font-medium text-gray-900">
                                {accessCredentials?.boost_app_email || (
                                  <span className="text-gray-400 italic">Keine E-Mail hinterlegt</span>
                                )}
                              </p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-gray-500 text-xs uppercase tracking-wide font-medium">Passwort</span>
                          <div className="bg-white rounded-md px-3 py-2 border border-gray-200">
                            <p className="font-mono text-gray-900">
                                  {accessCredentials?.boost_app_password ? (
                                <span>••••••••••••</span>
                                  ) : (
                                    <span className="text-gray-400 italic font-sans">Kein Passwort hinterlegt</span>
                                  )}
                                </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <AdminEddieAssistant />
      </div>
    </>
  );
} 