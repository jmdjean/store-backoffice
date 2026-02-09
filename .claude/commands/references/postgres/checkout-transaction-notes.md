# Checkout Transaction Notes (PostgreSQL)

- Use `SELECT ... FOR UPDATE` on inventory rows to prevent overselling.
- Validate requested quantities before updating.
- Create order + items in the same transaction.
- If anything fails, rollback and return a pt-BR error message to the client.
