import { writeFile } from 'node:fs/promises';
import { SEED_PRODUCTS } from '../src/lib/catalog';
const literal=(value:string)=>`'${value.replaceAll("'","''")}'`;
const rows=SEED_PRODUCTS.map(p=>`(${literal(p.id)},${literal(p.title)},${literal(p.slug)},${literal(p.category)},${p.base_price},${p.mrp},${literal(p.description??'')},${literal(p.fabric_details)},array[${p.images.map(literal).join(',')}],array[${p.colors.map(literal).join(',')}],true)`).join(',\n');
async function main() { await writeFile('supabase/seed.sql',`-- Editorial starter catalog. Public image paths are served by the Moodly app.\n-- Set the real business WhatsApp number in Studio before accepting live orders.\ninsert into public.products(id,title,slug,category,base_price,mrp,description,fabric_details,images,colors,is_active) values\n${rows}\non conflict do nothing;\n`);
console.log('Generated 12 starter products in supabase/seed.sql');

}
main().catch(error=>{console.error(error);process.exit(1);});
