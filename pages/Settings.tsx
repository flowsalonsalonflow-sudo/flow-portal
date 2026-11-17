
import React, { useState, useRef, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/apiService';

interface SettingsProps {
  user: User;
  currentBg: string;
  onUpdateBg: (url: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, currentBg, onUpdateBg }) => {
  const [urlInput, setUrlInput] = useState(currentBg);
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // UPDATE PRESET WALLPAPER - Points to your cPanel folder
  const presets = [
    'https://flowsalon.id/background/airplane-1.jpg',
    'https://flowsalon.id/background/airplane-2.jpg',
    'https://flowsalon.id/background/amsterdam.jpg',
    'https://flowsalon.id/background/balloon.jpg',
    'https://flowsalon.id/background/Beach.JPG',
    'https://flowsalon.id/background/Bike-1.JPG',
    'https://flowsalon.id/background/Bike-2.JPG',
    'https://flowsalon.id/background/boat-1.jpg',
    'https://flowsalon.id/background/Boat.JPG',
    'https://flowsalon.id/background/boat-2.jpg',
    'https://flowsalon.id/background/bromo.jpg',
    'https://flowsalon.id/background/california.jpg',
    'https://flowsalon.id/background/Car-1.JPG',
    'https://flowsalon.id/background/Car-2.JPG',
    'https://flowsalon.id/background/Car-3.JPG',
    'https://flowsalon.id/background/Car-4.JPG',
    'https://flowsalon.id/background/Car-5.JPG',
    'https://flowsalon.id/background/Chair.JPG',
    'https://flowsalon.id/background/florida.webp',
    'https://flowsalon.id/background/karang.webp',
    'https://flowsalon.id/background/kyoto-2.jpg',
    'https://flowsalon.id/background/kyoto-3.JPG',
    'https://flowsalon.id/background/kyoto.webp',
    'https://flowsalon.id/background/laut.webp',
    'https://flowsalon.id/background/leaves-1.jpg',
    'https://flowsalon.id/background/lombok.jpg',
    'https://flowsalon.id/background/makah.webp',
    'https://flowsalon.id/background/People-2.JPG',
    'https://flowsalon.id/background/People.JPG',
    'https://flowsalon.id/background/pinus.webp',
    'https://flowsalon.id/background/russia.webp',
    'https://flowsalon.id/background/sawah.webp',
    'https://flowsalon.id/background/Sport-1.JPG',
    'https://flowsalon.id/background/trip.JPG',
    'https://flowsalon.id/background/whale.jpg'
  ].sort((a, b) => {
    const nameA = a.split('/').pop()?.toLowerCase() || '';
    const nameB = b.split('/').pop()?.toLowerCase() || '';
    return nameA.localeCompare(nameB);
  });

  const handleApplyCustomUrl = () => {
    let finalUrl = urlInput.trim();
    if (!finalUrl) return;

    // Jika user ngetik nama file (tanpa http), otomatis arahkan ke folder background Anda
    // Jika tidak ada ekstensi, default ke .webp
    if (!finalUrl.startsWith('http')) {
      if (!finalUrl.includes('.')) {
        finalUrl = `https://flowsalon.id/background/${finalUrl}.webp`;
      } else {
        finalUrl = `https://flowsalon.id/background/${finalUrl}`;
      }
    }

    onUpdateBg(finalUrl);
    alert("Wallpaper berhasil dicoba! Cek Beranda.");
  };

  const allBackgrounds = presets;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass || !confirmPass) {
      alert("Lengkapi semua kolom password.");
      return;
    }
    if (newPass !== confirmPass) {
      alert("Konfirmasi password baru tidak cocok.");
      return;
    }
    
    setIsUpdatingPassword(true);
    try {
      const res = await api.updateProfile({
        email: user.email,
        password: newPass
      });
      if (res && res.status === 'sukses') {
        alert("Password berhasil diperbarui!");
        setNewPass('');
        setConfirmPass('');
      } else {
        alert(res?.message || "Gagal memperbarui password.");
      }
    } catch (err) {
      alert("Terjadi kesalahan koneksi.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-2xl mx-auto pb-20 px-2">
      <header className="px-2 text-left">
        <h2 className="text-3xl font-black text-white tracking-normal">Pengaturan</h2>
        <p className="opacity-40 text-[10px] tracking-[0.4em] uppercase mt-2 font-black italic">Personalisasi Portal</p>
      </header>

      {/* WALLPAPER SETTINGS */}
      <section className="glass-card p-8 !rounded-[3rem] space-y-8 bg-black/40 border border-white/5 text-left">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-white italic">Wallpaper Background</h3>
          
          <div className="space-y-8">
            {/* Presets List - Scrollable */}
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
              {allBackgrounds.map((p, i) => {
                const filename = p.split('/').pop()?.split('.')[0] || `Background ${i+1}`;
                const isActive = currentBg === p;
                
                return (
                  <button 
                    key={i} 
                    onClick={() => { onUpdateBg(p); setUrlInput(p); }} 
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${isActive ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-white/10 shadow-lg">
                      <img src={p} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-xs font-bold capitalize ${isActive ? 'text-emerald-400' : 'text-white/90'}`}>{filename}</p>
                    </div>
                    {isActive && (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] mr-1"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Input Below */}
            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="space-y-2">
                <label className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-1 italic">Link Gambar</label>
                <input 
                  type="text" 
                  value={urlInput} 
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Contoh: https://site.com/bg.jpg" 
                  className="glass-input !h-14 !rounded-xl text-xs placeholder:text-white/20" 
                />
              </div>
              <button 
                onClick={handleApplyCustomUrl}
                className="glass-button w-full !h-14 !rounded-xl active-emerald-tab transition-all"
              >
                SIMPAN WALLPAPER
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PASSWORD SETTINGS */}
      <section className="glass-card p-8 !rounded-[3rem] space-y-10 bg-black/40 border border-white/5 text-left">
        <form onSubmit={handleChangePassword} className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-white italic">Ganti Password</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Password Baru</label>
              <input 
                type="password" 
                value={newPass} 
                onChange={(e) => setNewPass(e.target.value)}
                className="glass-input !h-12 !rounded-xl placeholder:text-white/20" 
                placeholder="Minimal 6 karakter"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Konfirmasi Password Baru</label>
              <input 
                type="password" 
                value={confirmPass} 
                onChange={(e) => setConfirmPass(e.target.value)}
                className="glass-input !h-12 !rounded-xl placeholder:text-white/20" 
                placeholder="Ulangi password baru"
              />
            </div>
          </div>

          <button type="submit" disabled={isUpdatingPassword} className="glass-button w-full !h-14 !rounded-xl active-emerald-tab transition-all">
            {isUpdatingPassword ? 'MENYIMPAN...' : 'SIMPAN PASSWORD BARU'}
          </button>
        </form>
      </section>

      {/* READONLY DATA PRIBADI & KONTAK DARURAT */}
      <section className="glass-card p-8 !rounded-[3rem] space-y-10 bg-black/40 border border-white/5 text-left">
        <div className="space-y-6">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-white italic">Data Pribadi</h3>
          
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Nama Lengkap</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.nama || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Email Aktif</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.email || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Divisi / Jabatan</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.jabatan || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Tempat, Tanggal Lahir</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.ttl || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Alamat Lengkap</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.alamat || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Nomor WhatsApp</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.wa || '-'}</span>
            </div>
          </div>
        </div>

        <div className="space-y-6 pt-4 border-t border-white/10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-white italic">Kontak Darurat</h3>
          
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Nama Keluarga</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.kNama || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">Hubungan</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.kHub || '-'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] opacity-60 uppercase font-black text-white tracking-widest ml-2">No. WA Keluarga</span>
              <span className="text-sm font-medium text-white/90 ml-2">{user.kWa || '-'}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-white/60 italic">Hubungi SPV bila ada data yang ingin dirubah!</p>
        </div>
      </section>

    </div>
  );
};
