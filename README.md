# Praktikum 11: Regulasi dan Legalitas - Koin dengan Blacklist

Lanjutan Prak 10. Koin ditambah fitur kepatuhan: **blacklist** (dengan alasan wajib),
**pause** darurat, dan **audit trail** lewat event. Skenario demo: wallet awalnya aman,
tiba-tiba di-blacklist oleh regulator, lalu transfernya ditolak.

## Isi
- `contracts/CompliantCoin.sol` : koin + blacklist + pause
- `deploy/01_deploy.js`         : deploy lewat `cmu deploy`
- `scripts/newkeys.js`          : bikin wallet demo
- `scripts/seed.js`             : kirim gas + mint koin ke wallet demo
- `scripts/scenario.js`         : skenario "aman -> di-blacklist" di terminal
- `app.js` + `views/`           : dApp (pilih pengirim, blacklist, pause, audit log)

`cmu.config.js` tidak disertakan: salin isi folder ini ke project hasil `cmu create`
dan hapus contract/deploy contoh bawaan.

## Langkah
```bash
npm install
node scripts/newkeys.js 2            # tempel hasilnya ke .env
cmu wallet use main && cmu compile && cmu deploy
```
1. Isi `CONTRACT_ADDRESS` (+ samakan `RPC_URL`, `CHAIN_ID`) di `app.js`, `scripts/seed.js`, `scripts/scenario.js`.
2. `.env`: `PRIVATE_KEY` harus wallet deployer (owner), `DEMO_KEYS` dari newkeys.
3. `node scripts/seed.js`      (gas + koin ke wallet demo)
4. `node scripts/scenario.js`  (demo di terminal) atau `node app.js` lalu buka http://localhost:3000

## Demo di dApp
1. Kirim Demo 1 -> Demo 2: berhasil.
2. Blacklist Demo 1 (isi alasan): status berubah jadi BLACKLIST.
3. Kirim Demo 1 -> Demo 2: ditolak "Pengirim di-blacklist". Kirim Demo 2 -> Demo 1: ditolak "Penerima di-blacklist".
4. Cabut blacklist: bisa kirim lagi. Semua tindakan tercatat di Log kepatuhan.

## Bahan diskusi (laporan)
- Blacklist/pause memberi regulator kontrol, tapi bertentangan dengan sifat desentralisasi
  dan membuka risiko penyalahgunaan wewenang oleh satu pihak (owner).
- Data tetap publik: riwayat dan alasan blacklist bisa dibaca siapa pun.
- Aspek hukum (status kripto, KYC/AML, dokumen elektronik) berubah-ubah: rujuk sumber resmi
  (OJK, Bappebti, BI), jangan hanya dari modul ini.

## Keterbatasan
- Belum diuji di jaringan CointMU (dibuat tanpa akses node).
- Wallet dipegang server (custodial), tanpa login: jalankan di localhost/jaringan lab saja.
- Wallet demo butuh saldo native untuk gas (dikirim `seed.js`; ubah `GAS_PER_WALLET` bila kurang).
- `.env` jangan di-commit atau dibagikan.
