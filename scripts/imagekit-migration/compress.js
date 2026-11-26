// Makes a compressed WebP copy ("<name>_c.webp") of every ImageKit image the
// database uses. Changes neither the database nor the originals.
//
//   node compress.js <backup-folder> [limit]
//
// Every original is backed up first: either it is still on Cloudinary with the
// same size (see mapping.json), or it is saved into <backup-folder>.
// Safe to re-run: images already in compress-mapping.json are skipped.
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { readEnv, connect, findColumns, q } = require("./common");

const OUT = `${__dirname}/compress-mapping.json`;
const env = readEnv();
const ENDPOINT = env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT.replace(/\/+$/, "");
const AUTH = "Basic " + Buffer.from(`${env.IMAGEKIT_PRIVATE_KEY}:`).toString("base64");
const IK_URL = /https:\/\/ik\.imagekit\.io\/ysi7qt88g\/[^\s"'<>\\),}\]?]+/g;
// Same limits as the admin uploader (components/admin/compressImage.js)
const MAX_EDGE = { notes: 800, testimonials: 800, categories: 1600, hero: 2560, "home-sections": 2560, bundle: 2560 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`download ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function listFiles() {
  const all = [];
  for (let skip = 0; ; skip += 1000) {
    const res = await fetch(`https://api.imagekit.io/v1/files?limit=1000&skip=${skip}`, { headers: { Authorization: AUTH } });
    const page = await res.json();
    if (!Array.isArray(page)) throw new Error(`list ${res.status} ${JSON.stringify(page).slice(0, 200)}`);
    all.push(...page);
    if (page.length < 1000) return all;
  }
}

async function referencedUrls() {
  const client = await connect();
  const urls = new Set();
  try {
    for (const h of await findColumns(client, "ik.imagekit.io/ysi7qt88g")) {
      const { rows } = await client.query(
        `select ${q(h.column_name)}::text v from public.${q(h.table_name)} where ${q(h.column_name)}::text like '%ik.imagekit.io/ysi7qt88g%'`
      );
      rows.forEach((r) => (r.v.match(IK_URL) || []).forEach((u) => urls.add(u)));
    }
  } finally {
    await client.end();
  }
  return urls;
}

async function upload(bytes, folder, fileName) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/webp" }), fileName);
  form.append("fileName", fileName);
  form.append("folder", folder);
  form.append("useUniqueFileName", "false");
  form.append("overwriteFile", "true"); // only ever replaces our own "_c" copy
  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: AUTH },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upload ${res.status} ${body.message || ""}`);
  if (body.url !== `${ENDPOINT}${folder}/${fileName}` || body.size !== bytes.length) throw new Error(`unexpected upload result ${body.url}`);
  return body;
}

(async () => {
  const backupDir = process.argv[2];
  if (!backupDir) throw new Error("usage: node compress.js <backup-folder> [limit]");
  const mapping = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};
  const cloudinary = new Map(
    Object.entries(JSON.parse(fs.readFileSync(`${__dirname}/mapping.json`, "utf8"))).map(([from, to]) => [to.url, from])
  );

  const files = await listFiles();
  const byUrl = new Map(files.map((f) => [f.url.split("?")[0], f]));
  const used = await referencedUrls();
  const newCopies = new Set(Object.values(mapping).map((m) => m.url).filter(Boolean));

  const missing = [...used].filter((u) => !byUrl.has(u));
  const candidates = [...used].filter((u) => byUrl.has(u) && !mapping[u] && !newCopies.has(u) && !u.includes("/amairah/site/"));
  const unused = files.filter((f) => {
    const u = f.url.split("?")[0];
    return !used.has(u) && !mapping[u] && !newCopies.has(u) && !u.includes("/amairah/site/");
  });
  const gb = (list) => (list.reduce((s, f) => s + f.size, 0) / 1e9).toFixed(2);
  console.log(`stored=${files.length} (${gb(files)} GB) used-by-db=${used.size} to-do=${candidates.length} unused=${unused.length} (${gb(unused)} GB) missing=${missing.length}`);
  if (missing.length) console.log(missing.slice(0, 5));

  const limit = Number(process.argv[3]) || Infinity;
  const todo = candidates.slice(0, limit);
  const failed = [];
  let done = 0;
  const save = () => fs.writeFileSync(OUT, JSON.stringify(mapping, null, 2));

  async function one(url) {
    const file = byUrl.get(url);
    const parts = file.filePath.split("/");
    const name = parts.pop();
    const folder = parts.join("/");

    // 1. get the original and make sure a backup of it exists
    let original;
    let backup;
    const cld = cloudinary.get(url);
    if (cld) {
      const bytes = await download(cld).catch(() => null);
      if (bytes && bytes.length === file.size) {
        original = bytes;
        backup = cld;
      }
    }
    if (!original) {
      original = await download(`${url}?tr=orig-true`);
      if (original.length !== file.size) throw new Error(`original is ${original.length} bytes, expected ${file.size}`);
      backup = path.join(backupDir, ...folder.split("/").filter(Boolean), name);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.writeFileSync(backup, original);
      if (fs.statSync(backup).size !== original.length) throw new Error("backup was not written completely");
    }

    // 2. compress
    const meta = await sharp(original).metadata();
    const entry = { oldFileId: file.fileId, before: file.size, backup };
    if (!["jpeg", "png", "webp"].includes(meta.format) || (meta.pages || 1) > 1) {
      mapping[url] = { ...entry, skipped: `left as ${meta.format}` };
      return;
    }
    const edge = MAX_EDGE[parts[parts.length - 1]] || 2000;
    const out = await sharp(original)
      .rotate()
      .resize({ width: edge, height: edge, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
    if (out.length >= file.size * 0.9) {
      mapping[url] = { ...entry, skipped: "already small" };
      return;
    }

    // 3. upload the copy next to the original
    const copy = await upload(out, folder, `${name.replace(/\.[^.]*$/, "")}_c.webp`);
    mapping[url] = { ...entry, url: copy.url, fileId: copy.fileId, after: out.length };
  }

  const worker = async () => {
    while (todo.length) {
      const url = todo.shift();
      for (let attempt = 1; ; attempt++) {
        try {
          await one(url);
          break;
        } catch (e) {
          if (attempt >= 3 || e.code === "ENOSPC") {
            failed.push({ url, error: e.message });
            break;
          }
          await sleep(1500 * attempt);
        }
      }
      if (++done % 25 === 0) {
        save();
        console.log(`  ${done} processed, ${failed.length} failed`);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  save();

  const entries = Object.values(mapping);
  const made = entries.filter((e) => e.url);
  const mb = (list, key) => (list.reduce((s, e) => s + e[key], 0) / 1e6).toFixed(0);
  const local = entries.filter((e) => !e.backup.startsWith("http"));
  console.log(`compressed=${made.length} skipped=${entries.length - made.length} failed=${failed.length}`);
  console.log(`size: ${mb(made, "before")} MB -> ${mb(made, "after")} MB`);
  console.log(`backups: on Cloudinary=${entries.length - local.length}, local files=${local.length} (${mb(local, "before")} MB)`);
  failed.slice(0, 10).forEach((f) => console.log(f));
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
