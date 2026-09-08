import * as vendas from "@/lib/server/vendas";
import { ok, fail } from "@/lib/server/respond";

export async function GET(_req: Request, { params }: { params: { vendaId: string } }) {
  try {
    return ok(vendas.obterVenda(params.vendaId));
  } catch (err) {
    return fail(err);
  }
}
