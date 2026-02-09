# CLAUDE.md — Store Backoffice

> Documento de referencia completo para qualquer agente AI (Claude, Cursor, Copilot) que trabalhe neste repositorio.
> Identico ao `agents.md`. Ambos devem ser mantidos sincronizados.

---

## 1. Visao geral do projeto

**Store Backoffice** e um sistema de backoffice para uma loja com **3 sedes**, focado em:

- Controle de **pedidos** (orders) — ciclo de vida completo
- Controle de **estoque** (inventory) — por produto, com reserva
- Controle de **vendas** — dashboard com receita, comparativos mensais, vendas por categoria
- Gestao de **produtos** e **categorias**
- Cadastro de **usuarios** (ADMIN / MANAGER)
- **Auditoria** de acoes administrativas (audit_log)
- (Opcional) **Busca semantica RAG** com pgvector
- (Opcional) **Agente de perguntas** para analytics

### Perfis de acesso

| Role    | Acesso                                     |
|---------|--------------------------------------------|
| ADMIN   | Acesso total (CRUD usuarios, config, RAG)  |
| MANAGER | Operacoes: produtos, pedidos, dashboard    |

### 3 Sedes

O sistema suporta **3 sedes (headquarters)** da loja. Cada sede pode ter seu proprio estoque e equipe. O controle de sedes deve ser considerado em:
- Filtragem de pedidos por sede
- Controle de estoque por sede (quando aplicavel)
- Relatorios e dashboard por sede

---

## 2. Arquitetura do monorepo

```
store-backoffice/
├── apps/
│   ├── frontend/          # Angular 21 (tema Glass Admin)
│   └── backend/           # NestJS + TypeScript + PostgreSQL
├── .claude/commands/      # Skills obrigatorias (ver secao 10)
├── package.json           # npm workspaces (Node >= 20)
├── backoffice.md          # Especificacao completa do backend
├── FORMULARIO-PADROES.md  # Padroes de formularios e mascaras
├── CLAUDE.md              # Este arquivo
└── agents.md              # Copia identica deste arquivo
```

### Comandos

```bash
npm install                # Instalar dependencias (workspaces)
npm run frontend           # Angular dev → http://localhost:4200
npm run backend            # API dev → http://localhost:3000
npm run frontend:build     # Build de producao do frontend
npm run backend:build      # Build de producao do backend
```

---

## 3. Stack tecnologica

| Camada     | Tecnologia                                          |
|------------|-----------------------------------------------------|
| Frontend   | Angular 21+, Standalone APIs, Signals, SCSS, Jest   |
| Backend    | NestJS, TypeScript strict, Prisma, PostgreSQL, Jest  |
| Banco      | PostgreSQL + pgvector (RAG opcional)                 |
| Auth       | JWT (access + refresh token), bcrypt                 |
| Tema       | Glass Admin (TemplateMo 607) — Glassmorphism         |
| Monorepo   | npm workspaces                                       |
| Node       | >= 20.0.0                                            |

---

## 4. Regras de linguagem (NON-NEGOTIABLE)

| Contexto                    | Idioma    |
|-----------------------------|-----------|
| Identificadores de codigo   | English   |
| Comentarios de metodos      | English (max 2 linhas) |
| Textos de UI pro usuario    | pt-BR     |
| Mensagens de erro da API    | pt-BR     |
| Mensagens de validacao      | pt-BR     |
| Commit messages             | English   |

**Todo metodo/funcao criado DEVE ter um comentario em ingles acima (max 2 linhas).**

Exemplos:
```ts
// Loads products from API and updates signal state.
async loadProducts(): Promise<void> { ... }

// Validates order status transition rules.
// Throws 422 if transition is not allowed.
validateStatusTransition(current: OrderStatus, next: OrderStatus): void { ... }
```

---

## 5. Banco de dados (PostgreSQL)

### 5.1 Tabelas principais

