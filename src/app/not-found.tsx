import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 text-center">
      <h2 className="text-4xl font-bold mb-4">404 - Página no encontrada</h2>
      <p className="mb-8 text-neutral-400">Lo sentimos, no pudimos encontrar el recurso solicitado.</p>
      <Link 
        href="/" 
        className="px-6 py-3 bg-[#4BAA46] text-white rounded-lg hover:bg-opacity-90 font-medium"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
