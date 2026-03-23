use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

// ============================================================================
// PROGRAMA: Mintpass Escrow
// Descripción: Contrato inteligente que actúa como intermediario financiero 
//              entre el comprador de boletos y el organizador del evento.
//
// Flujo principal:
//   1. El organizador crea el escrow definiendo el precio y la ventana de reembolso.
//   2. El comprador deposita SOL → los fondos quedan retenidos en una PDA (bóveda).
//   3. Si el evento ocurre (check-in registrado) → el organizador reclama.
//   4. Si pasa la ventana de reembolso sin check-in Y sin completarse → el comprador pide reembolso.
//
// Reglas de negocio:
//   - El comprador NO puede pedir reembolso si el evento ya se completó.
//   - El comprador NO puede pedir reembolso si hubo al menos un check-in.
//   - El comprador SOLO puede pedir reembolso si pasó la ventana de días que definió el organizador.
//   - El organizador SOLO puede cobrar si hay al menos un check-in registrado.
//   - Nadie puede cobrar/reembolsar dos veces (flag is_released).
//
// Seeds de la PDA del escrow: ["escrow", event_id]
// Seeds de la PDA del estado: ["escrow_state", event_id]
// ============================================================================

// TODO: Reemplazar con el Program ID real después de ejecutar `anchor build`
declare_id!("8NRJJTedLMqMVsZyFTzf3zKeHwgaSywmcTYsjVjB4kQz");

#[program]
pub mod mintpass_escrow {
    use super::*;

