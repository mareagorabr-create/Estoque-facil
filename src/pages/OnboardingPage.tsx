import { useState } from "react";
import { PackagePlus, ArrowLeftRight, BellRing } from "lucide-react";

interface Props {
  onDone: () => void;
}

const SLIDES = [
  {
    Icon: PackagePlus,
    titulo: "Cadastre seus produtos",
    texto:
      "Nome, código de barras, preços e validade. Em poucos toques sua loja inteira fica no aplicativo.",
  },
  {
    Icon: ArrowLeftRight,
    titulo: "Movimente o estoque",
    texto:
      "Registre vendas e compras com um toque. O estoque se atualiza sozinho, na hora.",
  },
  {
    Icon: BellRing,
    titulo: "Receba alertas e preveja",
    texto:
      "Avisos de estoque baixo, produtos vencendo e previsão do que comprar. Sem papel, sem susto.",
  },
];

export function OnboardingPage({ onDone }: Props) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const ultimo = i === SLIDES.length - 1;
  const Icon = slide.Icon;

  return (
    <div className="min-h-screen bg-white flex flex-col px-8 py-10 max-w-md mx-auto">
      <button
        onClick={onDone}
        className="self-end text-sm font-semibold text-slate-400"
      >
        Pular
      </button>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
        <div className="w-28 h-28 rounded-3xl bg-primary/10 grid place-items-center">
          <Icon size={56} className="text-primary" strokeWidth={1.8} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{slide.titulo}</h1>
          <p className="text-slate-500 leading-relaxed">{slide.texto}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-8">
        {SLIDES.map((_, idx) => (
          <span
            key={idx}
            className={`h-2 rounded-full transition-all ${
              idx === i ? "w-6 bg-primary" : "w-2 bg-slate-200"
            }`}
          />
        ))}
      </div>

      <div className="flex gap-3">
        {i > 0 && (
          <button
            onClick={() => setI((v) => v - 1)}
            className="flex-1 border border-slate-200 rounded-2xl py-4 font-bold text-slate-600"
          >
            Voltar
          </button>
        )}
        <button
          onClick={() => (ultimo ? onDone() : setI((v) => v + 1))}
          className="flex-1 bg-primary text-white rounded-2xl py-4 font-bold"
        >
          {ultimo ? "Começar a usar" : "Avançar"}
        </button>
      </div>
    </div>
  );
}
