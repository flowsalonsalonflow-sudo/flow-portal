/*****************************************************************
 FLOW SALON MASTER BACKEND V3 (FINAL & STABLE)
 1 Backend untuk:
 - App Induk
 - HR Hub
 - GuruHub
 
 Fitur:
 - Anti Timeout (Super Cepat dengan getDisplayValues)
 - Smart Date Parser (Membaca format MM/DD/YYYY & MMM/DD/YYYY)
 - Sinkronisasi Komisi, Kasbon, dan Point otomatis
*****************************************************************/

function getSS() {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      // Fallback jika Standalone Script
      const MANUAL_SS_ID = "1kdizvJSNd5q-pyAWZMUGGnY-UYNJJIIel6nq3kfJe7A"; 
      if (MANUAL_SS_ID) {
        ss = SpreadsheetApp.openById(MANUAL_SS_ID);
      }
    }
    if (ss) {
      try {
        if (ss.getSpreadsheetTimeZone() !== "Asia/Jakarta") {
          ss.setSpreadsheetTimeZone("Asia/Jakarta");
        }
      } catch (tzErr) {
        console.warn("Gagal set timezone spreadsheet: " + tzErr.toString());
      }
      return ss;
    }
    return null;
  } catch (e) {
    console.error("Kesalahan getSS: " + e.toString());
    return null;
  }
}

const FOLDER_ID_ABSEN = "1D8JdT_X6KEeIkk8gVODLWm50UqtaYxS3";
const FOLDER_ID_KTP   = "1g0d7zV9jbv-WEsVX1nrRi3B_ZsGnSTeW";

/* ===================================================== */
function authorizeScript(){
  console.log("Memicu permintaan izin...");
  const email = Session.getActiveUser().getEmail();
  MailApp.getRemainingDailyQuota();
  DriveApp.getRootFolder();
  console.log("Izin berhasil diberikan untuk: " + email);
}

/* ===================================================== */
function doGet(e){
  try{
    if(!e || !e.parameter){
      return response({ status:"sukses", message:"Server backend berjalan." });
    }

    const action = e.parameter.api || e.parameter.action || "";

    switch(action){
      case "login": return loginUser(e);
      case "check_connection": return checkConnection();
      case "forgot_password": return forgotPassword(e);
      case "get_initial_data": return getInitialData(e);
      case "get_history": return getHistory(e);
      case "get_salary_data": return getSalaryData(e);
      case "get_available_periods": return getAvailablePeriods(e);
      case "get_checklist_history": return getChecklistHistory(e);
      case "get_pkl_history": return getPKLHistory();
      case "get_all_history": return getAllHistory();
      case "get_all_salary_data": return getAllSalaryData(e);
      case "export_full_database": return exportFullDatabase(e);
      case "deduplicate_pos_kluto": return deduplicatePosKluto(e.parameter || {});
      default: return response({ status:"error", message:"Action tidak valid" });
    }
  }catch(err){
    return response({ status:"error", message:err.toString() });
  }
}

/* ===================================================== */
function doPost(e){
  try{
    const p = JSON.parse(e.postData.contents);
    const postType = p.api || p.type || "";

    switch(postType){
      case "signup": return signupUser(p);
      case "absen": return submitAbsen(p);
      case "update_absen": return updateAbsen(p);
      case "tugas": return submitChecklist(p);
      case "submit_kasbon": return submitKasbon(p);
      case "delete_kasbon": return deleteKasbon(p);
      case "submit_transfer": return submitTransfer(p);
      case "delete_transfer": return deleteTransfer(p);
      case "sync_pos_kluto": return syncPosKluto(p);
      case "deduplicate_pos_kluto": return deduplicatePosKluto(p);
      default: return response({ status:"error", message:"Post type invalid" });
    }
  }catch(err){
    return response({ status:"error", message:err.toString() });
  }
}

/*****************************************************************
 LOGIN & EMPLOYEE DATE HELPERS
*****************************************************************/
function getEmployeeJoinDate(emp) {
  if (!emp) return "";
  return emp.masuk_tgl || emp.Masuk_Tgl || emp.join_date || emp.Join_Date || emp.timestamp || emp.Timestamp || emp.waktu || emp.Waktu || emp.tanggal || emp.Tanggal || emp._colA || "";
}

function getEmployeeOutDate(emp) {
  if (!emp) return "";
  return emp.keluar_tgl || emp.Keluar_Tgl || emp.resign_date || emp.Resign_Date || "";
}

function loginUser(e){
  const email = (e.parameter.email || "").toLowerCase().trim();
  const pass  = (e.parameter.pass || "").toString();
  const users = getSheetData("Karyawan");

  const user = users.find(u =>
    (u.email || "").toLowerCase().trim() == email &&
    (u.password || "").toString() == pass
  );

  if(!user) return response({ status:"error", message:"Email atau Password salah" });

  const empJoinDate = getEmployeeJoinDate(user);
  const empOutDate = getEmployeeOutDate(user);

  return response({
    status:"sukses",
    id_pegawai: user.id_pegawai || user.id_pos || user.idpegawai || user.idpos || user.id || user.nik || user["ID Pegawai"] || user["ID POS"] || "",
    nama:user.nama || "",
    email:user.email || "",
    jabatan:user.jabatan || "",
    jamKhusus:user.jam_khusus || user.jamkhusus || "",
    ttl:user.ttl || "",
    alamat:user.alamat || "",
    wa:user.wa || "",
    kNama:user.k_nama || "",
    kHub:user.k_hub || "",
    kWa:user.k_wa || "",
    joinDate: empJoinDate,
    join_date: empJoinDate,
    timestamp: empJoinDate,
    keluar_tgl: empOutDate
  });
}

/*****************************************************************
 FORGOT PASSWORD
*****************************************************************/
function forgotPassword(e){
  const email = (e.parameter.email || "").toLowerCase().trim();
  const users = getSheetData("Karyawan");
  const user = users.find(u => (u.email || "").toLowerCase().trim() == email);

  if(!user) return response({ status:"error", message:"Masukkan email yang terdaftar." });

  MailApp.sendEmail({
    to:user.email,
    subject:"Pemulihan Password - Flow Salon Portal",
    body: `Halo ${user.nama},\n\nPassword Anda adalah: ${user.password}\n\nSalam,\nFlow Salon IT`
  });

  return response({ status:"sukses", message:"Password telah dikirim ke emailmu." });
}

/*****************************************************************
 GET INITIAL DATA
*****************************************************************/
function getInitialData(e){
  const email = (e.parameter.email || "").toLowerCase().trim();
  let userProfile = null;
  let lastLog = null;

  let joinDate = null;

  if(email){
    const emp = getUserByEmail(email);
    if(emp){
      joinDate = getEmployeeJoinDate(emp) || null;
      const outDate = getEmployeeOutDate(emp) || "";
      userProfile = {
        id_pegawai: emp.id_pegawai || emp.id_pos || emp.idpegawai || emp.idpos || emp.id || emp.nik || emp["ID Pegawai"] || emp["ID POS"] || "",
        nama:emp.nama || "", email:emp.email || "", jabatan:emp.jabatan || "",
        jamKhusus:emp.jam_khusus || "", ttl:emp.ttl || "", alamat:emp.alamat || "",
        wa:emp.wa || "", kNama:emp.k_nama || "", kHub:emp.k_hub || "", kWa:emp.k_wa || "",
        joinDate: joinDate || "",
        join_date: joinDate || "",
        timestamp: joinDate || "",
        keluar_tgl: outDate
      };
    }

    const ss = getSS();
    if (ss) {
      const allSheets = ss.getSheets();
      const absenSheets = allSheets.filter(s => s.getName().startsWith("Absensi_") || s.getName() === "Absensi");
      absenSheets.sort((a, b) => b.getName().localeCompare(a.getName()));

      const recentSheets = absenSheets.slice(0, 2);
      for (const sheet of recentSheets) {
        const data = getSheetData(sheet.getName());
        const userLogs = data.filter(row => (row.email || "").toString().toLowerCase().trim() === email);
        if (userLogs.length > 0) {
          const lastEntry = userLogs[userLogs.length - 1];
          lastLog = {
            waktu: lastEntry.waktu,
            materi: lastEntry.progress_materi || lastEntry.materi || "" 
          };
          break; 
        }
      }
    } else {
      return response({ status: "error", message: "Spreadsheet tidak dapat diakses." });
    }
  }

  const hkLibur = getHariKhususAndLiburData();
  return response({
    userProfile:userProfile, joinDate: joinDate, lastLog: lastLog, materiList:getSheetData("Materi"),
    sop:getSheetData("SOP"), pesanManager:getLatestPesan(), tugasDef:getSheetData("TugasDef"),
    lokasi:getSheetData("Lokasi"), tips:getSheetData("Tips"), 
    hariKhusus: hkLibur.hariKhusus,
    hariLibur: hkLibur.hariLibur,
    hariIzin: getSheetData("Izin")
  });
}

/*****************************************************************
 HISTORY PERSONAL
*****************************************************************/
function getHistory(e){
  const email = (e.parameter.email || "").toLowerCase().trim();
  const ss = getSS();
  if (!ss) return response([]);
  
  const user = getUserByEmail(email);
  const userName = user ? (user.nama || "").toLowerCase().trim() : "";
  const userId = user ? String(user.id_pegawai || user.id_pos || user.idpegawai || user.idpos || user.id || user.nik || user["ID Pegawai"] || user["ID POS"] || "").trim() : "";

  let all = [];
  ss.getSheets().forEach(s => {
    const sName = s.getName();
    if (sName === "Absensi" || sName.startsWith("Absensi_")) {
      all = all.concat(getSheetDataFiltered(sName, email, userName, userId));
    }
  });
  
  all.sort((a, b) => parseDateSafe(b.waktu || b.Waktu) - parseDateSafe(a.waktu || a.Waktu));
  return response(all);
}