| Tabela               | Descricao                                  |
|----------------------|--------------------------------------------|
| users                | Usuarios (ADMIN, MANAGER, CUSTOMER)        |
| customers_profile    | Perfil do cliente (CPF, endereco)          |
| product_categories   | Categorias de produto                      |
| products             | Produtos (preco em centavos)               |
| inventory            | Estoque por produto (quantity, reserved)   |
| orders               | Pedidos (status, endereco de entrega)      |
| order_items          | Itens do pedido (snapshot de preco/nome)   |
| audit_log            | Log de auditoria (acoes admin)             |
| rag_documents        | (Opcional) Documentos RAG com embedding    |
| rag_backfill_failures| (Opcional) Falhas de backfill RAG          |

### 5.2 Tipos/Enums

```sql
user_role:    'ADMIN' | 'MANAGER' | 'CUSTOMER'
order_status: 'CREATED' | 'PAID' | 'PICKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED'
```

### 5.3 Regras de valores monetarios

- **SEMPRE armazenar em centavos (integer)**. Ex: R$ 1.234,56 → `123456`
- `price_cents >= 0`, `purchase_price_cents >= 0`
- `inventory.quantity >= 0`, `inventory.reserved_quantity <= quantity`

### 5.4 Transicoes de status de pedido

```
CREATED  → PAID, CANCELED
PAID     → PICKING, CANCELED
PICKING  → SHIPPED, CANCELED
SHIPPED  → DELIVERED, CANCELED
DELIVERED → (nenhuma)
CANCELED  → (nenhuma)
```

Qualquer outra transicao retorna **422** com mensagem pt-BR.

### 5.5 Transacoes obrigatorias

- **Checkout**: criar order + decrementar inventory em uma transacao.
  - Usar `SELECT ... FOR UPDATE` no inventory para evitar overselling.
- **Cancelamento**: validar regra + restaurar inventory + atualizar status em uma transacao.

---

## 6. API — Contratos

Todas as rotas `/admin/*` exigem `Authorization: Bearer <token>` e role ADMIN ou MANAGER.

### 6.1 Auth

| Metodo | Rota           | Descricao | Body                                                 |
|--------|----------------|-----------|------------------------------------------------------|
| POST   | `/auth/login`  | Login     | `{ identificador?, username?, email?, senha }` |

Resposta: `{ token, usuario: { id, role, nomeExibicao } }`

### 6.2 Usuarios (ADMIN only)

| Metodo | Rota           | Descricao                  |
|--------|----------------|----------------------------|
| POST   | `/admin/users` | Criar usuario admin/manager |

### 6.3 Dashboard

| Metodo | Rota                         | Descricao              |
|--------|------------------------------|------------------------|
| GET    | `/admin/painel`              | Mensagem do painel     |
| GET    | `/admin/dashboard/summary`   | Resumo vendas/receita  |

**AdminDashboardSummary:**
```ts
{
  totalSales: number;
  totalRevenueCents: number;
  currentMonth: { label: string; totalSales: number; totalRevenueCents: number };
  previousMonth: { label: string; totalSales: number; totalRevenueCents: number };
  salesByCategory: Array<{ category: string; totalSales: number; totalRevenueCents: number }>;
}
```

### 6.4 Categorias

| Metodo | Rota                          | Descricao           |
|--------|-------------------------------|---------------------|
| GET    | `/admin/product-categories`   | Listar categorias   |

### 6.5 Produtos

| Metodo | Rota                    | Descricao                     | Query/Body                    |
|--------|-------------------------|-------------------------------|-------------------------------|
| GET    | `/admin/products`       | Listar produtos               | `q?`, `category?`, `status?`  |
| GET    | `/admin/products/:id`   | Produto por ID                | —                             |
| POST   | `/admin/products`       | Criar produto + estoque       | AdminProductPayload           |
| PUT    | `/admin/products/:id`   | Atualizar produto + estoque   | AdminProductPayload           |
| DELETE | `/admin/products/:id`   | Desativar produto (soft)      | —                             |

**AdminProductPayload:**
```ts
{
  name: string;
  description: string;
  categoryId: string;
  quantity: number;          // estoque, inteiro >= 0
  weightGrams?: number | null;
  purchasePrice?: number;    // reais → converter para centavos
  salePrice?: number;        // reais → converter para centavos
  imageUrl?: string | null;
}
```

