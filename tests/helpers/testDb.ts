import Database from 'better-sqlite3'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type Param = string | number | bigint | null | boolean | ArrayBuffer | Uint8Array

function normalize(args: unknown[]): (string | number | bigint | null | Uint8Array)[] {
  return args.map((a, i) => {
    if (a === undefined) throw new Error(`D1 bind: argument ${i} is undefined`)
    if (typeof a === 'boolean') return a ? 1 : 0
    if (a instanceof ArrayBuffer) return new Uint8Array(a)
    return a as string | number | bigint | null | Uint8Array
  })
}

function meta(changes = 0, lastRowId = 0) {
  return { changes, last_row_id: lastRowId, duration: 0, rows_read: 0, rows_written: changes }
}

export function createTestDb(): D1Database {
  const sqlite = new Database(':memory:')
  sqlite.pragma('foreign_keys = ON')

  const dir = join(__dirname, '..', '..', 'migrations')
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) {
    sqlite.exec(readFileSync(join(dir, f), 'utf8'))
  }

  const execStmt = (sql: string, params: unknown[]) => {
    const stmt = sqlite.prepare(sql)
    const p = normalize(params)
    if (stmt.reader) {
      const results = stmt.all(...p)
      return { success: true as const, results, meta: meta() }
    }
    const info = stmt.run(...p)
    return {
      success: true as const,
      results: [] as unknown[],
      meta: meta(info.changes, Number(info.lastInsertRowid)),
    }
  }

  const makeStatement = (sql: string, params: unknown[]) => ({
    bind: (...args: Param[]) => {
      normalize(args)
      return makeStatement(sql, args)
    },
    first: async (col?: string) => {
      const { results } = execStmt(sql, params)
      const row = (results[0] ?? null) as Record<string, unknown> | null
      return col && row ? row[col] : row
    },
    all: async () => execStmt(sql, params),
    run: async () => execStmt(sql, params),
    __sql: sql,
    __params: params,
  })

  const db = {
    prepare: (sql: string) => makeStatement(sql, []),
    exec: async (sql: string) => {
      sqlite.exec(sql)
      return { count: 0, duration: 0 }
    },
    batch: async (statements: ReturnType<typeof makeStatement>[]) => {
      const run = sqlite.transaction(() => statements.map((s) => execStmt(s.__sql, s.__params)))
      return run()
    },
  }
  return db as unknown as D1Database
}
