
import React, { useState, useRef } from 'react';
import { api } from '../services/apiService';
import { User } from '../types';

interface LoginProps {
  onLogin: (u: User) => void;
}

// Helper component for Input with Label
const InputGroup = ({ label, type = "text", value, onChange, placeholder, required = true }: any) => (
  <div className="space-y-2 text-left w-full">
    <label className="text-xs opacity-60 ml-2 font-medium text-white">{label}</label>
    <input 
      type={type} 
      required={required} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Isi kolom ini')}
      onInput={e => (e.target as HTMLInputElement).setCustomValidity('')}
      className="glass-input h-12 !rounded-xl !text-sm placeholder:text-white/40" 
    />
  </div>
);

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  
  // Notification State
  const [notification, setNotification] = useState<{ msg: string, type: 'success' | 'error' } | null>(null);
  
  // Login State
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  
  // Signup State
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [ttl, setTtl] = useState('');
  const [alamat, setAlamat] = useState('');
  const [wa, setWa] = useState('');
  const [fotoKTP, setFotoKTP] = useState<string | null>(null);
  const [kNama, setKNama] = useState('');
  const [kHub, setKHub] = useState('');
  const [kWa, setKWa] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string, type: 'success' | 'error', autoHide: boolean = true) => {
    setNotification({ msg, type });
    if (autoHide) {
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const compressImage = (base64: string, quality: number = 0.5): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showNotification("File terlalu besar, maksimal 10MB.", 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFotoKTP(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleForgotPassword = async (e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    setNotification(null);

    if (!email || !email.trim()) {
      showNotification("Masukkan email pada kolom dibawah, lalu klik Lupa Password.", 'error', false);
      return;
    }
    
    setIsResetting(true);
    try {
      const res = await api.forgotPassword(email.trim());
      if (res && res.status === 'sukses') {
        showNotification(res.message || "Password telah dikirim ke emailmu.", 'success');
      } else {
        showNotification(res.message || "Masukkan email yang terdaftar.", 'error');
      }
    } catch (e) {
      showNotification("Terjadi kesalahan koneksi.", 'error');
    } finally {
      setIsResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotification(null);
    
    if (isSignup) {
      if (!nama.trim() || !email.trim() || !pass.trim() || !alamat.trim() || !wa.trim() || !ttl.trim() || !fotoKTP || !kNama.trim() || !kHub.trim() || !kWa.trim() || !jabatan) {
        showNotification("Mohon lengkapi seluruh formulir pendaftaran.", 'error');
        return;
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showNotification("Email yang kamu masukin tidak aktif, masukkan email yang benar!", 'error');
        return;
      }

      if (pass.length < 6) {
        showNotification("Password minimal 6 karakter.", 'error');
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignup) {
        const res = await api.signup({
          nama, email: email.trim(), password: pass, jabatan, ttl, alamat, wa, fotoKTP,
          k_nama: kNama, k_hub: kHub, k_wa: kWa
        });
        if (res.status === 'sukses') {
          showNotification("Pendaftaran Berhasil! Silakan masuk.", 'success');
          setIsSignup(false);
        } else {
          showNotification(res.message || "Gagal mendaftar.", 'error');
        }
      } else {
        const res = await api.login(email.trim(), pass);
        if (res && res.status === 'sukses') {
          onLogin({ 
            id_pegawai: res.id_pegawai || res.id_pos || res.idPegawai || res.idpos || "",
            id_pos: res.id_pos || res.id_pegawai || "",
            nama: res.nama || res.Nama, 
            email: res.email || res.Email, 
            jabatan: res.jabatan || res.Jabatan, 
            jamKhusus: res.jamKhusus || "",
            ttl: res.ttl || "",
            alamat: res.alamat || "",
            wa: res.wa || "",
            kNama: res.kNama || "",
            kHub: res.kHub || "",
            kWa: res.kWa || "",
            joinDate: res.joinDate || res.join_date || res.Join_Date || res.masuk_tgl || res.Masuk_Tgl || res.timestamp || res.Timestamp || "",
            timestamp: res.timestamp || res.Timestamp || res.joinDate || res.join_date || "",
            keluar_tgl: res.keluar_tgl || res.Keluar_Tgl || res.resign_date || ""
          });
        } else {
          showNotification(res?.message || "Email atau Kata Sandi salah.", 'error');
        }
      }
    } catch (err) {
      showNotification("Kesalahan koneksi.", 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-start px-6 pt-12 pb-24 bg-transparent overflow-y-auto">
      <div className="fixed-bg" style={{ backgroundImage: `url('https://flowsalon.id/background/boat-1.jpg')` }} />
      
      <div className="w-full max-w-md text-center space-y-10 relative z-10">
        <header className="space-y-4 flex flex-col items-center mb-6">
          <div className="w-36 h-36 flex items-center justify-center p-1 glass-card !rounded-[2.5rem] shadow-2xl overflow-hidden mb-2">
             <img src="icon-192.png" alt="Flow Icon" className="w-full h-full object-cover rounded-[2.2rem]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-medium text-white">
              {isSignup ? "Daftar Akun Baru" : "Masuk Ke Portal"}
            </h2>
            <p className="text-xs font-medium text-white/60 italic">Employee Portal</p>
          </div>
        </header>

        {notification && (
          <div className={`w-full p-4 rounded-xl border flex items-center gap-3 animate-in slide-in-from-top duration-300 ${
            notification.type === 'success' 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
              : 'bg-red-500/20 border-red-500/40 text-red-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <p className="text-sm font-medium text-left flex-1">{notification.msg}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isSignup ? (
            <div className="glass-card p-10 !rounded-[3rem] space-y-8">
              <div className="space-y-6">
                <div className="space-y-2 text-left">
                  <label className="text-xs opacity-60 ml-2 font-medium text-white">Email</label>
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)} onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Isi kolom ini')} onInput={e => (e.target as HTMLInputElement).setCustomValidity('')} placeholder="nama@flowsalon.id" className="glass-input h-14 !rounded-xl placeholder:text-white/40" />
                </div>
                <div className="space-y-2 text-left relative">
                  <label className="text-xs opacity-60 ml-2 font-medium text-white">Kata Sandi</label>
                  <input type="password" required value={pass} onChange={e => setPass(e.target.value)} onInvalid={e => (e.target as HTMLInputElement).setCustomValidity('Isi kolom ini')} onInput={e => (e.target as HTMLInputElement).setCustomValidity('')} placeholder="••••••••" className="glass-input h-14 !rounded-xl placeholder:text-white/40" />
                  
                  <div className="text-right pt-2 relative z-20">
                    <button 
                      type="button" 
                      onClick={handleForgotPassword} 
                      disabled={isResetting}
                      className="text-xs font-medium text-white/60 hover:text-white transition-colors disabled:opacity-30 cursor-pointer p-1"
                    >
                      {isResetting ? "Mengirim..." : "Lupa Password?"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
             <div className="space-y-6">
               {/* SECTION DATA DIRI */}
               <div className="glass-card p-8 !rounded-[3rem] space-y-6 text-left">
                  <div className="flex flex-col items-center gap-2 px-2 mb-4 pt-2">
                    <div className="flex items-center gap-4 w-full">
                      <div className="h-[1px] flex-1 bg-emerald-500/30"></div>
                      <span className="text-base font-bold text-emerald-400 tracking-wider uppercase">Data Diri</span>
                      <div className="h-[1px] flex-1 bg-emerald-500/30"></div>
                    </div>
                    <p className="text-xs text-white/70 italic text-center w-full">Isi semua kolom dibawah dengan benar.</p>
                  </div>
                  
                  <div className="space-y-5">
                    <InputGroup label="Nama Lengkap (Wajib)" value={nama} onChange={(e: any) => setNama(e.target.value)} placeholder="Contoh: Aisyah Segaf" />
                    <InputGroup label="Tempat, Tanggal Lahir (Wajib)" value={ttl} onChange={(e: any) => setTtl(e.target.value)} placeholder="Cilegon, 17 Agustus 2000" />
                    <InputGroup label="Alamat Lengkap (Wajib)" value={alamat} onChange={(e: any) => setAlamat(e.target.value)} placeholder="Contoh: Jl Merdeka No.1, Cilegon" />
                    <InputGroup label="Nomor WhatsApp (Wajib)" type="tel" value={wa} onChange={(e: any) => setWa(e.target.value)} placeholder="0812xxxxxxxx" />
                    <InputGroup label="Email Aktif (Wajib)" type="email" value={email} onChange={(e: any) => setEmail(e.target.value)} placeholder="aisyah@gmail.com" />
                    <InputGroup label="Buat Password (Wajib)" type="password" value={pass} onChange={(e: any) => setPass(e.target.value)} placeholder="Minimal 6 karakter" />
                    
                    <div className="space-y-2 text-left w-full">
                      <label className="text-xs opacity-60 ml-2 font-medium text-white">Divisi / Jabatan (Wajib)</label>
                      <select required value={jabatan} onChange={e => setJabatan(e.target.value)} onInvalid={e => (e.target as HTMLSelectElement).setCustomValidity('Isi kolom ini')} onInput={e => (e.target as HTMLSelectElement).setCustomValidity('')} className="glass-input h-12 !rounded-xl !px-4 !text-sm">
                        <option value="">-- Pilih Posisi --</option>
                        <option value="Stylist">Stylist</option>
                        <option value="Therapist">Therapist</option>
                        <option value="Kasir">Kasir</option>
                        <option value="Training">Training</option>
                        <option value="PKL">PKL</option>
                        <option value="Manager">Manager</option>
                      </select>
                    </div>

                    <div className="space-y-2 text-left w-full pt-2">
                      <label className="text-xs opacity-60 ml-2 font-medium text-white">Foto Identitas (KTP) (Wajib)</label>
                      <div onClick={() => fileInputRef.current?.click()} className="w-full h-14 border border-dashed border-white/20 rounded-xl flex items-center justify-center cursor-pointer bg-white/5 active:scale-95 transition-all hover:bg-white/10">
                        <p className="text-xs font-medium">{fotoKTP ? "✓ Foto Tersimpan" : "Unggah File"}</p>
                      </div>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </div>
                  </div>
               </div>

               {/* SECTION KONTAK DARURAT */}
               <div className="glass-card p-8 !rounded-[3rem] space-y-6 text-left">
                  <div className="flex flex-col items-center gap-2 px-2 mb-4 pt-2">
                    <div className="flex items-center gap-4 w-full">
                      <div className="h-[1px] flex-1 bg-emerald-500/30"></div>
                      <span className="text-base font-bold text-emerald-400 tracking-wider uppercase">Kontak Darurat</span>
                      <div className="h-[1px] flex-1 bg-emerald-500/30"></div>
                    </div>
                    <p className="text-xs text-white/70 italic text-center w-full">Penting untuk kebutuhan darurat seperti sakit.</p>
                  </div>
                  <div className="space-y-5">
                    <InputGroup label="Nama Keluarga (Wajib)" value={kNama} onChange={(e: any) => setKNama(e.target.value)} placeholder="Contoh: Siti Aminah" />
                    <InputGroup label="Hubungan (Wajib)" value={kHub} onChange={(e: any) => setKHub(e.target.value)} placeholder="Contoh: Ibu Kandung" />
                    <InputGroup label="No. WA Keluarga (Wajib)" type="tel" value={kWa} onChange={(e: any) => setKWa(e.target.value)} placeholder="0812xxxxxxxx" />
                  </div>
               </div>
             </div>
          )}
          
          <button type="submit" className="glass-button h-16 w-full active-emerald-tab !rounded-2xl shadow-xl">
            {loading ? "Memproses..." : (isSignup ? "Konfirmasi Pendaftaran" : "Masuk Ke Portal")}
          </button>
        </form>
        
        <button onClick={() => { setIsSignup(!isSignup); window.scrollTo(0,0); }} className="text-xs font-medium text-white/60 pt-4 hover:text-white">
          {isSignup ? "Sudah terdaftar? Silakan Login" : "Belum punya akses? Daftar Akun"}
        </button>
      </div>
    </div>
  );
};
