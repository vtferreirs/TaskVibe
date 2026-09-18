// Utilitário central de datas e prazos dos cards.
// Centraliza cálculos de vencimento, conclusão, formatação e os "badges"
// de status, evitando duplicar essa lógica nas páginas/componentes.

// Faixas de tempo (em dias) usadas para os avisos de prazo próximo
export const DIAS_ALERTA = 3; // Dentro de 3 dias -> alerta "proximo"
export const DIAS_FAIXA_AMARELA = 7; // Dentro de 7 dias -> faixa amarela

export const NIVEIS_ALERTA = ["desligado", "sutil", "intenso"];

// Milissegundos de um dia (base para os cálculos de diferença)
const MS_DIA = 24 * 60 * 60 * 1000;

// Horário padrão quando o usuário não informa nenhum (fim do dia)
export const HORA_PADRAO = "23:59";

// Regex que valida horário no formato HH:mm (00:00 a 23:59)
const FORMATO_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// Garante que o horário esteja no formato HH:mm; senão usa o padrão
export function normalizarHora(valor) {
  return FORMATO_HORA.test(String(valor || "")) ? valor : HORA_PADRAO;
}

// Combina o dia (guardado pelo banco como data UTC) com o horário local informado,
// gerando um Date completo comparável (usado para saber se o prazo já passou).
export function combinaDataHora(dataEntrega, horaEntrega) {
  if (!dataEntrega) return null;
  const data = new Date(dataEntrega);
  if (Number.isNaN(data.getTime())) return null;
  const [horas, minutos] = normalizarHora(horaEntrega).split(":").map(Number);
  return new Date(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate(),
    horas,
    minutos,
    0,
    0
  );
}

// Meia-noite UTC do dia da entrega (ignora a hora)
const diaDaEntrega = (card) => {
  const data = new Date(card?.data_entrega);
  if (Number.isNaN(data.getTime())) return null;
  return Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate());
};

// Meia-noite UTC de hoje
const diaDeHoje = (agora) =>
  Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate());

// Quantidade de dias entre hoje e a entrega (ex.: 0 = hoje, -1 = ontem)
const diasAteEntrega = (card, agora = new Date()) => {
  const entregaDia = diaDaEntrega(card);
  const hojeDia = diaDeHoje(agora);
  if (entregaDia === null) return null;
  return Math.round((entregaDia - hojeDia) / MS_DIA);
};

// Normaliza o nível de alertas vindo da API/usuário para um valor válido
export function normalizarNivel(valor) {
  if (NIVEIS_ALERTA.includes(valor)) return valor;
  if (valor === false) return "desligado";
  return "intenso";
}

export function alertasAtivos(nivel) {
  return normalizarNivel(nivel) !== "desligado";
}

export function nivelIntenso(nivel) {
  return normalizarNivel(nivel) === "intenso";
}

// Data no formato brasileiro dd/mm/aaaa, tratando o campo como data UTC pura
export function formatarData(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function formatarDataHora(dataEntrega, horaEntrega) {
  const data = formatarData(dataEntrega);
  if (!data) return "";
  return `${data} às ${normalizarHora(horaEntrega)}`;
}

export function isConcluido(card) {
  return card?.concluido === true;
}

// Momento real da conclusão: prioriza data_conclusao gravada; para cards
// antigos sem ela, cai para a data de criação como aproximação
export function dataConclusao(card) {
  if (!card) return null;
  const bruto = card.data_conclusao || (isConcluido(card) ? card.data_criacao_card : null);
  if (!bruto) return null;
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? null : data;
}

// Concluído, mas após a data/hora de entrega (entrega interpretada como momento local)
export function isConcluidoComAtraso(card) {
  if (!isConcluido(card)) return false;
  const entrega = combinaDataHora(card?.data_entrega, card?.hora_entrega);
  const conclusao = dataConclusao(card);
  if (!entrega || !conclusao) return false;
  return conclusao.getTime() > entrega.getTime();
}

// Sem concluir, com prazo já passado ("atrasado")
export function isVencido(card, agora = new Date()) {
  if (!card || isConcluido(card)) return false;
  const entrega = combinaDataHora(card.data_entrega, card.hora_entrega);
  if (!entrega) return false;
  return entrega.getTime() < agora.getTime();
}

// Sem concluir, com prazo vencendo dentro da janela de alerta (DIAS_ALERTA)
export function isVenceLogo(card, agora = new Date()) {
  if (!card || isConcluido(card) || isVencido(card, agora)) return false;
  const entrega = combinaDataHora(card.data_entrega, card.hora_entrega);
  if (!entrega) return false;
  const diff = entrega.getTime() - agora.getTime();
  return diff >= 0 && diff <= DIAS_ALERTA * MS_DIA;
}

// Texto humanizado para o prazo (ex.: "Vence hoje", "Vence em 3 dias")
export function labelPrazo(card, agora = new Date()) {
  const dias = diasAteEntrega(card, agora);
  if (dias === null || dias < 0) return null;
  if (dias === 0) return "Vence hoje";
  if (dias === 1) return "Vence amanhã";
  return `Vence em ${dias} dias`;
}

// Retorna a "faixa" de prazo usada para colorir o card/fundo:
// atrasado, hoje, 3dias, 7dias ou null (sem ênfase)
export function faixaPrazo(card, agora = new Date()) {
  if (!card || isConcluido(card)) return null;
  const entrega = combinaDataHora(card.data_entrega, card.hora_entrega);
  if (!entrega) return null;
  if (entrega.getTime() < agora.getTime()) return "atrasado";
  const dias = diasAteEntrega(card, agora);
  if (dias === null) return null;
  if (dias <= 0) return "hoje";
  if (dias <= DIAS_ALERTA) return "3dias";
  if (dias <= DIAS_FAIXA_AMARELA) return "7dias";
  return null;
}

export function prioridadeLabel(prioridade) {
  if (prioridade === "Alta") return "Alta";
  if (prioridade === "Media") return "Média";
  return "Baixa";
}

// Define QUAL badge mostrar em um card, em ordem de prioridade de exibição:
// concluído com atraso > concluído > atrasado > prazo próximo (se alertas ativos) > prioridade
export function getCardBadge(card, nivelAlertas = "intenso", agora = new Date()) {
  const prioridade = prioridadeLabel(card?.prioridade);
  const prioKey =
    card?.prioridade === "Alta" ? "alta" : card?.prioridade === "Media" ? "media" : "baixa";

  if (isConcluidoComAtraso(card)) {
    return { key: "concluido-atraso", label: "Concluído com atraso" };
  }
  if (isConcluido(card)) {
    return { key: "concluido", label: "Concluído" };
  }
  if (isVencido(card, agora)) {
    return { key: "atrasado", label: "Atrasado" };
  }
  if (alertasAtivos(nivelAlertas) && isVenceLogo(card, agora)) {
    return { key: "proximo", label: labelPrazo(card, agora) || prioridade };
  }
  return { key: prioKey, label: prioridade };
}

// Converte um Date/string para o valor usado no <input type="date"> (yyyy-mm-dd)
export function toDateInputValue(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return data.toISOString().slice(0, 10);
}

// Valor padrão para <input type="time">
export function toHoraInputValue(valor) {
  return normalizarHora(valor);
}

// Data de hoje no formato yyyy-mm-dd (mesmo do input date), usando hora local
export function hojeISO(agora = new Date()) {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}
