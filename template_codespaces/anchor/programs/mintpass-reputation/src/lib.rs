use anchor_lang::prelude::*;

// ============================================================================
// PROGRAMA: Mintpass Reputation
// Descripción: Sistema de reputación descentralizado para organizadores de eventos.
//
// El score de cada organizador vive en una PDA on-chain, no en base de datos.
// Esto lo hace público, verificable e inmutable — nadie puede alterar el historial.
//
// Reglas de puntuación:
//   - Evento exitoso (check-in + fondos liberados): +10 puntos
//   - Evento cancelado (sin check-in + reembolso): -20 puntos
//   - Score mínimo: 0 (nunca baja de cero para evitar overflow)
//   - Score inicial de un organizador nuevo: 0
//
// La PDA se crea automáticamente la primera vez que el organizador
// recibe un resultado. A partir de ahí se va acumulando.
//
// Seeds de la PDA: ["reputation", organizer_pubkey.as_ref()]
// ============================================================================

// TODO: Reemplazar con el Program ID real después de ejecutar `anchor build`
declare_id!("11111111111111111111111111111111");

/// Puntos que se suman por un evento exitoso
const SUCCESS_POINTS: u64 = 10;
/// Puntos que se restan por un evento cancelado
const CANCEL_PENALTY: u64 = 20;

#[program]
pub mod mintpass_reputation {
    use super::*;

    // ========================================================================
    // INSTRUCCIÓN 1: initialize_reputation
    // Crea la cuenta PDA de reputación para un organizador por primera vez.
    //
    // Se llama una sola vez cuando el organizador crea su primer evento.
    // Después de esto, solo se usan record_success y record_cancel.
    // ========================================================================
    pub fn initialize_reputation(ctx: Context<InitializeReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;

        // Inicializamos el perfil de reputación con valores base
        reputation.organizer = ctx.accounts.organizer.key();
        reputation.score = 0;                   // Todos empiezan desde cero
        reputation.total_events = 0;            // Sin eventos registrados
        reputation.successful_events = 0;       // Sin éxitos 
        reputation.cancelled_events = 0;        // Sin cancelaciones
        reputation.created_at = Clock::get()?.unix_timestamp;
        reputation.last_updated = Clock::get()?.unix_timestamp;

        msg!(
            "Perfil de reputación inicializado para el organizador: {}",
            ctx.accounts.organizer.key()
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 2: record_success
    // Registra un evento exitoso y suma puntos al organizador.
    //
    // Contexto: se llama después de que release_escrow fue ejecutado, 
    // confirmando que el evento ocurrió y el organizador cobró legítimamente.
    //
    // Efecto: score += 10, successful_events += 1, total_events += 1
    // ========================================================================
    pub fn record_success(ctx: Context<UpdateReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;

        // Sumamos los puntos de éxito al score acumulado
        reputation.score = reputation.score.checked_add(SUCCESS_POINTS)
            .ok_or(ReputationError::Overflow)?;
        
        // Actualizamos contadores estadísticos
        reputation.successful_events = reputation.successful_events.checked_add(1)
            .ok_or(ReputationError::Overflow)?;
        reputation.total_events = reputation.total_events.checked_add(1)
            .ok_or(ReputationError::Overflow)?;
        reputation.last_updated = Clock::get()?.unix_timestamp;

        msg!(
            "🏆 Evento exitoso registrado para {}. Score actual: {} (+{})",
            reputation.organizer,
            reputation.score,
            SUCCESS_POINTS
        );

        Ok(())
    }

    // ========================================================================
    // INSTRUCCIÓN 3: record_cancel
    // Registra una cancelación y penaliza al organizador.
    //
    // Contexto: se llama después de que refund_buyer fue ejecutado,
    // confirmando que el evento no ocurrió y el comprador fue reembolsado.
    //
    // Efecto: score -= 20 (con piso en 0), cancelled_events += 1, total_events += 1
    // ========================================================================
    pub fn record_cancel(ctx: Context<UpdateReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;

        // Restamos la penalización, pero con un piso mínimo de 0
        // Usamos saturating_sub para evitar underflow (nunca será negativo)
        reputation.score = reputation.score.saturating_sub(CANCEL_PENALTY);

        // Actualizamos contadores estadísticos
        reputation.cancelled_events = reputation.cancelled_events.checked_add(1)
            .ok_or(ReputationError::Overflow)?;
        reputation.total_events = reputation.total_events.checked_add(1)
            .ok_or(ReputationError::Overflow)?;
        reputation.last_updated = Clock::get()?.unix_timestamp;

        msg!(
            "❌ Cancelación registrada para {}. Score actual: {} (-{})",
            reputation.organizer,
            reputation.score,
            CANCEL_PENALTY
        );

        Ok(())
    }
}

// ============================================================================
// CUENTAS: InitializeReputation
// Crea la PDA de reputación por primera vez. Solo se ejecuta una vez
// por organizador (si ya existe, `init` falla automáticamente).
// ============================================================================
#[derive(Accounts)]
pub struct InitializeReputation<'info> {
    /// El organizador que crea su perfil de reputación. Paga el rent.
    #[account(mut)]
    pub organizer: Signer<'info>,

    /// La cuenta PDA que almacena el score y estadísticas del organizador.
    /// Seeds: ["reputation", organizer.key().as_ref()]
    /// Cada organizador tiene exactamente UNA cuenta de reputación.
    #[account(
        init,
        payer = organizer,
        space = 8 + ReputationProfile::INIT_SPACE,
        seeds = [b"reputation", organizer.key().as_ref()],
        bump,
    )]
    pub reputation: Account<'info, ReputationProfile>,

    pub system_program: Program<'info, System>,
}

