import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  senha: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registroSchema = z
  .object({
    nome: z.string().min(2, "Informe seu nome completo"),
    email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
    senha: z.string().min(6, "A senha deve ter ao menos 6 caracteres"),
    confirmarSenha: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.senha === data.confirmarSenha, {
    message: "As senhas não coincidem",
    path: ["confirmarSenha"],
  });
export type RegistroInput = z.infer<typeof registroSchema>;

export const checkoutEmailSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
});
export type CheckoutEmailInput = z.infer<typeof checkoutEmailSchema>;

export const devolucaoSchema = z.object({
  motivo: z.string().min(10, "Descreva o motivo com pelo menos 10 caracteres"),
});
export type DevolucaoInput = z.infer<typeof devolucaoSchema>;

export const produtoSchema = z.object({
  nome: z.string().min(2, "Informe o nome do produto"),
  descricao: z.string().optional(),
  preco: z.coerce.number().positive("O preço deve ser maior que zero"),
  categoria: z.string().min(1, "Informe a categoria"),
  status: z.enum(["ativo", "inativo", "rascunho"]),
  estoqueLotePadrao: z.coerce.number().int().nonnegative().optional(),
  limiarReabastecimento: z.coerce.number().int().nonnegative().optional(),
  imagemUrl: z.string().url("Informe uma URL válida").optional().or(z.literal("")),
});
export type ProdutoInput = z.infer<typeof produtoSchema>;

export const conteudoSchema = z.object({
  tipo: z.string().min(1, "Informe o tipo"),
  titulo: z.string().min(1, "Informe o título"),
  ordem: z.coerce.number().int().nonnegative(),
});
export type ConteudoInput = z.infer<typeof conteudoSchema>;
