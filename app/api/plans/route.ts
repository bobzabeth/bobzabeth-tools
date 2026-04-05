import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateCode(): string {
  return randomBytes(4).toString("base64url").slice(0, 6);
}

export async function POST(request: Request) {
  const { data, editPassword } = await request.json();

  if (!data || !data.title || !data.date || !Array.isArray(data.items)) {
    return Response.json({ error: "Invalid data" }, { status: 400 });
  }

  const passwordHash = editPassword
    ? await bcrypt.hash(editPassword, 10)
    : null;

  // short_code の衝突回避ループ
  for (let i = 0; i < 5; i++) {
    const shortCode = generateCode();
    const { error } = await supabase.from("plans").insert({
      short_code: shortCode,
      data,
      edit_password_hash: passwordHash,
    });

    if (!error) {
      return Response.json({ shortCode });
    }
    // unique 違反以外はエラー
    if (!error.message.includes("unique")) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }

  return Response.json({ error: "Failed to generate unique code" }, { status: 500 });
}
