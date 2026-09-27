import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import { ChatMessage, ChatReply, User } from '../types';
import {
  MessageSquare,
  X,
  Minus,
  Send,
  Trash2,
  CornerUpLeft,
  AtSign,
  Users as UsersIcon,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Minimize2,
  CheckCheck,
  ArrowDown
} from 'lucide-react';
import { playChime } from '../utils/audio';
import { sendNativeNotification, loadPushSettings } from '../utils/notifications';

interface ChatWidgetProps {
  chatMessages: ChatMessage[];
  currentUser: User | null;
  users?: User[];
  onSendMessage: (text: string, replyTo?: ChatReply | null, mentions?: string[]) => void;
  onDeleteMessage?: (id: number) => void;
  onClearMessages?: () => void;
  onMarkMessagesAsRead?: (messageIds: number[]) => void;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  chatMessages,
  currentUser,
  users = [],
  onSendMessage,
  onDeleteMessage,
  onClearMessages,
  onMarkMessagesAsRead
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);

  // Kullanıcı bazlı okunmamış mesaj hesaplama:
  // Giriş yapan kullanıcının henüz okumadığı (readBy listesinde olmadığı ve kendisinin göndermediği) mesajlar
  const unreadMessages = useMemo(() => {
    if (!currentUser) return [];
    return chatMessages.filter((m) => {
      if (m.sender === currentUser.username) return false;
      const readBy = Array.isArray(m.readBy) ? m.readBy : [];
      return !readBy.includes(currentUser.username);
    });
  }, [chatMessages, currentUser]);

  const unreadCount = unreadMessages.length;
  const firstUnreadMsgId = unreadMessages.length > 0 ? unreadMessages[0].id : null;

  const [initialUnreadId, setInitialUnreadId] = useState<number | null>(null);
  const [initialUnreadCount, setInitialUnreadCount] = useState<number>(0);
  const [initialUnreadTime, setInitialUnreadTime] = useState<string>('');
  const markAsReadTimerRef = useRef<any>(null);

  // Mention State
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIdx, setSelectedMentionIdx] = useState<number>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef(chatMessages.length);
  const isInitialLoadRef = useRef(true);
  const wasOpenRef = useRef(false);

  // Global event listener to open chat widget from any trigger
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };
    window.addEventListener('open-chat-widget', handleOpenChat);
    return () => window.removeEventListener('open-chat-widget', handleOpenChat);
  }, []);

  // Available users list for @mentions
  const mentionCandidates = useMemo(() => {
    const list: { id: string; name: string; role: string; isBroadcast?: boolean }[] = [
      { id: 'herkes', name: 'herkes', role: 'Tüm Depo Ekibi', isBroadcast: true },
      { id: 'tum_ekip', name: 'tum_ekip', role: 'Genel Anons', isBroadcast: true }
    ];

    const seen = new Set<string>(['herkes', 'tum_ekip']);

    // Add registered users
    if (users && users.length > 0) {
      users.forEach(u => {
        if (!seen.has(u.username.toLowerCase())) {
          seen.add(u.username.toLowerCase());
          list.push({
            id: u.username,
            name: u.username,
            role: u.role === 'admin' ? 'Admin' : u.role === 'security' ? 'Güvenlik' : u.role === 'guest' ? 'Misafir' : 'Personel'
          });
        }
      });
    } else {
      // Fallback
      ['admin', 'Güvenlik', 'Misafir'].forEach(u => {
        list.push({ id: u, name: u, role: u });
      });
    }

    if (mentionQuery === null) return [];
    const query = mentionQuery.toLowerCase();
    return list.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.role.toLowerCase().includes(query)
    );
  }, [users, mentionQuery]);

  // Incoming message detection, audio alert, & native push for mentions
  useEffect(() => {
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      prevMessagesCountRef.current = chatMessages.length;
      return;
    }

    if (chatMessages.length > prevMessagesCountRef.current) {
      const newMessages = chatMessages.slice(prevMessagesCountRef.current);
      newMessages.forEach((msg) => {
        if (msg.sender !== currentUser?.username) {
          // Play notification sound
          playChime('message');

          // Check if current user is @mentioned in the incoming message
          const myName = currentUser?.username?.toLowerCase() || '';
          const msgText = msg.text.toLowerCase();
          const isMentioned =
            (myName && msgText.includes(`@${myName}`)) ||
            msgText.includes('@herkes') ||
            msgText.includes('@tum_ekip');

          if (isMentioned) {
            const pushSettings = loadPushSettings();
            if (pushSettings.notifyOnMention) {
              sendNativeNotification({
                title: `💬 ${msg.sender} sizden bahsetti!`,
                body: msg.text,
                soundType: 'message',
                tag: 'chat-mention-' + msg.id
              });
            }
          }
        }
      });
    }
    prevMessagesCountRef.current = chatMessages.length;
  }, [chatMessages, currentUser]);

  // Sohbet açıldığında: İlk okunmamış mesajdan başla (varsa) ve oraya kaydır
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      const unread = unreadMessages;

      if (unread.length > 0) {
        const firstMsg = unread[0];
        const firstId = firstMsg.id;
        const timeStr = firstMsg.time || (firstMsg.timestamp ? new Date(firstMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');

        setInitialUnreadId(firstId);
        setInitialUnreadCount(unread.length);
        setInitialUnreadTime(timeStr);

        // Mesaj ekranında doğrudan ilk okunmamış mesaja ve ayrım çizgisine kaydır
        const performScroll = () => {
          if (!messagesContainerRef.current) return;
          const marker = document.getElementById('unread-divider-marker') || document.getElementById(`chat-msg-${firstId}`);
          if (marker) {
            const container = messagesContainerRef.current;
            const targetTop = marker.offsetTop - 14;
            container.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
          }
        };

        requestAnimationFrame(() => {
          performScroll();
          setTimeout(performScroll, 80);
          setTimeout(performScroll, 240);
        });

        // Kullanıcının okuması için süre tanı, ardından okundu olarak işaretle
        if (markAsReadTimerRef.current) clearTimeout(markAsReadTimerRef.current);
        markAsReadTimerRef.current = setTimeout(() => {
          const ids = unread.map((m) => m.id);
          onMarkMessagesAsRead?.(ids);
        }, 10000);
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
    } else if (!isOpen) {
      wasOpenRef.current = false;
      setInitialUnreadId(null);
      setInitialUnreadCount(0);
      setInitialUnreadTime('');
      if (markAsReadTimerRef.current) {
        clearTimeout(markAsReadTimerRef.current);
      }
    }
  }, [isOpen]);

  // Auto-focus input when replying
  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Handle typing & @ mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || val.length;
    setText(val);

    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      // Ensure @ is preceded by space, start of line, or punctuation
      if (charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0) {
        const query = textBeforeCursor.slice(lastAtIndex + 1);
        // Only if no space after @
        if (!query.includes(' ')) {
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    // Extract @mentions from text
    const mentionRegex = /@([a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]+)/g;
    const foundMentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(text)) !== null) {
      foundMentions.push(match[1]);
    }

    const replyData: ChatReply | null = replyingTo
      ? {
          id: replyingTo.id,
          sender: replyingTo.sender,
          role: replyingTo.role,
          text: replyingTo.text
        }
      : null;

    onSendMessage(text.trim(), replyData, foundMentions.length > 0 ? foundMentions : undefined);
    setText('');
    setReplyingTo(null);
    setMentionQuery(null);
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
    // Parse @mentions in text
    const parts = msgText.split(/(@[a-zA-Z0-9ğüşıöçĞÜŞİÖÇ_]+)/g);
    const myName = currentUser?.username?.toLowerCase();

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const username = part.slice(1);
        const isMe = myName && username.toLowerCase() === myName;
        const isAll = username.toLowerCase() === 'herkes' || username.toLowerCase() === 'tum_ekip';

        return (
          <span
            key={index}
            className={`inline-flex items-center px-1.5 py-0.2 rounded font-bold text-[10px] mx-0.5 shadow-2xs ${
              isMe
                ? 'bg-amber-400 text-amber-950 font-black animate-pulse'
                : isAll
                ? 'bg-purple-600 text-white font-bold'
                : isMine
                ? 'bg-blue-800 text-blue-100'
                : 'bg-blue-100 text-blue-800'
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

  if (!currentUser) return null;

  return (
    <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6 right-3 sm:right-6 z-40 chat-widget">
      {/* Açık Durum: Mesajlaşma Penceresi (Genişletilmiş ve Ferah Okuma Alanı) */}
      {isOpen && (
        <div
          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-50 transition-all duration-200 ${
            isMaximized
              ? 'fixed inset-2 sm:inset-5 md:inset-8 lg:inset-10 z-50 max-w-5xl mx-auto h-[92vh] max-h-[95vh]'
              : 'fixed sm:absolute bottom-[calc(4.5rem+env(safe-area-inset-bottom)+8px)] sm:bottom-20 right-2 sm:right-0 left-2 sm:left-auto w-auto sm:w-[580px] md:w-[660px] lg:w-[720px] max-w-[calc(100vw-16px)] h-[82dvh] sm:h-[680px] max-h-[820px]'
          }`}
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 bg-slate-900 dark:bg-black text-white flex justify-between items-center border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <h4 className="font-bold text-xs sm:text-sm flex items-center gap-1.5">
                  Saha & Güvenlik Sohbeti
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono">
                    @{currentUser.username}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-400">Admin - Depo & Saha Ekibi İletişimi</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {currentUser.role === 'admin' && onClearMessages && chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={onClearMessages}
                  title="Sohbet Geçmişini Temizle (Admin)"
                  className="px-2 py-1 text-[10px] text-red-300 hover:text-white bg-red-950/60 hover:bg-red-900 border border-red-800/80 rounded-lg transition cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Temizle</span>
                </button>
              )}
              {/* Genişlet / Büyüt Butonu */}
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                title={isMaximized ? 'Normal Boyuta Dön' : 'Ferah Okuma Ekranını Büyüt (Genişlet)'}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                {isMaximized ? <Minimize2 className="w-4 h-4 text-blue-400" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              {/* - ile Kapat Butonu (Direkt sohbet ikonuna döner) */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Sohbeti Kapat (-)"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              {/* x ile Kapat Butonu */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Pencereyi Kapat (x)"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Okunmamış Mesajlar Bildirim & Hızlı Gezinme Bandı */}
          {initialUnreadCount > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/70 border-b border-rose-200 dark:border-rose-900/60 px-3.5 py-2 flex items-center justify-between gap-2 shrink-0 text-xs shadow-xs">
              <div className="flex items-center gap-2 min-w-0 text-rose-800 dark:text-rose-200 font-semibold truncate">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse shrink-0" />
                <span className="truncate">
                  <b>{initialUnreadCount} okunmamış mesaj</b> {initialUnreadTime ? `(Saat ${initialUnreadTime} ve sonrası)` : ''} — Okumaya buradan başladınız
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
                  title="En Yeni Mesaja İn"
                >
                  <ArrowDown className="w-3 h-3" /> En Sona Git
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
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Tümünü Okundu Olarak İşaretle"
                >
                  <CheckCheck className="w-3 h-3" /> Okundu Say
                </button>
              </div>
            </div>
          )}

          {/* Messages List Container (Ferah ve Genişletilmiş Okuma Alanı) */}
          <div
            ref={messagesContainerRef}
            className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scroll bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm leading-relaxed"
          >
            {chatMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-slate-500" />
                <p className="font-semibold text-slate-600 dark:text-slate-300 text-sm">Henüz mesaj bulunmuyor.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Saha, depo veya güvenlik birimleriyle iletişim başlatın.
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Mesaj yazarken <span className="font-bold text-blue-600 dark:text-blue-400">@</span> yazarak personelden bahsedebilirsiniz.
                </p>
              </div>
            )}

            {chatMessages.map((m) => {
              const isMine = m.sender === currentUser.username;
              const isHighlighted = highlightedMessageId === m.id;
              const isFirstUnread = firstUnreadMsgId === m.id;

              return (
                <React.Fragment key={m.id}>
                  {/* Okunmamış Mesajlar Başlangıç Çizgisi */}
                  {(initialUnreadId === m.id || (!initialUnreadId && isFirstUnread)) && (
                    <div id="unread-divider-marker" className="flex items-center gap-3 my-4 py-1 select-none">
                      <div className="flex-1 h-[2px] bg-rose-400 dark:bg-rose-600/80" />
                      <div className="px-3.5 py-1.5 bg-rose-600 text-white font-black text-xs rounded-full shadow-md flex items-center gap-2 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        <span>Okunmamış Mesajlar ({initialUnreadCount || unreadCount} Yeni{initialUnreadTime ? ` • Saat ${initialUnreadTime}` : ''}) — Buradan Okumaya Başlayın</span>
                      </div>
                      <div className="flex-1 h-[2px] bg-rose-400 dark:bg-rose-600/80" />
                    </div>
                  )}

                  <div
                    id={`chat-msg-${m.id}`}
                    className={`flex flex-col group transition-all duration-200 ${
                      isMine ? 'items-end' : 'items-start'
                    } ${isHighlighted ? 'scale-102 ring-2 ring-blue-500 rounded-2xl p-0.5' : ''}`}
                  >
                  <div
                    className={`p-3 sm:p-3.5 rounded-2xl shadow-xs max-w-[85%] space-y-1.5 relative transition text-[13px] sm:text-sm leading-relaxed ${
                      isMine
                        ? 'bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none'
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none'
                    }`}
                  >
                    {/* Alıntılanan / Cevap Verilen Mesaj Bloğu */}
                    {m.replyTo && (
                      <div
                        onClick={() => handleScrollToMessage(m.replyTo!.id)}
                        className={`text-[11px] p-2 rounded-xl border-l-2 cursor-pointer transition mb-1.5 ${
                          isMine
                            ? 'bg-blue-700/80 border-blue-300 text-blue-100 hover:bg-blue-700'
                            : 'bg-slate-100 dark:bg-slate-700/60 border-blue-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Orijinal mesaja git"
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

                    {/* Sender and time */}
                    <div className="flex justify-between items-center gap-2 text-[10px] opacity-85 border-b border-black/10 dark:border-white/10 pb-0.5">
                      <span className="font-bold capitalize flex items-center gap-1">
                        {m.sender} <span className="opacity-75 text-[9px]">({m.role})</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span>{m.time}</span>

                        {/* Cevapla Butonu */}
                        <button
                          type="button"
                          onClick={() => setReplyingTo(m)}
                          title="Bu mesaja cevap ver"
                          className="opacity-70 hover:opacity-100 hover:text-amber-300 transition cursor-pointer flex items-center gap-0.5 text-[8px]"
                        >
                          <CornerUpLeft className="w-2.5 h-2.5" />
                          <span className="hidden group-hover:inline">Cevapla</span>
                        </button>

                        {/* Admin Mesaj Silme */}
                        {currentUser.role === 'admin' && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(m.id)}
                            title="Mesajı Sil (Admin)"
                            className="text-red-400 hover:text-red-300 opacity-60 hover:opacity-100 transition cursor-pointer ml-1"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Message Body with Mentions */}
                    <p className="leading-relaxed whitespace-pre-wrap text-[11px]">
                      {renderMessageContent(m.text, isMine)}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
          </div>

          {/* Cevap Veriliyor Barı (Reply Preview) */}
          {replyingTo && (
            <div className="p-2 bg-blue-50 border-t border-b border-blue-200 flex items-center justify-between text-xs text-blue-900 shrink-0">
              <div className="flex items-center gap-2 overflow-hidden">
                <CornerUpLeft className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-[11px] text-blue-700">@{replyingTo.sender}</span>
                  <span className="text-[10px] text-slate-500 ml-1 truncate">
                    kişisine yanıt veriliyor: "{replyingTo.text.slice(0, 45)}"
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="p-1 text-slate-400 hover:text-red-600 transition cursor-pointer"
                title="Cevaplamaktan vazgeç"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* @ Bahsetme Autocomplete Menüsü */}
          {mentionQuery !== null && mentionCandidates.length > 0 && (
            <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-xl max-h-40 overflow-y-auto custom-scroll text-xs shrink-0 p-1 divide-y divide-slate-100 dark:divide-slate-700/60">
              <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
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

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 shrink-0"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={replyingTo ? 'Cevabınızı yazın (@ ile bahset)...' : 'Mesajınızı yazın (@ ile bahset)...'}
                className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-base sm:text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 pr-9"
              />
              <button
                type="button"
                onClick={() => {
                  setText((prev) => prev + (prev.endsWith(' ') || prev === '' ? '@' : ' @'));
                  setMentionQuery('');
                  setMentionStartIndex(text.length + (text.endsWith(' ') || text === '' ? 0 : 1));
                  inputRef.current?.focus();
                }}
                title="Kullanıcıdan Bahset (@)"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer p-0.5"
              >
                <AtSign className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              disabled={!text.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-bold text-xs sm:text-sm rounded-xl shadow transition cursor-pointer flex items-center justify-center shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Sabit Mesaj Butonu: Tıklayınca Açılır, Tekrar Tıklayınca Kapanır (Toggle) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-12 h-14 md:w-14 md:h-16 rounded-2xl shadow-2xl flex flex-col items-center justify-center transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer relative ${
          isOpen
            ? 'bg-slate-800 hover:bg-slate-900 text-white ring-2 ring-blue-400'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
        title={isOpen ? 'Sohbeti Kapat' : 'Sohbet & Saha İletişimi'}
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
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[10px] min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 shadow-lg animate-bounce border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};
