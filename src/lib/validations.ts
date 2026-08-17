import { z } from "zod";

export const organizerProfileSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  category: z.string().min(1, "Debes seleccionar una categoría"),
  bio: z.string().min(10, "La biografía debe tener al menos 10 caracteres"),
  supportEmail: z.string().email("Correo electrónico inválido"),
  internalPhone: z.string().regex(/^\+?[0-9\s\-\(\)]{8,20}$/, "Teléfono inválido"),
  logoUrl: z.union([
    z.string().url("URL inválida").startsWith("https://", "Debe empezar con https://"),
    z.literal("")
  ]).optional(),
  socialLink: z.union([
    z.string().url("URL inválida"),
    z.literal("")
  ]).optional(),
});

export type OrganizerProfileInput = z.infer<typeof organizerProfileSchema>;

export const eventSchema = z.object({
  name: z.string().min(3, "El nombre del evento debe tener al menos 3 caracteres").max(60, "El nombre no puede exceder 60 caracteres"),
  description: z.string().optional(),
  category: z.string().min(1, "Debes seleccionar una categoría"),
  date: z.string().min(1, "La fecha es requerida"),
  time: z.string().min(1, "La hora es requerida"),
  venue: z.string().min(1, "El lugar del evento es requerido"),
  city: z.string().min(1, "La ciudad es requerida"),
  state: z.string().min(1, "El estado/provincia es requerido"),
  country: z.string().min(1, "El país es requerido"),
  coverImage: z.union([z.string().url("Ingresa un enlace válido (ej. https://...)").startsWith("https://", "El enlace debe empezar con https://"), z.literal("")]).optional(),
  ticketImage: z.union([z.string().url("Ingresa un enlace válido (ej. https://...)").startsWith("https://", "El enlace debe empezar con https://"), z.literal("")]).optional(),
  gallery: z.array(z.string().url("URL inválida")).optional(),
  lineup: z.array(z.string()).optional(),
  zones: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "La zona necesita un nombre válido"),
    capacity: z.number().positive("La capacidad debe ser mayor a 0"),
    price: z.number().min(0, "El precio no puede ser negativo"),
    position: z.string().optional(),
    gate: z.string().optional(),
    isNumbered: z.boolean().optional()
  })).min(1, "Debes añadir al menos una zona de boletos"),
  allowResale: z.boolean(),
  resaleCapLimit: z.number().min(0).max(1000).optional(),
  isSoulbound: z.boolean(),
  allowRefunds: z.boolean(),
  refundTimeLimit: z.number().optional(),
  identityLimit: z.number().positive().optional(),
  ageRestriction: z.string().min(1, "Selecciona la clasificación de edad"),
  doorTime: z.string().optional(),
  collectionMint: z.string().optional(),
  eventRecordPda: z.string().optional(),
  createdAt: z.number().optional(),
  organizerWallet: z.string().optional()
});

export type EventInput = z.infer<typeof eventSchema>;
