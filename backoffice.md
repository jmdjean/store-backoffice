# Backoffice – Especificação para Projeto Separado

Este documento descreve a parte **admin e manager** da aplicação (rota `/admin`), para ser replicada em um projeto de backoffice independente. Inclui schemas de banco, validações de backend, contratos das APIs e passo a passo de implementação.

**Regras gerais do projeto original:**
- Código-fonte em **inglês** (classes, métodos, variáveis, comentários).
- Mensagens para usuário em **pt-BR**, com acentuação correta (UTF-8).
- Respostas de erro padronizadas: `{ "mensagem": "...", "detalhes": { ... } }`.

---

## 1. Visão geral do backoffice

- **Perfis:** `ADMIN` (acesso total) e `MANAGER` (operações: produtos, pedidos, RAG).
- **Rotas protegidas:** todas sob prefixo `/admin/*` (exceto login e eventual cadastro de usuário admin/manager).
- **Funcionalidades:**
  - Login (admin/manager).
  - Cadastro de usuário admin e manager (a ser implementado no backoffice).
  - Dashboard (resumo de vendas e receita).
  - CRUD de produtos e estoque (inventory).
  - Listagem e alteração de status de pedidos.
  - Categorias de produtos (listagem para combos).
  - Busca semântica RAG (opcional, se o backoffice incluir RAG).
  - Agente de perguntas (opcional).

---

## 2. Schemas de banco de dados (PostgreSQL)

Aplicar migrations na ordem abaixo. Os arquivos SQL estão no projeto original em `backend/database/migrations/`.

### 2.1 Extensão e tipo de role

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'CUSTOMER');
  END IF;
END$$;
```

### 2.2 Tabela `users`

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  email VARCHAR(320),
  username VARCHAR(60),
  password_hash TEXT NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email),
  CONSTRAINT users_username_unique UNIQUE (username),
  CONSTRAINT users_contact_required CHECK (email IS NOT NULL OR username IS NOT NULL)
);
```

### 2.3 Tabela `customers_profile` (para nomes/e-mail nos pedidos)

```sql
CREATE TABLE IF NOT EXISTS customers_profile (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cpf VARCHAR(11) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  birth_date DATE NOT NULL,
  street VARCHAR(160) NOT NULL,
  street_number VARCHAR(20) NOT NULL,
  neighborhood VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state CHAR(2) NOT NULL,
  postal_code VARCHAR(8) NOT NULL,
  complement VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT customers_profile_cpf_digits CHECK (cpf ~ '^[0-9]{11}$'),
  CONSTRAINT customers_profile_postal_code_digits CHECK (postal_code ~ '^[0-9]{8}$'),
  CONSTRAINT customers_profile_state_length CHECK (char_length(state) = 2)
);

CREATE INDEX IF NOT EXISTS idx_customers_profile_city_state ON customers_profile (city, state);
```

### 2.4 Tabela `product_categories`

```sql
CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL UNIQUE,
  slug VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.5 Tabelas `products` e `inventory`

```sql
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(180) NOT NULL UNIQUE,
  name VARCHAR(180) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(80) NOT NULL,
  category_id UUID REFERENCES product_categories(id),
  image_url TEXT,
  price_cents INTEGER NOT NULL,
  purchase_price_cents INTEGER NOT NULL DEFAULT 0,
  weight_grams INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_price_cents_non_negative CHECK (price_cents >= 0),
  CONSTRAINT products_purchase_price_cents_non_negative CHECK (purchase_price_cents >= 0),
  CONSTRAINT products_weight_grams_positive CHECK (weight_grams IS NULL OR weight_grams >= 0)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products (name);

