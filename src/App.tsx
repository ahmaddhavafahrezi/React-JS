import {
  createContext, lazy, memo, Suspense,
  useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState,
} from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { BrowserRouter, Routes, Route, NavLink, Link } from "react-router-dom";
import "./App.css"; 
import logoUpi from "./assets/logo-upi.png"; 

type Pendaftar = {
  id: string;
  nomorPendaftaran: string;
  nama: string;
  tanggalLahir: string;
  jenisKelamin: string;
  email: string;
  telepon: string;
  alamat: string;
  asalSekolah: string;
  nilaiRapor: string;
  fakultas: string;
  prodi: string;
};

type FormPendaftar = Omit<Pendaftar, "id">;

const kosong: FormPendaftar = {
  nomorPendaftaran: "", nama: "", tanggalLahir: "", jenisKelamin: "", email: "", telepon: "", alamat: "",
  asalSekolah: "", nilaiRapor: "", fakultas: "", prodi: ""
};

// Data pilihan Fakultas -> Program Studi
// (contoh, sesuaikan dengan data resmi UPI YPTK)
const dataFakultas: Record<string, string[]> = {
  "Fakultas Ilmu Komputer": [
    "Sistem Informasi",
    "Teknik Informatika",
    "Sistem Komputer",
  ],
  "Fakultas Ekonomi": ["Manajemen", "Akuntansi"],
};


const kontak = {
  rektor: "Ahmad Dhava Fahrezi",
  alamat: "Padang, Sumatera Barat",
  email: "ahmaddhavafahrezi@gmail.com",
  telepon: "089560254018",
};

const KUNCI = "pendaftar";


function buatId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Baca localStorage dengan aman (tidak crash jika isinya rusak)
function muatDaftar(): Pendaftar[] {
  try {
    const data = JSON.parse(localStorage.getItem(KUNCI) || "[]");
    if (!Array.isArray(data)) return [];
    
    return data.map((p) => ({
      ...p,
      id: p.id ?? buatId(),
      nomorPendaftaran: p.nomorPendaftaran ?? "-",
      asalSekolah: p.asalSekolah ?? "-",
      nilaiRapor: p.nilaiRapor ?? "",
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------
// MATERI: useEffect -> "fetch" daftar fakultas & prodi
// ---------------------------------------------------------
function ambilFakultas(): Promise<Record<string, string[]>> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(dataFakultas), 800);
  });
}

// ---------------------------------------------------------
// MATERI: React useContext
// ---------------------------------------------------------
type NotifContextType = { tampilkan: (teks: string) => void };

const NotifContext = createContext<NotifContextType>({ tampilkan: () => {} });

function NotifProvider({ children }: { children: ReactNode }) {
  const [teks, setTeks] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useCallback: fungsi stabil, hilang otomatis setelah 3 detik
  const tampilkan = useCallback((pesanBaru: string) => {
    setTeks(pesanBaru);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setTeks(""), 3000);
  }, []);

  // cleanup timer saat provider dilepas
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const nilai = useMemo(() => ({ tampilkan }), [tampilkan]);

  return (
    <NotifContext.Provider value={nilai}>
      {children}
      {teks && <div className="notif" role="status">{teks}</div>}
    </NotifContext.Provider>
  );
}

// ---------------------------------------------------------
// MATERI: React useReducer
// ---------------------------------------------------------
type Langkah = 1 | 2 | 3;
type WizardState = { langkah: Langkah; galat: string };
type AksiWizard =
  | { type: "LANJUT" }
  | { type: "KEMBALI" }
  | { type: "KE"; langkah: Langkah }
  | { type: "GALAT"; pesan: string }
  | { type: "BERSIH" }
  | { type: "RESET" };

const wizardAwal: WizardState = { langkah: 1, galat: "" };

function wizardReducer(state: WizardState, aksi: AksiWizard): WizardState {
  switch (aksi.type) {
    case "LANJUT": return { langkah: Math.min(3, state.langkah + 1) as Langkah, galat: "" };
    case "KEMBALI": return { langkah: Math.max(1, state.langkah - 1) as Langkah, galat: "" };
    case "KE": return { langkah: aksi.langkah, galat: "" };
    case "GALAT": return { ...state, galat: aksi.pesan };
    case "BERSIH": return state.galat ? { ...state, galat: "" } : state;
    case "RESET": return wizardAwal;
    default: return state;
  }
}

