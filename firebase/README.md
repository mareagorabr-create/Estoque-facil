# Configuração do Firebase

O app é **offline-first**: o comerciante usa o app sem internet e os dados são
sincronizados com o Firestore quando a conexão volta. Esta pasta contém a
configuração que será usada na ETAPA 5 (sincronização em nuvem).

## 1. Criar o projeto Firebase

1. Acesse https://console.firebase.google.com → **Adicionar projeto**.
2. Nome do projeto (ex: `estoque-facil`) e siga os passos.
3. No menu **Configurações do projeto → Seus apps**, adicione um app **Web**
   (ícone `</>`).
4. Copie os valores de `apiKey`, `authDomain`, `projectId`, `storageBucket`,
   `messagingSenderId` e `appId`.

## 2. Ativar serviços

- **Authentication**: menu *Authentication → Sign-in method* → ative
  **Telefone** (em produção usamos número de telefone; no MVP o código é mock,
  exibido na própria tela).
- **Cloud Firestore**: menu *Firestore Database* → **Criar banco de dados**
  (modo produção; localização perto do Brasil, ex: `southamerica-east1`).

## 3. Aplicar regras de segurança e índices

Instale o Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
```

Aplique as regras e índices deste repositório:

```bash
firebase deploy --only firestore:rules
firebase firestore:indexes:apply firebase/firestore.indexes.json
```

> `firestore.rules`: cada usuário só acessa os próprios documentos
> (`request.auth.uid`), com validação de tipos nos campos (quantidade/preço ≥ 0).
> Nunca confie no cliente — a regra é o limite real de segurança.

## 4. Configurar o app

Copie `.env.example` para `.env` e preencha:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

O arquivo `src/firebase/config.ts` lê essas variáveis. Sem elas, o app roda 100%
offline (sem Firebase) — ideal para o MVP.

## 5. Estrutura do Firestore

| Coleção | Doc | Campos principais |
|---|---|---|
| `users` | id = uid | name, phone, storeName, planStatus, createdAt |
| `products` | id | userId, name, barcode, category, quantity, minQuantity, purchasePrice, salePrice, unit, expiryDate, supplierId, createdAt, updatedAt |
| `movements` | id | productId, userId, type ("entrada"/"saida"), quantity, value, description, createdAt |
| `suppliers` | id | userId, name, phone, address, notes, createdAt |
| `alerts` | id | userId, productId, type, message, read, createdAt |

As consultas mais comuns (produtos por loja/categoria/validade, movimentos por
tipo/data, alertas não lidos) já estão previstas em `firestore.indexes.json`.
