import { Kanban, Sparkles } from "lucide-react";
import "./AuthDecor.css";

// Decoração visual puramente estética das telas de login/registro
// (blobs e "chips" flutuantes). aria-hidden evita que leitores de tela
// leiam elementos que não têm conteúdo informativo.
export default function AuthDecor() {
  return (
    <div className="auth-decor" aria-hidden="true">
      <div className="deco-corner left">
        <span className="deco-blob" />
        <span className="deco-chip">
          <Kanban size={18} />
        </span>
      </div>
      <div className="deco-corner right">
        <span className="deco-blob" />
        <span className="deco-chip">
          <Sparkles size={16} />
        </span>
      </div>
    </div>
  );
}