### 6.6 Pedidos

| Metodo | Rota                         | Descricao         | Query/Body                                     |
|--------|------------------------------|-------------------|-------------------------------------------------|
| GET    | `/admin/orders`              | Listar pedidos    | `status?`, `customer?`, `fromDate?`, `toDate?`  |
| PUT    | `/admin/orders/:id/status`   | Atualizar status  | `{ status: OrderStatus }`                        |

### 6.7 Respostas de erro padrao

```json
{
  "mensagem": "Texto em pt-BR.",
  "detalhes": { }
}
```

| HTTP | Uso                              |
|------|----------------------------------|
| 400  | Validacao                        |
| 401  | Nao autenticado                  |
| 403  | Sem permissao                    |
| 404  | Recurso nao encontrado           |
| 409  | Conflito (unique, estoque)       |
| 422  | Regra de negocio (ex: transicao) |
| 500  | Erro inesperado                  |

---

## 7. Frontend — Angular 21 + Glass Admin

### 7.1 Estrutura feature-first

```
src/app/
  core/            # Services globais (auth, theme, interceptors)
  shared/          # Componentes reutilizaveis, pipes, directives
  features/
    dashboard/     # Dashboard com vendas e receita
    products/      # CRUD de produtos
    orders/        # Listagem e gestao de pedidos
    users/         # Cadastro de usuarios admin/manager
    inventory/     # Controle de estoque
  layout/          # Layout principal (sidebar + navbar + content)
```

Cada feature contem:
```
features/xxx/
  pages/           # Smart components (orchestram dados)
  components/      # Dumb components (input/output only)
  facade/          # Facade (state + business logic + API)
  services/        # API calls
  models/          # Interfaces e types
  routes.ts        # Rotas lazy-loaded
```

### 7.2 Rotas do backoffice

```
/login                         → Tela de login
/admin                         → Layout com menu (guard: ADMIN | MANAGER)
/admin/dashboard               → Dashboard principal
/admin/produtos                → Lista de produtos
/admin/produtos/novo           → Formulario de novo produto
/admin/produtos/:id/editar     → Formulario de edicao
/admin/pedidos                 → Lista de pedidos
/admin/usuarios                → Gestao de usuarios (ADMIN only)
/admin/estoque                 → Controle de estoque
```

### 7.3 Tema Glass Admin (TemplateMo 607)

**Design System:** Glassmorphism com paleta emerald/gold.

#### Paleta de cores

| Token              | Valor              | Uso                         |
|--------------------|--------------------|-----------------------------|
| `--emerald`        | `#059669`          | Cor primaria                |
| `--emerald-light`  | `#34d399`          | Hover, focus, acentos       |
| `--gold`           | `#d4a574`          | Cor secundaria/destaque     |
| `--gold-light`     | `#e8c9a0`          | Gradientes                  |
| `--amber`          | `#b45309`          | Alertas                     |
| `--cream`          | `#fef3e2`          | Background claro            |
| `--coral`          | `#e07a5f`          | Acento                      |
| `--slate`          | `#475569`          | Texto neutro                |
| `--teal`           | `#0d9488`          | Acento secundario           |

#### Status colors

| Token       | Valor     | Uso                    |
|-------------|-----------|------------------------|
| `--success` | `#22c55e` | Sucesso, entregue      |
| `--warning` | `#eab308` | Alerta, em separacao   |
| `--danger`  | `#dc2626` | Erro, cancelado        |
| `--info`    | `#0ea5e9` | Informacao, enviado    |

#### Glass tokens

| Token             | Valor dark                      | Valor light                      |
|-------------------|---------------------------------|----------------------------------|
| `--glass-bg`      | `rgba(255, 255, 255, 0.05)`     | `rgba(255, 255, 255, 0.6)`      |
| `--glass-border`  | `rgba(255, 255, 255, 0.1)`      | `rgba(0, 0, 0, 0.1)`            |
| `--glass-shadow`  | `rgba(0, 0, 0, 0.3)`            | `rgba(0, 0, 0, 0.1)`            |
| `--glass-hover`   | `rgba(255, 255, 255, 0.08)`     | `rgba(255, 255, 255, 0.8)`      |

