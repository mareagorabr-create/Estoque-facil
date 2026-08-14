// Utilitários de formato e imagem. Funções puras/testáveis.

/** Formata número p/ pt-BR (moeda ou data). */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Extrai os dígitos de um número de telefone/whatsapp. */
export function soDigitos(s: string): string {
  return s.replace(/\D/g, "");
}

/** Converte um número de WhatsApp brasileiro em formato wa.me (código 55). */
export function whatsappLink(numero: string, texto?: string): string {
  const base = soDigitos(numero);
  const com55 = base.startsWith("55") ? base : `55${base}`;
  const url = `https://wa.me/${com55}`;
  return texto ? `${url}?text=${encodeURIComponent(texto)}` : url;
}

/**
 * Comprime uma imagem para no máx. `maxWidth` px e qualidade `quality` (0-1),
 * retornando uma data URL. Usa canvas; fallback para o original se falhar.
 */
export function comprimirImagem(
  file: File,
  maxWidth = 800,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const escala = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * escala);
        const h = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(url);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch {
        resolve(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível ler a imagem"));
    };
    img.src = url;
  });
}

/** Gera um id simples (fallback caso crypto.randomUUID não exista). */
export function novoId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Aplica recorte + rotação + brilho numa data URL de imagem, via canvas,
 * e devolve uma nova data URL JPEG. Máx 800px.
 */
export function editarImagem(
  dataUrl: string,
  opts: { crop?: CropRect; rotation?: number; brightness?: number }
): Promise<string> {
  const { crop, rotation = 0, brightness = 0 } = opts;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const rad = (((rotation % 360) + 360) % 360) * (Math.PI / 180);
        const troca = rotation % 180 !== 0;

        // região de origem (recorte) em px da imagem original
        const srcX = crop ? crop.x : 0;
        const srcY = crop ? crop.y : 0;
        const srcW = crop ? crop.width : img.width;
        const srcH = crop ? crop.height : img.height;

        // dimensões da saída (troca se girar 90/270)
        const outW = troca ? srcH : srcW;
        const outH = troca ? srcW : srcH;
        const escala = Math.min(1, 800 / Math.max(outW, outH));
        const w = Math.round(outW * escala);
        const h = Math.round(outH * escala);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(dataUrl);

        if (brightness !== 0) ctx.filter = `brightness(${100 + brightness}%)`;

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, srcX, srcY, srcW, srcH, -w / 2, -h / 2, w, h);
        ctx.restore();

        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => reject(new Error("Não foi possível editar a imagem"));
    img.src = dataUrl;
  });
}

/** Carrega uma data URL em um elemento <img> (para o crop tool medir). */
export function carregarImagem(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = dataUrl;
  });
}
