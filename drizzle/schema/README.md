# SQL schema files

One file per PostgreSQL schema. The files assume an empty database (drop the
target schemas first, e.g. on a disposable dev branch).

Apply in dependency order:

1. `core.sql`
2. `lookups.sql`
3. `customers.sql`
4. `products.sql`
5. `staff.sql`
6. `suppliers.sql`
7. `purchases.sql`
8. `transactions.sql`
9. `inventory.sql`
10. `payments.sql`
11. `audit.sql`
12. `settings.sql`
13. `platform.sql`

`core.sql` also includes the Better Auth tables (`AuthUser`, `AuthSession`,
`AuthAccount`, `AuthVerification`) alongside the app tables. There is no
separate `auth` schema — Supabase's built-in `auth` schema is reserved for
Supabase Auth and is not writable by the app role.

`platform.sql` depends on `core.sql` (`platform.Subscriptions.BusinessId`).
It is applied last because it has no dependents. Gumroad stays the billing
source of truth; `platform` only mirrors plans, subscriptions, and webhook
events.