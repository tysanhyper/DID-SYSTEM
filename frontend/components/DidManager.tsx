'use client';

import { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Program, AnchorProvider, web3, Idl, BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import IpfsUploader from './IpfsUploader';

// Import IDL with type assertion
import idlData from '@/lib/did_system.json';
const idl = idlData as Idl;

const PROGRAM_ID = new PublicKey('26aJf2GBAnjLidUCzPa9W8tuhZRj37J6VeW3fFQrJeqw');

interface DidAccount {
  owner: PublicKey;
  username: string;
  github: string;
  twitter: string;
  ipfsHash: string;
  createdAt: number;
  updatedAt: number;
}

export default function DidManager() {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [didAccount, setDidAccount] = useState<DidAccount | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    github: '',
    twitter: '',
    ipfsHash: ''
  });
  const [searchAddress, setSearchAddress] = useState('');
  const [searchedDid, setSearchedDid] = useState<DidAccount | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Fix hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get Anchor provider
  const getProvider = () => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
      return null;
    }
    
    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );
    return provider;
  };

  // Get program
  // Get program
const getProgram = () => {
  const provider = getProvider();
  if (!provider) return null;
  
  return new Program(idl, provider);
};

  // Derive PDA for a given public key
  const getDidPda = (publicKey: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('did'), publicKey.toBuffer()],
      PROGRAM_ID
    )[0];
  };

  // Fetch user's DID
  const fetchDid = async () => {
    if (!wallet.publicKey) return;
    
    try {
      const program = getProgram();
      if (!program) return;

      const didPda = getDidPda(wallet.publicKey);
          // @ts-ignore - TypeScript doesn't know about our account structure
      const account = await program.account.didAccount.fetch(didPda);
      
      setDidAccount({
        owner: account.owner,
        username: account.username,
        github: account.github,
        twitter: account.twitter,
        ipfsHash: account.ipfsHash,
        createdAt: account.createdAt.toNumber(),
        updatedAt: account.updatedAt.toNumber(),
      });
    } catch (error) {
      console.log('No DID found for this wallet');
      setDidAccount(null);
    }
  };

  // Create DID
  const createDid = async () => {
    if (!wallet.publicKey) {
      alert('Please connect your wallet first!');
      return;
    }
    
    setLoading(true);
    try {
      const program = getProgram();
      if (!program) {
        alert('Wallet not ready. Please try again.');
        return;
      }

      const didPda = getDidPda(wallet.publicKey);

      const tx = await program.methods
        .createDid(
          formData.username,
          formData.github,
          formData.twitter,
          formData.ipfsHash
        )
        .accounts({
          didAccount: didPda,
          user: wallet.publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Transaction:', tx);
      alert('✅ DID created successfully!');
      await fetchDid();
      
      // Clear form
      setFormData({ username: '', github: '', twitter: '', ipfsHash: '' });
    } catch (error: any) {
      console.error('Error creating DID:', error);
      alert('Error: ' + (error.message || 'Failed to create DID'));
    } finally {
      setLoading(false);
    }
  };

  // Update DID
  const updateDid = async () => {
    if (!wallet.publicKey) return;
    
    setLoading(true);
    try {
      const program = getProgram();
      if (!program) {
        alert('Wallet not ready. Please try again.');
        return;
      }

      const didPda = getDidPda(wallet.publicKey);

      const tx = await program.methods
        .updateDid(
          formData.github || null,
          formData.twitter || null,
          formData.ipfsHash || null
        )
        .accounts({
          didAccount: didPda,
          user: wallet.publicKey,
          owner: wallet.publicKey,
        })
        .rpc();

      console.log('Transaction:', tx);
      alert('✅ DID updated successfully!');
      await fetchDid();
    } catch (error: any) {
      console.error('Error updating DID:', error);
      alert('Error: ' + (error.message || 'Failed to update DID'));
    } finally {
      setLoading(false);
    }
  };

  // Delete DID
  const deleteDid = async () => {
    if (!wallet.publicKey || !confirm('Are you sure? This will delete your DID and refund the rent.')) return;
    
    setLoading(true);
    try {
      const program = getProgram();
      if (!program) {
        alert('Wallet not ready. Please try again.');
        return;
      }

      const didPda = getDidPda(wallet.publicKey);

      const tx = await program.methods
        .deleteDid()
        .accounts({
          didAccount: didPda,
          user: wallet.publicKey,
          owner: wallet.publicKey,
        })
        .rpc();

      console.log('Transaction:', tx);
      alert('✅ DID deleted successfully! Rent refunded.');
      setDidAccount(null);
    } catch (error: any) {
      console.error('Error deleting DID:', error);
      alert('Error: ' + (error.message || 'Failed to delete DID'));
    } finally {
      setLoading(false);
    }
  };

  // Search for any DID
  const searchDid = async () => {
    if (!searchAddress) {
      alert('Please enter a wallet address');
      return;
    }
    
    try {
      const program = getProgram();
      if (!program) {
        alert('Please connect your wallet first');
        return;
      }

      const publicKey = new PublicKey(searchAddress);
      const didPda = getDidPda(publicKey);
          // @ts-ignore - TypeScript doesn't know about our account structure
      const account = await program.account.didAccount.fetch(didPda);
      
      setSearchedDid({
        owner: account.owner,
        username: account.username,
        github: account.github,
        twitter: account.twitter,
        ipfsHash: account.ipfsHash,
        createdAt: account.createdAt.toNumber(),
        updatedAt: account.updatedAt.toNumber(),
      });
    } catch (error) {
      alert('No DID found for this address');
      setSearchedDid(null);
      console.error('Search error:', error);
    }
  };

  // Fetch DID when wallet connects
  useEffect(() => {
    if (wallet.publicKey && mounted) {
      fetchDid();
    }
  }, [wallet.publicKey, mounted]);

  // Don't render until mounted (prevents hydration errors)
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white p-8 relative overflow-hidden">
      {/* Professional Dynamic Background */}
      <div className="absolute inset-0 opacity-30">
        {/* Primary gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20"></div>

        {/* Floating geometric shapes */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute top-40 right-10 w-80 h-80 bg-gradient-to-r from-purple-500/25 to-pink-500/25 rounded-full blur-3xl animate-float-medium"></div>
        <div className="absolute bottom-20 left-1/4 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-float-fast"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-r from-indigo-500/25 to-purple-500/25 rounded-full blur-3xl animate-float-reverse"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:50px_50px]"></div>
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/5 w-2 h-2 bg-white/40 rounded-full animate-particle-1"></div>
          <div className="absolute top-3/4 right-1/5 w-1 h-1 bg-cyan-400/60 rounded-full animate-particle-2"></div>
          <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-purple-400/50 rounded-full animate-particle-3"></div>
          <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-blue-400/70 rounded-full animate-particle-4"></div>
        </div>
      </div>

      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(-3deg); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(7deg); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(15px) rotate(-5deg); }
        }
        @keyframes particle-1 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.4; }
          25% { transform: translateY(-10px) translateX(5px); opacity: 0.8; }
          50% { transform: translateY(-20px) translateX(-5px); opacity: 0.6; }
          75% { transform: translateY(-10px) translateX(10px); opacity: 0.9; }
        }
        @keyframes particle-2 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.6; }
          33% { transform: translateY(15px) translateX(-8px); opacity: 0.9; }
          66% { transform: translateY(-10px) translateX(12px); opacity: 0.5; }
        }
        @keyframes particle-3 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.5; }
          50% { transform: translateY(-18px) translateX(-12px); opacity: 0.8; }
        }
        @keyframes particle-4 {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.7; }
          40% { transform: translateY(12px) translateX(8px); opacity: 0.4; }
          80% { transform: translateY(-8px) translateX(-6px); opacity: 0.9; }
        }
        .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 6s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 4s ease-in-out infinite; }
        .animate-float-reverse { animation: float-reverse 7s ease-in-out infinite; }
        .animate-particle-1 { animation: particle-1 12s ease-in-out infinite; }
        .animate-particle-2 { animation: particle-2 10s ease-in-out infinite; }
        .animate-particle-3 { animation: particle-3 8s ease-in-out infinite; }
        .animate-particle-4 { animation: particle-4 14s ease-in-out infinite; }
      `}</style>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Navigation Bar */}
        <nav className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-8 border border-white/20 shadow-2xl animate-slideDown">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
                <img
                  src="https://raw.githubusercontent.com/tysanhyper/wedding-invitation/refs/heads/main/identity%20logo(1).jpg"
                  alt="Logo"
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = document.createElement('span');
                    fallback.className = 'text-2xl';
                    fallback.textContent = '🚀';
                    e.currentTarget.parentNode?.appendChild(fallback);
                  }}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400">
                  DID System
                </h1>
                <p className="text-xs text-gray-400">Solana • Anchor</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search Icon */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center hover:scale-110 transition-all duration-300 shadow-lg"
                title="Search DID"
              >
                <span className="text-lg">🔍</span>
              </button>

              {/* Profile Picture / Avatar */}
              {wallet.connected && didAccount?.ipfsHash && (
                <button
                  onClick={() => setShowProfile(!showProfile)}
                  className="w-10 h-10 rounded-full border-2 border-purple-500 overflow-hidden hover:scale-110 transition-all duration-300 shadow-lg"
                  title="Your Profile"
                >
                  <img
                    src={`https://ipfs.io/ipfs/${didAccount.ipfsHash}`}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>';
                      e.currentTarget.className = 'w-full h-full bg-gray-700 flex items-center justify-center';
                    }}
                  />
                </button>
              )}

              {/* Wallet Button */}
              <WalletMultiButton className="transform hover:scale-105 transition-transform duration-300" />
            </div>
          </div>
        </nav>

        {/* Devnet Warning */}
        <div className="text-center mb-8">
          <p className="text-yellow-400 text-sm bg-yellow-400/10 border border-yellow-400/20 rounded-lg px-4 py-2 inline-block animate-bounce">
            ⚠️ Make sure you're on Devnet in your wallet!
          </p>
        </div>

        {!wallet.connected && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20 animate-fadeIn animation-delay-500 shadow-2xl">
            <div className="mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-bounce">
                <span className="text-3xl">🔗</span>
              </div>
              <h2 className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Welcome! 👋</h2>
            </div>
            <p className="text-gray-300 mb-8 text-lg">Connect your Solana wallet to get started</p>
            <div className="text-left space-y-3 text-sm text-gray-400 bg-black/20 rounded-lg p-4 mb-6">
              <p className="flex items-center"><span className="mr-2">📌</span> Don't have a wallet? Install <a href="https://phantom.app" target="_blank" className="text-blue-400 hover:underline font-semibold">Phantom Wallet</a></p>
              <p className="flex items-center"><span className="mr-2">📌</span> Switch to <strong className="text-yellow-400">Devnet</strong> in wallet settings</p>
              <p className="flex items-center"><span className="mr-2">📌</span> Get free devnet SOL from <a href="https://faucet.solana.com" target="_blank" className="text-blue-400 hover:underline font-semibold">faucet</a></p>
            </div>
            <div className="animate-pulse">
              <WalletMultiButton />
            </div>
          </div>
        )}

        {wallet.connected && wallet.publicKey && (
          <>
            {/* Search Modal */}
            {showSearch && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                        <span className="text-xl">🔍</span>
                      </div>
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-red-400">Search Any DID</h2>
                    </div>
                    <button
                      onClick={() => setShowSearch(false)}
                      className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center transition-colors duration-300"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>

                  <div className="flex gap-4 mb-6">
                    <input
                      type="text"
                      placeholder="Enter wallet address..."
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      className="flex-1 p-3 rounded-lg bg-black/30 border border-white/20 focus:border-orange-500 outline-none text-white transition-all duration-300 focus:ring-2 focus:ring-orange-500/50"
                    />
                    <button
                      onClick={searchDid}
                      className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-8 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      🔍 Search
                    </button>
                  </div>

                  {searchedDid && (
                    <div className="space-y-4 animate-fadeIn">
                      {/* Profile Picture in Search Results */}
                      {searchedDid.ipfsHash && (
                        <div className="flex justify-center mb-6">
                          <img
                            src={`https://gateway.pinata.cloud/ipfs/${searchedDid.ipfsHash}`}
                            alt="Profile Picture"
                            className="w-32 h-32 rounded-full object-cover border-4 border-green-500 shadow-lg"
                            onError={(e) => {
                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>';
                              e.currentTarget.className = 'w-32 h-32 rounded-full object-cover border-4 border-gray-500 bg-gray-700 p-6';
                            }}
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">👤</span>
                            <p className="text-gray-400 text-sm">Username</p>
                          </div>
                          <p className="text-xl font-semibold text-white">{searchedDid.username}</p>
                        </div>

                        <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center mb-2">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                            <p className="text-gray-400 text-sm">GitHub</p>
                          </div>
                          {searchedDid.github ? (
                            <a
                              href={searchedDid.github.startsWith('http') ? searchedDid.github : `https://${searchedDid.github}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xl text-blue-400 hover:underline transition-colors duration-300"
                            >
                              {searchedDid.github}
                            </a>
                          ) : (
                            <p className="text-xl text-gray-500">Not set</p>
                          )}
                        </div>

                        <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center mb-2">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                            </svg>
                            <p className="text-gray-400 text-sm">X (Twitter)</p>
                          </div>
                          {searchedDid.twitter ? (
                            <a
                              href={`https://x.com/${searchedDid.twitter.replace('@', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xl text-blue-400 hover:underline transition-colors duration-300"
                            >
                              @{searchedDid.twitter}
                            </a>
                          ) : (
                            <p className="text-xl text-gray-500">Not set</p>
                          )}
                        </div>

                        <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                          <div className="flex items-center mb-2">
                            <span className="text-lg mr-2">📄</span>
                            <p className="text-gray-400 text-sm">IPFS Hash</p>
                          </div>
                          {searchedDid.ipfsHash ? (
                            <p className="text-sm break-all font-mono text-gray-300">{searchedDid.ipfsHash}</p>
                          ) : (
                            <p className="text-xl text-gray-500">Not set</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Update DID Modal */}
            {showUpdateModal && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <span className="text-xl">🚀</span>
                      </div>
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">Update Your DID</h2>
                    </div>
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center transition-colors duration-300"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>

                  {/* Add IPFS Uploader for updates */}
                  <IpfsUploader
                    onUploadSuccess={(hash) => setFormData({...formData, ipfsHash: hash})}
                  />

                  {/* Show preview if new hash is entered */}
                  {formData.ipfsHash && formData.ipfsHash !== didAccount?.ipfsHash && (
                    <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
                      <p className="text-green-400 font-semibold mb-3">🎨 New Profile Picture Preview:</p>
                      <div className="flex justify-center">
                        <img
                          src={`https://gateway.pinata.cloud/ipfs/${formData.ipfsHash}`}
                          alt="New Profile Picture"
                          className="w-32 h-32 rounded-full object-cover border-4 border-green-500"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>';
                            e.currentTarget.className = 'w-32 h-32 rounded-full object-cover border-4 border-green-500 bg-gray-700 p-4';
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <input
                      type="text"
                      placeholder="GitHub URL"
                      value={formData.github}
                      onChange={(e) => setFormData({...formData, github: e.target.value})}
                      className="w-full p-3 rounded-lg bg-black/30 border border-white/20 focus:border-purple-500 outline-none text-white transition-all duration-300 focus:ring-2 focus:ring-purple-500/50"
                    />
                    <input
                      type="text"
                      placeholder="Twitter Handle"
                      value={formData.twitter}
                      onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                      className="w-full p-3 rounded-lg bg-black/30 border border-white/20 focus:border-purple-500 outline-none text-white transition-all duration-300 focus:ring-2 focus:ring-purple-500/50"
                    />
                    <input
                      type="text"
                      placeholder="IPFS Hash (or upload above)"
                      value={formData.ipfsHash}
                      onChange={(e) => setFormData({...formData, ipfsHash: e.target.value})}
                      className="w-full p-3 rounded-lg bg-black/30 border border-white/20 focus:border-purple-500 outline-none text-white transition-all duration-300 focus:ring-2 focus:ring-purple-500/50"
                    />

                    <div className="flex gap-4">
                      <button
                        onClick={updateDid}
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-600 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        {loading ? 'Updating...' : '🚀 Update DID'}
                      </button>
                      <button
                        onClick={deleteDid}
                        disabled={loading}
                        className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Profile Modal */}
            {showProfile && didAccount && (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xl">👤</span>
                      </div>
                      <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">Your DID</h2>
                    </div>
                    <button
                      onClick={() => setShowProfile(false)}
                      className="w-8 h-8 bg-red-500/20 hover:bg-red-500/30 rounded-full flex items-center justify-center transition-colors duration-300"
                    >
                      <span className="text-lg">×</span>
                    </button>
                  </div>

                  {/* Profile Picture Section - Make it prominent */}
                  {didAccount.ipfsHash && (
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <img
                          src={`https://ipfs.io/ipfs/${didAccount.ipfsHash}`}
                          alt="Profile Picture"
                          className="w-48 h-48 rounded-full object-cover border-4 border-purple-500 shadow-xl"
                          style={{ objectFit: 'cover', width: '192px', height: '192px' }}
                          onError={(e) => {
                            // If image fails to load, try Pinata gateway
                            const target = e.currentTarget;
                            if (target.src.includes('ipfs.io')) {
                              target.src = `https://gateway.pinata.cloud/ipfs/${didAccount.ipfsHash}`;
                            } else if (target.src.includes('gateway.pinata.cloud')) {
                              target.src = `https://cloudflare-ipfs.com/ipfs/${didAccount.ipfsHash}`;
                            } else {
                              // Final fallback: show document icon
                              target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>';
                              target.className = 'w-48 h-48 rounded-full border-4 border-gray-500 bg-gray-700 flex items-center justify-center';
                            }
                          }}
                        />
                        <div className="absolute bottom-0 right-0 bg-green-500 w-8 h-8 rounded-full border-4 border-white"></div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">👤</span>
                        <p className="text-gray-400 text-sm">Username</p>
                      </div>
                      <p className="text-xl font-semibold text-white">{didAccount.username}</p>
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">🐙</span>
                        <p className="text-gray-400 text-sm">GitHub</p>
                      </div>
                      {didAccount.github ? (
                        <a
                          href={didAccount.github.startsWith('http') ? didAccount.github : `https://${didAccount.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl text-blue-400 hover:underline transition-colors duration-300"
                        >
                          {didAccount.github}
                        </a>
                      ) : (
                        <p className="text-xl text-gray-500">Not set</p>
                      )}
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">🐦</span>
                        <p className="text-gray-400 text-sm">Twitter</p>
                      </div>
                      {didAccount.twitter ? (
                        <a
                          href={`https://twitter.com/${didAccount.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl text-blue-400 hover:underline transition-colors duration-300"
                        >
                          {didAccount.twitter}
                        </a>
                      ) : (
                        <p className="text-xl text-gray-500">Not set</p>
                      )}
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">📅</span>
                        <p className="text-gray-400 text-sm">Created</p>
                      </div>
                      <p className="text-xl text-white">{new Date(didAccount.createdAt * 1000).toLocaleDateString()}</p>
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105 md:col-span-2">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">🔄</span>
                        <p className="text-gray-400 text-sm">Last Updated</p>
                      </div>
                      <p className="text-xl text-white">{new Date(didAccount.updatedAt * 1000).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Update Option Button */}
                  <div className="mt-8 pt-8 border-t border-white/20">
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        setShowUpdateModal(true);
                      }}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                    >
                      ✏️ Update Your DID
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Your DID Section */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20 animate-slideUp shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-400">Your DID</h2>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-400">Connected</span>
                </div>
              </div>
              <div className="bg-black/20 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Wallet Address</span>
                  <span className="text-xs font-mono text-gray-300 bg-black/30 px-2 py-1 rounded">
                    {wallet.publicKey.toString().slice(0, 8)}...{wallet.publicKey.toString().slice(-8)}
                  </span>
                </div>
              </div>
              
              {didAccount ? (
                <div className="space-y-4">
                  {/* Profile Picture Section - Make it prominent */}
                  {didAccount.ipfsHash && (
                    <div className="flex justify-center mb-6">
                      <div className="relative">
                        <img
                          src={`https://ipfs.io/ipfs/${didAccount.ipfsHash}`}
                          alt="Profile Picture"
                          className="w-48 h-48 rounded-full object-cover border-4 border-purple-500 shadow-xl"
                          style={{ objectFit: 'cover', width: '192px', height: '192px' }}
                          onError={(e) => {
                            // If image fails to load, try Pinata gateway
                            const target = e.currentTarget;
                            if (target.src.includes('ipfs.io')) {
                              target.src = `https://gateway.pinata.cloud/ipfs/${didAccount.ipfsHash}`;
                            } else if (target.src.includes('gateway.pinata.cloud')) {
                              target.src = `https://cloudflare-ipfs.com/ipfs/${didAccount.ipfsHash}`;
                            } else {
                              // Final fallback: show document icon
                              target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h3"/></svg>';
                              target.className = 'w-48 h-48 rounded-full border-4 border-gray-500 bg-gray-700 flex items-center justify-center';
                            }
                          }}
                        />
                        <div className="absolute bottom-0 right-0 bg-green-500 w-8 h-8 rounded-full border-4 border-white"></div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">👤</span>
                        <p className="text-gray-400 text-sm">Username</p>
                      </div>
                      <p className="text-xl font-semibold text-white">{didAccount.username}</p>
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        <p className="text-gray-400 text-sm">GitHub</p>
                      </div>
                      {didAccount.github ? (
                        <a
                          href={didAccount.github.startsWith('http') ? didAccount.github : `https://${didAccount.github}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl text-blue-400 hover:underline transition-colors duration-300"
                        >
                          {didAccount.github}
                        </a>
                      ) : (
                        <p className="text-xl text-gray-500">Not set</p>
                      )}
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        <p className="text-gray-400 text-sm">X (Twitter)</p>
                      </div>
                      {didAccount.twitter ? (
                        <a
                          href={`https://x.com/${didAccount.twitter.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xl text-blue-400 hover:underline transition-colors duration-300"
                        >
                          @{didAccount.twitter}
                        </a>
                      ) : (
                        <p className="text-xl text-gray-500">Not set</p>
                      )}
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">📅</span>
                        <p className="text-gray-400 text-sm">Created</p>
                      </div>
                      <p className="text-xl text-white">{new Date(didAccount.createdAt * 1000).toLocaleDateString()}</p>
                    </div>

                    <div className="bg-black/30 p-4 rounded-lg hover:bg-black/40 transition-all duration-300 transform hover:scale-105 md:col-span-2">
                      <div className="flex items-center mb-2">
                        <span className="text-lg mr-2">🔄</span>
                        <p className="text-gray-400 text-sm">Last Updated</p>
                      </div>
                      <p className="text-xl text-white">{new Date(didAccount.updatedAt * 1000).toLocaleDateString()}</p>
                    </div>
                  </div>


                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-300 mb-4">You don't have a DID yet. Create one below:</p>

                  <IpfsUploader
                    onUploadSuccess={(hash) => setFormData({...formData, ipfsHash: hash})}
                  />

                  <input
                    type="text"
                    placeholder="Username (required, max 32 chars)"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    maxLength={32}
                    className="w-full p-3 rounded-lg bg-black/30 border border-white/20 focus:border-blue-500 outline-none text-white"
                  />
                  <input
                    type="text"
                    placeholder="GitHub URL"
                    value={formData.github}
                    onChange={(e) => setFormData({...formData, github: e.target.value})}
                    className="w-full p-3 rounded-lg bg-black/30 border border-white/20 focus:border-blue-500 outline-none text-white"
                  />
                  <input
                    type="text"
                    placeholder="Twitter Handle"
                    value={formData.twitter}
                    onChange={(e) => setFormData({...formData, twitter: e.target.value})}
                    className="w-full p-3 rounded-lg bg-black/30 border border-white/20 focus:border-blue-500 outline-none text-white"
                  />
                  <input
                    type="text"
                    placeholder="IPFS Hash (optional)"
                    value={formData.ipfsHash}
                    onChange={(e) => setFormData({...formData, ipfsHash: e.target.value})}
                    className="w-full p-3 rounded-lg bg-black/30 border border-white/20 focus:border-blue-500 outline-none text-white"
                  />
                  
                  <button
                    onClick={createDid}
                    disabled={loading || !formData.username}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 py-3 rounded-lg font-semibold transition"
                  >
                    {loading ? 'Creating...' : 'Create DID'}
                  </button>
                </div>
              )}
            </div>


          </>
        )}
      </div>
    </div>
  );
}