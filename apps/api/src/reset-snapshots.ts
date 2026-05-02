import { close, connect } from './db/mongo.js'

async function main(): Promise<void> {
  const database = await connect()
  const targets = ['pages', 'chunks', 'changes']
  for (const name of targets) {
    const r = await database.collection(name).deleteMany({})
    console.log(`cleared ${name}: ${r.deletedCount} docs`)
  }
  await close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
