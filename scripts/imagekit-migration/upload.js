// Copies every Cloudinary image referenced by the DB to ImageKit, keeping the
// same folder and file name. Does NOT change the database. Safe to re-run: URLs
// already in mapping.json are skipped.
const fs = require("fs");
const { ROOT, readEnv, connect, findColumns, q, URL_RE } = require("./common");

const OUT = `${ROOT}/scripts/imagekit-migration`;
const MAP_FILE = `${OUT}/mapping.json`;
const env = readEnv();
const ENDPOINT = env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT.replace(/\/+$/, "");
const AUTH = "Basic " + Buffer.from(`${env.IMAGEKIT_PRIVATE_KEY}:`).toString("base64");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function target(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean); // cloud, image, upload, v123, ...path
  const v = parts.findIndex((p) => /^v\d+$/.test(p));
  if (v < 0) throw new Error(`Unexpected URL shape: ${url}`);
  const path = parts.slice(v + 1).map(decodeURIComponent);
  const fileName = path.pop();
  return { folder: "/" + path.join("/"), fileName };
}

async function copyOne(url) {
  const { folder, fileName } = target(url);
  const dl = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!dl.ok) throw new Error(`download ${dl.status}`);
  const type = dl.headers.get("content-type") || "application/octet-stream";
  const bytes = Buffer.from(await dl.arrayBuffer());

  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), fileName);
  form.append("fileName", fileName);
  form.append("folder", folder);
  form.append("useUniqueFileName", "false");
  form.append("overwriteFile", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    headers: { Authorization: AUTH },
    body: form,
    signal: AbortSignal.timeout(120000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`upload ${res.status} ${body.message || ""}`);

  const expected = `${ENDPOINT}${folder}/${fileName}`;
  if (body.url !== expected) throw new Error(`unexpected url ${body.url} (wanted ${expected})`);
  return { url: body.url, fileId: body.fileId, bytes: bytes.length, storedBytes: body.size };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const mapping = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, "utf8")) : {};

  const client = await connect();
  const urls = new Set();
  try {
    for (const h of await findColumns(client)) {
      const { rows } = await client.query(
        `select ${q(h.column_name)}::text v from public.${q(h.table_name)} where ${q(h.column_name)}::text like '%res.cloudinary.com%'`
      );
      rows.forEach((r) => (r.v.match(URL_RE) || []).forEach((u) => urls.add(u)));
    }
  } finally {
    await client.end();
  }

  const limit = Number(process.argv[2]) || Infinity;
  const todo = [...urls].filter((u) => !mapping[u]).slice(0, limit);
  console.log(`referenced=${urls.size} already=${urls.size - [...urls].filter((u) => !mapping[u]).length} todo=${todo.length}`);

  const failed = [];
  let done = 0;
  const worker = async () => {
    while (todo.length) {
      const u = todo.shift();
      for (let attempt = 1; ; attempt++) {
        try {
          mapping[u] = await copyOne(u);
          break;
        } catch (e) {
          if (attempt >= 3) {
            failed.push({ url: u, error: e.message });
            break;
          }
          await sleep(1500 * attempt);
        }
      }
      done++;
      if (done % 25 === 0) {
        fs.writeFileSync(MAP_FILE, JSON.stringify(mapping, null, 2));
        console.log(`  ${done} processed, ${failed.length} failed`);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  fs.writeFileSync(MAP_FILE, JSON.stringify(mapping, null, 2));

  const entries = Object.values(mapping);
  const mismatched = entries.filter((e) => e.bytes !== e.storedBytes);
  console.log(`mapped=${entries.length} failed=${failed.length} sizeMismatch=${mismatched.length}`);
  console.log(`total MB: ${(entries.reduce((s, e) => s + e.bytes, 0) / 1048576).toFixed(1)}`);
  if (failed.length) console.log(failed.slice(0, 15));
  if (mismatched.length) console.log(mismatched.slice(0, 5));
})().catch((e) => { console.error(e.message); process.exit(1); });
