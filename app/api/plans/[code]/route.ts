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
  // data は省略可（パスワード変更のみの場合）
  // newEditPassword: string = 新パスワード設定, "" | null = パスワード削除, undefined = 変更なし
  const { data, editPassword, newEditPassword } = await request.json();

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

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    last_accessed_at: new Date().toISOString(),
  };
  if (data != null) patch.data = data;
  if (newEditPassword !== undefined) {
    patch.edit_password_hash = newEditPassword
      ? await bcrypt.hash(newEditPassword, 10)
      : null;
  }

  const { error: updateError } = await supabase
    .from("plans")
    .update(patch)
    .eq("short_code", code);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { error } = await supabase
    .from("plans")
    .delete()
    .eq("short_code", code);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
