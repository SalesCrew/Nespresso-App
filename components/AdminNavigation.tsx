"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Bell,
  Settings,
  User,
  BarChart2,
  Home,
  Briefcase,
  MessagesSquare,
  Users,
  BookOpen,
  Trophy,
  Cpu,
  LogOut,
  Mail,
  Phone,
  MapPin,
  Camera,
  Check,
  ShieldCheck
} from "lucide-react";

interface AdminNavigationProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function AdminNavigation({ sidebarOpen, setSidebarOpen }: AdminNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showAdminProfile, setShowAdminProfile] = useState(false);
  const [profilePicture, setProfilePicture] = useState("/placeholder-user.jpg");
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mock admin data
  const adminData = {
    name: "Max Mustermann",
    role: "System Administrator",
    email: "max.mustermann@salescrew.com",
    phone: "+43 1 234 567 890",
    location: "Wien, Österreich",
    avatar: profilePicture
  };

  const navigationItems = [
    { id: "overview", label: "Übersicht", icon: Home, active: pathname === '/admin/dashboard', href: '/admin/dashboard' },
    { id: "einsatzplan", label: "Einsatzplan", icon: Briefcase, active: pathname === '/admin/einsatzplan', href: '/admin/einsatzplan' },
    { id: "team", label: "Promotoren", icon: Users, active: pathname === '/admin/team', href: '/admin/team' },
    { id: "messages", label: "Nachrichten", icon: MessagesSquare, active: pathname === '/admin/chat', href: '/admin/chat' },
    { id: "statistiken", label: "Statistiken", icon: BarChart2, active: pathname === '/admin/statistiken', href: '/admin/statistiken' },
    { id: "schulungen", label: "Schulungen", icon: BookOpen, active: pathname === '/admin/schulungen', href: '/admin/schulungen' },
    { id: "sales-challenge", label: "Sales Challenge", icon: Trophy, active: pathname === '/admin/sales-challenge', href: '/admin/sales-challenge' },
    { id: "demotool-agent", label: "DemoTool Agent", icon: Cpu, active: pathname === '/admin/demotool-agent', href: '/admin/demotool-agent' },
    { id: "datenschutz", label: "Datenschutz", icon: ShieldCheck, active: pathname === '/admin/datenschutz', href: '/admin/datenschutz' },
    { id: "settings", label: "Einstellungen", icon: Settings, active: false, href: '#' }
  ];

  // Close profile modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showAdminProfile && !target.closest('[data-admin-profile]')) {
        setShowAdminProfile(false);
      }
    };

    if (showAdminProfile) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAdminProfile]);

  const handleLogout = () => {
    // Add logout logic here
    setShowAdminProfile(false);
    router.push('/auth/salescrew/login');
  };

  const handleProfilePictureSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfilePicture(result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Copy function
  const copyToClipboard = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      const key = `admin-${type}`;
      setCopiedItems(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Open Google Maps
  const openGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  return (
    <div className={`fixed top-0 left-0 h-full bg-white/95 backdrop-blur-sm border-r border-gray-100/50 z-40 transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
      <div className="p-3">
        <div className={`${sidebarOpen ? 'flex items-center space-x-3' : 'w-8 h-8 flex items-center justify-center mx-auto'} bg-gray-100 rounded-lg mb-6 ${sidebarOpen ? 'p-3' : ''} relative`} data-admin-profile>
          <div
            className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => setShowAdminProfile(!showAdminProfile)}
          >
            <img
              src={adminData.avatar}
              alt="Admin Profile"
              className="w-full h-full object-cover"
            />
          </div>
          {sidebarOpen && (
            <div className="flex-1">
              <h1 className="text-sm font-semibold text-gray-900">SalesCrew</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          )}

          {/* Admin Profile Modal */}
          {showAdminProfile && (
            <div
              className="absolute top-full left-0 mt-2 rounded-lg shadow-lg border border-gray-200 z-50"
              style={{
                width: '280px',
                backgroundColor: 'rgba(255, 255, 255, 0.97)'
              }}
            >
              {/* Profile Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden cursor-pointer group" onClick={handleProfilePictureSelect}>
                    <img
                      src={adminData.avatar}
                      alt="Admin Profile"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
                      <Camera className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{adminData.name}</h3>
                    <p className="text-xs text-gray-500">{adminData.role}</p>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => copyToClipboard(adminData.email, 'email')}>
                  {copiedItems['admin-email'] ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 truncate">{adminData.email}</span>
                </div>
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => copyToClipboard(adminData.phone, 'phone')}>
                  {copiedItems['admin-phone'] ? (
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="text-sm text-gray-700 truncate">{adminData.phone}</span>
                </div>
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => openGoogleMaps(adminData.location)}>
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{adminData.location}</span>
                </div>
              </div>

              {/* Logout Button */}
              <div className="p-4 border-t border-gray-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                  style={{background: 'linear-gradient(135deg, #FA0C0C, #CD0000)'}}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Abmelden</span>
                </button>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <nav className="space-y-1">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.active) {
                  // If clicking on the currently active page, toggle sidebar
                  setSidebarOpen(!sidebarOpen);
                } else {
                  // If clicking on a different page, navigate and collapse sidebar
                  setSidebarOpen(false);
                  if (item.href && item.href !== '#') {
                    router.push(item.href);
                  }
                }
              }}
              className={`${sidebarOpen ? 'w-full flex items-center space-x-3 px-3 py-2' : 'w-8 h-8 flex items-center justify-center mx-auto'} rounded-lg transition-colors ${
                item.active
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
              }`}
              style={item.active ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}}
              title={!sidebarOpen ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
