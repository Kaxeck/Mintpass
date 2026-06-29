use anchor_lang::prelude::*;

// ============================================================================
// PROGRAMA: Mintpass Event Registry
// Descripción: Registro descentralizado de eventos en la blockchain de Solana.
//
// Cada evento creado por un organizador se almacena en una cuenta PDA derivada
// de las seeds ["event", organizer_pubkey, collection_mint_pubkey].
//
// Datos almacenados on-chain (< 1KB por evento):
//   - Nombre del evento (hasta 64 caracteres)
//   - Descripción corta (hasta 200 caracteres)
//   - Fecha y hora (strings, hasta 20 caracteres cada uno)
//   - Lugar/Venue (hasta 100 caracteres)
//   - Categoría (hasta 30 caracteres)
//   - Aforo total (u32)
//   - Tipo de precio (free/sol/usdc, almacenado como u8 enum)
//   - Precio (u64 en lamports o unidades mínimas)
//   - Dirección del Collection Mint (Pubkey, 32 bytes)
//   - Timestamp de creación (i64)
//
// Costo estimado: ~0.003 SOL de rent-exempt deposit por evento.
//
// Seeds de la PDA: ["event", organizer_pubkey.as_ref(), collection_mint.as_ref()]
// ============================================================================

// TODO: Reemplazar con el Program ID real después de ejecutar `anchor build`
declare_id!("9inMKT4XXyRApVDDFGPQr9kcdWnuCk5YKJiDT8pTbtNj");

/// Tamaño máximo de los strings almacenados on-chain
const MAX_NAME_LEN: usize = 64;
const MAX_DESC_LEN: usize = 200;
const MAX_DATE_LEN: usize = 20;
const MAX_TIME_LEN: usize = 20;
const MAX_VENUE_LEN: usize = 100;
const MAX_CATEGORY_LEN: usize = 30;

#[program]
pub mod mintpass_event_registry {
    use super::*;

    // ========================================================================
    // INSTRUCCIÓN 1: create_event
    // Registra un nuevo evento on-chain vinculado a un Collection Mint de Metaplex.
    //
    // El organizador firma y paga el rent-exempt deposit (~0.003 SOL).
    // Una vez creada, la PDA permanece hasta que se cierre explícitamente.
    //
    // Parámetros:
    //   - name: Nombre del evento (máx. 64 chars)
    //   - description: Descripción corta (máx. 200 chars)
    //   - date: Fecha del evento como string ISO (máx. 20 chars)
    //   - time: Hora del evento como string (máx. 20 chars)
    //   - venue: Lugar del evento (máx. 100 chars)
    //   - category: Categoría del evento (máx. 30 chars)
    //   - aforo: Número total de entradas
    //   - price_type: 0 = gratis, 1 = SOL, 2 = USDC
    //   - price_lamports: Precio en lamports (0 si es gratis)
    // ========================================================================
    pub fn create_event(
        ctx: Context<CreateEvent>,
        name: String,
        description: String,
        date: String,
        time: String,
        venue: String,
        category: String,
        aforo: u32,
        price_type: u8,
        price_lamports: u64,
    ) -> Result<()> {
        // Validaciones de longitud para proteger el espacio de la cuenta
        require!(name.len() <= MAX_NAME_LEN, EventError::NameTooLong);
        require!(description.len() <= MAX_DESC_LEN, EventError::DescriptionTooLong);
        require!(date.len() <= MAX_DATE_LEN, EventError::DateTooLong);
        require!(time.len() <= MAX_TIME_LEN, EventError::TimeTooLong);
        require!(venue.len() <= MAX_VENUE_LEN, EventError::VenueTooLong);
        require!(category.len() <= MAX_CATEGORY_LEN, EventError::CategoryTooLong);
        require!(price_type <= 2, EventError::InvalidPriceType);

        let event = &mut ctx.accounts.event_record;

        // Almacenamos todos los datos del evento en la cuenta PDA
        event.organizer = ctx.accounts.organizer.key();
        event.collection_mint = ctx.accounts.collection_mint.key();
        event.name = name.clone();
        event.description = description;
        event.date = date;
        event.time = time;
        event.venue = venue;
        event.category = category;
        event.aforo = aforo;
        event.price_type = price_type;
        event.price_lamports = price_lamports;
        event.tickets_sold = 0;
        event.is_active = true;
        event.created_at = Clock::get()?.unix_timestamp;

        msg!(
            "📋 Evento registrado on-chain: '{}' | Collection: {} | Organizador: {}",
            name,
            ctx.accounts.collection_mint.key(),
            ctx.accounts.organizer.key()
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 2: update_tickets_sold
    // Actualiza el contador de tickets vendidos para un evento.
    //
    // Contexto: se llama después de cada mintTicket exitoso para mantener
    // las estadísticas actualizadas on-chain.
    // ========================================================================
    pub fn update_tickets_sold(ctx: Context<UpdateEvent>, new_count: u32) -> Result<()> {
        let event = &mut ctx.accounts.event_record;

        require!(new_count <= event.aforo, EventError::ExceedsCapacity);

        event.tickets_sold = new_count;

        msg!(
            "🎟️ Tickets vendidos actualizados: {} / {} para '{}'",
            new_count,
            event.aforo,
            event.name
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 3: close_event
    // Marca un evento como inactivo (terminado o cancelado).
    //
    // No elimina la cuenta PDA para mantener el historial auditable.
    // ========================================================================
    pub fn close_event(ctx: Context<UpdateEvent>) -> Result<()> {
        let event = &mut ctx.accounts.event_record;

        require!(event.is_active, EventError::EventAlreadyClosed);

        event.is_active = false;

        msg!(
            "🔒 Evento cerrado: '{}' | Tickets finales: {} / {}",
            event.name,
            event.tickets_sold,
            event.aforo
        );

        Ok(())
    }
}

// ============================================================================
// CUENTAS: CreateEvent
// Crea la cuenta PDA para registrar un nuevo evento on-chain.
// Seeds: ["event", organizer.key(), collection_mint.key()]
// ============================================================================
#[derive(Accounts)]
pub struct CreateEvent<'info> {
    /// El organizador que crea el evento. Firma y paga el rent-exempt deposit.
    #[account(mut)]
    pub organizer: Signer<'info>,

    /// CHECK: La cuenta del Collection Mint de Metaplex Core asociado a este evento.
    /// Se usa como parte de la semilla PDA para vincular el registro al NFT collection.
    pub collection_mint: UncheckedAccount<'info>,

    /// La cuenta PDA que almacena los datos del evento.
    /// Seeds: ["event", organizer.key(), collection_mint.key()]
    /// Si ya existe un evento con el mismo organizer + collection → init falla.
    #[account(
        init,
        payer = organizer,
        space = 8 + EventRecord::INIT_SPACE,
        seeds = [b"event", organizer.key().as_ref(), collection_mint.key().as_ref()],
        bump,
    )]
    pub event_record: Account<'info, EventRecord>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// CUENTAS: UpdateEvent
// Modifica un evento existente (actualizar tickets vendidos o cerrar).
// ============================================================================
#[derive(Accounts)]
pub struct UpdateEvent<'info> {
    /// La autoridad que ejecuta la actualización (organizador o programa de escrow).
    #[account(mut)]
    pub authority: Signer<'info>,

    /// La cuenta PDA del evento que se va a modificar.
    /// Validamos que el organizador correcto sea el que modifica.
    #[account(
        mut,
        constraint = event_record.organizer == authority.key() @ EventError::Unauthorized
    )]
    pub event_record: Account<'info, EventRecord>,
}

