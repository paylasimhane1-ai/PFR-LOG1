import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChatMessage,
  ChatReply,
  ChatEntityCard,
  ChatPresence,
  User,
  Vehicle,
  Ramp,
  Warehouse
} from '../types';
import { compressImageFile } from '../utils/helpers';
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Trash2,
  CornerUpLeft,
  AtSign,
  Maximize2,
  Minimize2,
  CheckCheck,
  ArrowDown,
  Edit2,
  Check,
  Hash,
  Search,
  Pin,
  PinOff,
  Image as ImageIcon,
  Truck,
  Warehouse as WarehouseIcon,
  Zap,
  Smile,
  SmilePlus,
  Volume2,
  VolumeX,
  Users as UsersIcon,
  Menu,
  ChevronRight
} from 'lucide-react';
import { playChime } from '../utils/audio';
import { sendNativeNotification, loadPushSettings } from '../utils/notifications';

export interface ChatSendPayload {
  text: string;
  channelId: string;
  recipient?: string | null;
  replyTo?: ChatReply | null;
  mentions?: string[];
  imageUrl?: string | null;
  entityCard?: ChatEntityCard | null;
}

interface ChatWidgetProps {
  chatMessages: ChatMessage[];
  chatPresences?: ChatPresence[];
  currentUser: User | null;
  users?: User[];
  vehicles?: Vehicle[];
  ramps?: Ramp[];
  warehouses?: Warehouse[];
  onSendMessage: (payload: ChatSendPayload) => void;
  onEditMessage?: (id: number, newText: string) => void;
  onDeleteMessage?: (id: number) => void;
  onToggleReaction?: (id: number, emoji: string) => void;
  onTogglePinMessage?: (id: number) => void;
  onClearMessages?: (channelId?: string) => void;
  onMarkMessagesAsRead?: (messageIds: number[]) => void;
  onUpdatePresence?: (typingInChannel: string | null) => void;
  onNavigateToVehicle?: (vehicle: Vehicle) => void;
  onNavigateToRamp?: (ramp: Ramp) => void;
}

const PUBLIC_CHANNELS = [
  { id: 'genel', name: 'Genel Saha', desc: 'Tüm depo, güvenlik ve operasyon ekibi' },
  { id: 'guvenlik', name: 'Güvenlik & Kapı', desc: 'Kapı kabul, belge ve çıkış koordinasyonu' },
  { id: 'operasyon', name: 'Operasyon & Rampa', desc: 'Rampa yönlendirme, yükleme & boşaltma' }
];

const QUICK_REACTIONS = ['👍', '✅', '🚨', '👀', '🔥'];
const EMOJI_PALETTE = ['👍', '✅', '🚨', '⚠️', '🚛', '📦', '🏭', '⏱️', '📞', '🙏', '👌', '🔥', '👏', '👀', '📌', '💬'];
const QUICK_TEMPLATES = [
  'Araç rampaya yanaştı, işlem başlıyor.',
  'Evraklar kontrol edildi ve onaylandı.',
  'Acil öncelikli araç için kapı desteği rica ederiz.',
  'Rampa boşaltıldı, sıradaki araç alınabilir.',
  'Güvenlik çıkış kontrolü bekleniyor.',
  'Şoför ile telefon/WhatsApp üzerinden teyit sağlandı.'
];

export function getDmChannelId(u1: string, u2: string): string {
  const pair = [u1.trim().toLowerCase(), u2.trim().toLowerCase()].sort();
  return `dm__${pair[0]}__${pair[1]}`;
}