CREATE TABLE IF NOT EXISTS inventory (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_quantity_non_negative CHECK (quantity >= 0),
  CONSTRAINT inventory_reserved_quantity_non_negative CHECK (reserved_quantity >= 0),
  CONSTRAINT inventory_reserved_lte_quantity CHECK (reserved_quantity <= quantity)
);
```

### 2.6 Tabelas `orders` e `order_items`

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('CREATED', 'PAID', 'PICKING', 'SHIPPED', 'DELIVERED', 'CANCELED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status order_status NOT NULL DEFAULT 'CREATED',
  currency_code CHAR(3) NOT NULL DEFAULT 'BRL',
  total_amount_cents INTEGER NOT NULL,
  items_count INTEGER NOT NULL,
  shipping_street VARCHAR(160) NOT NULL,
  shipping_street_number VARCHAR(20) NOT NULL,
  shipping_neighborhood VARCHAR(120) NOT NULL,
  shipping_city VARCHAR(120) NOT NULL,
  shipping_state CHAR(2) NOT NULL,
  shipping_postal_code VARCHAR(8) NOT NULL,
  shipping_complement VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_total_amount_non_negative CHECK (total_amount_cents >= 0),
  CONSTRAINT orders_items_count_positive CHECK (items_count > 0),
  CONSTRAINT orders_shipping_state_length CHECK (char_length(shipping_state) = 2),
  CONSTRAINT orders_shipping_postal_code_digits CHECK (shipping_postal_code ~ '^[0-9]{8}$')
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_created_at ON orders (customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(180) NOT NULL,
  product_category VARCHAR(80) NOT NULL,
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  line_total_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_unit_price_non_negative CHECK (unit_price_cents >= 0),
  CONSTRAINT order_items_quantity_positive CHECK (quantity > 0),
  CONSTRAINT order_items_line_total_non_negative CHECK (line_total_cents >= 0),
  CONSTRAINT order_items_order_product_unique UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
```

### 2.7 Tabela `audit_log`

```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(80) NOT NULL,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor_user_id ON audit_log (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
```

### 2.8 (Opcional) RAG – `rag_documents` e `rag_backfill_failures`

