import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { ChangeEvent, FormEvent } from "react";

const inp =
  "block w-full mt-1 mb-3 px-3 py-2 border border-yellow-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400";
const btn =
  "inline-block px-4 py-2 rounded bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-500 cursor-pointer";
const sel = "border border-yellow-300 px-2 py-1";

type Isi = {
  nomor: string;
  nama: string;
  email: string;
  nilai: string;
  fakultas: string;
  prodi: string;
};

type Pendaftar = Isi & { id: string };

type Filter = { cari: string; urut: string };

type Aksi =
  | { type: "RESET" }
  | { type: "ISI"; kolom: keyof Filter; nilai: string };

const kosong: Isi = {
  nomor: "",
  nama: "",
  email: "",
  nilai: "",
  fakultas: "",
  prodi: "",
};

const fakultasData: Record<string, string[]> = {
  "Fakultas Ilmu Komputer": [
    "Sistem Informasi",
    "Teknik Informatika",
    "Sistem Komputer",
  ],
  "Fakultas Ekonomi": ["Manajemen", "Akuntansi"],
};

const isian: [keyof Isi, string, string?][] = [
  ["nomor", "Nomor Pendaftaran"],
  ["nama", "Nama"],
  ["email", "Email", "email"],
  ["nilai", "Nilai Rapor (0-100)", "number"],
  ["fakultas", "Fakultas", "select"],
  ["prodi", "Program Studi", "select"],
];

const filterAwal: Filter = { cari: "", urut: "terbaru" };

const filterReducer = (state: Filter, aksi: Aksi): Filter =>
  aksi.type === "RESET" ? filterAwal : { ...state, [aksi.kolom]: aksi.nilai };

type TabelProps = {
  daftar: Pendaftar[];
  onHapus: (id: string) => void;
};

