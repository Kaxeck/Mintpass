use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{self, Token, TokenAccount, Transfer as SplTransfer, FreezeAccount, ThawAccount, Approve, Revoke, Burn, CloseAccount, MintTo};
use anchor_spl::metadata::{MetadataAccount, Metadata};
use anchor_lang::solana_program::pubkey;

// ============================================================================
// PROGRAMA: Mintpass Core (Monolito: Eventos, Reputación, Escrow, Tickets)
// ============================================================================

declare_id!("22222222222222222222222222222222");

const MAX_NAME_LEN: usize = 64;
const MAX_DESC_LEN: usize = 200;
const MAX_VENUE_LEN: usize = 100;
const MAX_CATEGORY_LEN: usize = 30;

pub const MINIMUM_FEE_LAMPORTS: u64 = 5_000_000; // 0.005 SOL
pub const DEPLOYER_KEY: Pubkey = pubkey!("11111111111111111111111111111111"); // TODO: Reemplazar con la llave del admin inicial

const SUCCESS_POINTS: u64 = 10;
const CANCEL_PENALTY: u64 = 20;

#[program]
pub mod mintpass_core {
    use super::*;

    // ========================================================================
    // 0. PROTOCOL INSTRUCTIONS
    // ========================================================================
    pub fn initialize_protocol(
        ctx: Context<InitializeProtocol>,
        authority: Pubkey,
        treasury: Pubkey,
    ) -> Result<()> {
        require!(ctx.accounts.admin.key() == DEPLOYER_KEY, CoreError::Unauthorized);
        let config = &mut ctx.accounts.protocol_config;
        config.authority = authority;
        config.treasury = treasury;
        config.is_paused = false;
        Ok(())
    }

    pub fn update_protocol_config(
        ctx: Context<UpdateProtocolConfig>,
        new_authority: Pubkey,
        new_treasury: Pubkey,
    ) -> Result<()> {
        let config = &mut ctx.accounts.protocol_config;
        config.authority = new_authority;
        config.treasury = new_treasury;
        Ok(())
    }

    pub fn toggle_pause(ctx: Context<UpdateProtocolConfig>, is_paused: bool) -> Result<()> {
        ctx.accounts.protocol_config.is_paused = is_paused;
        Ok(())
    }

    // ========================================================================
    // 1. REPUTATION INSTRUCTIONS
    // ========================================================================
    pub fn initialize_reputation(ctx: Context<InitializeReputation>) -> Result<()> {
        let reputation = &mut ctx.accounts.reputation;
        reputation.organizer = ctx.accounts.organizer.key();
        reputation.score = 0;
        reputation.total_events = 0;
        reputation.successful_events = 0;
        reputation.cancelled_events = 0;
        reputation.created_at = Clock::get()?.unix_timestamp;
        reputation.last_updated = Clock::get()?.unix_timestamp;
        msg!("Perfil de reputación inicializado para: {}", ctx.accounts.organizer.key());
        Ok(())
    }

    // ========================================================================
    // 2. EVENT REGISTRY INSTRUCTIONS
    // ========================================================================
    pub fn create_event(
        ctx: Context<CreateEvent>,
        name: String,
        description: String,
        event_timestamp: i64,
        venue: String,
        category: String,
        zones: Vec<Zone>,
        allow_resale: bool,
        resale_cap_limit: u16,
        is_soulbound: bool,
        allow_refunds: bool,
        refund_time_limit: u16,
        identity_limit: u16,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        require!(name.len() <= MAX_NAME_LEN, CoreError::NameTooLong);
        require!(description.len() <= MAX_DESC_LEN, CoreError::DescriptionTooLong);
        require!(venue.len() <= MAX_VENUE_LEN, CoreError::VenueTooLong);
        require!(category.len() <= MAX_CATEGORY_LEN, CoreError::CategoryTooLong);
        require!(zones.len() > 0, CoreError::NoZonesProvided);
        require!(zones.len() <= 8, CoreError::TooManyZones);
        let current_time = Clock::get()?.unix_timestamp;
        require!(event_timestamp > current_time, CoreError::EventAlreadyStarted);
        if allow_refunds {
            require!(refund_time_limit >= 1, CoreError::InvalidRefundWindow);
            require!(refund_time_limit <= 30, CoreError::InvalidRefundWindow); // Max 30 days
        }
        if allow_resale {
            require!(resale_cap_limit <= 1000, CoreError::InvalidResaleCap); // Max 1000%
        }

        let mut processed_zones = zones;
        for i in 0..processed_zones.len() {
            require!(processed_zones[i].name.len() <= 30, CoreError::NameTooLong);
            require!(processed_zones[i].capacity > 0, CoreError::InvalidZoneCapacity);
            require!(processed_zones[i].price == 0 || processed_zones[i].price >= MINIMUM_FEE_LAMPORTS * 2, CoreError::TicketPriceTooLow);
            processed_zones[i].tickets_sold = 0;
            
            for j in (i + 1)..processed_zones.len() {
                require!(processed_zones[i].name != processed_zones[j].name, CoreError::DuplicateZoneName);
            }
        }

        let event = &mut ctx.accounts.event_record;
        event.organizer = ctx.accounts.organizer.key();
        event.collection_mint = ctx.accounts.collection_mint.key();
        event.name = name.clone();
        event.description = description;
        event.event_timestamp = event_timestamp;
        event.venue = venue;
        event.category = category;
        
        event.zones = processed_zones;
        event.allow_resale = allow_resale;
        event.resale_cap_limit = resale_cap_limit;
        event.is_soulbound = is_soulbound;
        event.allow_refunds = allow_refunds;
        event.refund_time_limit = refund_time_limit;
        event.identity_limit = identity_limit;

        event.is_active = true;
        event.was_cancelled = false;
        event.created_at = current_time;
        event.closed_at = 0;

        emit!(EventCreated {
            organizer: ctx.accounts.organizer.key(),
            event_record: event.key(),
        });
        Ok(())
    }

