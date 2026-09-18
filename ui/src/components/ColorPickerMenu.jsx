import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Palette, Rainbow, Check } from "lucide-react";
import {
  COLOR_PALETTE,
  isGradient,
  gradientSwatchBackground,
} from "./colorPalette";
import CustomGradientBuilder from "./CustomGradientBuilder";
import "./ColorPickerMenu.css";

// "Personalizado" = valor que NÃO está na paleta fixa (ex.: hex escolhido à mão)
function isCustomValue(value) {
  return value != null && value !== "" && !COLOR_PALETTE.some((c) => c.value === value);
}

// Menu flutuante de seleção de cor (paleta + gradiente personalizado).
// Usa createPortal para renderizar o popover fora da árvore do componente,
// evitando conflito com CSS pai (overflow, z-index, transform...).
export default function ColorPickerMenu({ value, onChange, title = "Mudar cor" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null); // Posição fixa do popover (top/left)
  const custom = isCustomValue(value);

  const close = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  // Abre o menu ancorado no botão que o chamou, mantendo-o dentro da viewport
  const openMenu = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 248;
    const left = Math.min(
      Math.max(8, rect.left),
      window.innerWidth - width - 8
    );
    setPos({ top: rect.bottom + 8, left });
    setOpen(true);
  };

  // Fecha o menu ao rolar a página ou redimensionar a janela (posição fixa desatualiza)
  useEffect(() => {
    if (!open) return;
    const fechar = () => close();
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [open, close]);

  const apply = (v) => {
    onChange(v);
  };

  return (
    <>
      <button
        type="button"
        className="cp-trigger"
        onClick={openMenu}
        title={title}
        // Fundo do botão mostra a cor atual (gradientes viram background direto)
        style={{ background: gradientSwatchBackground(value) || (value && !isGradient(value) ? value : undefined) }}
        aria-label={title}
      >
        <Palette size={13} />
      </button>

      {open &&
        createPortal(
          <>
            {/* Backdrop transparente: clicar fora fecha o menu */}
            <div className="cp-backdrop" onClick={close} />
            <div className="cp-popover" style={{ top: pos?.top, left: pos?.left }}>
              <div className="cp-header">
                <Rainbow size={14} />
                <span>Cor da tarefa</span>
              </div>

              {/* Grade de swatches da paleta fixa */}
              <div className="cp-swatches">
                {COLOR_PALETTE.map((c) => {
                  const active = value === c.value;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`cp-swatch ${active ? "cp-swatch--active" : ""}`}
                      style={{ background: c.value }}
                      onClick={() => apply(c.value)}
                      title={c.label}
                    >
                      {active && <Check size={12} />}
                    </button>
                  );
                })}
              </div>

              {/* Seção de cor personalizada (gradiente), expandida quando ativa */}
              <div className={`cp-custom ${custom ? "cp-custom--active" : ""}`}>
                <button
                  type="button"
                  className="cp-custom-toggle"
                  onClick={() => {
                    if (!custom) {
                      apply("#C4B5FD");
                    }
                  }}
                >
                  <span className="cp-custom-chip">
                    <span className="cp-custom-chip-a" />
                    <span className="cp-custom-chip-b" />
                  </span>
                  Personalizado
                </button>

                {custom && (
                  <div className="cp-custom-body">
                    <CustomGradientBuilder value={value} onApply={apply} />
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
