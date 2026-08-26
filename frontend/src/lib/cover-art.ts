const GRADIENTES = [
  'from-indigo-500 to-violet-600',
  'from-blue-500 to-cyan-500',
  'from-fuchsia-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-red-600',
  'from-sky-500 to-blue-700',
  'from-purple-500 to-indigo-700',
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function gradienteParaProduto(chave: string): string {
  return GRADIENTES[hash(chave) % GRADIENTES.length];
}

export function inicialProduto(nome: string): string {
  return nome.trim().charAt(0).toUpperCase() || '?';
}
