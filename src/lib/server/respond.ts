import { NextResponse } from "next/server";
import { ApiError } from "./auth";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(err: unknown) {
  if (err instanceof ApiError) {
    return NextResponse.json({ statusCode: err.statusCode, message: err.message }, { status: err.statusCode });
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return NextResponse.json({ statusCode: 500, message: "Erro inesperado" }, { status: 500 });
}