    // ========================================================================
    // 3. CONSOLIDATED LIFECYCLE (CLOSE / CANCEL)
    // ========================================================================
    pub fn finish_event_successfully(ctx: Context<FinishEvent>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        let current_time = Clock::get()?.unix_timestamp;
        let event = &mut ctx.accounts.event_record;
        require!(event.is_active, CoreError::EventAlreadyClosed);
        require!(current_time > event.event_timestamp, CoreError::EventNotStarted);
        
        let reputation = &mut ctx.accounts.reputation;
        event.is_active = false;
        event.closed_at = current_time;
        
        let total_tickets_sold: u32 = event.zones.iter().map(|z| z.tickets_sold).sum();
        let volume_points = (total_tickets_sold / 100) as u64;
        let total_points_earned = SUCCESS_POINTS.checked_add(volume_points).unwrap_or(SUCCESS_POINTS);
        
        reputation.score = reputation.score.checked_add(total_points_earned).ok_or(CoreError::Overflow)?;
        reputation.successful_events = reputation.successful_events.checked_add(1).ok_or(CoreError::Overflow)?;
        reputation.total_events = reputation.total_events.checked_add(1).ok_or(CoreError::Overflow)?;
        reputation.last_updated = current_time;

        emit!(EventClosed {
            event_record: event.key(),
            was_cancelled: false,
            closed_at: event.closed_at,
        });
        Ok(())
    }

    pub fn cancel_event(ctx: Context<CancelEvent>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        let current_time = Clock::get()?.unix_timestamp;
        let event = &mut ctx.accounts.event_record;
        require!(event.is_active, CoreError::EventAlreadyClosed);
        
        let reputation = &mut ctx.accounts.reputation;
        event.is_active = false;
        event.was_cancelled = true;
        event.closed_at = current_time;
        
        // Ensure saturating_sub and checked_add are consistent and we don't underflow
        reputation.score = reputation.score.saturating_sub(CANCEL_PENALTY);
        reputation.cancelled_events = reputation.cancelled_events.checked_add(1).ok_or(CoreError::Overflow)?;
        reputation.total_events = reputation.total_events.checked_add(1).ok_or(CoreError::Overflow)?;
        reputation.last_updated = current_time;

        emit!(EventClosed {
            event_record: event.key(),
            was_cancelled: true,
            closed_at: event.closed_at,
        });
        Ok(())
    }

