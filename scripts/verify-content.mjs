import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parse } from 'parse5'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkMdx from 'remark-mdx'

// 상시 검사는 현재 문서와 정적 산출물을 비교한다. 과거 문서 고정은 선택한 버전 전환 검사에서만 수행한다.
const options = { source: 'content', out: 'out' }
for (let index = 2; index < process.argv.length; index += 2) {
  const name = process.argv[index]
  if (!['--source', '--out', '--baseline', '--compare-ref'].includes(name) || !process.argv[index + 1]) {
    throw new Error('사용법: node scripts/verify-content.mjs [--source content] [--out out] [--baseline 디렉터리 --compare-ref Git커밋]')
  }
  options[name.slice(2)] = process.argv[index + 1]
}
if (options.baseline && !options['compare-ref']) {
  throw new Error('--baseline 검사에는 원본 메타데이터를 읽을 --compare-ref Git커밋이 필요합니다.')
}

const errors = []
const sourceWarnings = new Set()
const check = (condition, message) => { if (!condition) errors.push(message) }
const sha256 = value => createHash('sha256').update(value).digest('hex')
// 구문 강조기가 빈 줄에 넣는 공백만 제거한다. 실제 코드 줄의 들여쓰기와 공백은 보존한다.
const normalizeCode = value => value.replace(/\r\n/g, '\n').replace(/^[\t ]+$/gm, '').replace(/\n+$/, '')
const markdown = unified().use(remarkParse).use(remarkMdx)
const htmlCache = new Map()
const assetCache = new Map()

function filesIn(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory() ? filesIn(filename) : [filename]
  }).sort()
}

function walk(node, visit, ancestors = []) {
  visit(node, ancestors)
  for (const child of node.children || node.childNodes || []) walk(child, visit, [...ancestors, node])
}

function attributes(node) {
  return Object.fromEntries((node.attrs || []).map(({ name, value }) => [name, value]))
}

function text(node) {
  return node.nodeName === '#text' ? node.value : (node.childNodes || []).map(text).join('')
}

function semanticText(node, excludeNestedLists = false) {
  const attrs = attributes(node)
  const screenReaderOnly = (attrs.class || '').split(/\s+/).some(value => ['sr-only', 'nx-sr-only', 'x:sr-only'].includes(value))
  if (['script', 'style', 'button', 'nav', 'pre', 'svg'].includes(node.tagName) || attrs['aria-hidden'] === 'true' || screenReaderOnly) return ''
  if (excludeNestedLists && ['ul', 'ol'].includes(node.tagName)) return ''
  if (node.tagName === 'br') return ' '
  if (node.nodeName === '#text') return node.value
  const children = node.childNodes || []
  return children.map((child, index) => {
    // Nextra 외부 링크의 장식 화살표 앞에 생성되는 NBSP는 작성한 본문이 아니다.
    const next = children.slice(index + 1).find(sibling => sibling.nodeName !== '#comment')
    if (node.tagName === 'a' && attrs.target === '_blank' && child.nodeName === '#text' && child.value === '\u00a0' && next?.tagName === 'svg') return ''
    return semanticText(child, excludeNestedLists)
  }).join('')
}

const prose = (node, excludeNestedLists = false) => semanticText(node, excludeNestedLists).replace(/\s+/g, ' ').trim()

