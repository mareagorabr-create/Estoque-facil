// Schema local (IndexedDB via Dexie) — espelha o modelo do Firestore da spec:
// users, products, movements, suppliers, alerts + fila de sincronização.
// Offline-first: o app lê/escreve aqui e sincroniza com a nuvem quando há conexão.
import Dexie, { type Table } from "dexie";

export const CATEGORIAS = [
  "Alimentos",
  "Bebidas",
  "Limpeza",
  "Roupas",
  "Outros",
] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const UNIDADES = [
  "unidade",
  "kg",
  "litro",
  "pacote",
  "caixa",
  "duzia",
  "par",
  "grama",
  "metro",
] as const;
export type Unidade = (typeof UNIDADES)[number];

export const TIPOS_MOVIMENTO = ["entrada", "saida"] as const;
export type TipoMovimento = (typeof TIPOS_MOVIMENTO)[number];

export type TipoAlerta = "baixo_estoque" | "vencendo" | "vencido";

export interface User {
  id: string;
  phone: string; // somente dígitos, ex: 5511999999999
  name: string;
  storeName: string;
  email?: string;
  planStatus: "trial" | "active" | "canceled";
  trialEnd?: string; // ISO date
  createdAt: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  barcode?: string;
  category: Categoria;
  quantity: number;
  minQuantity: number; // estoque mínimo p/ alerta
  purchasePrice: number; // preço de compra (custo)
  salePrice: number; // preço de venda
  unit: Unidade;
  expiryDate?: string; // ISO date (opcional)
  photo?: string; // data URL comprimida (opcional)
  supplierId?: string; // referência opcional
  createdAt: string;
  updatedAt: string;
  pendingSync?: boolean;
}

export interface Movement {
  id: string;
  productId: string;
  userId: string;
  type: TipoMovimento; // "entrada" | "saida"
  quantity: number;
  value?: number; // valor total da movimentação (opcional)
  description?: string; // ex: "Venda para cliente", "Compra do fornecedor"
  createdAt: string; // ISO datetime
  pendingSync?: boolean;
}

export interface Supplier {
  id: string;
  userId: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt: string;
  pendingSync?: boolean;
}

export interface Alert {
  id: string;
  userId: string;
  productId?: string;
  type: TipoAlerta;
  message: string;
  read: boolean;
  createdAt: string;
  pendingSync?: boolean;
}

export interface SyncQueueEntry {
  id?: number;
  userId: string;
  action: "create" | "update" | "delete";
  tableName: string;
  data: unknown;
  synced: boolean;
  createdAt: string;
}

class EstoqueFacilDB extends Dexie {
  users!: Table<User, string>;
  products!: Table<Product, string>;
  movements!: Table<Movement, string>;
  suppliers!: Table<Supplier, string>;
  alerts!: Table<Alert, string>;
  syncQueue!: Table<SyncQueueEntry, number>;

  constructor() {
    // Nome diferente do banco antigo (lista por foto) para evitar conflito de schema.
    super("estoque-facil-app");
    this.version(1).stores({
      users: "id, phone",
      products: "id, userId, category, name, barcode, minQuantity, expiryDate",
      movements: "id, productId, userId, type, createdAt",
      suppliers: "id, userId",
      alerts: "id, userId, type, read, createdAt",
      syncQueue: "++id, userId, synced, tableName",
    });
  }
}

export const db = new EstoqueFacilDB();

/** Gera um id único (fallback caso crypto.randomUUID não exista). */
export function uid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
