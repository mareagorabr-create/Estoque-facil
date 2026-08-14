// Dados de demonstração (mock). Permite testar o app sem cadastrar nada:
// ao logar pela primeira vez, o dashboard é populado com uma "loja exemplo".
// Em produção, remover as chamadas a `garantirDadosDemo`.
import { db, uid } from "../db";
import type { Categoria, Movement, Product, Unidade } from "../db";

interface Semente {
  name: string;
  barcode?: string;
  category: Categoria;
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  salePrice: number;
  unit: Unidade;
  diasParaVencer?: number; // positivo = vencendo, negativo = já venceu
  fornecedor?: string;
  freq: number; // probabilidade diária de venda (0..1)
  maxVenda: number; // quantidade máxima por venda
}

const FORNECEDORES = [
  { name: "Panificadora Silva", phone: "5511912345678" },
  { name: "Casa dos Grãos", phone: "5511987654321" },
  { name: "Distribuidora Láctea", phone: "5511998765432" },
  { name: "Atacadão Limpex", phone: "5511944445555" },
  { name: "Refrigerantes BR", phone: "5511977778888" },
  { name: "Confecção Prime", phone: "5511933334444" },
];

const SEMENTES: Semente[] = [
  { name: "Pão Francês", category: "Alimentos", quantity: 45, minQuantity: 30, purchasePrice: 0.45, salePrice: 1, unit: "unidade", fornecedor: "Panificadora Silva", freq: 0.9, maxVenda: 60 },
  { name: "Café Torrado 500g", barcode: "7891000100103", category: "Alimentos", quantity: 3, minQuantity: 10, purchasePrice: 12, salePrice: 18, unit: "unidade", fornecedor: "Casa dos Grãos", freq: 0.25, maxVenda: 8 },
  { name: "Leite Integral 1L", category: "Bebidas", quantity: 20, minQuantity: 15, purchasePrice: 4.5, salePrice: 6.5, unit: "litro", fornecedor: "Casa dos Grãos", freq: 0.4, maxVenda: 12 },
  { name: "Iogurte Natural", category: "Alimentos", quantity: 20, minQuantity: 10, purchasePrice: 2.8, salePrice: 4.5, unit: "unidade", diasParaVencer: 5, fornecedor: "Distribuidora Láctea", freq: 0.3, maxVenda: 10 },
  { name: "Queijo Mussarela", category: "Alimentos", quantity: 8, minQuantity: 5, purchasePrice: 28, salePrice: 45, unit: "kg", diasParaVencer: 3, fornecedor: "Distribuidora Láctea", freq: 0.2, maxVenda: 4 },
  { name: "Arroz 5kg", category: "Alimentos", quantity: 25, minQuantity: 10, purchasePrice: 22, salePrice: 32, unit: "pacote", fornecedor: "Casa dos Grãos", freq: 0.15, maxVenda: 6 },
  { name: "Feijão 1kg", category: "Alimentos", quantity: 12, minQuantity: 8, purchasePrice: 7, salePrice: 10, unit: "pacote", fornecedor: "Casa dos Grãos", freq: 0.2, maxVenda: 8 },
  { name: "Óleo de Soja 900ml", category: "Alimentos", quantity: 9, minQuantity: 10, purchasePrice: 6.5, salePrice: 8.5, unit: "unidade", fornecedor: "Atacadão Limpex", freq: 0.15, maxVenda: 6 },
  { name: "Detergente 500ml", category: "Limpeza", quantity: 15, minQuantity: 12, purchasePrice: 2.2, salePrice: 3.5, unit: "unidade", fornecedor: "Atacadão Limpex", freq: 0.12, maxVenda: 5 },
  { name: "Sabão em Pó 1kg", category: "Limpeza", quantity: 4, minQuantity: 8, purchasePrice: 9, salePrice: 13, unit: "pacote", fornecedor: "Atacadão Limpex", freq: 0.1, maxVenda: 4 },
  { name: "Refrigerante Cola 2L", category: "Bebidas", quantity: 30, minQuantity: 12, purchasePrice: 6, salePrice: 9, unit: "unidade", fornecedor: "Refrigerantes BR", freq: 0.35, maxVenda: 15 },
  { name: "Água Mineral 500ml", category: "Bebidas", quantity: 48, minQuantity: 24, purchasePrice: 1.2, salePrice: 2, unit: "unidade", freq: 0.5, maxVenda: 24 },
  { name: "Camiseta Básica", category: "Roupas", quantity: 18, minQuantity: 6, purchasePrice: 15, salePrice: 30, unit: "unidade", fornecedor: "Confecção Prime", freq: 0.08, maxVenda: 4 },
  { name: "Leite UHT Integral", category: "Alimentos", quantity: 6, minQuantity: 5, purchasePrice: 4, salePrice: 6, unit: "unidade", diasParaVencer: -2, fornecedor: "Distribuidora Láctea", freq: 0.3, maxVenda: 12 },
];

const iso = (t: number) => new Date(t).toISOString();
const DIA = 86400000;

// Gerador pseudo-aleatório determinístico (resultados estáveis a cada seed).
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export async function seedDadosDemo(userId: string): Promise<void> {
  const rand = rng(20260814);
  const agora = Date.now();

  const fornecedorIdPorNome: Record<string, string> = {};
  for (const f of FORNECEDORES) {
    const id = uid();
    await db.suppliers.add({ id, userId, name: f.name, phone: f.phone, createdAt: iso(agora) });
    fornecedorIdPorNome[f.name] = id;
  }

  const produtoIdPorNome: Record<string, string> = {};
  for (const s of SEMENTES) {
    const id = uid();
    const produto: Product = {
      id,
      userId,
      name: s.name,
      category: s.category,
      quantity: s.quantity,
      minQuantity: s.minQuantity,
      purchasePrice: s.purchasePrice,
      salePrice: s.salePrice,
      unit: s.unit,
      supplierId: s.fornecedor ? fornecedorIdPorNome[s.fornecedor] : undefined,
      expiryDate: s.diasParaVencer !== undefined ? iso(agora + s.diasParaVencer * DIA) : undefined,
      createdAt: iso(agora - 90 * DIA),
      updatedAt: iso(agora),
      pendingSync: true,
    };
    if (s.barcode) produto.barcode = s.barcode;
    await db.products.add(produto);
    produtoIdPorNome[s.name] = id;
  }

  // Movimentações dos últimos 60 dias (vendas diárias + reposições semanais).
  for (let d = 60; d >= 0; d--) {
    const dia = agora - d * DIA;
    for (const s of SEMENTES) {
      const productId = produtoIdPorNome[s.name];
      if (rand() < s.freq) {
        const qty = 1 + Math.floor(rand() * s.maxVenda);
        const createdAt = iso(dia + (8 + Math.floor(rand() * 12)) * 3600000);
        const movimento: Movement = {
          id: uid(),
          productId,
          userId,
          type: "saida",
          quantity: qty,
          value: qty * s.salePrice,
          description: "Venda para cliente",
          createdAt,
          pendingSync: true,
        };
        await db.movements.add(movimento);
      }
      if (d % 7 === 0 && rand() < 0.6) {
        const qty = 5 + Math.floor(rand() * 15);
        const createdAt = iso(dia + (6 + Math.floor(rand() * 8)) * 3600000);
        const movimento: Movement = {
          id: uid(),
          productId,
          userId,
          type: "entrada",
          quantity: qty,
          value: qty * s.purchasePrice,
          description: "Compra do fornecedor",
          createdAt,
          pendingSync: true,
        };
        await db.movements.add(movimento);
      }
    }
  }
}
