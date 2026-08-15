// Camada de acesso a dados (offline-first via Dexie).
// Cada função espelha o modelo do Firestore; a sincronização real com a nuvem
// entra na ETAPA 5 (fila `syncQueue` já preparada aqui).
import { db, uid } from "../db";
import type {
  Alert,
  Movement,
  Product,
  Supplier,
  TipoMovimento,
} from "../db";
export type { Alert };
import { seedDadosDemo } from "./mock";

// ── Usuário ────────────────────────────────────────────────────────────────

export async function criarUsuario(dados: {
  id: string;
  phone: string;
  name: string;
  storeName: string;
  email?: string;
}): Promise<void> {
  const agora = new Date().toISOString();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);
  await db.users.add({
    id: dados.id,
    phone: dados.phone,
    name: dados.name,
    storeName: dados.storeName,
    email: dados.email,
    planStatus: "trial",
    trialEnd: trialEnd.toISOString(),
    createdAt: agora,
  });
}

// ── Produtos ───────────────────────────────────────────────────────────────

export interface NovoProduto {
  name: string;
  barcode?: string;
  category: Product["category"];
  quantity: number;
  minQuantity: number;
  purchasePrice: number;
  salePrice: number;
  unit: Product["unit"];
  expiryDate?: string;
  photo?: string;
  supplierId?: string;
}

export async function criarProduto(userId: string, dados: NovoProduto): Promise<Product> {
  const agora = new Date().toISOString();
  const produto: Product = {
    id: uid(),
    userId,
    name: dados.name,
    barcode: dados.barcode,
    category: dados.category,
    quantity: dados.quantity,
    minQuantity: dados.minQuantity,
    purchasePrice: dados.purchasePrice,
    salePrice: dados.salePrice,
    unit: dados.unit,
    expiryDate: dados.expiryDate,
    photo: dados.photo,
    supplierId: dados.supplierId,
    createdAt: agora,
    updatedAt: agora,
    pendingSync: true,
  };
  await db.products.add(produto);
  await enfileirarSync("create", "products", produto);
  return produto;
}

export async function atualizarProduto(id: string, mudancas: Partial<Product>): Promise<void> {
  await db.products.update(id, {
    ...mudancas,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
  });
  const produto = await db.products.get(id);
  if (produto) await enfileirarSync("update", "products", produto);
}

export async function removerProduto(id: string): Promise<void> {
  await db.products.delete(id);
  await enfileirarSync("delete", "products", { id });
}

export async function buscarProduto(id: string): Promise<Product | undefined> {
  return db.products.get(id);
}

export async function listarProdutos(userId: string): Promise<Product[]> {
  return db.products.where("userId").equals(userId).toArray();
}

