export type LocalAccount = {
  email: string;
  password: string;
  name: string;
  role: "admin" | "user";
  provider: "email" | "google" | "facebook";
  created_at: string;
};

const ACCOUNTS_KEY = "marketpulse_accounts_v1";
const SESSION_KEY = "marketpulse_session_v1";

const DEFAULT_ADMIN: LocalAccount = {
  email: "admin@marketpulse.dev",
  password: "Admin@12345",
  name: "MarketPulse Admin",
  role: "admin",
  provider: "email",
  created_at: new Date("2026-03-25T00:00:00Z").toISOString(),
};

function readAccounts(): LocalAccount[] {
  if (typeof window === "undefined") return [DEFAULT_ADMIN];
  const raw = window.localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [DEFAULT_ADMIN];

  try {
    const parsed = JSON.parse(raw) as LocalAccount[];
    if (!Array.isArray(parsed)) return [DEFAULT_ADMIN];
    return parsed;
  } catch {
    return [DEFAULT_ADMIN];
  }
}

function writeAccounts(accounts: LocalAccount[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function ensureAdminAccount() {
  const accounts = readAccounts();
  if (accounts.some((item) => item.email.toLowerCase() === DEFAULT_ADMIN.email.toLowerCase())) {
    return DEFAULT_ADMIN;
  }

  const next = [DEFAULT_ADMIN, ...accounts];
  writeAccounts(next);
  return DEFAULT_ADMIN;
}

export function registerWithEmail(params: { name: string; email: string; password: string }) {
  const accounts = readAccounts();
  const email = params.email.trim().toLowerCase();

  if (accounts.some((item) => item.email.toLowerCase() === email)) {
    throw new Error("An account with that email already exists.");
  }

  const account: LocalAccount = {
    email,
    password: params.password,
    name: params.name.trim(),
    role: "user",
    provider: "email",
    created_at: new Date().toISOString(),
  };

  const next = [account, ...accounts];
  writeAccounts(next);
  return account;
}

export function loginWithEmail(email: string, password: string) {
  const accounts = readAccounts();
  const account = accounts.find(
    (item) => item.email.toLowerCase() === email.trim().toLowerCase() && item.password === password
  );

  if (!account) {
    throw new Error("Invalid credentials.");
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  }

  return account;
}

export function socialLogin(provider: "google" | "facebook") {
  const accounts = readAccounts();
  const email = `${provider}.demo@marketpulse.dev`;
  const existing = accounts.find((item) => item.email === email);

  const account: LocalAccount = existing || {
    email,
    password: "",
    name: provider === "google" ? "Google Demo User" : "Facebook Demo User",
    role: "user",
    provider,
    created_at: new Date().toISOString(),
  };

  if (!existing) {
    writeAccounts([account, ...accounts]);
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(account));
  }

  return account;
}
