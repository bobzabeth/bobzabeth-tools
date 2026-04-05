import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data: row, error } = await supabase
    .from("plans")
    .select("data, edit_password_hash")
    .eq("short_code", code)
    .single();

  if (error || !row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // last_accessed_at を更新
  await supabase
    .from("plans")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("short_code", code);

  return Response.json({
    data: row.data,
    hasPassword: !!row.edit_password_hash,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { data, editPassword } = await request.json();

  if (!data) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }

  const { data: row, error: fetchError } = await supabase
    .from("plans")
    .select("edit_password_hash")
    .eq("short_code", code)
    .single();

  if (fetchError || !row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (row.edit_password_hash) {
    if (!editPassword) {
      return Response.json({ error: "Password required" }, { status: 403 });
    }
    const ok = await bcrypt.compare(editPassword, row.edit_password_hash);
    if (!ok) {
      return Response.json({ error: "Wrong password" }, { status: 403 });
    }
  }

  const { error: updateError } = await supabase
    .from("plans")
    .update({
      data,
      updated_at: new Date().toISOString(),
      last_accessed_at: new Date().toISOString(),
    })
    .eq("short_code", code);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
