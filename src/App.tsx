import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import logoUpi from "./assets/logo-upi.png";
import "./App.css";

const Home = lazy(() => import("./pages/Home"));
const About = lazy(() => import("./pages/About"));
const FormPMB = lazy(() => import("./pages/FormPMB"));
const Contact = lazy(() => import("./pages/Contact"));

const menu = [
  ["/", "HOME"],
  ["/about", "ABOUT"],
  ["/pmb", "PMB"],
  ["/contact", "CONTACT"],
];

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-white text-gray-900">
        <nav className="sticky top-0 z-10 bg-yellow-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold">
            <img src={logoUpi} alt="Logo UPI YPTK" className="h-9" />
            UPI YPTK
          </div>

          <div className="flex flex-wrap gap-1">
            {menu.map(([to, label]) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `px-3 py-1 rounded hover:bg-white ${
                    isActive ? "bg-white font-bold" : ""
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </nav>

        <main className="flex-1">
          <Suspense
            fallback={
              <div className="text-center py-16 text-gray-500">
                <h2 className="text-lg font-bold">Loading...</h2>
                <p>Mohon tunggu sebentar.</p>
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/pmb" element={<FormPMB />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <footer className="border-t-2 border-yellow-400 bg-yellow-50 px-4 py-3 text-sm text-gray-600 text-center">
          © 2026 Universitas Putra Indonesia YPTK Padang. All Rights Reserved.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;