type HasilValidasi = { pesan: string; kolom?: "nomor" | "email" };


function validasiLangkah1(f: FormPendaftar, daftar: Pendaftar[]): HasilValidasi {
  const nomor = f.nomorPendaftaran.trim();
  if (!nomor) return { pesan: "Nomor pendaftaran wajib diisi.", kolom: "nomor" };
  if (!/^[A-Za-z0-9-]{4,20}$/.test(nomor))
    return { pesan: "Nomor pendaftaran 4-20 karakter: huruf, angka, atau tanda minus (-).", kolom: "nomor" };
  if (daftar.some((d) => d.nomorPendaftaran.toLowerCase() === nomor.toLowerCase()))
    return { pesan: "Nomor pendaftaran ini sudah digunakan.", kolom: "nomor" };
  if (!f.nama.trim()) return { pesan: "Nama wajib diisi." };
  if (!f.tanggalLahir) return { pesan: "Tanggal lahir wajib diisi." };
  if (f.tanggalLahir > new Date().toISOString().split("T")[0])
    return { pesan: "Tanggal lahir tidak boleh di masa depan." };
  if (!f.jenisKelamin) return { pesan: "Jenis kelamin wajib dipilih." };
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim()))
    return { pesan: "Format email tidak valid.", kolom: "email" };
  if (daftar.some((d) => d.email.trim().toLowerCase() === f.email.trim().toLowerCase()))
    return { pesan: "Email ini sudah terdaftar. Gunakan email lain.", kolom: "email" };
  if (!/^08[0-9]{8,12}$/.test(f.telepon))
    return { pesan: "No. HP harus diawali 08 dan berisi 10-14 angka." };
  if (!f.alamat.trim()) return { pesan: "Alamat wajib diisi." };
  return { pesan: "" };
}

// Validasi khusus Langkah 2 (Berkas Akademik)
function validasiLangkah2(f: FormPendaftar): HasilValidasi {
  if (!f.asalSekolah.trim()) return { pesan: "Asal sekolah wajib diisi." };
  const n = Number(f.nilaiRapor);
  if (f.nilaiRapor === "" || Number.isNaN(n) || n < 0 || n > 100)
    return { pesan: "Nilai rata-rata rapor harus berupa angka 0 sampai 100." };
  if (!f.fakultas) return { pesan: "Fakultas wajib dipilih." };
  if (!f.prodi) return { pesan: "Program studi wajib dipilih." };
  return { pesan: "" };
}

// ---------------------------------------------------------
// MATERI: React useReducer (2)
// ---------------------------------------------------------
type Urutan = "terbaru" | "terlama" | "nama" | "nilai";
type FilterState = { cari: string; fakultas: string; urut: Urutan; minNilai: number };
type AksiFilter =
  | { type: "CARI"; nilai: string }
  | { type: "FAKULTAS"; nilai: string }
  | { type: "URUT"; nilai: Urutan }
  | { type: "NILAI"; nilai: number }
  | { type: "RESET" };

const filterAwal: FilterState = { cari: "", fakultas: "", urut: "terbaru", minNilai: 0 };

function filterReducer(state: FilterState, aksi: AksiFilter): FilterState {
  switch (aksi.type) {
    case "CARI": return { ...state, cari: aksi.nilai };
    case "FAKULTAS": return { ...state, fakultas: aksi.nilai };
    case "URUT": return { ...state, urut: aksi.nilai };
    case "NILAI": return { ...state, minNilai: aksi.nilai };
    case "RESET": return filterAwal;
    default: return state;
  }
}

// ---------------------------------------------------------
// MATERI: useEffect dengan cleanup (jam real-time di Home)
// ---------------------------------------------------------
function JamDigital() {
  const [waktu, setWaktu] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setWaktu(new Date()), 1000);
    return () => clearInterval(timer); // cleanup saat komponen dilepas
  }, []);

  return (
    <p className="jam">
      {waktu.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })}
      {" • "}
      {waktu.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
    </p>
  );
}

