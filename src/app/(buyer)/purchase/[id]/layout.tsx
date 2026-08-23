import { Metadata } from 'next';
import { getEventById } from '@/app/actions/events';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  
  if (!event) {
    return {
      title: 'Evento no encontrado | Mintpass',
    };
  }

  const imageUrl = event.coverImageUrl || event.ticketImageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop';

  return {
    title: `Boletos para ${event.title} | Mintpass`,
    description: event.description || `Compra tus boletos oficiales para ${event.title} en Mintpass.`,
    openGraph: {
      title: event.title,
      description: event.description || `Compra tus boletos oficiales para ${event.title}.`,
      images: [imageUrl],
    },
    twitter: {
      card: 'summary_large_image',
      title: event.title,
      description: event.description || `Compra tus boletos oficiales para ${event.title}.`,
      images: [imageUrl],
    },
  };
}

export default function PurchaseLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
