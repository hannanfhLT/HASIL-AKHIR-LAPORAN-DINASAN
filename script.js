// ==================== KONSTANTA & KONFIGURASI ====================
const CONFIG = {
  LOCATIONS: ["Daop", "Divre", "Balayasa", "Yogyakarta", "Tegal", "Gubeng"],
  TICKET_KEYS: [
    "NOMOR TIKET",
    "INCIDENT NUMBER",
    "INCIDENT ID*+",
    "TICKET NO",
    "INCIDENT ID",
  ],
  DATE_KEYS: ["SUBMIT DATE", "SUBMIT DATE WORK INFO", "REPORTED DATE"],
  STATUS_KEYS: ["STATUS", "STATUS*"],
  ASSIGNED_KEYS: ["ASSIGNED TO", "ASSIGNED GROUP*+", "ASSIGNEE GROUP"],
  DEFAULT_PETUGAS: "Hannan Fakhrul Hakim",
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Mendapatkan nilai dari row berdasarkan kemungkinan nama kolom
 */
// function getValueFromRow(row, possibleKeys) {
//   const key = Object.keys(row).find((k) =>
//     possibleKeys.some((name) => k.trim().toUpperCase() === name.toUpperCase()),
//   );
//   return key ? row[key] : "-";
// }

function getValueFromRow(row, possibleKeys) {
  const normalize = (str) =>
    String(str)
      .replace(/\n/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();

  const keys = Object.keys(row);

  const key = keys.find((k) => {
    const normalizedKey = normalize(k);

    return possibleKeys.some((name) => {
      const normalizedName = normalize(name);

      return (
        normalizedKey.includes(normalizedName) ||
        normalizedName.includes(normalizedKey)
      );
    });
  });

  return key ? row[key] : "-";
}

/**
 * Mengkonversi date Excel menjadi string tanggal yang dapat dibaca
 */
function formatExcelDate(value) {
  if (value === null || value === undefined || value === "-" || value === "") return "-";

  // Jika sudah berupa JavaScript Date object (dari cellDates: true)
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

  // Jika sudah berupa string tanggal yang terbaca (bukan angka murni)
  if (typeof value === "string" && isNaN(Number(value))) {
    return value.trim();
  }

  // Jika berupa angka serial Excel
  if (typeof value === "number") {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 30 Des 1899
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

/**
 * Mengekstrak nomor tiket dari row
 */
// function extractTicketNumber(row) {
//   let rawTicket = getValueFromRow(row, CONFIG.TICKET_KEYS);
//   let cleanTicket = String(rawTicket).trim().toUpperCase();

//   if (!cleanTicket || cleanTicket === "-" || cleanTicket === "UNDEFINED") {
//     return null;
//   }
//   return { raw: String(rawTicket).trim(), clean: cleanTicket };
// }

function extractTicketNumber(row) {
  let rawTicket = getValueFromRow(row, CONFIG.TICKET_KEYS);

  if (!rawTicket) return null;

  const text = String(rawTicket).replace(/\n/g, " ").trim();
  if (/^incident\s+number\s*:/i.test(text)) return null;

  // Ambil hanya format INCxxxxxxxx
  const match = text.match(/INC\d+/i);

  if (!match) return null;

  const ticketNumber = match[0].toUpperCase();

  return {
    raw: ticketNumber,
    clean: ticketNumber,
  };
}


/**
 * Menentukan status count berdasarkan status string
 */
function getStatusCategory(status) {
  const upperStatus = String(status).toUpperCase();
  if (upperStatus.includes("RESOLVED")) return "Resolved";
  if (upperStatus.includes("PENDING")) return "Pending";
  if (upperStatus.includes("ASSIGNED")) return "Assigned";
  if (upperStatus.includes("CLOSED")) return "Closed";
  if (upperStatus.includes("PROGRESS")) return "In Progress";
  return null;
}

/**
 * Menentukan keterangan otomatis
 */
function generateKeterangan(status, assigned) {
  const upperStatus = String(status).toUpperCase();
  const assignedStr = String(assigned).toLowerCase();
  const isRegion = CONFIG.LOCATIONS.some((l) =>
    assignedStr.includes(l.toLowerCase()),
  );

  if (
    (upperStatus.includes("PENDING") || upperStatus.includes("ASSIGNED")) &&
    isRegion
  ) {
    return `Sudah dikoordinasikan dengan team IT ${assigned}`;
  }
  if (upperStatus.includes("PENDING") && assignedStr.includes("security")) {
    return "Sudah dikoordinasikan dengan team IT Security";
  }
  return "";
}

/**
 * Mencari baris header dari data mentah
 */
function findHeaderRow(rows) {
  let headerIndex = rows.findIndex((row) =>
    row.some(
      (cell) => cell && String(cell).toUpperCase().includes("NOMOR TIKET"),
    ),
  );

  if (headerIndex === -1) {
    headerIndex = rows.findIndex((row) =>
      row.some(
        (cell) => cell && String(cell).toUpperCase().includes("INCIDENT"),
      ),
    );
  }
  return headerIndex >= 0 ? headerIndex : 0;
}

/**
 * Filter duplikat berdasarkan nomor tiket (hanya ambil 1 tiket)
 */
// function filterUniqueTickets(data) {
//   const uniqueMap = new Map();

//   data.forEach((row) => {
//     const ticket = extractTicketNumber(row);
//     if (ticket && !uniqueMap.has(ticket.clean)) {
//       uniqueMap.set(ticket.clean, {
//         rowAsli: row,
//         tiketAsli: ticket.raw,
//       });
//     }
//   });

//   return uniqueMap;
// }

function filterUniqueTickets(data) {
  const uniqueMap = new Map();

  data.forEach((row) => {
    const ticket = extractTicketNumber(row);

    // Skip kalau bukan tiket valid
    if (!ticket) return;

    // Ambil submit date
    const submitDate = formatExcelDate(
      getValueFromRow(row, CONFIG.DATE_KEYS),
    );

    // Kombinasi tiket + waktu submit
    const uniqueKey = `${ticket.clean}__${submitDate}`;

    // Simpan hanya jika kombinasi belum ada
    if (!uniqueMap.has(uniqueKey)) {
      uniqueMap.set(uniqueKey, {
        rowAsli: { ...row },
        tiketAsli: ticket.raw,
      });
    }
  });

  return uniqueMap;
}

/**
 * Mendapatkan nama petugas yang dipilih
 */
function getSelectedPetugas() {
  const selectElement = document.getElementById("namaPetugas");
  const selectedValue = selectElement.value;

  if (selectedValue && selectedValue !== "") {
    return selectedValue;
  }

  return CONFIG.DEFAULT_PETUGAS;
}

// ==================== MAIN PROCESS FUNCTION ====================

async function prosesData() {
  const fileInput = document.getElementById("inputFile");
  const notif = document.getElementById("notif");
  const prosesBtn = document.getElementById("prosesBtn");

  if (!fileInput.files[0]) {
    alert("Pilih file dulu!");
    return;
  }

  // Disable button selama proses
  prosesBtn.disabled = true;
  prosesBtn.textContent = "PROSES...";
  notif.innerHTML = "<span class='text-info'>⏳ Memproses data...</span>";

  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headerIndex = findHeaderRow(rows);
      // const rawData = XLSX.utils.sheet_to_json(sheet, {
      //   range: headerIndex,
      // });
      const rawRows = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        range: headerIndex,
      });

      // Ambil header asli
      const headers = rawRows[0].map((h) =>
        String(h || "")
          .replace(/\n/g, " ")
          .replace(/\s+/g, " ")
          .trim(),
      );

      // Convert manual ke object
      const rawData = rawRows.slice(1).map((row) => {
        const obj = {};

        headers.forEach((header, index) => {
          obj[header] = row[index];
        });

        return obj;
      });

      if (rawRows.length === 0) throw new Error("Data tidak ditemukan.");

      // Filter duplikat tiket
      const uniqueTicketsMap = filterUniqueTickets(rawData);
      const duplicateCount = rawData.length - uniqueTicketsMap.size;

      // Ambil nilai shift, tanggal, dan nama petugas
      const shift = document.getElementById("shift").value;
      const tgl = document.getElementById("tanggal").value;
      const namaPetugas = getSelectedPetugas();

      // Bangun laporan
      const reportData = buildReportData(
        uniqueTicketsMap,
        shift,
        tgl,
        namaPetugas,
        duplicateCount,
      );

      // Buat file Excel
      const newSheet = XLSX.utils.aoa_to_sheet(reportData);
      newSheet["!cols"] = [
        { wch: 5 },
        { wch: 22 },
        { wch: 22 },
        { wch: 12 },
        { wch: 25 },
        { wch: 20 },
        { wch: 15 },
        { wch: 45 },
        { wch: 12 },
      ];

      const newWB = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWB, newSheet, "Laporan");
      XLSX.writeFile(
        newWB,
        `Laporan_NOC_${tgl}_${namaPetugas.replace(/\s/g, "_")}.xlsx`,
      );

      // Notifikasi sukses
      let notifMessage = `<span class='text-success'>✅ Sukses! ${uniqueTicketsMap.size} tiket unik diproses.<br>👤 Petugas: ${namaPetugas}`;
      if (duplicateCount > 0) {
        notifMessage += `<br>⚠️ ${duplicateCount} data duplikat otomatis dihapus.</span>`;
      } else {
        notifMessage += `</span>`;
      }
      notif.innerHTML = notifMessage;
    } catch (err) {
      notif.innerHTML = `<span class='text-danger'>❌ Error: ${err.message}</span>`;
    } finally {
      // Enable button kembali
      prosesBtn.disabled = false;
      prosesBtn.textContent = "PROSES & DOWNLOAD HASIL AKHIR";
    }
  };

  reader.readAsArrayBuffer(fileInput.files[0]);
}

