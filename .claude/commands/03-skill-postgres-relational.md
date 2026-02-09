# SKILL - PostgreSQL Relational Database (Migrations + Modeling)

## Objective
Model and evolve PostgreSQL schema with safe migrations, correct constraints, and performance-aware indexing.

---

## Required principles
1. Trackable and repeatable migrations.
2. Constraints first: PK, FK, UNIQUE, CHECK, NOT NULL.
3. Standard timestamps (`created_at`, `updated_at`).
4. E-commerce modeling with snapshots in `order_items`.
5. Indexes for real query patterns.
6. Transactions for critical operations (checkout/cancellation).
7. Balance normalization with practicality.
8. Avoid destructive deletion without strategy.

---

## Migration rules
- Name migration files with timestamp + description.
- Recommended order:
  1. create enums/types
  2. create tables
  3. add constraints/FKs
  4. add indexes
  5. add seeds (separately when needed)

### Important constraints
- `cpf` unique in customer profile.
- `inventory.quantity >= 0`.
- `purchase_price >= 0` and `sale_price >= 0`.

## Transaction pattern
- Checkout: create order + decrement inventory in one transaction.
- Cancellation: validate rule + restore inventory + update status in one transaction.

## Completion checklist
- [ ] Migration executes safely on existing DB
- [ ] Constraints/indexes in place
- [ ] Critical flows use transactions
