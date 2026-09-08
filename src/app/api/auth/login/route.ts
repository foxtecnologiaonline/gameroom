import { login, ApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/respond";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.email || !body?.senha) throw new ApiError(400, "Informe e-mail e senha");
    const resultado = await login(body.email, body.senha);
    return ok(resultado);
  } catch (err) {
    return fail(err);
  }
}
