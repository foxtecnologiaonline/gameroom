import { resolveUsuario, ApiError } from "@/lib/server/auth";
import * as vendas from "@/lib/server/vendas";
import { ok, fail } from "@/lib/server/respond";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body?.produtoId) throw new ApiError(400, "Informe o produto");
    const usuario = resolveUsuario(req);
    return ok(vendas.criarCheckout(body.produtoId, body.email, usuario), 201);
  } catch (err) {
    return fail(err);
  }
}
