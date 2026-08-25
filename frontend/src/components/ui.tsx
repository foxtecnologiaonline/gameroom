'use client';

import Link from 'next/link';

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const estilos: Record<string, string> = {
    primary: 'bg-zinc-900 text-white hover:bg-zinc-700 disabled:bg-zinc-300',
    secondary: 'bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-100',
  };
  return (
    <button
      className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${estilos[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 ${props.className ?? ''}`}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 ${props.className ?? ''}`}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 ${props.className ?? ''}`}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-sm font-medium text-zinc-700">{children}</label>;
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function ErrorMessage({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

export function SuccessMessage({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{children}</p>;
}

const CORES_BADGE: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800',
  confirmado: 'bg-green-100 text-green-800',
  disponivel: 'bg-green-100 text-green-800',
  aprovada_automatica: 'bg-green-100 text-green-800',
  aprovada_manual: 'bg-green-100 text-green-800',
  liberada: 'bg-green-100 text-green-800',

  rascunho: 'bg-zinc-100 text-zinc-700',
  pendente: 'bg-amber-100 text-amber-800',
  reservado: 'bg-amber-100 text-amber-800',
  aguardando_codigo: 'bg-amber-100 text-amber-800',

  inativo: 'bg-zinc-200 text-zinc-600',
  cancelado: 'bg-zinc-200 text-zinc-600',
  vendido: 'bg-blue-100 text-blue-800',
  devolvido: 'bg-orange-100 text-orange-800',

  bloqueado: 'bg-red-100 text-red-800',
  estornado: 'bg-red-100 text-red-800',
  rejeitada: 'bg-red-100 text-red-800',
  bloqueada: 'bg-red-100 text-red-800',
};

export function Badge({ status }: { status: string }) {
  const cor = CORES_BADGE[status] ?? 'bg-zinc-100 text-zinc-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cor}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export function Pagination({
  pagina,
  totalPaginas,
  onChange,
}: {
  pagina: number;
  totalPaginas: number;
  onChange: (novaPagina: number) => void;
}) {
  if (totalPaginas <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 pt-4 text-sm">
      <Button variant="secondary" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
        Anterior
      </Button>
      <span className="text-zinc-600">
        Página {pagina} de {totalPaginas}
      </span>
      <Button variant="secondary" disabled={pagina >= totalPaginas} onClick={() => onChange(pagina + 1)}>
        Próxima
      </Button>
    </div>
  );
}

export function LinkButton({
  href,
  children,
  variant = 'primary',
}: {
  href: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}) {
  const estilos =
    variant === 'primary'
      ? 'bg-zinc-900 text-white hover:bg-zinc-700'
      : 'bg-white text-zinc-900 border border-zinc-300 hover:bg-zinc-50';
  return (
    <Link href={href} className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${estilos}`}>
      {children}
    </Link>
  );
}

export function formatarMoeda(valor: string | number): string {
  const numero = typeof valor === 'string' ? Number(valor) : valor;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}