// ---------------------------------------------------------
// MATERI: React Component & React Props
// ---------------------------------------------------------
function TabelPendaftar({
  daftar,
  onHapus,
}: {
  daftar: Pendaftar[];
  onHapus: (id: string) => void;
}) {
  // MATERI: React Conditional
  if (daftar.length === 0) {
    return <p>Belum ada pendaftar.</p>;
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>No. Daftar</th>
            <th>Nama</th>
            <th>Tgl Lahir</th>
            <th>L/P</th>
            <th>Email</th>
            <th>No. HP</th>
            <th>Alamat</th>
            <th>Asal Sekolah</th>
            <th>Nilai Rapor</th>
            <th>Fakultas</th>
            <th>Prodi</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {/* MATERI: React List (key memakai id unik) */}
          {daftar.map((p, i) => (
            <tr key={p.id}>
              <td>{i + 1}</td>
              <td>{p.nomorPendaftaran}</td>
              <td>{p.nama}</td>
              <td>{p.tanggalLahir}</td>
              <td>{p.jenisKelamin}</td>
              <td>{p.email}</td>
              <td>{p.telepon}</td>
              <td>{p.alamat}</td>
              <td>{p.asalSekolah}</td>
              <td>{p.nilaiRapor || "-"}</td>
              <td>{p.fakultas}</td>
              <td>{p.prodi}</td>
              <td>
                <button type="button" className="hapus" onClick={() => onHapus(p.id)}>
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// MATERI: React.memo + useCallback -> tabel tidak dirender ulang jika props sama
const TabelMemo = memo(TabelPendaftar);

// Ringkasan data untuk Langkah 3 (Konfirmasi)
const Konfirmasi = memo(function Konfirmasi({ form }: { form: FormPendaftar }) {
  const baris: [string, string][] = [
    ["Nomor Pendaftaran", form.nomorPendaftaran],
    ["Nama", form.nama],
    ["Tanggal Lahir", form.tanggalLahir],
    ["Jenis Kelamin", form.jenisKelamin],
    ["Email", form.email],
    ["No. HP", form.telepon],
    ["Alamat", form.alamat],
    ["Asal Sekolah", form.asalSekolah],
    ["Nilai Rata-rata Rapor", form.nilaiRapor],
    ["Fakultas", form.fakultas],
    ["Program Studi", form.prodi],
  ];
  return (
    <dl className="konfirmasi">
      {baris.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
});

// ---------------------------------------------------------
// HALAMAN 1: HOME
// ---------------------------------------------------------
function HomePage() {
  return (
    <>
      <div className="tengah">
        <h1>SELAMAT DATANG</h1>
        <h3><i>UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</i></h3>
      </div>
      <hr />
      <JamDigital />
      <h2>Smart Academic Ecosystem</h2>
      <p>
        WEBSITE UPI-YPTK merupakan platform terpadu yang mendukung seluruh aktivitas akademik dan administrasi kampus, mulai dari penerimaan mahasiswa baru, proses perkuliahan, tagihan,
        pembelajaran digital (LMS), Outcome Based Education (OBE), hingga layanan Smart Campus. Dengan sistem yang terintegrasi, aman, dan mudah digunakan, SISFO membantu menciptakan layanan pendidikan tinggi yang lebih efektif, efisien, dan berorientasi pada peningkatan kualitas.
      </p>
      <Link to="/pmb" className="tombol">Daftar Sekarang</Link>
    </>
  );
}

// ---------------------------------------------------------
// HALAMAN 2: ABOUT
// ---------------------------------------------------------
function AboutPage() {
  return (
    <>
      <div className="tengah">
        <h1>TENTANG KAMI</h1>
        <h3><i>UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</i></h3>
      </div>
      <hr />

      <h2 className="tengah">Fasilitas Kampus :</h2>

      <h3 className="judul-fasilitas">1. UPI Sport and Exhibition Hall</h3>
      <p>Gedung serbaguna megah yang sering digunakan untuk kegiatan olahraga, wisuda, konser, hingga acara regional Sumatra Barat.</p>

      <h3 className="judul-fasilitas">2. Fokus pada Teknologi</h3>
      <p>Sejak awal berdiri sebagai AMIK (Akademi Manajemen Informatika dan Komputer), kampus ini konsisten mengintegrasikan sistem digital ke semua lini perkuliahan. Bahkan fakultas non-komputer pun dibekali literasi teknologi yang kuat.</p>

      <h3 className="judul-fasilitas">3. Akreditasi Unggul</h3>
      <p>Beberapa program studi favoritnya—seperti Sistem Informasi (S1)—telah berhasil meraih akreditasi Unggul, menjadikannya salah satu tujuan utama lulusan SMA di Sumatra.</p>
    </>
  );
}

// ---------------------------------------------------------
// HALAMAN 3: PMB
// ---------------------------------------------------------
function PMBPage() {
  const [form, setForm] = useState<FormPendaftar>(kosong);
  const [daftar, setDaftar] = useState<Pendaftar[]>(muatDaftar); // lazy init
  const [pesan, setPesan] = useState("");
  const [galat, setGalat] = useState("");

  // MATERI: useContext -> ambil fungsi notifikasi global
  const { tampilkan } = useContext(NotifContext);

  // MATERI: useEffect -> ambil (fetch) daftar fakultas & prodi saat halaman dimuat
  const [fakultasData, setFakultasData] = useState<Record<string, string[]>>({});
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let dibatalkan = false;
    ambilFakultas().then((data) => {
      if (!dibatalkan) {
        setFakultasData(data);
        setMemuat(false);
      }
    });
    return () => { dibatalkan = true; }; // cleanup jika halaman ditinggalkan
  }, []);

  // MATERI: useRef -> akses langsung elemen DOM tanpa memicu render ulang
  const nomorRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const cariRef = useRef<HTMLInputElement>(null);

  // Kursor otomatis fokus di "Nomor Pendaftaran" begitu halaman dibuka
  useEffect(() => {
    nomorRef.current?.focus();
  }, []);

  // MATERI: useReducer -> form multi-step & filter tabel
  const [wizard, dispatchWizard] = useReducer(wizardReducer, wizardAwal);
  const [filter, dispatchFilter] = useReducer(filterReducer, filterAwal);

  // MATERI: useMemo -> filter & urutkan berdasarkan nilai rapor, dihitung ulang hanya jika perlu
  const tampil = useMemo(() => {
    const kata = filter.cari.trim().toLowerCase();
    const hasil = daftar.filter((p) => {
      const cocokFakultas = !filter.fakultas || p.fakultas === filter.fakultas;
      const cocokNilai = !filter.minNilai || Number(p.nilaiRapor || 0) >= filter.minNilai;
      const cocokKata =
        !kata ||
        p.nama.toLowerCase().includes(kata) ||
        p.email.toLowerCase().includes(kata) ||
        p.prodi.toLowerCase().includes(kata) ||
        p.nomorPendaftaran.toLowerCase().includes(kata);
      return cocokFakultas && cocokNilai && cocokKata;
    });
    if (filter.urut === "nama") return [...hasil].sort((a, b) => a.nama.localeCompare(b.nama));
    if (filter.urut === "nilai")
      return [...hasil].sort((a, b) => Number(b.nilaiRapor || 0) - Number(a.nilaiRapor || 0));
    if (filter.urut === "terbaru") return [...hasil].reverse();
    return hasil;
  }, [daftar, filter]);

  const statistik = useMemo(() => {
    const perFakultas: Record<string, number> = {};
    let laki = 0;
    let perempuan = 0;
    let totalNilai = 0;
    let jumlahNilai = 0;
    for (const p of daftar) {
      perFakultas[p.fakultas] = (perFakultas[p.fakultas] || 0) + 1;
      if (p.jenisKelamin === "Laki-Laki") laki++;
      else if (p.jenisKelamin === "Perempuan") perempuan++;
      const n = parseFloat(p.nilaiRapor);
      if (!Number.isNaN(n)) {
        totalNilai += n;
        jumlahNilai++;
      }
    }
    const rataRata = jumlahNilai ? (totalNilai / jumlahNilai).toFixed(1) : "-";
    return { total: daftar.length, laki, perempuan, perFakultas, rataRata };
  }, [daftar]);

  useEffect(() => {
    try {
      localStorage.setItem(KUNCI, JSON.stringify(daftar));
    } catch {
      /* abaikan jika penyimpanan penuh / dinonaktifkan */
    }
  }, [daftar]);

  // MATERI: useEffect -> judul tab browser ikut jumlah pendaftar
  useEffect(() => {
    document.title = `PMB (${daftar.length} pendaftar) - UPI YPTK`;
    return () => { document.title = "UPI YPTK PADANG"; };
  }, [daftar.length]);

  // Tanggal lahir tidak boleh di masa depan
  const hariIni = new Date().toISOString().split("T")[0];

  // MATERI: React Event + useCallback
  // (functional update agar fungsi stabil dan tidak dibuat ulang tiap render)
  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      if (name === "fakultas") {
        // ganti fakultas -> prodi di-reset
        setForm((f) => ({ ...f, fakultas: value, prodi: "" }));
      } else {
        setForm((f) => ({ ...f, [name]: value }));
      }
      setPesan("");
      setGalat("");
      dispatchWizard({ type: "BERSIH" });
    },
    []
  );

  // Tombol "Lanjut": validasi langkah yang sedang aktif, lalu pindah
  const lanjut = useCallback(() => {
    const hasil = wizard.langkah === 1 ? validasiLangkah1(form, daftar) : validasiLangkah2(form);
    if (hasil.pesan) {
      dispatchWizard({ type: "GALAT", pesan: hasil.pesan });
      if (hasil.kolom === "email") emailRef.current?.focus();
      if (hasil.kolom === "nomor") nomorRef.current?.focus();
      return;
    }
    dispatchWizard({ type: "LANJUT" });
  }, [wizard.langkah, form, daftar]);

  const kembali = useCallback(() => dispatchWizard({ type: "KEMBALI" }), []);

  // MATERI: React Form Submit + useCallback
  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Tekan Enter di langkah 1 atau 2 = "Lanjut", bukan kirim
      if (wizard.langkah !== 3) {
        lanjut();
        return;
      }

      console.log("Data Tersubmit:", form);

      // Cegah email yang sama mendaftar dua kali
      const emailSudahAda = daftar.some(
        (d) => d.email.trim().toLowerCase() === form.email.trim().toLowerCase()
      );
      if (emailSudahAda) {
        setPesan("");
        setGalat("Email ini sudah terdaftar. Gunakan email lain.");
        dispatchWizard({ type: "KE", langkah: 1 });
        setTimeout(() => emailRef.current?.focus(), 0);
        return;
      }

      setDaftar((lama) => [...lama, { ...form, id: buatId() }]);
      setPesan(`Selamat ${form.nama}, Anda berhasil melakukan pendaftaran!`);
      setGalat("");
      tampilkan(`Pendaftaran ${form.nama} berhasil disimpan.`);
      setForm(kosong);
      dispatchWizard({ type: "RESET" });
      setTimeout(() => nomorRef.current?.focus(), 0); // kembali ke Nomor Pendaftaran
    },
    [wizard.langkah, form, daftar, lanjut, tampilkan]
  );

  // MATERI: useCallback -> fungsi stabil agar TabelMemo tidak render ulang tiap ketik
  const handleHapus = useCallback((id: string) => {
    if (window.confirm("Hapus data pendaftar ini?")) {
      setDaftar((lama) => lama.filter((p) => p.id !== id));
      tampilkan("Data pendaftar dihapus.");
    }
  }, [tampilkan]);

  const namaLangkah = ["Data Diri", "Berkas Akademik", "Konfirmasi"];

  return (
    <>
      <div className="tengah">
        <h1>FORMULIR</h1>
        <h2>PENDAFTARAN MAHASISWA BARU</h2>
        <h3><i>UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</i></h3>
      </div>
      <hr />

      {/* Indikator langkah (useReducer) */}
      <ol className="langkah">
        {namaLangkah.map((t, i) => (
          <li
            key={t}
            className={wizard.langkah === i + 1 ? "aktif" : wizard.langkah > i + 1 ? "selesai" : ""}
          >
            <span>{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>

      {/* MATERI: React Form & React Form Submit */}
      <form onSubmit={handleSubmit}>
        {/* ===== LANGKAH 1: DATA DIRI ===== */}
        {wizard.langkah === 1 && (
          <>
            <label>
              Nomor Pendaftaran:
              <input
                ref={nomorRef}
                name="nomorPendaftaran"
                placeholder="Contoh: PMB-2026-001"
                value={form.nomorPendaftaran}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Nama:
              <input name="nama" value={form.nama} onChange={handleChange} required />
            </label>

            <label>
              Tanggal Lahir:
              <input
                name="tanggalLahir"
                type="date"
                max={hariIni}
                value={form.tanggalLahir}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Jenis Kelamin:
              <select name="jenisKelamin" value={form.jenisKelamin} onChange={handleChange} required>
                <option value="">-- Pilih Jenis Kelamin --</option>
                <option value="Laki-Laki">Laki-Laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </label>

            <label>
              Email:
              <input ref={emailRef} name="email" type="email" value={form.email} onChange={handleChange} required />
            </label>

            <label>
              No. HP:
              <input
                name="telepon"
                type="tel"
                pattern="08[0-9]{8,12}"
                title="Diawali 08, 10-14 angka. Contoh: 081234567890"
                placeholder="081234567890"
                value={form.telepon}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Alamat:
              <textarea name="alamat" rows={4} value={form.alamat} onChange={handleChange} required />
            </label>
          </>
        )}

        {/* ===== LANGKAH 2: BERKAS AKADEMIK ===== */}
        {wizard.langkah === 2 && (
          <>
            <label>
              Asal Sekolah:
              <input
                name="asalSekolah"
                placeholder="Contoh: SMAN 1 Padang"
                value={form.asalSekolah}
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Nilai Rata-rata Rapor:
              <input
                name="nilaiRapor"
                type="number"
                min={0}
                max={100}
                step="0.01"
                inputMode="decimal"
                placeholder="0 - 100"
                value={form.nilaiRapor}
                onChange={handleChange}
                required
              />
            </label>

            {memuat && <p className="loading">Memuat daftar fakultas...</p>}

            <label>
              Fakultas:
              <select name="fakultas" value={form.fakultas} onChange={handleChange} required disabled={memuat}>
                <option value="">-- Pilih Fakultas --</option>
                {Object.keys(fakultasData).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </label>

            <label>
              Program Studi:
              <select name="prodi" value={form.prodi} onChange={handleChange} required disabled={!form.fakultas}>
                <option value="">-- Pilih Program Studi --</option>
                {(fakultasData[form.fakultas] || []).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {/* ===== LANGKAH 3: KONFIRMASI ===== */}
        {wizard.langkah === 3 && <Konfirmasi form={form} />}

        {/* Galat validasi per langkah */}
        {wizard.galat && <div className="galat"><b>{wizard.galat}</b></div>}

        <div className="aksi-form">
          {wizard.langkah > 1 && (
            <button type="button" className="kembali" onClick={kembali}>Kembali</button>
          )}
          {wizard.langkah < 3 ? (
            <button type="button" className="lanjut" onClick={lanjut}>Lanjut</button>
          ) : (
            <button type="submit">Daftar</button>
          )}
        </div>
      </form>

      {/* MATERI: React Conditional */}
      {galat && <div className="galat"><b>{galat}</b></div>}
      {pesan && <div className="sukses"><b>{pesan}</b></div>}

      <hr />
      <h2>Data Pendaftar ({daftar.length})</h2>

      {daftar.length > 0 && (
        <>
          <div className="statistik">
            <div className="kartu"><b>{statistik.total}</b><span>Total</span></div>
            <div className="kartu"><b>{statistik.laki}</b><span>Laki-Laki</span></div>
            <div className="kartu"><b>{statistik.perempuan}</b><span>Perempuan</span></div>
            <div className="kartu"><b>{statistik.rataRata}</b><span>Rata-rata Nilai</span></div>
            {Object.entries(statistik.perFakultas).map(([f, n]) => (
              <div className="kartu" key={f}><b>{n}</b><span>{f}</span></div>
            ))}
          </div>

          <div className="filter-bar">
            <input
              ref={cariRef}
              type="search"
              placeholder="Cari no. daftar / nama / email / prodi..."
              aria-label="Cari pendaftar"
              value={filter.cari}
              onChange={(e) => dispatchFilter({ type: "CARI", nilai: e.target.value })}
            />
            <select
              aria-label="Filter fakultas"
              value={filter.fakultas}
              onChange={(e) => dispatchFilter({ type: "FAKULTAS", nilai: e.target.value })}
            >
              <option value="">Semua Fakultas</option>
              {Object.keys(dataFakultas).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <select
              aria-label="Urutkan"
              value={filter.urut}
              onChange={(e) => dispatchFilter({ type: "URUT", nilai: e.target.value as Urutan })}
            >
              <option value="terbaru">Terbaru</option>
              <option value="terlama">Terlama</option>
              <option value="nama">Nama (A-Z)</option>
              <option value="nilai">Nilai Rapor Tertinggi</option>
            </select>
            <select
              aria-label="Nilai rapor minimal"
              value={String(filter.minNilai)}
              onChange={(e) => dispatchFilter({ type: "NILAI", nilai: Number(e.target.value) })}
            >
              <option value="0">Semua Nilai</option>
              <option value="70">Nilai ≥ 70</option>
              <option value="80">Nilai ≥ 80</option>
              <option value="90">Nilai ≥ 90</option>
            </select>
            <button
              type="button"
              className="reset"
              onClick={() => { dispatchFilter({ type: "RESET" }); cariRef.current?.focus(); }}
            >
              Reset
            </button>
          </div>
          <p className="info-filter">Menampilkan {tampil.length} dari {daftar.length} pendaftar</p>
        </>
      )}

      {/* Memanggil komponen anak */}
      {daftar.length > 0 && tampil.length === 0 ? (
        <p>Tidak ada data yang cocok dengan pencarian.</p>
      ) : (
        <TabelMemo daftar={tampil} onHapus={handleHapus} />
      )}
    </>
  );
}

// ---------------------------------------------------------
// HALAMAN 4: CONTACT
// ---------------------------------------------------------
function ContactPage() {
  return (
    <>
      <div className="tengah">
        <h1>CONTACT</h1>
        <h3><i>UNIVERSITAS PUTRA INDONESIA "YPTK" PADANG</i></h3>
      </div>
      <hr />
      <p>Rektor : {kontak.rektor}</p>
      <p>Alamat : {kontak.alamat}</p>
      <p>Email : {kontak.email}</p>
      <p>Telepon : {kontak.telepon}</p>
    </>
  );
}

// ---------------------------------------------------------
// HALAMAN 5: 404 (alamat tidak ditemukan)
// ---------------------------------------------------------
function NotFoundPage() {
  return (
    <div className="tengah">
      <h1>404</h1>
      <h3>Halaman tidak ditemukan.</h3>
      <Link to="/" className="tombol">Kembali ke Home</Link>
    </div>
  );
}

// ---------------------------------------------------------
// MATERI: Lazy Loading + Suspense
// ---------------------------------------------------------
const Home = lazy(() => Promise.resolve({ default: HomePage }));
const About = lazy(() => Promise.resolve({ default: AboutPage }));
const PMB = lazy(() => Promise.resolve({ default: PMBPage }));
const Contact = lazy(() => Promise.resolve({ default: ContactPage }));
const NotFound = lazy(() => Promise.resolve({ default: NotFoundPage }));

// ---------------------------------------------------------
// MATERI: React Component (Induk) + React Router
// ---------------------------------------------------------
function App() {
  const [menuBuka, setMenuBuka] = useState(false);

  return (
    <NotifProvider>
    <BrowserRouter>
      <div className="app">
        <nav className="navbar">
          <div className="brand">
            <img src={logoUpi} alt="Logo UPI YPTK" className="logo" />
            <span>UPI YPTK PADANG</span>
          </div>

          {/* Tombol menu (hanya tampil di layar kecil) */}
          <button
            type="button"
            className="hamburger"
            aria-label="Buka menu"
            aria-expanded={menuBuka}
            onClick={() => setMenuBuka(!menuBuka)}
          >
            {menuBuka ? "✕" : "☰"}
          </button>

          <div className={menuBuka ? "menu buka" : "menu"} onClick={() => setMenuBuka(false)}>
            <NavLink to="/" end>HOME</NavLink>
            <NavLink to="/about">ABOUT</NavLink>
            <NavLink to="/pmb">PMB</NavLink>
            <NavLink to="/contact">CONTACT</NavLink>
          </div>
        </nav>

        <main className="isi">
          <div className="wadah">
            <Suspense fallback={<p className="loading">Lagi Loading bro...</p>}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/pmb" element={<PMB />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </div>
        </main>

        <footer className="footer">
          <div className="footer-kiri">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5l8-3z" />
            </svg>
            <span>Ahmad Dhava Fahrezi</span>
          </div>

          <div className="footer-tengah">
            © 2026
          </div>

          <div className="footer-kanan">
            <span>Kebijakan Privasi</span>
            <span className="garis"></span>
            <span>Pelatihan Mediatama </span>
            <span className="garis"></span>
            <span>Node.js</span>
          </div>
        </footer>
      </div>
    </BrowserRouter>
    </NotifProvider>
  );
}

export default App;