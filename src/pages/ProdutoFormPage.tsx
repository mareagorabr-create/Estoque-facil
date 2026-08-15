import { useState, useEffect, useRef } from "react";
import { CheckCircle, Image, ScanLine, Search, Loader2 } from "lucide-react";
import { db, uid } from "../db";
import { useAuth } from "../auth/context";
import { listarFornecedores } from "../data";
import { BarcodeScanner } from "../components/BarcodeScanner";

interface FormData {
  name: string;
  barcode?: string;
  category: string;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  salePrice: number;
  unit: string;
  expiryDate?: string;
  photo?: string;
  supplierId?: string;
  supplierName?: string;
}

interface BarcodeData {
  name?: string;
  category?: string;
  photo?: string;
  unit?: string;
}

async function buscarDadosBarcode(codigo: string): Promise<BarcodeData | null> {
  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(codigo)}.json`
    );
    const json = (await res.json()) as {
      status?: number;
      product?: {
        product_name_pt?: string;
        product_name?: string;
        generic_name_pt?: string;
        generic_name?: string;
        image_front_url?: string;
        image_url?: string;
        categories_tags?: string[];
        quantity?: string;
      };
    };
    if (!json.product) return null;
    const p = json.product;
    const name = p.product_name_pt || p.product_name || p.generic_name_pt || p.generic_name || "";
    const photo = p.image_front_url || p.image_url || "";
    const categories = p.categories_tags || [];
    const cat =
      categories.find((c) => c.startsWith("pt:")) ||
      categories[0] ||
      "";
    const qty = String(p.quantity || "");
    let unit = "unidade";
    if (/kg/i.test(qty)) unit = "kg";
    else if (/g\b|grama/i.test(qty)) unit = "grama";
    else if (/l\b|litro/i.test(qty)) unit = "litro";
    else if (/ml/i.test(qty)) unit = "unidade";
    return { name, category: cat, photo, unit };
  } catch {
    return null;
  }
}

function mapCategory(cat: string): string {
  const c = cat.toLowerCase();
  if (
    c.includes("beverage") ||
    c.includes("bebida") ||
    c.includes("drink") ||
    c.includes("soda") ||
    c.includes("juice") ||
    c.includes("suco") ||
    c.includes("refrigerante") ||
    c.includes("cerveja")
  ) {
    return "Bebidas";
  }
  if (
    c.includes("cleaning") ||
    c.includes("limpeza") ||
    c.includes("detergent") ||
    c.includes("soap") ||
    c.includes("sabao") ||
    c.includes("hygiene") ||
    c.includes("higiene")
  ) {
    return "Limpeza";
  }
  if (
    c.includes("cloth") ||
    c.includes("roupa") ||
    c.includes("apparel") ||
    c.includes("vestuar")
  ) {
    return "Roupas";
  }
  return "Alimentos";
}

export function ProdutoFormPage() {
  const { user } = useAuth();
  const [form, setForm] = useState<FormData>({
    name: "",
    category: "Alimentos",
    quantity: 1,
    minQuantity: 5,
    purchasePrice: 0,
    salePrice: 0,
    unit: "unidade",
  });
  const [showCamera, setShowCamera] = useState(false);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [buscaInfo, setBuscaInfo] = useState<string | null>(null);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const userSuppliers = await listarFornecedores(user?.id ?? "");
      setSuppliers(userSuppliers.map((s) => s.name));
    })();
  }, [user]);

  const aplicarDadosBarcode = async (codigo: string) => {
    const cod = codigo.trim();
    if (cod.length < 6) {
      setBuscaInfo("Digite ou escaneie um código de barras válido.");
      return;
    }
    setBuscando(true);
    setBuscaInfo(null);
    try {
      const dados = await buscarDadosBarcode(cod);
      if (dados && dados.name) {
        setForm((prev) => ({
          ...prev,
          barcode: cod,
          name: dados.name || prev.name,
          category: dados.category ? mapCategory(dados.category) : prev.category,
          unit: dados.unit || prev.unit,
          photo: dados.photo || prev.photo,
        }));
        setBuscaInfo("Dados encontrados e preenchidos automaticamente!");
      } else {
        setForm((prev) => ({ ...prev, barcode: cod }));
        setBuscaInfo("Código não encontrado na base de dados. Preencha os campos manualmente.");
      }
    } finally {
      setBuscando(false);
    }
  };

  const handleScan = async (barcode: string) => {
    setShowCamera(false);
    await aplicarDadosBarcode(barcode);
    barcodeRef.current?.focus();
  };

  const toggleCamera = () => setShowCamera(!showCamera);

  const salvar = async () => {
    setError(null);
    setSuccess(false);
    setIsSaving(true);

    try {
      await db.products.add({
        id: uid(),
        userId: user!.id,
        name: form.name.trim(),
        barcode: form.barcode?.trim() || undefined,
        category: form.category as "Alimentos" | "Bebidas" | "Limpeza" | "Roupas" | "Outros",
        quantity: form.quantity,
        minQuantity: form.minQuantity,
        purchasePrice: form.purchasePrice,
        salePrice: form.salePrice,
        unit: form.unit as "unidade" | "kg" | "litro" | "pacote" | "caixa" | "duzia" | "par" | "grama" | "metro",
        expiryDate: form.expiryDate || undefined,
        photo: form.photo || undefined,
        supplierId: selectedSupplier || undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        pendingSync: true,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setForm({
        name: "",
        category: "Alimentos",
        quantity: 1,
        minQuantity: 5,
        purchasePrice: 0,
        salePrice: 0,
        unit: "unidade",
      });
      setSelectedSupplier(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar produto");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-5">
      <header className="mb-4">
        <h1 className="text-xl font-bold">
          {success ? "Produto salvo!" : "Novo Produto"}
        </h1>
      </header>

{error ? (
        <div className="bg-red-100 text-red-800 rounded-2xl p-3 mb-4">
          {error}
        </div>
      ) : null}

      <form className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 max-w-md mx-auto">
        <div>
          <label className="text-sm font-semibold block mb-1">Código de barras</label>
          <div className="flex gap-2">
            <input
              ref={barcodeRef}
              value={form.barcode || ""}
              onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
              placeholder="Escaneie ou digite o código"
              className="flex-1 border border-slate-300 rounded-xl px-3 py-3 outline-none text-sm"
              inputMode="numeric"
            />
            <button
              type="button"
              onClick={() => form.barcode && aplicarDadosBarcode(form.barcode)}
              disabled={buscando || !form.barcode}
              className="px-3 bg-primary/10 text-primary rounded-xl font-bold text-sm disabled:opacity-50"
              title="Buscar dados automaticamente"
            >
              {buscando ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            </button>
            <button
              type="button"
              onClick={toggleCamera}
              className="px-3 bg-primary/10 text-primary rounded-xl font-bold text-sm"
              title="Escanear com a câmera"
            >
              <ScanLine size={18} />
            </button>
          </div>
          {buscaInfo && (
            <p className="text-xs text-slate-500 mt-1">{buscaInfo}</p>
          )}
          {showCamera && (
            <div className="mt-3">
              <BarcodeScanner
                onDetected={handleScan}
                onClose={toggleCamera}
                continuous={false}
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold block mb-1">Nome do produto</label>
            <input
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value.trim() }))
              }
              placeholder="Ex: Pão Francês, Leite Integral"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
            >
              <option value="Alimentos">Alimentos</option>
              <option value="Bebidas">Bebidas</option>
              <option value="Limpeza">Limpeza</option>
              <option value="Roupas">Roupas</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold block mb-1">Quantidade em estoque</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, quantity: Math.max(0, Number(e.target.value)) }))
              }
              placeholder="0"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
              min={0}
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Estoque mínimo (alerta)</label>
            <input
              type="number"
              value={form.minQuantity}
              onChange={(e) =>
                setForm((f) => ({ ...f, minQuantity: Math.max(0, Number(e.target.value)) }))
              }
              placeholder="5"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
              min={0}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold block mb-1">Preço de compra (custo)</label>
            <input
              type="number"
              value={form.purchasePrice}
              onChange={(e) =>
                setForm(
                  (f) =>
                    ({ ...f, purchasePrice: Math.max(0, Number(e.target.value)) })
                )
              }
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
              min={0}
              step="0.01"
            />
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Preço de venda</label>
            <input
              type="number"
              value={form.salePrice}
              onChange={(e) =>
                setForm(
                  (f) =>
                    ({ ...f, salePrice: Math.max(0, Number(e.target.value)) })
                )
              }
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
              min={0}
              step="0.01"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-semibold block mb-1">Unidade de medida</label>
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
            >
              <option value="unidade">unidade</option>
              <option value="kg">kg</option>
              <option value="litro">litro</option>
              <option value="pacote">pacote</option>
              <option value="caixa">caixa</option>
              <option value="duzia">dúzia</option>
              <option value="par">par</option>
              <option value="grama">grama</option>
              <option value="metro">metro</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold block mb-1">Data de validade</label>
            <input
              type="date"
              value={form.expiryDate || ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, expiryDate: e.target.value || undefined }))
              }
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
            />
            <p className="text-xs text-slate-500 mt-1">
              Opcional — será usado para alertas de vencimento
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-1">Foto do produto</label>
          <div className="flex flex-col gap-2">
            {form.photo && (
              <div className="rounded-xl bg-slate-100 p-2">
                <img
                  src={form.photo}
                  alt={form.name}
                  className="w-full h-32 object-cover"
                />
              </div>
            )}
            <label className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 cursor-pointer select-none">
              <Image size={18} className="text-slate-400" />
              <span>Escolher foto do aparelho</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      setForm((pf) => ({ ...pf, photo: ev.target?.result as string }));
                    reader.readAsDataURL(f);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold block mb-2">Fornecedor</label>
          <div className="flex flex-col gap-2">
            {suppliers.length === 0 && (
              <p className="text-xs text-slate-500">Nenhum fornecedor cadastrado. Adicione nas Ajustes.</p>
            )}
            <select
              value={selectedSupplier || ""}
              onChange={(e) => setSelectedSupplier(e.target.value || undefined)}
              className="w-full border border-slate-300 rounded-xl p-3 outline-none text-sm"
              disabled={isSaving}
            >
              <option value="">-- Selecione um fornecedor --</option>
              {suppliers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowCamera(!showCamera)}
              className="text-xs text-primary hover:text-emerald-600"
            >
              + Cadastrar novo fornecedor
            </button>
          </div>
        </div>

        <button
          type="button"
          disabled={isSaving}
          onClick={salvar}
          className="w-full bg-primary text-white font-bold rounded-xl py-3 flex items-center justify-center gap-2"
        >
          {isSaving ? "Salvando..." : "Salvar Produto"}
        </button>
      </form>

      {success && (
        <div className="bg-green-100 text-green-800 rounded-2xl p-4 mt-4 text-center">
          <CheckCircle size={24} className="mb-2" />
          <p>Produto salvo com sucesso! Ele aparecerá no dashboard.</p>
        </div>
      )}
    </div>
  );
}