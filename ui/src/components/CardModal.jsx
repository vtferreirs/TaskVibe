import { useState } from "react";
import { Check, X, Trash2, Edit2, Calendar, Clock, Type } from "lucide-react";
import ColorPickerMenu from "./ColorPickerMenu";
import CardStatusBadge from "./CardStatusBadge";
import {
  isConcluido,
  prioridadeLabel,
  toDateInputValue,
  toHoraInputValue,
  formatarDataHora,
} from "./cardStatus";
import "./CreateBoardModal.css";
import "./CardModal.css";

// Modal de detalhes/edição de um card.
// Exibe modo visualização por padrão e, se o usuário tem permissão de edição,
// permite alternar para o modo de edição. As alterações são aplicadas via onSave
// (controlado pela página), não direto na API.
export default function CardModal({
  card,
  isOpen,
  podeEditar,
  nivelAlertas = "intenso",
  onClose,
  onSave,
  onColorChange,
  onTextColorChange,
  onRequestDelete,
  onToggleConcluido,
}) {
  // Estado do formulário de edição. Os campos iniciam com os valores atuais do card.
  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(card?.titulo || "");
  const [descricao, setDescricao] = useState(card?.descricao || "");
  const [dataEntrega, setDataEntrega] = useState(toDateInputValue(card?.data_entrega));
  const [horaEntrega, setHoraEntrega] = useState(toHoraInputValue(card?.hora_entrega));
  const [prioridade, setPrioridade] = useState(card?.prioridade || "Baixa");
  const [erro, setErro] = useState("");

  // Modal invisível: nada é renderizado (evita estado órfão na tela)
  if (!isOpen || !card) return null;

  const concluido = isConcluido(card);

  // Restaura os campos do formulário para os valores salvos no card
  const cancelarEdicao = () => {
    setEditando(false);
    setErro("");
    setTitulo(card.titulo || "");
    setDescricao(card.descricao || "");
    setDataEntrega(toDateInputValue(card.data_entrega));
    setHoraEntrega(toHoraInputValue(card.hora_entrega));
    setPrioridade(card.prioridade || "Baixa");
  };

  const salvar = () => {
    // Validação básica antes de disparar o onSave
    if (!titulo.trim() || !descricao.trim() || !dataEntrega || !prioridade) {
      setErro("Preencha todas as informações.");
      return;
    }
    // Data enviada como meia-noite UTC (para o banco guardar o dia apenas);
    // horário vazio cai no padrão 23:59
    onSave(card._id, {
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      data_entrega: new Date(`${dataEntrega}T00:00:00.000Z`).toISOString(),
      hora_entrega: horaEntrega || "23:59",
      prioridade,
    });
    setErro("");
    setEditando(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* stopPropagation impede que clicar dentro do modal o feche */}
      <div className="modal-card card-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header card-modal-header">
          <div className="card-modal-title">
            {podeEditar ? (
              // Botão circular de concluir (visível só para quem pode editar)
              <button
                type="button"
                className={`conclude-circle ${concluido ? "conclude-circle--done" : ""}`}
                onClick={() => onToggleConcluido(card._id, !concluido)}
                title={concluido ? "Marcar como não concluído" : "Marcar como entregue"}
                aria-label={concluido ? "Marcar como não concluído" : "Marcar como entregue"}
              >
                <Check size={15} />
              </button>
            ) : (
              // Versão estática (sem interação) para usuário apenas visualizador
              <span
                className={`conclude-circle conclude-circle--static ${concluido ? "conclude-circle--done" : ""}`}
              >
                <Check size={15} />
              </span>
            )}

            {editando ? (
              <input
                className="card-modal-title-input"
                type="text"
                value={titulo}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  setErro("");
                }}
                placeholder="Título"
                autoFocus
              />
            ) : (
              // Modo leitura: título com risco quando o card está concluído
              <h3 className={concluido ? "card-modal-title-done" : ""}>{card.titulo}</h3>
            )}
          </div>

          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body card-modal-body">
          <CardStatusBadge card={card} nivelAlertas={nivelAlertas} />

          {editando ? (
            <textarea
              className="card-modal-textarea"
              value={descricao}
              onChange={(e) => {
                setDescricao(e.target.value);
                setErro("");
              }}
              placeholder="Descrição"
              rows={3}
            />
          ) : (
            <p className="card-modal-desc">{card.descricao || "Sem descrição."}</p>
          )}

          <div className="card-modal-meta">
            <div className="card-modal-meta-item">
              <Calendar size={14} />
              {editando ? (
                <input
                  type="date"
                  className="card-modal-date"
                  value={dataEntrega}
                  onChange={(e) => {
                    setDataEntrega(e.target.value);
                    setErro("");
                  }}
                />
              ) : (
                <span>{formatarDataHora(card.data_entrega, card.hora_entrega)}</span>
              )}
            </div>

            {/* Campo de horário aparece só no modo de edição */}
            {editando && (
              <div className="card-modal-meta-item">
                <Clock size={14} />
                <input
                  type="time"
                  className="card-modal-date"
                  value={horaEntrega}
                  onChange={(e) => {
                    setHoraEntrega(e.target.value);
                    setErro("");
                  }}
                />
              </div>
            )}

            <div className="card-modal-meta-item">
              {editando ? (
                <select
                  className="card-modal-select"
                  value={prioridade}
                  onChange={(e) => {
                    setPrioridade(e.target.value);
                    setErro("");
                  }}
                >
                  <option value="Baixa">Baixa (Azul)</option>
                  <option value="Media">Média (Amarelo)</option>
                  <option value="Alta">Alta (Vermelho)</option>
                </select>
              ) : (
                <span>Prioridade: {prioridadeLabel(card.prioridade)}</span>
              )}
            </div>
          </div>

          {editando && erro && <p className="card-modal-error">{erro}</p>}

          {podeEditar && (
            <div className="card-modal-colors">
              <div className="card-modal-color-field">
                <span>Cor do card</span>
                {/* Paleta com cores sólidas e gradientes definidas em colorPalette.js */}
                <ColorPickerMenu
                  value={card.cor || "#ffffff"}
                  onChange={(v) => onColorChange(card._id, v)}
                  title="Mudar cor do card"
                />
              </div>

              <label className="card-modal-color-field card-modal-color-field--text">
                <span>
                  <Type size={13} /> Cor do texto
                </span>
                <input
                  type="color"
                  value={card.cor_texto || "#1e293b"}
                  onChange={(e) => onTextColorChange(card._id, e.target.value)}
                />
              </label>
            </div>
          )}
        </div>

        <div className="modal-footer card-modal-footer">
          {podeEditar && (
            <button
              type="button"
              className="card-modal-delete"
              onClick={() => onRequestDelete(card)}
            >
              <Trash2 size={15} /> Excluir
            </button>
          )}

          <div className="card-modal-footer-right">
            {editando ? (
              <>
                <button type="button" className="btn-cancel" onClick={cancelarEdicao}>
                  Cancelar
                </button>
                <button type="button" className="btn-submit" onClick={salvar}>
                  <Check size={15} /> Salvar
                </button>
              </>
            ) : (
              podeEditar && (
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => {
                    setErro("");
                    setEditando(true);
                  }}
                >
                  <Edit2 size={15} /> Editar
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
