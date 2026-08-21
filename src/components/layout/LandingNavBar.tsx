import React, { useEffect, useState } from 'react';
import WalletMultiButton from '../ui/WalletButton';
import { usePrivy } from "@privy-io/react-auth";
import { useWalletSession } from "@solana/react-hooks";
import { useMintpassStore } from "@/store";
import { useRouter } from "next/navigation";
import { getOrganizerProfile } from "@/app/actions/organizer";

interface LandingNavBarProps {
  onGoToExplore?: () => void;
  onGoToMyTickets?: () => void;
  onGoToOrganizer?: () => void;
}

export function LandingNavBar({ onGoToExplore, onGoToMyTickets, onGoToOrganizer }: LandingNavBarProps) {
  const { authenticated, user } = usePrivy();
  const session = useWalletSession();
  const { organizerProfile, setOrganizerProfile } = useMintpassStore();
  const router = useRouter();
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [lastCheckedWallet, setLastCheckedWallet] = useState<string | null>(null);

  const privySolanaWallet = (user?.linkedAccounts?.find(
    (account: any) => account.type === 'wallet' && account.chainType === 'solana'
  ) as any)?.address;
  const walletAddressStr = privySolanaWallet || session?.account?.address?.toString() || null;
  const isConnected = authenticated || !!walletAddressStr;

  useEffect(() => {
    if (isConnected && walletAddressStr && !loadingProfile && lastCheckedWallet !== walletAddressStr) {
      setLoadingProfile(true);
      getOrganizerProfile(walletAddressStr).then(profile => {
        if (profile) {
          setOrganizerProfile({
            name: profile.companyName || profile.name || "",
            category: profile.organizerCategory || "",
            bio: profile.bio || "",
            supportEmail: profile.contactEmail || profile.email || "",
            internalPhone: profile.contactPhone || "",
            logoUrl: profile.logoUrl || undefined,
            socialLink: profile.socialLinks ? (JSON.parse(profile.socialLinks as string)[0] || undefined) : undefined
          });
        }
        setLastCheckedWallet(walletAddressStr);
      }).finally(() => setLoadingProfile(false));
    }
  }, [isConnected, walletAddressStr, loadingProfile, lastCheckedWallet, setOrganizerProfile]);

  return (
    <header className="lp-nav">
      <div className="lp-nav-inner">
        <span className="lp-nav-brand" onClick={() => router.push('/')}>
          <img src="/icon.png" alt="Logo" />
          <span>Mint<span className="lp-brand-accent">pass</span></span>
        </span>
        <div className="lp-nav-right">
          <nav className="lp-nav-links">
            <button 
              type="button"
              className="lp-nav-btn" 
              onClick={() => onGoToExplore ? onGoToExplore() : router.push('/explore')}
            >
              Explorar
            </button>
            {isConnected && (
              <button type="button" className="lp-nav-btn" onClick={() => onGoToMyTickets ? onGoToMyTickets() : router.push('/tickets')}>
                Mis tickets
              </button>
            )}
            
            {isConnected ? (
              <button type="button" className="lp-nav-btn" onClick={() => router.push('/dashboard')}>
                {organizerProfile ? 'Dashboard' : 'Quieres ser organizador'}
              </button>
            ) : (
              <button type="button" className="lp-nav-btn" onClick={() => onGoToOrganizer ? onGoToOrganizer() : router.push('/organizers')}>
                Organizadores
              </button>
            )}
            
          </nav>
          <WalletMultiButton className="lp-wallet-btn" />
        </div>
      </div>
    </header>
  );
}
