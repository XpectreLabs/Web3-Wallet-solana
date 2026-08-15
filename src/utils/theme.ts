export const C = {
  bg: '#10131c',
  surface: 'rgba(255, 255, 255, 0.03)',
  surfaceSolid: '#181c27',
  gold: '#dea001',
  text: '#ffffff',
  muted: '#7a8fa6',
  green: '#4ade80',
  red: '#ff4a4a',
  border: 'rgba(222, 160, 1, 0.1)',
} as const;

export type NetworkUI = 'Mainnet' | 'Devnet' | 'Testnet';

export const NET_MAP: Record<NetworkUI, string> = {
  Mainnet: 'mainnet-beta',
  Devnet: 'devnet',
  Testnet: 'testnet',
};

export const NET_MAP_INVERSE: Record<string, NetworkUI> = {
  'mainnet-beta': 'Mainnet',
  'devnet': 'Devnet',
  'testnet': 'Testnet',
};