#### Background (Deep Forest → Light)

| Token              | Dark        | Light       |
|--------------------|-------------|-------------|
| `--bg-dark`        | `#0a0f0d`   | `#f5f5f0`   |
| `--bg-gradient-1`  | `#0d1a14`   | `#e8f5e9`   |
| `--bg-gradient-2`  | `#132419`   | `#f1f8e9`   |
| `--bg-gradient-3`  | `#1a2e23`   | `#fefefe`   |

#### Tipografia

| Fonte        | Uso                      |
|--------------|--------------------------|
| Outfit       | Corpo do texto, UI geral |
| Space Mono   | Valores numericos, stats |

#### Espacamento

| Token              | Valor   |
|--------------------|---------|
| `--sidebar-width`  | `280px` |
| `--navbar-height`  | `70px`  |
| `--border-radius`  | `20px`  |
| `--card-padding`   | `24px`  |

#### Transicoes

| Token                | Valor       |
|----------------------|-------------|
| `--transition-fast`  | `0.2s ease` |
| `--transition-normal`| `0.3s ease` |
| `--transition-slow`  | `0.5s ease` |

#### Componentes CSS do tema

| Classe           | Descricao                                        |
|------------------|--------------------------------------------------|
| `.glass-card`    | Card com glassmorphism (blur, borda, hover glow) |
| `.btn-primary`   | Botao gradiente emerald (shadow, hover lift)     |
| `.btn-secondary` | Botao glass com borda                            |
| `.form-input`    | Input com glass background e focus emerald       |
| `.data-table`    | Tabela de dados com hover e header muted         |
| `.status-badge`  | Badge de status (completed, pending, processing) |
| `.stats-grid`    | Grid 4 colunas para cards de estatisticas        |
| `.stat-card-inner` | Layout interno de stat card                    |
| `.stat-value`    | Valor numerico com Space Mono                    |
| `.sidebar`       | Sidebar fixa com glass background                |
| `.navbar`        | Barra superior com titulo e acoes                |
| `.login-card`    | Card de login centralizado                       |

#### Suporte a modo claro/escuro

O tema suporta toggle via atributo `data-theme="light"` no root. Usar o `ThemeService` para controlar.

---

## 8. Padroes de formularios e mascaras

### 8.1 Mascaras

| Campo    | Mascara            | Armazenamento     | Placeholder        |
|----------|--------------------|--------------------|---------------------|
| Telefone | `(XX) XXXXX-XXXX`  | So digitos (11)   | `(00) 00000-0000`  |
| CPF      | `XXX.XXX.XXX-XX`   | So digitos (11)   | `000.000.000-00`   |
| CEP      | `XXXXX-XXX`        | So digitos (8)    | `00000-000`        |
| Email    | Sem mascara         | Texto livre       | `usuario@empresa.com` |
| Moeda    | `R$ 1.234,56`      | Integer centavos  | `R$ 0,00`          |

### 8.2 Regras de formulario

- **Reactive Forms** com tipagem forte (Angular)
- Validacao com mensagens em **pt-BR**
- Labels com asterisco (*) para campos obrigatorios
- `<FormMessage />` abaixo de cada campo para exibir erro
- Desabilitar submit enquanto salva

### 8.3 Valores monetarios

- **Exibicao**: sempre `formatCentsToBRL(valueInCents)` → "R$ 1.234,56"
- **Input**: CurrencyInput (valor em reais) ou Input manual (centavos)
- **Submit**: converter para centavos antes de enviar: `Math.round(reais * 100)`
- **Carregar para edicao**: dividir centavos por 100

---

## 9. Padroes de codigo

### 9.1 Frontend (Angular 21)

