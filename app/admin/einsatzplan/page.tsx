"use client";
// noop: non-reactive comment (no functional effect)
// no-op comment to mark minor update; functional behavior unchanged

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import * as XLSX from 'xlsx';
import { 
  Home, 
  Briefcase, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Calendar,
  Store,
  LayoutGrid,
  LayoutList,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  CheckSquare,
  Send,
  UserPlus,
  MousePointer,
  History,
  Check,
  Search,
  Eye,
  EyeOff,
  Brain,
  User,
  Loader2,
  Sparkles,
  Plus,
  Dumbbell,
  Trash2,
  Link2,
  Crosshair,
  Copy
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import AdminNavigation from "@/components/AdminNavigation";
import AdminEddieAssistant from "@/components/AdminEddieAssistant";
import { normalizeForMatch } from "@/lib/matchers/marketMatcher";

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

// Typing animation component
const TypingText = ({ text, isTyping }: { text: string; isTyping: boolean }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!isTyping) {
      setDisplayedText('');
      return;
    }
    
    let index = 0;
    setDisplayedText('');
    
    const timer = setInterval(() => {
      if (index <= text.length) {
        setDisplayedText(text.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 25); // 25ms per character for smooth typing
    
    return () => clearInterval(timer);
  }, [text, isTyping]);
  
  return <>{displayedText}</>;
};

export default function EinsatzplanPage() {
  // Custom scrollbar and skeleton styles
  const customScrollbarStyle = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 3px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(156, 163, 175, 0.3);
      border-radius: 2px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(156, 163, 175, 0.5);
    }
    .custom-scrollbar {
      scrollbar-width: thin;
      scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
    }
    .overflow-y-auto::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .wobble {
      animation: wobble 0.5s ease-in-out;
    }
    @keyframes wobble {
      0% { transform: rotate(0deg); }
      15% { transform: rotate(-8deg); }
      30% { transform: rotate(8deg); }
      45% { transform: rotate(-6deg); }
      60% { transform: rotate(6deg); }
      75% { transform: rotate(-4deg); }
      90% { transform: rotate(4deg); }
      100% { transform: rotate(0deg); }
    }
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
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'einsatzplan' | 'maerkte'>('einsatzplan');
  const [viewMode, setViewMode] = useState<'list' | 'cards' | 'days'>('list');
  const [isMainCardExpanded, setIsMainCardExpanded] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [einsatzFilter, setEinsatzFilter] = useState("alle");
  const [regionFilter, setRegionFilter] = useState("ALLE");
  const [dateFilter, setDateFilter] = useState("");
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [dateViewMode, setDateViewMode] = useState<'weeks' | 'calendar'>('weeks');
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [plzFilter, setPlzFilter] = useState("");
  const [showPlzDropdown, setShowPlzDropdown] = useState(false);
  const [promotorFilter, setPromotorFilter] = useState("");
  const [showPromotorDropdown, setShowPromotorDropdown] = useState(false);
  const [promotorFilterSearch, setPromotorFilterSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [marketFilter, setMarketFilter] = useState("");
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [marketsList, setMarketsList] = useState<string[]>([]);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importType, setImportType] = useState<'roh' | 'intern'>('roh');
  const [showExcelFormatInfo, setShowExcelFormatInfo] = useState(true);
  const [einsatzplanData, setEinsatzplanData] = useState<any[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEinsatz, setSelectedEinsatz] = useState<any>(null);
  const [editingEinsatz, setEditingEinsatz] = useState<any>(null);
  const [showReplacementModal, setShowReplacementModal] = useState(false);
  const [declinedPromotor, setDeclinedPromotor] = useState<{user_id: string, name: string, invitation_id: string} | null>(null);
  const [openAssignments, setOpenAssignments] = useState<any[]>([]);
  const [selectedReplacementAssignments, setSelectedReplacementAssignments] = useState<string[]>([]);
  const [replacementRegionFilter, setReplacementRegionFilter] = useState("ALLE");
  
  // Notes toggle state
  const [notesMode, setNotesMode] = useState<'internal' | 'promotor'>('internal');
  const [promotorNotes, setPromotorNotes] = useState<Record<string, string>>({});
  
  // Auslastung (workload) modal state
  const [showAuslastungModal, setShowAuslastungModal] = useState(false);
  const [auslastungKW, setAuslastungKW] = useState<string>('');
  const [showAuslastungKWDropdown, setShowAuslastungKWDropdown] = useState(false);
  const [auslastungSearch, setAuslastungSearch] = useState('');
  const auslastungKWDropdownRef = useRef<HTMLDivElement>(null);
  const [auslastungData, setAuslastungData] = useState<any[]>([]);
  const [auslastungLoading, setAuslastungLoading] = useState(false);
  // New: filter to show only assignments matched to a market
  const [matchedOnly, setMatchedOnly] = useState<boolean>(false);
  // Flash/highlight a specific assignment in the list (e.g., when jumping from history)
  const [flashAssignmentId, setFlashAssignmentId] = useState<string | null>(null);

  // Wait until the element is centered (or timeout) before flashing
  const waitForScrollToCenter = (el: HTMLElement, timeoutMs = 1600) => {
    return new Promise<void>((resolve) => {
      const start = performance.now();
      const check = () => {
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const viewportCenter = window.innerHeight / 2;
        if (Math.abs(elCenter - viewportCenter) < 8) {
          resolve();
          return;
        }
        if (performance.now() - start > timeoutMs) {
          resolve();
          return;
        }
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  };

  const focusAssignmentFromHistory = (assignmentId: string) => {
    // Close the history modal first
    setShowHistoryDetail(false);
    setSelectedHistoryItem(null);
    // Wait for modal to close and layout to settle
    setTimeout(() => {
      const el = document.querySelector(`[data-einsatz-id="${assignmentId}"]`) as HTMLElement | null;
      if (el) {
        // Smoothly center the assignment in view
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        // After scroll finishes (or timeout), apply the temporary highlight
        waitForScrollToCenter(el).then(() => {
          setFlashAssignmentId(assignmentId);
          setTimeout(() => setFlashAssignmentId(null), 1200);
        });
      }
    }, 150);
  };
  
  // Market picker for Create Assignment modal
  const [showMarketPicker, setShowMarketPicker] = useState(false);
  const marketPickerRef = useRef<HTMLDivElement | null>(null);
  const [marketPickerSearch, setMarketPickerSearch] = useState('');
  const [hoveredMarket, setHoveredMarket] = useState<any | null>(null);

  // Close market picker on outside click
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!showMarketPicker) return;
      const el = marketPickerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setShowMarketPicker(false);
        setMarketPickerSearch('');
        setHoveredMarket(null);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [showMarketPicker]);
  
  // Promotion distribution states
  const [selectedPromotions, setSelectedPromotions] = useState<number[]>([]);
  const [showPromotorSelection, setShowPromotorSelection] = useState(false);
  const [selectedPromotors, setSelectedPromotors] = useState<string[]>([]);
  const [activeRegionFilter, setActiveRegionFilter] = useState<string>("all");
  const [promotorSelectionSearch, setPromotorSelectionSearch] = useState("");
  const [lastSelectedByIcon, setLastSelectedByIcon] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [distributionHistory, setDistributionHistory] = useState<any[]>([]);
  
  // AI Recommendations state
  const [aiMode, setAiMode] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [expandedRecommendations, setExpandedRecommendations] = useState<Set<string>>(new Set());
  
  // Assignments loading state  
  const [assignmentsLoading, setAssignmentsLoading] = useState(true); // Start loading immediately
  
  // Markets view states
  const [marketsData, setMarketsData] = useState<any[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketsPromotorsList, setMarketsPromotorsList] = useState<Array<{ id: string; name: string }>>([]);
  const [stammSearch, setStammSearch] = useState("");
  const [marketSearch, setMarketSearch] = useState("");
  // Debounced search value to avoid heavy re-filtering on every keystroke
  const [marketSearchDebounced, setMarketSearchDebounced] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [showMarketDetailModal, setShowMarketDetailModal] = useState(false);
  const [editingMarket, setEditingMarket] = useState<any>(null);
  // Acceptance addresses UI state
  const [showAcceptancePopover, setShowAcceptancePopover] = useState(false);
  const acceptancePopoverRef = useRef<HTMLDivElement | null>(null);
  const acceptanceAnchorRef = useRef<HTMLButtonElement | null>(null);
  const [acceptanceRaw, setAcceptanceRaw] = useState('');
  const [acceptancePlz, setAcceptancePlz] = useState('');
  const [acceptanceCity, setAcceptanceCity] = useState('');
  const [copiedAcceptanceKey, setCopiedAcceptanceKey] = useState<string | null>(null);
  const [pendingAcceptanceDelete, setPendingAcceptanceDelete] = useState<Record<string, boolean>>({});
  const [acceptanceSaving, setAcceptanceSaving] = useState(false);
  const [marketNotesMode, setMarketNotesMode] = useState<'internal' | 'promotor'>('internal');
  const [pendingMarketDelete, setPendingMarketDelete] = useState<Record<string, boolean>>({});
  const [pendingPhotoDelete, setPendingPhotoDelete] = useState<Record<string, boolean>>({});
  const [showMarketHours, setShowMarketHours] = useState(false);
  const marketHoursRef = useRef<HTMLDivElement | null>(null);
  // Photo navigation state (current index for each photo type)
  const [photoInternalIndex, setPhotoInternalIndex] = useState(0);
  const [photoExteriorIndex, setPhotoExteriorIndex] = useState(0);
  const [photoInteriorIndex, setPhotoInteriorIndex] = useState(0);
  const [photoProductsIndex, setPhotoProductsIndex] = useState(0);
  // Market matching popup state
  const [showMarketMatchPopup, setShowMarketMatchPopup] = useState<string | null>(null); // assignmentId
  const [marketMatchSearch, setMarketMatchSearch] = useState("");
  const marketById = useMemo(() => new Map(marketsData.map((m: any) => [m.id, m])), [marketsData]);
  const marketMatchPopupRef = useRef<HTMLDivElement | null>(null);
  const [selectingMarketId, setSelectingMarketId] = useState<string | null>(null);

  // Close market match popup on outside click (ignore clicks on the icon or inside the popup)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showMarketMatchPopup) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      // If click is inside the popup, ignore
      if (marketMatchPopupRef.current && marketMatchPopupRef.current.contains(target)) return;
      // If click is on the chain icon trigger, ignore
      if (target.closest('[data-market-match-icon]')) return;
      setShowMarketMatchPopup(null);
    };
    document.addEventListener('mousedown', handleClickOutside, true);
    return () => document.removeEventListener('mousedown', handleClickOutside, true);
  }, [showMarketMatchPopup]);

  useEffect(() => {
    setShowMarketHours(false);
  }, [editingMarket]);

  // Keep a light debounce for the Märkte search bar to prevent heavy list re-renders
  useEffect(() => {
    const id = setTimeout(() => {
      setMarketSearchDebounced((marketSearch || '').trim().toLowerCase());
    }, 180);
    return () => clearTimeout(id);
  }, [marketSearch]);

  useEffect(() => {
    if (!showMarketHours) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (marketHoursRef.current && marketHoursRef.current.contains(target)) return;
      if (target.closest('[data-market-hours-trigger]')) return;
      setShowMarketHours(false);
    };
    document.addEventListener('mousedown', handleClick, true);
    return () => document.removeEventListener('mousedown', handleClick, true);
  }, [showMarketHours]);

  // Photo preview overlay state
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [savingDetail, setSavingDetail] = useState(false);
  // Create market modal state for Märkte view
  const [showCreateMarketModal, setShowCreateMarketModal] = useState(false);
  const [newMarket, setNewMarket] = useState<any>({
    name: '',
    address: '',
    plz: '',
    city: '',
    cluster: 'wien-noe-bgl',
    marktleiter: '',
    marktleiterPhone: '',
    marktleiterEmail: '',
    stammPromotorId: '',
    visits: 0,
    status: 'active'
  });
  
  // Create assignment modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    title: 'Promotion',
    location_text: '',
    postal_code: '',
    city: '',
    start_date: '',
    start_time: '09:30',
    end_time: '18:30',
    notes: ''
  });
  
  // Delete assignment state
  const [pendingAssignmentDelete, setPendingAssignmentDelete] = useState<Record<string, boolean>>({});
  
  // Function to delete assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (pendingAssignmentDelete[assignmentId]) {
      // Second click - delete the assignment
      try {
        const response = await fetch(`/api/assignments/${assignmentId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Fehler beim Löschen des Einsatzes');
        }
        
        // Remove from local state
        setEinsatzplanData(prev => prev.filter(item => item.id !== assignmentId));
        
        // Close modal
        setShowDetailModal(false);
        setSelectedEinsatz(null);
        setEditingEinsatz(null);
        
        // Clear pending delete state
        setPendingAssignmentDelete(prev => {
          const newState = { ...prev };
          delete newState[assignmentId];
          return newState;
        });
        
      } catch (error: any) {
        console.error('Error deleting assignment:', error);
        alert(error.message || 'Fehler beim Löschen des Einsatzes');
      }
    } else {
      // First click - start wobble and set pending state
      setPendingAssignmentDelete(prev => ({ ...prev, [assignmentId]: true }));
      
      // Clear pending state after 2 seconds
      setTimeout(() => {
        setPendingAssignmentDelete(prev => {
          const newState = { ...prev };
          delete newState[assignmentId];
          return newState;
        });
      }, 2000);
    }
  };

  // Load markets data
  const loadMarkets = async () => {
    setMarketsLoading(true);
    const startTime = Date.now();
    try {
      const response = await fetch('/api/admin/markets');
      if (!response.ok) {
        throw new Error('Failed to fetch markets');
      }
      const data = await response.json();
      setMarketsData(data.markets || []);
    } catch (error) {
      console.error('Error loading markets:', error);
      alert('Fehler beim Laden der Märkte');
    } finally {
      // Ensure minimum loading time so skeletons are visible (parity with promotors dashboard)
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 600; // 0.6s
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      setTimeout(() => setMarketsLoading(false), remainingTime);
    }
  };

  // Load promotors list for both markets and assignments
  const loadPromotorsList = async () => {
    try {
      const response = await fetch('/api/admin/promotors-list');
      if (!response.ok) {
        throw new Error('Failed to fetch promotors');
      }
      const data = await response.json();
      const mapped = (data.promotors || []).map((p: any) => ({
        id: p.user_id,
        name: p.name
      }));
      setMarketsPromotorsList(mapped);
      
      // Also set promotorsList for assignments (TODO: fetch with region data if needed)
      // For now, use same data structure
      setPromotorsList(mapped);
    } catch (error) {
      console.error('Error loading promotors:', error);
    }
  };

  // Handle photo delete with safety wobble (2s confirm)
  const handlePhotoDelete = async (kind: 'internal' | 'exterior' | 'interior' | 'products') => {
    if (pendingPhotoDelete[kind]) {
      // Second click - delete the photo
      if (!editingMarket) return;
      
      const photoArrayKey = kind === 'internal' ? 'photosInternal' :
                           kind === 'exterior' ? 'photosExterior' :
                           kind === 'interior' ? 'photosInterior' : 'photosProducts';
      
      const currentPhotos = editingMarket[photoArrayKey] || [];
      const currentIndex = kind === 'internal' ? photoInternalIndex :
                          kind === 'exterior' ? photoExteriorIndex :
                          kind === 'interior' ? photoInteriorIndex : photoProductsIndex;
      
      if (currentPhotos.length === 0) return;

      try {
        // Call delete API
        const response = await fetch(`/api/admin/markets/${editingMarket.id}/photos`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_type: kind,
            photo_index: currentIndex
          })
        });

        if (!response.ok) {
          throw new Error('Failed to delete photo');
        }

        const { photos } = await response.json();
        
        // Update local state
        setEditingMarket((prev: any) => ({
          ...prev,
          [photoArrayKey]: photos
        }));

        // Reset index if needed
        if (currentIndex >= photos.length && photos.length > 0) {
          const setIndex = kind === 'internal' ? setPhotoInternalIndex :
                          kind === 'exterior' ? setPhotoExteriorIndex :
                          kind === 'interior' ? setPhotoInteriorIndex : setPhotoProductsIndex;
          setIndex(photos.length - 1);
        }

        setPendingPhotoDelete((prev) => {
          const next = { ...prev };
          delete next[kind];
          return next;
        });
      } catch (error) {
        console.error('Error deleting photo:', error);
        alert('Fehler beim Löschen des Fotos');
      }
    } else {
      // First click - start wobble
      setPendingPhotoDelete((prev) => ({ ...prev, [kind]: true }));
      setTimeout(() => {
        setPendingPhotoDelete((prev) => {
          const next = { ...prev };
          delete next[kind];
          return next;
        });
      }, 2000);
    }
  };

  // Handle photo navigation
  const navigatePhoto = (kind: 'internal' | 'exterior' | 'interior' | 'products', direction: 'prev' | 'next') => {
    if (!editingMarket) return;
    
    const photoArrayKey = kind === 'internal' ? 'photosInternal' :
                         kind === 'exterior' ? 'photosExterior' :
                         kind === 'interior' ? 'photosInterior' : 'photosProducts';
    
    const photos = editingMarket[photoArrayKey] || [];
    if (photos.length <= 1) return;

    const currentIndex = kind === 'internal' ? photoInternalIndex :
                        kind === 'exterior' ? photoExteriorIndex :
                        kind === 'interior' ? photoInteriorIndex : photoProductsIndex;
    
    const setIndex = kind === 'internal' ? setPhotoInternalIndex :
                    kind === 'exterior' ? setPhotoExteriorIndex :
                    kind === 'interior' ? setPhotoInteriorIndex : setPhotoProductsIndex;

    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
    } else {
      newIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
    }
    
    setIndex(newIndex);
  };

  // Handle photo upload
  const handlePhotoUpload = async (kind: 'internal' | 'exterior' | 'interior' | 'products', file: File) => {
    if (!editingMarket || !file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('photo_type', kind);
      formData.append('comment', '');

      const response = await fetch(`/api/admin/markets/${editingMarket.id}/photos/upload`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload photo');
      }

      const { photos } = await response.json();
      
      const photoArrayKey = kind === 'internal' ? 'photosInternal' :
                           kind === 'exterior' ? 'photosExterior' :
                           kind === 'interior' ? 'photosInterior' : 'photosProducts';
      
      // Update local state
      setEditingMarket((prev: any) => ({
        ...prev,
        [photoArrayKey]: photos
      }));

      // Set index to the newly added photo
      const setIndex = kind === 'internal' ? setPhotoInternalIndex :
                      kind === 'exterior' ? setPhotoExteriorIndex :
                      kind === 'interior' ? setPhotoInteriorIndex : setPhotoProductsIndex;
      setIndex(photos.length - 1);
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Fehler beim Hochladen des Fotos');
    }
  };
  // Function to create new assignment
  const createNewAssignment = async () => {
    try {
      // Validate required fields
      if (!newAssignment.location_text || !newAssignment.postal_code || !newAssignment.start_date) {
        alert('Bitte füllen Sie alle Pflichtfelder aus.');
        return;
      }
      
      // Create start and end timestamps
      const startDateTime = new Date(`${newAssignment.start_date}T${newAssignment.start_time}:00.000Z`);
      const endDateTime = new Date(`${newAssignment.start_date}T${newAssignment.end_time}:00.000Z`);
      
      // Determine region from PLZ
      const region = getRegionFromPLZ(newAssignment.postal_code);
      
      const assignmentData = {
        title: newAssignment.title,
        location_text: newAssignment.location_text,
        postal_code: newAssignment.postal_code,
        city: newAssignment.city,
        region,
        start_ts: startDateTime.toISOString(),
        end_ts: endDateTime.toISOString(),
        type: 'promotion',
        notes: newAssignment.notes
      };
      
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignmentData)
      });
      
      if (!response.ok) {
        throw new Error('Fehler beim Erstellen des Einsatzes');
      }
      
      // Reset form and close modal
      setNewAssignment({
        title: 'Promotion',
        location_text: '',
        postal_code: '',
        city: '',
        start_date: '',
        start_time: '09:30',
        end_time: '18:30',
        notes: ''
      });
      setShowCreateModal(false);
      
      // Refresh assignments
      await loadAssignments(true);
      
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      alert(error.message || 'Fehler beim Erstellen des Einsatzes');
    }
  };
  // Load distribution history from database
  const loadInvitationHistory = async () => {
    try {
      const res = await fetch('/api/assignments/invitation-history');
      if (res.ok) {
        const data = await res.json();
        setDistributionHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load invitation history:', error);
    }
  };
  
  useEffect(() => {
    loadInvitationHistory();
  }, []);

  // Fetch open assignments when replacement modal opens
  useEffect(() => {
    if (showReplacementModal) {
      (async () => {
        try {
          const res = await fetch('/api/assignments?status=open');
          const data = await res.json();
          setOpenAssignments(data.assignments || []);
        } catch (error) {
          console.error('Error fetching open assignments:', error);
        }
      })();
    }
  }, [showReplacementModal]);
  const [showHistoryDetail, setShowHistoryDetail] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<any>(null);
  const [promotionView, setPromotionView] = useState<'sent' | 'applications'>('sent');
  
  // Promotors list for assignment (includes region)
  const [promotorsList, setPromotorsList] = useState<any[]>([]);
  // Detail modal dropdown searches
  const [detailPromotorSearch, setDetailPromotorSearch] = useState("");
  const [detailBuddySearch, setDetailBuddySearch] = useState("");
  const detailPromotorSearchRef = useRef<HTMLInputElement | null>(null);
  const detailBuddySearchRef = useRef<HTMLInputElement | null>(null);
  // Buddy toggle for bulk invites
  const [inviteBuddy, setInviteBuddy] = useState(false);
  // Loading state for bulk send button
  const [sendingInvites, setSendingInvites] = useState(false);
  // Loading state for market save in detail modal
  const [savingMarket, setSavingMarket] = useState(false);
  // Accepted applications for the current assignment (detail view)
  const [applicationsList, setApplicationsList] = useState<any[]>([]);
  // Flash effect for promotor field
  const [promotorFieldFlash, setPromotorFieldFlash] = useState(false);
  
  // Detail modal tab state (Übersicht vs Details)
  const [detailModalTab, setDetailModalTab] = useState<'overview' | 'details'>('overview');
  
  // Tracking data for overview tab
  const [assignmentTrackingData, setAssignmentTrackingData] = useState<any>(null);
  // Loading state for Details tab
  const [trackingLoading, setTrackingLoading] = useState(false);
  
  // Photo lightbox state
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, title: string} | null>(null);

  // Load tracking data for Details tab (tracking overview)
  const loadTrackingData = useCallback(async () => {
    if (!editingEinsatz?.id) return;
      
      try {
        setTrackingLoading(true);
        const response = await fetch(`/api/assignments/${editingEinsatz.id}/tracking`, { cache: 'no-store' });
        if (!response.ok) {
          setAssignmentTrackingData(null);
          return;
        }
        const data = await response.json();
        const assignment = data.assignment || {};
        const tracking = data.tracking || {};
        const checkins: Array<{ checked_in_at: string }> = data.checkins || [];
        const outsideBreaks: Array<{ reported_at: string }> = data.outsideBreaks || [];
            
        const hasOutsideBreak = outsideBreaks.length > 0;
        const outsideBreakTimestamp = hasOutsideBreak ? outsideBreaks[outsideBreaks.length - 1].reported_at : null;
        const hasCheckedIn = checkins.length > 0;

        const actualStart = tracking.actual_start_time ? tracking.actual_start_time.substring(11, 16) : null;
        const actualEnd = tracking.actual_end_time ? tracking.actual_end_time.substring(11, 16) : null;

            setAssignmentTrackingData({
          id: assignment.id || editingEinsatz.id,
          market: assignment.title || editingEinsatz.market || 'N/A',
          address: assignment.location_text || editingEinsatz.address || '',
          plz: assignment.postal_code || editingEinsatz.plz || '',
          city: assignment.city || editingEinsatz.city || '',
          promotor: assignment.lead_name || editingEinsatz.promotor || 'N/A',
          buddyName: assignment.buddy_display_name || editingEinsatz.buddy_name || null,
          planStart: assignment.start_ts ? assignment.start_ts.substring(11, 16) : editingEinsatz.planStart,
          planEnd: assignment.end_ts ? assignment.end_ts.substring(11, 16) : editingEinsatz.planEnd,
          actualStart,
          actualEnd,
          status: tracking.status || editingEinsatz.status,
          tracking_status: tracking.status || null,
          notes: tracking.notes || assignment.notes || editingEinsatz.notes || '',
          early_start_reason: tracking.early_start_reason || null,
          minutes_early_start: tracking.minutes_early_start ?? null,
          early_end_reason: tracking.early_end_reason || null,
          minutes_early_end: tracking.minutes_early_end ?? null,
          foto_maschine_url: tracking.foto_maschine_url || null,
          foto_kapsellade_url: tracking.foto_kapsellade_url || null,
          foto_pos_gesamt_url: tracking.foto_pos_gesamt_url || null,
          foto_extra_url: tracking.foto_extra_url || null,
              hasCheckedIn,
              hasOutsideBreak,
          outsideBreakTimestamp,
            });
      } catch (error) {
        console.error('Failed to load tracking data:', error);
        setAssignmentTrackingData(null);
      } finally {
        setTrackingLoading(false);
      }
  }, [editingEinsatz]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/promotors', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.promotors) ? data.promotors.map((p: any) => ({ id: p.id, name: p.name, region: p.region })) : [];
        setPromotorsList(list);
      } catch {}
    })();
  }, []);
  // Eye filter state - when true, filter out "Verplant" items
  const [hideVerplant, setHideVerplant] = useState(false);
  // Invite counts per assignment id (for compact list view badges)
  const [inviteCounts, setInviteCounts] = useState<Record<string, { invited: number; accepted: number; rejected: number }>>({});
  // Invite details per assignment id (for hover popups)
  const [inviteDetails, setInviteDetails] = useState<Record<string, { invited: string[]; accepted: string[]; rejected: string[] }>>({});
  // Hover state for invite popups
  const [hoveredInvite, setHoveredInvite] = useState<{ assignmentId: string; type: 'invited' | 'accepted' | 'rejected' } | null>(null);
  // Function to assign promotion to a promotor
  const assignPromotionToPromotor = async (promotorName: string, promotorId?: string) => {
    if (!editingEinsatz) return;
    try {
      if (!promotorId || promotorName === '') {
        // Remove lead promotor - DELETE endpoint expects role in query string
        await fetch(`/api/assignments/${editingEinsatz.id}/participants/choose?role=lead`, {
          method: 'DELETE'
        });
        
        // Update local state to reflect no promotor
        const newStatus = editingEinsatz.buddy_user_id && editingEinsatz.buddy_user_id !== 'none' ? 'Buddy Tag' : 'Offen';
        setEditingEinsatz({ ...editingEinsatz, promotor: '', promotorId: undefined, status: newStatus });
        setEinsatzplanData(prev => prev.map(item => 
          item.id === editingEinsatz.id 
            ? { ...item, promotor: '', promotorId: undefined, status: newStatus } 
            : item
        ));
      } else {
        // Add/update lead promotor
        await fetch(`/api/assignments/${editingEinsatz.id}/participants/choose`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: promotorId, role: 'lead' })
        });
        
        // Update invitation status to accepted
        await fetch(`/api/assignments/${editingEinsatz.id}/invites/accept`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: promotorId })
        });
        
        // Update local state - status logic is simpler now with special_status column
        const newStatus = editingEinsatz.buddy_user_id && editingEinsatz.buddy_user_id !== 'none' ? 'Buddy Tag' : 'Verplant';
        setEditingEinsatz({ ...editingEinsatz, promotor: promotorName, promotorId: promotorId, status: editingEinsatz.status });
        setEinsatzplanData(prev => prev.map(item => 
          item.id === editingEinsatz.id 
            ? { ...item, promotor: promotorName, promotorId: promotorId, status: editingEinsatz.status } 
            : item
        ));
      }
    } catch (error) {
      console.error('Error assigning/removing promotor:', error);
    }
  };

  // Function to get AI recommendations
  const fetchAiRecommendations = async (assignmentId: string) => {
    console.log('🎯 [CLIENT] AI recommendation request started', { assignmentId });
    
    if (!assignmentId) {
      console.log('❌ [CLIENT] No assignment ID provided');
      setAiError('Bitte wählen Sie zuerst einen Einsatz aus');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    console.log('🔄 [CLIENT] Setting loading state, calling API...');

    try {
      const requestBody = { 
        assignmentId: assignmentId,
        maxRecommendations: 6 
      };
      console.log('📤 [CLIENT] Request payload:', requestBody);

      const response = await fetch('/api/ai/recommend-promotors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 [CLIENT] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ [CLIENT] API error response:', errorText);
        throw new Error('Fehler beim Abrufen der Empfehlungen');
      }

      const data = await response.json();
      console.log('✅ [CLIENT] API response data:', data);
      console.log('🏆 [CLIENT] Recommendations received:', data.recommendations?.length || 0);
      
      setAiRecommendations(data.recommendations || []);
    } catch (err: any) {
      console.error('❌ [CLIENT] AI request failed:', err);
      setAiError(err.message || 'Unbekannter Fehler');
      setAiRecommendations([]);
    } finally {
      setAiLoading(false);
      console.log('🏁 [CLIENT] AI request completed');
    }
  };

  // Function to assign buddy to promotion
  const assignBuddyToPromotion = async (buddyName: string, buddyId?: string) => {
    if (!editingEinsatz) return;

    try {
      if (buddyId) {
        // Update participant as buddy
        await fetch(`/api/assignments/${editingEinsatz.id}/participants/choose`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: buddyId, role: 'buddy' })
        })
        
        // Update assignment with buddy info - this is critical for persistence!
        await fetch(`/api/assignments/${editingEinsatz.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'buddy_tag',
            buddy_user_id: buddyId,
            buddy_name: buddyName
          })
        })
      } else if (!buddyName) {
        // Remove buddy if no name provided: delete buddy participant and normalize status
        try {
          // Remove buddy - DELETE endpoint expects role in query string
          await fetch(`/api/assignments/${editingEinsatz.id}/participants/choose?role=buddy`, {
            method: 'DELETE'
          });
        } catch {}
        // Don't update status here - let the status dropdown handle all status changes
      }
    } catch (error) {
      console.error('Error assigning buddy:', error);
    }
    // optimistic UI update - status stays the same with special_status handling
    setEditingEinsatz({ ...editingEinsatz, buddy_name: buddyName || null, buddy_user_id: buddyId || null })
    setEinsatzplanData(prev => prev.map(item => 
      item.id === editingEinsatz.id 
        ? { ...item, buddy_name: buddyName || null, buddy_user_id: buddyId || null } 
        : item
    ))
  };

  // Function to update assignment status
  const updateAssignmentStatus = async (assignmentId: string, newStatus: string) => {
    try {
      console.log('🟢 [CLIENT] Updating assignment status:', { assignmentId, newStatus });
      
      // Send UI status directly - API will handle special_status detection
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 [CLIENT] Status update failed:', response.status, errorText);
        throw new Error(`Status update failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('🟢 [CLIENT] Status update successful:', result);
      
      // Update local state
      setEditingEinsatz((prev: any) => prev ? { ...prev, status: newStatus } : prev);
      setEinsatzplanData((prev: any[]) => prev.map(item => 
        item.id === assignmentId ? { ...item, status: newStatus } : item
      ));
    } catch (error) {
      console.error('🔴 [CLIENT] Error updating assignment status:', error);
    }
  };

  // Function to update assignment notes
  const updateAssignmentNotes = async (assignmentId: string, notes: string) => {
    try {
      console.log('🔵 Saving notes:', { assignmentId, notes });
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to save notes:', response.status, errorText);
        return;
      }
      
      const result = await response.json();
      console.log('✅ Notes saved successfully:', result);
      
      // Update local state
      setEditingEinsatz((prev: any) => prev ? { ...prev, notes } : prev);
      setEinsatzplanData((prev: any[]) => prev.map(item => 
        item.id === assignmentId ? { ...item, notes } : item
      ));
    } catch (error) {
      console.error('Error updating assignment notes:', error);
    }
  };

  // Function to load promotor note
  const loadPromotorNote = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/assignments/promotor-notes?assignment_id=${assignmentId}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.note) {
          setPromotorNotes(prev => ({
            ...prev,
            [assignmentId]: data.note.note
          }));
        }
      }
    } catch (error) {
      console.error('Error loading promotor note:', error);
    }
  };

  // Function to save promotor note
  const savePromotorNote = async (assignmentId: string, note: string) => {
    try {
      const response = await fetch('/api/assignments/promotor-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: assignmentId, note })
      });
      
      if (!response.ok) {
        console.error('Failed to save promotor note:', response.status);
        return;
      }
      
      console.log('Promotor note saved successfully');
    } catch (error) {
      console.error('Error saving promotor note:', error);
    }
  };

  const weeksContainerRef = useRef<HTMLDivElement>(null);
  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const plzDropdownRef = useRef<HTMLDivElement>(null);
  const promotorDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load auslastung data
  const loadAuslastung = async (kw: string) => {
    try {
      setAuslastungLoading(true);
      const response = await fetch(`/api/admin/auslastung?kw=${encodeURIComponent(kw)}`);
      if (response.ok) {
        const data = await response.json();
        setAuslastungData(data.workload || []);
      } else {
        setAuslastungData([]);
      }
    } catch (error) {
      console.error('Error loading auslastung:', error);
      setAuslastungData([]);
    } finally {
      setAuslastungLoading(false);
    }
  };

  // Load auslastung when KW changes
  useEffect(() => {
    if (auslastungKW && showAuslastungModal) {
      loadAuslastung(auslastungKW);
    }
  }, [auslastungKW, showAuslastungModal]);

  // Get current week number (uses getWeekNumber for accuracy)
  const getCurrentWeek = () => {
    return getWeekNumber(new Date());
  };

  // Get week number for any date
  const getWeekNumber = (date: Date) => {
    const year = date.getFullYear();
    const startDate = new Date(year, 0, 1);
    
    // Find first Monday of the year (same logic as generateCalendarWeeks)
    const firstMonday = new Date(startDate);
    const dayOfWeek = startDate.getDay();
    const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    firstMonday.setDate(startDate.getDate() + daysToAdd);
    
    // Calculate weeks from first Monday
    if (date < firstMonday) {
      // Dates before first Monday are in week 0 or previous year
      return 0;
    }
    const daysSinceFirstMonday = Math.floor((date.getTime() - firstMonday.getTime()) / (24 * 60 * 60 * 1000));
    return Math.floor(daysSinceFirstMonday / 7) + 1;
  };

  // Generate all calendar weeks for current year
  const generateCalendarWeeks = () => {
    const weeks = [];
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1);
    
    // Find first Monday of the year
    const firstMonday = new Date(startDate);
    const dayOfWeek = startDate.getDay();
    const daysToAdd = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    firstMonday.setDate(startDate.getDate() + daysToAdd);
    
    for (let week = 1; week <= 52; week++) {
      const weekStart = new Date(firstMonday);
      weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      const formatDate = (date: Date) => {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      };
      
      weeks.push(`KW ${week} (${formatDate(weekStart)}-${formatDate(weekEnd)})`);
    }
    return weeks;
  };

  // Generate calendar days for current month
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay() + 1); // Start from Monday
    
    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
         return days;
   };

  // Generate all dates between two dates (inclusive)
  const getDatesBetween = (startDate: string, endDate: string) => {
    const dates = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

     // Get all dates in current range (including in-between dates)
   const getAllRangeDates = () => {
     if (!dateRange.start) return [];
     if (!dateRange.end) return [dateRange.start];
     
     const start = dateRange.start <= dateRange.end ? dateRange.start : dateRange.end;
     const end = dateRange.start <= dateRange.end ? dateRange.end : dateRange.start;
     return getDatesBetween(start, end);
   };

   // Get display text for the filter pill
   const getFilterDisplayText = () => {
     if (selectedWeeks.length > 0) {
       if (selectedWeeks.length === 1) {
         // Extract KW number from "KW 47 (18.11-24.11)" format
         const kwNumber = selectedWeeks[0].match(/KW (\d+)/)?.[1];
         return `KW ${kwNumber}`;
       } else {
         // Multiple weeks - show count
         return `${selectedWeeks.length} KWs`;
       }
     }
     
     if (dateRange.start) {
       if (!dateRange.end) {
         // Single date - show as DD.MM
         const date = new Date(dateRange.start);
         return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
       } else {
         // Date range - show as DD.MM-DD.MM
         const startDate = new Date(dateRange.start);
         const endDate = new Date(dateRange.end);
         const startStr = `${startDate.getDate().toString().padStart(2, '0')}.${(startDate.getMonth() + 1).toString().padStart(2, '0')}`;
         const endStr = `${endDate.getDate().toString().padStart(2, '0')}.${(endDate.getMonth() + 1).toString().padStart(2, '0')}`;
         return `${startStr}-${endStr}`;
       }
     }
     
     return 'Datum';
   };

  // Auto-scroll to current week when dropdown opens
  useEffect(() => {
    if (showDateDropdown && dateViewMode === 'weeks' && weeksContainerRef.current) {
      const currentWeek = getCurrentWeek();
      const weekElement = weeksContainerRef.current.children[currentWeek - 1] as HTMLElement;
      if (weekElement) {
        weekElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [showDateDropdown, dateViewMode]);
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(event.target as Node)) {
        setShowDateDropdown(false);
      }
    };

    if (showDateDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDateDropdown]);

  // Close PLZ dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (plzDropdownRef.current && !plzDropdownRef.current.contains(event.target as Node)) {
        setShowPlzDropdown(false);
      }
    };

    if (showPlzDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPlzDropdown]);
  // Close Status dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStatusDropdown]);
  // Close Promotor dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (promotorDropdownRef.current && !promotorDropdownRef.current.contains(event.target as Node)) {
        setShowPromotorDropdown(false);
      }
    };

    if (showPromotorDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPromotorDropdown]);





  const weekOverviewData = [
    { 
      date: "Mo 25.11", 
      einsätze: 12, 
      promotoren: 8, 
      bestätigt: 10, 
      offen: 2, 
      abgesagt: 0,
      status: "active"
    },
    { 
      date: "Di 26.11", 
      einsätze: 15, 
      promotoren: 10, 
      bestätigt: 12, 
      offen: 3, 
      abgesagt: 0,
      status: "planned"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bestätigt': return 'green';
      case 'geplant': return 'orange';
      case 'abgesagt': return 'red';
      default: return 'gray';
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'verplant': return 'bg-green-50/40';
      case 'buddy tag': return 'bg-purple-50/40';
      case 'krankenstand': return 'bg-red-50/40';
      case 'notfall': return 'bg-orange-50/40';
      case 'urlaub': return 'bg-blue-50/40';
      case 'zeitausgleich': return 'bg-yellow-50/40';
      case 'markierte': return 'bg-purple-50/40';
      case 'bestätigt': return 'bg-green-50/40';
      // Beendet (finished) - exact fill used in dashboard for finished rows
      case 'beendet': return 'bg-[#FFF7D6]';
      case 'geplant': return 'bg-white';
      default: return 'bg-white';
    }
  };

  const getLocationOptions = () => {
    return [...new Set(einsatzplanData.map(item => item.city))];
  };

  const getPlzOptions = () => {
    return [...new Set(einsatzplanData.map(item => item.plz))].sort();
  };

  const getStatusOptions = () => {
    return ["Verplant", "Buddy Tag", "Krankenstand", "Sonderfall", "Urlaub", "Zeitausgleich", "Beendet", "Markierte"];
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case "Verplant": return "from-white to-green-100/60";
      case "Buddy Tag": return "from-white to-purple-100/60";
      case "Krankenstand": return "from-white to-red-100/60";
      case "Sonderfall": return "from-white to-orange-100/60";
      case "Urlaub": return "from-white to-blue-100/60";
      case "Zeitausgleich": return "from-white to-yellow-100/60";
      // Beendet: match dashboard gradient stops for text/dot; we only apply a soft row gradient
      case "Beendet": return "from-[#FFF9E6] to-[#FFF4CC]";
      case "Markierte": return "from-white to-purple-100/60";
      default: return "from-white to-white";
    }
  };

  const getStatusHoverClass = (status: string) => {
    switch (status) {
      case "Verplant": return "hover:bg-green-100/50";
      case "Buddy Tag": return "hover:bg-purple-100/50";
      case "Krankenstand": return "hover:bg-red-100/50";
      case "Sonderfall": return "hover:bg-orange-100/50";
      case "Urlaub": return "hover:bg-blue-100/50";
      case "Zeitausgleich": return "hover:bg-yellow-100/50";
      case "Beendet": return "hover:bg-yellow-100/50";
      case "Markierte": return "hover:bg-purple-100/50";
      default: return "hover:bg-gray-50";
    }
  };

  const marketOpeningHours = useMemo(() => {
    if (!editingMarket) return [] as Array<{ label: string; text: string; closed: boolean }>;

    const days = [
      { key: 'monday', label: 'Mo' },
      { key: 'tuesday', label: 'Di' },
      { key: 'wednesday', label: 'Mi' },
      { key: 'thursday', label: 'Do' },
      { key: 'friday', label: 'Fr' },
      { key: 'saturday', label: 'Sa' },
      { key: 'sunday', label: 'So' },
    ] as const;

    let hoursSource: any = editingMarket.openingHours ?? editingMarket.opening_hours ?? editingMarket.opening_hours_json ?? editingMarket.hours ?? null;

    if (typeof hoursSource === 'string') {
      try {
        hoursSource = JSON.parse(hoursSource);
      } catch (error) {
        const normalized = hoursSource.trim();
        if (!normalized) {
          return days.map(({ label }) => ({ label, text: 'Geschlossen', closed: true }));
        }
        const lower = normalized.toLowerCase();
        const formatted = lower === 'geschlossen' ? 'Geschlossen' : normalized.replace(/\s*-\s*/g, ' – ');
        const closed = lower === 'geschlossen';
        return days.map(({ label }) => ({ label, text: formatted, closed }));
      }
    }

    const normalizeValue = (value: any): { text: string; closed: boolean } => {
      if (value == null) {
        return { text: 'Geschlossen', closed: true };
      }
      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed || trimmed.toLowerCase() === 'geschlossen') {
          return { text: 'Geschlossen', closed: true };
        }
        return { text: trimmed.replace(/\s*-\s*/g, ' – '), closed: false };
      }
      if (Array.isArray(value)) {
        const segments = value.map(normalizeValue).filter(Boolean) as Array<{ text: string; closed: boolean }>;
        const openSegments = segments.filter(segment => !segment.closed && segment.text);
        if (openSegments.length > 0) {
          return { text: openSegments.map(seg => seg.text).join(', '), closed: false };
        }
        if (segments.length > 0) {
          return segments[0];
        }
        return { text: 'Geschlossen', closed: true };
      }
      if (typeof value === 'object') {
        if (value.closed || value.isClosed) {
          return { text: 'Geschlossen', closed: true };
        }
        if (Array.isArray(value.times)) {
          return normalizeValue(value.times);
        }
        if (Array.isArray(value.slots)) {
          return normalizeValue(value.slots);
        }
        if (typeof value.text === 'string') {
          return normalizeValue(value.text);
        }
        const from = value.open ?? value.from ?? value.start ?? value.begin ?? value.opening ?? value.hourFrom ?? value.von ?? null;
        const to = value.close ?? value.to ?? value.end ?? value.finish ?? value.closing ?? value.hourTo ?? value.bis ?? null;
        if (from && to) {
          return { text: `${from} – ${to}`, closed: false };
        }
        const nestedValues = Object.values(value);
        if (nestedValues.length > 0) {
          return normalizeValue(nestedValues[0]);
        }
      }
      return { text: 'Geschlossen', closed: true };
    };

    return days.map(({ key, label }) => {
      let rawValue: any = null;
      if (Array.isArray(hoursSource)) {
        rawValue = hoursSource.find((entry: any) => {
          const day = (entry?.day || entry?.weekday || entry?.tag || '').toString().toLowerCase();
          return day === key || day.startsWith(key.slice(0, 2));
        }) ?? null;
        if (rawValue && rawValue[key] !== undefined) {
          rawValue = rawValue[key];
        }
      } else if (hoursSource && typeof hoursSource === 'object') {
        rawValue = hoursSource[key] ?? hoursSource[key.slice(0, 3)] ?? hoursSource[key.toUpperCase()] ?? null;
      }

      const { text, closed } = normalizeValue(rawValue);
      return { label, text, closed };
    });
  }, [editingMarket]);

  const openInGoogleMaps = (address: string, city: string, plz?: string) => {
    const location = `${address}, ${plz ? plz + ' ' : ''}${city}`.trim();
    const query = encodeURIComponent(location);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // Helper function to format promotor name consistently with dropdown
  const getDisplayName = (einsatz: any) => {
    // Always combine promotor and buddy names based on what's actually in the dropdowns
    const promotorName = einsatz.promotor;
    const buddyName = einsatz.buddy_name;
    
    if (promotorName && buddyName) {
      return `${promotorName} & ${buddyName}`;
    } else if (promotorName) {
      return promotorName;
    } else if (buddyName) {
      return buddyName;
    }
    
    return einsatz.product || 'Noch kein Promotor';
  };

  // Helper functions for promotor selection (copied from admin dashboard)
  const getRegionGradient = (region: string) => {
    switch (region) {
      case "wien-noe-bgl":
        return "bg-[#E8F0FE]";
      case "steiermark":
        return "bg-[#E7F5ED]";
      case "salzburg":
        return "bg-[#F0E9FF]";
      case "oberoesterreich":
        return "bg-[#FFF3E6]";
      case "tirol":
        return "bg-[#FDEBF3]";
      case "vorarlberg":
        return "bg-[#EAF8FF]";
      case "kaernten":
        return "bg-[#EAF6FF]";
      default:
        return "bg-gray-50";
    }
  };

  const getRegionBorder = (region: string) => {
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

  // Visits pill colors (match cluster pill fill/border ratio)
  const getVisitsBg = (visits: number) => {
    if (visits <= 5) return 'bg-[#FFF3E6]'; // soft orange
    if (visits <= 10) return 'bg-[#FEF9C3]'; // soft yellow
    return 'bg-[#E7F5ED]'; // soft green
  };
  const getVisitsBorder = (visits: number) => {
    if (visits <= 5) return 'border-[#FFE3C7]';
    if (visits <= 10) return 'border-[#FDE68A]';
    return 'border-[#CFECDD]';
  };

  const selectAllFiltered = () => {
    const filteredNames = promotorsList
      .filter((promotor: any) => 
        (activeRegionFilter === "all" || promotor.region === activeRegionFilter) &&
        promotor.name.toLowerCase().includes(promotorSelectionSearch.toLowerCase())
      )
      .map((promotor: any) => promotor.name);
    
    const allFilteredSelected = filteredNames.every(name => selectedPromotors.includes(name));
    const matchesLastSelection = lastSelectedByIcon.length > 0 && 
      filteredNames.every(name => lastSelectedByIcon.includes(name)) &&
      lastSelectedByIcon.every(name => filteredNames.includes(name));
    
    if (allFilteredSelected && matchesLastSelection) {
      setSelectedPromotors(prev => prev.filter(name => !lastSelectedByIcon.includes(name)));
      setLastSelectedByIcon([]);
    } else {
      setSelectedPromotors(prev => [...new Set([...prev, ...filteredNames])]);
      setLastSelectedByIcon(filteredNames);
    }
  };
  // PLZ to region mapping based on Austrian postal codes
  // Helper function to get tracking status color (for overview tab - same as dashboard)
  const getTrackingStatusColor = (einsatz: any) => {
    // Red for special statuses (krankenstand, urlaub, zeitausgleich, notfall)
    if (['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(einsatz.status)) {
      return 'red';
    }
    
    // Green for started or completed
    if (einsatz.status === 'gestartet' || einsatz.status === 'beendet' || einsatz.actualStart) {
      return 'green';
    }
    
    // Orange for verspätet
    if (einsatz.status === 'verspätet') {
      return 'orange';
    }
    
    // Default gray for pending
    return 'gray';
  };
  const getRegionFromPLZ = (plz: string): string => {
    const plzNum = parseInt(plz);
    if (isNaN(plzNum)) return '';
    
    // Define PLZ mapping - using exact mapping from provided list
    const plzMapping: { [key: string]: string } = {};
    
    // Add all Vienna postal codes (W)
    const viennaPLZ = ['1000','1004','1006','1010','1011','1015','1016','1020','1021','1024','1025','1029','1030','1031','1032','1035','1037','1038','1040','1041','1042','1043','1045','1050','1051','1052','1053','1060','1061','1063','1065','1070','1071','1072','1080','1081','1082','1090','1091','1092','1095','1097','1100','1101','1103','1104','1105','1106','1107','1108','1109','1110','1111','1114','1115','1120','1121','1122','1124','1125','1127','1128','1130','1131','1132','1134','1136','1140','1141','1142','1143','1147','1148','1150','1151','1152','1153','1155','1156','1160','1161','1163','1165','1166','1170','1171','1172','1180','1181','1182','1183','1190','1191','1192','1193','1195','1196','1200','1201','1203','1205','1206','1208','1210','1211','1213','1215','1217','1218','1219','1220','1221','1222','1223','1224','1225','1228','1229','1230','1231','1233','1235','1236','1238','1239','1254','1300','1310','1400','1423','1500','1502','1503','1504','1600','1610'];
    viennaPLZ.forEach(code => plzMapping[code] = 'W');
    
    // Use range-based approach for efficiency since we have thousands of codes
    // W/NÖ/BGL cluster (W, N, B initials)
    if (plzNum >= 1000 && plzNum <= 1610) return 'W/NÖ/BGL'; // Vienna
    if (plzNum >= 2000 && plzNum <= 3999) {
      // Special Burgenland ranges within this area
      if ((plzNum >= 2421 && plzNum <= 2425) || (plzNum >= 2473 && plzNum <= 2475) || plzNum === 2491) return 'W/NÖ/BGL';
      // Special OÖ ranges
      if (plzNum >= 3334 && plzNum <= 3335) return 'OÖ';
      return 'W/NÖ/BGL'; // Most is Niederösterreich
    }
    
    // OÖ (O initial)
    if (plzNum >= 4000 && plzNum <= 4999) {
      // Special Niederösterreich codes in this range
      if (plzNum === 4300 || plzNum === 4303 || (plzNum >= 4431 && plzNum <= 4432) || 
          plzNum === 4441 || plzNum === 4482 || plzNum === 4392) return 'W/NÖ/BGL';
      return 'OÖ';
    }
    
    // Mixed Salzburg (Sa) and OÖ (O)
    if (plzNum >= 5000 && plzNum <= 5999) {
      // OÖ ranges in 5xxx area
      if ((plzNum >= 5120 && plzNum <= 5145) || plzNum === 5166 || 
          (plzNum >= 5211 && plzNum <= 5283) || plzNum === 5310 || 
          plzNum === 5311 || plzNum === 5360) return 'OÖ';
      return 'S'; // Salzburg
    }
    
    // Tirol (T) and Vorarlberg (V)
    if (plzNum >= 6000 && plzNum <= 6999) {
      if (plzNum >= 6700) return 'V'; // Vorarlberg
      return 'T'; // Tirol
    }
    
    // Burgenland (B) range
    if (plzNum >= 7000 && plzNum <= 7999) {
      if (plzNum === 7421) return 'ST'; // Special Steiermark code
      return 'W/NÖ/BGL'; // Burgenland
    }
    
    // Steiermark (St)
    if (plzNum >= 8000 && plzNum <= 8999) {
      // Special Burgenland ranges in this area
      if (plzNum >= 8380 && plzNum <= 8385) return 'W/NÖ/BGL';
      return 'ST'; // Steiermark
    }
    
    // Kärnten (K) and some Tirol (T)
    if (plzNum >= 9000 && plzNum <= 9999) {
      if (plzNum === 9323) return 'ST'; // Special Steiermark
      if (plzNum === 9782 || plzNum >= 9900) return 'T'; // Tirol codes
      return 'K'; // Kärnten
    }
    
    return '';
  };

  // Map the region code from getRegionFromPLZ to the markets cluster slug
  const getClusterFromPLZ = (plz: string): string => {
    const code = getRegionFromPLZ(plz);
    switch (code) {
      case 'W/NÖ/BGL':
        return 'wien-noe-bgl';
      case 'ST':
        return 'steiermark';
      case 'S':
        return 'salzburg';
      case 'OÖ':
        return 'oberoesterreich';
      case 'T':
        return 'tirol';
      case 'V':
        return 'vorarlberg';
      case 'K':
        return 'kaernten';
      default:
        return 'wien-noe-bgl';
    }
  };

  // Parse German opening hours strings like "Mo-Fr 09:00-19:00, Sa 09:00-18:00"
  // into a normalized JSON object with weekday keys. Any missing day becomes "Geschlossen".
  const parseOpeningHoursFromText = (text: string | null | undefined) => {
    const result: Record<string, string> = {
      monday: 'Geschlossen',
      tuesday: 'Geschlossen',
      wednesday: 'Geschlossen',
      thursday: 'Geschlossen',
      friday: 'Geschlossen',
      saturday: 'Geschlossen',
      sunday: 'Geschlossen',
    };
    if (!text) return result;
    const input = String(text).trim();
    if (!input) return result;

    const dayOrder = ['mo','di','mi','do','fr','sa','so'];
    const keyByShort: Record<string, keyof typeof result> = {
      mo: 'monday', di: 'tuesday', mi: 'wednesday', do: 'thursday', fr: 'friday', sa: 'saturday', so: 'sunday',
    };

    // Split by comma sections like "Mo-Fr 09:00-19:00" or "Sa 09:00-18:00" or "So geschlossen"
    const segments = input
      .replace(/\s+/g, ' ')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const setDays = (days: string[], value: string) => {
      days.forEach(d => {
        const k = keyByShort[d as keyof typeof keyByShort];
        if (k) result[k] = value || 'Geschlossen';
      });
    };

    const expandRange = (range: string) => {
      // handle "mo-fr" style (allow various dashes)
      const [startRaw, endRaw] = range.split(/[-–—]/).map(s => s.trim().toLowerCase());
      const start = startRaw.slice(0,2);
      const end = endRaw.slice(0,2);
      const startIdx = dayOrder.indexOf(start);
      const endIdx = dayOrder.indexOf(end);
      if (startIdx === -1 || endIdx === -1) return [] as string[];
      const days: string[] = [];
      for (let i = startIdx; i <= endIdx; i++) days.push(dayOrder[i]);
      return days;
    };

    for (const seg of segments) {
      // Extract day part and time part
      // Examples: "Mo-Fr 09:00-19:00", "Sa 09:00-18:00", "So geschlossen"
      const m = seg.match(/^(Mo|Di|Mi|Do|Fr|Sa|So)(?:\s*[-–—]\s*(Mo|Di|Mi|Do|Fr|Sa|So))?\s*(.*)$/i);
      if (!m) continue;
      const startDay = (m[1] || '').toLowerCase();
      const endDay = (m[2] || '').toLowerCase();
      const rest = (m[3] || '').trim();
      let value = 'Geschlossen';
      if (rest) {
        const lower = rest.toLowerCase();
        if (lower.includes('geschlossen')) {
          value = 'Geschlossen';
        } else {
          // Normalize time separator with en dash for display consistency later
          value = rest.replace(/\s*-\s*/g, '–');
        }
      }
      const days = endDay ? expandRange(`${startDay}-${endDay}`) : [startDay.slice(0,2)];
      setDays(days, value);
    }

    return result;
  };
  // Process Excel file for Roh Excel import
  const processRohExcel = (file: File) => {
    console.log('🔵 processRohExcel START - file:', file.name, 'size:', file.size);
    const reader = new FileReader();
    
    reader.onerror = (error) => {
      console.error('🔴 FileReader error:', error);
      alert('Fehler beim Lesen der Datei');
    };
    
    reader.onload = async (e) => {
      console.log('🔵 FileReader.onload triggered');
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        console.log('🔵 ArrayBuffer size:', data.length);
        const workbook = XLSX.read(data, { type: 'array' });
        console.log('🔵 Workbook sheets:', workbook.SheetNames);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        console.log('🔵 Excel parsed. Total rows:', jsonData.length);
        console.log('🔵 First row (header):', jsonData[0]);
        console.log('🔵 Second row (data):', jsonData[1]);
        console.log('🔵 Date columns from header:', jsonData[0]?.slice(4, 10));
        // Expected layout:
        // Col A: location name (used as address text)
        // Col B: PLZ
        // Col C,D: ignored
        // Row 1 from Col E onwards: date labels (e.g., '04.Aug') as plain text
        // Body from Col E onwards: values 1, 2, or 0.75 meaning shifts per rules
        const header = jsonData[0] || [];
        const rows: any[] = [];
        console.log('🔵 Header length:', header.length);
        if (header.length < 5) throw new Error('Excel-Format unerwartet (Header fehlt)');
        
        console.log('🔵 Starting row processing...');
        for (let r = 1; r < jsonData.length; r++) {
          const row = jsonData[r] || [];
          const location_text = String(row[0] || '').trim();
          const postal_code = String(row[1] || '').trim();
          if (!location_text || !postal_code) continue;
          const city = '';
          const region = getRegionFromPLZ(postal_code);
          let assignmentsForRow = 0;
          for (let c = 4; c < header.length; c++) { // E onwards (0-indexed)
            const label = String(header[c] || '').trim();
            if (!label) continue;
            const cell = row[c];
            const val = typeof cell === 'number' ? cell : parseFloat(String(cell).replace(',', '.'));
            if (![1, 2, 0.75].includes(val)) continue;
            
            if (r === 1 && assignmentsForRow === 0) {
              console.log(`🔵 First valid cell - Col ${c}: label="${label}", value=${val}`);
            }
            
            // Handle Excel serial dates or text dates
            let start: Date;
            const numericLabel = parseInt(label, 10);
            
            if (!isNaN(numericLabel) && numericLabel > 40000) {
              // Excel serial date (days since 1900-01-01, but with leap year bug)
              const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
              const dateOnly = new Date(excelEpoch.getTime() + numericLabel * 24 * 60 * 60 * 1000);
              // Create date in UTC to avoid timezone shifts
              start = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 9, 30, 0, 0));
            } else {
              // Try parsing as text date (e.g., "04.Aug")
              const parts = label.split('.');
              if (parts.length < 2) continue;
              const day = parseInt(parts[0], 10);
              const monthName = parts[1];
              const months: Record<string, number> = { Jan:0, Feb:1, Mär:2, Mrz:2, Apr:3, Mai:4, Jun:5, Jul:6, Aug:7, Sep:8, Okt:9, Nov:10, Dez:11 };
              const month = months[monthName as keyof typeof months];
              if (month == null || isNaN(day)) continue;
              const year = new Date().getFullYear();
              start = new Date(Date.UTC(year, month, day, 9, 30));
            }
            const end = new Date(start);
            if (val === 1 || val === 2) {
              end.setUTCHours(18, 30, 0, 0);
            } else if (val === 0.75) {
              end.setUTCHours(15, 30, 0, 0);
            }
            const base = {
              title: 'Promotion',
              location_text,
              postal_code,
              city,
              region,
              start_ts: start.toISOString(),
              end_ts: end.toISOString(),
              type: 'promotion' as const,
            };
            rows.push(base);
            if (val === 2) rows.push(base);
          }
        }
        console.log('🔵 Assignments to import:', rows.length);
        if (rows.length > 0) {
          console.log('🔵 First assignment:', rows[0]);
          console.log('🔵 Sample dates:', rows.slice(0, 3).map(r => r.start_ts));
        }
        
        const res = await fetch('/api/assignments/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
        console.log('🔵 Import response:', res.status);
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Import fehlgeschlagen: ${res.status} ${t}`);
        }
        const importResult = await res.json();
        console.log('🔵 Import result:', importResult);
        setShowImportModal(false)
        // Load ALL assignments after import to see the new ones
        console.log('🔵 Calling loadAssignments...');
        await loadAssignments(true)
        console.log('🔵 Import complete!');
      } catch (error: any) {
        console.error('🔴 Error processing Roh Excel:', error);
        console.error('🔴 Stack trace:', error?.stack);
        alert(error?.message || 'Fehler beim Verarbeiten');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Process Excel file for EP intern import
  const processInternExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        // Reuse the same parsing as Roh: header row contains dates E→, body has counts
        const header = jsonData[0] || [];
        const rows: any[] = [];
        if (header.length < 5) throw new Error('Excel-Format unerwartet (Header fehlt)');
        for (let r = 1; r < jsonData.length; r++) {
          const row = jsonData[r] || [];
          const location_text = String(row[0] || '').trim();
          const postal_code = String(row[1] || '').trim();
          if (!location_text || !postal_code) continue;
          const city = '';
          const region = getRegionFromPLZ(postal_code);
          for (let c = 4; c < header.length; c++) {
            const label = String(header[c] || '').trim();
            if (!label) continue;
            const cell = row[c];
            const val = typeof cell === 'number' ? cell : parseFloat(String(cell).replace(',', '.'));
            if (![1, 2, 0.75].includes(val)) continue;
            
            // Handle Excel serial dates or text dates
            let start: Date;
            const numericLabel = parseInt(label, 10);
            
            if (!isNaN(numericLabel) && numericLabel > 40000) {
              // Excel serial date (days since 1900-01-01, but with leap year bug)
              const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
              const dateOnly = new Date(excelEpoch.getTime() + numericLabel * 24 * 60 * 60 * 1000);
              // Create date in UTC to avoid timezone shifts
              start = new Date(Date.UTC(dateOnly.getFullYear(), dateOnly.getMonth(), dateOnly.getDate(), 9, 30, 0, 0));
          } else {
              // Try parsing as text date (e.g., "04.Aug")
              const parts = label.split('.');
              if (parts.length < 2) continue;
              const day = parseInt(parts[0], 10);
              const monthName = parts[1];
              const months: Record<string, number> = { Jan:0, Feb:1, Mär:2, Mrz:2, Apr:3, Mai:4, Jun:5, Jul:6, Aug:7, Sep:8, Okt:9, Nov:10, Dez:11 };
              const month = months[monthName as keyof typeof months];
              if (month == null || isNaN(day)) continue;
              const year = new Date().getFullYear();
              start = new Date(Date.UTC(year, month, day, 9, 30));
            }
            const end = new Date(start);
            if (val === 1 || val === 2) {
              end.setUTCHours(18, 30, 0, 0);
            } else if (val === 0.75) {
              end.setUTCHours(15, 30, 0, 0);
            }
            const base = {
              title: 'Promotion',
              location_text,
              postal_code,
              city,
              region,
              start_ts: start.toISOString(),
              end_ts: end.toISOString(),
              type: 'promotion' as const,
            };
            rows.push(base);
            if (val === 2) rows.push(base);
          }
        }
        
        const res = await fetch('/api/assignments/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows }) })
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Import fehlgeschlagen: ${res.status} ${t}`);
        }
        setShowImportModal(false)
        // Load ALL assignments after import to see the new ones
        await loadAssignments(true)
      } catch (error: any) {
        console.error('Error processing EP intern Excel file:', error);
        alert(error?.message || 'Fehler beim Verarbeiten der EP intern Excel-Datei');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Process Excel file for Markets (POS) import
  const processMarketsExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows2d: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Find the header row (contains 'Öffnungszeiten' somewhere and likely 'Markt')
        let startRow = 2; // default after title rows
        for (let i = 0; i < Math.min(rows2d.length, 10); i++) {
          const row = (rows2d[i] || []).map((c: any) => String(c || ''));
          const hasHours = row.some((c: string) => c.toLowerCase().includes('öffnungszeiten'));
          const hasMarkt = row.some((c: string) => c.toLowerCase().includes('markt'));
          if (hasHours && hasMarkt) {
            startRow = i + 1; // data starts right after header
            break;
          }
        }

        const toInsert: any[] = [];
        for (let r = startRow; r < rows2d.length; r++) {
          const row = rows2d[r] || [];
          const name = String(row[1] || '').trim(); // Col B
          if (!name) continue;
          const marktleiter = String(row[2] || '').trim(); // Col C
          const email = String(row[3] || '').trim(); // Col D
          const plz = String(row[4] || '').toString().trim(); // Col E
          const city = String(row[5] || '').trim(); // Col F
          const address = String(row[6] || '').trim(); // Col G
          const hoursText = String(row[7] || '').trim(); // Col H
          const openingHours = parseOpeningHoursFromText(hoursText);
          const cluster = getClusterFromPLZ(plz);

          toInsert.push({
            name,
            address,
            plz,
            city,
            cluster,
            marktleiter,
            marktleiterEmail: email,
            status: 'active',
            openingHours,
          });
        }

        if (toInsert.length === 0) {
          alert('Keine gültigen Markt-Zeilen gefunden');
          return;
        }

        const res = await fetch('/api/admin/markets/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rows: toInsert }),
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Import fehlgeschlagen: ${res.status} ${t}`);
        }
        setShowImportModal(false);
        await loadMarkets();
      } catch (error: any) {
        console.error('Error processing Markets Excel file:', error);
        alert(error?.message || 'Fehler beim Verarbeiten der Märkte Excel-Datei');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle replacement assignment selection
  const handleReplacementAssignmentSelect = (assignmentId: string) => {
    setSelectedReplacementAssignments(prev => 
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  // Handle sending replacement invites
  const handleSendReplacementInvites = async () => {
    if (!declinedPromotor || selectedReplacementAssignments.length === 0) return;
    
    try {
      const res = await fetch('/api/assignments/bulk-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_ids: selectedReplacementAssignments,
          promotor_ids: [declinedPromotor.user_id],
          buddy: false,
          replacement_for: declinedPromotor.invitation_id
        })
      });
      
      if (res.ok) {
        setShowReplacementModal(false);
        setDeclinedPromotor(null);
        setSelectedReplacementAssignments([]);
        
        // Update the status in the invitations to show as replacement
        // This will trigger the replacement UI in the promotor's view
      }
      } catch (error) {
      console.error('Error sending replacement invites:', error);
      }
  };
  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file?.name, 'Import type:', importType);
    if (file) {
      if (activeView === 'maerkte') {
        processMarketsExcel(file);
      } else {
      if (importType === 'roh') {
        processRohExcel(file);
      } else if (importType === 'intern') {
        processInternExcel(file);
      } else {
        console.log('Unknown import type:', importType);
        }
      }
    }
  };

  // Handle drag and drop
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    console.log('File dropped:', file?.name, 'Import type:', importType);
    if (file) {
      if (activeView === 'maerkte') {
        processMarketsExcel(file);
      } else {
      if (importType === 'roh') {
        processRohExcel(file);
      } else if (importType === 'intern') {
        processInternExcel(file);
      } else {
        console.log('Unknown import type:', importType);
        }
      }
    }
  };
  // Generate day cards with status counts
  const generateDayCards = () => {
    const dayMap = new Map();
    
    // Group einsatzplan data by date
    filteredEinsatzplan.forEach(item => {
      const date = item.date;
      if (!dayMap.has(date)) {
        dayMap.set(date, {
          date: date,
          verplant: 0,
          offen: 0,
          buddyTag: 0,
          krankenstand: 0,
          notfall: 0,
          urlaub: 0,
          zeitausgleich: 0,
          total: 0
        });
      }
      
      const dayData = dayMap.get(date);
      dayData.total++;
      
      // Count based on status
      switch(item.status.toLowerCase()) {
        case 'bestätigt':
        case 'verplant':
          dayData.verplant++;
          break;
        case 'buddy tag':
          dayData.buddyTag++;
          break;
        case 'geplant':
        case 'offen':
          dayData.offen++;
          break;
        case 'krankenstand':
          dayData.krankenstand++;
          break;
        case 'notfall':
          dayData.notfall++;
          break;
        case 'urlaub':
          dayData.urlaub++;
          break;
        case 'zeitausgleich':
          dayData.zeitausgleich++;
          break;
        default:
          dayData.offen++;
      }
    });
    
    // Convert to array and sort by date
    return Array.from(dayMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  // Format date for display
  const formatDateForCard = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Heute';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Morgen';
    } else {
      return date.toLocaleDateString('de-DE', { 
        weekday: 'short', 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };
  const filteredEinsatzplan = useMemo(() => {
    return einsatzplanData.filter(item => {
    // Region filter using PLZ mapping
    const itemRegion = getRegionFromPLZ(item.plz);
    const regionMatch = regionFilter === "ALLE" || itemRegion === regionFilter;
    
    // PLZ filter
    const plzMatch = !plzFilter || item.plz === plzFilter;
    
    // Promotor filter
    const promotorMatch = !promotorFilter || item.promotor === promotorFilter;
    
    // Status filter
    const statusMatch = !statusFilter || item.status === statusFilter;
    
    // Market filter - trim whitespace for comparison
    const marketMatch = !marketFilter || (item.market || '').trim() === marketFilter.trim();
    
    // Eye filter - hide all non-"Offen" items when active, based on UI status (dropdown value)
    const verplantMatch = !hideVerplant || item.status === 'Offen';
    
    // Date filters
    let dateMatch = true;
    
    // Single date filter (from day card clicks)
    if (dateFilter) {
      dateMatch = item.date === dateFilter;
    }
    // Calendar weeks filter
    else if (selectedWeeks.length > 0) {
      dateMatch = selectedWeeks.some(weekStr => {
        // Extract date range from label "KW 36 (08.09-14.09)"
        const match = weekStr.match(/\((\d{2})\.(\d{2})-(\d{2})\.(\d{2})\)/);
        if (!match) {
          console.warn('Failed to parse week string:', weekStr);
          return false;
        }
        
        const [, startDay, startMonth, endDay, endMonth] = match;
        const currentYear = new Date().getFullYear();
        const weekStart = `${currentYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`;
        const weekEnd = `${currentYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`;
        
        const matches = item.date >= weekStart && item.date <= weekEnd;
        
        // Debug logging removed for performance
        
        return matches;
      });
    }
    // Date range filter
    else if (dateRange.start) {
      if (dateRange.end) {
        const start = dateRange.start <= dateRange.end ? dateRange.start : dateRange.end;
        const end = dateRange.start <= dateRange.end ? dateRange.end : dateRange.start;
        dateMatch = item.date >= start && item.date <= end;
      } else {
        dateMatch = item.date === dateRange.start;
      }
    }
    
    return regionMatch && plzMatch && promotorMatch && statusMatch && marketMatch && verplantMatch && dateMatch;
  }).sort((a, b) => {
    // Sort by date (nearest to farthest)
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });
  }, [einsatzplanData, regionFilter, plzFilter, promotorFilter, statusFilter, marketFilter, hideVerplant, dateFilter, selectedWeeks, selectedDates, dateRange]);

  // Load invite counts and details for the currently filtered list
  useEffect(() => {
    const loadInvitesData = async () => {
      try {
        const ids = filteredEinsatzplan.map((i: any) => i.id);
        if (ids.length === 0) return;
        
        const qs = new URLSearchParams({ ids: ids.join(',') }).toString();
        
        // Fetch counts
        const countsRes = await fetch(`/api/assignments/invites/counts?${qs}`, { cache: 'no-store' });
        const { counts } = await countsRes.json().catch(() => ({ counts: {} }));
        setInviteCounts(counts || {});
        
        // Fetch details (promotor names)
        const detailsRes = await fetch(`/api/assignments/invites/details?${qs}`, { cache: 'no-store' });
        const { details } = await detailsRes.json().catch(() => ({ details: {} }));
        setInviteDetails(details || {});
      } catch {}
    };
    
    loadInvitesData();
  }, [filteredEinsatzplan]);

  // Debug logging removed for performance

  // Memoize statistics to prevent repeated calculations
  const einsatzStats = useMemo(() => {
    const confirmed = filteredEinsatzplan.filter(item => ['bestätigt', 'Verplant', 'Buddy Tag'].includes(item.status)).length;
    const cancelled = filteredEinsatzplan.filter(item => ['Krankenstand', 'Sonderfall'].includes(item.status)).length;
    const planned = filteredEinsatzplan.filter(item => !['bestätigt', 'Verplant', 'Buddy Tag', 'Krankenstand', 'Sonderfall'].includes(item.status)).length;
    const total = filteredEinsatzplan.length;
    
    return {
      confirmed,
      cancelled,
      planned,
      total,
      confirmedPercentage: total > 0 ? Math.min(100, (confirmed / total) * 100) : 0
    };
  }, [filteredEinsatzplan]);

  const loadAssignments = async (skipFilters = false) => {
    console.log('🟢 loadAssignments called, skipFilters:', skipFilters);
    const startTime = Date.now(); // Track loading start time
    try {
      setAssignmentsLoading(true);
      const params = new URLSearchParams();
      // Only apply filters if not skipping (e.g., after import we want to see all)
      if (!skipFilters) {
        if (dateRange.start) params.set('from', new Date(dateRange.start).toISOString());
        if (dateRange.end) params.set('to', new Date(dateRange.end).toISOString());
        if (regionFilter && regionFilter !== 'ALLE') params.set('region', regionFilter);
        if (statusFilter) params.set('status', statusFilter);
      }
      console.log('🟢 Fetching from /api/assignments with params:', params.toString());
      const res = await fetch(`/api/assignments?${params.toString()}`, { cache: 'no-store' });
      console.log('🟢 Response status:', res.status);
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`Laden fehlgeschlagen: ${res.status} ${t}`);
      }
      const j = await res.json();
      console.log('🟢 Response data:', j);
      const rows: any[] = Array.isArray(j.assignments) ? j.assignments : [];
      console.log('🟢 Assignments count:', rows.length);
      if (rows.length > 0) {
              console.log('🟢 First assignment data:', rows[0]);
      console.log('🟢 Notes field in first assignment:', rows[0].notes);
      }
      const mapped = rows.map((r) => {
        const startIso: string = r.start_ts || ''
        const endIso: string = r.end_ts || r.start_ts || ''
        const timeStart = startIso ? startIso.substring(11, 16) : '09:30'
        const timeEnd = endIso ? endIso.substring(11, 16) : ''
        const timeText = timeEnd ? `${timeStart}-${timeEnd}` : timeStart

        const trackingStatus = (r.tracking_status || '').toLowerCase()
        const actualStart = r.tracking_actual_start_time ? r.tracking_actual_start_time.substring(11, 16) : null
        const actualEnd = r.tracking_actual_end_time ? r.tracking_actual_end_time.substring(11, 16) : null

        const mapSpecialStatus = (value: string) => (
          value === 'krankenstand' ? 'Krankenstand' :
          value === 'notfall' ? 'Sonderfall' :
          value === 'urlaub' ? 'Urlaub' :
          value === 'zeitausgleich' ? 'Zeitausgleich' :
          value === 'markierte' ? 'Markierte' :
          value === 'bestätigt' ? 'Bestätigt' :
          value === 'geplant' ? 'Geplant' :
          value
        )

        const defaultStatus = (r.buddy_name || r.buddy_display_name || r.buddy_user_id) ? 'Buddy Tag' :
          (r.status === 'assigned' ? 'Verplant' :
            r.status === 'buddy_tag' ? 'Buddy Tag' :
              r.status === 'open' ? 'Offen' :
                (r.status || 'Offen'))

        let statusLabel: string
        if (r.special_status) {
          statusLabel = mapSpecialStatus(r.special_status)
        } else if (['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(trackingStatus)) {
          statusLabel = mapSpecialStatus(trackingStatus)
        } else if (trackingStatus === 'beendet') {
          statusLabel = 'Beendet'
        } else if (trackingStatus === 'gestartet') {
          statusLabel = 'Gestartet'
        } else if (trackingStatus === 'verspätet') {
          statusLabel = 'Verspätet'
        } else {
          statusLabel = defaultStatus
        }

        return {
          id: r.id,
          date: r.start_ts ? new Date(r.start_ts).toISOString().slice(0,10) : '',
          time: timeText,
          city: r.city || r.location_text || '',
          address: r.location_text || '',
          planStart: timeStart,
          planEnd: timeEnd,
          actualStart,
          actualEnd,
          plz: r.postal_code || '',
          region: r.region || getRegionFromPLZ(String(r.postal_code || '')),
          status: statusLabel,
          tracking_status: trackingStatus || null,
          promotor: r.lead_name || (r.status === 'assigned' ? 'Verplant' : ''),
          promotorId: r.lead_user_id,
          buddy_name: r.buddy_name || r.buddy_display_name,
          buddy_user_id: r.buddy_user_id,
          promotionCount: 1,
          promotorCount: 0,
          promotions: [{ id: r.id }],
          notes: r.tracking_notes || r.notes || '',
          special_status: r.special_status || null,
          market: r.location_text || '',
          matched_market_id: (r as any).matched_market_id || null,
          early_start_reason: r.tracking_early_start_reason || null,
          minutes_early_start: r.tracking_minutes_early_start ?? null,
          early_end_reason: r.tracking_early_end_reason || null,
          minutes_early_end: r.tracking_minutes_early_end ?? null,
          foto_maschine_url: r.tracking_foto_maschine_url || null,
          foto_kapsellade_url: r.tracking_foto_kapsellade_url || null,
          foto_pos_gesamt_url: r.tracking_foto_pos_gesamt_url || null,
          foto_extra_url: r.tracking_foto_extra_url || null,
        }
      });
      console.log('🟢 Mapped data:', mapped.length, 'items');
      console.log('🟢 First mapped item:', mapped[0]);
      
      // Overlay today's tracking status for finished assignments to show proper coloring (e.g., "beendet")
      let mappedWithToday = mapped;
      try {
        const todayRes = await fetch('/api/assignments/today', { cache: 'no-store' });
        if (todayRes.ok) {
          const todayJson = await todayRes.json().catch(() => ({}));
          const todayAssignments: Array<{ assignment_id: string; display_status?: string }> = Array.isArray(todayJson.assignments) ? todayJson.assignments : [];
          if (todayAssignments.length > 0) {
            const todayMap = new Map(todayAssignments.map(a => [a.assignment_id, (a.display_status || '').toLowerCase()]));
            mappedWithToday = mapped.map(item => {
              const ds = todayMap.get(item.id);
              // Only override to Beendet; leave other statuses as-is to avoid side effects
              if (ds === 'beendet') {
                return { ...item, status: 'Beendet' };
              }
              return item;
            });
          }
        }
      } catch {}
      

      
      // Check for duplicate IDs before setting state
      const ids = mapped.map(m => m.id);
      const uniqueIds = new Set(ids);
      if (ids.length !== uniqueIds.size) {
        console.error('⚠️ DUPLICATE IDs detected in fetched data!', {
          total: ids.length,
          unique: uniqueIds.size,
          duplicates: ids.filter((id, index) => ids.indexOf(id) !== index)
        });
      }
      
      // Check for Sept 2 assignments specifically
      const sept2Assignments = mapped.filter(m => m.date.includes('2025-09-02'));
      console.log('🟢 Sept 2 assignments in fetched data:', sept2Assignments.length, sept2Assignments.map(a => ({ id: a.id, date: a.date, promotor: a.promotor })));
      
      setEinsatzplanData(mappedWithToday);
      console.log('🟢 State updated with', mapped.length, 'assignments');
      
      // Extract unique markets from assignments (using location_text)
      const markets = new Set<string>();
      rows.forEach((r: any) => {
        const market = r.location_text || '';
        if (market && market.trim()) {
          markets.add(market.trim());
        }
      });
      setMarketsList(Array.from(markets).sort());
    } catch (e: any) {
      console.error('🔴 loadAssignments error:', e);
      alert(e?.message || 'Fehler beim Laden der Einsätze');
    } finally {
      // Ensure minimum loading time to show beautiful skeletons
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 600; // 0.6 seconds - enough to see skeletons without being annoying
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      setTimeout(() => {
        setAssignmentsLoading(false);
      }, remainingTime);
    }
  };

  useEffect(() => { 
    loadAssignments(true); 
    loadMarkets();
    loadPromotorsList();
  }, []);

  // (Batch auto-match effect below handles matching on refresh)

  // Reset photo indices when market detail modal opens
  useEffect(() => {
    if (showMarketDetailModal) {
      setPhotoInternalIndex(0);
      setPhotoExteriorIndex(0);
      setPhotoInteriorIndex(0);
      setPhotoProductsIndex(0);
    }
  }, [showMarketDetailModal]);

  // Try to auto-match all unmatched assignments once after data loads (per refresh)
  const hasRunAutoMatchRef = useRef(false);
  useEffect(() => {
    const runBatchAutoMatch = async () => {
      if (hasRunAutoMatchRef.current) return;
      if (assignmentsLoading || marketsLoading) return;
      hasRunAutoMatchRef.current = true;
      try {
        await fetch('/api/assignments/auto-match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unmatchedOnly: true })
        });
      } catch {}
    };
    runBatchAutoMatch();
  }, [assignmentsLoading, marketsLoading]);

  // Close acceptance popover on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!showAcceptancePopover) return;
      const target = e.target as Node;
      if (acceptancePopoverRef.current && acceptancePopoverRef.current.contains(target)) return;
      if (acceptanceAnchorRef.current && acceptanceAnchorRef.current.contains(target as Node)) return;
      setShowAcceptancePopover(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [showAcceptancePopover]);

  // Helpers to add/remove acceptance addresses
  const addAcceptanceAddress = async () => {
    if (!editingMarket?.id) return;
    const raw = acceptanceRaw.trim();
    if (!raw || raw.split(/\s+/).length < 2) return;
    setAcceptanceSaving(true);
    const fingerprint = normalizeForMatch([raw].join(' ').trim());
    const current: any[] = Array.isArray(editingMarket.acceptance_addresses) ? editingMarket.acceptance_addresses : [];
    if (current.some((e: any) => (e?.fingerprint || '') === fingerprint)) {
      // Reset input quietly
      setAcceptanceRaw(''); setAcceptancePlz(''); setAcceptanceCity('');
      setAcceptanceSaving(false);
      return;
    }
    const optimistic = [{ raw, fingerprint, plz: acceptancePlz || null, city: acceptanceCity || null, source: 'manual', added_at: new Date().toISOString() }, ...current].slice(0, 30);
    setEditingMarket({ ...editingMarket, acceptance_addresses: optimistic });
    setAcceptanceRaw(''); setAcceptancePlz(''); setAcceptanceCity('');
    try {
      const res = await fetch(`/api/admin/markets/${editingMarket.id}/acceptance-addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, plz: acceptancePlz || null, city: acceptanceCity || null })
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setEditingMarket((prev: any) => prev ? { ...prev, acceptance_addresses: Array.isArray(j.acceptance_addresses) ? j.acceptance_addresses : prev.acceptance_addresses } : prev);
      } else {
        // revert on error
        setEditingMarket((prev: any) => prev ? { ...prev, acceptance_addresses: current } : prev);
      }
    } catch {
      setEditingMarket((prev: any) => prev ? { ...prev, acceptance_addresses: current } : prev);
    } finally {
      setAcceptanceSaving(false);
    }
  };

  const removeAcceptanceAddress = async (fingerprint: string) => {
    if (!editingMarket?.id) return;
    const current: any[] = Array.isArray(editingMarket.acceptance_addresses) ? editingMarket.acceptance_addresses : [];
    const optimistic = current.filter((e: any) => (e?.fingerprint || '') !== fingerprint);
    setEditingMarket({ ...editingMarket, acceptance_addresses: optimistic });
    try {
      const res = await fetch(`/api/admin/markets/${editingMarket.id}/acceptance-addresses`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprint })
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) {
        setEditingMarket((prev: any) => prev ? { ...prev, acceptance_addresses: Array.isArray(j.acceptance_addresses) ? j.acceptance_addresses : optimistic } : prev);
      } else {
        setEditingMarket((prev: any) => prev ? { ...prev, acceptance_addresses: current } : prev);
      }
    } catch {
      setEditingMarket((prev: any) => prev ? { ...prev, acceptance_addresses: current } : prev);
    }
  };
  return (
    <div className="min-h-screen bg-gray-50/30">
      <style jsx>{customScrollbarStyle}</style>
      {/* Admin Navigation */}
      <AdminNavigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-14'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">{activeView === 'einsatzplan' ? 'Einsatzplan' : 'Märkte'}</h1>
              <p className="text-gray-500 text-sm">{activeView === 'einsatzplan' ? 'Übersicht und Planung aller Einsätze' : 'Markt-Verwaltung und Informationen'}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setActiveView('einsatzplan')}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                  activeView === 'einsatzplan'
                    ? 'bg-gray-100 text-gray-900 border-gray-300 scale-[1.02] shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Calendar className="h-4 w-4" />
                <span>Einsatzplan</span>
              </button>
              <button
                onClick={() => setActiveView('maerkte')}
                className={`flex items-center space-x-2 px-3 py-2 text-sm border rounded-lg transition-all duration-200 ${
                  activeView === 'maerkte'
                    ? 'bg-gray-100 text-gray-900 border-gray-300 scale-[1.02] shadow-sm' 
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                <Store className="h-4 w-4" />
                <span>Märkte</span>
              </button>
              
              {activeView === 'einsatzplan' && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 text-sm text-white border border-gray-200 rounded-lg transition-colors"
                  style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)', opacity: 0.85}}
                >
Import EP
                </button>
              )}

              {activeView === 'maerkte' && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 text-sm text-white border border-gray-200 rounded-lg transition-colors"
                  style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)', opacity: 0.85}}
                >
                  Import POS
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8 space-y-6">
          {activeView === 'einsatzplan' ? (
          <>
          {/* Einsatzplan View */}
          <div className="flex gap-6">
            {/* Big Card - Left Side */}
            <div className="flex-[3] relative">
              {/* Invisible placeholder to maintain layout space when expanded */}
              <div className="h-[600px] w-full"></div>
              
              <Card 
                className={`border-0 w-full transition-all duration-300 overflow-visible ${isMainCardExpanded ? 'absolute top-0 left-0 right-0 h-[960px] z-20' : 'absolute top-0 left-0 right-0 h-[600px]'}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(99, 102, 241, 0.003) 50%, rgba(79, 70, 229, 0.005) 100%)',
                  boxShadow: '0 4px 20px -2px rgba(255, 133, 82, 0.06), 0 2px 8px -1px rgba(255, 185, 151, 0.04), 0 8px 32px -4px rgba(255, 133, 82, 0.03)',
                  overflow: 'visible'
                }}
              >
                <CardContent className={`p-6 h-full flex flex-col overflow-visible ${isMainCardExpanded ? 'bg-white' : ''}`}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Einsatzplan</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            // Set to current week
                            const currentWeek = getCurrentWeek();
                            const weeks = generateCalendarWeeks();
                            const currentWeekStr = weeks.find(w => w.startsWith(`KW ${currentWeek} `)) || weeks[0];
                            setAuslastungKW(currentWeekStr);
                            setShowAuslastungModal(true);
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                          title="Auslastung anzeigen"
                        >
                          <Dumbbell className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                          title="Neuen Einsatz erstellen"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setIsMainCardExpanded(!isMainCardExpanded)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                        >
                          {isMainCardExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => setViewMode(viewMode === 'list' ? 'days' : 'list')}
                          className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                        >
                          {viewMode === 'list' ? (
                            <LayoutGrid className="h-4 w-4 text-gray-600" />
                          ) : (
                            <LayoutList className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                                          {/* Region Filter Pills */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {["ALLE", "W/NÖ/BGL", "ST", "S", "OÖ", "T", "V", "K"].map((region) => {
                          const isSelected = regionFilter === region || (regionFilter === "ALLE" && region === "ALLE");
                          return (
                            <button
                              key={region}
                              onClick={() => setRegionFilter(regionFilter === region ? "ALLE" : region)}
                              className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 border border-gray-200 inline-flex items-center justify-center ${region === 'W/NÖ/BGL' ? 'max-w-[110px]' : 'max-w-[80px]'} ${
                                isSelected 
                                  ? 'bg-gray-100 text-gray-700 font-medium' 
                                  : 'bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                              style={isSelected ? { transform: 'scale(1.05)' } : undefined}
                            >
                              <span className="truncate whitespace-nowrap block w-full">{region}</span>
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* PLZ, Status and Date Filter Pills */}
                      <div className="flex items-center space-x-2">
                        {/* PLZ Filter Pill + Matched Filter + Search */}
                        <div className="flex items-center space-x-2">
                        <div className="relative">
                          <button
                            onClick={() => setShowPlzDropdown(!showPlzDropdown)}
                            className={`px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-white to-blue-100/60 border border-gray-200 transition-all duration-200 hover:to-blue-100/80 inline-flex items-center justify-center max-w-[70px] ${
                              plzFilter
                                ? 'text-gray-700 font-medium' 
                                : 'text-gray-500'
                            }`}
                            style={plzFilter ? { transform: 'scale(1.05)' } : undefined}
                          >
                            <span className="truncate whitespace-nowrap block w-full">{plzFilter || 'PLZ'}</span>
                          </button>
                          
                          {showPlzDropdown && (
                            <div 
                              ref={plzDropdownRef}
                              className="absolute top-full right-0 mt-1 border-0 rounded-lg shadow-lg z-10 w-40 bg-white max-h-60 overflow-y-auto custom-scrollbar"
                            >
                              <div className="p-2">
                                <button
                                  onClick={() => {
                                    setPlzFilter("");
                                    setShowPlzDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Alle PLZ
                                </button>
                                  {[...new Set(marketsData.map(m => m.plz))].sort().map((plz) => (
                                  <button
                                    key={plz}
                                    onClick={() => {
                                      setPlzFilter(plz);
                                      setShowPlzDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                                      plzFilter === plz
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                                  >
                                    {plz}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          </div>

                          {/* Matched filter pill */}
                          <button
                            onClick={() => setMatchedOnly(prev => !prev)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-all duration-200 inline-flex items-center justify-center max-w-[140px] ${
                              matchedOnly
                                ? 'bg-red-100 text-red-700 border-red-300 font-medium'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-red-50'
                            }`}
                            style={matchedOnly ? { transform: 'scale(1.05)' } : undefined}
                            title="Nur Einsätze ohne zugeordneten Markt anzeigen"
                          >
                            <span className="truncate whitespace-nowrap block w-full">Nicht zugeordnet</span>
                          </button>
                        </div>
                        
                        {/* Promotor Filter Pill */}
                        <div className="relative">
                          <button
                            onClick={() => setShowPromotorDropdown(!showPromotorDropdown)}
                            className={`px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-white to-purple-100/60 border border-gray-200 transition-all duration-200 hover:to-purple-100/80 inline-flex items-center justify-center max-w-[120px] ${
                              promotorFilter
                                ? 'text-gray-700 font-medium' 
                                : 'text-gray-500'
                            }`}
                            style={promotorFilter ? { transform: 'scale(1.05)' } : undefined}
                          >
                            <span className="truncate whitespace-nowrap block" style={{ maxWidth: '6ch' }}>{promotorFilter || 'Promotor'}</span>
                          </button>
                          
                          {showPromotorDropdown && (
                            <div 
                              ref={promotorDropdownRef}
                              className="absolute top-full right-0 mt-1 border-0 rounded-lg shadow-lg z-10 w-48 bg-white max-h-60 overflow-hidden custom-scrollbar"
                            >
                              <div className="p-2">
                                <div className="mb-2" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={promotorFilterSearch}
                                    onChange={(e) => setPromotorFilterSearch(e.target.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    placeholder="Suchen..."
                                    className="w-full h-8 px-2 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                  <button
                                    onClick={() => {
                                      setPromotorFilter("");
                                      setPromotorFilterSearch("");
                                      setShowPromotorDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    Alle Promotoren
                                  </button>
                                  {promotorsList
                                    .filter((promotor) => promotor.name.toLowerCase().includes(promotorFilterSearch.toLowerCase()))
                                    .map((promotor) => (
                                      <button
                                        key={promotor.id}
                                        onClick={() => {
                                          setPromotorFilter(promotor.name);
                                          setPromotorFilterSearch("");
                                          setShowPromotorDropdown(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                                          promotorFilter === promotor.name
                                            ? 'bg-gray-100 text-gray-700'
                                            : 'hover:bg-gray-50 text-gray-600'
                                        }`}
                                      >
                                        {promotor.name}
                                      </button>
                                    ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Status Filter Pill */}
                        <div className="relative">
                          <button
                            onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                            className={`px-3 py-1.5 rounded-full text-xs bg-gradient-to-r ${
                              statusFilter ? getStatusGradient(statusFilter) : 'from-white to-white'
                            } border border-gray-200 transition-all duration-200 hover:bg-gray-50 inline-flex items-center justify-center max-w-[100px] ${
                              statusFilter
                                ? 'text-gray-700 font-medium' 
                                : 'text-gray-500'
                            }`}
                            style={statusFilter ? { transform: 'scale(1.05)' } : undefined}
                          >
                            <span className="truncate whitespace-nowrap block" style={{ maxWidth: '6ch' }}>{statusFilter || 'Status'}</span>
                          </button>
                          
                          {showStatusDropdown && (
                            <div 
                              ref={statusDropdownRef}
                              className="absolute top-full right-0 mt-1 border-0 rounded-lg shadow-lg z-10 w-44 bg-white max-h-60 overflow-y-auto custom-scrollbar"
                            >
                              <div className="p-2">
                                <button
                                  onClick={() => {
                                    setStatusFilter("");
                                    setShowStatusDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Alle Status
                                </button>
                                {getStatusOptions().map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      setStatusFilter(status);
                                      setShowStatusDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                                      statusFilter === status
                                        ? 'bg-gray-100 text-gray-700'
                                        : `text-gray-600 ${getStatusHoverClass(status)}`
                                    }`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Market Filter Pill */}
                        <div className="relative">
                          <button
                            onClick={() => setShowMarketDropdown(!showMarketDropdown)}
                            className={`px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-white to-purple-100/60 border border-gray-200 transition-all duration-200 hover:to-purple-100/80 inline-flex items-center justify-center max-w-[140px] ${
                              marketFilter
                                ? 'text-gray-700 font-medium' 
                                : 'text-gray-500'
                            }`}
                            style={marketFilter ? { transform: 'scale(1.05)' } : undefined}
                          >
                            <span className="truncate whitespace-nowrap block" style={{ maxWidth: '6ch' }}>{marketFilter || 'Market'}</span>
                          </button>
                          
                          {showMarketDropdown && (
                            <div 
                              className="absolute top-full right-0 mt-1 border-0 rounded-lg shadow-lg z-10 w-80 bg-white max-h-[220px] overflow-y-auto no-scrollbar"
                            >
                              <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto no-scrollbar">
                                <button
                                  onClick={() => {
                                    setMarketFilter("");
                                    setShowMarketDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Alle Markets
                                </button>
                                {marketsList.map((market) => (
                                  <button
                                    key={market}
                                    onClick={() => {
                                      setMarketFilter(market);
                                      setShowMarketDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                                      marketFilter === market
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'hover:bg-purple-100/50 text-gray-600'
                                    }`}
                                  >
                                    {market}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Date Filter Pill */}
                        <div className="relative">
                        <button
                          onClick={() => setShowDateDropdown(!showDateDropdown)}
                          className={`px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-white to-orange-50/30 border border-gray-200 transition-all duration-200 hover:to-orange-50/50 inline-flex items-center justify-center max-w-[110px] ${
                            selectedWeeks.length > 0 || dateRange.start || dateFilter
                              ? 'text-black font-medium' 
                              : 'text-gray-500'
                          }`}
                          style={(selectedWeeks.length > 0 || dateRange.start || dateFilter) ? { transform: 'scale(1.05)' } : undefined}
                        >
                          <span className="truncate whitespace-nowrap block w-full">{getFilterDisplayText()}</span>
                        </button>
                        
                        {showDateDropdown && (
                                                      <div 
                              ref={dateDropdownRef}
                              className="absolute top-full right-0 mt-1 border-0 rounded-lg shadow-lg z-10 w-80 bg-white max-h-96 overflow-y-auto custom-scrollbar"
                            >
                            {/* View Mode Toggle */}
                            <div className="p-3 border-b border-gray-100">
                              <div className="flex items-center justify-between">
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => setDateViewMode('weeks')}
                                    className={`px-3 py-1 rounded text-xs transition-colors ${
                                      dateViewMode === 'weeks' 
                                        ? 'bg-gray-100 text-gray-700' 
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-75'
                                    }`}
                                  >
                                    Kalenderwochen
                                  </button>
                                  <button
                                    onClick={() => setDateViewMode('calendar')}
                                    className={`px-3 py-1 rounded text-xs transition-colors ${
                                      dateViewMode === 'calendar' 
                                        ? 'bg-gray-100 text-gray-700' 
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-75'
                                    }`}
                                  >
                                    Kalender
                                  </button>
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedWeeks([]);
                                    setSelectedDates([]);
                                    setDateRange({ start: null, end: null });
                                    setDateFilter("");
                                    setShowDateDropdown(false);
                                  }}
                                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                                  title="Filter zurücksetzen"
                                >
                                  <X className="h-3 w-3 text-gray-400" />
                                </button>
                              </div>
                            </div>
                            
                            {/* Content Area */}
                            <div className="p-3">
                              {dateViewMode === 'weeks' ? (
                                <div ref={weeksContainerRef} className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                  {generateCalendarWeeks().map((week) => (
                                    <button
                                      key={week}
                                      onClick={() => {
                                        setDateFilter("");
                                        setDateRange({ start: null, end: null });
                                        setSelectedDates([]);
                                        setSelectedWeeks(prev => 
                                          prev.includes(week) 
                                            ? prev.filter(w => w !== week)
                                            : [...prev, week]
                                        );
                                      }}
                                      className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                                        selectedWeeks.includes(week)
                                          ? 'bg-gray-100 text-gray-700'
                                          : 'hover:bg-gray-50 text-gray-600'
                                      }`}
                                    >
                                      {week}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {/* Month Header */}
                                  <div className="flex items-center justify-between">
                                    <button
                                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                                      className="p-1 rounded hover:bg-gray-50 transition-colors"
                                    >
                                      <ChevronLeft className="h-4 w-4 text-gray-400" />
                                    </button>
                                    <h4 className="text-sm font-medium text-gray-700">
                                      {currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                                    </h4>
                                    <button
                                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                                      className="p-1 rounded hover:bg-gray-50 transition-colors"
                                    >
                                      <ChevronRight className="h-4 w-4 text-gray-400" />
                                    </button>
                                  </div>
                                  
                                  {/* Calendar Grid */}
                                  <div className="grid grid-cols-7 gap-1">
                                    {/* Day Headers */}
                                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => (
                                      <div key={day} className="text-center text-xs text-gray-400 font-medium py-1">
                                        {day}
                                      </div>
                                    ))}
                                    
                                    {/* Calendar Days */}
                                    {generateCalendarDays().map((date, index) => {
                                      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                                      const isCurrentMonth = date.getMonth() === currentMonth.getMonth();
                                      const today = new Date();
                                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                      const isToday = dateStr === todayStr;
                                      const allRangeDates = getAllRangeDates();
                                      const isStartOrEnd = dateStr === dateRange.start || dateStr === dateRange.end;
                                      const isInRange = allRangeDates.includes(dateStr) && !isStartOrEnd;
                                      const isDateFiltered = dateStr === dateFilter;
                                      const isSelected = isStartOrEnd || isDateFiltered;
                                      
                                      return (
                                        <button
                                          key={index}
                                          onClick={() => {
                                            // If clicking on dateFilter date, deselect it
                                            if (dateStr === dateFilter) {
                                              setDateFilter("");
                                            }
                                            // If clicking on already selected start or end date, deselect
                                            else if (dateStr === dateRange.start || dateStr === dateRange.end) {
                                              setDateRange({ start: null, end: null });
                                            } else if (!dateRange.start) {
                                              // First click - set start date
                                              setDateRange({ start: dateStr, end: null });
                                            } else if (!dateRange.end) {
                                              // Second click - set end date and create range
                                              setDateRange({ start: dateRange.start, end: dateStr });
                                            } else {
                                              // Third click - reset and start new range
                                              setDateRange({ start: dateStr, end: null });
                                            }
                                          }}
                                          className={`w-8 h-8 text-xs rounded transition-colors ${
                                            isSelected
                                              ? 'bg-gray-700 text-white'
                                              : isInRange
                                              ? 'bg-gray-200/50 text-gray-700'
                                              : isToday
                                              ? 'bg-gray-100 text-gray-700 font-medium'
                                              : isCurrentMonth
                                              ? 'text-gray-700 hover:bg-gray-50'
                                              : 'text-gray-300 hover:bg-gray-25'
                                          }`}
                                        >
                                          {date.getDate()}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Disable all filters */}
                      <button
                        onClick={() => {
                          setRegionFilter("ALLE");
                          setPlzFilter("");
                          setPromotorFilter("");
                          setStatusFilter("");
                          setMarketFilter("");
                          setMatchedOnly(false);
                          setHideVerplant(false);
                          setSelectedWeeks([]);
                          setSelectedDates([]);
                          setDateRange({ start: null, end: null });
                          setDateFilter("");
                          setShowPlzDropdown(false);
                          setShowPromotorDropdown(false);
                          setShowStatusDropdown(false);
                          setShowMarketDropdown(false);
                          setShowDateDropdown(false);
                        }}
                        className="ml-1 px-2.5 py-1.5 bg-white border border-red-500/75 rounded-full hover:bg-gray-50 transition-all duration-200"
                        title="Alle Filter deaktivieren"
                        aria-label="Alle Filter deaktivieren"
                      >
                        <Trash2 className="h-4 w-4 text-red-500 opacity-75" strokeWidth={1.5} />
                      </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="space-y-2">
                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div 
                          className="h-1 rounded-full transition-all duration-300 bg-gradient-to-r from-gray-300 to-gray-400"
                          style={{ 
                            width: `${einsatzStats.confirmedPercentage}%` 
                          }}
                        ></div>
                      </div>
                      {/* Statistics indicators */}
                      <div className="flex items-center justify-between opacity-50">
                        <div className="flex items-center space-x-4">
                          <span className="text-xs text-green-600">{einsatzStats.confirmed}</span>
                          <span className="text-xs text-red-600">{einsatzStats.cancelled}</span>
                          <span className="text-xs text-gray-600">{einsatzStats.planned}</span>
                        </div>
                        <button
                          onClick={() => setHideVerplant(!hideVerplant)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title={hideVerplant ? "Alle anzeigen" : "Nur Offene anzeigen"}
                        >
                          {hideVerplant ? (
                            <EyeOff className="h-3 w-3 text-gray-400" />
                          ) : (
                            <Eye className="h-3 w-3 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div 
                    className="flex-1 overflow-y-auto"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      overflowX: 'visible'
                    }}
                  >
                    {assignmentsLoading ? (
                      viewMode === 'days' ? (
                        /* Days View Loading */
                        <div className="grid grid-cols-4 gap-4">{
                          // Loading Skeletons - 8 day cards with improved structure and heights
                          [...Array(8)].map((_, index) => (
                            <div 
                              key={`skeleton-day-${index}`}
                              className="p-4 rounded-lg shadow-sm bg-white animate-skeleton-fade"
                            >
                              <div className="space-y-3">
                                {/* Date Header Skeleton */}
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="h-4 bg-gray-200 rounded mb-1 w-16 animate-skeleton-fade"></div>
                                    <div className="h-3 bg-gray-100 rounded w-12 animate-skeleton-fade"></div>
                                  </div>
                                  <div className="text-right">
                                    <div className="h-6 bg-gray-200 rounded w-6 animate-skeleton-fade"></div>
                                    <div className="h-3 bg-gray-100 rounded w-10 mt-1 animate-skeleton-fade"></div>
                                  </div>
                                </div>
                                
                                {/* Status List Skeleton - More realistic distribution */}
                                <div className="space-y-2">
                                  {[...Array(6)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-skeleton-fade"></div>
                                        <div className="h-3 bg-gray-200 rounded animate-skeleton-fade" style={{width: `${[14, 18, 16, 20, 15, 17][i]}px`}}></div>
                                      </div>
                                      <div className="h-3 bg-gray-100 rounded w-6 animate-skeleton-fade"></div>
                                    </div>
                                  ))}
                                </div>
                                
                                {/* Additional metrics skeleton */}
                                <div className="pt-2 border-t border-gray-100">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="space-y-1">
                                      <div className="h-3 bg-gray-100 rounded w-12 animate-skeleton-fade"></div>
                                      <div className="h-3 bg-gray-200 rounded w-8 animate-skeleton-fade"></div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="h-3 bg-gray-100 rounded w-14 animate-skeleton-fade"></div>
                                      <div className="h-3 bg-gray-200 rounded w-10 animate-skeleton-fade"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        }</div>
                      ) : (
                        /* List View Loading */
                        <div className="space-y-2">
                          {[...Array(10)].map((_, index) => (
                            <div 
                              key={`skeleton-row-${index}`}
                              className="p-4 rounded-lg border border-gray-100 animate-skeleton-fade"
                            >
                              <div className="flex items-center justify-between">
                                <div className="grid grid-cols-5 gap-4 flex-1 items-center">
                                  {/* Name & Address Column */}
                                  <div className="min-w-0">
                                    <div className="h-4 bg-gray-200 rounded mb-1 w-36 animate-skeleton-fade"></div>
                                    <div className="h-3 bg-gray-100 rounded w-28 animate-skeleton-fade"></div>
                                  </div>
                                  {/* City Column */}
                                  <div className="text-center">
                                    <div className="h-3 bg-gray-200 rounded w-20 mx-auto animate-skeleton-fade"></div>
                                  </div>
                                  {/* Date Column */}
                                  <div className="text-center">
                                    <div className="h-3 bg-gray-200 rounded w-16 mx-auto animate-skeleton-fade"></div>
                                  </div>
                                  {/* Time Column */}
                                  <div className="text-center">
                                    <div className="h-3 bg-gray-200 rounded w-24 mx-auto animate-skeleton-fade"></div>
                                  </div>
                                  {/* Status Column */}
                                  <div className="text-center flex items-center justify-end space-x-2">
                                    <div className="h-3 bg-gray-200 rounded w-18 animate-skeleton-fade"></div>
                                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-skeleton-fade"></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : viewMode === 'days' ? (
                      /* Days View */
                      <div key={`days-${selectedWeeks.join('-')}-${dateRange.start}-${dateRange.end}-${dateFilter}-${hideVerplant}`} className="grid grid-cols-4 gap-4">
                        {generateDayCards().map((dayData) => {
                          // Green background when there are 0 "Offen" assignments and at least one assignment total
                          const noOpenAssignments = dayData.total > 0 && dayData.offen === 0;
                          
                          return (
                          <div 
                            key={dayData.date}
                            onClick={() => {
                              setDateFilter(dayData.date);
                              setViewMode('list');
                            }}
                            className={`p-4 rounded-lg shadow-sm hover:shadow-sm hover:scale-[1.01] transition-all duration-200 cursor-pointer ${
                              noOpenAssignments ? 'bg-green-50' : 'bg-white'
                            }`}
                          >
                            <div className="space-y-3">
                              {/* Date Header with Total */}
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="text-sm font-medium text-gray-900">{formatDateForCard(dayData.date)}</h4>
                                  <p className="text-xs text-gray-500">{new Date(dayData.date).toLocaleDateString('de-DE')}</p>
                                </div>
                                <div className="text-right">
                                  <div className="text-lg font-bold text-gray-900">{dayData.total}</div>
                                  <div className="text-xs text-gray-500">Gesamt</div>
                                </div>
                              </div>
                              
                              {/* Status List */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                    <span className="text-xs text-gray-600">Verplant</span>
                                  </div>
                                  <span className={`text-xs font-medium text-green-600 ${dayData.verplant === 0 ? 'opacity-30' : ''}`}>{dayData.verplant > 0 ? dayData.verplant : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                                    <span className="text-xs text-gray-600">Offen</span>
                                  </div>
                                  <span className={`text-xs font-medium text-gray-600 ${dayData.offen === 0 ? 'opacity-30' : ''}`}>{dayData.offen > 0 ? dayData.offen : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                                    <span className="text-xs text-gray-600">Buddy Tage</span>
                                  </div>
                                  <span className={`text-xs font-medium text-purple-600 ${dayData.buddyTag === 0 ? 'opacity-30' : ''}`}>{dayData.buddyTag > 0 ? dayData.buddyTag : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                    <span className="text-xs text-gray-600">Krankenstand</span>
                                  </div>
                                  <span className={`text-xs font-medium text-red-600 ${dayData.krankenstand === 0 ? 'opacity-30' : ''}`}>{dayData.krankenstand > 0 ? dayData.krankenstand : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                    <span className="text-xs text-gray-600">Sonderfall</span>
                                  </div>
                                  <span className={`text-xs font-medium text-orange-600 ${dayData.notfall === 0 ? 'opacity-30' : ''}`}>{dayData.notfall > 0 ? dayData.notfall : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                                    <span className="text-xs text-gray-600">Urlaub</span>
                                  </div>
                                  <span className={`text-xs font-medium text-blue-600 ${dayData.urlaub === 0 ? 'opacity-30' : ''}`}>{dayData.urlaub > 0 ? dayData.urlaub : 'N/A'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                    <span className="text-xs text-gray-600">Zeitausgleich</span>
                                  </div>
                                  <span className={`text-xs font-medium text-yellow-600 ${dayData.zeitausgleich === 0 ? 'opacity-30' : ''}`}>{dayData.zeitausgleich > 0 ? dayData.zeitausgleich : 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          );
                          })
                        }
                      </div>
                    ) : (
                      /* List View */
                      <div key={`list-${regionFilter}-${selectedWeeks.join('-')}-${dateRange.start}-${dateRange.end}-${dateFilter}-${plzFilter}-${promotorFilter}-${statusFilter}-${marketFilter}-${hideVerplant}-${matchedOnly}`} className="space-y-2 px-4 -mx-4">
                        {filteredEinsatzplan
                          // When active, show only assignments WITHOUT a matched market
                          .filter(e => (!matchedOnly || !e.matched_market_id))
                          .map((einsatz) => {
                        const hasPromotor = ['Verplant', 'bestätigt', 'Krankenstand'].includes(einsatz.status);
                        const isUnplanned = !hasPromotor;
                        return (
                          <div 
                            key={einsatz.id}
                            data-einsatz-id={einsatz.id}
                            onClick={(e) => {
                              if (selectionMode) {
                                e.stopPropagation();
                                setSelectedPromotions(prev => 
                                  prev.includes(einsatz.id) 
                                    ? prev.filter(id => id !== einsatz.id)
                                    : [...prev, einsatz.id]
                                );
                              } else if (aiMode) {
                                // AI mode: fetch recommendations instead of opening detail modal
                                console.log('🧠 [CLIENT] AI mode click detected', { einsatzId: einsatz.id, aiMode });
                                setSelectedEinsatz(einsatz);
                                fetchAiRecommendations(einsatz.id);
                              } else {
                                setSelectedEinsatz(einsatz);
                                // Extract just the promotor name without any formatting
                                const rawPromotorName = einsatz.promotor?.includes(' & ') 
                                  ? einsatz.promotor.split(' & ')[0] 
                                  : einsatz.promotor;
                                // Auto-set status to Buddy Tag if buddy_name exists
                                const autoStatus = einsatz.buddy_name ? 'Buddy Tag' : einsatz.status;
                                const editingData = {
                                  ...einsatz,
                                  promotor: rawPromotorName,
                                  status: autoStatus,
                                  buddy_user_id: einsatz.buddy_user_id,
                                  buddy_name: einsatz.buddy_name
                                };

                                setEditingEinsatz(editingData);
                                setDetailModalTab('overview'); // Reset to overview tab when opening
                                setShowDetailModal(true);
                                
                                // Load promotor note for this assignment
                                loadPromotorNote(einsatz.id);
                              }
                            }}
                            
                            className={`relative p-4 rounded-lg border transition-all duration-200 hover:shadow-sm cursor-pointer ${
                              selectedPromotions.includes(einsatz.id) 
                                ? 'border-blue-300 bg-blue-50 shadow-md' 
                                : (einsatz.status === 'Beendet' ? 'border-[#EFB54E]/30' : 'border-gray-100')
                            } ${getStatusBackgroundColor(einsatz.status)} ${flashAssignmentId === einsatz.id ? '' : ''}`}
                            style={einsatz.status === 'Beendet' ? { background: 'linear-gradient(to right, rgba(239, 181, 78, 0.05), rgba(255, 237, 150, 0.05), rgba(252, 217, 76, 0.05), rgba(249, 247, 147, 0.05), rgba(239, 185, 77, 0.05))' } : ((flashAssignmentId === einsatz.id || (selectedEinsatz?.id === einsatz.id && aiMode)) 
                              ? { boxShadow: flashAssignmentId === einsatz.id 
                                  ? '0 0 20px rgba(34,197,94,0.35)'
                                  : '0 0 12px rgba(134, 239, 172, 0.5)' }
                              : undefined)}
                          >
                            <div className="flex items-center justify-between relative">
                              <div className="grid grid-cols-6 gap-4 flex-1 items-center">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900">{getDisplayName(einsatz)}</h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInGoogleMaps(einsatz.address, einsatz.city, einsatz.plz);
                                    }}
                                    className="text-xs text-gray-500 text-left cursor-pointer hover:text-blue-600"
                                  >
                                    {einsatz.address}
                                  </button>
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  <span>{einsatz.plz} {einsatz.city}</span>
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  <span>{einsatz.date}</span>
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  <span>{einsatz.planStart} - {einsatz.planEnd}</span>
                                </div>
                                {/* Invite summary (invited / accepted / rejected) */}
                                <div className="text-[11px] leading-tight flex flex-col items-center justify-center gap-0.5 opacity-75">
                                  {/* Eingeladen */}
                                  <div 
                                    className="flex items-center gap-1 text-gray-500 cursor-pointer hover:opacity-100 transition-opacity"
                                    onMouseEnter={(e) => {
                                      setHoveredInvite({ assignmentId: einsatz.id, type: 'invited' });
                                    }}
                                    onMouseLeave={() => setHoveredInvite(null)}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                                    <span>Eingeladen: {inviteCounts[einsatz.id]?.invited ?? 0}</span>
                                  </div>
                                  {/* Angenommen */}
                                  <div 
                                    className="flex items-center gap-1 text-green-600 cursor-pointer hover:opacity-100 transition-opacity"
                                    onMouseEnter={() => setHoveredInvite({ assignmentId: einsatz.id, type: 'accepted' })}
                                    onMouseLeave={() => setHoveredInvite(null)}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Angenommen: {inviteCounts[einsatz.id]?.accepted ?? 0}</span>
                                  </div>
                                  {/* Abgelehnt */}
                                  <div 
                                    className="flex items-center gap-1 text-red-500 cursor-pointer hover:opacity-100 transition-opacity"
                                    onMouseEnter={() => setHoveredInvite({ assignmentId: einsatz.id, type: 'rejected' })}
                                    onMouseLeave={() => setHoveredInvite(null)}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                    <span>Abgelehnt: {inviteCounts[einsatz.id]?.rejected ?? 0}</span>
                                  </div>
                                </div>
                                
                                {/* Popups - rendered outside to avoid clipping */}
                                {hoveredInvite?.assignmentId === einsatz.id && hoveredInvite && (
                                  <div className="fixed z-[9999] bg-white border border-gray-200 rounded-lg shadow-md p-3 min-w-[200px] max-w-[300px] pointer-events-none"
                                    style={{
                                      left: `${window.innerWidth > 1400 ? 'calc(50% + 200px)' : 'calc(50% + 150px)'}`,
                                      top: `${(document.querySelector(`[data-einsatz-id="${einsatz.id}"]`) as HTMLElement)?.getBoundingClientRect().top ?? 0}px`
                                    }}
                                  >
                                    <div className="flex flex-wrap gap-1.5">
                                      {hoveredInvite.type === 'invited' && (inviteDetails[einsatz.id]?.invited || []).map((name, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-gray-50 border border-gray-200 rounded text-[10px] text-gray-700 whitespace-nowrap">
                                          {name}
                                        </span>
                                      ))}
                                      {hoveredInvite.type === 'accepted' && (inviteDetails[einsatz.id]?.accepted || []).map((name, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-green-50 border border-green-200 rounded text-[10px] text-green-700 whitespace-nowrap">
                                          {name}
                                        </span>
                                      ))}
                                      {hoveredInvite.type === 'rejected' && (inviteDetails[einsatz.id]?.rejected || []).map((name, idx) => (
                                        <span key={idx} className="px-2 py-0.5 bg-red-50 border border-red-200 rounded text-[10px] text-red-700 whitespace-nowrap">
                                          {name}
                                        </span>
                                      ))}
                                      {((hoveredInvite.type === 'invited' && (!inviteDetails[einsatz.id]?.invited || inviteDetails[einsatz.id].invited.length === 0)) ||
                                        (hoveredInvite.type === 'accepted' && (!inviteDetails[einsatz.id]?.accepted || inviteDetails[einsatz.id].accepted.length === 0)) ||
                                        (hoveredInvite.type === 'rejected' && (!inviteDetails[einsatz.id]?.rejected || inviteDetails[einsatz.id].rejected.length === 0))) && (
                                        <span className="text-[10px] text-gray-400">Keine</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                                <div className="text-xs text-center flex items-center justify-end space-x-2">
                                  <span className={`font-medium ${
                                    einsatz.status === 'Beendet' ? 'bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D] bg-clip-text text-transparent' :
                                    einsatz.status === 'Verplant' || einsatz.status === 'bestätigt' ? 'text-green-500' :
                                    einsatz.status === 'Buddy Tag' ? 'text-purple-500' :
                                    einsatz.status === 'Krankenstand' ? 'text-red-500' :
                                    einsatz.status === 'Sonderfall' ? 'text-orange-500' :
                                    einsatz.status === 'Urlaub' ? 'text-blue-500' :
                                    einsatz.status === 'Zeitausgleich' ? 'text-yellow-600' :
                                    einsatz.status === 'Markierte' ? 'text-purple-500' :
                                    'text-gray-500'
                                  }`}>
                                    {einsatz.status}
                                  </span>
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    einsatz.status === 'Beendet' ? 'bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D]' :
                                    einsatz.status === 'Verplant' || einsatz.status === 'bestätigt' ? 'bg-green-400' :
                                    einsatz.status === 'Buddy Tag' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                                    einsatz.status === 'Krankenstand' ? 'bg-red-400' :
                                    einsatz.status === 'Sonderfall' ? 'bg-orange-400' :
                                    einsatz.status === 'Urlaub' ? 'bg-blue-400' :
                                    einsatz.status === 'Zeitausgleich' ? 'bg-yellow-400' :
                                    einsatz.status === 'Markierte' ? 'bg-purple-400' :
                                    'bg-gray-400'
                                  }`}></div>
                                </div>
                              </div>
                              {/* Match indicator - absolute bottom-right of row (tighter to the corner) */}
                              <div 
                                className="absolute -bottom-1 -right-1 opacity-25 cursor-pointer z-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMarketMatchPopup(showMarketMatchPopup === einsatz.id ? null : einsatz.id);
                                }}
                                data-market-match-icon
                              >
                                <Link2 
                                  className={`h-5 w-5 ${
                                    einsatz.matched_market_id 
                                      ? 'text-emerald-500' 
                                      : 'text-red-500'
                                  }`} 
                                  strokeWidth={2.5} 
                                />
                              </div>
                            </div>
                            {/* Market matching popup - positioned below the chain icon */}
                            {showMarketMatchPopup === einsatz.id && (
                              <div 
                                ref={marketMatchPopupRef}
                                className="absolute top-full right-0 mt-2 w-[520px] max-w-[90vw] bg-white border border-gray-200 rounded-xl shadow-xl z-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Header */}
                                <div className="p-3 border-b border-gray-100 flex items-center justify-between gap-3">
                                  <div className="flex-1 relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                      value={marketPickerSearch}
                                      onChange={(e) => setMarketPickerSearch(e.target.value)}
                                      placeholder="Nach Markt, PLZ oder Ort suchen…"
                                      className="w-full h-9 pl-8 pr-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-400"
                                    />
                                    </div>
                                    {einsatz.matched_market_id && (
                                      <button
                                        onClick={async () => {
                                          try {
                                            const res = await fetch(`/api/assignments/${einsatz.id}`, {
                                              method: 'PATCH',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ matched_market_id: null })
                                          });
                                            if (res.ok) {
                                            setEinsatzplanData(prev => prev.map(p => p.id === einsatz.id ? { ...p, matched_market_id: null } : p));
                                            }
                                          } finally {
                                          setShowMarketMatchPopup(null);
                                          }
                                        }}
                                      className="text-xs px-2 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                                      >
                                        Zuordnung entfernen
                                      </button>
                                    )}
                                  </div>

                                {/* Current selection ribbon */}
                                <div className="px-3 pt-2">
                                  <div className="text-xs text-gray-500 mb-1">Zugeordneter Markt</div>
                                  <div className="text-sm text-gray-900 italic min-h-[20px]">
                                    {einsatz.matched_market_id
                                      ? (marketById.get(einsatz.matched_market_id)?.name || ('Markt ' + einsatz.matched_market_id.slice(0, 8)))
                                      : 'Kein Markt zugeordnet'}
                                  </div>
                                  </div>

                                {/* List */}
                                <div className="p-3">
                                  <div className="max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                    {(marketsData || [])
                                      .filter((m: any) => {
                                        const q = (marketPickerSearch || '').trim().toLowerCase();
                                        if (!q) return true;
                                        const hay = `${m.name || ''} ${m.address || ''} ${m.plz || ''} ${m.city || ''}`.toLowerCase();
                                        return hay.includes(q);
                                      })
                                      .map((m: any) => {
                                        const isSelected = einsatz.matched_market_id === m.id;
                                        const short =
                                          m.cluster === 'wien-noe-bgl' ? 'W/NÖ/BGL' :
                                          m.cluster === 'steiermark' ? 'ST' :
                                          m.cluster === 'salzburg' ? 'S' :
                                          m.cluster === 'oberoesterreich' ? 'OÖ' :
                                          m.cluster === 'tirol' ? 'T' :
                                          m.cluster === 'vorarlberg' ? 'V' :
                                          m.cluster === 'kaernten' ? 'K' : '—';
                                        return (
                                          <div key={m.id} className="flex items-center justify-between gap-3 p-2.5 mb-2 rounded-lg border border-gray-100 hover:bg-gray-50">
                                            <div className="min-w-0">
                                              <div className="text-sm font-medium text-gray-900 truncate">{m.name}</div>
                                              <div className="text-xs text-gray-500 truncate">{[m.plz, m.city].filter(Boolean).join(' ')} • {m.address}</div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              <div className="w-16 flex items-center justify-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getRegionGradient(m.cluster)} ${getRegionBorder(m.cluster)} text-gray-700`}>
                                                  {short}
                                                </span>
                                              </div>
                                              {isSelected ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs text-green-600 border border-green-200 bg-green-50">
                                                  <Check className="h-3.5 w-3.5 mr-1" /> Ausgewählt
                                                </span>
                                              ) : (
                                                <button
                                                  className={`px-2 py-1 text-xs rounded-md border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 ${selectingMarketId === m.id ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                  disabled={selectingMarketId === m.id}
                                          onClick={async () => {
                                            if (selectingMarketId) return;
                                            setSelectingMarketId(m.id);
                                            try {
                                              const res = await fetch(`/api/assignments/${einsatz.id}`, { 
                                                method: 'PATCH',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ matched_market_id: m.id })
                                                      });
                                              if (res.ok) {
                                                        setEinsatzplanData(prev => prev.map(p => p.id === einsatz.id ? { ...p, matched_market_id: m.id } : p));
                                              }
                                            } finally {
                                                      setSelectingMarketId(null);
                                                      setShowMarketMatchPopup(null);
                                            }
                                        }}
                                      >
                                                  {selectingMarketId === m.id ? 'Auswählen…' : 'Auswählen'}
                                                </button>
                                              )}
                                      </div>
                                          </div>
                                        );
                                      })}
                                    {(marketsData || []).length === 0 && (
                                      <div className="text-xs text-gray-500 p-3 text-center">Keine Märkte gefunden.</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                          })
                        }
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* Smaller Card - Right Side */}
            <div className="w-80 flex items-center">
              <Card 
                className="border-0 h-80 w-full"
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(34, 197, 94, 0.003) 50%, rgba(22, 163, 74, 0.005) 100%)',
                  boxShadow: '0 4px 20px -2px rgba(255, 133, 82, 0.06), 0 2px 8px -1px rgba(255, 185, 151, 0.04), 0 8px 32px -4px rgba(255, 133, 82, 0.03)'
                }}
              >
                <CardContent className="p-3 h-full flex flex-col">
                  {/* Header with Toggle Button */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      {aiMode ? 'Perfect Match' : 'Perfect Match'}
                      <Sparkles className="h-4 w-4 text-black" />
                    </h3>
                    <div className="flex items-center gap-2">
                      {/* Help tooltip placed left of the brain button */}
                      <div className="group inline-block relative">
                        <button className="ml-1 text-gray-900 opacity-20 hover:opacity-50" aria-label="Hilfe">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a3.375 3.375 0 1 1 6.75 0c0 1.257-.665 2.174-1.879 2.864-.686.395-1.121 1.11-1.121 1.886v.375"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25h.008v.008H12z"/>
                          </svg>
                        </button>
                        <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-20 pointer-events-none group-hover:pointer-events-auto">
                          <div className="w-72 rounded-xl border border-gray-100 bg-white shadow-xl p-3 text-xs leading-relaxed text-gray-700">
                            <p className="font-semibold text-gray-900 mb-2">Wie funktioniert Perfect Match?</p>
                            <p className="mb-2 text-gray-700">1. Klicke zuerst auf das <span className="font-medium text-blue-600">Gehirn</span>, um den AI‑Modus zu aktivieren.</p>
                            <p className="mb-2 text-gray-700">2. Klicke dann auf einen <span className="font-medium text-blue-600">Einsatz</span>. Eddie analysiert kurz und schlägt geeignete Promotoren vor.</p>
                            <p className="mb-2 text-gray-700">3. Du kannst Personen direkt zuweisen, indem du auf den Namen <span className="font-medium text-blue-600">mehrfach klickst</span>.</p>
                            <p className="mb-0 text-gray-700">4. Über das <span className="font-medium text-blue-600">Medaille‑Icon</span> erhältst du detaillierte Begründungen und zusätzliche Infos.</p>
                          </div>
                        </div>
                      </div>
                      <button
                      onClick={() => {
                        const newAiMode = !aiMode;
                        console.log('🧠 [CLIENT] Brain button clicked', { currentAiMode: aiMode, newAiMode });
                        setAiMode(newAiMode);
                        if (!aiMode) {
                          setAiRecommendations([]);
                          setAiError(null);
                          console.log('🧠 [CLIENT] AI mode activated, cleared previous data');
                        } else {
                          console.log('🧠 [CLIENT] AI mode deactivated');
                        }
                      }}
                      className={`p-2 rounded-lg border transition-colors ${
                        aiMode 
                          ? 'border-green-300 bg-green-100 text-green-700' 
                          : 'border-gray-300 hover:border-gray-400 text-gray-600'
                      }`}
                      title={aiMode ? "AI Modus beenden" : "AI Modus aktivieren"}
                    >
                      <Brain className="h-4 w-4" />
                    </button>
                    </div>
                  </div>

                  <div 
                    className="flex-1 overflow-y-auto"
                    style={{
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    {aiMode ? (
                      /* AI Mode Content */
                      <div className="space-y-2">
                        {aiError && (
                          <div className="text-red-600 text-sm p-2 bg-red-50 rounded">
                            {aiError}
                          </div>
                        )}

                        {aiLoading ? (
                          <div className="flex items-center justify-center py-16">
                            <div className="relative h-10 w-10">
                              <div className="absolute inset-0 rounded-full border border-gray-200"></div>
                              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-green-500 animate-spin" style={{ animationDuration: '900ms' }}></div>
                            </div>
                            <span className="ml-3 text-sm text-gray-600">AI analysiert…</span>
                          </div>
                        ) : aiRecommendations.length > 0 ? (
                          aiRecommendations.map((rec: any, index: number) => {
                            const getConfidenceColor = (confidence: number) => {
                              if (confidence >= 0.8) return 'text-green-600 bg-green-50 border border-green-200/40';
                              if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border border-green-200/40';
                              return 'text-red-600 bg-red-50 border border-green-200/40';
                            };

                            const getRankColor = (rank: number) => {
                              if (rank === 1) return 'text-white';
                              if (rank === 2) return 'text-white';
                              if (rank === 3) return 'text-white';
                              return 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white';
                            };

                            const getRankStyle = (rank: number) => {
                              if (rank === 1) return { background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)' };
                              if (rank === 2) return { background: 'linear-gradient(135deg, #DEDFE1 0%, #BCBDC1 25%, #ECEEED 75%, #B6BCBC 100%)' };
                              if (rank === 3) return { background: 'linear-gradient(135deg, #BD965D 0%, #99774A 25%, #DEBF93 75%, #AC9071 100%)' };
                              return {};
                            };

                            const isExpanded = expandedRecommendations.has(rec.keyword);

                            return (
                              <div
                                key={rec.keyword}
                                onClick={() => {
                                  if (selectedEinsatz) {
                                    assignPromotionToPromotor(rec.promotorName, rec.promotorId);
                                    setEditingEinsatz({ ...selectedEinsatz, promotor: rec.promotorName, promotorId: rec.promotorId, status: 'Verplant' });
                                  }
                                }}
                                className={`p-3 rounded-lg border border-gray-100 cursor-pointer transition-all bg-white relative overflow-hidden ${
                                  rec.rank === 1 ? 'hover:bg-gradient-to-r hover:from-yellow-50/60 hover:to-amber-50/60 hover:border-yellow-200/80' :
                                  rec.rank === 2 ? 'hover:bg-gradient-to-r hover:from-gray-50/60 hover:to-slate-50/60 hover:border-gray-200/80' :
                                  rec.rank === 3 ? 'hover:bg-gradient-to-r hover:from-amber-50/60 hover:to-orange-50/60 hover:border-amber-200/80' :
                                  'hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/60 hover:border-blue-200/80'
                                }`}
                              >
                                <div className="flex items-center space-x-3 h-12 relative">
                                  {/* Rank Badge - Clickable */}
                                  <div 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newExpanded = new Set(expandedRecommendations);
                                      if (newExpanded.has(rec.keyword)) {
                                        newExpanded.delete(rec.keyword);
                                      } else {
                                        newExpanded.add(rec.keyword);
                                      }
                                      setExpandedRecommendations(newExpanded);
                                    }}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold cursor-pointer flex-shrink-0 ${getRankColor(rec.rank)}`}
                                    style={getRankStyle(rec.rank)}
                                  >
                                    {rec.rank}
                                  </div>

                                  {/* Content Area - Both states remain in DOM */}
                                  <div className="flex-1 relative h-full">
                                  {/* Promotor Info */}
                                    <div 
                                      className="absolute inset-0 flex items-center space-x-3"
                                      style={{
                                        transform: isExpanded ? 'translateX(-120%)' : 'translateX(0)',
                                        opacity: isExpanded ? 0 : 1,
                                        transition: 'all 0.3s ease-out',
                                        pointerEvents: isExpanded ? 'none' : 'auto'
                                      }}
                                    >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center mb-1">
                                      <User className="h-3 w-3 text-gray-400 mr-1 flex-shrink-0" />
                                      <span className="font-medium text-gray-900 text-sm truncate">
                                        {rec.promotorName}
                                      </span>
                                    </div>
                                    {rec.phone && (
                                      <div className="text-xs text-gray-600" style={{ opacity: 0.7 }}>
                                        {rec.phone}
                                      </div>
                                    )}
                                  </div>

                                  {/* Confidence - Right side */}
                                  <div className="flex-shrink-0">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getConfidenceColor(rec.confidence)}`}>
                                      {Math.round(rec.confidence * 100)}%
                                    </span>
                                      </div>
                                    </div>

                                    {/* Reasoning Text */}
                                    <div 
                                      ref={(el) => {
                                        if (el && isExpanded) {
                                          // Auto-scroll during typing animation
                                          const scrollInterval = setInterval(() => {
                                            el.scrollTop = el.scrollHeight;
                                          }, 50);
                                          setTimeout(() => clearInterval(scrollInterval), (rec.reasoning?.length || 0) * 25 + 500);
                                        }
                                      }}
                                      className="absolute inset-0 text-xs text-gray-600 overflow-y-auto no-scrollbar flex items-center"
                                      style={{ 
                                        opacity: isExpanded ? 1 : 0,
                                        transition: isExpanded ? 'opacity 0.4s ease-in 0.3s' : 'opacity 0.2s ease-out',
                                        pointerEvents: isExpanded ? 'auto' : 'none',
                                        lineHeight: '1.4'
                                      }}
                                    >
                                      <div className="w-full">
                                        <TypingText text={rec.reasoning || ''} isTyping={isExpanded} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8">
                            <Brain className="h-8 w-8 text-gray-300 mx-auto mb-3 opacity-50" />
                            <p className="text-sm font-medium text-gray-600 mb-1">Einsatz auswählen</p>
                            <p className="text-xs text-gray-400">Klicken Sie auf eine Promotion für AI-Empfehlungen</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Normal Mode - No Content */
                      <div className="flex items-center justify-center py-16">
                        <div className="text-center">
                          <div className="text-gray-400 text-sm">
                            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p>Klicken Sie auf eine Promotion für AI-Empfehlungen</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {/* Promotion Distribution Component */}
          <div className="mt-8">
            <Card 
              className="border-0 w-full bg-gradient-to-br from-white to-blue-50/40"
              style={{
                boxShadow: '0 1px 3px 0 rgba(59, 130, 246, 0.15), 0 1px 2px 0 rgba(96, 165, 250, 0.1)'
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Einsätze verteilen</h3>
                      {/* Help tooltip right next to the header text */}
                      <div className="group inline-block relative mt-[-2px]">
                        <button className="text-gray-900 opacity-20 hover:opacity-50" aria-label="Hilfe">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a3.375 3.375 0 1 1 6.75 0c0 1.257-.665 2.174-1.879 2.864-.686.395-1.121 1.11-1.121 1.886v.375"/>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25h.008v.008H12z"/>
                          </svg>
                        </button>
                        <div className="absolute left-0 top-full mt-2 hidden group-hover:block z-20 pointer-events-none group-hover:pointer-events-auto">
                          <div className="w-80 rounded-xl border border-gray-100 bg-white shadow-xl p-3 text-xs leading-relaxed text-gray-700">
                            <p className="font-semibold text-gray-900 mb-2">Wie verteile ich Einsätze?</p>
                            <p className="mb-2">1. Klicke auf <span className="font-medium text-blue-600">Auswahl starten</span>.</p>
                            <p className="mb-2">2. Wähle beliebig viele <span className="font-medium text-blue-600">Einsätze</span> aus.</p>
                            <p className="mb-2">3. Im zweiten Schritt Promotoren über das <span className="font-medium text-blue-600">Promotoren‑Icon</span> hinzufügen.</p>
                            <p className="mb-2">4. Klicke anschließend auf <span className="font-medium text-blue-600">Senden</span>.</p>
                            <p className="mb-2">Hinweis: Du kannst auch bereits <span className="font-medium text-blue-600">zugewiesene Einsätze</span> auswählen – dabei wird automatisch ein <span className="font-medium text-blue-600">Buddy‑Tag</span> vorgeschlagen.</p>
                            <p className="mb-0">Optional: Im zweiten Schritt kannst du <span className="font-medium text-blue-600">Buddy‑Tag manuell aktivieren</span>.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">Wähle Promotionen aus und sende sie an Promotoren zur Auswahl</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectionMode(!selectionMode);
                      if (!selectionMode) {
                        setSelectedPromotions([]);
                      }
                    }}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectionMode 
                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <MousePointer className="h-4 w-4" />
                    <span>{selectionMode ? 'Auswahl beenden' : 'Auswahl starten'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Selected Promotions */}
                  <div className="lg:col-span-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between min-h-[40px]">
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                          Ausgewählte Promotionen ({selectedPromotions.length})
                        </h4>
                        <div className="w-8 h-8"></div> {/* Spacer to match button width */}
                      </div>
                      
                                             <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                         {selectedPromotions.length === 0 ? (
                           <div className="p-6 rounded-lg bg-gray-50 text-center border border-gray-200">
                             <Calendar className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                             <p className="text-sm font-medium text-gray-600 mb-1">Keine Promotionen ausgewählt</p>
                             <p className="text-xs text-gray-400">Starte die Auswahl und klicke auf Promotionen in der Liste</p>
                           </div>
                        ) : (
                          einsatzplanData
                            .filter(einsatz => selectedPromotions.includes(einsatz.id))
                            .map(einsatz => (
                              <div 
                                key={einsatz.id}
                                className="p-3 rounded-lg bg-white border border-gray-200 text-sm"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium text-gray-900">{einsatz.address}</p>
                                    <p className="text-xs text-gray-500">{einsatz.date} • {einsatz.planStart}-{einsatz.planEnd}</p>
                                  </div>
                                  <button
                                    onClick={() => setSelectedPromotions(prev => prev.filter(id => id !== einsatz.id))}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                        )}
                      </div>

                      {selectedPromotions.length > 0 && (
                        <button
                          onClick={() => setSelectedPromotions([])}
                          className="w-full text-xs text-gray-500 hover:text-gray-700 py-2 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 transition-colors"
                        >
                          Alle abwählen
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Selected Promotors */}
                  <div className="lg:col-span-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between min-h-[40px]">
                        <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                          Promotoren ({selectedPromotors.length})
                        </h4>
                        <div className="flex items-center space-x-2">
                          {selectedPromotors.length > 0 && (
                            <div className="flex items-center text-xs text-gray-600">
                              <Check className="h-3 w-3 text-green-600 mr-1" />
                              {selectedPromotors.length} ausgewählt
                            </div>
                          )}
                          <button
                            onClick={() => setShowPromotorSelection(true)}
                            className="p-2 rounded-lg border border-gray-300 hover:border-gray-400 transition-colors"
                          >
                            <UserPlus className="h-4 w-4 text-gray-600" />
                          </button>
                        </div>
                      </div>

                      {selectedPromotors.length > 0 ? (
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                          {selectedPromotors.map(promotor => (
                            <div 
                              key={promotor}
                              className="p-2 rounded-lg bg-white border border-gray-200 text-sm"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-gray-900 text-xs">{promotor}</span>
                                <button
                                  onClick={() => setSelectedPromotors(prev => prev.filter(name => name !== promotor))}
                                  className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 rounded-lg bg-gray-50 text-center border border-gray-200">
                          <UserPlus className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm font-medium text-gray-600 mb-1">Keine Promotoren ausgewählt</p>
                          <p className="text-xs text-gray-400">Klicke auf das + Icon um Promotoren auszuwählen</p>
                        </div>
                      )}

                      {selectedPromotions.length > 0 && selectedPromotors.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <label className="flex items-center space-x-2">
                              <input type="checkbox" checked={inviteBuddy} onChange={(e) => setInviteBuddy(e.target.checked)} />
                              <span>Buddy-Tag senden</span>
                            </label>
                            <span className="text-gray-500">{selectedPromotions.length} Einsätze → {selectedPromotors.length} Promotoren</span>
                          </div>
                        <button
                          className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                          disabled={sendingInvites}
                          onClick={async () => {
                            if (sendingInvites) return;
                            setSendingInvites(true);
                            try {
                              // Map selected promoter names to IDs
                              const ids = promotorsList
                                .filter((p: any) => selectedPromotors.includes(p.name))
                                .map((p: any) => p.id)
                                .filter(Boolean)
                              
                              // Check if any selected assignments are "Verplant" (assigned)
                              const selectedAssignmentData = einsatzplanData.filter((assignment: any) => 
                                selectedPromotions.includes(assignment.id));
                              const hasVerplantAssignments = selectedAssignmentData.some((assignment: any) => 
                                assignment.status === 'Verplant');
                              
                              // Auto-buddy tag if selecting Verplant assignments, otherwise use checkbox
                              const isBuddyTag = hasVerplantAssignments || inviteBuddy;
                              
                              const res = await fetch('/api/assignments/bulk-invite', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  assignment_ids: selectedPromotions,
                                  promotor_ids: ids,
                                  buddy: inviteBuddy,
                                  is_buddy_tag: isBuddyTag
                                })
                              })
                              if (res.ok) {
                                // Reload history from database
                                await loadInvitationHistory();
                              }
                            } catch (error) {
                              console.error('Failed to send invitations:', error);
                            }
                            setSendingInvites(false);
                            setSelectedPromotions([]);
                            setSelectedPromotors([]);
                            setInviteBuddy(false);
                            setSelectionMode(false);
                          }}
                        >
                          {sendingInvites ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span>wird gesendet</span>
                            </>
                          ) : (
                            <>
                          <Send className="h-4 w-4" />
                          <span>Senden</span>
                            </>
                          )}
                        </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* History */}
                  <div className="lg:col-span-1">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between min-h-[40px]">
                        <div className="flex items-center space-x-2">
                          <History className="h-4 w-4 text-gray-600" />
                          <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                            Historie ({distributionHistory.length})
                          </h4>
                        </div>
                        <div className="w-8 h-8"></div> {/* Spacer to match button width */}
                      </div>
                      
                      <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {distributionHistory.length === 0 ? (
                          <div className="p-6 rounded-lg bg-gray-50 text-center border border-gray-200">
                            <History className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-gray-600 mb-1">Keine Sendungen</p>
                            <p className="text-xs text-gray-400">Hier erscheinen gesendete Einsätze zur Promotor-Auswahl</p>
                          </div>
                        ) : (
                          distributionHistory.map(item => (
                            <div 
                              key={item.id}
                              onClick={() => {
                                setSelectedHistoryItem(item);
                                setShowHistoryDetail(true);
                              }}
                              className="p-3 rounded-lg bg-white border border-gray-200 text-sm hover:border-gray-300 cursor-pointer transition-colors"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900 text-xs">{item.promotionCount} → {item.promotorCount}</span>
                                  <span className="text-xs text-gray-500">{item.time}</span>
                                </div>
                                <p className="text-xs text-gray-500">{item.date}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          </>
          ) : (
          <>
          {/* Märkte View */}
          <div className="flex gap-6">
            {/* Markets Card */}
            <div className="flex-1 relative">
              <div className="h-[600px] w-full"></div>
              
              <Card 
                className={`border-0 w-full transition-all duration-300 overflow-visible ${isMainCardExpanded ? 'absolute top-0 left-0 right-0 h-[960px] z-20' : 'absolute top-0 left-0 right-0 h-[600px]'}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(99, 102, 241, 0.003) 50%, rgba(79, 70, 229, 0.005) 100%)',
                  boxShadow: '0 4px 20px -2px rgba(255, 133, 82, 0.06), 0 2px 8px -1px rgba(255, 185, 151, 0.04), 0 8px 32px -4px rgba(255, 133, 82, 0.03)',
                  overflow: 'visible'
                }}
              >
                <CardContent className={`p-6 h-full flex flex-col overflow-visible ${isMainCardExpanded ? 'bg-white' : ''}`}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Store className="h-5 w-5 text-gray-600" />
                        <h3 className="text-lg font-semibold text-gray-900">Märkte</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setShowCreateMarketModal(true)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                          title="Neuen Markt erstellen"
                        >
                          <Plus className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => setIsMainCardExpanded(!isMainCardExpanded)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                        >
                          {isMainCardExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" />
                          )}
                        </button>
                        {/* View mode toggle removed per request */}
                      </div>
                    </div>

                    {/* Filter Pills */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {["ALLE", "W/NÖ/BGL", "ST", "S", "OÖ", "T", "V", "K"].map((region) => {
                          const isSelected = regionFilter === region || (regionFilter === "ALLE" && region === "ALLE");
                          return (
                            <button
                              key={region}
                              onClick={() => setRegionFilter(regionFilter === region ? "ALLE" : region)}
                              className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 border border-gray-200 ${
                                isSelected 
                                  ? 'bg-gray-100 text-gray-700 scale-110' 
                                  : 'bg-white text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {region}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* PLZ Filter Pill + Matched Filter + Search */}
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <button
                            onClick={() => setShowPlzDropdown(!showPlzDropdown)}
                            className={`px-3 py-1.5 rounded-full text-xs bg-gradient-to-r from-white to-blue-100/60 border border-gray-200 transition-all duration-200 hover:to-blue-100/80 ${
                              plzFilter
                                ? 'text-gray-700 scale-110' 
                                : 'text-gray-500'
                            }`}
                          >
                            {plzFilter || 'PLZ'}
                          </button>
                          
                          {showPlzDropdown && (
                            <div 
                              ref={plzDropdownRef}
                              className="absolute top-full right-0 mt-1 border-0 rounded-lg shadow-lg z-10 w-40 bg-white max-h-60 overflow-y-auto custom-scrollbar"
                            >
                              <div className="p-2">
                                <button
                                  onClick={() => {
                                    setPlzFilter("");
                                    setShowPlzDropdown(false);
                                  }}
                                  className="w-full text-left px-3 py-2 rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  Alle PLZ
                                </button>
                                {[...new Set(marketsData.map(m => m.plz))].sort().map((plz) => (
                                  <button
                                    key={plz}
                                    onClick={() => {
                                      setPlzFilter(plz);
                                      setShowPlzDropdown(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors ${
                                      plzFilter === plz
                                        ? 'bg-gray-100 text-gray-700'
                                        : 'hover:bg-gray-50 text-gray-600'
                                    }`}
                                  >
                                    {plz}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Removed 'Nicht zugeordnet' pill in Märkte view (kept in Einsatzplan) */}

                        {/* Market search */}
                        <input
                          type="text"
                          value={marketSearch}
                          onChange={(e) => setMarketSearch(e.target.value)}
                          placeholder="Suchen..."
                          className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Column Headers */}
                  <div className="grid grid-cols-7 gap-4 px-4 py-2 border-b border-gray-200 mb-2">
                    <div className="text-xs text-gray-500 uppercase tracking-wide">Markt & Adresse</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide text-center">PLZ & Stadt</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide text-center">Cluster</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide text-center">Marktleiter</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide text-center">Besuche</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide text-center">Stammmarkt von</div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide text-right">Status</div>
                  </div>

                  {/* Markets List */}
                  <div className="flex-1 overflow-y-auto space-y-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {marketsLoading ? (
                      <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                          <div key={`market-skeleton-${i}`} className="p-4 rounded-lg border border-gray-100 bg-white">
                            <div className="grid grid-cols-7 gap-4 items-center">
                              {/* Name & Address skeleton */}
                              <div className="min-w-0">
                                <div className="h-4 bg-gray-200 rounded w-3/5 mb-2 animate-skeleton-fade"></div>
                                <div className="h-3 bg-gray-100 rounded w-4/5 animate-skeleton-fade"></div>
                              </div>

                              {/* PLZ & City skeleton */}
                              <div className="text-center">
                                <div className="mx-auto h-4 bg-gray-200 rounded w-20 animate-skeleton-fade"></div>
                              </div>

                              {/* Cluster pill skeleton */}
                              <div className="text-center">
                                <div className="mx-auto h-5 w-24 rounded-full border border-gray-200 bg-gray-100 animate-skeleton-fade"></div>
                              </div>

                              {/* Marktleiter skeleton */}
                              <div className="text-center">
                                <div className="mx-auto h-4 bg-gray-200 rounded w-24 animate-skeleton-fade"></div>
                              </div>

                              {/* Besuche pill skeleton */}
                              <div className="text-center">
                                <div className="mx-auto h-5 w-14 rounded-full border border-gray-200 bg-gray-100 animate-skeleton-fade"></div>
                              </div>

                              {/* Stammmarkt von skeleton */}
                              <div className="text-center">
                                <div className="mx-auto h-4 bg-gray-200 rounded w-28 animate-skeleton-fade"></div>
                              </div>

                              {/* Status text + dot skeleton */}
                              <div className="text-right flex items-center justify-end space-x-2">
                                <div className="h-4 bg-gray-200 rounded w-10 animate-skeleton-fade"></div>
                                <div className="w-2 h-2 rounded-full bg-gray-200 animate-skeleton-fade"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                    (marketsData
                    .filter(market => {
                      // Region filter using cluster mapping
                      const clusterMatch = regionFilter === "ALLE" || 
                        (regionFilter === "W/NÖ/BGL" && market.cluster === "wien-noe-bgl") ||
                        (regionFilter === "ST" && market.cluster === "steiermark") ||
                        (regionFilter === "S" && market.cluster === "salzburg") ||
                        (regionFilter === "OÖ" && market.cluster === "oberoesterreich") ||
                        (regionFilter === "T" && market.cluster === "tirol") ||
                        (regionFilter === "V" && market.cluster === "vorarlberg") ||
                        (regionFilter === "K" && market.cluster === "kaernten");
                      
                      // PLZ filter
                      const plzMatch = !plzFilter || market.plz === plzFilter;

                      // Text search across fields
                      const search = marketSearchDebounced;
                      const searchMatch =
                        !search ||
                        [
                          market.name,
                          market.address,
                          market.city,
                          market.cluster,
                          market.marktleiter,
                          (market.stammPromotorName || '')
                        ]
                          .join(' ')
                          .toLowerCase()
                          .includes(search);
                      
                      return clusterMatch && plzMatch && searchMatch;
                    }))
                    .map((market) => {
                      const visitBg = getVisitsBg(market.visits)
                      const visitBorder = getVisitsBorder(market.visits)

                      return (
                        <div
                          key={market.id}
                          onClick={() => {
                            setSelectedMarket(market);
                            setEditingMarket({ ...market });
                            setShowMarketDetailModal(true);
                          }}
                          className={`p-4 rounded-lg border border-gray-100 transition-all duration-200 hover:border-gray-200 hover:shadow-sm cursor-pointer ${
                            market.status === 'active'
                              ? 'bg-gradient-to-r from-white to-purple-50/35'
                              : 'bg-white opacity-60'
                          }`}
                        >
                          <div className="grid grid-cols-7 gap-4 items-center">
                            {/* Name & Address */}
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 truncate">{market.name}</h4>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${market.address}, ${market.plz} ${market.city}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-gray-500 truncate hover:text-gray-600"
                              >
                                {market.address}
                              </a>
                            </div>
                            
                            {/* PLZ & City */}
                            <div className="text-center">
                              <span className="text-xs text-gray-600">{market.plz} {market.city}</span>
                            </div>
                            
                            {/* Cluster */}
                            <div className="text-center">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getRegionBorder(market.cluster)} ${getRegionGradient(market.cluster)} text-gray-700`}>
                                {market.cluster}
                              </span>
                            </div>
                            
                            {/* Marktleiter */}
                            <div className="text-center">
                              <span className="text-xs text-gray-600">{market.marktleiter}</span>
                            </div>
                            
                            {/* Visit Count */}
                            <div className="text-center">
                              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${visitBorder} ${visitBg} text-gray-700`}>
                                {market.visits}×
                              </span>
                            </div>

                            {/* Stammmarkt von */}
                            <div className="text-center">
                              <span className="text-xs text-gray-600">{market.stammPromotorName || '-'}</span>
                            </div>

                            {/* Status */}
                            <div className="text-right flex items-center justify-end space-x-2">
                              <span className={`text-xs ${market.status === 'active' ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                                {market.status === 'active' ? 'Aktiv' : 'Inaktiv'}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${market.status === 'active' ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          </>
          )}
        </main>
      </div>

      {/* Promotor Selection Modal */}
      {showCreateMarketModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl border border-gray-200 shadow-sm bg-white">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Store className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Neuen Markt erstellen</h3>
              </div>
              <button onClick={() => setShowCreateMarketModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Marktname</label>
                  <input type="text" value={newMarket.name} onChange={(e) => setNewMarket({ ...newMarket, name: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">Adresse</label>
                  <input type="text" value={newMarket.address} onChange={(e) => setNewMarket({ ...newMarket, address: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">PLZ</label>
                  <input type="text" value={newMarket.plz} onChange={(e) => setNewMarket({ ...newMarket, plz: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Stadt</label>
                  <input type="text" value={newMarket.city} onChange={(e) => setNewMarket({ ...newMarket, city: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Cluster</label>
                  <Select value={newMarket.cluster} onValueChange={(val) => setNewMarket({ ...newMarket, cluster: val })}>
                    <SelectTrigger className="w-full h-9 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-0"><SelectValue placeholder="Cluster" /></SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      <SelectItem value="wien-noe-bgl">W/NÖ/BGL</SelectItem>
                      <SelectItem value="steiermark">ST</SelectItem>
                      <SelectItem value="salzburg">S</SelectItem>
                      <SelectItem value="oberoesterreich">OÖ</SelectItem>
                      <SelectItem value="tirol">T</SelectItem>
                      <SelectItem value="vorarlberg">V</SelectItem>
                      <SelectItem value="kaernten">K</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Stammmarkt von</label>
                  <Select value={newMarket.stammPromotorId} onValueChange={(val) => setNewMarket({ ...newMarket, stammPromotorId: val })}>
                    <SelectTrigger className="w-full h-9 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-0"><SelectValue placeholder="Promotor wählen" /></SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200">
                      {marketsPromotorsList.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Marktleiter</label>
                  <input type="text" value={newMarket.marktleiter} onChange={(e) => setNewMarket({ ...newMarket, marktleiter: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Telefon</label>
                  <input type="text" value={newMarket.marktleiterPhone} onChange={(e) => setNewMarket({ ...newMarket, marktleiterPhone: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500">E-Mail</label>
                  <input type="email" value={newMarket.marktleiterEmail} onChange={(e) => setNewMarket({ ...newMarket, marktleiterEmail: e.target.value })} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0" />
                </div>
              </div>
            </CardContent>

            <div className="flex items-center justify-end p-4 border-t border-gray-200 bg-gray-50">
              <Button variant="ghost" onClick={() => setShowCreateMarketModal(false)}>Abbrechen</Button>
              <button
                onClick={async () => {
                  try {
                    const response = await fetch('/api/admin/markets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newMarket)
                    });

                    if (!response.ok) {
                      throw new Error('Failed to create market');
                    }

                    // Reload markets list
                    await loadMarkets();
                    
                    // Reset form and close modal
                    setNewMarket({
                      name: '',
                      address: '',
                      plz: '',
                      city: '',
                      cluster: 'wien-noe-bgl',
                      marktleiter: '',
                      marktleiterPhone: '',
                      marktleiterEmail: '',
                      stammPromotorId: '',
                      visits: 0,
                      status: 'active'
                    });
                    setShowCreateMarketModal(false);
                  } catch (error) {
                    console.error('Error creating market:', error);
                    alert('Fehler beim Erstellen des Marktes');
                  }
                }}
                className="ml-3 px-4 py-2 text-sm text-white rounded-lg transition-colors"
                style={{ background: 'linear-gradient(135deg, #22C55E, #105F2D)', opacity: 0.85 }}
              >
                Speichern
              </button>
            </div>
          </Card>
        </div>
      )}
      {showPromotorSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-4xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white"
          >
            <CardContent className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between pt-6">
                <h3 className="text-lg font-semibold text-gray-900">Promotoren auswählen</h3>
                <button
                  onClick={() => setShowPromotorSelection(false)}
                  className="h-8 w-8 text-gray-900 hover:text-gray-700 flex items-center justify-center"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {/* Search and Filter Options */}
              <div className="mt-4 space-y-3">
                {/* Searchbar */}
                <div>
                  <input
                    type="text"
                    placeholder="Promotor suchen..."
                    value={promotorSelectionSearch}
                    onChange={(e) => setPromotorSelectionSearch(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 bg-white rounded-lg focus:outline-none placeholder-gray-400"
                  />
                </div>
                
                {/* Filter Options */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveRegionFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100/70 text-gray-700 hover:bg-gray-200/80 ${
                        activeRegionFilter === "all" ? "scale-110" : ""
                      }`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setActiveRegionFilter("wien-noe-bgl")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("wien-noe-bgl")} ${getRegionBorder("wien-noe-bgl")} ${
                        activeRegionFilter === "wien-noe-bgl" ? "scale-110" : ""
                      }`}
                    >
                      W/NÖ/BGL
                    </button>
                    <button
                      onClick={() => setActiveRegionFilter("steiermark")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("steiermark")} ${getRegionBorder("steiermark")} ${
                        activeRegionFilter === "steiermark" ? "scale-110" : ""
                      }`}
                    >
                      ST
                    </button>
                    <button
                      onClick={() => setActiveRegionFilter("salzburg")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("salzburg")} ${getRegionBorder("salzburg")} ${
                        activeRegionFilter === "salzburg" ? "scale-110" : ""
                      }`}
                    >
                      SBG
                    </button>
                    <button
                      onClick={() => setActiveRegionFilter("oberoesterreich")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("oberoesterreich")} ${getRegionBorder("oberoesterreich")} ${
                        activeRegionFilter === "oberoesterreich" ? "scale-110" : ""
                      }`}
                    >
                      OÖ
                    </button>
                    <button
                      onClick={() => setActiveRegionFilter("tirol")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("tirol")} ${getRegionBorder("tirol")} ${
                        activeRegionFilter === "tirol" ? "scale-110" : ""
                      }`}
                    >
                      T
                    </button>
                    <button
                      onClick={() => setActiveRegionFilter("vorarlberg")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("vorarlberg")} ${getRegionBorder("vorarlberg")} ${
                        activeRegionFilter === "vorarlberg" ? "scale-110" : ""
                      }`}
                    >
                      V
                    </button>
                    <button
                      onClick={() => setActiveRegionFilter("kaernten")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("kaernten")} ${getRegionBorder("kaernten")} ${
                        activeRegionFilter === "kaernten" ? "scale-110" : ""
                      }`}
                    >
                      K
                    </button>
                  </div>
                  
                  {/* Select All Filtered Icon */}
                  <div 
                    onClick={selectAllFiltered}
                    className="cursor-pointer"
                    title="Alle gefilterten auswählen/abwählen"
                  >
                    <CheckSquare className="h-5 w-5 text-black hover:text-gray-700 transition-colors" />
                  </div>
                </div>
              </div>
            </CardContent>
            
            <CardContent 
              className="p-6 flex flex-col h-[400px] [&::-webkit-scrollbar]:hidden" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div className="flex-1 overflow-auto custom-scrollbar">
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {promotorsList
                .filter(promotor => 
                  (activeRegionFilter === "all" || promotor.region === activeRegionFilter) &&
                  promotor.name.toLowerCase().includes(promotorSelectionSearch.toLowerCase())
                )
                .map((promotor) => {
                  const isSelected = selectedPromotors.includes(promotor.name);
                  return (
                    <button
                      key={promotor.id || promotor.name}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPromotors(prev => prev.filter(name => name !== promotor.name));
                        } else {
                          setSelectedPromotors(prev => [...prev, promotor.name]);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full h-10 flex items-center justify-center border ${
                        isSelected
                          ? "bg-white/80 text-gray-900 shadow-md border-gray-300 backdrop-blur-sm"
                          : `${getRegionGradient(promotor.region)} ${getRegionBorder(promotor.region)} text-gray-700 hover:bg-gray-200/80`
                      }`}
                    >
                      {promotor.name}
                    </button>
                  );
                })}
                </div>
              </div>
              
              {/* Fixed confirmation section at bottom */}
              {selectedPromotors.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {selectedPromotors.length} Promotor{selectedPromotors.length !== 1 ? 'en' : ''} ausgewählt
                    </span>
                    <button
                      onClick={() => setShowPromotorSelection(false)}
                      className="bg-white/40 text-gray-700 hover:bg-white/60 border border-gray-200/50 backdrop-blur-sm px-4 py-2 rounded-lg text-sm transition-colors"
                    >
                      Bestätigen
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {/* History Detail Modal */}
      {showHistoryDetail && selectedHistoryItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="relative p-6 border-b border-gray-100">
              <div className="pr-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Sendung Details</h3>
                <p className="text-sm text-gray-500">{selectedHistoryItem.date} um {selectedHistoryItem.time}</p>
              </div>
              <button
                onClick={() => {
                  setShowHistoryDetail(false);
                  setSelectedHistoryItem(null);
                }}
                className="absolute top-6 right-6 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar">
              <div className="space-y-6">
                {/* Summary */}
                <div className="text-center p-4 rounded-lg bg-gray-50">
                  <div className="text-lg font-semibold text-gray-900">
                    {selectedHistoryItem.promotionCount} Promotionen → {selectedHistoryItem.promotorCount} Promotoren
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Zur Auswahl gesendet</p>
                </div>

                {/* Sent Promotions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Gesendete Promotionen ({selectedHistoryItem.promotions.length})
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {selectedHistoryItem.promotions.map((promotion: any) => (
                      <button 
                        key={promotion.id}
                        type="button"
                        onClick={() => focusAssignmentFromHistory(promotion.id)}
                        className="p-3 rounded-lg bg-white border border-gray-200 w-full text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{promotion.address}</p>
                            <p className="text-xs text-gray-500">
                              {promotion.date} • {promotion.planStart}-{promotion.planEnd} • {promotion.plz}
                            </p>
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            promotion.status === 'Verplant' || promotion.status === 'bestätigt' ? 'bg-green-400' :
                            promotion.status === 'Buddy Tag' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                            promotion.status === 'Krankenstand' ? 'bg-red-400' :
                            promotion.status === 'Sonderfall' ? 'bg-orange-400' :
                            promotion.status === 'Urlaub' ? 'bg-blue-400' :
                            promotion.status === 'Zeitausgleich' ? 'bg-yellow-400' :
                            'bg-gray-400'
                          }`}></div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    Empfänger ({selectedHistoryItem.promotors.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                    {selectedHistoryItem.promotors.map((promotor: string) => (
                      <div 
                        key={promotor}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-sm"
                      >
                        <span className="font-medium text-gray-900 whitespace-nowrap">{promotor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && editingEinsatz && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative p-6 border-b border-gray-100">
              <div className="pr-20">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Einsatz Details</h3>
                <p className="text-sm text-gray-500">{editingEinsatz.address}</p>
              </div>
              <button 
                className={`absolute top-6 right-16 p-1.5 rounded-lg transition-colors text-red-500 hover:text-red-600 ${pendingAssignmentDelete[editingEinsatz.id] ? 'wobble' : ''}`}
                onClick={() => handleDeleteAssignment(editingEinsatz.id)}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M5 6v14a2 2 0 002 2h10a2 2 0 002-2V6M10 11v6M14 11v6" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEinsatz(null);
                  setEditingEinsatz(null);
                  setDetailModalTab('overview');
                }}
                className="absolute top-6 right-6 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Tab Menu */}
            <div className="px-6 pt-4">
              <div className="relative flex space-x-0.5 bg-gray-50 rounded-lg p-0.5">
                {/* Sliding background */}
                <div 
                  className="absolute top-0.5 bottom-0.5 bg-white shadow-sm border border-gray-200 rounded-md transition-all duration-300 ease-in-out"
                  style={{
                    left: detailModalTab === 'overview' ? '2px' : '50%',
                    width: 'calc(50% - 1px)'
                  }}
                />
                <button
                  onClick={() => setDetailModalTab('overview')}
                  className={`relative z-10 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    detailModalTab === 'overview'
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Übersicht
                </button>
                <button
                  onClick={() => {
                    setDetailModalTab('details');
                    if (!assignmentTrackingData || assignmentTrackingData.id !== editingEinsatz.id) {
                      loadTrackingData();
                    }
                  }}
                  className={`relative z-10 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    detailModalTab === 'details'
                      ? 'text-gray-900'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Details
                </button>
              </div>
            </div>
            {/* Modal Content */}
            <div className="relative flex-1 p-6 overflow-y-auto custom-scrollbar">
              {detailModalTab === 'details' && trackingLoading && (!assignmentTrackingData || assignmentTrackingData.id !== editingEinsatz.id) && (
                <div className="absolute inset-0 z-10 p-6 bg-white/60">
                  <div className="space-y-6">
                    {/* Basic Info Skeleton */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-skeleton-fade"></div>
                        <div className="h-3 bg-gray-100 rounded w-3/4 animate-skeleton-fade"></div>
                        <div className="h-3 bg-gray-100 rounded w-2/3 animate-skeleton-fade"></div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-28 animate-skeleton-fade"></div>
                        <div className="h-3 bg-gray-100 rounded w-1/2 animate-skeleton-fade"></div>
                      </div>
                    </div>
                    {/* Status and Indicators Skeleton */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-skeleton-fade"></div>
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-200 rounded-full animate-skeleton-fade"></div>
                          <div className="h-3 bg-gray-100 rounded w-24 animate-skeleton-fade"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-24 animate-skeleton-fade"></div>
                        <div className="space-y-1.5">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-200 rounded-full animate-skeleton-fade"></div>
                            <div className="h-3 bg-gray-100 rounded w-14 animate-skeleton-fade"></div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-gray-200 rounded-full animate-skeleton-fade"></div>
                            <div className="h-3 bg-gray-100 rounded w-20 animate-skeleton-fade"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Actual Times Skeleton */}
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-28 animate-skeleton-fade"></div>
                      <div className="bg-gray-100 rounded-lg p-4 space-y-3 animate-skeleton-fade">
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-16 animate-skeleton-fade"></div>
                          <div className="h-3 bg-gray-200 rounded w-12 animate-skeleton-fade"></div>
                        </div>
                        <div className="flex justify-between">
                          <div className="h-3 bg-gray-200 rounded w-16 animate-skeleton-fade"></div>
                          <div className="h-3 bg-gray-200 rounded w-12 animate-skeleton-fade"></div>
                        </div>
                      </div>
                    </div>
                    {/* Photos Skeleton */}
                    <div className="space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-20 animate-skeleton-fade"></div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="w-full h-32 bg-gray-100 rounded-lg animate-skeleton-fade"></div>
                        <div className="w-full h-32 bg-gray-100 rounded-lg animate-skeleton-fade"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {detailModalTab === 'details' && assignmentTrackingData ? (
                // DETAILS TAB - Tracking overview (same as dashboard's "Heutige Einsätze")
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Location</h4>
                      <p className="text-sm text-gray-600">{assignmentTrackingData.address}</p>
                      <p className="text-sm text-gray-600">{assignmentTrackingData.plz} {assignmentTrackingData.city}</p>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Geplante Zeiten</h4>
                      <p className="text-sm text-gray-600">{assignmentTrackingData.planStart} - {assignmentTrackingData.planEnd}</p>
                    </div>
                  </div>

                  {/* Status and Indicators */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Status</h4>
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${
                          getTrackingStatusColor(assignmentTrackingData) === 'green' ? 'bg-green-400' :
                          getTrackingStatusColor(assignmentTrackingData) === 'orange' ? 'bg-orange-400' :
                          getTrackingStatusColor(assignmentTrackingData) === 'red' ? 'bg-red-400' :
                          'bg-gray-300'
                        }`}></div>
                        <span className="text-sm text-gray-600">
                          {['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(assignmentTrackingData.status) 
                            ? assignmentTrackingData.status 
                            : getTrackingStatusColor(assignmentTrackingData) === 'green' 
                            ? 'gestartet' 
                            : getTrackingStatusColor(assignmentTrackingData) === 'orange' 
                            ? 'verspätet' 
                            : 'pending'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Indikatoren</h4>
                      <div className="space-y-1.5">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-bold ${assignmentTrackingData.hasCheckedIn ? 'text-green-400/60' : 'text-gray-300/60'}`}>TC</span>
                          <span className="text-xs text-gray-500">{assignmentTrackingData.hasCheckedIn ? 'Erledigt' : 'Ausstehend'}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${assignmentTrackingData.hasOutsideBreak ? 'bg-green-400/60' : 'bg-gray-300/60'}`}></div>
                          <span className={`text-xs ${assignmentTrackingData.hasOutsideBreak ? 'text-green-400/60' : 'text-gray-300/60'}`}>Abweichende Pause</span>
                          {assignmentTrackingData.outsideBreakTimestamp && (
                            <span className="text-xs text-gray-500">
                              {new Date(assignmentTrackingData.outsideBreakTimestamp).toLocaleString('de-AT', { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit' })} Uhr
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actual Times */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Tatsächliche Zeiten</h4>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Start:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {assignmentTrackingData.actualStart || '--:--'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Ende:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {assignmentTrackingData.actualEnd || '--:--'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Early End Reasoning */}
                  {assignmentTrackingData.early_end_reason && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Früher Schluss</h4>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Minuten zu früh beendet:</span>
                          <span className="text-sm font-medium text-red-700">
                            {assignmentTrackingData.minutes_early_end} Min
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">Begründung:</span>
                          <p className="text-sm text-gray-900 bg-white rounded p-2 border border-red-100">
                            {assignmentTrackingData.early_end_reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Early Start Reasoning */}
                  {assignmentTrackingData.early_start_reason && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Früher Start</h4>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Minuten zu früh:</span>
                          <span className="text-sm font-medium text-orange-700">
                            {assignmentTrackingData.minutes_early_start} Min
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 block mb-1">Begründung:</span>
                          <p className="text-sm text-gray-900 bg-white rounded p-2 border">
                            {assignmentTrackingData.early_start_reason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Buddy Information */}
                  {assignmentTrackingData.buddyName && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Buddy Tag</h4>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <p className="text-sm text-gray-900">{assignmentTrackingData.buddyName}</p>
                        <p className="text-xs text-gray-500">Buddy für diesen Einsatz</p>
                      </div>
                    </div>
                  )}

                  {/* Photos Section */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Fotos</h4>
                    {(assignmentTrackingData.foto_maschine_url || assignmentTrackingData.foto_kapsellade_url || assignmentTrackingData.foto_pos_gesamt_url || assignmentTrackingData.foto_extra_url) ? (
                      <div className="grid grid-cols-1 gap-4">
                        {/* Foto Maschine */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Foto Maschine</span>
                            {assignmentTrackingData.foto_maschine_url ? (
                              <span className="text-xs text-green-600">✓</span>
                            ) : (
                              <span className="text-xs text-gray-400">Nicht verfügbar</span>
                            )}
                          </div>
                          {assignmentTrackingData.foto_maschine_url ? (
                            <img 
                              src={assignmentTrackingData.foto_maschine_url} 
                              alt="Foto Maschine" 
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedPhoto({ url: assignmentTrackingData.foto_maschine_url, title: "Foto Maschine" });
                                setShowPhotoLightbox(true);
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-sm">Nicht verfügbar</span>
                            </div>
                          )}
                        </div>

                        {/* Foto Kapsellade */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Foto Kapsellade</span>
                            {assignmentTrackingData.foto_kapsellade_url ? (
                              <span className="text-xs text-green-600">✓</span>
                            ) : (
                              <span className="text-xs text-gray-400">Nicht verfügbar</span>
                            )}
                          </div>
                          {assignmentTrackingData.foto_kapsellade_url ? (
                            <img 
                              src={assignmentTrackingData.foto_kapsellade_url} 
                              alt="Foto Kapsellade" 
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedPhoto({ url: assignmentTrackingData.foto_kapsellade_url, title: "Foto Kapsellade" });
                                setShowPhotoLightbox(true);
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-sm">Nicht verfügbar</span>
                            </div>
                          )}
                        </div>

                        {/* Foto POS gesamt */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Foto POS gesamt</span>
                            {assignmentTrackingData.foto_pos_gesamt_url ? (
                              <span className="text-xs text-green-600">✓</span>
                            ) : (
                              <span className="text-xs text-gray-400">Nicht verfügbar</span>
                            )}
                          </div>
                          {assignmentTrackingData.foto_pos_gesamt_url ? (
                            <img 
                              src={assignmentTrackingData.foto_pos_gesamt_url} 
                              alt="Foto POS gesamt" 
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedPhoto({ url: assignmentTrackingData.foto_pos_gesamt_url, title: "Foto POS gesamt" });
                                setShowPhotoLightbox(true);
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-sm">Nicht verfügbar</span>
                            </div>
                          )}
                        </div>

                        {/* Optionales Foto */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-700">Optionales Foto</span>
                            {assignmentTrackingData.foto_extra_url ? (
                              <span className="text-xs text-green-600">✓</span>
                            ) : (
                              <span className="text-xs text-gray-400">Nicht verfügbar</span>
                            )}
                          </div>
                          {assignmentTrackingData.foto_extra_url ? (
                            <img 
                              src={assignmentTrackingData.foto_extra_url} 
                              alt="Optionales Foto" 
                              className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => {
                                setSelectedPhoto({ url: assignmentTrackingData.foto_extra_url, title: "Optionales Foto" });
                                setShowPhotoLightbox(true);
                              }}
                            />
                          ) : (
                            <div className="w-full h-32 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400 text-sm">Nicht verfügbar</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <div className="space-y-2">
                          <div className="text-gray-400 mx-auto w-12 h-12 flex items-center justify-center">
                            📸
                          </div>
                          <p className="text-sm text-gray-500">Keine Fotos verfügbar</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {assignmentTrackingData.notes && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-gray-900">Notizen</h4>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-900">{assignmentTrackingData.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // ÜBERSICHT TAB - Current editing UI (original)
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Information</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Promotor</label>
                      <Select
                        value={editingEinsatz.promotorId || 'none'}
                        onValueChange={(val) => {
                          if (val === 'none') {
                            // Remove promotor
                            assignPromotionToPromotor('', undefined);
                            setEditingEinsatz({ ...editingEinsatz, promotor: '', promotorId: undefined, status: 'Offen' });
                          } else {
                          const p = promotorsList.find((x: any) => x.id === val);
                          if (!p) return;
                          assignPromotionToPromotor(p.name, p.id);
                          setEditingEinsatz({ ...editingEinsatz, promotor: p.name, promotorId: p.id, status: 'Verplant' });
                          }
                        }}
                      >
                        <SelectTrigger 
                          className="w-full h-9 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:ring-offset-0"
                          style={{
                            boxShadow: promotorFieldFlash 
                              ? '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.8)' 
                              : 'none',
                            transition: 'box-shadow 0.3s ease-in-out'
                          }}
                        >
                          <SelectValue placeholder="Promotor auswählen">
                            {editingEinsatz.promotorId && editingEinsatz.promotorId !== 'none' 
                              ? (promotorsList.find((p: any) => p.id === editingEinsatz.promotorId)?.name || editingEinsatz.promotor || 'Promotor auswählen')
                              : 'Kein Promotor'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg p-1">
                          <div className="p-1 sticky top-0 bg-white z-10" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={detailPromotorSearchRef}
                              value={detailPromotorSearch}
                              onChange={(e) => setDetailPromotorSearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Promotor suchen..."
                              className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                          <SelectItem value="none" className="focus:bg-gray-100">Kein Promotor</SelectItem>
                          {promotorsList
                            .filter((p: any) => p.name.toLowerCase().includes(detailPromotorSearch.toLowerCase()))
                            .map((p: any) => (
                              <SelectItem key={p.id} value={p.id} className="focus:bg-gray-100">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">New-Joiner (optional)</label>
                      <Select
                        value={editingEinsatz.buddy_user_id || 'none'}
                        onValueChange={(val) => {

                          if (val === 'none') {
                            assignBuddyToPromotion('', undefined);
                          } else {
                            const buddy = promotorsList.find((x: any) => x.id === val);

                            if (buddy) {
                              assignBuddyToPromotion(buddy.name, buddy.id);
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="w-full h-9 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:ring-offset-0">
                          <SelectValue placeholder="Buddy auswählen">
                            {editingEinsatz.buddy_user_id && editingEinsatz.buddy_user_id !== 'none' 
                              ? (promotorsList.find((p: any) => p.id === editingEinsatz.buddy_user_id)?.name || editingEinsatz.buddy_name || 'Buddy auswählen')
                              : 'Kein Buddy'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-gray-200 shadow-lg p-1">
                          <div className="p-1 sticky top-0 bg-white z-10" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                            <input
                              ref={detailBuddySearchRef}
                              value={detailBuddySearch}
                              onChange={(e) => setDetailBuddySearch(e.target.value)}
                              onKeyDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Buddy suchen..."
                              className="w-full h-8 px-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                              autoFocus
                            />
                          </div>
                          <SelectItem value="none" className="focus:bg-gray-100">Kein Buddy</SelectItem>
                          {promotorsList
                            .filter((p: any) => p.name.toLowerCase().includes(detailBuddySearch.toLowerCase()))
                            .map((p: any) => (
                              <SelectItem key={p.id} value={p.id} className="focus:bg-gray-100">{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    <Select
                      value={editingEinsatz.buddy_user_id && editingEinsatz.buddy_user_id !== 'none' ? 'Buddy Tag' : editingEinsatz.status}
                      onValueChange={(value) => {
                        // If there's a buddy, force status to stay as Buddy Tag
                        if (editingEinsatz.buddy_user_id && editingEinsatz.buddy_user_id !== 'none') {
                          return; // Don't allow status change when buddy exists
                        }
                        updateAssignmentStatus(editingEinsatz.id, value);
                        setEditingEinsatz({ ...editingEinsatz, status: value });
                      }}
                    >
                      <SelectTrigger className="w-full h-9 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:ring-offset-0">
                        <SelectValue placeholder="Status wählen" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border border-gray-200 shadow-lg">
                        <SelectItem value="Offen" className="focus:bg-gray-100">Offen</SelectItem>
                        <SelectItem value="Verplant" className="focus:bg-green-100">Verplant</SelectItem>
                        <SelectItem value="Buddy Tag" className="focus:bg-purple-100">Buddy Tag</SelectItem>
                        
                        <SelectItem value="Krankenstand" className="focus:bg-red-100">Krankenstand</SelectItem>
                        <SelectItem value="Urlaub" className="focus:bg-blue-100">Urlaub</SelectItem>
                        <SelectItem value="Zeitausgleich" className="focus:bg-yellow-100">Zeitausgleich</SelectItem>
                        <SelectItem value="Notfall" className="focus:bg-orange-100">Sonderfall</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Datum</label>
                      <DatePicker
                        value={editingEinsatz.date}
                        onChange={(value) => setEditingEinsatz({...editingEinsatz, date: value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PLZ</label>
                      <input
                        type="text"
                        value={editingEinsatz.plz || ''}
                        onChange={(e) => setEditingEinsatz({...editingEinsatz, plz: e.target.value})}
                        placeholder="PLZ"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Adresse</label>
                    <input
                      type="text"
                      value={editingEinsatz.address || ''}
                      onChange={(e) => setEditingEinsatz({...editingEinsatz, address: e.target.value})}
                      placeholder="Markt Adresse"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Zeit</label>
                      <TimePicker
                        value={editingEinsatz.planStart}
                        onChange={(value) => setEditingEinsatz({...editingEinsatz, planStart: value})}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Zeit</label>
                      <TimePicker
                        value={editingEinsatz.planEnd}
                        onChange={(value) => setEditingEinsatz({...editingEinsatz, planEnd: value})}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>



                {/* Notes, Status and Promotion Distribution Section */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Notes Section - Left Side */}
                  <div className="flex flex-col h-72">
                    {/* Status Indicator - Same width as textarea */}
                    <div className="p-3 rounded-lg bg-gray-50 mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          editingEinsatz.status === 'Verplant' || editingEinsatz.status === 'bestätigt' ? 'bg-green-400' :
                          editingEinsatz.status === 'Buddy Tag' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                          editingEinsatz.status === 'Krankenstand' ? 'bg-red-400' :
                          editingEinsatz.status === 'Sonderfall' ? 'bg-orange-400' :
                          editingEinsatz.status === 'Urlaub' ? 'bg-blue-400' :
                          editingEinsatz.status === 'Zeitausgleich' ? 'bg-yellow-400' :
                          'bg-gray-400'
                        }`}></div>
                        <span className="text-sm font-medium text-gray-700">Status: {editingEinsatz.status}</span>
                      </div>
                    </div>
                    
                    <h4 
                      className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3 cursor-pointer hover:text-gray-700 transition-colors"
                      onClick={() => setNotesMode(notesMode === 'internal' ? 'promotor' : 'internal')}
                    >
                      {notesMode === 'internal' ? 'SC interne Notizen' : 'Notiz an Promotor'}
                    </h4>
                    <textarea
                      value={notesMode === 'internal' ? (editingEinsatz.notes || '') : (promotorNotes[editingEinsatz.id] || '')}
                      onChange={(e) => {
                        if (notesMode === 'internal') {
                          setEditingEinsatz({...editingEinsatz, notes: e.target.value});
                        } else {
                          setPromotorNotes(prev => ({...prev, [editingEinsatz.id]: e.target.value}));
                        }
                      }}
                      onBlur={(e) => {
                        if (notesMode === 'internal') {
                          updateAssignmentNotes(editingEinsatz.id, e.target.value);
                        } else {
                          // Save promotor note to database
                          savePromotorNote(editingEinsatz.id, e.target.value);
                        }
                      }}
                      placeholder={notesMode === 'internal' ? "Notizen hinzufügen..." : "Notiz an Promotor hinzufügen..."}
                      className="flex-1 w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  {/* Promotion Distribution Section - Right Side */}
                  <div className="h-72">
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden h-full">
                      {/* Card Header with Toggle */}
                      <div className="p-3 border-b border-gray-100">
                        <div className="relative flex space-x-0.5 bg-gray-50 rounded-lg p-0.5">
                          {/* Sliding background */}
                          <div 
                            className="absolute top-0.5 bottom-0.5 bg-white shadow-sm border border-gray-200 rounded-md transition-all duration-300 ease-in-out"
                            style={{
                              left: promotionView === 'sent' ? '2px' : '50%',
                              width: 'calc(50% - 1px)'
                            }}
                          />
                          <button
                            onClick={() => setPromotionView('sent')}
                            className={`relative z-10 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                              promotionView === 'sent'
                                ? 'text-gray-900'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Gesendet
                          </button>
                          <button
                            onClick={() => setPromotionView('applications')}
                            className={`relative z-10 flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                              promotionView === 'applications'
                                ? 'text-gray-900'
                                : 'text-gray-600 hover:text-gray-800'
                            }`}
                          >
                            Angemeldet {applicationsList.length > 0 && `(${applicationsList.length})`}
                          </button>
                        </div>
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-4 h-full overflow-y-auto custom-scrollbar">
                        {promotionView === 'sent' ? (
                          <div className="space-y-2">
                            {(() => {
                              const sentHistoryItem = distributionHistory.find(item => 
                                item.promotions.some((p: any) => p.id === editingEinsatz.id)
                              );
                              if (sentHistoryItem) {
                                return sentHistoryItem.promotors.map((promotor: string, index: number) => (
                                  <div key={index} className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 mx-1">
                                    <span className="text-sm text-gray-900">{promotor}</span>
                                  </div>
                                ));
                              } else {
                                return (
                                  <div className="flex items-center justify-center h-full">
                                    <div className="text-sm text-gray-400">Noch nicht gesendet</div>
                                  </div>
                                );
                              }
                            })()}
                          </div>
                        ) : (
                          <div className="space-y-2 relative overflow-hidden">
                            {applicationsList.length === 0 ? (
                              <div className="text-sm text-gray-400 text-center py-8">Keine Anmeldungen</div>
                            ) : (
                              applicationsList.map((app: any) => (
                                <div 
                                  key={app.user_id} 
                                  className="px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 mx-1 flex items-center justify-between overflow-hidden relative transition-all duration-300"
                                  style={{
                                    transform: app.isSliding ? 'translateY(-100%)' : app.isSlidingRight ? 'translateX(100%)' : 'translate(0)',
                                    opacity: app.isSliding || app.isSlidingRight ? 0 : 1,
                                    transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s ease-out'
                                  }}
                                >
                                  <span className="text-sm text-gray-900">{app.name}</span>
                                <div className="flex items-center space-x-2">
                                  <button 
                                    className="p-1 rounded"
                                      onClick={async () => {
                                        // Trigger slide animation
                                        setApplicationsList(prev => 
                                          prev.map(a => a.user_id === app.user_id ? {...a, isSliding: true} : a)
                                        );
                                        
                                        // Update promotor field and trigger flash after animation
                                        setTimeout(() => {
                                          setEditingEinsatz((prev: any) => ({...prev, promotor: app.name}));
                                          setPromotorFieldFlash(true);
                                          setTimeout(() => setPromotorFieldFlash(false), 800);
                                        }, 500);
                                        
                                        await assignPromotionToPromotor(app.name, app.user_id);
                                        
                                        // Remove from list after animation
                                        setTimeout(() => {
                                          setApplicationsList(prev => prev.filter((x: any) => x.user_id !== app.user_id));
                                        }, 600);
                                      }}
                                  >
                                    <Check className="h-4 w-4 text-green-600" />
                                  </button>
                                    <button 
                                      className="p-1 rounded"
                                      onClick={async () => {
                                        // Trigger slide-right animation
                                        setApplicationsList(prev => 
                                          prev.map(a => a.user_id === app.user_id ? {...a, isSlidingRight: true} : a)
                                        );
                                        
                                        // After animation, open replacement assignment window
                                        setTimeout(async () => {
                                          try {
                                            await fetch(`/api/assignments/${editingEinsatz.id}/applications/decline`, {
                                              method: 'POST',
                                              headers: { 'Content-Type': 'application/json' },
                                              body: JSON.stringify({ user_id: app.user_id })
                                            });
                                          } catch {}
                                          setApplicationsList(prev => prev.filter((x: any) => x.user_id !== app.user_id));
                                          
                                          // Open replacement assignment selection
                                          setDeclinedPromotor({ user_id: app.user_id, name: app.name, invitation_id: app.invitation_id });
                                          setShowReplacementModal(true);
                                        }, 500);
                                      }}
                                    >
                                    <X className="h-4 w-4 text-red-600" />
                                  </button>
                                </div>
                              </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center rounded-b-xl">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedEinsatz(null);
                  setEditingEinsatz(null);
                  setDetailModalTab('overview');
                }}
                className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              {detailModalTab === 'overview' && (
              <button
                onClick={async () => {
                  if (savingDetail) return;
                  setSavingDetail(true);
                  try {
                    // Save basic assignment data (NOT including status - that's handled by status dropdown)
                    await fetch(`/api/assignments/${editingEinsatz.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        date: editingEinsatz.date,
                        planStart: editingEinsatz.planStart,
                        planEnd: editingEinsatz.planEnd,
                        location_text: editingEinsatz.address,
                        postal_code: editingEinsatz.plz
                        // REMOVED status - it should only be changed through the status dropdown
                      })
                    });
                    
                    // If promotor is assigned, ensure it's saved
                    if (editingEinsatz.promotorId) {
                      await assignPromotionToPromotor(editingEinsatz.promotor, editingEinsatz.promotorId);
                    }
                    
                    // If buddy is assigned, ensure it's saved
                    if (editingEinsatz.buddy_user_id && editingEinsatz.buddy_user_id !== 'none') {

                      await assignBuddyToPromotion(editingEinsatz.buddy_name, editingEinsatz.buddy_user_id);
                    } else if (!editingEinsatz.buddy_user_id || editingEinsatz.buddy_user_id === 'none') {
                      // Ensure buddy is cleared if set to 'none'

                      await assignBuddyToPromotion('', undefined);
                    }
                  } catch (error) {
                    console.error('Error saving assignment:', error);
                  }
                  setSavingDetail(false);
                  // Update the einsatzplan data - preserve market field
                  setEinsatzplanData(prev => prev.map(item => 
                    item.id === editingEinsatz.id ? { ...item, ...editingEinsatz } : item
                  ));
                  setShowDetailModal(false);
                  setSelectedEinsatz(null);
                  setEditingEinsatz(null);
                  setDetailModalTab('overview');
                }}
                className="px-6 py-2 text-sm text-white rounded-lg transition-all duration-300 hover:scale-105 hover:shadow-lg"
                disabled={savingDetail}
                style={{
                  background: 'linear-gradient(135deg, #22C55E, #105F2D)',
                  opacity: 0.9
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.9'}
              >
                {savingDetail ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    wird gespeichert
                  </span>
                ) : (
                  'Speichern'
                )}
              </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {showPhotoLightbox && selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={() => setShowPhotoLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowPhotoLightbox(false)}
              className="absolute top-4 right-4 z-[70] p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
            <img 
              src={selectedPhoto.url} 
              alt={selectedPhoto.title}
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg">
              <p className="text-sm font-medium">{selectedPhoto.title}</p>
            </div>
          </div>
        </div>
      )}
      {/* Import EP Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-96 max-w-[90vw]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">{activeView === 'maerkte' ? 'Import POS' : 'Import EP'}</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Import Type Selection - only for Einsatzplan */}
              {activeView === 'einsatzplan' && (
                <div className="mb-6">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setImportType('roh')}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        importType === 'roh'
                          ? 'bg-gray-100 text-gray-700 border border-gray-200'
                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      Roh Excel
                    </button>
                    <button
                      onClick={() => setImportType('intern')}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        importType === 'intern'
                          ? 'bg-gray-100 text-gray-700 border border-gray-200'
                          : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      EP intern
                    </button>
                  </div>
                </div>
              )}

              {/* Excel Format Info - only show for Roh Excel */}
              {activeView === 'einsatzplan' && importType === 'roh' && (
                <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <button
                    onClick={() => setShowExcelFormatInfo(!showExcelFormatInfo)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-blue-900 hover:text-blue-700 transition-colors"
                  >
                    <span>Excel Format</span>
                    {showExcelFormatInfo ? (
                      <ChevronUp className="h-4 w-4 text-blue-100" style={{ color: 'rgb(191 219 254)' }} />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-blue-100" style={{ color: 'rgb(191 219 254)' }} />
                    )}
                  </button>
                  
                  {showExcelFormatInfo && (
                    <div className="space-y-1.5 mt-2.5">
                      <div className="flex items-start text-xs">
                        <span className="font-medium text-blue-700 w-16 flex-shrink-0">Spalte A:</span>
                        <span className="text-gray-600">Marktname/Adresse</span>
                      </div>
                      <div className="flex items-start text-xs">
                        <span className="font-medium text-blue-700 w-16 flex-shrink-0">Spalte B:</span>
                        <span className="text-gray-600">PLZ</span>
                      </div>
                      <div className="flex items-start text-xs">
                        <span className="font-medium text-blue-700 w-16 flex-shrink-0">Spalte C-D:</span>
                        <span className="text-gray-600">Wird ignoriert</span>
                      </div>
                      <div className="flex items-start text-xs">
                        <span className="font-medium text-blue-700 w-16 flex-shrink-0">Ab Spalte E:</span>
                        <span className="text-gray-600">Datumsspalten (Zeile 1: Datum, z.B. "04.Aug")</span>
                      </div>
                      <div className="border-t border-blue-200/50 mt-2.5 pt-2.5">
                        <p className="text-xs font-medium text-blue-700 mb-1.5">Werte in Datumsspalten:</p>
                        <div className="space-y-1">
                          <div className="flex items-center text-xs">
                            <span className="font-semibold text-blue-600 w-8">1</span>
                            <span className="text-gray-600">= 1 Einsatz (09:30-18:30)</span>
                          </div>
                          <div className="flex items-center text-xs">
                            <span className="font-semibold text-blue-600 w-8">2</span>
                            <span className="text-gray-600">= 2 Einsätze (09:30-18:30)</span>
                          </div>
                          <div className="flex items-center text-xs">
                            <span className="font-semibold text-blue-600 w-8">0.75</span>
                            <span className="text-gray-600">= 1 Einsatz (09:30-15:30)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Drag and Drop Area */}
              <div 
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">
                      {activeView === 'maerkte' ? 'Märkte Excel hier importieren' : 'Excel-Datei hier ablegen oder'}
                    </p>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Datei auswählen
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Unterstützte Formate: .xlsx, .xls
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled
                >
                  Importieren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Replacement Assignments Modal */}
      {showReplacementModal && declinedPromotor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col">
            {/* Modal Header */}
            <div className="relative p-6 border-b border-gray-100">
              <div className="pr-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Ersatztermine für {declinedPromotor.name}</h3>
                <p className="text-sm text-gray-500">Wähle Ersatztermine aus den offenen Einsätzen</p>
              </div>
              <button
                onClick={() => {
                  setShowReplacementModal(false);
                  setDeclinedPromotor(null);
                  setSelectedReplacementAssignments([]);
                  setReplacementRegionFilter("ALLE");
                }}
                className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Region Filter Pills */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                {["ALLE", "W/NÖ/BGL", "ST", "S", "OÖ", "T", "V", "K"].map((region) => {
                  const isSelected = replacementRegionFilter === region || (replacementRegionFilter === "ALLE" && region === "ALLE");
                  return (
                    <button
                      key={region}
                      onClick={() => setReplacementRegionFilter(replacementRegionFilter === region ? "ALLE" : region)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-all duration-200 border border-gray-200 ${
                        isSelected 
                          ? 'bg-gray-100 text-gray-700 scale-110' 
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {region}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div 
              className="flex-1 overflow-y-auto p-6 no-scrollbar"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openAssignments
                  .filter((assignment: any) => {
                    if (replacementRegionFilter === "ALLE") return true;
                    // Map region codes to postal code ranges (same logic as main einsatzplan)
                    const plz = assignment.postal_code;
                    switch (replacementRegionFilter) {
                      case "W/NÖ/BGL": return plz >= 1000 && plz <= 3999;
                      case "ST": return plz >= 8000 && plz <= 8999;
                      case "S": return plz >= 5000 && plz <= 5999;
                      case "OÖ": return plz >= 4000 && plz <= 4999;
                      case "T": return plz >= 6000 && plz <= 6999;
                      case "V": return plz >= 6700 && plz <= 6999;
                      case "K": return plz >= 9000 && plz <= 9999;
                      default: return true;
                    }
                  })
                  .map((assignment: any) => (
                  <div
                    key={assignment.id}
                    onClick={() => handleReplacementAssignmentSelect(assignment.id)}
                    className={`
                      p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${selectedReplacementAssignments.includes(assignment.id)
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="space-y-2">
                      <div className="font-medium text-gray-900">
                        {new Date(assignment.start_ts).toLocaleDateString('de-DE', { 
                          weekday: 'short', 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {assignment.location_text}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {assignment.postal_code} {assignment.city}
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                          {`${String(new Date(assignment.start_ts).getUTCHours()).padStart(2, '0')}:${String(new Date(assignment.start_ts).getUTCMinutes()).padStart(2, '0')}-${String(new Date(assignment.end_ts).getUTCHours()).padStart(2, '0')}:${String(new Date(assignment.end_ts).getUTCMinutes()).padStart(2, '0')}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  ))
                }
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {selectedReplacementAssignments.length} Ersatztermine ausgewählt
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowReplacementModal(false);
                      setDeclinedPromotor(null);
                      setSelectedReplacementAssignments([]);
                      setReplacementRegionFilter("ALLE");
                    }}
                    className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={() => {
                      if (selectedReplacementAssignments.length === 0) {
                        // No assignments selected - just close the modal
                        // The rejection stays unacknowledged so promotor can see it and press "Verstanden"
                        setShowReplacementModal(false);
                        setDeclinedPromotor(null);
                        setSelectedReplacementAssignments([]);
                        setReplacementRegionFilter("ALLE");
                      } else {
                        // Assignments selected - send replacements
                        handleSendReplacementInvites();
                      }
                    }}
                    className="px-4 py-2 text-sm text-white rounded-lg transition-colors bg-blue-600 hover:bg-blue-700"
                  >
                    {selectedReplacementAssignments.length === 0 ? 'Keinen Ersatztermin senden' : 'Ersatztermine senden'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Neuen Einsatz erstellen</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewAssignment({
                    title: 'Promotion',
                    location_text: '',
                    postal_code: '',
                    city: '',
                    start_date: '',
                    start_time: '09:30',
                    end_time: '18:30',
                    notes: ''
                  });
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-1 hidden">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Titel</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-400"
                    placeholder="z.B. Promotion"
                  />
                </div>

                {/* Location with Market Picker */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Standort *</label>
                    <button
                      type="button"
                      title="Markt auswählen"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMarketPicker((v) => !v);
                        setTimeout(() => {
                          if (marketPickerRef.current) {
                            marketPickerRef.current.scrollTop = 0;
                          }
                        }, 0);
                      }}
                      className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
                    >
                      <Store className="h-3.5 w-3.5" /> Märkte
                    </button>
                  </div>
                  <div className="relative">
                  <input
                    type="text"
                      value={hoveredMarket ? `${hoveredMarket.name}` : newAssignment.location_text}
                    onFocus={() => {
                      if ((newAssignment.location_text || '').trim().length === 0) {
                        setHoveredMarket(null);
                        setMarketPickerSearch('');
                        return;
                      }
                      setHoveredMarket(null);
                      setMarketPickerSearch(newAssignment.location_text);
                      setShowMarketPicker(true);
                    }}
                    onChange={(e) => {
                      const value = e.target.value;
                      setNewAssignment(prev => ({ ...prev, location_text: value }));
                      setHoveredMarket(null);
                      setMarketPickerSearch(value);
                      setShowMarketPicker(value.trim().length > 0);
                    }}
                    className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-400"
                    placeholder="z.B. Interspar Graz"
                    required
                      style={hoveredMarket ? { opacity: 0.65 } : undefined}
                    />
                    {showMarketPicker && (
                      <div 
                        ref={marketPickerRef}
                        className="absolute left-0 right-0 top-11 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto no-scrollbar">
                          {marketsData
                            .filter((m: any) => {
                              const q = (marketPickerSearch || newAssignment.location_text || '').trim().toLowerCase();
                              if (!q) return true;
                              const hay = `${m.name || ''} ${m.address || ''} ${m.plz || ''} ${m.city || ''}`.toLowerCase();
                              return hay.includes(q);
                            })
                            .map((m: any) => (
                              <button
                                key={m.id}
                                type="button"
                                onMouseEnter={() => setHoveredMarket(m)}
                                onMouseLeave={() => setHoveredMarket(null)}
                                onClick={() => {
                                  setNewAssignment(prev => ({
                                    ...prev,
                                    location_text: m.name || '',
                                    postal_code: m.plz || '',
                                    city: m.city || ''
                                  }));
                                  setMarketPickerSearch('');
                                  setShowMarketPicker(false);
                                }}
                                className="w-full text-left py-2 px-2 hover:bg-gray-50 rounded-md transition-colors"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{m.name}</div>
                                    <div className="text-xs text-gray-500">{m.address}</div>
                                  </div>
                                  <div className="text-xs text-gray-600">{m.plz} {m.city}</div>
                                </div>
                              </button>
                            ))}
                          {marketsData.length === 0 && (
                            <div className="text-xs text-gray-500 p-2">Keine Märkte gefunden.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PLZ and City */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PLZ *</label>
                    <input
                      type="text"
                      value={hoveredMarket ? (hoveredMarket.plz || '') : newAssignment.postal_code}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-400"
                      placeholder="z.B. 8010"
                      required
                      style={hoveredMarket ? { opacity: 0.65 } : undefined}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stadt</label>
                    <input
                      type="text"
                      value={hoveredMarket ? (hoveredMarket.city || '') : newAssignment.city}
                      onChange={(e) => setNewAssignment(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-400"
                      placeholder="z.B. Graz"
                      style={hoveredMarket ? { opacity: 0.65 } : undefined}
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Datum *</label>
                  <DatePicker
                    value={newAssignment.start_date}
                    onChange={(value) => setNewAssignment(prev => ({ ...prev, start_date: value }))}
                    className="w-full"
                  />
                </div>

                {/* Times */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Start Zeit</label>
                    <TimePicker
                      value={newAssignment.start_time}
                      onChange={(value) => setNewAssignment(prev => ({ ...prev, start_time: value }))}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">End Zeit</label>
                    <TimePicker
                      value={newAssignment.end_time}
                      onChange={(value) => setNewAssignment(prev => ({ ...prev, end_time: value }))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">SC interne Notizen</label>
                  <textarea
                    value={newAssignment.notes}
                    onChange={(e) => setNewAssignment(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-0 focus:border-gray-400 resize-none"
                    rows={3}
                    placeholder="Zusätzliche Informationen..."
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewAssignment({
                      title: 'Promotion',
                      location_text: '',
                      postal_code: '',
                      city: '',
                      start_date: '',
                      start_time: '09:30',
                      end_time: '18:30',
                      notes: ''
                    });
                  }}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={createNewAssignment}
                  className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Speichern
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auslastung Modal */}
      {showAuslastungModal && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70]"
            onClick={() => setShowAuslastungModal(false)}
          ></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl shadow-2xl z-[80] w-[600px] max-w-[90vw] max-h-[85vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Dumbbell className="h-6 w-6" />
                  <h3 className="text-xl font-semibold whitespace-nowrap">Auslastung</h3>
                </div>
                
                {/* Searchbar */}
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
                  <input
                    type="text"
                    placeholder="Promotor suchen..."
                    value={auslastungSearch}
                    onChange={(e) => setAuslastungSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-lg text-sm bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/15 transition-colors"
                  />
                </div>
                
                <div className="flex items-center gap-3">
                  {/* KW Filter Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setShowAuslastungKWDropdown(!showAuslastungKWDropdown);
                        // Scroll to selected item when opening
                        if (!showAuslastungKWDropdown) {
                          setTimeout(() => {
                            const dropdown = auslastungKWDropdownRef.current;
                            if (dropdown && auslastungKW) {
                              const selectedButton = dropdown.querySelector(`[data-week="${auslastungKW}"]`) as HTMLElement;
                              if (selectedButton) {
                                selectedButton.scrollIntoView({ block: 'center', behavior: 'smooth' });
                              }
                            }
                          }, 10);
                        }
                      }}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-colors min-w-[140px]"
                    >
                      <span>{auslastungKW.split(' (')[0] || 'KW wählen'}</span>
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAuslastungKWDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showAuslastungKWDropdown && (
                      <div 
                        ref={auslastungKWDropdownRef}
                        className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-[90] w-56 max-h-60 overflow-y-auto custom-scrollbar"
                      >
                        {generateCalendarWeeks().map((week) => (
                          <button
                            key={week}
                            data-week={week}
                            onClick={() => {
                              setAuslastungKW(week);
                              setShowAuslastungKWDropdown(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                              auslastungKW === week
                                ? 'bg-gray-200 text-gray-900 font-medium'
                                : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            {week}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowAuslastungModal(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 max-h-[calc(85vh-120px)] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {auslastungLoading ? (
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(9)].map((_, index) => (
                    <div key={`skeleton-${index}`} className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                      <div className="mb-2 h-12">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-skeleton-fade"></div>
                        <div className="flex items-center gap-1.5">
                          <div className="h-5 bg-gray-200 rounded-full w-16 animate-skeleton-fade"></div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-4 bg-gray-100 rounded w-full animate-skeleton-fade"></div>
                        <div className="h-4 bg-gray-100 rounded w-full animate-skeleton-fade"></div>
                        <div className="h-1.5 bg-gray-200 rounded-full w-full animate-skeleton-fade"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {auslastungData
                    .filter(promotor => promotor.name.toLowerCase().includes(auslastungSearch.toLowerCase()))
                    .map((promotor, index) => {
                  const totalHours = promotor.assignedHours + promotor.overtime;
                  const percentage = promotor.contractHours > 0 ? (totalHours / promotor.contractHours) * 100 : 0;
                  
                  // Get cluster pill colors (matching admin team page)
                  const getClusterPill = (cluster: string) => {
                    switch (cluster) {
                      case 'wien-noe-bgl': return 'bg-[#E8F0FE] text-gray-700 border-[#CBD7F5]';
                      case 'steiermark': return 'bg-[#E7F5ED] text-gray-700 border-[#CFECDD]';
                      case 'salzburg': return 'bg-[#F0E9FF] text-gray-700 border-[#DDD4FF]';
                      case 'oberoesterreich': return 'bg-[#FFF3E6] text-gray-700 border-[#FFE3C7]';
                      case 'tirol': return 'bg-[#FDEBF3] text-gray-700 border-[#F8D5E5]';
                      case 'vorarlberg': return 'bg-[#EAF8FF] text-gray-700 border-[#CFEFFF]';
                      case 'kaernten': return 'bg-[#EAF6FF] text-gray-700 border-[#D6ECFF]';
                      default: return 'bg-gray-50 text-gray-700 border-gray-200';
                    }
                  };
                  const getClusterShort = (cluster: string) => {
                    switch (cluster) {
                      case 'wien-noe-bgl': return 'W/NÖ/BGL';
                      case 'steiermark': return 'ST';
                      case 'salzburg': return 'S';
                      case 'oberoesterreich': return 'OÖ';
                      case 'tirol': return 'T';
                      case 'vorarlberg': return 'V';
                      case 'kaernten': return 'K';
                      default: return cluster;
                    }
                  };
                  
                  // Get special status styling
                  const getSpecialStatus = (status: string | null) => {
                    if (!status) return null;
                    switch (status) {
                      case 'krankenstand': return { label: 'Krankenstand', color: 'bg-red-100 text-red-700 border-red-300' };
                      case 'urlaub': return { label: 'Urlaub', color: 'bg-blue-100 text-blue-700 border-blue-300' };
                      case 'notfall': return { label: 'Sonderfall', color: 'bg-orange-100 text-orange-700 border-orange-300' };
                      case 'zeitausgleich': return { label: 'Zeitausgleich', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' };
                      default: return null;
                    }
                  };
                  
                  const specialStatusInfo = getSpecialStatus(promotor.specialStatus);
                  
                  // Get gradient background for special status or 100% utilization
                  const getStatusGradient = () => {
                    // Special status takes priority
                    if (promotor.specialStatus) {
                      switch (promotor.specialStatus) {
                        case 'krankenstand': return 'bg-gradient-to-br from-red-50/60 to-white';
                        case 'urlaub': return 'bg-gradient-to-br from-blue-50/60 to-white';
                        case 'notfall': return 'bg-gradient-to-br from-orange-50/60 to-white';
                        case 'zeitausgleich': return 'bg-gradient-to-br from-yellow-50/60 to-white';
                        default: return '';
                      }
                    }
                    // 100% utilization gets green gradient
                    if (percentage >= 100) {
                      return 'bg-gradient-to-br from-green-50/60 to-white';
                    }
                    return '';
                  };
                  
                  return (
                    <div key={index} className={`rounded-lg p-3 border border-gray-200 shadow-sm ${getStatusGradient() || 'bg-white'}`}>
                      {/* Header - fixed height */}
                      <div className="mb-2 h-12 flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm truncate" title={promotor.name}>{promotor.name}</h4>
                          <div className="flex items-center gap-1.5 mt-1 min-h-[20px] min-w-0 overflow-hidden">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getClusterPill(promotor.cluster)} flex-none`}
                              title={promotor.cluster}
                            >
                              {getClusterShort(promotor.cluster)}
                            </span>
                            {specialStatusInfo ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${specialStatusInfo.color} flex-1 min-w-0 truncate`}
                                title={specialStatusInfo.label}
                              >
                                {specialStatusInfo.label}
                              </span>
                            ) : (
                              <span className="opacity-0 px-2 py-0.5 text-[10px]">-</span>
                            )}
                          </div>
                        </div>
                        {/* Percentage in top right */}
                        <span className={`text-sm font-bold ${
                          percentage >= 100 ? 'text-green-600' : 
                          percentage >= 75 ? 'text-orange-600' : 
                          'text-blue-600'
                        }`}>
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      
                      <div className="space-y-1.5">
                        {/* Hours - always visible */}
                        <div className="flex items-center justify-between text-xs h-4">
                          <span className="text-gray-500">Stunden</span>
                          <span className="font-medium text-gray-900">{promotor.assignedHours + promotor.overtime}h / {promotor.contractHours}h</span>
                        </div>
                        
                        {/* Overtime - always visible */}
                        <div className="flex items-center justify-between text-xs h-4">
                          <span className="text-gray-500">Überstunden</span>
                          <span className={`font-medium ${promotor.overtime > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {promotor.overtime > 0 ? `+${promotor.overtime}h` : '0h'}
                          </span>
                        </div>
                        
                        {/* Fill-up bar - at bottom without gap */}
                        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              percentage >= 100 
                                ? 'bg-gradient-to-r from-green-500 to-green-800' 
                                : percentage >= 75 
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
      {/* Market Detail Modal */}
      {showMarketDetailModal && editingMarket && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-5xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Store className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{editingMarket.name}</h3>
                  <p className="text-sm text-gray-500">{editingMarket.address}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMarketDetailModal(false);
                  setSelectedMarket(null);
                  setEditingMarket(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            <CardContent className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Market Info */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <h4 className="text-sm font-medium text-gray-900">Markt Informationen</h4>
                      <div className="relative">
                        <Clock
                          data-market-hours-trigger
                          onClick={() => setShowMarketHours((prev) => !prev)}
                          className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                        />
                        {showMarketHours && (
                          <div
                            ref={marketHoursRef}
                            className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-lg shadow-xl p-3 z-20"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">Öffnungszeiten</span>
                              <span className="text-xs text-gray-400">Mo – So</span>
                            </div>
                            <div className="space-y-2">
                              {marketOpeningHours.map(({ label, text, closed }) => (
                                <div key={label} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 font-medium">{label}</span>
                                  <span className={closed ? "text-red-500 font-medium" : "text-gray-900"}>{text}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500">Marktname</label>
                          <input
                            type="text"
                            value={editingMarket.name}
                            onChange={(e) => setEditingMarket({...editingMarket, name: e.target.value})}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Stammmarkt von</label>
                          <Select
                            value={editingMarket.stammPromotorId || ''}
                            onValueChange={(val) => setEditingMarket({ ...editingMarket, stammPromotorId: val })}
                          >
                            <SelectTrigger className="w-full h-9 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-gray-200">
                              <SelectValue placeholder="Promotor wählen" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border border-gray-200">
                              <div className="divide-y divide-gray-100 max-h-[220px] overflow-y-auto no-scrollbar">
                                {marketsPromotorsList.map((p) => (
                                <SelectItem
                                  key={p.id}
                                  value={p.id}
                                  className="focus:bg-transparent data-[highlighted]:bg-gray-100"
                                >
                                  {p.name}
                                </SelectItem>
                              ))}
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Adresse</label>
                        <input
                          type="text"
                          value={editingMarket.address}
                          onChange={(e) => setEditingMarket({...editingMarket, address: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">PLZ</label>
                          <input
                            type="text"
                            value={editingMarket.plz}
                            onChange={(e) => setEditingMarket({...editingMarket, plz: e.target.value})}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Stadt</label>
                          <input
                            type="text"
                            value={editingMarket.city}
                            onChange={(e) => setEditingMarket({...editingMarket, city: e.target.value})}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Cluster</label>
                        <Select
                          value={editingMarket.cluster}
                          onValueChange={(val) => setEditingMarket({ ...editingMarket, cluster: val })}
                        >
                          <SelectTrigger className="w-full h-9 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-gray-200">
                            <SelectValue placeholder="Cluster" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border border-gray-200">
                            <SelectItem value="wien-noe-bgl" className="focus:bg-transparent data-[highlighted]:bg-[rgba(59,130,246,0.08)]">W/NÖ/BGL</SelectItem>
                            <SelectItem value="steiermark" className="focus:bg-transparent data-[highlighted]:bg-[rgba(16,185,129,0.08)]">ST</SelectItem>
                            <SelectItem value="salzburg" className="focus:bg-transparent data-[highlighted]:bg-[rgba(245,158,11,0.08)]">S</SelectItem>
                            <SelectItem value="oberoesterreich" className="focus:bg-transparent data-[highlighted]:bg-[rgba(168,85,247,0.08)]">OÖ</SelectItem>
                            <SelectItem value="tirol" className="focus:bg-transparent data-[highlighted]:bg-[rgba(20,184,166,0.08)]">T</SelectItem>
                            <SelectItem value="vorarlberg" className="focus:bg-transparent data-[highlighted]:bg-[rgba(99,102,241,0.08)]">V</SelectItem>
                            <SelectItem value="kaernten" className="focus:bg-transparent data-[highlighted]:bg-[rgba(244,63,94,0.08)]">K</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Marktleiter Info */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Marktleiter</h4>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500">Name</label>
                        <input
                          type="text"
                          value={editingMarket.marktleiter}
                          onChange={(e) => setEditingMarket({...editingMarket, marktleiter: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Telefon</label>
                        <input
                          type="text"
                          value={editingMarket.marktleiterPhone}
                          onChange={(e) => setEditingMarket({...editingMarket, marktleiterPhone: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">E-Mail</label>
                        <input
                          type="email"
                          value={editingMarket.marktleiterEmail}
                          onChange={(e) => setEditingMarket({...editingMarket, marktleiterEmail: e.target.value})}
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Visit Statistics */
                  }
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900 border-b border-gray-200 pb-2">Besuchs-Statistik</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-600">Gesamt Besuche</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border border-current/50 ${
                          editingMarket.visits <= 5 
                            ? 'bg-orange-100 text-orange-700' 
                            : editingMarket.visits <= 10 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {editingMarket.visits}×
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-600">Letzter Besuch</span>
                        <span className="text-xs text-gray-900">{editingMarket.lastVisit ? new Date(editingMarket.lastVisit).toLocaleDateString('de-DE') : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-xs text-gray-600">Nächster Besuch</span>
                        <span className="text-xs text-gray-900">{editingMarket.nextVisit ? new Date(editingMarket.nextVisit).toLocaleDateString('de-DE') : '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Fotos intern (beside notes) */}
                  <div className="space-y-2">
                    <label className="text-xs text-gray-500">Fotos intern</label>
                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative group">
                      <input
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload('internal', file);
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                        id="upload-internal"
                      />
                      {/* Top-right actions (hover) */}
                      <div className="absolute right-2 top-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <button type="button" aria-label="Foto hinzufügen" onClick={() => document.getElementById('upload-internal')?.click()} className="bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white">
                          <Plus className="h-4 w-4 text-green-600" />
                        </button>
                        <button type="button" aria-label="Foto löschen" onClick={() => handlePhotoDelete('internal')} className={`bg-white/90 border ${pendingPhotoDelete['internal'] ? 'border-red-300 wobble' : 'border-gray-200'} rounded-full shadow p-1 hover:bg-white`}>
                          <Trash2 className={`h-4 w-4 ${pendingPhotoDelete['internal'] ? 'text-red-600' : 'text-red-500'}`} />
                        </button>
                      </div>
                      {/* Hover arrows - only show if multiple photos */}
                      {(editingMarket.photosInternal?.length || 0) > 1 && (
                        <>
                          <button type="button" aria-label="Vorheriges Foto" onClick={() => navigatePhoto('internal', 'prev')} className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                            <ChevronLeft className="h-4 w-4 text-gray-600" />
                          </button>
                          <button type="button" aria-label="Nächstes Foto" onClick={() => navigatePhoto('internal', 'next')} className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                            <ChevronRight className="h-4 w-4 text-gray-600" />
                          </button>
                        </>
                      )}
                      <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                        {(editingMarket.photosInternal?.length || 0) > 0 ? (
                          <img
                            src={editingMarket.photosInternal[photoInternalIndex]?.url}
                            alt="Intern"
                            className="w-full h-full object-cover cursor-zoom-in"
                            onClick={() => setPhotoPreviewUrl(editingMarket.photosInternal[photoInternalIndex]?.url || null)}
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-gray-400 text-xs">Kein Foto</div>
                            <button onClick={() => document.getElementById('upload-internal')?.click()} className="mt-2 text-xs text-blue-600 hover:text-blue-700">Hochladen</button>
                          </div>
                        )}
                      </div>
                      <input
                        type="text"
                        value={editingMarket.photosInternal?.[photoInternalIndex]?.comment || ''}
                        onChange={(e) => {
                          const photos = [...(editingMarket.photosInternal || [])];
                          if (photos[photoInternalIndex]) {
                            photos[photoInternalIndex] = { ...photos[photoInternalIndex], comment: e.target.value };
                            setEditingMarket({ ...editingMarket, photosInternal: photos });
                          }
                        }}
                        placeholder="Kommentar zum Foto..."
                        className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6 flex flex-col h-full">
                  {/* Photos Section */}
                  <div className="space-y-3 relative">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                      <h4 className="text-sm font-medium text-gray-900">Fotos</h4>
                      <button
                        ref={acceptanceAnchorRef}
                        type="button"
                        title="Akzeptanzbereich"
                        className="text-gray-800/80 hover:text-gray-900 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAcceptancePopover(prev => !prev);
                        }}
                      >
                        <Crosshair className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Acceptance Popover */}
                    {showAcceptancePopover && (
                      <div
                        ref={acceptancePopoverRef}
                        className="absolute right-0 top-8 z-20 w-[360px] max-w-[90vw] rounded-lg border border-gray-200 bg-white shadow-xl"
                      >
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs text-gray-500">Akzeptanz‑Adressen</p>
                            <h5 className="text-sm font-semibold text-gray-900 truncate">{editingMarket?.name || 'Markt'}</h5>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-200">
                            {(editingMarket?.acceptance_addresses || []).length}
                          </span>
                        </div>

                        {/* Primary address */}
                        <div className="px-3 pt-3">
                          <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-green-700 font-medium">Primär</span>
                            </div>
                            <div className="text-sm text-gray-900 truncate">{editingMarket?.address || '—'}</div>
                            <div className="text-xs text-gray-500">{[editingMarket?.plz, editingMarket?.city].filter(Boolean).join(' ')}</div>
                          </div>
                        </div>

                        {/* List */}
                        <div className="p-3 pt-2 max-h-[260px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          {(editingMarket?.acceptance_addresses || []).length === 0 ? (
                            <div className="text-center text-xs text-gray-500 py-6">
                              Noch keine zusätzlichen Adressen
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {(editingMarket?.acceptance_addresses || []).map((item: any) => {
                                const fp = item.fingerprint || normalizeForMatch(String(item.raw || ''));
                                const isCopied = copiedAcceptanceKey === fp;
                                const isPendingDelete = !!pendingAcceptanceDelete[fp];
                                return (
                                <div key={fp} className="flex items-start justify-between gap-2 rounded-md border border-gray-200 bg-gradient-to-r from-white to-indigo-50/20 p-2">
                                  <div className="min-w-0">
                                    <div className="text-sm text-gray-900 truncate">{item.raw || '—'}</div>
                                    <div className="text-[11px] text-gray-500">{item.city || ''} {item.plz || ''}</div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      className="h-6 w-6 rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 flex items-center justify-center"
                                      title="Kopieren"
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard?.writeText(item.raw || '');
                                          setCopiedAcceptanceKey(fp);
                                          setTimeout(() => setCopiedAcceptanceKey(null), 1000);
                                        } catch {}
                                      }}
                                    >
                                      {isCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                    <button
                                      className={`h-6 w-6 rounded-md border ${isPendingDelete ? 'border-red-300 wobble' : 'border-gray-200'} bg-white text-red-600 hover:bg-red-50 flex items-center justify-center`}
                                      title="Entfernen"
                                      onClick={() => {
                                        if (!isPendingDelete) {
                                          setPendingAcceptanceDelete(prev => ({ ...prev, [fp]: true }));
                                          setTimeout(() => setPendingAcceptanceDelete(prev => ({ ...prev, [fp]: false })), 2000);
                                          return;
                                        }
                                        removeAcceptanceAddress(fp);
                                        setPendingAcceptanceDelete(prev => ({ ...prev, [fp]: false }));
                                      }}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )})}
                            </div>
                          )}
                        </div>

                        {/* Add form */}
                        <div className="p-3 border-t border-gray-100 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={acceptanceRaw}
                              onChange={(e) => setAcceptanceRaw(e.target.value)}
                              placeholder="Adresse, PLZ, Ort…"
                              className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0"
                            />
                            <button
                              onClick={addAcceptanceAddress}
                              disabled={!acceptanceRaw.trim() || acceptanceSaving}
                              className="px-3 py-1.5 text-sm rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                            >
                              {acceptanceSaving ? 'Hinzufügen…' : 'Hinzufügen'}
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={acceptancePlz}
                              onChange={(e) => setAcceptancePlz(e.target.value)}
                              placeholder="PLZ"
                              className="w-24 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-0"
                            />
                            <input
                              type="text"
                              value={acceptanceCity}
                              onChange={(e) => setAcceptanceCity(e.target.value)}
                              placeholder="Ort"
                              className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-0"
                            />
                          </div>
                          <div className="text-[11px] text-gray-500 text-center">
                            Maximal 30 Einträge. Doppelte werden ignoriert.
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Exterior Photo */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">Foto Außenansicht</label>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative group">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload('exterior', file);
                            e.target.value = '';
                          }}
                          style={{ display: 'none' }}
                          id="upload-exterior"
                        />
                        {/* Top-right actions (hover) */}
                        <div className="absolute right-2 top-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button type="button" aria-label="Foto hinzufügen" onClick={() => document.getElementById('upload-exterior')?.click()} className="bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white">
                            <Plus className="h-4 w-4 text-green-600" />
                          </button>
                          <button type="button" aria-label="Foto löschen" onClick={() => handlePhotoDelete('exterior')} className={`bg-white/90 border ${pendingPhotoDelete['exterior'] ? 'border-red-300 wobble' : 'border-gray-200'} rounded-full shadow p-1 hover:bg-white`}>
                            <Trash2 className={`h-4 w-4 ${pendingPhotoDelete['exterior'] ? 'text-red-600' : 'text-red-500'}`} />
                          </button>
                        </div>
                        {/* Hover arrows - only show if multiple photos */}
                        {(editingMarket.photosExterior?.length || 0) > 1 && (
                          <>
                            <button type="button" aria-label="Vorheriges Foto" onClick={() => navigatePhoto('exterior', 'prev')} className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                              <ChevronLeft className="h-4 w-4 text-gray-600" />
                            </button>
                            <button type="button" aria-label="Nächstes Foto" onClick={() => navigatePhoto('exterior', 'next')} className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            </button>
                          </>
                        )}
                        <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                          {(editingMarket.photosExterior?.length || 0) > 0 ? (
                            <img
                              src={editingMarket.photosExterior[photoExteriorIndex]?.url}
                              alt="Exterior"
                              className="w-full h-full object-cover cursor-zoom-in"
                              onClick={() => setPhotoPreviewUrl(editingMarket.photosExterior[photoExteriorIndex]?.url || null)}
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-gray-400 text-xs">Kein Foto</div>
                              <button onClick={() => document.getElementById('upload-exterior')?.click()} className="mt-2 text-xs text-blue-600 hover:text-blue-700">Hochladen</button>
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={editingMarket.photosExterior?.[photoExteriorIndex]?.comment || ''}
                          onChange={(e) => {
                            const photos = [...(editingMarket.photosExterior || [])];
                            if (photos[photoExteriorIndex]) {
                              photos[photoExteriorIndex] = { ...photos[photoExteriorIndex], comment: e.target.value };
                              setEditingMarket({ ...editingMarket, photosExterior: photos });
                            }
                          }}
                          placeholder="Kommentar zum Foto..."
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Interior Photo */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">Foto Innenbereich</label>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative group">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload('interior', file);
                            e.target.value = '';
                          }}
                          style={{ display: 'none' }}
                          id="upload-interior"
                        />
                        {/* Top-right actions (hover) */}
                        <div className="absolute right-2 top-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button type="button" aria-label="Foto hinzufügen" onClick={() => document.getElementById('upload-interior')?.click()} className="bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white">
                            <Plus className="h-4 w-4 text-green-600" />
                          </button>
                          <button type="button" aria-label="Foto löschen" onClick={() => handlePhotoDelete('interior')} className={`bg-white/90 border ${pendingPhotoDelete['interior'] ? 'border-red-300 wobble' : 'border-gray-200'} rounded-full shadow p-1 hover:bg-white`}>
                            <Trash2 className={`h-4 w-4 ${pendingPhotoDelete['interior'] ? 'text-red-600' : 'text-red-500'}`} />
                          </button>
                        </div>
                        {/* Hover arrows - only show if multiple photos */}
                        {(editingMarket.photosInterior?.length || 0) > 1 && (
                          <>
                            <button type="button" aria-label="Vorheriges Foto" onClick={() => navigatePhoto('interior', 'prev')} className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                              <ChevronLeft className="h-4 w-4 text-gray-600" />
                            </button>
                            <button type="button" aria-label="Nächstes Foto" onClick={() => navigatePhoto('interior', 'next')} className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            </button>
                          </>
                        )}
                        <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                          {(editingMarket.photosInterior?.length || 0) > 0 ? (
                            <img
                              src={editingMarket.photosInterior[photoInteriorIndex]?.url}
                              alt="Interior"
                              className="w-full h-full object-cover cursor-zoom-in"
                              onClick={() => setPhotoPreviewUrl(editingMarket.photosInterior[photoInteriorIndex]?.url || null)}
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-gray-400 text-xs">Kein Foto</div>
                              <button onClick={() => document.getElementById('upload-interior')?.click()} className="mt-2 text-xs text-blue-600 hover:text-blue-700">Hochladen</button>
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={editingMarket.photosInterior?.[photoInteriorIndex]?.comment || ''}
                          onChange={(e) => {
                            const photos = [...(editingMarket.photosInterior || [])];
                            if (photos[photoInteriorIndex]) {
                              photos[photoInteriorIndex] = { ...photos[photoInteriorIndex], comment: e.target.value };
                              setEditingMarket({ ...editingMarket, photosInterior: photos });
                            }
                          }}
                          placeholder="Kommentar zum Foto..."
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Products Photo */}
                    <div className="space-y-2">
                      <label className="text-xs text-gray-500">Foto Produktplatzierung</label>
                      <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 relative group">
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handlePhotoUpload('products', file);
                            e.target.value = '';
                          }}
                          style={{ display: 'none' }}
                          id="upload-products"
                        />
                        {/* Top-right actions (hover) */}
                        <div className="absolute right-2 top-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <button type="button" aria-label="Foto hinzufügen" onClick={() => document.getElementById('upload-products')?.click()} className="bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white">
                            <Plus className="h-4 w-4 text-green-600" />
                          </button>
                          <button type="button" aria-label="Foto löschen" onClick={() => handlePhotoDelete('products')} className={`bg-white/90 border ${pendingPhotoDelete['products'] ? 'border-red-300 wobble' : 'border-gray-200'} rounded-full shadow p-1 hover:bg-white`}>
                            <Trash2 className={`h-4 w-4 ${pendingPhotoDelete['products'] ? 'text-red-600' : 'text-red-500'}`} />
                          </button>
                        </div>
                        {/* Hover arrows - only show if multiple photos */}
                        {(editingMarket.photosProducts?.length || 0) > 1 && (
                          <>
                            <button type="button" aria-label="Vorheriges Foto" onClick={() => navigatePhoto('products', 'prev')} className="absolute left-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                              <ChevronLeft className="h-4 w-4 text-gray-600" />
                            </button>
                            <button type="button" aria-label="Nächstes Foto" onClick={() => navigatePhoto('products', 'next')} className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 border border-gray-200 rounded-full shadow p-1 hover:bg-white z-10">
                              <ChevronRight className="h-4 w-4 text-gray-600" />
                            </button>
                          </>
                        )}
                        <div className="flex items-center justify-center h-32 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                          {(editingMarket.photosProducts?.length || 0) > 0 ? (
                            <img
                              src={editingMarket.photosProducts[photoProductsIndex]?.url}
                              alt="Products"
                              className="w-full h-full object-cover cursor-zoom-in"
                              onClick={() => setPhotoPreviewUrl(editingMarket.photosProducts[photoProductsIndex]?.url || null)}
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-gray-400 text-xs">Kein Foto</div>
                              <button onClick={() => document.getElementById('upload-products')?.click()} className="mt-2 text-xs text-blue-600 hover:text-blue-700">Hochladen</button>
                            </div>
                          )}
                        </div>
                        <input
                          type="text"
                          value={editingMarket.photosProducts?.[photoProductsIndex]?.comment || ''}
                          onChange={(e) => {
                            const photos = [...(editingMarket.photosProducts || [])];
                            if (photos[photoProductsIndex]) {
                              photos[photoProductsIndex] = { ...photos[photoProductsIndex], comment: e.target.value };
                              setEditingMarket({ ...editingMarket, photosProducts: photos });
                            }
                          }}
                          placeholder="Kommentar zum Foto..."
                          className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="space-y-3 flex flex-col flex-1">
                    <div className="flex items-center border-b border-gray-200 pb-2">
                      <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                        <button
                          onClick={() => setMarketNotesMode('internal')}
                          className={`px-3 py-1 rounded text-xs transition-all ${
                            marketNotesMode === 'internal'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Interne Notiz
                        </button>
                        <button
                          onClick={() => setMarketNotesMode('promotor')}
                          className={`px-3 py-1 rounded text-xs transition-all ${
                            marketNotesMode === 'promotor'
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Notiz an Promotoren
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={marketNotesMode === 'internal' ? editingMarket.internalNotes : editingMarket.promotorNotes}
                      onChange={(e) => setEditingMarket({
                        ...editingMarket,
                        [marketNotesMode === 'internal' ? 'internalNotes' : 'promotorNotes']: e.target.value
                      })}
                      placeholder={marketNotesMode === 'internal' ? 'Interne Notizen...' : 'Notizen für Promotoren...'}
                      rows={10}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-0 focus:border-gray-200 resize-none flex-1 min-h-[228px]"
                    />
                    <div className="text-xs text-gray-400 text-right mt-2">
                      {(marketNotesMode === 'internal' ? editingMarket.internalNotes : editingMarket.promotorNotes).length} Zeichen
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>

            {/* Footer Actions */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between shrink-0">
              <button
                onClick={async () => {
                  if (pendingMarketDelete[editingMarket.id]) {
                    // Second click - delete
                    try {
                      const response = await fetch(`/api/admin/markets/${editingMarket.id}`, {
                        method: 'DELETE'
                      });

                      if (!response.ok) {
                        throw new Error('Failed to delete market');
                      }

                      // Reload markets
                      await loadMarkets();
                      setShowMarketDetailModal(false);
                      setPendingMarketDelete({});
                    } catch (error) {
                      console.error('Error deleting market:', error);
                      alert('Fehler beim Löschen des Marktes');
                    }
                  } else {
                    // First click - wobble
                    setPendingMarketDelete({ [editingMarket.id]: true });
                    setTimeout(() => setPendingMarketDelete({}), 2000);
                  }
                }}
                className={`px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-all ${
                  pendingMarketDelete[editingMarket.id] ? 'wobble' : ''
                }`}
              >
                {pendingMarketDelete[editingMarket.id] ? 'Wirklich löschen?' : 'Markt löschen'}
              </button>
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setShowMarketDetailModal(false);
                    setSelectedMarket(null);
                    setEditingMarket(null);
                  }}
                >
                  Abbrechen
                </Button>
                <button
                  onClick={async () => {
                    if (savingMarket) return;
                    setSavingMarket(true);
                    try {
                      const response = await fetch(`/api/admin/markets/${editingMarket.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(editingMarket)
                      });

                      if (!response.ok) {
                        throw new Error('Failed to update market');
                      }

                      // Reload markets to get fresh data
                      await loadMarkets();
                      
                      setShowMarketDetailModal(false);
                      setSelectedMarket(null);
                      setEditingMarket(null);
                    } catch (error) {
                      console.error('Error updating market:', error);
                      alert('Fehler beim Speichern des Marktes');
                    } finally {
                      setSavingMarket(false);
                    }
                  }}
                  className="px-4 py-2 text-sm text-white rounded-lg transition-colors"
                  disabled={savingMarket}
                  style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)', opacity: 0.85}}
                >
                  {savingMarket ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      wird gespeichert
                    </span>
                  ) : (
                    'Speichern'
                  )}
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Eddie KI Assistant */}
  {photoPreviewUrl && (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setPhotoPreviewUrl(null)}>
      <img src={photoPreviewUrl} alt="Vorschau" className="max-w-full max-h-full rounded-lg shadow-2xl" />
    </div>
  )}
      <AdminEddieAssistant />
    </div>
  );
} 