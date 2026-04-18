import { useState, createContext } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import UserReport from "./pages/UserReport";
import "./App.css";

// Create Context for Multi-lingual support
export const LanguageContext = createContext();

function App() {
  const [lang, setLang] = useState("en");

  const toggleLang = () => {
    setLang((prev) => (prev === "en" ? "ta" : "en"));
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      <Router>
        <div className="app-container">
          <nav className="navbar">
            <div className="nav-brand">
              <Link to="/">Seva Setu 🤝</Link>
            </div>
            <div className="nav-links">
              <button onClick={toggleLang} className="btn-lang">
                {lang === "en" ? "தமிழ்" : "English"}
              </button>
            </div>
          </nav>

          <main className="content">
            <Routes>
              <Route path="/" element={<UserReport />} />
            </Routes>
          </main>
          
          <footer className="footer">
            <p>© 2026 Seva Setu - Citizen Incident Reporting Platform</p>
          </footer>
        </div>
      </Router>
    </LanguageContext.Provider>
  );
}

export default App;