Se o backoffice incluir busca semântica e backfill:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  content_markdown TEXT NOT NULL,
  embedding vector(1536) NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rag_documents_entity_unique UNIQUE (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS rag_backfill_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT NOT NULL,
  is_permanent BOOLEAN NOT NULL DEFAULT FALSE,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rag_backfill_failures_entity_unique UNIQUE (entity_type, entity_id)
);
```

---

## 3. Validações de backend

### 3.1 Login (`POST /auth/login`)

- **Body:** `{ identificador?: string, username?: string, email?: string, senha?: string }`
- **Identificador:** usar `identificador` ou `username` ou `email`; obrigatório, trim.
- **Senha:** campo `senha` obrigatório.
- Erros: 400 se faltar identificador ou senha; 401 se credenciais inválidas.
- Resposta de sucesso: `{ token: string, usuario: { id, role, nomeExibicao } }`.

### 3.2 Cadastro de usuário Admin e Manager (a implementar no backoffice)

- **Sugestão de rota:** `POST /admin/users` (protegida por ADMIN).
- **Body sugerido:**
  - `email` (opcional se tiver username) ou `username` (opcional se tiver email); pelo menos um obrigatório.
  - `senha`: string obrigatória (hash com bcrypt antes de persistir).
  - `role`: `'ADMIN'` ou `'MANAGER'`.
- **Validações:**
  - Email e username únicos (conforme tabela `users`).
  - Respeitar `users_contact_required`: pelo menos um de email/username.
  - Role deve ser ADMIN ou MANAGER (não permitir CUSTOMER neste endpoint).
- **Resposta de sucesso:** 201 com corpo por exemplo `{ mensagem: "Usuário criado com sucesso.", data: { id, role, email?, username? } }`.
- **Respostas de erro:** 400 para validação; 409 se email/username já existir; mensagens em pt-BR.

### 3.3 Produtos (admin)

- **Nome:** obrigatório, trim; não vazio.
- **Descrição:** obrigatória, trim; não vazia.
- **categoryId:** obrigatório, UUID existente em `product_categories`.
- **quantity:** inteiro ≥ 0 (estoque).
- **weightGrams:** opcional; se informado, número ≥ 0; arredondar para inteiro.
- **purchasePrice / salePrice:** numéricos ≥ 0; converter para centavos (inteiro).
- **imageUrl:** opcional; se informado, deve ser URL HTTP ou HTTPS válida.
- Slug do produto: gerado a partir do nome, único na tabela (ex.: slugify + sufixo numérico em caso de conflito).

### 3.4 Filtros de listagem de produtos (`GET /admin/products`)

- **q:** opcional; texto para busca em nome/descrição (ILIKE).
- **category:** opcional; string (nome ou identificador de categoria).
- **status:** opcional; `active` | `inactive` | `all`; default `active`. Qualquer outro valor retorna 400.

### 3.5 Pedidos – atualização de status

- **Status válidos:** `CREATED`, `PAID`, `PICKING`, `SHIPPED`, `DELIVERED`, `CANCELED`.
- **Transições permitidas:**
  - CREATED → PAID, CANCELED
  - PAID → PICKING, CANCELED
  - PICKING → SHIPPED, CANCELED
  - SHIPPED → DELIVERED, CANCELED
  - DELIVERED, CANCELED → nenhuma
- Qualquer outra transição retorna 422 com mensagem em pt-BR (ex.: "Transição de status inválida para este pedido.").

### 3.6 Filtros de listagem de pedidos (`GET /admin/orders`)

- **status:** opcional; um dos status acima ou `all`; default `all`.
- **customer:** opcional; texto para filtrar por nome (customers_profile.full_name) ou e-mail (users.email).
- **fromDate / toDate:** opcional; formato `YYYY-MM-DD`. Se informado inválido, 400 com mensagem em pt-BR.

### 3.7 Respostas de erro padrão

- Sempre JSON: `{ "mensagem": "Texto em pt-BR.", "detalhes": { ... } }` (detalhes opcional).
- 400: validação; 401: não autenticado; 403: sem permissão (ex.: CUSTOMER acessando /admin); 404: recurso não encontrado; 422: regra de negócio (ex.: transição de status).

---

## 4. Contratos das APIs (admin / manager)

Todas as rotas abaixo (exceto login e cadastro de usuário) exigem: `Authorization: Bearer <token>` e role `ADMIN` ou `MANAGER`.

### 4.1 Auth

| Método | Rota | Descrição | Body | Resposta 200/201 |
|--------|------|------------|------|------------------|
| POST | `/auth/login` | Login | `{ identificador?, username?, email?, senha? }` | `{ token, usuario: { id, role, nomeExibicao } }` |

### 4.2 Cadastro de usuário Admin/Manager (a implementar)

| Método | Rota | Descrição | Body | Resposta 201 |
|--------|------|------------|------|--------------|
| POST | `/admin/users` | Criar usuário admin ou manager | `{ email?, username?, senha, role: 'ADMIN' \| 'MANAGER' }` | `{ mensagem, data: { id, role, email?, username? } }` |

### 4.3 Painel e dashboard

| Método | Rota | Descrição | Resposta 200 |
|--------|------|------------|--------------|
| GET | `/admin/painel` | Mensagem do painel | `{ mensagem: string }` |
| GET | `/admin/dashboard/summary` | Resumo de vendas e receita | `{ data: AdminDashboardSummary }` |

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

### 4.4 Categorias de produtos

| Método | Rota | Descrição | Resposta 200 |
|--------|------|------------|--------------|
| GET | `/admin/product-categories` | Listar categorias para combos | `{ data: ProductCategorySummary[] }` |

**ProductCategorySummary:** `{ id: string; name: string; slug: string | null }`

### 4.5 Produtos – Get All e Get By Id

| Método | Rota | Descrição | Query (Get All) | Resposta 200 |
|--------|------|------------|-----------------|--------------|
| GET | `/admin/products` | Listar produtos | `q?`, `category?`, `status?` (active\|inactive\|all) | `{ data: AdminProductSummary[] }` |
| GET | `/admin/products/:id` | Produto por ID | — | `{ data: AdminProductSummary }` |

**AdminProductSummary:**

```ts
{
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  purchasePrice: number;   // decimal (reais)
  salePrice: number;       // decimal (reais)
  weightGrams: number | null;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;      // ISO 8601
  updatedAt: string;      // ISO 8601
}
```

### 4.6 Produtos – Cadastro e atualização

| Método | Rota | Descrição | Body | Resposta |
|--------|------|------------|------|----------|
| POST | `/admin/products` | Criar produto + estoque | AdminProductPayload (ver abaixo) | 201 `{ mensagem, data: AdminProductSummary }` |
| PUT | `/admin/products/:id` | Atualizar produto + estoque | AdminProductPayload | 200 `{ mensagem, data: AdminProductSummary }` |
| DELETE | `/admin/products/:id` | Desativar produto (soft) | — | 200 `{ mensagem }` |

**AdminProductPayload (body):**

```ts
{
  name: string;
  description: string;
  categoryId: string;
  quantity: number;        // estoque, inteiro >= 0
  weightGrams?: number | null;
  purchasePrice?: number;  // decimal (reais), convertido para centavos
  salePrice?: number;      // decimal (reais), convertido para centavos
  imageUrl?: string | null;
}
```

### 4.7 Pedidos

| Método | Rota | Descrição | Query / Body | Resposta |
|--------|------|------------|--------------|----------|
| GET | `/admin/orders` | Listar pedidos | `status?`, `customer?`, `fromDate?`, `toDate?` (YYYY-MM-DD) | 200 `{ data: AdminOrderSummary[] }` |
| PUT | `/admin/orders/:id/status` | Atualizar status | Body: `{ status: AdminOrderStatus }` | 200 `{ mensagem, data: AdminOrderSummary }` |

**AdminOrderStatus:** `'CREATED' | 'PAID' | 'PICKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELED'`

**AdminOrderSummary:**

```ts
{
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  status: AdminOrderStatus;
  totalAmountCents: number;
  itemsCount: number;
  currencyCode: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress: {
    street: string;
    streetNumber: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    complement: string | null;
  };
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productCategory: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }>;
}
```

### 4.8 RAG (opcional)

| Método | Rota | Quem | Descrição | Body | Resposta |
|--------|------|------|------------|------|----------|
| POST | `/admin/rag/search` | ADMIN, MANAGER | Busca semântica | `{ query: string, topK?: number, entityTypes?: string[] }` | 200 `{ mensagem, resultados: Array<{ entityType, entityId, score, snippet, metadata }> }` |
| POST | `/admin/rag/backfill` | ADMIN | Executar backfill | opcional: entityTypes, fromDate, toDate, etc. | 200 com relatório |
| POST | `/admin/rag/reprocess-failures` | ADMIN | Reprocessar falhas | opcional | 200 com relatório |
| GET | `/admin/rag/backfill/failures` | ADMIN | Listar falhas | query: entityType?, includePermanent?, limit? | 200 com lista de falhas |

### 4.9 Agente (opcional)

| Método | Rota | Descrição | Body | Resposta 200 |
|--------|------|------------|------|--------------|
| POST | `/admin/agent/ask` | Pergunta ao agente | `{ question: string, dateRange?: { from?, to? }, topK?: number, entityTypes?: string[] }` | `{ mensagem, resposta, rota, ferramentasUsadas, fontes, avisos? }` |

---

## 5. Passo a passo para construir o backoffice

Executar no outro projeto (Cursor/equipe) na ordem abaixo.

### Fase 1 – Infra e auth

1. **Bootstrap do projeto**
   - Criar projeto Node.js + TypeScript (backend) e, se desejar, frontend (ex.: Angular) apenas para backoffice.
   - Configurar PostgreSQL (local ou Docker); criar base de dados.

2. **Banco de dados**
   - Aplicar os schemas da seção 2 na ordem: user_role + users → customers_profile → product_categories → products + inventory → order_status + orders + order_items → audit_log.
   - Se for usar RAG no backoffice: aplicar também rag_documents e rag_backfill_failures (e extensão vector).

3. **Auth**
   - Implementar `POST /auth/login`: validação de identificador e senha; busca usuário por email ou username; bcrypt para comparar senha; JWT com `sub` (id), `role`, `nomeExibicao`; resposta `{ token, usuario }`.
   - Middleware de auth: extrair Bearer token, validar JWT, colocar `authUser` (id, role, nomeExibicao) em `request`.
   - Middleware de role: permitir apenas ADMIN e MANAGER nas rotas sob `/admin/*`; retornar 403 para CUSTOMER ou sem role.

4. **Cadastro de usuário admin/manager**
   - Implementar `POST /admin/users` (protegida por ADMIN): validar body (email ou username, senha, role ADMIN ou MANAGER); verificar unicidade; hash da senha (bcrypt); inserir em `users`; resposta 201 com `mensagem` e `data` (id, role, email?, username?).
   - Mensagens de erro em pt-BR (ex.: "E-mail ou nome de usuário já em uso.").

### Fase 2 – Core admin

5. **Painel e dashboard**
   - GET `/admin/painel`: retornar `{ mensagem: "Painel administrativo liberado." }` (ou equivalente em pt-BR).
   - GET `/admin/dashboard/summary`: implementar repositório/serviço que calcule totais de vendas e receita do mês atual e anterior, e vendas por categoria (ex.: order_items + orders não cancelados); resposta conforme `AdminDashboardSummary`.

6. **Categorias**
   - GET `/admin/product-categories`: listar todas as categorias ordenadas por nome; resposta `{ data: ProductCategorySummary[] }`.

7. **Produtos – listagem e detalhe**
   - GET `/admin/products`: aceitar query `q`, `category`, `status`; aplicar validações da seção 3.4; retornar `{ data: AdminProductSummary[] }` (incluir join com inventory para stockQuantity e product_categories para categoryName).
   - GET `/admin/products/:id`: retornar um produto ou 404; resposta `{ data: AdminProductSummary }`.

8. **Produtos – criar, atualizar, desativar**
   - POST `/admin/products`: validar body conforme seção 3.3; gerar slug único; inserir em `products` e `inventory`; registrar audit_log (PRODUCT_CREATED); se tiver RAG, disparar sync; resposta 201.
   - PUT `/admin/products/:id`: validar body; atualizar `products` e `inventory`; audit_log PRODUCT_UPDATED; RAG sync se existir; resposta 200.
   - DELETE `/admin/products/:id`: soft delete (is_active = false); audit_log PRODUCT_DEACTIVATED; remover ou marcar documento RAG se existir; resposta 200 `{ mensagem }`.

9. **Pedidos**
   - GET `/admin/orders`: aceitar query `status`, `customer`, `fromDate`, `toDate`; validar conforme seção 3.6; buscar orders com join em users e customers_profile para nome/email; buscar order_items por order_id; montar `AdminOrderSummary[]` com shippingAddress e items; resposta `{ data: AdminOrderSummary[] }`.
   - PUT `/admin/orders/:id/status`: validar status e transições (seção 3.5); atualizar order; registrar audit_log (ORDER_STATUS_UPDATED_BY_ADMIN); resposta 200 `{ mensagem, data: AdminOrderSummary }`.

### Fase 3 – Frontend do backoffice (resumo)

10. **App backoffice**
    - Rotas: `/login`; `/admin` (layout com menu); `/admin/dashboard`; `/admin/produtos` (lista); `/admin/produtos/novo`; `/admin/produtos/:id/editar`; `/admin/pedidos`.
    - Guard: apenas usuários autenticados com role ADMIN ou MANAGER acessam `/admin/*`; redirecionar não autenticados para login.
    - Serviços HTTP: chamar as APIs documentadas nas seções 4.1–4.7 (login, dashboard, categorias, produtos, pedidos); tratar erro padronizado `{ mensagem, detalhes }`.
    - Telas mínimas: login; dashboard (cards/tabelas com totais e categorias); lista de produtos com filtros; formulário produto (criar/editar) usando categorias; lista de pedidos com filtros e botão de alterar status.

### Fase 4 – Opcional (RAG e agente)

11. **RAG** (se o backoffice tiver busca semântica e backfill)
    - Implementar POST `/admin/rag/search` (embedding da query, busca em rag_documents, resposta com resultados).
    - Implementar POST `/admin/rag/backfill`, POST `/admin/rag/reprocess-failures`, GET `/admin/rag/backfill/failures` conforme contratos da seção 4.8.

12. **Agente** (se o backoffice tiver chat/agente)
    - Implementar POST `/admin/agent/ask` conforme seção 4.9; integrar com RAG e/ou analytics conforme projeto original.

---

## 6. Checklist final

- [ ] Banco: users, product_categories, products, inventory, orders, order_items, customers_profile, audit_log (e opcionalmente rag_documents, rag_backfill_failures).
- [ ] Auth: login com JWT; guards ADMIN/MANAGER em `/admin/*`.
- [ ] Cadastro de usuário admin/manager com validações e mensagens em pt-BR.
- [ ] APIs: painel, dashboard/summary, product-categories, products (GET all, GET by id, POST, PUT, DELETE), orders (GET all, PUT status).
- [ ] Validações e transições de status de pedido conforme seção 3.
- [ ] Respostas de erro em JSON com `mensagem` (e `detalhes` quando fizer sentido) em pt-BR.
- [ ] Código e identificadores em inglês; textos de interface e mensagens em pt-BR com acentuação correta.

---

*Documento gerado a partir do projeto jj-store para uso no projeto de backoffice separado.*
