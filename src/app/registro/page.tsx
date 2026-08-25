"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { registroSchema, type RegistroInput } from "@/lib/schemas";
import { mensagemErro } from "@/lib/format";

export default function RegistroPage() {
  const { registrar } = useAuth();
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroInput>({ resolver: zodResolver(registroSchema) });

  async function onSubmit(data: RegistroInput) {
    setErro(null);
    try {
      await registrar(data.nome, data.email, data.senha);
      router.push("/minha-conta");
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="card p-6">
        <h1 className="mb-6 text-xl font-semibold">Criar conta</h1>
        {erro && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="label" htmlFor="nome">
              Nome
            </label>
            <input id="nome" className="input" {...register("nome")} />
            {errors.nome && <p className="field-error">{errors.nome.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input id="email" type="email" className="input" {...register("email")} />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="senha">
              Senha
            </label>
            <input id="senha" type="password" className="input" {...register("senha")} />
            {errors.senha && <p className="field-error">{errors.senha.message}</p>}
          </div>
          <div>
            <label className="label" htmlFor="confirmarSenha">
              Confirmar senha
            </label>
            <input id="confirmarSenha" type="password" className="input" {...register("confirmarSenha")} />
            {errors.confirmarSenha && <p className="field-error">{errors.confirmarSenha.message}</p>}
          </div>
          <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-600">
          Já tem conta?{" "}
          <Link href="/login" className="text-brand-600 hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
