import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { getUserSOLBalance } from '../utils/solana/balance';

interface UserSOLBalanceStore extends State {
    balance: number;
    getUserSOLBalance: (publicKey: PublicKey, connection: Connection) => void;
    setBalance: (balance: number) => void;
}

const useUserSOLBalanceStore = create<UserSOLBalanceStore>((set) => ({
    balance: 0,
    getUserSOLBalance: async (publicKey, connection) => {
        const balance = await getUserSOLBalance(publicKey, connection);
        if (balance === null) return;
        set({ balance });
        if (process.env.NODE_ENV === 'development') {
            console.log('Balance updated via RPC:', balance, 'SOL');
        }
    },
    setBalance: (balance: number) => {
        set({ balance });
        if (process.env.NODE_ENV === 'development') {
            console.log('Balance updated via WebSocket:', balance, 'SOL');
        }
    }
}));

export default useUserSOLBalanceStore;