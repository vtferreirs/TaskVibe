import { Check, AlertTriangle, Clock, Flag } from "lucide-react";
import { getCardBadge, normalizarNivel, nivelIntenso } from "./cardStatus";
import "./cardStatus.css";

// Mapeia a "key" do badge (calculada em cardStatus.js) para o ícone exibido
const ICONES = {
  concluido: Check,
  "concluido-atraso": AlertTriangle,
  atrasado: AlertTriangle,
  proximo: Clock,
  baixa: Flag,
  media: Flag,
  alta: Flag,
};

// Badge visual que resume o estado de um card:
// conclusão, atraso, prazo próximo ou prioridade. A regra de qual badge
// mostrar fica em getCardBadge (cardStatus.js).
export default function CardStatusBadge({ card, nivelAlertas = "intenso", agora }) {
  const nivel = normalizarNivel(nivelAlertas);
  const badge = getCardBadge(card, nivel, agora);
  const Icone = ICONES[badge.key] || Flag;

  const classes = ["card-badge", `card-badge--${badge.key}`];
  // No nível de alerta "intenso", badges de prazo próximo ganham animação de pulso
  if (badge.key === "proximo" && nivelIntenso(nivel)) {
    classes.push("card-badge--pulso");
  }

  return (
    <span className={classes.join(" ")}>
      <Icone size={11} />
      {badge.label}
    </span>
  );
}
