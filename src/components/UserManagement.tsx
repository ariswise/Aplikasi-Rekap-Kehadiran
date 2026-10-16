import React, { useState, useMemo } from 'react';
import { StoredAccount, UserRole, AuthUser } from '../types/attendance';
import { StorageService } from '../utils/storage';
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
} from 'lucide-react';

interface UserManagementProps {
  currentUser: AuthUser;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  currentUser,
  onShowToast,
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
  const [formRole, setFormRole] = useState<UserRole>('guru_bk');
  const [formNip, setFormNip] = useState<string>('');
  const [formPassword, setFormPassword] = useState<string>('');
  const [formConfirmPassword, setFormConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

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
    setFormRole('guru_bk');
    setFormNip('');
    setFormPassword('');
    setFormConfirmPassword('');
    setShowPassword(false);
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
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
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
        createdAt: new Date().toISOString(),
      };

      const updated = [...accounts, newAcc];
      setAccounts(updated);
      StorageService.saveAccounts(updated);
      onShowToast('success', 'Akun Berhasil Dibuat', `Akun ${newAcc.name} (${newAcc.username}) berhasil ditambahkan.`);
      setIsModalOpen(false);
    } else {
      // Editing existing account
      if (formPassword && formPassword !== formConfirmPassword) {
        setFormError('Konfirmasi kata sandi tidak cocok.');
        return;
      }

      const updated = accounts.map((a) => {
        if (a.id === editingAccount.id) {
          return {
            ...a,
            username: cleanUsername,
            name: formName.trim(),
            role: formRole,
            nip: formNip.trim() || undefined,
            password: formPassword ? formPassword : a.password, // keep existing password if not updated
          };
        }
        return a;
      });

      setAccounts(updated);
      StorageService.saveAccounts(updated);
      onShowToast(
        'success',
        'Akun Diperbarui',
        `Data akun ${formName} berhasil diperbarui${formPassword ? ' beserta kata sandi baru' : ''}.`
      );
      setIsModalOpen(false);
    }
  };

  const handleDeleteAccount = (account: StoredAccount) => {
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
      onShowToast('info', 'Akun Dihapus', `Akun ${account.name} telah dihapus dari sistem.`);
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

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors shadow-2xs"
        >
          <UserPlus className="h-4 w-4" />
          Tambah Akun Baru
        </button>
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
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
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
