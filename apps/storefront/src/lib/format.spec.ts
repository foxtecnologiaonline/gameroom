import { describe, expect, it } from "vitest";
import { formatarCentavos, formatarData, formatarPreco, mensagemErro } from "./format";

describe("formatarPreco", () => {
  it("formats a positive value as BRL currency", () => {
    expect(formatarPreco(1234.5)).toBe(
      new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(1234.5),
    );
  });
});

describe("formatarCentavos", () => {
  it("converts cents to BRL currency", () => {
    expect(formatarCentavos(150090)).toBe(formatarPreco(1500.9));
  });

  it("formats zero correctly", () => {
    expect(formatarCentavos(0)).toBe(formatarPreco(0));
  });
});

describe("formatarData", () => {
  it("formats a valid ISO date string", () => {
    expect(formatarData("2024-01-01T00:00:00Z")).not.toBe("-");
  });

  it("falls back to '-' when no date is given", () => {
    expect(formatarData(undefined)).toBe("-");
  });

  it("returns the raw input for an unparseable date", () => {
    expect(formatarData("not-a-date")).toBe("not-a-date");
  });
});

describe("mensagemErro", () => {
  it("returns the message from an Error instance", () => {
    expect(mensagemErro(new Error("falhou"))).toBe("falhou");
  });

  it("falls back to a generic message for non-Error values", () => {
    expect(mensagemErro("qualquer coisa")).toBe("Erro inesperado");
  });
});