// ==================== BUILD REPORT FUNCTION ====================

function buildReportData(
  uniqueTicketsMap,
  shift,
  tgl,
  namaPetugas,
  duplicateCount,
) {
  // Header laporan
  const reportData = [
    ["FORM LAPORAN SELESAI DINASAN NOC-SA"],
    [],
    ["Nama", ": " + namaPetugas],
    ["Dinasan", ": " + shift],
    ["Tanggal", ": " + tgl],
    ["Job", ": Security Analyst"],
    [],
    [
      "No",
      "Nomor Tiket",
      "Submit Date",
      "Status",
      "Assigned To",
      "Konfirm IT Support",
      "Konfirm User",
      "Keterangan",
      "Kesesuaian",
    ],
  ];

  // Inisialisasi counter status
  const counts = {
    Assigned: 0,
    Pending: 0,
    Resolved: 0,
    Closed: 0,
    "In Progress": 0,
  };

  let urutanNo = 1;

  // Loop setiap tiket unik
  uniqueTicketsMap.forEach((dataItem) => {
    const row = dataItem.rowAsli;
    const tiketTampil = dataItem.tiketAsli;

    const submitDate = formatExcelDate(getValueFromRow(row, CONFIG.DATE_KEYS));
    const status = getValueFromRow(row, CONFIG.STATUS_KEYS);
    const assigned = getValueFromRow(row, CONFIG.ASSIGNED_KEYS);

    // Update counter status
    const statusCat = getStatusCategory(status);
    if (statusCat && counts.hasOwnProperty(statusCat)) {
      counts[statusCat]++;
    }

    const keterangan = generateKeterangan(status, assigned);

    reportData.push([
      urutanNo,
      tiketTampil,
      submitDate,
      status,
      assigned,
      `Proses by ${namaPetugas.split(" ")[0]}`, // Menggunakan nama depan petugas
      "",
      keterangan,
      "Sesuai",
    ]);
    urutanNo++;
  });

  // Tambah summary
  reportData.push([], ["SUMMARY TICKET STATUS"]);
  Object.keys(counts).forEach((k) => {
    if (counts[k] > 0) reportData.push([k, counts[k]]);
  });

  reportData.push(["Grand Total", uniqueTicketsMap.size]);

  if (duplicateCount > 0) {
    reportData.push([
      `Catatan: ${duplicateCount} data duplikat telah dihapus otomatis`,
    ]);
  }

  return reportData;
}

