/**
 * ============================================================================
 * FLOW SALON - ROBOT PENARIK OTOMATIS POS KLUTO (https://my.kluto.id)
 * ============================================================================
 * Mode Direct HTTP API Engine (Tanpa Browser / Bebas Timeout Playwright):
 * 1. Login langsung via endpoint resmi `ab-action.php?jen=sign-in`
 * 2. Mendeteksi seluruh cabang di `<select onchange="gantiStore(this.value)">`
 *    - Flow - Cilegon -> Pagebangan
 *    - Flow - Cibeber -> Cibeber
 *    - Flow - Serang  -> Serang
 * 3. Menarik Report Komisi per tanggal per cabang langsung dari:
 *    `boss/pages/report/report-komisi/data.php?start=YYYY-MM-DD&end=YYYY-MM-DD`
 *    Lengkap 9 Kolom:
 *    Tanggal | Cabang | ID Pegawai | Pegawai | Jml Transaksi | Jml Layanan | Omzet Bruto | Omzet Netto | Komisi
 * 4. Menarik Report Transaksi Produk per tanggal per cabang langsung dari JSON API:
 *    `boss/pages/report/report-transaksi/data_table.php?mulai=YYYY-MM-DD&akhir=YYYY-MM-DD&item_type=product&length=2147483647`
 *    (Otomatis mengabaikan transaksi Void & menyertakan kode SKU produk).
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export function cleanRupiah(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  let s = String(val).replace(/Rp\s*/gi, '').trim();
  if (!s) return 0;
  s = s.replace(/[^\d,.-]/g, '');
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    }
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  if (s.includes('.')) {
    if ((s.match(/\./g) || []).length > 1) return parseFloat(s.replace(/\./g, '')) || 0;
    const parts = s.split('.');
    if (parts[1] && parts[1].length === 3) return parseFloat(s.replace(/\./g, '')) || 0;
    return parseFloat(s) || 0;
  }
  if (s.includes(',')) {
    if ((s.match(/,/g) || []).length > 1) return parseFloat(s.replace(/,/g, '')) || 0;
    const parts = s.split(',');
    if (parts[1] && parts[1].length <= 2) return parseFloat(parts[0] + '.' + parts[1]) || 0;
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  return parseFloat(s) || 0;
}