    // ========================================================================
    // 4. ESCROW INSTRUCTIONS
    // ========================================================================
    pub fn initialize_escrow(
        ctx: Context<InitializeEscrow>,
        platform_fee: u64,
    ) -> Result<()> {
        require!(platform_fee >= MINIMUM_FEE_LAMPORTS, CoreError::InvalidFee);
        let escrow_state = &mut ctx.accounts.escrow_state;
        escrow_state.organizer = ctx.accounts.organizer.key();
        escrow_state.event_record = ctx.accounts.event_record.key();
        escrow_state.tickets_sold = 0;
        escrow_state.is_completed = false;
        escrow_state.created_at = Clock::get()?.unix_timestamp;
        escrow_state.vault_bump = ctx.bumps.escrow_vault;

        if platform_fee > 0 {
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.organizer.to_account_info(),
                        to: ctx.accounts.mintpass_treasury.to_account_info(),
                    },
                ),
                platform_fee,
            )?;
        }

        msg!("Escrow inicializado para el evento '{}'", ctx.accounts.event_record.key());
        Ok(())
    }

    pub fn buy_ticket(
        ctx: Context<BuyTicket>,
        zone_index: u8,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        let event_record = &mut ctx.accounts.event_record;
        require!(event_record.is_active, CoreError::EventAlreadyClosed);
        require!(Clock::get()?.unix_timestamp <= event_record.event_timestamp, CoreError::EventAlreadyStarted);
        
        require!((zone_index as usize) < event_record.zones.len(), CoreError::InvalidZoneIndex);
        
        let metadata = &ctx.accounts.ticket_metadata;
        require!(metadata.collection.is_some(), CoreError::InvalidCollection);
        let collection = metadata.collection.as_ref().unwrap();
        require!(collection.key == event_record.collection_mint && collection.verified, CoreError::InvalidCollection);

        let counter = &mut ctx.accounts.ticket_counter;
        if event_record.identity_limit > 0 {
            require!(counter.count < event_record.identity_limit, CoreError::IdentityLimitExceeded);
        }
        counter.count = counter.count.checked_add(1).ok_or(CoreError::Overflow)?;
        
        let zone = &mut event_record.zones[zone_index as usize];
        let ticket_price = zone.price;
        
        require!(zone.tickets_sold < zone.capacity, CoreError::ExceedsCapacity);

        let escrow_state = &mut ctx.accounts.escrow_state;
        let receipt = &mut ctx.accounts.ticket_receipt;

        receipt.original_buyer = ctx.accounts.buyer.key();
        receipt.buyer = ctx.accounts.buyer.key();
        receipt.ticket_mint = ctx.accounts.ticket_mint.key();
        receipt.original_price = ticket_price;
        receipt.price_paid = ticket_price;
        receipt.status = TicketStatus::Valid;
        receipt.zone_index = zone_index;
        receipt.event_record = event_record.key();
        receipt.is_checked_in = false;
        receipt.checkin_timestamp = 0;
        receipt.checkin_staff = Pubkey::default();
        receipt.resale_price = 0;
        receipt.resale_count = 0;

        if ticket_price == 0 {
            // BOLETOS GRATIS: Requieren autorización (Whitelist)
            require!(ctx.accounts.whitelist_record.is_some(), CoreError::OrganizerNotWhitelisted);
            let whitelist = ctx.accounts.whitelist_record.as_ref().unwrap();
            require!(whitelist.is_authorized, CoreError::OrganizerNotWhitelisted);
            msg!("Boleto gratis emitido.");
        } else {
            // PAGO NORMAL
            let fee = ticket_price.checked_mul(5).ok_or(CoreError::Overflow)?.checked_div(100).ok_or(CoreError::Overflow)?;
            let calculated_fee = std::cmp::min(std::cmp::max(fee, MINIMUM_FEE_LAMPORTS), ticket_price);
            
            // Fee a Mintpass
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.mintpass_treasury.to_account_info(),
                    },
                ),
                calculated_fee,
            )?;

            // Monto a la bóveda
            transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.escrow_vault.to_account_info(),
                    },
                ),
                ticket_price,
            )?;
        }
        


        let event_key = event_record.key();
        let bump = ctx.bumps.escrow_state;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow_state",
            event_key.as_ref(),
            &[bump],
        ]];

        // MINT THE TOKEN
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
            1,
        )?;

        // C-04: Aprobar al escrow como delegate para permitir burn en refunds
        token::approve(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Approve {
                    to: ctx.accounts.token_account.to_account_info(),
                    delegate: ctx.accounts.escrow_state.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            1,
        )?;

        token::freeze_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                FreezeAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        zone.tickets_sold = zone.tickets_sold.checked_add(1).ok_or(CoreError::Overflow)?;
        escrow_state.tickets_sold = escrow_state.tickets_sold.checked_add(1).ok_or(CoreError::Overflow)?;
        
        emit!(TicketBought {
            ticket_mint: ctx.accounts.ticket_mint.key(),
            buyer: ctx.accounts.buyer.key(),
            original_price: ticket_price,
        });
        Ok(())
    }

    pub fn list_ticket(ctx: Context<ListTicket>, resale_price: u64) -> Result<()> {
        let event = &ctx.accounts.event_record;
        let receipt = &mut ctx.accounts.ticket_receipt;

        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        require!(event.is_active, CoreError::EventAlreadyClosed);
        require!(!event.is_soulbound, CoreError::TicketIsSoulbound);
        require!(event.allow_resale, CoreError::ResaleNotAllowed);
        require!(resale_price > 0, CoreError::InvalidResalePrice);
        require!(resale_price >= MINIMUM_FEE_LAMPORTS * 2, CoreError::ResalePriceTooLow);
        require!(
            receipt.status == TicketStatus::Valid || receipt.status == TicketStatus::Resold,
            CoreError::InvalidTicketState
        );
        require!(!receipt.is_checked_in, CoreError::AlreadyCheckedIn);
        require!(receipt.resale_count < 2, CoreError::MaxResalesReached);

        let markup = receipt.original_price
            .checked_mul(event.resale_cap_limit as u64)
            .ok_or(CoreError::Overflow)?
            .checked_div(100)
            .ok_or(CoreError::Overflow)?;
        let max_price = receipt.original_price
            .checked_add(markup)
            .ok_or(CoreError::Overflow)?;
            
        require!(resale_price <= max_price, CoreError::ExceedsResaleCap);

        let event_key = event.key();
        let bump = ctx.bumps.escrow_state;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow_state",
            event_key.as_ref(),
            &[bump],
        ]];

        token::thaw_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        token::approve(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Approve {
                    to: ctx.accounts.token_account.to_account_info(),
                    delegate: ctx.accounts.escrow_state.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;

        token::freeze_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                FreezeAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        receipt.status = TicketStatus::Listed;
        receipt.resale_price = resale_price;

        emit!(TicketListed {
            ticket_mint: receipt.ticket_mint,
            seller: ctx.accounts.seller.key(),
            resale_price,
        });
        Ok(())
    }

    pub fn delist_ticket(ctx: Context<DelistTicket>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        let event = &ctx.accounts.event_record;
        let receipt = &mut ctx.accounts.ticket_receipt;
        
        // Concurrency: Anchor locks the mutable ticket_receipt account. Prevents race conditions with buy_resale.
        require!(receipt.status == TicketStatus::Listed, CoreError::InvalidTicketState);

        let event_key = event.key();
        let bump = ctx.bumps.escrow_state;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow_state",
            event_key.as_ref(),
            &[bump],
        ]];

        token::thaw_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        token::revoke(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Revoke {
                    source: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
        )?;

        // Restaurar delegación al escrow para mantener capacidad de refund
        token::approve(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Approve {
                    to: ctx.accounts.token_account.to_account_info(),
                    delegate: ctx.accounts.escrow_state.to_account_info(),
                    authority: ctx.accounts.seller.to_account_info(),
                },
            ),
            1,
        )?;

        token::freeze_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                FreezeAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        if receipt.original_buyer == receipt.buyer {
            receipt.status = TicketStatus::Valid;
        } else {
            receipt.status = TicketStatus::Resold;
        }
        receipt.resale_price = 0;

        emit!(TicketDelisted {
            ticket_mint: receipt.ticket_mint,
            seller: ctx.accounts.seller.key(),
        });
        Ok(())
    }

    pub fn buy_resale(ctx: Context<BuyResale>) -> Result<()> {
        let event = &ctx.accounts.event_record;
        let receipt = &mut ctx.accounts.ticket_receipt;

        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        let counter = &mut ctx.accounts.ticket_counter;
        if event.identity_limit > 0 {
            require!(counter.count < event.identity_limit, CoreError::IdentityLimitExceeded);
        }
        counter.count = counter.count.checked_add(1).ok_or(CoreError::Overflow)?;
        require!(event.is_active, CoreError::EventAlreadyClosed);
        // Concurrency: Anchor locks the mutable ticket_receipt account. Prevents race conditions with delist_ticket.
        require!(receipt.status == TicketStatus::Listed, CoreError::InvalidTicketState);

        let new_price = receipt.resale_price;
        let fee = new_price.checked_mul(5).ok_or(CoreError::Overflow)?.checked_div(100).ok_or(CoreError::Overflow)?;
        let calculated_fee = std::cmp::min(std::cmp::max(fee, MINIMUM_FEE_LAMPORTS), new_price);
        let seller_receives = new_price.checked_sub(calculated_fee).ok_or(CoreError::Overflow)?;
        require!(seller_receives > 0, CoreError::ResalePriceTooLow);

        let event_key = event.key();
        let bump = ctx.bumps.escrow_state;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow_state",
            event_key.as_ref(),
            &[bump],
        ]];

        token::thaw_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.seller_token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.seller.to_account_info(),
                },
            ),
            seller_receives,
        )?;

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer.to_account_info(),
                    to: ctx.accounts.mintpass_treasury.to_account_info(),
                },
            ),
            calculated_fee,
        )?;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                SplTransfer {
                    from: ctx.accounts.seller_token_account.to_account_info(),
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(), // Escrow is delegate!
                },
                signer_seeds,
            ),
            1,
        )?;

        // Aprobar al escrow como delegate en la cuenta del nuevo comprador para refunds
        token::approve(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Approve {
                    to: ctx.accounts.buyer_token_account.to_account_info(),
                    delegate: ctx.accounts.escrow_state.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            1,
        )?;

        token::freeze_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                FreezeAccount {
                    account: ctx.accounts.buyer_token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                signer_seeds,
            ),
        )?;

        receipt.buyer = ctx.accounts.buyer.key();
        receipt.price_paid = new_price;
        receipt.status = TicketStatus::Resold;
        receipt.resale_price = 0;
        receipt.resale_count = receipt.resale_count.checked_add(1).ok_or(CoreError::Overflow)?;

        emit!(TicketResold {
            ticket_mint: ctx.accounts.ticket_mint.key(),
            seller: ctx.accounts.seller.key(),
            buyer: ctx.accounts.buyer.key(),
            new_price,
        });
        Ok(())
    }

    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        let event_record = &ctx.accounts.event_record;
        let escrow_state = &mut ctx.accounts.escrow_state;
        
        // Validation: Event must be marked as closed in EventRecord
        require!(!event_record.is_active, CoreError::EventNotClosed);
        require!(!event_record.was_cancelled, CoreError::EventCancelled);
        
        // Validation: Timelock (Refund window must have passed since event closure)
        let current_time = Clock::get()?.unix_timestamp;
        let refund_window_seconds = (event_record.refund_time_limit as i64) * 86_400;
        require!(current_time >= event_record.closed_at + refund_window_seconds, CoreError::RefundWindowNotPassed);

        require!(!escrow_state.is_completed, CoreError::AlreadyReleased);

        let vault_balance = ctx.accounts.escrow_vault.to_account_info().lamports();
        let rent_minimum = Rent::get()?.minimum_balance(0);
        let available = vault_balance.saturating_sub(rent_minimum);
        require!(available > 0, CoreError::InsufficientFunds);

        let event_key = event_record.key();
        let bump = escrow_state.vault_bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            event_key.as_ref(),
            &[bump],
        ]];

        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.organizer.to_account_info(),
                },
                signer_seeds,
            ),
            available,
        )?;

        escrow_state.is_completed = true;

        emit!(EscrowReleased {
            event_record: event_record.key(),
            organizer: ctx.accounts.organizer.key(),
            amount: available,
        });

        Ok(())
    }

    pub fn force_refund(ctx: Context<ForceRefund>) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        let escrow_state = &mut ctx.accounts.escrow_state;
        let receipt = &mut ctx.accounts.ticket_receipt;
        let event_record = &mut ctx.accounts.event_record;

        require!(event_record.allow_refunds || event_record.was_cancelled, CoreError::RefundsNotAllowed);
        if !event_record.was_cancelled {
            let current_time = Clock::get()?.unix_timestamp;
            let limit_seconds = (event_record.refund_time_limit as i64) * 86_400;
            
            let pre_event_ok = current_time <= event_record.event_timestamp.saturating_sub(limit_seconds);
            let post_event_ok = event_record.closed_at != 0 
                && current_time <= event_record.closed_at + limit_seconds;
                
            require!(pre_event_ok || post_event_ok, CoreError::RefundWindowExpired);
        }
        require!(!escrow_state.is_completed, CoreError::EventAlreadyCompleted);
        require!(
            receipt.status == TicketStatus::Valid || receipt.status == TicketStatus::Resold || receipt.status == TicketStatus::Listed,
            CoreError::InvalidTicketState
        );
        
        let vault_balance = ctx.accounts.escrow_vault.to_account_info().lamports();
        require!(vault_balance >= receipt.original_price, CoreError::InsufficientFunds);
        
        let zone = &mut event_record.zones[receipt.zone_index as usize];
        zone.tickets_sold = zone.tickets_sold.saturating_sub(1);
        escrow_state.tickets_sold = escrow_state.tickets_sold.saturating_sub(1);
        receipt.status = TicketStatus::Refunded;
        
        // I-02: Decrementar counter del comprador (solo si existe — puede no existir para tickets revendidos)
        if let Some(counter) = ctx.accounts.ticket_counter.as_mut() {
            counter.count = counter.count.saturating_sub(1);
        }
        
        let event_key = event_record.key();
        let bump = escrow_state.vault_bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow",
            event_key.as_ref(),
            &[bump],
        ]];
        
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.current_owner.to_account_info(),
                },
                signer_seeds,
            ),
            receipt.original_price,
        )?;

        let escrow_bump = ctx.bumps.escrow_state;
        let escrow_signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow_state",
            event_key.as_ref(),
            &[escrow_bump],
        ]];

        token::thaw_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                escrow_signer_seeds,
            ),
        )?;
        
        // BURN the token to destroy it permanently
        token::burn(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    from: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                escrow_signer_seeds,
            ),
            1,
        )?;

        // Nota: No se cierra la token account aquí porque CloseAccount requiere
        // el owner de la cuenta (no un delegate). El usuario puede cerrarla
        // manualmente después para recuperar el rent.

        emit!(TicketRefunded {
            ticket_mint: receipt.ticket_mint,
            owner: ctx.accounts.current_owner.key(),
            amount: receipt.original_price,
        });
        Ok(())
    }

    // ========================================================================
    // 5. CHECK-IN INSTRUCTIONS
    // ========================================================================
    pub fn perform_checkin(ctx: Context<PerformCheckin>, staff_id: String) -> Result<()> {
        require!(!ctx.accounts.protocol_config.is_paused, CoreError::ProtocolPaused);
        require!(staff_id.len() <= 36, CoreError::NameTooLong);
        let receipt = &mut ctx.accounts.ticket_receipt;
        let event = &ctx.accounts.event_record;
        
        require!(Clock::get()?.unix_timestamp >= event.event_timestamp - 86400, CoreError::EventNotStarted);
        
        // H-03: Validar colección del NFT contra el evento
        let metadata = &ctx.accounts.ticket_metadata;
        let collection = metadata.collection.as_ref().ok_or(CoreError::InvalidCollection)?;
        require!(
            collection.key == event.collection_mint && collection.verified,
            CoreError::InvalidCollection
        );
        
        require!(
            receipt.status == TicketStatus::Valid || receipt.status == TicketStatus::Resold,
            CoreError::InvalidTicketState
        );
        require!(!receipt.is_checked_in, CoreError::AlreadyCheckedIn);

        receipt.is_checked_in = true;
        receipt.checkin_timestamp = Clock::get()?.unix_timestamp;
        receipt.checkin_staff_id = staff_id.clone();
        receipt.status = TicketStatus::CheckedIn;

        emit!(TicketCheckedIn {
            ticket_mint: ctx.accounts.ticket_mint.key(),
            staff_id,
            timestamp: receipt.checkin_timestamp,
        });
        Ok(())
    }

    // ========================================================================
    // 6. ADMIN / AUTH INSTRUCTIONS
    // ========================================================================
    pub fn authorize_organizer(ctx: Context<AuthorizeOrganizer>, is_authorized: bool) -> Result<()> {
        let whitelist = &mut ctx.accounts.whitelist_record;
        whitelist.is_authorized = is_authorized;

        emit!(OrganizerAuthorized {
            organizer: ctx.accounts.organizer.key(),
            authorized: is_authorized,
        });

        Ok(())
    }

    // Removed authorize_staff as authorization is strictly handled off-chain for relayers

    pub fn force_thaw(ctx: Context<ForceThaw>) -> Result<()> {
        let event_record = &ctx.accounts.event_record;
        require!(event_record.was_cancelled, CoreError::Unauthorized);

        let event_key = event_record.key();
        let escrow_bump = ctx.bumps.escrow_state;
        let escrow_signer_seeds: &[&[&[u8]]] = &[&[
            b"escrow_state",
            event_key.as_ref(),
            &[escrow_bump],
        ]];

        token::thaw_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                ThawAccount {
                    account: ctx.accounts.token_account.to_account_info(),
                    mint: ctx.accounts.ticket_mint.to_account_info(),
                    authority: ctx.accounts.escrow_state.to_account_info(),
                },
                escrow_signer_seeds,
            ),
        )?;
        Ok(())
    }
}

