import { exigirAdmin } from "@/lib/server/auth";
import * as devolucoes from "@/lib/server/devolucoes";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request) {
  try {
    exigirAdmin(req);
    return ok(devolucoes.filaRevisaoManual());
  } catch (err) {
    return fail(err);
  }
}
