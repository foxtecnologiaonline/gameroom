import { exigirAdmin, resolveUsuario } from "@/lib/server/auth";
import * as produtos from "@/lib/server/produtos";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = resolveUsuario(req);
    return ok(produtos.obterDetalhe(params.id, usuario?.tipo === "admin"));
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    exigirAdmin(req);
    const dto = await req.json();
    return ok(produtos.atualizar(params.id, dto));
  } catch (err) {
    return fail(err);
  }
}