export async function listarProdutosOrdenados(userId: string): Promise<Product[]> {
  return (await listarProdutos(userId)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export async function listarProdutosBaixo(userId: string): Promise<Product[]> {
  return (await listarProdutos(userId)).filter((p) => p.quantity <= p.minQuantity);
}

export async function buscarProdutoPorCodigo(userId: string, barcode: string): Promise<Product | undefined> {
  return db.products.where("userId").equals(userId).and((p) => p.barcode === barcode).first();
}

// ── Movimentação de estoque ─────────────────────────────────────────────────

export async function registrarMovimentacao(
  userId: string,
  productId: string,
  type: TipoMovimento,
  quantity: number,
  value?: number,
  description?: string
): Promise<Movement> {
  const produto = await db.products.get(productId);
  if (!produto) throw new Error("Produto não encontrado.");
  if (quantity <= 0) throw new Error("Quantidade deve ser maior que zero.");

  const delta = type === "entrada" ? quantity : -quantity;
  const novaQuantidade = Math.max(0, produto.quantity + delta);
  await db.products.update(productId, {
    quantity: novaQuantidade,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
  });

  const movimento: Movement = {
    id: uid(),
    productId,
    userId,
    type,
    quantity,
    value,
    description,
    createdAt: new Date().toISOString(),
    pendingSync: true,
  };
  await db.movements.add(movimento);
  await enfileirarSync("update", "products", { id: productId, quantity: novaQuantidade });
  await enfileirarSync("create", "movements", movimento);
  return movimento;
}

export async function listarMovimentacoes(userId: string, limit = 50): Promise<Movement[]> {
  const movs = await db.movements.where("userId").equals(userId).toArray();
  return movs
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export async function listarMovimentacoesDoProduto(productId: string): Promise<Movement[]> {
  const movs = await db.movements.where("productId").equals(productId).toArray();
  return movs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// ── Fornecedores ────────────────────────────────────────────────────────────

export async function listarFornecedores(userId: string): Promise<Supplier[]> {
  return db.suppliers.where("userId").equals(userId).toArray();
}

export async function adicionarFornecedor(
  userId: string,
  name: string,
  phone: string,
  address?: string,
  notes?: string
): Promise<Supplier> {
  const sup: Supplier = {
    id: uid(),
    userId,
    name,
    phone,
    address,
    notes,
    createdAt: new Date().toISOString(),
    pendingSync: true,
  };
  await db.suppliers.add(sup);
  await enfileirarSync("create", "suppliers", sup);
  return sup;
}

export async function removerFornecedor(id: string): Promise<void> {
  await db.suppliers.delete(id);
  await enfileirarSync("delete", "suppliers", { id });
}


// ── Zerar Estoque ─────────────────────────────────────────────────────────────────

export async function zerarEstoqueProduto(productId: string): Promise<void> {
  await db.products.update(productId, {
    quantity: 0,
    updatedAt: new Date().toISOString(),
    pendingSync: true,
  });
}

export async function zerarTodoEstoque(userId: string): Promise<number> {
  const produtos = await db.products.where('userId').equals(userId).toArray();
  for (const p of produtos) {
    await db.products.update(p.id, {
      quantity: 0,
      updatedAt: new Date().toISOString(),
      pendingSync: true,
    });
  }
  return produtos.length;
}

// ── Alertas ─────────────────────────────────────────────────────────────────

const DIAS_PADRAO_VENCENDO = 7;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Calcula os alertas atuais (estoque baixo, vencendo, vencido) e persiste os
 * novos na tabela `alerts` (para notificações). Retorna a lista calculada.
 */
export async function gerarAlertas(userId: string, diasVencendo = DIAS_PADRAO_VENCENDO): Promise<Alert[]> {
  const produtos = await listarProdutos(userId);
  const hoje = startOfDay(new Date());
  const limiteVencendo = new Date(hoje.getTime() + diasVencendo * 86400000);

  const candidatos: Alert[] = [];
  for (const p of produtos) {
    if (p.quantity <= p.minQuantity) {
      candidatos.push({
        id: uid(),
        userId,
        productId: p.id,
        type: "baixo_estoque",
        message: `Estoque baixo: ${p.name} (${p.quantity} ${p.unit}). Compre mais!`,
        read: false,
        createdAt: new Date().toISOString(),
        pendingSync: true,
      });
    }
    if (p.expiryDate) {
      const exp = startOfDay(new Date(p.expiryDate));
      if (exp.getTime() < hoje.getTime()) {
        candidatos.push({
          id: uid(),
          userId,
          productId: p.id,
          type: "vencido",
          message: `${p.name} VENCEU! Remova do estoque.`,
          read: false,
          createdAt: new Date().toISOString(),
          pendingSync: true,
        });
      } else if (exp.getTime() <= limiteVencendo.getTime()) {
        const dias = diasEntre(hoje, exp);
        candidatos.push({
          id: uid(),
          userId,
          productId: p.id,
          type: "vencendo",
          message: `${p.name} vence em ${dias} dia(s). Você tem ${p.quantity} ${p.unit}.`,
          read: false,
          createdAt: new Date().toISOString(),
          pendingSync: true,
        });
      }
    }
  }

  // persiste apenas alertas novos (mesmo produto + tipo + não lido)
  for (const c of candidatos) {
    const existe = await db.alerts
      .where("productId")
      .equals(c.productId ?? "")
      .and((a) => a.type === c.type && !a.read)
      .count();
    if (existe === 0) {
      await db.alerts.add(c);
      await enfileirarSync("create", "alerts", c);
    }
  }

  return candidatos;
}

export async function listarAlertas(userId: string): Promise<Alert[]> {
  const alerts = await db.alerts.where("userId").equals(userId).toArray();
  return alerts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function contarAlertasNaoLidos(userId: string): Promise<number> {
  return db.alerts.where("userId").equals(userId).and((a) => !a.read).count();
}

// ── Dashboard (estatísticas) ────────────────────────────────────────────────

export interface TopVendido {
  produto: Product;
  quantidade: number;
  valor: number;
}

export interface DashboardStats {
  totalProdutos: number;
  valorEstoque: number; // soma de custo (preço de compra × quantidade)
  comEstoqueBaixo: number;
  vencendo: number;
  vencidos: number;
  alertas: Alert[];
  topVendidos: TopVendido[];
}

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  const [produtos, movimentos] = await Promise.all([
    listarProdutos(userId),
    db.movements.where("userId").equals(userId).toArray(),
  ]);
  const alertas = await gerarAlertas(userId);

  const hoje = new Date();
  const hoje0 = startOfDay(hoje);
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const limiteVencendo = new Date(hoje0.getTime() + DIAS_PADRAO_VENCENDO * 86400000);

  let valorEstoque = 0;
  let baixo = 0;
  let vencendo = 0;
  let vencidos = 0;
  for (const p of produtos) {
    valorEstoque += p.purchasePrice * p.quantity;
    if (p.quantity <= p.minQuantity) baixo++;
    if (p.expiryDate) {
      const exp = startOfDay(new Date(p.expiryDate));
      if (exp.getTime() < hoje0.getTime()) vencidos++;
      else if (exp.getTime() <= limiteVencendo.getTime()) vencendo++;
    }
  }

  // Top vendidos do mês (soma das saídas desde o dia 1)
  const produtoPorId = new Map(produtos.map((p) => [p.id, p]));
  const agregado = new Map<string, { quantidade: number; valor: number }>();
  for (const m of movimentos) {
    if (m.type !== "saida") continue;
    const t = new Date(m.createdAt).getTime();
    if (t < inicioMes.getTime() || t > hoje.getTime()) continue;
    const preco = produtoPorId.get(m.productId)?.salePrice ?? 0;
    const valor = m.value ?? m.quantity * preco;
    const acc = agregado.get(m.productId) ?? { quantidade: 0, valor: 0 };
    acc.quantidade += m.quantity;
    acc.valor += valor;
    agregado.set(m.productId, acc);
  }

  const topVendidos: TopVendido[] = [...agregado.entries()]
    .map(([productId, a]) => ({
      produto: produtoPorId.get(productId)!,
      quantidade: a.quantidade,
      valor: a.valor,
    }))
    .filter((x) => x.produto)
    .sort((a, b) => b.quantidade - a.quantidade)
    .slice(0, 5);

  return {
    totalProdutos: produtos.length,
    valorEstoque,
    comEstoqueBaixo: baixo,
    vencendo,
    vencidos,
    alertas,
    topVendidos,
  };
}

export interface PrevisaoCompra {
  produto: Product;
  mediaSemanal: number;
  estoqueAtual: number;
  sugerido: number;
}

/**
 * Previsão de compra simples (média móvel): soma das vendas das últimas
 * 4 semanas dividida por 4, com buffer de segurança (10% por padrão),
 * menos o estoque atual. Retorna só itens com sugestão > 0, ordenados.
 */
export async function preverCompras(userId: string, buffer = 0.1): Promise<PrevisaoCompra[]> {
  const [produtos, movimentos] = await Promise.all([
    listarProdutos(userId),
    db.movements.where("userId").equals(userId).toArray(),
  ]);
  const agora = Date.now();
  const inicio = agora - 28 * 86400000;
  const vendas = new Map<string, number>();
  for (const m of movimentos) {
    if (m.type !== "saida") continue;
    const t = new Date(m.createdAt).getTime();
    if (t < inicio || t > agora) continue;
    vendas.set(m.productId, (vendas.get(m.productId) ?? 0) + m.quantity);
  }

  const resultado: PrevisaoCompra[] = [];
  for (const p of produtos) {
    const total = vendas.get(p.id) ?? 0;
    if (total === 0) continue;
    const media = total / 4;
    const sugerido = Math.max(0, Math.ceil(media * (1 + buffer)) - p.quantity);
    if (sugerido > 0) {
      resultado.push({ produto: p, mediaSemanal: media, estoqueAtual: p.quantity, sugerido });
    }
  }
  return resultado.sort((a, b) => b.sugerido - a.sugerido);
}

export async function getProdutosParados(userId: string, dias = 30): Promise<Product[]> {
  const [produtos, movimentos] = await Promise.all([
    listarProdutos(userId),
    db.movements.where("userId").equals(userId).toArray(),
  ]);
  const limite = Date.now() - dias * 86400000;
  const temSaida = new Set(
    movimentos.filter((m) => m.type === "saida" && new Date(m.createdAt).getTime() >= limite).map((m) => m.productId)
  );
  return produtos.filter((p) => !temSaida.has(p.id));
}

// ── Dados de demonstração ───────────────────────────────────────────────────

/** Popula a loja com dados demo na primeira vez (apenas para testes/MVP). */
export async function garantirDadosDemo(userId: string): Promise<void> {
  const count = await db.products.where("userId").equals(userId).count();
  if (count > 0) return;
  await seedDadosDemo(userId);
}

// ── Fila de sincronização (offline → online) ───────────────────────────────

async function enfileirarSync(
  action: "create" | "update" | "delete",
  tableName: string,
  data: unknown
): Promise<void> {
  await db.syncQueue.add({
    userId: "",
    action,
    tableName,
    data,
    synced: false,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Envia um item da fila para o Firestore.
 * Em produção, isto usaria o Firestore SDK. No MVP, simula o envio.
 */
export async function enviarParaFirestore(
  entry: any,
  firestore: any
): Promise<boolean> {
  try {
    const { tableName, action, data } = entry;
    // Mapeia tabelas Firestore correspondentes
    switch (tableName) {
      case "products":
        if (action === "create") {
          await firestore.collection("products").add(data as any);
        } else if (action === "update") {
          await firestore.collection("products").doc(data.id).update(data);
        } else if (action === "delete") {
          await firestore.collection("products").doc(data.id).delete();
        }
        break;
      case "movements":
        if (action === "create") {
          await firestore.collection("movements").add(data as any);
        }
        break;
      case "suppliers":
        if (action === "create") {
          await firestore.collection("suppliers").add(data as any);
        }
        break;
      case "alerts":
        if (action === "create") {
          await firestore.collection("alerts").add(data as any);
        }
        break;
      default:
        console.log("Tabela não mapeada para sincronização:", tableName);
    }
    return true;
  } catch (err) {
    console.error("Erro ao sincronizar com Firestore:", err);
    return false;
  }
}

/**
 * Processa a fila de sincronização pendente.
 * Em produção envia ao Firestore; no MVP marca como sincronizado.
 */
export async function processarFilaSync(): Promise<number> {
  const pendentes = await db.syncQueue.filter((e) => !e.synced).toArray();
  if (pendentes.length === 0) return 0;

  // Em ambiente de produção com Firebase, descomentar e usar:
  // const firestore = getFirestore(app);
  // for (const entry of pendentes) {
  //   await enviarParaFirestore(entry, firestore);
  //   await db.syncQueue.update(entry.id!, { synced: true });
  // }

  // No MVP (modo mock): marca tudo como sincronizado
  for (const entry of pendentes) {
    await db.syncQueue.update(entry.id!, { synced: true });
  }
  return pendentes.length;
}

/**
 * Inicializa listeners de online/offline para sincronização automática.
 * Chamar este função no App.tsx após o usuário fazer login.
 */
export function setupSyncOffline(): void {
  const handleOnline = async () => {
    try {
      const sincronizado = await processarFilaSync();
      if (sincronizado > 0) {
        console.log(`${sincronizado} item(ns) sincronizados ao voltar à internet`);
      }
    } catch (err) {
      console.error("Erro na sincronização ao voltar online:", err);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    // Limpar listener na desmontagem - será feito no componente que chamar esta função
    // Isso é apenas um exemplo; em produção usaria um effect cleanup properly
    window.removeEventListener("online", handleOnline);
  }
}
