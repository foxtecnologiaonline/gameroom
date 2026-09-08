import { exigirAdmin } from "@/lib/server/auth";
import * as vendas from "@/lib/server/vendas";
import { ok, fail } from "@/lib/server/respond";

export async function GET(req: Request) {
  try {
    exigirAdmin(req);
    return ok(vendas.listarTodas());
  } catch (err) {
    return fail(err);
  }
}
