import { gradienteParaProduto, inicialProduto } from '@/lib/cover-art';

interface ProductCoverProps {
  nome: string;
  categoria?: string | null;
  className?: string;
}

export function ProductCover({ nome, categoria, className = '' }: ProductCoverProps) {
  const gradiente = gradienteParaProduto((categoria ?? 'geral') + nome);

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradiente} ${className}`}
    >
      <svg
        className="absolute inset-0 h-full w-full opacity-20"
        viewBox="0 0 200 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <polygon points="100,10 190,55 190,145 100,190 10,145 10,55" fill="none" stroke="white" strokeWidth="3" />
        <polygon points="100,55 145,77 145,123 100,145 55,123 55,77" fill="none" stroke="white" strokeWidth="2" />
      </svg>
      <span className="relative text-4xl font-bold text-white/90 drop-shadow-sm">{inicialProduto(nome)}</span>
    </div>
  );
}
