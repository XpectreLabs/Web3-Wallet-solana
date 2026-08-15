import { FC, useState, useEffect } from 'react';
import { Copy, RefreshCcw, LogOut, Shield, Trash2, CheckCircle, Settings, AlertTriangle } from 'lucide-react';
import Toggle from '../../components/ui/Toggle';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

import { C, NetworkUI } from '../../utils/theme';
import { getAuditEvents, clearAuditEvents, logAuditEvent, AuditEvent } from '../../utils/security/auditLogger';

interface SettingsViewProps {
  publicKeyStr: string;
  networkUI: NetworkUI;
  setNetworkUI: (n: NetworkUI) => void;
  autoConnect: boolean;
  setAutoConnect: (v: boolean) => void;
  onDisconnect: () => void;
}

export const SettingsView: FC<SettingsViewProps> = ({
  publicKeyStr,
  networkUI,
  setNetworkUI,
  autoConnect,
  setAutoConnect,
  onDisconnect,
}) => {
  const { copy } = useCopyToClipboard();
  const { setVisible } = useWalletModal();
  const { wallet } = useWallet();
  const isLocalWallet = wallet?.adapter.name === 'XpectreWallet';
  const [logs, setLogs] = useState<AuditEvent[]>([]);

  useEffect(() => {
    setLogs(getAuditEvents());
    const refresh = () => setLogs(getAuditEvents());
    window.addEventListener('xpectre_audit_log_added', refresh);
    return () => window.removeEventListener('xpectre_audit_log_added', refresh);
  }, []);

  const handleCopy = () => {
    copy(publicKeyStr, 'Address copied!');
    logAuditEvent('security', 'address_copied', 'Wallet address copied to clipboard');
  };

  const handleNetworkChange = (net: NetworkUI) => {
    if (net !== networkUI) {
      logAuditEvent('settings', 'network_changed', `Changed network from ${networkUI} to ${net}`);
      setNetworkUI(net);
    }
  };

  const handleAutoConnectChange = () => {
    const nextVal = !autoConnect;
    logAuditEvent('settings', 'autoconnect_toggled', `Toggled Auto-connect to ${nextVal ? 'ON' : 'OFF'}`);
    setAutoConnect(nextVal);
  };

  const handleDisconnect = () => {
    logAuditEvent('security', 'wallet_disconnected', 'Wallet disconnected by user');
    onDisconnect();
  };

  const handleClearLogs = () => {
    clearAuditEvents();
    logAuditEvent('security', 'audit_logs_cleared', 'Security audit logs cleared by user');
  };

  const handleGoToFaucet = () => {
    copy(publicKeyStr, 'Address copied! Paste it in the Faucet.');
    logAuditEvent('settings', 'faucet_redirect', 'Copied address and redirected to official Solana Faucet');
    window.open('https://faucet.solana.com/', '_blank');
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto animate-in fade-in duration-300">
      {/* Wallet Management */}
      <div>
        <h2 className="text-white text-lg font-bold mb-4 px-1 tracking-wide">Wallet Management</h2>
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: C.surface, borderColor: C.border }}
        >
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-between p-4 bg-transparent border-none border-b border-[#dea001]/10 text-white cursor-pointer hover:bg-white/[0.02] transition-colors"
          >
            <span className="flex items-center gap-3 text-[15px] font-semibold">
              <Copy size={18} className="text-[#7a8fa6]" /> Copy address
            </span>
          </button>

          <div className="border-b border-[#dea001]/10">
            <button
              onClick={() => setVisible(true)}
              className="w-full flex items-center justify-start gap-3 p-4 bg-transparent border-none text-white cursor-pointer hover:bg-white/[0.02] transition-colors rounded-none h-auto text-[15px] font-semibold shadow-none"
            >
              <RefreshCcw size={18} className="text-[#7a8fa6]" />
              <span>Change wallet</span>
            </button>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-between p-4 bg-transparent border-none text-[#ff4a4a] cursor-pointer hover:bg-[#ff4a4a]/5 transition-colors"
          >
            <span className="flex items-center gap-3 text-[15px] font-semibold">
              <LogOut size={18} /> Disconnect
            </span>
          </button>
        </div>
      </div>

      {/* Networks & Nodes */}
      <div>
        <h2 className="text-white text-lg font-bold mb-4 px-1 tracking-wide">Networks & Nodes</h2>
        <div
          className="rounded-2xl border p-4"
          style={{ backgroundColor: C.surface, borderColor: C.border }}
        >
          <div className="flex gap-2">
            {(['Mainnet', 'Devnet', 'Testnet'] as NetworkUI[]).map((net) => (
              <button
                key={net}
                onClick={() => handleNetworkChange(net)}
                className="flex-1 py-3 rounded-xl font-bold text-[14px] cursor-pointer border transition-colors"
                style={{
                  backgroundColor: networkUI === net ? C.gold : 'transparent',
                  color: networkUI === net ? '#10131c' : C.text,
                  borderColor: networkUI === net ? C.gold : C.border,
                }}
              >
                {net}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Developer Tools (Faucet) - Solo visible en Devnet */}
      {networkUI === 'Devnet' && (
        <div>
          <h2 className="text-[#dea001] text-lg font-bold mb-4 px-1 tracking-wide">Developer Tools</h2>
          <div
            className="rounded-2xl border p-5 bg-[#dea001]/5"
            style={{ borderColor: 'rgba(222, 160, 1, 0.2)' }}
          >
            <p className="text-[#7a8fa6] text-[14px] mb-5 leading-relaxed">
              Actualmente estás conectado a la red de pruebas (Devnet). Ve al Faucet oficial para solicitar fondos y realizar transacciones sin usar SOL real. Se copiará tu dirección automáticamente.
            </p>
            <button
              onClick={handleGoToFaucet}
              className="w-full py-3 rounded-xl font-bold border-none cursor-pointer bg-[#dea001] text-black hover:bg-[#dea001]/90 shadow-[0_0_15px_rgba(222,160,1,0.2)] transition-all flex items-center justify-center gap-2"
            >
              Ir al Faucet de Solana
            </button>
          </div>
        </div>
      )}

      {/* Preferences */}
      {!isLocalWallet && (
        <div>
          <h2 className="text-white text-lg font-bold mb-4 px-1 tracking-wide">Preferences</h2>
          <div
            className="rounded-2xl border p-5 flex items-center justify-between"
            style={{ backgroundColor: C.surface, borderColor: C.border }}
          >
            <div>
              <span className="text-white text-[15px] font-semibold">Autoconnect</span>
              <p className="text-[#7a8fa6] text-[12px] mt-1">
                Automatically reconnect wallet on page reload
              </p>
            </div>
            <Toggle checked={autoConnect} onChange={handleAutoConnectChange} />
          </div>
        </div>
      )}

      {/* Security Audit Logs */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-white text-lg font-bold tracking-wide flex items-center gap-2">
            <Shield size={20} className="text-[#dea001]" /> Security Audit Logs
          </h2>
          {logs.length > 0 && (
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 text-xs font-bold text-[#ff4a4a] bg-transparent border-none cursor-pointer hover:underline"
            >
              <Trash2 size={14} /> Clear logs
            </button>
          )}
        </div>
        <div
          className="rounded-2xl border overflow-hidden p-4 flex flex-col gap-3"
          style={{
            backgroundColor: C.surface,
            borderColor: C.border,
            maxHeight: '260px',
            overflowY: 'auto'
          }}
        >
          {logs.length === 0 ? (
            <div className="text-center py-6 text-[#7a8fa6] text-[13px]">
              No security events recorded yet.
            </div>
          ) : (
            logs.map((log) => {
              const dateStr = new Date(log.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={log.id}
                  className="flex items-start justify-between gap-4 p-3 rounded-xl bg-black/15 border border-white/[0.02]"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0">
                      {log.category === 'security' && <AlertTriangle size={15} className="text-[#ff4a4a]" />}
                      {log.category === 'transaction' && <CheckCircle size={15} className="text-[#4ade80]" />}
                      {log.category === 'settings' && <Settings size={15} className="text-[#dea001]" />}
                    </span>
                    <div>
                      <p className="text-white text-[13px] font-medium leading-relaxed">
                        {log.details}
                      </p>
                      <span className="text-[10px] text-[#7a8fa6] mt-1 block font-mono">
                        Action: {log.action}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#7a8fa6] font-mono whitespace-nowrap pt-0.5">
                    {dateStr}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Version Footer */}
      <p className="text-[#7a8fa6] text-[11px] text-center">
        Xpectre Labs v1.0 · Build 2026.06
      </p>
    </div>
  );
};