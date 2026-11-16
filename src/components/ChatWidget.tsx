import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChatMessage,
  ChatReply,
  ChatEntityCard,
  ChatPresence,
  ChatGroup,
  User,
  Vehicle,
  Ramp,
  Warehouse,
  DEFAULT_CHAT_QUICK_MESSAGES
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
  ChevronRight,
  ChevronUp,
  ChevronDown,
  MoreHorizontal,
  SquarePen,
  UserPlus,
  ArrowLeft,
  SlidersHorizontal,
  LogOut,
  AlertCircle,
  Clock,
  Plus,
  RotateCcw
} from 'lucide-react';
import { playChime } from '../utils/audio';
import { sendNativeNotification, loadPushSettings } from '../utils/notifications';
import { useVisualViewport } from '../hooks/useVisualViewport';

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
  chatGroups?: ChatGroup[];
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
  onMarkMessagesAsRead?: (messageIds: number[]) => void;
  onUpdatePresence?: (typingInChannel: string | null) => void;
  onCreateGroup?: (payload: { name: string; description?: string; members: string[] }) => ChatGroup | undefined | void;
  onApproveGroup?: (groupId: string) => void;
  onRejectGroup?: (groupId: string, reason?: string) => void;
  onApproveGroupMember?: (groupId: string, username: string) => void;
  onRejectGroupMember?: (groupId: string, username: string) => void;
  onUpdateGroupMembers?: (groupId: string, members: string[]) => void;
  onUpdateGroup?: (groupId: string, updates: { name: string; description?: string; members: string[]; cancelPendingUsernames?: string[] }) => void;
  onLeaveGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  quickMessages?: string[];
  onSaveQuickMessages?: (messages: string[]) => void;
  onNavigateToVehicle?: (vehicle: Vehicle) => void;
  onNavigateToRamp?: (ramp: Ramp) => void;
}

const QUICK_REACTIONS = ['👏', '👍', '✅', '🚨', '👀'];
const EMOJI_PALETTE = ['👏', '👍', '✅', '🚨', '⚠️', '🚛', '📦', '🏭', '⏱️', '📞', '🙏', '👌', '🔥', '👀', '📌', '💬'];

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
  return msgDate.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
}

function getRoleLabel(role?: string): string {
  if (role === 'admin') return 'Admin';
  if (role === 'security') return 'Güvenlik';
  if (role === 'guest') return 'Misafir';
  return 'Personel';
}

function getAvatarTone(role?: string): string {
  if (role === 'admin') return 'bg-indigo-600 text-white';
  if (role === 'security') return 'bg-amber-600 text-white';
  return 'bg-blue-600 text-white';
}

function getInitials(name?: string): string {
  const clean = (name || 'U').trim();
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const PRESENCE_ONLINE_TTL_MS = 75_000;

function isPresenceOnline(presence: ChatPresence | undefined, now: number): boolean {
  if (!presence) return false;
  if (presence.isOnline === false) return false;
  return now - presence.lastActiveAt <= PRESENCE_ONLINE_TTL_MS;
}

function formatLastSeen(lastActiveAt: number | undefined, now: number): string {
  if (!lastActiveAt) return 'Hiç giriş yapmadı';
  const diffMs = Math.max(0, now - lastActiveAt);
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'Son görülme az önce';
  if (diffMin < 60) return `Son görülme ${diffMin} dk önce`;

  const d = new Date(lastActiveAt);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(d, today)) return `Son görülme bugün ${timeStr}`;
  if (sameDay(d, yesterday)) return `Son görülme dün ${timeStr}`;
  return `Son görülme ${d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })} ${timeStr}`;
}

interface ConversationWindowProps {
  channelId: string;
  isMinimized: boolean;
  isMaximized: boolean;
  isMobileView?: boolean;
  isKeyboardOpen?: boolean;
  currentUser: User;
  users: User[];
  vehicles: Vehicle[];
  ramps: Ramp[];
  warehouses: Warehouse[];
  chatGroups: ChatGroup[];
  chatPresences: ChatPresence[];
  visibleMessages: ChatMessage[];
  onlineUsernamesSet: Set<string>;
  isMuted: boolean;
  now: number;
  onToggleMute: () => void;
  onToggleMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  onBackMobile?: () => void;
  onOpenManageGroup: (group: ChatGroup) => void;
  onOpenCreateGroup: (preselectedMembers?: string[]) => void;
  onApproveGroup?: (groupId: string) => void;
  onRejectGroup?: (groupId: string, reason?: string) => void;
  onLeaveGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  quickMessages: string[];
  onOpenEditQuickMessages?: () => void;
  onSendMessage: (payload: ChatSendPayload) => void;
  onEditMessage?: (id: number, newText: string) => void;
  onDeleteMessage?: (id: number) => void;
  onToggleReaction?: (id: number, emoji: string) => void;
  onTogglePinMessage?: (id: number) => void;
  onMarkMessagesAsRead?: (messageIds: number[]) => void;
  onUpdatePresence?: (typingInChannel: string | null) => void;
  onNavigateToVehicle?: (vehicle: Vehicle) => void;
  onNavigateToRamp?: (ramp: Ramp) => void;
  onOpenLightbox: (url: string) => void;
}

