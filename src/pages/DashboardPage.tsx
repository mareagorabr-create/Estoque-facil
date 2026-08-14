import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Package,
  CircleDollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  Bell,
} from "lucide-react";
import { useAuth } from "../auth/context";
import {
  garantirDadosDemo,
  getDashboardStats,
  gerarAlertas,
  preverCompras,
  type DashboardStats,
  type Alert,
  type PrevisaoCompra,
} from "../data";
import { formatarMoeda } from "../lib/format";

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [previsao, setPrevisao] = useState<PrevisaoCompra[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState(0);
  const comEstoqueBaixo = alerts.filter((a) => a.type === "baixo_estoque" && !a.read).length;
  const vencendo = alerts.filter((a) => a.type === "vencendo" && !a.read).length;
  const vencidos = alerts.filter((a) => a.type === "vencido" && !a.read).length;

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    (async () => {
      await garantirDadosDemo(user.id).catch(() => {});
      const [s, p, alerts] = await Promise.all([
        getDashboardStats(user.id),
        preverCompras(user.id),
        gerarAlertas(user.id),
      ]);
      if (ativo) {
        setStats(s);
        setPrevisao(p.slice(0, 3));
        setAlerts(alerts);
        const comEstoqueBaixo = alerts.filter(
          (a) => a.type === "baixo_estoque" && !a.read
        ).length;
        const vencendo = alerts.filter(
          (a) => a.type === "vencendo" && !a.read
        ).length;
        const vencidos = alerts.filter(
          (a) => a.type === "vencido" && !a.read
        ).length;
        setUnreadAlertsCount(comEstoqueBaixo + vencendo + vencidos);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="p-5">
      <header className="mb-5">
        <h1 className="text-xl font-bold">
          Olá, {user.name.split(" ")[0]}!👋
        </h1>
        <p className="text-sm text-slate-500">
          Sua loja: {user.storeName}
        </p>
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-slate-500" />
          <span className="text-xs font-bold">
            {unreadAlertsCount > 0 ? "text-danger" : "text-slate-400"}{unreadAlertsCount}
          </span>
        </div>
      </header>

      {/* Ações rápidas */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link
          to="/movimentar"
          className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 active:scale-[0.98] transition"
        >
          <div className="w-11 h-11 rounded-xl bg-danger/10 grid place-items-center">
            <ArrowDownCircle size={22} className="text-danger" />
          </div>
          <div>
            <p className="font-bold text-sm">Registrar venda</p>
            <p className="text-[11px] text-slate-400">saída de estoque</p>
          </div>
        </Link>
        <Link
          to="/movimentar"
          className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3 active:scale-[0.98] transition"
        >
          <div className="w-11 h-11 rounded-xl bg-primary/10 grid place-items-center">
            <ArrowUpCircle size={22} className="text-primary" />
          </div>
          <div>
            <p className="font-bold text-sm">Registrar compra</p>
            <p className="text-[11px] text-slate-400">entrada de estoque</p>
          </div>
        </Link>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 grid place-items-center mb-2">
            <Package size={20} className="text-primary" />
          </div>
          <p className="text-2xl font-bold leading-none">
            {stats ? stats.totalProdutos : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Produtos em estoque</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 grid place-items-center mb-2">
            <CircleDollarSign size={20} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold leading-none">
            {stats ? formatarMoeda(stats.valorEstoque) : "—"}
          </p>
          <p className="text-xs text-slate-500 mt-1">Valor investido no estoque</p>
        </div>
      </div>

      {/* Alertas críticos */}
      <h2 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
        <AlertTriangle size={18} className="text-warning" /> Alertas
      </h2>
      <div className="space-y-2 mb-5">
        {comEstoqueBaixo > 0 && (
          <Link
            to="/produtos"
            className="flex items-center gap-3 bg-danger/10 border border-danger/20 text-danger rounded-2xl p-3 active:scale-[0.98] transition"
          >
            <span className="text-lg">🔴</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{comEstoqueBaixo} produtos com estoque baixo</p>
              <p className="text-xs opacity-80">Toque para ver e comprar mais</p>
            </div>
          </Link>
        )}
        {vencendo > 0 && (
          <Link
            to="/produtos"
            className="flex items-center gap-3 bg-warning/10 border border-warning/20 text-amber-700 rounded-2xl p-3 active:scale-[0.98] transition"
          >
            <span className="text-lg">🟡</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{vencendo} produtos próximos do vencimento</p>
              <p className="text-xs opacity-80">Toque para ver as validades</p>
            </div>
          </Link>
        )}
        {vencidos > 0 && (
          <Link
            to="/produtos"
            className="flex items-center gap-3 bg-danger text-white rounded-2xl p-3 active:scale-[0.98] transition"
          >
            <span className="text-lg">❌</span>
            <div className="flex-1">
              <p className="font-bold text-sm">{vencidos} produtos VENCERAM!</p>
              <p className="text-xs opacity-90">Remova do estoque</p>
            </div>
          </Link>
        )}
        {comEstoqueBaixo === 0 && vencendo === 0 && vencidos === 0 && (
          <div className="flex items-center gap-3 bg-success/10 text-green-700 rounded-2xl p-3">
            <CheckCircle2 size={20} />
            <p className="font-semibold text-sm">Tudo em dia — nenhum alerta no momento.</p>
          </div>
        )}
        {!stats && (
          <div className="h-14 rounded-2xl bg-white border border-slate-100 animate-pulse" />
        )}
      </div>

      {/* Mais vendidos do mês */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-slate-700 flex items-center gap-2">
          <TrendingUp size={18} className="text-primary" /> Mais vendidos do mês
        </h2>
        <Link to="/relatorios" className="text-sm font-semibold text-primary">
          Ver relatórios
        </Link>
      </div>
      {stats && stats.topVendidos.length > 0 ? (
        <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {stats.topVendidos.map((v, idx) => (
            <li key={v.produto.id} className="flex items-center gap-3 p-3">
              <span
                className={
                  idx === 0
                    ? "w-7 h-7 rounded-full grid place-items-center text-xs font-bold bg-primary text-white"
                    : "w-7 h-7 rounded-full grid place-items-center text-xs font-bold bg-slate-100 text-slate-500"
                }
              >
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{v.produto.name}</p>
                <p className="text-[11px] text-slate-400">
                  {v.quantidade} {v.produto.unit}s vendidos
                </p>
              </div>
              <p className="font-bold text-sm text-emerald-600">{formatarMoeda(v.valor)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
          Sem vendas neste mês ainda.
        </div>
      )}

      {/* Previsão de compra */}
      <h2 className="font-semibold text-slate-700 mb-2 mt-6 flex items-center gap-2">
        <ShoppingCart size={18} className="text-primary" /> Previsão de compra
      </h2>
      {previsao.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-1">
          <p className="text-xs text-slate-500 mb-3">
            Com base nas vendas das últimas 4 semanas, sugestão de reposição:
          </p>
          <ul className="space-y-2">
            {previsao.map((v) => (
              <li key={v.produto.id} className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="font-semibold text-sm truncate">{v.produto.name}</p>
                  <p className="text-[11px] text-slate-400">
                    vende ~{v.mediaSemanal.toFixed(0)}/sem · tem {v.estoqueAtual}
                  </p>
                </div>
                <span className="bg-primary/10 text-primary font-bold text-sm rounded-lg px-2.5 py-1 shrink-0">
                  comprar {v.sugerido}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-slate-400 text-sm">
          Sem dados suficientes para sugerir compras ainda.
        </div>
      )}

      {/* Botão flutuante: Adicionar Produto */}
      <div className="fixed inset-x-0 bottom-20 z-10 max-w-md mx-auto px-4 flex justify-end">
        <Link
          to="/produtos"
          className="flex items-center gap-2 bg-primary text-white font-bold rounded-full py-3.5 pl-4 pr-5 shadow-lg shadow-primary/40 active:scale-95 transition"
        >
          <Plus size={22} strokeWidth={2.6} />
          Adicionar Produto
        </Link>
      </div>
    </div>
  );
}