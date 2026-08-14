import { useEffect, useState } from "react";
import { Package, AlertTriangle } from "lucide-react";
import { useAuth } from "../auth/context";
import { listarProdutosOrdenados } from "../data";
import type { Product } from "../db";
import { formatarMoeda } from "../lib/format";

export function ProdutosPage() {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState<Product[]>([]);

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

  const baixo = produtos.filter((p) => p.quantity <= p.minQuantity).length;

  return (
    <div className="p-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Produtos</h1>
        <p className="text-sm text-slate-500">{produtos.length} cadastrados</p>
      </header>

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
    </div>
  );
}
