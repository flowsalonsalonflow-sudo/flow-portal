import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ArrowDown, 
  Users, 
  ShieldCheck, 
  Smile, 
  Sparkle, 
  Ban, 
  RefreshCw, 
  AlertTriangle, 
  History, 
  ChevronDown, 
  ChevronUp, 
  Award,
  Heart,
  TrendingUp
} from 'lucide-react';

interface CultureItem {
  name: string;
  subText?: string;
  note?: string;
  description: string;
  icon: React.ReactNode;
  dos?: string[];
  donts?: string[];
  quote?: { text: string; author: string };
}

interface ValueBlock {
  title: string;
  shortTitle: string;
  groupLabel: string;
  colorClass: string; 
  icon: React.ReactNode;
  description: string;
  cultures: CultureItem[];
}

interface CompanyProps {
  onRegisterBack?: (backHandler: (() => boolean) | null) => void;
}

export const Company: React.FC<CompanyProps> = ({ onRegisterBack }) => {
  const [selectedItem, setSelectedItem] = useState<{ 
    type: 'value' | 'culture'; 
    name: string; 
    note?: string;
    desc: string; 
    icon: React.ReactNode;
    dos?: string[];
    donts?: string[];
    quote?: { text: string; author: string };
  } | null>(null);

  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isVisionExpanded, setIsVisionExpanded] = useState(false);

  // Preserve scroll position when entering / exiting detail
  const scrollPositionRef = useRef<number>(0);

  const handleSelectItem = (item: any) => {
    scrollPositionRef.current = window.scrollY;
    setSelectedItem(item);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleCloseItem = () => {
    setSelectedItem(null);
    setTimeout(() => {
      window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    }, 15);
  };

  useEffect(() => {
    if (onRegisterBack) {
      onRegisterBack(() => {
        if (selectedItem) {
          handleCloseItem();
          return true; // handled
        }
        return false; // let default back action handle it
      });
    }
    return () => {
      if (onRegisterBack) onRegisterBack(null);
    };
  }, [selectedItem, onRegisterBack]);

  const valuesData: ValueBlock[] = [
    {
      title: "Customer Excellence",
      shortTitle: "Customer Excellence",
      groupLabel: "Pelanggan",
      colorClass: "#ec4899", // pink
      icon: <Sparkles className="w-5 h-5 text-white/80" />,
      description: "Berkomitmen penuh menyajikan pengalaman terbaik dan memanjakan setiap tamu dengan standar pelayanan tertinggi.",
      cultures: [
        {
          name: "Ceria",
          subText: "Senyum, salam, sapa",
          note: "Senyum, Sapa, Ramah!",
          description: "Menyambut setiap kustomer yang datang dengan senyuman tulus, sapaan yang hangat, ramah, dan memancarkan energi positif sepanjang hari guna menciptakan suasana salon yang menyenangkan & nyaman.",
          icon: <Smile className="w-5 h-5 text-white/80" />,
          dos: [
            "Senyum, salam, sapa",
            "Berseri-seri",
            "Bahagia",
            "Riang",
            "Gembira",
            "Seru-seruan",
            "Joget-joget",
            "Nonton share-sharean dari Kiki"
          ],
          donts: [
            "Murung",
            "Sumpek",
            "Kusut",
            "Pucat",
            "Suram",
            "Galau",
            "Kecut",
            "Ruwet",
            "Paleng",
            "Nangis nonton Drakor"
          ]
        },
        {
          name: "Quality is First",
          subText: "Utamakan Kualitas",
          note: "Selalu berfikir bagaimana memberikan solusi dan kualitas terbaik!",
          description: "Selalu mengutamakan kualitas terbaik dalam pelayanan, pengerjaan rambut, kebersihan alat, hingga hasil kesempurnaan akhir tanpa kompromi demi mewujudkan kepuasan mutlak pelanggan.",
          icon: <Sparkles className="w-5 h-5 text-white/80" />,
          dos: [
            "Menguasai product knowledge",
            "Menanyakan & mengidentifikasi problem customer sebelum treatment",
            "Memberi saran & solusi terbaik berdasarkan kapasitasnya",
            "Jika tidak mungkin, jangan ragu menolak dengan sopan",
            "Produk & layanan berkualitas tinggi",
            "Tempat bersih, nyaman, wangi",
            "Alat bersih, terawat & terbaik",
            "Pakaian bersih & wangi dan sesuai SOP"
          ],
          donts: [
            "Tidak menguasai product knowledge",
            "Langsung kerjakan tanpa peduli kebutuhan customer",
            "Tidak memberi saran dan edukasi",
            "Meski tahu bakal rusak tetap dikerjakan",
            "Produk & layanan seadanya demi profit / cepat",
            "Tempat & alat kotor / tidak terawat",
            "Pakaian kotor",
            "Mengurangi waktu & tidak sesuai SOP"
          ]
        }
      ]
    },
    {
      title: "Happy Family",
      shortTitle: "Happy Family",
      groupLabel: "Tim",
      colorClass: "#0ea5e9", // sky blue
      icon: <Users className="w-5 h-5 text-white/80" />,
      description: "Membangun lingkungan kerja yang harmonis, saling mendukung, menghargai, dan hangat layaknya sebuah keluarga yang bahagia.",
      cultures: [
        {
          name: "Bersyukur, No Ghibah",
          subText: "Banyak syukur, stop gosip!",
          note: "Banyak Syukur, stop gosip",
          description: "Setiap pagi kita wajib sebut 3 hal yang disyukuri supaya hati kita tenang dan bawaannya positif terus. Kalau hati kita sudah fokus bersyukur sama rezeki masing-masing, kita nggak akan sempat atau kepikiran buat ngegosipin kejelekan teman. Kita ini keluarga, kalau ada masalah atau uneg-uneg sama teman kerja, langsung omongin baik-baik ke orangnya, jangan kasak-kusuk di belakang.",
          icon: <Heart className="w-5 h-5 text-white/80" />,
          dos: [
            "Mengucapkan 3 kata syukur setiap hari",
            "Setiap masalah selalu cari sisi positifnya",
            "Mencintai diri sendiri",
            "Jika ngomongin teman yang seandainya ada dia, teman tidak malu/marah",
            "Ngomongin sisi positif orang lain untuk motivasi & kebaikan"
          ],
          donts: [
            "Selalu mengeluh & menyalahkan keadaan",
            "Tiap masalah selalu dilihat dari sisi negatif",
            "Iri dengki",
            "Suka ngomongin keburukan orang lain",
            "Ngegosip hukumnya haram!"
          ]
        },
        {
          name: "No Blame",
          subText: "Tidak Menyalahkan",
          note: "Selalu berfikir ini salah saya, bukan menyalahkan orang lain",
          description: "Kalau ada kerjaan yang salah atau pelanggan komplain, jangan tunjuk-tunjukan (\"Itu gara-gara si A Bu!\"). Biasakan billing, \"Maaf Bu, ini salah saya,...\" kemudian beri penjelasan.",
          icon: <ShieldCheck className="w-5 h-5 text-white/80" />,
          dos: [
            "Tidak pernah menyalahkan teman atau bawahan",
            "Jika ada yang salah, bahas solusinya, bukan kesalahannya",
            "Siapapun setiap menegur harus diawali kata: 'Maaf, salah saya...'",
            "Diri sendiri yang bertanggung jawab atas hidup (bangun kesiangan, dll)"
          ],
          donts: [
            "Tidak merasa salah & merasa dirinya paling benar",
            "Mencari-cari kesalahan teman atau bawahan",
            "Selalu membahas kesalahan daripada mencari solusi",
            "Menyalahkan: Jokowi, orang tua, teman, bos, atasan, atau bawahan"
          ]
        }
      ]
    },
    {
      title: "Green Integrity",
      shortTitle: "Green Integrity",
      groupLabel: "Pribadi",
      colorClass: "#10b981", // emerald
      icon: <ShieldCheck className="w-5 h-5 text-white/80" />,
      description: "menjadi pribadi yang selalu mendapatkan 'Lampu Hijau'—sosok yang 100% bisa diandalkan, dipercaya penuh, dan selalu direkomendasikan dengan bangga oleh siapapun yang bekerja dengannya. Seseorang dengan Green Integrity tidak pernah meninggalkan 'lampu merah' (jejak masalah, kebohongan, atau lari dari tanggung jawab) baik di masa lalu maupun masa kini. Mereka adalah individu yang terus melaju memperbaiki diri dan bekerja tanpa banyak alasan.",
      cultures: [
        {
          name: "Kaizen",
          subText: "Perbaikan Kecil",
          note: "Perbaikan kecil terus menerus!",
          description: "Jangan puas dengan ilmu yang itu-itu saja. Kaizen itu sesederhana hari ini belajar cara catok rambut yang lebih tahan lama, belajar mempercepat waktu cuci rambut tanpa mengurangi kenyamanan pelanggan, cara menyimpan catokan yang lebih aman, dll. Perbaiki potensi dirimu 1% saja setiap hari maka dalam 1 tahun kamu udah upgrade 300% (3x lipat lebih baik).",
          icon: <TrendingUp className="w-5 h-5 text-white/80" />,
          dos: [
            "1 perbaikan kecil setiap hari (berbenah 1% setiap hari = 1 tahun 360%)",
            "Mencari cara pengerjaan yang lebih baik & efisien",
            "Teknik penataan lebih cepat",
            "Tata letak alat/barang yang lebih bagus & rapi",
            "Rajin membaca buku & menambah wawasan",
            "Ada yang rusak langsung dibetulkan"
          ],
          donts: [
            "Tanpa peningkatan & tidak belajar hal baru",
            "Tidak melakukan pengembangan diri",
            "Malas belajar & malas membaca",
            "Ada peralatan/fasilitas rusak dibiarkan saja"
          ],
          quote: {
            text: "Kegilaan adalah melakukan hal yg sama berulang-ulang dan mengharapkan hasil yg berbeda",
            author: "Albert Einstein"
          }
        },
        {
          name: "No Excuse",
          subText: "Tidak Alasan",
          note: "Pantang Banyak Alasan!",
          description: "Kalau ditegur karena telat, jangan banyak alasan \"macet Bu\", tapi minta maaf dan pastikan besok berangkat lebih pagi. Kalau dikasih tugas, selesaikan sampai tuntas, jangan cari-cari pembenaran.",
          icon: <Ban className="w-5 h-5 text-white/80" />,
          dos: [
            "Yakin 'Saya pasti bisa' & setiap orang berpeluang sukses",
            "Langsung fokus memikirkan cara saat ada tantangan/peluang",
            "Introspeksi diri atas kesalahan agar tidak terulang",
            "Yakin ada kemampuan diri & pasti ada jalan keluar di setiap masalah"
          ],
          donts: [
            "Beralasan: 'Saya telat tidak ada yang bangunin' atau 'telat padahal sudah ngebut'",
            "Mencari pembenaran: 'Hasilnya jelek karena customernya uprek'",
            "Berkecil hati: 'Maklum saya anak orang miskin/kaya/menengah jadi tidak punya daya juang'",
            "Pasrah: 'Maklum salon sepi karena lagi musim masuk sekolah'"
          ]
        }
      ]
    }
  ];

  const milestones = [
    { year: "2014", desc: "Berdiri sebagai salon kecil dengan personil awal tidak lebih dari 3 orang." },
    { year: "2018", desc: "Mulai bangkit pesat berkat ulasan positif dan rekomendasi dari kepuasan pelanggan setulus hati (Tahun ke-4)." },
    { year: "2021", desc: "Ekspansi gedung baru khusus wanita yang menjamin privasi (hijab-friendly) berlokasi di daerah Pagebangan." },
    { year: "2022", desc: "Membuka cabang ekspansi pertama di Kota Serang untuk menjangkau pelanggan lebih luas." },
    { year: "2024", desc: "Melakukan ekspansi peremajaan gedung kedua di kawasan cabang Serang guna meningkatkan kenyamanan." },
    { year: "2025", desc: "Membuka cabang baru Cibeber guna merespons tingginya antusiasme serta antrean kustomer setia Flow." }
  ];

  const handleToggleHistory = () => {
    const nextState = !isHistoryExpanded;
    setIsHistoryExpanded(nextState);
    if (nextState) {
      setIsVisionExpanded(false);
    }
  };

  const handleToggleVision = () => {
    const nextState = !isVisionExpanded;
    setIsVisionExpanded(nextState);
    if (nextState) {
      setIsHistoryExpanded(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col pb-32 min-h-screen px-0.5 md:px-0">
      
      {/* IMMERSIVE DETAILS VIEW - Custom Emerald Visuals & Glass Blurs */}
      <AnimatePresence mode="wait">
        {selectedItem ? (
          <motion.div 
            key="modal-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center justify-center min-h-[75vh] px-4 py-8"
          >
            {/* Transparent Blur Card Icon */}
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-5 relative overflow-hidden glass-card bg-black/40 border border-white/10 backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
              <div className="scale-125 text-emerald-400">
                {selectedItem.icon}
              </div>
            </div>

            {/* Subtitle Badge - Custom Emerald Style */}
            <span 
              className="text-[9px] tracking-[0.25em] font-bold uppercase mb-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400"
            >
              {selectedItem.type === 'value' ? 'CORE VALUE' : 'CULTURE PRACTICE'}
            </span>

            {/* Title - Smaller scale and better spacing to prevent congestion */}
            <h3 className="text-base font-bold text-white text-center tracking-wider px-4 mt-2 mb-6 leading-relaxed max-w-xs">
              {selectedItem.name}
            </h3>

            <div className="w-12 h-[1px] bg-white/10 mb-6" />

            {/* Descriptive Content - Left Aligned with valid Tailwind padding */}
            <div className="glass-card px-5 py-6 sm:p-8 rounded-[2rem] border border-white/15 bg-black/50 shadow-2xl w-full max-w-lg text-left flex flex-col gap-4 backdrop-blur-xl">
              {selectedItem.note && (
                <p className="text-xs sm:text-sm italic text-emerald-400 font-semibold leading-relaxed">
                  "{selectedItem.note}"
                </p>
              )}
              <p className="text-[13.5px] sm:text-sm leading-relaxed text-slate-100/95 font-normal whitespace-pre-wrap">
                {selectedItem.desc}
              </p>

              {/* Do's and Don'ts comparison table for cultures */}
              {selectedItem.type === 'culture' && (selectedItem.dos || selectedItem.donts) && (
                <div className="mt-5 border-t border-white/10 pt-5">
                  <div className="grid grid-cols-2 gap-3.5 border-b border-white/10 pb-2 mb-3">
                    <div className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                      <span className="text-base">✔</span> Boleh
                    </div>
                    <div className="text-[11.5px] sm:text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1 pl-3.5 border-l border-white/10">
                      <span className="text-base">✘</span> Dilarang
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3.5 text-[12.5px] sm:text-[13.5px] leading-relaxed">
                    {/* Left Column (Boleh) */}
                    <div className="space-y-2 text-white/95 pr-1">
                      {selectedItem.dos?.map((item, i) => (
                        <div key={i} className="flex gap-1.5 items-start">
                          <span className="text-emerald-400 shrink-0 font-bold">✔</span>
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                    {/* Right Column (Dilarang) */}
                    <div className="space-y-2 text-white/95 pl-3.5 border-l border-white/10">
                      {selectedItem.donts?.map((item, i) => (
                        <div key={i} className="flex gap-1.5 items-start">
                          <span className="text-rose-400/90 shrink-0 font-bold">✘</span>
                          <span className="font-medium">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Einstein Quote Block on Kaizen */}
              {selectedItem.quote && (
                <div className="mt-5 pt-5 border-t border-white/10 text-center italic bg-white/5 p-4 rounded-2xl border border-white/5">
                  <p className="text-[13px] sm:text-sm text-white/95 leading-relaxed font-serif">
                    "{selectedItem.quote.text}"
                  </p>
                  <p className="text-[10px] sm:text-[11px] text-emerald-400 tracking-widest uppercase mt-2.5 not-italic font-sans font-bold">
                    ~ {selectedItem.quote.author}
                  </p>
                </div>
              )}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleCloseItem}
              className="mt-10 px-8 py-3 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-[10px] text-white uppercase tracking-[0.2em] font-bold transition-all shadow-md"
            >
              Kembali Ke Diagram
            </motion.button>
          </motion.div>
        ) : (
          <motion.div 
            key="main-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col space-y-6 px-4"
          >
            {/* HEADER PAGE */}
            <header className="pt-4 text-center flex flex-col items-center justify-center">
              <img src="https://flowsalon.id/absenku/logo.png" className="h-9 filter brightness-200 mb-3" alt="Flow Salon Logo" />
              <h2 className="text-2xl sm:text-3xl text-white font-medium tracking-tight">
                Company Profile
              </h2>
            </header>

            {/* SEJARAH SINGKAT SECTION - EXPANDABLE */}
            <section className="glass-card p-5 rounded-[2rem] border border-white/10 bg-black/30 relative overflow-hidden transition-all duration-300 shadow-xl">
              <div className="absolute right-3 top-3 opacity-5 pointer-events-none text-white">
                <History className="w-16 h-16" />
              </div>

              <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <History className="w-4 h-4 text-emerald-400" />
                </div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Sejarah Singkat Flow Salon
                </h3>
              </div>

              <div className="mt-4 text-[13.5px] sm:text-sm leading-relaxed text-slate-100/85 font-normal space-y-3.5">
                <p>
                  Flow Salon berdiri pada <strong className="text-emerald-300 font-semibold">25 November 2014</strong>. Kita tidak langsung besar; kita memulai dari sebuah salon kecil dengan tim yang tidak lebih dari 3 orang. Tahun pertama adalah masa terberat—bahkan sering kali hanya ada 1 pelanggan dalam seminggu.
                </p>

                {!isHistoryExpanded ? (
                  <p className="text-slate-100/50 italic line-clamp-1 text-[13px] sm:text-sm">
                    Namun, dorongan untuk menghidupi keluarga dan kecintaan pada seni tata rambut membuat fondasi kita tidak goyah...
                  </p>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3.5 pt-2 border-t border-white/5 mt-3 text-[13.5px] sm:text-sm"
                  >
                    <p>
                      Namun, dorongan untuk menghidupi keluarga dan kecintaan pada seni tata rambut membuat fondasi kita tidak goyah. Lewat keuletan untuk terus belajar dan berbenah dari ratusan kritik, Flow Salon berhasil tumbuh menjadi salon terbaik dengan perkembangan tercepat.
                    </p>

                    {/* MILESTONES TIMELINE */}
                    <div className="bg-black/35 rounded-2xl p-4 border border-white/5 mt-4">
                      <h4 className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-emerald-400 mb-3 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> Milestones Perjalanan Kita
                      </h4>
                      <div className="relative pl-4 border-l border-emerald-500/20 space-y-3.5 ml-2">
                        {milestones.map((m, idx) => (
                          <div key={idx} className="relative group">
                            {/* Glowing timeline dot */}
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-black group-hover:scale-125 transition-transform shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                            <div className="text-left">
                              <span className="text-[10.5px] sm:text-[11.5px] font-bold tracking-wider text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                                {m.year}
                              </span>
                              <p className="text-[12.5px] sm:text-[13.5px] text-white/90 mt-1 font-medium leading-relaxed">
                                {m.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PESAN UNTUK FLOW FAMILY */}
                    <div className="rounded-2xl p-4 border border-pink-500/20 bg-pink-500/5 mt-4 relative overflow-hidden">
                      <div className="absolute -right-4 -bottom-4 opacity-5 text-white">
                        <Heart className="w-16 h-16" />
                      </div>
                      <h4 className="text-[11px] sm:text-xs uppercase font-bold tracking-wider text-pink-400 mb-2.5 flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 fill-pink-500" /> Pesan untuk Flow Family
                      </h4>
                      <p className="text-[13px] sm:text-sm leading-relaxed text-white/95 italic">
                        "Kita bisa berdiri sekuat ini karena kita menghargai setiap proses dan terus belajar. Ingatlah bahwa <strong className="text-pink-300">Flowers</strong> (pelanggan kita) adalah alasan kita bekerja, pihak yang menghidupi keluarga kita, dan ruang bagi kita untuk berkarya."
                      </p>
                      <p className="text-[13px] sm:text-sm leading-relaxed text-emerald-300 font-semibold mt-3">
                        Mari kita jaga kepercayaan ini dengan selalu memberikan layanan terbaik di setiap lembar kerja kita! Flow Team, Let’s Grow Together!
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="pt-3 block text-center">
                  <button
                    onClick={handleToggleHistory}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] text-emerald-400 font-bold uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all text-center mx-auto"
                  >
                    {isHistoryExpanded ? (
                      <>
                        Persempit <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Baca Selengkapnya <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* VISION CARD - With clean standard padding */}
            <section className="glass-card p-6 rounded-[2rem] relative overflow-hidden shadow-xl border border-white/10 bg-black/30 transition-all duration-300">
              <div className="absolute right-4 top-4 opacity-5">
                <Heart className="w-16 h-16 text-white" />
              </div>
              
              <div className="relative z-10 text-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-400/15 border border-emerald-400/25 text-emerald-400 text-[9px] font-bold uppercase tracking-[0.18em] mb-2.5">
                  <Sparkle className="w-3 h-3 fill-emerald-400/20" /> Our Vision (Visi Kami)
                </span>
                <h3 className="text-base sm:text-lg font-semibold text-white leading-relaxed tracking-wide px-1">
                  "Menjadi rumah kedua bagi muslimah Indonesia, untuk memanjakan dirinya."
                </h3>

                {isVisionExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-4 pt-4 border-t border-white/5 mt-4 text-xs text-left"
                  >
                    <p className="text-emerald-300 font-bold uppercase tracking-widest text-[10px] sm:text-[11px]">
                      Maksud dari Visi ini:
                    </p>
                    <div className="space-y-4 pl-0.5">
                      {/* 1. Rumah Kedua */}
                      <div className="relative pl-3.5 border-l-2 border-emerald-500/40">
                        <h4 className="text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider">
                          1. Rumah Kedua
                        </h4>
                        <p className="text-slate-100/85 leading-relaxed mt-0.5 text-[13px] sm:text-sm">
                          Tempat dimana pelanggan merasa aman, nyaman, diterima dengan hangat, serta merasakan suasana kekeluargaan yang kental.
                        </p>
                      </div>
                      {/* 2. Bagi Muslimah Indonesia */}
                      <div className="relative pl-3.5 border-l-2 border-emerald-500/40">
                        <h4 className="text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider">
                          2. Bagi Muslimah Indonesia
                        </h4>
                        <p className="text-slate-100/85 leading-relaxed mt-0.5 text-[13px] sm:text-sm">
                          Flow salon ingin menjadi solusi bagi wanita berhijab and akan mengembangkan cabang ke seluruh indonesia sehingga menjadi oasis di tengah salon-salon yang tidak ramah hijab.
                        </p>
                      </div>
                      {/* 3. Memanjakan Diri */}
                      <div className="relative pl-3.5 border-l-2 border-emerald-500/40">
                        <h4 className="text-white font-bold text-[11px] sm:text-xs uppercase tracking-wider">
                          3. Memanjakan Diri
                        </h4>
                        <p className="text-slate-100/85 leading-relaxed mt-0.5 text-[13px] sm:text-sm">
                          Menyediakan standar layanan terbaik sehingga setiap tamu merasa sangat dihargai, santai, dan pulang dengan rasa segar melimpah.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="pt-3 block text-center">
                  <button
                    onClick={handleToggleVision}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] text-emerald-400 font-bold uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all text-center mx-auto"
                  >
                    {isVisionExpanded ? (
                      <>
                        Persempit <ChevronUp className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Arti Visi <ChevronDown className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>

            {/* FLOW DIRECTION MARKER - High Contrast Readability and White Opacity Arrows */}
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <span className="text-[11px] text-white/95 tracking-[0.15em] font-semibold uppercase mb-1 px-4 leading-normal text-center block">
                dicapai melalui 3 prinsip dasar
              </span>
              <div className="w-6 h-6 rounded-full bg-white/5 border border-white/15 flex items-center justify-center">
                <ArrowDown className="w-3.5 h-3.5 text-white/80" />
              </div>
            </div>

            {/* 3-COLUMN DIAGRAM LAYOUT */}
            <section className="px-0.5 space-y-4">
              <div className="grid grid-cols-3 gap-3.5 items-start">
                
                {valuesData.map((val, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    
                    {/* Circle Card - Fully Transparent + Blur (Mono White Accent Borders) */}
                    <div 
                      onClick={() => handleSelectItem({
                        type: 'value',
                        name: val.title,
                        desc: val.description,
                        icon: val.icon
                      })}
                      className="w-full aspect-square rounded-full flex flex-col items-center justify-center text-center p-1.5 cursor-pointer hover:scale-[1.04] active:scale-95 transition-all shadow-md relative glass-card bg-black/45 backdrop-blur-md border border-white/10"
                    >
                      <span className="text-[9px] font-bold tracking-widest text-white/60 uppercase leading-none block">
                        {val.groupLabel}:
                      </span>
                      <span className="text-[10px] font-bold text-white leading-tight mt-1 px-0.5 block whitespace-pre-wrap">
                        {val.title.split(' ')[0]}
                        {val.title.split(' ')[1] ? `\n${val.title.split(' ')[1]}` : ''}
                      </span>
                    </div>

                    {/* Thick Emerald Aligning Downward Arrows - Standardized thickness matching arrow line */}
                    <div className="flex flex-col items-center justify-center my-3 pointer-events-none">
                      <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-400 bg-transparent" />
                      <div className="w-[2px] h-[30px] bg-emerald-400 -mt-[1px]" />
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[7px] border-t-emerald-400" />
                    </div>

                    {/* Culture Cards Stack - Transparent + Blur */}
                    <div className="space-y-4 w-full">
                      {val.cultures.map((culture, cIdx) => (
                        <div
                          key={cIdx}
                          onClick={() => handleSelectItem({
                            type: 'culture',
                            name: culture.name,
                            note: culture.note,
                            desc: culture.description,
                            icon: culture.icon,
                            dos: culture.dos,
                            donts: culture.donts,
                            quote: culture.quote
                          })}
                          className="w-full px-1 py-3 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer hover:scale-[1.04] active:scale-95 transition-all shadow-md relative overflow-hidden h-[105px] glass-card bg-black/35 backdrop-blur-md border border-white/10"
                        >
                          <span className="text-[11.5px] font-bold text-white leading-snug px-1 uppercase tracking-wider block">
                            {culture.name}
                          </span>
                          
                          {culture.subText && (
                            <span className="text-[8.5px] font-medium text-white/70 italic mt-1.5 block leading-normal px-0.5">
                              {culture.subText}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                  </div>
                ))}

              </div>
            </section>

            {/* BOTTOM NAV FLOATING EXPLANATION - High Contrast Readability */}
            <p className="text-[11px] text-slate-100 font-medium text-center px-4 leading-relaxed pt-2.5">
              Tips: Struktur di atas memetakan visi menjadi <strong className="text-emerald-300 font-extrabold">3 Prinsip Value dasar</strong> (Pelanggan, Tim &amp; Pribadi) yang ditunjang masing-masing <strong className="text-emerald-300 font-extrabold">2 Budaya</strong>. Ketuk lingkaran atau kartu mana pun untuk membaca instruksi operasionalnya.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
