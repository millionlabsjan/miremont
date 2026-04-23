import { Router } from "express";
import { db } from "../db/index";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import argon2 from "argon2";
import { nanoid } from "nanoid";
import crypto from "crypto";

// Sign a session ID the same way express-session does
function signSessionId(sessionId: string, secret: string): string {
  const signature = crypto
    .createHmac("sha256", secret)
    .update(sessionId)
    .digest("base64")
    .replace(/=+$/, "");
  return `s:${sessionId}.${signature}`;
}

const SESSION_SECRET = process.env.SESSION_SECRET || "miremont-dev-secret";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(["buyer", "agent"]).default("buyer"),
  agencyName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/signup", async (req, res) => {
  try {
    const data = signupSchema.parse(req.body);

    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const passwordHash = await argon2.hash(data.password);

    const [user] = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash,
        name: data.name,
        role: data.role,
        agencyName: data.agencyName,
      })
      .returning();

    req.session.userId = user.id;
    req.session.role = user.role;

    req.session.save(() => {
      const signedCookie = signSessionId(req.sessionID, SESSION_SECRET);
      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        sessionCookie: signedCookie,
      });
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Signup error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/login", async (req, res) => {
  try {
    const data = loginSchema.parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account is not active" });
    }

    const valid = await argon2.verify(user.passwordHash, data.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    req.session.userId = user.id;
    req.session.role = user.role;

    // Force save session, then return the signed cookie for mobile clients
    req.session.save(() => {
      const signedCookie = signSessionId(req.sessionID, SESSION_SECRET);

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
        agencyName: user.agencyName,
        preferredLanguage: user.preferredLanguage,
        preferredCurrency: user.preferredCurrency,
        sessionCookie: signedCookie,
      });
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

authRouter.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
});

authRouter.get("/me", async (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatarUrl: users.avatarUrl,
      agencyName: users.agencyName,
      preferredLanguage: users.preferredLanguage,
      preferredCurrency: users.preferredCurrency,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, req.session.userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "User not found" });
  }

  res.json(user);
});
