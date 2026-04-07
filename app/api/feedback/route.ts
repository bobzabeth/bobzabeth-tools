import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { message, page } = await request.json();
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return Response.json({ error: "Empty message" }, { status: 400 });
  }

  const { error } = await supabase.from("feedback").insert({
    message: message.trim().slice(0, 1000),
    page: page ?? null,
  });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
