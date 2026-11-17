
import React, { useState, useEffect } from 'react';
import { searchSOP } from '../services/geminiService';
import { User, SOPItem } from '../types';

interface KBProps {
  user: User;
  sopData: SOPItem[];
  onToggleFocus: (isFocus: boolean) => void;
}

export const KnowledgeBase: React.FC<KBProps> = ({ user, sopData, onToggleFocus }) => {
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedSop, setSelectedSop] = useState<SOPItem | null>(null);
  
  // State untuk checklist sementara (Set berisi index langkah yang dicentang)
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const isFocusMode = showAiModal || selectedSop !== null;

  useEffect(() => { onToggleFocus(isFocusMode); }, [isFocusMode, onToggleFocus]);

  // Reset checklist setiap kali membuka SOP baru
  useEffect(() => {
    if (selectedSop) {
      setCheckedSteps(new Set());
    }
  }, [selectedSop]);

  // Fungsi toggle checklist
  const toggleStep = (index: number) => {
    setCheckedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const userJabatan = (user.jabatan || '').toLowerCase().trim();
  const userRoles = user.jabatan ? user.jabatan.split(',').map(role => role.trim()) : [];
  
  // 1. FILTER DULU SOP BERDASARKAN JABATAN USER (STRICT)
  const allowedSopData = sopData.filter(sop => {
    const category = (sop.category || '').toLowerCase().trim();
    if (userJabatan === 'manager') return true;
    const userRolesLower = userRoles.map(r => r.toLowerCase());
    return userRolesLower.includes(category);
  });

  const availableCategories = ['All', ...Array.from(new Set(allowedSopData.map(s => s.category || ''))).filter(Boolean)];

  const filteredSopData = allowedSopData.filter(sop => {
    const category = (sop.category || '').toLowerCase().trim();
    if (selectedCategory !== 'All' && category !== selectedCategory.toLowerCase()) {
      return false;
    }
    return true;
  }).sort((a, b) => (a.title || '').localeCompare(b.title || ''));

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true); setShowAiModal(true); setAiResponse(null);
    try {
      const result = await searchSOP(query, filteredSopData);
      setAiResponse(result);
    } catch (err) { setAiResponse("Gagal memuat jawaban."); }
    finally { setIsLoading(false); }
  };

  // --- FUNGSI FORMATTING TEXT BARU ---
  const renderAiText = (text: string) => {
    // Bersihkan tanda kutip jika ada di awal/akhir
    const cleanText = text.replace(/^"|"$/g, '');
    const lines = cleanText.split('\n');

    return (
      <div className="space-y-3">
        {lines.map((line, index) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return null;

          // Fungsi untuk mengubah **teks** menjadi Bold berwarna
          const processFormatting = (str: string) => {
             // Regex untuk menangkap **bold** dan *italic*
             const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
             return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                   // Render BOLD
                   return <span key={i} className="text-emerald-400 font-medium">{part.slice(2, -2)}</span>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                   // Render ITALIC
                   return <span key={i} className="italic text-emerald-200 font-normal">{part.slice(1, -1)}</span>;
                }
                return part;
             });
          };

          // A. Handle List Item (Bullet Points)
          if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || /^\d+\./.test(trimmedLine)) {
            const content = trimmedLine.replace(/^[•-\d\.]+\s*/, '');
            return (
              <div key={index} className="flex gap-3 items-start pl-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="text-white/90 text-sm font-normal leading-relaxed tracking-wide">
                  {processFormatting(content)}
                </p>
              </div>
            );
          }

          // B. Handle Header (Markdown #)
          if (trimmedLine.startsWith('#')) {
             const content = trimmedLine.replace(/^#+\s*/, '');
             return (
               <h4 key={index} className="text-lg font-medium text-white pt-4 pb-2 border-b border-white/10 mb-2 mt-2">
                 {processFormatting(content)}
               </h4>
             );
          }

          // C. Paragraph Biasa
          return (
            <p key={index} className="text-white/80 text-sm font-normal leading-relaxed">
              {processFormatting(trimmedLine)}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20 max-w-3xl mx-auto px-2">
      {!isFocusMode && (
        <>
          <header className="px-2 text-left">
            <h2 className="text-3xl font-medium text-white tracking-normal">Standar Kerja</h2>
            <p className="text-emerald-glow font-medium text-[10px] uppercase tracking-[0.4em] mt-2 italic">SOP Prosedur</p>
          </header>

          <div className="space-y-2 text-left px-2">
            <label className="text-[10px] opacity-40 uppercase ml-4 font-medium text-white tracking-widest italic">Pencarian AI Operasional</label>
            <form onSubmit={handleSearch} className="relative group">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tanya SOP..." className="glass-input h-16 !pr-36 w-full !rounded-2xl" />
              <button type="submit" disabled={isLoading} className="absolute right-2 top-2 bottom-2 glass-button !h-auto px-6 !rounded-xl bg-emerald-400 text-white font-medium !tracking-normal">
                {isLoading ? "..." : "TANYA AI"}
              </button>
            </form>
          </div>

          <div className="space-y-4 text-left px-2">
            <div className="flex items-center justify-between ml-4 mr-2">
              <label className="text-[10px] opacity-40 uppercase font-medium text-white tracking-widest italic">Prosedur {user.jabatan}</label>
            </div>
            
            {availableCategories.length > 2 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {availableCategories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-medium tracking-widest transition-all ${
                      selectedCategory === cat 
                        ? 'bg-emerald-400 text-white shadow-[0_0_15px_rgba(52,211,153,0.4)]' 
                        : 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-glow'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {filteredSopData.length > 0 ? filteredSopData.map((sop) => (
                <button 
                  key={sop.id} 
                  onClick={() => setSelectedSop(sop)} 
                  className="glass-card p-6 !rounded-3xl flex items-center justify-between text-left active:scale-[0.98] transition-all min-h-[100px]"
                >
                  <div className="space-y-2 overflow-hidden pr-4 flex-1">
                    <span className="px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-[8px] text-emerald-glow uppercase font-medium tracking-widest inline-block">
                      {sop.category}
                    </span>
                    <h4 className="text-base font-medium text-white tracking-tight leading-snug line-clamp-2">
                      {sop.title}
                    </h4>
                  </div>
                  <div className="shrink-0 opacity-20">
                    <svg width="32" height="12" viewBox="0 0 32 12" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 6H31M31 6L26 1M31 6L26 11" />
                    </svg>
                  </div>
                </button>
              )) : (
                <div className="py-20 text-center opacity-30 text-[10px] font-medium uppercase tracking-widest">
                  BELUM ADA SOP KHUSUS {user.jabatan.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* MODAL AI RESPONSE */}
      {showAiModal && (
        <div className="fixed inset-0 z-[1000] px-6 py-12 overflow-y-auto animate-in fade-in">
          <div className="max-w-2xl w-full mx-auto space-y-6">
            <div className="glass-card p-10 !rounded-[3.5rem] text-left shadow-3xl">
              <h3 className="text-xl font-medium text-white uppercase tracking-widest italic mb-8">AI Operasional</h3>
              <div className="text-white/90">
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-white/5 w-3/4 rounded-full" />
                    <div className="h-4 bg-white/5 w-full rounded-full" />
                    <div className="h-4 bg-white/5 w-5/6 rounded-full" />
                  </div>
                ) : aiResponse && renderAiText(aiResponse)}
              </div>
            </div>
            <button onClick={() => { setShowAiModal(false); setAiResponse(null); setQuery(''); }} className="glass-button h-16 w-full active-emerald-tab !rounded-2xl font-medium tracking-[0.4em]">TUTUP JAWABAN</button>
          </div>
        </div>
      )}

      {/* RINCIAN SOP */}
      {selectedSop && (
        <div className="fixed inset-0 z-[1000] px-6 py-12 overflow-y-auto animate-in fade-in">
          <div className="max-w-2xl w-full mx-auto space-y-6">
            <div className="glass-card p-10 !rounded-[3.5rem] text-left">
              <span className="px-4 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-[9px] font-medium text-emerald-glow uppercase tracking-widest mb-6 inline-block">{selectedSop.category}</span>
              <h3 className="text-2xl font-medium text-white tracking-normal mb-8 leading-tight">{selectedSop.title}</h3>

              {selectedSop.tips && (
                <div className="mb-10 p-8 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/15 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12">
                     <svg width="100" height="100" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                  </div>
                  <p className="text-[12px] font-medium text-emerald-400 uppercase tracking-[0.3em] mb-4 drop-shadow-md">GOAL</p>
                  <p className="text-xl font-medium text-white italic leading-relaxed tracking-wide">"{selectedSop.tips}"</p>
                </div>
              )}
              
              <div className="space-y-4">
                {selectedSop.steps.map((step, i) => {
                  const isChecked = checkedSteps.has(i);
                  return (
                    <button 
                      key={i} 
                      onClick={() => toggleStep(i)}
                      className={`w-full flex gap-5 items-start p-6 rounded-[2.5rem] border transition-all text-left group active:scale-[0.98] shadow-xl ${isChecked ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/8 border-white/10 hover:bg-white/15'}`}
                    >
                      {/* 
                         NOMOR INVERTED:
                         - Belum Check: Background Emerald Full, Teks Putih
                         - Sudah Check: Background Glass (Transparan), Centang Emerald
                       */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-medium text-xs shrink-0 transition-colors ${isChecked ? 'bg-white/10 text-emerald-400' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'}`}>
                        {isChecked ? (
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                             <polyline points="20 6 9 17 4 12"></polyline>
                           </svg>
                        ) : i + 1}
                      </div>
                      
                      <p className={`text-[15px] pt-1 leading-relaxed transition-opacity font-normal ${isChecked ? 'text-white/40 line-through decoration-emerald-500/50' : 'text-white'}`}>
                        {step}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
            <button onClick={() => setSelectedSop(null)} className="glass-button h-16 w-full active-emerald-tab !rounded-2xl font-medium tracking-[0.4em]">KEMBALI</button>
          </div>
        </div>
      )}
    </div>
  );
};
