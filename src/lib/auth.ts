import "server-only";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";

import {
  appDatabase,
  deleteAuthSession,
  findUserByEmail,
  findUserById,
  findUserIdByTokenHash,
  insertAuthSession,
  insertUser,
} from "@/lib/records-db";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from "@/lib/passwords";
import type { Account } from "@/lib/types";

const COOKIE = "sehatpass_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

export class AuthRequiredError extends Error {
  constructor() {
    super("Sign in to see your records.");
    this.name = "AuthRequiredError";
  }
}

export class AccountConflictError extends Error {
  constructor() {
    super("An account with that email already exists.");
    this.name = "AccountConflictError";
  }
}

let dummyHash: Promise<string> | null = null;

function cookieOptions(maxAge = THIRTY_DAYS_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateCredentials(email: string, password: string, displayName?: string): void {
  if (displayName !== undefined) {
    const name = displayName.trim();
    if (!name || name.length > 80) {
      throw new Error("Enter a name up to 80 characters.");
    }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if (password.length < 8) {
    throw new Error("Use a password of at least 8 characters.");
  }
}

export async function signUp(input: {
  email?: string;
  password?: string;
  displayName?: string;
}): Promise<Account> {
  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";
  const displayName = (input.displayName ?? "").trim();
  validateCredentials(email, password, displayName);

  const now = new Date();
  const user: Account = {
    id: `user-${randomBytes(8).toString("hex")}`,
    email,
    displayName,
  };
  const passwordHash = await hashPassword(password);
  const session = createSessionToken();
  const database = appDatabase();
  database.exec("BEGIN");
  try {
    insertUser(database, {
      ...user,
      passwordHash,
      createdAt: now.toISOString(),
    });
    insertAuthSession(database, {
      tokenHash: session.tokenHash,
      userId: user.id,
      expiresAt: new Date(now.getTime() + THIRTY_DAYS_MS).toISOString(),
    });
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    if (String(error).includes("UNIQUE")) throw new AccountConflictError();
    throw error;
  }
  await setSessionCookie(session.token);
  return user;
}

export async function logIn(input: { email?: string; password?: string }): Promise<Account> {
  const email = normalizeEmail(input.email ?? "");
  const password = input.password ?? "";
  validateCredentials(email, password);
  const database = appDatabase();
  const existing = findUserByEmail(database, email);
  const hash = existing?.passwordHash ?? (await placeholderHash());
  const matches = await verifyPassword(password, hash);
  if (!existing || !matches) {
    throw new Error("Email or password is not correct.");
  }
  const session = createSessionToken();
  insertAuthSession(database, {
    tokenHash: session.tokenHash,
    userId: existing.id,
    expiresAt: new Date(Date.now() + THIRTY_DAYS_MS).toISOString(),
  });
  await setSessionCookie(session.token);
  return {
    id: existing.id,
    email: existing.email,
    displayName: existing.displayName,
  };
}

export async function logOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) deleteAuthSession(appDatabase(), hashSessionToken(token));
  jar.set(COOKIE, "", cookieOptions(0));
}

export async function getCurrentUser(): Promise<Account | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const database = appDatabase();
  const userId = findUserIdByTokenHash(database, hashSessionToken(token), new Date().toISOString());
  if (!userId) return null;
  return findUserById(database, userId);
}

export async function requireUser(): Promise<Account> {
  const user = await getCurrentUser();
  if (!user) throw new AuthRequiredError();
  return user;
}

async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, cookieOptions());
}

function placeholderHash(): Promise<string> {
  if (!dummyHash) dummyHash = hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}
