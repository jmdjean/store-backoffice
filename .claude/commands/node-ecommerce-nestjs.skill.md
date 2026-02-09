# Skill — Node.js E-commerce Backend (NestJS + TypeScript + Postgres)  
(Enterprise Best Practices + Validation + Auth + Structured Errors + Jest)

> **Goal:** Generate production-grade backend code for an online store (e-commerce) using modern, widely adopted market practices.  
> **Default stack:** **NestJS + TypeScript + PostgreSQL + Prisma + Jest**.

---

## 1) Non‑Negotiable Language Rules

### 1.1 User-facing messages must be **pt-BR**
Anything returned to clients intended to be read by end users must be **pt-BR**:
- `message` fields in errors/responses (when present)
- validation error messages
- toast/banner strings if any UI strings exist in API docs/examples

### 1.2 Code identifiers must be **English**
All identifiers in code must be English:
- folders, files, classes, functions, variables, DTOs, enums, route paths, database table/column names

### 1.3 Method comments (English, max 2 lines) — **MANDATORY**
**Every method/function created must have an English comment above it, max 2 lines.**
Comment must describe what the method does concisely:
```ts
// Creates a new order from the user's cart and persists it atomically.
async createOrder(...) { ... }

// Validates coupon eligibility and calculates discount amount.
// Returns null if coupon is invalid or expired.
validateCoupon(code: string): Discount | null { ... }
```

---

## 2) Reference Architecture (Modular + Domain-Oriented)

### 2.1 Mandatory high-level structure
Use **modular architecture** with clear boundaries and “feature modules”:
```
src/
  main.ts
  app.module.ts

  core/
    config/
    logging/
    security/
    exceptions/
    filters/
    interceptors/

  modules/
    auth/
    users/
    catalog/
    cart/
    orders/
    payments/
    inventory/
    shipping/
    promotions/

  shared/
    utils/
    constants/
    types/
    testing/
prisma/
  schema.prisma
  migrations/
```

### 2.2 Bounded contexts (recommended for e-commerce)
- **Catalog**: products, categories, attributes, pricing
- **Inventory**: stock, reservations
- **Cart**: cart items, totals, coupons preview
- **Orders**: checkout, order lifecycle, events
- **Payments**: payment intents, webhooks, status reconciliation
- **Shipping**: addresses, rates, fulfillment
- **Promotions**: coupons, discounts, rules

Keep modules loosely coupled; communicate via:
- internal services (simple) OR
- events (advanced) using Nest event emitter / message broker

---

## 3) Stack & Tooling (Default)

### 3.1 Runtime & Framework
- Node.js LTS
- NestJS (Controllers + Providers + Modules)
- TypeScript strict

### 3.2 Database
- PostgreSQL
- Prisma ORM
- Migrations required

### 3.3 Testing
- Jest (unit + integration)
- Testcontainers (optional) OR a dedicated test DB

### 3.4 Linting & Formatting
- ESLint + Prettier
- consistent import ordering
- no `any`

---

## 4) API Standards

### 4.1 REST conventions
- Use resource-based routes:
  - `GET /products`
  - `GET /products/:id`
  - `POST /cart/items`
  - `POST /orders`
  - `GET /orders/:id`
- Use pagination:
  - `?page=1&pageSize=20`
  - return `meta: { page, pageSize, totalItems, totalPages }`

### 4.2 Response envelope (recommended)
Success responses:
```json
{
  "data": { },
  "meta": { }
}
```

If no meta, omit it.

---

## 5) Validation (Mandatory)

### 5.1 DTO validation approach (choose one)
Prefer **class-validator + class-transformer** (common in NestJS) OR **Zod**.
Default: **class-validator**.

Rules:
- Validate **all** incoming payloads (body, params, query)
- Convert types safely (numbers, booleans)
- Reject unknown fields where possible

### 5.2 Validation messages must be pt-BR
Examples:
- "Campo obrigatório."
- "Valor inválido."
- "Formato de e-mail inválido."
- "Quantidade deve ser maior que zero."

### 5.3 Business validation
In addition to DTO validation:
- stock availability before checkout
- coupon validity (date, usage limits, customer eligibility)
- idempotency for payment operations

---

## 6) Authentication & Authorization (Mandatory)

### 6.1 Authentication
Default:
- JWT access token (short-lived)
- Refresh token (rotation)
- Password hashing with Argon2 (or bcrypt)
- Email normalization and unique constraints

Endpoints:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### 6.2 Authorization
Use RBAC:
- roles: `CUSTOMER`, `ADMIN`
- guards:
  - `JwtAuthGuard`
  - `RolesGuard`

Rules:
- Customers can only access their own cart/orders
- Admin can manage catalog/inventory/promotions

### 6.3 Security hard requirements
- Helmet
- CORS allowlist via env
- Rate limiting on auth endpoints
- Password policy validation
- Account lockout / throttling (recommended)

---

## 7) Structured Error Handling (Mandatory)