// ============================================================================
// ACCOUNTS & STRUCTS
// ============================================================================

#[derive(Accounts)]
pub struct InitializeProtocol<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + ProtocolConfig::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProtocolConfig<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut,
        seeds = [b"config"],
        bump,
        constraint = admin.key() == protocol_config.authority @ CoreError::Unauthorized
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,
}

#[derive(Accounts)]
pub struct InitializeReputation<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
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

#[derive(Accounts)]
pub struct CreateEvent<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    pub collection_mint: Account<'info, token::Mint>,
    #[account(
        seeds = [
            b"metadata",
            Metadata::id().as_ref(),
            collection_mint.key().as_ref()
        ],
        bump,
        seeds::program = Metadata::id(),
        owner = Metadata::id(),
        constraint = collection_metadata.update_authority == organizer.key() @ CoreError::Unauthorized
    )]
    pub collection_metadata: Account<'info, MetadataAccount>,
    #[account(
        init,
        payer = organizer,
        space = 8 + EventRecord::INIT_SPACE,
        seeds = [b"event", organizer.key().as_ref(), collection_mint.key().as_ref()],
        bump,
    )]
    pub event_record: Account<'info, EventRecord>,
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinishEvent<'info> {
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = authority.key() == protocol_config.authority || authority.key() == event_record.organizer @ CoreError::Unauthorized)]
    pub authority: Signer<'info>,
    /// CHECK: Organizador del evento
    pub organizer: UncheckedAccount<'info>,
    pub collection_mint: Account<'info, token::Mint>,
    #[account(
        mut,
        seeds = [b"event", organizer.key().as_ref(), collection_mint.key().as_ref()],
        bump,
        constraint = event_record.organizer == organizer.key() @ CoreError::Unauthorized
    )]
    pub event_record: Account<'info, EventRecord>,
    #[account(
        mut,
        seeds = [b"reputation", organizer.key().as_ref()],
        bump,
        constraint = reputation.organizer == organizer.key() @ CoreError::Unauthorized
    )]
    pub reputation: Account<'info, ReputationProfile>,
}

