import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { editPassword } = await request.json();

  const { data: row, error } = await supabase
    .from("plans")
    .select("edit_password_hash")
    .eq("short_code", code)
    .single();

  if (error || !row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!row.edit_password_hash) {
    return Response.json({ ok: true });
  }

  if (!editPassword) {
    return Response.json({ error: "Password required" }, { status: 403 });
  }

  const ok = await bcrypt.compare(editPassword, row.edit_password_hash);
  if (!ok) {
    return Response.json({ error: "Wrong password" }, { status: 403 });
  }

  return Response.json({ ok: true });
}
