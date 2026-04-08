import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// パスワード不要でtodosのdone状態だけ更新するエンドポイント
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { todos } = await request.json();

  const { data: row, error: fetchError } = await supabase
    .from("plans")
    .select("data")
    .eq("short_code", code)
    .single();

  if (fetchError || !row) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const updatedData = { ...row.data, todos };

  const { error: updateError } = await supabase
    .from("plans")
    .update({ data: updatedData, last_accessed_at: new Date().toISOString() })
    .eq("short_code", code);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