function inspectHtml(filename) {
  if (htmlCache.has(filename)) return htmlCache.get(filename)
  const tree = parse(readFileSync(filename, 'utf8'))
  const result = { codes: [], images: [], headings: [], ids: [], links: [], nestedLinks: 0, articles: 0, paragraphs: [], listItems: [], tables: [] }
  let body
  walk(tree, (node, ancestors) => {
    if (!ancestors.some(parent => parent.tagName === 'article')) return
    const attrs = attributes(node)
    // Nextra 2의 사용자 본문과 Nextra 4의 검색 본문만 선택한다. 페이지 이동·댓글 영역은 제외한다.
    if ((attrs.class || '').split(/\s+/).includes('content-wrapper') || (node.tagName === 'main' && 'data-pagefind-body' in attrs)) body = node
    else if (!body && node.tagName === 'main') body = node
  })
  walk(tree, (node, ancestors) => {
    const attrs = attributes(node)
    const inArticle = ancestors.some(parent => parent.tagName === 'article')
    if (node.tagName === 'article') result.articles += 1
    if (attrs.id) result.ids.push(attrs.id)
    if (node.tagName === 'a') {
      const generatedAnchor = (attrs.class || '').split(/\s+/).includes('subheading-anchor') || ancestors.some(parent => (attributes(parent).class || '').split(/\s+/).includes('nextra-toc'))
      result.links.push({ ...attrs, text: prose(node), generatedAnchor })
      if (ancestors.some(parent => parent.tagName === 'a')) result.nestedLinks += 1
    }
    if (!inArticle) return
    if (node.tagName === 'code' && ancestors.some(parent => parent.tagName === 'pre')) result.codes.push(normalizeCode(text(node)))
    if (/^h[1-6]$/.test(node.tagName || '')) {
      // Nextra 2는 제목 내부 a에, Nextra 4는 제목 요소 자체에 고정 링크 id를 둔다.
      const anchor = (node.childNodes || []).find(child => child.tagName === 'a' && attributes(child).id)
      const id = attrs.id || (anchor && attributes(anchor).id)
      if (id) result.headings.push({ id, level: node.tagName, text: prose(node) })
    }
    if (node.tagName === 'img') {
      const link = ancestors.findLast(parent => parent.tagName === 'a')
      result.images.push({ ...attrs, link: link && attributes(link) })
    }
    const inBody = body && ancestors.includes(body)
    const isControl = ancestors.some(parent => ['button', 'nav', 'pre'].includes(parent.tagName) || ['giscus', 'nextra-breadcrumb'].some(value => (attributes(parent).class || '').split(/\s+/).includes(value)))
    if (!inBody || isControl) return
    if (node.tagName === 'p') result.paragraphs.push(prose(node))
    if (node.tagName === 'li') {
      const list = ancestors.findLast(parent => ['ul', 'ol'].includes(parent.tagName))
      result.listItems.push({
        type: list?.tagName,
        start: list?.tagName === 'ol' ? attributes(list).start || '1' : undefined,
        depth: ancestors.filter(parent => ['ul', 'ol'].includes(parent.tagName)).length,
        text: prose(node, true)
      })
    }
    if (node.tagName === 'table') {
      const rows = []
      walk(node, (row, parents) => {
        if (row.tagName !== 'tr' || parents.findLast(parent => parent.tagName === 'table') !== node) return
        rows.push((row.childNodes || []).filter(cell => ['th', 'td'].includes(cell.tagName)).map(cell => ({
          type: cell.tagName,
          colspan: attributes(cell).colspan || '1',
          rowspan: attributes(cell).rowspan || '1',
          text: prose(cell)
        })))
      })
      result.tables.push(rows)
    }
  })
  htmlCache.set(filename, result)
  return result
}

function outputFor(relative, directory = options.out) {
  const stem = relative.replace(/\.mdx?$/, '')
  const candidates = [path.join(directory, `${stem}.html`), path.join(directory, stem, 'index.html')]
  return candidates.find(existsSync)
}

function documentRoute(relative) {
  const stem = relative.replace(/\.mdx?$/, '').split(path.sep).join('/')
  return stem === 'index' ? '/' : '/' + stem.replace(/\/index$/, '')
}

