import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'
import * as schema from './schema'

export type Db = NeonHttpDatabase<typeof schema>

export function createDb(databaseUrl: string): Db {
  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}
