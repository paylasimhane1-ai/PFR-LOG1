import React, { useEffect } from 'react';
import { Bell, X, ExternalLink, MessageSquare, ChevronRight } from 'lucide-react';

export interface InAppAlert {
  id: string;
  title: string;
  body: string;
  type?: 'call' | 'assign' | 'entry' | 'chat';
  onClick?: () => void;
  onShareWhatsApp?: () => void;
}

interface InAppNotificationBannerProps {
  alert: InAppAlert | null;
  onDismiss: () => void;
}

export const InAppNotificationBanner: React.FC<InAppNotificationBannerProps> = ({ alert, onDismiss }) => {
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, 7000);
    return () => clearTimeout(timer);
  }, [alert, onDismiss]);

  if (!alert) return null;

  const bgStyle =
    alert.type === 'call'
      ? 'bg-rose-900/95 border-rose-500/80 shadow-rose-900/40 text-white'
      : alert.type === 'assign'
      ? 'bg-blue-900/95 border-blue-500/80 shadow-blue-900/40 text-white'
      : alert.type === 'entry'
      ? 'bg-emerald-900/95 border-emerald-500/80 shadow-emerald-900/40 text-white'
      : 'bg-slate-900/95 border-indigo-500/80 shadow-slate-950/60 text-white';

  const badgeText =
    alert.type === 'call'
      ? '🚨 ACİL ÇAĞRI'
      : alert.type === 'assign'
      ? '🚪 RAMPA ATAMASI'
      : alert.type === 'entry'
      ? '🚛 YENİ ARAÇ GİRİŞİ'
      : '🔔 BİLDİRİM';

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-60 animate-in slide-in-from-top-4 duration-300 pointer-events-auto">
      <div className={`p-4 rounded-2xl border backdrop-blur-md shadow-2xl flex items-start gap-3 relative ${bgStyle}`}>
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
          <Bell className="w-5 h-5 text-white animate-bounce" />
        </div>

        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
              {badgeText}
            </span>
          </div>
          <h4 className="font-bold text-sm text-white leading-tight truncate">{alert.title}</h4>
          <p className="text-xs text-white/90 mt-1 leading-snug break-words">{alert.body}</p>

          <div className="mt-2.5 flex items-center gap-2">
            {alert.onClick && (
              <button
                type="button"
                onClick={() => {
                  alert.onClick?.();
                  onDismiss();
                }}
                className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
              >
                <span>İncele</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}

            {alert.onShareWhatsApp && (
              <button
                type="button"
                onClick={() => {
                  alert.onShareWhatsApp?.();
                  onDismiss();
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
              >
                <MessageSquare className="w-3 h-3" />
                <span>WhatsApp</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 text-white/70 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
