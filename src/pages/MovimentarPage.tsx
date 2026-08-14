import { useEffect, useState } from "react";
import { useAuth } from "../auth/context";
import {
  ArrowLeftRight,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  Camera,
  X,
  CheckCircle,
  Package,
} from "lucide-react";
import { garantirDadosDemo, listarMovimentacoes, listarProdutos, registrarMovimentacao } from "../data";
import type { Movement, Product } from "../db";
import { formatarMoeda, formatarDataHora } from "../lib/format";
import { BarcodeScanner } from "../components/BarcodeScanner";

export function MovimentarPage() {
  const { user } = useAuth();
  const [movs, setMovs] = useState<Movement[]>([]);
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [busca, setBusca] = useState("");
  const [tipoMov, setTipoMov] = useState<"entrada" | "saida">("entrada");
  const [quantidade, setQuantidade] = useState(1);
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [barcodeScan, setBarcodeScan] = useState<string | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Product | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    (async () => {
      await garantirDadosDemo(user.id).catch(() => {});
      const [m, p] = await Promise.all([
        listarMovimentacoes(user.id, 50),
        listarProdutos(user.id),
      ]);
      if (ativo) {
        setMovs(m);
        setProdutos(p);
      }
    })();
    return () => {
      ativo = false;
    };
  }, [user]);

  const nomeDoProduto = (id: string) => produtos.find((p) => p.id === id)?.name ?? "Produto";

  const handleBarcode = (code: string) => {
    setBarcodeScan(code);
    const prod = produtos.find((p) => p.barcode === code) || produtos.find((p) => p.name.toLowerCase().includes(code.toLowerCase()));
    if (prod) {
      setProdutoSelecionado(prod);
      setBusca(prod.name);
    } else {
      setProdutoSelecionado(null);
      setError("Produto com código de barras não encontrado no estoque.");
    }
    setShowScanner(false);
  };

  const registrar = async () => {
    if (!produtoSelecionado) {
      setError("Selecione um produto primeiro.");
      return;
    }
    if (quantidade <= 0) {
      setError("Quantidade deve ser maior que zero.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      await registrarMovimentacao(
        user!.id,
        produtoSelecionado.id,
        tipoMov,
        quantidade,
        tipoMov === "entrada" ? valor : undefined,
        descricao || (tipoMov === "saida" ? "Venda para cliente" : "Compra do fornecedor")
      );

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      setQuantidade(1);
      setValor(0);
      setDescricao("");
      setProdutoSelecionado(null);
      setBarcodeScan(null);

      // Recarregar dados
      (async () => {
        const [m, p] = await Promise.all([
          listarMovimentacoes(user!.id, 50),
          listarProdutos(user!.id),
        ]);
        setMovs(m);
        setProdutos(p);
      })();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar movimentação");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Atualizar valor baseado no tipo e preço do produto
    if (produtoSelecionado) {
      const preco = tipoMov === "saida" ? produtoSelecionado.salePrice : produtoSelecionado.purchasePrice;
      setValor(quantidade * preco);
    }
  }, [produtoSelecionado, quantidade, tipoMov]);

  return (
    <div className="p-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold">Movimentar estoque</h1>
        <p className="text-sm text-slate-500">Entrada e saída com atualização automática</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5">
        {/* Busca por produto */}
        <div className="flex items-center border border-slate-300 rounded-xl p-3 mb-3">
          <Search size={18} className="text-slate-400" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value.trim())}
            placeholder="Buscar produto por nome ou código de barras"
            className="flex-1 p-3 outline-none text-sm bg-transparent"
            disabled={showScanner}
          />
          {showScanner && (
            <button
              onClick={() => setShowScanner(false)}
              className="ml-2 text-sm text-primary"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Resultado do barcode */}
        {barcodeScan && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-3 mb-3 text-center text-sm">
            <p className="font-semibold text-primary mb-1">Código lido: {barcodeScan}</p>
            <p className="text-slate-500">Produto: {produtoSelecionado?.name ?? "Não encontrado"}</p>
          </div>
        )}

        {/* Scanner flutuante */}
        {showScanner && (
          <BarcodeScanner
            onDetected={handleBarcode}
            onClose={() => setShowScanner(false)}
            continuous={false}
          />
        )}

        {/* Seleção de produto manual */}
        {showScanner ? null : (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              disabled={isProcessing}
              onClick={() => setShowScanner(true)}
              className="bg-primary/10 text-primary font-bold rounded-xl py-3 flex items-center justify-center gap-2 text-sm opacity-70">
              <Camera size={18} /> Escanear código
            </button>
            <button
              disabled={isProcessing}
              onClick={() => setBusca("")}
              className="bg-primary/10 text-primary font-bold rounded-xl py-3 flex items-center justify-center gap-2 text-sm opacity-70">
              <Search size={18} /> Buscar manual
            </button>
          </div>
        )}

        {/* Seleção de produto após busca ou scan */}
        {produtoSelecionado && !showScanner && (
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 grid place-items-center shrink-0">
                <Package size={24} className="text-primary" />
              </div>
              <div>
                <p className="font-semibold text-lg truncate">{produtoSelecionado.name}</p>
                <p className="text-[11px] text-slate-400">{produtoSelecionado.category}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <p className="text-xs text-slate-500">Tipo de movimento</p>
                <div className="mt-2 space-y-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="entrada"
                      checked={tipoMov === "entrada"}
                      onChange={() => {
                        setTipoMov("entrada");
                        if (produtoSelecionado) {
                          const preco = produtoSelecionado.purchasePrice;
                          setValor(quantidade * preco);
                        }
                      }}
                      className="rounded border-slate-300 w-5 h-5"
                    />
                    <span>Entrada (Compra)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="saida"
                      checked={tipoMov === "saida"}
                      onChange={() => {
                        setTipoMov("saida");
                        if (produtoSelecionado) {
                          const preco = produtoSelecionado.salePrice;
                          setValor(quantidade * preco);
                        }
                      }}
                      className="rounded border-slate-300 w-5 h-5"
                    />
                    <span>Saída (Venda)</span>
                  </label>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Quantidade</p>
                <input
                  type="number"
                  value={quantidade}
                  onChange={(e) => {
                    const q = Math.max(1, Number(e.target.value));
                    setQuantidade(q);
                    if (produtoSelecionado) {
                      const preco = tipoMov === "entrada" ? produtoSelecionado.purchasePrice : produtoSelecionado.salePrice;
                      setValor(q * preco);
                    }
                  }}
                  min={1}
                  className="w-full border border-slate-300 rounded-xl p-2 outline-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">Unit: {produtoSelecionado.unit}</p>
              </div>
            </div>

            {tipoMov === "saida" && produtoSelecionado && produtoSelecionado.salePrice > 0 && (
              <div>
                <p className="text-xs text-slate-500">Valor estimado</p>
                <p className="font-bold text-lg text-emerald-600">{formatarMoeda(valor)}</p>
              </div>
            )}

            <div>
              <p className="text-xs text-slate-500">Descrição (opcional)</p>
              <input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value.trim())}
                placeholder="Ex: Venda para cliente X, Compra do fornecedor Y..."
                className="w-full border border-slate-300 rounded-xl p-2 outline-none text-sm resize-hg"
                maxLength={100}
              />
            </div>
          </div>
        )}

        {/* Área de ação - aparecer após seleção */}
        {produtoSelecionado && !showScanner && (
          <div className="mt-5 pt-5 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                disabled={isProcessing}
                onClick={registrar}
                className="bg-primary text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2"
              >
                {tipoMov === "entrada" ? (
                  <React.Fragment>
                    <ArrowUpCircle size={20} /> Registrar Compra
                  </React.Fragment>
                ) : (
                  <React.Fragment>
                    <ArrowDownCircle size={20} /> Registrar Venda
                  </React.Fragment>
                )}
              </button>
              <button
                disabled={isProcessing}
                onClick={() => {
                  setProdutoSelecionado(null);
                  setBusca("");
                  setBarcodeScan(null);
                  setError(null);
                  setSuccess(false);
                }}
                className="bg-slate-200 text-slate-600 font-bold rounded-xl py-3 flex items-center justify-center gap-2"
              >
                {/* Botão limpar já está acima */}
              </button>
              <button
                disabled={isProcessing}
                onClick={() => {
                  setProdutoSelecionado(null);
                  setBusca("");
                  setBarcodeScan(null);
                  setError(null);
                  setSuccess(false);
                }}
                className="bg-slate-200 text-slate-600 font-bold rounded-xl py-3 flex items-center justify-center gap-2"
              >
                Limpar
              </button>
            </div>

            {isProcessing && (
              <div className="bg-primary/20 text-primary rounded-2xl p-3 mb-3">
                <p>Processando movimentação...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-100 text-red-800 rounded-2xl p-3 mb-3 animate-shake">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-100 text-green-800 rounded-2xl p-3 mb-3">
                <CheckCircle size={20} className="mb-1" />
                <span>Movimentação registrada com sucesso!</span>
              </div>
            )}
          </div>
        )}

        {/* Histórico */}
        <h2 className="font-semibold text-slate-700 mb-2">Últimas movimentações</h2>
        {movs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-400 text-sm">
            Nenhuma movimentação ainda.
          </div>
        ) : (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {movs.slice(0, 15).map((m) => {
              const entrada = m.type === "entrada";
              const prod = produtos.find((p) => p.id === m.productId);
              return (
                <li key={m.id} className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${
                      entrada ? "bg-primary/10" : "bg-danger/10"
                    }`}
                  >
                    {entrada ? (
                      <ArrowUpCircle size={20} className="text-primary" />
                    ) : (
                      <ArrowDownCircle size={20} className="text-danger" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm truncate">{nomeDoProduto(m.productId)}</p>
                    <p className="text-[11px] text-slate-400">
                      {entrada ? "Compra" : "Venda"} · {formatarDataHora(m.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-bold text-sm ${entrada ? "text-primary" : "text-danger"}`}>
                      {entrada ? "+" : "−"}
                      {m.quantity} {prod?.unit ?? "un"} {prod?.unit !== "unidade" ? "s" : ""}
                    </p>
                    {m.value !== undefined && (
                      <p className="text-[11px] text-slate-400">{formatarMoeda(m.value)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      </div>
  );
}