"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, SquarePen, Phone, Video, Info, Send, Paperclip, Smile, Reply, Edit, Copy, Check, Heart, Trash2, MessageCircle, Image, FileText, RotateCw, Crop, Palette, X, Pen, Eraser, Pin, MessageCircleX, CircleDot, UserPlus, CheckSquare, Lock, Camera, Loader2, ChevronDown, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import AdminNavigation from "@/components/AdminNavigation";
import { useChatIntegration } from "@/lib/chat/useChatIntegration";
import { useSocket } from "@/lib/socket/SocketContext";
import { uploadGroupPicture } from "@/lib/chat/uploadGroupPicture";
import PollCreateModal from "@/components/chat/PollCreateModal";
import PollMessage from "@/components/chat/PollMessage";
import PollVotesDrawer from "@/components/chat/PollVotesDrawer";

interface Contact {
  id: string | number;  // Support both UUID strings and number IDs for compatibility
  name: string;
  lastMessage: string;
  lastMessageKind?: 'text' | 'photo' | 'pdf';
  time: string;
  unread: number;
  online: boolean;
  pinned?: boolean;
  markedUnread?: boolean;
  isGroup?: boolean;
  profileImage?: string | null;
  description?: string;
  members?: (string | number)[];  // Support both types
  memberNames?: string[];  // Store participant display names for groups
  readOnly?: boolean;
  lastMessageTime?: string;  // For sorting by most recent
}

interface Message {
  id: string | number;  // Support both UUID strings and number IDs
  sender: string;
  content: string;
  time: string;
  own: boolean;
  edited?: boolean;
  reaction?: string;
  reactionsSummary?: Array<{ emoji: string; count: number }>;
  myReaction?: string | null;
  topReaction?: { emoji: string; count: number } | null;
  totalReactions?: number;
  photo?: string;
  pdf?: string;
  pdfName?: string;
  type?: string;
  replyTo?: {
    id: string | number;
    sender: string;
    content: string;
    messageType?: string;
    photo?: string;
    pdf?: string;
    pdfName?: string;
  };
}

