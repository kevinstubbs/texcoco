import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { getDeployedTestAccountsWallets } from "@aztec/accounts/testing";
import { createPXEClient, Fr, GrumpkinScalar, PXE } from "@aztec/aztec.js";

const { PXE_URL = "http://localhost:8080" } = process.env;

export async function showAccounts(pxe: PXE) {
    const accounts = await pxe.getRegisteredAccounts();
    console.log(`User accounts:\n${accounts.map((a) => a.address).join("\n")}`);
    return accounts;
}

export async function getNodeInfo() {
    try {
        const pxe = await createPXEClient(PXE_URL);
        const { l1ChainId } = await pxe.getNodeInfo();
        console.log(`Connected to chain ${l1ChainId}`);

        try {
            const accounts = await showAccounts(pxe);
            return {
                l1ChainId,
                accounts,
                status: 'connected',
                pxeUrl: PXE_URL
            };
        }
        catch (e) {
            console.error(e);
            return {
                l1ChainId,
                accounts: null,
                status: 'error',
                error: 'Failed to fetch accounts',
                pxeUrl: PXE_URL
            }
        }

    }
    catch (e) {
        console.error(e);
        return {
            status: 'error',
            error: 'Aztec Sandbox not connected',
            pxeUrl: PXE_URL
        }
    }
}

export async function generateAccount(pxe: PXE) {
    const secretKey = Fr.random();
    const signingPrivateKey = GrumpkinScalar.random();

    // Use a pre-funded wallet to pay for the fees for the deployments.
    const wallet = (await getDeployedTestAccountsWallets(pxe))[0];
    const newAccount = await getSchnorrAccount(pxe, secretKey, signingPrivateKey);
    await newAccount.deploy({ deployWallet: wallet }).wait();
    const newWallet = await newAccount.getWallet();

    return newWallet;
}
