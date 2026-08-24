"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  AlertCircle, // For Bitte Lesen card
  Info,
  // MessageSquare, // Replaced by MessagesSquareIcon for quick action
  Send,
  X,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  MapPin, // For assignment location
  // Film, // Replaced by VideoIcon for quick action
  GraduationCap, // For combined Schulungen & Videos quick action
  Video as VideoIcon, // For Videos quick action
  MessagesSquare as MessagesSquareIcon, // For Chat quick action
  Briefcase, // For "Terminkalender" card title icon
  History, // For To-Dos history
  Image as ImageIcon,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

// TypeScript interfaces for todo items
type TodoFilterRange = "heute" | "7tage" | "30tage"

interface TodoItem {
  id: number;
  kind?: "assignment" | "document" | "message" | "regular";
  title: string;
  priority: "high" | "medium" | "low";
  due: string;
  completed: boolean;
  timeframe: "heute" | "7tage" | "30tage";
}

interface TodoHistoryItem {
  id: number;
  title: string;
  priority: "high" | "medium" | "low";
  completedDate: Date;
  completed: boolean;
}

const PRIORITY_TOKENS: { [key in TodoItem["priority"]]: { label: string; classes: string } } = {
  high: {
    label: "Prio hoch",
    classes:
      "bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/15 dark:text-rose-200 dark:border-rose-500/30"
  },
  medium: {
    label: "Prio mittel",
    classes:
      "bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/30"
  },
  low: {
    label: "Prio entspannt",
    classes:
      "bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:border-emerald-500/30"
  }
};

