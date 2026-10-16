import React from 'react';
import { SchoolConfig, UserRole, AuthUser } from '../types/attendance';
import { School, Database, Cloud, Shield, ChevronDown, Menu, UserCheck, LogOut, User } from 'lucide-react';

interface HeaderProps {
  schoolConfig: SchoolConfig;
  currentUser: AuthUser | null;
  onClassChange: (className: string) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  schoolConfig,
  currentUser,
  onClassChange,
  activeRole,
  onRoleChange,
  onToggleSidebar,
  onOpenSettings,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Buka Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
            <School className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">
                REKAP KEHADIRAN
              </h1>
              <span className="hidden sm:inline-block rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200/60">
                {schoolConfig.schoolLevel}
              </span>
            </div>
            <p className="hidden text-xs text-slate-500 sm:block truncate max-w-[260px] md:max-w-[400px]">
              {schoolConfig.schoolName} · TP {schoolConfig.academicYear} (Sem {schoolConfig.semester === '1' ? 'Ganjil' : 'Genap'})
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Class Selector Dropdown */}
        <div className="relative">
          <label htmlFor="active-class-select" className="sr-only">Pilih Kelas</label>
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">
            <span className="hidden sm:inline text-slate-500 mr-1.5">Kelas:</span>
            <select
              id="active-class-select"
              value={schoolConfig.currentClass}
              onChange={(e) => onClassChange(e.target.value)}
              className="bg-transparent font-semibold text-slate-900 focus:outline-none cursor-pointer pr-1"
            >
              {schoolConfig.availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Logged In Role Badge */}
        {currentUser && (
          <div className="hidden md:flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
            {currentUser.role === 'admin' ? (
              <Shield className="h-3.5 w-3.5 text-blue-600" />
            ) : (
              <UserCheck className="h-3.5 w-3.5 text-indigo-600" />
            )}
            <div className="leading-tight">
              <span className="font-bold text-slate-900 block truncate max-w-[120px]">
                {currentUser.name}
              </span>
              <span className="text-[10px] text-slate-500 uppercase font-semibold">
                {currentUser.role === 'admin' ? 'Admin Sekolah' : 'Guru BK'}
              </span>
            </div>
          </div>
        )}

        {/* Storage / Cloud Status */}
        <button
          type="button"
          onClick={onOpenSettings}
          title="Status Penyimpanan Cloud & Lokal (Klik untuk Buka Pengaturan Cloud)"
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 transition-colors shadow-2xs cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          <Cloud className="h-3.5 w-3.5 text-blue-600 ml-0.5" />
          <span>Cloud & Lokal</span>
        </button>

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          title="Keluar dari akun"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-2xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
};
