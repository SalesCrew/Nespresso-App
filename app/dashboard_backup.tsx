"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import OnboardingModal from "@/components/OnboardingModal";
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
  MapPin, // For assignment location
  // Film, // Replaced by VideoIcon for quick action
  GraduationCap, // For combined Schulungen & Videos quick action
  Video as VideoIcon, // For Videos quick action
  MessagesSquare as MessagesSquareIcon, // For Chat quick action
  Briefcase, // For "Terminkalender" card title icon
  History, // For To-Dos history
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

export default function DashboardPage() {
  const [expandedTodos, setExpandedTodos] = useState(false);
  const [todoFilter, setTodoFilter] = useState("heute");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showTodoHistory, setShowTodoHistory] = useState(false);
  const [monthFilterOpen, setMonthFilterOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  
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
  const [bitteLesenConfirmed, setBitteLesenConfirmed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [showTodoSpotlight, setShowTodoSpotlight] = useState(false);
  const [selectedAssignmentType, setSelectedAssignmentType] = useState<string>("promotion");

  const [showLegendPopup, setShowLegendPopup] = useState(false);
  const legendIconRef = useRef<HTMLButtonElement>(null);
  const legendPopupRef = useRef<HTMLDivElement>(null);

  const dropdownButtonRef = useRef<HTMLButtonElement>(null);
  const filterDropdownPopupRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fullSubtitle = "Hier ist dein Überblick für heute.";
  const [animatedSubtitle, setAnimatedSubtitle] = useState(fullSubtitle.split('').map(() => '\u00A0').join('')); 
  const [greeting, setGreeting] = useState("");

  // Add state for progress bar animations
  const [progressBarsVisible, setProgressBarsVisible] = useState(false);
  const progressBarsRef = useRef<HTMLDivElement>(null);

  const router = useRouter();

  // Mock history data for To-Dos
  const [todoHistory] = useState(() => {
    const history = [];
    const today = new Date();
    
    // Generate completed todos from the past 6 months
    const historyTodos = [
      // This month
      { title: "VTC für Promotion #4582 ausfüllen", completedDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), priority: "high" },
      { title: "Monatsabschluss Meeting vorbereiten", completedDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), priority: "medium" },
      { title: "Schulungsunterlagen durchlesen", completedDate: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000), priority: "low" },
      
      // Last month
      { title: "VTC für Promotion #4580 ausfüllen", completedDate: new Date(today.getFullYear(), today.getMonth() - 1, 28), priority: "high" },
      { title: "Equipment für Woche 22 anfordern", completedDate: new Date(today.getFullYear(), today.getMonth() - 1, 25), priority: "medium" },
      { title: "Wochenbericht schreiben", completedDate: new Date(today.getFullYear(), today.getMonth() - 1, 20), priority: "high" },
      { title: "Teammeeting teilnehmen", completedDate: new Date(today.getFullYear(), today.getMonth() - 1, 15), priority: "medium" },
      
      // 2 months ago
      { title: "VTC für Promotion #4575 ausfüllen", completedDate: new Date(today.getFullYear(), today.getMonth() - 2, 28), priority: "high" },
      { title: "Neue Produktschulung abschließen", completedDate: new Date(today.getFullYear(), today.getMonth() - 2, 22), priority: "low" },
      { title: "Reisekostenabrechnung einreichen", completedDate: new Date(today.getFullYear(), today.getMonth() - 2, 18), priority: "medium" },
      { title: "Feedback Gespräch führen", completedDate: new Date(today.getFullYear(), today.getMonth() - 2, 10), priority: "medium" },
      
      // 3 months ago
      { title: "VTC für Promotion #4570 ausfüllen", completedDate: new Date(today.getFullYear(), today.getMonth() - 3, 25), priority: "high" },
      { title: "Quartalsbericht erstellen", completedDate: new Date(today.getFullYear(), today.getMonth() - 3, 20), priority: "high" },
      { title: "Schulung Produktkenntnisse", completedDate: new Date(today.getFullYear(), today.getMonth() - 3, 12), priority: "medium" },
      
      // 4 months ago
      { title: "VTC für Promotion #4565 ausfüllen", completedDate: new Date(today.getFullYear(), today.getMonth() - 4, 28), priority: "high" },
      { title: "Equipment Check durchführen", completedDate: new Date(today.getFullYear(), today.getMonth() - 4, 15), priority: "low" },
      
      // 5 months ago
      { title: "VTC für Promotion #4560 ausfüllen", completedDate: new Date(today.getFullYear(), today.getMonth() - 5, 25), priority: "high" },
      { title: "Kundenfeedback auswerten", completedDate: new Date(today.getFullYear(), today.getMonth() - 5, 18), priority: "medium" },
    ];
    
    return historyTodos.map((todo, index) => ({
      id: 1000 + index,
      ...todo,
      completed: true
    }));
  });

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
    const currentHour = new Date().getHours();
    let newGreeting = "";
    if (currentHour >= 5 && currentHour < 12) {
      newGreeting = "Guten Morgen, Jan";
    } else if (currentHour >= 12 && currentHour < 18) {
      newGreeting = "Guten Tag, Jan";
    } else if (currentHour >= 18 && currentHour < 22) {
      newGreeting = "Guten Abend, Jan";
    } else {
      newGreeting = "Gute Nacht, Jan";
    }
    setGreeting(newGreeting);
  }, []);

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

  useEffect(() => {
    const handleClickOutsideFilter = (event: MouseEvent) => {
      if (
        showFilterDropdown &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node) &&
        filterDropdownPopupRef.current &&
        !filterDropdownPopupRef.current.contains(event.target as Node)
      ) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutsideFilter);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideFilter);
    };
  }, [showFilterDropdown]);

  const [todos, setTodos] = useState([
    { id: 1, title: "Buddy-Partner auswählen", priority: "high", due: "Heute, 09:00", completed: false, timeframe: "heute" },
    { id: 2, title: "Wichtige Mitteilung lesen", priority: "high", due: "Heute, 10:00", completed: false, timeframe: "heute" },
    { id: 3, title: "Online Schulung 'Produktkenntnisse' absolvieren", priority: "medium", due: "Heute, 14:00", completed: false, timeframe: "heute" },
    { id: 4, title: "CA KPI Feedback durchlesen", priority: "medium", due: "Heute, 18:00", completed: true, timeframe: "heute" },
    { id: 5, title: "Promotion Mediamarkt Seiersberg vorbereiten", priority: "high", due: "Morgen", completed: false, timeframe: "7tage" },
    { id: 6, title: "Mystery Shopping Feedback auswerten", priority: "medium", due: "Übermorgen", completed: false, timeframe: "7tage" },
    { id: 7, title: "Krankenbestätigung an HR schicken", priority: "high", due: "In 3 Tagen", completed: false, timeframe: "7tage" },
    { id: 8, title: "Schulung 'Kundenberatung' vor Ort Wien", priority: "medium", due: "In 5 Tagen", completed: false, timeframe: "7tage" },
    { id: 9, title: "Fehlende Dokumente für Profil einreichen", priority: "medium", due: "In 6 Tagen", completed: false, timeframe: "7tage" },
    { id: 10, title: "Promotion Saturn City Park abschließen", priority: "high", due: "In 12 Tagen", completed: false, timeframe: "30tage" },
    { id: 11, title: "Neues CA KPI Feedback vom Team Lead lesen", priority: "medium", due: "In 15 Tagen", completed: false, timeframe: "30tage" },
    { id: 12, title: "Online Schulung 'Verkaufstechniken' beginnen", priority: "low", due: "In 20 Tagen", completed: false, timeframe: "30tage" },
    { id: 13, title: "Mystery Shopping Bericht Q2 durchgehen", priority: "medium", due: "In 25 Tagen", completed: false, timeframe: "30tage" },
    { id: 14, title: "Buddy-Feedback für neuen Mitarbeiter geben", priority: "low", due: "In 28 Tagen", completed: false, timeframe: "30tage" },
  ]);

  const filteredTodos = todos.filter(todo => {
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
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const completedTodos = sortedTodos.filter(todo => todo.completed).length;
  const totalTodos = sortedTodos.length;
  const completionPercentage = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

  const toggleTodo = (id: number) => {
    setTodos(todos.map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const [assignments, setAssignments] = useState([
    { id: 1, title: "Mediamarkt, Seiersberg", location: "Wien, Mariahilferstraße", time: "10:00 - 18:00", date: new Date(), type: "promotion" },
    { id: 10, title: "Produktschulung Smartphones", location: "Online Meetingraum", time: "19:00 - 20:30", date: new Date(), type: "schulung" },
    { id: 2, title: "Mediamarkt, Klagenfurt", location: "Klagenfurt, Völkermarkter Straße", time: "09:00 - 17:30", date: new Date(new Date().setDate(new Date().getDate() + 1)), type: "buddy" },
    { id: 11, title: "Verkaufstechniken Basics", location: "Online Meetingraum", time: "18:30 - 20:00", date: new Date(new Date().setDate(new Date().getDate() + 1)), type: "schulung" },
    { id: 3, title: "Android Pro Schulung", location: "Online Meetingraum", time: "13:00 - 17:00", date: new Date(new Date().setDate(new Date().getDate() + 3)), type: "schulung" },
    { id: 4, title: "🤒 Krankenstand", location: "", time: "", date: new Date(new Date().setDate(new Date().getDate() + 5)), type: "krankenstand" },
    { id: 12, title: "Mediamarkt, Graz", location: "Graz, Annenstraße", time: "10:00 - 18:00", date: new Date(new Date().setDate(new Date().getDate() + 5)), type: "promotion" },
    { id: 5, title: "🤒 Krankenstand", location: "", time: "", date: new Date(new Date().setDate(new Date().getDate() + 6)), type: "krankenstand" },
    { id: 6, title: "🏖️ Urlaub", location: "", time: "", date: new Date(new Date().setDate(new Date().getDate() + 8)), type: "urlaub" },
    { id: 8, title: "🏖️ Urlaub", location: "", time: "", date: new Date(new Date().setDate(new Date().getDate() + 9)), type: "urlaub" },
    { id: 9, title: "🏖️ Urlaub", location: "", time: "", date: new Date(new Date().setDate(new Date().getDate() + 10)), type: "urlaub" },
    { id: 7, title: "Newcomer Schulung", location: "Online Meetingraum", time: "14:00 - 18:00", date: new Date(new Date().setDate(new Date().getDate() + 20)), type: "schulung" },
  ]);

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
    router.push("/einsatz");
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

  const handleOnboardingComplete = (data: any) => {
    setShowOnboarding(false);
    // Show spotlight on To-Do list
    setShowTodoSpotlight(true);
    setTimeout(() => {
      setShowTodoSpotlight(false);
    }, 3000);
    // Here you would typically save the data to your backend
  };

  // Set initial assignment type based on current date
  useEffect(() => {
    setSelectedAssignmentType(getHighestPriorityAssignmentType(selectedCalendarDate));
  }, []);

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

      <Card className={`mb-6 overflow-hidden border-none shadow-md bg-white dark:bg-gray-900 transition-all duration-300 ${showTodoSpotlight ? 'relative z-50 shadow-2xl shadow-purple-500/50' : ''}`} style={showTodoSpotlight ? { animation: 'shake 0.5s ease-in-out infinite' } : {}}>
          <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 relative h-[80px] z-[25]">
            {/* Single row with all content properly spaced */}
            <div className="flex items-center justify-between h-full">
              {/* Left side: Title and progress */}
              <div className="flex flex-col justify-center h-full">
                <div className="flex items-center mb-2">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                  <span className="text-lg font-semibold">To-Dos</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/90 text-xs font-medium">Erledigt {completedTodos}/{totalTodos}</span>
                  <div className="w-24 bg-white/20 rounded-full h-1.5">
                    <div className="bg-white h-1.5 rounded-full transition-all duration-300" style={{ width: `${completionPercentage}%` }}></div>
                  </div>
                </div>
            </div>
              
              {/* Right side: Filter dropdown */}
              <div className="relative">
                <button ref={dropdownButtonRef} className="text-white text-sm flex items-center font-medium py-2 px-3 rounded-md hover:bg-white/10 transition-colors min-h-[40px]" onClick={(e) => { e.stopPropagation(); setShowFilterDropdown(!showFilterDropdown);}}>
                  {todoFilter === "heute" ? (
                    "Heute"
                  ) : todoFilter === "7tage" ? (
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-xs">Nächsten</span>
                      <span className="text-xs -mt-0.5">7 Tage</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-xs">Nächsten</span>
                      <span className="text-xs -mt-0.5">30 Tage</span>
                    </div>
                  )}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </button>
                {showFilterDropdown && (
                  <div 
                    ref={filterDropdownPopupRef}
                    className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-30">
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-800 dark:hover:text-purple-100" onClick={() => { setTodoFilter("heute"); setShowFilterDropdown(false); }}>Heute</button>
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-800 dark:hover:text-purple-100" onClick={() => { setTodoFilter("7tage"); setShowFilterDropdown(false); }}>Nächsten 7 Tage</button>
                    <button className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-purple-100 hover:text-purple-800 dark:hover:bg-purple-800 dark:hover:text-purple-100" onClick={() => { setTodoFilter("30tage"); setShowFilterDropdown(false); }}>Nächsten 30 Tage</button>
      </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className={`p-0 transition-all duration-300 ${expandedTodos ? "max-h-80" : "max-h-[180px]"} overflow-hidden`}>
            {expandedTodos ? (
              <ScrollArea className="h-full max-h-80 overflow-y-auto">
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {sortedTodos.map((todo) => (
                    <li key={todo.id} className="px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleTodo(todo.id)} className="w-5 h-5 flex items-center justify-center transition-all focus:outline-none">
                          {todo.completed ? (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-green-500"><path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M10,17l-5-5l1.41-1.41L10,14.17l7.59-7.59L19,8L10,17z"/></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors"><path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.42,0-8-3.58-8-8s3.58-8,8-8s8,3.58,8,8S16.42,20,12,20z"/></svg>)}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${todo.completed ? 'text-gray-400 dark:text-gray-500 line-through' : ''}`}>{todo.title}</p>
                          <div className="flex items-center mt-1"><Clock className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500"/><span className="text-xs text-gray-500 dark:text-gray-400">{todo.due}</span></div>
          </div>
        </div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {sortedTodos.slice(0, 3).map((todo) => (
                  <li key={todo.id} className="px-4 py-3 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                    <div className="flex items-center gap-3">
                       <button onClick={() => toggleTodo(todo.id)} className="w-5 h-5 flex items-center justify-center transition-all focus:outline-none">
                          {todo.completed ? (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-green-500"><path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M10,17l-5-5l1.41-1.41L10,14.17l7.59-7.59L19,8L10,17z"/></svg>) : (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500 transition-colors"><path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M12,20c-4.42,0-8-3.58-8-8s3.58-8,8-8s8,3.58,8,8S16.42,20,12,20z"/></svg>)}
                        </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${todo.completed ? 'text-gray-400 dark:text-gray-500 line-through' : ''}`}>{todo.title}</p>
                        <div className="flex items-center mt-1"><Clock className="h-3 w-3 mr-1 text-gray-400 dark:text-gray-500"/><span className="text-xs text-gray-500 dark:text-gray-400">{todo.due}</span></div>
          </div>
                  </div>
                  </li>
                ))}
              </ul>
            )}
                </CardContent>
          <CardFooter className="p-3 border-t bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between w-full">
              {/* Empty space on the left for balance */}
              <div className="w-8 h-8"></div>
              
              {/* Centered "Alle anzeigen" button */}
              <Button variant="ghost" size="sm" className="flex items-center justify-center font-medium bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity" onClick={() => setExpandedTodos(!expandedTodos)}>
                {expandedTodos ? (<><ChevronUp className="h-4 w-4 mr-1 text-purple-500" /> Weniger anzeigen</>) : (<><ChevronDown className="h-4 w-4 mr-1 text-purple-500" /> Alle anzeigen</>)}
              </Button>
              
              {/* History icon on the right */}
              <button
                onClick={() => setShowTodoHistory(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full opacity-30 hover:opacity-60 transition-opacity duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <History className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </CardFooter>
        </Card>

      {/* To-Do History Popup */}
      {showTodoHistory && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" onClick={() => setShowTodoHistory(false)}></div>
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl z-50 w-[90vw] max-w-md max-h-[70vh] overflow-hidden todo-history-popup">
            <div className="relative">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-t-2xl shadow-md z-10">
                {/* Close button */}
                <button 
                  onClick={() => setShowTodoHistory(false)}
                  className="absolute top-3 right-3 p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
                
                {/* Header content */}
                <div className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  <div>
                    <h2 className="text-lg font-semibold">To-Do Verlauf</h2>
                    <p className="text-white/90 text-sm">Erledigte Aufgaben</p>
                  </div>
                </div>
              </div>

              {/* Month filter dropdown that peeks from behind the header - only visible when filter is closed */}
              <div 
                className={`absolute right-4 transform -bottom-5 z-0 flex justify-end w-auto transition-all duration-500 ${
                  monthFilterOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
              >
                <div 
                  className="shadow-sm rounded-b-xl px-6 py-1 cursor-pointer text-center filter drop-shadow-md"
                  style={{ backgroundColor: '#E449A3' }}
                  onClick={() => setMonthFilterOpen(true)}
                >
                  <button className="flex items-center justify-center w-full">
                    <span className="text-white text-xs font-medium opacity-90">
                      {getSelectedMonthDisplay()}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 ml-1 text-white transform translate-y-[1px] opacity-75" />
                  </button>
                </div>
              </div>

              {/* Month Filter Card with CSS transition */}
              <div 
                className={`absolute right-4 transition-all duration-500 origin-top z-60 ${
                  monthFilterOpen ? 'scale-y-100 opacity-100 top-full mt-1' : 'scale-y-0 opacity-0 pointer-events-none -bottom-5'
                }`}
                style={{ 
                  transformOrigin: 'top right',
                  maxHeight: monthFilterOpen ? '200px' : '0px'
                }}
              >
                <div className="relative">
                  <div 
                    className="rounded-lg shadow-md overflow-hidden"
                    style={{ backgroundColor: '#E449A3', width: '140px' }}
                  >
                    <div className="max-h-32 overflow-y-auto">
                      <div className="divide-y divide-white/20">
                        {/* Alle option */}
                        <button
                          onClick={() => {
                            setSelectedMonth("all");
                            setMonthFilterOpen(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors ${
                            selectedMonth === "all" ? 'bg-white/20' : ''
                          }`}
                        >
                          Alle
                        </button>
                        
                        {/* Month options */}
                        {getAvailableMonths().map((month) => (
                          <button
                            key={month.key}
                            onClick={() => {
                              setSelectedMonth(month.key);
                              setMonthFilterOpen(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors ${
                              selectedMonth === month.key ? 'bg-white/20' : ''
                            }`}
                          >
                            {month.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Schließen button peeking from behind the card */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-[1.35rem] z-0 flex justify-center w-full">
                    <div 
                      className="shadow-sm rounded-b-xl px-6 py-1 cursor-pointer text-center filter drop-shadow-md"
                      style={{ backgroundColor: '#E449A3' }}
                      onClick={() => setMonthFilterOpen(false)}
                    >
                      <button className="flex items-center justify-center w-full">
                        <span className="text-white text-xs font-medium opacity-90">schließen</span>
                        <ChevronUp className="h-3.5 w-3.5 ml-1 text-white transform translate-y-[1px] opacity-75" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[calc(70vh-80px)]">
              {getFilteredHistory().length > 0 ? (
                getFilteredHistory().map((todo) => (
                  <div key={todo.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4 text-green-500">
                        <path fill="currentColor" d="M12,2C6.48,2,2,6.48,2,12s4.48,10,10,10s10-4.48,10-10S17.52,2,12,2z M10,17l-5-5l1.41-1.41L10,14.17l7.59-7.59L19,8L10,17z"/>
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{todo.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {todo.completedDate.toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric' 
                        })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Keine Aufgaben für diesen Zeitraum gefunden
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Bitte Lesen Card */}
      {showBitteLesen && (
        <div className="w-full max-w-md mx-auto mb-6">
          <div className="relative">
            {/* Outer glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 rounded-lg blur-sm opacity-75 animate-pulse"></div>
            
            {/* Main card */}
            <Card className="relative bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 border-0 shadow-xl overflow-hidden">
              {/* Animated background pattern */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-500/20 to-red-500/20 animate-pulse"></div>
              
              {/* Header */}
              {!bitteLesenConfirmed && (
                <div className="relative py-3 px-4 text-center">
                  <h3 className="text-white font-bold text-lg drop-shadow-lg flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-white" />
                    Bitte Lesen
                  </h3>
                  <p className="text-white/90 text-sm mt-1 drop-shadow">
                    Wichtige Mitteilung von der Geschäftsleitung
                  </p>
                </div>
              )}
              
              {/* Content */}
              <CardContent className={`relative ${bitteLesenConfirmed ? 'p-0' : 'p-4 pt-0'}`}>
                <div className="text-center">
                  {!bitteLesenConfirmed ? (
                    <>
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-3 border border-white/20 relative">
                        <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
                        <div className="text-white text-sm leading-relaxed text-left relative">
                          Liebe Promotoren,
                          <br /><br />
                          ab sofort gelten neue Richtlinien für die Zeiterfassung. Bitte stellt sicher, dass ihr eure Arbeitszeiten täglich und korrekt eintragt.
                          <br /><br />
                          Bei Fragen wendet euch an euren Teamleiter.
                          <br /><br />
                          Vielen Dank für euer Verständnis!
                          <br /><br />
                          Euer SalesCrew Team
                        </div>
                      </div>
                      
                      {/* Read button */}
                      <button 
                        onClick={() => {
                          setBitteLesenConfirmed(true);
                          setTimeout(() => setShowBitteLesen(false), 7000);
                        }}
                        className="bg-white text-orange-600 font-medium py-2 px-4 rounded-lg shadow-md hover:bg-gray-50 hover:shadow-lg transform hover:scale-105 transition-all duration-200 border border-white/50"
                      >
                        ✓ Gelesen
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[140px] w-full px-4">
                      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20 text-center">
                        <div className="text-white">
                          <div className="text-lg font-semibold mb-2">✓ Danke fürs Lesen!</div>
                          <div className="text-sm">Die Aufgabe ist in der To-Do Liste als erledigt markiert.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
                {getCalendarDays().map((day, i) => {
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
                })}
              </div>
            </div>
          </div>

          {/* Assignment Type Tabs */}
          <div className="mb-3 -mt-1">
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
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
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
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
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
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-[10px] font-bold">
                      {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString() && a.type === "buddy").length}
                    </span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Assignment display for selected day */}
          <div className="h-[90px] min-h-[90px]">
            {assignments
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
                      <div>
                        <div className="relative pl-3">
                          <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-sm bg-gradient-to-b from-orange-500 to-amber-500"></span>
                          <p className="text-sm font-medium">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center cursor-pointer hover:text-blue-600 transition-colors"
                             onClick={() => handleAddressClick(assignment.location)}>
                            <MapPin className="h-3 w-3 mr-1" />
                            {assignment.location}
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
                      <div>
                        <div className="relative pl-3">
                          <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-sm bg-gradient-to-b from-purple-500 to-pink-500"></span>
                          <p className="text-sm font-medium">{assignment.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center cursor-pointer hover:text-blue-600 transition-colors"
                             onClick={() => handleAddressClick(assignment.location)}>
                            <MapPin className="h-3 w-3 mr-1" />
                            {assignment.location}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end h-full py-1 justify-center space-y-1">
                        <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 shadow-sm whitespace-nowrap rounded-full">
                          <span className="flex items-center">Buddy: Cesira</span>
                        </div>
                        <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-sm whitespace-nowrap rounded-full">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1.5 opacity-90" />
                            {assignment.time}
                          </span>
                        </div>
                        {!assignments.some(a => a.date.toDateString() === selectedCalendarDate.toDateString() && (a.type === "krankenstand" || a.type === "urlaub")) && (
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
                    <div>
                      <div className="relative pl-3">
                        <span className="absolute left-0 top-0 bottom-0 w-1.5 rounded-sm bg-gradient-to-b from-blue-400 to-indigo-600"></span>
                        <p className="text-sm font-medium">{assignment.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center cursor-pointer hover:text-blue-600 transition-colors"
                           onClick={() => handleAddressClick(assignment.location)}>
                          <MapPin className="h-3 w-3 mr-1" />
                          {assignment.location}
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
                          <div className="text-xs font-medium px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white border-0 shadow-sm whitespace-nowrap rounded-full cursor-pointer"
                            onClick={() => handleEinsatzStart(assignment)}
                            style={{ marginTop: '5px' }}
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
              })}
            {assignments.filter(a => a.date.toDateString() === selectedCalendarDate.toDateString()).filter(a => a.type === selectedAssignmentType).length === 0 && (
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
      <div className="mb-6">
        <button 
          onClick={() => router.push('/schulungen-videos')}
          className="w-full py-6 px-4 bg-gradient-to-r from-blue-500 via-indigo-600 via-purple-500 to-pink-500 hover:from-blue-600 hover:via-indigo-700 hover:via-purple-600 hover:to-pink-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center space-x-3"
        >
          <GraduationCap className="h-6 w-6" />
          <span className="text-lg font-medium">Schulungen & Videos</span>
        </button>
      </div>

      <Card className="mb-6 overflow-hidden border-none shadow-md bg-white dark:bg-gray-900" ref={progressBarsRef}>
          <CardHeader className="p-4">
            <CardTitle className="text-lg">Wochenstatus</CardTitle>
            <CardDescription>Deine Aktivitäten diese Woche</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="space-y-4">
              <div><div className="flex items-center justify-between mb-1"><span className="text-sm">Arbeitsstunden</span><span className="text-sm font-medium">24/40</span></div><div className="h-2 w-full bg-blue-100 dark:bg-blue-950/30 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-blue-300 to-blue-600 rounded-full transition-all duration-1000 ease-out" style={{ width: progressBarsVisible ? '60%' : '0%' }}></div></div></div>
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
       <div className={`fixed inset-0 z-20 ${showFilterDropdown ? 'block' : 'hidden'}`} onClick={() => setShowFilterDropdown(false)}></div>

      {/* Todo Spotlight Overlay */}
      {showTodoSpotlight && (
        <div className="fixed inset-0 bg-black/70 z-40 pointer-events-none" />
      )}

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
        onClose={() => setShowOnboarding(false)}
      />

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-1px) rotate(-0.5deg); }
          50% { transform: translateX(1px) rotate(0.5deg); }
          75% { transform: translateX(-0.5px) rotate(-0.25deg); }
        }
      `}</style>
    </>
  );
}