export default function DashboardPage() {
  const [expandedTodos, setExpandedTodos] = useState(false);
  const [todoFilter, setTodoFilter] = useState<TodoFilterRange>("heute");
  const [showTodoHistory, setShowTodoHistory] = useState(false);
  const [showDocumentUploadInfo, setShowDocumentUploadInfo] = useState(false);
  const [monthFilterOpen, setMonthFilterOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());
  const [animating, setAnimating] = useState(false);
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [miniCalendarDisplayMonth, setMiniCalendarDisplayMonth] = useState(new Date()); 
  const miniCalendarButtonRef = useRef<HTMLButtonElement>(null);
  const miniCalendarPopupRef = useRef<HTMLDivElement>(null); 
  const [hoveredMiniCalendarDate, setHoveredMiniCalendarDate] = useState<Date | null>(null);
  const [showMapsModal, setShowMapsModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [showBitteLesen, setShowBitteLesen] = useState(true);
  const [bitteLesenConfirmed, setBitteLesenConfirmed] = useState<{[key: string]: boolean}>({});
  // Zwei-Schritt "Bitte lesen" Karte (per message)
  const [bitteLesen2Step, setBitteLesen2Step] = useState<{[key: string]: 'message' | 'upload' | 'done'}>({});
  const [bitteLesen2Confirmed, setBitteLesen2Confirmed] = useState<{[key: string]: boolean}>({});
  const [bitteLesen2Progress, setBitteLesen2Progress] = useState<{[key: string]: number}>({});
  const [bitteLesen2Files, setBitteLesen2Files] = useState<{[key: string]: File[]}>({});
  const [bitteLesen2Uploading, setBitteLesen2Uploading] = useState<{[key: string]: boolean}>({});
  
  // Real messages data
  const [messages, setMessages] = useState<any[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  
  // Load messages for this promotor
  const loadMessages = async () => {
    try {
      setMessagesLoading(true);
      console.log('🔄 Loading messages...');
      console.log('📍 API URL:', '/api/me/messages');
      
      const response = await fetch('/api/me/messages', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', response.headers);
      
      const data = await response.json();
      console.log('📦 Raw response data:', data);
      
      if (response.ok) {
        console.log('✅ Messages loaded:', data.messages?.length || 0);
        console.log('📬 Messages data:', data.messages);
        setMessages(data.messages || []);
      } else {
        console.error('❌ Failed to load messages, status:', response.status);
        console.error('❌ Error data:', data);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  };
  
  // Mark message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      await fetch(`/api/me/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read' })
      });
      
      // Save todo completion to history
      const message = messages.find(m => m.id === messageId);
      if (message) {
        const title = message.sender_name ? `Nachricht von ${message.sender_name} lesen` : 'Wichtige Nachricht lesen';
        await saveTodoCompletion('message', messageId, title);
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };
  
  // Mark message as acknowledged (for confirmation_required type)
  const markMessageAsAcknowledged = async (messageId: string) => {
    try {
      await fetch(`/api/me/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' })
      });
      
      // Save todo completion to history
      const message = messages.find(m => m.id === messageId);
      if (message) {
        const title = message.sender_name ? `Nachricht von ${message.sender_name} bestätigen` : 'Nachricht bestätigen';
        await saveTodoCompletion('message', messageId, title);
      }
    } catch (error) {
      console.error('Error acknowledging message:', error);
    }
  };


  const [selectedAssignmentType, setSelectedAssignmentType] = useState<string>("promotion");

  const [showLegendPopup, setShowLegendPopup] = useState(false);
  const legendIconRef = useRef<HTMLButtonElement>(null);
  const legendPopupRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fullSubtitle = "Hier ist dein Überblick für heute.";
  const [animatedSubtitle, setAnimatedSubtitle] = useState(fullSubtitle.split('').map(() => '\u00A0').join('')); 
  const [greeting, setGreeting] = useState("");
  const [displayName, setDisplayName] = useState<string>("");


  const router = useRouter();

  // Get available months for dropdown (last 6 months first, then older)
  const getAvailableMonths = () => {
    const months = new Set();
    todoHistory.forEach(todo => {
      const date = todo.completedDate;
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthLabel = date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      months.add(JSON.stringify({ key: monthKey, label: monthLabel }));
    });
    
    return Array.from(months)
      .map(item => JSON.parse(item as string))
      .sort((a, b) => {
        // Sort by year-month key (newer first)
        const [aYear, aMonth] = a.key.split('-').map(Number);
        const [bYear, bMonth] = b.key.split('-').map(Number);
        if (bYear !== aYear) return bYear - aYear;
        return bMonth - aMonth;
      });
  };

  // Filter history by month
  const getFilteredHistory = () => {
    if (selectedMonth === "all") {
      return todoHistory;
    }
    
    const [year, month] = selectedMonth.split('-').map(Number);
    return todoHistory.filter(todo => {
      const todoDate = todo.completedDate;
      return todoDate.getFullYear() === year && todoDate.getMonth() === month;
    });
  };

  // Get display text for selected month
  const getSelectedMonthDisplay = () => {
    if (selectedMonth === "all") return "Alle";
    const availableMonths = getAvailableMonths();
    const found = availableMonths.find(m => m.key === selectedMonth);
    return found ? found.label.split(' ')[0] : "Alle";
  };

  // Handle outside click for todo history
  useEffect(() => {
    const handleClickOutsideTodoHistory = (event: MouseEvent) => {
      if (showTodoHistory && !(event.target as Element).closest('.todo-history-popup')) {
        setShowTodoHistory(false);
      }
    };
    
    if (showTodoHistory) {
      document.addEventListener('mousedown', handleClickOutsideTodoHistory);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideTodoHistory);
    };
  }, [showTodoHistory]);

  // Reset month filter when history popup is closed
  useEffect(() => {
    if (!showTodoHistory) {
      setMonthFilterOpen(false);
      setSelectedMonth("all");
    }
  }, [showTodoHistory]);

  useEffect(() => {
    async function initProfileAndOnboarding() {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('displayName') : null;
      if (cached) setDisplayName(cached);
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();
        const profileName = profile?.display_name && String(profile.display_name).trim();
        const metaName = user.user_metadata?.display_name || user.user_metadata?.full_name;
        const name = profileName || metaName || 'Promotor';
        setDisplayName(name);
        try { localStorage.setItem('displayName', name); } catch {}

        // Onboarding modal removed - only available from landing page
      } catch {}
    }
    initProfileAndOnboarding();
  }, []);

  useEffect(() => {
    const currentHour = new Date().getHours();
    const targetName = displayName || 'Promotor';
    let newGreeting = "";
    if (currentHour >= 5 && currentHour < 12) newGreeting = `Guten Morgen, ${targetName}`;
    else if (currentHour >= 12 && currentHour < 18) newGreeting = `Guten Tag, ${targetName}`;
    else if (currentHour >= 18 && currentHour < 22) newGreeting = `Guten Abend, ${targetName}`;
    else newGreeting = `Gute Nacht, ${targetName}`;
    setGreeting(newGreeting);
  }, [displayName]);

  useEffect(() => {
    setAnimatedSubtitle(fullSubtitle.split('').map(() => '\u00A0').join(''));

    let currentTypedIndex = 0;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (currentTypedIndex < fullSubtitle.length) {
        setAnimatedSubtitle(
          fullSubtitle.substring(0, currentTypedIndex + 1) +
          Array(fullSubtitle.length - (currentTypedIndex + 1)).fill('\u00A0').join('')
        );
        currentTypedIndex++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const getCalendarDays = () => {
    const days = [];
    const startDay = new Date(currentCalendarDate);
    startDay.setDate(currentCalendarDate.getDate() - 4);
    for (let i = 0; i < 9; i++) {
      const day = new Date(startDay);
      day.setDate(startDay.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const navigateDays = (steps: number) => {
    if (animating || steps === 0) return;
    setAnimating(true);
    setTimeout(() => {
      const newCurrentDate = new Date(currentCalendarDate);
      newCurrentDate.setDate(currentCalendarDate.getDate() + steps);
      setCurrentCalendarDate(newCurrentDate);
      setSelectedCalendarDate(newCurrentDate);
      setTimeout(() => setAnimating(false), 400);
    }, 50);
  };

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [todoHistoryData, setTodoHistoryData] = useState<any[]>([]);
  const [todosLoading, setTodosLoading] = useState(true); // Start with loading state

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showFilterDropdown &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node) &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilterDropdown]);
  
  // Work status data
  const [workStatus, setWorkStatus] = useState({ goalHours: 0, workedHours: 0, percentage: 0 });
  const [workStatusLoading, setWorkStatusLoading] = useState(false);

  // Convert assignments to todos
  const getAssignmentTodos = (): TodoItem[] => {
    const today = new Date();
    // Reset time to compare only dates
    today.setHours(0, 0, 0, 0);
    const currentTodos: TodoItem[] = [];

    assignments.forEach((assignment) => {
      const assignmentDate = new Date(assignment.date);
      assignmentDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.ceil((assignmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // ASSIGNMENTS: Only show on their exact day, disappear at midnight
      // Skip past assignments and assignments that aren't for today/future
      if (daysDiff < 0) return;
      
      // Determine timeframe for filtering
      let timeframe: "heute" | "7tage" | "30tage" = "30tage";
      if (daysDiff === 0) timeframe = "heute"; // Today only
      else if (daysDiff <= 7) timeframe = "7tage"; // Future within 7 days
      else timeframe = "30tage"; // Future beyond 7 days

      // Create todo title
      const buddyText = assignment.buddyName ? ` (mit ${assignment.buddyName})` : '';
      const todoTitle = `${assignment.title}${buddyText} - ${assignment.time}`;

      // Determine due text
      let dueText: string;
      if (daysDiff === 0) dueText = "Heute";
      else if (daysDiff === 1) dueText = "Morgen";
      else if (daysDiff <= 7) dueText = `In ${daysDiff} Tagen`;
      else dueText = assignmentDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

      // For assignments: only show as completed if completed today AND it's today's assignment
      const hasActualEndTime = !!assignment.actual_end_time;
      const isCompletedToday = hasActualEndTime && daysDiff === 0;
      
      const todo: TodoItem = {
        id: 100000 + currentTodos.length,
        kind: "assignment",
        title: todoTitle,
        priority: "high", // Assignments always have highest priority
        due: dueText,
        completed: isCompletedToday, // Only show completed if completed today
        timeframe: timeframe
      };

      // Save to history if assignment has actual_end_time but not in history yet
      if (assignment.actual_end_time && !isTodoCompleted('assignment', assignment.id.toString())) {
        saveTodoCompletion('assignment', assignment.id.toString(), todoTitle);
      }

      currentTodos.push(todo);
    });

    return currentTodos;
  };

  // Load documents
  const loadDocuments = async () => {
    try {
      const res = await fetch('/api/me/documents', { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      } else {
        console.error('Failed to load documents:', res.status);
        setDocuments([]);
      }
    } catch (e) {
      console.error('Error loading documents:', e);
      setDocuments([]);
    }
  };

  // Load todo history
  const loadTodoHistory = async () => {
    try {
      const res = await fetch('/api/me/todos/history', { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTodoHistoryData(data.history || []);
      } else {
        console.error('Failed to load todo history:', res.status);
        setTodoHistoryData([]);
      }
    } catch (e) {
      console.error('Error loading todo history:', e);
      setTodoHistoryData([]);
    }
  };

  // Check if a todo is completed based on history
  const isTodoCompleted = (todoType: string, referenceId: string): boolean => {
    return todoHistoryData.some(h => 
      h.todo_type === todoType && h.reference_id === referenceId
    );
  };

  // Check if a todo was completed today
  const isTodoCompletedToday = (todoType: string, referenceId: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return todoHistoryData.some(h => {
      if (h.todo_type === todoType && h.reference_id === referenceId) {
        const completedAt = new Date(h.completed_at);
        return completedAt >= today && completedAt < tomorrow;
      }
      return false;
    });
  };

  // Save todo completion to history
  const saveTodoCompletion = async (todoType: string, referenceId: string, title: string) => {
    try {
      await fetch('/api/me/todos/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ todoType, referenceId, title })
      });
      // Reload history to update state
      await loadTodoHistory();
    } catch (e) {
      console.error('Error saving todo completion:', e);
    }
  };

  // History data for completed To-Dos - use real data from todoHistoryData
  const todoHistory = todoHistoryData.map((item, index) => ({
    id: item.id || (1000 + index),
    title: item.title,
    priority: item.todo_type === 'assignment' ? 'high' : item.todo_type === 'message' ? 'high' : 'medium',
    completedDate: new Date(item.completed_at),
    completed: true
  }));

  const filteredHistory = getFilteredHistory();
  const monthOptions = [{ key: "all", label: "Alle" }, ...getAvailableMonths()];

  // Convert documents to todos
  const getDocumentTodos = (): TodoItem[] => {
    const documentTodos: TodoItem[] = [];

    documents.forEach((doc) => {
      // DOCUMENTS: Show if incomplete (missing) OR completed today only
      // Completed on previous days should only be in history, not main UI
      if (doc.required) {
        const isCompletedToday = isTodoCompletedToday('document', doc.type);
        const isIncomplete = doc.status === 'missing';
        
        // Show if incomplete OR completed today
        if (isIncomplete || isCompletedToday) {
          const todo: TodoItem = {
            id: 200000 + documentTodos.length, // Unique ID range for documents (200000+)
            kind: "document",
            title: `${doc.name} hochladen`,
            priority: "medium", // Document todos have medium priority
            due: "Erforderlich",
            completed: isCompletedToday, // Only show as completed if completed today
            timeframe: "heute" // Document todos always appear in "heute" to be visible
          };
          
          documentTodos.push(todo);
        }
      }
    });

    return documentTodos;
  };

  // Convert messages to todos
  const getMessageTodos = (): TodoItem[] => {
    const messageTodos: TodoItem[] = [];

    // Add todos for normal messages
    // MESSAGES: Show if unread (incomplete) OR completed today only
    // Completed on previous days should only be in history, not main UI
    messages.filter(msg => msg.message_type === 'normal').forEach((message, index) => {
      const isCompletedToday = isTodoCompletedToday('message', message.id);
      const isIncomplete = !message.read_at;
      
      // Show if incomplete OR completed today only
      if (isIncomplete || isCompletedToday) {
        const todo: TodoItem = {
          id: 300000 + index, // Unique ID range for messages (300000+)
          kind: "message",
          title: message.sender_name ? `Nachricht von ${message.sender_name} lesen` : 'Wichtige Nachricht lesen',
          priority: "high", // Message todos have high priority
          due: "Erforderlich",
          completed: isCompletedToday, // Only show as completed if completed today
          timeframe: "heute" // Message todos always appear in "heute" to be visible
        };
        messageTodos.push(todo);
      }
    });

    // Add todos for confirmation_required messages
    // MESSAGES: Show if unacknowledged (incomplete) OR completed today only
    messages.filter(msg => msg.message_type === 'confirmation_required').forEach((message, index) => {
      const isCompletedToday = isTodoCompletedToday('message', message.id);
      const isIncomplete = !message.acknowledged_at;
      
      // Show if incomplete OR completed today only
      if (isIncomplete || isCompletedToday) {
        const todo: TodoItem = {
          id: 300100 + index, // Unique ID range for confirmation messages (300100+)
          kind: "message",
          title: message.sender_name ? `Nachricht von ${message.sender_name} bestätigen` : 'Nachricht bestätigen',
          priority: "high", // Message todos have high priority
          due: "Bestätigung erforderlich",
          completed: isCompletedToday, // Only show as completed if completed today
          timeframe: "heute" // Message todos always appear in "heute" to be visible
        };
        messageTodos.push(todo);
      }
    });

    return messageTodos;
  };

  // Convert regular todos to include history completion check
  const getRegularTodos = (): TodoItem[] => {
    return todos.map(todo => {
      // REGULAR TODOS: Show if incomplete OR completed today only
      const isCompletedToday = todo.completed || isTodoCompletedToday('regular', todo.id.toString());
      const wasCompletedBefore = isTodoCompleted('regular', todo.id.toString()) && !isCompletedToday;
      
      // Don't show if completed on previous days (only in history)
      if (wasCompletedBefore) return null;
      
      return {
        ...todo,
        kind: todo.kind || "regular",
        completed: isCompletedToday
      };
    }).filter(Boolean) as TodoItem[];
  };

  // Merge assignment todos, document todos, message todos, and regular todos
  const assignmentTodos = getAssignmentTodos();
  const documentTodos = getDocumentTodos();
  const messageTodos = getMessageTodos();
  const regularTodos = getRegularTodos();
  const allTodos = [...assignmentTodos, ...documentTodos, ...messageTodos, ...regularTodos];

  const filteredTodos = allTodos.filter(todo => {
    if (todoFilter === "heute") {
      return todo.timeframe === "heute";
    }
    if (todoFilter === "7tage") {
      return todo.timeframe === "heute" || todo.timeframe === "7tage";
    }
    if (todoFilter === "30tage") {
      return todo.timeframe === "heute" || todo.timeframe === "7tage" || todo.timeframe === "30tage";
    }
    return false; // Default to showing no todos if filter is unrecognized
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    // First sort by completion status
    if (a.completed !== b.completed) {
    return a.completed ? 1 : -1;
    }
    
    // Then by type priority: assignments (100000-199999) -> messages (300000+) -> documents (200000-299999) -> regular todos
    const aIsAssignment = a.kind === "assignment";
    const bIsAssignment = b.kind === "assignment";
    const aIsMessage = a.kind === "message";
    const bIsMessage = b.kind === "message";
    const aIsDocument = a.kind === "document";
    const bIsDocument = b.kind === "document";
    
    // Assignments come first
    if (aIsAssignment !== bIsAssignment) {
      return aIsAssignment ? -1 : 1;
    }
    
    // Then messages come second
    if (aIsMessage !== bIsMessage) {
      return aIsMessage ? -1 : 1;
    }
    
    // Then documents come third
    if (aIsDocument !== bIsDocument) {
      return aIsDocument ? -1 : 1;
    }
    
    return 0;
  });

  const completedTodos = sortedTodos.filter(todo => todo.completed).length;
  const totalTodos = sortedTodos.length;
  const openTodos = Math.max(totalTodos - completedTodos, 0);

  const toggleTodo = async (id: number) => {
    // Disable manual toggling entirely; completion is driven by app actions only
    return;
    
    /*
    // Find the todo to get its details
    const allCurrentTodos = [...assignmentTodos, ...documentTodos, ...messageTodos, ...regularTodos];
    const todoToToggle = allCurrentTodos.find(t => t.id === id);
    
    if (todoToToggle) {
      const newCompleted = !todoToToggle.completed;
      
      // Save completion to history if marking as complete
      if (newCompleted) {
        let todoType = 'regular';
        let referenceId = id.toString();
        
        if (id >= 200000 && id < 300000) {
          // Document todo
          todoType = 'document';
          const docIndex = id - 200000;
          const doc = documents.filter(d => d.required && (d.status === 'missing' || isTodoCompletedToday('document', d.type)))[docIndex];
          referenceId = doc?.type || id.toString();
        }
        
        await saveTodoCompletion(todoType, referenceId, todoToToggle.title);
      }
      
      // Update local state for regular todos only
      if (id < 100000) {
        setTodos(todos.map(todo => (todo.id === id ? { ...todo, completed: newCompleted } : todo)));
      }
      
      // For document todos, we don't update local state since they're computed from documents array
      // The completion is tracked in history and will be reflected on next data refresh
    }
    */
  };
  
  const handleOpenAssignment = () => {
    router.push("/promotors/einsatz");
  };

  const handleOpenDocumentUpload = () => {
    setShowDocumentUploadInfo(false);
    router.push("/promotors/profil#dokumente");
  };

  const renderTodoCollection = (items: TodoItem[]) => (
  <ul className="px-4 py-4 divide-y divide-purple-50">
      {items.map((todo) => {
        const priorityToken = PRIORITY_TOKENS[todo.priority] || PRIORITY_TOKENS.medium;
        const isAssignment = todo.kind === "assignment";
        const isDocument = todo.kind === "document";
        const isMessage = todo.kind === "message";
        const indicatorClasses = `w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-300 ${
          todo.completed
            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 text-emerald-600 shadow-sm dark:from-emerald-500/15 dark:to-teal-500/10 dark:border-emerald-500/40 dark:text-emerald-200"
            : "bg-white/90 border-white/40 text-purple-600 shadow-[0_6px_16px_rgba(79,70,229,0.18)] group-hover:-translate-y-0.5 dark:bg-gray-900/70 dark:border-purple-900/40 dark:text-purple-100"
        }`;

        return (
      <li
        key={todo.id}
        className="group relative rounded-2xl border border-purple-100/60 bg-white/95 p-4 shadow-[0_18px_40px_rgba(79,70,229,0.08)] transition-all duration-300 hover:border-pink-100/80 hover:shadow-[0_22px_45px_rgba(236,72,153,0.18)] dark:border-purple-900/40 dark:bg-gray-900/80"
      >
        <div className="flex items-center">
          <div className="flex flex-1 items-center gap-3 min-w-0">
            {isAssignment ? (
              <div className={`${indicatorClasses} cursor-default flex-shrink-0`}>
                {todo.completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Briefcase className="w-5 h-5" />
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => toggleTodo(todo.id)}
                className={`${indicatorClasses} flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-purple-500`}
                aria-label="To-Do abhaken"
              >
                {todo.completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-5 h-5 text-purple-400 dark:text-purple-200"
                  >
                    <path
                      fill="currentColor"
                      d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.42,0-8-3.58-8-8 s3.58-8,8-8s8,3.58,8,8S16.42,20,12,20z"
                    />
                  </svg>
                )}
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex flex-col">
                <p
                  className={`text-sm font-semibold text-gray-900 dark:text-gray-100 ${
                    todo.completed ? "opacity-60 line-through" : ""
                  }`}
                >
                  {todo.title}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {todo.due}
                  </span>
                  {isAssignment && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200">
                      <Briefcase className="h-3.5 w-3.5" />
                      Einsatz
                    </span>
                  )}
                  {isDocument && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200">
                      <FileText className="h-3.5 w-3.5" />
                      Dokument
                    </span>
                  )}
                  {isMessage && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Wichtig
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 ml-4">
            <div className="flex items-center gap-2">
              {isDocument && (
                <button
                  type="button"
                  onClick={() => setShowDocumentUploadInfo(true)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-orange-200 bg-orange-50 text-orange-600 transition hover:border-orange-300 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                  aria-label="Hilfe zum Dokumenten-Upload"
                  title="So funktioniert der Upload"
                >
                  <Info className="h-4 w-4" />
                </button>
              )}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${priorityToken.classes}`}
              >
                {priorityToken.label}
              </span>
            </div>
            {isAssignment && (
              <button
                type="button"
                onClick={handleOpenAssignment}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-purple-200 hover:text-purple-500 dark:border-slate-700 dark:text-slate-200 dark:hover:border-purple-500/50"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Zum Einsatz
              </button>
            )}
            {isDocument && (
              <button
                type="button"
                onClick={handleOpenDocumentUpload}
                className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                Zum Upload
              </button>
            )}
          </div>
        </div>
          </li>
        );
      })}
    </ul>
  );

  // Load calendar assignments
  const loadCalendarAssignments = async () => {
    try {
      setAssignmentsLoading(true);
      const res = await fetch('/api/me/calendar-assignments', { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const processedAssignments = (data.assignments || []).map((a: any) => ({
          ...a,
          date: new Date(a.date) // Ensure date is a Date object
        }));
        setAssignments(processedAssignments);
      } else {
        console.error('Failed to load calendar assignments:', res.status);
        setAssignments([]);
      }
    } catch (e) {
      console.error('Error loading calendar assignments:', e);
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Load work status for current week
  const loadWorkStatus = async () => {
    try {
      setWorkStatusLoading(true);
      const res = await fetch('/api/me/work-status', { cache: 'no-store', credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setWorkStatus(data);
      } else {
        console.error('Failed to load work status:', res.status);
      }
    } catch (e) {
      console.error('Error loading work status:', e);
    } finally {
      setWorkStatusLoading(false);
    }
  };

  const formatDateRange = (startDate: Date, endDate: Date): string => {
    const startMonth = startDate.toLocaleDateString('de-DE', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('de-DE', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    if (startMonth === endMonth) {
      return `${startMonth}, ${String(startDay).padStart(2, '0')} - ${String(endDay).padStart(2, '0')}`;
    }
    return `${startMonth} ${String(startDay).padStart(2, '0')} - ${endMonth} ${String(endDay).padStart(2, '0')}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = [];
    let startingDayOfWeek = firstDayOfMonth.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysInMonth.push(null);
    }
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      daysInMonth.push(new Date(year, month, i));
    }
    return daysInMonth;
  };

  const navigateMiniCalendarMonth = (direction: number) => {
    setMiniCalendarDisplayMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  useEffect(() => {
    const handleClickOutsideMiniCalendar = (event: MouseEvent) => {
      if (showMiniCalendar && miniCalendarButtonRef.current && !miniCalendarButtonRef.current.contains(event.target as Node) && miniCalendarPopupRef.current && !miniCalendarPopupRef.current.contains(event.target as Node)) {
        setShowMiniCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideMiniCalendar);
    return () => document.removeEventListener('mousedown', handleClickOutsideMiniCalendar);
  }, [showMiniCalendar]);

  useEffect(() => {
    const handleClickOutsideLegend = (event: MouseEvent) => {
      if (showLegendPopup && legendIconRef.current && !legendIconRef.current.contains(event.target as Node) && legendPopupRef.current && !legendPopupRef.current.contains(event.target as Node)) {
        setShowLegendPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideLegend);
    return () => document.removeEventListener('mousedown', handleClickOutsideLegend);
  }, [showLegendPopup]);

  const handleAddressClick = (address: string) => {
    setSelectedAddress(address);
    setShowMapsModal(true);
  };

  const openInGoogleMaps = () => {
    const encodedAddress = encodeURIComponent(selectedAddress);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
    setShowMapsModal(false);
  };

  const openInAppleMaps = () => {
    const encodedAddress = encodeURIComponent(selectedAddress);
    window.open(`maps://maps.apple.com/?q=${encodedAddress}`, '_blank');
    setShowMapsModal(false);
  };

  const handleEinsatzStart = (assignment: any) => {
    router.push("/promotors/einsatz");
  };

  // Get highest priority assignment type for a given day
  const getHighestPriorityAssignmentType = (date: Date) => {
    const dayAssignments = assignments.filter(a => a.date.toDateString() === date.toDateString());
    
    // Priority order: krankenstand/urlaub first, then promotion/buddy, then schulung
    if (dayAssignments.some(a => a.type === "krankenstand")) return "krankenstand";
    if (dayAssignments.some(a => a.type === "urlaub")) return "urlaub";
    if (dayAssignments.some(a => a.type === "promotion")) return "promotion";
    if (dayAssignments.some(a => a.type === "buddy")) return "buddy";
    if (dayAssignments.some(a => a.type === "schulung")) return "schulung";
    
    return "promotion"; // fallback
  };


  // Load calendar assignments on mount
  useEffect(() => {
    const loadAllData = async () => {
      const startTime = Date.now();
      
      await Promise.all([
        loadCalendarAssignments(),
        loadMessages(),
        loadDocuments(),
        loadTodoHistory(),
        loadWorkStatus()
      ]);
      
      // Ensure minimum loading time to show beautiful skeletons
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 600; // 0.6 seconds
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      setTimeout(() => {
        setTodosLoading(false);
      }, remainingTime);
    };
    
    loadAllData();
    
    // Refresh every 2 minutes to reflect changes
    const iv = setInterval(() => {
      loadCalendarAssignments();
      loadMessages();
      loadDocuments();
      loadTodoHistory();
      loadWorkStatus();
    }, 120000);
    return () => clearInterval(iv);
  }, []);

  // Set initial assignment type based on current date
  useEffect(() => {
    setSelectedAssignmentType(getHighestPriorityAssignmentType(selectedCalendarDate));
  }, [assignments]);

  // Add state for progress bar animations (for Wochenstatus card)
  const [progressBarsVisible, setProgressBarsVisible] = useState(false);
  const progressBarsRef = useRef<HTMLDivElement>(null);

  // Add Intersection Observer for progress bars
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setProgressBarsVisible(true);
          }
        });
      },
      {
        threshold: 0.3, // Trigger when 30% of the element is visible
        rootMargin: '0px 0px -50px 0px' // Trigger slightly before fully visible
      }
    );

    if (progressBarsRef.current) {
      observer.observe(progressBarsRef.current);
    }

    return () => {
      if (progressBarsRef.current) {
        observer.unobserve(progressBarsRef.current);
      }
    };
  }, []);

  return (
    <>
      <section className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{greeting}</h1>
        <p className="text-gray-600 dark:text-gray-400">{animatedSubtitle}</p>
      </section>

      <div className="relative mb-8">
        <div className="absolute inset-0 rounded-[32px] bg-gradient-to-r from-purple-500/25 via-transparent to-pink-500/25 opacity-60 pointer-events-none"></div>
        <Card className="relative overflow-visible rounded-lg border border-purple-100/70 bg-white/95 shadow-[0_25px_60px_rgba(109,40,217,0.15)] dark:border-purple-900/40 dark:bg-gray-900/80">
          <CardHeader className="relative z-20 p-0">
            <div className="relative px-4 py-3 text-white">
              <div className="pointer-events-none absolute inset-0 rounded-t-lg overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500"></div>
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.35),_transparent_60%)]"></div>
              </div>
              <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center shadow-inner">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-white/80">
                      To-Dos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button
                      ref={filterButtonRef}
                      type="button"
                      className="flex items-center gap-2 rounded-md bg-white/20 px-3 py-1.5 text-xs font-semibold text-white shadow-inner hover:bg-white/30 transition-colors border-0 focus:outline-none cursor-pointer"
                      onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    >
                      {todoFilter === "heute" ? "Heute" : todoFilter === "7tage" ? "7 Tage" : "30 Tage"}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {showFilterDropdown && (
                      <div
                        ref={filterDropdownRef}
                        className="absolute top-full right-0 z-50 mt-2 w-44 rounded-2xl border border-purple-100/70 bg-white p-2 text-left shadow-2xl dark:border-purple-900/40 dark:bg-gray-900"
                      >
                        <div className="flex flex-col gap-1">
                          {[
                            { label: "Heute", value: "heute" },
                            { label: "7 Tage", value: "7tage" },
                            { label: "30 Tage", value: "30tage" }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-purple-50/80 dark:text-gray-200 dark:hover:bg-gray-800 ${
                                todoFilter === option.value
                                  ? "bg-purple-50 font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-100"
                                  : ""
                              }`}
                              onClick={() => {
                                setTodoFilter(option.value as TodoFilterRange);
                                setShowFilterDropdown(false);
                              }}
                            >
                              {option.label}
                              {todoFilter === option.value && (
                                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent
            className={`relative z-0 p-0 transition-all duration-500 ${
              sortedTodos.length > 0 ? (expandedTodos ? "max-h-[340px]" : "max-h-[220px]") : ""
            } overflow-hidden`}
          >
            <div className="px-4 py-3 border-b border-purple-50/80 bg-white/90 text-[11px] font-semibold text-gray-600 flex flex-wrap items-center gap-2 justify-between dark:border-purple-900/40 dark:bg-gray-900/70 dark:text-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 text-purple-700 px-2.5 py-0.5 dark:bg-purple-500/15 dark:text-purple-200">
                  {openTodos} offen
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white text-purple-600 px-2.5 py-0.5 shadow-sm dark:bg-gray-800 dark:text-purple-200">
                  {completedTodos} erledigt
                </span>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-purple-100 px-2.5 py-0.5 text-purple-600 dark:border-purple-500/40 dark:text-purple-200">
                {totalTodos} gesamt
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-purple-900/50"></div>
              {todosLoading ? (
                <div className="space-y-3 px-4 py-4">
                  {[...Array(3)].map((_, index) => (
                    <div
                      key={`todo-skeleton-${index}`}
                      className="flex items-center gap-3 rounded-2xl border border-purple-50/80 bg-white/80 p-4 shadow-sm animate-pulse dark:border-purple-900/40 dark:bg-gray-900/60"
                    >
                      <div className="h-11 w-11 rounded-2xl bg-gray-200/70 dark:bg-gray-800" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
                        <div className="h-2.5 w-1/3 rounded bg-gray-100 dark:bg-gray-700" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sortedTodos.length === 0 ? (
                <div className="relative min-h-[180px] px-4 py-8">
                  <div className="flex h-full flex-col items-center justify-center text-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-purple-100 bg-purple-50 text-purple-500 dark:border-purple-900/50 dark:bg-purple-900/30 dark:text-purple-200">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <p className="text-[15px] font-medium text-gray-600 dark:text-gray-300">Alles erledigt – hier gibt&apos;s nix zu tun.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTodoHistory(true)}
                    className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border border-purple-100/60 bg-white/80 text-purple-500 transition hover:border-pink-100 hover:text-pink-500 dark:border-purple-900/40 dark:bg-gray-900/70 dark:text-purple-200"
                  >
                    <History className="h-4 w-4" />
                  </button>
                </div>
              ) : expandedTodos ? (
                <ScrollArea className="h-full max-h-[310px] pr-2">
                  {renderTodoCollection(sortedTodos)}
                </ScrollArea>
              ) : (
                renderTodoCollection(sortedTodos.slice(0, 3))
              )}
            </div>
          </CardContent>
          {sortedTodos.length > 0 && (
            <CardFooter className="border-t border-purple-50/70 bg-gradient-to-r from-purple-50/70 via-white to-pink-50/70 px-5 py-4 dark:border-purple-900/40 dark:from-purple-900/10 dark:via-gray-900/40 dark:to-pink-900/10">
              <div className="mx-auto flex flex-wrap items-center justify-center gap-3 md:gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="inline-flex min-w-[150px] items-center justify-center gap-2 rounded-full border border-purple-100 bg-white/90 px-4 py-2 text-sm font-semibold text-purple-600 shadow-sm hover:bg-white dark:border-purple-900/50 dark:bg-gray-900/60 dark:text-purple-200"
                  onClick={() => setExpandedTodos(!expandedTodos)}
                >
                  {expandedTodos ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Weniger
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Alle anzeigen
                    </>
                  )}
                </Button>
                <button
                  onClick={() => setShowTodoHistory(true)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-100/60 bg-white/80 text-purple-500 transition hover:border-pink-100 hover:text-pink-500 dark:border-purple-900/40 dark:bg-gray-900/70 dark:text-purple-200"
                >
                  <History className="h-4 w-4" />
                </button>
              </div>
            </CardFooter>
          )}
        </Card>
      </div>

      {/* To-Do History Popup */}
      {showTodoHistory && (
        <>
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setShowTodoHistory(false)}></div>
          <div className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute inset-0 rounded-[28px] bg-gradient-to-r from-purple-500/40 via-pink-500/35 to-orange-300/30 blur-3xl"></div>
              <div className="relative flex max-h-[75vh] flex-col overflow-visible rounded-[24px] border border-white/70 bg-white/95 shadow-[0_35px_65px_rgba(15,23,42,0.35)] backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/95 todo-history-popup">
                <div className="relative rounded-t-[24px] bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 px-5 py-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white shadow-inner">
                        <History className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold uppercase tracking-[0.35em] text-white/70">To-Dos</p>
                        <p className="text-lg font-semibold leading-tight">Verlauf</p>
                        <p className="text-sm text-white/85">Erledigte Aufgaben</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setMonthFilterOpen((prev) => !prev)}
                          className="flex items-center gap-1 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/90 transition hover:bg-white/20"
                        >
                          {getSelectedMonthDisplay()}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition ${monthFilterOpen ? "rotate-180" : ""}`}
                          />
                        </button>
                        {monthFilterOpen && (
                          <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-44 rounded-2xl border border-purple-100/70 bg-white p-2 text-left shadow-2xl dark:border-purple-900/40 dark:bg-gray-900">
                            <div className="flex flex-col gap-1">
                              {monthOptions.map((option) => (
                                <button
                                  key={option.key}
                                  type="button"
                                  onClick={() => {
                                    setSelectedMonth(option.key);
                                    setMonthFilterOpen(false);
                                  }}
                                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-purple-50/80 dark:text-gray-200 dark:hover:bg-gray-800 ${
                                    selectedMonth === option.key
                                      ? "bg-purple-50 font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-100"
                                      : ""
                                  }`}
                                >
                                  {option.label}
                                  {selectedMonth === option.key && (
                                    <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowTodoHistory(false)}
                        className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/25"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col overflow-hidden rounded-b-[24px] bg-white px-5 py-5 dark:bg-gray-900">
                  {filteredHistory.length > 0 ? (
                    <div className="space-y-3 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {filteredHistory.map((todo) => {
                        const formattedDate = todo.completedDate.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric"
                        });
                        return (
                          <div
                            key={todo.id}
                            className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700"
                          >
                            <div className="flex-shrink-0">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-green-500">
                                <path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M10,17l-5-5l1.41-1.41L10,14.17l7.59-7.59L19,8L10,17z"/>
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{todo.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {formattedDate}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center text-center py-8">
                      <History className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Alles erledigt – hier gibt&apos;s nix zu tun.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showDocumentUploadInfo && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="document-upload-info-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowDocumentUploadInfo(false);
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl dark:bg-gray-900">
            <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-200">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h2 id="document-upload-info-title" className="text-base font-semibold text-gray-900 dark:text-white">
                    Dokument hochladen
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">So geht es Schritt für Schritt:</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDocumentUploadInfo(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Hinweis schließen"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ol className="space-y-3 px-5 py-5 text-sm text-gray-700 dark:text-gray-200">
              {[
                "Tippe unten auf „Zum Upload“.",
                "Auf deiner Profilseite öffnet sich der Bereich „Dokumente“.",
                "Tippe beim fehlenden Dokument auf das Upload-Symbol.",
                "Wähle ein gut lesbares Foto oder eine PDF-Datei aus.",
                "Nach dem Hochladen wird das Dokument geprüft. Bei einer Ablehnung kannst du es erneut hochladen."
              ].map((step, index) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                    {index + 1}
                  </span>
                  <span className="pt-0.5 leading-5">{step}</span>
                </li>
              ))}
            </ol>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
              <Button variant="outline" onClick={() => setShowDocumentUploadInfo(false)}>
                Schließen
              </Button>
              <Button className="bg-orange-600 text-white hover:bg-orange-700" onClick={handleOpenDocumentUpload}>
                Zum Upload
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}


        {/* Bitte Lesen Cards - Show all normal messages */}
        {messages.filter(msg => msg.message_type === 'normal' && !msg.read_at).map((message) => (
          <div key={message.id} className="w-full max-w-md mx-auto mb-6">
            {bitteLesenConfirmed[message.id] ? (
              /* Danke fürs Lesen Card */
              <Card className="bg-green-50 border-green-200 transform transition-all duration-500">
                <CardContent className="py-4 px-6">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-green-700 font-medium">Danke fürs Lesen!</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Original Bitte Lesen Card */
            <div className="relative">
              {/* Outer glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg blur-sm opacity-75 animate-pulse"></div>
              
              {/* Main card */}
              <Card className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 border-0 shadow-xl overflow-hidden">
                {/* Animated background pattern */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-red-500/20 animate-pulse"></div>
                
              {/* Header */}
                <div className="relative py-3 px-4 text-center">
                  <h3 className="text-white font-bold text-lg drop-shadow-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-white" />
                    Bitte Lesen
                  </h3>
                  <p className="text-white/90 text-sm mt-1 drop-shadow">
                    {message.sender_name ? `Mitteilung von ${message.sender_name}` : 'Wichtige Mitteilung'}
                  </p>
                </div>
                
                {/* Content */}
                <CardContent className="relative p-4 pt-0">
                  <div className="text-center">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 border border-white/20 relative">
                        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
                        <div className="text-white text-sm leading-relaxed text-left relative" style={{ whiteSpace: 'pre-wrap' }}>
                          {message.message_text}
                      </div>
                    </div>
                    
                    {/* Read button */}
                    <button 
                          onClick={async () => {
                            await markMessageAsRead(message.id);
                            setBitteLesenConfirmed(prev => ({ ...prev, [message.id]: true }));
                            
                            // After 7 seconds, remove from state completely
                            setTimeout(() => {
                              setMessages(prev => prev.filter(msg => msg.id !== message.id));
                              setBitteLesenConfirmed(prev => {
                                const newState = { ...prev };
                                delete newState[message.id];
                                return newState;
                              });
                            }, 7000);
                        }}
                        className="bg-white text-orange-600 font-medium py-2 px-4 rounded-lg shadow-md hover:bg-gray-50 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-white/50"
                    >
                      ✓ Gelesen
                    </button>
                  </div>
                </CardContent>
              </Card>
          </div>
        )}
          </div>
        ))}

        {/* Bitte Lesen Card 2 (Zwei-Schritt) - Show confirmation_required messages */}
        {messages.filter(msg => msg.message_type === 'confirmation_required' && !msg.acknowledged_at).map((message) => {
          const currentStep = bitteLesen2Step[message.id] || 'message';
          const currentProgress = bitteLesen2Progress[message.id] || 0;
          const messageFiles = bitteLesen2Files[message.id] || [];
          const isUploading = bitteLesen2Uploading[message.id] || false;
          
          return (
            <div key={message.id} className="w-full max-w-md mx-auto mb-6">
              {bitteLesen2Confirmed[message.id] ? (
                /* Danke fürs Bestätigen Card - Final Step */
                <Card className="bg-green-50 border-green-200 transform transition-all duration-500">
                  <CardContent className="py-4 px-6">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-green-700 font-medium">Danke fürs Bestätigen!</span>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* Two-Step Bitte Lesen (mit Bestätigung) Card */
            <div className="relative">
              {/* Outer glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 rounded-lg blur-sm opacity-60"></div>

              <Card className="relative bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 border-0 shadow-xl overflow-hidden">
                {/* Header */}
                  <div className="relative py-3 px-4 text-center">
                    <h3 className="text-white font-bold text-lg drop-shadow-lg flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 mr-2 text-white" />
                      Bitte Lesen (mit Bestätigung)
                    </h3>
                    <p className="text-white/90 text-sm mt-1 drop-shadow">
                        {message.sender_name ? `Mitteilung von ${message.sender_name}` : 'Zweischrittige Bestätigung erforderlich'}
                    </p>
                  </div>

                    {/* Progress Bar */}
                    <div className="relative px-6 pb-2">
                      <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-500"
                          style={{ width: `${currentProgress}%` }}
                        />
                    </div>
                      <div className="flex justify-between text-xs text-white/80 mt-1">
                        <span>Step 1</span>
                        <span>Step 2</span>
                      </div>
                    </div>

                    <CardContent className="relative p-4 pt-2">
                      {currentStep === 'message' && (
                        /* Step 1: Show message and "Gelesen" button */
                    <div className="text-center">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 border border-white/20 relative">
                        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
                            <div className="text-white text-sm leading-relaxed text-left relative" style={{ whiteSpace: 'pre-wrap' }}>
                              {message.message_text}
                        </div>
                      </div>
                      <button 
                            onClick={() => {
                              setBitteLesen2Step(prev => ({ ...prev, [message.id]: 'upload' }));
                              setBitteLesen2Progress(prev => ({ ...prev, [message.id]: 50 }));
                            }}
                        className="bg-white text-orange-600 font-medium py-2 px-4 rounded-lg shadow-md hover:bg-gray-50 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-white/50"
                      >
                        ✓ Gelesen
                      </button>
                    </div>
                  )}

                      {currentStep === 'upload' && (
                        /* Step 2: File upload interface */
                    <div className="text-center">
                          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 border border-white/20">
                            <p className="text-white text-sm mb-3">Bitte lade deine Dateien hoch:</p>
                            
                            {/* File upload area */}
                            <div className="border-2 border-dashed border-white/30 rounded-lg p-4 bg-white/5">
                            <input 
                              type="file" 
                                id={`file-upload-${message.id}`}
                              className="hidden"
                              multiple
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.bmp,.tiff,.webp"
                              onChange={(e) => {
                                  const files = Array.from(e.target.files || []);
                                  setBitteLesen2Files(prev => ({ 
                                    ...prev, 
                                    [message.id]: [...(prev[message.id] || []), ...files]
                                  }));
                                }}
                              />
                              <button 
                                onClick={() => document.getElementById(`file-upload-${message.id}`)?.click()}
                                className="text-white/80 hover:text-white transition-colors"
                              >
                                <FileText className="h-8 w-8 mx-auto mb-2" />
                                <p className="text-sm">{messageFiles.length === 0 ? 'Dateien auswählen' : 'Weitere Dateien hinzufügen'}</p>
                                <p className="text-xs text-white/60 mt-1">Mehrere Dateien möglich</p>
                              </button>
                        </div>
                            
                            {/* Show selected files */}
                            {messageFiles.length > 0 && (
                              <div className="mt-3 text-left">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="text-white/80 text-xs">
                                    Ausgewählt ({messageFiles.length} {messageFiles.length === 1 ? 'Datei' : 'Dateien'}):
                                  </p>
                                  {messageFiles.length > 1 && (
                                    <button
                                      onClick={() => {
                                        setBitteLesen2Files(prev => ({ ...prev, [message.id]: [] }));
                                      }}
                                      className="text-white/60 hover:text-white text-xs"
                                    >
                                      Alle löschen
                                    </button>
                                  )}
                                </div>
                                <div className="max-h-20 overflow-y-auto">
                                  {messageFiles.map((file, idx) => (
                                    <div key={idx} className="text-white text-xs truncate flex items-center justify-between">
                                      <div className="flex items-center flex-1 min-w-0">
                                        <span className="mr-1">📎</span>
                                        <span className="truncate">{file.name}</span>
                                        <span className="ml-1 text-white/60">({(file.size / 1024 / 1024).toFixed(1)}MB)</span>
                      </div>
                      <button 
                        onClick={() => {
                                          setBitteLesen2Files(prev => ({
                                            ...prev,
                                            [message.id]: prev[message.id]?.filter((_, i) => i !== idx) || []
                                          }));
                                        }}
                                        className="ml-2 text-white/60 hover:text-white text-xs"
                                      >
                                        ✕
                      </button>
                    </div>
                                  ))}
                                    </div>
                                    </div>
                                  )}
                                </div>
                          
                          <button 
                            onClick={async () => {
                              if (messageFiles.length === 0 || isUploading) return;
                              
                              setBitteLesen2Uploading(prev => ({ ...prev, [message.id]: true }));
                              
                              try {
                                console.log('Starting file upload for message:', message.id);
                                console.log('Files to upload:', messageFiles.map(f => f.name));
                                
                                // Initialize Supabase client
                                const supabase = createSupabaseBrowserClient();
                                
                                // Get upload URLs
                                const uploadResponse = await fetch(`/api/me/messages/${message.id}/upload`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    files: messageFiles.map(file => ({
                                      filename: file.name,
                                      size: file.size,
                                      type: file.type
                                    }))
                                  })
                                });

                                console.log('Upload URL response status:', uploadResponse.status);

                                if (!uploadResponse.ok) {
                                  const errorData = await uploadResponse.json();
                                  console.error('Upload URL error:', errorData);
                                  throw new Error(`Failed to get upload URLs: ${errorData.error || 'Unknown error'}`);
                                }

                                const { uploads } = await uploadResponse.json();
                                const uploadedFiles = [];

                                // Upload each file
                                console.log('Upload URLs received:', uploads);
                                for (let i = 0; i < uploads.length; i++) {
                                  const upload = uploads[i];
                                  const file = messageFiles[i];

                                  console.log(`Uploading file ${i + 1}/${uploads.length}:`, file.name);
                                  console.log('Upload URL:', upload.uploadUrl);

                                  // Use Supabase client upload method instead of raw fetch
                                  const { error: uploadError } = await supabase.storage
                                    .from('message-responses')
                                    .uploadToSignedUrl(upload.path, upload.token, file);

                                  if (!uploadError) {
                                    console.log(`✅ File ${file.name} uploaded successfully`);
                                    uploadedFiles.push({
                                      filename: upload.filename,
                                      path: upload.path,
                                      size: file.size
                                    });
                                  } else {
                                    console.error(`❌ File ${file.name} upload failed:`, uploadError);
                                  }
                                }

                                console.log('Successfully uploaded files:', uploadedFiles.length, 'out of', uploads.length);

                                // Confirm uploads in database
                                await fetch(`/api/me/messages/${message.id}/upload`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ uploadedFiles })
                                });

                                // Complete the process
                                await markMessageAsAcknowledged(message.id);
                                setBitteLesen2Progress(prev => ({ ...prev, [message.id]: 100 }));
                                setBitteLesen2Confirmed(prev => ({ ...prev, [message.id]: true }));
                                
                                // After 7 seconds, remove from state completely
                                setTimeout(() => {
                                  setMessages(prev => prev.filter(msg => msg.id !== message.id));
                                  setBitteLesen2Confirmed(prev => {
                                    const newState = { ...prev };
                                    delete newState[message.id];
                                    return newState;
                                  });
                                  setBitteLesen2Step(prev => {
                                    const newState = { ...prev };
                                    delete newState[message.id];
                                    return newState;
                                  });
                                  setBitteLesen2Progress(prev => {
                                    const newState = { ...prev };
                                    delete newState[message.id];
                                    return newState;
                                  });
                                  setBitteLesen2Files(prev => {
                                    const newState = { ...prev };
                                    delete newState[message.id];
                                    return newState;
                                  });
                                }, 7000);

                              } catch (error) {
                                console.error('Error uploading files:', error);
                                alert('Fehler beim Hochladen der Dateien');
                              } finally {
                                setBitteLesen2Uploading(prev => ({ ...prev, [message.id]: false }));
                              }
                            }}
                            disabled={messageFiles.length === 0 || isUploading}
                            className={`font-medium py-2 px-4 rounded-lg shadow-md transform hover:scale-105 transition-all duration-200 border border-white/50 ${
                              messageFiles.length === 0 || isUploading
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                                : 'bg-white text-orange-600 hover:bg-gray-50 hover:shadow-lg'
                            }`}
                          >
                            {isUploading 
                              ? 'Hochladen...' 
                              : messageFiles.length === 0 
                                ? 'Dateien auswählen' 
                                : `✓ Bestätigen (${messageFiles.length} ${messageFiles.length === 1 ? 'Datei' : 'Dateien'})`
                            }
                          </button>
                    </div>
                  )}
                </CardContent>
              </Card>
          </div>
        )}
            </div>
          );
        })}

      {/* Rotating Calendar Component */}
        <Card className="mb-6 overflow-hidden border-none shadow-md bg-white dark:bg-gray-900">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 flex flex-row justify-between items-center">
            <CardTitle className="text-lg flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
                            Terminkalender
            </CardTitle>
            <div className="relative">
              <button 
                ref={miniCalendarButtonRef}
                className="flex items-center text-sm font-medium hover:bg-white/10 p-1 rounded-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                setMiniCalendarDisplayMonth(new Date(currentCalendarDate));
                  setShowMiniCalendar(!showMiniCalendar);
                }}
              >
                <span>
                  {formatDateRange(
                  getCalendarDays()[1],
                  getCalendarDays()[7]
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showMiniCalendar ? 'rotate-180' : ''}`} />
              </button>
              {showMiniCalendar && (
                <div 
                  ref={miniCalendarPopupRef}
                  className="absolute top-full right-0 mt-1.5 w-72 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-xl z-50 p-3"
                onClick={(e) => e.stopPropagation()}
                >
                  {/* Mini Calendar Header */}
                  <div className="flex items-center justify-between mb-2 px-1">
                    <button 
                      onClick={() => navigateMiniCalendarMonth(-1)} 
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">
                      {miniCalendarDisplayMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
                    </span>
                    <button 
                      onClick={() => navigateMiniCalendarMonth(1)} 
                      className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                  {/* Mini Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-1">
                    {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day => <span key={day}>{day}</span>)}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(miniCalendarDisplayMonth).map((day, index) => {
                      let hoverClass = ''
                      if (hoveredMiniCalendarDate && day) {
                        const diff = Math.round((day.getTime() - hoveredMiniCalendarDate.getTime()) / (1000 * 60 * 60 * 24));
                        const absDiff = Math.abs(diff);

                        if (absDiff === 0) {
                        hoverClass = 'bg-indigo-500 text-white dark:bg-indigo-500 dark:text-white';
                        } else if (absDiff === 1) {
                        hoverClass = 'bg-indigo-400 text-white dark:bg-indigo-400 dark:text-white';
                        } else if (absDiff === 2) {
                        hoverClass = 'bg-indigo-300 text-gray-100 dark:bg-indigo-300 dark:text-gray-200';
                        }
                      }

                      return (
                        <button 
                          key={index} 
                          onMouseEnter={() => day && setHoveredMiniCalendarDate(day)}
                          onMouseLeave={() => setHoveredMiniCalendarDate(null)}
                          className={`p-1.5 rounded-md text-sm transition-colors relative
                            ${!day ? 'cursor-default' : ''}
                            ${hoverClass ? hoverClass : 
                              (day && selectedCalendarDate.toDateString() === day.toDateString() ? 'bg-indigo-600 text-white' : 
                                (day && new Date().toDateString() === day.toDateString() ? 'font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/50' : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50')
                              )}
                          `}
                          disabled={!day}
                          onClick={() => {
                            if (day) {
                              const newDate = new Date(day);
                              setCurrentCalendarDate(newDate);
                              setSelectedCalendarDate(newDate);
                              
                              setAnimating(true);
                              setTimeout(() => setAnimating(false), 400);
                              
                              setShowMiniCalendar(false);
                            setHoveredMiniCalendarDate(null);
                            setSelectedAssignmentType(getHighestPriorityAssignmentType(newDate));
                            }
                          }}
                        >
                          {day ? (
                            <>
                              {day.getDate()}
                            {/* Assignment indicators */}
                              <div className="absolute bottom-1 left-0 right-0 flex justify-center space-x-1 px-1">
                                {assignments.some(a => a.date.toDateString() === day.toDateString() && a.type === "promotion") && (
                                  <div className="h-1 w-2/5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600"></div>
                                )}
                                {assignments.some(a => a.date.toDateString() === day.toDateString() && a.type === "buddy") && (
                                  <div className="h-1 w-2/5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                                )}
                                {assignments.some(a => a.date.toDateString() === day.toDateString() && a.type === "schulung") && (
                                  <div className="h-1 w-2/5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500"></div>
                                )}
                                {assignments.some(a => a.date.toDateString() === day.toDateString() && a.type === "urlaub") && (
                                  <div className="h-1 w-2/5 rounded-full bg-gradient-to-r from-emerald-500 to-green-500"></div>
                                )}
                              {assignments.some(a => a.date.toDateString() === day.toDateString() && a.type === "krankenstand") && (
                                <div className="h-1 w-2/5 rounded-full bg-gradient-to-r from-red-500 to-red-600"></div>
                                )}
                              </div>
                            </>
                          ) : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        <CardContent className="p-4 relative">
            {/* Info Icon for Legend */}
            <div className="absolute top-2 left-2 z-10">
            <button
                ref={legendIconRef}
              className="h-7 w-7 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLegendPopup(!showLegendPopup);
                }}
              >
                <Info className="h-4 w-4" />
            </button>
            </div>

            {/* Legend Popup */}
            {showLegendPopup && (
              <div
                ref={legendPopupRef}
              className="absolute top-10 left-2 mt-1 w-auto min-w-[230px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-4"
                onClick={(e) => e.stopPropagation()} 
              >
                <h4 className="text-sm font-semibold mb-3 text-gray-800 dark:text-gray-100">Kalender Legende</h4>
              <ul className="space-y-2 text-xs">
                  <li className="flex items-center">
                    <div className="w-3.5 h-3.5 rounded-full mr-2.5 border border-indigo-600/50 bg-gradient-to-br from-indigo-500/60 to-indigo-600/60 flex-shrink-0 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-300">Promotion / Ausgewählt</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3.5 h-3.5 rounded-full mr-2.5 border border-purple-500/50 bg-gradient-to-br from-purple-500/60 to-pink-500/60 flex-shrink-0 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-300">Buddy Tag</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3.5 h-3.5 rounded-full mr-2.5 border border-orange-500/50 bg-gradient-to-br from-orange-500/60 to-amber-500/60 flex-shrink-0 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-300">Schulung</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3.5 h-3.5 rounded-full mr-2.5 border border-emerald-500/50 bg-gradient-to-br from-emerald-500/60 to-green-500/60 flex-shrink-0 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-300">Urlaub</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3.5 h-3.5 rounded-full mr-2.5 border border-red-500/50 bg-gradient-to-br from-red-500/60 to-red-600/60 flex-shrink-0 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-300">Krankenstand</span>
                  </li>
                  <li className="flex items-center">
                    <div className="w-3.5 h-3.5 rounded-full mr-2.5 border border-indigo-400/50 bg-indigo-100 dark:bg-indigo-800/50 flex-shrink-0 shadow-sm"></div>
                    <span className="text-gray-700 dark:text-gray-300">Heute (ohne Einsatz)</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Calendar Carousel Row */}
          <div className="relative mb-0 py-2">
              <div className="w-full max-w-md mx-auto relative h-24">
                <div className="w-full h-full relative">
                  {assignmentsLoading ? (
                    // Loading Skeletons for calendar days
                    [...Array(9)].map((_, i) => {
                      const visibleIndex = i - 1;
                      const distanceFromCenter = Math.abs(visibleIndex - 3);
                      const isOffscreen = visibleIndex < 0 || visibleIndex > 6;
                      
                      const scale = isOffscreen ? 0 : 1 - (distanceFromCenter * 0.15);
                      const translateX = (visibleIndex - 3) * 72;
                      const opacity = isOffscreen ? 0 : 1 - (distanceFromCenter * 0.2);
                      
                      return (
                        <div
                          key={`skeleton-day-${i}`}
                          className="absolute flex flex-col items-center justify-center rounded-lg transition-all duration-300 ease-in-out"
                          style={{
                            width: '64px',
                            height: '80px',
                            top: '50%',
                            left: '50%',
                            transform: `translateX(calc(-50% + ${translateX}px)) translateY(-50%) scale(${scale})`,
                            opacity,
                            zIndex: 10 - distanceFromCenter,
                          }}
                        >
                          <div className="w-full h-full bg-gray-100 rounded-lg animate-skeleton-fade p-2 flex flex-col items-center justify-center">
                            <div className="h-3 bg-gray-200 rounded w-8 mb-2 animate-skeleton-fade"></div>
                            <div className="h-6 bg-gray-200 rounded w-10 animate-skeleton-fade"></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    getCalendarDays().map((day, i) => {
                  const visibleIndex = i - 1;
                  const isCenter = visibleIndex === 3;
                    const distanceFromCenter = Math.abs(visibleIndex - 3);
                    const isSelected = selectedCalendarDate.toDateString() === day.toDateString();
                    const isToday = new Date().toDateString() === day.toDateString();
                    const isOffscreen = visibleIndex < 0 || visibleIndex > 6;
                    
                    const hasAssignment = assignments.some(a => a.date.toDateString() === day.toDateString());
                  const hasPromotion = assignments.some(a => 
                    a.date.toDateString() === day.toDateString() && a.type === "promotion"
                  );
                    const hasBuddyTag = assignments.some(a => 
                      a.date.toDateString() === day.toDateString() && a.type === "buddy"
                    );
                  const hasKrankenstand = assignments.some(a => 
                    a.date.toDateString() === day.toDateString() && a.type === "krankenstand"
                  );
                  const hasUrlaub = assignments.some(a => 
                    a.date.toDateString() === day.toDateString() && a.type === "urlaub"
                  );
                  const hasSchulung = assignments.some(a => 
                    a.date.toDateString() === day.toDateString() && a.type === "schulung"
                  );
                  
                  let dynamicClasses = '';
                    if (isSelected) {
                    dynamicClasses = 'text-black border-indigo-700';
                  } else if (hasPromotion) {
                    // Promotion has highest visual priority - always show blue gradient
                    dynamicClasses = 'border-blue-500';
                    if (isToday) {
                      dynamicClasses += ' bg-indigo-100 dark:bg-indigo-800/50';
                    } else {
                      dynamicClasses += ' hover:bg-indigo-50 dark:hover:bg-indigo-900/50';
                    }
                    } else if (hasBuddyTag) {
                    // Buddy tag has second highest visual priority - also work-related
                    dynamicClasses = 'border-purple-500';
                      if (isToday) {
                      dynamicClasses += ' bg-purple-100 dark:bg-purple-800/50';
                      } else {
                      dynamicClasses += ' hover:bg-purple-50 dark:hover:bg-purple-900/50';
                      }
                  } else if (hasKrankenstand) {
                    dynamicClasses = 'border-red-500';
                      if (isToday) {
                      dynamicClasses += ' bg-red-100 dark:bg-red-800/50';
                      } else {
                      dynamicClasses += ' hover:bg-red-50 dark:hover:bg-red-900/50';
                      }
                  } else if (hasUrlaub) {
                    dynamicClasses = 'border-green-500';
                      if (isToday) {
                      dynamicClasses += ' bg-green-100 dark:bg-green-800/50';
                      } else {
                      dynamicClasses += ' hover:bg-green-50 dark:hover:bg-green-900/50';
                    }
                  } else if (hasSchulung) {
                    dynamicClasses = 'border-orange-500';
                    if (isToday) {
                      dynamicClasses += ' bg-orange-100 dark:bg-orange-800/50';
                    } else {
                      dynamicClasses += ' hover:bg-orange-50 dark:hover:bg-orange-900/50';
                      }
                    } else if (hasAssignment) {
                    dynamicClasses = 'border-blue-500';
                      if (isToday) {
                      dynamicClasses += ' bg-indigo-100 dark:bg-indigo-800/50';
                      } else {
                      dynamicClasses += ' hover:bg-indigo-50 dark:hover:bg-indigo-900/50';
                      }
                    } else if (isToday) {
                    dynamicClasses = 'bg-indigo-100 dark:bg-indigo-800/50 border-indigo-400';
                    } else {
                      dynamicClasses = 'border-gray-300 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/50';
                    }

                    const scale = isOffscreen ? 0.4 : 1 - (distanceFromCenter * 0.15);
                    const opacity = isOffscreen ? 0 : 1 - (distanceFromCenter * 0.15);
                    const zIndex = isOffscreen ? 0 : 10 - distanceFromCenter;
                    
                    let leftPosition;
                    if (visibleIndex < 0) {
                    leftPosition = '-15%';
                    } else if (visibleIndex > 6) {
                    leftPosition = '115%';
                    } else {
                      leftPosition = `${50 + (visibleIndex - 3) * 20}%`;
                    }
                    
                    return (
                      <div 
                        key={day.toISOString()}
                        className="absolute transform transition-all duration-400 ease-in-out"
                        style={{
                          left: leftPosition,
                          top: '50%',
                          transform: `translate(-50%, -50%) scale(${scale})`,
                          opacity: opacity,
                          zIndex: zIndex,
                          transition: "all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1.0)"
                        }}
                      >
                      <button
                          className={`flex flex-col h-auto py-2 px-4 w-16 items-center justify-center overflow-hidden
                            ${isCenter ? 'border-2' : 'border'}
                          ${!isSelected ? dynamicClasses : (hasPromotion ? 'border-indigo-700' : hasBuddyTag ? 'border-purple-500' : hasKrankenstand ? 'border-red-500' : hasUrlaub ? 'border-green-500' : hasSchulung ? 'border-orange-500' : hasAssignment ? 'border-indigo-700' : 'border-indigo-700')}
                          bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow
                          `}
                          style={isSelected ? 
                          (hasPromotion ? {
                            background: 'linear-gradient(to bottom, rgb(59,130,246), rgb(79,70,229))'
                          } : hasBuddyTag ? {
                              background: 'linear-gradient(to bottom, rgba(168,85,247,0.9), rgba(219,39,119,0.55))'
                          } : hasKrankenstand ? {
                            background: 'linear-gradient(to bottom, rgba(239,68,68,0.9), rgba(185,28,28,0.8))'
                          } : hasUrlaub ? {
                            background: 'linear-gradient(to bottom, rgba(34,197,94,0.9), rgba(21,128,61,0.8))'
                          } : hasSchulung ? {
                            background: 'linear-gradient(to bottom, rgba(249,115,22,0.9), rgba(194,65,12,0.8))'
                            } : hasAssignment ? {
                              background: 'linear-gradient(to bottom, rgb(59,130,246), rgb(79,70,229))'
                          } : {}) 
                          : {}}
                          onClick={() => {
                            const stepsToShift = Math.round((day.getTime() - currentCalendarDate.getTime()) / (1000 * 60 * 60 * 24));
                            navigateDays(stepsToShift);
          setSelectedAssignmentType(getHighestPriorityAssignmentType(day));
                          }}
                          disabled={animating}
                        >
                          {isSelected ? (
                            <div className="flex flex-col items-center w-full">
                            <span className={`text-xs font-medium mb-1 ${hasKrankenstand || hasUrlaub || hasSchulung || hasBuddyTag || hasAssignment ? 'text-white' : 'text-gray-700'}`}>
                                {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                              </span>
                            <span className={`text-xl font-bold ${hasKrankenstand || hasUrlaub || hasSchulung || hasBuddyTag || hasAssignment ? 'text-white' : 'text-gray-800'}`}>
                                {day.getDate()}
                              </span>
                            </div>
                          ) : (
                            <>
                              <span className="text-xs font-medium mb-1">
                                {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                              </span>
                              <span className="text-xl font-bold">
                                {day.getDate()}
                              </span>
                            </>
                          )}
                      </button>
                  </div>
                    );
                  })
                  )}
                </div>
              </div>
            </div>

          {/* Assignment Type Tabs */}
          <div className="mb-3 -mt-1">
            {assignmentsLoading ? (
              // Loading skeleton for tabs
              <div className="flex justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                {[...Array(3)].map((_, i) => (
                  <div key={`tab-skeleton-${i}`} className="px-3 py-1.5 rounded-md flex items-center">
                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mr-2 animate-skeleton-fade"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-skeleton-fade"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`flex justify-between bg-gray-100 dark:bg-gray-800 rounded-lg p-1 relative ${
                assignments.some(a => a.date.toDateString() === selectedCalendarDate.toDateString() && (a.type === "krankenstand" || a.type === "urlaub")) 
                  ? 'opacity-40' : ''
              }`}>
              {/* Sliding indicator */}
              <div 
                className="absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-md shadow-sm transition-all duration-300 ease-in-out"
                                  style={{
                    width: selectedAssignmentType === "buddy" ? 'calc(25% - 4px)' : 'calc(33.333% - 8px)',
                    left: selectedAssignmentType === "promotion" ? '4px' : 
                          selectedAssignmentType === "schulung" ? '53%' : 
                          'calc(100% - 25% - 2px)',
                    transform: selectedAssignmentType === "schulung" ? 'translateX(-50%)' : 'translateX(0)'
                  }}
              />
              <button
                onClick={() => {
                  const promotionAssignments = assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "promotion");
                  if (promotionAssignments.length > 0) setSelectedAssignmentType("promotion");
                }}
                disabled={assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "promotion").length === 0}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center relative z-10 ${
                  selectedAssignmentType === "promotion"
                    ? "text-gray-900 dark:text-gray-100"
                    : assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "promotion").length > 0
                    ? "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    : "text-gray-400 dark:text-gray-600 opacity-30 cursor-not-allowed"
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "promotion").length > 0
                    ? "bg-blue-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}></div>
                Promotion
                {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "promotion").length > 0 && selectedAssignmentType !== "promotion" && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">
                      {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "promotion").length}
                              </span>
                        </div>
                )}
              </button>
              <button
                onClick={() => {
                  const schulungAssignments = assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "schulung");
                  if (schulungAssignments.length > 0) setSelectedAssignmentType("schulung");
                }}
                disabled={assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "schulung").length === 0}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center relative z-10 ${
                  selectedAssignmentType === "schulung"
                    ? "text-gray-900 dark:text-gray-100"
                    : assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "schulung").length > 0
                    ? "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    : "text-gray-400 dark:text-gray-600 opacity-30 cursor-not-allowed"
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "schulung").length > 0
                    ? "bg-orange-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}></div>
                Schulung
                {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "schulung").length > 0 && selectedAssignmentType !== "schulung" && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">
                      {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "schulung").length}
                          </span>
                  </div>
                )}
              </button>
              <button
                onClick={() => {
                  const buddyAssignments = assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "buddy");
                  if (buddyAssignments.length > 0) setSelectedAssignmentType("buddy");
                }}
                disabled={assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "buddy").length === 0}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center relative z-10 ${
                  selectedAssignmentType === "buddy"
                    ? "text-gray-900 dark:text-gray-100"
                    : assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "buddy").length > 0
                    ? "text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    : "text-gray-400 dark:text-gray-600 opacity-30 cursor-not-allowed"
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "buddy").length > 0
                    ? "bg-purple-500"
                    : "bg-gray-300 dark:bg-gray-600"
                }`}></div>
                Buddy
                {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "buddy").length > 0 && selectedAssignmentType !== "buddy" && (
                  <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">
                      {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "buddy").length}
                        </span>
                      </div>
                )}
              </button>
                      </div>
            )}
                  </div>

          {/* Assignment display for selected day */}
          <div className="h-[90px] min-h-[90px]">
            {assignmentsLoading ? (
              // Loading Skeleton for assignment display
              <div className="h-full p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 animate-skeleton-fade">
                <div className="flex items-center justify-between h-full">
                  <div className="flex-1 min-w-0">
                    <div className="relative pl-3">
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-sm bg-gray-200 animate-skeleton-fade"></span>
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-skeleton-fade"></div>
                      <div className="h-3 bg-gray-100 rounded w-1/2 animate-skeleton-fade"></div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center space-y-1">
                    <div className="h-6 bg-gray-200 rounded-full w-20 animate-skeleton-fade"></div>
                  </div>
                </div>
              </div>
            ) : assignments
              .filter(a => a.date.toDateString() === selectedCalendarDate.toDateString())
              .filter(a => a.type === selectedAssignmentType)
              .slice(0, 1)
              .map((assignment) => {
                if (assignment.type === "urlaub") {
                  return (
                    <div 
                      key={assignment.id} 
                      className="h-full p-3 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/20 flex items-center justify-center"
                    >
                  <p className="flex items-center">
                    <span className="text-xl">🌴</span>
                    <span className="text-xl">🍹</span>
                    <span className="mx-4 text-base font-semibold text-gray-800 dark:text-gray-200">Urlaub</span>
                    <span className="text-xl">⛱️</span>
                    <span className="text-xl">✈️</span>
                  </p>
                </div>
                  );
                }
                
                if (assignment.type === "krankenstand") {
                  return (
                    <div 
                      key={assignment.id} 
                      className="h-full p-3 rounded-md border border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/20 flex items-center justify-center"
                    >
                      <p className="flex items-center">
                        <span className="text-xl mr-3">🤒</span>
                        <span className="text-base font-semibold text-gray-800 dark:text-gray-200">Krankenstand</span>
                      </p>
                    </div>
                  );
                }
                
                if (assignment.type === "schulung") {
                  return (
                    <div 
                      key={assignment.id} 
                      className="h-full p-3 rounded-md border border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/20 flex items-center justify-between"
                    >
                  <div className="flex-1 min-w-0">
                    <div className="relative pl-3">
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-sm bg-gradient-to-b from-orange-500 to-amber-500"></span>
                          <p className="text-sm font-medium truncate">{assignment.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center cursor-pointer hover:text-blue-600 transition-colors truncate"
                             onClick={() => handleAddressClick(assignment.location)}>
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{assignment.location}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-center space-y-1">
                        <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-sm whitespace-nowrap rounded-full">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1.5 opacity-90" />
                            {assignment.time}
                      </span>
                  </div>
                </div>
            </div>
                  );
                }
                
                if (assignment.type === "buddy") {
                  return (
                    <div 
                      key={assignment.id} 
                      className="h-full p-3 rounded-md border border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="relative pl-3">
                          <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-sm bg-gradient-to-b from-purple-500 to-pink-500"></span>
                          <p className="text-sm font-medium truncate">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center cursor-pointer hover:text-blue-600 transition-colors truncate"
                             onClick={() => handleAddressClick(assignment.location)}>
                            <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                            <span className="truncate">{assignment.location}</span>
                          </p>
          </div>
            </div>
                      <div className="flex flex-col items-end h-full py-1 justify-center space-y-1">
                        <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-sm whitespace-nowrap rounded-full">
                          <span className="flex items-center">Buddy: {assignment.buddyName || 'Partner'}</span>
          </div>
                        <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-sm whitespace-nowrap rounded-full">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1.5 opacity-90" />
                            {assignment.time}
                          </span>
        </div>
                        {!assignments.some(a => a.date.toDateString() === selectedCalendarDate.toDateString() && (a.type === "krankenstand" || a.type === "urlaub")) && 
                         selectedCalendarDate.toDateString() === new Date().toDateString() && (
                          <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-sm whitespace-nowrap rounded-full cursor-pointer"
                            onClick={() => handleEinsatzStart(assignment)}
                          >
                            <span className="flex items-center">
                              Einsatz starten
                              <ChevronRight className="h-3 w-3 ml-1 opacity-90" />
                            </span>
                </div>
                        )}
                </div>
              </div>
                  );
                }
                
                // Default case for promotion
                return (
                  <div 
                    key={assignment.id} 
                    className="h-full p-3 rounded-md border border-blue-300 dark:border-blue-700 bg-blue-50/50 dark:bg-blue-900/20 flex items-center justify-between"
                  >
              <div className="flex-1 min-w-0">
                      <div className="relative pl-3">
                        <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-sm bg-gradient-to-b from-blue-400 to-indigo-600"></span>
                        <p className="text-sm font-medium truncate">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center cursor-pointer hover:text-blue-600 transition-colors truncate"
                           onClick={() => handleAddressClick(assignment.location)}>
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{assignment.location}</span>
                        </p>
                        <div className="mt-1.5">
                          <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-sm whitespace-nowrap rounded-full inline-block">
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1.5 opacity-90" />
                              {assignment.time}
                            </span>
                </div>
                </div>
              </div>
                </div>
                    <div className="flex flex-col items-end h-full py-1 justify-end space-y-0">
                                              {!assignments.some(a => a.date.toDateString() === selectedCalendarDate.toDateString() && (a.type === "krankenstand" || a.type === "urlaub")) && (
                          selectedCalendarDate.toDateString() === new Date().toDateString() && (
                          <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-sm whitespace-nowrap rounded-full cursor-pointer"
                            onClick={() => handleEinsatzStart(assignment)}
                            style={{ marginTop: '5px' }}
                          >
                            <span className="flex items-center">
                              Einsatz starten
                              <ChevronRight className="h-3 w-3 ml-1 opacity-90" />
                            </span>
                </div>
                          )
                        )}
              </div>
                  </div>
                );
              })}
            {!assignmentsLoading && assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString()).filter(a => a.type === selectedAssignmentType).length === 0 && (
              <div className="h-full p-3 rounded-md border dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 opacity-70" />
                  Keine Einsätze für diesen Tag geplant.
                </p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>

      {/* Schulungen & Videos Button */}
      <div className="mb-6 relative">
      <button 
          className="w-full py-6 px-4 bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 text-white rounded-lg shadow-md transition-all duration-200 flex items-center justify-center space-x-3"
        >
          <GraduationCap className="h-6 w-6" />
          <span className="text-lg font-medium">Schulungen & Videos</span>
            </button>
            
            {/* Dark Overlay with "kommt bald!" */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/40 via-gray-900/50 to-black/40 dark:from-black/50 dark:via-gray-950/60 dark:to-black/50 rounded-lg flex items-center justify-center pointer-events-none z-10 backdrop-blur-[2px]">
              <div className="relative">
                {/* Glow effect behind the box */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-pink-500/30 blur-xl rounded-lg scale-110"></div>
                
                {/* Main "kommt bald!" box - clear and sharp, no blur */}
                <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1.5 rounded-lg shadow-2xl">
                  <span className="text-white text-xs font-semibold tracking-wide">kommt bald!</span>
                </div>
              </div>
            </div>
          </div>
          
      <Card className="mb-6 overflow-hidden border-none shadow-md bg-white dark:bg-gray-900" ref={progressBarsRef}>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Wochenstatus</CardTitle>
            <CardDescription>Deine Aktivitäten diese Woche</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">Arbeitsstunden</span>
                  {workStatusLoading ? (
                    <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                  ) : (
                    <span className={`text-sm font-medium ${workStatus.workedHours > workStatus.goalHours ? 'text-green-600' : ''}`}>
                      {`${workStatus.workedHours}h/${workStatus.goalHours}h`}
                    </span>
                  )}
                </div>
                <div className="h-2 w-full bg-blue-100 dark:bg-blue-950/30 rounded-full overflow-hidden">
                  {workStatusLoading ? (
                    <div className="h-full w-full bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-full animate-pulse"></div>
                  ) : (
                    <div 
                      className="h-full bg-gradient-to-r from-blue-300 to-blue-600 rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: progressBarsVisible ? `${Math.min(workStatus.percentage, 100)}%` : '0%' }}
                    ></div>
                  )}
                </div>
              </div>
              <div><div className="flex items-center justify-between mb-1"><span className="text-sm">Erledigte Aufgaben</span><span className="text-sm font-medium">7/12</span></div><div className="h-2 w-full bg-blue-100 dark:bg-blue-950/30 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-300 to-blue-600 rounded-full transition-all duration-1000 ease-out delay-200" style={{ width: progressBarsVisible ? '58%' : '0%' }}></div></div></div>
              <div><div className="flex items-center justify-between mb-1"><span className="text-sm">Schulungen</span><span className="text-sm font-medium">1/2</span></div><div className="h-2 w-full bg-blue-100 dark:bg-blue-950/30 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-300 to-blue-600 rounded-full transition-all duration-1000 ease-out delay-400" style={{ width: progressBarsVisible ? '50%' : '0%' }}></div></div></div>
                  </div>
                  </CardContent>
                </Card>

      {showMapsModal && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={() => setShowMapsModal(false)}></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl z-50 p-4 w-72">
            <h3 className="text-lg font-medium mb-3">Wegbeschreibung zu</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{selectedAddress}</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={openInGoogleMaps} className="flex items-center justify-center py-2.5 px-4 bg-white border border-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                <img src="/icons/google-maps-icon.svg" alt="Google Maps" width={20} height={20} className="mr-2.5"/>
                <span className="font-medium text-sm">Google Maps</span>
              </button>
              <button onClick={openInAppleMaps} className="flex items-center justify-center py-2.5 px-4 bg-white border border-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                <img src="/icons/apple-maps-icon.svg" alt="Apple Maps" width={20} height={20} className="mr-2.5"/>
                <span className="font-medium text-sm">Apple Maps</span>
              </button>
            </div>
            <button onClick={() => setShowMapsModal(false)} className="w-full mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm">Abbrechen</button>
          </div>
        </>
      )}


      {/* Onboarding Modal removed - only available from landing page */}

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-1px) rotate(-0.5deg); }
          50% { transform: translateX(1px) rotate(0.5deg); }
          75% { transform: translateX(-0.5px) rotate(-0.25deg); }
        }
        .animate-skeleton-fade {
          animation: skeleton-fade 0.7s ease-in-out infinite alternate;
        }
        @keyframes skeleton-fade {
          0% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </>
  );
}
