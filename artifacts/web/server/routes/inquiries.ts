import { Router } from "express";
import multer from "multer";
import { db, notify } from "../db/index";
import { inquiries, messages, messageReads, properties, users } from "../db/schema";
import { eq, and, or, desc, count, notExists, ne, sql } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";
import { z } from "zod";
import { sendInquiryReplyEmail } from "../email";
import { getStorage } from "../storage";

export const inquiriesRouter = Router();

const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED_IMAGE_MIMES.includes(file.mimetype));
  },
});

// Create inquiry (buyer contacts agent about a property)
inquiriesRouter.post("/", requireAuth, async (req, res) => {
  const schema = z.object({
    propertyId: z.string().uuid(),
    message: z.string().min(1).optional(),
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

    // Add message only if provided
    let message = null;
    if (data.message) {
      [message] = await db
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
    }

    // Notify the agent about the new inquiry
    const [buyer] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.session.userId!)).limit(1);
    await notify(property.userId, "new_inquiry", `New inquiry on ${property.title}`, `${buyer?.name || "A buyer"} is interested in your property`, `/inquiries/${inquiry.id}`);

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
            ne(messages.senderId, userId),
            notExists(
              db.select({ x: sql`1` }).from(messageReads).where(
                and(
                  eq(messageReads.messageId, messages.id),
                  eq(messageReads.userId, sql`${userId}::uuid`)
                )
              )
            )
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

  res.json(enriched.filter((c) => c.lastMessage != null));
});

// Mark messages as read (must be before /:id routes)
inquiriesRouter.post("/messages/mark-read", requireAuth, async (req, res) => {
  const schema = z.object({ messageIds: z.array(z.string().uuid()).min(1) });

  try {
    const { messageIds } = schema.parse(req.body);
    const userId = req.session.userId!;

    await db.insert(messageReads)
      .values(messageIds.map((mid) => ({ messageId: mid, userId })))
      .onConflictDoNothing();

    // Also update legacy isRead for web client compat
    await db.update(messages).set({ isRead: true }).where(
      and(
        sql`${messages.id} = ANY(${messageIds}::uuid[])`,
        ne(messages.senderId, userId)
      )
    );

    res.json({ marked: messageIds.length });
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get total unread count (must be before /:id routes)
inquiriesRouter.get("/messages/unread-count", requireAuth, async (req, res) => {
  const userId = req.session.userId!;

  const [{ total }] = await db
    .select({ total: count() })
    .from(messages)
    .innerJoin(inquiries, eq(messages.inquiryId, inquiries.id))
    .where(
      and(
        or(eq(inquiries.buyerId, userId), eq(inquiries.agentId, userId)),
        ne(messages.senderId, userId),
        notExists(
          db.select({ x: sql`1` }).from(messageReads).where(
            and(
              eq(messageReads.messageId, messages.id),
              eq(messageReads.userId, sql`${userId}::uuid`)
            )
          )
        )
      )
    );

  res.json({ unreadCount: total });
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

  res.json(msgs);
});

// Send message (REST fallback)
inquiriesRouter.post("/:id/messages", requireAuth, async (req, res) => {
  const schema = z
    .object({
      content: z.string().optional(),
      attachments: z.array(z.string()).optional(),
    })
    .refine((d) => (d.content && d.content.length > 0) || (d.attachments && d.attachments.length > 0), {
      message: "Message must have content or at least one attachment",
    });

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
        content: data.content || "",
        attachments: data.attachments,
      })
      .returning();

    await db
      .update(inquiries)
      .set({ updatedAt: new Date() })
      .where(eq(inquiries.id, req.params.id));

    // Notify the other party
    const recipientId = inquiry.buyerId === req.session.userId ? inquiry.agentId : inquiry.buyerId;
    const [sender] = await db.select({ name: users.name }).from(users).where(eq(users.id, req.session.userId!)).limit(1);
    const [recipient] = await db.select({ email: users.email }).from(users).where(eq(users.id, recipientId)).limit(1);
    const [property] = await db.select({ title: properties.title }).from(properties).where(eq(properties.id, inquiry.propertyId)).limit(1);
    const senderName = sender?.name || "someone";
    const propertyTitle = property?.title || "a property";
    const preview = data.content?.slice(0, 100) || (data.attachments?.length ? `📎 ${data.attachments.length} image${data.attachments.length > 1 ? "s" : ""}` : "");

    await notify(recipientId, "new_message", `New message from ${senderName}`, preview, `/inquiries/${inquiry.id}`, {
      sendEmail: recipient ? () => sendInquiryReplyEmail(recipient.email, senderName, propertyTitle, preview, inquiry.id) : undefined,
    });

    res.status(201).json(message);
  } catch (err) {
    if (err instanceof z.ZodError)
      return res.status(400).json({ message: err.errors[0].message });
    res.status(500).json({ message: "Internal server error" });
  }
});

// Upload one or more image attachments for a chat. Returns URLs the client then
// includes in `attachments` when sending a message.
inquiriesRouter.post(
  "/:id/attachments",
  requireAuth,
  attachmentUpload.array("files", 5),
  async (req, res) => {
    try {
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

      const files = (req.files as Express.Multer.File[] | undefined) || [];
      if (files.length === 0) {
        return res.status(400).json({ message: "No images uploaded (jpeg/png/webp, max 10MB each)" });
      }

      const storage = await getStorage();
      const urls: string[] = [];
      for (const f of files) {
        const { url } = await storage.uploadImage(f.buffer, f.originalname, f.mimetype);
        urls.push(url);
      }
      res.json({ urls });
    } catch (err) {
      console.error("Attachment upload failed:", err);
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

