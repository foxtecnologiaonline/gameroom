import { gradientForSeed, initialFromTitle } from "@/lib/cover-art";

interface ProductCoverProps {
  title: string;
  seed?: string;
  className?: string;
}

/**
 * Product tem nenhum campo de imagem no backend real (catalog.products não
 * modela isso) — sempre um placeholder gerado a partir do título.
 */
export function ProductCover({ title, seed, className = "" }: ProductCoverProps) {
  const gradient = gradientForSeed(seed ?? title);

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${gradient} ${className}`}
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
      <span className="relative text-4xl font-bold text-white/90 drop-shadow-sm">{initialFromTitle(title)}</span>
    </div>
  );
}
