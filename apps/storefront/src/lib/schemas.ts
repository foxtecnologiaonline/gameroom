import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().min(1, "Informe o e-mail").email("E-mail inválido"),
    password: z.string().min(8, "A senha deve ter ao menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const sellerApplicationSchema = z.object({
  storeName: z.string().min(2, "Informe o nome da loja").max(120),
  document: z.string().min(11, "Informe um CPF/CNPJ válido").max(20),
});
export type SellerApplicationInput = z.infer<typeof sellerApplicationSchema>;

export const productFormSchema = z.object({
  title: z.string().min(2, "Informe o título").max(200),
  description: z.string().min(1, "Informe a descrição").max(5000),
  categoryId: z.string().uuid("Selecione uma categoria"),
  brand: z.string().optional(),
  priceReais: z.coerce.number().positive("O preço deve ser maior que zero"),
  stock: z.coerce.number().int().nonnegative("Estoque não pode ser negativo"),
  condition: z.enum(["new", "used"]),
  slaDays: z.coerce.number().int().nonnegative("Prazo não pode ser negativo"),
});
export type ProductFormInput = z.infer<typeof productFormSchema>;
