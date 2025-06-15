import { getSchnorrAccount } from "@aztec/accounts/schnorr";
import { getDeployedTestAccountsWallets, getInitialTestAccountsWallets } from "@aztec/accounts/testing";
import { AztecAddress, Contract, ContractArtifact, createPXEClient, Fr, GrumpkinScalar, loadContractArtifact, PXE, waitForPXE, Wallet } from "@aztec/aztec.js";
import { walletsAtom, selectedWalletAtom, deployedContractAtom } from '../atoms';
import { getDefaultStore } from 'jotai';

const { PXE_URL = "http://localhost:8080" } = process.env;

export async function showAccounts(pxe: PXE) {
    const accounts = await pxe.getRegisteredAccounts();
    console.log(`User accounts:\n${accounts.map((a) => a.address).join("\n")}`);
    return accounts;
}

export async function getPXEClient() {
    const pxe = await createPXEClient(PXE_URL);
    await waitForPXE(pxe);
    return pxe;
}

export async function getNodeInfo() {
    try {
        const pxe = await getPXEClient();
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

    // Store the new wallet in localStorage using jotai
    const store = getDefaultStore();
    const currentWallets = await store.get(walletsAtom);
    store.set(walletsAtom, [...currentWallets, newWallet]);
    store.set(selectedWalletAtom, newWallet);

    return newWallet;
}

export async function deployContract(contract: ContractArtifact, pxe: PXE) {
    const [ownerWallet] = await getInitialTestAccountsWallets(pxe);
    // const ownerAddress = ownerWallet.getAddress();

    // console.log({ TokenContractArtifact })

    console.log(contract)
    const deployedContract = await Contract.deploy(ownerWallet, loadContractArtifact(contract as any), [])
        .send()
        .deployed();

    return await Contract.at(deployedContract.address, loadContractArtifact(contract as any), ownerWallet);
}

export async function callContractFunction(contract: Contract, wallet: Wallet, functionName: string, args: any[]) {
    const functionInteraction = (await Contract.at(contract.address, contract.artifact, (await getInitialTestAccountsWallets(await getPXEClient()))[0])).methods[functionName](...args);
    return functionInteraction.send().wait();
}


export async function readContractFunction(contract: Contract, wallet: Wallet, functionName: string, args: any[]) {
    console.log("reading", functionName, args, contract.address.toString());
    const functionInteraction = (await Contract.at(contract.address, contract.artifact, (await getInitialTestAccountsWallets(await getPXEClient()))[0])).methods[functionName](...args);
    return functionInteraction.simulate();
}