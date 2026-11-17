import React, { useState, useEffect, useRef } from 'react';
import { Page } from '../App';
import { User } from '../types';
import { QuoteIcon } from '../components/Icons';
import * as htmlToImage from 'html-to-image';

interface DashboardProps {
  user: User;
  onNavigate: (p: Page) => void;
  pesanManager?: any;
  bgUrl?: string;
  onToggleFocus?: (isFocus: boolean) => void;
  isDataLoaded?: boolean;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  isOfflineFallback?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  onNavigate,
  pesanManager: allQuotesRaw,
  bgUrl,
  onToggleFocus,
  isDataLoaded = true,
  isLoading = false,
  error = null,
  onRetry,
  isOfflineFallback = false
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const quoteRef = useRef<HTMLDivElement>(null);

  const [bgBase64, setBgBase64] = useState<string | null>(null);
  const [bgBlurredBase64, setBgBlurredBase64] = useState<string | null>(null);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);

  const isAssetsReady =
    !!(bgBase64 && bgBlurredBase64 && logoBase64);

  /* ==========================
     LOAD ASSETS
  ========================== */
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const targetBg =
          bgUrl ||
          'https://flowsalon.id/background/boat-1.jpg';

        // Reset state agar isAssetsReady false sementara loading
        setBgBase64(null);
        setBgBlurredBase64(null);

        const res = await fetch(
          `https://wsrv.nl/?url=${encodeURIComponent(targetBg)}&output=jpg&w=1080&q=80`
        );

        const blob = await res.blob();
        const objectUrl =
          URL.createObjectURL(blob);

        const img = new Image();

        img.onload = () => {
          // NORMAL BG
          const c =
            document.createElement('canvas');

          c.width = img.width;
          c.height = img.height;

          const ctx =
            c.getContext('2d')!;

          ctx.drawImage(img, 0, 0);

          setBgBase64(
            c.toDataURL(
              'image/jpeg',
              0.85
            )
          );

          // BLUR BG
          const b =
            document.createElement('canvas');

          b.width = img.width;
          b.height = img.height;

          const bctx =
            b.getContext('2d')!;

          bctx.filter =
            'blur(20px) saturate(160%) brightness(1.05)';

          bctx.drawImage(img, 0, 0);

          setBgBlurredBase64(
            b.toDataURL(
              'image/jpeg',
              0.92
            )
          );

          URL.revokeObjectURL(
            objectUrl
          );
        };

        img.src = objectUrl;

        // LOGO
        const lres = await fetch(
          `https://wsrv.nl/?url=${encodeURIComponent('https://flowsalon.id/absenku/logo.png')}&output=png`
        );

        const lblob =
          await lres.blob();

        const reader =
          new FileReader();

        reader.onloadend = () =>
          setLogoBase64(
            reader.result as string
          );

        reader.readAsDataURL(
          lblob
        );
      } catch (e) {}
    };

    loadAssets();
  }, [bgUrl]);

  /* ==========================
     QUOTE
  ========================== */
  let allQuotes: any[] = [];

  if (
    Array.isArray(
      allQuotesRaw
    ) &&
    allQuotesRaw.length > 0
  ) {
    allQuotes =
      allQuotesRaw;
  } else if (
    allQuotesRaw &&
    typeof allQuotesRaw ===
      'object'
  ) {
    allQuotes = [
      allQuotesRaw
    ];
  }

  const currentQuote =
    allQuotes[0];

  const quoteText =
    currentQuote?.pesan ||
    currentQuote?.quote ||
    '';

  const quoteName =
    currentQuote?.nama ||
    '';

  const quoteRole =
    currentQuote?.jabatan ||
    '';

  /* ==========================
     DOWNLOAD
  ========================== */
  const handleDownload =
    async () => {
      if (
        isDownloading ||
        !isAssetsReady ||
        !quoteRef.current
      )
        return;

      try {
        setIsDownloading(true);

        // Tunggu sedikit lebih lama agar rendering benar-benar stabil (iOS Safari fix)
        await new Promise((r) => setTimeout(r, 1500));

        // Gunakan toJpeg untuk ukuran file yang lebih ramah memory mobile
        // Panggil pertama kali untuk memicu load asset ke DOM clone
        await htmlToImage.toJpeg(quoteRef.current, {
          cacheBust: true,
          pixelRatio: 1.5,
          quality: 0.9,
          backgroundColor: '#000000',
          width: 1080,
          height: 1920,
          style: {
            transform: 'scale(1)',
            opacity: '1',
            visibility: 'visible',
          },
        });

        // Panggil kedua kali untuk hasil akhir yang pasti lengkap dengan gambar background
        const dataUrl = await htmlToImage.toJpeg(quoteRef.current, {
          cacheBust: true,
          pixelRatio: 1.5,
          quality: 0.9,
          backgroundColor: '#000000',
          width: 1080,
          height: 1920,
          style: {
            transform: 'scale(1)',
            opacity: '1',
            visibility: 'visible',
          },
        });

        if (!dataUrl) throw new Error("Gagal generate gambar");

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `quote-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        alert(
          'Gagal download'
        );
      } finally {
        setIsDownloading(
          false
        );
      }
    };

  const menuItems = [
    {
      label: 'Company',
      page: Page.Company,
      image: 'https://flowsalon.id/absenku/company.png'
    },
    {
      label:
        'Absen',
      page:
        Page.Attendance,
      image:
        'https://flowsalon.id/absenku/absen.png'
    },
    {
      label:
        'Gaji',
      page:
        Page.Salary,
      image:
        'https://flowsalon.id/absenku/gaji.png'
    },
    {
      label:
        'Tugas',
      page:
        Page.Checklist,
      image:
        'https://flowsalon.id/absenku/tugas.png'
    },
    {
      label:
        'SOP',
      page:
        Page.Knowledge,
      image:
        'https://flowsalon.id/absenku/sop.png'
    },
    {
      label:
        'Tips',
      page:
        Page.Tips,
      image:
        'https://flowsalon.id/absenku/tips.png'
    },
    {
      label:
        'Setting',
      page:
        Page.Settings,
      image:
        'https://flowsalon.id/absenku/setting.png'
    }
  ];

  return (
    <div className="w-full max-w-md mx-auto flex flex-col space-y-10 pb-32">

      {/* HEADER */}
      <header className="flex justify-between items-start px-2 pt-4">
        <div>
          <h2 className="text-3xl text-white font-medium">
            Halo, {user.nama.split(' ')[0]}
          </h2>

          <p className="text-emerald-400 text-sm mt-2">
            {user.jabatan}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {isLoading && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-[10px] text-white/50 font-medium uppercase tracking-widest">Syncing</span>
            </div>
          )}
          {isOfflineFallback && (
            <div className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full text-[9px] text-amber-300 font-bold uppercase tracking-wider shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Mode Cache
            </div>
          )}
        </div>
      </header>

      {error && !isDataLoaded && (
        <div className="mx-2 p-6 glass-card !rounded-3xl border-red-500/30 bg-red-500/10 text-center space-y-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
             <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
          </div>
          <p className="text-xs text-red-200/80 font-medium">{error}</p>
          <button 
            onClick={onRetry}
            className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-[10px] uppercase font-black tracking-[0.2em] rounded-full border border-red-500/30 transition-all active:scale-95"
          >
            Coba Lagi
          </button>
        </div>
      )}

      {/* MENU */}
      <div className="grid grid-cols-3 gap-y-10 gap-x-4 px-2 justify-items-center">
        {menuItems.map(
          (item, i) => (
            <button
              key={i}
              onClick={() =>
                onNavigate(
                  item.page
                )
              }
              className={`flex flex-col items-center gap-3 active:scale-95 ${i === 6 ? 'col-span-3 justify-self-center' : ''}`}
            >
              <div className="ios-icon-frame shadow-2xl">
                <img
                  src={item.image}
                  className="w-full h-full object-contain"
                />
              </div>

              <span className="text-xs text-white/70">
                {
                  item.label
                }
              </span>
            </button>
          )
        )}
      </div>

      {/* QUOTE CARD */}
      {quoteText && (
        <section className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">

          <div className="absolute -right-6 -top-6 opacity-[0.05] text-white">
            <QuoteIcon size={180} />
          </div>

          <div className="relative z-10">

            <p className="text-xs uppercase tracking-widest italic text-white/60">
              Quote of the day
            </p>

            <p className="text-lg text-white italic leading-relaxed mt-4 whitespace-pre-wrap">
              {quoteText}
            </p>

            <div className="pt-6 mt-6 border-t border-white/10 flex gap-3 items-center">

              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400">
                <QuoteIcon size={16} />
              </div>

              <div>
                <p className="text-sm text-white font-medium">
                  {quoteName}
                </p>

                <p className="text-xs text-emerald-400 uppercase mt-1">
                  {quoteRole}
                </p>
              </div>

            </div>

          </div>

        </section>
      )}

      {/* BUTTON */}
      <div className="flex justify-center">

        <button
          onClick={handleDownload}
          disabled={
            isDownloading ||
            !isAssetsReady ||
            !quoteText
          }
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md shadow-lg active:scale-95 transition-all"
        >

          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>

          <span className="text-emerald-400">
            {isDownloading
              ? 'MEMPROSES...'
              : 'DOWNLOAD QUOTE'}
          </span>

        </button>

      </div>

      {/* EXPORT NODE (1080x1920 Vertical Portrait) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '0px',
          height: '0px',
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: -100,
          opacity: 0.01
        }}
      >
        <div
          ref={quoteRef}
          style={{
            width: '1080px',
            height: '1920px',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#000'
          }}
        >
          {/* Main Background (Sharp) */}
          {bgBase64 && (
            <img
              src={bgBase64}
              alt=""
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1080px',
                height: '1920px',
                objectFit: 'cover',
                objectPosition: 'center',
                opacity: 1
              }}
            />
          )}

          {/* Dark Overlay for legibility */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1080px',
              height: '1920px',
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              zIndex: 5
            }}
          />

          {/* MAIN CONTENT CONTAINER */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              zIndex: 10,
              fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
          >
            {/* HEADER: QUOTE OF THE DAY + LINE + DOTS */}
            <div
              style={{
                position: 'absolute',
                top: '180px',
                left: '220px',
                right: '220px',
                display: 'flex',
                alignItems: 'center',
                gap: '40px'
              }}
            >
              <span style={{ 
                color: '#fff', 
                fontSize: '24px', 
                fontWeight: 900, 
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                QUOTE OF THE DAY
              </span>
              <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)' }} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fff' }} />
              </div>
            </div>

            {/* MAIN CONTENT: QUOTE TEXT */}
            <div
              style={{
                position: 'absolute',
                left: '220px',
                right: '220px',
                top: '48%', // Golden ratio centered
                transform: 'translateY(-50%)',
                textAlign: 'left'
              }}
            >
              {/* Background Watermark Icon */}
              <div style={{ position: 'absolute', right: '0', top: '-110px', opacity: 0.06, color: '#fff', pointerEvents: 'none' }}>
                <QuoteIcon size={420} />
              </div>

              <p 
                style={{ 
                  fontSize: '44px', 
                  lineHeight: '1.6', 
                  fontStyle: 'italic',
                  color: '#fff',
                  fontWeight: 600,
                  whiteSpace: 'pre-wrap',
                  marginBottom: '100px',
                  textShadow: '0 4px 20px rgba(0,0,0,0.3)'
                }}
              >
                {quoteText}
              </p>

              {/* Middle Line */}
              <div style={{ width: '100%', height: '2px', background: 'rgba(255,255,255,0.25)', marginBottom: '80px' }} />

              {/* Author Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
                <div 
                  style={{ 
                    width: '85px', 
                    height: '85px', 
                    borderRadius: '24px', 
                    background: 'rgba(255,255,255,0.12)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#34d399',
                    border: '2px solid rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <QuoteIcon size={40} />
                </div>
                <div>
                  <p style={{ fontSize: '34px', fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                    {quoteName}
                  </p>
                  <p style={{ fontSize: '18px', color: '#6ee7b7', textTransform: 'uppercase', fontWeight: 900, marginTop: '12px', letterSpacing: '0.25em' }}>
                    {quoteRole}
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER: COORDINATES + LINE + LOGO */}
            <div
              style={{
                position: 'absolute',
                bottom: '180px',
                left: '220px',
                right: '220px',
                display: 'flex',
                alignItems: 'center',
                gap: '40px'
              }}
            >
              <span style={{ 
                color: '#fff', 
                fontSize: '24px', 
                fontWeight: 500, 
                letterSpacing: 'normal',
                opacity: 0.9
              }}>
                8° 41' 43" S, 115° 11' 36" E
              </span>
              <div style={{ flex: 1, height: '2px', background: 'rgba(255,255,255,0.3)' }} />
              {logoBase64 && (
                <img
                  src={logoBase64}
                  style={{
                    width: '90px',
                    height: 'auto',
                    filter: 'brightness(300%) contrast(150%)'
                  }}
                />
              )}
                        </div>
          </div>
        </div>
      </div>

    </div>
  );
};