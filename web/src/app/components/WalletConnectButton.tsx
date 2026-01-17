'use client';

import { FC } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnectButton: FC = () => {
    return (
        <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-emerald-600 hover:!bg-emerald-500 transition-colors" />
        </div>
    );
};
