"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { createSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  MapPin,
  Mail,
  Phone,
  Calendar,
  FileText,
  Users,
  GraduationCap,
  ClipboardCheck,
  Briefcase,
  Heart,
  BarChart3,
  Contact,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Upload,
  Ruler,
  CreditCard,
  User,
  FileSignature,
  IdCard,
  Download,
  Clock,
  ArrowLeft,
  Key,
  ExternalLink
} from "lucide-react"

// Simple skeleton fade animation CSS (reused from admin/team)
const skeletonStyles = `
  .animate-skeleton-fade {
    animation: skeleton-fade 0.7s ease-in-out infinite alternate;
  }
  @keyframes skeleton-fade {
    0% { background-color: #f3f4f6; }
    100% { background-color: #e5e7eb; }
  }
  /* Scanning lines used for loading overlays (mirrors admin/chat) */
  @keyframes scanHorizontal {
    0% { left: -1px; }
    100% { left: calc(100% + 1px); }
  }
  @keyframes scanVertical {
    0% { top: -1px; }
    100% { top: calc(100% + 1px); }
  }
`;

type DienstvertragFileRow = {
  id: string
  file_path: string
  file_name: string
  file_ext?: 'pdf' | 'doc' | 'docx' | string
  is_active: boolean
  created_at?: string
  updated_at?: string
  hours_per_week?: number | null
}

// Typing animation component for document names
function TypingDocumentName({ documentName }: { documentName: string }) {
  const [displayText, setDisplayText] = useState('');
  const [isTypingReview, setIsTypingReview] = useState(false);
  const [phase, setPhase] = useState<'typing-name' | 'showing-name' | 'typing-review' | 'showing-review'>('typing-name');

  const reviewText = 'Admins prüfen das Dokument';

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (phase === 'typing-name') {
      // Type out the document name character by character
      if (displayText.length < documentName.length) {
        timeout = setTimeout(() => {
          setDisplayText(documentName.slice(0, displayText.length + 1));
        }, 80);
      } else {
        // Finished typing name, show it for 2 seconds
        timeout = setTimeout(() => {
          setPhase('showing-name');
        }, 100);
      }
    } else if (phase === 'showing-name') {
      // Show the full name for 2 seconds
      timeout = setTimeout(() => {
        setDisplayText('');
        setPhase('typing-review');
        setIsTypingReview(true);
      }, 2000);
    } else if (phase === 'typing-review') {
      // Type out the review text character by character
      if (displayText.length < reviewText.length) {
        timeout = setTimeout(() => {
          setDisplayText(reviewText.slice(0, displayText.length + 1));
        }, 80);
      } else {
        // Finished typing review text, show it for 2 seconds
        timeout = setTimeout(() => {
          setPhase('showing-review');
        }, 100);
      }
    } else if (phase === 'showing-review') {
      // Show the review text for 2 seconds
      timeout = setTimeout(() => {
        setDisplayText('');
        setPhase('typing-name');
        setIsTypingReview(false);
      }, 2000);
    }

    return () => clearTimeout(timeout);
  }, [displayText, phase, documentName]);

  return (
    <span className="text-sm text-gray-600 dark:text-gray-300">
      {displayText}
    </span>
  );
}

