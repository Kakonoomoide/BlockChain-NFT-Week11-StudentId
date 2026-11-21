try {
  process.loadEnvFile(".env");
} catch {}

const express = require("express");
const path = require("node:path");
const bc = require("./services/blockchain");

const PORT = 3000;
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: false }));

const extractError = (e) => e.reason || e.shortMessage || e.message;

const handleAction = (fn) => async (req, res) => {
  try {
    const message = await fn(req);
    res.redirect("/?ok=" + encodeURIComponent(message));
  } catch (e) {
    res.redirect("/?err=" + encodeURIComponent(extractError(e)));
  }
};

app.get("/", async (req, res) => {
  try {
    const q = (req.query.address || "").trim();
    const data = await bc.getDashboardData(q);

    res.render("index", {
      ...data,
      ok: req.query.ok || null,
      err: req.query.err || null,
    });
  } catch (e) {
    res.status(500).send("Gagal membaca smart contract: " + extractError(e));
  }
});

app.post(
  "/transfer",
  handleAction(async (req) => {
    const idx = Number(req.body.from);
    const contract = bc.getContractAs(idx);
    bc.validateAddress(req.body.to, "Alamat tujuan");
    const amount = await bc.parseTokenAmount(req.body.amount);

    const tx = await contract.transfer(req.body.to, amount);
    await tx.wait();
    return `${bc.wallets[idx].label} berhasil mengirim ${req.body.amount} koin ke ${req.body.to}`;
  }),
);

app.post(
  "/mint",
  handleAction(async (req) => {
    bc.validateAddress(req.body.to, "Alamat penerima");
    const amount = await bc.parseTokenAmount(req.body.amount);

    const tx = await bc.coin.mint(req.body.to, amount);
    await tx.wait();
    return `Berhasil mint ${req.body.amount} koin ke ${req.body.to}`;
  }),
);

app.post(
  "/blacklist",
  handleAction(async (req) => {
    bc.validateAddress(req.body.address, "Alamat target");
    const reason = (req.body.reason || "").trim();

    const tx = await bc.coin.blacklist(req.body.address, reason);
    await tx.wait();
    return `${req.body.address} berhasil dimasukkan ke BLACKLIST`;
  }),
);

app.post(
  "/unblacklist",
  handleAction(async (req) => {
    bc.validateAddress(req.body.address, "Alamat target");

    const tx = await bc.coin.unblacklist(req.body.address);
    await tx.wait();
    return `${req.body.address} berhasil dicabut dari blacklist`;
  }),
);

app.post(
  "/pause",
  handleAction(async () => {
    const tx = await bc.coin.pause();
    await tx.wait();
    return "Seluruh aktivitas transfer DIBEKUKAN (Paused)";
  }),
);

app.post(
  "/unpause",
  handleAction(async () => {
    const tx = await bc.coin.unpause();
    await tx.wait();
    return "Aktivitas transfer dibuka kembali (Active)";
  }),
);

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
