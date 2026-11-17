
import { GoogleGenAI } from "@google/genai";

export async function askAI(query: string, context: any[], type: 'SOP' | 'Tips') {
  // Filter context to reduce token usage and ensure relevance
  const simplifiedContext = context.map(item => {
    if (type === 'SOP') {
      return { judul: item.title, kategori: item.category, langkah: item.steps, tips: item.tips };
    }
    return { judul: item.judul, kategori: item.kategori, isi: item.isi };
  });

  const systemInstruction = `
    Anda adalah asisten virtual internal Flow Salon.
    
    SUMBER DATA UTAMA (CONTEXT):
    ${JSON.stringify(simplifiedContext)}

    INSTRUKSI PENTING:
    1. Jawab pertanyaan HANYA berdasarkan informasi yang ada di "SUMBER DATA UTAMA" di atas.
    2. JANGAN mengarang jawaban atau mengambil informasi dari luar context yang diberikan.
    3. Jika informasi tidak ditemukan dalam context, katakan: "Maaf, informasi tersebut tidak tersedia dalam panduan divisi Anda saat ini."
    4. Gunakan Bahasa Indonesia yang profesional namun ramah.
    5. Gunakan format poin (•) untuk langkah-langkah.
  `;

  try {
    // Mengakses API KEY. 
    // Vite akan mengganti 'process.env.API_KEY' dengan string asli saat build.
    // Kita gunakan fallback ke string kosong agar tidak error saat akses properti, tapi nanti dicek validitasnya.
    const apiKey = process.env.API_KEY || "";
    
    // DEBUG: Cek di Console Browser (F12) apakah key terbaca
    console.log("Gemini Init. Key Status:", apiKey ? "Loaded" : "Empty");

    if (!apiKey) {
      console.error("CRITICAL: API Key is MISSING in runtime.");
      return "Konfigurasi API Key kosong. Hubungi IT Support.";
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', 
      contents: [{ parts: [{ text: `Pertanyaan User: "${query}"` }] }],
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return response.text || "Tidak ada respon dari AI.";
  } catch (error: any) {
    console.error("GOOGLE AI ERROR FULL:", error);
    
    const errMsg = (error.message || error.toString());

    // JIKA ERROR 400, KITA TAMPILKAN PESAN ASLINYA
    // Agar user tahu apakah masalahnya "Key Invalid", "Model Not Found", atau "Referer Blocked"
    if (errMsg.includes('400')) {
      return `Gagal (400): ${errMsg}`;
    }

    if (errMsg.includes('403') || errMsg.includes('401') || errMsg.includes('permission')) {
      return `Akses Ditolak (${errMsg.includes('403') ? '403' : '401'}). Cek Izin API Key.`;
    }

    if (errMsg.includes('404') || errMsg.includes('not found')) {
      return "Model AI sedang sibuk/tidak tersedia (404).";
    }

    if (errMsg.includes('fetch') || errMsg.includes('network')) {
      return "Gagal koneksi ke Google. Periksa internet.";
    }

    if (errMsg.includes('429')) {
      return "Kuota habis (429). Coba besok.";
    }

    // Default error message
    return `Error: ${errMsg.substring(0, 150)}`;
  }
}

export async function searchSOP(query: string, sopContext: any[]) {
  return askAI(query, sopContext, 'SOP');
}