// ============================================================================
// ESTADO: EventRecord
// Datos del evento almacenados on-chain en la PDA.
// Toda esta información es pública y verificable por cualquiera.
// ============================================================================
#[account]
#[derive(InitSpace)]
pub struct EventRecord {
    /// Dirección del organizador dueño del evento
    pub organizer: Pubkey,                          // 32 bytes

    /// Dirección del Collection Mint de Metaplex Core
    pub collection_mint: Pubkey,                    // 32 bytes

    /// Nombre del evento
    #[max_len(64)]
    pub name: String,                               // 4 + 64 bytes

    /// Descripción corta del evento
    #[max_len(200)]
    pub description: String,                        // 4 + 200 bytes

    /// Fecha del evento (formato ISO string)
    #[max_len(20)]
    pub date: String,                               // 4 + 20 bytes

    /// Hora del evento
    #[max_len(20)]
    pub time: String,                               // 4 + 20 bytes

    /// Lugar/Venue donde se realiza el evento
    #[max_len(100)]
    pub venue: String,                              // 4 + 100 bytes

    /// Categoría del evento (Música, Arte, Deporte, etc.)
    #[max_len(30)]
    pub category: String,                           // 4 + 30 bytes

    /// Aforo total (número máximo de entradas)
    pub aforo: u32,                                 // 4 bytes

    /// Tipo de precio: 0 = gratis, 1 = SOL, 2 = USDC
    pub price_type: u8,                             // 1 byte

    /// Precio en la unidad mínima (lamports para SOL, unidades mínimas para USDC)
    pub price_lamports: u64,                        // 8 bytes

    /// Número de tickets vendidos hasta el momento
    pub tickets_sold: u32,                          // 4 bytes

    /// Si el evento sigue activo (true) o fue cerrado/cancelado (false)
    pub is_active: bool,                            // 1 byte

    /// Timestamp Unix de cuándo se creó el registro on-chain
    pub created_at: i64,                            // 8 bytes
}

// ============================================================================
// ERRORES: EventError
// Errores específicos del programa de registro de eventos.
// ============================================================================
#[error_code]
pub enum EventError {
    #[msg("El nombre del evento excede el límite de 64 caracteres")]
    NameTooLong,

    #[msg("La descripción del evento excede el límite de 200 caracteres")]
    DescriptionTooLong,

    #[msg("La fecha excede el límite de 20 caracteres")]
    DateTooLong,

    #[msg("La hora excede el límite de 20 caracteres")]
    TimeTooLong,

    #[msg("El venue/lugar excede el límite de 100 caracteres")]
    VenueTooLong,

    #[msg("La categoría excede el límite de 30 caracteres")]
    CategoryTooLong,

    #[msg("El tipo de precio debe ser 0 (gratis), 1 (SOL), o 2 (USDC)")]
    InvalidPriceType,

    #[msg("La cantidad de tickets vendidos excede el aforo del evento")]
    ExceedsCapacity,

    #[msg("El evento ya fue cerrado anteriormente")]
    EventAlreadyClosed,

    #[msg("No tienes autorización para modificar este evento")]
    Unauthorized,
}
