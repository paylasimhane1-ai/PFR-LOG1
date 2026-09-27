import React from 'react';

interface PerformanceIconProps {
  className?: string;
  size?: number | string;
  alt?: string;
}

/**
 * Performance Logistics Logo İkonu
 * Kullanıcının yüklediği görseldeki mor 'P' monogramı simgesi
 */
export const PerformanceIcon: React.FC<PerformanceIconProps> = ({
  className = 'w-10 h-10',
  size,
  alt = 'Performance Logistics'
}) => {
  return (
    <img
      src="/p-logo.png"
      alt={alt}
      className={`object-contain rounded-xl select-none ${className}`}
      style={size ? { width: size, height: size } : undefined}
      loading="eager"
    />
  );
};

interface PerformanceLogoProps {
  className?: string;
  iconClassName?: string;
  showSubtitle?: boolean;
  lightText?: boolean;
  variant?: 'stacked' | 'horizontal' | 'image-only';
}

/**
 * Performance Logistics Ana Logo Bileşeni
 * Fotoğraftaki görsel ve yazıdan oluşan resmi logo
 */
export const PerformanceLogo: React.FC<PerformanceLogoProps> = ({
  className = '',
  iconClassName = 'w-9 h-9',
  showSubtitle = true,
  lightText = true,
  variant = 'horizontal'
}) => {
  if (variant === 'image-only') {
    return (
      <img
        src="/logo.png"
        alt="Performance Logistics"
        className={`object-contain rounded-2xl select-none ${className}`}
      />
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img
        src="/p-logo.png"
        alt="Performance Logistics"
        className={`${iconClassName} shrink-0 object-contain rounded-lg select-none`}
      />
      <div className="flex flex-col justify-center min-w-0">
        <span
          className={`font-black tracking-wider text-sm sm:text-base leading-none font-sans uppercase ${
            lightText ? 'text-white' : 'text-slate-900'
          }`}
        >
          Performance
        </span>
        <span
          className={`text-[10px] sm:text-[11px] font-bold tracking-wider leading-tight uppercase mt-0.5 ${
            lightText ? 'text-fuchsia-300' : 'text-[#9c2186]'
          }`}
        >
          Logistics
        </span>
      </div>
    </div>
  );
};

export const PLogoIcon = PerformanceIcon;