### 7.1 Single error shape (required)
All errors must follow a consistent structure:
```json
{
  "error": {
    "id": "01HXYZ...",
    "code": "ORDER_OUT_OF_STOCK",
    "message": "Não há estoque suficiente para concluir o pedido.",
    "details": [
      { "field": "items[0].quantity", "message": "Quantidade acima do estoque disponível." }
    ]
  }
}
```

Rules:
- `message` MUST be **pt-BR**
- `code` MUST be **English** (SCREAMING_SNAKE_CASE)
- `id` is a trace id (ULID/UUID) for correlation
- `details` is optional

### 7.2 HTTP status mapping (examples)
- 400: validation errors, malformed requests
- 401: authentication required
- 403: forbidden (role/ownership)
- 404: not found
- 409: conflicts (e.g., unique constraint, stock conflict)
- 422: semantic errors (e.g., coupon not applicable)
- 429: rate limit
- 500: unexpected

### 7.3 Exception filter (required)
Implement a global Nest exception filter that:
- normalizes exceptions to the standard error shape
- logs technical details
- returns pt-BR messages for known errors
- hides stack traces from clients

---

## 8) Logging & Observability (Mandatory)

### 8.1 Logging
Use structured logging (Pino recommended).
Log fields:
- `traceId`
- `userId` (if available)
- `route`
- `status`
- `durationMs`
- `error.code`

### 8.2 Health checks
- `GET /health`
- include DB connectivity

### 8.3 Metrics (recommended)
- request count/latency
- error rates
- webhook failures
- order creation success/failure

---

## 9) Data Modeling (Prisma) — E-commerce baseline

### 9.1 Core entities (minimum)
- User
- Product
- ProductVariant (optional but recommended)
- Category
- InventoryItem / Stock
- Cart
- CartItem
- Order
- OrderItem
- Payment
- Address (shipping/billing)
- Coupon/Promotion (optional)

### 9.2 Database rules
- Use transactions for checkout/order creation
- Use unique constraints where needed
- Store money as integers (cents) + currency code
- Keep audit timestamps (`createdAt`, `updatedAt`)
- Use soft delete where appropriate (optional)

---

## 10) Checkout, Payments & Webhooks (Best Practices)

### 10.1 Idempotency (mandatory for payments)
- Accept `Idempotency-Key` header for order/payment operations
- Persist idempotency records to prevent duplicates

### 10.2 Payment integration pattern
- Create payment intent
- Confirm asynchronously
- Handle webhooks with signature verification
- Reconcile payment status with provider

### 10.3 Webhook security
- Verify provider signature
- Log failures with traceId
- Retry strategy

---

## 11) Security Best Practices (Mandatory)

- Validate and sanitize input
- Protect against mass assignment
- Strict CORS config
- Secure headers via Helmet
- Secrets only in environment variables
- No secrets in logs
- Use `NODE_ENV=production` safe defaults

---

## 12) Testing Standard (Jest) — Integrated & Required

### 12.1 Unit tests required for
- services (business logic)
- validators
- guards (roles/ownership)
- mappers (DTO ↔ domain)

### 12.2 Test style
Use:
- `describe('module | unit', ...)`
- Given/When/Then comments
- deterministic tests

Examples to always test:
- out-of-stock checkout returns 409/422 with pt-BR message and correct `code`
- invalid payload returns 400 with field-level details
- unauthorized access returns 401/403 consistently

---

## 13) Output Requirements for Code Generation (Mandatory)

Whenever asked to generate a feature/module, ALWAYS output:
1) module folder + files
2) Prisma schema changes + migration steps
3) DTOs with validation (pt-BR messages)
4) Controller (thin)
5) Service (business logic)
6) Repository/data access wrapper (Prisma)
7) Guards (auth/roles) if needed
8) Error codes + mapping to pt-BR messages
9) Jest unit tests

Never generate only a single route without tests and error handling.

---

## 14) Method Comment Requirement (CRITICAL — Non-Negotiable)
**EVERY method/function created MUST have an English comment above it, max 2 lines. NO EXCEPTIONS.**

The comment must:
- Be in English (not pt-BR)
- Be placed immediately above the method signature
- Describe what the method does in **max 2 lines**
- Use clear, action-oriented language (e.g., "Creates", "Validates", "Calculates", "Returns")
- Optionally mention what it returns or side effects if relevant

Examples:
```ts
// Hashes a plaintext password using Argon2 and returns the hash.
async hashPassword(password: string): Promise<string> { ... }

// Retrieves a product by ID and applies role-based filters.
async getProductById(id: string, userRole: UserRole): Promise<Product> { ... }

// Validates that inventory is sufficient and locks stock atomically.
// Throws OutOfStockException if quantity unavailable.
async reserveInventory(productId: string, quantity: number): Promise<Reservation> { ... }
```

---

## 15) Final Checklist (Before Delivering Code)
- [ ] UI/client messages are pt-BR
- [ ] Identifiers are English
- [ ] Every method has a max-2-line English comment
- [ ] Validation on body/params/query
- [ ] Auth (JWT + refresh) implemented and tested
- [ ] RBAC/ownership enforced
- [ ] Structured errors implemented globally
- [ ] Logs include traceId and are structured
- [ ] Prisma models + migrations included
- [ ] Jest unit
