import { Link } from "react-router-dom";

const btn =
  "inline-block px-4 py-2 rounded bg-yellow-400 font-bold text-gray-900 hover:bg-yellow-500 cursor-pointer";

function Home() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-yellow-700 text-center">
        SELAMAT DATANG
      </h1>

      <hr className="border-t-2 border-yellow-400 my-4" />

      <p className="mb-4">
        WEBSITE UPI-YPTK adalah platform terpadu untuk penerimaan mahasiswa
        baru, perkuliahan, tagihan, LMS, hingga Smart Campus.
      </p>

      <Link to="/pmb" className={btn}>
        Daftar Sekarang
      </Link>
    </div>
  );
}

export default Home;