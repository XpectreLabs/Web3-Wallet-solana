import { FC } from 'react';
import WalletButton from './ui/WalletButton';

const ConnectWallet: FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-screen w-full relative z-10">
      {/* Logo */}
      <div className="mb-6 flex items-center justify-center">
        <img
          src="/Xpectre-logo.svg"
          alt="Xpectre Logo"
          className="h-20 w-auto object-contain select-none"
        />
      </div>

      {/* Title */}
      <h1 className="text-white text-3xl font-extrabold text-center mb-10 tracking-tight">
        Access your Crypto
      </h1>

      <div className="flex flex-col gap-4 w-full max-w-[360px]">
        {/* Connect Button — opens wallet adapter modal */}
        <WalletButton
          className="!w-full !bg-[#dea001] !text-[#10131c] !border-none !rounded-2xl !py-4 !text-lg !font-extrabold !cursor-pointer hover:!brightness-110 !transition-all !shadow-none !h-auto !justify-center"
        >
          Connect Wallet
        </WalletButton>
      </div>
    </div>
  );
};

export default ConnectWallet;