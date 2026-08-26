'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { Button, ErrorMessage, Input, Label } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';

export default function RegistrarPage() {
  const { registrar } = useAuth();
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      await registrar(nome, email, senha);
      router.push('/minhas-compras');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AuthShell
      titulo="Crie sua conta"
      subtitulo="Leva menos de um minuto. Você vai poder comprar, baixar conteúdos e acompanhar pedidos."
    >
      <h2 className="mb-6 text-xl font-semibold text-zinc-900">Criar conta</h2>
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <Label>Nome</Label>
          <Input required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Senha</Label>
          <Input type="password" minLength={8} required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </div>
        <ErrorMessage>{erro}</ErrorMessage>
        <Button type="submit" disabled={enviando} className="w-full">
          {enviando ? 'Criando…' : 'Criar conta'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Já tem conta?{' '}
        <Link href="/login" className="font-medium text-zinc-900 underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
