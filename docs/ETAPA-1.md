# ETAPA 1 — Estrutura Base (entrega)

## O que foi entregue

1. **Configuração do Firebase** — `firebase/firestore.rules` (regras por dono +
   validação de tipos), `firebase/firestore.indexes.json` (índices compostos das
   consultas comuns), `firebase/README.md` (passo a passo) e `src/firebase/config.ts`
   (leitura de `.env`). O app roda 100% offline mesmo sem Firebase configurado.
2. **Estrutura de dados** — `src/db/index.ts` espelha o modelo Firestore da spec
   (`users`, `products`, `movements`, `suppliers`, `alerts` + `syncQueue`) no
   IndexedDB via Dexie (offline-first).
3. **Autenticação por telefone** — `src/auth/context.tsx` + `LoginPage`: número →
   código (mock exibido na tela) → cadastro com nome/loja. Recuperação: reenvio do
   código pelo mesmo número.
4. **Dashboard com dados mockados** — `DashboardPage` com dados de uma loja
   exemplo populada automaticamente (14 produtos, fornecedores, ~60 dias de
   movimentações). Mostra: total de produtos, valor investido, alertas
   (estoque baixo 🔴, vencendo 🟡, vencido ❌), top 5 mais vendidos do mês e botão
   flutuante "+ Adicionar Produto".
5. **Onboarding de 3 telas** + **barra de modo offline** + **Ajustes** (perfil,
   plano trial, sincronizar, sugestões via WhatsApp, sair).

## Decisões de arquitetura

- **PWA em vez de React Native**: instala no Android pela tela inicial, acessa
  câmera, funciona offline com Service Worker e tem custo de distribuição zero —
  o ideal para o MVP de pequenos comerciantes. O protótipo RN fica para depois,
  se o produto validar.
- **Offline-first com Dexie**: leitura/escrita sempre locais (rápido, funciona em
  3G e sem internet); nuvem é destino de sincronização, não fonte de verdade.
- **Dados de demonstração**: `garantirDadosDemo()` popula a loja na primeira
  entrada, para testar o dashboard sem cadastrar nada. Remover na produção.
- **Autenticação mock**: código exibido na tela (sem custo de SMS). Em produção,
  Firebase Auth (telefone) ou Twilio/Zenvia.

## Respostas às perguntas técnicas

**1. Leitura de código de barras eficiente?**
Usar a API nativa `BarcodeDetector` do Chrome/Android (zero download) com
fallback para `@zxing/browser` em navegadores sem suporte. Escanear pela câmera
web/traseira, debounce de ~300ms e som de confirmação. Implementado na ETAPA 2.

**2. Melhor estratégia de sincronização offline ↔ Firestore?**
Fila de operações (`syncQueue`) com `last-write-wins` por timestamp: cada escrita
local vira um item na fila; quando a conexão volta, o app reprocessa na ordem
`create → update → delete`, atualizando `updatedAt` local. Leituras via
`onSnapshot` para receber mudanças de outros dispositivos. Detecção de conexão
via eventos `online`/`offline` + verificação periódica. Implementado na ETAPA 5.

**3. Funcionar em celulares antigos (Android 6+)?**
PWA leve (bundle ~120KB gzip), IndexedDB nativo do navegador, imagens comprimidas
em canvas (já existe `comprimirImagem`), Service Worker com `NetworkFirst` para o
app shell, sem dependências pesadas. Meta `viewport-fit=cover` para aparelhos com
notch. Ícones grandes e área de toque mínima de 44px.

**4. Previsão de demanda com regras simples?**
Média móvel das vendas das últimas 4 semanas por dia da semana (ex: sábado),
ajustada por tendência (peso maior nos últimos 7 dias) e com buffer de segurança
de ~10%. Ex: "com base nas últimas 4 semanas, você vai precisar de 50 pães no
próximo sábado. Compre 55." Regra pura, testável por unidade. ETAPA 5.

**5. Cuidados de segurança com os dados?**
- Firestore rules: cada usuário acessa somente seus documentos; nunca confiar no
  cliente (regras em `firebase/firestore.rules`).
- Validação de tipos/faixas nos campos (quantidade e preços ≥ 0).
- LGPD: minimizar dados coletados, exportar/eliminar dados sob demanda.
- Backup: sincronização em nuvem + exportação CSV.
- Sem senhas: login por código SMS. Criptografia em trânsito via TLS (padrão).

**6. Notificações push sem custo alto?**
Para PWA: **Web Push (VAPID)** — gratuito, funciona no Chrome Android, com
Service Worker mostrando o alerta mesmo com o app fechado. Para disparos
agendados (ex: "produto vence em X dias"), Cloud Functions roda uma vez ao dia e
verifica os estoques. Alternativa zero custo: notificações locais pelo Service
Worker quando o app abre. ETAPA 4.

## Plano de testes (principais fluxos)

| # | Fluxo | Passos | Resultado esperado |
|---|---|---|---|
| 1 | Primeiro acesso | Entrar com telefone → código mock → cadastro → onboarding | Dashboard populado com loja exemplo |
| 2 | Dashboard | Abrir o app | Totais, alertas e top 5 visíveis; alertas batem com os dados |
| 3 | Alertas | Verificar produtos do seed (3 baixos, 2 vencendo, 1 vencido) | Contadores corretos nos banners |
| 4 | Modo offline | Desligar a rede → navegar | Barra "Modo offline" aparece; app segue funcionando |
| 5 | Reenviar código | Tela de código → "Reenviar" | Novo código gerado e exibido |
| 6 | Sessão | Recarregar a página | Continua logado (restaura sessão) |
| 7 | Logout | Ajustes → Sair | Volta ao login; ao entrar de novo, dados continuam |
| 8 | Sincronizar | Ajustes → "Sincronizar agora" | Fila processada com sucesso |
| 9 | Instalar PWA | Navegador → "Adicionar à tela inicial" | Ícone no Android, abre em tela cheia |
| 10 | Sugestões | Ajustes → Sugestões | Abre WhatsApp com mensagem preenchida |

**Ambiente de teste:** Chrome desktop (DevTools mobile) + Android 6+ real para
validar PWA, offline e performance em 3G.
