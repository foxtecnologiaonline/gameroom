import { exigirUsuario, ApiError } from "@/lib/server/auth";
import * as devolucoes from "@/lib/server/devolucoes";
import { ok, fail } from "@/lib/server/respond";

export async function POST(req: Request) {
  try {
    const usuario = exigirUsuario(req);
    const body = await req.json();
    if (!body?.vendaId) throw new ApiError(400, "Informe a venda");
    if (!body?.motivo || body.motivo.trim().length < 10) {
      throw new ApiError(400, "Descreva o motivo com pelo menos 10 caracteres");
    }
    return ok(devolucoes.criar(body.vendaId, body.motivo, usuario), 201);
  } catch (err) {
    return fail(err);
  }
}
