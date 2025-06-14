import { createPXEClient } from "@aztec/aztec.js";

const { PXE_URL = "http://localhost:8080" } = process.env;

async function showAccounts(pxe) {
  const accounts = await pxe.getRegisteredAccounts();
  console.log(`User accounts:\n${accounts.map((a) => a.address).join("\n")}`);
}

async function main() {
  const pxe = await createPXEClient(PXE_URL);
  const { l1ChainId } = await pxe.getNodeInfo();
  console.log(`Connected to chain ${l1ChainId}`);

  await showAccounts(pxe);
}

main().catch((err) => {
  console.error(`Error in app: ${err}`);
  process.exit(1);
});
