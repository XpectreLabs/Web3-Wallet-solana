import { FC, useState, useEffect, useRef } from 'react';
import {
  Search,
  ChevronDown,
  Copy,
  RefreshCcw,
  LogOut,
  Settings,
} from 'lucide-react';
import HexLogo from '../ui/HexLogo';
import Toggle from '../ui/Toggle';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import WalletButton from '../ui/WalletButton';

import { C } from '../../utils/theme';

type NetworkUI = 'Mainnet' | 'Devnet' | 'Testnet';

interface TopHeaderProps {
  publicKeyStr: string;
  networkUI: NetworkUI;
  setNetworkUI: (n: NetworkUI) => void;
  autoConnect: boolean;
  setAutoConnect: (v: boolean) => void;
  onDisconnect: () => void;
}

function truncate(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

const TopHeader: FC<TopHeaderProps> = ({
  publicKeyStr,
  networkUI,
  setNetworkUI,
  autoConnect,
  setAutoConnect,
  onDisconnect,
}) => {
  const [walletOpen, setWalletOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { copy } = useCopyToClipboard();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setWalletOpen(false);
        setSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = () => {
    copy(publicKeyStr, 'Address copied!');
    setWalletOpen(false);
  };

  return (
    <header
      className="w-full border-b sticky top-0 z-40 px-4 md:px-8 py-4 flex items-center justify-between gap-4 shrink-0"
      style={{
        borderColor: C.border,
        backgroundColor: 'rgba(16, 19, 28, 0.7)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {/* Mobile Logo — hidden on desktop (sidebar has it) */}
      <div className="md:hidden flex items-center">
        <HexLogo size={24} />
      </div>

      {/* Fluid Search Bar */}
      <div className="flex-1 max-w-2xl bg-white/[0.03] rounded-2xl px-4 py-2.5 flex items-center gap-2.5 border border-[#dea001]/10 transition-colors focus-within:border-[#dea001]/30">
        <Search size={16} className="text-[#7a8fa6]" />
        {/* sr-only label: visually hidden but announced by screen readers */}
        <label htmlFor="global-search" className="sr-only">Search assets and history</label>
        <input
          id="global-search"
          placeholder="Search assets, history..."
          className="bg-transparent border-none outline-none text-white w-full text-[14px] placeholder:text-[#7a8fa6]"
        />
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3" ref={ref}>
        {/* Wallet Pill Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setWalletOpen(!walletOpen);
              setSettingsOpen(false);
            }}
            className="flex items-center gap-2 rounded-full px-3.5 py-2 border transition-all cursor-pointer"
            style={{
              backgroundColor: walletOpen ? 'rgba(222, 160, 1, 0.1)' : C.surface,
              borderColor: walletOpen ? C.gold : C.border,
            }}
          >
            <span className="text-white text-[13px] font-mono font-semibold tracking-wide">
              {truncate(publicKeyStr)}
            </span>
            <ChevronDown
              size={14}
              className="text-[#7a8fa6] transition-transform duration-200"
              style={{ transform: walletOpen ? 'rotate(180deg)' : 'none' }}
            />
          </button>

          {walletOpen && (
            <div
              className="absolute top-[calc(100%+12px)] right-0 w-48 rounded-xl p-2 flex flex-col gap-1 border shadow-xl z-50"
              style={{ backgroundColor: C.surfaceSolid, borderColor: C.border }}
            >
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-transparent border-none text-white cursor-pointer hover:bg-white/5 text-[13px] font-medium text-left"
              >
                <Copy size={16} className="text-[#7a8fa6]" /> Copy address
              </button>

              {/* Change wallet — opens the wallet adapter modal */}
              <WalletButton
                className="!flex !items-center !gap-2.5 !px-3 !py-2.5 !rounded-lg !bg-transparent !border-none !text-white !cursor-pointer hover:!bg-white/5 !text-[13px] !font-medium !text-left !shadow-none !h-auto !justify-start"
              >
                <RefreshCcw size={16} className="text-[#7a8fa6]" />
                <span>Change wallet</span>
              </WalletButton>

              <div className="h-[1px] my-1" style={{ backgroundColor: C.border }} />

              <button
                onClick={() => {
                  onDisconnect();
                  setWalletOpen(false);
                }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-transparent border-none text-[#ff4a4a] cursor-pointer hover:bg-[#ff4a4a]/10 text-[13px] font-medium text-left"
              >
                <LogOut size={16} /> Disconnect
              </button>
            </div>
          )}
        </div>

        {/* Settings Gear Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setWalletOpen(false);
            }}
            aria-label={settingsOpen ? 'Close settings menu' : 'Open settings menu'}
            aria-expanded={settingsOpen}
            className="w-10 h-10 rounded-full flex items-center justify-center border transition-all cursor-pointer"
            style={{
              backgroundColor: settingsOpen ? 'rgba(222, 160, 1, 0.1)' : C.surface,
              borderColor: settingsOpen ? C.gold : C.border,
            }}
          >
            <Settings
              size={18}
              className={settingsOpen ? 'text-[#dea001]' : 'text-[#7a8fa6]'}
            />
          </button>

          {settingsOpen && (
            <div
              className="absolute top-[calc(100%+12px)] right-0 w-60 rounded-xl p-4 flex flex-col gap-4 border shadow-xl z-50"
              style={{ backgroundColor: C.surfaceSolid, borderColor: C.border }}
            >
              {/* Autoconnect Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-white text-[13px] font-semibold">Autoconnect</span>
                <Toggle
                  checked={autoConnect}
                  onChange={() => setAutoConnect(!autoConnect)}
                />
              </div>

              <div className="h-[1px]" style={{ backgroundColor: C.border }} />

              {/* Network Selector */}
              <div>
                <span className="text-[#7a8fa6] text-[12px] font-semibold block mb-2">
                  Network
                </span>
                <div className="flex flex-col gap-1.5">
                  {(['Mainnet', 'Devnet', 'Testnet'] as NetworkUI[]).map((net) => (
                    <button
                      key={net}
                      onClick={() => setNetworkUI(net)}
                      className="px-3 py-2 rounded-lg font-medium text-[13px] cursor-pointer border text-left transition-colors"
                      style={{
                        backgroundColor:
                          networkUI === net ? 'rgba(222, 160, 1, 0.1)' : 'transparent',
                        color: networkUI === net ? C.gold : C.text,
                        borderColor: networkUI === net ? C.gold : 'transparent',
                      }}
                    >
                      {net}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
