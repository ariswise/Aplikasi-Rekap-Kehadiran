import React from 'react';
import { KopConfig, SchoolConfig } from '../types/attendance';
import { DEFAULT_KOP_CONFIG } from '../utils/storage';

interface KopSuratViewProps {
  schoolConfig: SchoolConfig;
  customKop?: KopConfig;
}

export const KopSuratView: React.FC<KopSuratViewProps> = ({
  schoolConfig,
  customKop,
}) => {
  const kop = customKop || schoolConfig.kopConfig || DEFAULT_KOP_CONFIG;

  if (!kop.showKop) {
    return <div className="h-6" />;
  }

  const logoWidthPx = kop.logoWidth || 70;

  // Determine line style classes
  let borderLineClass = 'border-b-4 border-double border-slate-950';
  if (kop.lineStyle === 'single') {
    borderLineClass = 'border-b border-slate-900';
  } else if (kop.lineStyle === 'bold') {
    borderLineClass = 'border-b-2 border-slate-950';
  } else if (kop.lineStyle === 'none') {
    borderLineClass = '';
  }

  return (
    <div className="w-full mb-6">
      <div
        className={`flex items-center gap-4 ${
          kop.logoPosition === 'center'
            ? 'flex-col text-center'
            : kop.logoPosition === 'left_right'
            ? 'justify-between'
            : 'justify-start'
        }`}
      >
        {/* Left Logo */}
        {kop.logoPosition !== 'none' && kop.logoUrl && (
          <div className="shrink-0 flex items-center justify-center">
            <img
              src={kop.logoUrl}
              alt="Logo Sekolah"
              style={{ width: `${logoWidthPx}px`, height: `${logoWidthPx}px` }}
              className="object-contain"
            />
          </div>
        )}

        {/* Kop Text Info */}
        <div
          className={`flex-1 min-w-0 ${
            kop.logoPosition === 'center' || kop.logoPosition === 'left_right'
              ? 'text-center'
              : 'text-center sm:text-center'
          }`}
        >
          {kop.parentAgency && (
            <div className="text-[11px] sm:text-xs uppercase tracking-wider font-semibold text-slate-800 leading-tight whitespace-pre-line">
              {kop.parentAgency}
            </div>
          )}

          {kop.subAgency && (
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-slate-700 leading-tight mt-0.5">
              {kop.subAgency}
            </div>
          )}

          <h1 className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-tight text-slate-950 mt-1 leading-tight">
            {kop.schoolName || schoolConfig.schoolName}
          </h1>

          {kop.subTitle && (
            <div className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wide mt-0.5">
              {kop.subTitle}
            </div>
          )}

          <p className="text-[10px] sm:text-[11px] text-slate-600 mt-1 leading-snug">
            {kop.address || schoolConfig.address}
            {(kop.postalCode !== undefined ? kop.postalCode : (schoolConfig.postalCode || ''))?.trim()
              ? ` · Kode Pos ${(kop.postalCode !== undefined ? kop.postalCode : (schoolConfig.postalCode || '')).trim()}`
              : ''}
          </p>

          {kop.contactInfo && (
            <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 leading-snug">
              {kop.contactInfo}
            </p>
          )}
        </div>

        {/* Right Logo (if left_right position is chosen) */}
        {kop.logoPosition === 'left_right' && (
          <div className="shrink-0 flex items-center justify-center">
            {kop.logoRightUrl ? (
              <img
                src={kop.logoRightUrl}
                alt="Logo Instansi Terkait"
                style={{ width: `${logoWidthPx}px`, height: `${logoWidthPx}px` }}
                className="object-contain"
              />
            ) : (
              <div
                style={{ width: `${logoWidthPx}px`, height: `${logoWidthPx}px` }}
                className="opacity-0"
              />
            )}
          </div>
        )}
      </div>

      {/* Official Separator Line */}
      {kop.lineStyle !== 'none' && (
        <div className={`w-full mt-3 ${borderLineClass}`} />
      )}
    </div>
  );
};