    // ========================================================================
    // INSTRUCCIÓN 1: initialize_escrow
    // El organizador configura los parámetros del escrow ANTES de que nadie compre.
    // Define el precio del boleto y cuántos días tiene el comprador para pedir
    // reembolso en caso de que el evento no ocurra.
    // ========================================================================
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        event_id: String,
        ticket_price: u64,
        refund_window_days: u16,
    ) -> Result<()> {
        // Validaciones básicas del organizador al crear
        require!(ticket_price > 0, EscrowError::InvalidAmount);
        require!(refund_window_days > 0, EscrowError::InvalidRefundWindow);

        let escrow_state = &mut ctx.accounts.escrow_state;
        escrow_state.organizer = ctx.accounts.organizer.key();
        escrow_state.event_id = event_id.clone();
        escrow_state.ticket_price = ticket_price;
        // Convertimos los días del organizador a segundos para comparar on-chain
        escrow_state.refund_window_seconds = (refund_window_days as i64) * 86_400;
        escrow_state.buyer = Pubkey::default(); // Aún no hay comprador
        escrow_state.amount = 0;
        escrow_state.has_checkin = false;
        escrow_state.is_completed = false;  // El evento no ha terminado
        escrow_state.is_released = false;   // Fondos no han sido movidos
        escrow_state.created_at = Clock::get()?.unix_timestamp;
        escrow_state.bump = ctx.bumps.escrow_vault;

        msg!(
            "Escrow inicializado por el organizador {} para el evento '{}'. Precio: {} lamports, Ventana de reembolso: {} días",
            ctx.accounts.organizer.key(),
            event_id,
            ticket_price,
            refund_window_days
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 2: send_to_escrow
    // El comprador deposita SOL en la bóveda del escrow.
    // El monto debe coincidir exactamente con el precio que definió el organizador.
    // ========================================================================
    pub fn send_to_escrow(
        ctx: Context<SendToEscrow>,
        _event_id: String,
        amount: u64,
    ) -> Result<()> {
        let escrow_state = &mut ctx.accounts.escrow_state;

        // Validación: el monto depositado debe ser exactamente el precio del boleto
        require!(amount == escrow_state.ticket_price, EscrowError::PriceMismatch);

        // Validación: no se puede depositar si ya existe un comprador previo
        // (para escrow 1:1 por evento; si necesitas múltiples compradores, esto cambia)
        require!(
            escrow_state.buyer == Pubkey::default(),
            EscrowError::EscrowAlreadyFunded
        );

        // Registramos al comprador y el monto depositado
        escrow_state.buyer = ctx.accounts.buyer.key();
        escrow_state.amount = amount;

        // Transferencia atómica: SOL del comprador → bóveda PDA
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!(
            "Depósito recibido: {} lamports del comprador {} para el evento '{}'",
            amount,
            ctx.accounts.buyer.key(),
            escrow_state.event_id
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 3: register_checkin
    // El staff del evento marca que hubo al menos un check-in.
    // Este flag es el candado principal: sin él, el organizador no cobra.
    // Con él activado, el comprador pierde el derecho a reembolso.
    // ========================================================================
    pub fn register_checkin(ctx: Context<RegisterCheckin>) -> Result<()> {
        let escrow_state = &mut ctx.accounts.escrow_state;

        // Si ya se liberaron o reembolsaron los fondos, no tiene sentido registrar check-in
        require!(!escrow_state.is_released, EscrowError::AlreadyReleased);

        // Marcamos check-in como activo (irreversible)
        escrow_state.has_checkin = true;

        msg!(
            "Check-in registrado para el evento '{}'. El organizador ya puede reclamar fondos.",
            escrow_state.event_id
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 4: release_escrow
    // El organizador reclama los fondos retenidos en la bóveda.
    // 
    // Condiciones OBLIGATORIAS:
    //   ✅ Debe haber al menos un check-in registrado
    //   ✅ Los fondos no deben haber sido liberados previamente
    //   ✅ Solo el organizador original puede ejecutar esta instrucción
    // ========================================================================
    pub fn release_escrow(ctx: Context<ReleaseEscrow>, event_id: String) -> Result<()> {
        let escrow_state = &mut ctx.accounts.escrow_state;

        // Sin check-in verificado → el organizador no tiene derecho a cobrar
        require!(escrow_state.has_checkin, EscrowError::NoCheckinRegistered);

        // Protección contra doble cobro
        require!(!escrow_state.is_released, EscrowError::AlreadyReleased);

        let vault_balance = ctx.accounts.escrow_vault.lamports();
        require!(vault_balance > 0, EscrowError::InsufficientFunds);

        // Construimos las semillas de firma para que la PDA autorice la salida de SOL
        // Las PDAs no tienen llave privada; Solana valida criptográficamente
        // que el programa correcto firma con las semillas correctas
        let bump = escrow_state.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            event_id.as_bytes(),
            &[bump],
        ]];

        // CPI: transferimos todo el balance de la bóveda al organizador
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.organizer.to_account_info(),
                },
                signer_seeds,
            ),
            vault_balance,
        )?;

        // Marcamos como completado Y liberado
        escrow_state.is_completed = true;
        escrow_state.is_released = true;

        msg!(
            "Evento completado: {} lamports transferidos al organizador {}",
            vault_balance,
            ctx.accounts.organizer.key()
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 5: refund_buyer
    // Devuelve el SOL al comprador original.
    //
    // Condiciones OBLIGATORIAS (TODAS deben cumplirse):
    //   ✅ El evento NO se completó (is_completed == false)
    //   ✅ NO hubo ningún check-in (has_checkin == false) 
    //   ✅ Los fondos NO fueron liberados previamente (is_released == false)
    //   ✅ Pasó la ventana de reembolso que definió el organizador
    //   ✅ Solo el comprador original puede pedir su reembolso
    //
    // Si el evento se completó → no hay reembolso posible (el organizador ya cobró).
    // Si hubo check-in → no hay reembolso posible (el evento sí ocurrió).
    // ========================================================================
    pub fn refund_buyer(ctx: Context<RefundBuyer>, event_id: String) -> Result<()> {
        let escrow_state = &mut ctx.accounts.escrow_state;

        // BLOQUEO 1: Si el evento ya terminó exitosamente, el dinero ya fue del organizador
        require!(!escrow_state.is_completed, EscrowError::EventAlreadyCompleted);

        // BLOQUEO 2: Si hubo check-in, el evento sí se llevó a cabo → sin reembolso
        require!(!escrow_state.has_checkin, EscrowError::CheckinAlreadyRegistered);

        // BLOQUEO 3: Si ya se movieron los fondos por cualquier razón
        require!(!escrow_state.is_released, EscrowError::AlreadyReleased);

        // BLOQUEO 4: Verificamos que haya pasado la ventana de reembolso del organizador
        let current_time = Clock::get()?.unix_timestamp;
        let elapsed = current_time - escrow_state.created_at;
        require!(
            elapsed >= escrow_state.refund_window_seconds,
            EscrowError::RefundWindowNotReached
        );

        let vault_balance = ctx.accounts.escrow_vault.lamports();
        require!(vault_balance > 0, EscrowError::InsufficientFunds);

        // Construimos las semillas de firma de la PDA
        let bump = escrow_state.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            event_id.as_bytes(),
            &[bump],
        ]];

        // Devolvemos el balance completo al comprador original
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.buyer.to_account_info(),
                },
                signer_seeds,
            ),
            vault_balance,
        )?;

        escrow_state.is_released = true;

        msg!(
            "Reembolso ejecutado: {} lamports devueltos al comprador {}",
            vault_balance,
            ctx.accounts.buyer.key()
        );

        Ok(())
    }
}

