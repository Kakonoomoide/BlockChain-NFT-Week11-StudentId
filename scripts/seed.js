const { ethers } = require("ethers");
const fs = require("node:fs");
const path = require("node:path");

// ===== KONFIGURASI (edit bagian ini saja) =====
const RPC_URL = "http://10.64.24.101:8585"; // server: 'http://10.64.24.101:8585'
const CHAIN_ID = 1912;
const CONTRACT_ADDRESS = "0x63EFBC667f8AA700A63253d0da84f759542CCB28"; // salin dari hasil deploy, misal "0x63EFBC667f8AA700A63253d0da84f759542CCB28"
const ABI_PATH = path.resolve("artifacts", "CompliantCoin.json");

const COINS_PER_WALLET = "1000"; // koin yang di-mint ke tiap wallet demo
const GAS_PER_WALLET = "0.05"; // saldo native (buat gas) yang dikirim ke tiap wallet demo
// ==============================================

try {
  process.loadEnvFile(".env");
} catch {}

function loadAbi(file) {
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(json) ? json : json.abi;
}

async function main() {
  if (!ethers.isAddress(CONTRACT_ADDRESS))
    throw new Error("CONTRACT_ADDRESS belum diisi di seed.js");
  if (!process.env.PRIVATE_KEY)
    throw new Error("PRIVATE_KEY belum diisi di .env");
  const demoKeys = (process.env.DEMO_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (demoKeys.length === 0)
    throw new Error("DEMO_KEYS kosong. Jalankan: node scripts/newkeys.js");

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {
    cacheTimeout: -1,
    staticNetwork: true,
  });
  if ((await provider.getCode(CONTRACT_ADDRESS)) === "0x") {
    throw new Error(
      `Tidak ada contract di ${CONTRACT_ADDRESS} pada ${RPC_URL}`,
    );
  }

  const owner = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const coin = new ethers.Contract(CONTRACT_ADDRESS, loadAbi(ABI_PATH), owner);
  const decimals = await coin.decimals();

  console.log("Contract :", CONTRACT_ADDRESS);
  console.log("Owner    :", owner.address);

  for (const [i, key] of demoKeys.entries()) {
    const addr = new ethers.Wallet(key).address;
    console.log(`\nDemo ${i + 1}: ${addr}`);

    // 1) gas (koin native) supaya wallet demo bisa mengirim transaksi
    let tx = await owner.sendTransaction({
      to: addr,
      value: ethers.parseEther(GAS_PER_WALLET),
    });
    await tx.wait();
    console.log(`  + gas ${GAS_PER_WALLET} (native)`);

    // 2) koin token (mint, hanya owner)
    tx = await coin.mint(addr, ethers.parseUnits(COINS_PER_WALLET, decimals));
    await tx.wait();
    console.log(`  + mint ${COINS_PER_WALLET} koin`);
  }
  console.log(
    "\nSelesai. Total supply:",
    ethers.formatUnits(await coin.totalSupply(), decimals),
  );
}

main().catch((error) => {
  console.error(error.reason || error.message || error);
  process.exitCode = 1;
});
