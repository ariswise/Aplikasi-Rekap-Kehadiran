import React, { useState } from 'react';
import { AuthUser, SchoolConfig } from '../types/attendance';
import { StorageService } from '../utils/storage';
import {
  School,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

interface LoginScreenProps {
  schoolConfig: SchoolConfig;
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  schoolConfig,
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!username.trim() || !password.trim()) {
      setErrorMsg('Nama pengguna dan kata sandi wajib diisi.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const user = StorageService.authenticateUser(username, password);

      if (user) {
        setIsLoading(false);
        onLoginSuccess(user);
      } else {
        setIsLoading(false);
        setErrorMsg('Nama pengguna atau kata sandi salah. Silakan periksa kembali kredensial Anda.');
      }
    }, 250);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* School Emblem / Logo */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-xl shadow-blue-500/20 ring-4 ring-white/10 mb-4">
          <School className="h-8 w-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl font-display">
          APLIKASI REKAP KEHADIRAN
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Sistem Absensi & Pemantauan Kedisiplinan Siswa
        </p>
        <p className="text-xs font-semibold text-blue-400 mt-1 uppercase tracking-wider">
          {schoolConfig.schoolName}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-900 border border-slate-100">
          <div className="mb-6 pb-3 border-b border-slate-100 text-center">
            <h2 className="text-base font-bold text-slate-900">Masuk ke Akun Anda</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Silakan masukkan nama pengguna dan kata sandi yang telah didaftarkan
            </p>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nama Pengguna (Username)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Masukkan username"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Kata Sandi (Password)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-10 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Masukkan kata sandi"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label="Tampilkan atau sembunyikan kata sandi"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Ingat saya di perangkat ini
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-bold text-white shadow-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-70 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>Memverifikasi Akun...</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Hak akses dilindungi autentikasi Administrator</span>
          </div>
        </div>

        <div className="mt-5 text-center text-xs text-slate-400 space-y-1">
          <p>Sistem Rekap Kehadiran Siswa · Data tersimpan aman pada peramban sekolah</p>
          <p className="font-medium text-slate-500">Dikembangkan Oleh : Aris Wicaksono, S.Pd.</p>
        </div>
      </div>
    </div>
  );
};
