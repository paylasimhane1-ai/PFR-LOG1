import React from 'react';

interface PerformanceIconProps {
  className?: string;
  size?: number | string;
}

/**
 * Performance Logistics / PFR NOVA İmza Logo İkonu
 * performance.jpg görseline birebir sadık kalınarak vektörel olarak oluşturulmuştur.
 * Zengin fuşya/magenta zemin üzerinde asimetrik kavisler ve beyaz 'P' harf monogramı.
 */
export const PerformanceIcon: React.FC<PerformanceIconProps> = ({
  className = 'w-10 h-10',
  size
}) => {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="pfrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#962383" />
          <stop offset="100%" stopColor="#821870" />
        </linearGradient>
      </defs>

      {/* Dış Kalkan / Rozet (Sağ-üst ve sol-alt geniş kavisli imza form) */}
      <path
        d="M 28 8 
           C 20 8 12 16 12 26 
           L 12 74 
           C 12 96 26 112 50 112 
           L 92 112 
           C 102 112 108 104 108 94 
           L 108 46 
           C 108 24 94 8 70 8 
           Z"
        fill="url(#pfrGrad)"
      />

      {/* Beyaz Stilize 'P' Monogramı ve Geometrik Kesitler */}
      {/* 1. Sol dikey gövde */}
      <path
        d="M 28 32
           C 28 29 30 27 33 27
           L 44 27
           L 44 92
           C 44 94 42 96 40 96
           L 32 96
           C 29.8 96 28 94.2 28 92
           Z"
        fill="#FFFFFF"
      />

      {/* 2. 'P' Harfinin Üst Kıvrımı ve Boşluğu */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 44 27
           L 66 27
           C 78 27 88 35 88 48
           C 88 61 78 69 66 69
           L 44 69
           Z
           M 44 40
           L 63 40
           C 68.5 40 73 43.5 73 48
           C 73 52.5 68.5 56 63 56
           L 44 56
           Z"
        fill="#FFFFFF"
      />

      {/* 3. Üst sağdaki hafif dinamik mor aksan noktası */}
      <rect x="74" y="16" width="10" height="10" rx="3" fill="#FFFFFF" opacity="0.18" />
    </svg>
  );
};

interface PerformanceLogoProps {
  className?: string;
  iconClassName?: string;
  showSubtitle?: boolean;
  lightText?: boolean;
}

export const PerformanceLogo: React.FC<PerformanceLogoProps> = ({
  className = '',
  iconClassName = 'w-9 h-9',
  showSubtitle = true,
  lightText = true
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <PerformanceIcon className={`${iconClassName} shrink-0`} />
      <div className="flex flex-col justify-center min-w-0">
        <span
          className={`font-black tracking-wider text-sm sm:text-base leading-none font-sans uppercase ${
            lightText ? 'text-white' : 'text-slate-900'
          }`}
        >
          PERFORMANCE
        </span>
        {showSubtitle && (
          <span
            className={`text-[9px] font-bold tracking-widest leading-tight uppercase mt-0.5 ${
              lightText ? 'text-fuchsia-300' : 'text-purple-800'
            }`}
          >
            PFR NOVA
          </span>
        )}
      </div>
    </div>
  );
};

export const PLogoIcon = PerformanceIcon;
