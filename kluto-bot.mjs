/**
 * ============================================================================
 * FLOW SALON - ROBOT PENARIK OTOMATIS POS KLUTO (https://my.kluto.id)
 * ============================================================================
 * Tugas Robot setiap tengah malam (atau saat dipicu manual):
 * 1. Login ke https://my.kluto.id
 * 2. Loop seluruh cabang di dropdown pojok kanan bawah (Flow - Cibeber, Serang, Pagebangan, dll)
 * 3. Ambil Report Komisi:
 *    Menu Reports -> Report Komisi -> Pilih Cabang -> Pilih Tanggal (per hari) -> Go -> Baca Tabel / Export Excel
 *    Ditotal per tanggal per karyawan (masuk ke tabel Import Komisi: Tanggal, Pegawai, Cabang, Omset, Komisi)
 *    (Di sistem gaji Flow, Omset Layanan = Omset Report Komisi dikurangi Omset Produk dari Report Transaksi Produk)
 * 4. Ambil Report Transaksi Produk:
 *    Menu Reports -> Report Transaksi -> Pilih Cabang -> Pilih Tanggal -> Filter Kategori: Produk -> Go -> Export Excel / Baca Tabel
 *    (Masuk ke tabel Transaksi Prod: Tanggal, No Invoice, Pegawai, Item, Jumlah, Harga Item, Total Harga, Cabang)
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
  return String(rawName)
    .replace(/\(sendiri\)/gi, '')
    .replace(/\(bantu\)/gi, '')
    .replace(/\(sharing\)/gi, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatToDDMMYYYY(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function formatToMMDDYYYY(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

export function formatToYYYYMMDD(dateObj) {
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const yyyy = dateObj.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Jalankan penarikan otomatis dari https://my.kluto.id untuk 1 tanggal tertentu
 * @param {Object} options
 * @param {string} [options.targetDateStr] - Format YYYY-MM-DD (default: hari ini / kemarin saat tengah malam)
 * @param {string} [options.username] - Username/Email login my.kluto.id
 * @param {string} [options.password] - Password login my.kluto.id
 * @param {function} [options.onLog] - Callback log progres
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
  const baseUrl = process.env.KLUTO_BASE_URL || 'https://my.kluto.id';

  if (!username || !password) {
    throw new Error('KLUTO_USERNAME dan KLUTO_PASSWORD belum diatur di file .env VPS.');
  }

  let targetDate = new Date();
  if (options.targetDateStr) {
    const [y, m, d] = options.targetDateStr.split('-').map(Number);
    if (y && m && d) targetDate = new Date(y, m - 1, d);
  } else {
    // Jika dijalankan antara jam 00:00 - 04:00 pagi oleh cron tengah malam, tarik transaksi hari kemarin
    if (targetDate.getHours() < 5) {
      targetDate.setDate(targetDate.getDate() - 1);
    }
  }

  const ddmmyyyy = formatToDDMMYYYY(targetDate);
  const mmddyyyy = formatToMMDDYYYY(targetDate);
  const yyyymmdd = formatToYYYYMMDD(targetDate);

  log(`Memulai Robot Kluto POS untuk tanggal ${ddmmyyyy} (${yyyymmdd})...`);

  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    throw new Error(
      'Playwright belum terinstall di VPS. Jalankan perintah: npm install playwright && npx playwright install chromium'
    );
  }

  const browser = await playwright.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const aggregatedKomisiMap = new Map(); // key: `${namaLower}__${cabang}` -> { tanggal, nama, cabang, omset, komisi }
  const allTransaksiProd = [];

  try {
    // 1. Buka halaman login Kluto
    log(`Membuka ${baseUrl}...`);
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Cari input username/email & password
    const userSel = 'input[name="username"], input[name="email"], input[type="email"], input[type="text"]';
    const passSel = 'input[name="password"], input[type="password"]';
    await page.waitForSelector(passSel, { timeout: 25000 });

    await page.fill(userSel, username);
    await page.fill(passSel, password);

    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Masuk"), button:has-text("Sign In")');
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        submitBtn.click()
      ]);
    } else {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(4000);
    }

    log('Login berhasil. Membaca daftar cabang Flow di pojok kanan bawah...');

    // Buka halaman Report Transaksi untuk membaca dropdown cabang di pojok kanan bawah
    await page.goto(`${baseUrl}/boss/index?page=report-transaksi`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    await page.waitForTimeout(2500);

    // Deteksi dropdown cabang di pojok kanan bawah (seperti di screenshot: "Flow - Cibeber")
    const branches = await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const sel of selects) {
        const opts = Array.from(sel.options).map((o) => ({
          value: o.value,
          label: (o.textContent || '').trim()
        }));
        if (opts.some((o) => /flow|cibeber|serang|pagebangan/i.test(o.label))) {
          return opts.filter((o) => o.value && !/pilih|semua cabang/i.test(o.label));
        }
      }
      return [];
    });

    const branchList =
      branches.length > 0
        ? branches
        : [{ value: 'default', label: 'Flow Default' }];

    log(`Ditemukan ${branchList.length} cabang: ${branchList.map((b) => b.label).join(', ')}`);

    // Helper untuk mengganti cabang di pojok kanan bawah
    const selectBranchOnPage = async (branchValue, branchLabel) => {
      if (branchValue === 'default') return;
      const changed = await page.evaluate((val) => {
        const selects = Array.from(document.querySelectorAll('select'));
        for (const sel of selects) {
          const hasOpt = Array.from(sel.options).some((o) => o.value === val);
          if (hasOpt) {
            if (sel.value !== val) {
              sel.value = val;
              sel.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
            return false;
          }
        }
        return false;
      }, branchValue);

      if (changed) {
        log(`Beralih ke cabang: ${branchLabel}...`);
        await page.waitForTimeout(3000);
      }
    };

    // Helper untuk mengisi tanggal awal & akhir di PERIODE SEARCH dan klik tombol GO
    const fillDateAndClickGo = async (dateStrDDMMYYYY, filterProdukOnly = false) => {
      await page.evaluate(
        ({ dStr, filterProduk }) => {
          // Cari 2 input tanggal di bagian PERIODE SEARCH
          const inputs = Array.from(
            document.querySelectorAll('input[type="text"], input[type="date"], input:not([type="search"]):not([type="hidden"])')
          ).filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width > 50 && rect.height > 15;
          });

          if (inputs.length >= 2) {
            inputs[0].value = dStr;
            inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[0].dispatchEvent(new Event('change', { bubbles: true }));

            inputs[1].value = dStr;
            inputs[1].dispatchEvent(new Event('input', { bubbles: true }));
            inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
          }

          // Jika perlu filter Kategori -> Produk (di halaman Report Transaksi)
          if (filterProduk) {
            const selects = Array.from(document.querySelectorAll('select'));
            for (const sel of selects) {
              const prodOpt = Array.from(sel.options).find(
                (o) => (o.textContent || '').trim().toLowerCase() === 'produk'
              );
              const hasSemuaTipe = Array.from(sel.options).some((o) =>
                /semua tipe/i.test(o.textContent || '')
              );
              if (prodOpt && hasSemuaTipe) {
                sel.value = prodOpt.value;
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                break;
              }
            }
          }
        },
        { dStr: dateStrDDMMYYYY, filterProduk: filterProdukOnly }
      );

      await page.waitForTimeout(500);

      // Klik tombol GO
      const goBtn = await page.$(
        'button:has-text("GO"), input[value="GO"], a:has-text("GO"), .btn-primary:has-text("GO")'
      );
      if (goBtn) {
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {}),
          goBtn.click()
        ]);
      }
      await page.waitForTimeout(2500);

      // Ubah Show entries DataTables ke 100 / Semua agar semua baris terbaca langsung
      await page.evaluate(() => {
        const lenSelect = document.querySelector('select[name$="_length"]');
        if (lenSelect) {
          const opts = Array.from(lenSelect.options);
          const maxOpt = opts[opts.length - 1];
          if (maxOpt) {
            lenSelect.value = maxOpt.value;
            lenSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
      await page.waitForTimeout(1000);
    };

    // =========================================================================
    // TAHAP 1: AMBIL REPORT KOMISI (Per Cabang, Per Tanggal, Ditotal Per Karyawan)
    // =========================================================================
    for (const branch of branchList) {
      const cleanBranchName = branch.label.replace(/^Flow\s*-\s*/i, '').trim();
      log(`[Report Komisi] Membuka Report Komisi untuk cabang ${branch.label}...`);

      // Navigasi ke Report Komisi melalui menu Reports -> Report Komisi atau URL langsung
      await page.goto(`${baseUrl}/boss/index?page=report-komisi`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      await page.waitForTimeout(2000);

      // Jika link di menu berbeda, cari di navbar REPORTS -> Report Komisi
      const isKomisiPage = await page.evaluate(() =>
        document.body.innerText.toLowerCase().includes('komisi')
      );
      if (!isKomisiPage) {
        const komisiLink = await page.$('a:has-text("Report Komisi"), a[href*="komisi"]');
        if (komisiLink) {
          await komisiLink.click();
          await page.waitForTimeout(2500);
        }
      }

      await selectBranchOnPage(branch.value, branch.label);
      await fillDateAndClickGo(ddmmyyyy, false);

      // Baca seluruh baris tabel komisi (termasuk jika ada pagination DataTables)
      let hasNextPage = true;
      while (hasNextPage) {
        const rowsOnPage = await page.evaluate(() => {
          const table = document.querySelector('table');
          if (!table) return [];
          const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
            (th.textContent || '').trim().toLowerCase()
          );
          const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
          return bodyRows.map((tr) => {
            const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
              (td.innerText || td.textContent || '').trim()
            );
            return { headers, cells };
          });
        });

        for (const r of rowsOnPage) {
          const { headers, cells } = r;
          if (!cells || cells.length < 3) continue;
          if (cells.length === 1 || /no data|tidak ada data|kosong/i.test(cells[0])) continue;

          // Deteksi seluruh kolom Report Komisi Kluto:
          // ID Pegawai | Pegawai | Jml Transaksi | Jml Layanan | Omzet Bruto | Omzet Netto | Komisi
          const idxIdPegawai = headers.findIndex((h) =>
            /id\s*pegawai|id\s*staff|id\s*karyawan|^id$|nik/i.test(h)
          );
          const idxNama = headers.findIndex((h) =>
            /^(pegawai|nama|staff|karyawan|terapis|stylist)/i.test(h) ||
            (!/id/i.test(h) && /pegawai|nama|staff|karyawan/i.test(h))
          );
          const idxJmlTransaksi = headers.findIndex((h) =>
            /jml\s*transaksi|jumlah\s*transaksi|transaksi/i.test(h)
          );
          const idxJmlLayanan = headers.findIndex((h) =>
            /jml\s*layanan|jumlah\s*layanan|layanan|item/i.test(h)
          );
          const idxOmzetBruto = headers.findIndex((h) =>
            /bruto|omzet\s*bruto|omset\s*bruto/i.test(h)
          );
          const idxOmzetNetto = headers.findIndex((h) =>
            /netto|omzet\s*netto|omset\s*netto/i.test(h)
          );
          const idxOmsetGeneric = headers.findIndex((h) =>
            /omset|omzet|total harga|penjualan/i.test(h)
          );
          const idxKomisi = headers.findIndex((h) => /komisi|nominal komisi/i.test(h));

          // Fallback posisi kolom standar Kluto Report Komisi jika header tidak terbaca spesifik
          const rawIdPegawai =
            idxIdPegawai !== -1
              ? cells[idxIdPegawai]
              : cells.length >= 7 && /^\d+$/.test(cells[0])
              ? cells[0]
              : cells.length >= 8 && /^\d+$/.test(cells[1])
              ? cells[1]
              : '';

          const rawNama =
            idxNama !== -1
              ? cells[idxNama]
              : cells.length >= 7 && /^\d+$/.test(cells[0])
              ? cells[1]
              : cells[1] || '';

          const rawJmlTrx =
            idxJmlTransaksi !== -1
              ? cells[idxJmlTransaksi]
              : cells.length >= 7
              ? cells[cells.length - 5]
              : '0';

          const rawJmlLay =
            idxJmlLayanan !== -1
              ? cells[idxJmlLayanan]
              : cells.length >= 7
              ? cells[cells.length - 4]
              : '0';

          const rawBruto =
            idxOmzetBruto !== -1
              ? cells[idxOmzetBruto]
              : cells.length >= 7
              ? cells[cells.length - 3]
              : idxOmsetGeneric !== -1
              ? cells[idxOmsetGeneric]
              : '0';

          const rawNetto =
            idxOmzetNetto !== -1
              ? cells[idxOmzetNetto]
              : cells.length >= 7
              ? cells[cells.length - 2]
              : rawBruto;

          const rawKomisi =
            idxKomisi !== -1 ? cells[idxKomisi] : cells[cells.length - 1] || '0';

          const nama = cleanStaffName(rawNama);
          if (!nama || /^total|grand total$/i.test(nama)) continue;

          const idPegawai = String(rawIdPegawai || '').trim();
          const jmlTransaksi = cleanRupiah(rawJmlTrx);
          const jmlLayanan = cleanRupiah(rawJmlLay);
          const omzetBruto = cleanRupiah(rawBruto);
          const omzetNetto = cleanRupiah(rawNetto);
          const komisiVal = cleanRupiah(rawKomisi);

          if (omzetBruto === 0 && omzetNetto === 0 && komisiVal === 0 && jmlTransaksi === 0) continue;

          const mapKey = `${idPegawai || nama.toLowerCase()}__${cleanBranchName.toLowerCase()}`;
          const existing = aggregatedKomisiMap.get(mapKey) || {
            tanggal: mmddyyyy,
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
        }

        // Cek tombol Next di DataTables jika masih ada halaman berikutnya
        const nextClicked = await page.evaluate(() => {
          const nextBtn = document.querySelector(
            '.paginate_button.next:not(.disabled), li.next:not(.disabled) a'
          );
          if (nextBtn) {
            nextBtn.click();
            return true;
          }
          return false;
        });
        if (nextClicked) {
          await page.waitForTimeout(1200);
        } else {
          hasNextPage = false;
        }
      }
    }

    // =========================================================================
    // TAHAP 2: AMBIL REPORT TRANSAKSI PRODUK (Filter Kategori -> Produk)
    // =========================================================================
    for (const branch of branchList) {
      const cleanBranchName = branch.label.replace(/^Flow\s*-\s*/i, '').trim();
      log(`[Report Transaksi Produk] Membuka Report Transaksi untuk cabang ${branch.label}...`);

      await page.goto(`${baseUrl}/boss/index?page=report-transaksi`, {
        waitUntil: 'domcontentloaded',
        timeout: 45000
      });
      await page.waitForTimeout(2000);

      await selectBranchOnPage(branch.value, branch.label);
      await fillDateAndClickGo(ddmmyyyy, true);

      let hasNextPage = true;
      while (hasNextPage) {
        const rowsOnPage = await page.evaluate(() => {
          const table = document.querySelector('table');
          if (!table) return [];
          const headers = Array.from(table.querySelectorAll('thead th')).map((th) =>
            (th.textContent || '').trim().toLowerCase()
          );
          const bodyRows = Array.from(table.querySelectorAll('tbody tr'));
          return bodyRows.map((tr) => {
            const cells = Array.from(tr.querySelectorAll('td')).map((td) =>
              (td.innerText || td.textContent || '').trim()
            );
            return { headers, cells };
          });
        });

        for (const r of rowsOnPage) {
          const { headers, cells } = r;
          if (!cells || cells.length < 5) continue;
          if (/no data|tidak ada data|kosong/i.test(cells[0])) continue;

          // Sesuai screenshot Report Transaksi Kluto:
          // Kolom: No | No Invoice | Tanggal | Item | Komisi | Jumlah | Harga Item | Total Harga ...
          const idxInv = headers.findIndex((h) => h.includes('invoice'));
          const idxItem = headers.findIndex((h) => h === 'item' || h.includes('produk'));
          const idxKomisiStaff = headers.findIndex((h) => h === 'komisi' || h.includes('staff'));
          const idxJumlah = headers.findIndex((h) => h.includes('jumlah') || h.includes('qty'));
          const idxHarga = headers.findIndex((h) => h.includes('harga item') || h === 'harga');

          const noInvoice = cells[idxInv !== -1 ? idxInv : 1] || '';
          const itemCell = cells[idxItem !== -1 ? idxItem : 3] || '';
          const staffCell = cells[idxKomisiStaff !== -1 ? idxKomisiStaff : 4] || '';
          const qtyCell = cells[idxJumlah !== -1 ? idxJumlah : 5] || '1';
          const hargaCell = cells[idxHarga !== -1 ? idxHarga : 6] || '0';

          // Di Kluto, 1 baris No Invoice bisa memiliki beberapa sub-item per baris baru (1. ItemA \n 2. ItemB)
          const itemLines = itemCell
            .split(/\r?\n/)
            .map((s) => s.replace(/^\d+\.\s*/, '').trim())
            .filter(Boolean);
          const staffLines = staffCell
            .split(/\r?\n/)
            .map((s) => cleanStaffName(s))
            .filter(Boolean);
          const qtyLines = qtyCell
            .split(/\r?\n/)
            .map((s) => cleanRupiah(s) || 1);
          const hargaLines = hargaCell
            .split(/\r?\n/)
            .map((s) => cleanRupiah(s));

          const count = Math.max(itemLines.length, 1);
          for (let i = 0; i < count; i++) {
            const itemName = itemLines[i] || itemLines[0] || '';
            const staffName = staffLines[i] || staffLines[0] || '';
            const qty = qtyLines[i] || qtyLines[0] || 1;
            const harga = hargaLines[i] || hargaLines[0] || 0;
            if (!itemName && !staffName) continue;

            allTransaksiProd.push({
              tanggal: mmddyyyy,
              no_invoice: noInvoice,
              cabang: cleanBranchName,
              pegawai: staffName,
              nama: staffName,
              item: itemName,
              produk: itemName,
              jumlah: qty,
              harga_item: harga,
              total_harga: qty * harga,
              komisi: 0
            });
          }
        }

        const nextClicked = await page.evaluate(() => {
          const nextBtn = document.querySelector(
            '.paginate_button.next:not(.disabled), li.next:not(.disabled) a'
          );
          if (nextBtn) {
            nextBtn.click();
            return true;
          }
          return false;
        });
        if (nextClicked) {
          await page.waitForTimeout(1200);
        } else {
          hasNextPage = false;
        }
      }
    }

    const importKomisiList = Array.from(aggregatedKomisiMap.values());
    log(
      `Selesai menarik data Kluto POS (${ddmmyyyy}): ${importKomisiList.length} rekap komisi karyawan & ${allTransaksiProd.length} transaksi produk.`
    );

    return {
      status: 'sukses',
      tanggal: mmddyyyy,
      tanggalISO: yyyymmdd,
      importKomisi: importKomisiList,
      transaksiProd: allTransaksiProd,
      logs
    };
  } finally {
    await browser.close();
  }
}

// Jika dijalankan langsung dari terminal VPS: `node kluto-bot.mjs [YYYY-MM-DD]`
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const customDate = process.argv[2];
  runKlutoSync({ targetDateStr: customDate })
    .then(async (res) => {
      const gasUrl = process.env.GAS_URL;
      if (gasUrl) {
        console.log('Mengirim hasil tarikan Kluto ke Google Sheets...');
        const resp = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            api: 'sync_pos_kluto',
            tanggal: res.tanggal,
            importKomisi: res.importKomisi,
            transaksiProd: res.transaksiProd
          })
        });
        console.log('Respon Google Sheets:', await resp.text());
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Gagal menjalankan Kluto Bot:', err);
      process.exit(1);
    });
}
