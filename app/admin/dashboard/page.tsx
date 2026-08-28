"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Bell,
  Calendar,
  CalendarX,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  Send,
  Plus,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  BarChart3,
  Settings,
  Home,
  Briefcase,
  UserCheck,
  X,
  Menu,
  LayoutList,
  LayoutGrid,
  Trophy,
  MessageCircle,
  UserPlus,
  CheckSquare,
  Check,
  Wand2,
  Sparkles,
  Edit3,
  ChevronDown,
  ChevronUp,
  Trash2,
  Thermometer,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePicker } from "@/components/ui/date-picker";
import { TimePicker } from "@/components/ui/time-picker";
import AdminNavigation from "@/components/AdminNavigation";
import AdminEddieAssistant from "@/components/AdminEddieAssistant";
import AssignmentLocationMap from "@/components/assignment/AssignmentLocationMap";

 export default function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messageForm, setMessageForm] = useState({
    recipient: "all",
    subject: "",
    message: ""
  });
  const [eddieText, setEddieText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [eddieLoading, setEddieLoading] = useState(true);
  const [fullEddieText, setFullEddieText] = useState("");
  const [einsatzFilter, setEinsatzFilter] = useState("alle");
  const [showDropdown, setShowDropdown] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
  const [showActivePromotionsModal, setShowActivePromotionsModal] = useState(false);
  const [activePromotionsViewMode, setActivePromotionsViewMode] = useState<'list' | 'cards'>('list');
  const [activePromotionsSearch, setActivePromotionsSearch] = useState('');
  const [showOffeneAnfragenModal, setShowOffeneAnfragenModal] = useState(false);
  const [showActivePromotorenModal, setShowActivePromotorenModal] = useState(false);
  const [activePromotorenSearch, setActivePromotorenSearch] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [showKpiView, setShowKpiView] = useState(true); // true for CA KPIs, false for Mystery Shop
  const [isEinsaetzeExpanded, setIsEinsaetzeExpanded] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);
 const [sendingMessage, setSendingMessage] = useState(false);
 const [schedulingMessage, setSchedulingMessage] = useState(false);
  
  // State for today's assignments
  const [todaysEinsaetze, setTodaysEinsaetze] = useState<any[]>([]);
  const [todaysEinsaetzeLoading, setTodaysEinsaetzeLoading] = useState(true);
  
  // State for detailed assignment view
  const [showAssignmentDetailModal, setShowAssignmentDetailModal] = useState(false);
  const [selectedAssignmentDetail, setSelectedAssignmentDetail] = useState<any | null>(null);
  
  // State for photo lightbox
  const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{url: string, title: string} | null>(null);
  
  // State for outside-break timestamp in detail modal
  const [detailModalOutsideBreakTimestamp, setDetailModalOutsideBreakTimestamp] = useState<string | null>(null);
  

  
  // KPI Popup state
  const [showKpiPopup, setShowKpiPopup] = useState(false);
  const [kpiPopupActiveTab, setKpiPopupActiveTab] = useState<"ca-kpis" | "mystery-shop">("ca-kpis");
  const ENABLE_MYSTERY_SHOP_UI = false; // keep UI code but hide for now
  // Real KPI history for company-wide CA KPIs (from admin/statistiken)
  const [kpiHistory, setKpiHistory] = useState<Array<{ mcet: number; tma: number; vlShare: number; createdAt: Date }>>([]);
  const [kpiHistoryLoading, setKpiHistoryLoading] = useState(false);
  
  // Promotor Selection states
  const [showPromotorSelection, setShowPromotorSelection] = useState(false);
  const [selectedPromotors, setSelectedPromotors] = useState<string[]>([]);
  const [activeRegionFilter, setActiveRegionFilter] = useState<string>("all");
  const [promotorSelectionSearch, setPromotorSelectionSearch] = useState("");
  const [lastSelectedByIcon, setLastSelectedByIcon] = useState<string[]>([]);
  
  // Assignment release modal states (for Krankenstand approval)
  const [showReleaseAssignmentsModal, setShowReleaseAssignmentsModal] = useState(false);
  const [releaseModalData, setReleaseModalData] = useState<{requestId: string, userId: string, promotorName: string, requestType: string} | null>(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState<any[]>([]);
  const [selectedAssignmentIds, setSelectedAssignmentIds] = useState<Set<string>>(new Set());
  const [upcomingAssignmentsLoading, setUpcomingAssignmentsLoading] = useState(false);
  const [releasingAssignments, setReleasingAssignments] = useState(false);
  
  // Message enhancement states
  const [messageText, setMessageText] = useState("");
  const [enableTwoStep, setEnableTwoStep] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Real promotors data
  const [allPromotors, setAllPromotors] = useState<any[]>([]);
  const [activePromotorsData, setActivePromotorsData] = useState<any[]>([]);
  const [promotorsLoading, setPromotorsLoading] = useState(true);
  
  // Load promotors on component mount (same as einsatzplan)
  useEffect(() => {
    const loadPromotors = async () => {
      try {
        setPromotorsLoading(true);
        const res = await fetch('/api/promotors', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        const list = Array.isArray(data?.promotors) ? data.promotors.map((p: any) => ({ 
          id: p.id, 
          name: p.name, 
          region: p.region || 'wien-noe-bgl' // Use actual region from API
        })) : [];
        console.log('✅ Loaded promotors for admin dashboard:', list.length, 'promotors');
        
        // Prepare active promotors data and count their past assignments
        const activePromsData = await Promise.all((data?.promotors || []).map(async (promotor: any) => {
          // Count assignments where this promotor was "verplant" (assigned)
          let totalEinsaetze = 0;
          try {
            const svc = await fetch('/api/assignments', { cache: 'no-store' });
            const assignmentData = await svc.json();
            if (Array.isArray(assignmentData?.assignments)) {
              // Count assignments where this promotor is the lead
              totalEinsaetze = assignmentData.assignments.filter((assignment: any) => 
                assignment.lead_user_id === promotor.id
              ).length;
            }
          } catch (err) {
            console.error('Error counting assignments for promotor:', promotor.id, err);
          }
          
          return {
            id: promotor.id,
            name: promotor.name || 'Unbekannt',
            phone: promotor.phone || '',
            email: promotor.email || '',
            location: promotor.address || promotor.region || 'Unbekannt',
            status: 'aktiv',
            totalEinsaetze
          };
        }));
        
        setActivePromotorsData(activePromsData);
        console.log('✅ Loaded active promotors:', activePromsData.length);
        console.log('✅ First promotor:', list[0]);
        setAllPromotors(list);
      } catch (error) {
        console.error('Error loading promotors:', error);
        setAllPromotors([]);
      } finally {
        setPromotorsLoading(false);
      }
    };
    
    // No longer needed - messages are sent immediately but filtered by time on frontend
    
    loadPromotors();
    loadScheduledMessages();
    loadMessageHistory();
    loadTodaysAssignments(); // Load today's assignments
    
    // Refresh today's assignments when window regains focus (after editing in einsatzplan)
    const handleFocus = () => {
      loadTodaysAssignments();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Scheduling states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [scheduledMessagesLoading, setScheduledMessagesLoading] = useState(false);
  
  // Load scheduled messages from database
  const loadScheduledMessages = async () => {
    try {
      setScheduledMessagesLoading(true);
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        // Filter for messages with future scheduled_send_time (these appear as "scheduled")
        // Use UTC time for both comparisons to avoid timezone issues
        const nowUTC = new Date().toISOString();
        const scheduledOnly = (data.messages || [])
          .filter((msg: any) => msg.status === 'sent' && msg.scheduled_send_time && msg.scheduled_send_time > nowUTC)
          .map((msg: any) => {
            const scheduleDate = new Date(msg.scheduled_send_time);
            const recipients = msg.recipients || [];
            const recipientCount = recipients.length;
            
            return {
              id: msg.id,
              preview: msg.message_text.substring(0, 50) + (msg.message_text.length > 50 ? "..." : ""),
              fullText: msg.message_text,
              time: scheduleDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
              date: scheduleDate.toLocaleDateString('de-DE', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'short' 
              }),
              dateISO: scheduleDate.toISOString().split('T')[0],
              recipients: recipientCount === 1 
                ? recipients[0]?.recipient_name || 'Promotor'
                : `${recipientCount} Promotoren`,
              promotors: recipients.map((r: any) => r.recipient_name).filter(Boolean),
              messageType: msg.message_type,
              sent: false
            };
          });
        setScheduledMessages(scheduledOnly);
      }
    } catch (error) {
      console.error('Error loading scheduled messages:', error);
      setScheduledMessages([]);
    } finally {
      setScheduledMessagesLoading(false);
    }
  };

  // Toggle state for scheduled messages vs history
  const [showHistory, setShowHistory] = useState(false);

  // History data for sent messages (both scheduled and instant)
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [messageHistoryLoading, setMessageHistoryLoading] = useState(false);
  
  // Load message history from database
  const loadMessageHistory = async () => {
    try {
      setMessageHistoryLoading(true);
      const response = await fetch('/api/messages');
      if (response.ok) {
        const data = await response.json();
        // Filter for sent messages (instant or scheduled messages that have passed their time)
        // Use UTC time for both comparisons to avoid timezone issues
        const nowUTC = new Date().toISOString();
        const sentMessages = (data.messages || [])
          .filter((msg: any) => 
            msg.status === 'sent' && 
            (!msg.scheduled_send_time || msg.scheduled_send_time <= nowUTC)
          )
          .map((msg: any) => {
            const sentDate = new Date(msg.sent_at || msg.created_at);
            const recipients = msg.recipients || [];
            const recipientCount = recipients.length;
            
            // Extract promotor names and who has read the message
            const promotorNames = recipients.map((r: any) => r.recipient_name).filter(Boolean);
            const readByNames = recipients
              .filter((r: any) => r.read_at)
              .map((r: any) => r.recipient_name)
              .filter(Boolean);
            
            return {
              id: msg.id,
              preview: msg.message_text.substring(0, 50) + (msg.message_text.length > 50 ? "..." : ""),
              fullText: msg.message_text,
              time: sentDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
              date: sentDate.toLocaleDateString('de-DE', { 
                day: 'numeric', 
                month: 'short', 
                year: 'numeric' 
              }),
              recipients: recipientCount === 1 
                ? promotorNames[0] || 'Promotor'
                : recipientCount === promotorNames.length
                  ? "Alle"
                  : `${recipientCount} Promotoren`,
              promotors: promotorNames,
              readBy: readByNames,
              sent: true,
              type: msg.scheduled_send_time ? "scheduled" : "instant",
              messageType: msg.message_type
            };
          });
        setMessageHistory(sentMessages);
      }
    } catch (error) {
      console.error('Error loading message history:', error);
      setMessageHistory([]);
    } finally {
      setMessageHistoryLoading(false);
    }
  };
  
  // Message detail popup states
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  const [editedMessageText, setEditedMessageText] = useState("");
  const [editedDate, setEditedDate] = useState("");
  const [editedTime, setEditedTime] = useState("");
  
  // Delete confirmation states
  const [deleteConfirmationState, setDeleteConfirmationState] = useState(false);
  const [deleteConfirmationTimer, setDeleteConfirmationTimer] = useState<NodeJS.Timeout | null>(null);

  // Function to select all filtered promotors
  const selectAllFiltered = () => {
         const filteredNames = allPromotors
       .filter(promotor => 
         (activeRegionFilter === "all" || promotor.region === activeRegionFilter) &&
         promotor.name.toLowerCase().includes(promotorSelectionSearch.toLowerCase())
       )
       .map(promotor => promotor.name);
     
     // Check if we should deselect (if all filtered items are currently selected and match last selection)
     const allFilteredSelected = filteredNames.every(name => selectedPromotors.includes(name));
     const matchesLastSelection = lastSelectedByIcon.length > 0 && 
       filteredNames.every(name => lastSelectedByIcon.includes(name)) &&
       lastSelectedByIcon.every(name => filteredNames.includes(name));
     
     if (allFilteredSelected && matchesLastSelection) {
       // Deselect the ones that were selected by this icon
       setSelectedPromotors(prev => prev.filter(name => !lastSelectedByIcon.includes(name)));
       setLastSelectedByIcon([]);
     } else {
       // Select all filtered
       setSelectedPromotors(prev => [...new Set([...prev, ...filteredNames])]);
       setLastSelectedByIcon(filteredNames);
     }
      };

  // Function to enhance message with AI
  const enhanceMessage = async () => {
    if (!messageText.trim() || isEnhancing) return;
    
    console.log('🤖 Starting AI enhancement for text:', messageText.substring(0, 100) + '...');
    setIsEnhancing(true);
    
    try {
      console.log('📤 Sending request to /api/ai/enhance-message');
      const res = await fetch('/api/ai/enhance-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: messageText })
      })
      
      console.log('📥 Response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ AI enhance error:', {
          status: res.status,
          statusText: res.statusText,
          errorBody: errorText
        });
      } else {
        const data = await res.json().catch(() => ({}));
        console.log('📝 Enhancement response:', {
          hasText: !!data?.text,
          enhancedLength: data?.text?.length || 0,
          enhancedPreview: data?.text ? data.text.substring(0, 100) + '...' : 'No text'
        });
        
        if (data?.text) {
          console.log('✅ Setting enhanced text');
          setMessageText(data.text);
        } else {
          console.warn('⚠️ No enhanced text in response');
        }
      }
    } catch (error) {
      console.error('❌ Error enhancing text:', error);
    } finally {
      console.log('🏁 AI enhancement process completed');
      setIsEnhancing(false);
    }
  };

  // Function to handle message scheduling
  const handleScheduleMessage = async () => {
    if (schedulingMessage) return;
    setSchedulingMessage(true);
    if (!messageText.trim() || !scheduleDate || !scheduleTime || selectedPromotors.length === 0) return;
    
    try {
      // Get promotor IDs from selected names
      const promotorIds = selectedPromotors.map(name => {
        const promotor = allPromotors.find(p => p.name === name);
        return promotor?.id;
      }).filter(Boolean);
      
      // Combine date and time for scheduled send
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message_text: messageText,
          message_type: enableTwoStep ? 'confirmation_required' : 'normal',
          recipient_ids: promotorIds,
          scheduled_send_time: scheduledDateTime,
          send_immediately: false
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Refresh scheduled messages from database
        await loadScheduledMessages();
    
    // Reset form
    setMessageText("");
    setScheduleDate("");
    setScheduleTime("");
        setSelectedPromotors([]);
        setEnableTwoStep(false);
    setShowScheduleModal(false);
        
        console.log('Message scheduled successfully');
      } else {
        console.error('Failed to schedule message');
      }
    } catch (error) {
      console.error('Error scheduling message:', error);
    } finally {
      setSchedulingMessage(false);
    }
  };

  // Function to handle message detail view
  const handleMessageClick = (message: any) => {
    setSelectedMessage(message);
    setEditedMessageText(message.fullText);
    setEditedDate(message.dateISO || message.date); // Use ISO date for editing
    setEditedTime(message.time);
    setIsEditingMessage(false);
    setShowMessageDetail(true);
  };

  // Function to save edited message
  const handleSaveMessage = () => {
    if (!selectedMessage || !editedMessageText.trim()) return;
    
    setScheduledMessages(prev => 
      prev.map(msg => 
        msg.id === selectedMessage.id 
          ? { 
              ...msg, 
              fullText: editedMessageText,
              preview: editedMessageText.substring(0, 50) + (editedMessageText.length > 50 ? "..." : ""),
              date: new Date(editedDate).toLocaleDateString('de-DE', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'short' 
              }),
              dateISO: editedDate,
              time: editedTime
            }
          : msg
      )
    );
    
    setIsEditingMessage(false);
  };

  // Function to delete scheduled message
  const handleDeleteScheduledMessage = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        // Refresh scheduled messages
        await loadScheduledMessages();
      } else {
        console.error('Failed to delete message');
      }
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
    }
  };

  // Function to handle delete button click in message detail popup
  const handleDeleteClick = async () => {
    if (!deleteConfirmationState) {
      // First click - vibrate and start timer
      setDeleteConfirmationState(true);
      
      // Clear any existing timer
      if (deleteConfirmationTimer) {
        clearTimeout(deleteConfirmationTimer);
      }
      
      // Set timer to reset confirmation state after 2 seconds
      const timer = setTimeout(() => {
        setDeleteConfirmationState(false);
        setDeleteConfirmationTimer(null);
      }, 2000);
      
      setDeleteConfirmationTimer(timer);
    } else {
      // Second click within 2 seconds - actually delete
      if (selectedMessage && !selectedMessage.sent) {
        await handleDeleteScheduledMessage(selectedMessage.id);
        setShowMessageDetail(false);
        setDeleteConfirmationState(false);
        if (deleteConfirmationTimer) {
          clearTimeout(deleteConfirmationTimer);
          setDeleteConfirmationTimer(null);
        }
      }
    }
  };
  
  // Region gradient helper
  const getRegionGradient = (region: string) => {
    // Pastel, clean, modern shades per cluster
    switch (region) {
      case "wien-noe-bgl":
        return "bg-[#E8F0FE]"; // pastel blue
      case "steiermark":
        return "bg-[#E7F5ED]"; // pastel green
      case "salzburg":
        return "bg-[#F0E9FF]"; // pastel indigo/lavender
      case "oberoesterreich":
        return "bg-[#FFF3E6]"; // pastel orange
      case "tirol":
        return "bg-[#FDEBF3]"; // pastel pink
      case "vorarlberg":
        return "bg-[#EAF8FF]"; // pastel cyan
      case "kaernten":
        return "bg-[#EAF6FF]"; // soft sky
      default:
        return "bg-gray-50";
    }
  };

  // Region border helper
  const getRegionBorder = (region: string) => {
    // Matching soft borders per cluster
    switch (region) {
      case "wien-noe-bgl":
        return "border-[#CBD7F5]";
      case "steiermark":
        return "border-[#CFECDD]";
      case "salzburg":
        return "border-[#DDD4FF]";
      case "oberoesterreich":
        return "border-[#FFE3C7]";
      case "tirol":
        return "border-[#F8D5E5]";
      case "vorarlberg":
        return "border-[#CFEFFF]";
      case "kaernten":
        return "border-[#D6ECFF]";
      default:
        return "border-gray-200";
    }
  };

  // Get promotor region
  const getPromotorRegion = (promotorName: string) => {
    // Use real promotors data from state
    const promotor = allPromotors.find(p => p.name === promotorName);
    return promotor?.region || "wien-noe-bgl"; // Default region
  };
  
  // This function is now replaced by the above, removing the hardcoded array
  const getPromotorRegionOld = (promotorName: string) => {
    const oldAllPromotors = [
      { name: "Sarah Schmidt", region: "wien-noe-bgl" },
      { name: "Michael Weber", region: "steiermark" },
      { name: "Jan Müller", region: "salzburg" },
      { name: "Lisa König", region: "wien-noe-bgl" },
      { name: "Anna Bauer", region: "oberoesterreich" },
      { name: "Tom Fischer", region: "tirol" },
      { name: "Maria Huber", region: "steiermark" },
      { name: "David Klein", region: "vorarlberg" },
      { name: "Emma Wagner", region: "kaernten" },
      { name: "Paul Berger", region: "wien-noe-bgl" },
      { name: "Julia Mayer", region: "salzburg" },
      { name: "Felix Gruber", region: "oberoesterreich" },
      { name: "Sophie Reiter", region: "steiermark" },
      { name: "Max Köhler", region: "tirol" },
      { name: "Lena Fuchs", region: "vorarlberg" },
      { name: "Klaus Müller", region: "wien-noe-bgl" },
      { name: "Sandra Hofer", region: "steiermark" },
      { name: "Martin Schneider", region: "salzburg" },
      { name: "Nina Weiss", region: "oberoesterreich" },
      { name: "Patrick Schwarz", region: "tirol" },
      { name: "Andrea Roth", region: "vorarlberg" },
      { name: "Florian Braun", region: "kaernten" },
      { name: "Jessica Grün", region: "wien-noe-bgl" },
      { name: "Daniel Gelb", region: "steiermark" },
      { name: "Sabrina Blau", region: "salzburg" },
      { name: "Thomas Orange", region: "oberoesterreich" },
      { name: "Melanie Violett", region: "tirol" },
      { name: "Christian Rosa", region: "vorarlberg" },
      { name: "Vanessa Grau", region: "kaernten" },
      { name: "Marco Silber", region: "wien-noe-bgl" },
      { name: "Tanja Gold", region: "steiermark" },
      { name: "Oliver Bronze", region: "salzburg" },
      { name: "Carina Kupfer", region: "oberoesterreich" },
      { name: "Lukas Platin", region: "tirol" },
      { name: "Stephanie Kristall", region: "vorarlberg" },
      { name: "Benjamin Diamant", region: "kaernten" },
      { name: "Michelle Rubin", region: "wien-noe-bgl" },
      { name: "Tobias Saphir", region: "steiermark" },
      { name: "Nadine Smaragd", region: "salzburg" },
      { name: "Kevin Topas", region: "oberoesterreich" },
      { name: "Franziska Opal", region: "tirol" },
      { name: "Dominik Achat", region: "vorarlberg" },
      { name: "Simone Jade", region: "kaernten" },
      { name: "Philip Onyx", region: "wien-noe-bgl" },
      { name: "Verena Quarz", region: "steiermark" },
      { name: "Fabian Marmor", region: "salzburg" },
      { name: "Isabella Granit", region: "oberoesterreich" },
      { name: "Maximilian Schiefer", region: "tirol" },
      { name: "Katharina Basalt", region: "vorarlberg" },
      { name: "Wolfgang Kalk", region: "kaernten" },
      { name: "Elena Ton", region: "wien-noe-bgl" },
      { name: "Robert Sand", region: "steiermark" },
      { name: "Nicole Lehm", region: "salzburg" },
      { name: "Stefan Kies", region: "oberoesterreich" },
      { name: "Petra Fels", region: "tirol" },
      { name: "Alexander Stein", region: "vorarlberg" },
      { name: "Christina Berg", region: "kaernten" },
      { name: "Manuel Tal", region: "wien-noe-bgl" },
      { name: "Andrea Bach", region: "steiermark" },
      { name: "Daniel See", region: "salzburg" },
      { name: "Sabine Meer", region: "oberoesterreich" },
      { name: "Thomas Ozean", region: "tirol" }
    ];
    
    const promotor = allPromotors.find(p => p.name === promotorName);
    return promotor?.region || "default";
  };

  // Get region pill colors - matching promotor selection popup styling
  const getRegionPillColors = (region: string) => {
    return `${getRegionGradient(region)} ${getRegionBorder(region)} text-gray-700`;
  };
  




  // Helper functions for CA KPI colors (same rules as in statistics page)
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

  const getPillColorKpi = (changePercent: string) => {
    // For CA KPIs, being above optimal is good, so positive = green, negative = red
    const isPositive = changePercent.startsWith('+');
    return isPositive 
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  };

  // Load company KPI feedback history once (same source as admin/statistiken)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setKpiHistoryLoading(true);
        const res = await fetch('/api/admin/kpi-feedback');
        if (!res.ok) throw new Error('Failed to fetch KPI feedback');
        const data = await res.json();
        const mapped = Array.isArray(data?.feedback)
          ? data.feedback.map((item: any) => ({
              mcet: Number(item.mc_et) || 0,
              tma: Number(item.tma) || 0,
              vlShare: Number(item.vl_value) || 0,
              createdAt: new Date(item.created_at)
            }))
          : [];
        if (mounted) setKpiHistory(mapped);
      } catch (e) {
        console.error('Error loading KPI history:', e);
        if (mounted) setKpiHistory([]);
      } finally {
        if (mounted) setKpiHistoryLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Helpers derived from admin/statistiken
  const getAverageColor = (metric: 'mcet' | 'tma' | 'vlShare', value: number | null) => {
    if (value == null || Number.isNaN(value)) return 'text-gray-400';
    const v = value;
    if (metric === 'mcet') {
      if (v >= 4.0) return 'text-green-600';
      if (v >= 3.5) return 'text-[#FD7E14]';
      return 'text-red-600';
    } else if (metric === 'tma') {
      if (v >= 70) return 'text-green-600';
      if (v >= 60) return 'text-[#FD7E14]';
      return 'text-red-600';
    } else {
      if (v >= 10) return 'text-green-600';
      if (v >= 5) return 'text-[#FD7E14]';
      return 'text-red-600';
    }
  };

  const averageOf = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);

  const calcAverages = (timeframe: 'alltime' | '30days' | '6months') => {
    if (!kpiHistory.length) return { mcet: null, tma: null, vlShare: null };
    const now = new Date();
    let relevant = kpiHistory;
    if (timeframe === '30days') {
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      relevant = kpiHistory.filter((e) => e.createdAt >= cutoff);
    } else if (timeframe === '6months') {
      const cutoff = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      relevant = kpiHistory.filter((e) => e.createdAt >= cutoff);
    }
    if (!relevant.length) return { mcet: null, tma: null, vlShare: null };
    return {
      mcet: averageOf(relevant.map((e) => e.mcet)),
      tma: averageOf(relevant.map((e) => e.tma)),
      vlShare: averageOf(relevant.map((e) => e.vlShare))
    };
  };

  const buildWaves = (entries: typeof kpiHistory) => {
    if (!entries.length) return [] as typeof entries[];
    const sorted = [...entries].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const waves: typeof entries[] = [];
    let current: typeof entries = [] as any;
    let lastDate: Date | null = null;
    for (const e of sorted) {
      if (!lastDate || lastDate.getTime() - e.createdAt.getTime() > 3 * 24 * 60 * 60 * 1000) {
        if (current.length) waves.push(current);
        current = [e];
        lastDate = e.createdAt;
      } else {
        current.push(e);
      }
    }
    if (current.length) waves.push(current);
    return waves;
  };

  const waveAvg = (wave: typeof kpiHistory) => ({
    mcet: averageOf(wave.map((e) => e.mcet)) || 0,
    tma: averageOf(wave.map((e) => e.tma)) || 0,
    vlShare: averageOf(wave.map((e) => e.vlShare)) || 0
  });

  const percentChange = (current: number, previous: number) => {
    if (!previous) return null;
    const ch = ((current - previous) / previous) * 100;
    return ch;
  };

  const waveChanges = () => {
    const waves = buildWaves(kpiHistory);
    if (waves.length < 2) return { mcet: null, tma: null, vlShare: null } as Record<string, number | null> as any;
    const last = waveAvg(waves[0]);
    const prev = waveAvg(waves[1]);
    return {
      mcet: percentChange(last.mcet, prev.mcet),
      tma: percentChange(last.tma, prev.tma),
      vlShare: percentChange(last.vlShare, prev.vlShare)
    };
  };

  const sixWaveChanges = () => {
    const waves = buildWaves(kpiHistory);
    if (waves.length < 7) return { mcet: null, tma: null, vlShare: null } as Record<string, number | null> as any;
    const cur = waveAvg(waves[0]);
    const sixAgo = waveAvg(waves[6]);
    return {
      mcet: percentChange(cur.mcet, sixAgo.mcet),
      tma: percentChange(cur.tma, sixAgo.tma),
      vlShare: percentChange(cur.vlShare, sixAgo.vlShare)
    };
  };

  // Build monthly chart data from real KPI history
  const buildKpiMonthlyChartData = () => {
    if (!kpiHistory.length) return [] as Array<{ month: string; mcet: number; tma: number; vl: number }>;
    // Group by month-year
    const buckets: Record<string, { mcet: number[]; tma: number[]; vl: number[]; d: Date }> = {};
    for (const e of kpiHistory) {
      const key = e.createdAt.getFullYear() + '-' + (e.createdAt.getMonth() + 1);
      if (!buckets[key]) {
        buckets[key] = { mcet: [], tma: [], vl: [], d: new Date(e.createdAt.getFullYear(), e.createdAt.getMonth(), 1) };
      }
      buckets[key].mcet.push(e.mcet);
      buckets[key].tma.push(e.tma);
      buckets[key].vl.push(e.vlShare);
    }
    const rows = Object.values(buckets)
      .map((b) => ({
        month: b.d.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
        mcet: Number((b.mcet.reduce((a, c) => a + c, 0) / b.mcet.length).toFixed(1)),
        tma: Number((b.tma.reduce((a, c) => a + c, 0) / b.tma.length).toFixed(1)),
        vl: Number((b.vl.reduce((a, c) => a + c, 0) / b.vl.length).toFixed(1)),
        sortDate: b.d.getTime()
      }))
      .sort((a, b) => a.sortDate - b.sortDate)
      .slice(-12)
      .map(({ sortDate, ...rest }) => rest);
    return rows;
  };

  const kpiChartData = useMemo(buildKpiMonthlyChartData, [kpiHistory]);

  // Real KPI stats object consumed by the popup (keeps existing render API)
  const calculateKpiStatsData = () => {
    const all = calcAverages('alltime');
    const d30 = calcAverages('30days');
    const d6m = calcAverages('6months');
    const wave = waveChanges();
    const six = sixWaveChanges();

    const sign = (n: number | null, withPercent = false) => {
      if (n == null || Number.isNaN(n)) return withPercent ? '0%' : '0';
      const val = withPercent ? `${n >= 0 ? '+' : ''}${n.toFixed(1)}%` : `${n >= 0 ? '+' : ''}${n.toFixed(1)}`;
      return val;
    };

    // Optimal targets
    const opt = { mcet: 4.5, tma: 75, vlShare: 10 };

    return {
      alltime: {
        mcet: { value: all.mcet ?? 0, changePercent: sign(all.mcet != null ? (all.mcet - opt.mcet) : 0, false) },
        tma: { value: all.tma ?? 0, changePercent: sign(all.tma != null ? (all.tma - opt.tma) : 0, false) },
        vlShare: { value: all.vlShare ?? 0, changePercent: sign(all.vlShare != null ? (all.vlShare - opt.vlShare) : 0, false) }
      },
      '30days': {
        mcet: { value: d30.mcet ?? 0, changePercent: sign(wave.mcet, true) },
        tma: { value: d30.tma ?? 0, changePercent: sign(wave.tma, true) },
        vlShare: { value: d30.vlShare ?? 0, changePercent: sign(wave.vlShare, true) }
      },
      '6months': {
        mcet: { value: d6m.mcet ?? 0, changePercent: sign(six.mcet, true) },
        tma: { value: d6m.tma ?? 0, changePercent: sign(six.tma, true) },
        vlShare: { value: d6m.vlShare ?? 0, changePercent: sign(six.vlShare, true) }
      }
    } as const;
  };

  // Mystery Shop data - use all-time average
  const mysteryShopData = {
    value: 88.7, // All-time average from mysteryShopStatsData
    change: "+3.1%" // All-time change from mysteryShopStatsData
  };

  // Helper function for Mystery Shop colors (same rules as in statistics page)
  const getMysteryShopColor = (value: number) => {
    if (value >= 95) return "custom-gold"; // 95-100%: Gold/shiny (100€ premium)
    if (value >= 90) return "text-green-600"; // 90-94%: Green (50€ premium)
    if (value >= 80) return "text-[#FD7E14]"; // 80-89%: Orange (no premium)
    return "text-red-600"; // <80%: Red (bad result)
  };

  const getMysteryShopStyle = (colorClass: string) => {
    if (colorClass === "custom-gold") {
      return {
        background: 'linear-gradient(to right, #E0AA3E, #F0D96A, #E0AA3E)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      };
    }
    return {};
  };

  const getPillColorMystery = (changePercent: string) => {
    const isPositive = changePercent.startsWith('+');
    return isPositive 
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  };

  // Generate mock history data for CA KPIs (similar to statistics page)
  const [historyData] = useState(() => {
    const data = []
    const today = new Date()
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today)
      date.setMonth(today.getMonth() - i)
      
      // Generate random values within appropriate ranges
      const mcet = (3.6 + Math.random() * 1.5).toFixed(1)
      const tma = (60 + Math.random() * 25).toFixed(0)
      const vl = (5 + Math.random() * 20).toFixed(0)
      
      data.push({
        date,
        mcet: parseFloat(mcet),
        tma: parseInt(tma),
        vl: parseInt(vl),
        month: date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
      })
    }
    
    return data.reverse() // Show oldest to newest for chart
  })

  // Calculate CA KPI statistics (similar to statistics page)
  const calculateMysteryShopStatsData = () => {
    // Mock Mystery Shop data with realistic percentages and change indicators
    const baseData = {
      "30days": { value: 91.2, changePercent: "+2.8%" },
      "6months": { value: 89.5, changePercent: "+1.2%" },
      "alltime": { value: 88.7, changePercent: "+3.1%" }
    };

    return baseData;
  };

  const mysteryShopStatsData = calculateMysteryShopStatsData();

  // CA KPI data - all-time averages with difference from optimal values (REAL)
  const companyKpis = useMemo(() => {
    const avg = calcAverages('alltime');
    const opt = { mcet: 4.5, tma: 75, vlShare: 10 };
    const fmt = (val: number | null, target: number) => {
      if (val == null || Number.isNaN(val)) return '0';
      const diff = val - target;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}`;
    };
    return {
      mcet: { value: Number(((avg.mcet ?? 0)).toFixed(1)), changePercent: fmt(avg.mcet, opt.mcet) },
      tma: { value: Math.round(avg.tma ?? 0), changePercent: fmt(avg.tma, opt.tma) },
      vlShare: { value: Math.round(avg.vlShare ?? 0), changePercent: fmt(avg.vlShare, opt.vlShare) }
    };
  }, [kpiHistory]);

  const mysteryShopHistoryData = [
    { shop: "Mysteryshop 1", percentage: 85.2 },
    { shop: "Mysteryshop 2", percentage: 88.7 },
    { shop: "Mysteryshop 3", percentage: 91.3 },
    { shop: "Mysteryshop 4", percentage: 89.8 },
    { shop: "Mysteryshop 5", percentage: 92.5 },
    { shop: "Mysteryshop 6", percentage: 90.1 },
    { shop: "Mysteryshop 7", percentage: 93.2 },
    { shop: "Mysteryshop 8", percentage: 89.6 },
    { shop: "Mysteryshop 9", percentage: 91.7 },
    { shop: "Mysteryshop 10", percentage: 94.1 },
    { shop: "Mysteryshop 11", percentage: 92.3 },
    { shop: "Mysteryshop 12", percentage: 91.2 }
  ];

  const getMysteryShopColorClass = (value: number) => {
    if (value >= 95) return "text-yellow-600"; // Gold
    if (value >= 90) return "text-green-600"; // Green
    if (value >= 80) return "text-[#FD7E14]"; // Orange - same as CA KPI
    return "text-red-600"; // Red
  };

  const getMysteryShopPillColor = (changePercent: string) => {
    if (changePercent.startsWith('+')) {
      return 'bg-green-100 text-green-800';
    } else if (changePercent.startsWith('-')) {
      return 'bg-red-100 text-red-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  // Note: calculateKpiStatsData is defined above to use real KPI history

  const kpiStatsData = calculateKpiStatsData()

  // Helper functions for KPI colors
  const getKpiColorClass = (category: "mcet" | "tma" | "vlshare", value: number) => {
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

  const getKpiPillColor = (changePercent: string) => {
    const isPositive = changePercent.startsWith('+');
    return isPositive 
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  };

  // Disable auto-toggle to keep CA KPIs visible
  useEffect(() => {
    setShowKpiView(true);
  }, []);
  
  // Load AI response for "Was gibts zu tun"
  useEffect(() => {
    const loadWhatsTodo = async () => {
      try {
        setEddieLoading(true);
        const res = await fetch('/api/admin/whats-todo', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setFullEddieText(data.response || '');
        } else {
          console.error('Failed to load whats-todo:', res.status);
          setFullEddieText('Fehler beim Laden der Aufgaben.');
        }
      } catch (e) {
        console.error('Error loading whats-todo:', e);
        setFullEddieText('Fehler beim Laden der Aufgaben.');
      } finally {
        setEddieLoading(false);
      }
    };
    
    loadWhatsTodo();
  }, []);

  // Mock data for promotions
  const todaysPromotions = [
    { id: 1, location: "Interspar Graz", promotor: "Jan Müller", time: "09:00 - 17:00", status: "aktiv", product: "Vertuo" },
    { id: 2, location: "Billa Plus Wien", promotor: "Sarah Schmidt", time: "10:00 - 18:00", status: "aktiv", product: "Original" },
    { id: 3, location: "Merkur Salzburg", promotor: "Michael Weber", time: "08:30 - 16:30", status: "pause", product: "Vertuo" },
    { id: 4, location: "Spar Innsbruck", promotor: "Lisa König", time: "11:00 - 19:00", status: "wartend", product: "Original" }
  ];

  // State for special status requests
  const [specialStatusRequests, setSpecialStatusRequests] = useState<any[]>([]);
  const [specialStatusRequestsLoading, setSpecialStatusRequestsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    loadTodaysAssignments();
    loadSpecialStatusRequests();
  }, []);

  // Use real promotor data instead of mock data
  const activePromotors = activePromotorsData;

  // Fetch outside-break timestamp when detail modal opens
  useEffect(() => {
    if (showAssignmentDetailModal && selectedAssignmentDetail?.id) {
      fetch(`/api/admin/assignments/${selectedAssignmentDetail.id}/outside-breaks`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.items) && data.items.length > 0) {
            setDetailModalOutsideBreakTimestamp(data.items[0].reported_at);
          } else {
            setDetailModalOutsideBreakTimestamp(null);
          }
        })
        .catch(() => setDetailModalOutsideBreakTimestamp(null));
    } else {
      setDetailModalOutsideBreakTimestamp(null);
    }
  }, [showAssignmentDetailModal, selectedAssignmentDetail?.id]);

  // Function to load today's assignments
  const loadTodaysAssignments = async () => {
    try {
      setTodaysEinsaetzeLoading(true);
      const response = await fetch('/api/assignments/today?include_schulung=1');
      const data = await response.json();
      
      if (response.ok && data.assignments) {
        // Fetch daily check-in status for all assignments
        const today = new Date().toISOString().split('T')[0];
        const checkinResponse = await fetch(`/api/admin/daily-checkin-status?date=${today}`);
        const checkinData = await checkinResponse.json();
        const checkinMap = new Map((checkinData.checkins || []).map((c: any) => [c.assignment_id, c]));
        
        // Fetch outside-break records for all assignments
        const assignmentIds = data.assignments.map((a: any) => a.assignment_id).filter(Boolean);
        const outsideBreakPromises = assignmentIds.map(async (id: string) => {
          try {
            const res = await fetch(`/api/admin/assignments/${id}/outside-breaks`, { cache: 'no-store' });
            const json = await res.json().catch(() => ({ items: [] }));
            return { id, hasBreak: Array.isArray(json.items) && json.items.length > 0 };
          } catch {
            return { id, hasBreak: false };
          }
        });
        const outsideBreakResults = await Promise.all(outsideBreakPromises);
        const outsideBreakMap = new Map(outsideBreakResults.map(r => [r.id, r.hasBreak]));
        
        // Transform the data to match the expected format
        const transformedData = data.assignments.map((a: any) => ({
          id: a.assignment_id,
          type: String(a.type || '').toLowerCase(),
          isSchulung: String(a.type || '').toLowerCase() === 'schulung' || String(a.title || '').trim().toLowerCase() === 'schulung',
          market: a.title || 'N/A',
          address: a.location_text || '',
          plz: a.postal_code || '',
          city: a.city || '',
          promotor: a.promotor_name || 'N/A',
          buddyName: a.buddy_name,
          participantNames: Array.isArray(a.participant_names)
            ? a.participant_names.map((name: any) => String(name || '').trim()).filter(Boolean)
            : [],
          planStart: a.planned_start ? a.planned_start.substring(11, 16) : '09:30',
          planEnd: a.planned_end ? a.planned_end.substring(11, 16) : '18:30',
          actualStart: a.actual_start_time ? a.actual_start_time.substring(11, 16) : null,
          actualEnd: a.actual_end_time ? a.actual_end_time.substring(11, 16) : null,
          status: a.display_status,
          tracking_status: a.tracking_status,
          participant_status: a.participant_status,
          user_id: a.user_id,
          tracking_id: a.tracking_id,
          notes: a.notes,
          early_start_reason: a.early_start_reason,
          minutes_early_start: a.minutes_early_start,
          early_end_reason: a.early_end_reason,
          minutes_early_end: a.minutes_early_end,
          market_latitude: a.market_latitude,
          market_longitude: a.market_longitude,
          market_geocoded_address: a.market_geocoded_address,
          market_geocoded_at: a.market_geocoded_at,
          start_latitude: a.start_latitude,
          start_longitude: a.start_longitude,
          start_accuracy_meters: a.start_accuracy_meters,
          start_location_captured_at: a.start_location_captured_at,
          start_distance_meters: a.start_distance_meters,
          start_location_status: a.start_location_status,
          end_latitude: a.end_latitude,
          end_longitude: a.end_longitude,
          end_accuracy_meters: a.end_accuracy_meters,
          end_location_captured_at: a.end_location_captured_at,
          end_distance_meters: a.end_distance_meters,
          end_location_status: a.end_location_status,
          foto_maschine_url: a.foto_maschine_url,
          foto_kapsellade_url: a.foto_kapsellade_url,
          foto_pos_gesamt_url: a.foto_pos_gesamt_url,
          hasCheckedIn: checkinMap.has(a.assignment_id),
          hasOutsideBreak: outsideBreakMap.get(a.assignment_id) || false
        }));
        setTodaysEinsaetze(transformedData);
      } else {
        console.error('Failed to load assignments:', data.error);
        setTodaysEinsaetze([]);
      }
    } catch (error) {
      console.error('Error loading today\'s assignments:', error);
      setTodaysEinsaetze([]);
    } finally {
      setTodaysEinsaetzeLoading(false);
    }
  };

  // Recent activities
  const recentActivities = [
    { id: 1, action: "Neue Promotion-Anfrage", user: "Jan Müller", time: "vor 15 Min", type: "request" },
    { id: 2, action: "Schulung abgeschlossen", user: "Sarah Schmidt", time: "vor 1 Std", type: "training" },
    { id: 3, action: "Bericht eingereicht", user: "Michael Weber", time: "vor 2 Std", type: "report" },
    { id: 4, action: "Equipment bestellt", user: "System", time: "vor 3 Std", type: "system" }
  ];

  const formatTime = (time: string | null) => {
    return time || '--:--';
  };

  const getDisplayLocationLabel = (einsatz: any) => {
    const location = [einsatz.address, einsatz.market, `${einsatz.plz || ''} ${einsatz.city || ''}`.trim()]
      .map((value) => String(value || '').trim())
      .find(Boolean);
    return location || 'Schulung';
  };

  const getNameInitials = (name: string) => {
    const parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase();
  };

  const getSchulungParticipantNames = (einsatz: any): string[] => {
    const apiNames: string[] = Array.isArray(einsatz.participantNames)
      ? einsatz.participantNames.map((value: any) => String(value || '').trim()).filter(Boolean)
      : [];
    if (apiNames.length > 0) return Array.from(new Set<string>(apiNames));

    const fallback: string[] = [einsatz.promotor, einsatz.buddyName]
      .map((value) => String(value || '').trim())
      .filter((value) => value && value !== 'N/A');
    return Array.from(new Set<string>(fallback));
  };

  const getSchulungParticipantInitials = (einsatz: any): string[] => {
    return getSchulungParticipantNames(einsatz)
      .map((name: string) => getNameInitials(name))
      .filter(Boolean);
  };

  // Format an ISO timestamp (e.g., 2025-10-28T09:30:00Z) as HH:MM without applying local timezone offset.
  // This mirrors the Einsatzplan formatting to ensure times are displayed consistently.
  const formatIsoTimeNoTZ = (iso: string | null | undefined) => {
    if (!iso) return '--:--';
    const s = String(iso);
    return s.includes('T') ? s.substring(11, 16) : s;
  };

  const getStatusColor = (einsatz: any) => {
    // Red for special statuses (krankenstand, urlaub, zeitausgleich, notfall)
    if (['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(einsatz.status)) {
      return 'red';
    }
    
    // Gold for beendet (finished)
    if (einsatz.status === 'beendet') {
      return 'gold';
    }
    
    // Green for started
    if (einsatz.status === 'gestartet' || einsatz.actualStart) {
      return 'green';
    }
    
    // Trainings should not be marked as "verspätet" in the dashboard card.
    if (einsatz.isSchulung && einsatz.status === 'verspätet') {
      return 'gray';
    }

    // Orange for verspätet
    if (einsatz.status === 'verspätet') {
        return 'orange';
    }
    
    // Default gray for pending
    return 'gray';
  };

  // Get unique location combinations for filter
  const getLocationOptions = () => {
    const unique = new Set(todaysEinsaetze.map(e => `${e.plz} ${e.city}`));
    return Array.from(unique).sort();
  };

  // Filter einsätze based on selected location
  const filteredEinsaetze = einsatzFilter === "alle" 
    ? todaysEinsaetze 
    : todaysEinsaetze.filter(e => `${e.plz} ${e.city}` === einsatzFilter);

  // Calculate completion statistics
  const getCompletionStats = () => {
    const started = filteredEinsaetze.filter(e => e.status === 'gestartet' || e.status === 'beendet' || e.actualStart).length;
    const cancelled = filteredEinsaetze.filter(e => ['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(e.status)).length;
    const notStarted = filteredEinsaetze.filter(e => e.status === 'pending' || (e.status === 'verspätet' && !e.isSchulung)).length;
    const completed = started + cancelled;
    const total = filteredEinsaetze.length;
    const completionPercentage = total > 0 ? (completed / total) * 100 : 0;
    
    return { started, cancelled, notStarted, completionPercentage };
  };

  // Get status color for a location based on einsätze in that location
  const getLocationStatusColor = (location: string) => {
    const locationEinsaetze = todaysEinsaetze.filter(e => `${e.plz} ${e.city}` === location);
    
    // Check for special statuses first (highest priority)
    if (locationEinsaetze.some(e => ['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(e.status))) return 'red';
    
    // Check for started
    if (locationEinsaetze.some(e => e.status === 'gestartet' || e.status === 'beendet' || e.actualStart)) return 'green';
    
    // Check for verspätet (excluding Schulungen)
    if (locationEinsaetze.some(e => e.status === 'verspätet' && !e.isSchulung)) return 'orange';
    
    return 'gray';
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Sending message:", messageForm);
    setShowMessageModal(false);
    setMessageForm({ recipient: "all", subject: "", message: "" });
  };

  const openInGoogleMaps = (address: string, city: string) => {
    const query = encodeURIComponent(`${address}, ${city}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // Load special status requests
  const loadSpecialStatusRequests = async () => {
    try {
      setSpecialStatusRequestsLoading(true);
      const response = await fetch('/api/special-status/requests');
      
      if (response.ok) {
        const data = await response.json();
        setSpecialStatusRequests(data.requests || []);
      } else {
        // Silently fail if the table doesn't exist yet
        console.warn('Special status requests feature not available yet');
        setSpecialStatusRequests([]);
      }
    } catch (error) {
      console.warn('Special status requests feature not available:', error);
      setSpecialStatusRequests([]);
    } finally {
      setSpecialStatusRequestsLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string, requestType?: string, userId?: string, promotorName?: string) => {
    // For Krankenstand requests, open the assignment selection modal
    if (requestType === 'krankenstand' && userId && promotorName) {
      setReleaseModalData({ requestId, userId, promotorName, requestType });
      setShowReleaseAssignmentsModal(true);
      setUpcomingAssignmentsLoading(true);
      
      try {
        const response = await fetch(`/api/promotors/${userId}/upcoming-assignments`);
        const data = await response.json();
        
        if (response.ok) {
          setUpcomingAssignments(data.assignments || []);
        } else {
          console.error('Failed to fetch upcoming assignments');
          setUpcomingAssignments([]);
        }
      } catch (error) {
        console.error('Error fetching upcoming assignments:', error);
        setUpcomingAssignments([]);
      } finally {
        setUpcomingAssignmentsLoading(false);
      }
      return;
    }
    
    // For other request types, approve directly (existing behavior)
    try {
      const response = await fetch(`/api/special-status/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' })
      });

      if (response.ok) {
        // Reload requests and assignments
        loadSpecialStatusRequests();
        loadTodaysAssignments();
      } else {
        console.error('Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const handleReleaseAssignments = async () => {
    if (!releaseModalData || selectedAssignmentIds.size === 0) return;
    
    setReleasingAssignments(true);
    
    try {
      // Calculate the end date based on the latest selected assignment
      const selectedAssignments = upcomingAssignments.filter(a => selectedAssignmentIds.has(a.id));
      const latestAssignment = selectedAssignments.reduce((latest, current) => {
        return new Date(current.start_ts) > new Date(latest.start_ts) ? current : latest;
      }, selectedAssignments[0]);
      
      // End date is the date of the latest assignment (inclusive)
      const endDate = new Date(latestAssignment.start_ts);
      endDate.setHours(23, 59, 59, 999); // End of that day
      
      // First, release the selected assignments
      const releaseResponse = await fetch('/api/assignments/release-multiple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_ids: Array.from(selectedAssignmentIds),
          user_id: releaseModalData.userId,
          reason: 'krankenstand'
        })
      });

      if (!releaseResponse.ok) {
        throw new Error('Failed to release assignments');
      }

      const releaseData = await releaseResponse.json();
      console.log('Released assignments:', releaseData);

      // Then, approve the krankenstand request with the calculated end date
      console.log('🔵 Approving krankenstand with end_date:', endDate.toISOString());
      const approveResponse = await fetch(`/api/special-status/requests/${releaseModalData.requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'approve',
          end_date: endDate.toISOString()
        })
      });

      const approveData = await approveResponse.json();
      console.log('🔵 Approve response:', approveData);

      if (!approveResponse.ok) {
        console.error('❌ Approval failed:', approveData);
        throw new Error(approveData.error || 'Failed to approve request');
      }

      // Success - close modal and refresh
      setShowReleaseAssignmentsModal(false);
      setReleaseModalData(null);
      setSelectedAssignmentIds(new Set());
      setUpcomingAssignments([]);
      loadSpecialStatusRequests();
      loadTodaysAssignments();
      
    } catch (error) {
      console.error('Error releasing assignments:', error);
      alert('Fehler beim Freigeben der Einsätze');
    } finally {
      setReleasingAssignments(false);
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/special-status/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'decline' })
      });

      if (response.ok) {
        // Reload requests
        loadSpecialStatusRequests();
      } else {
        console.error('Failed to decline request');
      }
    } catch (error) {
      console.error('Error declining request:', error);
    }
  };

  const submitDeclineReason = () => {
    console.log("Declined request:", selectedRequestId, "Reason:", declineReason);
    // Here you would typically call an API to decline the request with reason
    setShowDeclineModal(false);
    setDeclineReason('');
    setSelectedRequestId(null);
  };





  // Typing animation effect
  useEffect(() => {
    if (eddieLoading || fullEddieText.length === 0) return;
    
    let index = 0;
    const timer = setInterval(() => {
      setEddieText(fullEddieText.slice(0, index + 1));
      index++;
      
      if (index >= fullEddieText.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, 30); // Typing speed: 30ms per character
    
    return () => clearInterval(timer);
  }, [fullEddieText, eddieLoading]);

  // Auto-scroll effect during typing
  useEffect(() => {
    if (textContainerRef.current && isTyping) {
      textContainerRef.current.scrollTop = textContainerRef.current.scrollHeight;
    }
  }, [eddieText, isTyping]);



  // Cleanup delete confirmation state when modal closes
  useEffect(() => {
    if (!showMessageDetail) {
      setDeleteConfirmationState(false);
      if (deleteConfirmationTimer) {
        clearTimeout(deleteConfirmationTimer);
        setDeleteConfirmationTimer(null);
      }
    }
  }, [showMessageDetail, deleteConfirmationTimer]);

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Skeleton Animation Styles */}
      <style jsx>{`
        .animate-skeleton-fade {
          animation: skeleton-fade 0.7s ease-in-out infinite alternate;
        }
        @keyframes skeleton-fade {
          0% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
        @keyframes scanHorizontal {
          0% { left: -1px; }
          100% { left: calc(100% + 1px); }
        }
        @keyframes scanVertical {
          0% { top: -1px; }
          100% { top: calc(100% + 1px); }
        }
      `}</style>
      
      {/* Admin Navigation */}
      <AdminNavigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-14'}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Guten Tag, Admin</h1>
              <p className="text-gray-500 text-sm">Hier ist Ihr Überblick für heute</p>
            </div>

          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-8 space-y-6">
          {/* Top Row: Eddie Card & Today's Einsätze */}
          <div className="flex flex-col lg:flex-row gap-4 relative">
            {/* Eddie Assistant Card */}
            <Card 
              className="border-0 w-96 h-80 bg-gradient-to-br from-white to-blue-50/30"
              style={{
                boxShadow: '0 4px 20px -2px rgba(59, 130, 246, 0.08), 0 2px 8px -1px rgba(59, 130, 246, 0.04)'
              }}
            >
              <CardContent className="p-6 h-full flex flex-col">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <img
                    src="/icons/robot 1.svg"
                    alt="Eddie AI"
                    className="h-5 w-5"
                  />
                  <h3 className="text-lg font-semibold text-gray-900">Was gibts zu tun?</h3>
                </div>
                <div className="w-full h-px bg-gray-100 mb-4"></div>
                <div 
                  ref={textContainerRef} 
                  className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  {eddieLoading ? (
                    <div className="flex flex-col items-center justify-center h-full py-12">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-gray-200 border-t-blue-300 rounded-full animate-spin opacity-50"></div>
                        <img 
                          src="/icons/robot 1.svg" 
                          alt="Eddie AI" 
                          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 opacity-50"
                        />
                      </div>
                      <p className="mt-4 text-sm text-gray-500 text-center animate-pulse">
                        Eddie durchforstet gerade das System nach To-Dos...
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line pr-2">
                      {eddieText}
                      {isTyping && <span className="animate-pulse">|</span>}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Today's Einsätze Card */}
            <div className="flex-1 relative h-80">
              <Card 
                className={`border-0 w-full transition-all duration-300 ${isEinsaetzeExpanded ? 'absolute top-0 left-0 right-0 h-[960px] z-20' : 'relative h-full'}`}
                style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, rgba(255, 185, 151, 0.003) 50%, rgba(255, 133, 82, 0.005) 100%)',
                  boxShadow: '0 4px 20px -2px rgba(255, 133, 82, 0.06), 0 2px 8px -1px rgba(255, 185, 151, 0.04), 0 8px 32px -4px rgba(255, 133, 82, 0.03)'
                }}
              >
              <CardContent className={`p-6 h-full flex flex-col ${isEinsaetzeExpanded ? 'bg-white' : ''}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Heutige Einsätze</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setViewMode(viewMode === 'list' ? 'cards' : 'list')}
                      className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                    >
                      {viewMode === 'list' ? (
                        <LayoutGrid className="h-4 w-4 text-gray-600" />
                      ) : (
                        <LayoutList className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => setIsEinsaetzeExpanded(!isEinsaetzeExpanded)}
                      className="p-1 rounded hover:bg-gray-100 transition-colors opacity-50"
                    >
                      {isEinsaetzeExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="text-xs bg-white border border-gray-200/50 rounded px-2 py-1 text-gray-600 focus:outline-none transition-colors flex items-center justify-between min-w-20"
                      >
                        <span>{einsatzFilter}</span>
                        <svg className="ml-1 h-3 w-3" fill="none" viewBox="0 0 20 20">
                          <path stroke="#6b7280" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m6 8 4 4 4-4"/>
                        </svg>
                      </button>
                      {showDropdown && (
                        <div 
                          className="absolute top-full right-0 mt-1 border-0 rounded-xl shadow-lg z-10 w-40 bg-white max-h-60 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                          style={{
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                          }}
                        >
                          <div
                            onClick={() => {setEinsatzFilter("alle"); setShowDropdown(false);}}
                            className="px-2 py-1 text-xs text-gray-600 cursor-pointer hover:bg-gradient-to-r hover:from-white hover:to-gray-100/80 transition-all duration-200"
                          >
                            alle
                          </div>
                          {getLocationOptions().map(location => {
                            const statusColor = getLocationStatusColor(location);
                            const hoverClass = statusColor === 'green' 
                              ? 'hover:bg-gradient-to-r hover:from-white hover:to-green-100/80'
                              : statusColor === 'red'
                              ? 'hover:bg-gradient-to-r hover:from-white hover:to-red-100/80'
                              : statusColor === 'orange'
                              ? 'hover:bg-gradient-to-r hover:from-white hover:to-orange-100/80'
                              : 'hover:bg-gradient-to-r hover:from-white hover:to-gray-100/80';
                            
                            return (
                              <div
                                key={location}
                                onClick={() => {setEinsatzFilter(location); setShowDropdown(false);}}
                                className={`px-2 py-1 text-xs text-gray-600 cursor-pointer ${hoverClass} transition-all duration-200`}
                              >
                                {location}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mb-4">
                  {(() => {
                    const stats = getCompletionStats();
                    return (
                      <div className="space-y-2">
                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-1">
                          <div 
                            className={`h-1 rounded-full transition-all duration-300 ${
                              stats.completionPercentage === 100 ? 'bg-green-200' : 'bg-gradient-to-r from-gray-300 to-gray-400'
                            }`}
                            style={{ width: `${stats.completionPercentage}%` }}
                          ></div>
                        </div>
                        {/* Statistics indicators */}
                        <div className="flex items-center space-x-4 opacity-50">
                          <span className="text-xs text-green-600">{stats.started}</span>
                          <span className="text-xs text-red-600">{stats.cancelled}</span>
                          <span className="text-xs text-gray-600">{stats.notStarted}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
                <div 
                  className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  {todaysEinsaetzeLoading ? (
                    viewMode === 'list' ? (
                      // Loading Skeletons - rows matching exact assignment row structure
                      <div className="space-y-2">
                        {[...Array(8)].map((_, index) => (
                          <div 
                            key={`skeleton-row-${index}`}
                            className="p-4 rounded-lg border border-gray-100 animate-skeleton-fade"
                          >
                            <div className="flex items-center justify-between">
                              <div className="grid grid-cols-5 gap-4 flex-1 items-center">
                                <div className="min-w-0">
                                  <div className="h-4 bg-gray-200 rounded mb-1 w-32 animate-skeleton-fade"></div>
                                  <div className="h-3 bg-gray-100 rounded w-24 animate-skeleton-fade"></div>
                                </div>
                                <div className="text-center">
                                  <div className="h-3 bg-gray-200 rounded w-16 mx-auto animate-skeleton-fade"></div>
                                </div>
                                <div className="text-center">
                                  <div className="h-3 bg-gray-200 rounded w-20 mx-auto animate-skeleton-fade"></div>
                                </div>
                                <div className="text-center">
                                  <div className="h-3 bg-gray-200 rounded w-18 mx-auto animate-skeleton-fade"></div>
                                </div>
                                <div className="text-center">
                                  <div className="h-3 bg-gray-200 rounded w-12 mx-auto animate-skeleton-fade"></div>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="h-4 w-4 bg-gray-200 rounded animate-skeleton-fade"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Loading Skeletons - cards matching exact assignment card structure  
                      <div className="grid grid-cols-2 gap-4">
                        {[...Array(8)].map((_, index) => (
                          <div 
                            key={`skeleton-card-${index}`}
                            className="p-4 rounded-lg border border-gray-100 bg-white animate-skeleton-fade"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="h-3 bg-gray-200 rounded w-24 animate-skeleton-fade"></div>
                                <div className="w-2 h-2 bg-gray-200 rounded-full animate-skeleton-fade"></div>
                              </div>
                              <div className="h-3 bg-gray-100 rounded w-32 animate-skeleton-fade"></div>
                              <div className="h-3 bg-gray-100 rounded w-20 animate-skeleton-fade"></div>
                              <div className="h-3 bg-gray-100 rounded w-28 animate-skeleton-fade"></div>
                              <div className="h-3 bg-gray-100 rounded w-24 animate-skeleton-fade"></div>
                              <div className="h-3 bg-gray-100 rounded w-16 animate-skeleton-fade"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  ) : filteredEinsaetze.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Keine Einsätze für heute</p>
                      </div>
                    </div>
                  ) : viewMode === 'list' ? (
                    <div className="space-y-2">
                      {filteredEinsaetze.map((einsatz) => {
                        const statusColor = getStatusColor(einsatz);
                        const schulungLocationLabel = einsatz.isSchulung ? getDisplayLocationLabel(einsatz) : '';
                        const schulungInitials = einsatz.isSchulung ? getSchulungParticipantInitials(einsatz) : [];
                        return (
                          <div 
                            key={einsatz.id} 
                            className={`p-4 rounded-lg transition-all duration-200 hover:shadow-sm cursor-pointer ${
                              statusColor === 'gold'
                                ? 'border border-[#EFB54E]/30'
                                : statusColor === 'green' 
                                ? 'bg-gradient-to-r from-white to-green-50/35 border border-gray-100 hover:border-gray-200' 
                                : statusColor === 'orange'
                                ? 'bg-gradient-to-r from-white to-orange-50/35 border border-gray-100 hover:border-gray-200'
                                : statusColor === 'red'
                                ? 'bg-gradient-to-r from-white to-red-50/35 border border-gray-100 hover:border-gray-200'
                                : 'bg-white border border-gray-100 hover:border-gray-200'
                            }`}
                            style={statusColor === 'gold' ? {
                              background: 'linear-gradient(to right, rgba(239, 181, 78, 0.05), rgba(255, 237, 150, 0.05), rgba(252, 217, 76, 0.05), rgba(249, 247, 147, 0.05), rgba(239, 185, 77, 0.05))'
                            } : {}}
                            onClick={() => {
                              setSelectedAssignmentDetail(einsatz);
                              setShowAssignmentDetailModal(true);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="grid grid-cols-5 gap-4 flex-1 items-center">
                                <div className="min-w-0">
                                  {einsatz.isSchulung ? (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openInGoogleMaps(einsatz.address, einsatz.city);
                                        }}
                                        className="text-sm font-medium text-gray-900 text-left cursor-pointer hover:text-blue-600"
                                      >
                                        {schulungLocationLabel}
                                      </button>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {schulungInitials.length > 0 ? (
                                          schulungInitials.map((initials, index) => (
                                            <span
                                              key={`${einsatz.id}-schulung-initial-${index}`}
                                              className="inline-flex items-center justify-center rounded bg-orange-100 text-orange-700 text-[10px] font-medium px-1.5 py-0.5 min-w-[22px]"
                                            >
                                              {initials}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[10px] text-gray-400">—</span>
                                        )}
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-sm font-medium text-gray-900">
                                          {einsatz.buddyName ? `${einsatz.promotor} & ${einsatz.buddyName}` : einsatz.promotor}
                                        </h4>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openInGoogleMaps(einsatz.address, einsatz.city);
                                        }}
                                        className="text-xs text-gray-500 text-left cursor-pointer hover:text-blue-600"
                                      >
                                        {einsatz.address}
                                      </button>
                                    </>
                                  )}
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  <span>{einsatz.plz} {einsatz.city}</span>
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  <span>{einsatz.planStart} - {einsatz.planEnd}</span>
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  {einsatz.buddyName ? (
                                    <div className="space-y-1">
                                      <div>{einsatz.promotor}: {formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</div>
                                      <div>{einsatz.buddyName}: --:-- - --:--</div>
                                    </div>
                                  ) : (
                                  <span>{formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</span>
                                  )}
                                </div>
                                <div className="text-xs text-right">
                                  <div className="flex flex-col items-end space-y-1">
                                    {/* TC aligned above the status dot */}
                                    <span className={`text-[10px] font-bold ${einsatz.hasCheckedIn ? 'text-green-400/60' : 'text-gray-300/60'}`}>TC</span>
                                    
                                    {/* Status with dot */}
                                    <div className="flex items-center justify-end gap-2">
                                      {['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(einsatz.status) ? (
                                        <span className="text-red-600 font-medium">{einsatz.status}</span>
                                      ) : statusColor === 'gold' ? (
                                        <span className="font-medium bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D] bg-clip-text text-transparent">beendet</span>
                                      ) : statusColor === 'green' ? (
                                        <span className="text-green-600 font-medium">gestartet</span>
                                      ) : statusColor === 'orange' ? (
                                        <span className="text-orange-600 font-medium">verspätet</span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                      <span className={`inline-block w-2 h-2 rounded-full ${statusColor === 'gold' ? 'bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D]' : statusColor === 'green' ? 'bg-green-400' : statusColor === 'orange' ? 'bg-orange-400' : statusColor === 'red' ? 'bg-red-400' : 'bg-gray-300'}`}></span>
                                    </div>

                                    {/* Abweichende Pause aligned with the status dot */}
                                    <div className="flex items-center justify-end gap-2 text-[10px]">
                                      <span className={`${einsatz.hasOutsideBreak ? 'text-green-400/60' : 'text-gray-300/60'}`}>Abweichende&nbsp;Pause</span>
                                      <span className={`inline-block w-2 h-2 rounded-full ${einsatz.hasOutsideBreak ? 'bg-green-400/60' : 'bg-gray-300/60'}`}></span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-2 h-fit">
                      {filteredEinsaetze.map((einsatz) => {
                        const statusColor = getStatusColor(einsatz);
                        const schulungLocationLabel = einsatz.isSchulung ? getDisplayLocationLabel(einsatz) : '';
                        const schulungInitials = einsatz.isSchulung ? getSchulungParticipantInitials(einsatz) : [];
                        return (
                          <div 
                            key={einsatz.id} 
                            className={`p-3 rounded-lg border border-gray-100 transition-all duration-200 hover:border-gray-200 hover:shadow-sm cursor-pointer ${
                              statusColor === 'green' 
                                ? 'bg-gradient-to-br from-white to-green-50/35' 
                                : statusColor === 'orange'
                                ? 'bg-gradient-to-br from-white to-orange-50/35'
                                : statusColor === 'red'
                                ? 'bg-gradient-to-br from-white to-red-50/35'
                                : 'bg-white'
                            }`}
                            onClick={() => {
                              setSelectedAssignmentDetail(einsatz);
                              setShowAssignmentDetailModal(true);
                            }}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-medium text-gray-900 truncate">
                                  {einsatz.isSchulung
                                    ? schulungLocationLabel
                                    : (einsatz.buddyName ? `${einsatz.promotor} & ${einsatz.buddyName}` : einsatz.promotor)}
                                </h4>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  statusColor === 'green' ? 'bg-green-400' :
                                  statusColor === 'orange' ? 'bg-orange-400' :
                                  statusColor === 'red' ? 'bg-red-400' :
                                  'bg-gray-300'
                                }`}></div>
                              </div>
                              {einsatz.isSchulung ? (
                                <div className="flex flex-wrap gap-1">
                                  {schulungInitials.length > 0 ? (
                                    schulungInitials.map((initials, index) => (
                                      <span
                                        key={`${einsatz.id}-schulung-card-initial-${index}`}
                                        className="inline-flex items-center justify-center rounded bg-orange-100 text-orange-700 text-[10px] font-medium px-1.5 py-0.5 min-w-[22px]"
                                      >
                                        {initials}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-[10px] text-gray-400">—</span>
                                  )}
                                </div>
                              ) : (
                                <button
                                  onClick={() => openInGoogleMaps(einsatz.address, einsatz.city)}
                                  className="text-xs text-gray-500 text-left cursor-pointer hover:text-blue-600 block truncate w-full"
                                >
                                  {einsatz.address}
                                </button>
                              )}
                              <div className="text-xs text-gray-600 truncate">
                                {einsatz.plz} {einsatz.city}
                              </div>
                              <div className="text-xs text-gray-600">
                                {einsatz.planStart} - {einsatz.planEnd}
                              </div>
                              <div className="text-xs text-gray-600">
                                {einsatz.buddyName ? (
                                  <div className="space-y-1">
                                    <div className="truncate">{einsatz.promotor}: {formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</div>
                                    <div className="truncate">{einsatz.buddyName}: {einsatz.buddy_tracking?.actual_start_time ? einsatz.buddy_tracking.actual_start_time.substring(11, 16) : '--:--'} - {einsatz.buddy_tracking?.actual_end_time ? einsatz.buddy_tracking.actual_end_time.substring(11, 16) : '--:--'}</div>
                                  </div>
                                ) : (
                                  <div>{formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</div>
                                )}
                              </div>
                              <div className="text-xs">
                                {['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(einsatz.status) ? (
                                  <span className="text-red-600 font-medium text-xs">
                                    {einsatz.status}
                                  </span>
                                ) : statusColor === 'gold' ? (
                                  <span className="font-medium bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D] bg-clip-text text-transparent">beendet</span>
                                ) : statusColor === 'green' ? (
                                  <span className="text-green-600 font-medium">gestartet</span>
                                ) : statusColor === 'orange' ? (
                                  <span className="text-orange-600 font-medium">verspätet</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </CardContent>
              </Card>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card 
              className="border-0 cursor-pointer hover:scale-[1.02] transition-transform duration-200 h-20 w-full"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(34, 197, 94, 0.003) 50%, rgba(21, 128, 61, 0.005) 100%)',
                boxShadow: '0 4px 20px -2px rgba(34, 197, 94, 0.06), 0 2px 8px -1px rgba(34, 197, 94, 0.04), 0 8px 32px -4px rgba(34, 197, 94, 0.03)'
              }}
              onClick={() => setShowActivePromotionsModal(true)}
            >
              <CardContent className="p-4 h-full">
                <div className="flex items-center space-x-3 h-full">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-semibold text-gray-900">{todaysEinsaetze.filter(e => e.actualStart).length}</p>
                    <p className="text-xs text-gray-500">Aktive Promotions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 cursor-pointer hover:scale-[1.02] transition-transform duration-200 h-20 w-full"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(251, 146, 60, 0.003) 50%, rgba(234, 88, 12, 0.005) 100%)',
                boxShadow: '0 4px 20px -2px rgba(234, 88, 12, 0.06), 0 2px 8px -1px rgba(251, 146, 60, 0.04), 0 8px 32px -4px rgba(234, 88, 12, 0.03)'
              }}
              onClick={() => setShowOffeneAnfragenModal(true)}
            >
              <CardContent className="p-4 h-full">
                <div className="flex items-center space-x-3 h-full">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    {specialStatusRequestsLoading ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-skeleton-fade mb-1"></div>
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900">{specialStatusRequests.length}</p>
                    )}
                    <p className="text-xs text-gray-500">Offene Anfragen</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 cursor-pointer hover:scale-[1.02] transition-transform duration-200 h-20 w-full"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(59, 130, 246, 0.003) 50%, rgba(29, 78, 216, 0.005) 100%)',
                boxShadow: '0 4px 20px -2px rgba(29, 78, 216, 0.06), 0 2px 8px -1px rgba(59, 130, 246, 0.04), 0 8px 32px -4px rgba(29, 78, 216, 0.03)'
              }}
              onClick={() => setShowActivePromotorenModal(true)}
            >
              <CardContent className="p-4 h-full">
                <div className="flex items-center space-x-3 h-full">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    {promotorsLoading ? (
                      <div className="h-8 w-12 bg-gray-200 rounded animate-skeleton-fade mb-1"></div>
                    ) : (
                      <p className="text-2xl font-semibold text-gray-900">{activePromotors.length}</p>
                    )}
                    <p className="text-xs text-gray-500">Aktive Promotoren</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="border-0 h-20 w-full cursor-pointer hover:scale-[1.02] transition-transform duration-200"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, rgba(168, 85, 247, 0.003) 50%, rgba(126, 34, 206, 0.005) 100%)',
                boxShadow: '0 4px 20px -2px rgba(126, 34, 206, 0.06), 0 2px 8px -1px rgba(168, 85, 247, 0.04), 0 8px 32px -4px rgba(126, 34, 206, 0.03)'
              }}
              onClick={() => setShowKpiPopup(true)}
            >
              <CardContent className="p-4 h-full">
                <div className="flex items-center space-x-3 h-full">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    {showKpiView ? (
                      // CA KPIs View - Compact 3-column layout
                      <div className="w-full">
                        <div className="grid grid-cols-3 gap-2 text-center">
                          {/* MC/ET Column */}
                          <div className="flex flex-col">
                            <span className="text-[9px] font-medium text-gray-600">MC/ET</span>
                            {kpiHistoryLoading ? (
                              <div className="h-4 w-10 bg-gray-200 rounded animate-skeleton-fade mx-auto mb-1" />
                            ) : (
                            <span className={`text-sm font-semibold ${getKpiColor("mcet", companyKpis.mcet.value)}`}>
                              {companyKpis.mcet.value}
                            </span>
                            )}
                            {kpiHistoryLoading ? (
                              <div className="h-3 w-8 bg-gray-200 rounded animate-skeleton-fade mx-auto" />
                            ) : (
                            <span className={`text-[9px] px-[2px] py-0.5 rounded inline-block leading-none w-fit mx-auto ${getPillColorKpi(companyKpis.mcet.changePercent)}`}>
                              {companyKpis.mcet.changePercent}
                            </span>
                            )}
                          </div>
                          {/* TMA Column */}
                          <div className="flex flex-col">
                            <span className="text-[9px] font-medium text-gray-600">TMA</span>
                            {kpiHistoryLoading ? (
                              <div className="h-4 w-10 bg-gray-200 rounded animate-skeleton-fade mx-auto mb-1" />
                            ) : (
                            <span className={`text-sm font-semibold ${getKpiColor("tma", companyKpis.tma.value)}`}>
                              {companyKpis.tma.value}%
                            </span>
                            )}
                            {kpiHistoryLoading ? (
                              <div className="h-3 w-10 bg-gray-200 rounded animate-skeleton-fade mx-auto" />
                            ) : (
                            <span className={`text-[9px] px-[2px] py-0.5 rounded inline-block leading-none w-fit mx-auto ${getPillColorKpi(companyKpis.tma.changePercent)}`}>
                              {companyKpis.tma.changePercent}
                            </span>
                            )}
                          </div>
                          {/* VL Share Column */}
                          <div className="flex flex-col">
                            <span className="text-[9px] font-medium text-gray-600">VL Share</span>
                            {kpiHistoryLoading ? (
                              <div className="h-4 w-8 bg-gray-200 rounded animate-skeleton-fade mx-auto mb-1" />
                            ) : (
                            <span className={`text-sm font-semibold ${getKpiColor("vlshare", companyKpis.vlShare.value)}`}>
                              {companyKpis.vlShare.value}%
                            </span>
                            )}
                            {kpiHistoryLoading ? (
                              <div className="h-3 w-8 bg-gray-200 rounded animate-skeleton-fade mx-auto" />
                            ) : (
                            <span className={`text-[9px] px-[2px] py-0.5 rounded inline-block leading-none w-fit mx-auto ${getPillColorKpi(companyKpis.vlShare.changePercent)}`}>
                              {companyKpis.vlShare.changePercent}
                            </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // Mystery Shop View
                      <div className="flex flex-col items-start space-y-1">
                        <div>
                          <span 
                            className={`text-2xl font-semibold ${
                              getMysteryShopColor(mysteryShopData.value) !== "custom-gold" && 
                              getMysteryShopColor(mysteryShopData.value) !== "text-[#FD7E14]" 
                                ? getMysteryShopColor(mysteryShopData.value) 
                                : ""
                            }`}
                            style={{
                              ...getMysteryShopStyle(getMysteryShopColor(mysteryShopData.value)),
                              ...(getMysteryShopColor(mysteryShopData.value) === "text-[#FD7E14]" ? { color: "#FD7E14" } : {})
                            }}
                          >
                            {mysteryShopData.value}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Mystery Shop Ø</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Today's Promotions & Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Challenge Leaderboard */}
            <Card 
              className="border-0 bg-white relative overflow-hidden"
              style={{
                boxShadow: '0 4px 20px -2px rgba(126, 34, 206, 0.06), 0 2px 8px -1px rgba(168, 85, 247, 0.04), 0 8px 32px -4px rgba(126, 34, 206, 0.03)'
              }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5 text-gray-900" />
                    <CardTitle className="text-lg font-semibold text-gray-900">Sales Challenge Leaderboard</CardTitle>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-600 opacity-50">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">2T 14h 23m</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 py-0 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="space-y-1">
                  {[
                    { rank: 1, name: "Sarah Schmidt", sales: 45, reward: "150€" },
                    { rank: 2, name: "Michael Weber", sales: 42, reward: "100€" },
                    { rank: 3, name: "Jan Müller", sales: 38, reward: "50€" },
                    { rank: 4, name: "Lisa König", sales: 35, reward: "20€" },
                    { rank: 5, name: "Anna Bauer", sales: 32, reward: "20€" },
                    { rank: 6, name: "Tom Fischer", sales: 28, reward: "20€" },
                    { rank: 7, name: "Maria Huber", sales: 25, reward: "20€" },
                    { rank: 8, name: "David Klein", sales: 22, reward: "20€" }
                  ].map((entry) => (
                    <div key={entry.rank} className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                      entry.rank === 1 
                        ? 'border-yellow-200/50 bg-gradient-to-r from-yellow-50/20 to-amber-50/20 hover:from-yellow-50/40 hover:to-amber-50/40'
                        : entry.rank === 2
                        ? 'border-gray-200/50 bg-gradient-to-r from-gray-50/20 to-slate-50/20 hover:from-gray-50/40 hover:to-slate-50/40'
                        : entry.rank === 3
                        ? 'border-amber-200/50 bg-gradient-to-r from-amber-50/20 to-orange-50/20 hover:from-amber-50/40 hover:to-orange-50/40'
                        : 'border-blue-200/50 bg-gradient-to-r from-blue-50/20 to-indigo-50/20 hover:from-blue-50/40 hover:to-indigo-50/40'
                    }`}>
                      <div className="flex items-center space-x-3">
                        {/* Placement Icon */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          entry.rank === 1 
                            ? '' 
                            : entry.rank === 2
                            ? ''
                            : entry.rank === 3
                            ? ''
                            : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                        }`}
                        style={
                          entry.rank === 1 
                            ? { background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)' }
                            : entry.rank === 2
                            ? { background: 'linear-gradient(135deg, #DEDFE1 0%, #BCBDC1 25%, #ECEEED 75%, #B6BCBC 100%)' }
                            : entry.rank === 3
                            ? { background: 'linear-gradient(135deg, #BD965D 0%, #99774A 25%, #DEBF93 75%, #AC9071 100%)' }
                            : {}
                        }>
                          <span className="text-white font-bold text-sm">{entry.rank}</span>
                        </div>
                        
                        {/* Promotor Info */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{entry.name}</h4>
                          <p className="text-xs text-gray-500">{entry.sales} VL Verkäufe</p>
                        </div>
                      </div>
                      
                      {/* Reward */}
                      <div className="text-right">
                        <div className={`text-sm font-bold ${
                          entry.rank === 1 
                            ? 'bg-gradient-to-r from-[#E0AA3E] via-[#F0D96A] to-[#E0AA3E] bg-clip-text text-transparent'
                            : entry.rank === 2
                            ? 'text-[#BCBDC1]'
                            : entry.rank === 3
                            ? 'text-[#BD965D]'
                            : 'text-blue-600'
                        }`}>
                          {entry.reward}
                        </div>
                        <p className="text-xs text-gray-400">Belohnung</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              {/* Coming soon overlay (green gradient badge) */}
              <div className="absolute inset-0 bg-gradient-to-br from-black/30 via-gray-900/40 to-black/30 rounded-lg flex items-center justify-center pointer-events-none z-10 backdrop-blur-[2px]">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/30 to-emerald-500/30 blur-xl rounded-lg scale-110"></div>
                  <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-2.5 rounded-lg shadow-2xl">
                    <span className="text-white text-sm font-semibold tracking-wide">kommt bald!</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Message Terminal */}
            <Card className="border-0 flex flex-col h-full bg-gradient-to-br from-white to-blue-50/40" style={{ boxShadow: '0 1px 3px 0 rgba(59, 130, 246, 0.15), 0 1px 2px 0 rgba(96, 165, 250, 0.1)' }}>
              <CardHeader className="pb-0">
                <div className="relative flex items-center">
                  <div className="flex items-center space-x-2">
                    <MessageCircle className="h-5 w-5 text-gray-900" />
                    <CardTitle className="text-lg font-semibold text-gray-900">Nachrichten Terminal</CardTitle>
                  </div>
                  {/* Absolute positioned toggle whose right edge aligns with the left column's right edge */}
                  <button
                    onClick={() => setEnableTwoStep(prev => !prev)}
                    className={`absolute left-[calc(50%-0.5rem)] top-1/2 -translate-y-1/2 -translate-x-full h-6 px-2 rounded-md text-xs font-medium border transition-colors leading-none ${enableTwoStep ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                    title="Zweistufig: Anhänge (Foto/PDF) beim Empfänger aktivieren"
                  >
                    2‑Step
                  </button>
                  {/* Help tooltip in top-right, same style as Perfect Match */}
                  <div className="ml-auto group inline-block relative">
                    <button className="text-gray-900 opacity-20 hover:opacity-50" aria-label="Hilfe">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a3.375 3.375 0 1 1 6.75 0c0 1.257-.665 2.174-1.879 2.864-.686.395-1.121 1.11-1.121 1.886v.375"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 17.25h.008v.008H12z"/>
                      </svg>
                    </button>
                    <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-20 pointer-events-none group-hover:pointer-events-auto">
                      <div className="w-80 rounded-xl border border-gray-100 bg-white shadow-xl p-3 text-xs leading-relaxed text-gray-700">
                        <p className="font-semibold text-gray-900 mb-2">Wie funktioniert das Nachrichten Terminal?</p>
                        <p className="mb-2">1. Text eingeben und <span className="font-medium text-blue-600">Promotoren</span> auswählen.</p>
                        <p className="mb-2">2. Mit <span className="font-medium text-blue-600">Sofort senden</span> sofort versenden oder über <span className="font-medium text-blue-600">Planen</span> terminieren.</p>
                        <p className="mb-2">3. Optional: <span className="font-medium text-blue-600">2‑Step</span> aktivieren, damit Empfänger Uploads (Foto/PDF) bestätigen.</p>
                        <p className="mb-0">4. Mit dem <span className="font-medium text-blue-600">Zauberstab</span> Rechtschreibung/Formatierung verbessern lassen.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </CardHeader>
              <CardContent className="p-4 pt-2 flex-1 flex flex-col">
                <div className="flex space-x-4 flex-1">
                  {/* Message Input - Left Side */}
                  <div className="flex-1 flex flex-col space-y-3">
                    <div className="flex-1 relative border border-gray-200 rounded-lg overflow-hidden" style={{
                      background: isEnhancing ? 'linear-gradient(135deg, #9FC6FF 0%, #5D97FF 25%, #4663ED 75%, #4F48E6 100%)' : 'transparent'
                    }}>
                      <div className="absolute inset-0 pb-8">
                        <textarea
                          placeholder="Nachricht eingeben..."
                          value={messageText}
                          onChange={(e) => setMessageText(e.target.value)}
                          className={`w-full h-full p-3 border-0 rounded-lg resize-none focus:outline-none focus:ring-0 text-sm [&::-webkit-scrollbar]:hidden ${
                            isEnhancing ? '' : 'transition-all duration-1000'
                          }`}
                          style={{ 
                            scrollbarWidth: 'none', 
                            msOverflowStyle: 'none',
                            background: 'transparent',
                            color: isEnhancing ? 'transparent' : '#111827',
                            transition: isEnhancing ? 'none' : 'color 1000ms',
                            borderRadius: '8px',
                            borderBottom: 'none !important'
                          }}
                        />
                      </div>
                      
                      {/* Add Promotors Icon - Left side */}
                      <div className="absolute bottom-3 left-3 z-10">
                        {selectedPromotors.length > 0 ? (
                          <div 
                            onClick={() => setShowPromotorSelection(true)}
                            className="flex items-center space-x-1 cursor-pointer hover:opacity-75 transition-opacity"
                          >
                            <Check className="h-4 w-4 text-green-600 opacity-50" />
                            <span className="text-xs text-black opacity-30">
                              {(() => {
                                // Determine if all selected promotors are from same region
                                const selectedRegions = selectedPromotors.map(name => {
                                  const promotor = allPromotors.find(p => p.name === name);
                                  return promotor?.region;
                                }).filter(Boolean);
                                
                                const uniqueRegions = [...new Set(selectedRegions)];
                                
                                if (uniqueRegions.length === 1 && uniqueRegions[0]) {
                                  const regionNames: Record<string, string> = {
                                    "wien-noe-bgl": "W/NÖ/BGL",
                                    "steiermark": "Steiermark",
                                    "salzburg": "Salzburg", 
                                    "oberoesterreich": "Oberösterreich",
                                    "tirol": "Tirol",
                                    "vorarlberg": "Vorarlberg",
                                    "kaernten": "Kärnten"
                                  };
                                  return `${regionNames[uniqueRegions[0]]} Cluster ausgewählt`;
                                } else {
                                  return `${selectedPromotors.length} Promotoren ausgewählt`;
                                }
                              })()}
                            </span>
                          </div>
                        ) : (
                          <UserPlus 
                            onClick={() => setShowPromotorSelection(true)}
                            className="h-4 w-4 text-black opacity-50 cursor-pointer hover:opacity-75 transition-opacity"
                          />
                        )}
                      </div>

                      {/* Magic Wand Icon - Right side */}
                      <div className="absolute bottom-3 right-3 z-10">
                        <Wand2 
                          onClick={enhanceMessage}
                          className={`h-4 w-4 cursor-pointer transition-all duration-300 ${
                            !messageText.trim() || isEnhancing 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-blue-600 hover:text-blue-700'
                          } ${isEnhancing ? 'animate-pulse' : ''}`}
                        />
                      </div>
                      
                      {/* Scanning Line Animation - Moving scan lines */}
                      {isEnhancing && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 rounded-lg">
                          {/* Vertical scanning line */}
                          <div 
                            className="absolute h-full w-1 bg-gradient-to-b from-transparent via-white to-transparent opacity-90 shadow-lg"
                            style={{
                              left: '0%',
                              filter: 'blur(1px)',
                              animation: 'scanHorizontal 2s linear infinite'
                            }}
                          />
                          {/* Horizontal scanning line */}
                          <div 
                            className="absolute w-full h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-90 shadow-lg"
                            style={{
                              top: '0%',
                              filter: 'blur(1px)',
                              animation: 'scanVertical 2s linear infinite'
                            }}
                          />
                        </div>
                      )}

                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={async () => {
                          if (sendingMessage) return;
                          if (!messageText.trim() || selectedPromotors.length === 0) return;
                          setSendingMessage(true);
                          
                          try {
                            // Get promotor IDs from selected names
                            const promotorIds = selectedPromotors.map(name => {
                              const promotor = allPromotors.find(p => p.name === name);
                              return promotor?.id;
                            }).filter(Boolean);
                            
                            console.log('📤 Sending message with data:', {
                              message_text: messageText,
                              message_type: enableTwoStep ? 'confirmation_required' : 'normal',
                              recipient_ids: promotorIds,
                              send_immediately: true
                            });
                            
                            const response = await fetch('/api/messages', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                message_text: messageText,
                                message_type: enableTwoStep ? 'confirmation_required' : 'normal',
                                recipient_ids: promotorIds,
                                send_immediately: true
                              })
                            });
                            
                            if (response.ok) {
                              // Reset form
                              setMessageText("");
                              setSelectedPromotors([]);
                              setEnableTwoStep(false);
                              // Refresh message history since a new message was sent
                              await loadMessageHistory();
                              console.log('Message sent successfully');
                            } else {
                              console.error('Failed to send message');
                            }
                          } catch (error) {
                            console.error('Error sending message:', error);
                          } finally {
                            setSendingMessage(false);
                          }
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-70"
                        disabled={sendingMessage}
                      >
                        {sendingMessage ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            wird gesendet
                          </span>
                        ) : (
                          'Sofort senden'
                        )}
                      </button>
                      <button 
                        onClick={() => setShowScheduleModal(true)}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                      >
                        Planen
                      </button>
                    </div>
                  </div>
                  
                  {/* Scheduled Messages - Right Side */}
                  <div className="flex-1 flex flex-col">
                    <div className="bg-white rounded-lg shadow-sm pt-2 px-2 pb-2 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h4 
                          className="text-sm font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                          onClick={() => setShowHistory(!showHistory)}
                        >
                          {showHistory ? "Verlauf" : "Geplante Nachrichten"}
                        </h4>
                        <span className="text-xs text-gray-500">
                          {showHistory ? `${messageHistory.length} gesendet` : `${scheduledMessages.length} geplant`}
                        </span>
                      </div>
                                              <div className="space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', maxHeight: '215px' }}>
                          {showHistory ? (
                            // Show message history
                            messageHistoryLoading ? (
                              <div className="flex items-center justify-center h-16">
                                <div className="text-xs text-gray-500">Lade Nachrichtenverlauf...</div>
                              </div>
                            ) : messageHistory.length === 0 ? (
                              <div className="flex items-center justify-center h-16">
                                <div className="text-xs text-gray-500">Kein Nachrichtenverlauf</div>
                              </div>
                            ) : (
                            messageHistory
                              .sort((a, b) => {
                                // Sort by date descending (newest first)
                                const dateA = new Date(a.date);
                                const dateB = new Date(b.date);
                                return dateB.getTime() - dateA.getTime();
                              })
                              .map((message) => (
                              <div 
                                key={message.id} 
                                onClick={() => handleMessageClick(message)}
                                className="p-3 border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50/30 to-indigo-50/30 hover:bg-gray-50/50 transition-colors cursor-pointer"
                              >
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-900 line-clamp-2 leading-relaxed overflow-hidden" style={{ wordBreak: 'break-all' }}>{message.preview.length > 25 ? message.preview.substring(0, 25) + '...' : message.preview}</p>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{message.date} {message.time}</span>
                                    <span>{message.recipients}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                            )
                          ) : (
                            // Show scheduled messages
                            scheduledMessagesLoading ? (
                              <div className="flex items-center justify-center h-16">
                                <div className="text-xs text-gray-500">Lade geplante Nachrichten...</div>
                              </div>
                            ) : scheduledMessages.length === 0 ? (
                              <div className="flex items-center justify-center h-16">
                                <div className="text-xs text-gray-500">Keine geplanten Nachrichten</div>
                              </div>
                            ) : (
                            scheduledMessages
                              .sort((a, b) => {
                                // Properly combine ISO date and time for sorting
                                const dateA = new Date(`${a.dateISO || a.date}T${a.time}`);
                                const dateB = new Date(`${b.dateISO || b.date}T${b.time}`);
                                return dateA.getTime() - dateB.getTime(); // Earliest first
                              })
                              .map((message) => (
                              <div 
                                key={message.id} 
                                onClick={() => handleMessageClick(message)}
                                className="p-3 border border-gray-200 rounded-lg bg-gradient-to-r from-blue-50/30 to-indigo-50/30 hover:bg-gray-50/50 transition-colors cursor-pointer"
                              >
                                <div className="space-y-1">
                                  <p className="text-xs text-gray-900 line-clamp-2 leading-relaxed overflow-hidden" style={{ wordBreak: 'break-all' }}>{message.preview.length > 25 ? message.preview.substring(0, 25) + '...' : message.preview}</p>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>{message.date} {message.time}</span>
                                    <span>{message.recipients}</span>
                                  </div>
                                </div>
                              </div>
                            ))
                            )
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm bg-white">
          </Card>
        </main>
      </div>

      {/* Active Promotions Modal */}
      {showActivePromotionsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-6xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white"
          >
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Aktive Promotions</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {(() => {
                        const activePromotions = todaysEinsaetze.filter(e => e.actualStart);
                        return `${activePromotions.length} gestartete Einsätze`;
                      })()}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Promotor suchen..."
                    value={activePromotionsSearch}
                    onChange={(e) => setActivePromotionsSearch(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 bg-white rounded-lg focus:outline-none focus:ring-0 placeholder-gray-400"
                  />
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActivePromotionsViewMode(activePromotionsViewMode === 'list' ? 'cards' : 'list')}
                      className="h-8 w-8 text-gray-900 hover:text-gray-700"
                    >
                      {activePromotionsViewMode === 'list' ? (
                        <LayoutGrid className="h-4 w-4" />
                      ) : (
                        <LayoutList className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowActivePromotionsModal(false)}
                      className="h-8 w-8 text-gray-900 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent 
              className="p-6 overflow-auto max-h-[70vh] [&::-webkit-scrollbar]:hidden" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {(() => {
                const activePromotions = todaysEinsaetze
                  .filter(e => e.actualStart)
                  .filter(e => e.promotor.toLowerCase().includes(activePromotionsSearch.toLowerCase()));
                
                if (activePromotions.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>Keine aktiven Promotions</p>
                    </div>
                  );
                }

                if (activePromotionsViewMode === 'list') {
                  return (
                    <div className="space-y-2">
                      {activePromotions.map((einsatz) => {
                        const statusColor = getStatusColor(einsatz);
                        return (
                          <div 
                            key={einsatz.id} 
                            className={`p-4 rounded-lg transition-all duration-200 hover:shadow-sm ${
                              statusColor === 'gold'
                                ? 'border border-[#EFB54E]/30'
                                : statusColor === 'green' 
                                ? 'bg-gradient-to-r from-white to-green-50/35 border border-gray-200' 
                                : statusColor === 'orange'
                                ? 'bg-orange-50 border border-gray-200'
                                : statusColor === 'red'
                                ? 'bg-red-50 border border-gray-200'
                                : 'bg-white border border-gray-200'
                            }`}
                            style={statusColor === 'gold' ? {
                              background: 'linear-gradient(to right, rgba(239, 181, 78, 0.05), rgba(255, 237, 150, 0.05), rgba(252, 217, 76, 0.05), rgba(249, 247, 147, 0.05), rgba(239, 185, 77, 0.05))'
                            } : {}}
                          >
                            <div className="flex items-center justify-between">
                              <div className="grid grid-cols-5 gap-4 flex-1 items-center">
                                <div className="min-w-0">
                                  <h4 className="text-sm font-medium text-gray-900">
                                    {einsatz.buddyName ? `${einsatz.promotor} & ${einsatz.buddyName}` : einsatz.promotor}
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openInGoogleMaps(einsatz.address, einsatz.city);
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
                                  <span>{einsatz.planStart} - {einsatz.planEnd}</span>
                                </div>
                                <div className="text-xs text-gray-600 text-center">
                                  {einsatz.buddyName ? (
                                    <div className="space-y-1">
                                      <div>{einsatz.promotor}: {formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</div>
                                      <div>{einsatz.buddyName}: --:-- - --:--</div>
                                    </div>
                                  ) : (
                                  <span>{formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</span>
                                  )}
                                </div>
                                <div className="text-xs text-center flex items-center justify-end space-x-2">
                                  {['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(einsatz.status) ? (
                                    <span className="text-red-600 font-medium text-xs">
                                      {einsatz.status}
                                    </span>
                                  ) : statusColor === 'gold' ? (
                                    <span className="font-medium bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D] bg-clip-text text-transparent">beendet</span>
                                  ) : statusColor === 'green' ? (
                                    <span className="text-green-600 font-medium">gestartet</span>
                                  ) : statusColor === 'orange' ? (
                                    <span className="text-orange-600 font-medium">verspätet</span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                    statusColor === 'gold' ? 'bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D]' :
                                    statusColor === 'green' ? 'bg-green-400' :
                                    statusColor === 'orange' ? 'bg-orange-400' :
                                    statusColor === 'red' ? 'bg-red-400' :
                                    'bg-gray-300'
                                  }`}></div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                } else {
                  return (
                    <div className="grid grid-cols-4 gap-2 h-fit">
                      {activePromotions.map((einsatz) => {
                        const statusColor = getStatusColor(einsatz);
                        return (
                          <div 
                            key={einsatz.id} 
                            className={`p-3 rounded-lg transition-all duration-200 hover:border-gray-300 hover:shadow-sm ${
                              statusColor === 'gold'
                                ? 'border border-[#EFB54E]/30'
                                : statusColor === 'green' 
                                ? 'bg-gradient-to-br from-white to-green-50/35 border border-gray-200' 
                                : statusColor === 'orange'
                                ? 'bg-orange-50 border border-gray-200'
                                : statusColor === 'red'
                                ? 'bg-red-50 border border-gray-200'
                                : 'bg-white border border-gray-200'
                            }`}
                            style={statusColor === 'gold' ? {
                              background: 'linear-gradient(to right, rgba(239, 181, 78, 0.05), rgba(255, 237, 150, 0.05), rgba(252, 217, 76, 0.05), rgba(249, 247, 147, 0.05), rgba(239, 185, 77, 0.05))'
                            } : {}}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-medium text-gray-900 truncate">
                                  {einsatz.buddyName ? `${einsatz.promotor} & ${einsatz.buddyName}` : einsatz.promotor}
                                </h4>
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  statusColor === 'gold' ? 'bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D]' :
                                  statusColor === 'green' ? 'bg-green-400' :
                                  statusColor === 'orange' ? 'bg-orange-400' :
                                  statusColor === 'red' ? 'bg-red-400' :
                                  'bg-gray-300'
                                }`}></div>
                              </div>
                              <button
                                onClick={() => openInGoogleMaps(einsatz.address, einsatz.city)}
                                className="text-xs text-gray-500 text-left cursor-pointer hover:text-blue-600 block truncate w-full"
                              >
                                {einsatz.address}
                              </button>
                              <div className="text-xs text-gray-600 truncate">
                                {einsatz.plz} {einsatz.city}
                              </div>
                              <div className="text-xs text-gray-600">
                                {einsatz.planStart} - {einsatz.planEnd}
                              </div>
                              <div className="text-xs text-gray-600">
                                {einsatz.buddyName ? (
                                  <div className="space-y-1">
                                    <div className="truncate">{einsatz.promotor}: {formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</div>
                                    <div className="truncate">{einsatz.buddyName}: {einsatz.buddy_tracking?.actual_start_time ? einsatz.buddy_tracking.actual_start_time.substring(11, 16) : '--:--'} - {einsatz.buddy_tracking?.actual_end_time ? einsatz.buddy_tracking.actual_end_time.substring(11, 16) : '--:--'}</div>
                                  </div>
                                ) : (
                                  <div>{formatTime(einsatz.actualStart)} - {formatTime(einsatz.actualEnd)}</div>
                                )}
                              </div>
                              <div className="text-xs">
                                {['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(einsatz.status) ? (
                                  <span className="text-red-600 font-medium text-xs">
                                    {einsatz.status}
                                  </span>
                                ) : statusColor === 'gold' ? (
                                  <span className="font-medium bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D] bg-clip-text text-transparent">beendet</span>
                                ) : statusColor === 'green' ? (
                                  <span className="text-green-600 font-medium">gestartet</span>
                                ) : statusColor === 'orange' ? (
                                  <span className="text-orange-600 font-medium">verspätet</span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              })()}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Offene Anfragen Modal */}
      {showOffeneAnfragenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-6xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white"
          >
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Offene Anfragen</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {specialStatusRequests.length} wartende Anfragen
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowOffeneAnfragenModal(false)}
                    className="h-8 w-8 text-gray-900 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent 
              className="p-6 overflow-auto max-h-[70vh] [&::-webkit-scrollbar]:hidden" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {specialStatusRequestsLoading ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="mt-2">Lade Anfragen...</p>
                </div>
              ) : specialStatusRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>Keine offenen Anfragen</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {specialStatusRequests.map((request) => (
                    <div 
                      key={request.id} 
                      className={`p-4 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                        request.request_type === 'krankenstand' 
                          ? 'border-red-200 bg-gradient-to-r from-white to-red-50'
                          : 'border-orange-200 bg-gradient-to-r from-white to-orange-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            request.request_type === 'krankenstand' 
                              ? 'bg-red-100' 
                              : 'bg-orange-100'
                          }`}>
                            {request.request_type === 'krankenstand' ? (
                              <Thermometer className="h-5 w-5 text-red-600" />
                            ) : (
                              <AlertTriangle className="h-5 w-5 text-orange-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {request.user_profiles?.display_name || 'Unknown User'}
                              </h4>
                              <Badge 
                                variant={request.request_type === 'krankenstand' ? 'destructive' : 'default'}
                                className={`text-xs ${
                                  request.request_type === 'krankenstand' 
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-orange-100 text-orange-700'
                                }`}
                              >
                                {request.request_type === 'krankenstand' ? 'Krankenstand' : 'Sonderfall'}
                              </Badge>
                          </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Angefragt am {new Date(request.requested_at).toLocaleDateString('de-DE', { 
                                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                              })}
                            </p>
                            {request.reason && (
                              <p className="text-xs text-gray-600 mt-1">
                                <span className="font-medium">Grund:</span> {request.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          <button
                            onClick={() => handleApproveRequest(request.id, request.request_type, request.user_id, request.user_profiles?.display_name)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-green-50 rounded transition-colors"
                            title="Genehmigen"
                          >
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeclineRequest(request.id)}
                            className="w-8 h-8 flex items-center justify-center hover:bg-red-50 rounded transition-colors"
                            title="Ablehnen"
                          >
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignment Release Modal (for Krankenstand approval) */}
      {showReleaseAssignmentsModal && releaseModalData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white">
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <CalendarX className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                      Einsätze freigeben - {releaseModalData.promotorName}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Wähle welche Einsätze freigegeben werden sollen
                    </CardDescription>
                  </div>
                  <Badge className="bg-red-100 text-red-700 border-0">
                    Krankenstand
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowReleaseAssignmentsModal(false);
                    setReleaseModalData(null);
                    setSelectedAssignmentIds(new Set());
                    setUpcomingAssignments([]);
                  }}
                  className="h-8 w-8 text-gray-900 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6 overflow-auto max-h-[65vh]">
              {upcomingAssignmentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 rounded-lg border border-gray-200 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : upcomingAssignments.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarX className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine zukünftigen Einsätze
                  </h3>
                  <p className="text-sm text-gray-500 mb-6">
                    {releaseModalData.promotorName} hat keine geplanten Einsätze in den nächsten 7 Tagen.
                  </p>
                  <Button
                    onClick={async () => {
                      // Approve directly without releasing assignments
                      try {
                        const response = await fetch(`/api/special-status/requests/${releaseModalData.requestId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ action: 'approve' })
                        });
                        
                        if (response.ok) {
                          setShowReleaseAssignmentsModal(false);
                          setReleaseModalData(null);
                          loadSpecialStatusRequests();
                          loadTodaysAssignments();
                        }
                      } catch (error) {
                        console.error('Error approving:', error);
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Krankenstand genehmigen
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {upcomingAssignments.map((assignment) => {
                      const isSelected = selectedAssignmentIds.has(assignment.id);
                      const assignmentDate = new Date(assignment.start_ts);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      
                      let dateBadgeColor = 'bg-gray-100 text-gray-600';
                      let dateBadgeLabel = assignmentDate.toLocaleDateString('de-DE', { 
                        weekday: 'short', day: '2-digit', month: '2-digit' 
                      });
                      
                      if (assignmentDate.toDateString() === today.toDateString()) {
                        dateBadgeColor = 'bg-orange-100 text-orange-700';
                        dateBadgeLabel = 'Heute';
                      } else if (assignmentDate.toDateString() === tomorrow.toDateString()) {
                        dateBadgeColor = 'bg-yellow-100 text-yellow-700';
                        dateBadgeLabel = 'Morgen';
                      }

                      return (
                        <div
                          key={assignment.id}
                          onClick={() => {
                            const newSelected = new Set(selectedAssignmentIds);
                            if (isSelected) {
                              newSelected.delete(assignment.id);
                            } else {
                              newSelected.add(assignment.id);
                            }
                            setSelectedAssignmentIds(newSelected);
                          }}
                          className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50/30'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className={`text-xs ${dateBadgeColor} border-0`}>
                                  {dateBadgeLabel}
                                </Badge>
                                <Badge className={`text-xs border-0 ${
                                  assignment.user_role === 'lead' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                  {assignment.user_role === 'lead' ? 'Lead' : 'Buddy'}
                                </Badge>
                              </div>
                              <h4 className="text-sm font-medium text-gray-900 mb-1">
                                {assignment.title || 'Promotion'}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {formatIsoTimeNoTZ(assignment.start_ts)} - {formatIsoTimeNoTZ(assignment.end_ts)}
                              </p>
                            </div>
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              isSelected
                                ? 'bg-blue-500 border-blue-500'
                                : 'border-gray-300 bg-white'
                            }`}>
                              {isSelected && (
                                <Check className="h-3 w-3 text-white" strokeWidth={3} />
                              )}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-gray-600 pt-2 border-t border-gray-100">
                            <div className="truncate">{assignment.location_text}</div>
                            <div>{assignment.postal_code} {assignment.city}</div>
                            
                            {assignment.user_role === 'buddy' && assignment.promotor && (
                              <div className="text-gray-500 pt-1">Lead: {assignment.promotor}</div>
                            )}
                            
                            {assignment.user_role === 'lead' && assignment.buddy_name && (
                              <div className="text-gray-500 pt-1">Buddy: {assignment.buddy_name}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>

            {!upcomingAssignmentsLoading && upcomingAssignments.length > 0 && (
              <div className="border-t border-gray-200 p-4 bg-white">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (selectedAssignmentIds.size === upcomingAssignments.length) {
                        setSelectedAssignmentIds(new Set());
                      } else {
                        setSelectedAssignmentIds(new Set(upcomingAssignments.map(a => a.id)));
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  >
                    {selectedAssignmentIds.size === upcomingAssignments.length ? 'Alle abwählen' : 'Alle auswählen'}
                  </button>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {selectedAssignmentIds.size} von {upcomingAssignments.length} ausgewählt
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowReleaseAssignmentsModal(false);
                        setReleaseModalData(null);
                        setSelectedAssignmentIds(new Set());
                        setUpcomingAssignments([]);
                      }}
                      disabled={releasingAssignments}
                      className="text-gray-600"
                    >
                      Abbrechen
                    </Button>
                    <button
                      onClick={handleReleaseAssignments}
                      disabled={selectedAssignmentIds.size === 0 || releasingAssignments}
                      className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: selectedAssignmentIds.size === 0 ? '#9CA3AF' : 'linear-gradient(135deg, #DC2626, #B91C1C)'
                      }}
                    >
                      {releasingAssignments ? (
                        <span className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Freigeben...
                        </span>
                      ) : (
                        `${selectedAssignmentIds.size} Einsätze freigeben`
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Active Promotoren Modal */}
      {showActivePromotorenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-6xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white"
          >
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">Aktive Promotoren</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {activePromotors.length} aktive Teammitglieder
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="text"
                    placeholder="Promotor suchen..."
                    value={activePromotorenSearch}
                    onChange={(e) => setActivePromotorenSearch(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-gray-200 bg-white rounded-lg focus:outline-none focus:ring-0 placeholder-gray-400"
                  />
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowActivePromotorenModal(false)}
                      className="h-8 w-8 text-gray-900 hover:text-gray-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent 
              className="p-6 overflow-auto max-h-[70vh] [&::-webkit-scrollbar]:hidden" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div className="grid grid-cols-4 gap-4">
                {activePromotors
                  .filter(promotor => promotor.name.toLowerCase().includes(activePromotorenSearch.toLowerCase()))
                  .map((promotor) => (
                  <div 
                    key={promotor.id} 
                    className="relative p-4 rounded-lg border border-gray-200 transition-all duration-300 hover:border-gray-300 hover:shadow-sm hover:scale-[1.02] bg-gradient-to-br from-white to-blue-50"
                  >
                    <div className="space-y-3 pb-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{promotor.name}</h4>
                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600">{promotor.phone}</p>
                        <p className="text-xs text-gray-600 truncate">{promotor.email}</p>
                        <p className="text-xs text-gray-600">{promotor.location}</p>
                      </div>
                        </div>
                    <div className="absolute bottom-4 left-4">
                        <span className="text-xs text-gray-500">{promotor.totalEinsaetze} Einsätze</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Decline Reason Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-md border border-gray-200 shadow-sm bg-white"
          >
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Anfrage ablehnen</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowDeclineModal(false)}
                  className="h-8 w-8 text-gray-900 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Grund der Ablehnung</label>
                  <Textarea
                    placeholder="Bitte geben Sie den Grund für die Ablehnung an..."
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    className="border-red-300 focus:outline-none focus:ring-0 focus:border-red-300 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 h-24"
                    style={{ backdropFilter: 'none', outline: 'none !important', borderWidth: '1px' }}
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeclineModal(false)}
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                  <Button
                    onClick={submitDeclineReason}
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    disabled={!declineReason.trim()}
                  >
                    Ablehnen
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPI Analytics Popup */}
      {showKpiPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-4xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white"
          >
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900">KPI Analytics</CardTitle>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowKpiPopup(false)}
                    className="h-8 w-8 text-gray-900 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Navigation Menu */}
              <div className="mt-4">
                <div className="flex bg-gray-100 rounded-lg p-1 max-w-sm mx-auto relative">
                  <div 
                    className={`absolute top-1 bottom-1 bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out ${
                      kpiPopupActiveTab === "ca-kpis" 
                        ? "left-1 right-1/2 mr-0.5" 
                        : "left-1/2 right-1 ml-0.5"
                    }`}
                  />
                  
                  <button
                    onClick={() => setKpiPopupActiveTab("ca-kpis")}
                    className="relative flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 z-10"
                  >
                    <span className={`transition-all duration-200 ${
                      kpiPopupActiveTab === "ca-kpis" 
                        ? "text-gray-900 font-medium" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}>CA KPIs</span>
                  </button>
                  <button
                    onClick={() => setKpiPopupActiveTab("mystery-shop")}
                    className="relative flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 z-10"
                  >
                    <span className={`transition-all duration-200 ${
                      kpiPopupActiveTab === "mystery-shop" 
                        ? "text-gray-900 font-medium" 
                        : "text-gray-600 hover:text-gray-900"
                    }`}>Mystery Shop</span>
                  </button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent 
              className="p-6 overflow-auto max-h-[70vh] [&::-webkit-scrollbar]:hidden" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              {kpiPopupActiveTab === "ca-kpis" && (
                <div className="space-y-6">
                  {/* Three timeframes in horizontal layout */}
                  <div className="grid grid-cols-3 gap-6">
                    {/* All Time (17) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-center font-medium text-gray-700 mb-4">All Time (17)</h3>
                      <div className="space-y-1 mx-2">
                                                 {/* MC/ET */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg MC/ET:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("mcet", kpiStatsData["alltime"].mcet.value) !== "text-[#FD7E14]" ? getKpiColorClass("mcet", kpiStatsData["alltime"].mcet.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("mcet", kpiStatsData["alltime"].mcet.value))}}
                             >
                               {kpiStatsData["alltime"].mcet.value.toFixed(1)}
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["alltime"].mcet.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["alltime"].mcet.changePercent}
                             </div>
                           </div>
                         </div>
                         
                         {/* TMA */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg TMA:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("tma", kpiStatsData["alltime"].tma.value) !== "text-[#FD7E14]" ? getKpiColorClass("tma", kpiStatsData["alltime"].tma.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("tma", kpiStatsData["alltime"].tma.value))}}
                             >
                               {kpiStatsData["alltime"].tma.value.toFixed(1)}%
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["alltime"].tma.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["alltime"].tma.changePercent}
                             </div>
                           </div>
                         </div>
                         
                         {/* VL Share */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg VL Share:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("vlshare", kpiStatsData["alltime"].vlShare.value) !== "text-[#FD7E14]" ? getKpiColorClass("vlshare", kpiStatsData["alltime"].vlShare.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("vlshare", kpiStatsData["alltime"].vlShare.value))}}
                             >
                               {kpiStatsData["alltime"].vlShare.value.toFixed(1)}%
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["alltime"].vlShare.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["alltime"].vlShare.changePercent}
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>

                    {/* Last 30 Days (17) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-center font-medium text-gray-700 mb-4">Last 30 Days (17)</h3>
                      <div className="space-y-1 mx-2">
                                                 {/* MC/ET */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg MC/ET:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("mcet", kpiStatsData["30days"].mcet.value) !== "text-[#FD7E14]" ? getKpiColorClass("mcet", kpiStatsData["30days"].mcet.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("mcet", kpiStatsData["30days"].mcet.value))}}
                             >
                               {kpiStatsData["30days"].mcet.value.toFixed(1)}
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["30days"].mcet.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["30days"].mcet.changePercent}
                             </div>
                           </div>
                         </div>
                         
                         {/* TMA */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg TMA:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("tma", kpiStatsData["30days"].tma.value) !== "text-[#FD7E14]" ? getKpiColorClass("tma", kpiStatsData["30days"].tma.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("tma", kpiStatsData["30days"].tma.value))}}
                             >
                               {kpiStatsData["30days"].tma.value.toFixed(1)}%
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["30days"].tma.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["30days"].tma.changePercent}
                             </div>
                           </div>
                         </div>
                         
                         {/* VL Share */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg VL Share:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("vlshare", kpiStatsData["30days"].vlShare.value) !== "text-[#FD7E14]" ? getKpiColorClass("vlshare", kpiStatsData["30days"].vlShare.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("vlshare", kpiStatsData["30days"].vlShare.value))}}
                             >
                               {kpiStatsData["30days"].vlShare.value.toFixed(1)}%
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["30days"].vlShare.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["30days"].vlShare.changePercent}
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>

                    {/* Last 6 Months (17) */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-center font-medium text-gray-700 mb-4">Last 6 Months (17)</h3>
                      <div className="space-y-1 mx-2">
                                                 {/* MC/ET */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg MC/ET:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("mcet", kpiStatsData["6months"].mcet.value) !== "text-[#FD7E14]" ? getKpiColorClass("mcet", kpiStatsData["6months"].mcet.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("mcet", kpiStatsData["6months"].mcet.value))}}
                             >
                               {kpiStatsData["6months"].mcet.value.toFixed(1)}
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["6months"].mcet.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["6months"].mcet.changePercent}
                             </div>
                           </div>
                         </div>
                         
                         {/* TMA */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg TMA:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("tma", kpiStatsData["6months"].tma.value) !== "text-[#FD7E14]" ? getKpiColorClass("tma", kpiStatsData["6months"].tma.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("tma", kpiStatsData["6months"].tma.value))}}
                             >
                               {kpiStatsData["6months"].tma.value.toFixed(1)}%
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["6months"].tma.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["6months"].tma.changePercent}
                             </div>
                           </div>
                         </div>
                         
                         {/* VL Share */}
                         <div className="text-center py-0.5">
                           <div className="flex items-center justify-center">
                             <div className="text-right text-gray-500 whitespace-nowrap">Avg VL Share:</div>
                             <div 
                               className={`font-semibold ${getKpiColorClass("vlshare", kpiStatsData["6months"].vlShare.value) !== "text-[#FD7E14]" ? getKpiColorClass("vlshare", kpiStatsData["6months"].vlShare.value) : ""}`}
                               style={{marginLeft: '4px', ...getKpiStyle(getKpiColorClass("vlshare", kpiStatsData["6months"].vlShare.value))}}
                             >
                               {kpiStatsData["6months"].vlShare.value.toFixed(1)}%
                             </div>
                             <div className={`text-xs ${getKpiPillColor(kpiStatsData["6months"].vlShare.changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                               {kpiStatsData["6months"].vlShare.changePercent}
                             </div>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Monatlicher Trend-Verlauf</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={kpiChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="month" 
                          stroke="#6b7280"
                          fontSize={12}
                        />
                        <YAxis 
                          yAxisId="mcet"
                          domain={[0, 6]}
                          stroke="#6b7280"
                          fontSize={12}
                          label={{ value: 'MC/ET', angle: -90, position: 'insideLeft' }}
                        />
                        <YAxis 
                          yAxisId="percentage"
                          orientation="right"
                          domain={[0, 100]}
                          stroke="#6b7280"
                          fontSize={12}
                          label={{ value: 'Prozent (%)', angle: 90, position: 'insideRight' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value, name) => [
                            name === 'mcet' ? value : `${value}%`,
                            name === 'mcet' ? 'MC/ET' : name === 'tma' ? 'TMA' : 'VL Share'
                          ]}
                        />
                        <Line 
                          yAxisId="mcet"
                          type="monotone" 
                          dataKey="mcet" 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                        <Line 
                          yAxisId="percentage"
                          type="monotone" 
                          dataKey="tma" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                        />
                        <Line 
                          yAxisId="percentage"
                          type="monotone" 
                          dataKey="vl" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    
                    {/* Legend */}
                    <div className="flex justify-center space-x-6 mt-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">MC/ET (Linke Skala)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">TMA (%)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">VL Share (%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {ENABLE_MYSTERY_SHOP_UI && kpiPopupActiveTab === "mystery-shop" && (
                <div className="space-y-6">
                  {/* Three timeframes in horizontal layout */}
                  <div className="grid grid-cols-3 gap-6">
                    {/* All Time */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-center font-medium text-gray-700 mb-4">All Time</h3>
                      <div className="space-y-1 mx-2">
                        <div className="text-center py-0.5">
                          <div className="flex items-center justify-center mb-1">
                            <div 
                              className={`font-semibold ${getMysteryShopColorClass(mysteryShopStatsData["alltime"].value)}`}
                            >
                              {mysteryShopStatsData["alltime"].value.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${getMysteryShopPillColor(mysteryShopStatsData["alltime"].changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                              {mysteryShopStatsData["alltime"].changePercent}
                            </div>
                          </div>
                          <div className="text-gray-500 text-sm">Avg Mystery Shop:</div>
                        </div>
                      </div>
                    </div>

                    {/* Last 30 Days */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-center font-medium text-gray-700 mb-4">Last 30 Days</h3>
                      <div className="space-y-1 mx-2">
                        <div className="text-center py-0.5">
                          <div className="flex items-center justify-center mb-1">
                            <div 
                              className={`font-semibold ${getMysteryShopColorClass(mysteryShopStatsData["30days"].value)}`}
                            >
                              {mysteryShopStatsData["30days"].value.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${getMysteryShopPillColor(mysteryShopStatsData["30days"].changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                              {mysteryShopStatsData["30days"].changePercent}
                            </div>
                          </div>
                          <div className="text-gray-500 text-sm">Avg Mystery Shop:</div>
                        </div>
                      </div>
                    </div>

                    {/* Last 6 Months */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <h3 className="text-center font-medium text-gray-700 mb-4">Last 6 Months</h3>
                      <div className="space-y-1 mx-2">
                        <div className="text-center py-0.5">
                          <div className="flex items-center justify-center mb-1">
                            <div 
                              className={`font-semibold ${getMysteryShopColorClass(mysteryShopStatsData["6months"].value)}`}
                            >
                              {mysteryShopStatsData["6months"].value.toFixed(1)}%
                            </div>
                            <div className={`text-xs ${getMysteryShopPillColor(mysteryShopStatsData["6months"].changePercent)} rounded-full px-1 py-0 whitespace-nowrap`} style={{marginLeft: '4px'}}>
                              {mysteryShopStatsData["6months"].changePercent}
                            </div>
                          </div>
                          <div className="text-gray-500 text-sm">Avg Mystery Shop:</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div className="bg-white p-6 rounded-lg border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Mystery Shop Trend-Verlauf</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={mysteryShopHistoryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="shop" 
                          stroke="#6b7280"
                          fontSize={12}
                        />
                        <YAxis 
                          domain={[75, 100]}
                          stroke="#6b7280"
                          fontSize={12}
                          label={{ value: 'Prozent (%)', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#f9fafb',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            fontSize: '12px'
                          }}
                          formatter={(value) => [`${value}%`, 'Mystery Shop']}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="percentage" 
                          stroke="#8b5cf6" 
                          strokeWidth={2}
                          dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#8b5cf6', strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                    
                    {/* Legend */}
                    <div className="flex justify-center mt-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">Mystery Shop (%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-0 shadow-xl bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Wichtige Nachricht senden</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowMessageModal(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Empfänger</label>
                  <select
                    value={messageForm.recipient}
                    onChange={(e) => setMessageForm({...messageForm, recipient: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">Alle Promotoren</option>
                    <option value="active">Nur aktive Promotoren</option>
                    <option value="specific">Bestimmte Personen</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Betreff</label>
                  <Input
                    type="text"
                    placeholder="Wichtige Mitteilung..."
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({...messageForm, subject: e.target.value})}
                    className="border-gray-200 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Nachricht</label>
                  <Textarea
                    placeholder="Ihre wichtige Nachricht..."
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                    className="border-gray-200 focus:ring-blue-500 h-24"
                  />
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600">
                    <Send className="h-4 w-4 mr-2" />
                    Senden
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMessageModal(false)}
                    className="flex-1"
                  >
                    Abbrechen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Promotor Selection Modal */}
      {showPromotorSelection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-4xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white"
          >
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">Promotoren auswählen</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPromotorSelection(false)}
                  className="h-8 w-8 text-gray-900 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
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
                    className="px-3 py-1.5 text-sm border border-gray-200 bg-white rounded-lg focus:outline-none focus:ring-0 placeholder-gray-400"
                  />
                </div>
                
                {/* Filter Options */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveRegionFilter("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-gray-100/70 text-gray-700 hover:bg-gray-200/80 ${
                    activeRegionFilter === "all"
                      ? "scale-110"
                      : ""
                  }`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setActiveRegionFilter("wien-noe-bgl")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("wien-noe-bgl")} ${getRegionBorder("wien-noe-bgl")} ${
                    activeRegionFilter === "wien-noe-bgl"
                      ? "scale-110"
                      : ""
                  }`}
                >
                  W/NÖ/BGL
                </button>
                <button
                  onClick={() => setActiveRegionFilter("steiermark")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("steiermark")} ${getRegionBorder("steiermark")} ${
                    activeRegionFilter === "steiermark"
                      ? "scale-110"
                      : ""
                  }`}
                >
                  ST
                </button>
                <button
                  onClick={() => setActiveRegionFilter("salzburg")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("salzburg")} ${getRegionBorder("salzburg")} ${
                    activeRegionFilter === "salzburg"
                      ? "scale-110"
                      : ""
                  }`}
                >
                  SBG
                </button>
                <button
                  onClick={() => setActiveRegionFilter("oberoesterreich")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("oberoesterreich")} ${getRegionBorder("oberoesterreich")} ${
                    activeRegionFilter === "oberoesterreich"
                      ? "scale-110"
                      : ""
                  }`}
                >
                  OÖ
                </button>
                <button
                  onClick={() => setActiveRegionFilter("tirol")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("tirol")} ${getRegionBorder("tirol")} ${
                    activeRegionFilter === "tirol"
                      ? "scale-110"
                      : ""
                  }`}
                >
                  T
                </button>
                <button
                  onClick={() => setActiveRegionFilter("vorarlberg")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("vorarlberg")} ${getRegionBorder("vorarlberg")} ${
                    activeRegionFilter === "vorarlberg"
                      ? "scale-110"
                      : ""
                  }`}
                >
                  V
                </button>
                <button
                  onClick={() => setActiveRegionFilter("kaernten")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border text-gray-700 hover:bg-gray-200/80 ${getRegionGradient("kaernten")} ${getRegionBorder("kaernten")} ${
                    activeRegionFilter === "kaernten"
                      ? "scale-110"
                      : ""
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
            </CardHeader>
            
            <CardContent 
              className="p-6 flex flex-col h-[400px] [&::-webkit-scrollbar]:hidden" 
              style={{ 
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <div className="flex-1 overflow-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {(() => {
                  console.log('🔍 Modal render - allPromotors:', allPromotors.length);
                  console.log('🔍 Modal render - activeRegionFilter:', activeRegionFilter);
                  console.log('🔍 Modal render - promotorSelectionSearch:', promotorSelectionSearch);
                  
                  const filtered = allPromotors.filter(promotor => 
                  (activeRegionFilter === "all" || promotor.region === activeRegionFilter) &&
                  promotor.name.toLowerCase().includes(promotorSelectionSearch.toLowerCase())
                  );
                  
                  console.log('🔍 Modal render - filtered promotors:', filtered.length);
                  return filtered;
                })().map((promotor) => {
                  const isSelected = selectedPromotors.includes(promotor.name);
                  return (
                    <button
                      key={promotor.name}
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
                    <Button
                      onClick={() => setShowPromotorSelection(false)}
                      variant="ghost"
                      className="bg-white/40 text-gray-700 hover:bg-white/60 border border-gray-200/50 backdrop-blur-sm"
                    >
                      Bestätigen
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Schedule Message Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-md border border-gray-200 shadow-sm bg-white"
          >
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-gray-900" />
                  <CardTitle className="text-lg font-semibold text-gray-900">Nachricht planen</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowScheduleModal(false)}
                  className="h-8 w-8 text-gray-900 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              {/* Message Preview */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nachricht</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 max-h-24 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  {messageText || "Keine Nachricht eingegeben..."}
                </div>
              </div>
              
              {/* Recipients Preview */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Empfänger</label>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                  {selectedPromotors.length === 0 
                    ? "Keine Promotoren ausgewählt..."
                    : selectedPromotors.length === 1 
                    ? selectedPromotors[0]
                    : `${selectedPromotors.length} Promotoren ausgewählt`
                  }
                </div>
              </div>
              
              {/* Date Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Datum</label>
                <DatePicker
                  value={scheduleDate}
                  onChange={(value) => setScheduleDate(value)}
                  className="w-full"
                />
              </div>
              
              {/* Time Selection */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Uhrzeit</label>
                <TimePicker
                  value={scheduleTime}
                  onChange={(value) => setScheduleTime(value)}
                  className="w-full"
                />
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowScheduleModal(false)}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleScheduleMessage}
                  disabled={schedulingMessage || !messageText.trim() || !scheduleDate || !scheduleTime || selectedPromotors.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-70"
                >
                  {schedulingMessage ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      wird geplant
                    </span>
                  ) : (
                    'Planen'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Message Detail Modal */}
      {showMessageDetail && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card 
            className="w-full max-w-md border border-gray-200 shadow-sm bg-white"
          >
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  {selectedMessage?.sent ? "Gesendete Nachricht" : "Geplante Nachricht"}
                </CardTitle>
                <div className="flex items-center space-x-2">
                  {!selectedMessage?.sent && (
                    <>
                      <button
                        onClick={() => {
                          if (isEditingMessage) {
                            handleSaveMessage();
                          } else {
                            setIsEditingMessage(true);
                          }
                        }}
                        className="h-5 w-5 text-black opacity-50 hover:opacity-75 transition-opacity"
                      >
                        {isEditingMessage ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <Edit3 className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className={`p-1 text-gray-400 hover:text-red-500 transition-colors ${
                          deleteConfirmationState ? 'animate-vibrate text-red-500' : ''
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMessageDetail(false)}
                    className="h-8 w-8 text-gray-900 hover:text-gray-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-4">
              {/* Message Content */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Nachricht</label>
                {isEditingMessage && !selectedMessage?.sent ? (
                  <textarea
                    value={editedMessageText}
                    onChange={(e) => setEditedMessageText(e.target.value)}
                    className="w-full p-3 border border-gray-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 text-sm min-h-24 max-h-32 resize-none overflow-y-auto [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  />
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                    {selectedMessage.fullText}
                  </div>
                )}
              </div>
              
              {/* Schedule Information */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Datum</label>
                  {isEditingMessage && !selectedMessage?.sent ? (
                    <DatePicker
                      value={editedDate}
                      onChange={(value) => setEditedDate(value)}
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                      {selectedMessage.date}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Zeit</label>
                  {isEditingMessage && !selectedMessage?.sent ? (
                    <TimePicker
                      value={editedTime}
                      onChange={(value) => setEditedTime(value)}
                      className="w-full"
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                      {selectedMessage.time}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Recipients */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Empfänger</label>
                <div className="space-y-2 max-h-24 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">Gelesen</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedMessage.readBy || []).map((promotor: string, index: number) => {
                        const region = getPromotorRegion(promotor);
                        const colors = getRegionPillColors(region);
                        return (
                          <span key={`read-${index}`} className={`px-2 py-1 rounded-full text-xs border ${colors} flex items-center gap-1`}>
                            <Check className="h-3 w-3 text-green-600" /> {promotor}
                          </span>
                        );
                      })}
                      {(!selectedMessage.readBy || selectedMessage.readBy.length === 0) && (
                        <span className="text-xs text-gray-400">Keine</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-gray-500 mb-1">Ungelesen</p>
                    <div className="flex flex-wrap gap-2">
                      {(selectedMessage.unreadBy || selectedMessage.promotors || []).filter((p: string) => !(selectedMessage.readBy || []).includes(p)).map((promotor: string, index: number) => {
                        const region = getPromotorRegion(promotor);
                        const colors = getRegionPillColors(region);
                        return (
                          <span key={`unread-${index}`} className={`px-2 py-1 rounded-full text-xs border ${colors} opacity-60`}>
                            {promotor}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Eddie KI Assistant */}
      <AdminEddieAssistant />
      {/* Assignment Detail Modal */}
      {showAssignmentDetailModal && selectedAssignmentDetail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl border border-gray-200 shadow-sm max-h-[90vh] overflow-hidden bg-white">
            <CardHeader className="pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Einsatz Details</CardTitle>
                  <CardDescription className="text-sm text-gray-500">
                    {selectedAssignmentDetail.market} • {selectedAssignmentDetail.promotor}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAssignmentDetailModal(false)}
                  className="h-8 w-8 text-gray-900 hover:text-gray-700"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            

            
            <CardContent className="p-6 overflow-auto max-h-[70vh] [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="space-y-6">
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Location</h4>
                    <p className="text-sm text-gray-600">{selectedAssignmentDetail.address}</p>
                    <p className="text-sm text-gray-600">{selectedAssignmentDetail.plz} {selectedAssignmentDetail.city}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Geplante Zeiten</h4>
                    <p className="text-sm text-gray-600">{selectedAssignmentDetail.planStart} - {selectedAssignmentDetail.planEnd}</p>
                  </div>
                </div>

                {/* Status and Indicators */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Status</h4>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        getStatusColor(selectedAssignmentDetail) === 'gold' ? 'bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D]' :
                        getStatusColor(selectedAssignmentDetail) === 'green' ? 'bg-green-400' :
                        getStatusColor(selectedAssignmentDetail) === 'orange' ? 'bg-orange-400' :
                        getStatusColor(selectedAssignmentDetail) === 'red' ? 'bg-red-400' :
                        'bg-gray-300'
                      }`}></div>
                      <span className={`text-sm ${getStatusColor(selectedAssignmentDetail) === 'gold' ? 'font-medium bg-gradient-to-r from-[#EFB54E] via-[#FFED96] via-[#FCD94C] via-[#F9F793] to-[#EFB94D] bg-clip-text text-transparent' : 'text-gray-600'}`}>
                        {['krankenstand', 'urlaub', 'zeitausgleich', 'notfall'].includes(selectedAssignmentDetail.status) 
                          ? selectedAssignmentDetail.status 
                          : getStatusColor(selectedAssignmentDetail) === 'gold' 
                          ? 'beendet' 
                          : getStatusColor(selectedAssignmentDetail) === 'green' 
                          ? 'gestartet' 
                          : getStatusColor(selectedAssignmentDetail) === 'orange' 
                          ? 'verspätet' 
                          : 'pending'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Indikatoren</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-bold ${selectedAssignmentDetail.hasCheckedIn ? 'text-green-400/60' : 'text-gray-300/60'}`}>TC</span>
                        <span className="text-xs text-gray-500">{selectedAssignmentDetail.hasCheckedIn ? 'Erledigt' : 'Ausstehend'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${selectedAssignmentDetail.hasOutsideBreak ? 'bg-green-400/60' : 'bg-gray-300/60'}`}></div>
                        <span className={`text-xs ${selectedAssignmentDetail.hasOutsideBreak ? 'text-green-400/60' : 'text-gray-300/60'}`}>Abweichende Pause</span>
                        {detailModalOutsideBreakTimestamp && (
                          <span className="text-xs text-gray-500">
                            {new Date(detailModalOutsideBreakTimestamp).toLocaleString('de-AT', { timeZone: 'Europe/Vienna', hour: '2-digit', minute: '2-digit' })} Uhr
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
                        {selectedAssignmentDetail.actualStart || '--:--'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Ende:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {selectedAssignmentDetail.actualEnd || '--:--'}
                      </span>
                    </div>
                  </div>
                </div>

                <AssignmentLocationMap
                  market={{
                    latitude: selectedAssignmentDetail.market_latitude,
                    longitude: selectedAssignmentDetail.market_longitude,
                    address: selectedAssignmentDetail.market_geocoded_address,
                    geocodedAt: selectedAssignmentDetail.market_geocoded_at,
                  }}
                  start={{
                    latitude: selectedAssignmentDetail.start_latitude,
                    longitude: selectedAssignmentDetail.start_longitude,
                    accuracyMeters: selectedAssignmentDetail.start_accuracy_meters,
                    capturedAt: selectedAssignmentDetail.start_location_captured_at,
                    distanceMeters: selectedAssignmentDetail.start_distance_meters,
                    status: selectedAssignmentDetail.start_location_status,
                  }}
                  end={{
                    latitude: selectedAssignmentDetail.end_latitude,
                    longitude: selectedAssignmentDetail.end_longitude,
                    accuracyMeters: selectedAssignmentDetail.end_accuracy_meters,
                    capturedAt: selectedAssignmentDetail.end_location_captured_at,
                    distanceMeters: selectedAssignmentDetail.end_distance_meters,
                    status: selectedAssignmentDetail.end_location_status,
                  }}
                />

                {/* Early Start Reasoning */}
                {selectedAssignmentDetail.early_start_reason && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Früher Start</h4>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Minuten zu früh:</span>
                        <span className="text-sm font-medium text-orange-700">
                          {selectedAssignmentDetail.minutes_early_start} Min
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Begründung:</span>
                        <p className="text-sm text-gray-900 bg-white rounded p-2 border">
                          {selectedAssignmentDetail.early_start_reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Early End Reasoning */}
                {selectedAssignmentDetail.early_end_reason && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Früher Schluss</h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Minuten zu früh beendet:</span>
                        <span className="text-sm font-medium text-red-700">
                          {selectedAssignmentDetail.minutes_early_end} Min
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600 block mb-1">Begründung:</span>
                        <p className="text-sm text-gray-900 bg-white rounded p-2 border border-red-100">
                          {selectedAssignmentDetail.early_end_reason}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Buddy Information */}
                {selectedAssignmentDetail.buddyName && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Buddy Tag</h4>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                      <p className="text-sm text-gray-900">{selectedAssignmentDetail.buddyName}</p>
                      <p className="text-xs text-gray-500">Buddy für diesen Einsatz</p>
                    </div>
                  </div>
                )}

                {/* Schulung Participants */}
                {selectedAssignmentDetail.isSchulung && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Teilnehmende</h4>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex flex-wrap gap-2">
                        {getSchulungParticipantNames(selectedAssignmentDetail).length > 0 ? (
                          getSchulungParticipantNames(selectedAssignmentDetail).map((name) => (
                            <span
                              key={`participant-${selectedAssignmentDetail.id}-${name}`}
                              className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-orange-200 text-xs text-gray-700"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500">Keine Teilnehmenden verfügbar</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Photos Section */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-900">Fotos</h4>
                  {(selectedAssignmentDetail.foto_maschine_url || selectedAssignmentDetail.foto_kapsellade_url || selectedAssignmentDetail.foto_pos_gesamt_url || selectedAssignmentDetail.foto_extra_url) ? (
                    <div className="grid grid-cols-1 gap-4">
                      {/* Foto Maschine */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700">Foto Maschine</span>
                          {selectedAssignmentDetail.foto_maschine_url ? (
                            <span className="text-xs text-green-600">✓</span>
                          ) : (
                            <span className="text-xs text-gray-400">Nicht verfügbar</span>
                          )}
                        </div>
                        {selectedAssignmentDetail.foto_maschine_url ? (
                          <img 
                            src={selectedAssignmentDetail.foto_maschine_url} 
                            alt="Foto Maschine" 
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedPhoto({ url: selectedAssignmentDetail.foto_maschine_url, title: "Foto Maschine" });
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
                          {selectedAssignmentDetail.foto_kapsellade_url ? (
                            <span className="text-xs text-green-600">✓</span>
                          ) : (
                            <span className="text-xs text-gray-400">Nicht verfügbar</span>
                          )}
                        </div>
                        {selectedAssignmentDetail.foto_kapsellade_url ? (
                          <img 
                            src={selectedAssignmentDetail.foto_kapsellade_url} 
                            alt="Foto Kapsellade" 
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedPhoto({ url: selectedAssignmentDetail.foto_kapsellade_url, title: "Foto Kapsellade" });
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
                          {selectedAssignmentDetail.foto_pos_gesamt_url ? (
                            <span className="text-xs text-green-600">✓</span>
                          ) : (
                            <span className="text-xs text-gray-400">Nicht verfügbar</span>
                          )}
                        </div>
                        {selectedAssignmentDetail.foto_pos_gesamt_url ? (
                          <img 
                            src={selectedAssignmentDetail.foto_pos_gesamt_url} 
                            alt="Foto POS gesamt" 
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedPhoto({ url: selectedAssignmentDetail.foto_pos_gesamt_url, title: "Foto POS gesamt" });
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
                          {selectedAssignmentDetail.foto_extra_url ? (
                            <span className="text-xs text-green-600">✓</span>
                          ) : (
                            <span className="text-xs text-gray-400">Nicht verfügbar</span>
                          )}
                        </div>
                        {selectedAssignmentDetail.foto_extra_url ? (
                          <img 
                            src={selectedAssignmentDetail.foto_extra_url} 
                            alt="Optionales Foto" 
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => {
                              setSelectedPhoto({ url: selectedAssignmentDetail.foto_extra_url, title: "Optionales Foto" });
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
                {selectedAssignmentDetail.notes && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-900">Notizen</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-900">{selectedAssignmentDetail.notes}</p>
                    </div>
                  </div>
                )}

              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {showPhotoLightbox && selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setShowPhotoLightbox(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <button
              onClick={() => setShowPhotoLightbox(false)}
              className="absolute top-4 right-4 z-60 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
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

    </div>
  );
}
