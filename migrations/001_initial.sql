CREATE TABLE app_users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id text NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_by_user ON sessions(user_id);
CREATE INDEX sessions_by_expiry ON sessions(expires_at);
CREATE TABLE workspaces (
  owner text PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
CREATE TABLE request_limits (
  bucket char(64) PRIMARY KEY,
  attempts integer NOT NULL,
  reset_at timestamptz NOT NULL
);
CREATE INDEX request_limits_by_expiry ON request_limits(reset_at);
