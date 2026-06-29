import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { parseSpotifyCsv } from './spotify-csv'

const TMP = os.tmpdir()

function writeCsv(name: string, content: string): string {
  const p = path.join(TMP, `mixtape-spotify-test-${name}.csv`)
  fs.writeFileSync(p, content, 'utf-8')
  return p
}

// Exportify-style export (a subset of its columns).
const EXPORTIFY_CSV = `"Track URI","Track Name","Artist Name(s)","Album Name","Track Duration (ms)","Album Image URL"
"spotify:track:1","Blinding Lights","The Weeknd","After Hours","200040","https://img/1.jpg"
"spotify:track:2","Levitating","Dua Lipa, DaBaby","Future Nostalgia","203064","https://img/2.jpg"
`

const NO_TITLE_CSV = `"Foo","Bar"
"a","b"
`

let exportifyPath: string
let noTitlePath: string

beforeAll(() => {
  exportifyPath = writeCsv('exportify', EXPORTIFY_CSV)
  noTitlePath = writeCsv('notitle', NO_TITLE_CSV)
})

afterAll(() => {
  fs.unlinkSync(exportifyPath)
  fs.unlinkSync(noTitlePath)
})

describe('parseSpotifyCsv', () => {
  it('parses an Exportify CSV into track queries', () => {
    const { queries, errors } = parseSpotifyCsv([exportifyPath])
    expect(errors).toHaveLength(0)
    expect(queries).toHaveLength(2)
    expect(queries[0]).toMatchObject({
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      durationMs: 200040,
      thumbnailUrl: 'https://img/1.jpg',
    })
  })

  it('keeps only the primary artist when several are joined', () => {
    const { queries } = parseSpotifyCsv([exportifyPath])
    expect(queries[1].artist).toBe('Dua Lipa')
  })

  it('deduplicates the same title/artist across files', () => {
    const { queries } = parseSpotifyCsv([exportifyPath, exportifyPath])
    expect(queries).toHaveLength(2)
  })

  it('reports an error when no track-name column is present', () => {
    const { queries, errors } = parseSpotifyCsv([noTitlePath])
    expect(queries).toHaveLength(0)
    expect(errors).toHaveLength(1)
  })

  it('handles a nonexistent file gracefully', () => {
    const { queries, errors } = parseSpotifyCsv(['/nonexistent/path.csv'])
    expect(queries).toHaveLength(0)
    expect(errors).toHaveLength(1)
  })
})
