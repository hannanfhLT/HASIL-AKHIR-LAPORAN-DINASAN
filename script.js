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
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Mendapatkan nilai dari row berdasarkan kemungkinan nama kolom
 */
function getValueFromRow(row, possibleKeys) {
  const key = Object.keys(row).find((k) =>
    possibleKeys.some((name) => k.trim().toUpperCase() === name.toUpperCase()),
  );
  return key ? row[key] : "-";
}

/**
 * Mengekstrak nomor tiket dari row
 */
function extractTicketNumber(row) {
  let rawTicket = getValueFromRow(row, CONFIG.TICKET_KEYS);
  let cleanTicket = String(rawTicket).trim().toUpperCase();

  if (!cleanTicket || cleanTicket === "-" || cleanTicket === "UNDEFINED") {
    return null;
  }
  return { raw: String(rawTicket).trim(), clean: cleanTicket };
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
function filterUniqueTickets(data) {
  const uniqueMap = new Map();

  data.forEach((row) => {
    const ticket = extractTicketNumber(row);
    if (ticket && !uniqueMap.has(ticket.clean)) {
      uniqueMap.set(ticket.clean, {
        rowAsli: row,
        tiketAsli: ticket.raw,
      });
    }
  });

  return uniqueMap;
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
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headerIndex = findHeaderRow(rows);
      const rawData = XLSX.utils.sheet_to_json(sheet, {
        range: headerIndex,
      });

      if (rawData.length === 0) throw new Error("Data tidak ditemukan.");

      // Filter duplikat tiket
      const uniqueTicketsMap = filterUniqueTickets(rawData);
      const duplicateCount = rawData.length - uniqueTicketsMap.size;

      // Ambil nilai shift dan tanggal
      const shift = document.getElementById("shift").value;
      const tgl = document.getElementById("tanggal").value;

      // Bangun laporan
      const reportData = buildReportData(
        uniqueTicketsMap,
        shift,
        tgl,
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
      XLSX.writeFile(newWB, `Laporan_NOC_${tgl}.xlsx`);

      // Notifikasi sukses
      let notifMessage = `<span class='text-success'>✅ Sukses! ${uniqueTicketsMap.size} tiket unik diproses.`;
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

function buildReportData(uniqueTicketsMap, shift, tgl, duplicateCount) {
  // Header laporan
  const reportData = [
    ["FORM LAPORAN SELESAI DINASAN NOC-SA"],
    [],
    ["Nama", ": Hannan Fakhrul Hakim"],
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

    const submitDate = getValueFromRow(row, CONFIG.DATE_KEYS);
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
      "Proses by Hannan",
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

// ==================== INITIALIZATION ====================

// Set tanggal default = hari ini
document.getElementById("tanggal").valueAsDate = new Date();

// Event listener untuk tombol proses
document.getElementById("prosesBtn").addEventListener("click", prosesData);
