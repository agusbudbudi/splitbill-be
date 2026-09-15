# PRD & Planning — User Level System

Status: Disetujui — 3 open decision + naming sudah dikonfirmasi (lihat §12). Belum ada kode yang dibuat.

> Naming: fitur ini disebut **"User Level"** (bukan "Gamification/Tier"). Model: `UserLevel`. Field/istilah: `level` (bukan `tier`).

## 1. Latar Belakang & Tujuan

Dorong user pakai fitur split bill lebih sering lewat sistem level yang dihitung dari history `SplitBillRecord` yang sudah **FINALIZED** (`status: "locked"`). Sifatnya fun/engagement, ditampilkan di member homepage. Level dibuat **configurable** oleh admin (tanpa perlu deploy ulang tiap ada perubahan kriteria).

## 2. Scope

**In-scope (repo ini — `splitbill-be`):**
- Model + API CRUD level (admin).
- API hitung stats user & resolve level user (dikonsumsi FE).
- Halaman admin baru di `client/` (ikut pola `client/src/pages/EntryPoints.jsx`) untuk kelola level.

**Out-of-scope (repo ini):**
- Tampilan visual level di member homepage — itu ada di `splitbill-web` (repo terpisah), sama seperti `EntryPointCard` yang dikonsumsi `EntryPointSection` di sana. Repo ini cuma nyediain API contract.

## 3. Terminologi

| Istilah | Arti |
|---|---|
| Level | Jenjang gamifikasi (mis. Newbie, Pro, Master), punya nama, icon, dan aturan (rules). |
| Rule | Satu syarat: `{ metric, operator, value }`. |
| Metric | Angka yang diukur dari history user: `splitCount`, `totalAmount`, `friendCount`. |
| OR logic | Level match kalau **salah satu** rule-nya terpenuhi (sesuai requirement — bukan AND). |

## 4. Data Model

### `UserLevel` (baru — `lib/models/UserLevel.js`)

```js
{
  name: String,        // required
  icon: String,        // required, base64 data URL (ikut pola Banner.image — upload file di admin, dikompres client-side)
  order: Number,       // required, unique di antara level isActive=true. Makin besar = makin tinggi level.
  isActive: Boolean,   // default true
  rules: [
    {
      metric: { type: String, enum: ["splitCount", "totalAmount", "friendCount"], required: true },
      operator: { type: String, enum: ["=", ">", "<", ">=", "<="], required: true },
      value: { type: Number, required: true },
    }
  ], // minimal 1 rule, dievaluasi sebagai OR
  createdAt, updatedAt,
  createdBy: ObjectId ref User,
  updatedBy: ObjectId ref User,
}
```

Contoh dokumen level "Newbie" sesuai requirement:
```json
{
  "name": "Newbie",
  "icon": "data:image/jpeg;base64,...",
  "order": 1,
  "rules": [
    { "metric": "splitCount", "operator": "<", "value": 10 },
    { "metric": "totalAmount", "operator": "<", "value": 1000000 },
    { "metric": "friendCount", "operator": "<", "value": 10 }
  ]
}
```

### Metric — cara hitung dari data existing (tidak nambah field baru di `User`)

Semua dihitung dari `SplitBillRecord` milik user dengan `status: "locked"` (FINALIZED):

- **`splitCount`** — jumlah dokumen.
- **`totalAmount`** — `sum(summary.total)`.
- **`friendCount`** — jumlah nama unik (case-insensitive, trim) di seluruh `participants[].name` pada record-record tsb, **dikurangi nama user sendiri** kalau ikut kesebut sbg participant.