#[derive(Accounts)]
pub struct CancelEvent<'info> {
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = authority.key() == protocol_config.authority || authority.key() == event_record.organizer @ CoreError::Unauthorized)]
    pub authority: Signer<'info>,
    /// CHECK: Organizador del evento
    pub organizer: UncheckedAccount<'info>,
    pub collection_mint: Account<'info, token::Mint>,
    #[account(
        mut,
        seeds = [b"event", organizer.key().as_ref(), collection_mint.key().as_ref()],
        bump,
        constraint = event_record.organizer == organizer.key() @ CoreError::Unauthorized
    )]
    pub event_record: Account<'info, EventRecord>,
    #[account(
        mut,
        seeds = [b"reputation", organizer.key().as_ref()],
        bump,
        constraint = reputation.organizer == organizer.key() @ CoreError::Unauthorized
    )]
    pub reputation: Account<'info, ReputationProfile>,
}

#[derive(Accounts)]
pub struct InitializeEscrow<'info> {
    #[account(mut)]
    pub organizer: Signer<'info>,
    
    #[account(
        constraint = event_record.organizer == organizer.key() @ CoreError::Unauthorized,
        constraint = event_record.is_active @ CoreError::EventAlreadyClosed
    )]
    pub event_record: Account<'info, EventRecord>,

    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    /// CHECK: Tesorería de Mintpass
    #[account(mut, constraint = mintpass_treasury.key() == protocol_config.treasury @ CoreError::InvalidTreasury)]
    pub mintpass_treasury: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [b"escrow", event_record.key().as_ref()],
        bump,
    )]
    pub escrow_vault: SystemAccount<'info>,
    #[account(
        init,
        payer = organizer,
        space = 8 + EscrowState::INIT_SPACE,
        seeds = [b"escrow_state", event_record.key().as_ref()],
        bump,
    )]
    pub escrow_state: Account<'info, EscrowState>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyTicket<'info> {
    #[account(mut)]
    pub payer: Signer<'info>, 
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(
        mut,
        constraint = ticket_mint.freeze_authority.is_some() && ticket_mint.freeze_authority.unwrap() == escrow_state.key() @ CoreError::InvalidFreezeAuthority,
        constraint = ticket_mint.mint_authority.is_some() && ticket_mint.mint_authority.unwrap() == escrow_state.key() @ CoreError::InvalidMintAuthority
    )]
    pub ticket_mint: Account<'info, token::Mint>,
    #[account(
        init,
        payer = payer,
        space = 8 + TicketReceipt::INIT_SPACE,
        seeds = [b"receipt", ticket_mint.key().as_ref()],
        bump
    )]
    pub ticket_receipt: Account<'info, TicketReceipt>,
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    /// CHECK: Tesorería de Mintpass
    #[account(mut, constraint = mintpass_treasury.key() == protocol_config.treasury @ CoreError::InvalidTreasury)]
    pub mintpass_treasury: UncheckedAccount<'info>,
    #[account(
        seeds = [b"whitelist", escrow_state.organizer.as_ref()],
        bump
    )]
    pub whitelist_record: Option<Account<'info, WhitelistRecord>>,
    #[account(mut, seeds = [b"escrow", event_record.key().as_ref()], bump)]
    pub escrow_vault: SystemAccount<'info>,
    #[account(mut, seeds = [b"escrow_state", event_record.key().as_ref()], bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(
        mut,
        constraint = event_record.key() == escrow_state.event_record @ CoreError::Unauthorized
    )]
    pub event_record: Account<'info, EventRecord>,
    #[account(
        mut,
        constraint = token_account.owner == buyer.key() @ CoreError::Unauthorized,
        constraint = token_account.mint == ticket_mint.key() @ CoreError::InvalidTicket
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + TicketCounter::INIT_SPACE,
        seeds = [b"counter", event_record.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub ticket_counter: Account<'info, TicketCounter>,
    #[account(
        seeds = [
            b"metadata",
            Metadata::id().as_ref(),
            ticket_mint.key().as_ref()
        ],
        bump,
        seeds::program = Metadata::id(),
        owner = Metadata::id(),
        constraint = ticket_metadata.mint == ticket_mint.key() @ CoreError::InvalidMetadata
    )]
    pub ticket_metadata: Account<'info, MetadataAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = organizer.key() == escrow_state.organizer @ CoreError::Unauthorized)]
    pub organizer: Signer<'info>,
    #[account(mut, seeds = [b"escrow", event_record.key().as_ref()], bump)]
    pub escrow_vault: SystemAccount<'info>,
    #[account(mut, seeds = [b"escrow_state", event_record.key().as_ref()], bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(constraint = event_record.key() == escrow_state.event_record @ CoreError::Unauthorized)]
    pub event_record: Account<'info, EventRecord>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ForceRefund<'info> {
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = mintpass_authority.key() == protocol_config.authority @ CoreError::Unauthorized)]
    pub mintpass_authority: Signer<'info>,
    #[account(mut, constraint = current_owner.key() == ticket_receipt.buyer @ CoreError::Unauthorized)]
    /// CHECK: Comprador actual
    pub current_owner: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = token_account.owner == current_owner.key() @ CoreError::Unauthorized,
        constraint = token_account.mint == ticket_receipt.ticket_mint @ CoreError::InvalidTicket,
        constraint = token_account.amount == 1 @ CoreError::InvalidTicketState
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = ticket_receipt.event_record == event_record.key() @ CoreError::InvalidTicket)]
    pub ticket_receipt: Account<'info, TicketReceipt>,
    #[account(mut, seeds = [b"escrow", event_record.key().as_ref()], bump)]
    pub escrow_vault: SystemAccount<'info>,
    #[account(mut, seeds = [b"escrow_state", event_record.key().as_ref()], bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(
        mut,
        constraint = event_record.key() == escrow_state.event_record @ CoreError::Unauthorized
    )]
    pub event_record: Account<'info, EventRecord>,
    #[account(mut, constraint = ticket_mint.key() == ticket_receipt.ticket_mint @ CoreError::InvalidTicket)]
    pub ticket_mint: Account<'info, token::Mint>,
    #[account(
        mut,
        seeds = [b"counter", event_record.key().as_ref(), current_owner.key().as_ref()],
        bump
    )]
    pub ticket_counter: Option<Account<'info, TicketCounter>>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

    // Removed AuthorizeStaff context

