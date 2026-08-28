"use client"

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Settings,
  User,
  BarChart2,
  Home,
  Briefcase,
  MessagesSquare,
  X,
  Send,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SiteLayoutProps {
  children: React.ReactNode;
}

export default function SiteLayout({ children }: SiteLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState("home");
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const footerButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [isFooterVisible, setIsFooterVisible] = useState(true);
  const [isInChat, setIsInChat] = useState(false);
  const lastScrollY = useRef(0);
  const [unreadCount, setUnreadCount] = useState(0);

  // KI Assistant states
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", content: "Hallo! Wie kann ich Ihnen heute helfen?" },
  ]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Training session detection
  const [isInTrainingSession, setIsInTrainingSession] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [profilePictureUrl, setProfilePictureUrl] = useState<string>("/placeholder.svg?height=40&width=40");
  const [openPwPopover, setOpenPwPopover] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState({ next: false, confirm: false });

  // Determine activeTab based on pathname and handle footer visibility for chat
  useEffect(() => {
    if (pathname === "/promotors/dashboard") {
      setActiveTab("home");
      setIsFooterVisible(true); // Ensure footer is visible on other pages
      setIsInChat(false);
    } else if (pathname === "/promotors/einsatz") {
      setActiveTab("einsatz");
      setIsFooterVisible(true); // Ensure footer is visible on other pages
      setIsInChat(false);
    } else if (pathname === "/promotors/chat") {
      setActiveTab("chats");
    } else if (pathname === "/kpis" || pathname === "/promotors/statistiken") {
      setActiveTab("kpis");
      setIsFooterVisible(true); // Ensure footer is visible on other pages
      setIsInChat(false);
    } else if (pathname === "/promotors/profil") {
      setActiveTab("profil");
      setIsFooterVisible(true); // Ensure footer is visible on other pages
      setIsInChat(false);
    } else {
      // Fallback, or determine based on a default route
      setActiveTab("home");
      setIsFooterVisible(true); // Ensure footer is visible on other pages
      setIsInChat(false);
    }
  }, [pathname]);

  // Load signed-in user's display name and profile picture for header (promotor) using browser Supabase session
  useEffect(() => {
    async function loadName() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .maybeSingle();
        const profileName = profile?.display_name && String(profile.display_name).trim();
        const metaName = user.user_metadata?.display_name || user.user_metadata?.full_name;
        const name = profileName || metaName || 'Promotor';
        setDisplayName(name);
        try { localStorage.setItem('displayName', name); } catch {}

        // Load profile picture from promotor_profiles
        const { data: promotorProfile } = await supabase
          .from('promotor_profiles')
          .select('profile_picture_url')
          .eq('user_id', user.id)
          .maybeSingle();
        if (promotorProfile?.profile_picture_url) {
          setProfilePictureUrl(promotorProfile.profile_picture_url);
        }
      } catch {}
    }
    loadName();
  }, []);


  // Pill Menu Indicator Logic
  useEffect(() => {
    const tabs = ["home", "einsatz", "chats", "kpis", "profil"];
    const activeButtonIndex = tabs.indexOf(activeTab);
    const activeButton = footerButtonRefs.current[activeButtonIndex];

    if (activeButton) {
      const targetLeft = activeButton.offsetLeft + activeButton.offsetWidth / 2;
      setIndicatorStyle({
        width: '2.75rem',
        height: '2.75rem',
        left: `${targetLeft}px`,
        top: '50%',
        transform: 'translate(-50%, -50%)',
        transition: 'left 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1)',
      });
    }
  }, [activeTab, footerButtonRefs.current]); // Added footerButtonRefs.current to dependency array if it influences logic directly or indirectly

  // Scroll handler for footer visibility
  useEffect(() => {
    const handleScroll = () => {
      // Don't handle scroll visibility if we're in a chat
      if (isInChat) {
        return; // Skip scroll handling when in a chat
      }

      const currentScrollY = window.scrollY;
      const scrollThreshold = 10; // Minimum scroll to trigger hide/show

      if (Math.abs(currentScrollY - lastScrollY.current) < scrollThreshold) {
        return;
      }

      if (currentScrollY > lastScrollY.current && currentScrollY > 50) { // Scrolling down, and not at the very top
        setIsFooterVisible(false);
      } else { // Scrolling up or at the top
        setIsFooterVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isInChat]);

  // Realtime unread updates via custom event bridge
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      if (typeof detail === 'number' && !Number.isNaN(detail)) {
        setUnreadCount(detail);
      }
    };
    window.addEventListener('promotorUnreadChanged' as any, handler as any);
    return () => window.removeEventListener('promotorUnreadChanged' as any, handler as any);
  }, []);

  // KI Assistant chat functions
  useEffect(() => {
    if (chatOpen) {
      scrollToBottom();
    }
  }, [chatMessages, chatOpen]);

  // Set CSS variables for light/dark mode input styling
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--input-bg',
      'linear-gradient(to bottom, rgba(243,244,246,0.95), rgba(249,250,251,0.95))'
    );

    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateColorMode = (isDark: boolean) => {
      if (isDark) {
        document.documentElement.style.setProperty(
          '--input-bg',
          'linear-gradient(to bottom, rgba(31,41,55,0.95), rgba(17,24,39,0.95))'
        );
      } else {
        document.documentElement.style.setProperty(
          '--input-bg',
          'linear-gradient(to bottom, rgba(243,244,246,0.95), rgba(249,250,251,0.95))'
        );
      }
    };

    updateColorMode(darkModeMediaQuery.matches);
    darkModeMediaQuery.addEventListener('change', (e) => updateColorMode(e.matches));

    return () => {
      darkModeMediaQuery.removeEventListener('change', (e) => updateColorMode(e.matches));
    };
  }, []);

  // Check for active training session and chat session
  useEffect(() => {
    const checkSession = () => {
      const showVideoPlayer = localStorage.getItem('showVideoPlayer') === 'true'
      const showPDFReader = localStorage.getItem('showPDFReader') === 'true'
      const showQuiz = localStorage.getItem('showQuiz') === 'true'
      setIsInTrainingSession(showVideoPlayer || showPDFReader || showQuiz)

      const isInChatMode = localStorage.getItem('isInChatMode') === 'true'
      setIsInChat(isInChatMode)

      // Read unread count bridge from promotor chat integration
      const unreadRaw = localStorage.getItem('promotorUnreadCount');
      const nextUnread = unreadRaw ? parseInt(unreadRaw, 10) || 0 : 0;
      setUnreadCount(nextUnread);
    }

    // Check on mount
    checkSession()

    // Listen for localStorage changes from other tabs AND custom dispatched events
    window.addEventListener('storage', checkSession)

    return () => {
      window.removeEventListener('storage', checkSession)
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    // Add user message
    const newMessages = [...chatMessages, { role: "user", content: userMessage }];
    setChatMessages(newMessages);
    setChatInput("");

    // Add typing indicator
    setChatMessages([...newMessages, { role: "ai", content: "TYPING_INDICATOR" }]);

    try {
      const response = await fetch('/api/ai/eddie-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Eddie API error details:', errorData);
        throw new Error(errorData.details || errorData.error || 'Eddie API request failed');
      }

      const data = await response.json();
      // Update conversationId if received from server
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Replace typing indicator with actual response
      setChatMessages([
        ...newMessages,
        {
          role: "ai",
          content: data.response || "Entschuldigung, ich konnte keine Antwort generieren."
        }
      ]);
    } catch (error) {
      console.error('❌ Eddie chat error:', error);
      // Replace typing indicator with error message
      setChatMessages([
        ...newMessages,
        {
          role: "ai",
          content: "Entschuldigung, ich bin gerade nicht verfügbar. Versuchen Sie es später erneut."
        }
      ]);
    }
  };

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 4 && currentHour < 11) return "Guten Morgen";
    if (currentHour >= 11 && currentHour < 14) return "Mahlzeit";
    if (currentHour >= 14 && currentHour < 18) return "Schönen Nachmittag";
    return "Schönen Abend";
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 pb-20 flex flex-col">
      {/* Shared Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container flex h-16 items-center px-4 mx-auto max-w-5xl">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border-2 border-blue-200 dark:border-blue-900">
              <AvatarImage src={profilePictureUrl} alt="Avatar" />
              <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 text-blue-700 font-medium">JP</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <p className="text-base font-semibold text-gray-800 dark:text-gray-200">{displayName || 'Promotor'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {pathname === "/promotors/einsatz" ? "Einsatzplanung" : pathname === "/promotors/statistiken" ? "CA KPIs" : pathname === "/promotors/profil" ? "Profil" : "Dashboard"} {/* Dynamic subtitle */}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Popover open={openPwPopover} onOpenChange={setOpenPwPopover}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => { setPwError(null); setPwSuccess(null); setNewPassword(""); setConfirmPassword(""); }}>
                  <Settings className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" sideOffset={10} className="w-80 p-4 bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-gray-800 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)]">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 tracking-tight">Passwort ändern</h3>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-xs text-gray-600">Neues Passwort</label>
                    <div className="relative">
                      <Input type={showPw.next ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} name="pw-new" autoComplete="off" autoCorrect="off" spellCheck={false} className="h-9 text-sm bg-white dark:bg-gray-900 pr-9 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
                      <button type="button" aria-label="toggle new password" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onClick={() => setShowPw(s => ({...s, next: !s.next}))}>{showPw.next ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Passwort wiederholen</label>
                    <div className="relative">
                      <Input type={showPw.confirm ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} name="pw-confirm" autoComplete="off" autoCorrect="off" spellCheck={false} className="h-9 text-sm bg-white dark:bg-gray-900 pr-9 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none" />
                      <button type="button" aria-label="toggle confirm password" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onClick={() => setShowPw(s => ({...s, confirm: !s.confirm}))}>{showPw.confirm ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}</button>
                    </div>
                  </div>
                  {pwError && <p className="text-xs text-red-600">{pwError}</p>}
                  {pwSuccess && <p className="text-xs text-green-600">{pwSuccess}</p>}
                  <div className="flex gap-2 pt-1.5">
                    <Button
                      className="flex-1 text-white focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-9 rounded-lg"
                      style={{ background: 'linear-gradient(to right, rgb(59,130,246), rgb(79,70,229))' }}
                      onClick={async () => {
                        try {
                          setPwError(null); setPwSuccess(null); setPwSaving(true);
                          if (!newPassword || newPassword.length < 8) throw new Error('Bitte mindestens 8 Zeichen verwenden.');
                          if (newPassword !== confirmPassword) throw new Error('Passwörter stimmen nicht überein.');
                          const supabase = createSupabaseBrowserClient();
                          // Optionally reauthenticate by signing in with current password if needed by your policy
                          const { error } = await supabase.auth.updateUser({ password: newPassword });
                          if (error) throw error;

                          setPwSuccess('Passwort geändert.');
                          setTimeout(() => setOpenPwPopover(false), 1000);
                        } catch (err: any) {
                          setPwError(err.message || 'Ändern fehlgeschlagen');
                        } finally { setPwSaving(false); }
                      }}
                      disabled={pwSaving}
                    >
                      {pwSaving ? 'Speichere…' : 'Ändern'}
                    </Button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenPwPopover(false);
                      router.push('/promotors/datenschutz');
                    }}
                    className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <ShieldCheck className="h-4 w-4" /> Datenschutz &amp; meine Rechte
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>


      {/* Darkening overlay for when KI assistant chat is shown */}
      <div
        className={`fixed inset-0 bg-black transition-opacity duration-500 z-[35] ${
          chatOpen ? 'opacity-40' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setChatOpen(false)}
      ></div>

      {/* Page Content - Rendered as Children */}
      <main className="flex-grow container px-4 py-6 md:py-8 max-w-2xl mx-auto w-full">
         {children}
      </main>

      {/* KI Assistant Floating Button */}
      {!isInTrainingSession && !isInChat && (
        <button
          className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg flex items-center justify-center z-40 hover:shadow-xl transition-shadow"
          onClick={() => {
            setChatOpen(true);
            setIsSpinning(true);
            setTimeout(() => setIsSpinning(false), 1000); // Reset after animation completes
          }}
        >
          <div className="absolute w-full h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600 animate-ping-slow opacity-70"></div>
          <img
            src="/icons/robot 1.svg"
            alt="KI Assistant"
            className={`h-8 w-8 relative z-10 ${isSpinning ? 'animate-spin-once' : ''} brightness-0 invert`}
          />
        </button>
      )}

      {/* KI Assistant Chat Interface */}
      {chatOpen && (
        <div className="fixed bottom-36 right-4 w-72 h-[400px] bg-white dark:bg-gray-900 rounded-lg shadow-xl flex flex-col z-50 overflow-hidden">
          {/* Chat Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-3 flex items-center justify-between shadow-md sticky top-0 z-10">
            <div className="flex items-center">
              <img
                src="/icons/robot 1.svg"
                alt="KI Assistant"
                className="h-5 w-5 mr-2 brightness-0 invert"
              />
              <h3 className="text-white font-medium">Frag Eddie!</h3>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="text-white hover:bg-blue-600 rounded-full p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 pb-16 scrollbar-thin scrollbar-track-transparent hover:scrollbar-thumb-blue-600 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-blue-500/50 [&::-webkit-scrollbar-thumb:hover]:bg-blue-500">
            <div className="space-y-3">
              {chatMessages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      message.role === 'user'
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : 'bg-blue-400 text-white'
                    }`}
                  >
                    {message.content === "TYPING_INDICATOR" ? (
                      <span className="text-white">
                        Eddie tippt
                        <span className="inline-block animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}>.</span>
                        <span className="inline-block animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1s' }}>.</span>
                        <span className="inline-block animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1s' }}>.</span>
                      </span>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Chat Input */}
          <div className="absolute bottom-3 left-3 right-3 z-20">
            <form onSubmit={sendMessage} className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Frag Eddie egal was..."
                className="w-full pr-12 py-2 px-5 rounded-full outline-none text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 placeholder:text-xs"
                style={{
                  border: 'none',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.18)',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none',
                  // Ensure consistent light control styling on iOS/Safari which can auto-darken inputs
                  colorScheme: 'light',
                  // Force consistent light grey gradient regardless of system dark mode
                  background: 'linear-gradient(to bottom, rgba(243,244,246,0.95), rgba(249,250,251,0.95))',
                  backgroundColor: '#f9fafb',
                  WebkitTextFillColor: 'inherit'
                }}
              />
              <Button
                type="submit"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center"
                disabled={!chatInput.trim()}
              >
                <Send className="h-3.5 w-3.5 rotate-15" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Shared Persistent Footer Menu */}
      {!isInTrainingSession && !isInChat && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 w-auto px-3 py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-full z-30 shadow-[0_35px_65px_-15px_rgba(0,0,0,0.25)] overflow-hidden transition-transform duration-300 ease-in-out ${
          isFooterVisible ? 'translate-y-0' : 'translate-y-[calc(100%+1rem)]' // 100% + bottom-4 (1rem)
        }`}
>
          <div className="relative flex items-center justify-around space-x-2 h-12">
            <div
              className="absolute bg-blue-500 rounded-full shadow-lg"
              style={indicatorStyle}
            ></div>
            <Button
              ref={el => { footerButtonRefs.current[0] = el; }}
              variant="outline"
              size="icon"
              className={`flex flex-col items-center justify-center h-10 w-10 rounded-full relative z-10 transition-colors border-none shadow-none ${activeTab === "home" ? "text-white" : "text-gray-500 dark:text-gray-400"} hover:bg-transparent hover:text-inherit focus:bg-transparent`}
              style={{ backgroundColor: 'transparent' }}
              onClick={() => handleNavigation("/promotors/dashboard")}
            >
              <Home className="h-6 w-6" />
            </Button>
            <Button
              ref={el => { footerButtonRefs.current[1] = el; }}
              variant="outline"
              size="icon"
              className={`flex flex-col items-center justify-center h-10 w-10 rounded-full relative z-10 transition-colors border-none shadow-none ${activeTab === "einsatz" ? "text-white" : "text-gray-500 dark:text-gray-400"} hover:bg-transparent hover:text-inherit focus:bg-transparent`}
              style={{ backgroundColor: 'transparent' }}
              onClick={() => handleNavigation("/promotors/einsatz")}
            >
              <Briefcase className="h-6 w-6" />
            </Button>
            <Button
              ref={el => { footerButtonRefs.current[2] = el; }}
              variant="outline"
              size="icon"
              className={`flex flex-col items-center justify-center h-10 w-10 rounded-full relative z-10 transition-colors border-none shadow-none ${activeTab === "chats" ? "text-white" : "text-gray-500 dark:text-gray-400"} hover:bg-transparent hover:text-inherit focus:bg-transparent`}
              style={{ backgroundColor: 'transparent' }}
              onClick={() => handleNavigation("/promotors/chat")}
            >
              <div className="relative">
              <MessagesSquare className="h-6 w-6" />
                {unreadCount > 0 && (
                  <span className="absolute -top-3 -right-3 min-w-[20px] h-4 px-1.5 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center font-semibold shadow">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
            </Button>
            <Button
              ref={el => { footerButtonRefs.current[3] = el; }}
              variant="outline"
              size="icon"
              className={`flex flex-col items-center justify-center h-10 w-10 rounded-full relative z-10 transition-colors border-none shadow-none ${activeTab === "kpis" ? "text-white" : "text-gray-500 dark:text-gray-400"} hover:bg-transparent hover:text-inherit focus:bg-transparent`}
              style={{ backgroundColor: 'transparent' }}
              onClick={() => handleNavigation("/promotors/statistiken")}
            >
              <BarChart2 className="h-6 w-6" />
            </Button>
            <Button
              ref={el => { footerButtonRefs.current[4] = el; }}
              variant="outline"
              size="icon"
              className={`flex flex-col items-center justify-center h-10 w-10 rounded-full relative z-10 transition-colors border-none shadow-none ${activeTab === "profil" ? "text-white" : "text-gray-500 dark:text-gray-400"} hover:bg-transparent hover:text-inherit focus:bg-transparent`}
              style={{ backgroundColor: 'transparent' }}
              onClick={() => handleNavigation("/promotors/profil")}
            >
              <User className="h-6 w-6" />
            </Button>
          </div>
        </div>
      )}

      {/* Password change popover is handled near the settings icon via Popover */}
    </div>
  );
}
