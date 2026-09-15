# PRD & Planning — Member Level Card & Detail Page

Status: **Selesai diimplementasikan** — Bagian A (backend, repo ini) & Bagian B (FE, repo `splitbill-web`) sudah dikerjakan. Lihat §6.

> **Catatan scope repo:** `/member/profile` dan `/member/level` itu halaman member-facing yang hidup di **`splitbill-web`** (repo terpisah), bukan di `splitbill-be`. Repo ini (`splitbill-be`) cuma nyediain API + admin panel. Dokumen ini punya 2 bagian:
> - **Bagian A** — perubahan backend di repo ini (ada gap: field "benefit" belum ada).
> - **Bagian B** — spesifikasi FE buat tim/sesi yang kerja di `splitbill-web` (referensi kontrak API, bukan diimplementasikan di sini).

Berikut lanjutan dari [docs/user-level-prd.md](user-level-prd.md) (model `UserLevel`, endpoint `/api/levels`, `/api/levels/me`).

## 1. Latar Belakang

Setelah sistem level & API-nya jadi ([docs/user-level-prd.md](user-level-prd.md)), sekarang mau ditampilkan ke member:
1. Card ringkas level user di `/member/profile`, di atas card "Preferensi & Masukan".
2. Halaman detail baru `/member/level` — semua level, benefit-nya, posisi user, dan progress bar menuju level berikutnya.

## 2. Gap yang ditemukan: field "benefit" belum ada

Model `UserLevel` saat ini cuma punya `name`, `icon`, `order`, `isActive`, `rules`. Belum ada tempat nyimpen **deskripsi/benefit** level (misal "Newbie: baru mulai split bareng temen" atau bullet list "Dapat badge eksklusif", dll) yang diminta buat halaman detail.

### Perubahan yang diusulkan (Bagian A — backend repo ini)

Tambah 2 field opsional ke `UserLevel` (`lib/models/UserLevel.js`):
```js
description: { type: String, trim: true, maxlength: 200, default: "" }, // tagline singkat
benefits: { type: [String], default: [] }, // bullet list, tiap item trim + maxlength ~120
```
- Optional & default kosong → **non-breaking** buat level yang udah ada.
- Perlu update: `api/levels/index.js` (POST) & `api/levels/[levelId].js` (PUT) buat terima+sanitize 2 field ini, dan `client/src/pages/UserLevelDetail.jsx` (admin form) buat input description (textarea) + benefits (repeatable bullet list, pola sama kayak rule builder).
- `GET /api/levels` & `GET /api/levels/me` otomatis include field ini karena return full document — **tidak perlu ubah shape response**.

> Ini dikerjain di repo ini kalau disetujui, terpisah dari task FE di `splitbill-web`.

## 3. Bagian B — Spesifikasi FE (`splitbill-web`, repo terpisah)

### 3.1 Kontrak API yang dipakai (sudah ada, tidak berubah)

| Endpoint | Auth | Dipakai untuk |
|---|---|---|
| `GET /api/levels` | — (public) | Semua level aktif, sorted `order` desc. Field: `name, icon, order, description, benefits, rules`. |
| `GET /api/levels/me` | user | `{ stats: {splitCount, totalAmount, friendCount}, currentLevel, nextLevel }` |

FE manggil keduanya paralel, gabungkan client-side by `_id`.

### 3.2 Card di `/member/profile`

Posisi: **di atas card "Preferensi & Masukan"**.

Isi:
- Icon + nama `currentLevel`.
- Cuplikan singkat progress (opsional, 1 baris teks, bukan progress bar penuh) — contoh: "5 split lagi menuju {nextLevel.name}".
- CTA "Lihat Detail Level" → navigate ke `/member/level`.

Edge case:
- `currentLevel: null` (belum ada level terkonfigurasi di admin) → sembunyikan card ini sepenuhnya, jangan tampilkan state kosong yang membingungkan di halaman profile.

### 3.3 Halaman baru `/member/level`

Tampilkan **semua level** (dari `GET /api/levels`) sbg card/list, dengan:
- Icon, nama, `description`, `benefits` (bullet list).
- Requirement level itu (rules), ditulis manusiawi: "Salah satu: {rule 1} ATAU {rule 2} ATAU {rule 3}" (OR logic sesuai [user-level-prd.md §3](user-level-prd.md)).
- Status badge per card, dibanding `currentLevel.order`:
  - `level.order <= currentLevel.order` → **Tercapai** (unlocked).
  - `level.order === nextLevel.order` → **Level berikutnya** + progress bar (detail di §3.4).
  - `level.order > nextLevel.order` → **Terkunci**, requirement ditampilkan statis (tanpa progress bar — gap-nya belum relevan buat user).
- Highlight card `currentLevel` (border/ribbon "Level kamu sekarang").

### 3.4 Progress bar menuju `nextLevel`

Karena rules pakai **OR logic**, progress ditampilkan **per rule yang "achievable"**, bisa lebih dari satu bar sekaligus (sesuai contoh dari requirement: "5 split lagi ATAU 1 juta amount lagi").

**Rule yang dipakai buat progress bar:** hanya rule dengan operator `>` atau `>=` (arah "naik/nambah"). Rule dengan operator `<`, `<=`, atau `=` **di-exclude** dari progress bar next-level — itu biasanya kriteria starter/tier-bawah, bukan target buat naik.

