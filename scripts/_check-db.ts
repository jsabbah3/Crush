import { Client } from 'pg'

async function main() {
  const client = new Client({ connectionString: process.env.DIRECT_URL })
  await client.connect()

  const cols = async (table: string) => {
    const r = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}' ORDER BY ordinal_position`)
    return r.rows.map((x: {column_name: string}) => x.column_name).join(', ')
  }

  console.log('companies:', await cols('companies'))
  console.log('users:', await cols('users'))
  console.log('matches:', await cols('matches'))

  await client.end()
}

main()
