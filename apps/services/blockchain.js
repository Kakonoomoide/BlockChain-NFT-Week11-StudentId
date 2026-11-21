const { ethers } = require("ethers");
const fs = require("node:fs");
const path = require("node:path");

// ===== KONFIGURASI =====
const RPC_URL = "http://10.64.24.101:8585";
const CHAIN_ID = 1912;
const CONTRACT_ADDRESS = "0x63EFBC667f8AA700A63253d0da84f759542CCB28"; // salin dari hasil deploy, misal "0x63EFBC667f8AA700A63253d0da84f759542CCB28"
const ABI_PATH = path.resolve("artifacts", "CompliantCoin.json");
// =======================

if (!ethers.isAddress(CONTRACT_ADDRESS)) {
  throw new Error("CONTRACT_ADDRESS belum diisi dengan benar");
}
if (!process.env.PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY belum diisi di .env");
}

const json = JSON.parse(fs.readFileSync(ABI_PATH, "utf8"));
const abi = Array.isArray(json) ? json : json.abi;

const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID, {
  cacheTimeout: -1,
  staticNetwork: true,
});

const keys = [
  process.env.PRIVATE_KEY,
  ...(process.env.DEMO_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

const wallets = keys.map((k, i) => ({
  index: i,
  label: i === 0 ? "Owner (Regulator)" : `Demo Wallet ${i}`,
  wallet: new ethers.Wallet(k, provider),
}));

const coin = new ethers.Contract(CONTRACT_ADDRESS, abi, wallets[0].wallet);

/**
 * Connects the contract instance to a specific wallet index.
 * @param {number} index - The index of the wallet in the configured wallets array.
 * @returns {ethers.Contract} The connected contract instance.
 */
function getContractAs(index) {
  if (!wallets[index]) throw new Error("Wallet pengirim tidak valid");
  return coin.connect(wallets[index].wallet);
}

/**
 * Validates whether a given string is a valid Ethereum address.
 * @param {string} address - The address string to validate.
 * @param {string} label - The field label for error reporting.
 * @returns {void}
 */
function validateAddress(address, label) {
  if (!ethers.isAddress(address)) {
    throw new Error(`${label} tidak valid`);
  }
}

/**
 * Parses a decimal string into BigInt based on the token's decimals.
 * @param {string|number} amountStr - The amount to parse.
 * @returns {Promise<bigint>} The parsed token amount in smallest units.
 */
async function parseTokenAmount(amountStr) {
  const decimals = await coin.decimals();
  let parsed;
  try {
    parsed = ethers.parseUnits(String(amountStr).trim(), decimals);
  } catch {
    throw new Error("Jumlah tidak valid (gunakan angka desimal, misal: 10 atau 2.5)");
  }
  if (parsed <= 0n) throw new Error("Jumlah harus lebih dari 0");
  return parsed;
}

/**
 * Fetches balance and blacklist status for a specific address.
 * @param {string} address - The target wallet address.
 * @param {bigint|number} decimals - The token decimals for formatting.
 * @returns {Promise<Object>} Formatted status object of the address.
 */
async function getAddressStatus(address, decimals) {
  const [bal, info] = await Promise.all([
    coin.balanceOf(address),
    coin.blacklistInfo(address),
  ]);
  return {
    address,
    balance: ethers.formatUnits(bal, decimals),
    blacklisted: info.blacklisted,
    reason: info.reason,
    since: info.blacklisted
      ? new Date(Number(info.since) * 1000).toLocaleString("id-ID")
      : "",
  };
}

/**
 * Retrieves complete dashboard data including token info, wallet balances, audit logs, and transfer history.
 * @param {string} queryAddress - Optional address string for status lookup.
 * @returns {Promise<Object>} Complete dashboard state object.
 */
async function getDashboardData(queryAddress) {
  const [name, symbol, decimals, totalSupply, cap, owner, paused] =
    await Promise.all([
      coin.name(),
      coin.symbol(),
      coin.decimals(),
      coin.totalSupply(),
      coin.cap(),
      coin.owner(),
      coin.paused(),
    ]);

  const fmt = (v) => ethers.formatUnits(v, decimals);

  const rows = await Promise.all(
    wallets.map(async (w) => ({
      index: w.index,
      label: w.label,
      ...(await getAddressStatus(w.wallet.address, decimals)),
    }))
  );

  let lookup = null;
  if (queryAddress) {
    lookup = ethers.isAddress(queryAddress)
      ? await getAddressStatus(queryAddress, decimals)
      : { address: queryAddress, error: "Format alamat tidak valid" };
  }

  let audit = [];
  let history = [];

  try {
    const fetchLogs = (filter) => coin.queryFilter(filter, 0, "latest");
    const [b, u, p, up, transferLogs] = await Promise.all([
      fetchLogs(coin.filters.Blacklisted()),
      fetchLogs(coin.filters.Unblacklisted()),
      fetchLogs(coin.filters.Paused()),
      fetchLogs(coin.filters.Unpaused()),
      fetchLogs(coin.filters.Transfer()),
    ]);

    audit = [
      ...b.map((l) => ({
        block: l.blockNumber,
        type: "BLACKLIST",
        detail: `${l.args.account} — ${l.args.reason || "Tanpa alasan"}`,
      })),
      ...u.map((l) => ({
        block: l.blockNumber,
        type: "UNBLACKLIST",
        detail: l.args.account,
      })),
      ...p.map((l) => ({
        block: l.blockNumber,
        type: "PAUSE",
        detail: `Oleh ${l.args.by}`,
      })),
      ...up.map((l) => ({
        block: l.blockNumber,
        type: "UNPAUSE",
        detail: `Oleh ${l.args.by}`,
      })),
    ]
      .sort((x, y) => y.block - x.block)
      .slice(0, 20);

    history = transferLogs
      .slice(-15)
      .reverse()
      .map((l) => {
        const { from, to, value } = l.args;
        const kind =
          from === ethers.ZeroAddress
            ? "MINT"
            : to === ethers.ZeroAddress
              ? "BURN"
              : "TRANSFER";
        return {
          block: l.blockNumber,
          kind,
          from,
          to,
          value: fmt(value),
        };
      });
  } catch {
    // Fallback if RPC node prunes historical logs
  }

  return {
    info: {
      name,
      symbol,
      owner,
      paused,
      totalSupply: fmt(totalSupply),
      cap: fmt(cap),
      contract: CONTRACT_ADDRESS,
    },
    rows,
    lookup,
    audit,
    history,
  };
}

module.exports = {
  wallets,
  coin,
  getContractAs,
  validateAddress,
  parseTokenAmount,
  getDashboardData,
};