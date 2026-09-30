import React from 'react';

interface LogiPortalIconProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

/**
 * LogiPortal Logo İkonu
 * 3D Mor-Menekşe 'lp' monogramı
 */
export const LogiPortalIcon: React.FC<LogiPortalIconProps> = ({
  className = 'w-10 h-10',
  size,
  alt = 'LogiPortal'
}) => {
  return (
    <img
      src="/logiportal.png"
      alt={alt}
      className={`object-contain rounded-xl select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
      loading="eager"
    />
  );
};

interface LogiPortalLogoProps {
  className?: string;
  iconClassName?: string;
  showSubtitle?: boolean;
  lightText?: boolean;
  variant?: 'stacked' | 'horizontal' | 'image-only';
}

/**
 * LogiPortal Ana Logo Bileşeni
 * Yeni LogiPortal logosu ve kurumsal tipografisi
 */
export const LogiPortalLogo: React.FC<LogiPortalLogoProps> = ({
  className = '',
  iconClassName = 'w-9 h-9',
  showSubtitle = true,
  lightText = true,
  variant = 'horizontal'
}) => {
  if (variant === 'image-only') {
    return (
      <img
        src="/logiportal.png"
        alt="LogiPortal"
        className={`object-contain rounded-2xl select-none ${className}`}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/logiportal.png"
        alt="LogiPortal"
        className={`${iconClassName} shrink-0 object-contain rounded-xl select-none`}
      />
      <div className="flex flex-col justify-center min-w-0">
        <span
          className={`font-black tracking-tight text-base sm:text-lg leading-none font-sans ${
            lightText ? 'text-white' : 'text-slate-900'
          }`}
        >
          Logi<span className="text-purple-400">Portal</span>
        </span>
        {showSubtitle && (
          <span
            className={`text-[9px] sm:text-[10px] font-semibold tracking-wider leading-tight uppercase mt-0.5 truncate ${
              lightText ? 'text-purple-200/80' : 'text-purple-700'
            }`}
          >
            Logistics Management
          </span>
        )}
      </div>
    </div>
  );
};

// Aliases for backwards compatibility
export const PerformanceIcon = LogiPortalIcon;
export const PerformanceLogo = LogiPortalLogo;
export const PLogoIcon = LogiPortalIcon;
