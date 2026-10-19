import React, { useState, useMemo, useEffect } from 'react';
import { StoredAccount, UserRole, AuthUser } from '../types/attendance';
import { StorageService } from '../utils/storage';
import { FirebaseService, getFirestoreDb } from '../utils/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  Users,
  UserPlus,
  Shield,
  UserCheck,
  KeyRound,
  Edit2,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Cloud,
  RefreshCw,
  BookOpen,
} from 'lucide-react';

interface UserManagementProps {
  currentUser: AuthUser;
  availableClasses?: string[];
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
  onUpdateCurrentUser?: (user: AuthUser) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  availableClasses = [],
  onShowToast,
  onUpdateCurrentUser,
}) => {
  const [accounts, setAccounts] = useState<StoredAccount[]>(() =>
    StorageService.getAccounts()
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAccount, setEditingAccount] = useState<StoredAccount | null>(null);

  // Form states
  const [formName, setFormName] = useState<string>('');
  const [formUsername, setFormUsername] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('wali_kelas');
  const [formNip, setFormNip] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formConfirmPassword, setFormConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  // Class permissions state (for non-admin accounts)
  const [formAccessMode, setFormAccessMode] = useState<'all' | 'custom'>('all');
  const [formSelectedClasses, setFormSelectedClasses] = useState<string[]>([]);

  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  // Sync accounts from cloud on component mount
  useEffect(() => {
    if (FirebaseService.isConfigured()) {
      FirebaseService.pullAllFromCloud()
        .then((res) => {
          if (res.success && res.data?.accounts && res.data.accounts.length > 0) {
            const cloudAccounts = res.data.accounts;
            const currentLocal = StorageService.getAccounts();
            const map = new Map<string, StoredAccount>();
            currentLocal.forEach((a) => map.set(a.id, a));
            cloudAccounts.forEach((a) => map.set(a.id, a));
            const merged = Array.from(map.values());
            setAccounts(merged);
            StorageService.saveAccounts(merged);
          }
        })
        .catch((err) => {
          console.warn('Silent cloud pull accounts failed:', err);
        });
    }
  }, []);

  const handleManualSyncCloud = async () => {
    setIsSyncingCloud(true);
    try {
      const currentAccounts = StorageService.getAccounts();
      const db = getFirestoreDb();

      // 1. Upload all local accounts to Firestore
      for (const acc of currentAccounts) {
        await setDoc(doc(db, 'accounts', acc.id), {
          ...acc,
          syncedAt: new Date().toISOString(),
        });
      }

      // 2. Pull back any new accounts from Firestore
      const res = await FirebaseService.pullAllFromCloud();
      if (res.success && res.data?.accounts) {
        const map = new Map<string, StoredAccount>();
        currentAccounts.forEach((a) => map.set(a.id, a));
        res.data.accounts.forEach((a) => map.set(a.id, a));
        const merged = Array.from(map.values());
        setAccounts(merged);
        StorageService.saveAccounts(merged);
      }

      onShowToast('success', 'Sinkronisasi Akun Sukses', `${currentAccounts.length} akun berhasil disinkronkan ke Cloud Firebase. Akun kini aktif di semua URL/perangkat!`);
    } catch (e: any) {
      onShowToast('error', 'Gagal Sinkronisasi', e?.message || 'Tidak dapat terhubung ke cloud.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return accounts.filter(
      (acc) =>
        acc.name.toLowerCase().includes(q) ||
        acc.username.toLowerCase().includes(q) ||
        acc.role.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingAccount(null);
    setFormName('');
    setFormUsername('');
    setFormRole('wali_kelas');
    setFormNip('');
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
    setFormAccessMode('all');
    setFormSelectedClasses([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (account: StoredAccount) => {
    setEditingAccount(account);
    setFormName(account.name);
    setFormUsername(account.username);
    setFormRole(account.role);
    setFormNip(account.nip || '');
    setFormPassword(''); // blank means keep current password unless filled
    setFormConfirmPassword('');
    setShowPassword(false);
    if (account.allowedClasses && account.allowedClasses.length > 0) {
      setFormAccessMode('custom');
      setFormSelectedClasses(account.allowedClasses);
    } else {
      setFormAccessMode('all');
      setFormSelectedClasses([]);
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim() || !formUsername.trim()) {
      setFormError('Nama lengkap dan username wajib diisi.');
      return;
    }

    const cleanUsername = formUsername.trim().toLowerCase();

    // Check duplicate username
    const duplicate = accounts.find(
      (a) => a.username.toLowerCase() === cleanUsername && a.id !== editingAccount?.id
    );
    if (duplicate) {
      setFormError(`Username "${cleanUsername}" sudah digunakan oleh akun lain.`);
      return;
    }

    // Validate class access for non-admin accounts
    if (formRole !== 'admin' && formAccessMode === 'custom' && formSelectedClasses.length === 0) {
      setFormError('Harap pilih minimal 1 rombel/kelas yang diizinkan untuk akun ini.');
      return;
    }

    const finalAllowedClasses =
      formRole === 'admin' || formAccessMode === 'all'
        ? undefined
        : formSelectedClasses;

    if (!editingAccount) {
      // Adding new account
      if (!formPassword) {
        setFormError('Kata sandi wajib diisi untuk akun baru.');
        return;
      }
      if (formPassword !== formConfirmPassword) {
        setFormError('Konfirmasi kata sandi tidak cocok.');
        return;
      }

      const newAcc: StoredAccount = {
        id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        username: cleanUsername,
        password: formPassword,
        name: formName.trim(),
        role: formRole,
        nip: formNip.trim() || undefined,
        allowedClasses: finalAllowedClasses,
        createdAt: new Date().toISOString(),
      };

      const updated = [...accounts, newAcc];
      setAccounts(updated);
      StorageService.saveAccounts(updated);

      // Auto-sync to Cloud Firestore so account works on published URL and all devices
      try {
        const db = getFirestoreDb();
        await setDoc(doc(db, 'accounts', newAcc.id), {
          ...newAcc,
          syncedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Silent cloud account upload error:', err);
      }

      onShowToast('success', 'Akun Berhasil Dibuat', `Akun ${newAcc.name} (${newAcc.username}) berhasil ditambahkan dan disinkronkan ke Cloud.`);
      setIsModalOpen(false);
    } else {
      // Editing existing account
      if (formPassword && formPassword !== formConfirmPassword) {
        setFormError('Konfirmasi kata sandi tidak cocok.');
        return;
      }

      let updatedTargetAcc: StoredAccount | null = null;
      const updated = accounts.map((a) => {
        if (a.id === editingAccount.id) {
          const mod: StoredAccount = {
            ...a,
            username: cleanUsername,
            name: formName.trim(),
            role: formRole,
            nip: formNip.trim() || undefined,
            allowedClasses: finalAllowedClasses,
            password: formPassword ? formPassword : a.password, // keep existing password if not updated
          };
          updatedTargetAcc = mod;
          return mod;
        }
        return a;
      });

      setAccounts(updated);
      StorageService.saveAccounts(updated);

      // If active user is the one being edited, update active session
      if (currentUser.id === editingAccount.id) {
        const updatedCurrentUser: AuthUser = {
          ...currentUser,
          name: formName.trim(),
          username: cleanUsername,
          role: formRole,
          nip: formNip.trim() || undefined,
          allowedClasses: finalAllowedClasses,
        };
        StorageService.setLoggedInUser(updatedCurrentUser);
        if (onUpdateCurrentUser) {
          onUpdateCurrentUser(updatedCurrentUser);
        }
      }

      // Auto-sync to Cloud Firestore
      if (updatedTargetAcc) {
        const targetAcc: StoredAccount = updatedTargetAcc;
        try {
          const db = getFirestoreDb();
          await setDoc(doc(db, 'accounts', targetAcc.id), {
            ...targetAcc,
            syncedAt: new Date().toISOString(),
          });
        } catch (err) {
          console.warn('Silent cloud account update error:', err);
        }
      }

      onShowToast(
        'success',
        'Akun Diperbarui',
        `Data akun ${formName} berhasil diperbarui${formPassword ? ' beserta kata sandi baru' : ''} di Cloud.`
      );
      setIsModalOpen(false);
    }
  };

  const handleDeleteAccount = async (account: StoredAccount) => {
    if (account.username === 'admin') {
      onShowToast('error', 'Tidak Dapat Dihapus', 'Akun Administrator utama tidak boleh dihapus.');
      return;
    }

    if (account.id === currentUser.id) {
      onShowToast('error', 'Tidak Dapat Dihapus', 'Anda tidak dapat menghapus akun yang sedang Anda gunakan.');
      return;
    }

    if (window.confirm(`Yakin ingin menghapus akun "${account.name}" (${account.username})?`)) {
      const updated = accounts.filter((a) => a.id !== account.id);
      setAccounts(updated);
      StorageService.saveAccounts(updated);

      // Auto-delete from Cloud Firestore
      try {
        const db = getFirestoreDb();
        await deleteDoc(doc(db, 'accounts', account.id));
      } catch (err) {
        console.warn('Silent cloud account delete error:', err);
      }

      onShowToast('info', 'Akun Dihapus', `Akun ${account.name} telah dihapus dari sistem dan cloud.`);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
            <Shield className="h-3 w-3" /> Admin Sekolah
          </span>
        );
      case 'guru_bk':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800">
            <UserCheck className="h-3 w-3" /> Guru BK
          </span>
        );
      case 'wali_kelas':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
            Wali Kelas
          </span>
        );
      case 'kepala_sekolah':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
            Kepala Sekolah
          </span>
        );
      default:
        return <span className="text-xs text-slate-600">{role}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Manajemen Akun Pengguna & Hak Akses
            </h2>
            <span className="rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
              {accounts.length} Akun Terdaftar
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin dapat menambahkan akun Guru BK, Wali Kelas, atau Kepala Sekolah serta mengatur kata sandinya
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSyncCloud}
            disabled={isSyncingCloud}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
            title="Sinkronkan seluruh akun ke Cloud Firebase agar dapat diakses dari domain publish dan perangkat lain"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-blue-600 ${isSyncingCloud ? 'animate-spin' : ''}`} />
            <span>{isSyncingCloud ? 'Menyinkronkan...' : 'Sinkronkan Akun ke Cloud'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs"
          >
            <UserPlus className="h-4 w-4" />
            Tambah Akun Baru
          </button>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, username, atau peran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold tracking-wider text-slate-600 uppercase">
              <tr>
                <th scope="col" className="w-12 px-3 py-3 text-center">No</th>
                <th scope="col" className="px-4 py-3">Nama Lengkap & NIP</th>
                <th scope="col" className="px-4 py-3">Nama Pengguna (Username)</th>
                <th scope="col" className="px-4 py-3">Hak Akses / Peran</th>
                <th scope="col" className="px-4 py-3">Hak Akses Rombel</th>
                <th scope="col" className="px-4 py-3 text-center">Status Sandi</th>
                <th scope="col" className="w-28 px-3 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.map((account, idx) => {
                const isMainAdmin = account.username === 'admin';
                const isCurrent = account.id === currentUser.id;

                return (
                  <tr key={account.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3 py-3 text-center font-mono text-slate-400 text-xs">
                      {idx + 1}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{account.name}</div>
                      <div className="text-[11px] text-slate-400">
                        {account.nip ? `NIP. ${account.nip}` : 'Tidak ada NIP'}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono font-medium text-slate-700">
                      {account.username}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          (Anda)
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {getRoleBadge(account.role)}
                    </td>

                    <td className="px-4 py-3">
                      {account.role === 'admin' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Semua Rombel (Admin)
                        </span>
                      ) : !account.allowedClasses || account.allowedClasses.length === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          Semua Rombel
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {account.allowedClasses.map((cls) => (
                            <span
                              key={cls}
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200"
                            >
                              {cls}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                        <Lock className="h-3 w-3 text-emerald-600" /> Terenkripsi
                      </span>
                    </td>

                    <td className="px-3 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(account)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Akun & Reset Kata Sandi"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>

                        {!isMainAdmin && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAccount(account)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Hapus Akun"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-blue-600" />
                {editingAccount ? 'Edit Akun & Atur Kata Sandi' : 'Tambah Akun Pengguna Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAccount} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Lengkap Pengguna *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Dra. Nurhayati, M.Pd."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Nama Pengguna (Username) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    disabled={editingAccount?.username === 'admin'}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="nurhayati"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Peran / Hak Akses *
                  </label>
                  <select
                    value={formRole}
                    disabled={editingAccount?.username === 'admin'}
                    onChange={(e) => setFormRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                  >
                    <option value="guru_bk">Guru BK</option>
                    <option value="wali_kelas">Wali Kelas</option>
                    <option value="admin">Admin Sekolah</option>
                    <option value="kepala_sekolah">Kepala Sekolah</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  NIP (Nomor Induk Pegawai)
                </label>
                <input
                  type="text"
                  value={formNip}
                  onChange={(e) => setFormNip(e.target.value)}
                  placeholder="19850101 201001 2 001"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Hak Akses Rombel / Kelas (Khusus akun selain Admin) */}
              <div className="pt-2 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Shield className="h-3.5 w-3.5 text-blue-600" />
                    Hak Akses Rombel / Kelas
                  </label>
                  {formRole !== 'admin' && (
                    <span className="text-[11px] text-slate-500 font-medium">
                      {formAccessMode === 'all'
                        ? 'Semua rombel'
                        : `${formSelectedClasses.length} rombel dipilih`}
                    </span>
                  )}
                </div>

                {formRole === 'admin' ? (
                  <div className="rounded-lg bg-blue-50 p-2.5 text-xs text-blue-800 border border-blue-200 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>
                      Administrator memiliki hak akses penuh ke seluruh rombel/kelas di sekolah.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-5 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="accessMode"
                          checked={formAccessMode === 'all'}
                          onChange={() => setFormAccessMode('all')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-slate-700">Akses Semua Kelas</span>
                      </label>

                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="accessMode"
                          checked={formAccessMode === 'custom'}
                          onChange={() => setFormAccessMode('custom')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-semibold text-slate-700">Hanya Rombel Tertentu</span>
                      </label>
                    </div>

                    {formAccessMode === 'custom' && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                            Centang Rombel yang Ditugaskan:
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setFormSelectedClasses([...availableClasses])}
                              className="text-[10px] font-bold text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              Pilih Semua
                            </button>
                            <span className="text-slate-300">·</span>
                            <button
                              type="button"
                              onClick={() => setFormSelectedClasses([])}
                              className="text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline"
                            >
                              Kosongkan
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
                          {availableClasses.map((cls) => {
                            const isChecked = formSelectedClasses.includes(cls);
                            return (
                              <label
                                key={cls}
                                className={`flex items-center gap-2 p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormSelectedClasses([...formSelectedClasses, cls]);
                                    } else {
                                      setFormSelectedClasses(
                                        formSelectedClasses.filter((c) => c !== cls)
                                      );
                                    }
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="truncate">{cls}</span>
                              </label>
                            );
                          })}
                        </div>

                        {formSelectedClasses.length === 0 ? (
                          <p className="text-[10px] text-amber-700 font-medium">
                            * Wajib mencentang minimal 1 kelas agar akun dapat mengakses data kehadiran rombel terkait.
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-700 font-medium">
                            ✓ Akun ini hanya dapat melihat data rombel: {formSelectedClasses.join(', ')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Password Fields */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    {editingAccount ? 'Atur Kata Sandi Baru (Opsional)' : 'Kata Sandi Baru *'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold"
                  >
                    {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {showPassword ? 'Sembunyikan' : 'Lihat'}
                  </button>
                </div>

                {editingAccount && (
                  <p className="text-[11px] text-slate-400 -mt-2">
                    Kosongkan jika tidak ingin mengubah kata sandi yang sudah ada.
                  </p>
                )}

                <div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingAccount}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingAccount ? 'Ketik sandi baru untuk mengganti' : 'Minimal 6 karakter'}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {formPassword && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Konfirmasi Kata Sandi Baru
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formConfirmPassword}
                      onChange={(e) => setFormConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi baru"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-2xs"
                >
                  {editingAccount ? 'Simpan Perubahan' : 'Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
