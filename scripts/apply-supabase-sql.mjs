import { readFile } from "node:fs/promises";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF;

if (!token || !ref) {
  throw new Error("SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are required.");
}

const baseSql = await readFile("supabase/full_schema_seed.sql", "utf8");
const sql = `${baseSql}
update notification
set message = 'Mustafa İnan Kütüphanesi is currently quieter than usual.'
where message like 'Mustafa Inan%';
`;

const response = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json"
  },
  body: JSON.stringify({ query: sql })
});

const text = await response.text();
console.log(`${response.status} ${response.statusText}`);
console.log(text.slice(0, 1000));

if (!response.ok) {
  process.exit(1);
}