function selfFragment(href, relative) {
  if (!href) return undefined
  const base = new URL(documentRoute(relative), 'https://mainmethod0126.github.io')
  try {
    const target = new URL(href, base)
    const canonicalPath = value => decodeURIComponent(value).replace(/\/$/, '')
    if (target.origin !== base.origin || canonicalPath(target.pathname) !== canonicalPath(base.pathname) || !target.hash) return undefined
    return decodeURIComponent(target.hash.slice(1))
  } catch {
    return undefined
  }
}

function linkDestination(href, relative) {
  if (typeof href !== 'string') return undefined
  try {
    const base = new URL(documentRoute(relative), 'https://mainmethod0126.github.io')
    return new URL(href, base).href
  } catch {
    return undefined
  }
}

function assetHash(filename) {
  if (!assetCache.has(filename)) assetCache.set(filename, sha256(readFileSync(filename)))
  return assetCache.get(filename)
}

function inspectMarkdown(filename) {
  const ast = markdown.parse(readFileSync(filename, 'utf8'))
  const definitions = new Map()
  const result = { codes: [], images: [], diagrams: 0, links: [] }
  walk(ast, node => { if (node.type === 'definition') definitions.set(node.identifier, node.url) })
  walk(ast, (node, ancestors) => {
    if (node.type === 'code') {
      // Mermaid는 브라우저에서 SVG를 생성하므로 정적 HTML 코드 블록과 별도로 집계한다.
      if (node.lang === 'mermaid') result.diagrams += 1
      else result.codes.push(normalizeCode(node.value))
    }
    if (node.type === 'link' || node.type === 'linkReference') result.links.push(node.url || definitions.get(node.identifier))
    if (node.type === 'image' || node.type === 'imageReference') {
      const link = ancestors.findLast(parent => ['link', 'linkReference'].includes(parent.type))
      result.images.push({
        url: node.url || definitions.get(node.identifier),
        alt: node.alt || '',
        link: link && { url: link.type === 'link' ? link.url : definitions.get(link.identifier) }
      })
    }
  })
  return result
}

function compareCodes(expected, actual, label) {
  check(expected.length === actual.length, `${label}: 코드 블록 수 ${expected.length} → ${actual.length}`)
  expected.forEach((code, index) => check(code === actual[index], `${label}: ${index + 1}번째 코드 블록 내용 불일치`))
}

function compareProse(expected, actual, label) {
  for (const [key, description] of [['paragraphs', '문단'], ['listItems', '목록 항목'], ['tables', '표']]) {
    check(expected[key].length === actual[key].length, `${label}: ${description} 수 ${expected[key].length} → ${actual[key].length}`)
    const mismatch = expected[key].findIndex((value, index) => JSON.stringify(value) !== JSON.stringify(actual[key][index]))
    if (mismatch !== -1) {
      const before = JSON.stringify(expected[key][mismatch]).slice(0, 180)
      const after = JSON.stringify(actual[key][mismatch])?.slice(0, 180)
      check(false, `${label}: ${mismatch + 1}번째 ${description} 의미 변경: ${before} → ${after}`)
    }
  }
}

