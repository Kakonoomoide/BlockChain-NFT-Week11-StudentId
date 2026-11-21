const { ethers } = require("ethers");
const fs = require("node:fs");
const path = require("node:path");

// ===== Parameter koin (satuan KOIN, bukan satuan terkecil) =====
const NAME = "MahasiswaCoin"; // nama koin, misal "MahasiswaCoin" jangan gunakan spasi dan jangan gunakan nama yang sama dengan minggu lalu
const SYMBOL = "MHS"; // simbol koin, misal "MHS" jangna gunakan spasi dan jangan gunakan simbol yang sama dengan minggu lalu
const INITIAL_SUPPLY = 1000000; // dicetak ke deployer saat deploy
const CAP = 10000000; // batas maksimal supply (tidak bisa dilewati mint)

async function main() {
  // Disuntik oleh `cmu deploy` sesuai network di cmu.config.js
  const rpcUrl = process.env.CMU_RPC_URL;
  const chainId = Number(process.env.CMU_CHAIN_ID);
  const privateKey = process.env.PRIVATE_KEY;
  if (!rpcUrl || !chainId || !privateKey) {
    throw new Error(
      "CMU_RPC_URL / CMU_CHAIN_ID / PRIVATE_KEY tidak ada. Jalankan lewat `cmu deploy`.",
    );
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
    cacheTimeout: -1,
    staticNetwork: true,
  });
  const wallet = new ethers.Wallet(privateKey, provider);

  const artifact = JSON.parse(
    fs.readFileSync(path.resolve("artifacts", "CompliantCoin.json"), "utf8"),
  );
  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.evm.bytecode.object,
    wallet,
  );

  console.log("Network  :", rpcUrl, `(chain ${chainId})`);
  console.log("Owner    :", wallet.address);
  console.log(`Deploying ${NAME} (${SYMBOL})...`);

  const coin = await factory.deploy(NAME, SYMBOL, INITIAL_SUPPLY, CAP);
  await coin.waitForDeployment();

  console.log("Coin deployed to:", await coin.getAddress());
  console.log(
    "Salin alamat di atas ke CONTRACT_ADDRESS di app.js dan scripts/seed.js",
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
