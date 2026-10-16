import 'server-only';
import postgres from 'postgres';
import { databaseOptions,usesDirectDatabase } from '../../../scripts/runtime-config.mjs';
import { CommerceError } from '@/lib/commerce';
const state=globalThis as typeof globalThis & {moodlyPostgres?:ReturnType<typeof postgres>;moodlyPostgresConfig?:string};
export const hasDatabaseConnection=()=>usesDirectDatabase();
export function database() {
  let config:ReturnType<typeof databaseOptions>;
  try {config=databaseOptions();}catch(error){throw new CommerceError(error instanceof Error?error.message:'Database configuration is invalid.',503,'STORE_NOT_CONFIGURED');}
  if(!state.moodlyPostgres||state.moodlyPostgresConfig!==config.url){
    const previous=state.moodlyPostgres;if(previous)void previous.end({timeout:2});
    state.moodlyPostgres=postgres(config.url,config.options);state.moodlyPostgresConfig=config.url;
  }
  return state.moodlyPostgres;
}
export async function databaseCall<T>(work:(sql:ReturnType<typeof database>)=>Promise<T>):Promise<T> {
  try {return await work(database());}catch(error){
    if(error instanceof CommerceError)throw error;
    const failure=error as {code?:string;message?:string};
    if(['P0001','22023','23505','23514','22P02'].includes(failure.code??''))throw new CommerceError(failure.code==='23505'?'This product slug or checkout identity is already in use.':failure.message??'The database rejected this change.',409,'CHECKOUT_CONFLICT');
    console.error('[Moodly PostgreSQL]',failure.code??'CONNECTION_ERROR');
    throw new CommerceError('The database is temporarily unavailable. Check the development setup log and try again.',503,'DATABASE_UNAVAILABLE');
  }
}