let imageCount = 0
let codeCount = 0
let diagramCount = 0
const documents = filesIn(options.source).filter(filename => /\.mdx?$/.test(filename))
check(documents.length > 0, `${options.source}: 문서를 찾을 수 없습니다.`)
for (const filename of documents) {
  const relative = path.relative(options.source, filename)
  const output = outputFor(relative)
  check(Boolean(output), `${relative}: 기존 경로의 정적 HTML이 없습니다.`)
  if (!output) continue
  const source = inspectMarkdown(filename)
  const rendered = inspectHtml(output)
  const originalOutput = options.baseline && outputFor(relative, path.join(options.baseline, 'html'))
  const original = originalOutput && inspectHtml(originalOutput)
  check(rendered.articles === 1, `${relative}: 문서 article 요소가 ${rendered.articles}개입니다.`)
  check(rendered.nestedLinks === 0, `${relative}: 중첩된 링크가 있습니다.`)
  compareCodes(source.codes, rendered.codes, relative)
  codeCount += source.codes.length
  diagramCount += source.diagrams
  check(source.images.length === rendered.images.length, `${relative}: 본문 이미지 수 ${source.images.length} → ${rendered.images.length}`)
  for (const [index, image] of source.images.entries()) {
    const actual = rendered.images[index]
    imageCount += 1
    if (!actual) continue
    check(image.alt === actual.alt, `${relative}: ${index + 1}번째 이미지 대체 텍스트 불일치`)
    if (!image.url) {
      check(false, `${relative}: ${index + 1}번째 이미지 참조 정의가 없습니다.`)
      continue
    }
    if (/^(?:https?:)?\/\//.test(image.url)) {
      check(image.url === actual.src, `${relative}: 외부 이미지 주소 변경: ${image.url}`)
    } else if (!image.url.startsWith('data:')) {
      const url = decodeURIComponent(image.url.split(/[?#]/)[0])
      const original = url.startsWith('/') ? path.join('public', url.slice(1)) : path.resolve(path.dirname(filename), url)
      const exported = actual.src?.startsWith('/') ? path.join(options.out, decodeURIComponent(actual.src.split(/[?#]/)[0]).slice(1)) : undefined
      check(existsSync(original), `${relative}: 원본 이미지가 없습니다: ${url}`)
      check(Boolean(exported && existsSync(exported)), `${relative}: 정적 이미지가 없습니다: ${actual.src}`)
      if (existsSync(original) && exported && existsSync(exported)) {
        check(assetHash(original) === assetHash(exported), `${relative}: 정적 이미지 바이트 변경: ${url}`)
      }
    }
    if (image.link) {
      const expected = linkDestination(image.link.url, relative)
      check(Boolean(expected && expected === linkDestination(actual.link?.href, relative)), `${relative}: ${index + 1}번째 이미지에 작성된 링크 대상 변경: ${image.link.url} → ${actual.link?.href}`)
    } else {
      check(!actual.link, `${relative}: ${index + 1}번째 이미지에 문서에서 작성하지 않은 링크가 있습니다.`)
    }
  }
  for (const link of rendered.links) {
    const fragment = selfFragment(link.href, relative)
    if (!fragment || rendered.ids.includes(fragment)) continue
    const authored = !link.generatedAnchor && source.links.some(href => selfFragment(href, relative) === fragment)
    const existedBefore = !options.baseline || Boolean(original && original.links.some(previous => selfFragment(previous.href, relative) === fragment) && !original.ids.includes(fragment))
    if (authored && existedBefore) sourceWarnings.add(`${relative}: 문서에 작성된 고정 링크의 대상이 없습니다: #${fragment}`)
    else check(false, `${relative}: 대상이 없는 제목 고정 링크: ${link.href}`)
  }
  if (options.baseline) {
    check(Boolean(originalOutput), `${relative}: 이전 HTML 기준 데이터가 없습니다.`)
    if (original) {
      compareCodes(original.codes, rendered.codes, `${relative} (이전 HTML)`)
      compareProse(original, rendered, relative)
      for (const heading of original.headings) {
        check(rendered.headings.some(current => current.id === heading.id && current.level === heading.level), `${relative}: 기존 제목 고정 링크 변경: #${heading.id}`)
      }
    }
  }
}

let preservedFiles = 0
let metadataCount = 0
if (options.baseline) {
  const manifest = JSON.parse(readFileSync(path.join(options.baseline, 'manifest.json'), 'utf8'))
  for (const [oldPath, expectedHash] of Object.entries(manifest)) {
    // 앱 진입점과 생성 sitemap/robots는 이전 대상 문서가 아니다.
    if (oldPath === 'pages/_app.tsx' || /^public\/(?:sitemap.*\.xml|robots\.txt)$/.test(oldPath)) continue
    const currentPath = oldPath.startsWith('pages/') ? path.join(options.source, oldPath.slice('pages/'.length)) : oldPath
    if (oldPath.endsWith('/_meta.json')) {
      const modulePath = currentPath.replace(/\.json$/, '.js')
      check(existsSync(modulePath), `${oldPath}: 이전된 _meta.js가 없습니다.`)
      if (!existsSync(modulePath)) continue
      const originalMetadata = JSON.parse(execFileSync('git', ['show', `${options['compare-ref']}:${oldPath}`], { encoding: 'utf8' }))
      const correctedRoutes = []
      const expected = Object.fromEntries(Object.entries(originalMetadata).map(([key, value]) => {
        const document = path.join(path.dirname(currentPath), key)
        // 메타데이터의 키는 파일명이 아닌 경로 이름이다. 실제 문서에 대응하는 확장자만 제거한다.
        if (/\.mdx?$/.test(key) && existsSync(document) && statSync(document).isFile()) {
          const routeKey = key.replace(/\.mdx?$/, '')
          check(!(routeKey in originalMetadata), `${oldPath}: 확장자 제거 후 메타데이터 키가 충돌합니다: ${routeKey}`)
          correctedRoutes.push({ relative: path.relative(options.source, document), title: typeof value === 'string' ? value : value?.title })
          return [routeKey, value]
        }
        return [key, value]
      }))
      // Nextra 4는 외부 링크를 자동으로 새 탭에서 열며 newWindow 속성을 지원하지 않는다.
      for (const value of Object.values(expected)) {
        if (value && typeof value === 'object' && value.newWindow === true && /^https?:\/\//.test(value.href || '')) {
          const home = outputFor('index.mdx')
          check(Boolean(home && inspectHtml(home).links.some(link => link.href === value.href && link.target === '_blank')), `${oldPath}: 외부 메뉴의 새 탭 동작이 변경되었습니다: ${value.href}`)
          delete value.newWindow
        }
      }
      const actual = (await import(pathToFileURL(path.resolve(modulePath)).href)).default
      check(JSON.stringify(expected) === JSON.stringify(actual), `${oldPath}: 메뉴 순서 또는 메타데이터 의미가 변경되었습니다.`)
      for (const { relative, title } of correctedRoutes) {
        if (typeof title !== 'string') continue
        const route = documentRoute(relative)
        const output = outputFor(relative)
        const expectedTitle = title.replace(/\s+/g, ' ').trim()
        check(Boolean(output && inspectHtml(output).links.some(link => decodeURIComponent((link.href || '').split('#')[0]) === route && link.text.includes(expectedTitle))), `${oldPath}: 교정한 문서 경로의 메뉴 제목이 표시되지 않습니다: ${route} (${title})`)
      }
      metadataCount += 1
    } else {
      check(existsSync(currentPath), `${oldPath}: 이전 후 파일이 없습니다.`)
      if (existsSync(currentPath)) check(assetHash(currentPath) === expectedHash, `${oldPath}: 이전 후 파일 바이트가 변경되었습니다.`)
      preservedFiles += 1
    }
  }
}

if (errors.length) {
  console.error(`문서 보존 검사 실패: ${errors.length}건`)
  for (const error of errors) console.error(`- ${error}`)
  process.exitCode = 1
} else {
  console.log(`문서 보존 검사 통과: 문서 ${documents.length}개, 코드 블록 ${codeCount}개, 이미지 ${imageCount}개`)
  if (diagramCount) console.log(`Mermaid 다이어그램 ${diagramCount}개는 정적 코드 블록 검사에서 제외합니다. 브라우저에서 별도 확인해야 합니다.`)
  if (options.baseline) console.log(`이전 검증 통과: 파일 바이트 ${preservedFiles}개, 메타데이터 ${metadataCount}개, 기존 제목 고정 링크·코드 블록·문단·목록·표 보존`)
}
for (const warning of sourceWarnings) console.warn(`문서 원본 경고: ${warning}`)