> Catatan implementasi: `SplitBillRecord.participants[]` cuma snapshot `{id, name}` saat record dibuat — `id` itu string bebas dari client (lihat `sanitizeParticipant` di [api/split-bills/index.js:94](api/split-bills/index.js#L94)), **bukan** ref langsung ke collection `Participant`. Dedupe "teman" pakai `name` ternormalisasi, bukan `id` — sudah dikonfirmasi (§12).

## 5. Algoritma Resolusi Level

```
levels = UserLevel.find({ isActive: true }).sort({ order: -1 })
stats = computeUserStats(userId)  // { splitCount, totalAmount, friendCount }

for level in levels:            // dari order tertinggi ke terendah
  if level.rules.some(rule => evaluate(rule, stats)):
    return level                // match pertama (order tertinggi) menang

return levels[levels.length - 1] ?? null   // fallback: level order terendah, atau null kalau belum ada level sama sekali
```

`evaluate(rule, stats)` = bandingkan `stats[rule.metric]` dengan `rule.value` pakai `rule.operator`.

Kenapa dari order tertinggi ke rendah: requirement contoh Newbie pakai operator `<` (kriteria "starter"), jadi level yang lebih tinggi harus dicek duluan supaya user yang sudah high-activity tidak nyangkut di Newbie hanya karena satu metric-nya kebetulan masih kecil.

## 6. Strategi Komputasi

**Keputusan: real-time, tanpa cache, tanpa field level baru di `User`.**

- Dihitung on-demand tiap `GET /api/levels/me` dipanggil (aggregate query ke `SplitBillRecord`).
- Alasan: skala data masih kecil, dan ini menghindari data stale — kalau user hapus record finalized, atau admin ubah rule level, level langsung ke-reevaluate tanpa perlu migration/backfill job.
- Konfirmasi: level memang boleh **naik-turun** (fluctuate) kalau record finalized dihapus — bukan monotonic/achievement permanen. Tidak perlu tabel histori tambahan.

## 7. API Endpoints

Ikut convention "Adding a New Endpoint" di `CLAUDE.md` (CORS headers, `connectDatabase()`, `HttpError`/`toHttpError`, daftar di `netlify/functions/api.js`).

| Method | Path | Auth | Keterangan |
|---|---|---|---|
| GET | `/api/levels` | — (public) | List level aktif, sort by `order` desc. Untuk FE tampilin daftar level/progress. |
| GET | `/api/levels?includeInactive=true` | admin | Semua level termasuk nonaktif, buat halaman admin. |
| POST | `/api/levels` | admin | Buat level baru. |
| PUT | `/api/levels/:levelId` | admin | Edit level. |
| DELETE | `/api/levels/:levelId` | admin | Hapus level. |
| GET | `/api/levels/me` | user | `{ stats, currentLevel, nextLevel, progress }` — level & posisi user saat ini. |

File baru:
- `lib/models/UserLevel.js`
- `lib/userLevel.js` — helper `computeUserStats(userId)` + `resolveLevel(stats, levels)`, dipakai bareng oleh `me.js` dan (kalau perlu preview) admin form.
- `api/levels/index.js` — GET (public+admin lewat query flag) & POST
- `api/levels/[levelId].js` — PUT & DELETE
- `api/levels/me.js` — GET

Validasi admin API:
- `order` harus unik di antara level `isActive: true` → 400 kalau bentrok.
- Minimal 1 rule per level.
- `value` per metric masuk akal (`totalAmount` >= 0, dst) — validasi ringan saja.

## 8. Admin Panel (`client/`)

Menu baru "User Level" di sidebar admin, pola sama dengan `client/src/pages/EntryPoints.jsx`:
- Table list level: order, name, icon preview, jumlah rule, status aktif, aksi edit/hapus.
- Form create/edit: nama, icon (**upload file gambar**, dikompres client-side pakai `compressImage()` dari `client/src/lib/imageUtils.js` — sama persis pola `Banners.jsx`, hasil base64 dikirim di field `icon`, tanpa infra upload/blob baru), order, rule builder (baris berulang: dropdown metric, dropdown operator, input value, tombol tambah/hapus rule), toggle isActive.
- Validasi FE: minimal 1 rule, order unik.

## 9. Edge Cases

- **User baru (0 record finalized)** → jatuh ke level order terendah, **asalkan** admin sudah setup level catch-all (mis. rule pakai `>=` dengan value `0`). Kalau belum ada level sama sekali → `currentLevel: null`, FE tampilkan empty state.
- **Order bentrok** antar level aktif → ditolak (400) di admin API.
- **Hapus level yang lagi dipegang user** → aman, tidak ada foreign key/reference tersimpan; user otomatis re-evaluate ke level lain di fetch berikutnya (konsekuensi dari desain real-time di §6).
- **`totalAmount` bisa kena nilai negatif** (ada komentar existing soal promo di `AdditionalExpenseSchema`) → dijumlahkan apa adanya, tidak difilter.

## 10. Out of Scope (MVP)

- Notifikasi/animasi saat naik level.
- Leaderboard antar user.
- Histori/badge permanen (achievement yang tidak bisa turun) — lihat §12, defer ke v2 kalau dibutuhkan.
- Render tampilan level di homepage `splitbill-web` — itu tanggung jawab repo FE, backend cukup sediakan §7.

## 11. Rencana Implementasi (phased)

**Phase 1 — Backend core**
1. `lib/models/UserLevel.js`
2. `lib/userLevel.js` (`computeUserStats`, `resolveLevel`)
3. `api/levels/index.js`, `api/levels/[levelId].js`, `api/levels/me.js`
4. Daftarkan route di `netlify/functions/api.js`
5. Manual test via curl (tidak ada automated test suite di repo ini)

**Phase 2 — Admin UI**
6. Halaman + form + service API di `client/src`

**Phase 3 — optional/v2**
7. Cache/snapshot kalau real-time aggregate mulai berat
8. Histori level / badge monotonic kalau product minta

## 12. Keputusan Final

1. **Naming** — fitur/model disebut **"User Level"** (`UserLevel`), bukan "Gamification/Tier". Semua route/field pakai `level` (`/api/levels`, `currentLevel`, `nextLevel`, dst).
2. **Level fluctuate** (bukan monotonic) — level boleh naik-turun kalau record finalized dihapus/berubah. Tidak ada histori/highest-level-achieved.
3. **Friend count** — dedupe by `name` ternormalisasi (case-insensitive, trim), bukan `id`.
4. **Icon** — upload file gambar di admin (dikompres client-side, disimpan sbg base64, ikut pola `Banner.image`), bukan input URL manual.
