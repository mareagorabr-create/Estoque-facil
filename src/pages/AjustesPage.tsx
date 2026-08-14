import { useEffect, useState } from "react";
import { LogOut, Store, User as UserIcon, MessageCircleHeart, RefreshCw } from "lucide-react";
import { useAuth } from "../auth/context";
import { processarFilaSync } from "../data";
import { db } from "../db";
import { whatsappLink } from "../lib/format";

// Número para receber sugestões (trocar pelo número real em produção).
const NUMERO_SUGESTOES = "5511999990000";

export function AjustesPage() {
  const { user, logout } = useAuth();
  const [planInfo, setPlanInfo] = useState<{ planStatus: string; trialEnd?: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    (async () => {
      const u = await db.users.get(user.id);
      if (ativo && u) {
        setPlanInfo({ planStatus: u.planStatus, trialEnd: u.trialEnd });
      }
    })();
    return () => {
      ativo = false;
    };
  }, [user]);

  const diasRestantes = planInfo?.trialEnd
    ? Math.max(0, Math.ceil((new Date(planInfo.trialEnd).getTime() - Date.now()) / 86400000))
    : 0;

  const sincronizar = async () => {
    setSincronizando(true);
    const n = await processarFilaSync();
    setMsg(`Sincronização concluída (${n} item(ns) processado(s)).`);
    setTimeout(() => setMsg(null), 3000);
    setSincronizando(false);
  };

  return (
    <div className="p-5 space-y-5">
      <h1 className="text-xl font-bold">Ajustes</h1>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-slate-700">
          <UserIcon size={18} className="text-primary" /> Perfil
        </h2>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full bg-primary text-white grid place-items-center font-bold">
            {user?.name[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <Store size={13} /> {user?.storeName}
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400">Telefone: {user?.phone}</p>
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3 text-slate-700">Plano</h2>
        {planInfo ? (
          <div className="text-sm">
            <p>
              Plano:{" "}
              <span className="font-semibold">
                {planInfo.planStatus === "active" ? "Ativo" : "Grátis (trial)"}
              </span>
            </p>
            <p className="text-slate-500">{diasRestantes} dia(s) restantes no teste grátis.</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Carregando...</p>
        )}
      </section>

      <section className="bg-white rounded-2xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-2 text-slate-700">Dados offline</h2>
        <p className="text-xs text-slate-500 mb-3">
          Tudo que você registra fica salvo no aparelho. Quando a internet volta,
          sincronizamos automaticamente com a nuvem (Firebase).
        </p>
        <button
          onClick={sincronizar}
          disabled={sincronizando}
          className="w-full border border-slate-300 rounded-xl py-3 text-sm font-semibold text-slate-600 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={sincronizando ? "animate-spin" : ""} />
          Sincronizar agora
        </button>
        {msg && <p className="text-xs text-success mt-2">{msg}</p>}
      </section>

      <a
        href={whatsappLink(NUMERO_SUGESTOES, "Olá! Tenho uma sugestão para o app Estoque Fácil: ")}
        target="_blank"
        rel="noreferrer"
        className="block bg-white rounded-2xl border border-slate-200 p-4"
      >
        <h2 className="font-semibold mb-1 text-slate-700 flex items-center gap-2">
          <MessageCircleHeart size={18} className="text-primary" /> Sugestões
        </h2>
        <p className="text-xs text-slate-500">
          Quer melhorar o app? Fale com a gente pelo WhatsApp.
        </p>
      </a>

      <button
        onClick={logout}
        className="w-full bg-red-50 text-red-500 font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
      >
        <LogOut size={18} /> Sair
      </button>
    </div>
  );
}
