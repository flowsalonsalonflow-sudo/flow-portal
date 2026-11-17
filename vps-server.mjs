/**
 * ============================================================================
 * FLOW SALON - MASTER VPS SERVER (aaPanel Node.js Production Server)
 * ============================================================================
 * Fitur Utama:
 * 1. Melayani aplikasi web (Flow Port, HR Hub, Guru Hub, Challenge) dari folder `dist/`
 * 2. Menyimpan Foto Selfie Absensi langsung di harddisk VPS (`/uploads/absen/`)
 *    dan membalas klik Absen Karyawan dalam < 0.05 detik (Anti-Timeout jam 21:00)
 * 3. Database Hybrid Cepat (`/vps-data/db.json`) yang otomatis sinkron 2 arah
 *    dengan Google Sheets (Backup & Admin View tetap jalan)
 * 4. Penjadwal Otomatis Tengah Malam (Jam 00:05 WIB) yang menjalankan Robot
 *    Penarik Komisi & Transaksi Produk dari https://my.kluto.id (`kluto-bot.mjs`)
 * ============================================================================
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
import { runKlutoSync } from './kluto-bot.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Baca .env jika ada
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

const PORT = Number(process.env.PORT || 3001);
const DEFAULT_GAS_URL =
  'https://script.google.com/macros/s/AKfycby7_TYAxQcEhY9qDb2MhtIWaigpzyG08FnYTuRvlzTLrn_H-2zNdDVqJljL403PxoBJOw/exec';
const GAS_URL = process.env.GAS_URL || DEFAULT_GAS_URL;

const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'vps-data');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'absen');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const KLUTO_LOG_FILE = path.join(DATA_DIR, 'kluto-sync-log.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let dbCache = {
  lastSyncedAt: null,
  initialDataByEmail: {},
  historyByEmail: {},
  salaryCache: {},
  localAbsensiQueue: []
};

if (fs.existsSync(DB_FILE)) {
  try {
    dbCache = { ...dbCache, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) };
  } catch (e) {
    console.warn('Gagal membaca db.json awal:', e.message);
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbCache, null, 2), 'utf8');
  } catch (e) {
    console.error('Gagal menyimpan db.json:', e.message);
  }
}

let klutoSyncStatus = {
  isRunning: false,
  lastRunAt: null,
  lastSuccessDate: null,
  lastResultSummary: null,
  lastError: null,
  logs: []
};

if (fs.existsSync(KLUTO_LOG_FILE)) {
  try {
    klutoSyncStatus = { ...klutoSyncStatus, ...JSON.parse(fs.readFileSync(KLUTO_LOG_FILE, 'utf8')) };
    klutoSyncStatus.isRunning = false;
  } catch (_) {}
}

function saveKlutoStatus() {
  try {
    fs.writeFileSync(KLUTO_LOG_FILE, JSON.stringify(klutoSyncStatus, null, 2), 'utf8');
  } catch (_) {}
}

function saveBase64PhotoToVps(base64Data, nama, timestampMs, hostHeader) {
  if (!base64Data || !base64Data.startsWith('data:image')) return base64Data || '';
  try {
    const parts = base64Data.split(',');
    if (parts.length < 2) return '';
    const safeName = String(nama || 'user').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileName = `Absen_${safeName}_${timestampMs}.jpg`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(filePath, Buffer.from(parts[1], 'base64'));
    const proto = process.env.PUBLIC_BASE_URL
      ? process.env.PUBLIC_BASE_URL.replace(/\/$/, '')
      : hostHeader
      ? `https://${hostHeader}`
      : '';
    return `${proto}/uploads/absen/${fileName}`;
  } catch (err) {
    console.error('Gagal simpan foto ke VPS:', err.message);
    return '';
  }
}

// Background worker untuk meneruskan antrean tulis dari VPS ke Google Sheets satu per satu
let isFlushingToGas = false;
async function flushBackgroundGasQueue() {
  if (isFlushingToGas || !Array.isArray(dbCache.localAbsensiQueue) || dbCache.localAbsensiQueue.length === 0) {
    return;
  }
  isFlushingToGas = true;
  try {
    while (dbCache.localAbsensiQueue.length > 0) {
      const item = dbCache.localAbsensiQueue[0];
      try {
        const res = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(item.payload)
        });
        const json = await res.json();
        if (json && json.status === 'sukses') {
          dbCache.localAbsensiQueue.shift();
          saveDb();
        } else {
          break;
        }
      } catch (err) {
        console.warn('Tunda sinkronisasi latar belakang ke Google Sheets:', err.message);
        break;
      }
    }
  } finally {
    isFlushingToGas = false;
  }
}

setInterval(flushBackgroundGasQueue, 15000);

// Fungsi menjalankan Robot Kluto POS & mengirim hasilnya ke Google Sheets + Cache VPS
async function executeKlutoSyncJob(targetDateStr) {
  if (klutoSyncStatus.isRunning) {
    return { status: 'error', message: 'Robot Kluto sedang berjalan.' };
  }
  klutoSyncStatus.isRunning = true;
  klutoSyncStatus.lastRunAt = new Date().toISOString();
  klutoSyncStatus.lastError = null;
  klutoSyncStatus.logs = [];
  saveKlutoStatus();

  try {
    const result = await runKlutoSync({
      targetDateStr,
      onLog: (line) => {
        klutoSyncStatus.logs.push(line);
        if (klutoSyncStatus.logs.length > 100) klutoSyncStatus.logs.shift();
      }
    });

    // Kirim ke Google Sheets via sync_pos_kluto
    const gasResp = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        api: 'sync_pos_kluto',
        tanggal: result.tanggal,
        importKomisi: result.importKomisi,
        transaksiProd: result.transaksiProd
      })
    });
    const gasJson = await gasResp.json().catch(() => ({}));

    // Bersihkan cache gaji agar tarikan berikutnya langsung memakai komisi terbaru
    dbCache.salaryCache = {};
    dbCache.lastSyncedAt = new Date().toISOString();
    saveDb();

    klutoSyncStatus.lastSuccessDate = result.tanggalISO;
    klutoSyncStatus.lastResultSummary = {
      tanggal: result.tanggal,
      totalKaryawanKomisi: result.importKomisi.length,
      totalTransaksiProduk: result.transaksiProd.length,
      gasSync: gasJson
    };
    saveKlutoStatus();
    return { status: 'sukses', ...klutoSyncStatus.lastResultSummary };
  } catch (err) {
    klutoSyncStatus.lastError = err.message || String(err);
    klutoSyncStatus.logs.push(`ERROR: ${klutoSyncStatus.lastError}`);
    saveKlutoStatus();
    return { status: 'error', message: klutoSyncStatus.lastError };
  } finally {
    klutoSyncStatus.isRunning = false;
    saveKlutoStatus();
  }
}

// Penjadwal Otomatis Tengah Malam (Setiap jam 00:05 WIB)
let lastAutoTriggeredDate = '';
setInterval(() => {
  const nowJakarta = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  const hh = nowJakarta.getHours();
  const mm = nowJakarta.getMinutes();
  const todayKey = `${nowJakarta.getFullYear()}-${String(nowJakarta.getMonth() + 1).padStart(2, '0')}-${String(nowJakarta.getDate()).padStart(2, '0')}`;

  if (hh === 0 && mm >= 5 && mm <= 10 && lastAutoTriggeredDate !== todayKey) {
    lastAutoTriggeredDate = todayKey;
    console.log(`[AUTO-CRON 00:05 WIB] Menjalankan Robot POS Kluto otomatis...`);
    executeKlutoSyncJob().catch((e) => console.error('Auto-cron Kluto error:', e));
  }
}, 30000);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

function sendJson(res, statusCode, obj) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(obj));
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const rawPathname = parsedUrl.pathname;

  // Pastikan akses `/absen` tanpa garis miring otomatis diarahkan ke `/absen/`
  // supaya file `./assets/...` tetap berada di dalam `/absen/assets/...` dan tidak bentrok dengan `/radio`
  if (/^\/(absen|hr|guru|challenge)$/i.test(rawPathname)) {
    res.writeHead(302, { Location: `${rawPathname}/${parsedUrl.search || ''}` });
    return res.end();
  }

  // Normalisasi subpath agar `app.flowsalon.id/absen/`, `app.flowsalon.id/hr/`, dll. berjalan mulus
  const pathname = rawPathname.replace(/^\/(absen|hr|guru|challenge)(?=\/|$)/i, '') || '/';

  // 1. Layani file foto selfie dari /uploads/absen/
  if (pathname.startsWith('/uploads/absen/')) {
    const safeFile = path.basename(pathname);
    const fullPath = path.join(UPLOADS_DIR, safeFile);
    if (fs.existsSync(fullPath)) {
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000' });
      return fs.createReadStream(fullPath).pipe(res);
    }
    res.writeHead(404);
    return res.end('Not found');
  }

  // 2. Endpoint khusus Robot POS Kluto (/api/kluto-sync)
  if (pathname === '/api/kluto-sync') {
    if (req.method === 'GET') {
      return sendJson(res, 200, { status: 'sukses', ...klutoSyncStatus });
    }
    if (req.method === 'POST') {
      const rawBody = await readRequestBody(req);
      let body = {};
      try {
        body = JSON.parse(rawBody || '{}');
      } catch (_) {}
      const result = await executeKlutoSyncJob(body.tanggal);
      return sendJson(res, 200, result);
    }
  }

  // 2b. Endpoint Auto-Update 1-Klik / GitHub Webhook (/api/auto-update)
  // Saat Anda klik "Save to GitHub" di AI Studio, VPS otomatis menarik perubahan & build sendiri tanpa perlu download/terminal!
  if (pathname === '/api/auto-update') {
    exec('git pull && npm install && npm run build', { cwd: __dirname }, (err, stdout, stderr) => {
      if (err) {
        console.error('Auto-update error:', err.message, stderr);
      } else {
        console.log('Auto-update selesai:', stdout);
      }
    });
    return sendJson(res, 200, {
      status: 'sukses',
      message: 'VPS sedang menarik update terbaru dari GitHub & melakukan build otomatis di latar belakang.'
    });
  }

  // 3. Endpoint Utama Backend VPS (/api/backend)
  if (pathname === '/api/backend') {
    try {
      if (req.method === 'GET') {
        const action = parsedUrl.searchParams.get('api') || parsedUrl.searchParams.get('action') || '';
        const email = (parsedUrl.searchParams.get('email') || '').toLowerCase().trim();
        const qs = parsedUrl.searchParams.toString();

        if (action === 'get_initial_data' && email) {
          try {
            const upstream = await fetch(`${GAS_URL}?${qs}`);
            const data = await upstream.json();
            if (data && !data.status) {
              dbCache.initialDataByEmail[email] = data;
              saveDb();
            }
            return sendJson(res, 200, data);
          } catch (e) {
            if (dbCache.initialDataByEmail[email]) {
              return sendJson(res, 200, dbCache.initialDataByEmail[email]);
            }
            throw e;
          }
        }

        if (action === 'get_history' && email) {
          try {
            const upstream = await fetch(`${GAS_URL}?${qs}`);
            const data = await upstream.json();
            if (Array.isArray(data)) {
              dbCache.historyByEmail[email] = data;
              saveDb();
            }
            return sendJson(res, 200, data);
          } catch (e) {
            if (dbCache.historyByEmail[email]) {
              return sendJson(res, 200, dbCache.historyByEmail[email]);
            }
            throw e;
          }
        }

        // Teruskan GET lainnya ke GAS dengan fallback cache
        const cacheKey = `${action}__${qs}`;
        try {
          const upstream = await fetch(`${GAS_URL}?${qs}`);
          const data = await upstream.json();
          dbCache.salaryCache[cacheKey] = data;
          return sendJson(res, 200, data);
        } catch (e) {
          if (dbCache.salaryCache[cacheKey]) {
            return sendJson(res, 200, dbCache.salaryCache[cacheKey]);
          }
          throw e;
        }
      }

      if (req.method === 'POST') {
        const rawBody = await readRequestBody(req);
        const payload = JSON.parse(rawBody || '{}');
        const postType = payload.api || payload.type || '';

        // INSTANT ABSEN DI VPS (< 0.05 detik): Simpan foto di VPS + antrekan ke Google Sheets di latar belakang
        if (postType === 'absen') {
          const clickTime = payload.timestamp ? new Date(payload.timestamp) : new Date();
          const timestampMs = isNaN(clickTime.getTime()) ? Date.now() : clickTime.getTime();
          const isoTime = new Date(timestampMs).toISOString();
          const emailKey = (payload.email || '').toLowerCase().trim();

          // Simpan foto selfie langsung di disk VPS agar ringan & super cepat
          const vpsPhotoUrl = saveBase64PhotoToVps(payload.foto, payload.nama, timestampMs, req.headers.host);

          // Masukkan langsung ke riwayat di VPS
          if (!Array.isArray(dbCache.historyByEmail[emailKey])) {
            dbCache.historyByEmail[emailKey] = [];
          }
          dbCache.historyByEmail[emailKey].unshift({
            waktu: isoTime,
            timestamp: isoTime,
            nama: payload.nama,
            email: payload.email,
            jenis: payload.jenis,
            shift: payload.shift,
            cabang: payload.cabang,
            status_lokasi: payload.statusLokasi,
            link_foto_drive: vpsPhotoUrl,
            progress_materi: payload.materi || '-'
          });

          // Antrekan ke Google Sheets di latar belakang
          dbCache.localAbsensiQueue.push({
            queuedAt: new Date().toISOString(),
            payload: { ...payload, timestamp: isoTime }
          });
          saveDb();

          // Jalankan pengiriman latar belakang tanpa membuat HP karyawan menunggu
          flushBackgroundGasQueue().catch(() => {});

          return sendJson(res, 200, {
            status: 'sukses',
            savedOnVps: true,
            photoUrl: vpsPhotoUrl
          });
        }

        // Untuk POST lainnya, teruskan ke Google Sheets
        const upstream = await fetch(GAS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        });
        const data = await upstream.json();
        return sendJson(res, 200, data);
      }
    } catch (err) {
      return sendJson(res, 500, { status: 'error', message: err.message || 'Kesalahan server VPS' });
    }
  }

  // 4. Layani file statis aplikasi frontend dari folder `dist/`
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    return fs.createReadStream(filePath).pipe(res);
  }

  // SPA Fallback ke dist/index.html
  const indexHtml = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return fs.createReadStream(indexHtml).pipe(res);
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Flow Salon VPS Server aktif. Jalankan `npm run build` untuk membuat tampilan frontend.');
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=============================================================`);
  console.log(`🚀 FLOW SALON VPS SERVER BERJALAN DI PORT ${PORT}`);
  console.log(`🤖 Jadwal Auto-Sync POS Kluto (my.kluto.id): Setiap 00:05 WIB`);
  console.log(`=============================================================`);
});
