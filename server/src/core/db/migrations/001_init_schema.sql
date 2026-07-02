
-- =========================
-- 🏢 TENANTS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS tenants (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 👤 USERS TABLE
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 📊 LEDGER (ACCOUNTING CORE)
-- =========================
CREATE TABLE IF NOT EXISTS ledger (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  type TEXT NOT NULL, -- EXPENSE / INVOICE / PAYMENT
  debit TEXT,
  credit TEXT,
  amount NUMERIC,
  currency TEXT DEFAULT 'EUR',
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 📁 AUDIT LOG (GOBD CORE)
-- =========================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  event TEXT NOT NULL,
  data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- =========================
-- 💳 SUBSCRIPTIONS (SAAS CORE)
-- =========================
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  tenant_id INT REFERENCES tenants(id),
  plan TEXT,
  status TEXT DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

