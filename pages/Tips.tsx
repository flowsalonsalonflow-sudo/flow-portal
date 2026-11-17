
import React, { useState, useEffect } from 'react';
import { askAI } from '../services/geminiService';
import { User } from '../types';

interface TipsProps {
  user: User;
  tipsData: any[];
  onToggleFocus: (isFocus: boolean) => void;
}

export const Tips: React.FC<TipsProps> = ({ user, tipsData, onToggleFocus }) => {
  const [selectedTip, setSelectedTip] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const isFocusMode = selectedTip !== null || showAiModal;

  useEffect(() => { onToggleFocus(isFocusMode); }, [isFocusMode, onToggleFocus]);

  const defaultTips = [
    { judul: "Customer Magic Words", isi: "Gunakan kata 'Tentu dengan senang hati' daripada 'Bisa'.", kategori: "Service" },
    { judul: "Up-Selling Strategy", isi: "Tawarkan vitamin rambut setelah keramas.", kategori: "Marketing" },
    { judul: "Greeting Excellence", isi: "Sambut tamu dalam 3 detik pertama saat mereka memasuki pintu.", kategori: "Etika" },
    { judul: "Cleanliness First", isi: "Pastikan meja kerja bersih sebelum tamu berikutnya duduk.", kategori: "Operasional" }
  ];

  const data = Array.isArray(tipsData) && tipsData.length > 0 ? tipsData : defaultTips;

  const userJabatan = (user.jabatan || '').toLowerCase().trim();
  const userRoles = user.jabatan ? user.jabatan.split(',').map(role => role.trim()) : [];

  const availableCategories = ['All', ...Array.from(new Set(data.map(t => t.kategori || 'General'))).filter(Boolean)];

  const filteredData = data.filter(tip => {
    const category = (tip.kategori || 'General').toLowerCase().trim();
    
    // Check selected category filter
    if (selectedCategory !== 'All' && category !== selectedCategory.toLowerCase()) {
      return false;
    }

    return true;
  }).sort((a, b) => (a.judul || '').localeCompare(b.judul || ''));

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsLoading(true); setShowAiModal(true); setAiResponse(null);
    try {
      const result = await askAI(query, data, 'Tips');
      setAiResponse(result);
    } catch (err) { setAiResponse("Terjadi kesalahan teknis."); }
    finally { setIsLoading(false); }
  };

  // --- FUNGSI FORMATTING TEXT BARU ---
  const renderAiText = (text: string) => {
    const cleanText = text.replace(/^"|"$/g, '');
    const lines = cleanText.split('\n');

    return (
      <div className="space-y-3">
        {lines.map((line, index) => {
          const trimmedLine = line.trim();
          if (!trimmedLine) return null;

          const processFormatting = (str: string) => {
             const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
             return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                   return <span key={i} className="text-emerald-400 font-medium">{part.slice(2, -2)}</span>;
                }
                if (part.startsWith('*') && part.endsWith('*')) {
                   return <span key={i} className="italic text-emerald-200 font-normal">{part.slice(1, -1)}</span>;
                }
                return part;
             });
          };

          if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || /^\d+\./.test(trimmedLine)) {
            const content = trimmedLine.replace(/^[•-\d\.]+\s*/, '');
            return (
              <div key={index} className="flex gap-3 items-start pl-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-2 shrink-0 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <p className="text-white/90 text-sm font-normal leading-relaxed tracking-wide">{processFormatting(content)}</p>
              </div>
            );
          }
          
          if (trimmedLine.startsWith('#')) {
             const content = trimmedLine.replace(/^#+\s*/, '');
             return (
               <h4 key={index} className="text-lg font-black text-white pt-4 pb-2 border-b border-white/10 mb-2 mt-2">
                 {processFormatting(content)}
               </h4>
             );
          }

          return <p key={index} className="text-white/80 text-sm font-normal leading-relaxed">{processFormatting(trimmedLine)}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700 max-w-lg mx-auto pb-24 px-2">
      {!isFocusMode && (
        <>
          <header className="px-2 text-left">
            <h2 className="text-3xl font-medium text-white tracking-normal">Tips Performa</h2>
            <p className="text-emerald-glow text-[11px] tracking-[0.4em] uppercase mt-2 italic font-medium">Flow Team Success Guide</p>
          </header>

          <div className="space-y-2 text-left px-2">
            <label className="text-[10px] opacity-40 uppercase ml-4 font-medium text-white tracking-widest italic">Pencarian AI Tips</label>
            <form onSubmit={handleSearch} className="relative group">
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ada Tips?" className="glass-input h-16 !pr-36 w-full !rounded-2xl" />
              <button type="submit" disabled={isLoading} className="absolute right-2 top-2 bottom-2 glass-button !h-auto px-6 !rounded-xl bg-emerald-400 text-white font-medium !tracking-normal">
                {isLoading ? "..." : "TANYA AI"}
              </button>
            </form>
          </div>

          <div className="space-y-4 text-left px-2">
            <div className="flex items-center justify-between ml-4 mr-2">
              <label className="text-[10px] opacity-40 uppercase font-medium text-white tracking-widest italic">Koleksi Tips</label>
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

            <div className="grid grid-cols-1 gap-4">
              {filteredData.length > 0 ? filteredData.map((tip, i) => (
                <button key={i} onClick={() => setSelectedTip(tip)} className="glass-card p-8 !rounded-[2.5rem] text-left space-y-4 border border-white/5 active:scale-[0.98]">
                  <span className="px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-[8px] text-emerald-glow uppercase font-medium">{tip.kategori || "General"}</span>
                  <h4 className="text-xl font-medium text-white tracking-normal leading-tight">{tip.judul}</h4>
                  <p className="text-xs text-white/40 line-clamp-2 font-normal leading-relaxed">"{tip.isi}"</p>
                </button>
              )) : (
                <div className="py-20 text-center opacity-30 text-[10px] font-medium uppercase tracking-widest">
                  BELUM ADA TIPS KHUSUS {user.jabatan.toUpperCase()}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {selectedTip && (
        <div className="fixed inset-0 z-[1000] px-6 py-12 overflow-y-auto animate-in fade-in">
          <div className="max-w-lg w-full mx-auto space-y-6">
            <div className="glass-card p-10 !rounded-[3.5rem] text-left">
              <span className="px-4 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-[9px] font-medium text-emerald-glow uppercase mb-8 inline-block">{selectedTip.kategori}</span>
              <h3 className="text-2xl font-medium text-white tracking-normal leading-tight mb-8 uppercase">{selectedTip.judul}</h3>
              <p className="text-base text-white/90 font-normal leading-relaxed whitespace-pre-line">{selectedTip.isi}</p>
            </div>
            <button onClick={() => setSelectedTip(null)} className="glass-button h-16 w-full active-emerald-tab">SAYA MENGERTI</button>
          </div>
        </div>
      )}

      {showAiModal && (
        <div className="fixed inset-0 z-[1000] px-6 py-12 overflow-y-auto animate-in fade-in">
          <div className="max-w-lg w-full mx-auto space-y-6">
            <div className="glass-card p-10 !rounded-[3.5rem] text-left shadow-3xl">
              <h3 className="text-xl font-medium text-white uppercase tracking-widest italic mb-6">AI Tips</h3>
              <div className="text-white/90">
                {isLoading ? (
                  <div className="space-y-4 animate-pulse">
                    <div className="h-4 bg-white/5 w-3/4 rounded-full" />
                    <div className="h-4 bg-white/5 w-full rounded-full" />
                  </div>
                ) : aiResponse && renderAiText(aiResponse)}
              </div>
            </div>
            <button onClick={() => { setShowAiModal(false); setAiResponse(null); }} className="glass-button h-16 w-full active-emerald-tab">SAYA MENGERTI</button>
          </div>
        </div>
      )}
    </div>
  );
};
