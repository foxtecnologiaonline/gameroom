import { exigirUsuario } from "@/lib/server/auth";
import * as devolucoes from "@/lib/server/devolucoes";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = exigirUsuario(req);
    return ok(devolucoes.obterDoUsuario(params.id, usuario));
  } catch (err) {
    return fail(err);
  }
}
