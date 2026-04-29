import { Router } from "express";
import { db, notify } from "../db/index";
import { users, sessions } from "../db/schema";
import { eq, and, gt } from "drizzle-orm";
import { z } from "zod";
import argon2 from "argon2";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../email";

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

    // Notify all admins about new signup
    const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
    await Promise.all(admins.map((a) => notify(a.id, "new_user", `New ${user.role} signed up`, `${user.name} (${user.email}) joined the platform`)));

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

// Forgot password — send reset email
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({ message: "If that email exists, a reset link has been sent." });
    }

    const token = nanoid(48);
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await db
      .update(users)
      .set({
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: expiresAt,
      })
      .where(eq(users.id, user.id));

    try {
      await sendPasswordResetEmail(email, token);
    } catch (emailErr) {
      console.warn("Failed to send reset email:", emailErr);
    }

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Reset password — validate token and set new password
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = z
      .object({ token: z.string(), password: z.string().min(8) })
      .parse(req.body);

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, tokenHash),
          gt(users.passwordResetExpiresAt, new Date())
        )
      )
      .limit(1);

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    const passwordHash = await argon2.hash(password);

    await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      })
      .where(eq(users.id, user.id));

    res.json({ message: "Password has been reset successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
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
      phone: users.phone,
      preferredLanguage: users.preferredLanguage,
      preferredCurrency: users.preferredCurrency,
      notificationPrefs: users.notificationPrefs,
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
