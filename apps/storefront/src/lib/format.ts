export function formatarPreco(valor: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

/** A API trabalha sempre em centavos (priceCents, totalCents, ...). */
export function formatarCentavos(cents: number): string {
  return formatarPreco(cents / 100);
}

export function formatarData(data?: string): string {
  if (!data) return "-";
  const d = new Date(data);
  if (Number.isNaN(d.getTime())) return data;
  return d.toLocaleString("pt-BR");
}

export function mensagemErro(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Erro inesperado";
}
