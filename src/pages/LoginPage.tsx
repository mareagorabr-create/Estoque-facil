import { useState } from "react";
import { MessageCircle, Phone, Package, ShieldCheck } from "lucide-react";
import { useAuth } from "../auth/context";

export function LoginPage() {
  const { step, mockCode, requestCode, verifyCode, register } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const enviarCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await requestCode(phone);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro");
    } finally {
      setEnviando(false);
    }
  };

  const verificar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    const ok = await verifyCode(code);
    if (!ok) setErro("Código incorreto. Tente novamente.");
  };

  const cadastrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!name.trim() || !storeName.trim()) {
      setErro("Preencha seu nome e o nome da loja.");
      return;
    }
    await register(name, storeName, email);
  };

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center p-6 text-white">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-white/15 grid place-items-center">
            <Package size={26} />
          </div>
          <h1 className="text-2xl font-bold">
            Estoque <span className="text-white/70">Fácil</span>
          </h1>
        </div>
        <p className="text-white/80 text-sm mb-8">
          Controle de estoque simples: cadastre, movimente e receba alertas do que
          vai faltar.
        </p>

        {step === "phone" && (
          <form onSubmit={enviarCodigo} className="bg-white rounded-2xl p-5 text-slate-900">
            <label className="text-sm font-semibold block mb-2">Seu telefone</label>
            <div className="flex items-center border border-slate-300 rounded-xl px-3 mb-3">
              <MessageCircle size={18} className="text-slate-400" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                inputMode="tel"
                className="flex-1 p-3 outline-none text-sm"
              />
            </div>
            {erro && <p className="text-red-500 text-xs mb-2">{erro}</p>}
            <button
              disabled={enviando}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Enviar código de verificação"}
            </button>
            <p className="text-[11px] text-slate-400 mt-3 text-center">
              Enviaremos um código por SMS/WhatsApp. Seu estoque fica salvo no
              aparelho e funciona sem internet.
            </p>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={verificar} className="bg-white rounded-2xl p-5 text-slate-900">
            <label className="text-sm font-semibold block mb-2">Código de verificação</label>
            {/* MOCK: em produção o código chega por SMS/WhatsApp */}
            <div className="text-xs bg-amber-50 border border-amber-300 text-amber-800 rounded-lg p-2 mb-3 text-center">
              Modo prévia — seu código é: <strong>{mockCode}</strong>
            </div>
            <div className="flex items-center border border-slate-300 rounded-xl px-3 mb-3">
              <Phone size={18} className="text-slate-400" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="0000"
                inputMode="numeric"
                maxLength={4}
                className="flex-1 p-3 outline-none text-sm tracking-[0.4em]"
              />
            </div>
            {erro && <p className="text-red-500 text-xs mb-2">{erro}</p>}
            <button className="w-full bg-primary text-white font-semibold py-3 rounded-xl">
              Verificar
            </button>
            <button
              type="button"
              onClick={() => requestCode(phone)}
              className="w-full text-center text-xs text-slate-500 mt-3 font-semibold"
            >
              Reenviar código
            </button>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              Esqueceu o acesso? Entre com o mesmo número e solicite um novo código.
            </p>
          </form>
        )}

        {step === "register" && (
          <form onSubmit={cadastrar} className="bg-white rounded-2xl p-5 text-slate-900 space-y-3">
            <p className="text-sm font-semibold">Quase lá! Complete seu cadastro</p>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
            />
            <input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Nome da loja"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-mail (opcional)"
              type="email"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
            />
            {erro && <p className="text-red-500 text-xs">{erro}</p>}
            <button className="w-full bg-primary text-white font-semibold py-3 rounded-xl">
              Começar 30 dias grátis
            </button>
            <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-center">
              <ShieldCheck size={13} /> Seus dados ficam criptografados e só seus.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
