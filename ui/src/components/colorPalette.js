// Paleta de cores disponível para quadros/cards.
// Cores sólidas usam hex; valores "gradient" são linear-gradients completos.
export const COLOR_PALETTE = [
  { id: "branco", label: "Branco", value: "#FFFFFF", gradient: false },
  { id: "lilas", label: "Lilás", value: "#E9D5FF", gradient: false },
  { id: "rosa", label: "Rosa", value: "#FBCFE8", gradient: false },
  { id: "menta", label: "Menta", value: "#BBF7D0", gradient: false },
  { id: "ceu", label: "Céu", value: "#BFDBFE", gradient: false },
  {
    id: "g-roxo-rosa",
    label: "Roxo → Rosa",
    value: "linear-gradient(135deg, #C4B5FD, #F9A8D4)",
    gradient: true,
  },
  {
    id: "g-roxo-azul",
    label: "Roxo → Azul",
    value: "linear-gradient(135deg, #A78BFA, #93C5FD)",
    gradient: true,
  },
];

export const DEFAULT_COLOR = "#FFFFFF";

// Um valor é gradiente se for string começando com "linear-gradient"
export function isGradient(value) {
  return typeof value === "string" && value.startsWith("linear-gradient");
}

// Ajudantes: definem qual valor usar como background do "swatch" de amostra
// (gradientes atuam direto como background; cores sólidas também)
export function gradientSwatchBackground(value) {
  return isGradient(value) ? value : undefined;
}

export function solidSwatchBackground(value) {
  return isGradient(value) ? undefined : value;
}

// Extrai as duas cores de um gradiente fixo a 135deg (ex.: "#C4B5FD" e "#F9A8D4")
export function extractGradientStops(value) {
  const match = value && value.match(/linear-gradient\(135deg,\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/);
  if (!match) return null;
  return { cor1: match[1], cor2: match[2] };
}

// Constrói um gradiente a partir de duas cores, validando o hex informado
// (rejeita entradas inválidas e cai para cores padrão)
export function buildGradient(cor1, cor2) {
  const c1 = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cor1) ? cor1 : "#C4B5FD";
  const c2 = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(cor2) ? cor2 : "#F9A8D4";
  return `linear-gradient(135deg, ${c1}, ${c2})`;
}

// Para cores de texto/decoração sobre um fundo:
// gradientes usam a primeira cor como base; o resto usa o próprio valor ou o fallback
export function colorFallback(value, fallback = "#7c3aed") {
  if (isGradient(value)) {
    const stops = extractGradientStops(value);
    return stops ? stops.cor1 : fallback;
  }
  return value && typeof value === "string" ? value : fallback;
}