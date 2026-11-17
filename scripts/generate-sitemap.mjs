import { readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { encodeDocumentRoute } from '../lib/document-route.mjs'

const origin = 'https://mainmethod0126.github.io'
const contentDirectory = path.resolve('content')

async function documentRoutes(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const routes = await Promise.all(entries.map(async entry => {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) return documentRoutes(filename)
    if (!/\.mdx?$/.test(entry.name)) return []
    const route = path.relative(contentDirectory, filename).split(path.sep).join('/')
      .replace(/\.mdx?$/, '').replace(/(^|\/)index$/, '')
    return [encodeDocumentRoute('/' + route)]
  }))
  return routes.flat()
}

const escapeXml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
const routes = (await documentRoutes(contentDirectory)).sort()
const locations = routes.map(route => `  <url><loc>${escapeXml(new URL(route, origin).href)}</loc></url>`).join('\n')
await writeFile('out/sitemap-0.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations}\n</urlset>\n`)
await writeFile('out/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${origin}/sitemap-0.xml</loc></sitemap></sitemapindex>\n`)
console.log(`Generated sitemap for ${routes.length} documents.`)
