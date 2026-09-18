import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import "./ThemeToggle.css";

// Alternador de tema claro/escuro.
// Lê o tema aplicado no <html> (definido pelo script do index.html antes do React)
// e, ao trocar, salva em localStorage para persistir entre sessões.
export default function ThemeToggle({ floating = false }) {
  // Estado inicial vem do data-theme já aplicado pelo script inline do index.html
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") || "light"
  );

  // Toda mudança de tema atualiza o atributo no <html> e persiste no localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("taskvibe-theme", theme);
  }, [theme]);

  const toggle = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <button
      type="button"
      className={`theme-toggle ${floating ? "theme-toggle--floating" : ""}`}
      onClick={toggle}
      title={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
      aria-label="Alternar tema claro/escuro"
    >
      {/* Ícone reflete o tema ATUAL mas anuncia o próximo (sol = ir para claro) */}
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      <span className="theme-toggle-label">
        {theme === "dark" ? "Claro" : "Escuro"}
      </span>
    </button>
  );
}