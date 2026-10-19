import React from 'react';
import {
  CalendarDays,
  CalendarRange,
  Calendar,
  BarChart3,
  AlertTriangle,
  Users,
  Settings,
  X,
  GraduationCap,
  CalendarCheck,
  FileSpreadsheet,
  LayoutGrid,
} from 'lucide-react';
import { SchoolConfig, AuthUser } from '../types/attendance';
import { LogOut, Shield, UserCheck, KeyRound } from 'lucide-react';

export type ActiveTab =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'semester'
  | 'charts'
  | 'followup'
  | 'all_classes'
  | 'students'
  | 'users'
  | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOpen: boolean;
  onClose: () => void;
  schoolConfig: SchoolConfig;
  studentCount: number;
  followUpAlertCount: number;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
  schoolConfig,
  studentCount,
  followUpAlertCount,
  currentUser,
  onLogout,
}) => {
  const mainNavItems = [
    {
      id: 'daily' as ActiveTab,
      label: 'Kehadiran Harian',
      description: 'Presensi harian siswa',
      icon: CalendarCheck,
    },
    {
      id: 'weekly' as ActiveTab,
      label: 'Rekap Mingguan',
      description: 'Matriks Senin - Sabtu',
      icon: CalendarRange,
    },
    {
      id: 'monthly' as ActiveTab,
      label: 'Rekap Bulanan',
      description: 'Kalender 1 - 31 hari',
      icon: Calendar,
    },
    {
      id: 'semester' as ActiveTab,
      label: 'Rekap Semester',
      description: 'Akumulasi bulanan & predikat',
      icon: CalendarDays,
    },
    {
      id: 'charts' as ActiveTab,
      label: 'Grafik Kehadiran',
      description: 'Tren & analisis visual',
      icon: BarChart3,
    },
    {
      id: 'followup' as ActiveTab,
      label: 'Tindak Lanjut & Laporan',
      description: 'Sistem peringatan & surat',
      icon: AlertTriangle,
      badge: followUpAlertCount > 0 ? followUpAlertCount : undefined,
    },
  ];

  const secondaryNavItems = [
    {
      id: 'students' as ActiveTab,
      label: 'Daftar Peserta Didik',
      description: `${studentCount} Siswa terdaftar`,
      icon: Users,
    },
    ...(currentUser?.role === 'admin'
      ? [
          {
            id: 'all_classes' as ActiveTab,
            label: 'Rekap Keseluruhan Kelas',
            description: 'Rekap bulanan & semester semua rombel',
            icon: LayoutGrid,
          },
          {
            id: 'users' as ActiveTab,
            label: 'Manajemen Akun',
            description: 'Hak akses & kata sandi',
            icon: KeyRound,
          },
        ]
      : []),
    {
      id: 'settings' as ActiveTab,
      label: 'Pengaturan & Cadangan',
      description: 'Profil sekolah & database',
      icon: Settings,
    },
  ];

  const handleSelectTab = (tab: ActiveTab) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-0 -translate-x-full'
        }`}
      >
        {/* Top Header of Sidebar */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold text-sm">
              RK
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
                Rekap Kehadiran
              </span>
              <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[150px]">
                Kelas: {schoolConfig.currentClass}
              </span>
              {currentUser?.role !== 'admin' && currentUser?.allowedClasses && currentUser.allowedClasses.length > 0 && (
                <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 px-1 rounded inline-block mt-0.5 max-w-[150px] truncate" title={`Akses Rombel: ${currentUser.allowedClasses.join(', ')}`}>
                  Rombel: {currentUser.allowedClasses.join(', ')}
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            aria-label="Tutup Menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {/* Main Menus */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
              Menu Utama Absensi
            </div>
            <nav className="space-y-1">
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 ${
                          isActive ? 'text-blue-700' : 'text-slate-600 group-hover:text-slate-800'
                        }`}
                      />
                      <div className="truncate">
                        <div className="truncate">{item.label}</div>
                        <div className="text-[11px] font-normal text-slate-600 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                    {item.badge !== undefined && (
                      <span className="ml-2 inline-flex h-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[11px] font-bold text-white">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Master & Settings */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-slate-600 uppercase">
              Data & Konfigurasi
            </div>
            <nav className="space-y-1">
              {secondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`group flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-800'
                        : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4.5 w-4.5 shrink-0 ${
                          isActive ? 'text-blue-700' : 'text-slate-600 group-hover:text-slate-800'
                        }`}
                      />
                      <div className="truncate">
                        <div className="truncate">{item.label}</div>
                        <div className="text-[11px] font-normal text-slate-600 truncate">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom Profile Info with Logged in user & Logout */}
        <div className="border-t border-slate-200 p-4 bg-slate-50/70">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs shadow-2xs">
                {currentUser?.role === 'admin' ? (
                  <Shield className="h-4 w-4" />
                ) : (
                  <UserCheck className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">
                  {currentUser?.name || schoolConfig.homeroomTeacher}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {currentUser?.role === 'admin'
                    ? 'Admin Sekolah'
                    : currentUser?.role === 'guru_bk'
                    ? 'Guru BK'
                    : `Wali Kelas ${schoolConfig.currentClass}`}
                </p>
              </div>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Keluar"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                aria-label="Keluar dari akun"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
