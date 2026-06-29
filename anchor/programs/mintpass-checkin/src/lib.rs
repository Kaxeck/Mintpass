use anchor_lang::prelude::*;

// ============================================================================
// PROGRAMA: Mintpass Check-In
// Descripción: Sistema anti-duplicados de verificación de asistencia on-chain.
//
// Funciona de la siguiente manera:
//   1. El staff del evento escanea el QR/código del boleto (que contiene el mintAddress).
//   2. El programa intenta crear una cuenta PDA con seeds ["checkin", mint_address].
//   3. Si la PDA NO existe → se crea con { checked_in: true, timestamp }.
//      Resultado: entrada válida ✅
//   4. Si la PDA YA existe → Anchor rechaza la transacción automáticamente 
//      porque `init` falla al intentar crear una cuenta que ya fue inicializada.
//      Resultado: entrada duplicada ❌
//
// ¿Por qué es seguro?
//   - La magia está en que Anchor usa `init` internamente, lo cual invoca
//     `system_program::create_account`. Esta instrucción falla atómicamente
//     si la cuenta ya tiene lamports/data, garantizando anti-duplicación
//     a nivel de protocolo de Solana (no dependemos de lógica manual).
//
// Seeds de la PDA: ["checkin", mint_address.as_ref()]
// ============================================================================

// TODO: Reemplazar con el Program ID real después de ejecutar `anchor build`
declare_id!("Dm5EGnhPWU1MGJNYRwfetzPTojSM9g1yJEAdd9bPdqTf");

#[program]
pub mod mintpass_checkin {
    use super::*;

    // ========================================================================
    // INSTRUCCIÓN 1: perform_checkin
    // Registra la entrada de un asistente vinculando su NFT (mint) a una PDA on-chain.
    //
    // Si el mint ya fue escaneado, Anchor rechazará la transacción porque
    // la cuenta PDA ya fue inicializada previamente (error nativo de Solana).
    // Esto nos da anti-duplicación GRATIS a nivel de protocolo.
    //
    // Parámetros:
    //   - ctx: contexto con todas las cuentas necesarias
    //   (el mint_address se pasa implícitamente a través de la cuenta `ticket_mint`)
    // ========================================================================
    pub fn perform_checkin(ctx: Context<PerformCheckin>) -> Result<()> {
        let checkin_record = &mut ctx.accounts.checkin_record;

        // Guardamos la información esencial del check-in
        checkin_record.mint_address = ctx.accounts.ticket_mint.key();
        checkin_record.checked_in = true;
        checkin_record.timestamp = Clock::get()?.unix_timestamp;
        checkin_record.staff = ctx.accounts.staff.key();

        msg!(
            "✅ Check-in exitoso. Ticket: {}, Staff: {}, Timestamp: {}",
            ctx.accounts.ticket_mint.key(),
            ctx.accounts.staff.key(),
            checkin_record.timestamp
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 2: invalidate_checkin
    // Permite al staff anular un check-in previamente registrado.
    //
    // Caso de uso: el staff escaneó el ticket equivocado por error.
    // Solo cambia el flag `checked_in` a false, pero la PDA sigue existiendo.
    // El ticket NO puede volver a hacer check-in normal porque la PDA ya existe.
    // Para permitir re-entrada, el staff debe llamar `revalidate_checkin`.
    // ========================================================================
    pub fn invalidate_checkin(ctx: Context<ModifyCheckin>) -> Result<()> {
        let checkin_record = &mut ctx.accounts.checkin_record;

        // Solo se puede invalidar si actualmente está marcado como válido
        require!(checkin_record.checked_in, CheckinError::AlreadyInvalidated);

        checkin_record.checked_in = false;
        checkin_record.invalidated_at = Some(Clock::get()?.unix_timestamp);

        msg!(
            "⚠️ Check-in invalidado para el ticket: {}",
            checkin_record.mint_address
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 3: revalidate_checkin
    // Reactiva un check-in que fue previamente invalidado.
    //
    // Caso de uso: el staff corrigió el error y necesita re-habilitar la entrada.
    // Solo funciona si el check-in fue invalidado previamente.
    // ========================================================================
    pub fn revalidate_checkin(ctx: Context<ModifyCheckin>) -> Result<()> {
        let checkin_record = &mut ctx.accounts.checkin_record;

        // Solo se puede revalidar si actualmente está invalidado
        require!(!checkin_record.checked_in, CheckinError::AlreadyCheckedIn);

        checkin_record.checked_in = true;
        checkin_record.invalidated_at = None;
        // Actualizamos el timestamp al momento de la revalidación
        checkin_record.timestamp = Clock::get()?.unix_timestamp;

        msg!(
            "✅ Check-in revalidado para el ticket: {}",
            checkin_record.mint_address
        );

        Ok(())
    }
}

// ============================================================================
// CUENTAS: PerformCheckin
// Cuentas necesarias para registrar un nuevo check-in.
// La clave está en el `init` del checkin_record: si ya existe, Anchor falla
// automáticamente → anti-duplicación garantizada por el protocolo.
// ============================================================================
#[derive(Accounts)]
pub struct PerformCheckin<'info> {
    /// El staff del evento que escanea el boleto. Firma y paga el fee/rent.
    #[account(mut)]
    pub staff: Signer<'info>,

    /// CHECK: La cuenta del mint del NFT/ticket que se está verificando.
    /// Se usa como semilla para derivar el PDA y como referencia para validar
    /// que el ticket existe on-chain (debe tener lamports/data).
    /// La validación de que es un NFT real se hace verificando que la cuenta no esté vacía.
    #[account(
        constraint = ticket_mint.lamports() > 0 @ CheckinError::InvalidTicket
    )]
    pub ticket_mint: UncheckedAccount<'info>,

    /// La cuenta PDA que actúa como "sello" de entrada.
    /// Seeds: ["checkin", ticket_mint.key().as_ref()]
    /// Si esta PDA ya existe → `init` falla → duplicado detectado automáticamente.
    /// Espacio: 8 (discriminador de Anchor) + CheckinRecord::INIT_SPACE
    #[account(
        init,
        payer = staff,
        space = 8 + CheckinRecord::INIT_SPACE,
        seeds = [b"checkin", ticket_mint.key().as_ref()],
        bump,
    )]
    pub checkin_record: Account<'info, CheckinRecord>,

    /// Programa del sistema, requerido por `init` para crear la cuenta PDA
    pub system_program: Program<'info, System>,
}

