import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import Boardview from "./pages/Boardview";
import Home from "./pages/Home";
import Compartilhados from "./pages/Compartilhados";

// Componente raiz: define TODAS as rotas do app.
// Cada <Route> mapeia uma URL para a página correspondente.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Páginas públicas (sem autenticação obrigatória no nível da rota) */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Área logada */}
        <Route path="/home" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/compartilhados" element={<Compartilhados />} />
        {/* /quadro/:id recebe o id do quadro na URL (ex.: /quadro/abc123) */}
        <Route path="/quadro/:id" element={<Boardview />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reports" element={<Reports />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;