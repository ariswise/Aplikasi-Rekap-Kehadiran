import React, { useState, useRef } from 'react';
import { KopConfig, SchoolConfig } from '../types/attendance';
import { DEFAULT_KOP_CONFIG, DEFAULT_LOGO_SVG } from '../utils/storage';
import {
  Upload,
  Image as ImageIcon,
  Sliders,
  FileText,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  Check,
  RotateCcw,
  Trash2,
  X,
  Sparkles,
  Save,
  PenTool,
} from 'lucide-react';

interface KopConfigDrawerProps {
  currentKop: KopConfig;
  schoolConfig: SchoolConfig;
  onUpdateKop: (updated: KopConfig) => void;
  onSaveAsDefault: (updated: KopConfig) => void;
  onClose: () => void;
}

export const KopConfigDrawer: React.FC<KopConfigDrawerProps> = ({
  currentKop,
  schoolConfig,
  onUpdateKop,
  onSaveAsDefault,
  onClose,
}) => {
  const [kop, setKop] = useState<KopConfig>({ ...currentKop });
  const [activeTab, setActiveTab] = useState<'logo' | 'teks' | 'layout'>('logo');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const mainLogoInputRef = useRef<HTMLInputElement | null>(null);
  const secondaryLogoInputRef = useRef<HTMLInputElement | null>(null);

  const handleChange = <K extends keyof KopConfig>(key: K, value: KopConfig[K]) => {
    const updated = { ...kop, [key]: value };
    setKop(updated);
    onUpdateKop(updated);
  };

  // Upload main logo
  const handleUploadMainLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleChange('logoUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Upload secondary right logo
  const handleUploadRightLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleChange('logoRightUrl', dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleUseDefaultLogo = () => {
    handleChange('logoUrl', DEFAULT_LOGO_SVG);
  };

  const handleResetToDefault = () => {
    setKop(DEFAULT_KOP_CONFIG);
    onUpdateKop(DEFAULT_KOP_CONFIG);
  };

  const handleSaveDefault = () => {
    onSaveAsDefault(kop);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-lg mb-6">
      {/* Header of Drawer */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            Pengaturan Kop Sekolah & Tata Letak Cetak
          </h3>
          {savedSuccess && (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
              <Check className="h-3 w-3" /> Tersimpan Permanen
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveDefault}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
          >
            <Save className="h-3.5 w-3.5" />
            Simpan Sebagai Bawaan
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            title="Tutup Pengaturan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 mt-3 gap-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('logo')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'logo'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          Logo & Posisi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('teks')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'teks'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Teks & Garis Kop
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('layout')}
          className={`flex items-center gap-1.5 py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'layout'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <PenTool className="h-3.5 w-3.5" />
          Kertas & Tanda Tangan
        </button>
      </div>

      {/* Tab Content */}
      <div className="py-4">
        {/* TAB 1: LOGO */}
        {activeTab === 'logo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Main Logo Upload */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Logo Utama Sekolah
              </label>

              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-1 shrink-0">
                  {kop.logoUrl ? (
                    <img
                      src={kop.logoUrl}
                      alt="Pratinjau Logo"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-300" />
                  )}
                </div>

                <div className="space-y-1.5">
                  <input
                    ref={mainLogoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadMainLogo}
                    className="hidden"
                    id="upload-main-logo-input"
                  />
                  <label
                    htmlFor="upload-main-logo-input"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Pilih Berkas Logo
                  </label>

                  <div>
                    <button
                      type="button"
                      onClick={handleUseDefaultLogo}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline block"
                    >
                      Gunakan Logo Bawaan Pendidikan
                    </button>
                  </div>
                </div>
              </div>

              {/* Logo Position */}
              <div className="pt-2">
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Posisi Penempatan Logo
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { id: 'left', label: 'Kiri Saja' },
                    { id: 'left_right', label: 'Kiri & Kanan' },
                    { id: 'center', label: 'Tengah' },
                    { id: 'none', label: 'Tanpa Logo' },
                  ].map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => handleChange('logoPosition', pos.id as KopConfig['logoPosition'])}
                      className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                        kop.logoPosition === pos.id
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Logo Width Slider */}
              <div className="pt-2">
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Ukuran Logo: {kop.logoWidth || 70}px</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="110"
                  step="5"
                  value={kop.logoWidth || 70}
                  onChange={(e) => handleChange('logoWidth', parseInt(e.target.value, 10))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            {/* Secondary Logo (Kanan) */}
            <div className="space-y-3 border-t md:border-t-0 md:border-l border-slate-200 md:pl-5">
              <label className="text-xs font-bold text-slate-700 block">
                Logo Tambahan / Kanan (Opsional)
              </label>
              <p className="text-[11px] text-slate-500">
                Cocok untuk lambang Pemerintah Daerah, Lambang Kemenag, atau Yayasan di sisi kanan Kop.
              </p>

              <div className="flex items-center gap-3">
                <div className="h-16 w-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden p-1 shrink-0">
                  {kop.logoRightUrl ? (
                    <img
                      src={kop.logoRightUrl}
                      alt="Logo Kanan"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-300 text-center">Kosong</span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <input
                    ref={secondaryLogoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleUploadRightLogo}
                    className="hidden"
                    id="upload-right-logo-input"
                  />
                  <label
                    htmlFor="upload-right-logo-input"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                  >
                    <Upload className="h-3.5 w-3.5 text-slate-500" />
                    Pilih Logo Kanan
                  </label>

                  {kop.logoRightUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange('logoRightUrl', '')}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Hapus Logo Kanan
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TEKS KOP */}
        {activeTab === 'teks' && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-900">
                <input
                  type="checkbox"
                  checked={kop.showKop}
                  onChange={(e) => handleChange('showKop', e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Tampilkan Kop Surat Resmi Saat Dicetak
              </label>
              <span className="text-[11px] text-slate-400">
                (Nonaktifkan jika menggunakan kertas formulir yang sudah berkop)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Instansi Induk (Baris 1 & 2)
                </label>
                <textarea
                  rows={2}
                  value={kop.parentAgency}
                  onChange={(e) => handleChange('parentAgency', e.target.value)}
                  placeholder="PEMERINTAH PROVINSI...&#10;DINAS PENDIDIKAN"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cabang Dinas / Suku Dinas / Wilayah
                </label>
                <input
                  type="text"
                  value={kop.subAgency || ''}
                  onChange={(e) => handleChange('subAgency', e.target.value)}
                  placeholder="SUKU DINAS PENDIDIKAN WILAYAH I"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nama Satuan Pendidikan *
                </label>
                <input
                  type="text"
                  value={kop.schoolName}
                  onChange={(e) => handleChange('schoolName', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Sub-Judul (NPSN / Akreditasi)
                </label>
                <input
                  type="text"
                  value={kop.subTitle}
                  onChange={(e) => handleChange('subTitle', e.target.value)}
                  placeholder="TERAKREDITASI A · NPSN: 20108976"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Alamat Lengkap Sekolah (Jalan, RT/RW, Kelurahan/Kecamatan)
                </label>
                <input
                  type="text"
                  value={kop.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Jl. Pendidikan Merdeka No. 45, Kompleks Pelajar"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kode Pos Sekolah
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kop.postalCode ?? ''}
                    onChange={(e) => handleChange('postalCode', e.target.value)}
                    placeholder="Contoh: 12340 (atau kosongkan)"
                    maxLength={10}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none pr-14"
                  />
                  {kop.postalCode && (
                    <button
                      type="button"
                      onClick={() => handleChange('postalCode', '')}
                      title="Kosongkan kode pos"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 px-1.5 py-0.5 text-[10px] font-semibold transition-colors"
                    >
                      Hapus
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  {kop.postalCode?.trim()
                    ? `Akan tercetak sebagai "· Kode Pos ${kop.postalCode.trim()}" di bawah nama sekolah.`
                    : 'Kosongkan jika tidak ingin mencantumkan kode pos pada kop surat.'}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Kontak (Telepon, Pos-el / Email, Laman Web)
                </label>
                <input
                  type="text"
                  value={kop.contactInfo}
                  onChange={(e) => handleChange('contactInfo', e.target.value)}
                  placeholder="Telp: (021) 7891234 · Pos-el: info@sekolah.sch.id · Laman: www.sekolah.sch.id"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Line Style */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Garis Pembatas Kop Surat
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'double', label: 'Garis Ganda (Resmi Dinas)' },
                  { id: 'bold', label: 'Garis Tunggal Tebal' },
                  { id: 'single', label: 'Garis Tipis' },
                  { id: 'none', label: 'Tanpa Garis' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleChange('lineStyle', item.id as KopConfig['lineStyle'])}
                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-colors ${
                      kop.lineStyle === item.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LAYOUT KERTAS & TANDA TANGAN */}
        {activeTab === 'layout' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ukuran Kertas Dokumen
                </label>
                <select
                  value={kop.paperSize || 'A4'}
                  onChange={(e) => handleChange('paperSize', e.target.value as KopConfig['paperSize'])}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="A4">A4 (210 × 297 mm)</option>
                  <option value="F4">F4 / Folio (215 × 330 mm)</option>
                  <option value="Legal">Legal (216 × 356 mm)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Orientasi Cetak
                </label>
                <select
                  value={kop.orientation || 'portrait'}
                  onChange={(e) => handleChange('orientation', e.target.value as KopConfig['orientation'])}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="portrait">Potret (Vertikal)</option>
                  <option value="landscape">Lanskap (Horizontal - Cocok untuk Rekap Bulanan)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Kerapatan Huruf / Skala
                </label>
                <select
                  value={kop.fontSize || 'normal'}
                  onChange={(e) => handleChange('fontSize', e.target.value as KopConfig['fontSize'])}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs font-semibold text-slate-900 focus:outline-none"
                >
                  <option value="compact">Kompak (Font kecil, muat banyak siswa)</option>
                  <option value="normal">Standar (Optimal & nyaman dibaca)</option>
                  <option value="spacious">Luas (Font lebih renggang)</option>
                </select>
              </div>
            </div>

            {/* Signature Options */}
            <div className="pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-800 block mb-2">
                Pengaturan Penandatangan Dokumen
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Kota Tempat Penandatanganan
                  </label>
                  <input
                    type="text"
                    value={kop.signCity || schoolConfig.city}
                    onChange={(e) => handleChange('signCity', e.target.value)}
                    placeholder="Jakarta Selatan"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tanggal Tanda Tangan Kustom (Opsional)
                  </label>
                  <input
                    type="text"
                    value={kop.signDate || ''}
                    onChange={(e) => handleChange('signDate', e.target.value)}
                    placeholder="Kosongkan untuk otomatis tanggal hari ini"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kop.showHeadmasterSign}
                    onChange={(e) => handleChange('showHeadmasterSign', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Tanda Tangan Kepala Sekolah
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kop.showHomeroomSign}
                    onChange={(e) => handleChange('showHomeroomSign', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Tanda Tangan Wali Kelas
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={kop.showCounselorSign}
                    onChange={(e) => handleChange('showCounselorSign', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Tanda Tangan Guru BK
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
