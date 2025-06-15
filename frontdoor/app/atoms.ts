import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { PXE, createPXEClient, AztecAddress, Fr, GrumpkinScalar, Contract } from '@aztec/aztec.js';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';

interface WalletData {
    address: string;
    secretKey: string;
    signingPrivateKey: string;
}

// Store only the wallet data in localStorage
const walletDataAtom = atomWithStorage<WalletData[]>('texcoco-wallets', []);
const selectedWalletDataAtom = atomWithStorage<WalletData | null>('texcoco-selected-wallet', null);

// Atom for storing deployed contract address
export const deployedContractAtom = atom<Contract>();

// Helper function to create a wallet from stored data
async function createWalletFromData(data: WalletData): Promise<any> {
    const pxe = createPXEClient(process.env.NEXT_PUBLIC_PXE_URL || 'http://localhost:8080');
    const secretKey = Fr.fromString(data.secretKey);
    const signingPrivateKey = GrumpkinScalar.fromString(data.signingPrivateKey);
    const account = await getSchnorrAccount(pxe, secretKey, signingPrivateKey);
    return account.getWallet();
}

// Derived atoms that handle Wallet instantiation
export const walletsAtom = atom(
    (get) => {
        const walletData = get(walletDataAtom);
        return Promise.all(walletData.map(data => createWalletFromData(data)));
    },
    async (get, set, newValue: any[]) => {
        const walletData = await Promise.all(newValue.map(async wallet => {
            const secretKey = Fr.random();
            const signingPrivateKey = GrumpkinScalar.random();
            const pxe = createPXEClient(process.env.NEXT_PUBLIC_PXE_URL || 'http://localhost:8080');
            const account = await getSchnorrAccount(pxe, secretKey, signingPrivateKey);
            await account.deploy({ deployWallet: (await getDeployedTestAccountsWallets(pxe))[0] }).wait();
            return {
                address: wallet.getAddress().toString(),
                secretKey: secretKey.toString(),
                signingPrivateKey: signingPrivateKey.toString()
            };
        }));
        set(walletDataAtom, walletData);
    }
);

export const selectedWalletAtom = atom(
    (get) => {
        const walletData = get(selectedWalletDataAtom);
        if (!walletData) return null;
        return createWalletFromData(walletData);
    },
    async (get, set, newValue: any) => {
        if (!newValue) {
            set(selectedWalletDataAtom, null);
            return;
        }
        const secretKey = Fr.random();
        const signingPrivateKey = GrumpkinScalar.random();
        const pxe = createPXEClient(process.env.NEXT_PUBLIC_PXE_URL || 'http://localhost:8080');
        const account = await getSchnorrAccount(pxe, secretKey, signingPrivateKey);
        await account.deploy({ deployWallet: (await getDeployedTestAccountsWallets(pxe))[0] }).wait();
        set(selectedWalletDataAtom, {
            address: newValue.getAddress().toString(),
            secretKey: secretKey.toString(),
            signingPrivateKey: signingPrivateKey.toString()
        });
    }
); 
