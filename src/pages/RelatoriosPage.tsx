import { useEffect, useState } from "react";
import { BarChart3, CircleDollarSign, PackageX, ShoppingCart, Clipboard, Download, Settings } from "lucide-react";
import { useAuth } from "../auth/context";
import {
  garantirDadosDemo,
  getDashboardStats,
  getProdutosParados,
  preverCompras,
  type DashboardStats,
  type PrevisaoCompra,
} from "../data";
import type { Product } from "../db";
import { formatarMoeda } from "../lib/format";

export function RelatoriosPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [parados, setParados] = useState<Product[]>([]);
  const [previsao, setPrevisao] = useState<PrevisaoCompra[]>([]);

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    (async () => {
      await garantirDadosDemo(user.id).catch(() => {});
      const [s, par, prev] = await Promise.all([
        getDashboardStats(user.id),
        getProdutosParados(user.id, 30),
        preverCompras(user.id),
      ]);
      if (ativo) {
        setStats(s);
        setParados(par);
        setPrevisao(prev.slice(0, 10));
      }
    })();
    return () => {
      ativo = false;
    };
  }, [user]);

  const maxVenda = stats?.topVendidos[0]?.quantidade ?? 1;

  return (
    <div className="p-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Relatórios</h1>
        <p className="text-sm text-slate-500">
          Análises baseadas nos dados da sua loja
        </p>
      </header>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 mb-4">
        <p className="text-xs font-semibold flex items-center gap-2">
          <BarChart3 size={15} /> Exportação em PDF/WhatsApp e gráficos avançados
        </p>
      </div>

      {/* Resumo executivo */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CircleDollarSign size={18} className="text-emerald-600" />
            <span className="font-semibold text-sm text-slate-700">Valor do Estoque</span>
          </div>
          <p className="text-3xl font-bold">{stats ? formatarMoeda(stats.valorEstoque) : "—"}</p>
          <p className="text-xs text-slate-500">Soma do custo × quantidade de todos produtos</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package size={18} className="text-primary" />
            <span className="font-semibold text-sm text-slate-700">Total de Produtos</span>
          </div>
          <p className="text-2xl font-bold">{stats ? stats.totalProdutos : "—"}</p>
          <p className="text-xs text-slate-500">Número de itens diferentes em estoque</p>
        </div>
      </div>

      {/* Top vendidos com progresso */}
      <h2 className="font-semibold text-slate-700 mb-2">Mais vendidos do mês</h2>
      {stats && stats.topVendidos.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {stats.topVendidos.slice(0, 10).map((v, idx) => (
              <li key={v.produto.id} className="flex items-center justify-between py-3 px-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full grid place-items-center text-xs font-bold ${
                      idx === 0 ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{v.produto.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {v.quantidade} {v.produto.unit === "unidade" ? "" : v.produto.unit}
                      {v.produto.unit !== "unidade" && "s"}
                    </p>
                  </div>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden" style={{ width: "100%" }}>
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.round((v.quantidade / maxVenda) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
          <p className="text-lg">Sem vendas registradas neste mês.</p>
        </div>
      )

      {/* Previsão de compra */}
      <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <ShoppingCart size={18} className="text-primary" /> Previsão de Compra
      </h2>
      {previsao.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          {previsao.map((v) => (
            <div key={v.produto.id} className="p-3 flex items-center justify-between border-b border-slate-100 last:border-0">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{v.produto.name}</p>
                <p className="text-[10px] text-slate-400">
                  vende ~{v.mediaSemanal.toFixed(0)}/sem · estoque atual {v.estoqueAtual}
                </p>
              </div>
              <span className="bg-primary/10 text-primary font-bold text-sm rounded-lg px-2.5 py-1">
                +{v.sugerido}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 text-slate-400">
          <p>Sem dados suficientes para sugerir compras ainda.</p>
        </div>
      )

      {/* Produtos parados */}
      <h2 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <PackageX size={18} className="text-warning" /> Parados há mais de 30 dias
      </h2>
      {parados.length > 0 ? (
        <ul className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100">
          {parados.map((p) => (
            <li key={p.id} className="p-3 flex items-center justify-between">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-[10px] text-slate-400 shrink-0">
                {p.quantity} {p.unit}s sem saída
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400">
          <p>Nenhum produto parado nos últimos 30 dias.</p>
        </div>
      )

      {/* Ações de exportação */}
      <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-200">
        <h3 className="font-semibold text-slate-700 mb-3">Exportar Dados</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            className="w-full bg-primary text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <Download size={16} /> CSV (Planilha)
          </button>
          <button
            className="w-full bg-emerald-600 text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2"
          >
            <Clipboard size={16} /> PDF Resumo
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Dados incluem: produtos, movimentações, valor do estoque e alertas.
        </p>
      </div>
    </div>
  );
}