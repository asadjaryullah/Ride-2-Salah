import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/push-subscribe-native  → FCM-Token der nativen App speichern
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: userData, error: userErr } = await getSupabase().auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fcmToken = body?.token;
  const platform = body?.platform;

  if (!fcmToken || (platform !== "ios" && platform !== "android")) {
    return NextResponse.json({ error: "token und platform ('ios'|'android') erforderlich" }, { status: 400 });
  }

  // Erst löschen falls der Token schon existiert (z.B. anderer User auf
  // demselben Geraet), dann neu einfügen - gleiches Muster wie push-subscribe.
  await getSupabase().from("native_push_tokens").delete().eq("token", fcmToken);

  const { error } = await getSupabase().from("native_push_tokens").insert({
    user_id: userData.user.id, platform, token: fcmToken,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

// DELETE /api/push-subscribe-native  → Token löschen (z.B. beim Abmelden)
export async function DELETE(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: userData, error: userErr } = await getSupabase().auth.getUser(token);
  if (userErr || !userData?.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fcmToken = body?.token;

  if (!fcmToken) {
    await getSupabase().from("native_push_tokens").delete().eq("user_id", userData.user.id);
  } else {
    await getSupabase().from("native_push_tokens").delete().eq("token", fcmToken).eq("user_id", userData.user.id);
  }

  return NextResponse.json({ success: true });
}
