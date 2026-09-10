"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Suspense, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { loginSchema, type LoginInput } from "@/lib/schemas";
import { mensagemErro } from "@/lib/format";
import { AuthShell } from "@/components/AuthShell";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-slate-500">Carregando...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [erro, setErro] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setErro(null);
    try {
      const usuario = await login(data.email, data.senha);
      const next = searchParams.get("next");
      router.push(next || (usuario.tipo === "admin" ? "/admin" : "/minha-conta"));
    } catch (err) {
      setErro(mensagemErro(err));
    }
  }

  return (
    <AuthShell
      titulo="Bem-vindo de volta"
      subtitulo="Acesse sua conta para ver suas compras, baixar conteúdos e acompanhar devoluções."
    >
      <h2 className="mb-6 text-xl font-semibold text-slate-900">Entrar</h2>
      {erro && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</div>}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? "Entrando..." : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-600">
        Não tem conta?{" "}
        <Link href="/registro" className="text-brand-600 hover:underline">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