- **Standalone APIs only** — SEM NgModules
- **Signals-first**: `signal()`, `computed()`, `effect()`
- **RxJS** apenas para HTTP, websockets, streams
- **ChangeDetectionStrategy.OnPush** em todos os componentes
- **Facade pattern** obrigatorio por feature
- **Smart/Dumb** component pattern
- **Lazy loading** por feature
- **Jest** para testes
- **ESLint** enforced
- **NUNCA usar `any`**

### 9.2 Backend (NestJS)

- **Modular architecture** com feature modules
- **Prisma ORM** + migrations
- **class-validator** para DTOs (mensagens pt-BR)
- **JWT** access + refresh token
- **RBAC**: guards `JwtAuthGuard` + `RolesGuard`
- **Structured errors**: `{ error: { id, code, message, details } }`
  - `code` em SCREAMING_SNAKE_CASE (English)
  - `message` em pt-BR
- **Structured logging** com Pino (traceId, userId, route, status, durationMs)
- **Helmet** + CORS + rate limiting
- **Jest** para testes unitarios e integracao
- **NUNCA usar `any`**

### 9.3 Banco (PostgreSQL)

- Migrations com timestamp + descricao
- Constraints first: PK, FK, UNIQUE, CHECK, NOT NULL
- Timestamps padrao: `created_at`, `updated_at`
- Snapshots em `order_items` (preco/nome congelados)
- Indexes para query patterns reais
- Transacoes para checkout/cancelamento
- Money sempre em centavos (integer)

---

## 10. Skills obrigatorias (.claude/commands/)

> **REGRA**: Ao gerar qualquer codigo neste projeto, as skills abaixo **DEVEM** ser consultadas e seguidas. Elas definem padroes obrigatorios de arquitetura, codigo, UX e banco de dados.

### 10.1 angular21-enterprise.skill.md
**Escopo**: Todo codigo frontend Angular.
- Angular 21+ Standalone APIs (sem NgModules)
- Signals-first state management
- Feature-first folder structure
- Facade pattern obrigatorio
- Smart/Dumb component separation
- OnPush change detection
- Reactive Forms com tipagem forte
- Lazy loading por feature
- Jest testing (describe → given → when → then)
- pt-BR UI text, English code identifiers
- Todo metodo com comentario English (max 2 linhas)

**Checklist final**:
- [ ] UI text is pt-BR
- [ ] Code identifiers English
- [ ] Every method has English comment (max 2 lines)
- [ ] Standalone APIs
- [ ] Facade used
- [ ] Signals used
- [ ] OnPush enabled
- [ ] Feature-first structure
- [ ] Jest tests created

### 10.2 node-ecommerce-nestjs.skill.md
**Escopo**: Todo codigo backend NestJS.
- NestJS + TypeScript strict + PostgreSQL + Prisma + Jest
- Modular architecture com bounded contexts
- Validation com class-validator (mensagens pt-BR)
- JWT auth com refresh tokens + RBAC
- Structured error handling com error codes (SCREAMING_SNAKE_CASE)
- Structured logging com Pino
- Helmet, CORS, rate limiting
- Idempotency para pagamentos
- Prisma schema + migrations obrigatorios
- Todo metodo com comentario English (max 2 linhas)

**Checklist final**:
- [ ] UI/client messages pt-BR
- [ ] Identifiers English
- [ ] Every method has English comment (max 2 lines)
- [ ] Validation on body/params/query
- [ ] Auth (JWT + refresh) implemented
- [ ] RBAC/ownership enforced
- [ ] Structured errors implemented globally
- [ ] Prisma models + migrations included
- [ ] Jest tests included

### 10.3 03-skill-postgres-relational.md
**Escopo**: Modelagem e migrations do banco PostgreSQL.
- Migrations trackaveis e repetiveis
- Constraints first: PK, FK, UNIQUE, CHECK, NOT NULL
- Timestamps padrao (created_at, updated_at)
- Snapshots em order_items para e-commerce
- Indexes para query patterns reais
- Transacoes para checkout/cancelamento
- CPF unico no customer profile
- inventory.quantity >= 0, precos >= 0