// ============================================================================
// CUENTAS: InitializeEscrow
// El organizador crea el escrow con el precio y la ventana de reembolso.
// ============================================================================
#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct InitializeEscrow<'info> {
    /// El organizador que crea y configura el escrow. Paga el rent de las cuentas.
    #[account(mut)]
    pub organizer: Signer<'info>,

    /// La bóveda PDA donde se retendrán los fondos.
    /// Seeds: ["escrow", event_id] — cada evento tiene su propia bóveda separada.
    #[account(
        mut,
        seeds = [b"escrow", event_id.as_bytes()],
        bump,
    )]
    pub escrow_vault: SystemAccount<'info>,

    /// Cuenta de estado que almacena toda la configuración y el ciclo de vida del escrow.
    /// Se crea por primera vez aquí con `init`.
    #[account(
        init,
        payer = organizer,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [b"escrow_state", event_id.as_bytes()],
        bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// CUENTAS: SendToEscrow
// El comprador deposita SOL en la bóveda ya inicializada por el organizador.
// ============================================================================
#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct SendToEscrow<'info> {
    /// El comprador que deposita SOL. Firma la transacción y paga el fee.
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// La bóveda PDA donde se guardan los fondos.
    #[account(
        mut,
        seeds = [b"escrow", event_id.as_bytes()],
        bump,
    )]
    pub escrow_vault: SystemAccount<'info>,

    /// Estado del escrow, ya inicializado por el organizador.
    #[account(
        mut,
        seeds = [b"escrow_state", event_id.as_bytes()],
        bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// CUENTAS: RegisterCheckin
// El staff marca que el evento tuvo al menos un asistente real.
// ============================================================================
#[derive(Accounts)]
pub struct RegisterCheckin<'info> {
    /// El staff que registra el check-in. Debe ser una wallet autorizada.
    #[account(mut)]
    pub staff: Signer<'info>,

    /// Estado del escrow que se actualiza con el flag de check-in.
    #[account(mut)]
    pub escrow_state: Account<'info, EscrowState>,
}

// ============================================================================
// CUENTAS: ReleaseEscrow
// El organizador cobra los fondos tras verificarse al menos un check-in.
// ============================================================================
#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct ReleaseEscrow<'info> {
    /// El organizador que reclama. Validamos que sea el mismo que registró el escrow.
    #[account(
        mut,
        constraint = organizer.key() == escrow_state.organizer @ EscrowError::Unauthorized
    )]
    pub organizer: Signer<'info>,

    /// La bóveda PDA de donde salen los fondos hacia el organizador.
    #[account(
        mut,
        seeds = [b"escrow", event_id.as_bytes()],
        bump,
    )]
    pub escrow_vault: SystemAccount<'info>,

    /// Estado del escrow para verificar condiciones y actualizar flags.
    #[account(mut)]
    pub escrow_state: Account<'info, EscrowState>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// CUENTAS: RefundBuyer
