import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/context";
import {
  Plus,
  Package,
  ArrowLeftRight,
  CheckCircle,
  X,
  Calendar,
  Image,
  Search,
  TrendingUp,
  ShoppingCart,
  Settings,
  LogOut,
} from "lucide-react";
import { db, uid } from "../db";
import { soDigitos, whatsappLink } from "../lib/format";
import { adicionarFornecedor, listarFornecedores, removerFornecedor } from "../data";
import { formatarMoeda } from "../lib/format";

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
  const [barcodeFromCamera, setBarcodeFromCamera] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const userSuppliers = await listarFornecedores(user?.id ?? "");
      setSuppliers(userSuppliers.map((s) => s.name));
    })();
  }, [user]);

  const handleScan = async (barcode: string) => {
    setForm((prev) => ({
      ...prev,
      barcode,
    }));
    setBarcodeFromCamera(null);
    setShowCamera(false);
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
        category: form.category,
        quantity: form.quantity,
        minQuantity: form.minQuantity,
        purchasePrice: form.purchasePrice,
        salePrice: form.salePrice,
        unit: form.unit,
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
            <div className="flex items-center gap-2 bg-slate-50 rounded-xl p-3 cursor-pointer select-none"
              onClick={toggleCamera}
            >
              <Image size={18} className="text-slate-400" />
              <span>Tirar foto pela câmera</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) {
                  const reader = new FileReader();
                  reader.onload = (e) =>
                    setForm((pf) => ({ ...pf, photo: e.target?.result as string }));
                  reader.readAsDataURL(f);
                }
              }}
              className="hidden"
            />
            <button
              disabled={isSaving}
              onClick={toggleCamera}
              className="w-full bg-primary/10 text-primary font-bold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2"
            >
              {showCamera ? "Fechar câmera" : "Abrir câmera"}
            </button>
          </div>
          {showCamera && (
            <div className="mt-4">
              <BarcodeScanner
                onDetected={handleScan}
                onClose={toggleCamera}
                continuous={false}
              />
            </div>
          )}
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