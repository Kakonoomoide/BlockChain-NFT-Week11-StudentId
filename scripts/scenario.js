// Skenario demo: "awalnya aman, tiba-tiba di-blacklist". Jalankan SETELAH seed.
const { ethers } = require("ethers");
const fs = require("node:fs");
const path = require("node:path");

// ===== KONFIGURASI =====
const RPC_URL = "http://10.64.24.101:8585";
const CHAIN_ID = 1912;
const CONTRACT_ADDRESS = "0x63EFBC667f8AA700A63253d0da84f759542CCB28"; // salin dari hasil deploy, misal "0x63EFBC667f8AA700A63253d0da84f759542CCB28"
const ABI_PATH = path.resolve("artifacts", "CompliantCoin.json");
// =======================

// Load .env (PRIVATE_KEY, DEMO_KEYS)
try {
  process.loadEnvFile(".env");
} catch {}
const abi = (() => {
  const j = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
  return Array.isArray(j) ? j : j.abi;
})();

async function attempt(label, fn) {
  try {
    const tx = await fn();
    await tx.wait();
    console.log(`  BERHASIL  ${label}`);
  } catch (e) {
    console.log(
      `  DITOLAK   ${label}\n            -> ${e.reason || e.shortMessage || e.message}`,
    );
  }
}

// Main
async function main() {
  // validasi .env
  const demoKeys = (process.env.DEMO_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!process.env.PRIVATE_KEY || demoKeys.length < 2)
    throw new Error("Butuh PRIVATE_KEY dan minimal 2 DEMO_KEYS di .env");

  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {
    cacheTimeout: -1,
    staticNetwork: true,
  });

  // membuat object wallet dan contract
  const owner = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const A = new ethers.Wallet(demoKeys[0], provider);
  const B = new ethers.Wallet(demoKeys[1], provider);
  const coin = new ethers.Contract(CONTRACT_ADDRESS, abi, owner);
  const amt = (n) => ethers.parseUnits(String(n), 18);

  console.log("A (Demo 1):", A.address);
  console.log("B (Demo 2):", B.address);

  // transaksi demo dalam kondisi normal, lalu A di-blacklist, lalu dicabut blacklist
  console.log("\n1) Kondisi normal, A kirim 10 ke B");
  await attempt("A -> B 10", () =>
    coin.connect(A).transfer(B.address, amt(10)),
  );

  console.log("\n2) Tiba-tiba owner (regulator) mem-blacklist A");
  await attempt("blacklist(A)", () =>
    coin.blacklist(A.address, "Dugaan penipuan (demo)"),
  );

  console.log("\n3) A coba kirim lagi, lalu B coba kirim ke A");
  await attempt("A -> B 5", () => coin.connect(A).transfer(B.address, amt(5)));
  await attempt("B -> A 5", () => coin.connect(B).transfer(A.address, amt(5)));

  console.log("\n4) Owner mencabut blacklist, A bisa kirim lagi");
  await attempt("unblacklist(A)", () => coin.unblacklist(A.address));
  await attempt("A -> B 5", () => coin.connect(A).transfer(B.address, amt(5)));

  console.log("\nSaldo akhir:");
  console.log("  A:", ethers.formatUnits(await coin.balanceOf(A.address), 18));
  console.log("  B:", ethers.formatUnits(await coin.balanceOf(B.address), 18));
}

main().catch((e) => {
  console.error(e.reason || e.message || e);
  process.exitCode = 1;
});