function getDateLabel(ts?: number): string {
  if (!ts) return 'Bugün';
  const msgDate = new Date(ts);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(msgDate, today)) return 'Bugün';
  if (sameDay(msgDate, yesterday)) return 'Dün';
  return msgDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function getRoleLabel(role?: string): string {
  if (role === 'admin') return 'Admin';
  if (role === 'security') return 'Güvenlik';
  if (role === 'guest') return 'Misafir';
  return 'Personel';
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  chatMessages,
  chatPresences = [],
  currentUser,
  users = [],
  vehicles = [],
  ramps = [],
  warehouses = [],
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onTogglePinMessage,
  onClearMessages,
  onMarkMessagesAsRead,
  onUpdatePresence,
  onNavigateToVehicle,
  onNavigateToRamp
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [activeChannelId, setActiveChannelId] = useState<string>('genel');

  // Composer State
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingEntityCard, setPendingEntityCard] = useState<ChatEntityCard | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  // Popovers & Filters
  const [activePopover, setActivePopover] = useState<'none' | 'emoji' | 'templates' | 'entity'>('none');
  const [entityTab, setEntityTab] = useState<'vehicle' | 'ramp'>('vehicle');
  const [entitySearch, setEntitySearch] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [onlyMentionsFilter, setOnlyMentionsFilter] = useState(false);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<number | null>(null);
  const [activeReadById, setActiveReadById] = useState<number | null>(null);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yms_chat_muted') === '1';
    } catch {
      return false;
    }
  });
  const [now, setNow] = useState<number>(() => Date.now());

  // Unread divider state per opened channel
  const [initialUnreadId, setInitialUnreadId] = useState<number | null>(null);
  const [initialUnreadCount, setInitialUnreadCount] = useState<number>(0);
  const [initialUnreadTime, setInitialUnreadTime] = useState<string>('');
  const markAsReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState<number>(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevVisibleCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-chat-widget', handleOpenChat);
    return () => window.removeEventListener('open-chat-widget', handleOpenChat);
  }, []);

  const myUsername = currentUser?.username || '';
  const myUsernameLower = myUsername.trim().toLowerCase();

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('yms_chat_muted', next ? '1' : '0');
      } catch {
        // ignore storage errors
      }
      return next;
    });
  };

  // Visibility filter: public channels + DMs involving current user
  const visibleMessages = useMemo(() => {
    if (!currentUser) return [];
    return chatMessages.filter((m) => {
      const ch = m.channelId || 'genel';
      if (!ch.startsWith('dm__')) return true;
      const participants = ch.split('__').slice(1);
      return (
        m.sender.trim().toLowerCase() === myUsernameLower ||
        (m.recipient && m.recipient.trim().toLowerCase() === myUsernameLower) ||
        participants.includes(myUsernameLower)
      );
    });
  }, [chatMessages, currentUser, myUsernameLower]);

  // Global unread count across all visible channels & DMs
  const totalUnreadCount = useMemo(() => {
    if (!currentUser) return 0;
    return visibleMessages.filter((m) => {
      if (m.sender.trim().toLowerCase() === myUsernameLower) return false;
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.some((u) => u.trim().toLowerCase() === myUsernameLower);
    }).length;
  }, [visibleMessages, currentUser, myUsernameLower]);

  const getUnreadForChannel = (chId: string) => {
    if (!currentUser) return 0;
    return visibleMessages.filter((m) => {
      const msgCh = m.channelId || 'genel';
      if (msgCh !== chId) return false;
      if (m.sender.trim().toLowerCase() === myUsernameLower) return false;
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.some((u) => u.trim().toLowerCase() === myUsernameLower);
    }).length;
  };

  // Channel messages
  const channelMessages = useMemo(() => {
    return visibleMessages.filter((m) => (m.channelId || 'genel') === activeChannelId);
  }, [visibleMessages, activeChannelId]);

  // Apply search / @mentions filter inside active channel
  const displayedMessages = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    return channelMessages.filter((m) => {
      if (onlyMentionsFilter) {
        const lowerText = m.text.toLowerCase();
        const mentioned =
          (myUsernameLower && lowerText.includes(`@${myUsernameLower}`)) ||
          lowerText.includes('@herkes') ||
          lowerText.includes('@tum_ekip');
        if (!mentioned) return false;
      }
      if (!q) return true;
      return (
        m.text.toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        (m.entityCard?.title && m.entityCard.title.toLowerCase().includes(q)) ||
        (m.entityCard?.subtitle && m.entityCard.subtitle.toLowerCase().includes(q))
      );
    });
  }, [channelMessages, chatSearchQuery, onlyMentionsFilter, myUsernameLower]);

  const pinnedMessages = useMemo(
    () => channelMessages.filter((m) => m.isPinned),
    [channelMessages]
  );

  // Presence helpers (online within 90s, typing within 6s)
  const onlineUsernamesSet = useMemo(() => {
    const set = new Set<string>();
    chatPresences.forEach((p) => {
      if (now - p.lastActiveAt <= 90_000) {
        set.add(p.username.trim().toLowerCase());
      }
    });
    if (myUsernameLower) set.add(myUsernameLower);
    return set;
  }, [chatPresences, now, myUsernameLower]);

  const typingUsersInActiveChannel = useMemo(() => {
    return chatPresences
      .filter(
        (p) =>
          p.username.trim().toLowerCase() !== myUsernameLower &&
          p.typingInChannel === activeChannelId &&
          p.typingAt &&
          now - p.typingAt <= 6_000
      )
      .map((p) => p.username);
  }, [chatPresences, activeChannelId, now, myUsernameLower]);

  // DM User directory (other users, online sorted first)
  const dmUsers = useMemo(() => {
    const list = users.filter((u) => u.username.trim().toLowerCase() !== myUsernameLower);
    return [...list].sort((a, b) => {
      const aOnline = onlineUsernamesSet.has(a.username.trim().toLowerCase());
      const bOnline = onlineUsernamesSet.has(b.username.trim().toLowerCase());
      if (aOnline !== bOnline) return aOnline ? -1 : 1;
      return a.username.localeCompare(b.username, 'tr');
    });
  }, [users, myUsernameLower, onlineUsernamesSet]);

  const activeChannelMeta = useMemo(() => {
    const pub = PUBLIC_CHANNELS.find((c) => c.id === activeChannelId);
    if (pub) {
      return {
        isDm: false,
        title: `#${pub.name}`,
        subtitle: pub.desc,
        recipient: null as string | null,
        isOnline: false
      };
    }
    if (activeChannelId.startsWith('dm__')) {
      const targetUser = dmUsers.find((u) => getDmChannelId(myUsername, u.username) === activeChannelId);
      const partnerName =
        targetUser?.username ||
        activeChannelId
          .split('__')
          .slice(1)
          .find((n) => n !== myUsernameLower) ||
        'Özel Mesaj';
      const isOnline = onlineUsernamesSet.has(partnerName.toLowerCase());
      return {
        isDm: true,
        title: partnerName,
        subtitle: targetUser ? `${getRoleLabel(targetUser.role)} • Birebir Özel Sohbet` : 'Birebir Özel Sohbet',
        recipient: targetUser?.username || partnerName,
        isOnline
      };
    }
    return {
      isDm: false,
      title: '#Genel Saha',
      subtitle: 'Tüm depo, güvenlik ve operasyon ekibi',
      recipient: null,
      isOnline: false
    };
  }, [activeChannelId, dmUsers, myUsername, myUsernameLower, onlineUsernamesSet]);

  // @mention candidates
  const mentionCandidates = useMemo(() => {
    const list: { id: string; name: string; role: string; isBroadcast?: boolean }[] = [
      { id: 'herkes', name: 'herkes', role: 'Tüm Depo Ekibi', isBroadcast: true },
      { id: 'tum_ekip', name: 'tum_ekip', role: 'Genel Anons', isBroadcast: true }
    ];
    const seen = new Set<string>(['herkes', 'tum_ekip']);

    if (users && users.length > 0) {
      users.forEach((u) => {
        if (!seen.has(u.username.toLowerCase())) {
          seen.add(u.username.toLowerCase());
          list.push({
            id: u.username,
            name: u.username,
            role: getRoleLabel(u.role)
          });
        }
      });
    }

    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.role.toLowerCase().includes(query)
    );
  }, [users, mentionQuery]);

  // Incoming message audio & native notification
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevVisibleCountRef.current = visibleMessages.length;
      return;
    }

    if (visibleMessages.length > prevVisibleCountRef.current) {
      const newMessages = visibleMessages.slice(prevVisibleCountRef.current);
      newMessages.forEach((msg) => {
        if (msg.sender.trim().toLowerCase() !== myUsernameLower) {
          if (!isMuted) {
            playChime('message');
          }

          const msgText = (msg.text || '').toLowerCase();
          const isDm = (msg.channelId || '').startsWith('dm__');
          const isMentioned =
            (myUsernameLower && msgText.includes(`@${myUsernameLower}`)) ||
            msgText.includes('@herkes') ||
            msgText.includes('@tum_ekip');

          if (isMentioned || isDm) {
            const pushSettings = loadPushSettings();
            if (pushSettings.notifyOnMention) {
              sendNativeNotification({
                title: isDm ? `🔒 ${msg.sender} size özel mesaj gönderdi` : `💬 ${msg.sender} sizden bahsetti!`,
                body: msg.text || (msg.imageUrl ? '📷 Fotoğraf gönderdi' : '📌 Saha kartı paylaştı'),
                soundType: isMuted ? undefined : 'message',
                tag: 'chat-mention-' + msg.id
              });
            }
          }
        }
      });
    }
    prevVisibleCountRef.current = visibleMessages.length;
  }, [visibleMessages, myUsernameLower, isMuted]);

  // Active channel unread messages
  const activeChannelUnreadMessages = useMemo(() => {
    if (!currentUser) return [];
    return channelMessages.filter((m) => {
      if (m.sender.trim().toLowerCase() === myUsernameLower) return false;
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.some((u) => u.trim().toLowerCase() === myUsernameLower);
    });
  }, [channelMessages, currentUser, myUsernameLower]);

  // Scroll & mark as read when opening chat or switching channel
  useEffect(() => {
    if (!isOpen) {
      setInitialUnreadId(null);
      setInitialUnreadCount(0);
      setInitialUnreadTime('');
      if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current);
      return;
    }

    const unread = activeChannelUnreadMessages;
    if (unread.length > 0) {
      const firstMsg = unread[0];
      const firstId = firstMsg.id;
      const timeStr =
        firstMsg.time ||
        (firstMsg.timestamp
          ? new Date(firstMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '');

      setInitialUnreadId(firstId);
      setInitialUnreadCount(unread.length);
      setInitialUnreadTime(timeStr);

      const performScroll = () => {
        if (!messagesContainerRef.current) return;
        const marker =
          document.getElementById('unread-divider-marker') ||
          document.getElementById(`chat-msg-${firstId}`);
        if (marker) {
          messagesContainerRef.current.scrollTo({
            top: Math.max(0, marker.offsetTop - 16),
            behavior: 'smooth'
          });
        }
      };

      requestAnimationFrame(() => {
        performScroll();
        setTimeout(performScroll, 80);
      });

      if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current);
      markAsReadTimerRef.current = setTimeout(() => {
        onMarkMessagesAsRead?.(unread.map((m) => m.id));
      }, 3500);
    } else {
      setInitialUnreadId(null);
      setInitialUnreadCount(0);
      setInitialUnreadTime('');
      const timer = setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      }, 60);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeChannelId]);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(110, inputRef.current.scrollHeight)}px`;
    }
  }, [text]);

  const handleTypingBroadcast = () => {
    if (!onUpdatePresence) return;
    const nowTs = Date.now();
    if (nowTs - lastTypingSentRef.current > 2400) {
      lastTypingSentRef.current = nowTs;
      onUpdatePresence(activeChannelId);
    }
    if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    typingClearTimerRef.current = setTimeout(() => {
      onUpdatePresence(null);
    }, 4000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || val.length;
    setText(val);
    if (val.trim()) {
      handleTypingBroadcast();
    }

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        if (!query.includes(' ') && !query.includes('\n')) {
          setMentionQuery(query);
          setMentionStartIndex(lastAtIndex);
          setSelectedMentionIdx(0);
          return;
        }
      }
    }

    setMentionQuery(null);
    setMentionStartIndex(-1);
  };

  const handleSelectMention = (candidateName: string) => {
    if (mentionStartIndex === -1) return;
    const beforeAt = text.slice(0, mentionStartIndex);
    const afterCursor = text.slice(inputRef.current?.selectionStart || text.length);
    const newText = `${beforeAt}@${candidateName} ${afterCursor}`;
    setText(newText);
    setMentionQuery(null);
    setMentionStartIndex(-1);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newCursor = (beforeAt + `@${candidateName} `).length;
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIdx((prev) => (prev - 1 + mentionCandidates.length) % mentionCandidates.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(mentionCandidates[selectedMentionIdx].name);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendInternal();
    } else if (e.key === 'Escape' && editingMessage) {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsCompressingImage(true);
    try {
      let compressed = await compressImageFile(file, 800, 0.72);
      if (compressed.length > 480000) {
        compressed = await compressImageFile(file, 600, 0.52);
      }
      setPendingImageUrl(compressed);
      setActivePopover('none');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Chat image compress failed:', err);
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleStartEdit = (m: ChatMessage) => {
    setReplyingTo(null);
    setPendingImageUrl(null);
    setPendingEntityCard(null);
    setEditingMessage(m);
    setText(m.text);
    inputRef.current?.focus();
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setText('');
  };

  const handleSendInternal = () => {
    const trimmed = text.trim();

    if (editingMessage) {
      if (!trimmed) return;
      onEditMessage?.(editingMessage.id, trimmed);
      setEditingMessage(null);
      setText('');
      return;
    }

    if (!trimmed && !pendingImageUrl && !pendingEntityCard) return;

    const mentionRegex = /@([a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]+)/g;
    const foundMentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(trimmed)) !== null) {
      foundMentions.push(match[1]);
    }

    const replyData: ChatReply | null = replyingTo
      ? {
          id: replyingTo.id,
          sender: replyingTo.sender,
          role: replyingTo.role,
          text: replyingTo.text || (replyingTo.imageUrl ? '📷 Fotoğraf' : replyingTo.entityCard?.title || '')
        }
      : null;

    onSendMessage({
      text: trimmed,
      channelId: activeChannelId,
      recipient: activeChannelMeta.isDm ? activeChannelMeta.recipient : null,
      replyTo: replyData,
      mentions: foundMentions.length > 0 ? foundMentions : undefined,
      imageUrl: pendingImageUrl,
      entityCard: pendingEntityCard
    });

    setText('');
    setReplyingTo(null);
    setPendingImageUrl(null);
    setPendingEntityCard(null);
    setMentionQuery(null);
    setActivePopover('none');
    onUpdatePresence?.(null);
    if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);

    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendInternal();
  };

  const handleScrollToMessage = (messageId: number) => {
    const el = document.getElementById(`chat-msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const renderMessageContent = (msgText: string, isMine: boolean) => {
    if (!msgText) return null;
    const parts = msgText.split(/(@[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]+)/g);

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const isMe = myUsernameLower && username.toLowerCase() === myUsernameLower;
        const isAll = username.toLowerCase() === 'herkes' || username.toLowerCase() === 'tum_ekip';

        return (
          <span
            key={index}
            className={`inline-flex items-center px-1.5 py-0.2 rounded font-bold text-[10px] mx-0.5 shadow-2xs ${
              isMe
                ? 'bg-amber-400 text-amber-950 font-black'
                : isAll
                ? 'bg-purple-600 text-white font-bold'
                : isMine
                ? 'bg-blue-800 text-blue-100'
                : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
            }`}
          >
            <AtSign className="w-2.5 h-2.5 mr-0.5 inline" />
            {username}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Filtered vehicles & ramps for entity picker
  const selectableVehicles = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    return vehicles
      .filter((v) => v.durum !== 'ÇIKIŞ YAPTI')
      .filter(
        (v) =>
          !q ||
          v.dorsePlaka.toLowerCase().includes(q) ||
          (v.cekiciPlaka && v.cekiciPlaka.toLowerCase().includes(q)) ||
          v.musteri.toLowerCase().includes(q)
      )
      .slice(0, 18);
  }, [vehicles, entitySearch]);

  const selectableRamps = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    return ramps
      .filter((r) => !q || r.ad.toLowerCase().includes(q) || r.durum.toLowerCase().includes(q))
      .slice(0, 24);
  }, [ramps, entitySearch]);

  const getWarehouseShort = (depoId?: number) => {
    const wh = warehouses.find((w) => w.id === (depoId || 1));
    return wh ? wh.ad.split(' - ')[0] : `Depo ${depoId || 1}`;
  };

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-3 sm:right-6 z-40 chat-widget">
      {isOpen && (
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 transition-all duration-200 ${
            isMaximized
              ? 'fixed inset-2 sm:inset-4 md:inset-6 lg:inset-8 z-50 max-w-6xl mx-auto h-[92dvh] max-h-[95dvh]'
              : 'fixed sm:absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom)+8px)] sm:bottom-20 right-2 sm:right-0 left-2 sm:left-auto w-auto sm:w-[680px] md:w-[780px] lg:w-[860px] max-w-[calc(100vw-16px)] h-[84dvh] sm:h-[680px] max-h-[820px]'
          }`}
        >
          {/* ================= ÜST BAŞLIK ================= */}
          <div className="px-3.5 py-3 bg-slate-900 dark:bg-black text-white flex justify-between items-center border-b border-slate-800 shrink-0 gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setShowMobileSidebar((prev) => !prev)}
                className="md:hidden p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer shrink-0"
                title="Kanallar & Kişiler"
              >
                <Menu className="w-4 h-4" />
              </button>

              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-300">
                  {activeChannelMeta.isDm ? <UsersIcon className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                    activeChannelMeta.isDm
                      ? activeChannelMeta.isOnline
                        ? 'bg-emerald-500'
                        : 'bg-slate-500'
                      : 'bg-emerald-500'
                  }`}
                />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="font-bold text-xs sm:text-sm truncate">{activeChannelMeta.title}</h4>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono tabular-nums">
                    {onlineUsernamesSet.size} Çevrimiçi
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate">
                  {typingUsersInActiveChannel.length > 0 ? (
                    <span className="text-emerald-400 font-bold animate-pulse">
                      {typingUsersInActiveChannel.join(', ')} yazıyor...
                    </span>
                  ) : (
                    activeChannelMeta.subtitle
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowSearchBar((prev) => !prev)}
                title="Mesajlarda Ara & Filtrele"
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  showSearchBar || chatSearchQuery || onlyMentionsFilter
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Sohbet Sesini Aç' : 'Sohbeti Sessize Al'}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isMuted ? 'text-amber-400 bg-amber-950/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {currentUser.role === 'admin' && onClearMessages && channelMessages.length > 0 && (
                <button
                  type="button"
                  onClick={() => onClearMessages(activeChannelId)}
                  title="Bu Kanal Geçmişini Temizle (Admin)"
                  className="px-2 py-1 text-[10px] text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-800/80 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Temizle</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Normal Boyuta Dön' : 'Tam Ekran / Geniş Mod'}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {isMaximized ? <Minimize2 className="w-4 h-4 text-blue-400" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Küçült"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Kapat"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ================= ANA GÖVDE (SOL KANAL/DM LİSTESİ + SAĞ MESAJ ALANI) ================= */}
          <div className="flex-1 flex min-h-0 relative overflow-hidden">
            {/* Sol Panel: Departman Kanalları & Aktif DM Listesi */}
            <aside
              className={`${
                showMobileSidebar
                  ? 'absolute inset-y-0 left-0 z-30 w-64 flex shadow-2xl'
                  : 'hidden md:flex md:w-56 lg:w-60'
              } flex-col bg-slate-50 dark:bg-slate-900/95 border-r border-slate-200 dark:border-slate-800 shrink-0 overflow-y-auto custom-scroll`}
            >
              <div className="p-2.5 space-y-3">
                {/* Kanallar */}
                <div>
                  <div className="px-2 pb-1 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <span>Departman Kanalları</span>
                    {showMobileSidebar && (
                      <button
                        type="button"
                        onClick={() => setShowMobileSidebar(false)}
                        className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {PUBLIC_CHANNELS.map((ch) => {
                      const isActive = activeChannelId === ch.id;
                      const unread = getUnreadForChannel(ch.id);
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(ch.id);
                            setShowMobileSidebar(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-xl text-left text-xs font-bold flex items-center justify-between gap-2 transition cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <Hash className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-100' : 'text-slate-400'}`} />
                            <span className="truncate">{ch.name}</span>
                          </span>
                          {unread > 0 && (
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums ${
                                isActive ? 'bg-white text-blue-700' : 'bg-red-600 text-white'
                              }`}
                            >
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Birebir Özel Mesajlar (DM) */}
                <div>
                  <div className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                    <span>Ekip & Özel Mesaj (DM)</span>
                    <span className="font-mono tabular-nums">{dmUsers.length}</span>
                  </div>
                  <div className="space-y-1">
                    {dmUsers.map((u) => {
                      const dmId = getDmChannelId(myUsername, u.username);
                      const isActive = activeChannelId === dmId;
                      const isOnline = onlineUsernamesSet.has(u.username.trim().toLowerCase());
                      const unread = getUnreadForChannel(dmId);
                      return (
                        <button
                          key={u.username}
                          type="button"
                          onClick={() => {
                            setActiveChannelId(dmId);
                            setShowMobileSidebar(false);
                          }}
                          className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between gap-2 transition cursor-pointer ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2 h-2 rounded-full shrink-0 ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                            />
                            <div className="min-w-0">
                              <div className="font-bold truncate">{u.username}</div>
                              <div className={`text-[9px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                                {getRoleLabel(u.role)}
                              </div>
                            </div>
                          </div>
                          {unread > 0 && (
                            <span
                              className={`text-[10px] font-black px-1.5 py-0.2 rounded-full tabular-nums shrink-0 ${
                                isActive ? 'bg-white text-blue-700' : 'bg-red-600 text-white'
                              }`}
                            >
                              {unread}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    {dmUsers.length === 0 && (
                      <p className="px-2 py-2 text-[11px] text-slate-400">Başka kayıtlı kullanıcı yok.</p>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            {/* Sağ Ana Sohbet Alanı */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {/* Arama & @Mention Filtre Çubuğu */}
              {showSearchBar && (
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 shrink-0">
                  <div className="relative flex-1 min-w-[160px]">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      placeholder="Mesaj, kişi veya plaka ara..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {chatSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setChatSearchQuery('')}
                        className="absolute right-2 top-1.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlyMentionsFilter((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition border ${
                      onlyMentionsFilter
                        ? 'bg-amber-500 text-slate-950 border-amber-500'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <AtSign className="w-3 h-3" />
                    <span>Bana Bahsedilenler</span>
                  </button>
                </div>
              )}

              {/* Sabitlenmiş Mesajlar Bandı */}
              {pinnedMessages.length > 0 && (
                <div className="px-3.5 py-2 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-2 shrink-0 text-xs">
                  <button
                    type="button"
                    onClick={() => handleScrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
                    className="flex items-center gap-2 min-w-0 text-left cursor-pointer flex-1"
                    title="Sabitlenen mesaja git"
                  >
                    <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0 truncate text-amber-950 dark:text-amber-200">
                      <span className="font-extrabold mr-1.5">Sabitli ({pinnedMessages.length}):</span>
                      <span className="font-medium">
                        {pinnedMessages[pinnedMessages.length - 1].text ||
                          pinnedMessages[pinnedMessages.length - 1].entityCard?.title ||
                          '📷 Görsel'}
                      </span>
                    </div>
                  </button>
                  {onTogglePinMessage &&
                    (currentUser.role === 'admin' ||
                      pinnedMessages[pinnedMessages.length - 1].sender.toLowerCase() === myUsernameLower) && (
                      <button
                        type="button"
                        onClick={() => onTogglePinMessage(pinnedMessages[pinnedMessages.length - 1].id)}
                        className="p-1 text-amber-700 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 rounded cursor-pointer shrink-0"
                        title="Sabitlemeyi Kaldır"
                      >
                        <PinOff className="w-3.5 h-3.5" />
                      </button>
                    )}
                </div>
              )}

              {/* Okunmamış Mesajlar Bildirim Bandı */}
              {initialUnreadCount > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-900/60 px-3.5 py-2 flex items-center justify-between gap-2 shrink-0 text-xs">
                  <div className="flex items-center gap-2 min-w-0 text-rose-800 dark:text-rose-200 font-semibold truncate">
                    <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse shrink-0" />
                    <span className="truncate tabular-nums">
                      <b>{initialUnreadCount} okunmamış mesaj</b>{' '}
                      {initialUnreadTime ? `(Saat ${initialUnreadTime})` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (messagesContainerRef.current) {
                          messagesContainerRef.current.scrollTo({
                            top: messagesContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                          });
                        }
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-slate-700 text-rose-700 dark:text-rose-300 font-bold text-[10px] rounded-lg border border-rose-200 dark:border-rose-800 transition flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowDown className="w-3 h-3" /> En Sona Git
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeChannelUnreadMessages.length > 0) {
                          onMarkMessagesAsRead?.(activeChannelUnreadMessages.map((m) => m.id));
                        }
                        setInitialUnreadCount(0);
                        setInitialUnreadId(null);
                      }}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <CheckCheck className="w-3 h-3" /> Okundu Say
                    </button>
                  </div>
                </div>
              )}

              {/* Mesaj Listesi */}
              <div
                ref={messagesContainerRef}
                onClick={() => {
                  if (activeReactionPickerId !== null) setActiveReactionPickerId(null);
                  if (activeReadById !== null) setActiveReadById(null);
                }}
                className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-3 custom-scroll bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm leading-relaxed"
              >
                {displayedMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4 space-y-1.5">
                    <MessageSquare className="w-10 h-10 mb-1 opacity-30 text-slate-500" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">
                      {chatSearchQuery || onlyMentionsFilter
                        ? 'Arama veya filtreye uyan mesaj bulunamadı.'
                        : `${activeChannelMeta.title} kanalında henüz mesaj yok.`}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Fotoğraf, aktif araç/rampa kartı veya hazır saha mesajı göndererek iletişimi başlatabilirsiniz.
                    </p>
                  </div>
                )}

                {displayedMessages.map((m, idx) => {
                  const isMine =
                    Boolean(currentUser && m.sender) &&
                    m.sender.trim().toLowerCase() === myUsernameLower;
                  const isHighlighted = highlightedMessageId === m.id;
                  const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
                  const curDateLabel = getDateLabel(m.timestamp || m.id);
                  const prevDateLabel = prevMsg ? getDateLabel(prevMsg.timestamp || prevMsg.id) : null;
                  const showDateDivider = idx === 0 || curDateLabel !== prevDateLabel;
                  const readByList = Array.isArray(m.readBy) ? m.readBy : [];
                  const reactionEntries: Array<[string, string[]]> = m.reactions
                    ? Object.entries(m.reactions).filter(
                        (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
                      )
                    : [];

                  // Canlı araç/rampa kart verisini güncel state'ten zenginleştir
                  const liveCard = (() => {
                    if (!m.entityCard) return null;
                    if (m.entityCard.type === 'vehicle') {
                      const found = vehicles.find((v) => v.id === m.entityCard!.id);
                      if (found) {
                        return {
                          ...m.entityCard,
                          title: found.dorsePlaka,
                          subtitle: found.musteri,
                          status: found.durum,
                          extra: found.cekiciPlaka ? `Çekici: ${found.cekiciPlaka}` : found.islemTuru,
                          liveVehicle: found
                        };
                      }
                    } else if (m.entityCard.type === 'ramp') {
                      const found = ramps.find((r) => r.id === m.entityCard!.id);
                      if (found) {
                        return {
                          ...m.entityCard,
                          title: found.ad,
                          subtitle: getWarehouseShort(found.depoId),
                          status: found.durum,
                          extra: found.arizaNotu || undefined,
                          liveRamp: found
                        };
                      }
                    }
                    return { ...m.entityCard, liveVehicle: undefined, liveRamp: undefined };
                  })();

                  return (
                    <React.Fragment key={m.id}>
                      {showDateDivider && (
                        <div className="flex items-center justify-center my-2 select-none">
                          <span className="px-3 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                            {curDateLabel}
                          </span>
                        </div>
                      )}

                      {initialUnreadId === m.id && (
                        <div id="unread-divider-marker" className="flex items-center gap-3 my-3 py-1 select-none">
                          <div className="flex-1 h-[2px] bg-rose-400 dark:bg-rose-600/80" />
                          <div className="px-3 py-1 bg-rose-600 text-white font-black text-[11px] rounded-full shadow-sm flex items-center gap-1.5">
                            <span>Okunmamış Mesajlar ({initialUnreadCount})</span>
                          </div>
                          <div className="flex-1 h-[2px] bg-rose-400 dark:bg-rose-600/80" />
                        </div>
                      )}

                      <div
                        id={`chat-msg-${m.id}`}
                        className={`flex flex-col group transition-all duration-200 ${
                          isMine ? 'items-end' : 'items-start'
                        } ${isHighlighted ? 'ring-2 ring-blue-500 rounded-2xl p-1' : ''}`}
                      >
                        <div
                          className={`p-3 rounded-2xl shadow-2xs max-w-[88%] sm:max-w-[80%] space-y-1.5 relative transition text-[13px] leading-relaxed ${
                            m.isPinned
                              ? isMine
                                ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none ring-2 ring-amber-400/80'
                                : 'bg-white dark:bg-slate-800 border-2 border-amber-400/70 text-slate-800 dark:text-slate-100 rounded-tl-none'
                              : isMine
                              ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none'
                              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none'
                          }`}
                        >
                          {/* Alıntı Önizleme */}
                          {m.replyTo && (
                            <div
                              onClick={() => handleScrollToMessage(m.replyTo!.id)}
                              className={`text-[11px] p-2 rounded-xl border-l-2 cursor-pointer transition mb-1 ${
                                isMine
                                  ? 'bg-blue-700/80 border-blue-300 text-blue-100 hover:bg-blue-700'
                                  : 'bg-slate-100 dark:bg-slate-700/70 border-blue-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-1 font-bold">
                                <CornerUpLeft className="w-3 h-3" />
                                <span>@{m.replyTo.sender}</span>
                              </div>
                              <p className="truncate text-[10px] opacity-90 mt-0.5 italic">
                                "{m.replyTo.text}"
                              </p>
                            </div>
                          )}

                          {/* Gönderen & Aksiyon Başlığı */}
                          <div className="flex justify-between items-center gap-2 text-[10px] opacity-90 border-b border-black/10 dark:border-white/10 pb-1">
                            <span className="font-bold flex items-center gap-1 flex-wrap">
                              <span>{m.sender}</span>
                              <span className="opacity-75 text-[9px]">({getRoleLabel(m.role)})</span>
                              {m.isPinned && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] px-1 py-0.2 rounded bg-amber-400 text-amber-950 font-black">
                                  <Pin className="w-2.5 h-2.5" /> Sabitli
                                </span>
                              )}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="font-mono tabular-nums">{m.time}</span>

                              {/* Tepki Seçici Tetikleyici */}
                              {onToggleReaction && (
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveReactionPickerId((prev) => (prev === m.id ? null : m.id));
                                    }}
                                    title="Emoji Tepkisi Ver"
                                    className="p-0.5 rounded opacity-75 hover:opacity-100 cursor-pointer"
                                  >
                                    <SmilePlus className="w-3 h-3" />
                                  </button>

                                  {activeReactionPickerId === m.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute bottom-full mb-1 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 flex items-center gap-1 ${
                                        isMine ? 'right-0' : 'left-0'
                                      }`}
                                    >
                                      {QUICK_REACTIONS.map((em) => (
                                        <button
                                          key={em}
                                          type="button"
                                          onClick={() => {
                                            onToggleReaction(m.id, em);
                                            setActiveReactionPickerId(null);
                                          }}
                                          className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-sm cursor-pointer transition"
                                        >
                                          {em}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Yanıtla */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMessage(null);
                                  setReplyingTo(m);
                                }}
                                title="Cevapla"
                                className="p-0.5 rounded opacity-75 hover:opacity-100 cursor-pointer"
                              >
                                <CornerUpLeft className="w-3 h-3" />
                              </button>

                              {/* Sabitle */}
                              {onTogglePinMessage && (isMine || currentUser.role === 'admin') && (
                                <button
                                  type="button"
                                  onClick={() => onTogglePinMessage(m.id)}
                                  title={m.isPinned ? 'Sabitlemeyi Kaldır' : 'Mesajı Sabitle'}
                                  className="p-0.5 rounded opacity-75 hover:opacity-100 cursor-pointer"
                                >
                                  {m.isPinned ? <PinOff className="w-3 h-3 text-amber-300" /> : <Pin className="w-3 h-3" />}
                                </button>
                              )}

                              {/* Düzenle */}
                              {isMine && onEditMessage && (
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(m)}
                                  title="Düzenle"
                                  className="p-0.5 rounded opacity-80 hover:opacity-100 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}

                              {/* Sil */}
                              {(isMine || currentUser.role === 'admin') &&
                                onDeleteMessage &&
                                (confirmDeleteId === m.id ? (
                                  <div className="flex items-center gap-1 bg-red-900 text-white px-1.5 py-0.5 rounded text-[9px] font-bold">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onDeleteMessage(m.id);
                                        setConfirmDeleteId(null);
                                      }}
                                      className="underline cursor-pointer"
                                    >
                                      Sil
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="opacity-80 cursor-pointer"
                                    >
                                      İptal
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(m.id)}
                                    title="Sil"
                                    className="p-0.5 rounded opacity-80 hover:opacity-100 cursor-pointer text-red-300"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                ))}
                            </div>
                          </div>

                          {/* Ekli Fotoğraf */}
                          {m.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setLightboxImageUrl(m.imageUrl!)}
                              className="block rounded-xl overflow-hidden border border-black/15 dark:border-white/15 max-w-[260px] cursor-pointer hover:opacity-95 transition"
                              title="Fotoğrafı Büyüt"
                            >
                              <img
                                src={m.imageUrl}
                                alt="Sohbet eki"
                                className="w-full max-h-52 object-cover"
                              />
                            </button>
                          )}

                          {/* Etkileşimli Araç / Rampa Kartı */}
                          {liveCard && (
                            <button
                              type="button"
                              onClick={() => {
                                if (liveCard.type === 'vehicle' && liveCard.liveVehicle && onNavigateToVehicle) {
                                  onNavigateToVehicle(liveCard.liveVehicle);
                                } else if (liveCard.type === 'ramp' && liveCard.liveRamp && onNavigateToRamp) {
                                  onNavigateToRamp(liveCard.liveRamp);
                                }
                              }}
                              className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between gap-2.5 transition cursor-pointer ${
                                isMine
                                  ? 'bg-blue-800/70 hover:bg-blue-800 border-blue-400/40 text-white'
                                  : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    isMine
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300'
                                  }`}
                                >
                                  {liveCard.type === 'vehicle' ? (
                                    <Truck className="w-4 h-4" />
                                  ) : (
                                    <WarehouseIcon className="w-4 h-4" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-mono tabular-nums font-black text-xs truncate">
                                    {liveCard.title}
                                  </div>
                                  {liveCard.subtitle && (
                                    <div className="text-[10px] opacity-85 truncate">{liveCard.subtitle}</div>
                                  )}
                                  {liveCard.extra && (
                                    <div className="text-[9px] opacity-75 truncate">{liveCard.extra}</div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {liveCard.status && (
                                  <span
                                    className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                      isMine
                                        ? 'bg-white/20 text-white'
                                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    }`}
                                  >
                                    {liveCard.status}
                                  </span>
                                )}
                                <ChevronRight className="w-3.5 h-3.5 opacity-70" />
                              </div>
                            </button>
                          )}

                          {/* Metin İçeriği */}
                          {(m.text || m.isEdited) && (
                            <div className="whitespace-pre-wrap text-xs sm:text-[13px] flex flex-wrap items-baseline gap-1">
                              <span>{renderMessageContent(m.text, isMine)}</span>
                              {m.isEdited && (
                                <span
                                  className={`text-[9px] italic select-none ${
                                    isMine ? 'text-blue-200/80' : 'text-slate-400'
                                  }`}
                                  title={m.editedAt ? `Düzenlenme: ${m.editedAt}` : 'Düzenlendi'}
                                >
                                  • düzenlendi
                                </span>
                              )}
                            </div>
                          )}

                          {/* Tepkiler & Okundu Detayı Alt Satırı */}
                          {(reactionEntries.length > 0 || readByList.length > 0) && (
                            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                              <div className="flex items-center gap-1 flex-wrap">
                                {reactionEntries.map(([emoji, usersArr]) => {
                                  const reactedByMe = usersArr.some(
                                    (u) => u.trim().toLowerCase() === myUsernameLower
                                  );
                                  return (
                                    <button
                                      key={emoji}
                                      type="button"
                                      onClick={() => onToggleReaction?.(m.id, emoji)}
                                      title={usersArr.join(', ')}
                                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer transition tabular-nums border ${
                                        reactedByMe
                                          ? isMine
                                            ? 'bg-white text-blue-700 border-white'
                                            : 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                          : isMine
                                          ? 'bg-blue-700/70 text-blue-100 border-blue-400/40'
                                          : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span>{usersArr.length}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Kimler Okudu Butonu */}
                              {readByList.length > 0 && (
                                <div className="relative ml-auto">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveReadById((prev) => (prev === m.id ? null : m.id));
                                    }}
                                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer tabular-nums ${
                                      isMine
                                        ? 'text-blue-100/90 hover:bg-blue-700/80'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                    title="Kimlerin okuduğunu gör"
                                  >
                                    <CheckCheck className="w-3 h-3" />
                                    <span>{readByList.length}</span>
                                  </button>

                                  {activeReadById === m.id && (
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className={`absolute bottom-full mb-1 z-30 min-w-[160px] max-w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-xl shadow-xl p-2 text-[10px] ${
                                        isMine ? 'right-0' : 'left-0'
                                      }`}
                                    >
                                      <div className="font-extrabold text-slate-500 dark:text-slate-400 uppercase pb-1 mb-1 border-b border-slate-100 dark:border-slate-700">
                                        Okuyanlar ({readByList.length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {readByList.map((reader) => (
                                          <span
                                            key={reader}
                                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold"
                                          >
                                            {reader}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Düzenleme Önizleme Barı */}
              {editingMessage && (
                <div className="px-3 py-2 bg-amber-50 dark:bg-amber-950/50 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Edit2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span className="font-bold truncate">
                      Düzenleniyor: "{editingMessage.text.slice(0, 50)}"
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Cevap Veriliyor Önizleme Barı (Dark Mode Düzeltildi!) */}
              {replyingTo && (
                <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 shrink-0">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <CornerUpLeft className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="truncate">
                      <span className="font-bold text-blue-700 dark:text-blue-300">@{replyingTo.sender}</span>
                      <span className="text-[11px] text-slate-600 dark:text-slate-300 ml-1.5 truncate">
                        yanıtlanıyor: "{(replyingTo.text || replyingTo.entityCard?.title || 'Fotoğraf').slice(0, 45)}"
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="p-1 text-slate-500 hover:text-red-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Bekleyen Fotoğraf veya Araç/Rampa Kartı Önizleme Barı */}
              {(pendingImageUrl || pendingEntityCard) && (
                <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border-t border-slate-200 dark:border-slate-700 flex items-center gap-3 flex-wrap shrink-0">
                  {pendingImageUrl && (
                    <div className="relative inline-block">
                      <img
                        src={pendingImageUrl}
                        alt="Eklenecek görsel"
                        className="h-14 w-14 object-cover rounded-lg border border-slate-300 dark:border-slate-600"
                      />
                      <button
                        type="button"
                        onClick={() => setPendingImageUrl(null)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center shadow cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {pendingEntityCard && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-xs">
                      {pendingEntityCard.type === 'vehicle' ? (
                        <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <WarehouseIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      )}
                      <div>
                        <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {pendingEntityCard.title}
                        </div>
                        {pendingEntityCard.subtitle && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            {pendingEntityCard.subtitle}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setPendingEntityCard(null)}
                        className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* @ Bahsetme Autocomplete Menüsü */}
              {mentionQuery !== null && mentionCandidates.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-xl max-h-40 overflow-y-auto custom-scroll text-xs shrink-0 p-1 divide-y divide-slate-100 dark:divide-slate-700/60">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Kullanıcı Bahset (@)</span>
                    <span>Yön tuşları veya tıkla</span>
                  </div>
                  {mentionCandidates.map((candidate, idx) => (
                    <button
                      key={candidate.id}
                      type="button"
                      onClick={() => handleSelectMention(candidate.name)}
                      className={`w-full px-2.5 py-1.5 text-left flex items-center justify-between rounded-lg transition cursor-pointer text-xs ${
                        idx === selectedMentionIdx
                          ? 'bg-blue-600 text-white font-bold'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <AtSign className="w-3.5 h-3.5 opacity-70" />
                        <span>{candidate.name}</span>
                      </div>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                          idx === selectedMentionIdx
                            ? 'bg-blue-700 text-blue-100'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
                        }`}
                      >
                        {candidate.role}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Hızlı Araç / Şablon / Emoji Seçici Panelleri */}
              {activePopover === 'emoji' && (
                <div className="p-2.5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1.5 shrink-0">
                  {EMOJI_PALETTE.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => {
                        setText((prev) => `${prev}${em}`);
                        inputRef.current?.focus();
                      }}
                      className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-base flex items-center justify-center cursor-pointer transition"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              {activePopover === 'templates' && (
                <div className="p-2.5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-1.5 max-h-44 overflow-y-auto custom-scroll shrink-0">
                  <div className="text-[10px] font-bold uppercase text-slate-400 px-1">
                    Hazır Saha Mesaj Şablonları
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {QUICK_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => {
                          setText((prev) => (prev ? `${prev} ${tpl}` : tpl));
                          setActivePopover('none');
                          inputRef.current?.focus();
                        }}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-[11px] font-medium text-slate-700 dark:text-slate-200 cursor-pointer transition"
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activePopover === 'entity' && (
                <div className="p-2.5 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-2 max-h-56 overflow-y-auto custom-scroll shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEntityTab('vehicle')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          entityTab === 'vehicle'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Aktif Araçlar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntityTab('ramp')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                          entityTab === 'ramp'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        Rampalar
                      </button>
                    </div>

                    <input
                      type="text"
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      placeholder="Ara..."
                      className="flex-1 max-w-[180px] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {entityTab === 'vehicle' &&
                      selectableVehicles.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setPendingEntityCard({
                              type: 'vehicle',
                              id: v.id,
                              title: v.dorsePlaka,
                              subtitle: v.musteri,
                              status: v.durum,
                              extra: v.cekiciPlaka ? `Çekici: ${v.cekiciPlaka}` : v.islemTuru
                            });
                            setActivePopover('none');
                            inputRef.current?.focus();
                          }}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {v.dorsePlaka}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {v.musteri}
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-200 shrink-0">
                            {v.durum}
                          </span>
                        </button>
                      ))}

                    {entityTab === 'ramp' &&
                      selectableRamps.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setPendingEntityCard({
                              type: 'ramp',
                              id: r.id,
                              title: r.ad,
                              subtitle: getWarehouseShort(r.depoId),
                              status: r.durum,
                              extra: r.arizaNotu || undefined
                            });
                            setActivePopover('none');
                            inputRef.current?.focus();
                          }}
                          className="p-2 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/50 border border-slate-200 dark:border-slate-700 text-left flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                              {r.ad}
                            </div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {getWarehouseShort(r.depoId)}
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-200 shrink-0">
                            {r.durum}
                          </span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {/* Alt Çok Satırlı Yazım ve Araç Çubuğu */}
              <form
                onSubmit={handleSubmit}
                className="p-2.5 sm:p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />

                <div className="flex items-center justify-between gap-1 text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isCompressingImage || !!editingMessage}
                      className="px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      title="Fotoğraf / Ekran Görüntüsü Ekle"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span className="hidden sm:inline">{isCompressingImage ? 'Hazırlanıyor...' : 'Fotoğraf'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePopover((p) => (p === 'entity' ? 'none' : 'entity'))}
                      disabled={!!editingMessage}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-40 ${
                        activePopover === 'entity'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Aktif Araç veya Rampa Kartı Paylaş"
                    >
                      <Truck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="hidden sm:inline">Araç / Rampa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePopover((p) => (p === 'templates' ? 'none' : 'templates'))}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer ${
                        activePopover === 'templates'
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Hazır Saha Şablonu"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span className="hidden sm:inline">Şablon</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActivePopover((p) => (p === 'emoji' ? 'none' : 'emoji'))}
                      className={`p-1.5 rounded-lg cursor-pointer ${
                        activePopover === 'emoji'
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                      title="Emoji Ekle"
                    >
                      <Smile className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setText((prev) => prev + (prev.endsWith(' ') || prev === '' ? '@' : ' @'));
                        setMentionQuery('');
                        setMentionStartIndex(text.length + (text.endsWith(' ') || text === '' ? 0 : 1));
                        inputRef.current?.focus();
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      title="Kişiden Bahset (@)"
                    >
                      <AtSign className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="hidden sm:inline text-[10px] text-slate-400">
                    Enter: Gönder • Shift+Enter: Satır
                  </span>
                </div>

                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={text}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      editingMessage
                        ? 'Mesajınızı düzenleyin (Esc ile iptal)...'
                        : `${activeChannelMeta.title} kanalına yazın (@ ile bahset)...`
                    }
                    className={`flex-1 border rounded-xl px-3.5 py-2 text-base sm:text-sm outline-none focus:ring-2 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none max-h-[110px] ${
                      editingMessage
                        ? 'border-amber-400 dark:border-amber-600 focus:ring-amber-500'
                        : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'
                    }`}
                  />

                  <button
                    type="submit"
                    disabled={!text.trim() && !pendingImageUrl && !pendingEntityCard}
                    className={`min-h-[40px] px-4 py-2 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition cursor-pointer flex items-center justify-center shrink-0 ${
                      editingMessage
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                    title={editingMessage ? 'Değişikliği Kaydet' : 'Gönder'}
                  >
                    {editingMessage ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Fotoğraf Tam Ekran Önizleme (Lightbox) */}
      {lightboxImageUrl && (
        <div
          onClick={() => setLightboxImageUrl(null)}
          className="fixed inset-0 z-[80] bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxImageUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxImageUrl}
            alt="Büyütülmüş görsel"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[88dvh] rounded-2xl shadow-2xl object-contain"
          />
        </div>
      )}

      {/* Sabit Sohbet Tetikleyici Butonu */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-12 h-14 md:w-14 md:h-16 rounded-2xl shadow-2xl flex flex-col items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer relative ${
          isOpen
            ? 'bg-slate-800 hover:bg-slate-900 text-white ring-2 ring-blue-400'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        title={isOpen ? 'Sohbeti Kapat' : 'Saha & Güvenlik Sohbeti'}
      >
        {isOpen ? (
          <>
            <X className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[8px] md:text-[9px] font-bold mt-0.5">Kapat</span>
          </>
        ) : (
          <>
            <MessageSquare className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-[8px] md:text-[9px] font-bold mt-0.5">Sohbet</span>
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[10px] min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 shadow-lg animate-bounce border-2 border-white tabular-nums">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};
