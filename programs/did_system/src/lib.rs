use anchor_lang::prelude::*;

declare_id!("26aJf2GBAnjLidUCzPa9W8tuhZRj37J6VeW3fFQrJeqw");

#[program]
pub mod did_system {
    use super::*;

    pub fn create_did(
        ctx: Context<CreateDid>,
        username: String,
        github: String,
        twitter: String,
        ipfs_hash: String,
    ) -> Result<()> {
        require!(username.len() > 0, ErrorCode::UsernameEmpty);
        require!(username.len() <= 32, ErrorCode::UsernameTooLong);
        
        let did_account = &mut ctx.accounts.did_account;
        let clock = Clock::get()?;
        
        did_account.owner = ctx.accounts.user.key();
        did_account.username = username;
        did_account.github = github;
        did_account.twitter = twitter;
        did_account.ipfs_hash = ipfs_hash;
        did_account.created_at = clock.unix_timestamp;
        did_account.updated_at = clock.unix_timestamp;
        did_account.bump = ctx.bumps.did_account;
        
        msg!("DID created for user: {}", ctx.accounts.user.key());
        Ok(())
    }

    pub fn update_did(
        ctx: Context<UpdateDid>,
        github: Option<String>,
        twitter: Option<String>,
        ipfs_hash: Option<String>,
    ) -> Result<()> {
        let did_account = &mut ctx.accounts.did_account;
        let clock = Clock::get()?;
        
        if let Some(gh) = github {
            did_account.github = gh;
        }
        if let Some(tw) = twitter {
            did_account.twitter = tw;
        }
        if let Some(ipfs) = ipfs_hash {
            did_account.ipfs_hash = ipfs;
        }
        
        did_account.updated_at = clock.unix_timestamp;
        
        msg!("DID updated for user: {}", ctx.accounts.user.key());
        Ok(())
    }

    pub fn delete_did(ctx: Context<DeleteDid>) -> Result<()> {
        msg!("DID deleted for user: {}", ctx.accounts.user.key());
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateDid<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + 32 + (4 + 32) + (4 + 64) + (4 + 64) + (4 + 128) + 8 + 8 + 1,
        seeds = [b"did", user.key().as_ref()],
        bump
    )]
    pub did_account: Account<'info, DidAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDid<'info> {
    #[account(
        mut,
        seeds = [b"did", user.key().as_ref()],
        bump = did_account.bump,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub did_account: Account<'info, DidAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Owner validation is done via has_one constraint
    pub owner: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct DeleteDid<'info> {
    #[account(
        mut,
        seeds = [b"did", user.key().as_ref()],
        bump = did_account.bump,
        has_one = owner @ ErrorCode::Unauthorized,
        close = user
    )]
    pub did_account: Account<'info, DidAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    /// CHECK: Owner validation is done via has_one constraint
    pub owner: AccountInfo<'info>,
}

#[account]
pub struct DidAccount {
    pub owner: Pubkey,
    pub username: String,
    pub github: String,
    pub twitter: String,
    pub ipfs_hash: String,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Username cannot exceed 32 characters")]
    UsernameTooLong,
    #[msg("Username cannot be empty")]
    UsernameEmpty,
    #[msg("You are not authorized to perform this action")]
    Unauthorized,
}