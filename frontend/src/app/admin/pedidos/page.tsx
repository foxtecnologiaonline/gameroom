'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { Paginado, Pedido, StatusPedido } from '@/lib/types';
import { Badge, ErrorMessage, Pagination, Select, formatarData, formatarMoeda } from '@/components/ui';

const OPCOES_STATUS: StatusPedido[] = ['pendente', 'confirmado', 'cancelado', 'estornado'];

export default function AdminPedidosPage() {
  const { accessToken } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [status, setStatus] = useState('');
  const [resultado, setResultado] = useState<Paginado<Pedido> | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    const filtro = status ? `&status=${status}` : '';
    api
      .get<Paginado<Pedido>>(`/admin/pedidos?pagina=${pagina}&tamanho=15${filtro}`, accessToken)
      .then(setResultado)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [accessToken, pagina, status]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Pedidos</h1>

      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500">Status</span>
        <Select
          className="w-auto"
          value={status}
          onChange={(e) => {
            setPagina(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">Todos</option>
          {OPCOES_STATUS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <ErrorMessage>{erro}</ErrorMessage>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Comprador</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Criado em</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {resultado?.dados.map((p) => (
              <tr key={p.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2">{p.compradorEmail}</td>
                <td className="px-4 py-2">{formatarMoeda(p.valorTotal)}</td>
                <td className="px-4 py-2">
                  <Badge status={p.status} />
                </td>
                <td className="px-4 py-2">{formatarData(p.criadoEm)}</td>
                <td className="px-4 py-2 text-right">
                  <Link href={`/admin/pedidos/${p.id}`} className="underline">
                    Detalhes
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado && <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} onChange={setPagina} />}
    </div>
  );
}
