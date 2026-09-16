import { Kanban, Sparkles } from "lucide-react";
import "./AuthDecor.css";

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