// ==================== CUSTOM NAME HANDLERS ====================

/**
 * Setup custom name input handlers
 */
function setupCustomNameHandlers() {
  const btnCustom = document.getElementById("btnCustomNama");
  const customWrapper = document.getElementById("customNamaWrapper");
  const btnApply = document.getElementById("btnApplyCustom");
  const btnCancel = document.getElementById("btnCancelCustom");
  const customInput = document.getElementById("customNama");
  const selectPetugas = document.getElementById("namaPetugas");

  // Tombol Custom diklik
  btnCustom.addEventListener("click", () => {
    customWrapper.style.display = "block";
    customInput.value = "";
    customInput.focus();
    btnCustom.disabled = true;
  });

  // Tombol Apply diklik
  btnApply.addEventListener("click", () => {
    const customName = customInput.value.trim();
    if (customName === "") {
      alert("Masukkan nama petugas terlebih dahulu!");
      return;
    }

    // Tambahkan ke dropdown
    const newOption = document.createElement("option");
    newOption.value = customName;
    newOption.textContent = customName;
    selectPetugas.appendChild(newOption);

    // Pilih nama baru tersebut
    selectPetugas.value = customName;

    // Reset UI
    customWrapper.style.display = "none";
    btnCustom.disabled = false;
    customInput.value = "";

    // Notifikasi kecil
    const notif = document.getElementById("notif");
    notif.innerHTML = `<span class='text-success'>✅ Nama "${customName}" ditambahkan ke daftar!</span>`;
    setTimeout(() => {
      if (notif.innerHTML.includes("ditambahkan")) {
        notif.innerHTML = "";
      }
    }, 2000);
  });

  // Tombol Cancel diklik
  btnCancel.addEventListener("click", () => {
    customWrapper.style.display = "none";
    btnCustom.disabled = false;
    customInput.value = "";
  });

  // Optional: Enter key pada input custom
  customInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      btnApply.click();
    }
  });
}

// ==================== INITIALIZATION ====================

// Set tanggal default = hari ini
document.getElementById("tanggal").valueAsDate = new Date();

// Setup custom name handlers
setupCustomNameHandlers();

// Event listener untuk tombol proses
document.getElementById("prosesBtn").addEventListener("click", prosesData);