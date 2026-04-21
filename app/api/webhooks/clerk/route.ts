import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { getDb } from "@/lib/db";
import { User } from "@/lib/db/schema";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    throw new Error("Missing CLERK_WEBHOOK_SECRET environment variable");
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  await getDb();
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
    const email = email_addresses[0]?.email_address ?? "";
    
    // Assign role based on registration metadata
    const role: any = public_metadata?.role || "student";

    console.log(`[WEBHOOK] Creating user ${id}, Email: ${email}, Role: ${role}, Metadata:`, public_metadata);

    await User.create({
      clerkUserId: id,
      email,
      firstName: first_name || undefined,
      lastName: last_name || undefined,
      role,
    });
  }

  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
    const updateData: any = {
      email: email_addresses[0]?.email_address ?? "",
      firstName: first_name || undefined,
      lastName: last_name || undefined,
    };

    if (public_metadata?.role) {
      updateData.role = public_metadata.role;
    }

    await User.updateOne(
      { clerkUserId: id },
      { $set: updateData }
    );
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    if (id) {
      await User.deleteOne({ clerkUserId: id });
    }
  }

  return new Response("OK", { status: 200 });
}