/*****************************************************************
 Gaji / Payroll (Dengan Komisi, Kasbon, Point)
*****************************************************************/
function getSalaryData(e){
  const email = (e.parameter.email || "").toLowerCase().trim();
  const periode = e.parameter.periode || ""; 
  const paramIdPegawai = (e.parameter.id_pegawai || e.parameter.id_pos || e.parameter.id || "").toString().trim();
  const targetP = parseToYYYYMM(periode);
  const karyawan = getSheetData("Karyawan");
  const user = karyawan.find(u => (u.email || "").toLowerCase().trim() === email);
  const userName = user ? (user.nama || "").toLowerCase().trim() : "";
  const userPosId = user ? String(user.id_pegawai || user.id_pos || user.idpegawai || user.idpos || user.id || user.nik || user["ID Pegawai"] || user["ID POS"] || "").trim() : paramIdPegawai;
  const allEmployeeNames = karyawan.map(u => (u.nama || u.Nama || "").toLowerCase().trim()).filter(Boolean);
  const allEmployeeIds = karyawan.map(u => String(u.id_pegawai || u.id_pos || u.idpegawai || u.idpos || u.id || u.nik || u["ID Pegawai"] || u["ID POS"] || "").trim()).filter(Boolean);

  const masterGaji = getSheetDataFiltered("Master_Gaji", email, userName, userPosId);
  
  const userSalaries = masterGaji.filter(r => {
    const pVal = r.bulan_berlaku || r.Bulan_Berlaku || r.Periode || r.periode || r.bulan || r.Bulan || "";
    const p = parseToYYYYMM(pVal);
    return p && p <= targetP;
  });

  userSalaries.sort((a, b) => {
    const pa = parseToYYYYMM(a.bulan_berlaku || a.Bulan_Berlaku || a.Periode || a.periode || a.bulan || a.Bulan || "") || "";
    const pb = parseToYYYYMM(b.bulan_berlaku || b.Bulan_Berlaku || b.Periode || b.periode || b.bulan || b.Bulan || "") || "";
    return pb.localeCompare(pa);
  });

  const findLatest = (fields) => {
    for (const row of userSalaries) {
      for (const f of fields) {
        const val = row[f];
        if (val !== undefined && val !== "" && val !== null) {
          const n = cleanNumBackend(val);
          if (n >= 0) return n;
        }
      }
    }
    return 0;
  };
  const g_pokok = findLatest(['gaji_pokok', 'Gaji_Pokok', 'gaji', 'Gaji']);
  const u_makan = findLatest(['uang_makan', 'Uang_Makan']);
  const b_disiplin = findLatest(['bonus_disiplin', 'Bonus_Disiplin']);
  const target_omset = findLatest(['target_omset', 'Target_Omset', 'Target Omset', 'target omset']);

  const salaryMatch = userSalaries[0];
  const komisi = [];

  let komisiTambahan = [];
  try {
    const komisiTambahanRaw = getSheetDataFiltered("Komisi Tambahan", email, userName, userPosId);
    if (komisiTambahanRaw && komisiTambahanRaw.length > 0) {
      komisiTambahan = komisiTambahanRaw.filter(r => {
        const rPeriodeVal = r.tanggal || r.tgl || r.date || r.Date || r.periode || r.bulan_berlaku || r.bulan || r.waktu || "";
        return parseToYYYYMM(rPeriodeVal) === targetP;
      }).map(r => ({
        tanggal: r.tanggal || r.waktu || r.tgl || r.date || r.Date || "",
        nominal: cleanNumBackend(r.nominal || r.komisi || r.jumlah || 0), 
        keterangan: r.keterangan || r.uraian || r.keterangan_komisi || r.Keterangan || ""
      }));
    }
  } catch (err) {
    console.error("Gagal mengambil data Komisi Tambahan: " + err.toString());
  }

  const kasbon = getSheetDataFiltered("Kasbon", email, userName, userPosId).filter(r => {
    const rPeriodeVal = r.tanggal || r.tgl || r.date || r.Date || r.periode || r.bulan_berlaku || r.bulan || r.waktu || "";
    return parseToYYYYMM(rPeriodeVal) === targetP;
  }).map(r => ({
    tanggal: r.tanggal || r.waktu || r.tgl || r.date || r.Date || "",
    nominal: cleanNumBackend(r.nominal || r.kasbon || r.jumlah || 0),
    keterangan: r.keterangan || r.uraian || r.keterangan_kasbon || ""
  }));

  const pointRaw = getSheetDataFiltered("Point", email, userName, userPosId);
  let pt_total_base = findLatest(['total_point', 'point', 'total_poin', 'Point']);
  let pt_from_sheet = 0;
  
  if (pointRaw.length > 0) {
    pt_from_sheet = pointRaw.filter(r => {
      const rPeriodeVal = r.periode || r.bulan_berlaku || r.bulan || r.tanggal || r.waktu || r.tgl || r.date || "";
      return parseToYYYYMM(rPeriodeVal) === targetP;
    }).reduce((acc, curr) => acc + cleanNumBackend(curr.nominal || curr.point || curr.poin || curr.total_point || curr.total || 0), 0);
  }

  let pointProduk = [];
  try {
    let pProdRaw = getSheetData("Point Produk");
    if (!pProdRaw || pProdRaw.length === 0) {
      pProdRaw = getSheetData("Point_Produk");
    }
    if (pProdRaw && pProdRaw.length > 0) {
      pointProduk = pProdRaw.map(r => ({
        produk: r.produk || r.Produk || r.item || r.Item || "",
        komisi: cleanNumBackend(r.komisi || r.Komisi || 0),
        point: cleanNumBackend(r.point || r.Point || r.poin || r.Poin || 0)
      }));
    }
  } catch (err) {
    console.error("Gagal mengambil data Point Produk: " + err.toString());
  }

  let importKomisi = [];
  let transaksiProd = [];
  let pt_from_import_komisi = 0;
  let importKomisiRaw = [];
  let transaksiProdRaw = [];
  try {
    importKomisiRaw = getSheetDataFiltered("Import Komisi", email, userName, userPosId);
    if (importKomisiRaw && importKomisiRaw.length > 0) {
      importKomisi = importKomisiRaw.filter(r => {
        const rPeriodeVal = r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "";
        return parseToYYYYMM(rPeriodeVal) === targetP;
      }).map(r => {
        const omzetNetto = cleanNumBackend(r.omzet_netto || r.omset_netto || r.Omzet_Netto || r.Omset_Netto || r["Omzet Netto"] || 0);
        const omzetBruto = cleanNumBackend(r.omzet_bruto || r.omset_bruto || r.Omzet_Bruto || r.Omset_Bruto || r["Omzet Bruto"] || 0);
        const omsetFallback = cleanNumBackend(r.omset || r.Omset || r.Omzet || 0);
        return {
          tanggal: r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "",
          cabang: r.cabang || r.Cabang || "",
          id_pegawai: r.id_pegawai || r["ID Pegawai"] || r.idpegawai || "",
          pegawai: r.pegawai || r.Pegawai || r.nama || r.Nama || "",
          jml_transaksi: cleanNumBackend(r.jml_transaksi || r["Jml Transaksi"] || r.jmltransaksi || 0),
          jml_layanan: cleanNumBackend(r.jml_layanan || r["Jml Layanan"] || r.jmllayanan || 0),
          omzet_bruto: omzetBruto || omsetFallback,
          omzet_netto: omzetNetto || omzetBruto || omsetFallback,
          omset: omzetNetto || omzetBruto || omsetFallback,
          komisi: cleanNumBackend(r.komisi || r.Komisi || 0)
        };
      });
    }
  } catch (err) {
    console.error("Gagal memproses Import Komisi: " + err.toString());
  }

  try {
    transaksiProdRaw = getSheetData("Transaksi Prod");
    if (!transaksiProdRaw || transaksiProdRaw.length === 0) {
      transaksiProdRaw = getSheetData("Transaksi Produk");
    }
    if (!transaksiProdRaw || transaksiProdRaw.length === 0) {
      transaksiProdRaw = getSheetData("Penjualan Produk");
    }
    if (!transaksiProdRaw || transaksiProdRaw.length === 0) {
      transaksiProdRaw = getSheetData("Penjualan");
    }
    if (transaksiProdRaw && transaksiProdRaw.length > 0) {
      transaksiProd = transaksiProdRaw.filter(r => {
        const rNama = (r.pegawai || r.Pegawai || r.karyawan || r.Karyawan || r.nama || r.Nama || "").toLowerCase().trim();
        const rEmail = (r.email || r.Email || r.user_email || r.User_Email || "").toLowerCase().trim();
        const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
        const rPeriodeVal = r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "";
        
        let isUser = false;
        if (email && rEmail === email) {
          isUser = true;
        } else if (userPosId && rId) {
          isUser = (rId === userPosId);
        } else if (rId && allEmployeeIds.includes(rId) && rId !== userPosId) {
          isUser = false;
        } else if (userName && isEmployeeNameMatch(rNama, userName, allEmployeeNames)) {
          isUser = true;
        }
        return isUser && parseToYYYYMM(rPeriodeVal) === targetP;
      }).map(r => {
        return {
          tanggal: r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "",
          harga_item: cleanNumBackend(r.harga_item || r.Harga_Item || r.harga || r.total_harga || r.total || 0),
          jumlah: cleanNumBackend(r.jumlah || r.Jumlah || r.qty || r.Qty || 1),
          sku: r.sku || r.SKU || "",
          item: r.produk || r.Produk || r.item || r.Item || r.nama_produk || r.Nama_Produk || "",
          komisi: cleanNumBackend(r.komisi || r.Komisi || 0)
        };
      });
    }
  } catch (err) {
    console.error("Gagal memproses Transaksi Prod: " + err.toString());
  }

  // Calculate points with product sales deduction daily
  if (importKomisi.length > 0) {
    const dailyGroups = {};
    importKomisi.forEach(r => {
      const dateObj = parseDateBackend(r.tanggal, targetP);
      const dayKey = dateObj ? (dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0')) : "invalid";
      if (dayKey !== "invalid") {
        if (!dailyGroups[dayKey]) dailyGroups[dayKey] = { omset: 0, prod: 0 };
        dailyGroups[dayKey].omset += r.omset;
      }
    });

    transaksiProd.forEach(r => {
      const dateObj = parseDateBackend(r.tanggal, targetP);
      const dayKey = dateObj ? (dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0')) : "invalid";
      if (dayKey !== "invalid") {
        if (!dailyGroups[dayKey]) dailyGroups[dayKey] = { omset: 0, prod: 0 };
        dailyGroups[dayKey].prod += r.harga_item * (r.jumlah || 1);
      }
    });

    Object.keys(dailyGroups).forEach(dayKey => {
      const netLayanan = Math.max(0, dailyGroups[dayKey].omset - dailyGroups[dayKey].prod);
      const points = Math.floor(netLayanan / 500000);
      pt_from_import_komisi += points;
    });
  }

  const pt_total = (pt_from_sheet > 0) ? pt_from_sheet : ((pt_from_import_komisi > 0) ? pt_from_import_komisi : pt_total_base);

  return response({
    status: "sukses",
    gaji_pokok: g_pokok,
    uang_makan: u_makan,
    bonus_disiplin: b_disiplin,
    target_omset: target_omset,
    total_point: pt_total,
    komisi: komisi,
    komisi_tambahan: komisiTambahan,
    kasbon: kasbon,
    import_komisi: importKomisi,
    transaksi_prod: transaksiProd,
    point_produk: pointProduk,
    join_date: user ? getEmployeeJoinDate(user) : "",
    keluar_tgl: user ? getEmployeeOutDate(user) : "",
    total_transferred: 0, // Mock fallback
    transfer_list: [], // Mock fallback
    debug_transaksi_prod: (transaksiProdRaw && transaksiProdRaw.length > 0) ? Object.keys(transaksiProdRaw[0]) : [],
    debug_import_komisi: (importKomisiRaw && importKomisiRaw.length > 0) ? Object.keys(importKomisiRaw[0]) : []
  });
}

function cleanNumBackend(val) {
  if (typeof val === 'number') return val;
  if (!val || val === "") return 0;
  let s = String(val).trim();
  if (!s) return 0;
  
  // Remove formatting characters but keep dot/comma for potential decimal detection
  // We keep only digits, comma, dot, and minus
  s = s.replace(/[^\d,.-]/g, '');

  // Case 1: Both comma and dot (e.g., 1.234.567,89 or 1,234,567.89)
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // Indonesian style: 1.234,56
      return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // US style: 1,234.56
      return parseFloat(s.replace(/,/g, '')) || 0;
    }
  }
  
  // Case 2: Only comma
  if (s.includes(',')) {
    // If multiple commas, they are thousands separators (US style)
    if ((s.match(/,/g) || []).length > 1) return parseFloat(s.replace(/,/g, '')) || 0;
    // If one comma, check if it's a decimal (Indonesian)
    let parts = s.split(',');
    if (parts[1].length <= 2) {
      return parseFloat(parts[0].replace(/\./g, '') + '.' + parts[1]) || 0;
    }
    // Otherwise thousands separator
    return parseFloat(s.replace(/,/g, '')) || 0;
  }
  
  // Case 3: Only dot
  if (s.includes('.')) {
    // If multiple dots, they are thousands separators (Indonesian style)
    if ((s.match(/\./g) || []).length > 1) return parseFloat(s.replace(/\./g, '')) || 0;
    // One dot. If followed by 3 digits, it's likely thousands in IDR context (2.500)
    // But if followed by 1-2 digits, it might be decimal (2.5)
    // Heuristic: for salaries (>1000), one dot is usually thousands.
    // For small numbers like points, it's decimal.
    let parts = s.split('.');
    if (parts[1].length === 3) return parseFloat(s.replace(/\./g, '')) || 0;
    return parseFloat(s) || 0;
  }
  
  // Fallback
  return parseFloat(s) || 0;
}