export default function ProfilPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "stats">("overview")
  const [isEditingContact, setIsEditingContact] = useState(false)
  const [isEditingClothing, setIsEditingClothing] = useState(false)
  const [isEditingBank, setIsEditingBank] = useState(false)
  const [isEditingPersonal, setIsEditingPersonal] = useState(false)
  const [isEditingAccess, setIsEditingAccess] = useState(false)
  const [isEditingEmployment, setIsEditingEmployment] = useState(false)
  // Saving states for section edits
  const [savingContact, setSavingContact] = useState(false)
  const [savingClothing, setSavingClothing] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [savingPersonal, setSavingPersonal] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
  const [savingEmployment, setSavingEmployment] = useState(false)
  const [showHuebnerPassword, setShowHuebnerPassword] = useState(false)
  const [showDemotoolPassword, setShowDemotoolPassword] = useState(false)
  const [showTmaPassword, setShowTmaPassword] = useState(false)
  const [showBoostAppPassword, setShowBoostAppPassword] = useState(false)
  const [isDocumentsExpanded, setIsDocumentsExpanded] = useState(false)
  const [showDienstvertragPopup, setShowDienstvertragPopup] = useState(false)
  const [showDienstvertragContent, setShowDienstvertragContent] = useState(false)
  const [contractPreviewUrl, setContractPreviewUrl] = useState<string>('')
  const [contractPreviewExt, setContractPreviewExt] = useState<'pdf'|'doc'|'docx'|'unknown'>('unknown')
  const [loadingContractPreview, setLoadingContractPreview] = useState(false)
  const [selectedContractPreviewId, setSelectedContractPreviewId] = useState<string | null>(null)
  const [contractPreviewError, setContractPreviewError] = useState(false)
  const [payrollCountdown, setPayrollCountdown] = useState({ days: 0, hours: 0, minutes: 0, isPayday: false })
  const [showPhotoMenu, setShowPhotoMenu] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [promotorContracts, setPromotorContracts] = useState<DienstvertragFileRow[]>([])

  useEffect(() => {
    if (window.location.hash !== '#dokumente') return

    setIsDocumentsExpanded(true)
    requestAnimationFrame(() => {
      document.getElementById('dokumente')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [])
  const [editableProfile, setEditableProfile] = useState({
    email: "",
    phone: ""
  })
  const [editableClothing, setEditableClothing] = useState({
    height: "",
    size: ""
  })
  const [editableBankData, setEditableBankData] = useState({
    accountHolder: "",
    bankName: "",
    iban: "",
    bic: ""
  })
  const [editableAccessData, setEditableAccessData] = useState({
    huebner_email: "",
    huebner_password: "",
    demotool_email: "",
    demotool_password: "",
    tma_email: "",
    tma_password: "",
    boost_app_email: "",
    boost_app_password: ""
  })
  const [editablePersonalData, setEditablePersonalData] = useState({
    birthday: "",
    socialSecurityNumber: "",
    citizenship: ""
  })
  const [editableWorkingDays, setEditableWorkingDays] = useState<string[]>([])

  // Header profile info (name, address, join date) sourced from DB/auth
  const [headerName, setHeaderName] = useState<string>("")
  const [headerLocation, setHeaderLocation] = useState<string>("")
  const [headerJoinDate, setHeaderJoinDate] = useState<string>("")

  // Access credentials data
  const [accessData, setAccessData] = useState<any>(null)

  // User profile data
  const [userProfileData, setUserProfileData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // User profile picture
  const [userProfile, setUserProfile] = useState({
    avatar: "/placeholder.svg?height=80&width=80"
  })

  const handleEditToggle = async () => {
    if (isEditingContact) {
      try {
        setSavingContact(true)
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          await fetch(`/api/promotors/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: editableProfile.phone, email: editableProfile.email })
          })
        }
      } catch (e) {
        console.error('Failed to save contact data', e)
      } finally {
        setSavingContact(false)
      }
    }
    setIsEditingContact(!isEditingContact)
  }

  const handleClothingEditToggle = async () => {
    if (isEditingClothing) {
      try {
        setSavingClothing(true)
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          await fetch(`/api/promotors/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              height: editableClothing.height,
              clothing_size: editableClothing.size
            })
          })
        }
      } catch (e) {
        console.error('Failed to save clothing data', e)
      } finally {
        setSavingClothing(false)
      }
    }
    setIsEditingClothing(!isEditingClothing)
  }

  const handleBankEditToggle = async () => {
    if (isEditingBank) {
      try {
        setSavingBank(true)
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          await fetch(`/api/promotors/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bank_holder: editableBankData.accountHolder,
              bank_name: editableBankData.bankName,
              bank_iban: editableBankData.iban,
              bank_bic: editableBankData.bic
            })
          })
        }
      } catch (e) {
        console.error('Failed to save bank data', e)
      } finally {
        setSavingBank(false)
      }
    }
    setIsEditingBank(!isEditingBank)
  }

  const handlePersonalEditToggle = async () => {
    if (isEditingPersonal) {
      // Save the data when exiting edit mode
      try {
        setSavingPersonal(true)
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const response = await fetch(`/api/promotors/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              birth_date: editablePersonalData.birthday,
              social_security_number: editablePersonalData.socialSecurityNumber,
              citizenship: editablePersonalData.citizenship,
            }),
          })
          if (!response.ok) throw new Error('Persönliche Daten konnten nicht gespeichert werden')

          // Refresh the data
          await loadUserProfile()
        }
      } catch (e) {
        console.error('Failed to save personal data', e)
      } finally {
        setSavingPersonal(false)
      }
    }
    setIsEditingPersonal(!isEditingPersonal)
  }

  const handleAccessEditToggle = async () => {
    if (isEditingAccess) {
      try {
        setSavingAccess(true)
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const response = await fetch(`/api/promotors/${user.id}/access-credentials`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editableAccessData),
          })
          if (!response.ok) throw new Error('Zugangsdaten konnten nicht gespeichert werden')

          // Refresh the data
          await loadAccessCredentials()
        }
      } catch (e) {
        console.error('Failed to save access credentials', e)
      } finally {
        setSavingAccess(false)
      }
    }
    setIsEditingAccess(!isEditingAccess)
  }

  const handleEmploymentEditToggle = async () => {
    if (isEditingEmployment) {
      try {
        setSavingEmployment(true)
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const response = await fetch(`/api/promotors/${user.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ working_days: editableWorkingDays }),
          })
          if (!response.ok) throw new Error('Arbeitstage konnten nicht gespeichert werden')

          // Refresh the data
          await loadUserProfile()
        }
      } catch (e) {
        console.error('Failed to save working days', e)
      } finally {
        setSavingEmployment(false)
      }
    }
    setIsEditingEmployment(!isEditingEmployment)
  }

  const loadAccessCredentials = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const response = await fetch(`/api/promotors/${user.id}/access-credentials`, { cache: 'no-store' })
        if (!response.ok) throw new Error('Zugangsdaten konnten nicht geladen werden')
        const payload = await response.json()
        const data = payload.credentials

        if (data) {
          setAccessData(data)
          setEditableAccessData({
            huebner_email: data.huebner_email || "",
            huebner_password: data.huebner_password || "",
            demotool_email: data.demotool_email || "",
            demotool_password: data.demotool_password || "",
            tma_email: data.tma_email || "",
            tma_password: data.tma_password || "",
            boost_app_email: data.boost_app_email || "",
            boost_app_password: data.boost_app_password || ""
          })
        } else {
          setAccessData(null)
        }
      }
    } catch (e) {
      console.error('Failed to load access credentials', e)
    }
  }

  const loadUserProfile = async () => {
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data, error } = await supabase
          .from('promotor_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error
        }

        if (data) {
          setUserProfileData(data)

          // Load profile picture if available
          if (data.profile_picture_url) {
            setUserProfile({ avatar: data.profile_picture_url })
          }

          setEditablePersonalData({
            birthday: data.birth_date || "",
            socialSecurityNumber: data.social_security_number || "",
            citizenship: data.citizenship || ""
          })
          setEditableWorkingDays(Array.isArray(data.working_days) ? data.working_days : [])
        }
      }
    } catch (e) {
      console.error('Failed to load user profile', e)
    }
  }

  const maskIban = (iban: string) => {
    if (iban.length <= 5) return iban
    return "x".repeat(iban.length - 5) + iban.slice(-5)
  }

  const togglePasswordVisibility = (type: 'huebner' | 'demotool' | 'tma' | 'boost_app') => {
    if (type === 'huebner') {
      setShowHuebnerPassword(true)
      setTimeout(() => setShowHuebnerPassword(false), 7000)
    } else if (type === 'demotool') {
      setShowDemotoolPassword(true)
      setTimeout(() => setShowDemotoolPassword(false), 7000)
    } else if (type === 'tma') {
      setShowTmaPassword(true)
      setTimeout(() => setShowTmaPassword(false), 7000)
    } else if (type === 'boost_app') {
      setShowBoostAppPassword(true)
      setTimeout(() => setShowBoostAppPassword(false), 7000)
    }
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setUploadingPhoto(true)
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete old profile picture first
      const filePath = `${user.id}/profile.jpg`
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

      const updateResponse = await fetch(`/api/promotors/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_picture_url: urlWithTimestamp }),
      })
      if (!updateResponse.ok) throw new Error('Profilbild konnte nicht gespeichert werden')

      // Refresh page to show new profile picture
      alert('Profilfoto erfolgreich hochgeladen!')
      window.location.reload()
    } catch (error: any) {
      console.error('Photo upload error:', error)
      alert(error.message || 'Fehler beim Hochladen des Fotos')
    } finally {
      setUploadingPhoto(false)
      setShowPhotoMenu(false)
    }
  }

  const handleDienstvertragSelect = async (contractId?: string) => {
    if (!userId) return
    const targetContract = contractId
      ? promotorContracts.find((c) => c.id === contractId)
      : promotorContracts.find((c) => c.is_active) || promotorContracts[0]
    const targetContractId = targetContract?.id
    if (!targetContractId) return

    setSelectedContractPreviewId(targetContractId)
    setContractPreviewError(false)
    setShowDienstvertragPopup(false)
    setLoadingContractPreview(true)
    setShowDienstvertragContent(true)

    try {
      const res = await fetch(`/api/promotors/${userId}/contracts/signed-url?contract_id=${targetContractId}`, {
        cache: 'no-store'
      });
      const data = await res.json();
      if (data?.url) {
        const extFromPath = String(targetContract.file_path || targetContract.file_name || '').split('.').pop()?.toLowerCase();
        const ext = String(targetContract.file_ext || extFromPath || '').toLowerCase();
        setContractPreviewExt(ext === 'pdf' || ext === 'doc' || ext === 'docx' ? ext : 'unknown');
        const cacheBustedUrl = `${data.url}${String(data.url).includes('?') ? '&' : '?'}cb=${Date.now()}`;
        setContractPreviewUrl(cacheBustedUrl);
        setContractPreviewError(false)
      } else {
        throw new Error(data?.error || 'Vorschau konnte nicht geladen werden');
      }
    } catch (error) {
      console.error('Error loading contract preview:', error);
      setContractPreviewUrl('')
      setContractPreviewError(true)
    } finally {
      setLoadingContractPreview(false);
    }
  }

  const refreshContractPreview = async () => {
    if (!userId || !selectedContractPreviewId) return
    const targetContract = promotorContracts.find((c) => c.id === selectedContractPreviewId)
    if (!targetContract) return

    setLoadingContractPreview(true)
    try {
      const res = await fetch(`/api/promotors/${userId}/contracts/signed-url?contract_id=${selectedContractPreviewId}`, {
        cache: 'no-store'
      })
      const data = await res.json()
      if (!data?.url) throw new Error(data?.error || 'Vorschau konnte nicht geladen werden')

      const extFromPath = String(targetContract.file_path || targetContract.file_name || '').split('.').pop()?.toLowerCase()
      const ext = String(targetContract.file_ext || extFromPath || '').toLowerCase()
      setContractPreviewExt(ext === 'pdf' || ext === 'doc' || ext === 'docx' ? ext : 'unknown')
      const cacheBustedUrl = `${data.url}${String(data.url).includes('?') ? '&' : '?'}cb=${Date.now()}`
      setContractPreviewUrl(cacheBustedUrl)
      setContractPreviewError(false)
    } catch (error) {
      console.error('Error refreshing contract preview:', error)
      setContractPreviewError(true)
    } finally {
      setLoadingContractPreview(false)
    }
  }

  // Promotor documents state (live)
  const [userId, setUserId] = useState<string | null>(null)
  const [needsWorkPermit, setNeedsWorkPermit] = useState<boolean>(false)
  const [documents, setDocuments] = useState<Array<{ id: number; name: string; status: 'missing'|'pending'|'approved'; required: boolean }>>([
    { id: 1, name: 'Pass', status: 'missing', required: true },
    { id: 2, name: 'Führerschein', status: 'missing', required: false },
    { id: 3, name: 'Strafregister Bescheinigung', status: 'missing', required: true },
    { id: 4, name: 'Staatsbürgerschaftsnachweis', status: 'missing', required: false },
    { id: 5, name: 'Arbeitserlaubnis', status: 'missing', required: false },
    { id: 6, name: 'Zusätzliche Dokumente', status: 'missing', required: false },
  ])

  const mapDocNameToType = (name: string): string => {
    if (name === 'Pass') return 'passport'
    if (name === 'Führerschein') return 'fuehrerschein'
    if (name === 'Staatsbürgerschaftsnachweis') return 'citizenship'
    if (name.startsWith('Strafregister')) return 'strafregister'
    if (name === 'Arbeitserlaubnis') return 'arbeitserlaubnis'
    return 'additional'
  }

  const refreshDocuments = async (uid: string) => {
    try {
      // profile for needsWorkPermit and drivingLicense
      const profRes = await fetch(`/api/promotors/${uid}`)
      const profJson = await profRes.json()
      const needsWP = !!profJson?.profile?.needs_work_permit
      const hasDrivingLicense = !!profJson?.application?.drivingLicense
      setNeedsWorkPermit(needsWP)

      const res = await fetch(`/api/promotors/${uid}/documents`, { cache: 'no-store' })
      const json = await res.json()
      const rows: Array<{ doc_type: string; status: string; file_path?: string }> = Array.isArray(json.documents) ? json.documents : []
      const map = new Map(rows.map(r => [r.doc_type, r.status]))
      let nextDocs = documents
      nextDocs = nextDocs.map(d => {
        const type = mapDocNameToType(d.name)
        let status: 'missing'|'pending'|'approved' = 'missing'
        const st = map.get(type)
        if (st === 'approved') status = 'approved'
        else if (st === 'uploaded') status = 'pending'
        else status = 'missing' // No DB entry or any other status = missing
        // Conditional requirements based on application data
        let required = d.required
        if (d.name === 'Arbeitserlaubnis') required = needsWP
        if (d.name === 'Führerschein') required = hasDrivingLicense
        return { ...d, status, required }
      })

      // Fallback: if a file exists in storage for a doc but NO DB row exists, keep it pending
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: items } = await supabase.storage.from('documents').list(`${uid}`)
        const names = (items || []).map((i: any) => i.name as string)
        nextDocs = nextDocs.map(d => {
          // Only apply fallback if status is 'missing' AND there's no DB entry for this doc type
          if (d.status !== 'missing') return d
          const t = mapDocNameToType(d.name)
          const hasDbEntry = map.has(t) // Check if there's any DB entry (approved/rejected/uploaded)
          if (hasDbEntry) return d // Don't override if DB has an entry (even if rejected)
          const hasFile = names.some((n: string) => n.startsWith(`${t}.`))
          return hasFile ? { ...d, status: 'pending' } : d
        })
      } catch {}

      setDocuments(nextDocs)
    } catch {}
  }

  useEffect(() => {
    (async () => {
      setIsLoading(true)
      try {
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.id) {
          setUserId(user.id)
          // header join date from auth
          try {
            if (user.created_at) {
              const jd = new Date(user.created_at).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
              setHeaderJoinDate(jd)
            }
          } catch {}
          // load access credentials
          await loadAccessCredentials()

          // load user profile data
          await loadUserProfile()

          // load display name from user_profiles with auth metadata fallback
          try {
            const { data: up } = await supabase
              .from('user_profiles')
              .select('display_name')
              .eq('user_id', user.id)
              .maybeSingle()
            const dn = (up?.display_name && String(up.display_name).trim()) || user.user_metadata?.display_name || user.user_metadata?.full_name || ''
            setHeaderName(dn)
          } catch {}
          // load profile to prefill bank data if present
          try {
            const r = await fetch(`/api/promotors/${user.id}`)
            const j = await r.json()
            const p = j?.profile || {}
            const app = j?.application || {}
            // header location from address fields (profile first, then application)
            try {
              const addr = p.address ?? app.address
              const plz = p.postal_code ?? app.postalCode ?? app.postal_code
              const city = p.city ?? app.city
              const loc = [addr, [plz, city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
              setHeaderLocation(loc)
            } catch {}
            // contact data
            setEditableProfile({
              email: (app?.email || user.email || ''),
              phone: p.phone || ''
            })
            // clothing
            setEditableClothing({
              height: p.height || app.height || '',
              size: p.clothing_size || app.clothingSize || app.clothing_size || app.clothingsize || ''
            })
            // personal data now loaded from loadUserProfile(), don't override here
            setEditableBankData(prev => ({
              accountHolder: p.bank_holder || '',
              bankName: p.bank_name || '',
              iban: p.bank_iban || '',
              bic: p.bank_bic || ''
            }))
          } catch {}
          await refreshDocuments(user.id)
          await loadPromotorContracts(user.id)
        }
      } catch {}
      finally { setIsLoading(false) }
    })()
  }, [])

  const loadPromotorContracts = async (uid: string) => {
    try {
      const res = await fetch(`/api/promotors/${uid}/contracts`, { cache: 'no-store' });
      const json = await res.json();
      const contracts = json.contracts || [];
      setPromotorContracts(contracts);
    } catch (e) {
      console.error('Failed to load promotor contracts:', e);
      setPromotorContracts([]);
    }
  };

  // Refresh contracts when opening the modal
  useEffect(() => {
    if (!showDienstvertragPopup || !userId) return;
    let cancelled = false;
    const run = async () => {
      // Quick initial refresh
      await loadPromotorContracts(userId);
      // Then a short follow-up refresh after 2s to catch fast admin actions
      setTimeout(async () => {
        if (cancelled) return;
        await loadPromotorContracts(userId);
      }, 2000);
    };
    run();
    return () => { cancelled = true };
  }, [showDienstvertragPopup, userId])

  const visibleDocuments = isDocumentsExpanded ? documents : documents.slice(0, 3)

  const handleViewDocument = async (documentName: string) => {
    if (!userId) return
    const doc_type = mapDocNameToType(documentName)
    const res = await fetch(`/api/promotors/${userId}/documents/signed-url?doc_type=${encodeURIComponent(doc_type)}`)
    const json = await res.json()
    if (json?.url) window.open(json.url, '_blank')
  }

  const handleUploadDocument = async (documentName: string) => {
    const doc_type = mapDocNameToType(documentName)
    // pick file
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,application/pdf'
    input.style.display = 'none'
    document.body.appendChild(input)
    input.onchange = async () => {
      const file = input.files?.[0]
      document.body.removeChild(input)
      if (!file) return
      // ensure we have user id at selection time (client auth)
      let uid = userId
      const supabase = createSupabaseBrowserClient()
      if (!uid) {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          if (user?.id) { setUserId(user.id); uid = user.id }
        } catch {}
      }
      if (!uid) return
      const ext = (file.name.split('.').pop() || 'pdf').toLowerCase()
      try {
        // Immediately reflect submitting state
        setDocuments(prev => prev.map(d => d.name === documentName ? { ...d, status: 'pending' } : d))
        // get canonical path
        const up = await fetch(`/api/promotors/${uid}/documents/upload-url`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_type, file_ext: ext })
        })
        const upj = await up.json()
        const path = upj?.path
        const token = upj?.token
        if (!path || !token) {
          console.error('Document upload could not be prepared')
          return
        }
        const { error: upErr } = await supabase.storage.from('documents').uploadToSignedUrl(path, token, file)
        if (upErr) {
          console.error('Storage upload error:', upErr)
          throw upErr
        }
        const confirmRes = await fetch(`/api/promotors/${uid}/documents/confirm`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_type, path })
        })
        const confirmJson = await confirmRes.json()
        // refresh from server to be safe (should return 'uploaded' -> pending in UI)
        await refreshDocuments(uid)
      } catch (e) {
        console.error('Document upload error:', e)
        // revert to missing on error
        setDocuments(prev => prev.map(d => d.name === documentName ? { ...d, status: 'missing' } : d))
      }
    }
    input.click()
  }

  // Payroll countdown logic
  useEffect(() => {
    const calculatePayrollCountdown = () => {
      const now = new Date()
      const currentDay = now.getDate()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // If today is the 15th, show payday message
      if (currentDay === 15) {
        setPayrollCountdown({ days: 0, hours: 0, minutes: 0, isPayday: true })
        return
      }

      // Calculate next payroll date (15th of current or next month)
      let nextPayrollDate: Date
      if (currentDay < 15) {
        // Next payroll is 15th of current month
        nextPayrollDate = new Date(currentYear, currentMonth, 15)
      } else {
        // Next payroll is 15th of next month
        nextPayrollDate = new Date(currentYear, currentMonth + 1, 15)
      }

      const timeDiff = nextPayrollDate.getTime() - now.getTime()

      if (timeDiff > 0) {
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))

        setPayrollCountdown({ days, hours, minutes, isPayday: false })
      }
    }

    // Calculate immediately
    calculatePayrollCountdown()

    // Update every minute
    const interval = setInterval(calculatePayrollCountdown, 60000)

    return () => clearInterval(interval)
  }, [])

  // Statistics state (replaces mock)
  const [stats, setStats] = useState({
    totalEinsaetze: 0,
    missedEinsaetzeDueSickness: 0,
    buddyTage: 0,
    completedSchulungen: 0,
    completedQuizzes: 0,
    attendanceRate: 0
  })

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me/profile-stats', { cache: 'no-store' })
        const data = await res.json().catch(() => ({}))
        if (res.ok) {
          const totalEinsaetze = Number(data?.completed || 0)
          const missedEinsaetzeDueSickness = Number(data?.krankenstand || 0)
          const buddyTage = Number(data?.buddyDays || 0)
          const attendanceRate = Number(data?.attendanceRate || 0)
          setStats(s => ({
            ...s,
            totalEinsaetze,
            missedEinsaetzeDueSickness,
            buddyTage,
            attendanceRate
          }))
        }
      } catch {}
    })()
  }, [])

  return (
    <div className="space-y-6">
      {/* Skeleton animation styles */}
      <style dangerouslySetInnerHTML={{ __html: skeletonStyles }} />
      {/* Profile Header */}
      <Card className="border-none shadow-md bg-white dark:bg-gray-900">
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Avatar
                className="h-20 w-20 border-4 border-blue-200 dark:border-blue-900 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  // Only show menu if no profile picture uploaded yet
                  if (!userProfile.avatar || userProfile.avatar.includes('placeholder')) {
                    setShowPhotoMenu(!showPhotoMenu);
                  }
                }}
              >
                <AvatarImage src={userProfile.avatar} alt={headerName || 'Promotor'} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-700 text-lg font-medium">
                  JP
                </AvatarFallback>
              </Avatar>

              {/* Photo Menu - only show if no picture uploaded */}
              {showPhotoMenu && (!userProfile.avatar || userProfile.avatar.includes('placeholder')) && (
                <div className="absolute left-24 top-0 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
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
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {isLoading ? (
                  <div className="h-7 w-48 rounded-md animate-skeleton-fade" />
                ) : (
                  headerName || 'Promotor'
                )}
              </h1>
              <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                <MapPin className="h-4 w-4 mr-1" />
                {isLoading ? (
                  <div className="h-4 w-64 rounded-md animate-skeleton-fade" />
                ) : headerLocation}
              </div>
              <div className="flex items-center mt-1 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-4 w-4 mr-1" />
                {isLoading ? (
                  <div className="h-4 w-32 rounded-md animate-skeleton-fade" />
                ) : (
                  <>Dabei seit {headerJoinDate}</>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="relative flex space-x-2 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
        {/* Sliding Background Indicator */}
        <div
          className={`absolute top-1.5 bottom-1.5 bg-white dark:bg-gray-700 shadow-sm border border-gray-200/50 dark:border-gray-600/50 rounded-lg transition-all duration-500 ease-in-out ${
            activeTab === "overview"
              ? "left-1.5 right-[calc(50%+0.25rem)]"
              : "left-[calc(50%+0.25rem)] right-1.5"
          }`}
        />

        <Button
          variant="ghost"
          className={`flex-1 rounded-lg transition-all duration-300 font-medium text-sm relative z-10 hover:bg-transparent focus:bg-transparent active:bg-transparent ${
            activeTab === "overview"
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent"
              : "text-gray-600 dark:text-gray-400"
          }`}
          onClick={() => setActiveTab("overview")}
        >
          Übersicht
        </Button>
        <Button
          variant="ghost"
          className={`flex-1 rounded-lg transition-all duration-300 font-medium text-sm relative z-10 hover:bg-transparent focus:bg-transparent active:bg-transparent ${
            activeTab === "stats"
              ? "bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent"
              : "text-gray-600 dark:text-gray-400"
          }`}
          onClick={() => setActiveTab("stats")}
        >
          Statistiken
        </Button>
      </div>

            {/* Tab Content */}
      <div className="relative overflow-hidden">
        {/* Overview Tab */}
        <div className={`transition-all duration-500 ease-in-out ${
          activeTab === "overview"
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 absolute top-0 left-0 w-full"
        }`}>
          <div className="space-y-4 px-2">
                      {/* Contact Information */}
          <div className={`transition-all duration-300 rounded-lg ${
            isEditingContact
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 p-[2px]"
              : "p-0"
          }`}>
            <Card className={`border-none bg-white dark:bg-gray-900 h-full ${
              isEditingContact ? "shadow-lg shadow-blue-500/20" : "shadow-lg shadow-blue-500/20"
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Contact className="h-5 w-5 mr-2 text-blue-500" />
                    Kontaktdaten
                  </div>
                                  <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                  onClick={handleEditToggle}
                  disabled={savingContact}
                >
                  {isEditingContact ? (
                    savingContact ? (
                      <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                    ) : (
                    <Check className="h-1.5 w-1.5 text-green-500" />
                    )
                  ) : (
                    <Edit2 className="h-1.5 w-1.5 text-gray-400/60 hover:text-gray-600/80 dark:hover:text-gray-300/80" />
                  )}
                </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {isEditingContact ? (
                    <Input
                      type="email"
                      value={editableProfile.email}
                      onChange={(e) => setEditableProfile(prev => ({ ...prev, email: e.target.value }))}
                      className="text-sm !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all placeholder:text-gray-400"
                      placeholder="E-Mail eingeben..."
                    />
                  ) : (
                    isLoading ? (
                      <div className="h-4 w-56 rounded-md animate-skeleton-fade" />
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-300">{editableProfile.email}</span>
                    )
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  {isEditingContact ? (
                    <Input
                      type="tel"
                      value={editableProfile.phone}
                      onChange={(e) => setEditableProfile(prev => ({ ...prev, phone: e.target.value }))}
                      className="text-sm !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all placeholder:text-gray-400"
                      placeholder="Telefonnummer eingeben..."
                    />
                  ) : (
                    isLoading ? (
                      <div className="h-4 w-40 rounded-md animate-skeleton-fade" />
                    ) : (
                      <span className="text-sm text-gray-600 dark:text-gray-300">{editableProfile.phone}</span>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

                      {/* Clothing Size Information */}
          <div className={`transition-all duration-300 rounded-lg ${
            isEditingClothing
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 p-[2px]"
              : "p-0"
          }`}>
                         <Card className="border-none shadow-lg shadow-purple-500/20 bg-white dark:bg-gray-900 h-full">
               <CardHeader className="pb-3">
                 <CardTitle className="text-lg flex items-center justify-between">
                   <div className="flex items-center">
                     <Ruler className="h-5 w-5 mr-2 text-purple-500" />
                    Kleidergröße
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={handleClothingEditToggle}
                    disabled={savingClothing}
                  >
                    {isEditingClothing ? (
                      savingClothing ? (
                        <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                      ) : (
                      <Check className="h-1.5 w-1.5 text-green-500" />
                      )
                    ) : (
                      <Edit2 className="h-1.5 w-1.5 text-gray-400/60 hover:text-gray-600/80 dark:hover:text-gray-300/80" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Körpergröße
                    </p>
                    {isEditingClothing ? (
                      <div className="flex items-center justify-center">
                        <Input
                          type="number"
                          value={editableClothing.height}
                          onChange={(e) => setEditableClothing(prev => ({ ...prev, height: e.target.value }))}
                          className="text-center text-xl font-semibold !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all w-20 mx-auto [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                          placeholder="178"
                        />
                        <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 ml-1">cm</span>
                      </div>
                    ) : (
                      isLoading ? (
                        <div className="h-7 w-24 rounded-md mx-auto animate-skeleton-fade" />
                      ) : (
                        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                          {editableClothing.height} cm
                        </p>
                      )
                    )}
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Kleidergröße
                    </p>
                    {isEditingClothing ? (
                      <Input
                        type="text"
                        value={editableClothing.size}
                        onChange={(e) => setEditableClothing(prev => ({ ...prev, size: e.target.value }))}
                        className="text-center text-xl font-semibold !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all w-16 mx-auto"
                        placeholder="L"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-7 w-16 rounded-md mx-auto animate-skeleton-fade" />
                      ) : (
                        <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                          {editableClothing.size}
                        </p>
                      )
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-300">Arbeitskleidung</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Erhalten
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Dienstvertrag Card */}
            {(() => {
              const hasActiveContract = promotorContracts.some((c: any) => c.is_active)
              return (
            <Card
              className="relative border-none shadow-lg shadow-blue-500/30 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-600 h-24 flex items-center justify-center cursor-pointer hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-300 group"
              onClick={() => setShowDienstvertragPopup(true)}
            >
              {hasActiveContract && (
                <div className="absolute top-2 right-2 bg-white/20 rounded-full p-1">
                  <Check className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className="text-center">
                <FileSignature className="h-6 w-6 text-white mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-white font-semibold text-xs">Dienstvertrag</h3>
              </div>
            </Card>
              )
            })()}

            {/* Sedcard Card */}
            <Card className="border-none shadow-lg shadow-purple-500/30 bg-gradient-to-r from-purple-400 via-purple-500 to-pink-500 h-24 flex items-center justify-center cursor-pointer hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-300 group">
              <div className="text-center">
                <IdCard className="h-6 w-6 text-white mx-auto mb-2 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-white font-semibold text-xs">Sedcard</h3>
              </div>
            </Card>
          </div>

                      {/* Files & Documents */}
          <Card id="dokumente" className="scroll-mt-6 border-none shadow-lg shadow-green-500/20 bg-white dark:bg-gray-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <FileText className="h-5 w-5 mr-2 text-green-500" />
                Dokumente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {visibleDocuments.map((document) => (
                <div key={document.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {document.status === "pending" ? (
                      <TypingDocumentName documentName={document.name} />
                    ) : (
                      <>
                        <span className="text-sm text-gray-600 dark:text-gray-300">{document.name}</span>
                        {!document.required && (
                          <span className="text-xs text-gray-400 italic">(optional)</span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {(document.status === "approved" || document.status === "pending") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-transparent transition-all duration-300 opacity-40 hover:opacity-80"
                        onClick={() => handleViewDocument(document.name)}
                      >
                        <Eye className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
                      </Button>
                    )}
                    {document.status === "missing" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 p-0 hover:bg-transparent transition-all duration-300 opacity-40 hover:opacity-80"
                        onClick={() => handleUploadDocument(document.name)}
                      >
                        <Upload className="h-3 w-3 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300" />
                      </Button>
                    )}
                    {document.status === "approved" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : document.status === "pending" ? (
                      <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
            {documents.length > 3 && (
              <CardFooter className="pt-2 pb-3 flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                  onClick={() => setIsDocumentsExpanded(!isDocumentsExpanded)}
                >
                  {isDocumentsExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1 text-purple-500" />
                      Weniger anzeigen
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1 text-purple-500" />
                      Alle anzeigen
                    </>
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Employment Information */}
          <div className={`transition-all duration-300 rounded-lg ${
            isEditingEmployment
              ? "bg-gradient-to-r from-orange-500 to-amber-600 p-[2px]"
              : "p-0"
          }`}>
            <Card className="relative border-none shadow-lg shadow-orange-500/20 bg-white dark:bg-gray-900 overflow-hidden h-full">
              {/* Minimal countdown chip in the top-right corner with subtle label */}
              {!payrollCountdown.isPayday && (
                <div className="absolute top-2.5 right-3 flex flex-col items-end gap-1">
                  <span className="text-[10px] leading-none text-gray-500/70 dark:text-gray-400/70">Nächstes Gehalt in</span>
                  <div className="px-2 py-0.5 rounded-full border border-orange-200/60 dark:border-orange-900/50 bg-orange-50/70 dark:bg-orange-900/20 backdrop-blur-sm shadow-sm flex items-center gap-1 text-[10px] font-mono tabular-nums text-orange-600 dark:text-orange-300">
                    <Clock className="h-3 w-3 opacity-70" />
                    <span>{payrollCountdown.days}d</span>
                    <span>·</span>
                    <span>{String(payrollCountdown.hours).padStart(2, '0')}h</span>
                    <span>·</span>
                    <span>{String(payrollCountdown.minutes).padStart(2, '0')}m</span>
                        </div>
                      </div>
                    )}
              {payrollCountdown.isPayday && (
                <div className="absolute top-3 right-3">
                  <div className="px-2.5 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-900/50 bg-emerald-50/70 dark:bg-emerald-900/20 backdrop-blur-sm shadow-sm text-[10px] font-medium text-emerald-700 dark:text-emerald-300">Gehalt ist da 🎉</div>
                  </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-orange-500" />
                    Anstellung
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={handleEmploymentEditToggle}
                    disabled={savingEmployment}
                  >
                    {isEditingEmployment ? (
                      savingEmployment ? (
                        <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                      ) : (
                      <Check className="h-1.5 w-1.5 text-green-500" />
                      )
                    ) : (
                      <Edit2 className="h-1.5 w-1.5 text-gray-400/60 hover:text-gray-600/80 dark:hover:text-gray-300/80" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(() => {
                  const activeContract = promotorContracts.find(c => c.is_active);
                  const hasActive = !!activeContract;
                  const hoursPerWeek = userProfileData?.contract_hours_per_week ?? null;
                  const statusText = hasActive ? 'Dienstvertrag hinterlegt' : null;

                  return (
                    <>
                      {/* Employment Type */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                          Anstellungs Art
                        </label>
                        <div>
                          {isLoading ? (
                            <div className="h-6 w-24 rounded-full animate-skeleton-fade" />
                          ) : hasActive ? (
                            <Badge variant="secondary" className="px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700 border border-emerald-200 shadow-sm dark:from-emerald-900/20 dark:to-green-900/20 dark:text-emerald-300 dark:border-emerald-900/40">
                              Aktiv
                            </Badge>
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">Noch kein Vertrag eingespielt</p>
                          )}
                        </div>
                      </div>

                      {/* Weekly Hours */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                          Wochenstunden
                        </label>
                        {isLoading ? (
                          <div className="h-5 w-8 rounded-md animate-skeleton-fade" />
                        ) : hoursPerWeek !== null ? (
                          <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {hoursPerWeek}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Noch kein Vertrag eingespielt</p>
                        )}
                      </div>

                      {/* Employment Status */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                          Status
                        </label>
                        {isLoading ? (
                          <div className="h-4 w-32 rounded-md animate-skeleton-fade" />
                        ) : hasActive ? (
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {statusText}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-400">Noch kein Vertrag eingespielt</p>
                        )}
                      </div>

                      {/* Working Days */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                          Arbeitstage
                        </label>
                        {isEditingEmployment ? (
                          <div className="space-y-2">
                            {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => (
                              <label key={day} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editableWorkingDays.includes(day)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setEditableWorkingDays(prev => [...prev, day])
                                    } else {
                                      setEditableWorkingDays(prev => prev.filter(d => d !== day))
                                    }
                                  }}
                                  className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">{day}</span>
                              </label>
                            ))}
                          </div>
                        ) : (
                          isLoading ? (
                            <div className="flex gap-1.5">
                              <div className="h-6 w-8 rounded-full animate-skeleton-fade" />
                              <div className="h-6 w-8 rounded-full animate-skeleton-fade" />
                            </div>
                          ) : (
                            <div className="flex gap-1.5 flex-wrap">
                              {editableWorkingDays.map(day => (
                                <span key={day} className="px-2.5 py-0.5 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 text-gray-700 border border-gray-200 shadow-sm text-xs font-medium dark:from-gray-800/40 dark:to-gray-800/10 dark:text-gray-200 dark:border-gray-700">
                                  {day}
                                </span>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          {/* Bank Data Information */}
          <div className={`transition-all duration-300 rounded-lg ${
            isEditingBank
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 p-[2px]"
              : "p-0"
          }`}>
            <Card className="border-none shadow-lg shadow-blue-500/20 bg-white dark:bg-gray-900 h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2 text-blue-500" />
                    Bankdaten
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={handleBankEditToggle}
                    disabled={savingBank}
                  >
                    {isEditingBank ? (
                      savingBank ? (
                        <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                      ) : (
                      <Check className="h-1.5 w-1.5 text-green-500" />
                      )
                    ) : (
                      <Edit2 className="h-1.5 w-1.5 text-gray-400/60 hover:text-gray-600/80 dark:hover:text-gray-300/80" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Account Holder */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      Kontoinhaber
                    </label>
                    {isEditingBank ? (
                      <Input
                        type="text"
                        value={editableBankData.accountHolder}
                        onChange={(e) => setEditableBankData(prev => ({ ...prev, accountHolder: e.target.value }))}
                        className="text-sm !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all"
                        placeholder="Vollständiger Name"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-4 w-48 rounded-md animate-skeleton-fade" />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {editableBankData.accountHolder}
                        </p>
                      )
                    )}
                  </div>

                  {/* Bank Name */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      Bankname
                    </label>
                    {isEditingBank ? (
                      <Input
                        type="text"
                        value={editableBankData.bankName}
                        onChange={(e) => setEditableBankData(prev => ({ ...prev, bankName: e.target.value }))}
                        className="text-sm !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all"
                        placeholder="Name der Bank"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-4 w-40 rounded-md animate-skeleton-fade" />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {editableBankData.bankName}
                        </p>
                      )
                    )}
                  </div>

                  {/* IBAN */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      IBAN
                    </label>
                    {isEditingBank ? (
                      <Input
                        type="text"
                        value={editableBankData.iban}
                        onChange={(e) => setEditableBankData(prev => ({ ...prev, iban: e.target.value }))}
                        className="text-sm font-mono !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all"
                        placeholder="AT00 0000 0000 0000 0000"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-4 w-64 rounded-md animate-skeleton-fade" />
                      ) : (
                        <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 tracking-wider">
                          {editableBankData.iban ? maskIban(editableBankData.iban) : ''}
                        </p>
                      )
                    )}
                  </div>

                  {/* BIC */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      BIC
                    </label>
                    {isEditingBank ? (
                      <Input
                        type="text"
                        value={editableBankData.bic}
                        onChange={(e) => setEditableBankData(prev => ({ ...prev, bic: e.target.value }))}
                        className="text-sm font-mono !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all"
                        placeholder="BANKCODE"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-4 w-32 rounded-md animate-skeleton-fade" />
                      ) : (
                        <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 tracking-wider">
                          {editableBankData.bic}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Personal Information */}
          <div className={`transition-all duration-300 rounded-lg ${
            isEditingPersonal
              ? "bg-gradient-to-r from-blue-500 to-indigo-600 p-[2px]"
              : "p-0"
          }`}>
                         <Card className="border-none shadow-lg shadow-green-500/20 bg-white dark:bg-gray-900 h-full">
               <CardHeader className="pb-3">
                 <CardTitle className="text-lg flex items-center justify-between">
                   <div className="flex items-center">
                     <User className="h-5 w-5 mr-2 text-green-500" />
                    Sonstige
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={handlePersonalEditToggle}
                    disabled={savingPersonal}
                  >
                    {isEditingPersonal ? (
                      savingPersonal ? (
                        <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                      ) : (
                      <Check className="h-1.5 w-1.5 text-green-500" />
                      )
                    ) : (
                      <Edit2 className="h-1.5 w-1.5 text-gray-400/60 hover:text-gray-600/80 dark:hover:text-gray-300/80" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  {/* Birthday */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      Geburtstag
                    </label>
                    {isEditingPersonal ? (
                      <Input
                        type="text"
                        value={editablePersonalData.birthday}
                        onChange={(e) => setEditablePersonalData(prev => ({ ...prev, birthday: e.target.value }))}
                        className="text-sm !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all"
                        placeholder="TT.MM.JJJJ"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-4 w-28 rounded-md animate-skeleton-fade" />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {editablePersonalData.birthday}
                        </p>
                      )
                    )}
                  </div>

                  {/* Social Security Number */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      SV Nummer
                    </label>
                    {isEditingPersonal ? (
                      <Input
                        type="text"
                        value={editablePersonalData.socialSecurityNumber}
                        onChange={(e) => setEditablePersonalData(prev => ({ ...prev, socialSecurityNumber: e.target.value }))}
                        className="text-sm font-mono !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all"
                        placeholder="1234 DDMMYY"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-4 w-40 rounded-md animate-skeleton-fade" />
                      ) : (
                        <p className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 tracking-wider">
                          {editablePersonalData.socialSecurityNumber}
                        </p>
                      )
                    )}
                  </div>

                  {/* Citizenship */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                      Staatsbürgerschaft
                    </label>
                    {isEditingPersonal ? (
                      <Input
                        type="text"
                        value={editablePersonalData.citizenship}
                        onChange={(e) => setEditablePersonalData(prev => ({ ...prev, citizenship: e.target.value }))}
                        className="text-sm !border-0 !ring-0 !ring-offset-0 focus-visible:!ring-0 focus-visible:!ring-offset-0 bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-700 transition-all"
                        placeholder="Land der Staatsbürgerschaft"
                      />
                    ) : (
                      isLoading ? (
                        <div className="h-4 w-48 rounded-md animate-skeleton-fade" />
                      ) : (
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {editablePersonalData.citizenship}
                        </p>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Access Credentials Card */}
            <Card className={`border-none bg-white dark:bg-gray-900 h-full shadow-lg shadow-yellow-500/20 ${
              isEditingAccess ? "ring-2 ring-yellow-500/30" : ""
            }`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Key className="h-5 w-5 mr-2 text-yellow-500" />
                    Zugänge
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
                    onClick={handleAccessEditToggle}
                    disabled={savingAccess}
                  >
                    {isEditingAccess ? (
                      savingAccess ? (
                        <Loader2 className="h-3 w-3 text-green-500 animate-spin" />
                      ) : (
                      <Check className="h-1.5 w-1.5 text-green-500" />
                      )
                    ) : (
                      <Edit2 className="h-1.5 w-1.5 text-gray-400/60 hover:text-gray-600/80 dark:hover:text-gray-300/80" />
                    )}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Hübner Section */}
                <div className="space-y-3 relative">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Hübner</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Email
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="email"
                          value={editableAccessData.huebner_email}
                          onChange={(e) => setEditableAccessData({...editableAccessData, huebner_email: e.target.value})}
                          className="text-sm"
                          placeholder="email@example.com"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-56 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {accessData?.huebner_email || 'Nicht angegeben'}
                          </p>
                        )
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Passwort
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="password"
                          value={editableAccessData.huebner_password}
                          onChange={(e) => setEditableAccessData({...editableAccessData, huebner_password: e.target.value})}
                          className="text-sm"
                          placeholder="••••••••"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-40 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-yellow-600 transition-colors"
                            onClick={() => accessData?.huebner_password && togglePasswordVisibility('huebner')}
                          >
                            {accessData?.huebner_password ?
                              (showHuebnerPassword ? accessData.huebner_password : '••••••••') :
                              'Nicht angegeben'
                            }
                          </p>
                        )
                      )}
                    </div>
                  </div>
                  {/* Website link (UI only) - bottom-right above divider */}
                  <div className="absolute right-0 -bottom-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://dpw.huebner.at/web/a-0000.htm', '_blank');
                      }}
                      title="Zur Webseite"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Zur Webseite
                    </button>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Demotool Section */}
                <div className="space-y-3 relative">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Demotool</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Email
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="email"
                          value={editableAccessData.demotool_email}
                          onChange={(e) => setEditableAccessData({...editableAccessData, demotool_email: e.target.value})}
                          className="text-sm"
                          placeholder="email@example.com"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-56 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {accessData?.demotool_email || 'Nicht angegeben'}
                          </p>
                        )
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Passwort
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="password"
                          value={editableAccessData.demotool_password}
                          onChange={(e) => setEditableAccessData({...editableAccessData, demotool_password: e.target.value})}
                          className="text-sm"
                          placeholder="••••••••"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-40 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-yellow-600 transition-colors"
                            onClick={() => accessData?.demotool_password && togglePasswordVisibility('demotool')}
                          >
                            {accessData?.demotool_password ?
                              (showDemotoolPassword ? accessData.demotool_password : '••••••••') :
                              'Nicht angegeben'
                            }
                          </p>
                        )
                      )}
                    </div>
                  </div>
                  {/* Website link (UI only) - bottom-right above divider */}
                  <div className="absolute right-0 -bottom-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://nestle.my.site.com/nespresso/login?ec=301&startURL=%2Fnespresso%2Fs%2Fplanning-calendar-page', '_blank');
                      }}
                      title="Zur Webseite"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Zur Webseite
                    </button>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* TMA Section */}
                <div className="space-y-3 relative">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">TMA</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Email
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="email"
                          value={editableAccessData.tma_email}
                          onChange={(e) => setEditableAccessData({...editableAccessData, tma_email: e.target.value})}
                          className="text-sm"
                          placeholder="email@example.com"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-56 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {accessData?.tma_email || 'Nicht angegeben'}
                          </p>
                        )
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Passwort
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="password"
                          value={editableAccessData.tma_password}
                          onChange={(e) => setEditableAccessData({...editableAccessData, tma_password: e.target.value})}
                          className="text-sm"
                          placeholder="••••••••"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-40 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-yellow-600 transition-colors"
                            onClick={() => accessData?.tma_password && togglePasswordVisibility('tma')}
                          >
                            {accessData?.tma_password ?
                              (showTmaPassword ? accessData.tma_password : '••••••••') :
                              'Nicht angegeben'
                            }
                          </p>
                        )
                      )}
                    </div>
                  </div>
                  {/* Website link (UI only) - bottom-right above divider */}
                  <div className="absolute right-0 -bottom-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                      onClick={(e) => e.preventDefault()}
                      title="Zur Webseite"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Zur Webseite
                    </button>
                  </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-gray-200 dark:border-gray-700"></div>

                {/* Boost App Section */}
                <div className="space-y-3 relative">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">Boost App</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Email
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="email"
                          value={editableAccessData.boost_app_email}
                          onChange={(e) => setEditableAccessData({...editableAccessData, boost_app_email: e.target.value})}
                          className="text-sm"
                          placeholder="email@example.com"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-56 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {accessData?.boost_app_email || 'Nicht angegeben'}
                          </p>
                        )
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <label className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">
                        Passwort
                      </label>
                      {isEditingAccess ? (
                        <Input
                          type="password"
                          value={editableAccessData.boost_app_password}
                          onChange={(e) => setEditableAccessData({...editableAccessData, boost_app_password: e.target.value})}
                          className="text-sm"
                          placeholder="••••••••"
                        />
                      ) : (
                        isLoading ? (
                          <div className="h-4 w-40 rounded-md animate-skeleton-fade" />
                        ) : (
                          <p
                            className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:text-yellow-600 transition-colors"
                            onClick={() => accessData?.boost_app_password && togglePasswordVisibility('boost_app')}
                          >
                            {accessData?.boost_app_password ?
                              (showBoostAppPassword ? accessData.boost_app_password : '••••••••') :
                              'Nicht angegeben'
                            }
                          </p>
                        )
                      )}
                    </div>
                  </div>
                  {/* Website link (UI only) - bottom-right, treat bottom edge as divider */}
                  <div className="absolute right-0 -bottom-2">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        window.open('https://apps.apple.com/at/app/nestl%C3%A9-boost-learning/id1556405763?l=en-GB', '_blank');
                      }}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Empty space for shadow visibility */}
          <div className="h-4"></div>
          </div>
        </div>

        {/* Stats Tab */}
        <div className={`transition-all duration-500 ease-in-out ${
          activeTab === "stats"
            ? "translate-x-0 opacity-100"
            : "translate-x-full opacity-0 absolute top-0 left-0 w-full"
        }`}>
          <div className="space-y-4">
            {/* Einsätze Statistics */}
            <Card className="border-none shadow-md bg-white dark:bg-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-blue-500" />
                  Einsätze
                </CardTitle>
              </CardHeader>
                          <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50 ring-2 ring-green-500/20"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Absolvierte Einsätze</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {stats.totalEinsaetze}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50 ring-2 ring-red-500/20"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Krankenstandstage</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {stats.missedEinsaetzeDueSickness}
                </span>
              </div>
            </CardContent>
            </Card>

            {/* Buddy & Training Statistics */}
            <Card className="border-none shadow-md bg-white dark:bg-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-500" />
                  Zusammenarbeit
                </CardTitle>
              </CardHeader>
                          <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50 ring-2 ring-purple-500/20"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Buddy Tage</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  {stats.buddyTage}
                </span>
              </div>
            </CardContent>
            </Card>

            {/* Learning Statistics */}
            <Card className="border-none shadow-md bg-white dark:bg-gray-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <GraduationCap className="h-5 w-5 mr-2 text-green-500" />
                  Weiterbildung
                </CardTitle>
              </CardHeader>
                          <CardContent className="space-y-3">
              <div className="flex items-center justify-between opacity-50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50 ring-2 ring-green-500/20"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Abgeschlossene Schulungen</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  —
                </span>
              </div>
              <div className="flex items-center justify-between opacity-50">
                <div className="flex items-center space-x-2.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50 ring-2 ring-blue-500/20"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-300">Abgeschlossene Quizzes</span>
                </div>
                <span className="text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                  —
                </span>
              </div>
            </CardContent>
            </Card>

            {/* Performance Summary */}
            <Card className="border-none shadow-md bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-indigo-500" />
                  Leistungsübersicht
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                      {Math.round((stats.totalEinsaetze / (stats.totalEinsaetze + stats.missedEinsaetzeDueSickness)) * 100)}%
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Anwesenheitsrate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.missedEinsaetzeDueSickness}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Krankenstand</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dienstvertrag Popup */}
      {showDienstvertragPopup && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
            onClick={() => setShowDienstvertragPopup(false)}
          ></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-xl shadow-xl p-0 w-96 max-h-[80vh] overflow-hidden z-[70]">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Meine Dienstverträge</h3>
              </div>
            </div>

            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Empty state */}
              {promotorContracts.length === 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-center text-sm text-gray-600 dark:text-gray-300">
                  Keine Dienstverträge verfügbar
                </div>
              )}

              {(() => {
                const contracts = Array.isArray(promotorContracts) ? promotorContracts : [];
                if (contracts.length === 0) return null;

                return (
              <div className="space-y-2">
                    {contracts.map((contract) => (
                      <div
                        key={contract.id}
                        className={`border rounded-lg p-3 ${
                          contract.is_active
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                  <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {contract.is_active ? 'Aktiver Dienstvertrag' : 'Vergangener Dienstvertrag'}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            contract.is_active
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                          }`}>
                            {contract.is_active ? 'Aktiv' : 'Archiv'}
                          </span>
                  </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <div>Datei: {contract.file_name || contract.file_path?.split('/').pop() || 'N/A'}</div>
                          <div>Hinterlegt am: {contract.created_at ? new Date(contract.created_at).toLocaleDateString('de-DE') : 'N/A'}</div>
                  </div>
                        <div className="flex items-center gap-2">
                  <button
                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                              contract.is_active
                                ? 'text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                            onClick={() => handleDienstvertragSelect(contract.id)}
                  >
                    {contract.is_active ? 'Aktiver Dienstvertrag' : 'Archiv ansehen'}
                  </button>
                          <button
                            className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            onClick={() => handleDienstvertragSelect(contract.id)}
                            title="Vorschau öffnen"
                          >
                            <Eye className="h-3.5 w-3.5 text-gray-700 dark:text-gray-200" />
                          </button>
                </div>
              </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={() => setShowDienstvertragPopup(false)}
                className="w-full p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm font-medium text-gray-700 dark:text-gray-200"
              >
                Schließen
              </button>
            </div>
          </div>
        </>
        )}

        {/* Dienstvertrag Content Popup */}
        {showDienstvertragContent && (
          <>
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
              onClick={() => setShowDienstvertragContent(false)}
            ></div>
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl p-0 w-[90vw] max-w-4xl max-h-[90vh] overflow-hidden z-[70]">
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setShowDienstvertragContent(false);
                        setShowDienstvertragPopup(true);
                      }}
                      className="p-1 hover:bg-white/10 rounded-lg transition-colors"
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
              <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
                {loadingContractPreview ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 text-gray-400 animate-spin" />
                    </div>
                ) : contractPreviewUrl ? (
                    <iframe
                      src={contractPreviewExt === 'pdf'
                        ? contractPreviewUrl
                        : `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(contractPreviewUrl)}`}
                      className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700"
                      title="Dienstvertrag Vorschau"
                      onError={() => setContractPreviewError(true)}
                    />
                ) : (
                    <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-12">Keine Vorschau verfügbar</div>
                  )}
                {contractPreviewError && (
                  <div className="mt-3 text-center text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
                    Die Vorschau konnte nicht zuverlässig geladen werden. Bitte "Neu laden" versuchen oder im neuen Tab öffnen.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
}