Algoritma per rule (dijalankan di FE, pakai data `stats` + `nextLevel.rules` yang udah ada, **tanpa endpoint baru**):
```js
function computeProgress(rule, stats) {
  const actual = stats[rule.metric];
  const needed = rule.operator === ">" ? rule.value + 1 : rule.value; // ">=" pakai value apa adanya
  const remaining = Math.max(0, needed - actual);
  const percent = Math.min(100, Math.round((actual / needed) * 100));
  return { remaining, percent };
}
```
Label metric & format nilai ikut mapping yang sama kayak di admin (`totalAmount` diformat Rupiah) — lihat `METRIC_LABELS` di [client/src/pages/UserLevels.jsx](../client/src/pages/UserLevels.jsx) sbg referensi konsistensi (repo beda, sekadar rujukan UX, bukan reuse kode).

Contoh render:
```
Menuju Pro 🏆
[███████░░░] 70%  Butuh 3 split lagi
[████░░░░░░] 40%  Butuh Rp600.000 lagi
```

### 3.5 Edge Cases FE

- `nextLevel: null` (user udah di level tertinggi) → badge "Level Maksimum", tanpa progress bar.
- `currentLevel: null` → semua level tampil "Terkunci", tanpa highlight.
- Level nonaktif (`isActive: false`) tidak pernah muncul karena `GET /api/levels` publik cuma return `isActive: true`.
- Semua rule di `nextLevel` operatornya `<`/`<=`/`=` (gak ada yang achievable) → sembunyikan section progress bar, cukup tampilkan requirement statis (kasus ini seharusnya jarang kalau admin setup tier dengan benar — level di atas Newbie biasanya pakai `>`/`>=`).

### 3.6 Non-goals

- Animasi/notifikasi real-time saat naik level.
- Leaderboard antar user.
- Riwayat "kapan naik ke level ini" — sistem levelnya **fluctuate**, bukan monotonic (keputusan final di [user-level-prd.md §12](user-level-prd.md#12-keputusan-final)), jadi gak ada histori yang disimpan.

## 4. Rencana Implementasi

**Phase 1 — Backend addendum (repo ini, `splitbill-be`)**
1. Tambah `description` + `benefits` ke `lib/models/UserLevel.js`
2. Terima & sanitize di `api/levels/index.js` (POST) & `api/levels/[levelId].js` (PUT)
3. Tambah input description (textarea) + benefits (bullet list editor) di `client/src/pages/UserLevelDetail.jsx`, tampilkan di card admin `UserLevels.jsx` (opsional, jumlah benefit aja)
4. Manual test via curl + admin panel

**Phase 2 — FE (`splitbill-web`, repo/sesi terpisah)**
5. Card level di `/member/profile`
6. Halaman baru `/member/level` (list semua level + status + progress bar)

## 5. Keputusan Final

1. **Field benefit** — disetujui: `description` (tagline) + `benefits` (bullet list array, multi-row). **Sudah diimplementasikan** di repo ini: `lib/models/UserLevel.js`, `api/levels/index.js`, `api/levels/[levelId].js`, form admin `client/src/pages/UserLevelDetail.jsx`. Non-breaking — dikonfirmasi lewat data existing yang otomatis dapet default `description: ""`, `benefits: []`.
2. **Progress bar per rule** — disetujui, sesuai algoritma §3.4 (satu bar per rule yang achievable, karena OR logic).
3. Exclude rule `<`/`<=`/`=` dari progress bar next-level — asumsi jalan terus (belum dibantah), lihat §3.4.
4. Backend addendum (Phase 1) & FE (Phase 2) — **keduanya sudah selesai**. Detail di §6.

## 6. Implementasi FE (`splitbill-web`)

Ternyata rute `/member/profile` & `/member/level` ini literal ada di `splitbill-web` (route group `src/app/member/*`), sama persis kayak istilah di PRD ini — gak perlu penyesuaian nama.

File yang ditambah/diubah di `splitbill-web`:
- `src/lib/constants.ts` — tambah `API_ENDPOINTS.LEVELS.{LIST,ME}`
- `src/lib/types/level.ts` — tipe `UserLevel`, `LevelRule`, `UserLevelStats`, `UserLevelMeResponse`
- `src/lib/api/levels.ts` — `fetchLevels()` (public), `fetchMyLevel()` (auth)
- `src/lib/utils/level.ts` — `computeAchievableProgress()` (implementasi algoritma §3.4), `formatRuleSentence()`
- `src/components/profile/MyLevelCard.tsx` — card ringkas, dipasang di `ProfilePanel.tsx` tepat di atas `MenuGroup title="Preferensi & Masukan"`
- `src/components/profile/LevelDetailPanel.tsx` + `src/app/member/level/page.tsx` — halaman detail: semua level, status (Tercapai/Level Kamu Sekarang/Level Berikutnya/Terkunci), progress bar per rule buat `nextLevel`, stats ringkas user

Diverifikasi: `tsc --noEmit` bersih, `eslint` bersih (cuma warning `<img>` vs `next/image` yang emang gak applicable buat data-URI/icon dinamis), `next build` sukses generate `/member/level` sbg route baru. Belum dicoba render penuh pakai akun login beneran (curl ke rute ke-redirect ke `/login` sesuai auth guard, itu ekspektasi yang benar) — cek manual di browser pakai akun sendiri buat lihat tampilan aslinya.
