import create, { State } from 'zustand';
import { Connection, PublicKey } from '@solana/web3.js';
import { getUserSOLBalance } from '../utils/solana/balance';

interface UserSOLBalanceStore extends State {
    balance: number;
    getUserSOLBalance: (publicKey: PublicKey, connection: Connection) => void;
}

const useUserSOLBalanceStore = create<UserSOLBalanceStore>((set) => ({
    balance: 0,
    getUserSOLBalance: async (publicKey, connection) => {
        // Delegate the actual RPC query to the solana/balance helper
        const balance = await getUserSOLBalance(publicKey, connection);

        // balance is null when an error occurred — keep the previous store value
        // so the UI does not display a misleading zero or crash.
        if (balance === null) return;

        set((s) => {
            s.balance = balance;
            console.log('Balance updated:', balance, 'SOL');
        });
    },
}));

export default useUserSOLBalanceStore;