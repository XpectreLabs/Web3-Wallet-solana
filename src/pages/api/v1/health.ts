import type { NextApiRequest, NextApiResponse } from 'next';

type HealthResponse = {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  environment: string;
  solanaRpc: string;
  uptimeSeconds: number;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_HOST || 'https://api.mainnet-beta.solana.com';

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    solanaRpc: rpcUrl,
    uptimeSeconds: Math.floor(process.uptime()),
  });
}