function getAllSalaryData(e) {
  const periode = e.parameter.periode || ""; 
  const targetP = parseToYYYYMM(periode);
  
  if (!targetP) return response({ status: "error", message: "Periode tidak valid." });

  const masterKaryawan = getSheetData("Karyawan");
  const allEmployeeNames = masterKaryawan.map(u => (u.nama || u.Nama || "").toLowerCase().trim()).filter(Boolean);
  const allEmployeeIds = masterKaryawan.map(u => String(u.id_pegawai || u.id_pos || u.idpegawai || u.idpos || u.id || u.nik || u["ID Pegawai"] || u["ID POS"] || "").trim()).filter(Boolean);
  const masterGaji = getSheetData("Master_Gaji");
  const absensiRaw = getAllAbsensi();
  const komisiRaw = getSheetData("Komisi");
  let komisiTambahanRaw = [];
  try {
    komisiTambahanRaw = getSheetData("Komisi Tambahan");
  } catch (err) {
    console.error("Gagal mengambil data Komisi Tambahan: " + err.toString());
  }
  const kasbonRaw = getSheetData("Kasbon");
  const pointRaw = getSheetData("Point");
  const importKomisiRaw = getSheetData("Import Komisi");
  const transferRaw = getSheetData("Transfer_Gaji");

  let pointProduk = [];
  try {
    let pProdRaw = getSheetData("Point Produk");
    if (!pProdRaw || pProdRaw.length === 0) {
      pProdRaw = getSheetData("Point_Produk");
    }
    if (pProdRaw && pProdRaw.length > 0) {
      pointProduk = pProdRaw.map(r => ({
        produk: r.produk || r.Produk || r.item || r.Item || "",
        komisi: cleanNumBackend(r.komisi || r.Komisi || 0),
        point: cleanNumBackend(r.point || r.Point || r.poin || r.Poin || 0)
      }));
    }
  } catch (err) {
    console.error("Gagal mengambil data Point Produk: " + err.toString());
  }

  let transaksiProdRaw = getSheetData("Transaksi Prod");
  if (!transaksiProdRaw || transaksiProdRaw.length === 0) {
    transaksiProdRaw = getSheetData("Transaksi Produk");
  }
  if (!transaksiProdRaw || transaksiProdRaw.length === 0) {
    transaksiProdRaw = getSheetData("Penjualan Produk");
  }
  if (!transaksiProdRaw || transaksiProdRaw.length === 0) {
    transaksiProdRaw = getSheetData("Penjualan");
  }
  const rawIzin = getSheetData("Izin");

  const [year, month] = targetP.split("-").map(v => parseInt(v));
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const hkLibur = getHariKhususAndLiburData();
  const hariKhususData = hkLibur.hariKhusus;
  const hariLiburData = hkLibur.hariLibur;

  let holidayCount = 0;
  if (hariLiburData && Array.isArray(hariLiburData)) {
    holidayCount = hariLiburData.filter(h => {
      const hDate = parseDateBackend(h.tanggal || h.Tanggal, targetP);
      return hDate && hDate.getFullYear() === year && hDate.getMonth() === (month - 1);
    }).length;
  }
  const hariKerjaStandarDefault = Math.max(1, daysInMonth - 3);
  const results = masterKaryawan.map(user => {
    const email = (user.email || "").toLowerCase().trim();
    const currentUName = (user.nama || "").toLowerCase().trim();
    const currentUPosId = String(user.id_pegawai || user.id_pos || user.idpegawai || user.idpos || user.id || user.nik || user["ID Pegawai"] || user["ID POS"] || "").trim();
    if (!email && !currentUName) return null;
    
    // Roles parsing
    const empRoles = String(user.jabatan || "").split(",").map(r => r.toLowerCase().trim());
    const isPKL = empRoles.some(r => r.indexOf("pkl") !== -1) || (user.divisi || user.Divisi || user.DIVISI || user.Divisi_ || "").toString().toLowerCase().indexOf("pkl") !== -1;
    const isStylist = empRoles.some(r => r === "stylist");

    const userSalaries = masterGaji.filter(r => {
      const rEmail = (r.email || r.Email || "").toLowerCase().trim();
      const rNama = (r.nama || r.Nama || r.karyawan || "").toLowerCase().trim();
      const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
      
      let isUser = false;
      if (email && rEmail === email) isUser = true;
      else if (currentUPosId && rId) isUser = (rId === currentUPosId);
      else if (rId && allEmployeeIds.includes(rId) && rId !== currentUPosId) isUser = false;
      else if (currentUName && isEmployeeNameMatch(rNama, currentUName, allEmployeeNames)) isUser = true;
      if (!isUser) return false;

      const pVal = r.bulan_berlaku || r.Bulan_Berlaku || r.Periode || r.periode || r.bulan || r.Bulan || "";
      const p = parseToYYYYMM(pVal);
      return p && p <= targetP;
    }).sort((a, b) => {
      const pa = parseToYYYYMM(a.bulan_berlaku || a.Bulan_Berlaku || a.Periode || a.periode || a.bulan || a.Bulan || "") || "";
      const pb = parseToYYYYMM(b.bulan_berlaku || b.Bulan_Berlaku || b.Periode || b.periode || b.bulan || b.Bulan || "") || "";
      return pb.localeCompare(pa);
    });

    const cleanNum = cleanNumBackend;

    const findLatest = (fields) => {
      for (const row of userSalaries) {
        for (const f of fields) {
          const val = row[f];
          if (val !== undefined && val !== "" && val !== null) {
            const n = cleanNum(val);
            if (n >= 0) return n; // changed from > 0 to >= 0
          }
        }
      }
      return 0;
    };

    const g_pokok = findLatest(['gaji_pokok', 'Gaji_Pokok', 'gaji', 'Gaji']);
    const u_makan = findLatest(['uang_makan', 'Uang_Makan']);
    const b_disiplin = findLatest(['bonus_disiplin', 'Bonus_Disiplin']);
    const target_omset = findLatest(['target_omset', 'Target_Omset', 'Target Omset', 'target omset']);
    let pt_total_base = findLatest(['total_point', 'point', 'total_poin', 'Point']);
    let pt_from_sheet = 0;

    if (pointRaw.length > 0) {
      pt_from_sheet = pointRaw.filter(r => {
        const rEmail = (r.email || r.user_email || "").toLowerCase().trim();
        const rNama = (r.nama || r.nama_karyawan || r.karyawan || "").toLowerCase().trim();
        const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
        const rPeriodeVal = r.periode || r.bulan_berlaku || r.bulan || r.tanggal || r.waktu || r.tgl || r.date || "";
        
        let isUser = false;
        if (email && rEmail === email) isUser = true;
        else if (currentUPosId && rId) isUser = (rId === currentUPosId);
        else if (rId && allEmployeeIds.includes(rId) && rId !== currentUPosId) isUser = false;
        else if (currentUName && isEmployeeNameMatch(rNama, currentUName, allEmployeeNames)) isUser = true;
        return isUser && parseToYYYYMM(rPeriodeVal) === targetP;
      }).reduce((acc, curr) => acc + cleanNum(curr.nominal || curr.point || curr.poin || curr.total_point || curr.total || 0), 0);
    }

    let pt_from_import_komisi = 0;
    let userImportKomisi = [];
    let userTransaksiProd = [];

    if (importKomisiRaw && importKomisiRaw.length > 0) {
      userImportKomisi = importKomisiRaw.filter(r => {
        const rEmail = (r.email || r.user_email || "").toLowerCase().trim();
        const rNama = (r.nama || r.nama_karyawan || r.karyawan || r.pegawai || "").toLowerCase().trim();
        const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
        const rPeriodeVal = r.periode || r.bulan_berlaku || r.bulan || r.tanggal || r.waktu || r.tgl || r.date || "";
        
        let isUser = false;
        if (email && rEmail === email) isUser = true;
        else if (currentUPosId && rId) isUser = (rId === currentUPosId);
        else if (rId && allEmployeeIds.includes(rId) && rId !== currentUPosId) isUser = false;
        else if (currentUName && isEmployeeNameMatch(rNama, currentUName, allEmployeeNames)) isUser = true;
        return isUser && parseToYYYYMM(rPeriodeVal) === targetP;
      });
    }

    if (transaksiProdRaw && transaksiProdRaw.length > 0) {
      userTransaksiProd = transaksiProdRaw.filter(r => {
        const rNama = (r.pegawai || r.Pegawai || r.karyawan || r.Karyawan || r.nama || r.Nama || "").toLowerCase().trim();
        const rEmail = (r.email || r.Email || r.user_email || r.User_Email || "").toLowerCase().trim();
        const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
        const rPeriodeVal = r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "";
        
        let isUser = false;
        if (email && rEmail === email) isUser = true;
        else if (currentUPosId && rId) isUser = (rId === currentUPosId);
        else if (rId && allEmployeeIds.includes(rId) && rId !== currentUPosId) isUser = false;
        else if (currentUName && isEmployeeNameMatch(rNama, currentUName, allEmployeeNames)) isUser = true;
        return isUser && parseToYYYYMM(rPeriodeVal) === targetP;
      });
    }

    // Recalculate points with deduction of product sales grouped by day
    let payoutKomisiLayanan = 0;
    let payoutKomisiProduk = 0;

    if (userImportKomisi.length > 0 || userTransaksiProd.length > 0) {
      const dailyGroups = {};
      
      userImportKomisi.forEach(r => {
        const dateObj = parseDateBackend(r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "", targetP);
        const dayKey = dateObj ? (dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0')) : "invalid";
        if (dayKey !== "invalid") {
          if (!dailyGroups[dayKey]) dailyGroups[dayKey] = { omset: 0, prod: 0, komisi: 0, prodEntries: [] };
          dailyGroups[dayKey].omset += cleanNum(r.omzet_netto || r.omset_netto || r.omzet_bruto || r.omset_bruto || r.omset || r.Omset_Netto || r.Omzet_Netto || r.Omzet_Bruto || r.Omset_Bruto || r.Omset || r.Omzet || 0);
          dailyGroups[dayKey].komisi += cleanNum(r.komisi || r.Komisi || 0);
        }
      });

      userTransaksiProd.forEach(r => {
        const dateObj = parseDateBackend(r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "", targetP);
        const dayKey = dateObj ? (dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0')) : "invalid";
        if (dayKey !== "invalid") {
          if (!dailyGroups[dayKey]) {
            dailyGroups[dayKey] = { omset: 0, prod: 0, komisi: 0, prodEntries: [] };
          }
          const price = cleanNum(r.harga_item || r.Harga_Item || r.harga || r.total_harga || r.total || 0);
          const qty = cleanNum(r.jumlah || r.Jumlah || r.qty || r.Qty || 1);
          dailyGroups[dayKey].prod += (price * qty);
          dailyGroups[dayKey].prodEntries.push({ sku: r.sku || r.SKU || "", item: r.produk || r.Produk || r.item || r.Item || r.nama_produk || r.Nama_Produk || "", harga: price, qty: qty, komisi: cleanNum(r.komisi || r.Komisi || 0) });
        }
      });

      let totalOmsetLayananMonth = 0;
      let totalOmsetProdukMonth = 0;
      let totalKomisiLayananMonth = 0;
      let totalKomisiProdukMonth = 0;

      Object.keys(dailyGroups).forEach(dayKey => {
        const group = dailyGroups[dayKey];
        const netLayanan = Math.max(0, group.omset - group.prod);
        const points = Math.floor(netLayanan / 500000);
        pt_from_import_komisi += points;

        totalOmsetLayananMonth += netLayanan;
        totalOmsetProdukMonth += group.prod;

        // Calculate product commission based on rules
        let dailyKomisiProduk = 0;
        if (group.prodEntries && group.prodEntries.length > 0) {
          group.prodEntries.forEach(entry => {
            if (entry.komisi && entry.komisi > 0) {
              dailyKomisiProduk += entry.komisi;
            } else {
              const info = getProductPointAndKomisiBackend(entry, pointProduk);
              dailyKomisiProduk += info.komisi * entry.qty;
            }
          });
        }

        const komisiLayanan = Math.max(0, group.komisi - dailyKomisiProduk);

        totalKomisiLayananMonth += komisiLayanan;
        totalKomisiProdukMonth += dailyKomisiProduk;
      });

      const totalProductPointsSold = userTransaksiProd.reduce((acc, curr) => {
        const info = getProductPointAndKomisiBackend(curr, pointProduk);
        const qty = cleanNum(curr.jumlah || curr.Jumlah || curr.qty || curr.Qty || 1);
        return acc + (info.point * qty);
      }, 0);

      const baseTarget = target_omset > 0 ? target_omset : 0;
      let targetLayananVal = 0;
      let hasReachedTarget = false;

      if (!isPKL) {
        if (baseTarget === 0) {
          hasReachedTarget = true;
          targetLayananVal = 0;
        } else {
          targetLayananVal = totalProductPointsSold >= 10 ? Math.min(6000000, baseTarget) : baseTarget;
          hasReachedTarget = (totalOmsetLayananMonth >= baseTarget) || (totalProductPointsSold >= 10 && totalOmsetLayananMonth >= 6000000);
        }
      }

      payoutKomisiLayanan = hasReachedTarget ? totalKomisiLayananMonth : 0;
      payoutKomisiProduk = isPKL ? 0 : totalKomisiProdukMonth;

      user._computedOmsetLayanan = totalOmsetLayananMonth;
      user._computedOmsetProduk = totalOmsetProdukMonth;
      user._computedTotalProductsSold = totalProductPointsSold;
      user._computedHasReachedTarget = hasReachedTarget;
      user._computedTargetLayananVal = targetLayananVal;
      user._computedTotalKomisiLayananRaw = totalKomisiLayananMonth;
    } else {
      user._computedOmsetLayanan = 0;
      user._computedOmsetProduk = 0;
      user._computedTotalProductsSold = 0;
      user._computedHasReachedTarget = false;
      user._computedTargetLayananVal = target_omset > 0 ? target_omset : 0;
      user._computedTotalKomisiLayananRaw = 0;
    }

    const pt_total = (pt_from_sheet > 0) ? pt_from_sheet : ((pt_from_import_komisi > 0) ? pt_from_import_komisi : pt_total_base);
    
    const joinDateStr = getEmployeeJoinDate(user);
    const outDateStr = getEmployeeOutDate(user);

    const userAttendance = absensiRaw.filter(r => (r.email || "").toLowerCase().trim() === email);
    const stats = calculateStatsBackend(userAttendance, year, month - 1, user.jam_khusus || user.jamkhusus || "", hariKhususData, joinDateStr, outDateStr, hariLiburData, rawIzin, user.nama);

    const jatahLibur = isPKL ? 4 : 3;
    const empHariKerjaStandar = Math.max(1, daysInMonth - jatahLibur);

    const gajiHarian = empHariKerjaStandar > 0 ? g_pokok / empHariKerjaStandar : 0;
    const totalKehadiran = stats.hadirDisiplin + stats.hadirTepat + stats.hadirTelatWeekday + stats.hadirTelatWeekend + stats.setengahHariWeekday + stats.setengahHariWeekend + (stats.hariLiburCount || 0);
    const pendapatanKehadiran = totalKehadiran * gajiHarian;
    const pendapatanDisiplin = stats.hadirDisiplin * b_disiplin;
    const pendapatanUangMakan = (stats.hadirDisiplin + stats.hadirTepat) * u_makan;
    
    let pointRp = 0;
    if (pt_total >= 1 && pt_total <= 10) pointRp = pt_total * 5000;
    else if (pt_total >= 11 && pt_total <= 20) pointRp = pt_total * 10000;
    else if (pt_total > 20) pointRp = pt_total * 15000;

    let eligibleForBonus = true;
    const jdCurrent = parseDateBackend(joinDateStr);
    const odCurrent = parseDateBackend(outDateStr);
    if (jdCurrent) {
      if (jdCurrent.getFullYear() === year && jdCurrent.getMonth() === (month - 1)) {
        if (jdCurrent.getDate() > 1) {
          eligibleForBonus = false;
        }
      }
      const firstDayOfTargetMonth = new Date(year, month - 1, 1);
      if (jdCurrent.getTime() > firstDayOfTargetMonth.getTime()) {
        eligibleForBonus = false;
      }
    }
    if (odCurrent) {
      const lastDayOfTargetMonth = new Date(year, month, 0);
      if (odCurrent.getFullYear() === year && odCurrent.getMonth() === (month - 1)) {
        if (odCurrent.getDate() < lastDayOfTargetMonth.getDate()) {
          eligibleForBonus = false;
        }
      }
      if (odCurrent.getTime() < lastDayOfTargetMonth.getTime()) {
        eligibleForBonus = false;
      }
    }

    let bonusAbsen = 0;
    const todayDate = new Date();
    const isMonthEnded = (year < todayDate.getFullYear()) || 
                         (year === todayDate.getFullYear() && month < todayDate.getMonth() + 1) || 
                         (year === todayDate.getFullYear() && month === todayDate.getMonth() + 1 && todayDate.getDate() >= new Date(year, month, 0).getDate());

    if (eligibleForBonus && stats.liburScore <= jatahLibur && isMonthEnded) {
       const isEndOfQuarter = month % 3 === 0;
       if (isEndOfQuarter) {
         const checkMonth = (offset) => {
           let dYear = year, dMonth = month - 1 - offset;
           if (dMonth < 0) { dYear--; dMonth += 12; }
           const jd = parseDateBackend(joinDateStr);
           const od = parseDateBackend(outDateStr);
           if (jd) {
             if (jd.getFullYear() === dYear && jd.getMonth() === dMonth) {
               if (jd.getDate() > 1) return false;
             }
             const firstDay = new Date(dYear, dMonth, 1);
             if (jd.getTime() > firstDay.getTime()) return false;
           }
           if (od) {
             const lastDay = new Date(dYear, dMonth + 1, 0);
             if (od.getFullYear() === dYear && od.getMonth() === dMonth) {
               if (od.getDate() < lastDay.getDate()) return false;
             }
             if (od.getTime() < lastDay.getTime()) return false;
           }
           const h = absensiRaw.filter(r => (r.email || "").toLowerCase().trim() === email);
           const s = calculateStatsBackend(h, dYear, dMonth, user.jam_khusus || user.jamkhusus || "", hariKhususData, joinDateStr, outDateStr, hariLiburData, rawIzin, user.nama);
           return s.liburScore <= jatahLibur;
         };
         if (checkMonth(1) && checkMonth(2)) bonusAbsen = 300000;
         else bonusAbsen = 100000;
       } else {
         bonusAbsen = 100000;
       }
    }

    const userKomisiItems = [];
    const totalKomisi = 0;

    const userKomisiTambahanItems = (komisiTambahanRaw || []).filter(r => {
      const rEmail = (r.email || r.user_email || "").toLowerCase().trim();
      const rNama = (r.nama || r.nama_karyawan || r.karyawan || "").toLowerCase().trim();
      const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
      const rPeriodeVal = r.tanggal || r.tgl || r.date || r.Date || r.periode || r.bulan_berlaku || r.bulan || r.waktu || "";
      
      let isUser = false;
      if (email && rEmail === email) isUser = true;
      else if (currentUPosId && rId) isUser = (rId === currentUPosId);
      else if (rId && allEmployeeIds.includes(rId) && rId !== currentUPosId) isUser = false;
      else if (currentUName && isEmployeeNameMatch(rNama, currentUName, allEmployeeNames)) isUser = true;
      return isUser && parseToYYYYMM(rPeriodeVal) === targetP;
    }).map(r => ({
      item: r.keterangan || r.item || r.deskripsi || "Komisi Tambahan",
      tanggal: r.tanggal || r.waktu || r.date || targetP,
      nominal: cleanNum(r.nominal || r.komisi || r.jumlah || 0)
    }));
    const totalKomisiTambahan = userKomisiTambahanItems.reduce((acc, curr) => acc + curr.nominal, 0);

    const userKasbonItems = kasbonRaw.filter(r => {
      const rEmail = (r.email || r.user_email || "").toLowerCase().trim();
      const rNama = (r.nama || r.nama_karyawan || r.karyawan || "").toLowerCase().trim();
      const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
      const rPeriodeVal = r.tanggal || r.tgl || r.date || r.Date || r.periode || r.bulan_berlaku || r.bulan || r.waktu || "";
      
      let isUser = false;
      if (email && rEmail === email) isUser = true;
      else if (currentUPosId && rId) isUser = (rId === currentUPosId);
      else if (rId && allEmployeeIds.includes(rId) && rId !== currentUPosId) isUser = false;
      else if (currentUName && isEmployeeNameMatch(rNama, currentUName, allEmployeeNames)) isUser = true;
      return isUser && parseToYYYYMM(rPeriodeVal) === targetP;
    }).map(r => ({
      item: r.keterangan || r.item || r.deskripsi || "Kasbon",
      tanggal: r.tanggal || r.waktu || r.date || targetP,
      nominal: cleanNum(r.nominal || r.kasbon || r.jumlah || 0)
    }));
    const totalKasbon = userKasbonItems.reduce((acc, curr) => acc + curr.nominal, 0);

    const userTransferItems = transferRaw.filter(r => {
      const rEmail = (r.email || r.user_email || "").toLowerCase().trim();
      const rNama = (r.nama || r.nama_karyawan || r.karyawan || "").toLowerCase().trim();
      const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();
      const rPeriodeVal = r.periode || r.bulan_berlaku || r.bulan || "";
      
      let isUser = false;
      if (email && rEmail === email) isUser = true;
      else if (currentUPosId && rId) isUser = (rId === currentUPosId);
      else if (rId && allEmployeeIds.includes(rId) && rId !== currentUPosId) isUser = false;
      else if (currentUName && isEmployeeNameMatch(rNama, currentUName, allEmployeeNames)) isUser = true;
      return isUser && parseToYYYYMM(rPeriodeVal) === targetP;
    }).map(r => ({
      tanggal: r.tanggal || r.waktu || r.date || targetP,
      nominal: cleanNum(r.nominal || r.jumlah || r.total || 0)
    }));
    const totalTransferred = userTransferItems.reduce((acc, curr) => acc + curr.nominal, 0);

    const potonganWeekend = stats.liburWeekend * gajiHarian;
    const potongan12Weekday = stats.setengahHariWeekday * (gajiHarian / 2);
    const potongan12Weekend = stats.setengahHariWeekend * gajiHarian;

    const gajiAktual = (pendapatanKehadiran + pendapatanDisiplin + pendapatanUangMakan + totalKomisi + totalKomisiTambahan + payoutKomisiLayanan + payoutKomisiProduk + pointRp + bonusAbsen) - (potonganWeekend + potongan12Weekday + potongan12Weekend);

    const formattedImportKomisi = userImportKomisi.map(r => {
      const omzetNetto = cleanNum(r.omzet_netto || r.omset_netto || r.Omzet_Netto || r.Omset_Netto || r["Omzet Netto"] || 0);
      const omzetBruto = cleanNum(r.omzet_bruto || r.omset_bruto || r.Omzet_Bruto || r.Omset_Bruto || r["Omzet Bruto"] || 0);
      const omsetFallback = cleanNum(r.omset || r.Omset || r.Omzet || 0);
      return {
        tanggal: r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "",
        cabang: r.cabang || r.Cabang || "",
        id_pegawai: r.id_pegawai || r["ID Pegawai"] || r.idpegawai || "",
        pegawai: r.pegawai || r.Pegawai || r.nama || r.Nama || "",
        jml_transaksi: cleanNum(r.jml_transaksi || r["Jml Transaksi"] || r.jmltransaksi || 0),
        jml_layanan: cleanNum(r.jml_layanan || r["Jml Layanan"] || r.jmllayanan || 0),
        omzet_bruto: omzetBruto || omsetFallback,
        omzet_netto: omzetNetto || omzetBruto || omsetFallback,
        omset: omzetNetto || omzetBruto || omsetFallback,
        komisi: cleanNum(r.komisi || r.Komisi || 0)
      };
    });

    const formattedTransaksiProd = userTransaksiProd.map(r => ({
      tanggal: r.tanggal || r.Tanggal || r.waktu || r.Waktu || r.tgl || r.date || r.Date || "",
      harga_item: cleanNum(r.harga_item || r.Harga_Item || r.harga || r.total_harga || r.total || 0),
      jumlah: cleanNum(r.jumlah || r.Jumlah || r.qty || r.Qty || 1),
      sku: r.sku || r.SKU || "",
      item: r.produk || r.Produk || r.item || r.Item || r.nama_produk || r.Nama_Produk || "",
      komisi: cleanNum(r.komisi || r.Komisi || 0)
    }));

    return {
      nama: user.nama, email: email, jabatan: user.jabatan,
      joinDate: joinDateStr, join_date: joinDateStr, timestamp: joinDateStr, keluar_tgl: outDateStr,
      gaji_pokok: g_pokok, gaji_harian: Math.round(gajiHarian),
      target_omset: target_omset,
      hadir: totalKehadiran, disiplin: stats.hadirDisiplin, telat: stats.hadirTelatWeekday + stats.hadirTelatWeekend,
      telat_weekday: stats.hadirTelatWeekday, telat_weekend: stats.hadirTelatWeekend,
      uang_makan: u_makan, bonus_disiplin: b_disiplin,
      setengah_hari_weekday: stats.setengahHariWeekday,
      setengah_hari_weekend: stats.setengahHariWeekend,
      libur_krusial: stats.liburWeekend,
      total_point: pt_total, point_rp: pointRp,
      total_komisi: totalKomisi + totalKomisiTambahan + payoutKomisiLayanan + payoutKomisiProduk,
      komisi_manual: totalKomisi,
      komisi_tambahan: totalKomisiTambahan,
      komisi_layanan: payoutKomisiLayanan,
      komisi_produk: payoutKomisiProduk,
      komisi_list: userKomisiItems,
      komisi_tambahan_list: userKomisiTambahanItems,
      import_komisi: formattedImportKomisi,
      transaksi_prod: formattedTransaksiProd,
      point_produk: pointProduk,
      total_omset_layanan: user._computedOmsetLayanan || 0,
      total_omset_produk: user._computedOmsetProduk || 0,
      total_omset: (user._computedOmsetLayanan || 0) + (user._computedOmsetProduk || 0),
      total_products_sold: user._computedTotalProductsSold || 0,
      has_reached_target: user._computedHasReachedTarget || false,
      target_layanan_val: user._computedTargetLayananVal || 0,
      total_komisi_layanan_raw: user._computedTotalKomisiLayananRaw || 0,
      _hasFullDetails: true,
      total_kasbon: totalKasbon, kasbon_list: userKasbonItems,
      total_transferred: totalTransferred,
      transfer_list: userTransferItems,
      bonus_absen: bonusAbsen,
      gaji_aktual: Math.round(gajiAktual), sisa_gaji: Math.round(gajiAktual - totalKasbon),
      periode: targetP,
      hari_kerja: empHariKerjaStandar,
      hariIzin: stats.hariIzinCount || 0
    };
  }).filter(r => r !== null);

  return response({ status: "sukses", data: results });
}

function parseDateBackend(timeStr, targetMonthStr) {
  if (!timeStr) return null;
  const s = String(timeStr).trim();
  if (!s) return null;

  // 1. Try native Date
  let d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  // 2. Custom parsing
  try {
    const parts = s.split(/[ ,T/\-]+/);
    if (parts.length < 2) return null;

    let day = -1, month = -1, year = -1;

    const monthMap = {
      jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11
    };

    const getMonthFromStr = (str) => {
      const low = str.toLowerCase().substring(0, 3);
      return monthMap[low] !== undefined ? monthMap[low] : -1;
    };

    // Try to find year
    const yearIdx = parts.findIndex(p => p.length === 4 && !isNaN(parseInt(p)));
    if (yearIdx !== -1) {
      year = parseInt(parts[yearIdx]);
      const otherParts = parts.filter((_, i) => i !== yearIdx);
      if (otherParts.length >= 2) {
        const m0 = getMonthFromStr(otherParts[0]);
        const m1 = getMonthFromStr(otherParts[1]);

        if (m0 !== -1) {
          month = m0;
          day = parseInt(otherParts[1]);
        } else if (m1 !== -1) {
          month = m1;
          day = parseInt(otherParts[0]);
        } else {
          // Both are numbers
          const b0 = parseInt(otherParts[0]);
          const b1 = parseInt(otherParts[1]);
          
          if (b0 > 12) { day = b0; month = b1 - 1; }
          else if (b1 > 12) { month = b0 - 1; day = b1; }
          else {
            // Ambiguous 05/01/2026. Use targetMonthStr if available
            if (targetMonthStr) {
              const tm = parseInt(targetMonthStr.split('-')[1]);
              if (b1 === tm) { month = b1 - 1; day = b0; }
              else { month = b0 - 1; day = b1; }
            } else {
              month = b0 - 1; day = b1; // Default MM/DD
            }
          }
        }
      }
    }

    if (day !== -1 && month !== -1 && year !== -1) {
      const finalDate = new Date(year, month, day);
      if (!isNaN(finalDate.getTime())) {
        // Handle time if exists in original string
        const timeMatch = s.match(/(\d{1,2})[:.](\d{1,2})(?:[:.](\d{1,2}))?/);
        if (timeMatch) {
          finalDate.setHours(parseInt(timeMatch[1]), parseInt(timeMatch[2]), parseInt(timeMatch[3] || 0));
        }
        return finalDate;
      }
    }
  } catch(e) { return null; }
  return null;
}

function calculateStatsBackend(history, year, monthIndex, jamKhusus, hariKhususData, joinDateStr, outDateStr, hariLiburData, hariIzinData, userName) {
  try {
    const targetP = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
    
    let joinDate = parseDateBackend(joinDateStr);
    if (!joinDate && history && Array.isArray(history) && history.length > 0) {
      const validDates = history
        .map(item => item ? parseDateBackend(item.waktu || item.Waktu || item.timestamp || item.Timestamp) : null)
        .filter(d => d && !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      if (validDates.length > 0) {
        joinDate = validDates[0];
      }
    }
    const outDate = parseDateBackend(outDateStr);
    const isDValid = (d) => {
      const curD = new Date(year, monthIndex, d);
      if (joinDate) {
        const jd = new Date(joinDate.getFullYear(), joinDate.getMonth(), joinDate.getDate());
        if (curD < jd) return false;
      }
      if (outDate) {
        const od = new Date(outDate.getFullYear(), outDate.getMonth(), outDate.getDate());
        if (curD >= od) return false;
      }
      return true;
    };

    const groups = {};
    if (history && Array.isArray(history)) {
      const dayRawItems = {};

      history.forEach(item => {
        if (!item) return;
        let date = parseDateBackend(item.waktu || item.Waktu || item.timestamp, targetP);
        if (!date || date.getFullYear() !== year || date.getMonth() !== monthIndex) return;

        const dDay = date.getDate();
        const key = dDay.toString();

        if (!dayRawItems[key]) {
          dayRawItems[key] = [];
        }
        dayRawItems[key].push({ item, date, dDay });
      });

      Object.keys(dayRawItems).forEach(key => {
        const entries = dayRawItems[key];

        let effectiveShift = "pagi";
        const shifts = entries.map(e => (e.item.shift || e.item.Shift || "").toString().toLowerCase());
        if (shifts.some(s => s.indexOf("full") !== -1)) {
          effectiveShift = "full";
        } else if (shifts.some(s => s.indexOf("siang") !== -1)) {
          effectiveShift = "siang";
        }

        const firstEntry = entries[0];
        const date = firstEntry.date;
        const dDay = firstEntry.dDay;

        let isHK = false;
        if (hariKhususData && Array.isArray(hariKhususData)) {
          isHK = hariKhususData.some(h => {
            if (!h) return false;
            const hDate = parseDateBackend(h.tanggal || h.Tanggal, targetP);
            return hDate && hDate.getFullYear() === year && hDate.getMonth() === monthIndex && hDate.getDate() === dDay;
          });
        }

        let isHL = false;
        if (hariLiburData && Array.isArray(hariLiburData)) {
          isHL = hariLiburData.some(hl => {
            if (!hl) return false;
            const hlDate = parseDateBackend(hl.tanggal || hl.Tanggal, targetP);
            return hlDate && hlDate.getFullYear() === year && hlDate.getMonth() === monthIndex && hlDate.getDate() === dDay;
          });
        }

        groups[key] = { masuk: null, pulang: null, status: '', isWeekendOrAkhir: date.getDay() === 0 || date.getDay() === 6 || dDay >= 24 || isHK };

        let t_m_p = 9 * 60,  t_p_p = 17 * 60;
        let t_m_s = 13 * 60, t_p_s = 21 * 60;
        let t_m_f = 9 * 60,  t_p_f = 21 * 60;

        if (jamKhusus) {
          jamKhusus.split(',').forEach(rule => {
            const ruleTrim = rule.trim();
            if (!ruleTrim) return;
            const parts = ruleTrim.split(':').map(s => s.trim());
            const isShiftRule = parts.length >= 2 && isNaN(Number(parts[0]));
            if (isShiftRule) {
              const sName = parts[0].toLowerCase();
              const timeRangeStr = parts.slice(1).join(':');
              const rangeParts = timeRangeStr.split('-').map(s => s.trim());
              if (rangeParts.length >= 2) {
                const mStr = rangeParts[0];
                const pStr = rangeParts[1];
                const toMins = (s) => {
                  if (!s) return -1;
                  const b = s.split(/[:.]/).map(v => parseInt(v));
                  return b.length >= 2 ? b[0]*60 + b[1] : -1;
                };
                const mM = toMins(mStr), pM = toMins(pStr);
                if (sName === 'pagi') { if(mM!=-1)t_m_p=mM; if(pM!=-1)t_p_p=pM; }
                else if (sName === 'siang') { if(mM!=-1)t_m_s=mM; if(pM!=-1)t_p_s=pM; }
                else if (sName.indexOf('full') !== -1) { if(mM!=-1)t_m_f=mM; if(pM!=-1)t_p_f=pM; }
              }
            } else {
              const matchRange = ruleTrim.match(/^(\d{1,2})[:.](\d{2})\s*-\s*(\d{1,2})[:.](\d{2})$/);
              if (matchRange) {
                const m = parseInt(matchRange[1])*60 + parseInt(matchRange[2]);
                const p = parseInt(matchRange[3])*60 + parseInt(matchRange[4]);
                t_m_p = m; t_p_p = p;
                t_m_s = m; t_p_s = p;
                t_m_f = m; t_p_f = p;
              } else {
                const matchSingle = ruleTrim.match(/^(\d{1,2})[:.](\d{2})$/);
                if (matchSingle) {
                  const m = parseInt(matchSingle[1])*60 + parseInt(matchSingle[2]);
                  t_m_p = m; t_m_s = m; t_m_f = m;
                }
              }
            }
          });
        }

        let jM = 9 * 60;
        let jP = 17 * 60;
        if (effectiveShift === 'pagi') { jM = t_m_p; jP = t_p_p; }
        else if (effectiveShift === 'siang') { jM = t_m_s; jP = t_p_s; }
        else if (effectiveShift === 'full') { jM = t_m_f; jP = t_p_f; }

        const masukEntries = entries.filter(e => (e.item.jenis || e.item.Jenis || '').toLowerCase() === 'masuk');
        const pulangEntries = entries.filter(e => (e.item.jenis || e.item.Jenis || '').toLowerCase() === 'pulang');

        let isHalfDay = false;
        let isLate = false;
        let isOnTime = false;
        let isDisiplin = false;

        if (masukEntries.length > 0) {
          const mDate = masukEntries[0].date;
          const totalMins = mDate.getHours() * 60 + mDate.getMinutes();
          groups[key].masuk = totalMins;
          if (jM > 0) {
            if (totalMins >= jM + 180) {
              isHalfDay = true;
            } else if (totalMins > jM) {
              isLate = true;
            } else if (totalMins <= jM - 15) {
              if (isHL) {
                isOnTime = true;
              } else {
                isDisiplin = true;
              }
            } else {
              isOnTime = true;
            }
          }
        }

        if (pulangEntries.length > 0) {
          const pDate = pulangEntries[0].date;
          const totalMins = pDate.getHours() * 60 + pDate.getMinutes();
          groups[key].pulang = totalMins;
          if (jP > 0) {
            if (totalMins <= jP - 180) {
              isHalfDay = true;
            }
          }
        }

        // Prioritas label: 1/2 hari, telat, tepat, disiplin
        if (isHalfDay) {
          groups[key].status = '1/2 Hari';
        } else if (isLate) {
          groups[key].status = 'Telat';
        } else if (isOnTime) {
          groups[key].status = 'Tepat';
        } else if (isDisiplin) {
          groups[key].status = 'Disiplin';
        } else {
          groups[key].status = '';
        }
      });
    }

    let hadirDisiplin = 0, hadirTepat = 0, hadirTelatWeekday = 0, hadirTelatWeekend = 0, setengahHariWeekday = 0, setengahHariWeekend = 0, liburWeekend = 0, liburWeekday = 0, liburScore = 0, hariLiburCount = 0, hariIzinCount = 0;
    const maxDays = new Date(year, monthIndex + 1, 0).getDate();
    const today = new Date();
    let endDay = (today.getFullYear() === year && today.getMonth() === monthIndex) ? today.getDate() : maxDays;
    if (new Date(year, monthIndex, 1) > today) endDay = 0;

    const uName = (userName || "").toString().toLowerCase().trim();

    for (let i = 1; i <= endDay; i++) {
      if (!isDValid(i)) continue;
      const key = i.toString();
      
      let isHK = false;
      if (hariKhususData && Array.isArray(hariKhususData)) {
        isHK = hariKhususData.some(h => {
          if (!h) return false;
          const hDate = parseDateBackend(h.tanggal || h.Tanggal);
          return hDate && hDate.getFullYear() === year && hDate.getMonth() === monthIndex && hDate.getDate() === i;
        });
      }

      let isHL = false;
      if (hariLiburData && Array.isArray(hariLiburData)) {
        isHL = hariLiburData.some(hl => {
          if (!hl) return false;
          const hlDate = parseDateBackend(hl.tanggal || hl.Tanggal);
          return hlDate && hlDate.getFullYear() === year && hlDate.getMonth() === monthIndex && hlDate.getDate() === i;
        });
      }

      let isIzin = false;
      if (uName && hariIzinData && Array.isArray(hariIzinData)) {
        isIzin = hariIzinData.some(hi => {
          if (!hi) return false;
          const hiName = (hi.Nama || hi.nama || "").toString().toLowerCase().trim();
          if (hiName !== uName) return false;
          
          const hiDate = parseDateBackend(hi.tanggal || hi.Tanggal);
          return hiDate && hiDate.getFullYear() === year && hiDate.getMonth() === monthIndex && hiDate.getDate() === i;
        });
      }
      if (isIzin) {
        hariIzinCount++;
      }

      const isW = new Date(year, monthIndex, i).getDay() === 0 || new Date(year, monthIndex, i).getDay() === 6 || i >= 24 || isHK;

      if (isHL) {
        // Holiday always counts as holiday basic wage, never meal allowance or discipline bonus
        hariLiburCount++;
      } else {
        if (groups[key]) {
          const g = groups[key];
          const hasWork = (g.masuk !== null && g.masuk !== undefined) || (g.pulang !== null && g.pulang !== undefined);
          if (hasWork) {
            if (g.status === '1/2 Hari') {
              if (isW) {
                setengahHariWeekend++;
                liburScore += 1.0;
              } else {
                setengahHariWeekday++;
                liburScore += 0.5;
              }
            }
            else if (g.status === 'Telat') { if (isW) hadirTelatWeekend++; else hadirTelatWeekday++; }
            else if (g.status === 'Disiplin') {
              hadirDisiplin++;
            }
            else hadirTepat++;
          } else {
            if (isIzin) {
              // Izin sakit: dihitung libur reguler (1 poin), bebas penalti hari krusial
              liburWeekday++;
              liburScore += 1.0;
            } else {
              if (isW) { liburWeekend++; liburScore += 2.0; } else { liburWeekday++; liburScore += 1.0; }
            }
          }
        } else {
          if (isIzin) {
            // Izin sakit: dihitung libur reguler (1 poin), bebas penalti hari krusial
            liburWeekday++;
            liburScore += 1.0;
          } else {
            if (isW) { liburWeekend++; liburScore += 2.0; } else { liburWeekday++; liburScore += 1.0; }
          }
        }
      }
    }

    return { hadirDisiplin, hadirTepat, hadirTelatWeekday, hadirTelatWeekend, setengahHariWeekday, setengahHariWeekend, liburWeekend, liburWeekday, liburScore, hariLiburCount, hariIzinCount };
  } catch (err) {
    console.error("Kesalahan calculateStatsBackend: " + err.toString());
    return {
      hadirDisiplin: 0, hadirTepat: 0, hadirTelatWeekday: 0, hadirTelatWeekend: 0,
      setengahHariWeekday: 0, setengahHariWeekend: 0, liburWeekend: 0, liburWeekday: 0,
      liburScore: 99, hariLiburCount: 0, hariIzinCount: 0
    };
  }
}

function getAvailablePeriods(e) {
  const email = (e.parameter.email || "").toLowerCase().trim();
  const periods = new Set();

  getSheetData("Master_Gaji").forEach(r => {
    if ((r.email || "").toLowerCase().trim() === email) {
      const p = parseToYYYYMM(r.bulan_berlaku || r.Bulan_Berlaku || r.periode);
      if (p) periods.add(p);
    }
  });

  getAllAbsensi().forEach(r => {
    if ((r.email || "").toLowerCase().trim() === email) {
      const p = parseToYYYYMM(r.waktu || r.Waktu || r.timestamp || r.tanggal);
      if (p) periods.add(p);
    }
  });

  ["Komisi", "Kasbon", "Point"].forEach(sheetName => {
    getSheetData(sheetName).forEach(r => {
       if ((r.email || "").toLowerCase().trim() === email) {
         const p = parseToYYYYMM(r.periode || r.bulan_berlaku || r.bulan || r.tanggal || r.waktu);
         if (p) periods.add(p);
       }
    });
  });

  periods.add(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`);
  return response(Array.from(periods).filter(p => /^\d{4}-\d{2}$/.test(p)).sort().reverse());
}

/*****************************************************************
 CHECKLIST HISTORY
*****************************************************************/
function getChecklistHistory(e){
  const email = (e.parameter.email || "").toLowerCase().trim();
  const nama = (e.parameter.nama || "").toLowerCase().trim();
  let result = [];
  const ss = getSS();
  if (!ss) return response([]);

  ss.getSheets().forEach(s => {
    const sName = s.getName();
    if(sName === "Checklist" || sName.startsWith("Checklist_")){
      result = result.concat(getSheetData(sName).filter(r => 
        (r.email || "").toLowerCase().trim() == email ||
        (r.nama || r.nama_tugas || r.tugas || "").toLowerCase().trim() == nama
      ));
    }
  });
  return response(result);
}

/*****************************************************************
 GURU HUB (PKL ONLY)
*****************************************************************/
function getPKLHistory(){
  const students = getSheetData("Karyawan").filter(u => {
    const jab = (u.jabatan || "").toUpperCase();
    return jab.includes("PKL") || jab.includes("MAGANG") || jab.includes("SISWA");
  });

  const emails = students.map(s => (s.email || "").toLowerCase().trim());
  const names = students.map(s => (s.nama || "").toLowerCase().trim());

  const history = getAllAbsensi().filter(r => {
    return emails.includes((r.email || "").toLowerCase().trim()) || names.includes((r.nama || "").toLowerCase().trim());
  });

  history.sort((a, b) => parseDateSafe(b.waktu || b.Waktu) - parseDateSafe(a.waktu || a.Waktu));
  
  return response({ students:students, history:history });
}

/*****************************************************************
 HR HUB
*****************************************************************/
function getAllHistory(){
  const users = getSheetData("Karyawan");
  const empEmails = users.map(u => (u.email || "").toString().toLowerCase().trim()).filter(e => e !== "");
  const empNames = users.map(u => (u.nama || "").toString().toLowerCase().trim()).filter(n => n !== "");

  const history = getAllAbsensi().filter(row => {
    return empEmails.includes((row.email || "").toLowerCase().trim()) || empNames.includes((row.nama || "").toLowerCase().trim());
  });

  history.sort((a, b) => parseDateSafe(b.waktu || b.Waktu) - parseDateSafe(a.waktu || a.Waktu));

  const hkLibur = getHariKhususAndLiburData();
  const izinRaw = getSheetData("Izin");
  const transfersRaw = getSheetData("Transfer_Gaji");
  return response({ 
    employees: users, 
    history: history,
    hariKhusus: hkLibur.hariKhusus,
    hariLibur: hkLibur.hariLibur,
    hariIzin: izinRaw,
    transfers: transfersRaw
  });
}

/*****************************************************************
 SIGNUP
*****************************************************************/
function signupUser(p){
  const ss = getSS();
  if(!ss) return response({status:"error", message:"Spreadsheet not accessible"});
  const sheet = ss.getSheetByName("Karyawan");

  let ktpUrl = "";
  if (p.fotoKTP && p.fotoKTP.startsWith("data:image")) {
    ktpUrl = saveFile(p.fotoKTP, FOLDER_ID_KTP, "KTP_" + p.nama + "_" + (new Date().getTime()));
  }

  sheet.appendRow([
    new Date(), p.nama, p.email, p.password, p.jabatan, p.ttl || "", p.alamat || "",
    p.wa || "", ktpUrl, p.k_nama || "", p.k_hub || "", p.k_wa || "", "", "", "", ""
  ]);

  return response({status:"sukses"});
}

/*****************************************************************
 UPDATE ABSEN (CORRECTION)
*****************************************************************/
function updateAbsen(p) {
  const ss = getSS();
  if(!ss) return response({status:"error", message:"Spreadsheet not accessible"});
  
  const date = new Date(p.waktu);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  let q = "Q1";
  if(month>=4 && month<=6) q="Q2"; else if(month>=7 && month<=9) q="Q3"; else if(month>=10) q="Q4";
  
  const sheetName = `Absensi_${year}_${q}`;
  let sh = ss.getSheetByName(sheetName) || ss.getSheetByName("Absensi");
  if (!sh) return response({status:"error", message:"Sheet not found: " + sheetName});

  const rows = sh.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim());
  const nameIdx = headers.indexOf("nama"), waktuIdx = headers.indexOf("waktu"), jenisIdx = headers.indexOf("jenis");

  if (waktuIdx === -1 || nameIdx === -1 || jenisIdx === -1) return response({status:"error", message:"Header kolom tidak valid"});

  const targetDateStr = date.toLocaleDateString('en-CA'); 
  const targetName = (p.nama || "").toString().toLowerCase().trim();
  const targetJenis = (p.jenis || "").toString().toLowerCase().trim();

  let found = false;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    let cellWaktu = row[waktuIdx];
    if (!(cellWaktu instanceof Date)) continue;
    
    const rowName = (row[nameIdx] || "").toString().toLowerCase().trim();
    const rowJenis = (row[jenisIdx] || "").toString().toLowerCase().trim();
    
    if (rowName === targetName && 
        cellWaktu.toLocaleDateString('en-CA') === targetDateStr && 
        rowJenis === targetJenis) {
      
      const activeCell = sh.getRange(i + 1, waktuIdx + 1);
      const newDateTime = new Date(cellWaktu);
      const [h, m] = p.newTime.split(':');
      newDateTime.setHours(parseInt(h), parseInt(m), 0);
      
      activeCell.setValue(newDateTime);
      found = true;
      break;
    }
  }

  if (!found) {
    // If not found, create new row
    const [h, m] = p.newTime.split(':');
    date.setHours(parseInt(h), parseInt(m), 0);
    
    // Look up employee info to get more data if needed
    const employeeData = getSheetData("Karyawan");
    const emp = employeeData.find(e => (e.nama || "").toLowerCase().trim() === targetName);
    const targetEmail = emp ? emp.email : (p.email || "");

    const emailIdx = headers.indexOf("email"), shiftIdx = headers.indexOf("shift"), cabangIdx = headers.indexOf("cabang");
    const locStatusIdx = headers.indexOf("status_lokasi"), photoIdx = headers.indexOf("link_foto_drive");

    const newRow = new Array(headers.length).fill("");
    newRow[waktuIdx] = date;
    newRow[nameIdx] = p.nama;
    if (emailIdx !== -1) newRow[emailIdx] = targetEmail;
    if (jenisIdx !== -1) newRow[jenisIdx] = p.jenis;
    if (shiftIdx !== -1) newRow[shiftIdx] = (p.jenis === "Masuk" ? "Full" : ""); 
    if (cabangIdx !== -1) newRow[cabangIdx] = p.cabang || "FLOW Salon";
    if (locStatusIdx !== -1) newRow[locStatusIdx] = "Admin Edit";
    if (photoIdx !== -1) newRow[photoIdx] = "Manual";

    sh.appendRow(newRow);
    return response({status:"sukses", message:"Absensi baru berhasil ditambahkan oleh HR."});
  }

  return response({status:"sukses", message:"Data berhasil diperbarui."});
}

/*****************************************************************
 ABSEN & CHECKLIST
*****************************************************************/
function submitAbsen(p){
  let rowDate = new Date();
  if (p.timestamp) {
    try {
      const parsed = new Date(p.timestamp);
      if (!isNaN(parsed.getTime())) {
        rowDate = parsed;
      }
    } catch (e) {
      console.warn("Gagal parse timestamp absen client " + p.timestamp + ": " + e.toString());
    }
  }

  const sheet = getQuarterSheet("Absensi",["Waktu","Nama","Email","Jenis","Shift","Cabang","GPS","Status_Lokasi","Link_Foto_Drive","Progress_Materi"], rowDate);
  if (sheet.getLastColumn() < 10) sheet.getRange(1, 10).setValue("Progress_Materi").setFontWeight("bold").setBackground("#d1fadf");

  // Cegah duplikasi jika data dari antrean offline / retry sebenarnya sudah masuk di hari yang sama
  try {
    const targetEmail = (p.email || "").toString().toLowerCase().trim();
    const targetJenis = (p.jenis || "").toString().toLowerCase().trim();
    const targetDateStr = rowDate.toLocaleDateString('en-CA');
    const rows = sheet.getDataRange().getValues();
    if (rows.length > 1) {
      const headers = rows[0].map(function(h) { return h.toString().toLowerCase().trim(); });
      const idxWaktu = headers.indexOf("waktu");
      const idxEmail = headers.indexOf("email");
      const idxJenis = headers.indexOf("jenis");
      if (idxWaktu !== -1 && idxEmail !== -1 && idxJenis !== -1) {
        for (let i = rows.length - 1; i >= 1; i--) {
          const r = rows[i];
          const rEmail = (r[idxEmail] || "").toString().toLowerCase().trim();
          const rJenis = (r[idxJenis] || "").toString().toLowerCase().trim();
          if (rEmail === targetEmail && rJenis === targetJenis) {
            const rWaktu = r[idxWaktu] instanceof Date ? r[idxWaktu] : new Date(r[idxWaktu]);
            if (!isNaN(rWaktu.getTime()) && rWaktu.toLocaleDateString('en-CA') === targetDateStr) {
              return response({status:"sukses", deduplicated: true});
            }
          }
        }
      }
    }
  } catch (dedupErr) {
    console.warn("Deduplication check warning: " + dedupErr.toString());
  }

  let photoUrl = p.foto && p.foto.startsWith("data:image") ? saveFile(p.foto, FOLDER_ID_ABSEN, "Absen_" + p.nama + "_" + rowDate.getTime()) : p.foto || "";
  sheet.appendRow([rowDate, p.nama, p.email, p.jenis, p.shift, p.cabang, `${p.lat},${p.lng}`, p.statusLokasi, photoUrl, p.materi || "-"]);
  return response({status:"sukses"});
}

function submitChecklist(p){
  let rowDate = new Date();
  if (p.timestamp) {
    try {
      const parsed = new Date(p.timestamp);
      if (!isNaN(parsed.getTime())) {
        rowDate = parsed;
      }
    } catch (e) {
      console.warn("Gagal parse timestamp client " + p.timestamp + ": " + e.toString());
    }
  }
  
  const sheet = getQuarterSheet("Checklist", ["Waktu","Nama","Jabatan","Jenis_Checklist","Ringkasan","Skor_%","Data_Laporan_JSON"], rowDate);
  const ringkasan = "" + p.totalSelesai + " dari " + p.totalTugas + " selesai";
  const skor = p.totalTugas > 0 ? Math.round((p.totalSelesai/p.totalTugas)*100)+"%" : "0%";
  
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0].map(function(h) { return h.toString().toLowerCase().trim().replace(/\s+/g, '_'); });
  
  const idxWaktu = headers.indexOf("waktu");
  const idxNama = headers.indexOf("nama");
  const idxJabatan = headers.indexOf("jabatan");
  const idxJenis = headers.indexOf("jenis_checklist") !== -1 ? headers.indexOf("jenis_checklist") : headers.indexOf("jenis");
  const idxRingkasan = headers.indexOf("ringkasan");
  const idxSkor = headers.indexOf("skor_%") !== -1 ? headers.indexOf("skor_%") : headers.indexOf("skor");
  const idxJson = headers.indexOf("data_laporan_json") !== -1 ? headers.indexOf("data_laporan_json") : headers.indexOf("json");
  
  if (idxWaktu === -1 || idxNama === -1 || idxJenis === -1) {
    sheet.appendRow([rowDate, p.nama, p.jabatan, p.jenis, ringkasan, skor, JSON.stringify(p.checklist)]);
    return response({status:"sukses", message:"Diisi baris baru (header tidak lengkap)"});
  }
  
  const targetName = (p.nama || "").toString().toLowerCase().trim();
  const targetJenis = (p.jenis || "").toString().toLowerCase().trim();
  
  const isSamePeriod = function(d1, d2, jenis) {
    if (!(d1 instanceof Date) || !(d2 instanceof Date)) {
      try {
        d1 = new Date(d1);
        d2 = new Date(d2);
      } catch(e) {
        return false;
      }
    }
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    
    const y1 = d1.getFullYear(), m1 = d1.getMonth();
    const y2 = d2.getFullYear(), m2 = d2.getMonth();
    
    if (jenis === 'harian') {
      return y1 === y2 && m1 === m2 && d1.getDate() === d2.getDate();
    } else if (jenis === 'mingguan') {
      const getMonday = function(d) {
        const t = new Date(d);
        const day = t.getDay();
        const diff = t.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(t.setDate(diff));
        monday.setHours(0,0,0,0);
        return monday.getTime();
      };
      return getMonday(d1) === getMonday(d2);
    } else { // bulanan
      return y1 === y2 && m1 === m2;
    }
  };
  
  let foundRowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cellWaktu = row[idxWaktu];
    const cellNama = (row[idxNama] || "").toString().toLowerCase().trim();
    const cellJenis = (row[idxJenis] || "").toString().toLowerCase().trim();
    
    if (cellNama === targetName && cellJenis === targetJenis && isSamePeriod(cellWaktu, rowDate, targetJenis)) {
      foundRowIndex = i + 1;
      break;
    }
  }
  
  if (foundRowIndex !== -1) {
    // Update existing row
    sheet.getRange(foundRowIndex, idxWaktu + 1).setValue(rowDate);
    if (idxJabatan !== -1) sheet.getRange(foundRowIndex, idxJabatan + 1).setValue(p.jabatan);
    if (idxRingkasan !== -1) sheet.getRange(foundRowIndex, idxRingkasan + 1).setValue(ringkasan);
    if (idxSkor !== -1) sheet.getRange(foundRowIndex, idxSkor + 1).setValue(skor);
    if (idxJson !== -1) sheet.getRange(foundRowIndex, idxJson + 1).setValue(JSON.stringify(p.checklist));
    
    return response({status:"sukses", message:"Data checklist berhasil diperbarui (update)"});
  } else {
    // Append new row
    const newRow = new Array(headers.length).fill("");
    newRow[idxWaktu] = rowDate;
    newRow[idxNama] = p.nama;
    if (idxJabatan !== -1) newRow[idxJabatan] = p.jabatan;
    if (idxJenis !== -1) newRow[idxJenis] = p.jenis;
    if (idxRingkasan !== -1) newRow[idxRingkasan] = ringkasan;
    if (idxSkor !== -1) newRow[idxSkor] = skor;
    if (idxJson !== -1) newRow[idxJson] = JSON.stringify(p.checklist);
    
    sheet.appendRow(newRow);
    return response({status:"sukses", message:"Checklist baru ditambahkan"});
  }
}

function submitKasbon(p) {
  const ss = getSS();
  if(!ss) return response({status:"error", message:"Sheet not accessible"});
  
  let sh = ss.getSheetByName("Kasbon");
  if(!sh) {
    // Try fuzzy match
    sh = ss.getSheets().find(s => s.getName().toLowerCase().includes("kasbon"));
  }
  if(!sh) return response({status:"error", message:"Sheet Kasbon tidak ditemukan"});

  const rows = sh.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim().replace(/\s+/g, '_'));
  
  const idxWaktu = headers.findIndex(h => h.includes("tanggal") || h.includes("waktu") || h.includes("date"));
  const idxEmail = headers.findIndex(h => h.includes("email") || h.includes("user"));
  const idxNama = headers.findIndex(h => h.includes("nama") || h.includes("karyawan"));
  const idxItem = headers.findIndex(h => h.includes("item") || h.includes("keterangan") || h.includes("uraian") || h.includes("deskripsi"));
  const idxNominal = headers.findIndex(h => h.includes("nominal") || h.includes("jumlah") || h.includes("kasbon") || h.includes("total"));

  if(idxWaktu === -1 || idxEmail === -1 || idxNominal === -1) {
    return response({status:"error", message:"Header sheet Kasbon tidak lengkap (Perlu: Tanggal, Email, Nominal)"});
  }

  const pWaktu = new Date(p.tanggal || p.waktu || new Date());
  const pEmail = (p.email || "").toLowerCase().trim();
  const pNama = p.nama || "";
  const pItem = p.item || p.keterangan || "";
  const pNominal = cleanNumBackend(p.nominal);

  if (p.isEdit && p.oldData) {
     const old = p.oldData;
     const oldWaktuDate = new Date(old.tanggal);
     const oldWaktuStr = !isNaN(oldWaktuDate.getTime()) ? oldWaktuDate.toLocaleDateString('en-CA') : "";
     const oldNominal = cleanNumBackend(old.nominal);
     const oldItem = (old.item || "").toLowerCase().trim();

     for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowWaktu = (row[idxWaktu] instanceof Date) ? row[idxWaktu].toLocaleDateString('en-CA') : "";
        const rowEmail = (row[idxEmail] || "").toString().toLowerCase().trim();
        const rowItem = (idxItem !== -1 ? row[idxItem] : "").toString().toLowerCase().trim();
        const rowNominal = cleanNumBackend(row[idxNominal]);

        if (rowEmail === pEmail && (rowWaktu === oldWaktuStr || oldWaktuStr === "") && Math.abs(rowNominal - oldNominal) < 1 && rowItem === oldItem) {
           sh.getRange(i + 1, idxWaktu + 1).setValue(pWaktu);
           if(idxItem !== -1) sh.getRange(i + 1, idxItem + 1).setValue(pItem);
           sh.getRange(i + 1, idxNominal + 1).setValue(pNominal);
           if(idxNama !== -1 && pNama) sh.getRange(i + 1, idxNama + 1).setValue(pNama);
           return response({status:"sukses", message:"Kasbon berhasil diperbaharui"});
        }
     }
  }

  const newRowData = new Array(headers.length).fill("");
  newRowData[idxWaktu] = pWaktu;
  newRowData[idxEmail] = pEmail;
  if(idxNama !== -1) newRowData[idxNama] = pNama;
  if(idxItem !== -1) newRowData[idxItem] = pItem;
  newRowData[idxNominal] = pNominal;

  sh.appendRow(newRowData);
  return response({status:"sukses", message:"Kasbon berhasil ditambahkan"});
}

function deleteKasbon(p) {
  const ss = getSS();
  if(!ss) return response({status:"error", message:"Sheet not accessible"});
  let sh = ss.getSheetByName("Kasbon");
  if(!sh) sh = ss.getSheets().find(s => s.getName().toLowerCase().includes("kasbon"));
  if(!sh) return response({status:"error", message:"Sheet Kasbon tidak ditemukan"});

  const rows = sh.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim().replace(/\s+/g, '_'));
  const idxWaktu = headers.findIndex(h => h.includes("tanggal") || h.includes("waktu") || h.includes("date"));
  const idxEmail = headers.findIndex(h => h.includes("email") || h.includes("user"));
  const idxItem = headers.findIndex(h => h.includes("item") || h.includes("keterangan") || h.includes("uraian") || h.includes("deskripsi"));
  const idxNominal = headers.findIndex(h => h.includes("nominal") || h.includes("jumlah") || h.includes("kasbon") || h.includes("total"));

  const pEmail = (p.email || "").toLowerCase().trim();
  const targetDate = new Date(p.tanggal);
  const pWaktuStr = !isNaN(targetDate.getTime()) ? targetDate.toLocaleDateString('en-CA') : "";
  const pNominal = cleanNumBackend(p.nominal);
  const pItem = (p.item || "").toLowerCase().trim();

  for (let i = rows.length - 1; i >= 1; i--) {
     const row = rows[i];
     const rowWaktu = (row[idxWaktu] instanceof Date) ? row[idxWaktu].toLocaleDateString('en-CA') : "";
     const rowEmail = (row[idxEmail] || "").toString().toLowerCase().trim();
     const rowItem = (idxItem !== -1 ? row[idxItem] : "").toString().toLowerCase().trim();
     const rowNominal = cleanNumBackend(row[idxNominal]);

     if (rowEmail === pEmail && (rowWaktu === pWaktuStr || pWaktuStr === "") && Math.abs(rowNominal - pNominal) < 1 && rowItem === pItem) {
        sh.deleteRow(i + 1);
        return response({status:"sukses", message:"Kasbon berhasil dihapus"});
     }
  }
  return response({status:"error", message:"Kasbon tidak ditemukan"});
}

function submitTransfer(p) {
  const ss = getSS();
  if(!ss) return response({status:"error", message:"Sheet not accessible"});
  
  let sh = ss.getSheetByName("Transfer_Gaji");
  if(!sh) {
    sh = ss.insertSheet("Transfer_Gaji");
    sh.appendRow(["Tanggal", "Email", "Nama", "Periode", "Nominal"]);
    sh.getRange(1, 1, 1, 5).setFontWeight("bold");
  }

  const rows = sh.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim().replace(/\s+/g, '_'));
  
  const idxWaktu = headers.findIndex(h => h.includes("tanggal") || h.includes("waktu") || h.includes("date"));
  const idxEmail = headers.findIndex(h => h.includes("email") || h.includes("user"));
  const idxNama = headers.findIndex(h => h.includes("nama") || h.includes("karyawan"));
  const idxPeriode = headers.findIndex(h => h.includes("periode") || h.includes("bulan"));
  const idxNominal = headers.findIndex(h => h.includes("nominal") || h.includes("jumlah") || h.includes("total"));

  if(idxWaktu === -1 || idxEmail === -1 || idxNominal === -1) {
    return response({status:"error", message:"Header sheet Transfer_Gaji tidak lengkap (Perlu: Tanggal, Email, Nominal)"});
  }

  const pWaktu = new Date(p.tanggal || new Date());
  const pEmail = (p.email || "").toLowerCase().trim();
  const pNama = p.nama || "";
  const pPeriode = p.periode || "";
  const pNominal = cleanNumBackend(p.nominal);

  const newRowData = new Array(headers.length).fill("");
  newRowData[idxWaktu] = pWaktu;
  newRowData[idxEmail] = pEmail;
  if(idxNama !== -1) newRowData[idxNama] = pNama;
  if(idxPeriode !== -1) newRowData[idxPeriode] = pPeriode;
  newRowData[idxNominal] = pNominal;

  sh.appendRow(newRowData);
  return response({status:"sukses", message:"Transfer berhasil ditambahkan"});
}

function deleteTransfer(p) {
  const ss = getSS();
  if(!ss) return response({status:"error", message:"Sheet not accessible"});
  let sh = ss.getSheetByName("Transfer_Gaji");
  if(!sh) return response({status:"error", message:"Sheet Transfer_Gaji tidak ditemukan"});

  const rows = sh.getDataRange().getValues();
  const headers = rows[0].map(h => h.toString().toLowerCase().trim().replace(/\s+/g, '_'));
  const idxWaktu = headers.findIndex(h => h.includes("tanggal") || h.includes("waktu") || h.includes("date"));
  const idxEmail = headers.findIndex(h => h.includes("email") || h.includes("user"));
  const idxPeriode = headers.findIndex(h => h.includes("periode") || h.includes("bulan"));
  const idxNominal = headers.findIndex(h => h.includes("nominal") || h.includes("jumlah") || h.includes("total"));

  const pEmail = (p.email || "").toLowerCase().trim();
  const targetDate = new Date(p.tanggal);
  const pWaktuStr = !isNaN(targetDate.getTime()) ? targetDate.toLocaleDateString('en-CA') : "";
  const pNominal = cleanNumBackend(p.nominal);
  const pPeriode = (p.periode || "").toLowerCase().trim();

  for (let i = rows.length - 1; i >= 1; i--) {
     const row = rows[i];
     const rowWaktu = (row[idxWaktu] instanceof Date) ? row[idxWaktu].toLocaleDateString('en-CA') : "";
     const rowEmail = (row[idxEmail] || "").toString().toLowerCase().trim();
     const rowPeriode = (idxPeriode !== -1 ? row[idxPeriode] : "").toString().toLowerCase().trim();
     const rowNominal = cleanNumBackend(row[idxNominal]);

     if (rowEmail === pEmail && (rowWaktu === pWaktuStr || pWaktuStr === "") && Math.abs(rowNominal - pNominal) < 1 && rowPeriode === pPeriode) {
        sh.deleteRow(i + 1);
        return response({status:"sukses", message:"Transfer berhasil dihapus"});
     }
  }
  return response({status:"error", message:"Transfer tidak ditemukan"});
}


/*****************************************************************
 CORE HELPERS
*****************************************************************/
function getHariKhususAndLiburData() {
  const ss = getSS();
  if (!ss) return { hariKhusus: [], hariLibur: [] };
  
  let sh = ss.getSheetByName("Hari_Khusus");
  if (!sh) sh = ss.getSheets().find(s => s.getName().toLowerCase().trim() === "hari_khusus");
  if (!sh) sh = ss.getSheets().find(s => s.getName().toLowerCase().includes("hari_khusus"));
  if (!sh) return { hariKhusus: [], hariLibur: [] };
  
  const values = sh.getDataRange().getDisplayValues();
  if (values.length < 2) return { hariKhusus: [], hariLibur: [] };
  
  const hariKhusus = [];
  const hariLibur = [];
  
  let headerRowIndex = 1; 
  let hkTglCol = 0;
  let hkKetCol = 1;
  let hlTglCol = 3;
  let hlKetCol = 4;
  
  for (let r = 0; r < Math.min(values.length, 3); r++) {
    const row = values[r];
    const rowStr = row.map(v => String(v).toLowerCase().trim());
    if (rowStr.indexOf("tanggal") !== -1) {
      headerRowIndex = r;
      hkTglCol = rowStr.indexOf("tanggal");
      hkKetCol = rowStr.indexOf("keterangan");
      hlTglCol = rowStr.indexOf("tanggal", hkTglCol + 1);
      hlKetCol = rowStr.indexOf("keterangan", hkKetCol + 1);
      if (hlTglCol === -1) hlTglCol = 3; 
      if (hlKetCol === -1) hlKetCol = 4; 
      break;
    }
  }
  
  for (let i = headerRowIndex + 1; i < values.length; i++) {
    const row = values[i];
    if (!row) continue;
    
    // Hari Khusus
    const hkTgl = (row[hkTglCol] || "").trim();
    const hkKet = (row[hkKetCol] || "").trim();
    if (hkTgl && hkTgl.toLowerCase() !== "tanggal") {
      hariKhusus.push({
        tanggal: hkTgl,
        Tanggal: hkTgl,
        keterangan: hkKet,
        Keterangan: hkKet
      });
    }
    
    // Libur
    const hlTgl = (row[hlTglCol] || "").trim();
    const hlKet = (row[hlKetCol] || "").trim();
    if (hlTgl && hlTgl.toLowerCase() !== "tanggal") {
      hariLibur.push({
        tanggal: hlTgl,
        Tanggal: hlTgl,
        keterangan: hlKet,
        Keterangan: hlKet
      });
    }
  }
  
  return { hariKhusus, hariLibur };
}

function getSheetData(name) {
  const ss = getSS();
  if (!ss) return [];
  
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.getSheets().find(s => s.getName().toLowerCase().trim() === name.toLowerCase().trim());
  if (!sh) sh = ss.getSheets().find(s => s.getName().toLowerCase().includes(name.toLowerCase()));
  if(!sh) return [];

  const values = sh.getDataRange().getDisplayValues(); 
  if(values.length < 1) return [];

  // Find the first row that contains typical header keywords
  let headerRowIndex = 0;
  const headerKeywords = ["tanggal", "nama", "pegawai", "karyawan", "produk", "sku", "email", "waktu", "periode", "nominal", "komisi", "kasbon", "point"];
  
  while (headerRowIndex < values.length) {
    const row = values[headerRowIndex];
    const rowStr = row.map(v => String(v).toLowerCase().trim());
    const isHeaderRow = rowStr.some(v => headerKeywords.some(keyword => v.indexOf(keyword) !== -1));
    if (isHeaderRow) {
      break;
    }
    headerRowIndex++;
  }

  // Fallback to first row if no headers found
  if (headerRowIndex >= values.length) {
    headerRowIndex = 0;
  }

  const headers = values[headerRowIndex];
  const cleanHeads = headers.map(h => h.toString().toLowerCase().trim().replace(/\s+/g, '_'));
  const compactHeads = headers.map(h => h.toString().toLowerCase().trim().replace(/\s+/g, ""));

  const dataRows = values.slice(headerRowIndex + 1);

  return dataRows.map(row => {
    let obj = {};
    if (row.length > 0 && row[0] !== "" && row[0] !== null) {
      obj._colA = row[0];
    }
    for(let i=0; i<headers.length; i++){
      const val = row[i];
      if (val === "" || val === null) continue;
      
      const orig = headers[i].toString();
      obj[orig] = val;
      obj[cleanHeads[i]] = val;
      obj[compactHeads[i]] = val;
    }
    return obj;
  }).filter(obj => {
    // Filter out rows where all values are empty
    return Object.keys(obj).length > 0;
  });
}

/**
 * Versi cepat yang hanya mengambil baris milik email tertentu
 */
function getSheetDataFiltered(name, email, nameFilter, idPegawaiFilter) {
  const data = getSheetData(name);
  if (data.length === 0) return [];

  const eLower = (email || "").toLowerCase().trim();
  const nLower = (nameFilter || "").toLowerCase().trim();
  const idTarget = (idPegawaiFilter || "").toString().trim();

  let allEmployeeNames = [];
  let allEmployeeIds = [];
  try {
    const masterKaryawan = getSheetData("Karyawan");
    if (masterKaryawan && masterKaryawan.length > 0) {
      allEmployeeNames = masterKaryawan.map(u => (u.nama || u.Nama || "").toLowerCase().trim()).filter(Boolean);
      allEmployeeIds = masterKaryawan.map(u => String(u.id_pegawai || u.id_pos || u.idpegawai || u.idpos || u.id || u.nik || u["ID Pegawai"] || u["ID POS"] || "").trim()).filter(Boolean);
    }
  } catch(e) {
    console.error("Error loading employee names for filter: " + e.toString());
  }

  return data.filter(r => {
    const rEmail = (r.email || r.user_email || r.user || r.Email || r.User_Email || "").toLowerCase().trim();
    const rNama = (r.nama || r.nama_karyawan || r.namakaryawan || r.karyawan || r.pegawai || r.Nama || r.Karyawan || r.Pegawai || "").toLowerCase().trim();
    const rId = String(r.id_pegawai || r.idpegawai || r.id_pos || r.idpos || r.id || r.nik || r["ID Pegawai"] || r["Id Pegawai"] || r["ID_Pegawai"] || r["ID"] || "").trim();

    // 1. Email match
    if (eLower && rEmail && rEmail === eLower) {
      return true;
    }

    // 2. ID Pegawai match (highest precision)
    if (idTarget && rId) {
      return rId === idTarget;
    }

    // 3. If row has an ID Pegawai that belongs to another employee in Karyawan, reject
    if (rId && allEmployeeIds.includes(rId) && rId !== idTarget) {
      return false;
    }

    // 4. Fallback: Strict Name matching
    const matchesName = nLower && isEmployeeNameMatch(rNama, nLower, allEmployeeNames);
    return matchesName;
  });
}

function isEmployeeNameMatch(rowName, targetName, allNames) {
  const rClean = (rowName || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  const tClean = (targetName || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  
  if (!rClean || !tClean) return false;
  if (rClean === tClean) return true;
  
  // If we have all names, check if rClean exactly matches some other employee.
  // If it does, then only that employee should claim it.
  if (allNames && Array.isArray(allNames)) {
    const hasExactOther = allNames.some(name => {
      const n = (name || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
      return n === rClean && n !== tClean;
    });
    if (hasExactOther) {
      return false; // Let the exact match employee claim it
    }
  }
  
  const rWords = rClean.split(" ");
  const tWords = tClean.split(" ");
  
  // If either is a single word, require exact match to prevent collisions
  if (rWords.length === 1 || tWords.length === 1) {
    return rClean === tClean;
  }
  
  // Check if rowName is a sub-phrase of targetName
  if (tClean.indexOf(rClean) !== -1) {
    const startIdx = tClean.indexOf(rClean);
    const endIdx = startIdx + rClean.length;
    const validStart = startIdx === 0 || tClean[startIdx - 1] === ' ';
    const validEnd = endIdx === tClean.length || tClean[endIdx] === ' ';
    if (validStart && validEnd) {
      return true;
    }
  }
  
  // Check if targetName is a sub-phrase of rowName
  if (rClean.indexOf(tClean) !== -1) {
    const startIdx = rClean.indexOf(tClean);
    const endIdx = startIdx + tClean.length;
    const validStart = startIdx === 0 || rClean[startIdx - 1] === ' ';
    const validEnd = endIdx === rClean.length || rClean[endIdx] === ' ';
    if (validStart && validEnd) {
      return true;
    }
  }

  // Handle POS character truncation (e.g. "Melani Mariah muharr" vs "Melani Mariah muharromah"):
  if (rWords.length >= 2 && tWords.length >= 2 && rWords.length === tWords.length) {
    let prefixWordsMatch = true;
    for (let i = 0; i < rWords.length - 1; i++) {
      if (rWords[i] !== tWords[i]) {
        prefixWordsMatch = false;
        break;
      }
    }
    if (prefixWordsMatch) {
      const lastR = rWords[rWords.length - 1];
      const lastT = tWords[tWords.length - 1];
      if (lastR.length >= 4 && (lastT.startsWith(lastR) || lastR.startsWith(lastT))) {
        // Ensure this doesn't conflict with any other employee
        if (allNames && Array.isArray(allNames)) {
          const conflict = allNames.some(name => {
            const n = (name || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
            if (n === tClean) return false;
            return n.startsWith(rClean);
          });
          if (!conflict) return true;
        } else {
          return true;
        }
      }
    }
  }
  
  return false;
}

function getQuarterSheet(prefix,headers,targetDate){
  const ss = getSS();
  if(!ss) throw new Error("Spreadsheet not accessible");
  const now = targetDate || new Date(), year = now.getFullYear(), month = now.getMonth()+1;
  let q="Q1"; if(month>=4 && month<=6) q="Q2"; else if(month>=7 && month<=9) q="Q3"; else if(month>=10) q="Q4";
  
  let sh = ss.getSheetByName(`${prefix}_${year}_${q}`);
  if(!sh){ sh = ss.insertSheet(`${prefix}_${year}_${q}`); sh.appendRow(headers); sh.getRange(1,1,1,headers.length).setFontWeight("bold"); }
  return sh;
}

function getAllAbsensi(){
  let all=[]; const ss = getSS(); if (!ss) return [];
  ss.getSheets().forEach(s => { if(s.getName() === "Absensi" || s.getName().startsWith("Absensi_")) all = all.concat(getSheetData(s.getName())); });
  return all;
}

function getUserByEmail(email){
  return getSheetData("Karyawan").find(u => (u.email || "").toLowerCase().trim()==email);
}

function getLatestPesan(){
  const data = getSheetData("PesanManager");
  if(data.length == 0) return { pesan: "Selamat bekerja!", nama: "Manager", jabatan: "Salon Manager" };
  const timeInJakarta = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
  const daysSinceEpoch = Math.floor(timeInJakarta.getTime() / (1000 * 60 * 60 * 24));
  const x = Math.sin(daysSinceEpoch) * 10000;
  return data[Math.floor((x - Math.floor(x)) * data.length)];
}

function checkConnection() {
  const ss = getSS();
  if (!ss) return response({ status: "error", message: "Spreadsheet ID salah/akses ditolak." });
  return response({ status: "sukses", message: "Terhubung: " + ss.getName(), sheets: ss.getSheets().map(s => s.getName()), userEmail: Session.getActiveUser().getEmail() });
}

// HELPERS FOR DATE AND RESPONSE
// BANTUAN UNTUK SORTING TANGGAL AMAN
function parseDateSafe(timeStr) {
  if (!timeStr) return 0;
  let d = new Date(timeStr);
  if (!isNaN(d.getTime())) return d.getTime();
  return 0;
}

/// SMART DATE PARSER UNTUK KOMISI/KASBON (Mendukung MM/DD/YYYY, DD/MM/YYYY, MMM/DD/YYYY)
function parseToYYYYMM(val) {
  if (val === null || val === undefined) return null;

  // Jika sudah berupa objek Date
  if (val instanceof Date || (typeof val === 'object' && typeof val.getMonth === 'function')) {
    try {
      const y = val.getFullYear();
      const m = val.getMonth() + 1;
      return `${y}-${String(m).padStart(2, '0')}`;
    } catch(e) {}
  }

  const s = val.toString().trim();
  if (!s) return null;

  // Jika berupa serial date angka (misal representasi Google Sheets)
  if (/^\d+(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    if (num > 30000 && num < 60000) {
      try {
        const d = new Date((num - 25569) * 86400 * 1000);
        if (!isNaN(d.getTime())) {
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      } catch(e) {}
    }
  }

  const sLower = s.toLowerCase();

  // Coba cari nama bulan tertulis dahulu
  const months = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
  const engMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  for (let i = 0; i < 12; i++) {
    if (sLower.includes(months[i]) || sLower.includes(engMonths[i])) {
      const yearMatches = s.match(/\d{4}/g) || s.match(/\d{2}$/g);
      let year = new Date().getFullYear();
      if (yearMatches) {
        year = parseInt(yearMatches[yearMatches.length - 1], 10);
        if (year < 100) year += 2000;
        else if (year < 1000) year = new Date().getFullYear();
      }
      return `${year}-${String(i + 1).padStart(2, '0')}`;
    }
  }

  // Pisahkan bagian waktu jika ada spasi diikuti angka/titik dua
  const cleanDateStr = s.split(/\s+/)[0];

  // 1. Coba baca format numerik yang jelas: YYYY-MM atau YYYY/MM atau YYYY.MM
  const matchYM = cleanDateStr.match(/^(\d{4})[-/.](\d{1,2})/);
  if (matchYM) {
    return `${matchYM[1]}-${matchYM[2].padStart(2, '0')}`;
  }

  // 2. Coba baca format MM/DD/YYYY atau DD/MM/YYYY (Numerik)
  const parts = cleanDateStr.split(/[-/.]/).filter(p => p.trim() !== "");
  if (parts.length >= 2) {
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    let p2 = parts.length >= 3 ? parseInt(parts[2], 10) : new Date().getFullYear();
    
    if (!isNaN(p0) && !isNaN(p1)) {
      let y = p2;
      if (y < 100) y += 2000;
      
      // Default ke MM/DD/YYYY sesuai keinginan user (p0 = bulan, p1 = tanggal)
      let m = p0;
      let d = p1;
      
      // Koreksi cerdas: Jika m > 12, kemungkinan besar itu DD/MM/YYYY
      if (m > 12 && d <= 12) {
        let temp = m; m = d; d = temp;
      }
      
      if (m >= 1 && m <= 12) {
        return `${y}-${String(m).padStart(2, '0')}`;
      }
    }
  }

  // 3. Fallback Terakhir: Date() bawaan
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
  } catch(e) {}

  return null;
}

function response(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function saveFileToDrive(base64Data, folderId, fileName) { return saveFile(base64Data, folderId, fileName); }

function saveFile(base64Data, folderId, fileName) {
  if (!base64Data || !folderId) return "";
  try {
    const splitData = base64Data.split(',');
    if (splitData.length < 2) return "";
    const contentType = splitData[0].substring(splitData[0].indexOf(":") + 1, splitData[0].indexOf(";"));
    const blob = Utilities.newBlob(Utilities.base64Decode(splitData[1]), contentType, fileName);
    return DriveApp.getFolderById(folderId).createFile(blob).getUrl();
  } catch (e) { return "Error: " + e.toString(); }
}

function getProductPointAndKomisiBackend(entry, pointProdukList) {
  const DEFAULT_POINT_PRODUK = [
    { produk: "Celana Dalam", komisi: 2000, point: 0.5 },
    { produk: "Sisir Bulu Mata", komisi: 5000, point: 0.5 },
    { produk: "Vitamin Kuku", komisi: 5000, point: 1 },
    { produk: "Mylea Hair Tonic", komisi: 15000, point: 1 },
    { produk: "Oshine", komisi: 10000, point: 2 },
    { produk: "Serum Eyelash Lashboost", komisi: 10000, point: 1 },
    { produk: "Morphosis Bundling Treatment", komisi: 100000, point: 10 },
    { produk: "Morphosis Sublimis Oil", komisi: 100000, point: 10 },
    { produk: "Morphosis Sublimis Shine", komisi: 100000, point: 10 },
    { produk: "Collagen S", komisi: 5000, point: 0.5 },
    { produk: "Collagen M", komisi: 10000, point: 1 },
    { produk: "Collagen L", komisi: 15000, point: 1.5 },
    { produk: "Collagen XL", komisi: 20000, point: 2 },
    { produk: "Collagen XXL", komisi: 25000, point: 2.5 }
  ];

  const listToUse = (pointProdukList && pointProdukList.length > 0) ? pointProdukList : DEFAULT_POINT_PRODUK;
  
  const itemText = entry.item || entry.Item || entry.produk || entry.Produk || "";
  const skuText = entry.sku || entry.SKU || "";
  
  const normItem = itemText.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const normSku = skuText.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  
  const info = listToUse.find(p => {
    const pName = (p.produk || "").toLowerCase().trim().replace(/[^a-z0-9]/g, "");
    return pName && (normItem === pName || normItem.indexOf(pName) !== -1 || pName.indexOf(normItem) !== -1 || normSku === pName || normSku.indexOf(pName) !== -1);
  });
  
  if (info) {
    return { point: Number(info.point || 0), komisi: Number(info.komisi || 0) };
  }
  
  const cleanSku = skuText.toLowerCase().trim();
  const isBeautyProduct = 
    cleanSku.indexOf("prd-clg") === 0 || 
    cleanSku === "prd-osh" ||         
    cleanSku === "prd-selb" ||        
    cleanSku === "prd-vtk" ||         
    cleanSku === "prd-ssal" ||        
    cleanSku === "prd-cd";
  
  let fallbackKomisi = 0;
  let fallbackPoint = 1;
  
  if (cleanSku === "prd-osh") {
    fallbackKomisi = 10000;
    fallbackPoint = 2;
  } else if (cleanSku === "prd-cd") {
    fallbackKomisi = 2000;
    fallbackPoint = 0.5;
  } else if (cleanSku === "prd-ssal") {
    fallbackKomisi = 5000;
    fallbackPoint = 0.5;
  } else if (cleanSku === "prd-vtk") {
    fallbackKomisi = 5000;
    fallbackPoint = 1;
  } else if (cleanSku === "prd-selb") {
    fallbackKomisi = 10000;
    fallbackPoint = 1;
  } else if (cleanSku.indexOf("prd-clg-s") === 0) {
    fallbackKomisi = 5000;
    fallbackPoint = 0.5;
  } else if (cleanSku.indexOf("prd-clg-m") === 0) {
    fallbackKomisi = 10000;
    fallbackPoint = 1;
  } else if (cleanSku.indexOf("prd-clg-l") === 0) {
    fallbackKomisi = 15000;
    fallbackPoint = 1.5;
  } else if (cleanSku.indexOf("prd-clg-xl") === 0) {
    fallbackKomisi = 20000;
    fallbackPoint = 2;
  } else if (cleanSku.indexOf("prd-clg-xxl") === 0) {
    fallbackKomisi = 25000;
    fallbackPoint = 2.5;
  } else if (isBeautyProduct) {
    fallbackKomisi = Math.round((Number(entry.harga_item || entry.Harga_Item || entry.harga || 0)) * 0.10);
  }
  
  return { point: fallbackPoint, komisi: fallbackKomisi };
}

/*****************************************************************
 VPS MIRROR & KLUTO POS AUTO-SYNC ENDPOINTS
*****************************************************************/
function exportFullDatabase(e) {
  const ss = getSS();
  if (!ss) return response({ status: "error", message: "Spreadsheet tidak dapat diakses." });
  const hkLibur = getHariKhususAndLiburData();
  let pointProduk = getSheetData("Point Produk");
  if (!pointProduk || pointProduk.length === 0) pointProduk = getSheetData("Point_Produk");
  let transaksiProd = getSheetData("Transaksi Prod");
  if (!transaksiProd || transaksiProd.length === 0) transaksiProd = getSheetData("Transaksi Produk");

  return response({
    status: "sukses",
    syncedAt: new Date().toISOString(),
    Karyawan: getSheetData("Karyawan"),
    Master_Gaji: getSheetData("Master_Gaji"),
    Materi: getSheetData("Materi"),
    SOP: getSheetData("SOP"),
    PesanManager: getSheetData("PesanManager"),
    TugasDef: getSheetData("TugasDef"),
    Lokasi: getSheetData("Lokasi"),
    Tips: getSheetData("Tips"),
    Izin: getSheetData("Izin"),
    Hari_Khusus: hkLibur.hariKhusus,
    Hari_Libur: hkLibur.hariLibur,
    Kasbon: getSheetData("Kasbon"),
    Komisi_Tambahan: getSheetData("Komisi Tambahan"),
    Import_Komisi: getSheetData("Import Komisi"),
    Transaksi_Prod: transaksiProd,
    Point_Produk: pointProduk,
    Transfer_Gaji: getSheetData("Transfer_Gaji"),
    Absensi: getAllAbsensi()
  });
}

/**
 * Menerima hasil tarikan otomatis Robot POS my.kluto.id dari VPS setiap tengah malam:
 * - p.tanggal: "YYYY-MM-DD" atau "MM/DD/YYYY"
 * - p.importKomisi: [{ tanggal, nama, cabang, omset, komisi }] (sudah ditotal per tanggal per karyawan)
 * - p.transaksiProd: [{ tanggal, no_invoice, cabang, pegawai, item, jumlah, harga_item, total_harga, komisi }]
 */
function toKlutoDateKeyBackend(val) {
  if (!val) return "";
  const s = String(val).trim();
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return isoMatch[1] + "-" + String(isoMatch[2]).padStart(2, '0') + "-" + String(isoMatch[3]).padStart(2, '0');
  }
  const d = parseDateBackend(val);
  if (!d) return "";
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
}

function syncPosKluto(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (e) {}

  try {
    const ss = getSS();
    if (!ss) return response({ status: "error", message: "Spreadsheet tidak dapat diakses." });

    const defaultDateKey = toKlutoDateKeyBackend(p.tanggalISO || p.tanggal || new Date());

    let addedKomisi = 0;
    let removedDuplicateKomisi = 0;
    let addedProduk = 0;
    let removedDuplicateProduk = 0;

    // 1. Simpan ke tab "Import Komisi" Lengkap 9 Kolom (Anti-Double Batch):
    // Tanggal | Cabang | ID Pegawai | Pegawai | Jml Transaksi | Jml Layanan | Omzet Bruto | Omzet Netto | Komisi
    if (Array.isArray(p.importKomisi) && p.importKomisi.length > 0) {
      let shKom = ss.getSheetByName("Import Komisi");
      if (!shKom) {
        shKom = ss.insertSheet("Import Komisi");
        shKom.appendRow([
          "Tanggal",
          "Cabang",
          "ID Pegawai",
          "Pegawai",
          "Jml Transaksi",
          "Jml Layanan",
          "Omzet Bruto",
          "Omzet Netto",
          "Komisi"
        ]);
        shKom.getRange(1, 1, 1, 9).setFontWeight("bold");
      }

      const rows = shKom.getDataRange().getValues();
      const headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
      const numCols = Math.max(headers.length, 9);
      const idxTgl = headers.findIndex(function(h) { return h.indexOf("tanggal") !== -1 || h.indexOf("waktu") !== -1 || h.indexOf("date") !== -1; });
      const idxCabang = headers.findIndex(function(h) { return h.indexOf("cabang") !== -1 || h.indexOf("outlet") !== -1; });
      const idxIdPeg = headers.findIndex(function(h) { return h.indexOf("id") !== -1 && (h.indexOf("pegawai") !== -1 || h.indexOf("staff") !== -1 || h.indexOf("pos") !== -1); });
      const idxNama = headers.findIndex(function(h) { return h.indexOf("id") === -1 && (h.indexOf("pegawai") !== -1 || h.indexOf("nama") !== -1 || h.indexOf("karyawan") !== -1); });
      const idxJmlTrx = headers.findIndex(function(h) { return h.indexOf("transaksi") !== -1; });
      const idxJmlLay = headers.findIndex(function(h) { return h.indexOf("layanan") !== -1; });
      const idxBruto = headers.findIndex(function(h) { return h.indexOf("bruto") !== -1; });
      const idxNetto = headers.findIndex(function(h) { return h.indexOf("netto") !== -1 || (h.indexOf("omset") !== -1 && h.indexOf("bruto") === -1) || (h.indexOf("omzet") !== -1 && h.indexOf("bruto") === -1); });
      const idxKomisi = headers.findIndex(function(h) { return h.indexOf("komisi") !== -1; });

      // Buat daftar kunci item baru yang akan di-insert
      const incomingKeys = {};
      p.importKomisi.forEach(function(item) {
        const dKey = toKlutoDateKeyBackend(item.tanggalISO || item.tanggal || defaultDateKey);
        const cabKey = String(item.cabang || "").toLowerCase().trim();
        const idKey = String(item.id_pegawai || "").trim();
        const namaKey = String(item.pegawai || item.nama || "").toLowerCase().trim();
        if (dKey) {
          if (idKey) incomingKeys[dKey + "__" + cabKey + "__id:" + idKey] = true;
          if (namaKey) incomingKeys[dKey + "__" + cabKey + "__nm:" + namaKey] = true;
        }
      });

      const headerRow = rows[0].slice(0, numCols);
      while (headerRow.length < numCols) headerRow.push("");
      const keptRows = [headerRow];
      const seenExistingKeys = {};

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const rDateKey = toKlutoDateKeyBackend(row[idxTgl !== -1 ? idxTgl : 0]);
        const rCabang = idxCabang !== -1 ? String(row[idxCabang] || "").toLowerCase().trim() : "";
        const rId = idxIdPeg !== -1 ? String(row[idxIdPeg] || "").trim() : "";
        const rNama = String(row[idxNama !== -1 ? idxNama : 3] || "").toLowerCase().trim();

        if (!rDateKey && !rNama && !rId) continue;

        const keyById = rDateKey && rId ? (rDateKey + "__" + rCabang + "__id:" + rId) : "";
        const keyByName = rDateKey && rNama ? (rDateKey + "__" + rCabang + "__nm:" + rNama) : "";

        // 1. Jika baris lama cocok dengan data baru yang sedang di-sync, timpa (jangan masukkan baris lama)
        if ((keyById && incomingKeys[keyById]) || (keyByName && incomingKeys[keyByName])) {
          removedDuplicateKomisi++;
          continue;
        }

        // 2. Anti-Double untuk baris lama yang sudah terlanjur kembar di sheet
        const dedupKey = keyById || keyByName;
        if (dedupKey && seenExistingKeys[dedupKey]) {
          removedDuplicateKomisi++;
          continue;
        }
        if (dedupKey) seenExistingKeys[dedupKey] = true;

        const padded = row.slice(0, numCols);
        while (padded.length < numCols) padded.push("");
        keptRows.push(padded);
      }

      // Tambahkan baris baru (juga di-dedup antar item baru)
      p.importKomisi.forEach(function(item) {
        const dKey = toKlutoDateKeyBackend(item.tanggalISO || item.tanggal || defaultDateKey);
        const cabKey = String(item.cabang || "").toLowerCase().trim();
        const idKey = String(item.id_pegawai || "").trim();
        const namaKey = String(item.pegawai || item.nama || "").toLowerCase().trim();
        const dedupKey = dKey ? (dKey + "__" + cabKey + "__" + (idKey ? "id:" + idKey : "nm:" + namaKey)) : "";
        if (dedupKey && seenExistingKeys[dedupKey]) return;
        if (dedupKey) seenExistingKeys[dedupKey] = true;

        const newRow = new Array(numCols).fill("");
        const dVal = item.tanggal || p.tanggal || dKey || new Date();
        const brutoVal = cleanNumBackend(item.omzet_bruto !== undefined ? item.omzet_bruto : (item.omset || 0));
        const nettoVal = cleanNumBackend(item.omzet_netto !== undefined ? item.omzet_netto : (item.omset || brutoVal));

        newRow[idxTgl !== -1 ? idxTgl : 0] = dVal;
        newRow[idxCabang !== -1 ? idxCabang : 1] = item.cabang || "";
        newRow[idxIdPeg !== -1 ? idxIdPeg : 2] = item.id_pegawai || "";
        newRow[idxNama !== -1 ? idxNama : 3] = item.pegawai || item.nama || "";
        newRow[idxJmlTrx !== -1 ? idxJmlTrx : 4] = cleanNumBackend(item.jml_transaksi || 0);
        newRow[idxJmlLay !== -1 ? idxJmlLay : 5] = cleanNumBackend(item.jml_layanan || 0);
        newRow[idxBruto !== -1 ? idxBruto : 6] = brutoVal;
        newRow[idxNetto !== -1 ? idxNetto : 7] = nettoVal;
        newRow[idxKomisi !== -1 ? idxKomisi : 8] = cleanNumBackend(item.komisi || 0);

        keptRows.push(newRow);
        addedKomisi++;
      });

      shKom.clearContents();
      shKom.getRange(1, 1, keptRows.length, numCols).setValues(keptRows);
    }

    // 2. Simpan ke tab "Transaksi Prod" (Anti-Double Batch)
    if (Array.isArray(p.transaksiProd) && p.transaksiProd.length > 0) {
      let shProd = ss.getSheetByName("Transaksi Prod") || ss.getSheetByName("Transaksi Produk");
      if (!shProd) {
        shProd = ss.insertSheet("Transaksi Prod");
        shProd.appendRow(["Tanggal", "No Invoice", "Pegawai", "Item", "Jumlah", "Harga Item", "Total Harga", "Komisi", "Cabang"]);
        shProd.getRange(1, 1, 1, 9).setFontWeight("bold");
      }

      const rows = shProd.getDataRange().getValues();
      const headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
      const numCols = Math.max(headers.length, 9);
      const idxTgl = headers.findIndex(function(h) { return h.indexOf("tanggal") !== -1 || h.indexOf("waktu") !== -1; });
      const idxInv = headers.findIndex(function(h) { return h.indexOf("invoice") !== -1 || h.indexOf("nota") !== -1; });
      const idxPeg = headers.findIndex(function(h) { return h.indexOf("pegawai") !== -1 || h.indexOf("nama") !== -1 || h.indexOf("karyawan") !== -1 || h === "komisi"; });
      const idxItem = headers.findIndex(function(h) { return h.indexOf("item") !== -1 || h.indexOf("produk") !== -1; });
      const idxQty = headers.findIndex(function(h) { return h.indexOf("jumlah") !== -1 || h.indexOf("qty") !== -1; });
      const idxHarga = headers.findIndex(function(h) { return h.indexOf("harga_item") !== -1 || h.indexOf("harga item") !== -1 || h === "harga"; });
      const idxTotal = headers.findIndex(function(h) { return h.indexOf("total") !== -1; });
      const idxCabang = headers.findIndex(function(h) { return h.indexOf("cabang") !== -1; });

      const syncedDatesMap = {};
      if (defaultDateKey) syncedDatesMap[defaultDateKey] = true;
      p.transaksiProd.forEach(function(item) {
        const dKey = toKlutoDateKeyBackend(item.tanggalISO || item.tanggal || defaultDateKey);
        if (dKey) syncedDatesMap[dKey] = true;
      });

      const headerRow = rows[0].slice(0, numCols);
      while (headerRow.length < numCols) headerRow.push("");
      const keptProdRows = [headerRow];
      const seenProdKeys = {};

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const rDateKey = toKlutoDateKeyBackend(row[idxTgl !== -1 ? idxTgl : 0]);
        if (rDateKey && syncedDatesMap[rDateKey]) {
          removedDuplicateProduk++;
          continue;
        }
        const rInv = idxInv !== -1 ? String(row[idxInv] || "").toLowerCase().trim() : "";
        const rPeg = String(row[idxPeg !== -1 ? idxPeg : 2] || "").toLowerCase().trim();
        const rItem = String(row[idxItem !== -1 ? idxItem : 3] || "").toLowerCase().trim();
        const rQty = cleanNumBackend(row[idxQty !== -1 ? idxQty : 4] || 1);
        const rHarga = cleanNumBackend(row[idxHarga !== -1 ? idxHarga : 5] || 0);
        if (!rDateKey && !rPeg && !rItem) continue;

        const pKey = rDateKey + "__" + rInv + "__" + rPeg + "__" + rItem + "__" + rQty + "__" + rHarga;
        if (rInv && seenProdKeys[pKey]) {
          removedDuplicateProduk++;
          continue;
        }
        if (rInv) seenProdKeys[pKey] = true;

        const padded = row.slice(0, numCols);
        while (padded.length < numCols) padded.push("");
        keptProdRows.push(padded);
      }

      p.transaksiProd.forEach(function(item) {
        const dKey = toKlutoDateKeyBackend(item.tanggalISO || item.tanggal || defaultDateKey);
        const inv = String(item.no_invoice || "").toLowerCase().trim();
        const peg = String(item.pegawai || item.nama || "").toLowerCase().trim();
        const itm = String(item.item || item.produk || "").toLowerCase().trim();
        const qty = cleanNumBackend(item.jumlah || 1);
        const hrg = cleanNumBackend(item.harga_item || 0);
        const pKey = dKey + "__" + inv + "__" + peg + "__" + itm + "__" + qty + "__" + hrg;
        if (inv && seenProdKeys[pKey]) return;
        if (inv) seenProdKeys[pKey] = true;

        const newRow = new Array(numCols).fill("");
        newRow[idxTgl !== -1 ? idxTgl : 0] = item.tanggal || p.tanggal || dKey || new Date();
        if (idxInv !== -1) newRow[idxInv] = item.no_invoice || "";
        newRow[idxPeg !== -1 ? idxPeg : 2] = item.pegawai || item.nama || "";
        newRow[idxItem !== -1 ? idxItem : 3] = item.item || item.produk || "";
        newRow[idxQty !== -1 ? idxQty : 4] = qty;
        newRow[idxHarga !== -1 ? idxHarga : 5] = hrg;
        if (idxTotal !== -1) newRow[idxTotal] = cleanNumBackend(item.total_harga || (hrg * qty));
        if (idxCabang !== -1) newRow[idxCabang] = item.cabang || "";
        keptProdRows.push(newRow);
        addedProduk++;
      });

      shProd.clearContents();
      shProd.getRange(1, 1, keptProdRows.length, numCols).setValues(keptProdRows);
    }

    return response({
      status: "sukses",
      message: "Sinkronisasi POS Kluto berhasil disimpan (Anti-Double aktif).",
      addedKomisi: addedKomisi,
      removedDuplicateKomisi: removedDuplicateKomisi,
      addedProduk: addedProduk,
      removedDuplicateProduk: removedDuplicateProduk
    });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

/**
 * Membersihkan seluruh baris duplikat (Anti-Double) di tab "Import Komisi" dan "Transaksi Prod"
 */
function deduplicatePosKluto(p) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (e) {}

  try {
    const ss = getSS();
    if (!ss) return response({ status: "error", message: "Spreadsheet tidak dapat diakses." });

    let removedKomisi = 0;
    let totalKomisiAfter = 0;
    let removedProduk = 0;
    let totalProdukAfter = 0;

    // 1. Bersihkan duplikat di "Import Komisi"
    const shKom = ss.getSheetByName("Import Komisi");
    if (shKom) {
      const rows = shKom.getDataRange().getValues();
      if (rows.length > 1) {
        const headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
        const numCols = rows[0].length;
        const idxTgl = headers.findIndex(function(h) { return h.indexOf("tanggal") !== -1 || h.indexOf("waktu") !== -1 || h.indexOf("date") !== -1; });
        const idxCabang = headers.findIndex(function(h) { return h.indexOf("cabang") !== -1 || h.indexOf("outlet") !== -1; });
        const idxIdPeg = headers.findIndex(function(h) { return h.indexOf("id") !== -1 && (h.indexOf("pegawai") !== -1 || h.indexOf("staff") !== -1 || h.indexOf("pos") !== -1); });
        const idxNama = headers.findIndex(function(h) { return h.indexOf("id") === -1 && (h.indexOf("pegawai") !== -1 || h.indexOf("nama") !== -1 || h.indexOf("karyawan") !== -1); });

        // Simpan baris terbaru (dari bawah ke atas) jika ada tanggal + cabang + pegawai yang kembar
        const seenKeys = {};
        const uniqueReversed = [];
        for (let r = rows.length - 1; r >= 1; r--) {
          const row = rows[r];
          const rDateKey = toKlutoDateKeyBackend(row[idxTgl !== -1 ? idxTgl : 0]);
          const rCabang = idxCabang !== -1 ? String(row[idxCabang] || "").toLowerCase().trim() : "";
          const rId = idxIdPeg !== -1 ? String(row[idxIdPeg] || "").trim() : "";
          const rNama = String(row[idxNama !== -1 ? idxNama : 3] || "").toLowerCase().trim();
          if (!rDateKey && !rNama && !rId) continue;

          const key = rDateKey + "__" + rCabang + "__" + (rId ? "id:" + rId : "nm:" + rNama);
          if (rDateKey && (rId || rNama) && seenKeys[key]) {
            removedKomisi++;
            continue;
          }
          if (rDateKey && (rId || rNama)) seenKeys[key] = true;
          uniqueReversed.push(row);
        }
        uniqueReversed.reverse();
        const finalRows = [rows[0]].concat(uniqueReversed);
        totalKomisiAfter = uniqueReversed.length;
        if (removedKomisi > 0) {
          shKom.clearContents();
          shKom.getRange(1, 1, finalRows.length, numCols).setValues(finalRows);
        }
      }
    }

    // 2. Bersihkan duplikat di "Transaksi Prod"
    const shProd = ss.getSheetByName("Transaksi Prod") || ss.getSheetByName("Transaksi Produk");
    if (shProd) {
      const rows = shProd.getDataRange().getValues();
      if (rows.length > 1) {
        const headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
        const numCols = rows[0].length;
        const idxTgl = headers.findIndex(function(h) { return h.indexOf("tanggal") !== -1 || h.indexOf("waktu") !== -1; });
        const idxInv = headers.findIndex(function(h) { return h.indexOf("invoice") !== -1 || h.indexOf("nota") !== -1; });
        const idxPeg = headers.findIndex(function(h) { return h.indexOf("pegawai") !== -1 || h.indexOf("nama") !== -1 || h.indexOf("karyawan") !== -1 || h === "komisi"; });
        const idxItem = headers.findIndex(function(h) { return h.indexOf("item") !== -1 || h.indexOf("produk") !== -1; });
        const idxQty = headers.findIndex(function(h) { return h.indexOf("jumlah") !== -1 || h.indexOf("qty") !== -1; });
        const idxHarga = headers.findIndex(function(h) { return h.indexOf("harga_item") !== -1 || h.indexOf("harga item") !== -1 || h === "harga"; });

        const seenProd = {};
        const uniqueProdReversed = [];
        for (let r = rows.length - 1; r >= 1; r--) {
          const row = rows[r];
          const rDateKey = toKlutoDateKeyBackend(row[idxTgl !== -1 ? idxTgl : 0]);
          const rInv = idxInv !== -1 ? String(row[idxInv] || "").toLowerCase().trim() : "";
          const rPeg = String(row[idxPeg !== -1 ? idxPeg : 2] || "").toLowerCase().trim();
          const rItem = String(row[idxItem !== -1 ? idxItem : 3] || "").toLowerCase().trim();
          const rQty = cleanNumBackend(row[idxQty !== -1 ? idxQty : 4] || 1);
          const rHarga = cleanNumBackend(row[idxHarga !== -1 ? idxHarga : 5] || 0);
          if (!rDateKey && !rPeg && !rItem) continue;

          const key = rDateKey + "__" + rInv + "__" + rPeg + "__" + rItem + "__" + rQty + "__" + rHarga;
          if (rDateKey && seenProd[key]) {
            removedProduk++;
            continue;
          }
          if (rDateKey) seenProd[key] = true;
          uniqueProdReversed.push(row);
        }
        uniqueProdReversed.reverse();
        const finalProdRows = [rows[0]].concat(uniqueProdReversed);
        totalProdukAfter = uniqueProdReversed.length;
        if (removedProduk > 0) {
          shProd.clearContents();
          shProd.getRange(1, 1, finalProdRows.length, numCols).setValues(finalProdRows);
        }
      }
    }

    return response({
      status: "sukses",
      message: "Pembersihan data ganda selesai: " + removedKomisi + " baris komisi dobel & " + removedProduk + " baris produk dobel dihapus.",
      removedKomisi: removedKomisi,
      totalKomisiAfter: totalKomisiAfter,
      removedProduk: removedProduk,
      totalProdukAfter: totalProdukAfter
    });
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}