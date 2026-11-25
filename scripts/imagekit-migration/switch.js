// Rewrites the Cloudinary links in the database to their ImageKit copies.
//
//   node switch.js                      dry run (changes are rolled back)
//   node switch.js --apply              write the changes
//   node switch.js --undo <backup.json> put the old links back
//
// Run it only AFTER the site that allows ik.imagekit.io is deployed, and run
// upload.js first. Every changed value is saved to a backup file.
const fs = require("fs");
const { connect, findColumns, q, URL_RE } = require("./common");

const MAP_FILE = `${__dirname}/mapping.json`;

async function primaryKey(client, table) {
  const { rows } = await client.query(
    `select a.attname from pg_index i
     join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = $1::regclass and i.indisprimary`,
    [`public.${q(table)}`]
  );
  if (rows.length !== 1) throw new Error(`${table}: expected a single-column primary key`);
  return rows[0].attname;
}

async function write(client, c, from, to) {
  const res = await client.query(
    `update public.${q(c.table)} set ${q(c.column)} = $1::${c.type} where ${q(c.pk)}::text = $2 and ${q(c.column)}::text = $3`,
    [to, c.id, from]
  );
  return res.rowCount;
}

(async () => {
  const apply = process.argv.includes("--apply");
  const undoAt = process.argv.indexOf("--undo");
  const client = await connect();
  try {
    if (undoAt > -1) {
      const backup = JSON.parse(fs.readFileSync(process.argv[undoAt + 1], "utf8"));
      await client.query("begin");
      let n = 0;
      for (const c of backup) n += await write(client, c, c.after, c.before);
      await client.query("commit");
      console.log(`restored ${n} of ${backup.length} values`);
      return;
    }

    const mapping = JSON.parse(fs.readFileSync(MAP_FILE, "utf8"));
    await client.query("begin");
    const changes = [];
    const unmapped = new Set();

    for (const h of await findColumns(client)) {
      if (h.data_type === "ARRAY") throw new Error(`${h.table_name}.${h.column_name}: array columns are not handled`);
      const pk = await primaryKey(client, h.table_name);
      const { rows } = await client.query(
        `select ${q(pk)}::text id, ${q(h.column_name)}::text v from public.${q(h.table_name)}
         where ${q(h.column_name)}::text like '%res.cloudinary.com%' for update`
      );
      for (const r of rows) {
        const after = r.v.replace(URL_RE, (url) => {
          if (mapping[url]) return mapping[url].url;
          unmapped.add(url);
          return url;
        });
        changes.push({ table: h.table_name, column: h.column_name, type: h.udt_name, pk, id: r.id, before: r.v, after });
      }
    }

    if (unmapped.size) {
      throw new Error(`${unmapped.size} image(s) are not on ImageKit yet — run upload.js first.\n${[...unmapped].slice(0, 5).join("\n")}`);
    }

    // Saved before anything is written, so there is always a way back.
    const backupFile = `${__dirname}/backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    if (apply) fs.writeFileSync(backupFile, JSON.stringify(changes, null, 2));

    const perColumn = {};
    for (const c of changes) {
      if ((await write(client, c, c.before, c.after)) !== 1) throw new Error(`${c.table}.${c.column} ${c.id}: update did not match`);
      const key = `${c.table}.${c.column}`;
      perColumn[key] = (perColumn[key] || 0) + 1;
    }
    const left = await findColumns(client);
    console.log(perColumn);
    console.log(`rows changed: ${changes.length}, columns still holding Cloudinary links: ${left.length}`);
    if (left.length) throw new Error("Some Cloudinary links would remain; nothing was changed.");

    await client.query(apply ? "commit" : "rollback");
    console.log(apply ? `APPLIED. Backup: ${backupFile}` : "DRY RUN only — nothing was changed.");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
})();
