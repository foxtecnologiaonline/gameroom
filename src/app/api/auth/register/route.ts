import { registrar, ApiError } from "@/lib/server/auth";
import { ok, fail } from "@/lib/server/respond";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.nome || body.nome.trim().length < 2) throw new ApiError(400, "Informe seu nome completo");
    if (!body?.email) throw new ApiError(400, "Informe o e-mail");
    if (!body?.senha || body.senha.length < 6) throw new ApiError(400, "A senha deve ter ao menos 6 caracteres");
    const resultado = await registrar(body.nome, body.email, body.senha);
    return ok(resultado, 201);
  } catch (err) {
    return fail(err);
  }
}