### 10.4 04-skill-pgvector-rag.md
**Escopo**: Implementacao de RAG com pgvector (quando aplicavel).
- PostgreSQL relacional e source of truth
- Sync flow: produto → markdown → embedding → rag_products
- Metadata para filtragem (category, sale_price, weight)
- Busca semantica com topK
- Nunca indexar dados pessoais sensiveis
- Mensagens de retorno em pt-BR

### 10.5 05-skill-ux-ui-professional.md
**Escopo**: Todo codigo de UI/UX (aplicado junto com angular21-enterprise).
- Pilares: Clareza, Consistencia, Eficiencia, Acessibilidade
- Componentes reutilizaveis: PageHeader, DataGrid, EmptyState, StatusBadge, ConfirmDialog
- Obrigatorio: loading state, empty state, error state
- Validacao apos interacao ou submit
- Desabilitar submit enquanto salva
- Badges semanticos para status
- Mensagens de usuario em pt-BR

### 10.6 SKILL_commit_push_main.md
**Escopo**: Workflow de git.
- Confirmar scope completo
- Rodar lint/tests quando disponiveis
- Revisar `git status`
- Commit message em English com `[ready]` no final
- Nao incluir arquivos nao relacionados
- Nunca usar comandos git destrutivos sem solicitacao explicita

### 10.7 Exemplos de referencia (.claude/commands/references/)

| Arquivo                                   | Descricao                                      |
|-------------------------------------------|-------------------------------------------------|
| `angular/signal-store-example.ts`         | Store com signals (load state, error handling)  |
| `badge-mapping-example.ts`                | Mapeamento de status → badge semantico          |
| `node/error-middleware-example.ts`        | Middleware de erro com AppError + pt-BR          |
| `pgvector/pgvector-schema.sql`            | Schema basico de RAG com pgvector               |
| `postgres/checkout-transaction-notes.md`  | Notas sobre transacao de checkout               |

---

## 11. Mapeamento de status para badges

| Status     | Label pt-BR     | Variante  | Cor CSS       |
|------------|-----------------|-----------|---------------|
| CREATED    | Criado          | neutral   | —             |
| PAID       | Pago            | info      | `--info`      |
| PICKING    | Em separacao    | warning   | `--warning`   |
| SHIPPED    | Enviado         | info      | `--info`      |
| DELIVERED  | Entregue        | success   | `--success`   |
| CANCELED   | Cancelado       | danger    | `--danger`    |

---

## 12. Fases de implementacao

### Fase 1 — Infra e Auth
1. Bootstrap NestJS backend + Angular frontend
2. Aplicar schemas do banco (migrations)
3. Implementar `POST /auth/login` (JWT + bcrypt)
4. Middleware de auth + role guard (ADMIN/MANAGER)
5. `POST /admin/users` — cadastro admin/manager (ADMIN only)

### Fase 2 — Core Admin
6. Dashboard: `GET /admin/dashboard/summary`
7. Categorias: `GET /admin/product-categories`
8. Produtos: GET all, GET by id, POST, PUT, DELETE (soft)
9. Pedidos: GET all (com filtros), PUT status (com transicoes)
10. Estoque: controle por produto com reserved_quantity

### Fase 3 — Frontend do Backoffice
11. Layout com sidebar + navbar + theme toggle
12. Tela de login
13. Dashboard com cards e tabelas
14. Lista de produtos com filtros + formulario criar/editar
15. Lista de pedidos com filtros + alterar status
16. Gestao de usuarios (ADMIN only)

### Fase 4 — Opcional (RAG e Agente)
17. RAG: search, backfill, reprocess-failures
18. Agente: POST `/admin/agent/ask`

---

## 13. Checklist de qualidade

Antes de entregar qualquer feature:

- [ ] Textos de UI em pt-BR
- [ ] Identificadores em English
- [ ] Todo metodo tem comentario English (max 2 linhas)
- [ ] Standalone APIs (sem NgModules)
- [ ] Facade pattern usado
- [ ] Signals usados para state
- [ ] OnPush habilitado
- [ ] Estrutura feature-first
- [ ] Testes Jest criados
- [ ] Validacao em todos os inputs (body, params, query)
- [ ] Auth JWT implementado
- [ ] RBAC enforced
- [ ] Erros estruturados com code English + message pt-BR
- [ ] Migrations do banco incluidas
- [ ] Transacoes para checkout/cancelamento
- [ ] Money em centavos (integer)
- [ ] Loading, empty e error states implementados
- [ ] Responsivo e acessivel
- [ ] Nenhum `any` no codigo