export function cleanStaffName(rawName) {
  if (!rawName) return '';
  const cleaned = String(rawName)
    .replace(/<[^>]*>/g, '')
    .replace(/\(sendiri\)/gi, '')
    .replace(/\(bantu\)/gi, '')
    .replace(/\(sharing\)/gi, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned === '-' ? '' : cleaned;
}

export function normalizeBranchLabel(rawLabel) {
  const clean = String(rawLabel || '')
    .replace(/^Flow\s*-\s*/i, '')
    .trim();
  if (/^cilegon$/i.test(clean)) return 'Pagebangan';
  return clean || 'Utama';
}

export function formatToDDMMYYYY(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatToMMDDYYYY(dateObj) {
  // Format sesuai screenshot Google Sheet user: M/D/YYYY (contoh: 4/1/2026)
  const d = dateObj.getDate();
  const m = dateObj.getMonth() + 1;
  const yyyy = dateObj.getFullYear();
  return `${m}/${d}/${yyyy}`;
}

export function formatToYYYYMMDD(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

export function parseISODateString(dateStr) {
  if (!dateStr) return null;
  const clean = String(dateStr).trim();
  const m = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(clean);
  return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function expandDateRange(startDateStr, endDateStr) {
  let start = parseISODateString(startDateStr);
  let end = parseISODateString(endDateStr || startDateStr);

  if (!start) {
    const now = new Date();
    if (now.getHours() < 5) {
      now.setDate(now.getDate() - 1);
    }
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (!end) {
    end = new Date(start.getTime());
  }
  if (start.getTime() > end.getTime()) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  const dates = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const maxDays = 62;
  while (cursor.getTime() <= end.getTime() && dates.length < maxDays) {
    dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie().map((c) => c.split(';')[0]);
  }
  const raw = headers.get('set-cookie');
  if (!raw) return [];
  return raw.split(/,(?=\s*[A-Za-z0-9_-]+=)/).map((c) => c.split(';')[0].trim());
}

function mergeCookies(existingCookieStr, newCookieList) {
  const map = {};
  const parts = (existingCookieStr || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const p of [...parts, ...newCookieList]) {
    const eq = p.indexOf('=');
    if (eq !== -1) {
      const k = p.slice(0, eq).trim();
      const v = p.slice(eq + 1).trim();
      map[k] = v;
    }
  }
  return Object.entries(map)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

function decodeHtmlText(str) {
  return String(str || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse tabel HTML dari `boss/pages/report/report-komisi/data.php`
 */
function parseKomisiHtmlTable(html) {
  const rows = [];
  if (!html) return rows;

  const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/i);
  let headers = [];
  if (theadMatch) {
    const thMatches = theadMatch[0].match(/<th[^>]*>[\s\S]*?<\/th>/gi) || [];
    headers = thMatches.map((th) => decodeHtmlText(th).toLowerCase());
  }

  const tbodyMatch = html.match(/<tbody[\s\S]*?<\/tbody>/i);
  const bodyHtml = tbodyMatch ? tbodyMatch[0] : html;
  const trMatches = bodyHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  for (const tr of trMatches) {
    const tdMatches = tr.match(/<td[^>]*>[\s\S]*?<\/td>/gi) || [];
    if (tdMatches.length < 5) continue;
    const cells = tdMatches.map((td) => decodeHtmlText(td));
    rows.push({ headers, cells });
  }
  return rows;
}

/**
 * Jalankan penarikan otomatis dari https://my.kluto.id via Direct HTTP API
 */
export async function runKlutoSync(options = {}) {
  const logs = [];
  const log = (msg) => {
    const line = `[${new Date().toLocaleTimeString('id-ID')}] ${msg}`;
    console.log(line);
    logs.push(line);
    if (options.onLog) options.onLog(line);
  };

  const username = options.username || process.env.KLUTO_USERNAME || '';
  const password = options.password || process.env.KLUTO_PASSWORD || '';
  const baseUrl = (process.env.KLUTO_BASE_URL || 'https://my.kluto.id').replace(/\/$/, '');

  if (!username || !password) {
    throw new Error('KLUTO_USERNAME dan KLUTO_PASSWORD belum diatur di file .env VPS.');
  }

  const startStr = options.startDateStr || options.targetDateStr || '';
  const endStr = options.endDateStr || options.startDateStr || options.targetDateStr || '';
  const targetDates = expandDateRange(startStr, endStr);

  const firstISO = formatToYYYYMMDD(targetDates[0]);
  const lastISO = formatToYYYYMMDD(targetDates[targetDates.length - 1]);

  if (targetDates.length === 1) {
    log(`Memulai Robot Kluto POS (Direct API) untuk tanggal ${formatToDDMMYYYY(targetDates[0])} (${firstISO})...`);
  } else {
    log(`Memulai Robot Kluto POS (Direct API) Rentang Tanggal: ${firstISO} s/d ${lastISO} (${targetDates.length} hari)...`);
  }

  // 1. Ambil session awal dari /form-login
  log(`Menghubungi ${baseUrl}/form-login...`);
  const initResp = await fetch(`${baseUrl}/form-login`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' }
  });
  let cookieHeader = mergeCookies('', extractSetCookies(initResp.headers));

  // 2. Login via ab-action.php?jen=sign-in
  const loginBody = new URLSearchParams({
    pegawai_email: username,
    pegawai_password: password,
    remember: 'on'
  });

  const loginResp = await fetch(`${baseUrl}/ab-action.php?jen=sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    },
    body: loginBody.toString(),
    redirect: 'manual'
  });

  cookieHeader = mergeCookies(cookieHeader, extractSetCookies(loginResp.headers));
  const loginText = await loginResp.text();

  if (!cookieHeader || (/gagal|salah|incorrect|failed/i.test(loginText) && !loginText.includes('boss/index'))) {
    throw new Error('Login ke my.kluto.id gagal. Periksa KLUTO_USERNAME & KLUTO_PASSWORD di .env.');
  }

  log('Login ke my.kluto.id berhasil. Membaca daftar cabang...');

  // 3. Buka boss/index untuk mengambil daftar cabang dari <select onchange="gantiStore(this.value);">
  const dashResp = await fetch(`${baseUrl}/boss/index?page=report-komisi`, {
    headers: {
      Cookie: cookieHeader,
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
    }
  });
  cookieHeader = mergeCookies(cookieHeader, extractSetCookies(dashResp.headers));
  const dashHtml = await dashResp.text();

  const branchList = [];
  const storeSelectMatch = dashHtml.match(/<select[^>]*gantiStore[^>]*>([\s\S]*?)<\/select>/i);
  if (storeSelectMatch) {
    const cleanSelectHtml = storeSelectMatch[1].replace(/<!--[\s\S]*?-->/g, '');
    const optRegex = /<option[^>]*value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/gi;
    let m;
    while ((m = optRegex.exec(cleanSelectHtml)) !== null) {
      const val = m[1].trim();
      const label = decodeHtmlText(m[2]);
      if (val && label && !/semua cabang|pilih/i.test(label)) {
        branchList.push({
          value: val,
          rawLabel: label,
          cleanName: normalizeBranchLabel(label)
        });
      }
    }
  }

  if (branchList.length === 0) {
    branchList.push(
      { value: '21b29648a47a45ad16bb0da0c004dfba', rawLabel: 'Flow - Cibeber', cleanName: 'Cibeber' },
      { value: 'b27d5296bede63b1493a5d321d4e8092', rawLabel: 'Flow - Cilegon', cleanName: 'Pagebangan' },
      { value: 'b7046757c3682a28c5bf2024e57678a0', rawLabel: 'Flow - Serang', cleanName: 'Serang' }
    );
  }

  log(
    `Ditemukan ${branchList.length} cabang: ${branchList
      .map((b) => `${b.rawLabel} (-> ${b.cleanName})`)
      .join(', ')}`
  );

  const switchBranchSession = async (branch) => {
    const switchResp = await fetch(`${baseUrl}/boss/ab-action.php?jen=ganti-store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: cookieHeader,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
      },
      body: `domainstid=${encodeURIComponent(branch.value)}`
    });
    cookieHeader = mergeCookies(cookieHeader, extractSetCookies(switchResp.headers));
    await switchResp.text().catch(() => '');
  };

  const combinedImportKomisi = [];
  const combinedTransaksiProd = [];
  const dayResults = [];

  // 4. Loop setiap tanggal dalam rentang periode
  for (let dayIdx = 0; dayIdx < targetDates.length; dayIdx++) {
    const targetDate = targetDates[dayIdx];
    const ddmmyyyy = formatToDDMMYYYY(targetDate);
    const mmddyyyy = formatToMMDDYYYY(targetDate);
    const yyyymmdd = formatToYYYYMMDD(targetDate);

    if (options.onProgress) {
      options.onProgress({
        currentDayIndex: dayIdx + 1,
        totalDays: targetDates.length,
        currentDateISO: yyyymmdd,
        currentDateDisplay: ddmmyyyy
      });
    }

    log(`--- [Hari ${dayIdx + 1}/${targetDates.length}] Menarik Data Tanggal ${ddmmyyyy} (${yyyymmdd}) ---`);

    const aggregatedKomisiMap = new Map();
    const dayTransaksiProdMap = new Map();

    for (const branch of branchList) {
      const cleanBranchName = branch.cleanName;
      await switchBranchSession(branch);

      // A. Tarik Report Komisi langsung dari data.php?start=YYYY-MM-DD&end=YYYY-MM-DD
      const komisiUrl = `${baseUrl}/boss/pages/report/report-komisi/data.php?start=${yyyymmdd}&end=${yyyymmdd}`;
      const komResp = await fetch(komisiUrl, {
        headers: {
          Cookie: cookieHeader,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        }
      });
      const komHtml = await komResp.text();
      const parsedRows = parseKomisiHtmlTable(komHtml);

      let branchKomisiCount = 0;
      for (const r of parsedRows) {
        const { headers, cells } = r;
        if (!cells || cells.length < 6) continue;
        if (/no data|tidak ada data|kosong|^total$/i.test(cells[0])) continue;

        // Struktur standar Report Komisi Kluto:
        // [0] No | [1] ID Pegawai | [2] Pegawai | [3] Jml Transaksi | [4] Jml Layanan | [5] Jam Kerja | [6] Omzet Bruto | [7] Omzet Netto | [8] Komisi
        const idxIdPegawai = headers.findIndex((h) => /id\s*pegawai|id\s*staff/i.test(h));
        const idxNama = headers.findIndex(
          (h) => !/id/i.test(h) && /pegawai|nama|staff|karyawan/i.test(h)
        );
        const idxJmlTrx = headers.findIndex((h) => /jml\s*transaksi|jumlah\s*transaksi/i.test(h));
        const idxJmlLay = headers.findIndex((h) => /jml\s*layanan|jumlah\s*layanan/i.test(h));
        const idxBruto = headers.findIndex((h) => /omzet\s*bruto|omset\s*bruto|bruto/i.test(h));
        const idxNetto = headers.findIndex((h) => /omzet\s*netto|omset\s*netto|netto/i.test(h));
        const idxKomisi = headers.findIndex((h) => /^komisi$/i.test(h));

        const idPegawai = String(cells[idxIdPegawai !== -1 ? idxIdPegawai : 1] || '').trim();
        const nama = cleanStaffName(cells[idxNama !== -1 ? idxNama : 2] || '');
        if (!nama || /^total|grand total$/i.test(nama)) continue;

        const jmlTransaksi = cleanRupiah(cells[idxJmlTrx !== -1 ? idxJmlTrx : 3]);
        const jmlLayanan = cleanRupiah(cells[idxJmlLay !== -1 ? idxJmlLay : 4]);
        const omzetBruto = cleanRupiah(cells[idxBruto !== -1 ? idxBruto : 6]);
        const omzetNetto = cleanRupiah(cells[idxNetto !== -1 ? idxNetto : 7]);
        const komisiVal = cleanRupiah(cells[idxKomisi !== -1 ? idxKomisi : 8]);

        if (omzetBruto === 0 && omzetNetto === 0 && komisiVal === 0 && jmlTransaksi === 0) continue;

        const mapKey = `${yyyymmdd}__${cleanBranchName.toLowerCase()}__${idPegawai || nama.toLowerCase()}`;
        const existing = aggregatedKomisiMap.get(mapKey) || {
          tanggal: mmddyyyy,
          tanggalISO: yyyymmdd,
          cabang: cleanBranchName,
          id_pegawai: idPegawai,
          pegawai: nama,
          nama,
          jml_transaksi: 0,
          jml_layanan: 0,
          omzet_bruto: 0,
          omzet_netto: 0,
          omset: 0,
          komisi: 0
        };
        if (!existing.id_pegawai && idPegawai) existing.id_pegawai = idPegawai;
        existing.jml_transaksi += jmlTransaksi;
        existing.jml_layanan += jmlLayanan;
        existing.omzet_bruto += omzetBruto;
        existing.omzet_netto += omzetNetto;
        existing.omset += omzetNetto || omzetBruto;
        existing.komisi += komisiVal;
        aggregatedKomisiMap.set(mapKey, existing);
        branchKomisiCount++;
      }

      // B. Tarik Report Transaksi Produk langsung dari JSON API data_table.php
      const prodUrl = `${baseUrl}/boss/pages/report/report-transaksi/data_table.php?mulai=${yyyymmdd}&akhir=${yyyymmdd}&item_type=product&length=2147483647`;
      const prodResp = await fetch(prodUrl, {
        headers: {
          Cookie: cookieHeader,
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36'
        }
      });
      const prodJson = await prodResp.json().catch(() => ({ data: [] }));
      const prodRows = Array.isArray(prodJson?.data) ? prodJson.data : [];

      let branchProdCount = 0;
      for (const trx of prodRows) {
        // Lewati transaksi yang berstatus Void ('n')
        if (String(trx.service_status || 'y').toLowerCase() === 'n') continue;
        const noInvoice = String(trx.service_no_inv || '').trim();
        const items = Array.isArray(trx.items) ? trx.items : [];

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const itemName = String(item.barang_nama || item.package_name || '').trim();
          const skuCode = String(item.barang_kode || '').trim();
          const staffName = cleanStaffName(item.terapis_name || '');
          const qty = cleanRupiah(item.service_qty) || 1;
          const harga = cleanRupiah(item.harga_item);

          // Hanya masukkan transaksi produk yang ada nama pegawainya (terapis_name)
          if (!itemName || !staffName) continue;

          const prodKey = `${yyyymmdd}__${cleanBranchName.toLowerCase()}__${noInvoice}__${i}__${staffName.toLowerCase()}__${itemName.toLowerCase()}`;
          if (!dayTransaksiProdMap.has(prodKey)) {
            dayTransaksiProdMap.set(prodKey, {
              tanggal: mmddyyyy,
              tanggalISO: yyyymmdd,
              no_invoice: noInvoice,
              cabang: cleanBranchName,
              pegawai: staffName,
              nama: staffName,
              sku: skuCode,
              item: itemName,
              produk: itemName,
              jumlah: qty,
              harga_item: harga,
              total_harga: qty * harga,
              komisi: 0
            });
            branchProdCount++;
          }
        }
      }

      log(
        `[${cleanBranchName} - ${ddmmyyyy}] ${branchKomisiCount} komisi pegawai, ${branchProdCount} item produk.`
      );
    }

    const dayKomisiList = Array.from(aggregatedKomisiMap.values());
    const dayProdukList = Array.from(dayTransaksiProdMap.values());

    combinedImportKomisi.push(...dayKomisiList);
    combinedTransaksiProd.push(...dayProdukList);

    const dayPayload = {
      tanggal: mmddyyyy,
      tanggalISO: yyyymmdd,
      tanggalDisplay: ddmmyyyy,
      importKomisi: dayKomisiList,
      transaksiProd: dayProdukList
    };
    dayResults.push(dayPayload);

    if (options.onDayResult) {
      await options.onDayResult(dayPayload);
    }
  }

  log(
    `=== SELESAI TOTAL (${targetDates.length} Hari): ${combinedImportKomisi.length} baris Import Komisi & ${combinedTransaksiProd.length} baris Transaksi Produk ===`
  );

  return {
    status: 'sukses',
    tanggal: dayResults.length === 1 ? dayResults[0].tanggal : `${firstISO} s/d ${lastISO}`,
    tanggalISO: dayResults.length === 1 ? dayResults[0].tanggalISO : lastISO,
    startDate: firstISO,
    endDate: lastISO,
    totalDays: targetDates.length,
    importKomisi: combinedImportKomisi,
    transaksiProd: combinedTransaksiProd,
    dayResults,
    logs
  };
}

// Jika dijalankan langsung dari terminal VPS:
// 1 Tanggal: `node kluto-bot.mjs 2026-04-01`
// Rentang Tanggal: `node kluto-bot.mjs 2026-04-01 2026-04-27`
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const argStart = process.argv[2];
  const argEnd = process.argv[3] || argStart;
  const gasUrl =
    process.env.GAS_URL ||
    'https://script.google.com/macros/s/AKfycby7_TYAxQcEhY9qDb2MhtIWaigpzyG08FnYTuRvlzTLrn_H-2zNdDVqJljL403PxoBJOw/exec';

  runKlutoSync({
    startDateStr: argStart,
    endDateStr: argEnd,
    onDayResult: async (dayRes) => {
      if (gasUrl) {
        console.log(`Mengirim hasil tarikan Kluto tanggal ${dayRes.tanggalISO} ke Google Sheets...`);
        const resp = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            api: 'sync_pos_kluto',
            tanggal: dayRes.tanggal,
            tanggalISO: dayRes.tanggalISO,
            importKomisi: dayRes.importKomisi,
            transaksiProd: dayRes.transaksiProd
          })
        });
        console.log(`Respon Google Sheets (${dayRes.tanggalISO}):`, await resp.text());
      }
    }
  })
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error('Gagal menjalankan Kluto Bot:', err);
      process.exit(1);
    });
}
