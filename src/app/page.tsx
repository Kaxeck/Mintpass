import { getPublishedEvents } from "@/app/actions/events";
import { Country, State } from 'country-state-city';
import ClientHomePage from "./ClientHomePage";

export const dynamic = 'force-dynamic'; // Prevent static caching to always show latest events

export default async function HomePage() {
  const dbEvents = await getPublishedEvents();
  
  // Map Prisma Event to the expected format of the frontend
  const formattedEvents = dbEvents.map(ev => {
    let dateStr = "";
    let timeStr = "";
    if (ev.startDate) {
      // Create a Date object from DB
      const dateObj = new Date(ev.startDate);
      // Format YYYY-MM-DD
      dateStr = dateObj.toISOString().split('T')[0];
      // Format HH:MM
      timeStr = dateObj.toTimeString().split(' ')[0].substring(0, 5);
    }
    
    const countryName = ev.countryIso ? Country.getCountryByCode(ev.countryIso)?.name : undefined;
    const stateName = (ev.countryIso && ev.stateIso) ? State.getStateByCodeAndCountry(ev.stateIso, ev.countryIso)?.name : undefined;

    return {
      id: ev.id,
      name: ev.title,
      cat: ev.category || "Otro",
      date: dateStr,
      time: timeStr,
      venue: ev.location || "",
      city: ev.cityName || undefined,
      state: stateName || ev.stateIso || undefined,
      country: countryName || ev.countryIso || undefined,
      price: ev.ticketPriceSol || 0,
      aforo: ev.capacity || 0,
      coverImage: ev.coverImageUrl || undefined,
      organizerName: (ev as any).userProfile?.companyName || ""
    };
  });

  return (
    <ClientHomePage events={formattedEvents} />
  );
}
