'use client';

import { useEffect, useState } from 'react';
import { useAuth, mensagemDeErro } from '@/lib/auth';
import { api } from '@/lib/api';
import { LogAuditoria, Paginado } from '@/lib/types';
import { ErrorMessage, Pagination, formatarData } from '@/components/ui';

export default function AdminAuditoriaPage() {
  const { accessToken } = useAuth();
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState<Paginado<LogAuditoria> | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!accessToken) return;
    api
      .get<Paginado<LogAuditoria>>(`/admin/auditoria?pagina=${pagina}&tamanho=20`, accessToken)
      .then(setResultado)
      .catch((e) => setErro(mensagemDeErro(e)));
  }, [accessToken, pagina]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Auditoria</h1>
      <p className="text-sm text-zinc-500">
        Toda leitura de código de licença e toda decisão manual (devolução, retenção por fraude) fica registrada
        aqui.
      </p>

      <ErrorMessage>{erro}</ErrorMessage>

      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-4 py-2">Usuário</th>
              <th className="px-4 py-2">Ação</th>
              <th className="px-4 py-2">Entidade</th>
              <th className="px-4 py-2">Data</th>
            </tr>
          </thead>
          <tbody>
            {resultado?.dados.map((log) => (
              <tr key={log.id} className="border-b border-zinc-100 last:border-0">
                <td className="px-4 py-2">{log.usuario?.email ?? '—'}</td>
                <td className="px-4 py-2">{log.acao}</td>
                <td className="px-4 py-2 font-mono text-xs">
                  {log.entidade}/{log.entidadeId.slice(0, 8)}
                </td>
                <td className="px-4 py-2">{formatarData(log.criadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resultado && <Pagination pagina={resultado.pagina} totalPaginas={resultado.totalPaginas} onChange={setPagina} />}
    </div>
  );
}