export default function ChatPage() {
  // Initialize chat integration
  const chatIntegration = useChatIntegration();
  const { socket, isConnected } = useSocket();
  const searchParams = useSearchParams();
  const [promotorsList, setPromotorsList] = useState<Array<{ user_id: string; display_name: string; region?: string }>>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Main search input state
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  
  const [selectedChat, setSelectedChat] = useState<Contact | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);  

  const [messageInput, setMessageInput] = useState("");
  const [attachmentPopup, setAttachmentPopup] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  useEffect(() => {
    if (showPollModal) {
    }
  }, [showPollModal]);
  const [photoEditor, setPhotoEditor] = useState<{ show: boolean; image: string; caption: string; rotation: number; brightness: number; contrast: number; crop: { x: number; y: number; width: number; height: number } | null; cropMode: boolean } | null>(null);
  const [pdfEditor, setPdfEditor] = useState<{ show: boolean; file: File; caption: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const [colorPalette, setColorPalette] = useState<{ show: boolean; selectedColor: string }>({ show: false, selectedColor: '' });
  const [eraserPalette, setEraserPalette] = useState<{ show: boolean; selectedSize: number }>({ show: false, selectedSize: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPaths, setDrawingPaths] = useState<Array<{ color: string; points: Array<{ x: number; y: number }> }>>([]);
  const [undoHistory, setUndoHistory] = useState<Array<{ 
    photoEditor: { show: boolean; image: string; caption: string; rotation: number; brightness: number; contrast: number; crop: { x: number; y: number; width: number; height: number } | null; cropMode: boolean } | null;
    drawingPaths: Array<{ color: string; points: Array<{ x: number; y: number }> }>;
  }>>([]);
  const [emojiPicker, setEmojiPicker] = useState<{ show: boolean; selectedCategory: string; context: 'input' | 'photo' | 'pdf' | 'poll_question' | 'poll_option'; optionIndex: number | null; anchor: { top: number; left: number } | null; dimensions: { width: number; height: number } | null }>({ show: false, selectedCategory: 'smileys', context: 'input', optionIndex: null, anchor: null, dimensions: null });

  // Refs for poll modal inputs
  const pollQuestionRef = useRef<HTMLInputElement>(null);
  const pollOption1Ref = useRef<HTMLInputElement>(null);
  const pollOption2Ref = useRef<HTMLInputElement>(null);
  const pollAllowMultipleRef = useRef<HTMLInputElement>(null);
  const pollModalRef = useRef<HTMLDivElement | null>(null);
  const pollEmojiBaseTopRef = useRef<{ question: number | null; option: number | null }>({ question: null, option: null });
  const MAX_POLL_OPTIONS = 20;
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  useEffect(() => {
    if (showPollModal) {
      setPollOptions(['', '']);
      pollEmojiBaseTopRef.current = { question: null, option: null };
      // Store the initial control positions to keep emoji pickers anchored consistently.
      requestAnimationFrame(() => {
        const firstOptionInput = pollModalRef.current?.querySelector('[data-poll-option-input="0"]') as HTMLInputElement | null;
        if (firstOptionInput) {
          const top = firstOptionInput.getBoundingClientRect().top + window.scrollY;
          pollEmojiBaseTopRef.current.option = top;
          pollEmojiBaseTopRef.current.question = top;
        }
        const questionButton = pollModalRef.current?.querySelector('[data-question-emoji-trigger]') as HTMLElement | null;
        if (questionButton && pollEmojiBaseTopRef.current.question == null) {
          pollEmojiBaseTopRef.current.question = questionButton.getBoundingClientRect().top + window.scrollY;
        }
      });
    } else {
      pollEmojiBaseTopRef.current = { question: null, option: null };
    }
  }, [showPollModal]);

  const handleOptionChange = (index: number, value: string) => {
    setPollOptions(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleOptionFocus = (index: number) => {
    // Keep poll emoji picker open while working inside the poll modal
    setEmojiPicker(prev => (
      prev.context === 'poll_question' || prev.context === 'poll_option'
        ? prev
        : { ...prev, show: false, optionIndex: null, anchor: null, dimensions: null }
    ));
    setPollOptions(prev => {
      if (index === prev.length - 1 && prev[index].trim() === '' && prev.length < MAX_POLL_OPTIONS) {
        return [...prev, ''];
      }
      return prev;
    });
  };

  const [photoViewer, setPhotoViewer] = useState<{
    show: boolean;
    currentIndex: number;
    photos: string[];
  }>({
    show: false,
    currentIndex: 0,
    photos: []
  });

  const [infoMenu, setInfoMenu] = useState<{
    show: boolean;
    selectedTab: 'fotos' | 'media';
  }>({
    show: false,
    selectedTab: 'fotos'
  });

  // Emoji categories and data
  const emojiCategories = {
    smileys: {
      name: 'Smileys & People',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😶‍🌫️', '😏', '😒', '🙄', '😬', '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐']
    },
    animals: {
      name: 'Animals & Nature',
      emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌', '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔']
    },
    food: {
      name: 'Food & Drink',
      emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🌶️', '🫒', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯']
    },
    activities: {
      name: 'Activities',
      emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️‍♀️', '🏋️', '🏋️‍♂️', '🤼‍♀️', '🤼', '🤼‍♂️', '🤸‍♀️', '🤸', '🤸‍♂️', '⛹️‍♀️', '⛹️', '⛹️‍♂️', '🤺', '🤾‍♀️', '🤾', '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏌️‍♂️', '🏇', '🧘‍♀️', '🧘', '🧘‍♂️', '🏄‍♀️', '🏄', '🏄‍♂️', '🏊‍♀️', '🏊', '🏊‍♂️', '🤽‍♀️', '🤽', '🤽‍♂️', '🚣‍♀️', '🚣', '🚣‍♂️', '🧗‍♀️', '🧗', '🧗‍♂️', '🚵‍♀️', '🚵', '🚵‍♂️', '🚴‍♀️', '🚴', '🚴‍♂️', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🤹‍♂️', '🤹‍♀️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🥁', '🪘', '🎹', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯', '🎳', '🎮', '🎰', '🧩']
    },
    travel: {
      name: 'Travel & Places',
      emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚', '🚛', '🚜', '🏍️', '🛵', '🚲', '🛴', '🛹', '🛼', '🚁', '🛸', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺', '🚀', '🛰️', '🚊', '🚝', '🚅', '🚄', '🚈', '🚞', '🚋', '🚃', '🚟', '🚠', '🚡', '⛴️', '🛥️', '🚤', '⛵', '🛶', '🚣', '🛸', '🚢', '⚓', '⛽', '🚧', '🚨', '🚥', '🚦', '🛑', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🛖', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🛕', '🕍', '⛩️', '🕋', '⛲', '⛱️', '🌁', '🌃', '🏙️', '🌄', '🌅', '🌆', '🌇', '🌉', '♨️', '🎠', '🎡', '🎢', '💈', '🎪']
    },
    objects: {
      name: 'Objects',
      emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪓', '🪚', '🔩', '⚙️', '🪤', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞', '🪟', '🛍️', '🛒', '🎁', '🎀', '🎊', '🎉', '🎈', '🎄', '🎃', '🎋', '🎍', '🎎', '🎏', '🎐', '🎑', '🧧', '🎀', '🎁', '🎗️', '🎟️', '🎫', '🎖️', '🏆', '🏅', '🥇', '🥈', '🥉']
    },
    symbols: {
      name: 'Symbols',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', '🔤', '🔡', '🔠', '🔢', '🔣', '#️⃣', '*️⃣', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '🔤', '🔡', '🔠', '🔣', '🔽', '🔼', '⏸️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔉', '🔊', '🔇', '📢', '📣', '📯', '🔔', '🔕']
    }
  };

  // Save current state to undo history
  const saveToHistory = () => {
    setUndoHistory(prev => [
      ...prev,
      {
        photoEditor: photoEditor ? { ...photoEditor, crop: photoEditor.crop ? { ...photoEditor.crop } : null } : null,
        drawingPaths: [...drawingPaths]
      }
    ]);
  };

  // Undo last change
  const undoLastChange = () => {
    if (undoHistory.length > 0) {
      const lastState = undoHistory[undoHistory.length - 1];
      setPhotoEditor(lastState.photoEditor);
      setDrawingPaths(lastState.drawingPaths);
      setUndoHistory(prev => prev.slice(0, -1));
    }
  };

  // Get all photos from current chat messages
  const getAllPhotosFromChat = () => {
    if (!selectedChat) return [];
    const chatMessages = allMessages[selectedChat.id] || [];
    return chatMessages
      .filter((msg: Message) => msg.photo)
      .map((msg: Message) => msg.photo!)
      .reverse(); // Most recent first
  };

  // Get all PDFs from current chat messages
  const getAllPdfsFromChat = () => {
    if (!selectedChat) return [];
    const chatMessages = allMessages[selectedChat.id] || [];
    return chatMessages
      .filter((msg: Message) => msg.pdf)
      .map((msg: Message) => ({ url: msg.pdf!, name: msg.pdfName || msg.pdf! }))
      .reverse(); // Most recent first
  };

  // Open photo viewer
  const openPhotoViewer = (photoUrl: string) => {
    const allPhotos = getAllPhotosFromChat();
    const currentIndex = allPhotos.indexOf(photoUrl);
    setPhotoViewer({
      show: true,
      currentIndex: currentIndex >= 0 ? currentIndex : 0,
      photos: allPhotos
    });
  };

  // Navigate photo viewer
  const navigatePhotoViewer = (direction: 'prev' | 'next') => {
    setPhotoViewer(prev => {
      let newIndex;
      if (direction === 'prev') {
        newIndex = prev.currentIndex > 0 ? prev.currentIndex - 1 : prev.photos.length - 1;
      } else {
        newIndex = prev.currentIndex < prev.photos.length - 1 ? prev.currentIndex + 1 : 0;
      }
      return { ...prev, currentIndex: newIndex };
    });
  };

  // Close photo viewer
  const closePhotoViewer = () => {
    setPhotoViewer({ show: false, currentIndex: 0, photos: [] });
  };

  // Add emoji picker slide animation CSS
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUpFromBottom {
        from {
          transform: translateY(100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      @keyframes slideDownFromTop {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    `;
    if (!document.head.querySelector('style[data-emoji-slide-animation]')) {
      style.setAttribute('data-emoji-slide-animation', 'true');
      document.head.appendChild(style);
    }
  }, []);

  // Keyboard shortcuts for photo viewer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (photoViewer.show) {
        if (e.key === 'Escape') {
          closePhotoViewer();
        } else if (e.key === 'ArrowLeft') {
          navigatePhotoViewer('prev');
        } else if (e.key === 'ArrowRight') {
          navigatePhotoViewer('next');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [photoViewer.show]);

  // Close info menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (infoMenu.show) {
        const target = event.target as Element;
        const infoMenuContainer = target.closest('[data-info-menu]');
        if (!infoMenuContainer) {
          setInfoMenu(prev => ({ ...prev, show: false }));
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [infoMenu.show]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSearchDropdown && searchDropdownRef.current) {
        if (!searchDropdownRef.current.contains(event.target as Node)) {
          setShowSearchDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSearchDropdown]);

  // Combine image with drawings, apply rotation and cropping
  const combineImageWithDrawings = async (
    imageUrl: string, 
    paths: Array<{ color: string; points: Array<{ x: number; y: number }> }>, 
    rotation: number = 0,
    crop: { x: number; y: number; width: number; height: number } | null = null
  ): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageUrl);
        return;
      }
      const img = document.createElement('img');
      
      img.onload = () => {
        // Calculate final dimensions considering crop
        let finalWidth = img.width;
        let finalHeight = img.height;
        
        if (crop) {
          finalWidth = img.width * crop.width;
          finalHeight = img.height * crop.height;
        }
        
        // Handle rotation by swapping dimensions if needed
        if (rotation % 180 === 90) {
          canvas.width = finalHeight;
          canvas.height = finalWidth;
        } else {
          canvas.width = finalWidth;
          canvas.height = finalHeight;
        }
        
        // Apply rotation and cropping
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        
        if (crop) {
          // Draw cropped portion
          const sourceX = img.width * crop.x;
          const sourceY = img.height * crop.y;
          const sourceWidth = img.width * crop.width;
          const sourceHeight = img.height * crop.height;
          
          ctx.drawImage(
            img, 
            sourceX, sourceY, sourceWidth, sourceHeight,
            -finalWidth / 2, -finalHeight / 2, finalWidth, finalHeight
          );
        } else {
          ctx.drawImage(img, -img.width / 2, -img.height / 2);
        }
        
        ctx.restore();
        
        // Calculate scaling factors (the image in preview is 300px wide with h-48 = 192px)
        const scaleX = img.width / 276; // 300px - 24px padding
        const scaleY = img.height / 192; // h-48 = 192px
        
        // Draw all paths
        paths.forEach(path => {
          if (path.points.length > 1) {
            ctx.strokeStyle = path.color;
            ctx.lineWidth = 3 * Math.max(scaleX, scaleY); // Scale line width
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            
            const firstPoint = path.points[0];
            ctx.moveTo(firstPoint.x * scaleX, firstPoint.y * scaleY);
            
            for (let i = 1; i < path.points.length; i++) {
              const point = path.points[i];
              ctx.lineTo(point.x * scaleX, point.y * scaleY);
            }
            
            ctx.stroke();
          }
        });
        
        resolve(canvas.toDataURL());
      };
      
      img.src = imageUrl;
    });
  };
  const [contextMenu, setContextMenu] = useState<{ show: boolean; x: number; y: number; messageId: number | null; isOwnMessage: boolean }>({
    show: false, x: 0, y: 0, messageId: null, isOwnMessage: false
  });
  const [contactContextMenu, setContactContextMenu] = useState<{ show: boolean; x: number; y: number; contactId: number | null }>({
    show: false, x: 0, y: 0, contactId: null
  });
  const [groupCreationPopup, setGroupCreationPopup] = useState<{ show: boolean; selectedContacts: string[]; searchQuery: string; step: number; groupName: string; groupDescription: string; profileImage: string | null; profileImageFile: File | null; readOnly: boolean }>({
    show: false, selectedContacts: [], searchQuery: '', step: 1, groupName: '', groupDescription: '', profileImage: null, profileImageFile: null, readOnly: false
  });
  const [showParticipants, setShowParticipants] = useState(false);
  const [kickMemberDialog, setKickMemberDialog] = useState<{ show: boolean; memberName: string; memberIndex: number | null }>({ show: false, memberName: '', memberIndex: null });
  const [showPromotorSelection, setShowPromotorSelection] = useState(false);
  const [selectedPromotors, setSelectedPromotors] = useState<string[]>([]);
  const [activeRegionFilter, setActiveRegionFilter] = useState<string>("all");
  const [groupPictureEdit, setGroupPictureEdit] = useState<{ show: boolean; conversationId: string | number | null }>({ show: false, conversationId: null });
  const groupPictureInputRef = useRef<HTMLInputElement>(null);
  const [promotorSelectionSearch, setPromotorSelectionSearch] = useState("");
  const [lastSelectedByIcon, setLastSelectedByIcon] = useState<string[]>([]);
  const [showReadOnlyTooltip, setShowReadOnlyTooltip] = useState(false);
  const readOnlyTooltipRef = useRef<HTMLDivElement>(null);
  const [reactionDetails, setReactionDetails] = useState<{ 
    show: boolean; 
    messageId: string | number | null; 
    reactions: Record<string, Array<{ user_id: string; display_name: string }>>; 
    selectedEmoji: string | null;
  }>({ show: false, messageId: null, reactions: {}, selectedEmoji: null });

  useEffect(() => {
    if (!showReadOnlyTooltip) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (readOnlyTooltipRef.current && !readOnlyTooltipRef.current.contains(target)) {
        setShowReadOnlyTooltip(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showReadOnlyTooltip]);

  // Helper functions for group members
  const formatGroupMembers = (memberNames: string[] = []) => {
    if (memberNames.length <= 3) {
      return memberNames.join(', ');
    }
    return `${memberNames.slice(0, 3).join(', ')}...`;
  };

  // Region gradient helper
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

  // Region border helper
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

  // Function to select all filtered promotors
  const selectAllFiltered = () => {
    // Filter out promotors already in the group
    const existingMemberIds = new Set(selectedChat?.members || []);
    const availablePromotors = promotorsList.filter(p => !existingMemberIds.has(p.user_id));

    const filteredNames = availablePromotors
      .filter(promotor => 
        (activeRegionFilter === "all" || (promotor.region && promotor.region === activeRegionFilter)) &&
        promotor.display_name.toLowerCase().includes(promotorSelectionSearch.toLowerCase())
      )
      .map(promotor => promotor.display_name);
    
    // Check if we should deselect (if all filtered items are currently selected and match last selection)
    const allFilteredSelected = filteredNames.every(name => selectedPromotors.includes(name));
    const matchesLastSelection = lastSelectedByIcon.length > 0 && 
      filteredNames.length === lastSelectedByIcon.length &&
      filteredNames.every(name => lastSelectedByIcon.includes(name));
    
    if (allFilteredSelected && matchesLastSelection) {
      // Deselect all filtered items
      setSelectedPromotors(prev => prev.filter(name => !filteredNames.includes(name)));
      setLastSelectedByIcon([]);
    } else {
      // Select all filtered items
      setSelectedPromotors(prev => {
        const newSelected = [...prev];
        filteredNames.forEach(name => {
          if (!newSelected.includes(name)) {
            newSelected.push(name);
          }
        });
        return newSelected;
      });
      setLastSelectedByIcon(filteredNames);
    }
  };

  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [replyAnimation, setReplyAnimation] = useState<{ startY: number; endY: number } | null>(null);
  const [flashingMessageId, setFlashingMessageId] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editAnimation, setEditAnimation] = useState<{ startY: number; endY: number } | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState<Set<number>>(new Set());
  const [deleteDialog, setDeleteDialog] = useState<{ 
    show: boolean; 
    messageId: number | null; 
    isOwnMessage: boolean;
    isBulkDelete: boolean;
    selectedMessageIds: number[];
    hasOwnMessages: boolean;
    hasOtherMessages: boolean;
  }>({
    show: false,
    messageId: null,
    isOwnMessage: false,
    isBulkDelete: false,
    selectedMessageIds: [],
    hasOwnMessages: false,
    hasOtherMessages: false
  });
  const [clearChatDialog, setClearChatDialog] = useState<{ 
    show: boolean; 
    contactId: number | null; 
  }>({
    show: false,
    contactId: null
  });

  // Stub functions for features not yet integrated with Socket.IO
  // These are no-ops to prevent errors in UI code paths we're keeping for later
  const setAllMessages = (updater: any) => {
  };
  const setContacts = (updater: any) => {
  };

  // Get messages for the selected conversation from real data
  const conversationMessages: Message[] = selectedChat && selectedChat.id
    ? (chatIntegration.messages[String(selectedChat.id)] || []).map(msg => ({
        id: msg.id,
        sender: msg.sender_name,
        content: msg.message_type === 'poll' ? '' : msg.message_text,
        time: new Date(msg.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
        own: msg.sender_id === currentUserId,
        edited: msg.edited,
        reaction: msg.my_reaction || undefined,
        reactionsSummary: msg.reactions_summary || [],
        myReaction: msg.my_reaction || null,
        topReaction: msg.top_reaction || null,
        totalReactions: msg.total_reactions || 0,
        photo: msg.message_type === 'photo' && msg.file_url ? msg.file_url : undefined,
        pdf: msg.message_type === 'pdf' && msg.file_url ? msg.file_url : undefined,
        pdfName: msg.message_type === 'pdf' && msg.file_name ? msg.file_name : undefined,
        type: msg.message_type,
        // attach poll payload so UI renders the poll bubble
        ...(msg.message_type === 'poll' && msg.poll ? { poll: msg.poll } : {}),
        replyTo: msg.reply_to ? {
          id: msg.reply_to.id,
          sender: msg.reply_to.sender_name,
          content: msg.reply_to.message_text || '',
          messageType: msg.reply_to.message_type,
          photo: msg.reply_to.message_type === 'photo' && msg.reply_to.file_url ? msg.reply_to.file_url : undefined,
          pdf: msg.reply_to.message_type === 'pdf' && msg.reply_to.file_url ? msg.reply_to.file_url : undefined,
          pdfName: msg.reply_to.message_type === 'pdf' && msg.reply_to.file_name ? msg.reply_to.file_name : undefined,
        } : undefined,
      }))
    : [];

  // For compatibility with existing code that expects allMessages[id]
  const allMessages = selectedChat && selectedChat.id 
    ? { [selectedChat.id]: conversationMessages }
    : {};
  // Avatar resolver for poll voters in this conversation
  const selectedConvForAvatars = useMemo(() => {
    if (!selectedChat?.id) return null;
    return chatIntegration.conversations.find(c => String(c.id) === String(selectedChat.id)) || null;
  }, [chatIntegration.conversations, selectedChat?.id]);
  const getAvatarForUser = useCallback((userId: string) => {
    const conv: any = selectedConvForAvatars as any;
    const p = conv?.participants?.find((x: any) => x.user_id === userId);
    return p?.profile_picture_url || '/placeholder.svg';
  }, [selectedConvForAvatars]);

  // Resolve user name for votes drawer
  const getNameForUser = useCallback((userId: string) => {
    const conv: any = selectedConvForAvatars as any;
    const p = conv?.participants?.find((x: any) => x.user_id === userId);
    return p?.display_name || 'Unbekannt';
  }, [selectedConvForAvatars]);

  const [votesDrawer, setVotesDrawer] = useState<{ open: boolean; pollId: string | null; question: string; options: any[]; anchorRect: { top: number; left: number; width: number; height: number } | null }>(
    { open: false, pollId: null, question: '', options: [], anchorRect: null }
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollButtonTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Ref for poll bubble inside reply overlay (for anchoring votes drawer)
  const replyOverlayPollRef = useRef<HTMLDivElement | null>(null);
  // Ref for poll bubble inside edit overlay (for anchoring votes drawer)
  const editOverlayPollRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const evaluateScrollPosition = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const atBottom = (el.scrollHeight - el.scrollTop - el.clientHeight) < 8;
    
    if (!atBottom) {
      // Not at bottom - start 3-second delay before showing button
      if (!scrollButtonTimerRef.current) {
        scrollButtonTimerRef.current = setTimeout(() => {
          setShowScrollToBottom(true);
          scrollButtonTimerRef.current = null;
        }, 3000);
      }
    } else {
      // At bottom - cancel timer and hide button
      if (scrollButtonTimerRef.current) {
        clearTimeout(scrollButtonTimerRef.current);
        scrollButtonTimerRef.current = null;
      }
      setShowScrollToBottom(false);
    }
  }, []);

  // Convert real conversations to Contact format
  const contacts: Contact[] = chatIntegration.conversations.map(conv => {
    // Format last message based on type
    let lastMessageText = conv.last_message?.text || '';
    let lastMessageKind: 'text' | 'photo' | 'pdf' | undefined = 'text';
    if (conv.last_message) {
      if (conv.last_message.type === 'photo') {
        lastMessageText = 'Foto';
        lastMessageKind = 'photo';
      } else if (conv.last_message.type === 'pdf') {
        lastMessageText = 'PDF';
        lastMessageKind = 'pdf';
      }
    }
    
    // Get profile picture
    let profilePicture = null;
    if (conv.is_group) {
      // For groups, use the group's profile picture
      profilePicture = conv.profile_picture_url || null;
    } else if (conv.participants) {
      // For direct chats, use the other participant's profile picture
      const otherParticipant = conv.participants.find((p: any) => p.user_id !== chatIntegration.currentUserId);
      profilePicture = otherParticipant?.profile_picture_url || null;
    }
    
    return {
      id: conv.id,
      name: conv.name || 'Unknown',
      lastMessage: lastMessageText,
      lastMessageKind,
      time: conv.last_message?.created_at 
        ? new Date(conv.last_message.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : '',
      unread: conv.unread_count,
      online: false, // Can be enhanced with presence tracking
      pinned: conv.is_pinned || false,
      markedUnread: conv.marked_unread || false,
      isGroup: conv.is_group,
      profileImage: profilePicture,
      description: conv.description || undefined,
      members: conv.participants.map(p => p.user_id),
      memberNames: conv.participants.map(p => p.display_name),
      readOnly: conv.is_read_only,
      lastMessageTime: conv.last_message?.created_at || conv.updated_at,
    };
  });

  // Sort contacts: pinned first, then by most recent message
  const sortedContacts = [...contacts].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    
    // Sort by last message time (most recent first)
    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
    return timeB - timeA;
  });

  // Handle ?open=conversationId query parameter
  useEffect(() => {
    const openParam = searchParams.get('open');
    if (openParam && contacts.length > 0) {
      const contactToOpen = contacts.find(c => c.id.toString() === openParam);
      if (contactToOpen && (!selectedChat || selectedChat.id !== contactToOpen.id)) {
        setSelectedChat(contactToOpen);
        chatIntegration.fetchMessages(openParam);
        chatIntegration.markAsRead(openParam);
      }
    }
  }, [searchParams, contacts, selectedChat, chatIntegration]);

    // Handle sending messages
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !selectedChat) return;

    if (editingMessage) {
      // Edit existing message
      try {
        // Don't allow empty edits
        if (!messageInput.trim()) {
          return;
        }

        // No changes made, just cancel
        if (messageInput.trim() === editingMessage.content) {
          setEditingMessage(null);
          setEditAnimation(null);
          setMessageInput("");
          const existingEditStyle = document.getElementById('edit-keyframes');
          if (existingEditStyle) {
            existingEditStyle.remove();
          }
          return;
        }

        await chatIntegration.editMessage(
          String(selectedChat.id),
          String(editingMessage.id),
          messageInput.trim()
        );
        
        // Clear edit state
        setEditingMessage(null);
        setEditAnimation(null);
        setMessageInput("");
        
        // Remove animation styles
        const existingEditStyle = document.getElementById('edit-keyframes');
        if (existingEditStyle) {
          existingEditStyle.remove();
        }
      } catch (error) {
        console.error('Failed to edit message:', error);
        // Optionally show error notification to user
      }
      return;
    } else {
      // Send new message via Socket.IO
      try {
        await chatIntegration.sendMessage(
          String(selectedChat.id),
          messageInput.trim(),
          replyingTo ? String(replyingTo.id) : null
        );
        
        // Clear input and reply state
        setMessageInput('');
      setReplyingTo(null);
      setReplyAnimation(null);
        
      // Clean up keyframe
      const existingStyle = document.getElementById('reply-keyframes');
      if (existingStyle) {
        existingStyle.remove();
        }
        
        // Scroll to bottom after a short delay to let new message render
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } catch (error) {
        console.error('Failed to send message:', error);
        // TODO: Show error notification to user
      }
    }
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, messageId: number, isOwn: boolean) => {
    e.preventDefault();
    
    const menuWidth = 160;
    const menuHeight = 220; // Approximate height of the menu
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    // Calculate position based on message type
    let x, y;
    
    if (isOwn) {
      // Own messages: bottom-right corner at mouse position (opens to left)
      x = mouseX - menuWidth;
      y = mouseY - menuHeight;
    } else {
      // Received messages: bottom-left corner at mouse position (opens to right)
      x = mouseX;
      y = mouseY - menuHeight;
    }
    
    // If menu would go off left edge, position it to the right of mouse
    if (x < 0) {
      x = mouseX;
    }
    
    // If menu would go off top edge, position it below mouse
    if (y < 0) {
      y = mouseY;
    }
    
    // If menu would go off right edge, keep it on left side
    if (mouseX + menuWidth > window.innerWidth) {
      x = mouseX - menuWidth;
    }
    
    // If menu would go off bottom edge, keep it above mouse
    if (mouseY + menuHeight > window.innerHeight) {
      y = mouseY - menuHeight;
    }
    
    setContextMenu({
      show: true,
      x: x,
      y: y,
      messageId,
      isOwnMessage: isOwn
    });
  };

  // Close context menu
  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, messageId: null, isOwnMessage: false });
  };

  // Handle right-click context menu for contacts
  const handleContactContextMenu = (e: React.MouseEvent, contactId: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const menuWidth = 200;
    const menuHeight = 160;
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    
    let x = mouseX;
    let y = mouseY;
    
    // If menu would go off right edge, position it to the left of mouse
    if (mouseX + menuWidth > window.innerWidth) {
      x = mouseX - menuWidth;
    }
    
    // If menu would go off bottom edge, position it above mouse
    if (mouseY + menuHeight > window.innerHeight) {
      y = mouseY - menuHeight;
    }
    
    setContactContextMenu({
      show: true,
      x: x,
      y: y,
      contactId
    });
  };

  // Close contact context menu
  const closeContactContextMenu = () => {
    setContactContextMenu({ show: false, x: 0, y: 0, contactId: null });
  };

  // Handle context menu actions
  const handleContextAction = (action: string) => {
    if (action === 'reply' && contextMenu.messageId && selectedChat) {
      const messageToReply = allMessages[selectedChat.id]?.find(msg => msg.id === contextMenu.messageId);
      if (messageToReply) {
        // Find the original message element
        const messageElement = document.querySelector(`[data-message-id="${contextMenu.messageId}"]`) as HTMLElement;
        if (messageElement) {
          const rect = messageElement.getBoundingClientRect();
          const chatAreaRect = messageElement.closest('.relative')?.getBoundingClientRect();
          
          if (chatAreaRect) {
            // Calculate the distance from original position to reply position
            const replyTargetY = chatAreaRect.height - 80; // Where reply bubble will be
            const originalY = rect.top - chatAreaRect.top;
            const startOffset = originalY - replyTargetY;
            
            
            // Create dynamic keyframe
            const keyframeName = `slide-to-reply-${contextMenu.messageId}`;
            const keyframes = `
              @keyframes ${keyframeName} {
                from { transform: translateY(${startOffset}px); opacity: 1; }
                to { transform: translateY(0px); opacity: 1; }
              }
            `;
            
            // Remove existing keyframe if any
            const existingStyle = document.getElementById('reply-keyframes');
            if (existingStyle) {
              existingStyle.remove();
            }
            
            // Add new keyframe
            const style = document.createElement('style');
            style.id = 'reply-keyframes';
            style.textContent = keyframes;
            document.head.appendChild(style);
            
            setReplyAnimation({ startY: startOffset, endY: 0 });
          }
        }
        setReplyingTo(messageToReply);
      }
    } else if (action === 'copy' && contextMenu.messageId && selectedChat) {
      const messageToCopy = allMessages[selectedChat.id]?.find(msg => msg.id === contextMenu.messageId);
      if (messageToCopy) {
        navigator.clipboard.writeText(messageToCopy.content).catch(err => {
          console.error('Failed to copy message:', err);
        });
      }
    } else if (action === 'edit' && contextMenu.messageId && selectedChat) {
      const messageToEdit = allMessages[selectedChat.id]?.find(msg => msg.id === contextMenu.messageId);
      if (messageToEdit) {
        // Find the original message element
        const messageElement = document.querySelector(`[data-message-id="${contextMenu.messageId}"]`) as HTMLElement;
        if (messageElement) {
          const rect = messageElement.getBoundingClientRect();
          const chatAreaRect = messageElement.closest('.relative')?.getBoundingClientRect();
          
          if (chatAreaRect) {
            // Calculate the distance from original position to input field position
            const inputTargetY = chatAreaRect.height - 80; // Where input field is
            const originalY = rect.top - chatAreaRect.top;
            const startOffset = originalY - inputTargetY;
            
            // Create dynamic keyframe for edit animation
            const keyframeName = `slide-to-edit-${contextMenu.messageId}`;
            const keyframes = `
              @keyframes ${keyframeName} {
                from { transform: translateY(${startOffset}px); opacity: 1; }
                to { transform: translateY(0px); opacity: 1; }
              }
            `;
            
            // Remove existing keyframe if any
            const existingStyle = document.getElementById('edit-keyframes');
            if (existingStyle) {
              existingStyle.remove();
            }
            
            // Add new keyframe
            const style = document.createElement('style');
            style.id = 'edit-keyframes';
            style.textContent = keyframes;
            document.head.appendChild(style);
            
            setEditAnimation({ startY: startOffset, endY: 0 });
          }
        }
        setEditingMessage(messageToEdit);
        setMessageInput(messageToEdit.content);
      }
    } else if (action === 'select') {
      setIsSelectMode(true);
      // Automatically select the message that was right-clicked
      if (contextMenu.messageId) {
        const newSelected = new Set(selectedMessages);
        newSelected.add(contextMenu.messageId);
        setSelectedMessages(newSelected);
      }
    } else if (action === 'delete' && contextMenu.messageId) {
      setDeleteDialog({ 
        show: true, 
        messageId: contextMenu.messageId, 
        isOwnMessage: contextMenu.isOwnMessage,
        isBulkDelete: false,
        selectedMessageIds: [],
        hasOwnMessages: false,
        hasOtherMessages: false
      });
    } else if (action.startsWith('react-') && contextMenu.messageId && selectedChat) {
      const emoji = action.split('react-')[1];
      const message = allMessages[selectedChat.id]?.find(msg => msg.id === contextMenu.messageId);
      
      if (message) {
        // Check if user already reacted with this emoji - if so, remove it; otherwise add/switch
        if (message.reaction === emoji) {
          // Remove reaction
          chatIntegration.removeReaction(String(selectedChat.id), String(contextMenu.messageId))
            .catch(err => console.error('Failed to remove reaction:', err));
        } else {
          // Add or switch reaction
          chatIntegration.reactToMessage(String(selectedChat.id), String(contextMenu.messageId), emoji)
            .catch(err => console.error('Failed to add reaction:', err));
        }
      }
    } else {
    }
    closeContextMenu();
  };

  // Handle click on replied-to message container
  const handleReplyClick = (messageId: number) => {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement;
    if (messageElement) {
      // Scroll to the message
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Flash the message after scroll completes with short pause
      setTimeout(() => {
        setFlashingMessageId(messageId);
        setTimeout(() => {
          setFlashingMessageId(null);
        }, 800); // Flash duration
      }, 400); // Wait for scroll to complete + short pause
    }
  };

  // Handle delete for me (remove message completely)
  const handleDeleteForMe = async () => {
    if (deleteDialog.messageId && selectedChat) {
      try {
        await chatIntegration.deleteMessage(
          String(selectedChat.id),
          String(deleteDialog.messageId),
          false // deleteForEveryone = false
        );
      } catch (error) {
        console.error('Failed to delete message for me:', error);
        // TODO: Show error notification to user
      }
      setDeleteDialog({ 
        show: false, 
        messageId: null, 
        isOwnMessage: false,
        isBulkDelete: false,
        selectedMessageIds: [],
        hasOwnMessages: false,
        hasOtherMessages: false
      });
    }
  };

  // Handle delete for everyone (change content to "Diese Nachricht wurde gelöscht")
  const handleDeleteForEveryone = async () => {
    if (deleteDialog.messageId && selectedChat) {
      try {
        await chatIntegration.deleteMessage(
          String(selectedChat.id),
          String(deleteDialog.messageId),
          true // deleteForEveryone = true
        );
      } catch (error) {
        console.error('Failed to delete message for everyone:', error);
        // TODO: Show error notification to user
      }
      setDeleteDialog({ 
        show: false, 
        messageId: null, 
        isOwnMessage: false,
        isBulkDelete: false,
        selectedMessageIds: [],
        hasOwnMessages: false,
        hasOtherMessages: false
      });
    }
  };

  // Handle copying all selected messages
  const handleCopySelectedMessages = () => {
    if (!selectedChat || selectedMessages.size === 0) return;
    
    const messagesToCopy = allMessages[selectedChat.id]?.filter(msg => 
      selectedMessages.has(msg.id)
    ) || [];
    
    const copiedText = messagesToCopy
      .sort((a, b) => a.id - b.id) // Sort by message order
      .map(msg => `${msg.sender}: ${msg.content}`)
      .join('\n');
    
    navigator.clipboard.writeText(copiedText).catch(err => {
      console.error('Failed to copy messages:', err);
    });
    
    // Exit select mode after copying
    setIsSelectMode(false);
    setSelectedMessages(new Set());
  };

  // Handle deleting selected messages with appropriate dialog
  const handleDeleteSelectedMessages = () => {
    if (!selectedChat || selectedMessages.size === 0) return;
    
    const messagesToDelete = allMessages[selectedChat.id]?.filter(msg => 
      selectedMessages.has(msg.id)
    ) || [];
    
    const hasOwnMessages = messagesToDelete.some(msg => msg.own);
    const hasOtherMessages = messagesToDelete.some(msg => !msg.own);
    
    setDeleteDialog({ 
      show: true, 
      messageId: null, 
      isOwnMessage: false,
      isBulkDelete: true,
      selectedMessageIds: Array.from(selectedMessages),
      hasOwnMessages,
      hasOtherMessages
    });
  };

  const messages = selectedChat ? allMessages[selectedChat.id] || [] : [];

  // Auto-scroll to bottom when messages change or chat changes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  }, [messages.length, selectedChat]);

  // Close participants dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showParticipants) {
        const target = event.target as Element;
        const participantsContainer = target.closest('[data-participants]');
        if (!participantsContainer) {
          setShowParticipants(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showParticipants]);

  // Handle click outside context menu, attachment popup, and photo editor
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      if (contextMenu.show) {
        closeContextMenu();
      }
      if (contactContextMenu.show) {
        closeContactContextMenu();
      }
      if (attachmentPopup && !target.closest('[data-attachment-popup]') && !target.closest('[data-attachment-trigger]')) {
        setAttachmentPopup(false);
      }
      if (photoEditor && !target.closest('[data-photo-editor]')) {
        setPhotoEditor(null);
        setColorPalette({ show: false, selectedColor: '#000000' });
        setDrawingPaths([]);
      }
      if (pdfEditor && !target.closest('[data-pdf-editor]')) {
        setPdfEditor(null);
      }
      const insideEmojiPicker = target.closest('[data-emoji-picker]');
      const isEmojiTrigger = target.closest('[data-emoji-trigger]');
      const insidePollModal = target.closest('[data-poll-modal]');
      // For poll creation, keep picker open when clicking inside the poll modal; close only on true outside
      if (
        emojiPicker.show &&
        !insideEmojiPicker &&
        !isEmojiTrigger &&
        !((emojiPicker.context === 'poll_question' || emojiPicker.context === 'poll_option') && insidePollModal)
      ) {
        setEmojiPicker(prev => ({ ...prev, show: false, optionIndex: null, anchor: null, dimensions: null }));
      }
      if (showPollModal && !insidePollModal && !insideEmojiPicker && !isEmojiTrigger) {
        setShowPollModal(false);
        setPollOptions(['', '']);
        setEmojiPicker(prev => ({ ...prev, show: false, optionIndex: null, anchor: null, dimensions: null }));
      }
      if (groupCreationPopup.show && !target.closest('[data-group-popup]') && !target.closest('[data-group-trigger]')) {
        setGroupCreationPopup({ show: false, selectedContacts: [], searchQuery: '', step: 1, groupName: '', groupDescription: '', profileImage: null, profileImageFile: null, readOnly: false });
      }
    };

    if (contextMenu.show || contactContextMenu.show || attachmentPopup || photoEditor || pdfEditor || emojiPicker.show || groupCreationPopup.show || showPollModal) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu.show, contactContextMenu.show, attachmentPopup, photoEditor, pdfEditor, colorPalette.show, emojiPicker.show, groupCreationPopup.show, showPollModal]);

  // Handle escape key to cancel reply, edit, delete dialog, or photo editor
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (photoEditor) {
          setPhotoEditor(null);
          setColorPalette({ show: false, selectedColor: '#000000' });
          setDrawingPaths([]);
        }
        if (replyingTo) {
          setReplyingTo(null);
          setReplyAnimation(null);
          // Clean up keyframe
          const existingStyle = document.getElementById('reply-keyframes');
          if (existingStyle) {
            existingStyle.remove();
          }
        }
        if (editingMessage) {
          setEditingMessage(null);
          setEditAnimation(null);
          setMessageInput("");
          // Clean up edit keyframe
          const existingEditStyle = document.getElementById('edit-keyframes');
          if (existingEditStyle) {
            existingEditStyle.remove();
          }
        }
        if (deleteDialog.show) {
          setDeleteDialog({ 
            show: false, 
            messageId: null, 
            isOwnMessage: false, 
            isBulkDelete: false, 
            selectedMessageIds: [], 
            hasOwnMessages: false, 
            hasOtherMessages: false 
          });
        }
        if (clearChatDialog.show) {
          setClearChatDialog({ show: false, contactId: null });
        }
        if (kickMemberDialog.show) {
          setKickMemberDialog({ show: false, memberName: '', memberIndex: null });
        }

        if (emojiPicker.show) {
          setEmojiPicker(prev => ({ ...prev, show: false, optionIndex: null, anchor: null, dimensions: null }));
        }
        if (groupCreationPopup.show) {
          setGroupCreationPopup({ show: false, selectedContacts: [], searchQuery: '', step: 1, groupName: '', groupDescription: '', profileImage: null, profileImageFile: null, readOnly: false });
        }
        if (showPromotorSelection) {
          setShowPromotorSelection(false);
        }
      }
    };

    if (photoEditor || replyingTo || editingMessage || deleteDialog.show || clearChatDialog.show || emojiPicker.show || groupCreationPopup.show || showPollModal) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [photoEditor, replyingTo, editingMessage, deleteDialog, clearChatDialog, emojiPicker, groupCreationPopup, showPollModal]);

  // Fetch current user ID
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { createSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUserId(user.id);
        }
      } catch (error) {
        console.error('Error fetching current user:', error);
      }
    };

    fetchCurrentUser();
  }, []);

  // Fetch promotors list for group creation
  useEffect(() => {
    const fetchPromotors = async () => {
      try {
        const response = await fetch('/api/chat/promotors');
        if (response.ok) {
          const data = await response.json();
          setPromotorsList(data.promotors || []);
        }
      } catch (error) {
        console.error('Error fetching promotors:', error);
      }
    };

    fetchPromotors();
  }, []);

  // Load messages when a conversation is selected
  useEffect(() => {
    if (selectedChat && selectedChat.id) {
      // Convert number ID to string for API call (if needed)
      const convId = String(selectedChat.id);
      chatIntegration.fetchMessages(convId);
      chatIntegration.markConversationRead(convId).catch(err => console.error('Error marking as read:', err));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChat]);

  // Helper function to check if line segment intersects with circle
  const checkLineCircleIntersection = (
    pointA: { x: number; y: number }, 
    pointB: { x: number; y: number }, 
    circleCenter: { x: number; y: number }, 
    radius: number
  ): boolean => {
    const dx = pointB.x - pointA.x;
    const dy = pointB.y - pointA.y;
    const fx = pointA.x - circleCenter.x;
    const fy = pointA.y - circleCenter.y;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = (fx * fx + fy * fy) - radius * radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return false;

    const sqrt = Math.sqrt(discriminant);
    const t1 = (-b - sqrt) / (2 * a);
    const t2 = (-b + sqrt) / (2 * a);

    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
  };

  const openPollEmojiPicker = (triggerRect: DOMRect, context: 'poll_question' | 'poll_option', optionIndex: number | null = null) => {
    const padding = 16;
    const gap = 14;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const modalRect = pollModalRef.current?.getBoundingClientRect();
    const baseLeft = (modalRect ? modalRect.right : triggerRect.right) + gap + window.scrollX;
    const minWidth = 320;
    const maxWidth = 560;
    const availableWidth = viewportWidth + window.scrollX - padding - baseLeft;
    const width = Math.max(minWidth, Math.min(maxWidth, availableWidth));
    const maxLeft = viewportWidth + window.scrollX - padding - width;
    const clampedLeft = Math.max(window.scrollX + padding, Math.min(baseLeft, maxLeft));
    const height = 204;
    if (context === 'poll_question' && pollEmojiBaseTopRef.current.question == null) {
      const firstOptionInput = pollModalRef.current?.querySelector('[data-poll-option-input="0"]') as HTMLInputElement | null;
      pollEmojiBaseTopRef.current.question = firstOptionInput ? firstOptionInput.getBoundingClientRect().top + window.scrollY : triggerRect.top + window.scrollY;
    }
    if (context === 'poll_option' && pollEmojiBaseTopRef.current.option == null) {
      const firstOptionInput = pollModalRef.current?.querySelector('[data-poll-option-input="0"]') as HTMLInputElement | null;
      pollEmojiBaseTopRef.current.option = firstOptionInput ? firstOptionInput.getBoundingClientRect().top + window.scrollY : triggerRect.top + window.scrollY;
    }
    const baseTop = context === 'poll_question'
      ? pollEmojiBaseTopRef.current.question ?? (triggerRect.top + window.scrollY)
      : pollEmojiBaseTopRef.current.option ?? (triggerRect.top + window.scrollY);
    const desiredTop = baseTop - 6;
    const maxTop = viewportHeight + window.scrollY - padding - height;
    const clampedTop = Math.max(window.scrollY + padding, Math.min(desiredTop, maxTop));

    setEmojiPicker(prev => {
      if (prev.show && prev.context === context && (context !== 'poll_option' || prev.optionIndex === optionIndex)) {
        return { ...prev, show: false, optionIndex: null, anchor: null, dimensions: null };
      }
      return {
        show: true,
        selectedCategory: prev.selectedCategory,
        context,
        optionIndex: context === 'poll_option' ? optionIndex : null,
        anchor: { top: clampedTop, left: clampedLeft },
        dimensions: { width, height }
      };
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Admin Navigation */}
      <AdminNavigation sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'ml-56' : 'ml-14'} h-screen flex bg-gray-50`}>
        
        {/* Left Sidebar - Contacts */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white relative">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold text-gray-800">Chats</h1>
            <SquarePen 
              className="h-5 w-5 text-gray-600 cursor-pointer" 
              onClick={() => setGroupCreationPopup(prev => ({ ...prev, show: !prev.show }))}
              data-group-trigger
            />
          </div>
          
          {/* Search */}
          <div className="relative" ref={searchDropdownRef}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suche oder starte neuen Chat"
              value={mainSearchQuery}
              onChange={(e) => {
                setMainSearchQuery(e.target.value);
                setShowSearchDropdown(e.target.value.length > 0);
              }}
              onFocus={() => {
                if (mainSearchQuery.length > 0) {
                  setShowSearchDropdown(true);
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none"
            />
            
            {/* Search Dropdown */}
            {showSearchDropdown && mainSearchQuery.length > 0 && (
              <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                {promotorsList
                  .filter(promotor => 
                    promotor.display_name.toLowerCase().includes(mainSearchQuery.toLowerCase())
                  )
                  .map(promotor => (
                    <div
                      key={promotor.user_id}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={async () => {
                        try {
                          // Create or find existing direct chat with this promotor
                          const newConversation = await chatIntegration.createConversation(
                            'direct',
                            [promotor.user_id],
                            undefined,
                            undefined
                          );
                          
                          // Select the chat (use promotor name for direct chats)
                          setSelectedChat({
                            id: newConversation.id,
                            name: newConversation.name || promotor.display_name,
                            lastMessage: '',
                            time: '',
                            unread: 0,
                            online: false,
                            isGroup: false,
                            readOnly: false,
                          });
                          
                          // Clear search
                          setMainSearchQuery('');
                          setShowSearchDropdown(false);
                        } catch (error) {
                          console.error('Failed to create/open chat:', error);
                        }
                      }}
                    >
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-medium mr-3">
                        {promotor.display_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{promotor.display_name}</div>
                        <div className="text-xs text-gray-500">Promotor</div>
                      </div>
                    </div>
                  ))}
                
                {/* No results message */}
                {promotorsList.filter(promotor => 
                  promotor.display_name.toLowerCase().includes(mainSearchQuery.toLowerCase())
                ).length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    Keine Promotors gefunden
                  </div>
                )}
              </div>

            )}
          </div>

          {/* Votes Drawer (admin only) */}
          {votesDrawer.open && (
            <PollVotesDrawer
              open={votesDrawer.open}
              onClose={() => setVotesDrawer({ open: false, pollId: null, question: '', options: [], anchorRect: null })}
              question={votesDrawer.question}
              options={votesDrawer.options}
              resolveUser={(userId: string) => ({ name: getNameForUser(userId), avatar: getAvatarForUser(userId) })}
              theme="admin"
              anchorRect={votesDrawer.anchorRect}
            />
          )}

          {/* Group Creation Popup */}
          {groupCreationPopup.show && (
            <div className="absolute top-12 right-4 bg-white rounded-lg shadow-xl border border-gray-200 z-50 w-72 max-h-96 flex flex-col opacity-97" data-group-popup>
              {groupCreationPopup.step === 1 ? (
                <>
                  {/* Popup Search */}
                  <div className="p-3 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Kontakte suchen..."
                        value={groupCreationPopup.searchQuery}
                        onChange={(e) => setGroupCreationPopup(prev => ({ ...prev, searchQuery: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Promotors List with Checkboxes */}
                  <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
                    {promotorsList
                      .filter(promotor => 
                        promotor.display_name.toLowerCase().includes(groupCreationPopup.searchQuery.toLowerCase())
                      )
                      .map(promotor => (
                        <div 
                          key={promotor.user_id}
                          className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                          onClick={() => {
                            setGroupCreationPopup(prev => ({
                              ...prev,
                              selectedContacts: prev.selectedContacts.includes(promotor.user_id)
                                ? prev.selectedContacts.filter(id => id !== promotor.user_id)
                                : [...prev.selectedContacts, promotor.user_id]
                            }));
                          }}
                        >
                          <div className="flex items-center">
                            <div 
                              className={`mr-3 w-4 h-4 rounded border-2 flex items-center justify-center cursor-pointer ${
                                groupCreationPopup.selectedContacts.includes(promotor.user_id) 
                                  ? 'border-transparent' 
                                  : 'border-gray-300'
                              }`}
                              style={groupCreationPopup.selectedContacts.includes(promotor.user_id) 
                                ? { backgroundColor: '#22C55E' }
                                : {}
                              }
                            >
                              {groupCreationPopup.selectedContacts.includes(promotor.user_id) && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
                            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-white font-medium mr-3">
                              {promotor.display_name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{promotor.display_name}</div>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>

                  {/* Submit Button (appears when contacts selected) */}
                  {groupCreationPopup.selectedContacts.length > 0 && (
                    <div className="p-3 border-t border-gray-100">
                      <button
                        className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #22C55E, #105F2D)'
                        }}
                        data-group-popup
                        onClick={async (e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          
                          // If only 1 contact selected, create direct chat immediately
                          if (groupCreationPopup.selectedContacts.length === 1) {
                            try {
                              const selectedPromotorId = groupCreationPopup.selectedContacts[0];
                              const selectedPromotor = promotorsList.find(p => p.user_id === selectedPromotorId);
                              
                              const newConversation = await chatIntegration.createConversation(
                                'direct',
                                groupCreationPopup.selectedContacts,
                                undefined, // No name for direct chats
                                undefined
                              );
                              
                              // Close popup
                              setGroupCreationPopup({ 
                                show: false, 
                                selectedContacts: [], 
                                searchQuery: '', 
                                step: 1, 
                                groupName: '', 
                                groupDescription: '', 
                                profileImage: null, 
                                readOnly: false 
                              });
                              
                              // Select the new chat (use promotor name for direct chats)
                              setSelectedChat({
                                id: newConversation.id,
                                name: newConversation.name || selectedPromotor?.display_name || 'Direct Chat',
                                lastMessage: '',
                                time: '',
                                unread: 0,
                                online: false,
                                isGroup: false,
                                readOnly: false,
                              });
                            } catch (error) {
                              console.error('Failed to create direct chat:', error);
                            }
                          } else {
                            // Multiple contacts - go to group naming step
                          setGroupCreationPopup(prev => ({ ...prev, step: 2 }));
                          }
                        }}
                      >
                        {groupCreationPopup.selectedContacts.length === 1 
                          ? 'Chat erstellen' 
                          : `Weiter (${groupCreationPopup.selectedContacts.length})`}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                // Step 2: Group Details
                <>
                  <div className="p-3 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Gruppe erstellen</h3>
                  </div>
                  
                  <div className="p-3 space-y-2 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {/* Group Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gruppenname *
                      </label>
                      <input
                        type="text"
                        placeholder="Gruppenname eingeben..."
                        value={groupCreationPopup.groupName}
                        onChange={(e) => setGroupCreationPopup(prev => ({ ...prev, groupName: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none border border-gray-200"
                      />
                    </div>

                    {/* Group Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Beschreibung (optional)
                      </label>
                      <textarea
                        placeholder="Gruppenbeschreibung..."
                        value={groupCreationPopup.groupDescription}
                        onChange={(e) => setGroupCreationPopup(prev => ({ ...prev, groupDescription: e.target.value }))}
                        className="w-full px-3 py-2 bg-gray-50 rounded-lg text-sm focus:outline-none border border-gray-200 resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Group Profile Picture */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Profilbild (optional)
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {groupCreationPopup.profileImage ? (
                            <img 
                              src={groupCreationPopup.profileImage} 
                              alt="Group profile" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Image className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                setGroupCreationPopup(prev => ({ 
                                  ...prev, 
                                  profileImage: event.target?.result as string,
                                  profileImageFile: file
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                          id="group-profile-input"
                        />
                        <button 
                          className="px-2 py-1 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                          onClick={() => document.getElementById('group-profile-input')?.click()}
                          type="button"
                        >
                          Bild auswählen
                        </button>
                      </div>
                    </div>

                    {/* Note: All group chats are automatically read-only for promotors */}
                  </div>

                  {/* Create Button */}
                  <div className="p-2 border-t border-gray-100">
                    <button
                      className="w-full py-2 px-4 rounded-lg text-white font-medium transition-all"
                      style={{
                        background: 'linear-gradient(135deg, #22C55E, #105F2D)',
                        opacity: groupCreationPopup.groupName.trim() ? 1 : 0.3
                      }}
                      disabled={!groupCreationPopup.groupName.trim()}
                      onClick={async () => {
                        if (!groupCreationPopup.groupName.trim()) return;
                        
                        try {
                          // Upload profile picture if one was selected
                          let profilePictureUrl: string | undefined = undefined;
                          if (groupCreationPopup.profileImageFile) {
                            try {
                              profilePictureUrl = await uploadGroupPicture(groupCreationPopup.profileImageFile);
                            } catch (uploadError) {
                              console.error('Failed to upload group picture:', uploadError);
                              // Continue without profile picture if upload fails
                            }
                          }

                          // Create new group conversation via API
                          const newConversation = await chatIntegration.createConversation(
                            'group',
                            groupCreationPopup.selectedContacts, // These are user_id strings
                            groupCreationPopup.groupName,
                            groupCreationPopup.groupDescription || undefined,
                            profilePictureUrl
                          );
                          
                          // Close popup and reset state
                          setGroupCreationPopup({ 
                            show: false, 
                            selectedContacts: [], 
                            searchQuery: '', 
                            step: 1, 
                            groupName: '', 
                            groupDescription: '', 
                            profileImage: null, 
                            profileImageFile: null,
                            readOnly: false 
                          });
                          
                          // Select the new conversation (conversation list will auto-update via chatIntegration)
                          setSelectedChat({
                            id: newConversation.id,
                            name: newConversation.name,
                            lastMessage: '',
                            time: '',
                            unread: 0,
                            online: false,
                            isGroup: true,
                            readOnly: true, // Groups are always read-only for promotors
                          });
                        } catch (error) {
                          console.error('Failed to create group:', error);
                          // TODO: Show error notification to user
                        }
                      }}
                    >
                      Gruppe erstellen
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto relative [&::-webkit-scrollbar]:hidden" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>

          {chatIntegration.loading ? (
            // Loading Skeletons
            <>
              {[...Array(8)].map((_, index) => (
                <div key={`skeleton-${index}`} className="flex items-center p-3 m-2">
                  <div className="w-12 h-12 bg-gray-200 rounded-full animate-skeleton-fade"></div>
                  <div className="ml-3 flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-2/3 animate-skeleton-fade"></div>
                    <div className="h-3 bg-gray-100 rounded w-1/2 animate-skeleton-fade"></div>
                  </div>
                  <div className="ml-auto">
                    <div className="h-3 bg-gray-100 rounded w-12 animate-skeleton-fade"></div>
                  </div>
                </div>
              ))}
            </>
          ) : sortedContacts.map((contact, index) => (
            <div
              key={contact.id}
              onClick={() => {
                setSelectedChat(contact);
                // Clear unread indicators when opening chat
                setContacts(prev => prev.map(c => 
                  c.id === contact.id 
                    ? { ...c, unread: 0, markedUnread: false }
                    : c
                ));
              }}
              onContextMenu={(e) => handleContactContextMenu(e, contact.id)}
              className={`flex items-center p-3 m-2 cursor-pointer rounded-lg relative z-10 transition-colors duration-200 ${
                selectedChat?.id === contact.id 
                  ? 'bg-gray-200' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {/* Avatar */}
              <div className="relative">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                  {contact.profileImage ? (
                    <img 
                      src={contact.profileImage} 
                      alt={contact.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-medium">{contact.name.charAt(0)}</span>
                  )}
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              
              {/* Content */}
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-gray-900 truncate">{contact.name}</p>
                  <div className="flex items-center space-x-1">
                    {contact.pinned && (
                      <Pin className="h-3 w-3 text-gray-400 opacity-50" />
                    )}
                    <span className="text-xs text-gray-500">{contact.time}</span>
                  </div>
                </div>
                <div className="flex items-center mt-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-600 truncate pr-2 flex items-center gap-1">
                      {contact.lastMessageKind === 'photo' && (
                        <Camera className="h-4 w-4 text-gray-700" />
                      )}
                      {contact.lastMessageKind === 'pdf' && (
                        <FileText className="h-4 w-4 text-gray-700" />
                      )}
                      {contact.lastMessage}
                    </p>
                  </div>
                  {(contact.unread > 0 || contact.markedUnread) && (
                    <span 
                      className="text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                      style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)'}}
                    >
                      {contact.unread > 0 ? contact.unread : ''}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Side - Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50 relative">
        
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div 
              className="bg-white border-b border-gray-200 p-4 flex items-center justify-between relative"
              style={{
                boxShadow: 'inset 20px 0 30px -20px rgba(0,0,0,0.15)'
              }}
            >
              <div className="flex items-center">
                <div className="relative">
                  <div 
                    className={`w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden ${selectedChat.isGroup ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                    onClick={() => {
                      if (selectedChat.isGroup) {
                        groupPictureInputRef.current?.click();
                      }
                    }}
                  >
                    {selectedChat.profileImage ? (
                      <img 
                        src={selectedChat.profileImage} 
                        alt={selectedChat.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-medium">{selectedChat.name.charAt(0)}</span>
                    )}
                  </div>
                  {selectedChat.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="ml-3">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedChat.name}</h2>
                  {selectedChat.isGroup ? (
                    <p 
                      className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 transition-colors break-words max-w-[55vw]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowParticipants(true);
                      }}
                    >
                      {(() => {
                        const names = selectedChat.memberNames || [];
                        return names.length <= 3 ? names.join(', ') : `${names.slice(0, 2).join(', ')}...`;
                      })()}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500">{selectedChat.online ? 'Online' : 'Zuletzt online heute'}</p>
                  )}
                </div>
              </div>
              
                                            <div className="flex space-x-4">
                {isSelectMode && (
                  <>
                    <Copy 
                      className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800" 
                      onClick={handleCopySelectedMessages}
                    />
                    <Trash2 
                      className="h-5 w-5 text-red-600 cursor-pointer hover:text-red-800" 
                      onClick={handleDeleteSelectedMessages}
                    />
                  </>
                )}
                {selectedChat.isGroup && selectedChat.readOnly && (
                  <div 
                    className="relative"
                    onClick={() => setShowReadOnlyTooltip(prev => !prev)}
                    ref={readOnlyTooltipRef}
                  >
                    <Lock 
                      className="h-5 w-5 text-gray-600" 
                      aria-label="Nur Admins dürfen schreiben"
                    />
                    {showReadOnlyTooltip && (
                      <div 
                        className="absolute top-8 right-0 z-50 w-64 rounded-lg shadow-lg border border-gray-200 bg-white p-3"
                      >
                        <p className="text-sm font-medium text-gray-900">Nur <span className="text-blue-600">Admins</span> dürfen schreiben</p>
                        <p className="text-xs text-gray-600 mt-1">Dies ist eine reine <span className="text-blue-600">Ankündigungsgruppe</span>. <span className="text-blue-600">Admins</span> können schreiben, <span className="text-blue-600">Promotors</span> lesen nur.</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="relative" data-info-menu>
                  <Info 
                    className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800" 
                    onClick={() => setInfoMenu(prev => ({ ...prev, show: !prev.show }))}
                  />
                  
                  {/* Info Menu Dropdown */}
                  {infoMenu.show && (
                    <div 
                      className="absolute top-8 right-0 rounded-lg shadow-lg border border-gray-200 z-50"
                      style={{ 
                        width: '320px', 
                        minHeight: '400px',
                        backgroundColor: 'rgba(255, 255, 255, 0.97)'
                      }}
                    >
                                             {/* Menu Header */}
                      <div className="flex border-b border-gray-100 relative">
                        <button
                          onClick={() => setInfoMenu(prev => ({ ...prev, selectedTab: 'fotos' }))}
                          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                            infoMenu.selectedTab === 'fotos'
                              ? 'text-transparent'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          style={infoMenu.selectedTab === 'fotos' ? {
                            background: 'linear-gradient(135deg, #22C55E, #105F2D)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          } : {}}
                        >
                          Fotos
                        </button>
                        <button
                          onClick={() => setInfoMenu(prev => ({ ...prev, selectedTab: 'media' }))}
                          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                            infoMenu.selectedTab === 'media'
                              ? 'text-transparent'
                              : 'text-gray-600 hover:text-gray-800'
                          }`}
                          style={infoMenu.selectedTab === 'media' ? {
                            background: 'linear-gradient(135deg, #22C55E, #105F2D)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                          } : {}}
                        >
                          Media
                        </button>
                        {/* Sliding underline */}
                        <div 
                          className="absolute bottom-0 h-0.5 transition-all duration-300 ease-in-out"
                          style={{
                            background: 'linear-gradient(135deg, #22C55E, #105F2D)',
                            width: '50%',
                            transform: infoMenu.selectedTab === 'fotos' ? 'translateX(0)' : 'translateX(100%)'
                          }}
                        />
                      </div>
                      
                      {/* Menu Content */}
                      <div className="p-4">
                        {infoMenu.selectedTab === 'fotos' && (
                          <>
                            {getAllPhotosFromChat().length > 0 ? (
                              <div 
                                className="max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                              >
                                <div className="grid grid-cols-4 gap-2">
                                  {getAllPhotosFromChat().map((photo, index) => (
                                    <button
                                      key={index}
                                      onClick={() => {
                                        openPhotoViewer(photo);
                                        setInfoMenu(prev => ({ ...prev, show: false }));
                                      }}
                                      className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                                    >
                                      <img
                                        src={photo}
                                        alt={`Photo ${index + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 py-8">
                                <p>Keine Fotos vorhanden</p>
                              </div>
                            )}
                          </>
                        )}
                        
                        {infoMenu.selectedTab === 'media' && (
                          <>
                            {getAllPdfsFromChat().length > 0 ? (
                              <div 
                                className="max-h-80 overflow-y-auto [&::-webkit-scrollbar]:hidden"
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                              >
                                <div className="grid grid-cols-4 gap-2">
                                  {getAllPdfsFromChat().map((pdf, index) => (
                                    <div
                                      key={index}
                                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer flex flex-col items-center justify-center p-2"
                                      onClick={() => {
                                        window.open(pdf.url, '_blank');
                                        setInfoMenu(prev => ({ ...prev, show: false }));
                                      }}
                                    >
                                      <div className="flex-1 flex items-center justify-center">
                                        <FileText className="w-8 h-8 text-red-500" />
                                      </div>
                                      <div className="text-xs text-gray-700 text-center truncate w-full mt-1">
                                        {pdf.name}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 py-8">
                                <p>Keine PDF-Dateien vorhanden</p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Participants Dropdown */}
              {showParticipants && selectedChat?.isGroup && (
                <div 
                  className="absolute top-full left-4 mt-2 rounded-lg shadow-lg border border-gray-200 z-50"
                  data-participants
                  style={{ 
                    width: '320px',
                    maxHeight: '400px',
                    backgroundColor: 'rgba(255, 255, 255, 0.97)',
                    animation: 'slideDownFromTop 0.3s ease-out'
                  }}
                >
                  {/* Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">
                        Gruppenteilnehmer ({selectedChat.memberNames?.length || 0})
                      </h3>
                      <button
                        onClick={() => setShowPromotorSelection(true)}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Participants List */}
                  <div className="p-4 max-h-64 overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <div className="space-y-3">
                      {(selectedChat.memberNames || []).map((name, index) => (
                        <div key={index} className="flex items-center space-x-3 group hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors">
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center overflow-hidden">
                            <span className="text-white text-xs font-medium">{name.charAt(0)}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{name}</p>
                            <p className="text-xs text-gray-500">Online</p>
                          </div>
                          <button
                            onClick={() => setKickMemberDialog({ show: true, memberName: name, memberIndex: index })}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all duration-200"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Kick Member Confirmation Dialog */}
            {kickMemberDialog.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[9999] flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Mitglied entfernen</h3>
                  <p className="text-sm text-gray-600 mb-6">
                    Möchten Sie <strong>{kickMemberDialog.memberName}</strong> wirklich aus der Gruppe entfernen?
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setKickMemberDialog({ show: false, memberName: '', memberIndex: null })}
                      className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={async () => {
                        if (kickMemberDialog.memberIndex !== null && selectedChat && selectedChat.members) {
                          const userIdToRemove = selectedChat.members[kickMemberDialog.memberIndex];
                          
                          try {
                            // Call API to remove participant
                            const response = await fetch('/api/chat/participants/remove', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                conversationId: selectedChat.id,
                                userId: userIdToRemove,
                              }),
                            });

                            if (response.ok) {
                              // Reload conversations to get updated participant list
                              chatIntegration.fetchConversations();
                              
                              // Reload messages to show the system message
                              if (selectedChat?.id) {
                                chatIntegration.fetchMessages(String(selectedChat.id));
                              }
                              
                            } else {
                              const error = await response.json();
                              console.error('Failed to remove participant:', error);
                              alert('Fehler beim Entfernen des Mitglieds');
                            }
                          } catch (error) {
                            console.error('Error removing participant:', error);
                            alert('Fehler beim Entfernen des Mitglieds');
                          }
                        }
                        setKickMemberDialog({ show: false, memberName: '', memberIndex: null });
                      }}
                      className="flex-1 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors"
                      style={{ background: 'linear-gradient(135deg, #DC2626, #B91C1C)' }}
                    >
                      Entfernen
                    </button>
                  </div>
                </div>
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
                        {/* temp options removed in favor of real data */} {[]}
                        
                        {(() => {
                          // Filter out promotors already in the group
                          const existingMemberIds = new Set(selectedChat?.members || []);
                          const availablePromotors = promotorsList.filter(p => !existingMemberIds.has(p.user_id));
                          
                          return availablePromotors
                            .filter(promotor => 
                              (activeRegionFilter === "all" || (promotor.region && promotor.region === activeRegionFilter)) &&
                              promotor.display_name.toLowerCase().includes(promotorSelectionSearch.toLowerCase())
                            )
                            .map((promotor) => {
                              const isSelected = selectedPromotors.includes(promotor.display_name);
                              return (
                                <button
                                  key={promotor.user_id}
                                  onClick={() => {
                                    if (isSelected) {
                                      setSelectedPromotors(prev => prev.filter(name => name !== promotor.display_name));
                                    } else {
                                      setSelectedPromotors(prev => [...prev, promotor.display_name]);
                                    }
                                  }}
                                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 w-full h-10 flex items-center justify-center border ${
                                    isSelected
                                      ? "bg-white/80 text-gray-900 shadow-md border-gray-300 backdrop-blur-sm"
                                      : `${getRegionGradient(promotor.region || '')} ${getRegionBorder(promotor.region || '')} text-gray-700 hover:bg-gray-200/80`
                                  }`}
                                >
                                  {promotor.display_name}
                                </button>
                              );
                            });
                        })()}
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
                            onClick={async () => {
                              // Add selected promotors to group
                              if (selectedChat && selectedPromotors.length > 0) {
                                try {
                                  // Map selected promotor names to user IDs
                                  const userIdsToAdd = selectedPromotors
                                    .map(name => promotorsList.find(p => p.display_name === name)?.user_id)
                                    .filter((id): id is string => id !== undefined);

                                  if (userIdsToAdd.length === 0) {
                                    alert('Keine gültigen Promotoren ausgewählt');
                                    return;
                                  }

                                  // Call API to add participants
                                  const response = await fetch('/api/chat/participants/add', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      conversationId: selectedChat.id,
                                      userIds: userIdsToAdd,
                                    }),
                                  });

                                  if (response.ok) {
                                    // Reload conversations to get updated participant list
                                    chatIntegration.fetchConversations();
                                    
                                    // Reload messages to show the system message
                                    if (selectedChat?.id) {
                                      chatIntegration.fetchMessages(String(selectedChat.id));
                                    }
                                    
                                    
                                    // Reset selection
                                    setSelectedPromotors([]);
                                    setShowPromotorSelection(false);
                                  } else {
                                    const error = await response.json();
                                    console.error('Failed to add participants:', error);
                                    alert('Fehler beim Hinzufügen der Promotoren');
                                  }
                                } catch (error) {
                                  console.error('Error adding participants:', error);
                                  alert('Fehler beim Hinzufügen der Promotoren');
                                }
                              } else {
                                setShowPromotorSelection(false);
                              }
                            }}
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

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              onScroll={evaluateScrollPosition}
              className="flex-1 overflow-y-auto pt-4 px-4 pb-20 [&::-webkit-scrollbar]:hidden"
              style={{
                boxShadow: 'inset 20px 0 30px -20px rgba(0,0,0,0.15)',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                backgroundImage: `
                  radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)
                `,
                backgroundSize: '20px 20px'
              }}
            >
              {chatIntegration.loading ? (
                // Message Loading Skeleton
                <div className="space-y-4">
                  {[...Array(6)].map((_, index) => (
                    <div 
                      key={`msg-skeleton-${index}`} 
                      className={`flex ${index % 3 === 0 ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs ${index % 3 === 0 ? 'bg-green-100' : 'bg-white border border-gray-200'} rounded-lg p-3`}>
                        <div className="h-4 bg-gray-200 rounded w-48 mb-2 animate-skeleton-fade"></div>
                        <div className="h-4 bg-gray-200 rounded w-32 animate-skeleton-fade"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
              <div className="space-y-4">
                {messages.map((message: Message, index: number) => {
                  // Create fake dates for demonstration - different dates based on message groups
                  const getFakeDate = (msgIndex: number) => {
                    if (msgIndex < 5) return '2024-01-15';
                    if (msgIndex < 10) return '2024-01-16'; 
                    if (msgIndex < 15) return '2024-01-17';
                    return '2024-01-18';
                  };
                  
                  const currentDate = getFakeDate(index);
                  const previousDate = index > 0 ? getFakeDate(index - 1) : null;
                  const showDateSeparator = index === 0 || currentDate !== previousDate;

                  return (
                    <React.Fragment key={`fragment-${message.id}`}>
                      {/* Date Separator */}
                      {showDateSeparator && (
                        <div className="flex justify-center my-4">
                                                     <div className="bg-gray-100 rounded-full px-3 py-1 opacity-60">
                             <span className="text-xs text-gray-500">
                               {new Date(currentDate).toLocaleDateString('de-DE', {
                                 weekday: 'short',
                                 day: 'numeric',
                                 month: 'short',
                                 year: 'numeric'
                               })}
                             </span>
                           </div>
                        </div>
                      )}
                      
                      {/* Message */}
                      {message.type === "system" ? (
                        // System Message Card (like date separator)
                        <div className="flex justify-center my-4">
                          <div className="bg-gray-100 rounded-full px-3 py-1 opacity-60">
                            <span className="text-xs text-gray-500">
                              {message.content}
                            </span>
                          </div>
                        </div>
                      ) : (
                  <div
                    key={message.id}
                    className={`flex items-center ${message.own ? 'justify-end' : 'justify-start'} ${
                      replyingTo?.id === message.id || editingMessage?.id === message.id ? 'opacity-0' : ''
                    } transition-all duration-300 ease-out`}
                    data-message-id={message.id}
                  >
                    {/* Checkbox for received messages (left side) */}
                    {isSelectMode && !message.own && (
                      <div className="flex items-center animate-slide-from-left">
                        <div
                          onClick={() => {
                            const newSelected = new Set(selectedMessages);
                            if (selectedMessages.has(message.id)) {
                              newSelected.delete(message.id);
                            } else {
                              newSelected.add(message.id);
                            }
                            setSelectedMessages(newSelected);
                          }}
                          className="mr-2 h-4 w-4 rounded-lg cursor-pointer flex items-center justify-center"
                          style={{
                            background: selectedMessages.has(message.id) 
                              ? 'linear-gradient(135deg, #22C55E, #105F2D)' 
                              : 'white',
                            border: '2px solid #22C55E'
                          }}
                        >
                          {selectedMessages.has(message.id) && (
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    )}
                    <div
                      className={`relative max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.own
                          ? 'text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                      style={{
                        ...(message.own ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}),
                        boxShadow: flashingMessageId === message.id 
                          ? '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.8)'
                          : message.own 
                            ? '0 2px 6px rgba(16, 95, 45, 0.6)' 
                            : '0 2px 6px rgba(0,0,0,0.12)',
                        transition: 'box-shadow 0.3s ease-in-out',
                        ...(isSelectMode ? { cursor: 'pointer' } : {})
                      }}
                      onContextMenu={(e) => handleContextMenu(e, message.id, message.own)}
                      onClick={() => {
                        if (isSelectMode) {
                          const newSelected = new Set(selectedMessages);
                          if (selectedMessages.has(message.id)) {
                            newSelected.delete(message.id);
                          } else {
                            newSelected.add(message.id);
                          }
                          setSelectedMessages(newSelected);
                        }
                      }}
                    >
                      {/* Sender Name (for group chats) */}
                      {!message.own && selectedChat?.isGroup && (
                        <p 
                          className="text-xs font-semibold mb-1"
                          style={{ 
                            color: '#00897B'
                          }}
                        >
                          {message.sender}
                        </p>
                      )}
                      
                                              {message.replyTo && (
                        <div 
                          className="mt-2 mb-2 p-2 rounded border cursor-pointer"
                          style={{ 
                            backgroundColor: message.own ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.02)',
                            borderColor: message.own ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.08)' 
                          }}
                          onClick={() => handleReplyClick(message.replyTo!.id)}
                        >
                          {message.replyTo.photo ? (
                            <div className="flex justify-between">
                              <div className="flex-1 pr-2">
                                <p className={`text-xs font-medium ${message.own ? 'text-green-100' : 'text-gray-600'} opacity-50`}>
                                  {message.replyTo.sender}
                                </p>
                                {message.replyTo.content && (
                                  <p className={`text-xs mt-1 ${message.own ? 'text-green-50' : 'text-gray-700'}`}
                                     style={{ 
                                       hyphens: 'auto',
                                       wordBreak: 'break-word',
                                       overflowWrap: 'break-word',
                                       overflow: 'hidden',
                                       display: '-webkit-box',
                                       WebkitLineClamp: 1,
                                       WebkitBoxOrient: 'vertical'
                                     }}>
                                    {message.replyTo.content}
                                  </p>
                                )}
                              </div>
                              <img 
                                src={message.replyTo.photo} 
                                alt="Reply photo" 
                                className="w-10 h-10 rounded object-cover flex-shrink-0"
                              />
                            </div>
                          ) : message.replyTo.pdf ? (
                            <div className="flex justify-between">
                              <div className="flex-1 pr-2">
                                <p className={`text-xs font-medium ${message.own ? 'text-green-100' : 'text-gray-600'} opacity-50`}>
                                  {message.replyTo.sender}
                                </p>
                                <p className={`text-xs mt-1 ${message.own ? 'text-green-50' : 'text-gray-700'}`}
                                   style={{ 
                                     hyphens: 'auto',
                                     wordBreak: 'break-word',
                                     overflowWrap: 'break-word',
                                     overflow: 'hidden',
                                     display: '-webkit-box',
                                     WebkitLineClamp: 1,
                                     WebkitBoxOrient: 'vertical'
                                   }}>
                                  {message.replyTo.pdfName || message.replyTo.pdf}
                                </p>
                              </div>
                              <div 
                                className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: message.own ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)' }}
                              >
                                <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className={`text-xs font-medium ${message.own ? 'text-green-100' : 'text-gray-600'} opacity-50`}>
                                {message.replyTo.sender}
                              </p>
                              {message.replyTo.messageType === 'poll' ? (
                                <div className={`text-xs mt-1 flex items-center gap-1 ${message.own ? 'text-green-50' : 'text-gray-700'}`}>
                                  <BarChart2 className="w-3.5 h-3.5" />
                                  <span 
                                    className={`${message.replyTo.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`}
                                    style={{ 
                                      wordBreak: 'break-word',
                                      overflow: 'hidden',
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical'
                                    }}
                                  >
                                    {message.replyTo.content}
                                  </span>
                                </div>
                              ) : (
                              <p className={`text-xs mt-1 ${message.own ? 'text-green-50' : 'text-gray-700'} ${message.replyTo.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`} 
                                 style={{ 
                                   wordBreak: 'break-word',
                                   overflow: 'hidden',
                                   display: '-webkit-box',
                                   WebkitLineClamp: 2,
                                   WebkitBoxOrient: 'vertical'
                                 }}>
                                {message.replyTo.content}
                              </p>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {/* Poll Display */}
                      {(message as any).poll && (
                        <div className="mt-2 mb-2">
                          <PollMessage
                            poll={(message as any).poll}
                            mine={!!message.own}
                            theme="admin"
                            getAvatar={getAvatarForUser}
                            showViewButton
                            timestamp={message.time}
                            onViewVotes={async () => {
                              try {
                                const data = await chatIntegration.getPollVotes((message as any).poll.id);
                                const messageRow = document.querySelector(`[data-message-id="${message.id}"]`) as HTMLElement | null;
                                const pollBubble = messageRow?.querySelector('[data-poll-bubble]') as HTMLElement | null;
                                const r = pollBubble?.getBoundingClientRect();
                                setVotesDrawer({ open: true, pollId: (message as any).poll.id, question: data.poll.question, options: data.options, anchorRect: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null });
                              } catch (e) {
                                console.error('Failed to load votes', e);
                              }
                            }}
                            onToggle={async (optionId, checked) => {
                              try {
                                if (!selectedChat?.id) return;
                                await chatIntegration.votePoll(String(selectedChat.id), (message as any).poll.id, optionId, checked);
                              } catch (err) {
                                console.error('Failed to vote on poll:', err);
                              }
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Photo Display */}
                      {message.photo && (
                        <div className="mt-2 mb-2">
                          <img
                            src={message.photo}
                            alt="Shared photo"
                            className="w-full h-auto rounded-lg cursor-pointer"
                            style={{ 
                              maxHeight: '300px',
                              minHeight: '120px',
                              objectFit: 'cover',
                              aspectRatio: 'auto',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              openPhotoViewer(message.photo!);
                            }}
                          />
                        </div>
                      )}

                      {/* PDF Display */}
                      {message.pdf && (
                        <div 
                          className="mt-2 mb-2 rounded-lg p-3 flex items-center space-x-3 cursor-pointer transition-colors hover:bg-gray-200"
                          style={{ 
                            backgroundColor: message.own ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.04)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(message.pdf, '_blank');
                          }}
                        >
                          <div className="w-10 h-12 bg-red-500 rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {message.pdfName || message.pdf}
                            </div>
                            <div className="text-xs text-gray-500">
                              PDF-Dokument
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Text Content */}
                      {message.type !== 'poll' && message.content && (
                        <p 
                          className={`text-sm ${message.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`}
                          style={{ 
                            hyphens: 'auto',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {message.content}
                        </p>
                      )}
                      {message.type !== 'poll' && (
                      <p className={`text-xs mt-1 ${message.own ? 'text-green-100 text-right' : 'text-gray-500'}`} style={{ fontSize: '0.5775rem' }}>
                        {message.edited && '(edited) '}{message.time}
                      </p>
                      )}
                      
                      {/* Reaction Emoji */}
                      {message.topReaction && (
                        <div 
                          className={`absolute ${message.own ? 'right-2' : 'left-2'} bg-white rounded-full border border-gray-200 shadow-sm cursor-pointer hover:scale-110 transition-transform`}
                          style={{
                            bottom: '-13px',
                            transform: 'translate(0, 0)',
                            zIndex: 10
                          }}
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const response = await fetch(`/api/chat/reactions/${message.id}/users`);
                              if (response.ok) {
                                const data = await response.json();
                                const firstEmoji = Object.keys(data.reactions)[0] || null;
                                setReactionDetails({
                                  show: true,
                                  messageId: message.id,
                                  reactions: data.reactions,
                                  selectedEmoji: firstEmoji,
                                });
                              }
                            } catch (error) {
                              console.error('Failed to fetch reaction details:', error);
                            }
                          }}
                        >
                          <span className="text-sm px-1.5 py-0.5 block leading-none text-gray-900">
                            {message.topReaction.emoji} {message.totalReactions && message.totalReactions > 1 ? message.totalReactions : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Checkbox for own messages (right side) */}
                    {isSelectMode && message.own && (
                      <div className="flex items-center animate-slide-from-right">
                        <div
                          onClick={() => {
                            const newSelected = new Set(selectedMessages);
                            if (selectedMessages.has(message.id)) {
                              newSelected.delete(message.id);
                            } else {
                              newSelected.add(message.id);
                            }
                            setSelectedMessages(newSelected);
                          }}
                          className="ml-2 h-4 w-4 rounded-lg cursor-pointer flex items-center justify-center"
                          style={{
                            background: selectedMessages.has(message.id) 
                              ? 'linear-gradient(135deg, #22C55E, #105F2D)' 
                              : 'white',
                            border: '2px solid #22C55E'
                          }}
                        >
                          {selectedMessages.has(message.id) && (
                            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                      )}
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              )}
            </div>

            {/* Context Menu */}
            {contextMenu.show && (
              <div
                className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-100"
                style={{
                  left: contextMenu.x,
                  top: contextMenu.y,
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(10px)',
                  minWidth: '160px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={() => handleContextAction('reply')}
                  >
                    <Reply className="h-4 w-4" />
                    <span>Antworten</span>
                  </button>
                  <hr className="border-gray-100 opacity-50" />
                  {contextMenu.isOwnMessage && (
                    <>
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        onClick={() => handleContextAction('edit')}
                      >
                        <Edit className="h-4 w-4" />
                        <span>Bearbeiten</span>
                      </button>
                      <hr className="border-gray-100 opacity-50" />
                    </>
                  )}
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={() => handleContextAction('copy')}
                  >
                    <Copy className="h-4 w-4" />
                    <span>Kopieren</span>
                  </button>
                  <hr className="border-gray-100 opacity-50" />
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={() => handleContextAction('select')}
                  >
                    <Check className="h-4 w-4" />
                    <span>Auswählen</span>
                  </button>
                  <hr className="border-gray-100 opacity-50" />
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    onClick={() => handleContextAction('delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Löschen</span>
                  </button>
                  <hr className="border-gray-100 opacity-50" />
                  <div className="w-full px-4 py-2 text-left text-sm text-gray-700 flex items-center justify-center space-x-3">
                    <span 
                      className="text-lg hover:scale-125 transition-transform duration-150 cursor-pointer"
                      onClick={() => handleContextAction('react-❤️')}
                    >
                      ❤️
                    </span>
                    <span 
                      className="text-lg hover:scale-125 transition-transform duration-150 cursor-pointer"
                      onClick={() => handleContextAction('react-👍')}
                    >
                      👍
                    </span>
                    <span 
                      className="text-lg hover:scale-125 transition-transform duration-150 cursor-pointer"
                      onClick={() => handleContextAction('react-😂')}
                    >
                      😂
                    </span>
                    <span 
                      className="text-lg hover:scale-125 transition-transform duration-150 cursor-pointer"
                      onClick={() => handleContextAction('react-😮')}
                    >
                      😮
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Context Menu */}
            {contactContextMenu.show && (() => {
              const currentContact = contacts.find(c => c.id === contactContextMenu.contactId);
              return (
                <div
                  className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-100"
                  style={{
                    left: contactContextMenu.x,
                    top: contactContextMenu.y,
                    backgroundColor: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(10px)',
                    minWidth: '200px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={async () => {
                      if (contactContextMenu.contactId) {
                        const conversationId = String(contactContextMenu.contactId);
                        const isMarkedUnread = currentContact?.markedUnread;
                        try {
                          if (isMarkedUnread) {
                            await chatIntegration.markConversationRead(conversationId);
                          } else {
                            await chatIntegration.markConversationUnread(conversationId);
                          }
                        } catch (error) {
                          console.error('Error toggling marked unread:', error);
                        }
                      }
                      closeContactContextMenu();
                    }}
                  >
                    <CircleDot className="h-4 w-4" />
                    <span>{currentContact?.markedUnread ? 'Als gelesen markieren' : 'Als ungelesen markieren'}</span>
                  </button>
                  <hr className="border-gray-100 opacity-50" />
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    onClick={async () => {
                      if (contactContextMenu.contactId) {
                        const conversationId = String(contactContextMenu.contactId);
                        const isPinned = currentContact?.pinned;
                        try {
                          if (isPinned) {
                            await chatIntegration.unpinConversation(conversationId);
                          } else {
                            await chatIntegration.pinConversation(conversationId);
                          }
                        } catch (error) {
                          console.error('Error toggling pin:', error);
                        }
                      }
                      closeContactContextMenu();
                    }}
                  >
                    <div className="relative">
                      <Pin className="h-4 w-4" />
                      {currentContact?.pinned && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-5 h-px bg-gray-700 rotate-45"></div>
                        </div>
                      )}
                    </div>
                    <span>{currentContact?.pinned ? 'Entpinnen' : 'Anheften'}</span>
                  </button>
                  <hr className="border-gray-100 opacity-50" />
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                    onClick={() => {
                      setClearChatDialog({
                        show: true,
                        contactId: contactContextMenu.contactId
                      });
                      closeContactContextMenu();
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Chat leeren</span>
                  </button>
                </div>
              </div>
            );
            })()}

            {/* Reply Overlay */}
            {replyingTo && (
              <>
                {/* Blur/Dark Overlay */}
                                 <div 
                   className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
                   onClick={() => {
                     setReplyingTo(null);
                     setReplyAnimation(null);
                     // Clean up keyframe
                     const existingStyle = document.getElementById('reply-keyframes');
                     if (existingStyle) {
                       existingStyle.remove();
                     }
                   }}
                 />
                
                {/* Reply Message Bubble */}
                <div className={`absolute z-50 flex ${replyingTo.own ? 'right-4 justify-end' : 'left-4 justify-start'}`} style={{ bottom: emojiPicker.show ? '238px' : '80px' }}>
                  <div 
                    style={{
                      animation: `slide-to-reply-${replyingTo.id} 0.4s cubic-bezier(0.4, 0, 0.2, 1)`
                    }}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        replyingTo.own
                          ? 'text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                      style={{
                        ...(replyingTo.own ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}),
                        boxShadow: replyingTo.own 
                          ? '0 2px 6px rgba(16, 95, 45, 0.6)' 
                          : '0 2px 6px rgba(0,0,0,0.12)'
                      }}
                    >
                                              {replyingTo.replyTo && (
                        <div 
                          className="mt-2 mb-2 p-2 rounded border cursor-pointer"
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderColor: 'rgba(255,255,255,0.20)' 
                          }}
                          onClick={() => handleReplyClick(replyingTo.replyTo!.id)}
                        >
                          <p className={`text-xs font-medium ${replyingTo.own ? 'text-green-100' : 'text-gray-600'} opacity-50`}>
                            {replyingTo.replyTo.sender}
                          </p>
                          {replyingTo.replyTo.messageType === 'poll' ? (
                            <div className={`text-xs mt-1 flex items-center gap-1 ${replyingTo.own ? 'text-green-50' : 'text-gray-700'}`}>
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span className={`${replyingTo.replyTo.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`}
                                style={{ 
                                  hyphens: 'auto',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {replyingTo.replyTo.content}
                              </span>
                            </div>
                          ) : (
                          <p className={`text-xs mt-1 ${replyingTo.own ? 'text-green-50' : 'text-gray-700'} ${replyingTo.replyTo.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`} 
                             style={{ 
                               hyphens: 'auto',
                               wordBreak: 'break-word',
                               overflowWrap: 'break-word',
                               overflow: 'hidden',
                               display: '-webkit-box',
                               WebkitLineClamp: 2,
                               WebkitBoxOrient: 'vertical'
                             }}>
                            {replyingTo.replyTo.content}
                          </p>
                          )}
                        </div>
                      )}
                      {/* Poll Display in reply overlay */}
                      {(replyingTo as any).poll && (
                        <div className="mt-2 mb-2" ref={replyOverlayPollRef}>
                          <PollMessage
                            poll={(replyingTo as any).poll}
                            mine={!!replyingTo.own}
                            theme="admin"
                            getAvatar={getAvatarForUser}
                            timestamp={replyingTo.time}
                            showViewButton
                            viewButtonDisabled
                            onViewVotes={async () => {
                              try {
                                const poll = (replyingTo as any).poll;
                                const container = replyOverlayPollRef.current;
                                const bubble = container?.querySelector('[data-poll-bubble]') as HTMLElement | null;
                                const r = bubble?.getBoundingClientRect();
                                setVotesDrawer({
                                  open: true,
                                  pollId: poll.id,
                                  question: poll.question,
                                  options: poll.options,
                                  anchorRect: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null
                                });
                              } catch (e) {
                                console.error('Failed to open votes drawer from overlay', e);
                              }
                            }}
                            onToggle={async (optionId, checked) => {
                              try {
                                if (!selectedChat?.id) return;
                                await chatIntegration.votePoll(String(selectedChat.id), (replyingTo as any).poll.id, optionId, checked);
                              } catch (err) {
                                console.error('Failed to vote on poll:', err);
                              }
                            }}
                          />
                        </div>
                      )}
                      {/* Photo Display */}
                      {replyingTo.photo && (
                        <div className="mt-2 mb-2">
                          <img
                            src={replyingTo.photo}
                            alt="Reply photo"
                            className="w-full h-auto rounded-lg"
                            style={{ 
                              maxHeight: '300px',
                              minHeight: '120px',
                              objectFit: 'cover',
                              aspectRatio: 'auto'
                            }}
                          />
                        </div>
                      )}

                      {/* PDF Display */}
                      {replyingTo.pdf && (
                        <div 
                          className="mt-2 mb-2 rounded-lg p-3 flex items-center space-x-3 cursor-pointer transition-colors hover:bg-gray-100"
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.5)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(replyingTo.pdf, '_blank');
                          }}
                        >
                          <div className="w-10 h-12 bg-red-500 rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {replyingTo.pdfName || replyingTo.pdf}
                            </div>
                            <div className="text-xs text-gray-500">
                              PDF-Dokument
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Text Content */}
                      {replyingTo.content && (
                        <p 
                          className={`text-sm ${replyingTo.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`}
                          style={{ 
                            hyphens: 'auto',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {replyingTo.content}
                        </p>
                      )}
                      {!(replyingTo as any).poll && (
                      <p className={`text-xs mt-1 ${replyingTo.own ? 'text-green-100 text-right' : 'text-gray-500'}`} style={{ fontSize: '0.5775rem' }}>
                        {replyingTo.edited && '(edited) '}{replyingTo.time}
                      </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Edit Overlay */}
            {editingMessage && (
              <>
                {/* Blur/Dark Overlay */}
                <div 
                  className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-40"
                  onClick={() => {
                    setEditingMessage(null);
                    setEditAnimation(null);
                    setMessageInput("");
                    // Clean up edit keyframe
                    const existingEditStyle = document.getElementById('edit-keyframes');
                    if (existingEditStyle) {
                      existingEditStyle.remove();
                    }
                  }}
                />
                
                {/* Edit Message Bubble */}
                <div className={`absolute z-50 flex ${editingMessage.own ? 'right-4 justify-end' : 'left-4 justify-start'}`} style={{ bottom: emojiPicker.show ? '238px' : '80px' }}>
                  <div 
                    style={{
                      animation: `slide-to-edit-${editingMessage.id} 0.4s cubic-bezier(0.4, 0, 0.2, 1)`
                    }}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        editingMessage.own
                          ? 'text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                      style={{
                        ...(editingMessage.own ? {background: 'linear-gradient(135deg, #22C55E, #105F2D)'} : {}),
                        boxShadow: editingMessage.own 
                          ? '0 2px 6px rgba(16, 95, 45, 0.6)' 
                          : '0 2px 6px rgba(0,0,0,0.12)'
                      }}
                    >
                      {editingMessage.replyTo && (
                        <div 
                          className="mt-2 mb-2 p-2 rounded border cursor-pointer"
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.08)',
                            borderColor: 'rgba(255,255,255,0.20)' 
                          }}
                          onClick={() => handleReplyClick(editingMessage.replyTo!.id)}
                        >
                          <p className={`text-xs font-medium ${editingMessage.own ? 'text-green-100' : 'text-gray-600'} opacity-50`}>
                            {editingMessage.replyTo.sender}
                          </p>
                          {editingMessage.replyTo.messageType === 'poll' ? (
                            <div className={`text-xs mt-1 flex items-center gap-1 ${editingMessage.own ? 'text-green-50' : 'text-gray-700'}`}>
                              <BarChart2 className="w-3.5 h-3.5" />
                              <span className={`${editingMessage.replyTo.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`}
                                style={{ 
                                  hyphens: 'auto',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                  overflow: 'hidden',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical'
                                }}
                              >
                                {editingMessage.replyTo.content}
                              </span>
                            </div>
                          ) : (
                                                                               <p className={`text-xs mt-1 ${editingMessage.own ? 'text-green-50' : 'text-gray-700'} ${editingMessage.replyTo.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`} 
                             style={{ 
                               hyphens: 'auto',
                               wordBreak: 'break-word',
                               overflowWrap: 'break-word',
                               overflow: 'hidden',
                               display: '-webkit-box',
                               WebkitLineClamp: 2,
                               WebkitBoxOrient: 'vertical'
                             }}>
                            {editingMessage.replyTo.content}
                          </p>
                          )}
                        </div>
                      )}
                      {/* Poll Display in edit overlay */}
                      {(editingMessage as any).poll && (
                        <div className="mt-2 mb-2" ref={editOverlayPollRef}>
                          <PollMessage
                            poll={(editingMessage as any).poll}
                            mine={!!editingMessage.own}
                            theme="admin"
                            getAvatar={getAvatarForUser}
                            timestamp={editingMessage.time}
                            showViewButton
                            viewButtonDisabled
                            onViewVotes={async () => {
                              try {
                                const poll = (editingMessage as any).poll;
                                const container = editOverlayPollRef.current;
                                const bubble = container?.querySelector('[data-poll-bubble]') as HTMLElement | null;
                                const r = bubble?.getBoundingClientRect();
                                setVotesDrawer({
                                  open: true,
                                  pollId: poll.id,
                                  question: poll.question,
                                  options: poll.options,
                                  anchorRect: r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null
                                });
                              } catch (e) {
                                console.error('Failed to open votes drawer from edit overlay', e);
                              }
                            }}
                            onToggle={async (optionId, checked) => {
                              try {
                                if (!selectedChat?.id) return;
                                await chatIntegration.votePoll(String(selectedChat.id), (editingMessage as any).poll.id, optionId, checked);
                              } catch (err) {
                                console.error('Failed to vote on poll:', err);
                              }
                            }}
                          />
                        </div>
                      )}
                                                                   {/* Photo Display */}
                      {editingMessage.photo && (
                        <div className="mt-2 mb-2">
                          <img
                            src={editingMessage.photo}
                            alt="Edit photo"
                            className="w-full h-auto rounded-lg"
                            style={{ 
                              maxHeight: '300px',
                              minHeight: '120px',
                              objectFit: 'cover',
                              aspectRatio: 'auto'
                            }}
                          />
                        </div>
                      )}

                      {/* PDF Display */}
                      {editingMessage.pdf && (
                        <div 
                          className="mt-2 mb-2 rounded-lg p-3 flex items-center space-x-3 cursor-pointer transition-colors hover:bg-gray-100"
                          style={{ 
                            backgroundColor: 'rgba(255,255,255,0.5)',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(editingMessage.pdf, '_blank');
                          }}
                        >
                          <div className="w-10 h-12 bg-red-500 rounded flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {editingMessage.pdfName || editingMessage.pdf}
                            </div>
                            <div className="text-xs text-gray-500">
                              PDF-Dokument
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Text Content */}
                      {editingMessage.content && (
                        <p 
                          className={`text-sm ${editingMessage.content === 'Diese Nachricht wurde gelöscht...' ? 'italic opacity-60' : ''}`}
                          style={{ 
                            hyphens: 'auto',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word'
                          }}
                        >
                          {editingMessage.content}
                        </p>
                      )}
                      {!(editingMessage as any).poll && (
                                             <p className={`text-xs mt-1 ${editingMessage.own ? 'text-green-100 text-right' : 'text-gray-500'}`} style={{ fontSize: '0.5775rem' }}>
                         {editingMessage.edited && '(edited) '}{editingMessage.time}
                       </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Message Input */}
            <form className={`absolute bottom-4 left-4 right-4 ${deleteDialog.show ? 'z-30' : 'z-50'}`} onSubmit={handleSendMessage} style={{ background: 'none' }}>
              {/* Scroll to bottom button */}
              <button
                type="button"
                onClick={scrollToBottom}
                className={`absolute left-1/2 -translate-x-1/2 -top-10 h-9 w-9 rounded-full flex items-center justify-center transition-opacity ${
                  showScrollToBottom ? 'opacity-70' : 'opacity-0 pointer-events-none'
                }`}
                style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                aria-label="Scroll to bottom"
              >
                <ChevronDown className="h-5 w-5 text-white" />
              </button>
              <input 
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Nachricht eingeben..." 
                className={`w-full pl-12 pr-20 py-3 rounded-full outline-none text-gray-900 placeholder:text-gray-500 placeholder:text-sm transition-all duration-300 ${deleteDialog.show ? 'pointer-events-none' : ''}`}
                style={{ 
                  border: 'none', 
                  boxShadow: '0 3px 8px rgba(0,0,0,0.18)', 
                  WebkitAppearance: 'none', 
                  MozAppearance: 'none', 
                  appearance: 'none',
                  background: 'linear-gradient(to right, rgba(250,250,250,0.95), rgba(240,240,240,0.95))',
                  opacity: deleteDialog.show ? 0.3 : 0.85,
                  filter: deleteDialog.show ? 'blur(2px) brightness(0.6)' : 'none'
                }}
              />
              <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 ${deleteDialog.show ? 'opacity-30 pointer-events-none' : ''}`}>
                <Paperclip 
                  data-attachment-trigger
                  className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setAttachmentPopup(!attachmentPopup);
                  }}
                />
              </div>
              <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2 transition-all duration-300 ${deleteDialog.show ? 'opacity-30 pointer-events-none' : ''}`}>
                <Smile 
                  data-emoji-trigger
                  className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEmojiPicker(prev => ({ ...prev, show: !prev.show, context: 'input', optionIndex: null, anchor: null, dimensions: null }));
                  }}
                />
                <button 
                  type="submit"
                  className="h-8 w-8 rounded-full flex items-center justify-center"
                  style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)'}}
                >
                  {editingMessage ? (
                    <Check className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <Send className="h-3.5 w-3.5 text-white" />
                  )}
                </button>
              </div>
            </form>

            {/* Emoji Picker */}
            {emojiPicker.show && (
              <div 
                data-emoji-picker
                className="absolute bg-white rounded-lg shadow-lg border border-gray-200 z-40"
                style={{
                  ...(emojiPicker.anchor
                    ? {
                        position: 'fixed' as const,
                        top: `${emojiPicker.anchor.top}px`,
                        left: `${emojiPicker.anchor.left}px`,
                        width: `${emojiPicker.dimensions?.width ?? 260}px`,
                        height: `${emojiPicker.dimensions?.height ?? 196}px`,
                        right: 'auto',
                        bottom: 'auto'
                      }
                    : {
                  bottom: emojiPicker.context === 'input' ? '71px' : '96px',
                  left: emojiPicker.context === 'input' ? '16px' : '320px',
                  right: '16px',
                        width: 'auto',
                        height: '160px'
                      }),
                  boxShadow: '0 -4px 25px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(0)',
                  transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
                  animation: 'slideUpFromBottom 0.3s ease-out'
                }}
              >
                {/* Emoji Grid */}
                <div className="h-full flex flex-col">
                  <div 
                    className="flex-1 p-3"
                    style={{
                      overflowY: 'auto',
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    <div className="grid grid-cols-8 gap-1" style={{ height: 'fit-content' }}>
                      {emojiCategories[emojiPicker.selectedCategory as keyof typeof emojiCategories]?.emojis.map((emoji, index) => (
                        <button
                          key={index}
                          className="text-xl p-1.5 rounded hover:bg-gray-100 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (emojiPicker.context === 'photo') {
                              setPhotoEditor(prev => prev ? { ...prev, caption: prev.caption + emoji } : null);
                            } else if (emojiPicker.context === 'pdf') {
                              setPdfEditor(prev => prev ? { ...prev, caption: prev.caption + emoji } : null);
                            } else if (emojiPicker.context === 'poll_question') {
                              if (pollQuestionRef.current) {
                                const input = pollQuestionRef.current;
                                input.value = input.value + emoji;
                                const caret = input.value.length;
                                requestAnimationFrame(() => {
                                  input.focus();
                                  input.setSelectionRange(caret, caret);
                                });
                              }
                            } else if (emojiPicker.context === 'poll_option' && emojiPicker.optionIndex !== null) {
                              const idx = emojiPicker.optionIndex;
                              setPollOptions(prev => {
                                if (idx === null || idx >= prev.length) {
                                  return prev;
                                }
                                const next = [...prev];
                                next[idx] = next[idx] + emoji;
                                return next;
                              });
                              requestAnimationFrame(() => {
                                const inputEl = document.querySelector<HTMLInputElement>(`[data-poll-option-input="${idx}"]`);
                                if (inputEl) {
                                  const caret = inputEl.value.length;
                                  inputEl.focus();
                                  inputEl.setSelectionRange(caret, caret);
                                }
                              });
                            } else {
                              setMessageInput(prev => prev + emoji);
                            }
                            // Keep picker open and pinned to current poll context/option
                            setEmojiPicker(prev => ({
                              ...prev,
                              show: true,
                              context: emojiPicker.context,
                              optionIndex: emojiPicker.context === 'poll_option' ? emojiPicker.optionIndex : null
                            }));
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Category Footer */}
                  <div className="border-t border-gray-200 p-1 bg-gray-50 rounded-b-lg">
                    <div className="flex justify-around">
                      {Object.entries(emojiCategories).map(([key, category]) => (
                        <button
                          key={key}
                          className={`p-1.5 rounded transition-colors ${
                            emojiPicker.selectedCategory === key 
                              ? 'bg-gray-300 text-gray-700' 
                              : 'hover:bg-gray-200 text-gray-600'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEmojiPicker(prev => ({ ...prev, selectedCategory: key }));
                          }}
                          title={category.name}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            {key === 'smileys' && (
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                            )}
                            {key === 'animals' && (
                              <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM4 8a1 1 0 000 2h1a1 1 0 100-2H4zm0 4a1 1 0 100 2h1a1 1 0 100-2H4zm4-4a1 1 0 000 2h1a1 1 0 100-2H8zm0 4a1 1 0 100 2h1a1 1 0 100-2H8z" />
                            )}
                            {key === 'food' && (
                              <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
                            )}
                            {key === 'activities' && (
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            )}
                            {key === 'travel' && (
                              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                            )}
                            {key === 'objects' && (
                              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 011.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 011.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                            )}
                            {key === 'symbols' && (
                              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                            )}
                          </svg>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Attachment Popup */}
            {attachmentPopup && (
              <div 
                data-attachment-popup
                className="absolute bg-white rounded-lg shadow-lg border border-gray-100 z-50"
                style={{
                  bottom: '70px',
                  left: '20px',
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(10px)',
                  minWidth: '160px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 rounded-t-lg"
                  onClick={() => {
                    document.getElementById('photo-input')?.click();
                    setAttachmentPopup(false);
                  }}
                >
                  <Image className="h-4 w-4" />
                  <span>Foto</span>
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('pdf-input')?.click();
                    setAttachmentPopup(false);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  <span>PDF</span>
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-3 rounded-b-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    setTimeout(() => {
                      setShowPollModal(true);
                    }, 0);
                    setAttachmentPopup(false);
                  }}
                >
                  <BarChart2 className="h-4 w-4" />
                  <span>Abstimmung</span>
                </button>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              id="photo-input"
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const imageUrl = event.target?.result as string;
                    setPhotoEditor({
                      show: true,
                      image: imageUrl,
                      caption: '',
                      rotation: 0,
                      brightness: 100,
                      contrast: 100,
                      crop: null,
                      cropMode: false
                    });
                    setColorPalette({ show: false, selectedColor: '' });
                    setDrawingPaths([]);
                  };
                  reader.readAsDataURL(file);
                }
                e.target.value = '';
              }}
            />
            <input
              id="pdf-input"
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setPdfEditor({
                    show: true,
                    file: file,
                    caption: ''
                  });
                }
                e.target.value = '';
              }}
            />

            {/* Photo Editor Card */}
            {photoEditor && (
              <div 
                data-photo-editor
                className="absolute left-4 bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-up z-50 flex flex-col"
                style={{
                  bottom: '96px',
                  width: '300px',
                  minHeight: photoEditor.rotation % 180 === 90 ? '400px' : 'auto',
                  height: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Color Palette - positioned over the image */}
                {colorPalette.show && (
                  <div 
                    className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-2"
                    style={{ 
                      top: '50px',
                      left: '12px',
                      right: '20px',
                      zIndex: 100,
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-8 gap-1.5">
                      {['#000000', '#404040', '#808080', '#C0C0C0', '#FFFFFF', '#8B4513', '#A52A2A', '#800000',
                        '#FF0000', '#FF6347', '#FFA500', '#FFD700', '#FFFF00', '#32CD32', '#00FF00', '#006400',
                        '#00FFFF', '#40E0D0', '#0000FF', '#4169E1', '#800080', '#9370DB', '#FF00FF', '#FF1493'].map((color) => (
                        <button
                          key={color}
                          className={`w-5 h-5 rounded-md hover:scale-110 transition-transform ${
                            color === '#FFFFFF' ? 'border border-gray-200' : ''
                          } ${
                            colorPalette.selectedColor === color ? 'scale-125' : ''
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => {
                            setColorPalette({ show: false, selectedColor: color });
                            setEraserPalette({ show: false, selectedSize: 0 });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Eraser Size Palette - positioned over the image */}
                {eraserPalette.show && (
                  <div 
                    data-photo-editor
                    className="absolute bg-white rounded-lg shadow-lg border border-gray-200 p-2"
                    style={{ 
                      top: '50px',
                      left: '12px',
                      right: '20px',
                      zIndex: 100,
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="grid grid-cols-6 gap-2 items-center justify-items-center">
                      {[5, 10, 15, 20, 25, 30].map((size) => (
                        <button
                          key={size}
                          className={`rounded-full bg-black/90 hover:scale-110 transition-transform ${
                            eraserPalette.selectedSize === size ? 'scale-125' : ''
                          }`}
                          style={{ 
                            width: `${Math.max(8, size)}px`, 
                            height: `${Math.max(8, size)}px` 
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEraserPalette({ show: false, selectedSize: size });
                            setColorPalette({ show: false, selectedColor: '' });
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Toolbar */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
                    <div className="flex space-x-1">
                      <button 
                        className={`p-1.5 rounded relative transition-colors ${
                          colorPalette.selectedColor ? 'bg-gray-200' : 'hover:bg-gray-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (colorPalette.selectedColor) {
                            // Deselect if already selected
                            setColorPalette({ show: false, selectedColor: '' });
                          } else {
                            // Show palette to select color
                            setColorPalette(prev => ({ ...prev, show: !prev.show }));
                          }
                        }}
                      >
                        <Pen className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        className={`p-1.5 rounded relative transition-colors ${
                          eraserPalette.selectedSize > 0 ? 'bg-gray-200' : 'hover:bg-gray-200'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (eraserPalette.selectedSize > 0) {
                            // Deselect if already selected
                            setEraserPalette({ show: false, selectedSize: 0 });
                          } else {
                            // Show palette to select size
                            setEraserPalette(prev => ({ ...prev, show: !prev.show }));
                          }
                        }}
                      >
                        <Eraser className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        className="p-1.5 hover:bg-gray-200 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveToHistory();
                          setPhotoEditor(prev => prev ? {
                            ...prev,
                            rotation: prev.rotation + 90
                          } : null);
                        }}
                      >
                        <RotateCw className="w-4 h-4 text-gray-600" />
                      </button>
                      <button 
                        className={`p-1.5 rounded transition-colors ${
                          photoEditor?.cropMode ? 'bg-gray-200' : 'hover:bg-gray-200'
                        }`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (photoEditor) {
                            if (photoEditor.cropMode) {
                              // Submit crop and disable crop mode
                              if (photoEditor.crop) {
                                saveToHistory();
                                try {
                                  const croppedImage = await combineImageWithDrawings(
                                    photoEditor.image,
                                    drawingPaths,
                                    photoEditor.rotation,
                                    photoEditor.crop
                                  );
                                  
                                  setPhotoEditor(prev => prev ? {
                                    ...prev,
                                    image: croppedImage,
                                    cropMode: false,
                                    crop: null,
                                    rotation: 0
                                  } : null);
                                  
                                  // Clear drawing paths since they're now applied to the image
                                  setDrawingPaths([]);
                                } catch (error) {
                                  console.error('Failed to apply crop:', error);
                                  // Fallback: just disable crop mode
                                  setPhotoEditor(prev => prev ? {
                                    ...prev,
                                    cropMode: false
                                  } : null);
                                }
                              } else {
                                // No crop defined, just disable crop mode
                                setPhotoEditor(prev => prev ? {
                                  ...prev,
                                  cropMode: false
                                } : null);
                              }
                            } else {
                              // Enable crop mode with default selection
                              saveToHistory();
                              setPhotoEditor(prev => prev ? {
                                ...prev,
                                cropMode: true,
                                crop: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
                              } : null);
                            }
                          }
                        }}
                      >
                        <Crop className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                    <button 
                      className="p-1.5 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={(e) => {
                        e.stopPropagation();
                        undoLastChange();
                      }}
                      disabled={undoHistory.length === 0}
                    >
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                  </div>

                                  {/* Photo Preview */}
                  <div className={`p-3 ${photoEditor.rotation % 180 === 90 ? 'flex-1 flex flex-col items-center justify-center' : ''}`}>
                    <div 
                      className="relative bg-white"
                      style={{
                        borderRadius: '8px',
                        overflow: 'hidden',
                        WebkitBorderRadius: '8px',
                        MozBorderRadius: '8px',
                        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
                        transform: `rotate(${photoEditor.rotation}deg)`,
                        transformOrigin: 'center',
                        width: photoEditor.rotation % 180 === 90 ? '270px' : 'auto',
                        height: photoEditor.rotation % 180 === 90 ? '270px' : 'auto',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <img
                        src={photoEditor.image}
                        alt="Preview"
                        className={photoEditor.rotation % 180 === 90 ? "max-w-full max-h-full object-contain" : "max-w-full h-auto"}
                        style={{
                          filter: `brightness(${photoEditor.brightness}%) contrast(${photoEditor.contrast}%)`,
                          borderRadius: '8px',
                          display: 'block'
                        }}
                      />
                      
                      {/* Crop Lines Overlay */}
                      {photoEditor.cropMode && photoEditor.crop && (
                        <div className="absolute inset-0">
                          {/* Crop rectangle outline */}
                          <div 
                            className="absolute border-2 border-white shadow-lg pointer-events-none"
                            style={{
                              top: `${photoEditor.crop.y * 100}%`,
                              left: `${photoEditor.crop.x * 100}%`,
                              width: `${photoEditor.crop.width * 100}%`,
                              height: `${photoEditor.crop.height * 100}%`
                            }}
                          />
                          
                          {/* Corner handles */}
                          {(() => {
                            const createDragHandler = (type: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r') => (e: React.MouseEvent) => {
                              e.preventDefault();
                              if (!photoEditor?.crop) return;
                              
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const startCrop = {...photoEditor.crop};
                              const photoElement = (e.currentTarget as HTMLElement).parentElement as HTMLElement;
                              
                              const handleMouseMove = (e: MouseEvent) => {
                                const rect = photoElement?.getBoundingClientRect();
                                if (!rect) return;
                                
                                const deltaX = (e.clientX - startX) / rect.width;
                                const deltaY = (e.clientY - startY) / rect.height;
                                
                                let newCrop = {...startCrop};
                                
                                if (type === 'tl') {
                                  const newX = Math.max(0, Math.min(startCrop.x + deltaX, startCrop.x + startCrop.width - 0.1));
                                  const newY = Math.max(0, Math.min(startCrop.y + deltaY, startCrop.y + startCrop.height - 0.1));
                                  newCrop = {
                                    x: newX,
                                    y: newY,
                                    width: startCrop.width - (newX - startCrop.x),
                                    height: startCrop.height - (newY - startCrop.y)
                                  };
                                } else if (type === 'tr') {
                                  const newY = Math.max(0, Math.min(startCrop.y + deltaY, startCrop.y + startCrop.height - 0.1));
                                  const newWidth = Math.max(0.1, Math.min(1 - startCrop.x, startCrop.width + deltaX));
                                  newCrop = {
                                    x: startCrop.x,
                                    y: newY,
                                    width: newWidth,
                                    height: startCrop.height - (newY - startCrop.y)
                                  };
                                } else if (type === 'bl') {
                                  const newX = Math.max(0, Math.min(startCrop.x + deltaX, startCrop.x + startCrop.width - 0.1));
                                  const newHeight = Math.max(0.1, Math.min(1 - startCrop.y, startCrop.height + deltaY));
                                  newCrop = {
                                    x: newX,
                                    y: startCrop.y,
                                    width: startCrop.width - (newX - startCrop.x),
                                    height: newHeight
                                  };
                                } else if (type === 'br') {
                                  const newWidth = Math.max(0.1, Math.min(1 - startCrop.x, startCrop.width + deltaX));
                                  const newHeight = Math.max(0.1, Math.min(1 - startCrop.y, startCrop.height + deltaY));
                                  newCrop = {
                                    x: startCrop.x,
                                    y: startCrop.y,
                                    width: newWidth,
                                    height: newHeight
                                  };
                                } else if (type === 't') {
                                  const newY = Math.max(0, Math.min(startCrop.y + deltaY, startCrop.y + startCrop.height - 0.1));
                                  newCrop = {
                                    ...startCrop,
                                    y: newY,
                                    height: startCrop.height - (newY - startCrop.y)
                                  };
                                } else if (type === 'b') {
                                  const newHeight = Math.max(0.1, Math.min(1 - startCrop.y, startCrop.height + deltaY));
                                  newCrop = {
                                    ...startCrop,
                                    height: newHeight
                                  };
                                } else if (type === 'l') {
                                  const newX = Math.max(0, Math.min(startCrop.x + deltaX, startCrop.x + startCrop.width - 0.1));
                                  newCrop = {
                                    ...startCrop,
                                    x: newX,
                                    width: startCrop.width - (newX - startCrop.x)
                                  };
                                } else if (type === 'r') {
                                  const newWidth = Math.max(0.1, Math.min(1 - startCrop.x, startCrop.width + deltaX));
                                  newCrop = {
                                    ...startCrop,
                                    width: newWidth
                                  };
                                }
                                
                                setPhotoEditor(prev => prev ? ({
                                  ...prev,
                                  crop: newCrop
                                }) : prev);
                              };
                              
                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                              };
                              
                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            };
                            
                            return (
                              <>
                                {/* Top-left */}
                                <div 
                                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-nw-resize z-10"
                                  style={{
                                    top: `${photoEditor.crop.y * 100}%`,
                                    left: `${photoEditor.crop.x * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('tl')}
                                />
                                {/* Top-right */}
                                <div 
                                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-ne-resize z-10"
                                  style={{
                                    top: `${photoEditor.crop.y * 100}%`,
                                    left: `${(photoEditor.crop.x + photoEditor.crop.width) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('tr')}
                                />
                                {/* Bottom-left */}
                                <div 
                                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-sw-resize z-10"
                                  style={{
                                    top: `${(photoEditor.crop.y + photoEditor.crop.height) * 100}%`,
                                    left: `${photoEditor.crop.x * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('bl')}
                                />
                                {/* Bottom-right */}
                                <div 
                                  className="absolute w-3 h-3 bg-white border border-gray-400 cursor-se-resize z-10"
                                  style={{
                                    top: `${(photoEditor.crop.y + photoEditor.crop.height) * 100}%`,
                                    left: `${(photoEditor.crop.x + photoEditor.crop.width) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('br')}
                                />
                                
                                {/* Side handles */}
                                {/* Top */}
                                <div 
                                  className="absolute w-3 h-2 bg-white border border-gray-400 cursor-n-resize z-10"
                                  style={{
                                    top: `${photoEditor.crop.y * 100}%`,
                                    left: `${(photoEditor.crop.x + photoEditor.crop.width / 2) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('t')}
                                />
                                {/* Bottom */}
                                <div 
                                  className="absolute w-3 h-2 bg-white border border-gray-400 cursor-s-resize z-10"
                                  style={{
                                    top: `${(photoEditor.crop.y + photoEditor.crop.height) * 100}%`,
                                    left: `${(photoEditor.crop.x + photoEditor.crop.width / 2) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('b')}
                                />
                                {/* Left */}
                                <div 
                                  className="absolute w-2 h-3 bg-white border border-gray-400 cursor-w-resize z-10"
                                  style={{
                                    top: `${(photoEditor.crop.y + photoEditor.crop.height / 2) * 100}%`,
                                    left: `${photoEditor.crop.x * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('l')}
                                />
                                {/* Right */}
                                <div 
                                  className="absolute w-2 h-3 bg-white border border-gray-400 cursor-e-resize z-10"
                                  style={{
                                    top: `${(photoEditor.crop.y + photoEditor.crop.height / 2) * 100}%`,
                                    left: `${(photoEditor.crop.x + photoEditor.crop.width) * 100}%`,
                                    transform: 'translate(-50%, -50%)'
                                  }}
                                  onMouseDown={createDragHandler('r')}
                                />
                              </>
                            );
                          })()}
                          
                          {/* Dimmed overlay outside crop area */}
                          <div className="absolute inset-0 bg-black bg-opacity-30 pointer-events-none"
                            style={{
                              clipPath: `polygon(0 0, 0 100%, ${photoEditor.crop.x * 100}% 100%, ${photoEditor.crop.x * 100}% ${photoEditor.crop.y * 100}%, ${(photoEditor.crop.x + photoEditor.crop.width) * 100}% ${photoEditor.crop.y * 100}%, ${(photoEditor.crop.x + photoEditor.crop.width) * 100}% ${(photoEditor.crop.y + photoEditor.crop.height) * 100}%, ${photoEditor.crop.x * 100}% ${(photoEditor.crop.y + photoEditor.crop.height) * 100}%, ${photoEditor.crop.x * 100}% 100%, 100% 100%, 100% 0)`
                            }}
                          />
                        </div>
                      )}
                      
                      {/* Drawing Canvas Overlay */}
                      <svg 
                        className="absolute top-0 left-0 w-full h-full cursor-crosshair"
                        style={{ 
                          pointerEvents: (colorPalette.selectedColor || eraserPalette.selectedSize) ? 'auto' : 'none',
                          cursor: eraserPalette.selectedSize > 0 ? 
                            `url("data:image/svg+xml,%3csvg width='${eraserPalette.selectedSize}' height='${eraserPalette.selectedSize}' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='${eraserPalette.selectedSize/2}' cy='${eraserPalette.selectedSize/2}' r='${eraserPalette.selectedSize/2-1}' fill='none' stroke='%23666' stroke-width='1'/%3e%3c/svg%3e") ${eraserPalette.selectedSize/2} ${eraserPalette.selectedSize/2}, auto` : 
                            'crosshair'
                        }}
                        onMouseDown={(e) => {
                          if (!colorPalette.selectedColor && !eraserPalette.selectedSize) return;
                          saveToHistory();
                          setIsDrawing(true);
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          
                          if (colorPalette.selectedColor) {
                            // Drawing mode
                            setDrawingPaths(prev => [...prev, { color: colorPalette.selectedColor, points: [{ x, y }] }]);
                          } else if (eraserPalette.selectedSize) {
                            // Erasing mode - remove paths that intersect with eraser area
                            const eraserRadius = eraserPalette.selectedSize / 2;
                            setDrawingPaths(prev => {
                              const newPaths: Array<{ color: string; points: Array<{ x: number; y: number }> }> = [];
                              prev.forEach(path => {
                                const segments: Array<Array<{ x: number; y: number }>> = [];
                                let currentSegment: Array<{ x: number; y: number }> = [];
                                
                                path.points.forEach(point => {
                                  const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                                  
                                  if (distance > eraserRadius) {
                                    currentSegment.push(point);
                                  } else {
                                    // Point is within eraser, end current segment
                                    if (currentSegment.length > 1) {
                                      segments.push([...currentSegment]);
                                    }
                                    currentSegment = [];
                                  }
                                });
                                
                                // Add final segment if it exists
                                if (currentSegment.length > 1) {
                                  segments.push(currentSegment);
                                }
                                
                                // Create new paths for each segment
                                segments.forEach(segment => {
                                  if (segment.length > 1) {
                                    newPaths.push({ ...path, points: segment });
                                  }
                                });
                              });
                              
                              return newPaths;
                            });
                          }
                        }}
                        onMouseMove={(e) => {
                          if (!isDrawing) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          
                          if (colorPalette.selectedColor) {
                            // Drawing mode
                            setDrawingPaths(prev => {
                              const newPaths = [...prev];
                              newPaths[newPaths.length - 1].points.push({ x, y });
                              return newPaths;
                            });
                                                     } else if (eraserPalette.selectedSize) {
                             // Erasing mode - continuously remove paths that intersect with eraser area
                             const eraserRadius = eraserPalette.selectedSize / 2;
                             setDrawingPaths(prev => {
                               const newPaths: Array<{ color: string; points: Array<{ x: number; y: number }> }> = [];
                               prev.forEach(path => {
                                 const segments: Array<Array<{ x: number; y: number }>> = [];
                                 let currentSegment: Array<{ x: number; y: number }> = [];
                                 
                                 path.points.forEach(point => {
                                   const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
                                   
                                   if (distance > eraserRadius) {
                                     currentSegment.push(point);
                                   } else {
                                     // Point is within eraser, end current segment
                                     if (currentSegment.length > 1) {
                                       segments.push([...currentSegment]);
                                     }
                                     currentSegment = [];
                                   }
                                 });
                                 
                                 // Add final segment if it exists
                                 if (currentSegment.length > 1) {
                                   segments.push(currentSegment);
                                 }
                                 
                                 // Create new paths for each segment
                                 segments.forEach(segment => {
                                   if (segment.length > 1) {
                                     newPaths.push({ ...path, points: segment });
                                   }
                                 });
                               });
                               
                               return newPaths;
                             });
                           }
                        }}
                        onMouseUp={() => setIsDrawing(false)}
                        onMouseLeave={() => setIsDrawing(false)}
                      >
                        {drawingPaths.map((path, pathIndex) => (
                          <path
                            key={pathIndex}
                            d={`M ${path.points.map(p => `${p.x},${p.y}`).join(' L ')}`}
                            stroke={path.color}
                            strokeWidth="3"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        ))}
                      </svg>
                      
                      {/* Upload Progress Overlay */}
                      {uploadProgress.show && (
                        <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-50">
                          <Loader2 className="h-8 w-8 text-white animate-spin mb-3" />
                          <p className="text-white text-sm font-medium">{uploadProgress.message}</p>
                        </div>
                      )}
                    </div>
                  </div>

                {/* Caption Input */}
                <div className="p-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Smile 
                      className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmojiPicker(prev => ({ 
                          ...prev, 
                          show: !prev.show, 
                          context: 'photo',
                          optionIndex: null,
                          anchor: null,
                          dimensions: null
                        }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Bildunterschrift (optional)"
                      value={photoEditor.caption}
                      onChange={(e) => setPhotoEditor(prev => prev ? { ...prev, caption: e.target.value } : null)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-sm outline-none placeholder-gray-400"
                    />
                    <button
                      onClick={async () => {
                        if (selectedChat && photoEditor && currentUserId) {
                          try {
                            setUploadProgress({ show: true, message: 'Bild wird vorbereitet...' });
                            
                            // Combine image with drawings, rotation and cropping (only if not in crop mode)
                            const finalImage = await combineImageWithDrawings(photoEditor.image, drawingPaths, photoEditor.rotation, photoEditor.cropMode ? null : photoEditor.crop);

                            setUploadProgress({ show: true, message: 'Bild wird hochgeladen...' });
                            
                            // Convert data URL to Blob and upload
                            const { dataURLtoBlob, uploadChatFile } = await import('@/lib/chat/uploadChatFile');
                            const imageBlob = dataURLtoBlob(finalImage);
                            
                            const uploadResult = await uploadChatFile(
                              imageBlob,
                              String(selectedChat.id),
                              currentUserId,
                              'photo'
                            );
                            
                            if (!uploadResult) {
                              console.error('Failed to upload photo');
                              setUploadProgress({ show: false, message: '' });
                              return;
                            }
                            
                            setUploadProgress({ show: true, message: 'Bild wird gesendet...' });
                            
                            // Send via Socket.IO with uploaded URL
                            await chatIntegration.sendMessage(
                              String(selectedChat.id),
                              photoEditor.caption || '',
                              null,
                              'photo',
                              uploadResult.url,
                              uploadResult.fileName
                            );

                            setPhotoEditor(null);
                            setColorPalette({ show: false, selectedColor: '' });
                            setDrawingPaths([]);
                            setUploadProgress({ show: false, message: '' });
                          } catch (error) {
                            console.error('Error sending photo:', error);
                            setUploadProgress({ show: false, message: '' });
                          }
                        }
                      }}
                      disabled={uploadProgress.show}
                      className="p-2 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)'}}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PDF Editor Card */}
            {pdfEditor && (
              <div 
                data-pdf-editor
                className="absolute left-4 bg-white rounded-lg shadow-lg border border-gray-200 animate-slide-up z-50 flex flex-col"
                style={{
                  bottom: '96px',
                  width: '300px',
                  height: '300px',
                  opacity: 0.9
                }}
              >
                {/* PDF Display Area */}
                <div className="flex-1 flex items-center justify-center p-3 relative">
                  <div className="flex flex-col items-center text-center">
                    {/* PDF Icon */}
                    <FileText className="w-8 h-8 text-black mb-2" />
                    
                    {/* PDF Info */}
                    <div className="text-sm font-medium text-gray-900 mb-1 truncate max-w-[250px]">
                      {pdfEditor.file.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(pdfEditor.file.size / (1024 * 1024)).toFixed(1)} MB, PDF-Dokument
                    </div>
                  </div>
                  
                  {/* Upload Progress Overlay */}
                  {uploadProgress.show && (
                    <div className="absolute inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg z-50">
                      <Loader2 className="h-8 w-8 text-white animate-spin mb-3" />
                      <p className="text-white text-sm font-medium">{uploadProgress.message}</p>
                    </div>
                  )}
                </div>

                {/* Caption Input */}
                <div className="p-3 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Smile 
                      className="w-5 h-5 text-gray-400 cursor-pointer hover:text-gray-600 transition-colors" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEmojiPicker(prev => ({ 
                          ...prev, 
                          show: !prev.show, 
                          context: 'pdf',
                          optionIndex: null,
                          anchor: null,
                          dimensions: null
                        }));
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Bildunterschrift (optional)"
                      value={pdfEditor.caption}
                      onChange={(e) => setPdfEditor(prev => prev ? { ...prev, caption: e.target.value } : null)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-sm outline-none placeholder-gray-400"
                    />
                    <button
                      onClick={async () => {
                        if (selectedChat && pdfEditor && currentUserId) {
                          try {
                            setUploadProgress({ show: true, message: 'PDF wird vorbereitet...' });
                            
                            // Upload PDF to Supabase Storage
                            const { uploadChatFile } = await import('@/lib/chat/uploadChatFile');
                            
                            setUploadProgress({ show: true, message: 'PDF wird hochgeladen...' });
                            
                            const uploadResult = await uploadChatFile(
                              pdfEditor.file,
                              String(selectedChat.id),
                              currentUserId,
                              'pdf'
                            );
                            
                            if (!uploadResult) {
                              console.error('Failed to upload PDF');
                              setUploadProgress({ show: false, message: '' });
                              return;
                            }
                            
                            setUploadProgress({ show: true, message: 'PDF wird gesendet...' });
                            
                            // Send message via Socket.IO with uploaded file URL
                            await chatIntegration.sendMessage(
                              String(selectedChat.id),
                              pdfEditor.caption || '',
                              null,
                              'pdf',
                              uploadResult.url,
                              uploadResult.fileName
                            );
                            
                            setPdfEditor(null);
                            setUploadProgress({ show: false, message: '' });
                          } catch (error) {
                            console.error('Error sending PDF:', error);
                            setUploadProgress({ show: false, message: '' });
                          }
                        }
                      }}
                      disabled={uploadProgress.show}
                      className="p-2 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{background: 'linear-gradient(135deg, #22C55E, #105F2D)'}}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteDialog.show && (
              <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-60 flex items-center justify-center">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {deleteDialog.isBulkDelete ? 'Nachrichten löschen' : 'Nachricht löschen'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {deleteDialog.isBulkDelete ? 'Wie möchten Sie die Nachrichten löschen?' : 'Wie möchten Sie die Nachricht löschen?'}
                  </p>
                  
                  <div className="space-y-3">
                    <button
                      onClick={async () => {
                        if (deleteDialog.isBulkDelete) {
                          // Bulk delete for me via API (hide for current user)
                          if (selectedChat && deleteDialog.selectedMessageIds.length > 0) {
                            try {
                              await Promise.all(
                                deleteDialog.selectedMessageIds.map((id) =>
                                  chatIntegration.deleteMessage(String(selectedChat.id), String(id), false)
                              )
                              );
                            } catch (e) {
                              console.error('Bulk delete-for-me failed:', e);
                            }
                            setIsSelectMode(false);
                            setSelectedMessages(new Set());
                          }
                        } else {
                          await handleDeleteForMe();
                        }
                        // Close dialog (ignoring linter for now)
                        setDeleteDialog({ show: false, messageId: null, isOwnMessage: false } as any);
                      }}
                      className="w-full px-4 py-3 text-center text-sm text-gray-700 rounded-lg transition-colors border"
                      style={{
                        borderColor: 'rgba(34, 197, 94, 0.85)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(34, 197, 94, 0.05)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <div className="font-medium">Für mich löschen</div>
                      <div className="text-xs text-gray-500">
                        {deleteDialog.isBulkDelete 
                          ? 'Die Nachrichten werden nur für Sie entfernt'
                          : 'Die Nachricht wird nur für Sie entfernt'
                        }
                      </div>
                    </button>
                    
                    {/* Show "Delete for all" only if: single own message OR bulk with only own messages */}
                    {((deleteDialog.isBulkDelete && deleteDialog.hasOwnMessages && !deleteDialog.hasOtherMessages) || 
                      (!deleteDialog.isBulkDelete && deleteDialog.isOwnMessage)) && (
                      <button
                        onClick={async () => {
                          if (deleteDialog.isBulkDelete) {
                            // Bulk delete for everyone (only own messages)
                            if (selectedChat && deleteDialog.selectedMessageIds.length > 0) {
                              try {
                                const ownIds = (allMessages[selectedChat.id] || [])
                                  .filter(m => deleteDialog.selectedMessageIds.includes(m.id) && m.own)
                                  .map(m => m.id);
                                await Promise.all(
                                  ownIds.map((id) =>
                                    chatIntegration.deleteMessage(String(selectedChat.id), String(id), true)
                                  )
                                );
                              } catch (e) {
                                console.error('Bulk delete-for-everyone failed:', e);
                              }
                              setIsSelectMode(false);
                              setSelectedMessages(new Set());
                            }
                          } else {
                            await handleDeleteForEveryone();
                          }
                          // Close dialog (ignoring linter for now)
                          setDeleteDialog({ show: false, messageId: null, isOwnMessage: false } as any);
                        }}
                        className="w-full px-4 py-3 text-center text-sm text-gray-700 rounded-lg transition-colors border"
                        style={{
                          borderColor: 'rgba(250, 12, 12, 0.85)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(250, 12, 12, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div className="font-medium">Für alle löschen</div>
                        <div className="text-xs text-gray-500">
                          {deleteDialog.isBulkDelete 
                            ? 'Die Nachrichten werden für alle entfernt'
                            : 'Die Nachricht wird für alle entfernt'
                          }
                        </div>
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setDeleteDialog({ show: false, messageId: null, isOwnMessage: false } as any)}
                    className="w-full mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}


          </>
        ) : (
          /* No Chat Selected */
          <div className="flex-1 flex items-center justify-center" 
               style={{
                 background: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.08) 1px, transparent 0)',
                 backgroundSize: '20px 20px'
               }}>
            <div className="text-center relative">
              {/* Blurred ellipse background */}
              <div 
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-40 rounded-full blur-3xl"
                style={{
                  background: 'linear-gradient(135deg, #22C55E, #105F2D)',
                  opacity: 0.17
                }}
              />
              <MessageCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h2 className="text-2xl font-medium text-gray-700 mb-3">Willkommen im Chat</h2>
              <p className="text-gray-500 text-lg">Wähle einen Kontakt aus, um zu chatten</p>
            </div>
          </div>
         )}
       </div>
     </div>

    {/* Poll Create Modal (global overlay, no hooks) */}
    {showPollModal && (
      <div className="fixed inset-0 z-[9999]" style={{ pointerEvents: 'none' }}>
        <div
          ref={pollModalRef}
          className="absolute w-[520px] max-w-[92vw] rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white"
          data-poll-modal
          style={{ bottom: '96px', left: `calc(${sidebarOpen ? '14rem' : '3.5rem'} + 20rem + 16px)`, pointerEvents: 'auto' }}
        >
          <div className="px-5 pt-4 pb-3 border-b border-gray-100 bg-white">
            <h3 className="text-base font-semibold text-gray-800">Abstimmung erstellen</h3>
          </div>
          <div className="px-5 py-4 space-y-4 max-h-[70vh] outline-none focus:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div>
              <label className="text-sm text-gray-600 block mb-2">Frage</label>
              <div className="relative group">
                <input
                  ref={pollQuestionRef}
                  placeholder="Gib eine Frage ein."
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:outline-none focus:ring-0 bg-white"
                  onFocus={() => setEmojiPicker(prev => (
                    prev.context === 'poll_question' || prev.context === 'poll_option'
                      ? prev
                      : { ...prev, show: false, optionIndex: null, anchor: null, dimensions: null }
                  ))}
                />
                <button
                  type="button"
                  data-emoji-trigger
                  data-question-emoji-trigger
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    openPollEmojiPicker(rect, 'poll_question');
                  }}
                >
                  <Smile className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-600 block mb-2">Optionen</label>
              <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {pollOptions.map((option, index) => (
                  <div key={index} className="relative group">
                    <input
                      ref={index === 0 ? pollOption1Ref : index === 1 ? pollOption2Ref : undefined}
                      data-poll-option-input={index}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      onFocus={() => handleOptionFocus(index)}
                      placeholder="+ Füge eine Option hinzu."
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:outline-none focus:ring-0 bg-white"
                    />
                    <button
                      type="button"
                      data-emoji-trigger
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        openPollEmojiPicker(rect, 'poll_option', index);
                      }}
                    >
                      <Smile className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 select-none cursor-default">
              <input ref={pollAllowMultipleRef} type="checkbox" className="accent-green-600" defaultChecked />
              <span className="text-sm text-gray-700">Mehrere Antworten erlauben</span>
            </label>
          </div>
          <div className="px-5 pb-4 pt-2 flex items-center justify-end gap-3 border-t border-gray-100 bg-white">
            <button
              onClick={() => {
                setShowPollModal(false);
                setPollOptions(['', '']);
                setEmojiPicker(prev => ({ ...prev, show: false, optionIndex: null, anchor: null, dimensions: null }));
              }}
              className="px-4 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
            >Abbrechen</button>
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  if (!selectedChat?.id) return;
                  const question = (pollQuestionRef.current?.value || '').trim();
                  const options = pollOptions.map(opt => opt.trim()).filter(Boolean);
                  const allowMultiple = !!pollAllowMultipleRef.current?.checked;
                  if (!question || options.length < 2) {
                    console.warn('[Poll] Need question and at least two options');
                    return;
                  }
                  await chatIntegration.createPoll(String(selectedChat.id), question, options, allowMultiple);
                  setShowPollModal(false);
                  setPollOptions(['', '']);
                  setEmojiPicker(prev => ({ ...prev, show: false, optionIndex: null, anchor: null, dimensions: null }));
                } catch (err) {
                  console.error('Failed to create poll:', err);
                }
              }}
              className="h-10 w-12 rounded-lg text-white"
              style={{ background: 'linear-gradient(135deg, #22C55E, #105F2D)' }}
              title="Senden"
            >
              ▷
            </button>
          </div>
        </div>
      </div>
    )}

     {/* Photo Viewer */}
     {photoViewer.show && (
       <div 
         className="fixed inset-0 bg-black flex flex-col z-[9999]"
         onClick={closePhotoViewer}
         style={{ 
           position: 'fixed',
           top: 0,
           left: 0,
           right: 0,
           bottom: 0,
           width: '100vw',
           height: '100vh',
           backgroundColor: 'black'
         }}
       >
         {/* Main photo display */}
         <div className="flex-1 flex items-center justify-center relative">
           {/* Previous arrow */}
           {photoViewer.photos.length > 1 && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 navigatePhotoViewer('prev');
               }}
               className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all z-10"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
               </svg>
             </button>
           )}

           {/* Current photo */}
           <img
             src={photoViewer.photos[photoViewer.currentIndex]}
             alt="Full size photo"
             className="object-contain"
             onClick={(e) => e.stopPropagation()}
             style={{
               maxWidth: 'calc(100vw - 160px)',
               maxHeight: 'calc(100vh - 160px)',
               width: 'auto',
               height: 'auto'
             }}
           />

           {/* Next arrow */}
           {photoViewer.photos.length > 1 && (
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 navigatePhotoViewer('next');
               }}
               className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all z-10"
             >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
               </svg>
             </button>
           )}

           {/* Close button */}
           <button
             onClick={closePhotoViewer}
             className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-opacity-70 transition-all"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
         </div>

         {/* Thumbnail footer */}
         <div className="h-24 bg-black bg-opacity-50 flex items-center justify-center px-4">
           <div className="flex gap-2 overflow-x-auto max-w-full">
             {photoViewer.photos.map((photo, index) => (
               <button
                 key={index}
                 onClick={(e) => {
                   e.stopPropagation();
                   setPhotoViewer(prev => ({ ...prev, currentIndex: index }));
                 }}
                 className={`flex-shrink-0 w-16 h-16 rounded border-2 transition-all ${
                   index === photoViewer.currentIndex
                     ? 'border-white'
                     : 'border-transparent opacity-70 hover:opacity-100'
                 }`}
               >
                 <img
                   src={photo}
                   alt={`Thumbnail ${index + 1}`}
                   className="w-full h-full object-cover rounded"
                 />
               </button>
             ))}
           </div>
         </div>
       </div>
     )}

     {/* Clear Chat Confirmation Dialog */}
     {clearChatDialog.show && (
       <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[9999] flex items-center justify-center">
         <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4">
           <h3 className="text-lg font-semibold text-gray-900 mb-4">
             Chat leeren
           </h3>
           <p className="text-gray-600 mb-6">
             Sind Sie sicher, dass Sie diesen Chat leeren möchten? Alle Nachrichten werden dauerhaft gelöscht.
           </p>
           
           <div className="space-y-3">
            <button
              onClick={async () => {
                if (clearChatDialog.contactId) {
                  const conversationId = String(clearChatDialog.contactId);
                  try {
                    await chatIntegration.clearConversationForMe(conversationId);
                  } catch (error) {
                    console.error('Error clearing chat:', error);
                  }
                }
                setClearChatDialog({ show: false, contactId: null });
              }}
              className="w-full px-4 py-3 text-center text-sm text-gray-700 rounded-lg transition-colors border"
              style={{
                borderColor: 'rgba(250, 12, 12, 0.85)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(250, 12, 12, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div className="font-medium">Chat leeren</div>
              <div className="text-xs text-gray-500">
                Alle Nachrichten werden gelöscht
              </div>
            </button>
           </div>
           
           <button
             onClick={() => setClearChatDialog({ show: false, contactId: null })}
             className="w-full mt-4 px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
           >
             Abbrechen
           </button>
         </div>
       </div>
     )}

      {/* Reaction Details Popup */}
      {reactionDetails.show && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm z-[9999] flex items-center justify-center"
          onClick={() => setReactionDetails({ show: false, messageId: null, reactions: {}, selectedEmoji: null })}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with emoji tabs */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Reaktionen</h3>
                <button 
                  onClick={() => setReactionDetails({ show: false, messageId: null, reactions: {}, selectedEmoji: null })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Emoji filter tabs */}
              <div className="flex items-center space-x-2 overflow-x-auto">
                <button
                  onClick={() => setReactionDetails(prev => ({ ...prev, selectedEmoji: null }))}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    reactionDetails.selectedEmoji === null
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Alle {Object.values(reactionDetails.reactions).reduce((sum, users) => sum + users.length, 0)}
                </button>
                {Object.entries(reactionDetails.reactions).map(([emoji, users]) => (
                  <button
                    key={emoji}
                    onClick={() => setReactionDetails(prev => ({ ...prev, selectedEmoji: emoji }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      reactionDetails.selectedEmoji === emoji
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {emoji} {users.length}
                  </button>
                ))}
              </div>
            </div>
            
            {/* User list */}
            <div className="p-4 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {(() => {
                  const usersToShow = reactionDetails.selectedEmoji
                    ? reactionDetails.reactions[reactionDetails.selectedEmoji] || []
                    : Object.values(reactionDetails.reactions).flat();
                  
                  return usersToShow.map((user, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">{user.display_name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{user.display_name}</p>
                      </div>
                      {reactionDetails.selectedEmoji === null && (() => {
                        const userEmoji = Object.entries(reactionDetails.reactions).find(([_, users]) => 
                          users.some(u => u.user_id === user.user_id)
                        )?.[0];
                        return userEmoji ? <span className="text-lg">{userEmoji}</span> : null;
                      })()}
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for editing group picture */}
      <input
        ref={groupPictureInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file && selectedChat?.isGroup) {
            try {
              // Upload the new picture
              const newPictureUrl = await uploadGroupPicture(file, selectedChat.id);
              
              // Update via API
              const response = await fetch(`/api/chat/conversations/${selectedChat.id}/picture`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profilePictureUrl: newPictureUrl }),
              });

              if (response.ok) {
                // Refresh conversations to get updated picture
                await chatIntegration.fetchConversations();
                
                // Update selected chat state
                setSelectedChat(prev => prev ? { ...prev, profileImage: newPictureUrl } : null);
              } else {
                console.error('Failed to update group picture');
              }
            } catch (error) {
              console.error('Error updating group picture:', error);
            }
          }
          // Reset input
          if (e.target) {
            e.target.value = '';
          }
        }}
      />

      <style jsx global>{`
        .animate-skeleton-fade {
          animation: skeleton-fade 0.7s ease-in-out infinite alternate;
        }
        @keyframes skeleton-fade {
          0% { opacity: 0.4; }
          100% { opacity: 0.8; }
        }
      `}</style>
  </div>
  );
}