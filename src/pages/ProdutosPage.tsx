import { useEffect, useState } from "react";
import { Package, AlertTriangle, RefreshCw, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/context";
import { listarProdutosOrdenados, zerarEstoqueProduto, zerarTodoEstoque } from "../data";
import type { Product } from "../db";
import { formatarMoeda } from "../lib/format";

export function ProdutosPage() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [confirmarZerar, setConfirmarZerar] = useState<string | null>(null);
  const [zerando, setZerando] = useState(false);

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    (async () => {
      const lista = await listarProdutosOrdenados(user.id);
      if (ativo) setProdutos(lista);
    })();
    return () => {
      ativo = false;
    };
  }, [user]);

  const refreshProdutos = async () => {
    if (!user) return;
    const lista = await listarProdutosOrdenados(user.id);
    setProdutos(lista);
  };

  const baixo = produtos.filter((p) => p.quantity <= p.minQuantity).length;

  return (
    <div className="p-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Produtos</h1>
        <p className="text-sm text-slate-500">{produtos.length} cadastrados</p>
      </header>

      <div className="flex gap-2 mb-4">
        <Link
          to="/novo-produto"
          className="flex-1 bg-primary text-white font-bold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={18} /> Novo Produto
        </Link>
        {produtos.length > 0 && (
          <button
            onClick={async () => {
              if (window.confirm("Zerar todo o estoque? Esta ação não pode ser desfeita.")) {
                setZerando(true);
                await zerarTodoEstoque(user!.id);
                await refreshProdutos();
                setZerando(false);
              }
            }}
            disabled={zerando}
            className="px-3 bg-danger/10 text-danger rounded-xl font-bold text-sm disabled:opacity-50"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-3 mb-4">
        <p className="text-xs font-semibold flex items-center gap-2">
          <AlertTriangle size={15} />
          Cadastro, edição e exclusão completos chegam na próxima etapa (ETAPA 2).
        </p>
      </div>

      {baixo > 0 && (
        <div className="bg-danger/10 text-danger text-sm font-semibold rounded-xl p-3 mb-4">
          🔴 {baixo} produto(s) com estoque baixo
        </div>
      )}

      {produtos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
          Nenhum produto cadastrado ainda.
        </div>
      ) : (
        <ul className="space-y-2">
          {produtos.map((p) => {
            const baixoEstoque = p.quantity <= p.minQuantity;
            const vencendo = p.expiryDate
              ? new Date(p.expiryDate).getTime() < Date.now() + 7 * 86400000
              : false;
            return (
              <li
                key={p.id}
                className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                  <Package size={20} className="text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {p.category} · {formatarMoeda(p.purchasePrice)} →{" "}
                    {formatarMoeda(p.salePrice)}
                    {p.expiryDate && (
                      <span className="ml-1">
                        · Val.: {new Date(p.expiryDate).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-bold ${
                      baixoEstoque ? "text-danger" : "text-slate-800"
                    }`}
                  >
                    {p.quantity} {p.unit}
                    {p.unit !== "unidade" ? "s" : ""}
                  </p>
                  {p.quantity > 0 && (
                    <button
                      onClick={() => setConfirmarZerar(p.id)}
                      className="text-[10px] text-danger hover:text-danger/80 font-semibold"
                    >
                      Zerar
                    </button>
                  )}
                  {baixoEstoque && (
                    <p className="text-[10px] font-bold text-danger">ESTOQUE BAIXO</p>
                  )}
                  {vencendo && !baixoEstoque && (
                    <p className="text-[10px] font-bold text-amber-600">VENCENDO</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {confirmarZerar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-5 mx-4 max-w-sm">
            <h3 className="font-bold mb-2">Zerar estoque?</h3>
            <p className="text-sm text-slate-600 mb-4">
              Esta ação definirá a quantidade de "{produtos.find((p) => p.id === confirmarZerar)?.name}" para zero.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  setZerando(true);
                  await zerarEstoqueProduto(confirmarZerar);
                  await refreshProdutos();
                  setConfirmarZerar(null);
                  setZerando(false);
                }}
                disabled={zerando}
                className="flex-1 bg-danger text-white font-bold py-2 rounded-xl text-sm disabled:opacity-50"
              >
                {zerando ? "Zerando..." : "Zerar"}
              </button>
              <button
                onClick={() => setConfirmarZerar(null)}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-2 rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