const ChatConversationWindow: React.FC<ConversationWindowProps> = ({
  channelId,
  isMinimized,
  isMaximized,
  isMobileView = false,
  isKeyboardOpen = false,
  currentUser,
  users,
  vehicles,
  ramps,
  warehouses,
  chatGroups,
  chatPresences,
  visibleMessages,
  onlineUsernamesSet,
  isMuted,
  now,
  onToggleMute,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  onBackMobile,
  onOpenManageGroup,
  onOpenCreateGroup,
  onApproveGroup,
  onRejectGroup,
  onLeaveGroup,
  onDeleteGroup,
  quickMessages,
  onOpenEditQuickMessages,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  onTogglePinMessage,
  onMarkMessagesAsRead,
  onUpdatePresence,
  onNavigateToVehicle,
  onNavigateToRamp,
  onOpenLightbox
}) => {
  const myUsername = currentUser.username;
  const myUsernameLower = myUsername.trim().toLowerCase();

  // Composer State
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null);
  const [pendingEntityCard, setPendingEntityCard] = useState<ChatEntityCard | null>(null);
  const [isCompressingImage, setIsCompressingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Popovers & Filters
  const [activePopover, setActivePopover] = useState<'none' | 'emoji' | 'templates' | 'entity'>('none');
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [entityTab, setEntityTab] = useState<'vehicle' | 'ramp'>('vehicle');
  const [entitySearch, setEntitySearch] = useState('');
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [onlyMentionsFilter, setOnlyMentionsFilter] = useState(false);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<number | null>(null);
  const [activeReadById, setActiveReadById] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [mobileActionMsgId, setMobileActionMsgId] = useState<number | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState<number>(0);

  // Unread divider state
  const [initialUnreadId, setInitialUnreadId] = useState<number | null>(null);
  const [initialUnreadCount, setInitialUnreadCount] = useState<number>(0);
  const [initialUnreadTime, setInitialUnreadTime] = useState<string>('');
  const markAsReadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const channelMessages = useMemo(
    () => visibleMessages.filter((m) => (m.channelId || '') === channelId),
    [visibleMessages, channelId]
  );

  const unreadMessages = useMemo(() => {
    return channelMessages.filter((m) => {
      if (m.sender.trim().toLowerCase() === myUsernameLower) return false;
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.some((u) => u.trim().toLowerCase() === myUsernameLower);
    });
  }, [channelMessages, myUsernameLower]);

  const unreadMessagesKey = useMemo(
    () => unreadMessages.map((m) => m.id).join(','),
    [unreadMessages]
  );

  const displayedMessages = useMemo(() => {
    const q = chatSearchQuery.trim().toLowerCase();
    return channelMessages.filter((m) => {
      if (onlyMentionsFilter) {
        const lowerText = (m.text || '').toLowerCase();
        const mentioned =
          (myUsernameLower && lowerText.includes(`@${myUsernameLower}`)) ||
          lowerText.includes('@herkes') ||
          lowerText.includes('@tum_ekip');
        if (!mentioned) return false;
      }
      if (!q) return true;
      return (
        (m.text || '').toLowerCase().includes(q) ||
        m.sender.toLowerCase().includes(q) ||
        (m.entityCard?.title && m.entityCard.title.toLowerCase().includes(q)) ||
        (m.entityCard?.subtitle && m.entityCard.subtitle.toLowerCase().includes(q))
      );
    });
  }, [channelMessages, chatSearchQuery, onlyMentionsFilter, myUsernameLower]);

  const pinnedMessages = useMemo(() => channelMessages.filter((m) => m.isPinned), [channelMessages]);

  const typingUsers = useMemo(() => {
    return chatPresences
      .filter((p) => {
        const key = p.username.trim().toLowerCase();
        return (
          key !== myUsernameLower &&
          onlineUsernamesSet.has(key) &&
          p.typingInChannel === channelId &&
          Boolean(p.typingAt && now - p.typingAt <= 6_000)
        );
      })
      .map((p) => p.username);
  }, [chatPresences, channelId, now, myUsernameLower, onlineUsernamesSet]);

  const meta = useMemo(() => {
    if (channelId.startsWith('grp_')) {
      const grp = chatGroups.find((g) => g.id === channelId);
      return {
        kind: 'group' as const,
        title: grp?.name || 'Özel Grup',
        subtitle: grp ? `${grp.members.length} Üye${grp.description ? ` • ${grp.description}` : ''}` : 'Özel Ekip Grubu',
        recipient: null as string | null,
        role: undefined as string | undefined,
        isOnline: true,
        group: grp
      };
    }
    const targetUser = users.find((u) => getDmChannelId(myUsername, u.username) === channelId);
    const partnerName =
      targetUser?.username ||
      channelId
        .split('__')
        .slice(1)
        .find((n) => n !== myUsernameLower) ||
      'Özel Mesaj';
    const partnerLower = partnerName.trim().toLowerCase();
    const targetPresence = chatPresences.find((p) => p.username.trim().toLowerCase() === partnerLower);
    const isOnline = onlineUsernamesSet.has(partnerLower);
    const statusLabel = isOnline ? 'Çevrimiçi' : formatLastSeen(targetPresence?.lastActiveAt, now);
    return {
      kind: 'dm' as const,
      title: partnerName,
      subtitle: targetUser ? `${getRoleLabel(targetUser.role)} · ${statusLabel}` : statusLabel,
      recipient: targetUser?.username || partnerName,
      role: targetUser?.role,
      isOnline,
      group: undefined as ChatGroup | undefined
    };
  }, [channelId, chatGroups, users, myUsername, myUsernameLower, onlineUsernamesSet, chatPresences, now]);

  // Reset composer, popovers, filters and typing state whenever active conversation changes
  useEffect(() => {
    setText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setPendingImageUrl(null);
    setPendingEntityCard(null);
    setImageError(null);
    setActivePopover('none');
    setShowHeaderMenu(false);
    setActiveReactionPickerId(null);
    setActiveReadById(null);
    setConfirmDeleteId(null);
    setMobileActionMsgId(null);
    setShowSearchBar(false);
    setChatSearchQuery('');
    setOnlyMentionsFilter(false);
    setMentionQuery(null);
    setMentionStartIndex(-1);
    if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    onUpdatePresence?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  useEffect(() => {
    return () => {
      if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current);
      if (typingClearTimerRef.current) clearTimeout(typingClearTimerRef.current);
    };
  }, []);

  // Mark messages as read & scroll on open / channel switch
  useEffect(() => {
    if (isMinimized) {
      if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current);
      return;
    }

    if (unreadMessages.length > 0) {
      const firstMsg = unreadMessages[0];
      setInitialUnreadId(firstMsg.id);
      setInitialUnreadCount(unreadMessages.length);
      setInitialUnreadTime(firstMsg.time || '');

      requestAnimationFrame(() => {
        if (!messagesContainerRef.current) return;
        const marker =
          document.getElementById(`unread-marker-${channelId}`) ||
          document.getElementById(`chat-msg-${channelId}-${firstMsg.id}`);
        if (marker) {
          messagesContainerRef.current.scrollTo({
            top: Math.max(0, marker.offsetTop - 16),
            behavior: 'smooth'
          });
        }
      });

      if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current);
      markAsReadTimerRef.current = setTimeout(() => {
        onMarkMessagesAsRead?.(unreadMessages.map((m) => m.id));
      }, 2200);
      return () => {
        if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current);
      };
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
  }, [channelId, isMinimized]);

  // Also mark incoming unread messages if window is open and active
  useEffect(() => {
    if (isMinimized || !unreadMessagesKey) return;
    const idsToMark = unreadMessages.map((m) => m.id);
    const t = setTimeout(() => {
      onMarkMessagesAsRead?.(idsToMark);
    }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadMessagesKey, isMinimized, channelId]);

  useEffect(() => {
    if (replyingTo) inputRef.current?.focus();
  }, [replyingTo]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(100, inputRef.current.scrollHeight)}px`;
    }
  }, [text]);

  const mentionCandidates = useMemo(() => {
    const list: { id: string; name: string; role: string }[] = [
      { id: 'herkes', name: 'herkes', role: 'Tüm Ekip' },
      { id: 'tum_ekip', name: 'tum_ekip', role: 'Genel Anons' }
    ];
    const seen = new Set<string>(['herkes', 'tum_ekip']);
    const nonGuestUsers = users.filter((u) => u.role !== 'guest');
    const pool =
      meta.kind === 'group' && meta.group
        ? nonGuestUsers.filter((u) => meta.group!.members.some((m) => m.toLowerCase() === u.username.toLowerCase()))
        : nonGuestUsers;

    pool.forEach((u) => {
      if (!seen.has(u.username.toLowerCase())) {
        seen.add(u.username.toLowerCase());
        list.push({ id: u.username, name: u.username, role: getRoleLabel(u.role) });
      }
    });

    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return list.filter((c) => c.name.toLowerCase().includes(q) || c.role.toLowerCase().includes(q));
  }, [users, mentionQuery, meta]);

  const handleTypingBroadcast = () => {
    if (!onUpdatePresence) return;
    const nowTs = Date.now();
    if (nowTs - lastTypingSentRef.current > 2400) {
      lastTypingSentRef.current = nowTs;
      onUpdatePresence(channelId);
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
    if (val.trim()) handleTypingBroadcast();

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
    setText(`${beforeAt}@${candidateName} ${afterCursor}`);
    setMentionQuery(null);
    setMentionStartIndex(-1);

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const pos = (beforeAt + `@${candidateName} `).length;
        inputRef.current.setSelectionRange(pos, pos);
      }
    }, 10);
  };

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith('image/')) {
      setImageError('Yalnızca resim dosyaları (JPG, PNG, WEBP) eklenebilir.');
      return;
    }
    setIsCompressingImage(true);
    try {
      let compressed = await compressImageFile(file, 800, 0.72);
      if (compressed.length > 480000) {
        compressed = await compressImageFile(file, 600, 0.52);
      }
      if (compressed.length > 520000) {
        setImageError('Görsel boyutu çok büyük olduğu için eklenemedi. Daha küçük bir fotoğraf seçin.');
        return;
      }
      setPendingImageUrl(compressed);
      setActivePopover('none');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Chat image compress failed:', err);
      setImageError('Fotoğraf işlenemedi. Lütfen farklı bir görsel deneyin.');
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSendInternal = () => {
    const trimmed = text.trim();
    if (editingMessage) {
      if (!trimmed && !editingMessage.imageUrl && !editingMessage.entityCard) return;
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
      channelId,
      recipient: meta.kind === 'dm' ? meta.recipient : null,
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && mentionCandidates.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIdx((p) => (p + 1) % mentionCandidates.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIdx((p) => (p - 1 + mentionCandidates.length) % mentionCandidates.length);
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
      setEditingMessage(null);
      setText('');
    }
  };

  const handleScrollToMessage = (messageId: number) => {
    const el = document.getElementById(`chat-msg-${channelId}-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  };

  const renderMessageContent = (msgText: string) => {
    if (!msgText) return null;
    const parts = msgText.split(/(@[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]+)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const isMe = myUsernameLower && username.toLowerCase() === myUsernameLower;
        const isAll = username.toLowerCase() === 'herkes' || username.toLowerCase() === 'tum_ekip';
        return (
          <span
            key={idx}
            className={`inline-flex items-center px-1.5 py-0.2 rounded font-bold text-[11px] mx-0.5 ${
              isMe
                ? 'bg-amber-300 text-amber-950 font-black'
                : isAll
                ? 'bg-purple-100 dark:bg-purple-900/70 text-purple-800 dark:text-purple-200'
                : 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
            }`}
          >
            @{username}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

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
      .slice(0, 16);
  }, [vehicles, entitySearch]);

  const selectableRamps = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    return ramps.filter((r) => !q || r.ad.toLowerCase().includes(q) || r.durum.toLowerCase().includes(q)).slice(0, 20);
  }, [ramps, entitySearch]);

  const getWarehouseShort = (depoId?: number) => {
    const wh = warehouses.find((w) => w.id === (depoId || 1));
    return wh ? wh.ad.split(' - ')[0] : `Depo ${depoId || 1}`;
  };

  // Minimized Docked Tab (Facebook / LinkedIn Desktop Bar)
  if (isMinimized && !isMobileView && !isMaximized) {
    return (
      <div className="pointer-events-auto w-60 h-12 bg-white dark:bg-slate-900 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-xl shadow-2xl px-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onToggleMinimize}
          className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
        >
          <div className="relative shrink-0">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                meta.kind === 'dm'
                  ? getAvatarTone(meta.role)
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {meta.kind === 'dm' ? (
                getInitials(meta.title)
              ) : (
                <UsersIcon className="w-3.5 h-3.5" />
              )}
            </div>
            {meta.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{meta.title}</div>
          </div>
          {unreadMessages.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black tabular-nums">
              {unreadMessages.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onClose}
          title="Sohbeti Kapat"
          className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
        isMaximized
          ? 'fixed inset-3 sm:inset-6 lg:inset-10 z-[60] max-w-4xl mx-auto rounded-2xl border'
          : isMobileView
          ? 'w-full h-full rounded-none border-0'
          : 'w-[360px] lg:w-[400px] h-[520px] max-h-[82dvh] rounded-t-xl border border-b-0'
      }`}
    >
      {/* ================= PENCERE BAŞLIĞI (LinkedIn / Facebook Tarzı) ================= */}
      <div
        className={`px-3 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 ${
          isMobileView ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isMobileView && onBackMobile && (
            <button
              type="button"
              onClick={onBackMobile}
              className="min-w-[36px] min-h-[36px] -ml-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
              title="Sohbet Listesine Dön"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}

          <div className="relative shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-2xs ${
                meta.kind === 'dm'
                  ? getAvatarTone(meta.role)
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {meta.kind === 'dm' ? (
                getInitials(meta.title)
              ) : (
                <UsersIcon className="w-4 h-4" />
              )}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                meta.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                {meta.title}
              </h4>
              {meta.kind === 'group' && meta.group && (
                <button
                  type="button"
                  onClick={() => onOpenManageGroup(meta.group!)}
                  className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 cursor-pointer shrink-0"
                  title="Üyeleri Gör & Kişi Ekle"
                >
                  {meta.group.members.length} kişi
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
              {typingUsers.length > 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold animate-pulse">
                  {typingUsers.join(', ')} yazıyor...
                </span>
              ) : (
                meta.subtitle
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 relative">
          {/* Gruba Kişi Ekle / Grup Oluştur Hızlı Butonu */}
          {meta.kind === 'group' && meta.group ? (
            <button
              type="button"
              onClick={() => onOpenManageGroup(meta.group!)}
              title="Gruba Kişi Ekle / Üyeleri Yönet"
              className="min-w-[36px] min-h-[36px] rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 flex items-center justify-center transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          ) : meta.kind === 'dm' && meta.recipient ? (
            <button
              type="button"
              onClick={() => onOpenCreateGroup([meta.recipient!])}
              title="Bu Kişiyle Yeni Grup Oluştur"
              className="min-w-[36px] min-h-[36px] rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setShowHeaderMenu((prev) => !prev)}
            title="Sohbet Seçenekleri"
            className={`min-w-[36px] min-h-[36px] rounded-full flex items-center justify-center transition cursor-pointer ${
              showHeaderMenu || showSearchBar || onlyMentionsFilter
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showHeaderMenu && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-9 z-40 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 text-xs text-slate-700 dark:text-slate-200"
            >
              <button
                type="button"
                onClick={() => {
                  setShowSearchBar((p) => !p);
                  setShowHeaderMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-slate-500" />
                <span>{showSearchBar ? 'Aramayı Gizle' : 'Mesajlarda Ara'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOnlyMentionsFilter((p) => !p);
                  setShowSearchBar(true);
                  setShowHeaderMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
              >
                <AtSign className="w-3.5 h-3.5 text-amber-500" />
                <span>{onlyMentionsFilter ? 'Tüm Mesajları Göster' : 'Sadece @Bahsetmeler'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onToggleMute();
                  setShowHeaderMenu(false);
                }}
                className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
              >
                {isMuted ? (
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>{isMuted ? 'Bildirim Sesini Aç' : 'Sohbeti Sessize Al'}</span>
              </button>

              {meta.kind === 'group' && meta.group && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenManageGroup(meta.group!);
                    setShowHeaderMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Grubu & Üyeleri Düzenle</span>
                </button>
              )}

              {meta.kind === 'group' &&
                meta.group &&
                onLeaveGroup &&
                meta.group.createdBy.trim().toLowerCase() !== myUsernameLower && (
                  <button
                    type="button"
                    onClick={() => {
                      onLeaveGroup(meta.group!.id);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-amber-50 dark:hover:bg-amber-950/50 text-amber-700 dark:text-amber-300 flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Gruptan Ayrıl</span>
                  </button>
                )}

              {meta.kind === 'group' &&
                meta.group &&
                onDeleteGroup &&
                currentUser.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteGroup(meta.group!.id);
                      setShowHeaderMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center gap-2 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Grubu Kalıcı Sil (Admin)</span>
                  </button>
                )}
            </div>
          )}

          {!isMobileView && (
            <>
              <button
                type="button"
                onClick={onToggleMaximize}
                title={isMaximized ? 'Küçük Pencere' : 'Geniş Görünüm'}
                className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5 text-blue-600" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
              {!isMaximized && (
                <button
                  type="button"
                  onClick={onToggleMinimize}
                  title="Simge Durumuna Küçült"
                  className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          <button
            type="button"
            onClick={onClose}
            title="Pencereyi Kapat"
            className="min-w-[36px] min-h-[36px] rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Arama & @Mention Çubuğu */}
      {showSearchBar && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Mesaj, kişi veya plaka ara..."
              className="w-full pl-8 pr-7 py-1 text-xs rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
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
            onClick={() => setOnlyMentionsFilter((p) => !p)}
            className={`px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer border ${
              onlyMentionsFilter
                ? 'bg-amber-500 text-slate-950 border-amber-500'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
          >
            <AtSign className="w-3 h-3" />
            <span>@Bana</span>
          </button>
        </div>
      )}

      {/* Sabitlenmiş Mesajlar Bandı */}
      {pinnedMessages.length > 0 && (
        <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/70 flex items-center justify-between gap-2 shrink-0 text-[11px]">
          <button
            type="button"
            onClick={() => handleScrollToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
            className="flex items-center gap-1.5 min-w-0 text-left cursor-pointer flex-1"
            title="Sabitlenen mesaja git"
          >
            <Pin className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="truncate text-amber-950 dark:text-amber-200">
              <strong className="mr-1">Sabitli:</strong>
              {pinnedMessages[pinnedMessages.length - 1].text ||
                pinnedMessages[pinnedMessages.length - 1].entityCard?.title ||
                '📷 Görsel'}
            </span>
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
                <PinOff className="w-3 h-3" />
              </button>
            )}
        </div>
      )}

      {/* Onay Bekleyen Üye Ekleme Talepleri Bandı (Onaylı Gruplar) */}
      {meta.kind === 'group' &&
        meta.group &&
        (!meta.group.status || meta.group.status === 'approved') &&
        Array.isArray(meta.group.pendingMemberRequests) &&
        meta.group.pendingMemberRequests.length > 0 && (
          <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800/70 flex items-center justify-between gap-2 shrink-0 text-[11px] text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-1.5 min-w-0">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="truncate font-semibold">
                {meta.group.pendingMemberRequests.length} üye ekleme talebi Admin onayı bekliyor
              </span>
            </div>
            <button
              type="button"
              onClick={() => onOpenManageGroup(meta.group!)}
              className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] shrink-0 cursor-pointer"
            >
              {currentUser.role === 'admin' ? 'İncele / Onayla' : 'Gör'}
            </button>
          </div>
        )}

      {/* Okunmamış Mesaj Bandı */}
      {initialUnreadCount > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-900/60 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 text-[11px]">
          <span className="text-rose-800 dark:text-rose-200 font-bold truncate tabular-nums">
            {initialUnreadCount} okunmamış mesaj {initialUnreadTime ? `(${initialUnreadTime})` : ''}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                messagesContainerRef.current?.scrollTo({
                  top: messagesContainerRef.current.scrollHeight,
                  behavior: 'smooth'
                });
              }}
              className="px-2 py-0.5 bg-white dark:bg-slate-800 text-rose-700 dark:text-rose-300 font-bold text-[10px] rounded-full border border-rose-200 dark:border-rose-800 cursor-pointer flex items-center gap-0.5"
            >
              <ArrowDown className="w-2.5 h-2.5" /> Son
            </button>
            <button
              type="button"
              onClick={() => {
                if (unreadMessages.length > 0) {
                  onMarkMessagesAsRead?.(unreadMessages.map((m) => m.id));
                }
                setInitialUnreadCount(0);
                setInitialUnreadId(null);
              }}
              className="px-2 py-0.5 bg-rose-600 text-white font-bold text-[10px] rounded-full cursor-pointer flex items-center gap-0.5"
            >
              <CheckCheck className="w-2.5 h-2.5" /> Okundu
            </button>
          </div>
        </div>
      )}

      {/* ================= MESAJ AKIŞI (LinkedIn / Facebook Tarzı Temiz Satırlar) ================= */}
      <div
        ref={messagesContainerRef}
        onClick={() => {
          if (activeReactionPickerId !== null) setActiveReactionPickerId(null);
          if (activeReadById !== null) setActiveReadById(null);
          if (showHeaderMenu) setShowHeaderMenu(false);
          if (mobileActionMsgId !== null) setMobileActionMsgId(null);
        }}
        className="flex-1 px-2.5 py-3 overflow-y-auto space-y-1 custom-scroll bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100"
      >
        {displayedMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <MessageSquare className="w-6 h-6" />
            </div>
            <p className="font-bold text-slate-700 dark:text-slate-200">
              {chatSearchQuery || onlyMentionsFilter
                ? 'Eşleşen mesaj bulunamadı.'
                : `${meta.title} sohbetini başlatın`}
            </p>
            <p className="text-[11px] text-slate-400 max-w-[240px]">
              Fotoğraf, canlı araç/rampa kartı veya hazır operasyon şablonu gönderebilirsiniz.
            </p>
          </div>
        )}

        {displayedMessages.map((m, idx) => {
          const isMine = m.sender.trim().toLowerCase() === myUsernameLower;
          const isHighlighted = highlightedMessageId === m.id;
          const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
          const curDateLabel = getDateLabel(m.timestamp || m.id);
          const prevDateLabel = prevMsg ? getDateLabel(prevMsg.timestamp || prevMsg.id) : null;
          const showDateDivider = idx === 0 || curDateLabel !== prevDateLabel;
          const readByList = Array.isArray(m.readBy) ? m.readBy : [];
          const otherReaders = readByList.filter((u) => u.trim().toLowerCase() !== m.sender.trim().toLowerCase());
          const reactionEntries: Array<[string, string[]]> = m.reactions
            ? Object.entries(m.reactions).filter(
                (entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].length > 0
              )
            : [];
          const senderOnline = onlineUsernamesSet.has(m.sender.trim().toLowerCase());

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
                <div className="flex items-center gap-2 my-2 select-none">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {curDateLabel}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>
              )}

              {initialUnreadId === m.id && (
                <div id={`unread-marker-${channelId}`} className="flex items-center gap-2 my-2 select-none">
                  <div className="flex-1 h-[2px] bg-rose-400" />
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black">
                    Yeni ({initialUnreadCount})
                  </span>
                  <div className="flex-1 h-[2px] bg-rose-400" />
                </div>
              )}

              {/* LinkedIn / Facebook Mesaj Satırı (Mobilde dokunarak aksiyon menüsü) */}
              <div
                id={`chat-msg-${channelId}-${m.id}`}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;
                  e.stopPropagation();
                  setMobileActionMsgId((prev) => (prev === m.id ? null : m.id));
                }}
                className={`relative group rounded-xl px-2 py-2 transition ${
                  isHighlighted
                    ? 'bg-blue-50 dark:bg-blue-950/50 ring-1 ring-blue-500'
                    : mobileActionMsgId === m.id
                    ? 'bg-slate-100 dark:bg-slate-900 ring-1 ring-slate-300 dark:ring-slate-700'
                    : m.isPinned
                    ? 'bg-amber-50/70 dark:bg-amber-950/25 border border-amber-300/70 dark:border-amber-800/60'
                    : 'hover:bg-slate-100/80 dark:hover:bg-slate-900/90'
                }`}
              >
                {/* Hover & Touch Floating Reaction & Action Pill (LinkedIn / Messenger Style) */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute -top-3 right-2 z-20 ${
                    mobileActionMsgId === m.id ? 'flex' : 'hidden md:group-hover:flex'
                  } items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-1.5 py-0.5 shadow-lg`}
                >
                  {onToggleReaction &&
                    QUICK_REACTIONS.slice(0, 3).map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          onToggleReaction(m.id, em);
                          setMobileActionMsgId(null);
                        }}
                        className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-xs cursor-pointer transition"
                        title={`Tepki: ${em}`}
                      >
                        {em}
                      </button>
                    ))}

                  {onToggleReaction && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setActiveReactionPickerId((prev) => (prev === m.id ? null : m.id))}
                        className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer"
                        title="Diğer Tepkiler"
                      >
                        <SmilePlus className="w-3.5 h-3.5" />
                      </button>
                      {activeReactionPickerId === m.id && (
                        <div className="absolute right-0 top-7 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1 flex items-center gap-0.5">
                          {QUICK_REACTIONS.map((em) => (
                            <button
                              key={em}
                              type="button"
                              onClick={() => {
                                onToggleReaction(m.id, em);
                                setActiveReactionPickerId(null);
                                setMobileActionMsgId(null);
                              }}
                              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-sm cursor-pointer"
                            >
                              {em}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessage(null);
                      setReplyingTo(m);
                      setMobileActionMsgId(null);
                    }}
                    className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer"
                    title="Yanıtla"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5" />
                  </button>

                  {onTogglePinMessage && (isMine || currentUser.role === 'admin') && (
                    <button
                      type="button"
                      onClick={() => {
                        onTogglePinMessage(m.id);
                        setMobileActionMsgId(null);
                      }}
                      className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer"
                      title={m.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
                    >
                      {m.isPinned ? <PinOff className="w-3.5 h-3.5 text-amber-500" /> : <Pin className="w-3.5 h-3.5" />}
                    </button>
                  )}

                  {isMine && onEditMessage && (
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingTo(null);
                        setPendingImageUrl(null);
                        setPendingEntityCard(null);
                        setEditingMessage(m);
                        setText(m.text);
                        setMobileActionMsgId(null);
                        inputRef.current?.focus();
                      }}
                      className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 cursor-pointer"
                      title="Düzenle"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}

                  {isMine && onDeleteMessage && (
                    confirmDeleteId === m.id ? (
                      <div className="flex items-center gap-1 bg-red-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteMessage(m.id);
                            setConfirmDeleteId(null);
                            setMobileActionMsgId(null);
                          }}
                          className="cursor-pointer underline"
                        >
                          Sil
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmDeleteId(null);
                            setMobileActionMsgId(null);
                          }}
                          className="cursor-pointer opacity-80"
                        >
                          İptal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(m.id)}
                        className="w-6 h-6 rounded-full hover:bg-red-50 dark:hover:bg-red-950/60 flex items-center justify-center text-red-500 cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>

                {/* Satır İçeriği: Avatar + İsim & Mesaj */}
                <div className="flex items-start gap-2.5">
                  <div className="relative shrink-0 mt-0.5">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black ${getAvatarTone(
                        m.role
                      )}`}
                    >
                      {getInitials(m.sender)}
                    </div>
                    {senderOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    {/* Gönderen Başlığı */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className="font-bold text-slate-900 dark:text-white">{m.sender}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                        {getRoleLabel(m.role)}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">• {m.time}</span>
                      {m.isPinned && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.2 rounded bg-amber-200 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-bold">
                          <Pin className="w-2.5 h-2.5" /> Sabitli
                        </span>
                      )}
                    </div>

                    {/* Yanıt Alıntısı */}
                    {m.replyTo && (
                      <button
                        type="button"
                        onClick={() => handleScrollToMessage(m.replyTo!.id)}
                        className="w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 border-l-2 border-blue-500 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800 cursor-pointer transition"
                      >
                        <span className="font-bold text-blue-700 dark:text-blue-300">@{m.replyTo.sender}: </span>
                        <span className="italic truncate">{m.replyTo.text}</span>
                      </button>
                    )}

                    {/* Ekli Fotoğraf */}
                    {m.imageUrl && (
                      <button
                        type="button"
                        onClick={() => onOpenLightbox(m.imageUrl!)}
                        className="block rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-[240px] cursor-pointer hover:opacity-95 transition"
                        title="Fotoğrafı Büyüt"
                      >
                        <img src={m.imageUrl} alt="Sohbet fotoğrafı" className="w-full max-h-48 object-cover" />
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
                        className="w-full text-left p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                            {liveCard.type === 'vehicle' ? (
                              <Truck className="w-4 h-4" />
                            ) : (
                              <WarehouseIcon className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-mono font-black text-xs text-slate-900 dark:text-white truncate">
                              {liveCard.title}
                            </div>
                            {liveCard.subtitle && (
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                {liveCard.subtitle}
                              </div>
                            )}
                            {liveCard.extra && (
                              <div className="text-[9px] text-slate-400 truncate">{liveCard.extra}</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {liveCard.status && (
                            <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300">
                              {liveCard.status}
                            </span>
                          )}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      </button>
                    )}

                    {/* Mesaj Metni */}
                    {(m.text || m.isEdited) && (
                      <div className="text-[13px] text-slate-800 dark:text-slate-100 leading-relaxed whitespace-pre-wrap break-words">
                        {renderMessageContent(m.text)}
                        {m.isEdited && (
                          <span className="text-[10px] italic text-slate-400 ml-1.5">(düzenlendi)</span>
                        )}
                      </div>
                    )}

                    {/* Tepkiler & LinkedIn Tarzı Mini Okundu Avatarları */}
                    {(reactionEntries.length > 0 || otherReaders.length > 0) && (
                      <div className="flex items-center justify-between gap-2 pt-0.5 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap">
                          {reactionEntries.map(([emoji, usersArr]) => {
                            const reactedByMe = usersArr.some((u) => u.trim().toLowerCase() === myUsernameLower);
                            return (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onToggleReaction?.(m.id, emoji)}
                                title={usersArr.join(', ')}
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer tabular-nums border ${
                                  reactedByMe
                                    ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{usersArr.length}</span>
                              </button>
                            );
                          })}
                        </div>

                        {otherReaders.length > 0 && (
                          <div className="relative ml-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveReadById((prev) => (prev === m.id ? null : m.id));
                              }}
                              className="flex items-center gap-0.5 cursor-pointer"
                              title={`Okuyanlar: ${otherReaders.join(', ')}`}
                            >
                              {otherReaders.slice(0, 3).map((r) => (
                                <span
                                  key={r}
                                  className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[8px] font-black flex items-center justify-center border border-white dark:border-slate-950 -ml-1 first:ml-0"
                                >
                                  {getInitials(r)}
                                </span>
                              ))}
                              {otherReaders.length > 3 && (
                                <span className="text-[9px] font-bold text-slate-400 ml-0.5 tabular-nums">
                                  +{otherReaders.length - 3}
                                </span>
                              )}
                            </button>

                            {activeReadById === m.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute bottom-full right-0 mb-1 z-30 min-w-[160px] max-w-[220px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 text-[10px]"
                              >
                                <div className="font-extrabold text-slate-500 dark:text-slate-400 uppercase pb-1 mb-1 border-b border-slate-100 dark:border-slate-700">
                                  Görenler ({otherReaders.length})
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {otherReaders.map((reader) => (
                                    <span
                                      key={reader}
                                      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold text-slate-800 dark:text-slate-100"
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
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {imageError && (
        <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/60 border-t border-red-200 dark:border-red-800 flex items-center justify-between gap-2 text-[11px] text-red-700 dark:text-red-300 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate font-semibold">{imageError}</span>
          </div>
          <button
            type="button"
            onClick={() => setImageError(null)}
            className="p-0.5 hover:bg-red-100 dark:hover:bg-red-900/50 rounded cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Düzenleme / Cevaplama / Ek Önizlemeleri */}
      {editingMessage && (
        <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/50 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between text-xs text-amber-900 dark:text-amber-200 shrink-0">
          <span className="truncate font-semibold">Düzenleniyor: "{editingMessage.text.slice(0, 40)}"</span>
          <button
            type="button"
            onClick={() => {
              setEditingMessage(null);
              setText('');
            }}
            className="p-0.5 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {replyingTo && (
        <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 border-t border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 shrink-0">
          <div className="truncate flex items-center gap-1.5">
            <CornerUpLeft className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              <strong>@{replyingTo.sender}</strong>: "{(replyingTo.text || replyingTo.entityCard?.title || 'Fotoğraf').slice(0, 38)}"
            </span>
          </div>
          <button type="button" onClick={() => setReplyingTo(null)} className="p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {(pendingImageUrl || pendingEntityCard) && (
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2.5 flex-wrap shrink-0">
          {pendingImageUrl && (
            <div className="relative">
              <img src={pendingImageUrl} alt="Ek" className="h-12 w-12 object-cover rounded-lg border border-slate-300 dark:border-slate-600" />
              <button
                type="button"
                onClick={() => setPendingImageUrl(null)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
          {pendingEntityCard && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 text-xs">
              <span className="font-mono font-bold">{pendingEntityCard.title}</span>
              <button type="button" onClick={() => setPendingEntityCard(null)} className="text-slate-400 hover:text-red-500 cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* @Mention Autocomplete */}
      {mentionQuery !== null && mentionCandidates.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 max-h-36 overflow-y-auto custom-scroll p-1 shrink-0">
          {mentionCandidates.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectMention(c.name)}
              className={`w-full px-2.5 py-1.5 rounded-lg text-left flex items-center justify-between text-xs cursor-pointer ${
                idx === selectedMentionIdx ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>@{c.name}</span>
              <span className="text-[10px] opacity-75">{c.role}</span>
            </button>
          ))}
        </div>
      )}

      {/* Alt Popoverlar (Emoji / Şablon / Araç-Rampa) */}
      {activePopover === 'emoji' && (
        <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex flex-wrap gap-1 shrink-0">
          {EMOJI_PALETTE.map((em) => (
            <button
              key={em}
              type="button"
              onClick={() => {
                setText((p) => `${p}${em}`);
                inputRef.current?.focus();
              }}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center text-base cursor-pointer"
            >
              {em}
            </button>
          ))}
        </div>
      )}

      {activePopover === 'templates' && (
        <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-1.5 max-h-44 overflow-y-auto custom-scroll shrink-0">
          <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-100 dark:border-slate-700">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              <span>Hızlı Mesajlar ({quickMessages.length})</span>
            </span>
            {currentUser.role === 'admin' && onOpenEditQuickMessages && (
              <button
                type="button"
                onClick={() => {
                  setActivePopover('none');
                  onOpenEditQuickMessages();
                }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-[10px] font-bold cursor-pointer"
              >
                <Edit2 className="w-2.5 h-2.5" />
                <span>Düzenle</span>
              </button>
            )}
          </div>
          {quickMessages.length === 0 ? (
            <div className="py-3 text-center text-[11px] text-slate-400 space-y-1.5">
              <p>Henüz hızlı mesaj tanımlanmamış.</p>
              {currentUser.role === 'admin' && onOpenEditQuickMessages && (
                <button
                  type="button"
                  onClick={() => {
                    setActivePopover('none');
                    onOpenEditQuickMessages();
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Hızlı Mesaj Ekle</span>
                </button>
              )}
            </div>
          ) : (
            quickMessages.map((tpl, idx) => (
              <button
                key={`${idx}-${tpl}`}
                type="button"
                onClick={() => {
                  setText((p) => (p ? `${p} ${tpl}` : tpl));
                  setActivePopover('none');
                  inputRef.current?.focus();
                }}
                className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer"
              >
                {tpl}
              </button>
            ))
          )}
        </div>
      )}

      {activePopover === 'entity' && (
        <div className="p-2 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 space-y-2 max-h-48 overflow-y-auto custom-scroll shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setEntityTab('vehicle')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                entityTab === 'vehicle' ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              Araçlar
            </button>
            <button
              type="button"
              onClick={() => setEntityTab('ramp')}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${
                entityTab === 'ramp' ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300'
              }`}
            >
              Rampalar
            </button>
            <input
              type="text"
              value={entitySearch}
              onChange={(e) => setEntitySearch(e.target.value)}
              placeholder="Plaka / rampa..."
              className="flex-1 px-2 py-0.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-1">
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
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-xs truncate">{v.dorsePlaka}</div>
                    <div className="text-[10px] text-slate-500 truncate">{v.musteri}</div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-200">
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
                  className="p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/50 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-xs truncate">{r.ad}</div>
                    <div className="text-[10px] text-slate-500 truncate">{getWarehouseShort(r.depoId)}</div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-200">
                    {r.durum}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* ================= MESAJ YAZMA ALANI (LinkedIn / Facebook Tarzı) ================= */}
      {meta.kind === 'group' && meta.group && (meta.group.status === 'pending' || meta.group.status === 'rejected') ? (
        <div className="p-3 bg-amber-50/90 dark:bg-amber-950/35 border-t border-amber-200 dark:border-amber-800/70 space-y-2 shrink-0 text-xs">
          {meta.group.status === 'pending' ? (
            <>
              <div className="flex items-start gap-2 text-amber-900 dark:text-amber-200">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Admin Onayı Bekleniyor</p>
                  <p className="text-[11px] opacity-90">
                    {currentUser.role === 'admin'
                      ? 'Bu grup talebi onayınızı bekliyor. Onaylandığında seçilen tüm üyelere açılacaktır.'
                      : 'Grubunuz Admin onayına gönderildi. Onaylanana kadar diğer üyelere görünmez ve mesaj gönderilemez.'}
                  </p>
                </div>
              </div>
              {currentUser.role === 'admin' && (
                <div className="flex items-center gap-2">
                  {onApproveGroup && (
                    <button
                      type="button"
                      onClick={() => onApproveGroup(meta.group!.id)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Grubu Onayla</span>
                    </button>
                  )}
                  {onRejectGroup && (
                    <button
                      type="button"
                      onClick={() => onRejectGroup(meta.group!.id)}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Reddet</span>
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 text-red-800 dark:text-red-200">
              <div className="min-w-0">
                <p className="font-bold">Grup Talebi Reddedildi</p>
                {meta.group.rejectedReason && (
                  <p className="text-[11px] opacity-90 truncate">{meta.group.rejectedReason}</p>
                )}
              </div>
              {onDeleteGroup &&
                (currentUser.role === 'admin' ||
                  meta.group.createdBy.trim().toLowerCase() === myUsernameLower) && (
                <button
                  type="button"
                  onClick={() => onDeleteGroup(meta.group!.id)}
                  className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-[11px] shrink-0 cursor-pointer"
                >
                  Kaldır
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendInternal();
        }}
        className={`${
          isMobileView && !isKeyboardOpen
            ? 'p-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]'
            : 'p-2.5'
        } bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-2 shrink-0`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageFileSelect}
          className="hidden"
        />

        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2 border border-transparent focus-within:border-blue-500 transition">
          <textarea
            ref={inputRef}
            rows={2}
            value={text}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMessage
                ? 'Mesajı düzenleyin (Esc iptal)...'
                : 'Bir mesaj yazın...'
            }
            className="w-full bg-transparent text-xs sm:text-[13px] text-slate-800 dark:text-slate-100 placeholder-slate-500 dark:placeholder-slate-400 outline-none resize-none max-h-[100px]"
          />
        </div>

        {/* Alt Araç Çubuğu + Gönder Butonu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressingImage || !!editingMessage}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-blue-600 cursor-pointer disabled:opacity-40"
              title="Fotoğraf Ekle"
            >
              <ImageIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActivePopover((p) => (p === 'entity' ? 'none' : 'entity'))}
              disabled={!!editingMessage}
              className={`p-1.5 rounded-full cursor-pointer disabled:opacity-40 ${
                activePopover === 'entity'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-600'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-600'
              }`}
              title="Araç / Rampa Kartı Ekle"
            >
              <Truck className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActivePopover((p) => (p === 'templates' ? 'none' : 'templates'))}
              className={`p-1.5 rounded-full cursor-pointer ${
                activePopover === 'templates'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-600'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-amber-500'
              }`}
              title="Hazır Saha Şablonları"
            >
              <Zap className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setActivePopover((p) => (p === 'emoji' ? 'none' : 'emoji'))}
              className={`p-1.5 rounded-full cursor-pointer ${
                activePopover === 'emoji'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setText((prev) => prev + (prev.endsWith(' ') || prev === '' ? '@' : ' @'));
                setMentionQuery('');
                setMentionStartIndex(text.length + (text.endsWith(' ') || text === '' ? 0 : 1));
                inputRef.current?.focus();
              }}
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              title="Kişiden Bahset (@)"
            >
              <AtSign className="w-4 h-4" />
            </button>
          </div>

          <button
            type="submit"
            disabled={
              editingMessage
                ? !text.trim() && !editingMessage.imageUrl && !editingMessage.entityCard
                : !text.trim() && !pendingImageUrl && !pendingEntityCard
            }
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${
              editingMessage
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
            }`}
          >
            {editingMessage ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Kaydet</span>
              </>
            ) : (
              <span>Gönder</span>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  );
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  chatMessages,
  chatPresences = [],
  chatGroups = [],
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
  onMarkMessagesAsRead,
  onUpdatePresence,
  onCreateGroup,
  onApproveGroup,
  onRejectGroup,
  onApproveGroupMember,
  onRejectGroupMember,
  onUpdateGroupMembers,
  onUpdateGroup,
  onLeaveGroup,
  onDeleteGroup,
  quickMessages = DEFAULT_CHAT_QUICK_MESSAGES,
  onSaveQuickMessages,
  onNavigateToVehicle,
  onNavigateToRamp
}) => {
  const { isKeyboardOpen } = useVisualViewport();

  // Desktop Docked Drawer + Open Windows
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'groups' | 'people'>('groups');
  const [drawerSearch, setDrawerSearch] = useState('');
  const [onlyUnreadDrawer, setOnlyUnreadDrawer] = useState(false);
  const [showDrawerMenu, setShowDrawerMenu] = useState(false);

  // Open conversation windows (max 2 side-by-side on desktop; mobile shows active window)
  const [openWindows, setOpenWindows] = useState<Array<{ id: string; minimized: boolean }>>([]);
  const [maximizedChannelId, setMaximizedChannelId] = useState<string | null>(null);
  const [mobileScreen, setMobileScreen] = useState<'closed' | 'list' | 'chat'>('closed');
  const [mobileActiveChannelId, setMobileActiveChannelId] = useState<string | null>(null);

  // Group Modals
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [groupUserSearch, setGroupUserSearch] = useState('');
  const [rejectingGroupId, setRejectingGroupId] = useState<string | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  const [managingGroupId, setManagingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [editMembersDraft, setEditMembersDraft] = useState<string[]>([]);
  const [cancelPendingDraft, setCancelPendingDraft] = useState<string[]>([]);
  const [manageUserSearch, setManageUserSearch] = useState('');

  // Quick Messages Editor Modal (Admin)
  const [showQuickMessagesModal, setShowQuickMessagesModal] = useState(false);
  const [quickMessagesDraft, setQuickMessagesDraft] = useState<string[]>([]);
  const [newQuickMsgInput, setNewQuickMsgInput] = useState('');

  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('yms_chat_muted') === '1';
    } catch {
      return false;
    }
  });
  const [now, setNow] = useState<number>(() => Date.now());
  const prevVisibleCountRef = useRef(0);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOpenChat = () => {
      setIsDrawerOpen(true);
      setMobileScreen('list');
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
        // ignore
      }
      return next;
    });
  };

  // Presence map & real-time online users set (evaluated strictly by system presence)
  const presenceByUsernameMap = useMemo(() => {
    const map = new Map<string, ChatPresence>();
    chatPresences.forEach((p) => {
      const key = p.username.trim().toLowerCase();
      const existing = map.get(key);
      if (!existing || p.lastActiveAt >= existing.lastActiveAt) {
        map.set(key, p);
      }
    });
    return map;
  }, [chatPresences]);

  const onlineUsernamesSet = useMemo(() => {
    const set = new Set<string>();
    presenceByUsernameMap.forEach((p, key) => {
      if (isPresenceOnline(p, now)) {
        set.add(key);
      }
    });
    return set;
  }, [presenceByUsernameMap, now]);

  const isSelfOnline = useMemo(() => {
    const selfP = presenceByUsernameMap.get(myUsernameLower);
    if (!selfP) return typeof document !== 'undefined' ? document.visibilityState !== 'hidden' : true;
    return isPresenceOnline(selfP, now);
  }, [presenceByUsernameMap, myUsernameLower, now]);

  const isAdminUser = currentUser?.role === 'admin';

  // Approved groups visible to current user (legacy groups without status count as approved)
  const myGroups = useMemo(() => {
    if (!currentUser || currentUser.role === 'guest') return [];
    return chatGroups.filter(
      (g) =>
        (!g.status || g.status === 'approved') &&
        (g.createdBy.trim().toLowerCase() === myUsernameLower ||
          g.members.some((u) => u.trim().toLowerCase() === myUsernameLower))
    );
  }, [chatGroups, currentUser, myUsernameLower]);

  // Admin approval queue for new groups (only visible to admins)
  const pendingAdminGroups = useMemo(() => {
    if (!isAdminUser) return [];
    return chatGroups
      .filter((g) => g.status === 'pending')
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [chatGroups, isAdminUser]);

  // Admin approval queue for adding new members to existing groups
  const pendingMemberAdminRequests = useMemo(() => {
    if (!isAdminUser) return [];
    return chatGroups
      .filter((g) => g.status !== 'rejected' && g.status !== 'archived' && Array.isArray(g.pendingMemberRequests) && g.pendingMemberRequests.length > 0)
      .flatMap((g) => (g.pendingMemberRequests || []).map((req) => ({ group: g, req })))
      .sort((a, b) => (b.req.requestedAt || 0) - (a.req.requestedAt || 0));
  }, [chatGroups, isAdminUser]);

  const totalAdminPendingCount = pendingAdminGroups.length + pendingMemberAdminRequests.length;

  // Requester's own pending or rejected group requests (only visible to creator)
  const myPendingOrRejectedGroups = useMemo(() => {
    if (!currentUser || currentUser.role === 'guest' || isAdminUser) return [];
    return chatGroups
      .filter(
        (g) =>
          (g.status === 'pending' || g.status === 'rejected') &&
          g.createdBy.trim().toLowerCase() === myUsernameLower
      )
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [chatGroups, currentUser, isAdminUser, myUsernameLower]);

  // Close open/maximized windows if a custom group is deleted or user is removed (or non-group/non-DM)
  useEffect(() => {
    const validGroupIds = new Set([
      ...myGroups.map((g) => g.id),
      ...pendingAdminGroups.map((g) => g.id),
      ...myPendingOrRejectedGroups.map((g) => g.id)
    ]);
    setOpenWindows((prev) => {
      const next = prev.filter((w) => {
        if (w.id.startsWith('grp_')) return validGroupIds.has(w.id);
        return w.id.startsWith('dm__');
      });
      return next.length === prev.length ? prev : next;
    });
    if (maximizedChannelId && maximizedChannelId.startsWith('grp_') && !validGroupIds.has(maximizedChannelId)) {
      setMaximizedChannelId(null);
    }
    if (
      mobileActiveChannelId &&
      ((mobileActiveChannelId.startsWith('grp_') && !validGroupIds.has(mobileActiveChannelId)) ||
        (!mobileActiveChannelId.startsWith('grp_') && !mobileActiveChannelId.startsWith('dm__')))
    ) {
      setMobileActiveChannelId(null);
      setMobileScreen('list');
    }
  }, [myGroups, pendingAdminGroups, myPendingOrRejectedGroups, maximizedChannelId, mobileActiveChannelId]);

  // Visible messages (own DMs + own groups only; legacy department channels hidden)
  const visibleMessages = useMemo(() => {
    if (!currentUser || currentUser.role === 'guest') return [];
    const myGroupIds = new Set(myGroups.map((g) => g.id));
    return chatMessages.filter((m) => {
      const ch = m.channelId || '';
      if (ch.startsWith('dm__')) {
        const participants = ch.split('__').slice(1);
        return (
          m.sender.trim().toLowerCase() === myUsernameLower ||
          (m.recipient && m.recipient.trim().toLowerCase() === myUsernameLower) ||
          participants.includes(myUsernameLower)
        );
      }
      if (ch.startsWith('grp_')) {
        return myGroupIds.has(ch);
      }
      return false;
    });
  }, [chatMessages, currentUser, myUsernameLower, myGroups]);

  // Incoming notification audio & Web Push
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

  const totalUnreadCount = useMemo(() => {
    if (!currentUser || currentUser.role === 'guest') return 0;
    return visibleMessages.filter((m) => {
      if (m.sender.trim().toLowerCase() === myUsernameLower) return false;
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.some((u) => u.trim().toLowerCase() === myUsernameLower);
    }).length;
  }, [visibleMessages, currentUser, myUsernameLower]);

  const getChannelStats = (chId: string) => {
    const msgs = visibleMessages.filter((m) => (m.channelId || '') === chId);
    const last = msgs[msgs.length - 1];
    const unread = msgs.filter((m) => {
      if (m.sender.trim().toLowerCase() === myUsernameLower) return false;
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.some((u) => u.trim().toLowerCase() === myUsernameLower);
    }).length;
    return { last, unread, count: msgs.length };
  };

  // Custom Groups list (with active typing status)
  const customGroupItems = useMemo(() => {
    const q = drawerSearch.trim().toLowerCase();
    return myGroups
      .map((grp) => {
        const stats = getChannelStats(grp.id);
        const typingMember = chatPresences.find((p) => {
          const pKey = p.username.trim().toLowerCase();
          return (
            pKey !== myUsernameLower &&
            onlineUsernamesSet.has(pKey) &&
            p.typingInChannel === grp.id &&
            Boolean(p.typingAt && now - p.typingAt <= 6_000)
          );
        });
        const subtitle = typingMember
          ? `${typingMember.username} yazıyor...`
          : stats.last
          ? `${stats.last.sender}: ${stats.last.text || (stats.last.imageUrl ? '📷 Fotoğraf' : '📌 Kart')}`
          : `${grp.members.length} üye${grp.description ? ` · ${grp.description}` : ' · Özel Grup'}`;
        return {
          id: grp.id,
          title: grp.name,
          subtitle,
          isTyping: Boolean(typingMember),
          last: stats.last,
          unread: stats.unread,
          sortTs: stats.last?.timestamp || stats.last?.id || grp.createdAt || 0,
          group: grp
        };
      })
      .filter((item) => {
        if (onlyUnreadDrawer && item.unread === 0) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          (item.group.description || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (a.unread !== b.unread && (a.unread > 0 || b.unread > 0)) {
          return b.unread - a.unread;
        }
        return b.sortTs - a.sortTs;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myGroups, visibleMessages, drawerSearch, onlyUnreadDrawer, myUsernameLower, chatPresences, onlineUsernamesSet, now]);

  const allDmPeople = useMemo(() => {
    return users
      .filter((u) => u.username.trim().toLowerCase() !== myUsernameLower && u.role !== 'guest')
      .map((u) => {
        const key = u.username.trim().toLowerCase();
        const dmId = getDmChannelId(myUsername, u.username);
        const stats = getChannelStats(dmId);
        const presence = presenceByUsernameMap.get(key);
        const isOnline = isPresenceOnline(presence, now);
        const isTyping = Boolean(
          presence &&
            isOnline &&
            presence.typingInChannel === dmId &&
            presence.typingAt &&
            now - presence.typingAt <= 6_000
        );
        const lastSeenText = isOnline ? 'Çevrimiçi' : formatLastSeen(presence?.lastActiveAt, now);
        const lastMsgText = isTyping
          ? 'Yazıyor...'
          : stats.last
          ? `${stats.last.sender === myUsername ? 'Sen' : stats.last.sender}: ${
              stats.last.text || (stats.last.imageUrl ? '📷 Fotoğraf' : '📌 Kart')
            }`
          : null;
        return {
          user: u,
          dmId,
          isOnline,
          isTyping,
          lastActiveAt: presence?.lastActiveAt || 0,
          lastSeenText,
          lastMsgText,
          last: stats.last,
          unread: stats.unread,
          sortTs: stats.last?.timestamp || stats.last?.id || 0
        };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, myUsername, myUsernameLower, presenceByUsernameMap, now, visibleMessages]);

  const filteredDmPeople = useMemo(() => {
    const q = drawerSearch.trim().toLowerCase();
    return allDmPeople.filter((p) => {
      if (onlyUnreadDrawer && p.unread === 0) return false;
      if (!q) return true;
      return (
        p.user.username.toLowerCase().includes(q) ||
        getRoleLabel(p.user.role).toLowerCase().includes(q) ||
        (p.lastMsgText && p.lastMsgText.toLowerCase().includes(q))
      );
    });
  }, [allDmPeople, drawerSearch, onlyUnreadDrawer]);

  const onlineDmPeople = useMemo(() => {
    return filteredDmPeople
      .filter((p) => p.isOnline)
      .sort((a, b) => {
        if (a.unread !== b.unread && (a.unread > 0 || b.unread > 0)) return b.unread - a.unread;
        if (a.sortTs !== b.sortTs) return b.sortTs - a.sortTs;
        return a.user.username.localeCompare(b.user.username, 'tr');
      });
  }, [filteredDmPeople]);

  const offlineDmPeople = useMemo(() => {
    return filteredDmPeople
      .filter((p) => !p.isOnline)
      .sort((a, b) => {
        if (a.unread !== b.unread && (a.unread > 0 || b.unread > 0)) return b.unread - a.unread;
        if (a.lastActiveAt !== b.lastActiveAt) return b.lastActiveAt - a.lastActiveAt;
        if (a.sortTs !== b.sortTs) return b.sortTs - a.sortTs;
        return a.user.username.localeCompare(b.user.username, 'tr');
      });
  }, [filteredDmPeople]);

  const totalOnlineOthersCount = useMemo(
    () => allDmPeople.filter((p) => p.isOnline).length,
    [allDmPeople]
  );

  const groupsTabUnread = useMemo(() => {
    return myGroups.reduce((acc, grp) => acc + getChannelStats(grp.id).unread, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleMessages, myGroups, myUsernameLower]);

  const peopleTabUnread = useMemo(
    () => allDmPeople.reduce((acc, p) => acc + p.unread, 0),
    [allDmPeople]
  );

  const openConversation = (chId: string) => {
    setMobileActiveChannelId(chId);
    setMobileScreen('chat');
    setOpenWindows((prev) => {
      const exists = prev.find((w) => w.id === chId);
      if (exists) {
        return prev.map((w) => (w.id === chId ? { ...w, minimized: false } : w));
      }
      const next = [...prev, { id: chId, minimized: false }];
      // Desktop max 2 docked windows side-by-side (keep newest 2)
      return next.slice(-2);
    });
  };

  const openCreateGroupDialog = (preselectedMembers: string[] = []) => {
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupMembers(preselectedMembers);
    setGroupUserSearch('');
    setShowCreateGroupModal(true);
  };

  const openManageGroupDialog = (grp: ChatGroup) => {
    setManagingGroupId(grp.id);
    setEditGroupName(grp.name);
    setEditGroupDesc(grp.description || '');
    setEditMembersDraft(grp.members);
    setCancelPendingDraft([]);
    setManageUserSearch('');
  };

  const openQuickMessagesEditor = () => {
    setQuickMessagesDraft([...quickMessages]);
    setNewQuickMsgInput('');
    setShowQuickMessagesModal(true);
  };

  const managingGroup = useMemo(
    () => chatGroups.find((g) => g.id === managingGroupId) || null,
    [chatGroups, managingGroupId]
  );

  const handleSubmitCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !onCreateGroup) return;
    const created = onCreateGroup({
      name: newGroupName.trim(),
      description: newGroupDesc.trim() || undefined,
      members: newGroupMembers
    });
    setShowCreateGroupModal(false);
    setDrawerTab('groups');
    if (created && created.id && (!created.status || created.status === 'approved')) {
      openConversation(created.id);
    }
  };

  const handleSaveGroupDetails = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!managingGroup) return;
    const cleanName = editGroupName.trim() || managingGroup.name;
    if (onUpdateGroup) {
      onUpdateGroup(managingGroup.id, {
        name: cleanName,
        description: editGroupDesc.trim() || undefined,
        members: editMembersDraft,
        cancelPendingUsernames: cancelPendingDraft
      });
    } else if (onUpdateGroupMembers) {
      onUpdateGroupMembers(managingGroup.id, editMembersDraft);
    }
    setManagingGroupId(null);
  };

  if (!currentUser || currentUser.role === 'guest') return null;

  return (
    <>
      {/* ========================================================================
          MASAÜSTÜ: LINKEDIN & FACEBOOK TARZI ALT SAĞA SABİT MESAJLAŞMA BARI + PENCERELERİ
         ======================================================================== */}
      <div className="hidden md:flex fixed bottom-0 right-4 z-40 items-end gap-3 pointer-events-none chat-widget">
        {/* Açık Sohbet Pencereleri (Sağ Çekmecenin Solunda Yan Yana En Fazla 2 Pencere) */}
        {openWindows.map((win) => (
          <ChatConversationWindow
            key={win.id}
            channelId={win.id}
            isMinimized={win.minimized}
            isMaximized={maximizedChannelId === win.id}
            currentUser={currentUser}
            users={users}
            vehicles={vehicles}
            ramps={ramps}
            warehouses={warehouses}
            chatGroups={chatGroups}
            chatPresences={chatPresences}
            visibleMessages={visibleMessages}
            onlineUsernamesSet={onlineUsernamesSet}
            isMuted={isMuted}
            now={now}
            onToggleMute={toggleMute}
            onToggleMinimize={() =>
              setOpenWindows((prev) =>
                prev.map((w) => (w.id === win.id ? { ...w, minimized: !w.minimized } : w))
              )
            }
            onToggleMaximize={() =>
              setMaximizedChannelId((prev) => (prev === win.id ? null : win.id))
            }
            onClose={() => {
              if (maximizedChannelId === win.id) setMaximizedChannelId(null);
              setOpenWindows((prev) => prev.filter((w) => w.id !== win.id));
            }}
            onOpenManageGroup={openManageGroupDialog}
            onOpenCreateGroup={openCreateGroupDialog}
            onApproveGroup={onApproveGroup}
            onRejectGroup={onRejectGroup}
            onLeaveGroup={onLeaveGroup}
            onDeleteGroup={onDeleteGroup}
            quickMessages={quickMessages}
            onOpenEditQuickMessages={isAdminUser && onSaveQuickMessages ? openQuickMessagesEditor : undefined}
            onSendMessage={onSendMessage}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onToggleReaction={onToggleReaction}
            onTogglePinMessage={onTogglePinMessage}
            onMarkMessagesAsRead={onMarkMessagesAsRead}
            onUpdatePresence={onUpdatePresence}
            onNavigateToVehicle={onNavigateToVehicle}
            onNavigateToRamp={onNavigateToRamp}
            onOpenLightbox={(url) => setLightboxImageUrl(url)}
          />
        ))}

        {/* Sağ Sabit "Mesajlaşma" Çekmecesi (LinkedIn Tarzı) */}
        <div
          className={`pointer-events-auto w-[310px] bg-white dark:bg-slate-900 border border-b-0 border-slate-200 dark:border-slate-700 rounded-t-xl shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
            isDrawerOpen ? 'h-[520px] max-h-[82dvh]' : 'h-12'
          }`}
        >
          {/* Çekmece Üst Barı */}
          <div className="h-12 px-3 flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 relative">
            <button
              type="button"
              onClick={() => setIsDrawerOpen((p) => !p)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
            >
              <div className="relative shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${getAvatarTone(currentUser.role)}`}>
                  {getInitials(currentUser.username)}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isSelfOnline ? 'bg-emerald-600' : 'bg-slate-400'}`} />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-bold text-sm text-slate-900 dark:text-white truncate">Mesajlaşma</span>
                {totalUnreadCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white text-[10px] font-black tabular-nums">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </span>
                )}
              </div>
            </button>

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDrawerMenu((p) => !p);
                }}
                title="Mesajlaşma Ayarları"
                className="p-1.5 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {onCreateGroup && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateGroupDialog([]);
                  }}
                  title="Yeni Grup Oluştur"
                  className="p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsDrawerOpen((p) => !p)}
                title={isDrawerOpen ? 'Küçült' : 'Mesajlaşmayı Aç'}
                className="p-1.5 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                {isDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {showDrawerMenu && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-2 bottom-12 z-50 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-1 text-xs text-slate-700 dark:text-slate-200"
              >
                <button
                  type="button"
                  onClick={() => {
                    toggleMute();
                    setShowDrawerMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                >
                  {isMuted ? <Volume2 className="w-3.5 h-3.5 text-emerald-500" /> : <VolumeX className="w-3.5 h-3.5 text-amber-500" />}
                  <span>{isMuted ? 'Bildirim Sesini Aç' : 'Bildirimleri Sessize Al'}</span>
                </button>
                {onCreateGroup && (
                  <button
                    type="button"
                    onClick={() => {
                      openCreateGroupDialog([]);
                      setShowDrawerMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                    <span>Yeni Grup Oluştur</span>
                  </button>
                )}
                {isAdminUser && onSaveQuickMessages && (
                  <button
                    type="button"
                    onClick={() => {
                      openQuickMessagesEditor();
                      setShowDrawerMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Hızlı Mesajları Düzenle</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Çekmece Açık İçeriği */}
          {isDrawerOpen && (
            <>
              {/* Arama Çubuğu */}
              <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <div className="relative flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={drawerSearch}
                      onChange={(e) => setDrawerSearch(e.target.value)}
                      placeholder={drawerTab === 'groups' ? 'Grup ara...' : 'Kişi veya mesaj ara...'}
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyUnreadDrawer((p) => !p)}
                    title={onlyUnreadDrawer ? 'Tümünü Göster' : 'Sadece Okunmamışlar'}
                    className={`p-1.5 rounded-lg border cursor-pointer transition ${
                      onlyUnreadDrawer
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-transparent hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2 Ayrı Sekme: Gruplar / Kişiler */}
              <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setDrawerTab('groups')}
                  className={`py-2 px-2 flex items-center justify-center gap-1.5 cursor-pointer transition border-b-2 whitespace-nowrap ${
                    drawerTab === 'groups'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Gruplar</span>
                  {groupsTabUnread > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums">
                      {groupsTabUnread}
                    </span>
                  ) : isAdminUser && totalAdminPendingCount > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tabular-nums" title="Onay bekleyen grup ve üye ekleme talebi">
                      {totalAdminPendingCount}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab('people')}
                  className={`py-2 px-2 flex items-center justify-center gap-1.5 cursor-pointer transition border-b-2 whitespace-nowrap ${
                    drawerTab === 'people'
                      ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <span>Kişiler</span>
                  {peopleTabUnread > 0 ? (
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums">
                      {peopleTabUnread}
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                      ({totalOnlineOthersCount})
                    </span>
                  )}
                </button>
              </div>

              {/* Liste Alanı */}
              <div className="flex-1 overflow-y-auto custom-scroll">
                {drawerTab === 'groups' ? (
                  <div className="p-2.5 space-y-3">
                    {/* Admin Onay Kuyruğu: Yeni Gruplar & Üye Ekleme (Masaüstü Çekmece) */}
                    {isAdminUser && totalAdminPendingCount > 0 && (
                      <div className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/30 p-2 space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>Onay Bekleyenler ({totalAdminPendingCount})</span>
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {pendingAdminGroups.map((pg) => (
                            <div key={pg.id} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => openConversation(pg.id)}
                                  className="min-w-0 text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{pg.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
                                      Yeni Grup
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    Talep: <strong>{pg.createdBy}</strong> · {pg.members.length} üye
                                  </div>
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {onApproveGroup && (
                                  <button
                                    type="button"
                                    onClick={() => onApproveGroup(pg.id)}
                                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Onayla</span>
                                  </button>
                                )}
                                {onRejectGroup && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRejectingGroupId((prev) => (prev === pg.id ? null : pg.id));
                                      setRejectReasonInput('');
                                    }}
                                    className="flex-1 py-1 px-2 rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reddet</span>
                                  </button>
                                )}
                              </div>
                              {rejectingGroupId === pg.id && onRejectGroup && (
                                <div className="flex items-center gap-1 pt-1">
                                  <input
                                    type="text"
                                    maxLength={200}
                                    value={rejectReasonInput}
                                    onChange={(e) => setRejectReasonInput(e.target.value)}
                                    placeholder="Red nedeni..."
                                    className="flex-1 px-2 py-1 text-[10px] rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onRejectGroup(pg.id, rejectReasonInput);
                                      setRejectingGroupId(null);
                                      setRejectReasonInput('');
                                    }}
                                    className="px-2 py-1 rounded bg-red-600 text-white text-[10px] font-bold cursor-pointer"
                                  >
                                    Gönder
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}

                          {pendingMemberAdminRequests.map(({ group, req }) => (
                            <div key={`${group.id}__${req.username}`} className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/60 space-y-1.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{req.username}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200 shrink-0">
                                    Üye Ekleme
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                  Grup: <strong>{group.name}</strong> · Talep: {req.requestedBy}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {onApproveGroupMember && (
                                  <button
                                    type="button"
                                    onClick={() => onApproveGroupMember(group.id, req.username)}
                                    className="flex-1 py-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Üyeyi Onayla</span>
                                  </button>
                                )}
                                {onRejectGroupMember && (
                                  <button
                                    type="button"
                                    onClick={() => onRejectGroupMember(group.id, req.username)}
                                    className="flex-1 py-1 px-2 rounded-lg bg-red-50 dark:bg-red-950/60 hover:bg-red-100 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reddet</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Talebi Açan Kişi İçin Bekleyen / Reddedilen Gruplar */}
                    {!isAdminUser && myPendingOrRejectedGroups.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                          Grup Taleplerim ({myPendingOrRejectedGroups.length})
                        </div>
                        {myPendingOrRejectedGroups.map((pg) => (
                          <div
                            key={pg.id}
                            className={`p-2 rounded-xl border flex items-center justify-between gap-2 ${
                              pg.status === 'rejected'
                                ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/70'
                                : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => openConversation(pg.id)}
                              className="min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{pg.name}</span>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                    pg.status === 'rejected'
                                      ? 'bg-red-100 dark:bg-red-900/70 text-red-700 dark:text-red-200'
                                      : 'bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200'
                                  }`}
                                >
                                  {pg.status === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor'}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                {pg.status === 'rejected'
                                  ? pg.rejectedReason || 'Admin tarafından reddedildi.'
                                  : `Admin onayı bekleniyor · ${pg.members.length} üye`}
                              </p>
                            </button>
                            {onDeleteGroup && (pg.status === 'pending' || pg.status === 'rejected') && (
                              <button
                                type="button"
                                onClick={() => onDeleteGroup(pg.id)}
                                title="Talebi İptal Et / Kaldır"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Özel Gruplar */}
                    <div>
                      <div className="px-1 pb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Sohbet Grupları ({customGroupItems.length})
                        </span>
                        {onCreateGroup && (
                          <button
                            type="button"
                            onClick={() => openCreateGroupDialog([])}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold cursor-pointer transition"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Yeni Grup</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-1">
                        {customGroupItems.map((item) => {
                          const isOpenNow = openWindows.some((w) => w.id === item.id && !w.minimized);
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between gap-1 p-1.5 rounded-xl transition ${
                                isOpenNow
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/35 ring-1 ring-emerald-500/30'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => openConversation(item.id)}
                                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <UsersIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className={`text-xs truncate ${item.unread > 0 ? 'font-black text-slate-950 dark:text-white' : 'font-bold text-slate-900 dark:text-white'}`}>
                                      {item.title}
                                    </span>
                                    {item.last && (
                                      <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                                        {item.last.time}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                    <span
                                      className={`text-[11px] truncate ${
                                        item.isTyping
                                          ? 'font-bold text-emerald-600 dark:text-emerald-400 animate-pulse'
                                          : item.unread > 0
                                          ? 'font-semibold text-slate-800 dark:text-slate-200'
                                          : 'text-slate-500 dark:text-slate-400'
                                      }`}
                                    >
                                      {item.subtitle}
                                    </span>
                                    {item.unread > 0 && (
                                      <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums shrink-0">
                                        {item.unread}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => openManageGroupDialog(item.group)}
                                title="Grubu Düzenle / Kişi Ekle"
                                className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 cursor-pointer shrink-0"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                        {customGroupItems.length === 0 && (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
                            <p className="text-[11px] text-slate-400">
                              {drawerSearch || onlyUnreadDrawer
                                ? 'Filtreye uygun grup bulunamadı.'
                                : 'Henüz dahil olduğunuz sohbet grubu yok.'}
                            </p>
                            {onCreateGroup && !drawerSearch && !onlyUnreadDrawer && (
                              <button
                                type="button"
                                onClick={() => openCreateGroupDialog([])}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold cursor-pointer transition"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>İlk Ekip Grubunu Oluştur</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 space-y-3.5">
                    {/* Çevrimiçi Kişiler */}
                    <div>
                      <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Çevrimiçi ({onlineDmPeople.length})</span>
                        </span>
                      </div>
                      <div className="space-y-1">
                        {onlineDmPeople.map((p) => {
                          const isOpenNow = openWindows.some((w) => w.id === p.dmId && !w.minimized);
                          return (
                            <button
                              key={p.user.username}
                              type="button"
                              onClick={() => openConversation(p.dmId)}
                              className={`w-full px-2 py-2 rounded-xl flex items-center gap-2.5 text-left cursor-pointer transition ${
                                isOpenNow
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/35 ring-1 ring-emerald-500/30'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <div className="relative shrink-0">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black ${getAvatarTone(p.user.role)}`}>
                                  {getInitials(p.user.username)}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs truncate ${p.unread > 0 ? 'font-black text-slate-950 dark:text-white' : 'font-bold text-slate-900 dark:text-white'}`}>
                                    {p.user.username}
                                  </span>
                                  {p.last ? (
                                    <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">{p.last.time}</span>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">Çevrimiçi</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                  <span
                                    className={`text-[11px] truncate ${
                                      p.isTyping
                                        ? 'font-bold text-emerald-600 dark:text-emerald-400 animate-pulse'
                                        : p.unread > 0
                                        ? 'font-semibold text-slate-800 dark:text-slate-200'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {p.lastMsgText || `${getRoleLabel(p.user.role)} · Sistemde aktif`}
                                  </span>
                                  {p.unread > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums shrink-0">
                                      {p.unread}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                        {onlineDmPeople.length === 0 && (
                          <p className="text-[11px] text-slate-400 px-1">Şu an başka çevrimiçi kullanıcı yok.</p>
                        )}
                      </div>
                    </div>

                    {/* Çevrimdışı Kişiler */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>Çevrimdışı ({offlineDmPeople.length})</span>
                        </span>
                      </div>
                      <div className="space-y-1">
                        {offlineDmPeople.map((p) => {
                          const isOpenNow = openWindows.some((w) => w.id === p.dmId && !w.minimized);
                          return (
                            <button
                              key={p.user.username}
                              type="button"
                              onClick={() => openConversation(p.dmId)}
                              className={`w-full px-2 py-2 rounded-xl flex items-center gap-2.5 text-left cursor-pointer transition ${
                                isOpenNow
                                  ? 'bg-emerald-50/80 dark:bg-emerald-950/35 ring-1 ring-emerald-500/30'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                              }`}
                            >
                              <div className="relative shrink-0 opacity-80">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black ${getAvatarTone(p.user.role)}`}>
                                  {getInitials(p.user.username)}
                                </div>
                                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-slate-400" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`text-xs truncate ${p.unread > 0 ? 'font-black text-slate-950 dark:text-white' : 'font-bold text-slate-800 dark:text-slate-200'}`}>
                                    {p.user.username}
                                  </span>
                                  {p.last && (
                                    <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">{p.last.time}</span>
                                  )}
                                </div>
                                <div className="flex items-center justify-between gap-1.5 mt-0.5">
                                  <span className="text-[11px] truncate text-slate-500 dark:text-slate-400">
                                    {p.lastMsgText || `${getRoleLabel(p.user.role)} · ${p.lastSeenText}`}
                                  </span>
                                  {p.unread > 0 && (
                                    <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums shrink-0">
                                      {p.unread}
                                    </span>
                                  )}
                                </div>
                                {p.lastMsgText && (
                                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.lastSeenText}</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                        {offlineDmPeople.length === 0 && (
                          <p className="text-[11px] text-slate-400 px-1">
                            {drawerSearch || onlyUnreadDrawer ? 'Filtreye uygun çevrimdışı kişi yok.' : 'Çevrimdışı kullanıcı bulunmuyor.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================
          MOBİL: YALNIZCA SİMGE OLARAK YÜZEN MESAJLAŞMA BUTONU + TAM EKRAN LİSTE / SOHBET
         ======================================================================== */}
      <div className="md:hidden chat-widget">
        {mobileScreen === 'closed' ? (
          <button
            type="button"
            onClick={() => setMobileScreen('list')}
            aria-label="Mesajlaşma"
            title="Mesajlaşma"
            className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-3 z-40 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl border border-blue-400/40 flex items-center justify-center cursor-pointer active:scale-95 transition"
          >
            <MessageSquare className="w-5 h-5" />
            <span
              className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                isSelfOnline ? 'bg-emerald-400' : 'bg-slate-400'
              }`}
            />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-black tabular-nums flex items-center justify-center shadow">
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </span>
            )}
          </button>
        ) : (
          <div className="fixed inset-x-0 top-[var(--vv-top,0px)] h-[var(--vvh,100dvh)] z-[65]">
            {mobileScreen === 'list' ? (
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-none border-0 shadow-2xl flex flex-col overflow-hidden">
                <div className="px-3.5 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${getAvatarTone(currentUser.role)}`}>
                        {getInitials(currentUser.username)}
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${isSelfOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">Mesajlaşma</h4>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                        {totalOnlineOthersCount} kişi çevrimiçi
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {isAdminUser && onSaveQuickMessages && (
                      <button
                        type="button"
                        onClick={openQuickMessagesEditor}
                        title="Hızlı Mesajları Düzenle"
                        className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                      </button>
                    )}
                    {onCreateGroup && (
                      <button
                        type="button"
                        onClick={() => openCreateGroupDialog([])}
                        className="px-2.5 py-1.5 min-h-[36px] rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Grup Kur</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMobileScreen('closed')}
                      className="min-w-[36px] min-h-[36px] rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Arama ve Okunmamış Filtresi (Mobil) */}
                <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                    <input
                      type="text"
                      value={drawerSearch}
                      onChange={(e) => setDrawerSearch(e.target.value)}
                      placeholder={drawerTab === 'groups' ? 'Grup ara...' : 'Kişi veya mesaj ara...'}
                      className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setOnlyUnreadDrawer((p) => !p)}
                    title={onlyUnreadDrawer ? 'Tümünü Göster' : 'Sadece Okunmamışlar'}
                    className={`p-2 rounded-xl border cursor-pointer transition ${
                      onlyUnreadDrawer
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-transparent'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* 2 Ayrı Sekme: Gruplar / Kişiler (Mobil) */}
                <div className="grid grid-cols-2 border-b border-slate-200 dark:border-slate-800 text-xs font-bold shrink-0">
                  <button
                    type="button"
                    onClick={() => setDrawerTab('groups')}
                    className={`py-2.5 px-2 flex items-center justify-center gap-1.5 cursor-pointer transition border-b-2 whitespace-nowrap ${
                      drawerTab === 'groups'
                        ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>Gruplar</span>
                    {groupsTabUnread > 0 ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums">
                        {groupsTabUnread}
                      </span>
                    ) : isAdminUser && totalAdminPendingCount > 0 ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black tabular-nums">
                        {totalAdminPendingCount}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDrawerTab('people')}
                    className={`py-2.5 px-2 flex items-center justify-center gap-1.5 cursor-pointer transition border-b-2 whitespace-nowrap ${
                      drawerTab === 'people'
                        ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <span>Kişiler</span>
                    {peopleTabUnread > 0 ? (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums">
                        {peopleTabUnread}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ({totalOnlineOthersCount})
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
                  {drawerTab === 'groups' ? (
                    <div className="p-2.5 space-y-3">
                      {/* Admin Onay Kuyruğu: Yeni Gruplar & Üye Ekleme (Mobil) */}
                      {isAdminUser && totalAdminPendingCount > 0 && (
                        <div className="rounded-xl border border-amber-300 dark:border-amber-700/80 bg-amber-50/70 dark:bg-amber-950/30 p-2.5 space-y-2">
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Onay Bekleyenler ({totalAdminPendingCount})</span>
                          </div>
                          <div className="space-y-2">
                            {pendingAdminGroups.map((pg) => (
                              <div key={pg.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/60 space-y-2">
                                <button
                                  type="button"
                                  onClick={() => openConversation(pg.id)}
                                  className="w-full text-left cursor-pointer"
                                >
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{pg.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
                                      Yeni Grup
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Talep: <strong>{pg.createdBy}</strong> · {pg.members.length} üye
                                  </div>
                                </button>
                                <div className="flex items-center gap-2">
                                  {onApproveGroup && (
                                    <button
                                      type="button"
                                      onClick={() => onApproveGroup(pg.id)}
                                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Onayla</span>
                                    </button>
                                  )}
                                  {onRejectGroup && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRejectingGroupId((prev) => (prev === pg.id ? null : pg.id));
                                        setRejectReasonInput('');
                                      }}
                                      className="flex-1 py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Reddet</span>
                                    </button>
                                  )}
                                </div>
                                {rejectingGroupId === pg.id && onRejectGroup && (
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <input
                                      type="text"
                                      maxLength={200}
                                      value={rejectReasonInput}
                                      onChange={(e) => setRejectReasonInput(e.target.value)}
                                      placeholder="Red nedeni..."
                                      className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onRejectGroup(pg.id, rejectReasonInput);
                                        setRejectingGroupId(null);
                                        setRejectReasonInput('');
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
                                    >
                                      Gönder
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}

                            {pendingMemberAdminRequests.map(({ group, req }) => (
                              <div key={`${group.id}__${req.username}`} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/60 space-y-2">
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{req.username}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-200 shrink-0">
                                      Üye Ekleme
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Grup: <strong>{group.name}</strong> · Talep: {req.requestedBy}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {onApproveGroupMember && (
                                    <button
                                      type="button"
                                      onClick={() => onApproveGroupMember(group.id, req.username)}
                                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Üyeyi Onayla</span>
                                    </button>
                                  )}
                                  {onRejectGroupMember && (
                                    <button
                                      type="button"
                                      onClick={() => onRejectGroupMember(group.id, req.username)}
                                      className="flex-1 py-2 px-3 rounded-xl bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Reddet</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Kurucu İçin Bekleyen / Reddedilen Grup Talepleri (Mobil) */}
                      {!isAdminUser && myPendingOrRejectedGroups.length > 0 && (
                        <div className="space-y-1.5">
                          <div className="px-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Grup Taleplerim ({myPendingOrRejectedGroups.length})
                          </div>
                          {myPendingOrRejectedGroups.map((pg) => (
                            <div
                              key={pg.id}
                              className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                                pg.status === 'rejected'
                                  ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-800/70'
                                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/70'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => openConversation(pg.id)}
                                className="min-w-0 flex-1 text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-slate-900 dark:text-white truncate">{pg.name}</span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                      pg.status === 'rejected'
                                        ? 'bg-red-100 dark:bg-red-900/70 text-red-700 dark:text-red-200'
                                        : 'bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-200'
                                    }`}
                                  >
                                    {pg.status === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor'}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                  {pg.status === 'rejected'
                                    ? pg.rejectedReason || 'Admin tarafından reddedildi.'
                                    : `Admin onayı bekleniyor · ${pg.members.length} üye`}
                                </p>
                              </button>
                              {onDeleteGroup && (pg.status === 'pending' || pg.status === 'rejected') && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteGroup(pg.id)}
                                  title="Talebi Kaldır"
                                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Sohbet Grupları ({customGroupItems.length})
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {customGroupItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between gap-2 px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <button
                                type="button"
                                onClick={() => openConversation(item.id)}
                                className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer"
                              >
                                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                                  <UsersIcon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</span>
                                    {item.last && <span className="text-[10px] text-slate-400 font-mono tabular-nums">{item.last.time}</span>}
                                  </div>
                                  <div
                                    className={`text-[11px] truncate mt-0.5 ${
                                      item.isTyping
                                        ? 'font-bold text-emerald-600 dark:text-emerald-400 animate-pulse'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {item.subtitle}
                                  </div>
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() => openManageGroupDialog(item.group)}
                                className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 cursor-pointer shrink-0"
                                title="Grubu & Üyeleri Yönet"
                              >
                                <UserPlus className="w-4 h-4" />
                              </button>
                              {item.unread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums shrink-0">
                                  {item.unread}
                                </span>
                              )}
                            </div>
                          ))}
                          {customGroupItems.length === 0 && (
                            <div className="py-6 px-3 text-center space-y-2.5">
                              <p className="text-xs text-slate-400">
                                {drawerSearch || onlyUnreadDrawer
                                  ? 'Filtreye uygun sohbet grubu bulunamadı.'
                                  : 'Henüz dahil olduğunuz sohbet grubu yok.'}
                              </p>
                              {onCreateGroup && !drawerSearch && !onlyUnreadDrawer && (
                                <button
                                  type="button"
                                  onClick={() => openCreateGroupDialog([])}
                                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Yeni Grup Oluştur</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 space-y-4">
                      <div>
                        <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <span>Çevrimiçi ({onlineDmPeople.length})</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {onlineDmPeople.map((p) => (
                            <button
                              key={p.user.username}
                              type="button"
                              onClick={() => openConversation(p.dmId)}
                              className="w-full flex items-center justify-between gap-2.5 px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative shrink-0">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${getAvatarTone(p.user.role)}`}>
                                    {getInitials(p.user.username)}
                                  </div>
                                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.user.username}</span>
                                    {p.last ? (
                                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">{p.last.time}</span>
                                    ) : (
                                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">Çevrimiçi</span>
                                    )}
                                  </div>
                                  <div
                                    className={`text-[11px] truncate mt-0.5 ${
                                      p.isTyping
                                        ? 'font-bold text-emerald-600 dark:text-emerald-400 animate-pulse'
                                        : 'text-slate-500 dark:text-slate-400'
                                    }`}
                                  >
                                    {p.lastMsgText || `${getRoleLabel(p.user.role)} · Sistemde aktif`}
                                  </div>
                                </div>
                              </div>
                              {p.unread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums shrink-0">
                                  {p.unread}
                                </span>
                              )}
                            </button>
                          ))}
                          {onlineDmPeople.length === 0 && (
                            <p className="text-xs text-slate-400 px-1 py-2">Şu an başka çevrimiçi kullanıcı yok.</p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="px-1 pb-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          <span>Çevrimdışı ({offlineDmPeople.length})</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {offlineDmPeople.map((p) => (
                            <button
                              key={p.user.username}
                              type="button"
                              onClick={() => openConversation(p.dmId)}
                              className="w-full flex items-center justify-between gap-2.5 px-2 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left cursor-pointer"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="relative shrink-0 opacity-80">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black ${getAvatarTone(p.user.role)}`}>
                                    {getInitials(p.user.username)}
                                  </div>
                                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 bg-slate-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{p.user.username}</span>
                                    {p.last && <span className="text-[10px] text-slate-400 font-mono tabular-nums">{p.last.time}</span>}
                                  </div>
                                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                    {p.lastMsgText || `${getRoleLabel(p.user.role)} · ${p.lastSeenText}`}
                                  </div>
                                  {p.lastMsgText && (
                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{p.lastSeenText}</div>
                                  )}
                                </div>
                              </div>
                              {p.unread > 0 && (
                                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black tabular-nums shrink-0">
                                  {p.unread}
                                </span>
                              )}
                            </button>
                          ))}
                          {offlineDmPeople.length === 0 && (
                            <p className="text-xs text-slate-400 px-1 py-2">Çevrimdışı kullanıcı bulunmuyor.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : mobileActiveChannelId ? (
              <ChatConversationWindow
                channelId={mobileActiveChannelId}
                isMinimized={false}
                isMaximized={false}
                isMobileView={true}
                isKeyboardOpen={isKeyboardOpen}
                currentUser={currentUser}
                users={users}
                vehicles={vehicles}
                ramps={ramps}
                warehouses={warehouses}
                chatGroups={chatGroups}
                chatPresences={chatPresences}
                visibleMessages={visibleMessages}
                onlineUsernamesSet={onlineUsernamesSet}
                isMuted={isMuted}
                now={now}
                onToggleMute={toggleMute}
                onToggleMinimize={() => setMobileScreen('list')}
                onToggleMaximize={() => {}}
                onClose={() => setMobileScreen('closed')}
                onBackMobile={() => setMobileScreen('list')}
                onOpenManageGroup={openManageGroupDialog}
                onOpenCreateGroup={openCreateGroupDialog}
                onApproveGroup={onApproveGroup}
                onRejectGroup={onRejectGroup}
                onLeaveGroup={onLeaveGroup}
                onDeleteGroup={onDeleteGroup}
                quickMessages={quickMessages}
                onOpenEditQuickMessages={isAdminUser && onSaveQuickMessages ? openQuickMessagesEditor : undefined}
                onSendMessage={onSendMessage}
                onEditMessage={onEditMessage}
                onDeleteMessage={onDeleteMessage}
                onToggleReaction={onToggleReaction}
                onTogglePinMessage={onTogglePinMessage}
                onMarkMessagesAsRead={onMarkMessagesAsRead}
                onUpdatePresence={onUpdatePresence}
                onNavigateToVehicle={onNavigateToVehicle}
                onNavigateToRamp={onNavigateToRamp}
                onOpenLightbox={(url) => setLightboxImageUrl(url)}
              />
            ) : null}
          </div>
        )}
      </div>

      {/* ========================================================================
          MODALLAR: YENİ GRUP OLUŞTUR & GRUBA KİŞİ EKLE / ÜYELERİ YÖNET
         ======================================================================== */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-[75] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleSubmitCreateGroup}
            className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top,0px)-0.5rem)] sm:max-h-[90dvh] flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 bg-emerald-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                <h4 className="font-bold text-sm">Yeni Sohbet Grubu Oluştur</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-white/15 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs flex-1 min-h-0 overflow-y-auto custom-scroll">
              {!isAdminUser && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Yeni grup talebiniz Admin onayından geçtikten sonra aktifleşecek ve seçilen üyelere açılacaktır.
                  </span>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Grup Adı *</label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Örn: A Depo Gece Vardiyası"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Açıklama (Opsiyonel)</label>
                <input
                  type="text"
                  maxLength={150}
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="Kısa ekip veya vardiya açıklaması"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Kişileri Ekle ({newGroupMembers.length + 1} kişi seçili)
                  </label>
                </div>
                <input
                  type="text"
                  value={groupUserSearch}
                  onChange={(e) => setGroupUserSearch(e.target.value)}
                  placeholder="Kişi ara..."
                  className="w-full px-3 py-1.5 mb-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                />
                <div className="max-h-48 overflow-y-auto custom-scroll border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {[...allDmPeople]
                    .sort((a, b) => {
                      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                      return a.user.username.localeCompare(b.user.username, 'tr');
                    })
                    .map((p) => p.user)
                    .filter((u) => !groupUserSearch.trim() || u.username.toLowerCase().includes(groupUserSearch.trim().toLowerCase()))
                    .map((u) => {
                      const checked = newGroupMembers.includes(u.username);
                      const isOnline = onlineUsernamesSet.has(u.username.trim().toLowerCase());
                      return (
                        <label
                          key={u.username}
                          className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setNewGroupMembers((prev) =>
                                  checked ? prev.filter((m) => m !== u.username) : [...prev, u.username]
                                )
                              }
                              className="w-4 h-4 accent-emerald-600 rounded"
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-100">{u.username}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {getRoleLabel(u.role)}
                            </span>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={!newGroupName.trim()}
                className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                {isAdminUser ? 'Grubu Oluştur' : 'Onay Talebi Gönder'}
              </button>
            </div>
          </form>
        </div>
      )}

      {managingGroup && (() => {
        const isGroupCreator = managingGroup.createdBy.trim().toLowerCase() === myUsernameLower;
        const canEditMeta = isAdminUser || isGroupCreator;
        const existingLowerSet = new Set(managingGroup.members.map((m) => m.trim().toLowerCase()));
        const pendingRequests = managingGroup.pendingMemberRequests || [];
        const pendingLowerSet = new Set(pendingRequests.map((r) => r.username.trim().toLowerCase()));
        const cancelSet = new Set(cancelPendingDraft.map((u) => u.trim().toLowerCase()));
        const newPendingAdditionsCount = isAdminUser
          ? 0
          : editMembersDraft.filter((m) => {
              const l = m.trim().toLowerCase();
              return !existingLowerSet.has(l) && !pendingLowerSet.has(l);
            }).length;

        return (
        <div className="fixed inset-0 z-[75] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form
            onSubmit={handleSaveGroupDetails}
            className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top,0px)-0.5rem)] sm:max-h-[90dvh] flex flex-col"
          >
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <UserPlus className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">{managingGroup.name} — Grup & Üye Yönetimi</h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    {isAdminUser
                      ? 'Grup adını, açıklamasını ve üyeleri yönetin'
                      : 'Yeni üye ekleme talepleri Admin onayından geçer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManagingGroupId(null)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs flex-1 min-h-0 overflow-y-auto custom-scroll">
              {!isAdminUser && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 text-amber-900 dark:text-amber-200 text-[11px] flex items-start gap-2">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    Gruba yeni kişi ekleme talepleri <strong>Admin onayından</strong> geçtikten sonra kişi gruba dahil edilir.
                  </span>
                </div>
              )}

              {isAdminUser && pendingRequests.length > 0 && (
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/35 border border-blue-200 dark:border-blue-800/70 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Onay Bekleyen Üye Talepleri ({pendingRequests.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {pendingRequests.map((req) => (
                      <div key={req.username} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800/60">
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">{req.username}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">Talep: {req.requestedBy}</div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {onApproveGroupMember && (
                            <button
                              type="button"
                              onClick={() => {
                                onApproveGroupMember(managingGroup.id, req.username);
                                setEditMembersDraft((prev) =>
                                  prev.some((m) => m.toLowerCase() === req.username.toLowerCase())
                                    ? prev
                                    : [...prev, req.username]
                                );
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Onayla</span>
                            </button>
                          )}
                          {onRejectGroupMember && (
                            <button
                              type="button"
                              onClick={() => onRejectGroupMember(managingGroup.id, req.username)}
                              className="px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-[10px] font-bold cursor-pointer"
                            >
                              Reddet
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {canEditMeta && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Grup Adı *</label>
                    <input
                      type="text"
                      required
                      maxLength={80}
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="Grup adı"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Açıklama (Opsiyonel)</label>
                    <input
                      type="text"
                      maxLength={150}
                      value={editGroupDesc}
                      onChange={(e) => setEditGroupDesc(e.target.value)}
                      placeholder="Kısa ekip veya vardiya açıklaması"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Üyeler ({managingGroup.members.length} onaylı{pendingRequests.length > 0 ? ` · ${pendingRequests.length} onay bekliyor` : ''})
                </label>
                <input
                  type="text"
                  value={manageUserSearch}
                  onChange={(e) => setManageUserSearch(e.target.value)}
                  placeholder="Eklenecek kişi ara..."
                  className="w-full px-3 py-1.5 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none"
                />

                <div className="max-h-48 overflow-y-auto custom-scroll border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                  {users
                    .filter((u) => u.role !== 'guest')
                    .filter((u) => !manageUserSearch.trim() || u.username.toLowerCase().includes(manageUserSearch.trim().toLowerCase()))
                    .map((u) => {
                      const uLower = u.username.trim().toLowerCase();
                      const isCreator = uLower === managingGroup.createdBy.trim().toLowerCase();
                      const isExistingMember = existingLowerSet.has(uLower) || isCreator;
                      const isAlreadyPending = pendingLowerSet.has(uLower) && !cancelSet.has(uLower);
                      const isDraftChecked = editMembersDraft.some((m) => m.trim().toLowerCase() === uLower) || isCreator;
                      const checked = isDraftChecked || isAlreadyPending;
                      const isNewlySelectedForApproval = !isAdminUser && !isExistingMember && !pendingLowerSet.has(uLower) && isDraftChecked;
                      const disableCheckbox = isCreator || (!isAdminUser && !isGroupCreator && isExistingMember);
                      const isOnline = onlineUsernamesSet.has(uLower);

                      return (
                        <label
                          key={u.username}
                          className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/70 cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              disabled={disableCheckbox}
                              checked={checked}
                              onChange={() => {
                                if (pendingLowerSet.has(uLower) && !isAdminUser) {
                                  // Toggle pending cancellation for non-admin
                                  setCancelPendingDraft((prev) =>
                                    prev.some((x) => x.toLowerCase() === uLower)
                                      ? prev.filter((x) => x.toLowerCase() !== uLower)
                                      : [...prev, u.username]
                                  );
                                  return;
                                }
                                setEditMembersDraft((prev) =>
                                  isDraftChecked
                                    ? prev.filter((m) => m.trim().toLowerCase() !== uLower)
                                    : [...prev, u.username]
                                );
                              }}
                              className="w-4 h-4 accent-emerald-600 rounded disabled:opacity-60"
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-100 truncate">{u.username}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                              {isCreator ? 'Kurucu' : getRoleLabel(u.role)}
                            </span>
                            {isAlreadyPending && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
                                Onay Bekliyor
                              </span>
                            )}
                            {isNewlySelectedForApproval && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 shrink-0">
                                Onaya Gidecek
                              </span>
                            )}
                          </div>
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
              <div>
                {onLeaveGroup && !isGroupCreator ? (
                  <button
                    type="button"
                    onClick={() => {
                      onLeaveGroup(managingGroup.id);
                      setManagingGroupId(null);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold text-xs cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Gruptan Ayrıl</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    Toplam {managingGroup.members.length} onaylı üye
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setManagingGroupId(null)}
                  className="px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!editGroupName.trim()}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer disabled:opacity-40"
                >
                  {!isAdminUser && newPendingAdditionsCount > 0
                    ? `Üye Talebi Gönder (+${newPendingAdditionsCount})`
                    : 'Değişiklikleri Kaydet'}
                </button>
              </div>
            </div>
          </form>
        </div>
        );
      })()}

      {/* Admin: Sohbet Hızlı Mesajları Düzenleme Modalı */}
      {showQuickMessagesModal && isAdminUser && (
        <div className="fixed inset-0 z-[76] bg-slate-950/75 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-700 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[calc(var(--vvh,100dvh)-env(safe-area-inset-top,0px)-0.5rem)] sm:max-h-[90dvh] flex flex-col">
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate">Sohbet Hızlı Mesajlarını Düzenle</h4>
                  <p className="text-[10px] text-slate-400 truncate">
                    Tüm ekip üyelerinin sohbet penceresinde görünen hazır şablonları yönetin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickMessagesModal(false)}
                className="min-w-[36px] min-h-[36px] flex items-center justify-center hover:bg-white/10 rounded-full cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 text-xs flex-1 min-h-0 overflow-y-auto custom-scroll">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={300}
                  value={newQuickMsgInput}
                  onChange={(e) => setNewQuickMsgInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = newQuickMsgInput.trim();
                      if (!val || quickMessagesDraft.length >= 50) return;
                      setQuickMessagesDraft((prev) => [...prev, val]);
                      setNewQuickMsgInput('');
                    }
                  }}
                  placeholder="Yeni hızlı mesaj yazın..."
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                />
                <button
                  type="button"
                  disabled={!newQuickMsgInput.trim() || quickMessagesDraft.length >= 50}
                  onClick={() => {
                    const val = newQuickMsgInput.trim();
                    if (!val || quickMessagesDraft.length >= 50) return;
                    setQuickMessagesDraft((prev) => [...prev, val]);
                    setNewQuickMsgInput('');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-40 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ekle</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {quickMessagesDraft.length === 0 ? (
                  <div className="p-5 text-center rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-400">
                    Liste boş. Yukarıdan yeni hızlı mesaj ekleyebilir veya varsayılanları yükleyebilirsiniz.
                  </div>
                ) : (
                  quickMessagesDraft.map((msg, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-1.5 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60"
                    >
                      <span className="w-5 text-center text-[10px] font-bold text-slate-400 tabular-nums shrink-0">
                        {idx + 1}.
                      </span>
                      <input
                        type="text"
                        maxLength={300}
                        value={msg}
                        onChange={(e) =>
                          setQuickMessagesDraft((prev) =>
                            prev.map((item, i) => (i === idx ? e.target.value : item))
                          )
                        }
                        className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => {
                          if (idx === 0) return;
                          setQuickMessagesDraft((prev) => {
                            const next = [...prev];
                            [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            return next;
                          });
                        }}
                        title="Yukarı Taşı"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === quickMessagesDraft.length - 1}
                        onClick={() => {
                          if (idx === quickMessagesDraft.length - 1) return;
                          setQuickMessagesDraft((prev) => {
                            const next = [...prev];
                            [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                            return next;
                          });
                        }}
                        title="Aşağı Taşı"
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setQuickMessagesDraft((prev) => prev.filter((_, i) => i !== idx))
                        }
                        title="Sil"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="px-4 py-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] sm:py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setQuickMessagesDraft([...DEFAULT_CHAT_QUICK_MESSAGES])}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Varsayılanlara Dön</span>
              </button>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowQuickMessagesModal(false)}
                  className="px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSaveQuickMessages?.(quickMessagesDraft);
                    setShowQuickMessagesModal(false);
                  }}
                  className="px-4 py-2 min-h-[40px] rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Kaydet</span>
                </button>
              </div>
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
            className="absolute top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] w-11 h-11 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 cursor-pointer"
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
    </>
  );
};