const Tabel = memo(function Tabel({ daftar, onHapus }: TabelProps) {
  if (daftar.length === 0) {
    return <p>Belum ada pendaftar.</p>;
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr>
          {["No", "No. Daftar", "Nama", "Email", "Nilai", "Prodi", "Aksi"].map(
            (kolom) => (
              <th key={kolom} className={`${sel} text-left bg-yellow-100`}>
                {kolom}
              </th>
            )
          )}
        </tr>
      </thead>

      <tbody>
        {daftar.map((p, i) => (
          <tr key={p.id}>
            {[i + 1, p.nomor, p.nama, p.email, p.nilai, p.prodi].map(
              (isi, j) => (
                <td key={j} className={sel}>
                  {isi}
                </td>
              )
            )}

            <td className={sel}>
              <button className="text-red-600" onClick={() => onHapus(p.id)}>
                Hapus
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
});

function FormPMB() {
  const [form, setForm] = useState<Isi>(kosong);
  const [daftar, setDaftar] = useState<Pendaftar[]>(() =>
    JSON.parse(localStorage.getItem("pendaftar") || "[]")
  );
  const [galat, setGalat] = useState("");
  const [notif, setNotif] = useState("");
  const [filter, dispatch] = useReducer(filterReducer, filterAwal);

  const nomorRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tampilkan = useCallback((pesan: string) => {
    setNotif(pesan);

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotif(""), 3000);
  }, []);

  useEffect(() => {
    nomorRef.current?.focus();

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("pendaftar", JSON.stringify(daftar));
    document.title = `PMB (${daftar.length} pendaftar) - UPI YPTK`;
  }, [daftar]);

  const tampil = useMemo(() => {
    const hasil = daftar.filter((p) =>
      p.nama.toLowerCase().includes(filter.cari.toLowerCase())
    );

    if (filter.urut === "nama") {
      return [...hasil].sort((a, b) => a.nama.localeCompare(b.nama));
    }

    if (filter.urut === "nilai") {
      return [...hasil].sort((a, b) => Number(b.nilai) - Number(a.nilai));
    }

    return [...hasil].reverse();
  }, [daftar, filter]);

  const rata = useMemo(() => {
    if (daftar.length === 0) return "-";

    const total = daftar.reduce((a, p) => a + Number(p.nilai), 0);
    return (total / daftar.length).toFixed(1);
  }, [daftar]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;

      setForm((f) => ({
        ...f,
        [name]: value,
        ...(name === "fakultas" ? { prodi: "" } : {}),
      }));
      setGalat("");
    },
    []
  );

  const handleHapus = useCallback(
    (id: string) => {
      if (window.confirm("Hapus data pendaftar ini?")) {
        setDaftar((d) => d.filter((p) => p.id !== id));
        tampilkan("Data dihapus.");
      }
    },
    [tampilkan]
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (daftar.some((d) => d.nomor === form.nomor)) {
      setGalat("Nomor pendaftaran sudah digunakan.");
      nomorRef.current?.focus();
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setGalat("Format email tidak valid.");
      return;
    }

    if (Number(form.nilai) < 0 || Number(form.nilai) > 100) {
      setGalat("Nilai rapor harus 0 sampai 100.");
      return;
    }

    setDaftar((d) => [...d, { ...form, id: crypto.randomUUID() }]);
    tampilkan(`Pendaftaran ${form.nama} berhasil disimpan.`);
    setForm(kosong);
    nomorRef.current?.focus();
  };

  const pilihan: Record<string, string[]> = {
    fakultas: Object.keys(fakultasData),
    prodi: fakultasData[form.fakultas] || [],
  };

  const isiFilter =
    (kolom: keyof Filter) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      dispatch({ type: "ISI", kolom, nilai: e.target.value });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-yellow-700 text-center">
        FORMULIR
      </h1>

      <h2 className="text-lg text-center">PENDAFTARAN MAHASISWA BARU</h2>

      <hr className="border-t-2 border-yellow-400 my-4" />

      <form
        onSubmit={handleSubmit}
        className="border border-yellow-300 bg-yellow-50 rounded-lg p-4"
      >
        {isian.map(([name, label, tipe]) => (
          <label
            key={name}
            className="block text-sm font-medium text-yellow-800"
          >
            {label}

            {tipe === "select" ? (
              <select
                name={name}
                value={form[name]}
                onChange={handleChange}
                required
                className={inp}
                disabled={name === "prodi" && !form.fakultas}
              >
                <option value="">-- Pilih --</option>

                {pilihan[name].map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : (
              <input
                ref={name === "nomor" ? nomorRef : undefined}
                name={name}
                type={tipe || "text"}
                value={form[name]}
                onChange={handleChange}
                required
                className={inp}
              />
            )}
          </label>
        ))}

        {galat && (
          <p className="mb-3 p-2 rounded bg-red-50 text-red-700 text-sm">
            {galat}
          </p>
        )}

        <button type="submit" className={`${btn} w-full`}>
          Daftar
        </button>
      </form>

      <h2 className="text-lg font-bold text-yellow-700 mt-8 mb-3">
        Data Pendaftar ({daftar.length}) • Rata-rata nilai: {rata}
      </h2>

      {daftar.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input
            type="search"
            placeholder="Cari nama..."
            value={filter.cari}
            onChange={isiFilter("cari")}
            className={`${inp} !m-0`}
          />

          <select
            value={filter.urut}
            onChange={isiFilter("urut")}
            className={`${inp} !m-0`}
          >
            <option value="terbaru">Terbaru</option>
            <option value="nama">Nama (A-Z)</option>
            <option value="nilai">Nilai Tertinggi</option>
          </select>

          <button
            type="button"
            className={btn}
            onClick={() => dispatch({ type: "RESET" })}
          >
            Reset
          </button>
        </div>
      )}

      <Tabel daftar={tampil} onHapus={handleHapus} />

      {notif && (
        <div
          role="status"
          className="fixed bottom-4 right-4 px-4 py-2 rounded bg-yellow-400 text-sm shadow"
        >
          {notif}
        </div>
      )}
    </div>
  );
}

export default FormPMB;