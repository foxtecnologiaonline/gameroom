'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Pedido } from '@/lib/types';
import { Badge, Card, ErrorMessage, formatarData, formatarMoeda } from '@/components/ui';

export default function PedidoStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;

    async function buscar() {
      try {
        const dados = await api.get<Pedido>(`/pedidos/${id}`);
        if (!ativo) return;
        setPedido(dados);
        if (dados.status !== 'pendente') {
          clearInterval(intervalo);
        }
      } catch {
        if (ativo) setErro('Pedido não encontrado');
      }
    }

    buscar();
    const intervalo = setInterval(buscar, 4000);
    return () => {
      ativo = false;
      clearInterval(intervalo);
    };
  }, [id]);

  if (erro) return <ErrorMessage>{erro}</ErrorMessage>;
  if (!pedido) return <p className="text-sm text-zinc-500">Carregando…</p>;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-xl font-semibold">Pedido</h1>
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Status</span>
          <Badge status={pedido.status} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Comprador</span>
          <span className="text-sm">{pedido.compradorEmail}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Total</span>
          <span className="font-medium">{formatarMoeda(pedido.valorTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-500">Criado em</span>
          <span className="text-sm">{formatarData(pedido.criadoEm)}</span>
        </div>

        {pedido.status === 'pendente' && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Aguardando confirmação do pagamento pelo gateway. Esta página atualiza automaticamente.
          </p>
        )}
        {pedido.status === 'confirmado' && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            Pagamento confirmado! Entre com o e-mail <strong>{pedido.compradorEmail}</strong> em{' '}
            <Link href="/minhas-compras" className="underline">
              Minhas compras
            </Link>{' '}
            para acessar seus itens.
          </p>
        )}
        {pedido.status === 'cancelado' && (
          <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-600">Este pedido foi cancelado.</p>
        )}
        {pedido.status === 'estornado' && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Este pedido foi estornado.</p>
        )}
      </Card>

      <div className="space-y-2">
        {pedido.itens.map((item) => (
          <Card key={item.id} className="flex items-center justify-between">
            <span>{item.produto.nome}</span>
            <span className="text-sm text-zinc-500">{formatarMoeda(item.valorUnitario)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