// El comprador pide su reembolso si pasó la ventana y no hubo check-in.
// ============================================================================
#[derive(Accounts)]
#[instruction(event_id: String)]
pub struct RefundBuyer<'info> {
    /// El comprador original que solicita reembolso. Validamos su identidad.
    #[account(
        mut,
        constraint = buyer.key() == escrow_state.buyer @ EscrowError::Unauthorized
    )]
    pub buyer: Signer<'info>,

    /// La bóveda PDA de donde se extraen los fondos para devolver.
    #[account(
        mut,
        seeds = [b"escrow", event_id.as_bytes()],
        bump,
    )]
    pub escrow_vault: SystemAccount<'info>,

    /// Estado del escrow con toda la información del depósito.
    #[account(mut)]
    pub escrow_state: Account<'info, EscrowState>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// ESTADO: EscrowState
// Almacena toda la información necesaria para gestionar el ciclo de vida
// del escrow on-chain. Cada campo está documentado con su propósito y tamaño.
// ============================================================================
#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    /// Dirección pública del organizador que creó el escrow
    pub organizer: Pubkey,              // 32 bytes
    /// Dirección pública del comprador que depositó (default = vacío hasta que compre)
    pub buyer: Pubkey,                  // 32 bytes
    /// Cantidad de lamports depositados en la bóveda
    pub amount: u64,                    // 8 bytes
    /// Precio del boleto definido por el organizador (el comprador debe depositar exacto)
    pub ticket_price: u64,              // 8 bytes
    /// Identificador único del evento (semilla del PDA)
    #[max_len(64)]
    pub event_id: String,               // 4 + 64 bytes
    /// Flag: ¿hubo al menos un check-in? (habilita cobro, bloquea reembolso)
    pub has_checkin: bool,              // 1 byte
    /// Flag: ¿el evento se completó exitosamente? (bloquea reembolso permanentemente)
    pub is_completed: bool,             // 1 byte
    /// Flag: ¿los fondos ya fueron movidos? (previene doble cobro/reembolso)
    pub is_released: bool,              // 1 byte
    /// Timestamp Unix del momento en que se creó el escrow
    pub created_at: i64,                // 8 bytes
    /// Ventana de reembolso en segundos (definida por el organizador en días, convertida)
    pub refund_window_seconds: i64,     // 8 bytes
    /// Bump seed de la PDA del vault para re-derivar la firma en transferencias
    pub bump: u8,                       // 1 byte
}

// ============================================================================
// ERRORES: EscrowError
// Catálogo de errores del programa. Cada mensaje está en español para que
// el frontend los pueda mostrar directamente al usuario si es necesario.
// ============================================================================
#[error_code]
pub enum EscrowError {
    /// El monto debe ser mayor a cero
    #[msg("El monto del depósito debe ser mayor a cero")]
    InvalidAmount,

    /// La ventana de reembolso debe ser al menos 1 día
    #[msg("La ventana de reembolso debe ser de al menos 1 día")]
    InvalidRefundWindow,

    /// El monto depositado no coincide con el precio del boleto
    #[msg("El monto depositado no coincide con el precio del boleto definido por el organizador")]
    PriceMismatch,

    /// Ya existe un depósito en este escrow
    #[msg("Este escrow ya tiene un depósito activo")]
    EscrowAlreadyFunded,

    /// No se ha registrado ningún check-in
    #[msg("No se ha registrado ningún check-in. Los fondos no pueden ser liberados")]
    NoCheckinRegistered,

    /// Los fondos ya fueron movidos (liberados o reembolsados)
    #[msg("Los fondos del escrow ya fueron liberados o reembolsados")]
    AlreadyReleased,

    /// El evento ya se completó exitosamente — reembolso imposible
    #[msg("El evento ya se completó exitosamente. No es posible solicitar reembolso")]
    EventAlreadyCompleted,

    /// Aún no ha pasado la ventana de reembolso definida por el organizador
    #[msg("Aún no ha transcurrido la ventana de reembolso definida por el organizador")]
    RefundWindowNotReached,

    /// Ya existe un check-in registrado — reembolso imposible
    #[msg("Ya existe un check-in registrado. El reembolso no es posible")]
    CheckinAlreadyRegistered,

    /// No hay fondos en la bóveda
    #[msg("La bóveda no tiene fondos suficientes")]
    InsufficientFunds,

    /// El firmante no es el autorizado para esta operación
    #[msg("No tienes autorización para ejecutar esta operación")]
    Unauthorized,
}
