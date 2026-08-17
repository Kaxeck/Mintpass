import { getPublishedEvents } from "@/app/actions/events";
import ClientExplorePage from "./ClientExplorePage";

export const dynamic = 'force-dynamic';

export default async function ExplorePage() {
  const dbEvents = await getPublishedEvents();
  
  const formattedEvents = dbEvents.map(ev => {
    let dateStr = "";
    let timeStr = "";
    if (ev.startDate) {
      const dateObj = new Date(ev.startDate);
      dateStr = dateObj.toISOString().split('T')[0];
      timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);
    }

    return {
      id: ev.id,
      name: ev.title,
      category: ev.category || "Otro",
      date: dateStr,
      time: timeStr,
      venue: ev.location || "",
      price: `$${ev.ticketPriceSol} SOL`,
      aforo: ev.capacity || 0,
      coverImage: ev.coverImageUrl || undefined,
      organizerName: (ev as any).userProfile?.companyName || ""
    };
  });

  return (
    <ClientExplorePage events={formattedEvents} />
  );
}
