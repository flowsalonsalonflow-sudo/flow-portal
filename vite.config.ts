
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // KITA HARDCODE KUNCI DI SINI SEBAGAI CADANGAN UTAMA
  // Jadi meskipun file .env tidak terbaca di Mac, kunci ini akan tetap dipakai.
  const apiKey = "AIzaSyBNmRd5Kb_ZaBcfstK5cljZr6iXs8a937Q";

  console.log("Building for mode:", mode);
  console.log("API Key Status: INJECTED (Hardcoded)");

  return {
    plugins: [react()],
    base: './', 
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      emptyOutDir: true
    },
    define: {
      // Menyuntikkan string kunci langsung ke dalam kode aplikasi saat build
      'process.env.API_KEY': JSON.stringify(apiKey)
    }
  };
});
