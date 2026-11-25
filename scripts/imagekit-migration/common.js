// Shared helpers for the Cloudinary -> ImageKit migration scripts.
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const ROOT = path.resolve(__dirname, "..", "..");

function readEnv() {
  const out = {};
  for (const line of fs.readFileSync(`${ROOT}/.env`, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

async function connect() {
  const conn = readEnv().direct_connection_str;
  if (!conn) throw new Error("direct_connection_str not found in .env");
  const pm = conn.match(/^\w+:\/\/([^:]+):(.*)@([^@\/:]+):(\d+)\/(.*)$/);
  if (!pm) throw new Error("Unrecognised connection string format");
  const client = new Client({
    user: decodeURIComponent(pm[1]),
    password: decodeURIComponent(pm[2]),
    host: pm[3],
    port: Number(pm[4]),
    database: pm[5],
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 20000,
  });
  await client.connect();
  return client;
}

const q = (id) => `"${id.replace(/"/g, '""')}"`;

// Every text-like column in the public schema that currently mentions Cloudinary.
async function findColumns(client, needle = "res.cloudinary.com") {
  const { rows: cols } = await client.query(`
    select c.table_name, c.column_name, c.data_type, c.udt_name
    from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
      and (c.data_type in ('text','character varying','jsonb','json','ARRAY'))
    order by 1, 2`);
  const hits = [];
  for (const c of cols) {
    const { rows } = await client.query(
      `select count(*)::int n from public.${q(c.table_name)} where ${q(c.column_name)}::text like $1`,
      [`%${needle}%`]
    );
    if (rows[0].n > 0) hits.push({ ...c, rows: rows[0].n });
  }
  return hits;
}

const URL_RE = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>\\),}\]]+/g;

module.exports = { ROOT, readEnv, connect, findColumns, q, URL_RE };
