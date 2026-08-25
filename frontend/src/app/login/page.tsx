'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { Button, Card, ErrorMessage, Input, Label } from '@/components/ui';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const usuario = await login(email, senha);
      router.push(usuario?.tipo === 'admin' ? '/admin' : '/minhas-compras');
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-xl font-semibold">Entrar</h1>
      <Card>
        <form onSubmit={enviar} className="space-y-4">
          <div>
            <Label>E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Senha</Label>
            <Input type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
          </div>
          <ErrorMessage>{erro}</ErrorMessage>
          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Não tem conta?{' '}
          <Link href="/registrar" className="font-medium text-zinc-900 underline">
            Criar conta
          </Link>
        </p>
      </Card>
    </div>
  );
}
