// ==================== KONSTANTA & KONFIGURASI ====================
const CONFIG = {
  LOCATIONS: ["Daop", "Divre", "Balayasa Yogyakarta", "Balayasa Tegal", "Balayasa Gubeng", "Balayasa Manggarai", "Balayasa Surabaya Gubeng", "Balayasa Pulubrayan"],
  TICKET_KEYS: ["NOMOR TIKET", "INCIDENT NUMBER", "INCIDENT ID*+", "TICKET NO", "INCIDENT ID"],
  DATE_KEYS: ["SUBMIT DATE", "SUBMIT DATE WORK INFO", "REPORTED DATE"],
  STATUS_KEYS: ["STATUS", "STATUS*"],
  ASSIGNED_KEYS: ["ASSIGNED TO", "ASSIGNED GROUP*+", "ASSIGNEE GROUP"],
  DEFAULT_PETUGAS: "Hannan Fakhrul Hakim",
};

// ==================== UTILITY FUNCTIONS ====================
function getValueFromRow(row, possibleKeys) {
  const normalize = (str) => String(str).replace(/\n/g, " ").replace(/\s+/g, " ").trim().toUpperCase();
  const keys = Object.keys(row);
  const key = keys.find((k) => {
    const normalizedKey = normalize(k);
    return possibleKeys.some((name) => {
      const normalizedName = normalize(name);
      return normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey);
    });
  });
  return key ? row[key] : "-";
}

