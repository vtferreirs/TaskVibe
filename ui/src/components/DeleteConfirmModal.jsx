import { AlertTriangle, X } from "lucide-react";
import "./CreateBoardModal.css";

// Modal genérico de confirmação de exclusão.
// Reutilizado para cards, colunas, quadros etc.; o texto é parametrizado
// por props (title, subjectName, message, confirmLabel, warning).
export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Excluir",
  subjectName = "", // Nome do item a excluir (aparece em destaque na mensagem)
  message = "Tem certeza que deseja excluir",
  confirmLabel = "Excluir",
  warning = "Esta ação é permanente e removerá todas as tarefas vinculadas.",
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div className="modal-title">
            <AlertTriangle size={20} style={{ color: "var(--danger)" }} />
            <h3>{title}</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body" style={{ gap: "12px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", margin: 0, lineHeight: 1.5 }}>
            {message}{" "}
            {subjectName && (
              <strong style={{ color: "var(--text-primary)" }}>
                &ldquo;{subjectName}&rdquo;
              </strong>
            )}
          </p>
          {/* Aviso em destaque sobre a irreversibilidade da ação */}
          <span style={{ color: "var(--danger)", fontSize: "0.82rem", fontWeight: 600 }}>
            {warning}
          </span>

          <div className="modal-footer" style={{ marginTop: "12px" }}>
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            {/* Botão de confirmação com cor de perigo para reforçar a ação destrutiva */}
            <button
              type="button"
              className="btn-submit"
              style={{ background: "var(--danger)" }}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}