// ============================================================================
// CUENTAS: UpdateReputation
// Actualiza el score de un organizador existente (éxito o cancelación).
// ============================================================================
#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    /// La autoridad que ejecuta la actualización.
    /// En producción, esto debería ser una wallet de administrador del protocolo
    /// o el mismo programa de Escrow via CPI (para que sea automático).
    #[account(mut)]
    pub authority: Signer<'info>,

    /// La cuenta PDA de reputación del organizador.
    /// Validamos que coincida con el organizador correcto a través de las seeds.
    #[account(
        mut,
        seeds = [b"reputation", reputation.organizer.as_ref()],
        bump,
    )]
    pub reputation: Account<'info, ReputationProfile>,
}

// ============================================================================
// ESTADO: ReputationProfile
// Perfil de reputación on-chain de un organizador.
// Almacena el score numérico y estadísticas detalladas de su historial.
//
// El score es público y cualquiera puede leerlo con getAccountInfo()
// desde el frontend (operación gratuita, sin fees).
// ============================================================================
#[account]
#[derive(InitSpace)]
pub struct ReputationProfile {
    /// Dirección pública del organizador dueño de este perfil
    pub organizer: Pubkey,          // 32 bytes
    /// Score acumulado de reputación (nunca baja de 0)
    pub score: u64,                 // 8 bytes
    /// Total de eventos registrados (éxitos + cancelaciones)
    pub total_events: u64,          // 8 bytes
    /// Cantidad de eventos que se completaron exitosamente
    pub successful_events: u64,     // 8 bytes
    /// Cantidad de eventos cancelados
    pub cancelled_events: u64,      // 8 bytes
    /// Timestamp Unix de cuándo se creó el perfil
    pub created_at: i64,            // 8 bytes
    /// Timestamp Unix de la última actualización del score
    pub last_updated: i64,          // 8 bytes
}

// ============================================================================
// ERRORES: ReputationError
// ============================================================================
#[error_code]
pub enum ReputationError {
    /// Overflow aritmético al intentar sumar puntos o contadores
    #[msg("Error aritmético: el valor excede el límite máximo permitido")]
    Overflow,
}