#[derive(Accounts)]
pub struct ListTicket<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        constraint = token_account.owner == seller.key() @ CoreError::Unauthorized,
        constraint = token_account.mint == ticket_receipt.ticket_mint @ CoreError::InvalidTicket,
        constraint = token_account.amount == 1 @ CoreError::InvalidTicketState
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = ticket_receipt.buyer == seller.key() @ CoreError::Unauthorized,
        constraint = ticket_receipt.event_record == event_record.key() @ CoreError::InvalidTicket
    )]
    pub ticket_receipt: Account<'info, TicketReceipt>,
    pub event_record: Account<'info, EventRecord>,
    #[account(seeds = [b"escrow_state", event_record.key().as_ref()], bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(mut, constraint = ticket_mint.key() == ticket_receipt.ticket_mint @ CoreError::InvalidTicket)]
    pub ticket_mint: Account<'info, token::Mint>,
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DelistTicket<'info> {
    #[account(mut)]
    pub seller: Signer<'info>,
    #[account(
        mut,
        constraint = token_account.owner == seller.key() @ CoreError::Unauthorized,
        constraint = token_account.mint == ticket_receipt.ticket_mint @ CoreError::InvalidTicket,
        constraint = token_account.amount == 1 @ CoreError::InvalidTicketState
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = ticket_receipt.buyer == seller.key() @ CoreError::Unauthorized,
        constraint = ticket_receipt.event_record == event_record.key() @ CoreError::InvalidTicket
    )]
    pub ticket_receipt: Account<'info, TicketReceipt>,
    pub event_record: Account<'info, EventRecord>,
    #[account(seeds = [b"escrow_state", event_record.key().as_ref()], bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(mut, constraint = ticket_mint.key() == ticket_receipt.ticket_mint @ CoreError::InvalidTicket)]
    pub ticket_mint: Account<'info, token::Mint>,
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BuyResale<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: Recibe el dinero
    #[account(mut, constraint = seller.key() == ticket_receipt.buyer @ CoreError::Unauthorized)]
    pub seller: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = seller_token_account.owner == seller.key() @ CoreError::Unauthorized,
        constraint = seller_token_account.mint == ticket_receipt.ticket_mint @ CoreError::InvalidTicket,
        constraint = seller_token_account.amount == 1 @ CoreError::InvalidTicketState
    )]
    pub seller_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ CoreError::Unauthorized,
        constraint = buyer_token_account.mint == ticket_receipt.ticket_mint @ CoreError::InvalidTicket
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = ticket_receipt.event_record == event_record.key() @ CoreError::InvalidTicket
    )]
    pub ticket_receipt: Account<'info, TicketReceipt>,
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = mintpass_treasury.key() == protocol_config.treasury @ CoreError::InvalidTreasury)]
    /// CHECK: Tesorería de Mintpass
    pub mintpass_treasury: UncheckedAccount<'info>,
    pub event_record: Account<'info, EventRecord>,
    #[account(seeds = [b"escrow_state", event_record.key().as_ref()], bump)]
    pub escrow_state: Account<'info, EscrowState>,
    #[account(constraint = ticket_mint.key() == ticket_receipt.ticket_mint @ CoreError::InvalidTicket)]
    pub ticket_mint: Account<'info, token::Mint>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + TicketCounter::INIT_SPACE,
        seeds = [b"counter", event_record.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub ticket_counter: Account<'info, TicketCounter>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PerformCheckin<'info> {
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = mintpass_authority.key() == protocol_config.authority @ CoreError::Unauthorized)]
    pub mintpass_authority: Signer<'info>,
    pub ticket_mint: Account<'info, token::Mint>,
    #[account(
        constraint = token_account.owner == ticket_receipt.buyer @ CoreError::Unauthorized,
        constraint = token_account.mint == ticket_mint.key() @ CoreError::InvalidTicket,
        constraint = token_account.amount == 1 @ CoreError::InvalidTicketState
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = ticket_mint.key() == ticket_receipt.ticket_mint @ CoreError::InvalidTicket)]
    pub ticket_receipt: Account<'info, TicketReceipt>,
    #[account(
        constraint = ticket_receipt.event_record == event_record.key() @ CoreError::InvalidTicket,
        constraint = !event_record.was_cancelled @ CoreError::EventCancelled
    )]
    pub event_record: Account<'info, EventRecord>,
    #[account(
        seeds = [
            b"metadata",
            Metadata::id().as_ref(),
            ticket_mint.key().as_ref()
        ],
        bump,
        seeds::program = Metadata::id(),
        owner = Metadata::id(),
        constraint = ticket_metadata.mint == ticket_mint.key() @ CoreError::InvalidMetadata
    )]
    pub ticket_metadata: Account<'info, MetadataAccount>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AuthorizeOrganizer<'info> {
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = mintpass_authority.key() == protocol_config.authority @ CoreError::Unauthorized)]
    pub mintpass_authority: Signer<'info>,
    /// CHECK: Organizador a autorizar
    pub organizer: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = mintpass_authority,
        space = 8 + WhitelistRecord::INIT_SPACE,
        seeds = [b"whitelist", organizer.key().as_ref()],
        bump
    )]
    pub whitelist_record: Account<'info, WhitelistRecord>,
    pub system_program: Program<'info, System>,
}

