import { exigirUsuario } from "@/lib/server/auth";
import * as vendas from "@/lib/server/vendas";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request, { params }: { params: { vendaId: string } }) {
  try {
    const usuario = exigirUsuario(req);
    return ok(vendas.obterDoUsuario(params.vendaId, usuario));
  } catch (err) {
    return fail(err);
  }
}
