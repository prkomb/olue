import { MongoClient, type Db } from 'mongodb'
import { config } from '../config.js'

let client: MongoClient | null = null
let database: Db | null = null

export async function connect(): Promise<Db> {
  if (database) return database
  client = new MongoClient(config.MONGODB_URL, {
    serverSelectionTimeoutMS: 10_000,
    appName: 'olue-api',
  })
  await client.connect()
  database = client.db(config.MONGODB_DB)
  await database.command({ ping: 1 })
  return database
}

export function db(): Db {
  if (!database) throw new Error('Mongo not connected — call connect() first')
  return database
}

export async function close(): Promise<void> {
  if (client) await client.close()
  client = null
  database = null
}

export async function ping(): Promise<boolean> {
  try {
    if (!database) return false
    await database.command({ ping: 1 })
    return true
  } catch {
    return false
  }
}