// ============================================================================
// STATE STRUCTS
// ============================================================================

#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub is_paused: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum TicketStatus {
    Valid,
    CheckedIn,
    Refunded,
    Listed,
    Resold,
    Cancelled,
}

#[account]
#[derive(InitSpace)]
pub struct ReputationProfile {
    pub organizer: Pubkey,
    pub score: u64,
    pub total_events: u64,
    pub successful_events: u64,
    pub cancelled_events: u64,
    pub created_at: i64,
    pub last_updated: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct Zone {
    #[max_len(30)]
    pub name: String,
    pub capacity: u32,
    pub price: u64,
    pub tickets_sold: u32,
}

#[account]
#[derive(InitSpace)]
pub struct EventRecord {
    pub organizer: Pubkey,
    pub collection_mint: Pubkey,
    #[max_len(64)]
    pub name: String,
    #[max_len(200)]
    pub description: String,
    pub event_timestamp: i64,
    #[max_len(100)]
    pub venue: String,
    #[max_len(30)]
    pub category: String,
    #[max_len(8)]
    pub zones: Vec<Zone>,
    pub allow_resale: bool,
    pub resale_cap_limit: u16,
    pub is_soulbound: bool,
    pub allow_refunds: bool,
    pub refund_time_limit: u16,
    pub identity_limit: u16,
    pub is_active: bool,
    pub was_cancelled: bool,
    pub created_at: i64,
    pub closed_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct TicketCounter {
    pub count: u16,
}

#[account]
#[derive(InitSpace)]
pub struct EscrowState {
    pub organizer: Pubkey,
    pub event_record: Pubkey,
    pub tickets_sold: u32,
    pub is_completed: bool,
    pub created_at: i64,
    pub vault_bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct TicketReceipt {
    pub original_buyer: Pubkey,
    pub buyer: Pubkey,
    pub ticket_mint: Pubkey,
    pub original_price: u64,
    pub price_paid: u64,
    pub resale_price: u64,
    pub status: TicketStatus,
    pub zone_index: u8,
    pub event_record: Pubkey,
    pub is_checked_in: bool,
    pub checkin_timestamp: i64,
    #[max_len(36)]
    pub checkin_staff_id: String,
    pub resale_count: u8,
}

#[account]
#[derive(InitSpace)]
pub struct WhitelistRecord {
    pub is_authorized: bool,
}

// Removed StaffRecord struct

#[derive(Accounts)]
pub struct ForceThaw<'info> {
    #[account(seeds = [b"config"], bump)]
    pub protocol_config: Account<'info, ProtocolConfig>,
    #[account(mut, constraint = mintpass_authority.key() == protocol_config.authority @ CoreError::Unauthorized)]
    pub mintpass_authority: Signer<'info>,
    #[account(
        mut,
        constraint = token_account.mint == ticket_mint.key() @ CoreError::InvalidTicket
    )]
    pub token_account: Account<'info, TokenAccount>,
    #[account(
        constraint = ticket_mint.freeze_authority.is_some() 
            && ticket_mint.freeze_authority.unwrap() == escrow_state.key() 
            @ CoreError::InvalidFreezeAuthority
    )]
    pub ticket_mint: Account<'info, token::Mint>,
    #[account(seeds = [b"escrow_state", event_record.key().as_ref()], bump)]
    pub escrow_state: Account<'info, EscrowState>,
    pub event_record: Account<'info, EventRecord>,
    pub token_program: Program<'info, Token>,
}

