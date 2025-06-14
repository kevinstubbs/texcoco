import { createPXEClient, PXE } from "@aztec/aztec.js";

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