---

## 14. Convencoes de nomenclatura

### Arquivos

| Tipo                | Padrao                              | Exemplo                          |
|---------------------|-------------------------------------|----------------------------------|
| Page (smart)        | `xxx.page.ts`                       | `product-list.page.ts`           |
| Component (dumb)    | `xxx.component.ts`                  | `product-card.component.ts`      |
| Facade              | `xxx.facade.ts`                     | `products.facade.ts`             |
| Service             | `xxx.service.ts`                    | `products.service.ts`            |
| API service         | `xxx.api.ts`                        | `products.api.ts`                |
| Model/Interface     | `xxx.model.ts`                      | `product.model.ts`               |
| Routes              | `routes.ts`                         | `routes.ts`                      |
| Store (signals)     | `xxx.store.ts`                      | `products.store.ts`              |
| NestJS Controller   | `xxx.controller.ts`                 | `products.controller.ts`         |
| NestJS Service      | `xxx.service.ts`                    | `products.service.ts`            |
| NestJS Module       | `xxx.module.ts`                     | `products.module.ts`             |
| DTO                 | `xxx.dto.ts`                        | `create-product.dto.ts`          |
| Migration           | `YYYYMMDDHHMMSS_description.sql`   | `20260209120000_create_users.sql`|

### Variaveis/Classes

| Contexto         | Estilo          | Exemplo                  |
|------------------|-----------------|--------------------------|
| Classe           | PascalCase      | `ProductsFacade`         |
| Metodo/funcao    | camelCase       | `loadProducts()`         |
| Variavel         | camelCase       | `isLoading`              |
| Signal           | camelCase       | `products` (signal)      |
| Constante        | SCREAMING_SNAKE | `MAX_PAGE_SIZE`          |
| Error code       | SCREAMING_SNAKE | `ORDER_OUT_OF_STOCK`     |
| Enum value       | SCREAMING_SNAKE | `ADMIN`, `MANAGER`       |
| Tabela DB        | snake_case      | `order_items`            |
| Coluna DB        | snake_case      | `created_at`             |
| CSS class        | kebab-case      | `glass-card`             |
| Rota API         | kebab-case      | `/admin/product-categories` |

---

## 15. Seguranca

- Helmet habilitado
- CORS com allowlist via env
- Rate limiting em endpoints de auth
- Validacao de password policy
- Secrets apenas em variáveis de ambiente
- Sem secrets em logs
- JWT com expiracao curta (access) + refresh token
- Sanitizar inputs (prevencao XSS, SQL injection)
- `NODE_ENV=production` com defaults seguros
- NUNCA expor stacktrace ou mensagens internas para o usuario

---

## 16. Documentos de referencia

| Documento                | Localizacao                       | Descricao                          |
|--------------------------|-----------------------------------|------------------------------------|
| Especificacao backend    | `backoffice.md`                   | Schemas, APIs, validacoes, fluxos  |
| Padroes de formulario    | `FORMULARIO-PADROES.md`          | Mascaras, validacao, moeda         |
| Skill Angular            | `.claude/commands/angular21-enterprise.skill.md` | Padrao frontend       |
| Skill NestJS             | `.claude/commands/node-ecommerce-nestjs.skill.md` | Padrao backend       |
| Skill PostgreSQL         | `.claude/commands/03-skill-postgres-relational.md` | Padrao banco         |
| Skill pgvector RAG       | `.claude/commands/04-skill-pgvector-rag.md`        | Padrao RAG           |
| Skill UX/UI              | `.claude/commands/05-skill-ux-ui-professional.md`  | Padrao UX            |
| Skill Git                | `.claude/commands/SKILL_commit_push_main.md`       | Workflow git         |