// ============================================================================
// ERRORS
// ============================================================================

#[error_code]
pub enum CoreError {
    #[msg("Error aritmético: overflow")] Overflow,
    #[msg("El precio del boleto no cubre el fee mínimo")] TicketPriceTooLow,
    #[msg("Los reembolsos no están habilitados para este evento")] RefundsNotAllowed,
    #[msg("El nombre del evento excede el límite")] NameTooLong,
    #[msg("La descripción del evento excede el límite")] DescriptionTooLong,
    #[msg("El venue/lugar excede el límite")] VenueTooLong,
    #[msg("La categoría excede el límite")] CategoryTooLong,
    #[msg("La cantidad de tickets vendidos excede el aforo de la zona")] ExceedsCapacity,
    #[msg("El evento ya fue cerrado")] EventAlreadyClosed,
    #[msg("El evento no ha sido cerrado aún")] EventNotClosed,
    #[msg("Aún no expira la ventana de reembolso")] RefundWindowNotPassed,
    #[msg("No tienes autorización para realizar esta acción")] Unauthorized,
    #[msg("Staff no autorizado para realizar check-in")] UnauthorizedStaff,
    #[msg("Debes proveer al menos una zona para el evento")] NoZonesProvided,
    #[msg("Demasiadas zonas proveídas")] TooManyZones,
    #[msg("La capacidad de la zona debe ser mayor a 0")] InvalidZoneCapacity,
    #[msg("El índice de la zona es inválido")] InvalidZoneIndex,
    #[msg("La ventana de reembolso debe ser de al menos 1 día")] InvalidRefundWindow,
    #[msg("Tesorería inválida")] InvalidTreasury,
    #[msg("Los fondos del escrow ya fueron liberados")] AlreadyReleased,
    #[msg("El evento ya se completó exitosamente")] EventAlreadyCompleted,
    #[msg("El evento fue cancelado, los fondos están bloqueados para reembolso")] EventCancelled,
    #[msg("La bóveda no tiene fondos suficientes")] InsufficientFunds,
    #[msg("Este organizador no está en la Whitelist")] OrganizerNotWhitelisted,
    #[msg("El estado actual del ticket no permite esta operación")] InvalidTicketState,
    #[msg("Este boleto es soulbound y no se puede transferir")] TicketIsSoulbound,
    #[msg("El ticket escaneado no coincide con el recibo")] InvalidTicket,
    #[msg("La reventa no está permitida para este evento")] ResaleNotAllowed,
    #[msg("El precio de reventa debe ser mayor a 0")] InvalidResalePrice,
    #[msg("El precio excede el límite máximo de reventa")] ExceedsResaleCap,
    #[msg("Este boleto ya fue registrado en la puerta")] AlreadyCheckedIn,
    #[msg("El evento ya ha comenzado o pasado")] EventAlreadyStarted,
    #[msg("El token no pertenece a la colección oficial")] InvalidCollection,
    #[msg("Has excedido el límite de boletos permitidos")] IdentityLimitExceeded,
    #[msg("Freeze Authority inválido o ausente en el Mint")] InvalidFreezeAuthority,
    #[msg("El evento no ha comenzado aún")] EventNotStarted,
    #[msg("Hay zonas con nombres duplicados")] DuplicateZoneName,
    #[msg("El precio de reventa no cubre el fee mínimo de la plataforma")] ResalePriceTooLow,
    #[msg("El metadata proporcionado no coincide con el Mint")] InvalidMetadata,
    #[msg("El límite de reventa excede el máximo permitido")] InvalidResaleCap,
    #[msg("El protocolo está pausado")] ProtocolPaused,
    #[msg("Este boleto ya alcanzó el límite máximo de reventas (2)")] MaxResalesReached,
    #[msg("La ventana de reembolso para este evento ya expiró")] RefundWindowExpired,
    #[msg("El fee proporcionado es inválido o menor al mínimo requerido")] InvalidFee,
    #[msg("Mint Authority inválido o ausente en el Mint")] InvalidMintAuthority,
}

// ============================================================================
// EVENTS
// ============================================================================
#[event]
pub struct EventCreated {
    pub organizer: Pubkey,
    pub event_record: Pubkey,
}

#[event]
pub struct TicketBought {
    pub ticket_mint: Pubkey,
    pub buyer: Pubkey,
    pub original_price: u64,
}

#[event]
pub struct TicketResold {
    pub ticket_mint: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub new_price: u64,
}

#[event]
pub struct TicketListed {
    pub ticket_mint: Pubkey,
    pub seller: Pubkey,
    pub resale_price: u64,
}

#[event]
pub struct TicketDelisted {
    pub ticket_mint: Pubkey,
    pub seller: Pubkey,
}

#[event]
pub struct TicketCheckedIn {
    pub ticket_mint: Pubkey,
    pub staff_id: String,
    pub timestamp: i64,
}

#[event]
pub struct TicketRefunded {
    pub ticket_mint: Pubkey,
    pub owner: Pubkey,
    pub amount: u64,
}

#[event]
pub struct EventClosed {
    pub event_record: Pubkey,
    pub was_cancelled: bool,
    pub closed_at: i64,
}

#[event]
pub struct EscrowReleased {
    pub event_record: Pubkey,
    pub organizer: Pubkey,
    pub amount: u64,
}

#[event]
pub struct OrganizerAuthorized {
    pub organizer: Pubkey,
    pub authorized: bool,
}

// Removed StaffAuthorized event
