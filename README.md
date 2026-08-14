# Estoque Fácil

PWA de controle de estoque para pequenos comerciantes (padarias, mercadinhos,
lojas de roupas, papelarias). Simples: **CADASTRAR → MOVIMENTAR → PREVER**.

## O que resolve

- Estoque no caderno ou na memória → tudo no app, offline-first
- Produto acaba e ninguém sabe → alertas de estoque baixo
- Perda com vencimento → avisos de produtos vencendo/vencidos
- Compra errada → top mais vendidos + previsão do que comprar
- Inventário manual → contagem guiada pelo app (próximas etapas)

## Funcionalidades (ETAPA 1 — Estrutura Base)

- **Login por telefone** — código de verificação (modo mock/MVP)
- **Onboarding** — 3 telas ensinando o uso
- **Dashboard** — produtos em estoque, valor investido, alertas críticos
  (baixo 🔴 / vencendo 🟡 / vencido ❌), top 5 mais vendidos do mês e botão
  flutuante "+ Adicionar Produto"
- **Modo offline** — barra de aviso quando sem conexão; dados salvos no aparelho
- **Dados de demonstração** — ao entrar, uma loja exemplo já aparece populada
- **Ajustes** — perfil, plano, sincronização manual, sugestões via WhatsApp

## Roadmap

| Etapa | Conteúdo | Status |
|---|---|---|
| 1 | Estrutura base (Firebase, auth, dados, dashboard) | ✅ |
| 2 | CRUD de produtos (cadastro, listagem, edição, exclusão) | ⏳ |
| 3 | Movimentação (venda/compra com atualização automática) | |
| 4 | Alertas push + relatórios (mais vendidos, parados) | |
| 5 | Sync em nuvem, previsão de demanda (IA simples), fornecedores, inventário | |

## Stack

- **Frontend:** React + Vite + Tailwind CSS + lucide-react
- **PWA/Offline:** vite-plugin-pwa (Service Worker) + Dexie (IndexedDB)
- **Backend (futuro):** Firebase Firestore + Auth + Cloud Functions
  (config em `firebase/`)
- **Ícones:** lucide-react

## Rodar localmente

```bash
npm install
npm run dev
# http://localhost:5173
```

Para testar no celular: `npm run dev` já expõe na rede local (host: true);
abra o endereço no navegador do Android e use **"Adicionar à tela inicial"**.

## Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build de produção (gera PWA) |
| `npm run preview` | Preview do build |
| `npm run test` | Testes (vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Checagem de tipos |

## Firebase (quando for conectar a nuvem)

1. Crie um projeto em https://console.firebase.google.com
2. Ative **Authentication** (telefone) e **Cloud Firestore**
3. Copie `firebase/firestore.rules` e `firebase/firestore.indexes.json`
4. Copie `.env.example` para `.env` e preencha as credenciais

Passo a passo completo: [`firebase/README.md`](firebase/README.md).

## Estrutura

```
src/
  auth/          # autenticação por telefone (modo mock)
  components/    # Layout com abas + barra de offline
  data/          # acesso a dados (Dexie) + estatísticas + seed demo
  db/            # schema IndexedDB (users, products, movements, suppliers, alerts)
  firebase/      # leitura de config (.env) — uso na ETAPA 5
  lib/           # utilitários (formatação, whatsapp)
  pages/         # Login, Onboarding, Dashboard, Produtos, Movimentar, Relatórios, Ajustes
firebase/        # regras de segurança e índices do Firestore
docs/            # decisões técnicas e plano de testes
```

> O protótipo anterior (lista de compras por foto) foi preservado em
> `estoque-facil-legacy/`.
