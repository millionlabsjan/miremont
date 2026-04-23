import { Router } from "express";
import { db } from "../db/index";
import { inquiries, messages, properties, users } from "../db/schema";
import { eq, and, or, desc, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";

export const inquiriesRouter = Router();

// Create inquiry (buyer contacts agent about a property)
inquiriesRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    propertyId: z.string().uuid(),
    message: z.string().min(1),
  });

  try {
    const data = schema.parse(req.body);

    // Get the property's agent
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.id, data.propertyId))
      .limit(1);

    if (!property) return res.status(404).json({ message: "Property not found" });

    // Check if inquiry already exists
    const [existing] = await db
      .select()
      .from(inquiries)
      .where(
        and(
          eq(inquiries.propertyId, data.propertyId),
          eq(inquiries.buyerId, req.session.userId!)
        )
      )
      .limit(1);

    let inquiry = existing;
    if (!inquiry) {
      [inquiry] = await db
        .insert(inquiries)
        .values({
          propertyId: data.propertyId,
          buyerId: req.session.userId!,
          agentId: property.userId,
        })
        .returning();
    }

    // Add the message
    const [message] = await db
      .insert(messages)
      .values({
        inquiryId: inquiry.id,
        senderId: req.session.userId!,
        content: data.message,
      })
      .returning();

    await db
      .update(inquiries)
      .set({ updatedAt: new Date() })
      .where(eq(inquiries.id, inquiry.id));

    res.status(201).json({ inquiry, message });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    console.error("Create inquiry error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// List own inquiries/conversations
inquiriesRouter.get("/", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const convos = await db
    .select()
    .from(inquiries)
    .where(
      or(eq(inquiries.buyerId, userId), eq(inquiries.agentId, userId))
    )
    .orderBy(desc(inquiries.updatedAt));

  // Enrich with property title, other party name, last message, unread count
  const enriched = await Promise.all(
    convos.map(async (inq) => {
      const [prop] = await db
        .select({ title: properties.title, images: properties.images })
        .from(properties)
        .where(eq(properties.id, inq.propertyId))
        .limit(1);

      const otherUserId =
        inq.buyerId === userId ? inq.agentId : inq.buyerId;
      const [otherUser] = await db
        .select({
          name: users.name,
          avatarUrl: users.avatarUrl,
          agencyName: users.agencyName,
        })
        .from(users)
        .where(eq(users.id, otherUserId))
        .limit(1);

      const [lastMsg] = await db
        .select()
        .from(messages)
        .where(eq(messages.inquiryId, inq.id))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      const [{ unread }] = await db
        .select({ unread: count() })
        .from(messages)
        .where(
          and(
            eq(messages.inquiryId, inq.id),
            eq(messages.isRead, false),
            eq(messages.senderId, otherUserId)
          )
        );

      return {
        ...inq,
        property: prop,
        otherUser: { ...otherUser, id: otherUserId },
        lastMessage: lastMsg,
        unreadCount: unread,
      };
    })
  );

  res.json(enriched);
});

// Get messages for an inquiry
inquiriesRouter.get("/:id/messages", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  // Verify user is part of this inquiry
  const [inquiry] = await db
    .select()
    .from(inquiries)
    .where(eq(inquiries.id, req.params.id))
    .limit(1);

  if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
  if (inquiry.buyerId !== userId && inquiry.agentId !== userId) {
    return res.status(403).json({ message: "Access denied" });
  }

  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.inquiryId, req.params.id))
    .orderBy(messages.createdAt);

  // Mark messages from other party as read
  const otherUserId =
    inquiry.buyerId === userId ? inquiry.agentId : inquiry.buyerId;
  await db
    .update(messages)
    .set({ isRead: true })
    .where(
      and(
        eq(messages.inquiryId, req.params.id),
        eq(messages.senderId, otherUserId),
        eq(messages.isRead, false)
      )
    );

  res.json(msgs);
});

// Send message (REST fallback)
inquiriesRouter.post("/:id/messages", requireAuth, async (req, res) => {
  const schema = z.object({ content: z.string().min(1) });

  try {
    const data = schema.parse(req.body);

    const [inquiry] = await db
      .select()
      .from(inquiries)
      .where(eq(inquiries.id, req.params.id))
      .limit(1);

    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });
    if (
      inquiry.buyerId !== req.session.userId &&
      inquiry.agentId !== req.session.userId
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const [message] = await db
      .insert(messages)
      .values({
        inquiryId: req.params.id,
        senderId: req.session.userId!,
        content: data.content,
      })
      .returning();

    await db
      .update(inquiries)
      .set({ updatedAt: new Date() })
      .where(eq(inquiries.id, req.params.id));

    res.status(201).json(message);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});