function formatExcelDate(value) {
  if (value === null || value === undefined || value === "-" || value === "") return "-";
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return "-";
    const month = value.getMonth() + 1;
    const day = value.getDate();
    const year = value.getFullYear();
    let hours = value.getHours();
    const minutes = String(value.getMinutes()).padStart(2, "0");
    const seconds = String(value.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
  }
  if (typeof value === "string" && isNaN(Number(value))) return value.trim();
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const msPerDay = 86400000;
    const jsDate = new Date(excelEpoch.getTime() + value * msPerDay);
    if (isNaN(jsDate.getTime())) return String(value);
    const month = jsDate.getUTCMonth() + 1;
    const day = jsDate.getUTCDate();
    const year = jsDate.getUTCFullYear();
    let hours = jsDate.getUTCHours();
    const minutes = String(jsDate.getUTCMinutes()).padStart(2, "0");
    const seconds = String(jsDate.getUTCSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} ${ampm}`;
  }
  return String(value);
}

function extractTicketNumber(row) {
  let rawTicket = getValueFromRow(row, CONFIG.TICKET_KEYS);
  if (!rawTicket) return null;
  const text = String(rawTicket).replace(/\n/g, " ").trim();
  if (/^incident\s+number\s*:/i.test(text)) return null;
  const match = text.match(/INC\d+/i);
  if (!match) return null;
  const ticketNumber = match[0].toUpperCase();
  return { raw: ticketNumber, clean: ticketNumber };
}

function getStatusCategory(status) {
  const upperStatus = String(status).toUpperCase();
  if (upperStatus.includes("RESOLVED")) return "Resolved";
  if (upperStatus.includes("PENDING")) return "Pending";
  if (upperStatus.includes("ASSIGNED")) return "Assigned";
  if (upperStatus.includes("CLOSED")) return "Closed";
  if (upperStatus.includes("PROGRESS")) return "In Progress";
  return null;
}

function getConfirm(status, assigned) {
  const upperStatus = String(status).toUpperCase();
  const assignedStr = String(assigned).toLowerCase();
  const isRegion = CONFIG.LOCATIONS.some((l) => assignedStr.includes(l.toLowerCase()));
  if ((upperStatus.includes("ASSIGNED") || upperStatus.includes("PENDING")) && isRegion) {
    return "Sudah";
  }
  return ""; 
}

function generateKeterangan(status, assigned) {
  const upperStatus = String(status).toUpperCase();
  const assignedStr = String(assigned).toLowerCase();
  const isRegion = CONFIG.LOCATIONS.some((l) => assignedStr.includes(l.toLowerCase()));
  if ((upperStatus.includes("PENDING") || upperStatus.includes("ASSIGNED")) && isRegion) {
    return `Sudah dikoordinasikan dengan team IT ${assigned}`;
  }
  if (upperStatus.includes("PENDING") && assignedStr.includes("security")) {
    return "Sudah dikoordinasikan dengan team IT Security";
  }
  return "";
}

function findHeaderRow(rows) {
  let headerIndex = rows.findIndex((row) =>
    row.some((cell) => cell && String(cell).toUpperCase().includes("NOMOR TIKET"))
  );
  if (headerIndex === -1) {
    headerIndex = rows.findIndex((row) =>
      row.some((cell) => cell && String(cell).toUpperCase().includes("INCIDENT"))
    );
  }
  return headerIndex >= 0 ? headerIndex : 0;
}

function filterUniqueTickets(data) {
  const uniqueMap = new Map();
  data.forEach((row) => {
    const ticket = extractTicketNumber(row);
    if (!ticket) return;
    const uniqueKey = ticket.clean;
    if (!uniqueMap.has(uniqueKey)) {
      uniqueMap.set(uniqueKey, { rowAsli: { ...row }, tiketAsli: ticket.clean });
    }
  });
  return uniqueMap;
}

function getSelectedPetugas() {
  const selectElement = document.getElementById("namaPetugas");
  return selectElement.value || CONFIG.DEFAULT_PETUGAS;
}

// ==================== LOGIKA UPLOAD TANDA TANGAN (GLOBAL) ====================
window.signatureBase64 = null; 

function initSignatureUpload() {
  const uploadInput = document.getElementById("uploadSignature");
  const previewContainer = document.getElementById("signaturePreviewContainer");
  const previewImg = document.getElementById("signaturePreview");
  const btnClear = document.getElementById("clearSignatureUpload");

  if(!uploadInput) return; // Mencegah error jika elemen HTML tidak ditemukan

  uploadInput.addEventListener("change", function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(event) {
        window.signatureBase64 = event.target.result;
        previewImg.src = window.signatureBase64;
        previewContainer.style.display = "block";
      };
      reader.readAsDataURL(file);
    }
  });

  btnClear.addEventListener("click", function() {
    uploadInput.value = "";
    window.signatureBase64 = null; 
    previewImg.src = "";
    previewContainer.style.display = "none";
  });
}

// ==================== SISTEM PENYIMPANAN NAMA PETUGAS ====================
function setupCustomNameHandlers() {
  const btnCustom = document.getElementById("btnCustomNama");
  const customWrapper = document.getElementById("customNamaWrapper");
  const btnApply = document.getElementById("btnApplyCustom");
  const btnCancel = document.getElementById("btnCancelCustom");
  const customInput = document.getElementById("customNama");
  const selectPetugas = document.getElementById("namaPetugas");

  if(!btnCustom) return; // Mencegah error jika elemen HTML tidak ditemukan

  let history = JSON.parse(localStorage.getItem("historyPetugas")) || [CONFIG.DEFAULT_PETUGAS];
  selectPetugas.innerHTML = "";
  history.forEach(name => {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    selectPetugas.appendChild(opt);
  });

  btnCustom.addEventListener("click", () => {
    customWrapper.style.display = "block";
    customInput.value = "";
    customInput.focus();
    btnCustom.disabled = true;
  });

  btnApply.addEventListener("click", () => {
    const customName = customInput.value.trim();
    if (customName === "") return alert("Masukkan nama petugas terlebih dahulu!");

    let currentHistory = JSON.parse(localStorage.getItem("historyPetugas")) || [CONFIG.DEFAULT_PETUGAS];
    if (!currentHistory.includes(customName)) {
      currentHistory.push(customName);
      localStorage.setItem("historyPetugas", JSON.stringify(currentHistory));
      const newOption = document.createElement("option");
      newOption.value = customName;
      newOption.textContent = customName;
      selectPetugas.appendChild(newOption);
    }

    selectPetugas.value = customName;
    customWrapper.style.display = "none";
    btnCustom.disabled = false;
    customInput.value = "";
  });

  btnCancel.addEventListener("click", () => {
    customWrapper.style.display = "none";
    btnCustom.disabled = false;
    customInput.value = "";
  });
}


// ==================== MAIN PROCESS FUNCTION ====================
async function prosesData() {
  const fileInput = document.getElementById("inputFile");
  const notif = document.getElementById("notif");
  const prosesBtn = document.getElementById("prosesBtn");

  if (!fileInput.files[0]) return alert("Pilih file dulu!");

  prosesBtn.disabled = true;
  prosesBtn.textContent = "PROSES...";
  notif.innerHTML = "<span class='text-info'>⏳ Memproses data & memasang Tanda Tangan...</span>";

  const reader = new FileReader();

  // BAGIAN INI YANG KEMARIN HILANG/TERHAPUS:
  reader.onload = async function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      
      // Membaca file menggunakan XLSX (SheetJS) yang tahan banting
      const readWorkbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheet = readWorkbook.Sheets[readWorkbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headerIndex = findHeaderRow(rows);
      const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, range: headerIndex });

      const headers = rawRows[0].map((h) => String(h || "").replace(/\n/g, " ").replace(/\s+/g, " ").trim());
      const rawData = rawRows.slice(1).map((row) => {
        const obj = {};
        headers.forEach((header, index) => { obj[header] = row[index]; });
        return obj;
      });

      if (rawData.length === 0) throw new Error("Data tidak ditemukan.");

      const uniqueTicketsMap = filterUniqueTickets(rawData);
      const duplicateCount = rawData.length - uniqueTicketsMap.size;

      const shift = document.getElementById("shift").value;
      const tgl = document.getElementById("tanggal").value;
      const namaPetugas = getSelectedPetugas();
      const jobdesk = document.getElementById("jobdesk").value;

      // BUAT EXCEL BARU (EXCELJS)
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Laporan');

      // 1. HEADER ATAS
      worksheet.addRow(["FORM LAPORAN SELESAI DINASAN NOC-SA"]);
      worksheet.getCell('A1').font = { bold: true, name: "Segoe UI", size: 14 };
      worksheet.addRow([]);
      worksheet.addRow(["Nama", ": " + namaPetugas]);
      worksheet.addRow(["Dinasan", ": " + shift]);
      worksheet.addRow(["Tanggal", ": " + tgl]);
      worksheet.addRow(["Job", ": " + jobdesk]);
      worksheet.addRow([]);

      ['A3', 'A4', 'A5', 'A6'].forEach(cellRef => {
        worksheet.getCell(cellRef).font = { bold: true, name: "Segoe UI", size: 11 };
      });

      // 2. TABEL DATA
      const tableHeaders = ["No", "Nomor Tiket", "Submit Date", "Status", "Assigned To", "Konfirm IT Support", "Konfirm User", "Keterangan", "Kesesuaian"];
      const headerRowObj = worksheet.addRow(tableHeaders);
      
      headerRowObj.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF87CEEB' } }; 
        cell.font = { bold: true, name: "Segoe UI", size: 11 };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      });

      const counts = { Assigned: 0, Pending: 0, Resolved: 0, Closed: 0, "In Progress": 0 };
      let urutanNo = 1;

      uniqueTicketsMap.forEach((dataItem) => {
        const rowData = dataItem.rowAsli;
        const tiketTampil = dataItem.tiketAsli;
        const submitDate = formatExcelDate(getValueFromRow(rowData, CONFIG.DATE_KEYS));
        const status = getValueFromRow(rowData, CONFIG.STATUS_KEYS);
        const assigned = getValueFromRow(rowData, CONFIG.ASSIGNED_KEYS);

        const statusCat = getStatusCategory(status);
        if (statusCat && counts.hasOwnProperty(statusCat)) counts[statusCat]++;

        const keterangan = generateKeterangan(status, assigned);
        const konfirmUser = getConfirm(status, assigned);

        const addedRow = worksheet.addRow([
          urutanNo, tiketTampil, submitDate, status, assigned, 
          `Proses by ${namaPetugas.split(" ")[0]}`, konfirmUser, keterangan, "Sesuai"
        ]);
        
        addedRow.eachCell((cell, colNumber) => {
          cell.font = { name: "Segoe UI", size: 10 };
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle' };
          if ([1, 4, 6, 7, 9].includes(colNumber)) cell.alignment.horizontal = 'center';
        });
        urutanNo++;
      });

      // 3. SUMMARY STATUS & CATATAN
      worksheet.addRow([]);
      const summaryTitleRow = worksheet.addRow(["SUMMARY TICKET STATUS"]);
      summaryTitleRow.getCell(1).font = { bold: true, name: "Segoe UI", size: 12 };

      Object.keys(counts).forEach((k) => {
        if (counts[k] > 0) worksheet.addRow([k, counts[k]]);
      });

      worksheet.addRow(["Grand Total", uniqueTicketsMap.size]);

      if (duplicateCount > 0) {
        worksheet.addRow([`Catatan: ${duplicateCount} data duplikat telah dihapus otomatis`]);
      }

      // =========================================================
      // 4. PENEMPATAN GAMBAR TANDA TANGAN
      // =========================================================
      worksheet.addRow([]); 
      worksheet.addRow(["", "Petugas Security Analys"]);
      const ttdLabelRow = worksheet.lastRow.number; 
      
      worksheet.getCell(`B${ttdLabelRow}`).font = { name: "Segoe UI", size: 11 };
      worksheet.getCell(`B${ttdLabelRow}`).alignment = { horizontal: 'center' };

      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([]);

      worksheet.addRow(["", namaPetugas]);
      const ttdNamaRow = worksheet.lastRow.number;
      worksheet.getCell(`B${ttdNamaRow}`).font = { bold: true, underline: true, name: "Segoe UI", size: 11 };
      worksheet.getCell(`B${ttdNamaRow}`).alignment = { horizontal: 'center' };

      if (window.signatureBase64) {
        const base64Data = window.signatureBase64.split(',')[1];
        const extensionMatch = window.signatureBase64.match(/data:image\/(.+);/);
        const imgExtension = extensionMatch ? (extensionMatch[1] === 'jpeg' ? 'jpeg' : 'png') : 'png';

        const imageId = workbook.addImage({
          base64: base64Data,
          extension: imgExtension,
        });

        worksheet.addImage(imageId, {
          tl: { col: 1, row: ttdLabelRow }, 
          ext: { width: 150, height: 75 } 
        });
      }

      worksheet.columns.forEach((col, idx) => {
        // Angka 5 diganti jadi 16 agar tulisan di Kolom A lebih lega
        const widths = [16, 22, 22, 12, 25, 20, 15, 45, 12]; 
        col.width = widths[idx] || 15;
      });

      // EKSPOR & DOWNLOAD
      const bufferResult = await workbook.xlsx.writeBuffer();
      const blob = new Blob([bufferResult], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `Laporan_NOC_${tgl}_${namaPetugas.replace(/\s/g, "_")}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      notif.innerHTML = `<span class='text-success'>✅ Sukses! Excel dengan Tanda Tangan berhasil di-download.</span>`;

    } catch (err) {
      notif.innerHTML = `<span class='text-danger'>❌ Error: ${err.message}</span>`;
      console.error(err);
    } finally {
      prosesBtn.disabled = false;
      prosesBtn.textContent = "PROSES & DOWNLOAD HASIL AKHIR";
    }
  }; // Penutup fungsi reader.onload yang kemarin terhapus

  // Tombol Trigger Eksekusi
  reader.readAsArrayBuffer(fileInput.files[0]);
}

// ==================== INISIALISASI ====================
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("tanggal").valueAsDate = new Date();
  setupCustomNameHandlers(); 
  initSignatureUpload();
  document.getElementById("prosesBtn").addEventListener("click", prosesData);
});