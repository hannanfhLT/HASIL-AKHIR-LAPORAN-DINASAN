# 🚀 NOC-SA Report Auto-Converter

Aplikasi berbasis web sederhana (Client-side) untuk mengotomatisasi, merapihkan, dan memfilter data mentah laporan tiket Excel NOC-SA (Network Operations Center - Security Analyst). 

Aplikasi ini dibuat untuk mempercepat pembuatan laporan dinasan harian dengan fitur filter duplikat, pengisian otomatis (Auto-Fill) pada kolom konfirmasi/keterangan, serta format *styling* Excel yang siap pakai.

## ✨ Fitur Utama

- 🧹 **Auto-Filter & Clean Duplicates:** Otomatis menghapus tiket ganda (hanya mengambil tiket pertama) dan membersihkan format teks kotor (seperti awalan "Incident Number:") menjadi murni ID tiket (contoh: `INC000000123`).
- 🤖 **Auto-Fill Logic:** Kolom `Keterangan` dan `Konfirm User` akan terisi otomatis berdasarkan aturan penugasan (Assigned To). Contoh: Jika ditugaskan ke Area (Daop/Divre/Balayasa) atau Tim Security, otomatis tertulis "Sudah dikoordinasikan...".
- 📊 **Auto-Summary:** Menghitung total tiket secara dinamis berdasarkan status (Resolved, Pending, Assigned, Closed, In Progress) di bagian bawah tabel.
- 🎨 **Auto-Styling Excel:** Hasil unduhan Excel langsung rapi, dilengkapi dengan garis pembatas (border) dan *header* tabel berwarna *Sky Blue* tanpa perlu diedit manual.
- 👤 **Custom Nama Petugas:** Mendukung penambahan nama petugas piket/dinasan secara dinamis melalui UI.
- ⚡ **100% Client-Side:** Berjalan murni di browser tanpa perlu server, *database*, atau instalasi Node.js.

## 🛠️ Teknologi yang Digunakan

- **HTML5 & CSS3**
- **Vanilla JavaScript** (ES6+)
- **Bootstrap 5** (Untuk UI/UX yang responsif dan rapi)
- **[xlsx-js-style](https://www.npmjs.com/package/xlsx-js-style)** (Library SheetJS modifikasi untuk memproses, menulis, dan memberi *styling* warna/border pada file `.xlsx`)


## 🚀 Cara Penggunaan
Langkah untuk download nya di github

1. Clone atau *download* repository ini ke komputer Anda.
   ```bash
   git clone [https://github.com/username-anda/noc-sa-converter.git](https://github.com/username-anda/noc-sa-converter.git)
2. Pastikan file index.html dan script.js berada dalam satu folder yang sama.
3. Buka file index.html menggunakan browser apa saja (Chrome/Edge/Firefox).

## 🚀 Cara Penggunaan Upload file

1. Siapkan dulu file mentahan excelnya yang di ambil di BMC
2. Upload file excel mentahan tersebut
3. Input Shift, Tanggal, Jobdesk, dan Input nama (bila namanya tidak ada)
4. Siapkan tanda tangan (Foto yang sudah di crop, file type nya .png supaya tranfaran)
5. Upload image.png (img tanda tangan)
6. Buatlah nama file yang sudah ditentukan


Semoga bermanfaat ges!

Created by Hannan & Gylang
