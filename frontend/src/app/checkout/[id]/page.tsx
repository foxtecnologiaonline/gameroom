'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { Pedido, Produto } from '@/lib/types';
import { Button, Card, ErrorMessage, Input, Label, formatarMoeda } from '@/components/ui';

export default function CheckoutPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [produto, setProduto] = useState<Produto | null>(null);
  const [email, setEmail] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    api.get<Produto>(`/produtos/${id}`).then(setProduto).catch(() => setErro('Produto não encontrado'));
  }, [id]);

  useEffect(() => {
    if (user) setEmail(user.email);
  }, [user]);

  async function finalizar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setEnviando(true);
    try {
      const pedido = await api.post<Pedido>('/pedidos', {
        compradorEmail: email,
        itens: [{ produtoId: id, quantidade }],
      });
      router.push(`/pedidos/${pedido.id}`);
    } catch (e) {
      setErro(mensagemDeErro(e));
    } finally {
      setEnviando(false);
    }
  }

  if (!produto) {
    return erro ? <ErrorMessage>{erro}</ErrorMessage> : <p className="text-sm text-zinc-500">Carregando…</p>;
  }

  const total = Number(produto.preco) * quantidade;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-xl font-semibold">Finalizar compra</h1>
      <Card>
        <p className="font-medium">{produto.nome}</p>
        <p className="text-sm text-zinc-500">{formatarMoeda(produto.preco)} / unidade</p>

        <form onSubmit={finalizar} className="mt-4 space-y-4">
          <div>
            <Label>E-mail para entrega</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              max={10}
              required
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
            />
          </div>

          <ErrorMessage>{erro}</ErrorMessage>

          <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
            <span className="text-sm text-zinc-500">Total</span>
            <span className="text-lg font-semibold">{formatarMoeda(total)}</span>
          </div>

          <Button type="submit" disabled={enviando} className="w-full">
            {enviando ? 'Processando…' : 'Confirmar pedido'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
