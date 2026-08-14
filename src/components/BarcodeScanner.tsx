// Escâner de código de barras pela câmera.
// Prioriza a API nativa BarcodeDetector (Chrome Android) e, quando indisponível,
// usa @zxing/browser. Também permite escanear a partir de uma foto (para testes
// no desktop ou fotos de código de barras).
import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  BarcodeFormat,
  type IScannerControls,
} from "@zxing/browser";
import { CameraOff, Upload, X } from "lucide-react";

const FORMATOS_ZXING = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODABAR,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
];

const FORMATOS_NATIVOS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "codabar",
  "itf",
  "qr_code",
];

interface ResultadoDetector {
  rawValue: string;
}
type DetectorLike = { detect(el: HTMLVideoElement): Promise<ResultadoDetector[]> };
type DetectorCtor = new (opts: { formats: string[] }) => DetectorLike;

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
  /** Quando true, não fecha após a primeira leitura (ex: modo balcão). */
  continuous?: boolean;
}

export function BarcodeScanner({
  onDetected,
  onClose,
  continuous = false,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<"iniciando" | "ativo" | "erro">("iniciando");
  const [erro, setErro] = useState<string | null>(null);
  const [msgFoto, setMsgFoto] = useState<string | null>(null);

  const ativoRef = useRef(true);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxControlsRef = useRef<IScannerControls | null>(null);
  const ultimoValorRef = useRef("");
  const ultimoTempoRef = useRef(0);

  const feedback = () => {
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(80);
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = 1400;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      osc.onended = () => void ctx.close();
    } catch {
      // áudio indisponível — ignora
    }
  };

  const handleDetected = (valor: string) => {
    const agora = Date.now();
    if (valor === ultimoValorRef.current && agora - ultimoTempoRef.current < 1500) return;
    ultimoValorRef.current = valor;
    ultimoTempoRef.current = agora;
    feedback();
    onDetected(valor);
    if (!continuous) {
      parar();
      onClose();
    }
  };

  function parar() {
    ativoRef.current = false;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    zxControlsRef.current?.stop();
    zxControlsRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
  }

  const iniciarNativo = async (video: HTMLVideoElement) => {
    const DetectorCtor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!DetectorCtor) throw new Error("BarcodeDetector indisponível");
    const detector = new DetectorCtor({ formats: FORMATOS_NATIVOS });
    const loop = async () => {
      if (!ativoRef.current) return;
      try {
        const codes = await detector.detect(video);
        if (codes.length > 0 && codes[0].rawValue) {
          handleDetected(codes[0].rawValue);
        }
      } catch {
        // frame sem código — continua
      }
      rafRef.current = requestAnimationFrame(() => void loop());
    };
    rafRef.current = requestAnimationFrame(() => void loop());
  };

  const iniciarZxing = async (video: HTMLVideoElement) => {
    const reader = new BrowserMultiFormatReader(undefined, {
      delayBetweenScanAttempts: 300,
      delayBetweenScanSuccess: 800,
    });
    reader.possibleFormats = FORMATOS_ZXING;
    const controls = await reader.decodeFromConstraints(
      { video: { facingMode: { ideal: "environment" } }, audio: false },
      video,
      (result) => {
        if (result) handleDetected(result.getText());
      }
    );
    zxControlsRef.current = controls;
  };

  const decodificarImagem = async (file: File) => {
    const url = URL.createObjectURL(file);
    try {
      const reader = new BrowserMultiFormatReader(undefined, {});
      reader.possibleFormats = FORMATOS_ZXING;
      const resultado = await reader.decodeFromImageUrl(url);
      handleDetected(resultado.getText());
    } catch {
      setMsgFoto("Não consegui ler o código dessa foto. Tente outra.");
      setTimeout(() => setMsgFoto(null), 3000);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const video = videoRef.current;
        if (!video) throw new Error("Sem elemento de vídeo.");
        const DetectorCtor = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        if (DetectorCtor) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
            audio: false,
          });
          if (cancelado) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          streamRef.current = stream;
          video.srcObject = stream;
          await video.play();
          if (cancelado) return;
          setEstado("ativo");
          await iniciarNativo(video);
        } else {
          setEstado("ativo");
          await iniciarZxing(video);
        }
      } catch (e) {
        if (!cancelado) {
          setEstado("erro");
          setErro(e instanceof Error ? e.message : "Não foi possível acessar a câmera.");
        }
      }
    })();
    return () => {
      cancelado = true;
      parar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="relative flex-1 max-w-md mx-auto w-full">
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {estado === "iniciando" && (
          <div className="absolute inset-0 grid place-items-center text-white/80 text-sm">
            Abrindo câmera...
          </div>
        )}

        {/* moldura de leitura */}
        {estado !== "erro" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-40 border-4 border-white/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
          </div>
        )}

        {estado === "erro" && (
          <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <CameraOff size={40} className="text-white/70" />
            <p className="text-white font-semibold">Não foi possível abrir a câmera</p>
            <p className="text-white/60 text-sm">{erro}</p>
            <p className="text-white/60 text-xs">
              Use HTTPS ou localhost para acessar a câmera. Você também pode escanear
              por foto abaixo.
            </p>
          </div>
        )}
      </div>

      <div className="bg-black/80 max-w-md mx-auto w-full px-5 pt-4 pb-6 text-center">
        <p className="text-white text-sm mb-3">Aponte a câmera para o código de barras</p>
        {msgFoto && <p className="text-red-400 text-xs mb-2">{msgFoto}</p>}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 bg-white/15 text-white font-semibold rounded-xl px-4 py-2.5 text-sm"
          >
            <Upload size={16} /> Enviar foto
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-2 bg-danger text-white font-semibold rounded-xl px-4 py-2.5 text-sm"
          >
            <X size={16} /> Cancelar
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void decodificarImagem(f);
          }}
        />
      </div>
    </div>
  );
}