// ============================================================================
// CUENTAS: ModifyCheckin
// Cuentas necesarias para invalidar o revalidar un check-in existente.
// ============================================================================
#[derive(Accounts)]
pub struct ModifyCheckin<'info> {
    /// El staff que modifica el registro. Debe firmar la operación.
    #[account(mut)]
    pub staff: Signer<'info>,

    /// El registro de check-in que se va a modificar (ya debe existir).
    #[account(mut)]
    pub checkin_record: Account<'info, CheckinRecord>,
}

// ============================================================================
// ESTADO: CheckinRecord
// Datos que se almacenan on-chain en la PDA de cada check-in.
// La mera existencia de esta cuenta es lo que define si un ticket ya entró.
// ============================================================================
#[account]
#[derive(InitSpace)]
pub struct CheckinRecord {
    /// Dirección pública del NFT/ticket que fue escaneado
    pub mint_address: Pubkey,       // 32 bytes
    /// Flag que indica si el check-in está activo (true) o invalidado (false)
    pub checked_in: bool,           // 1 byte
    /// Timestamp Unix del momento exacto del check-in (o la revalidación más reciente)
    pub timestamp: i64,             // 8 bytes
    /// Dirección pública del staff que realizó el escaneo
    pub staff: Pubkey,              // 32 bytes
    /// Timestamp de invalidación (None si nunca fue invalidado)
    /// Useful para auditoría: saber cuándo se anuló un check-in
    pub invalidated_at: Option<i64>, // 1 + 8 = 9 bytes
}

// ============================================================================
// ERRORES: CheckinError
// Errores específicos del programa de check-in.
// ============================================================================
#[error_code]
pub enum CheckinError {
    /// El ticket escaneado no corresponde a un NFT/cuenta válida on-chain
    #[msg("El ticket escaneado no es un NFT válido en la blockchain")]
    InvalidTicket,

    /// El check-in ya fue registrado para este ticket (duplicado)
    /// Nota: este error normalmente no se dispara manualmente porque
    /// Anchor lo previene a nivel de protocolo con `init`, pero lo dejamos
    /// por si se necesita en lógica adicional futura
    #[msg("Este ticket ya tiene un check-in registrado (entrada duplicada)")]
    AlreadyCheckedIn,

    /// Intento de invalidar un check-in que ya fue invalidado previamente
    #[msg("Este check-in ya fue invalidado anteriormente")]
    AlreadyInvalidated,
}
