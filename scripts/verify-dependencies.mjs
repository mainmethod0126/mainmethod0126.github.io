import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { compileMdx } from 'nextra/compile'
import { documentMdxOptions } from '../lib/document-mdx-options.mjs'
import { encodeDocumentRoute } from '../lib/document-route.mjs'

// Nextra 하위 보안 override가 사용하는 수식 렌더링과 파일 선택 계약을 검증한다.
// 설치된 공급 패키지를 입력으로 사용하며, 문서나 파일 시스템을 변경하지 않는다.
// 버전의 취약점 여부는 npm audit가 담당하고, 이 도구는 API 동작 회귀를 담당한다.
const require = createRequire(import.meta.url)
const nextraRequire = createRequire(require.resolve('nextra'))
const rehypeRequire = createRequire(nextraRequire.resolve('rehype-katex'))
const remarkMathRequire = createRequire(nextraRequire.resolve('remark-math'))
const mathRequire = createRequire(remarkMathRequire.resolve('micromark-extension-math'))
const markdownRequire = createRequire(nextraRequire.resolve('mdast-util-from-markdown'))
const tsMorphRequire = createRequire(nextraRequire.resolve('ts-morph'))
const commonRequire = createRequire(tsMorphRequire.resolve('@ts-morph/common'))

const importDependency = (owner, name) => import(pathToFileURL(owner.resolve(name)).href)
const formula = String.raw`\frac{1}{2} + x^2`
const invalidFormula = String.raw`\frac{`

const punctuation = await compileMdx('# Title\n\n"ASCII" and \'text\'... -- ---', { mdxOptions: documentMdxOptions })
assert.ok(!/[“”‘’…]/.test(punctuation), 'Nextra: 문서의 따옴표나 줄임표가 변환되었습니다.')
assert.ok(punctuation.includes("'text'... -- ---"), 'Nextra: 원문 문장 부호가 보존되지 않았습니다.')
assert.equal(encodeDocumentRoute("/kafka/When-Kafka-consumption-isn't-working,-check"), "/kafka/When-Kafka-consumption-isn't-working,-check", '기존 문서 URL의 쉼표나 아포스트로피가 변경되었습니다.')
assert.equal(encodeDocumentRoute('/문서/a?#%'), '/%EB%AC%B8%EC%84%9C/a%3F%23%25', '문서 URL 구분자 처리가 잘못되었습니다.')

// 중첩 설치로 소비처마다 KaTeX 사본이 달라져도 각 소비처의 실제 사본을 확인한다.
for (const [owner, ownerRequire] of [
  ['nextra', nextraRequire],
  ['rehype-katex', rehypeRequire],
  ['micromark-extension-math', mathRequire],
]) {
  const { default: katex } = await importDependency(ownerRequire, 'katex')
  for (const displayMode of [false, true]) {
    const html = katex.renderToString(formula, { displayMode, throwOnError: true })
    assert.match(html, /<mfrac>/, `${owner}: 분수의 MathML 구조가 없습니다.`)
    assert.equal(html.includes('katex-display'), displayMode, `${owner}: 수식 표시 방식이 다릅니다.`)
  }
  // Mermaid가 사용하는 출력 옵션도 유지해야 한다.
  for (const output of ['html', 'mathml']) {
    const html = katex.renderToString(formula, { output, displayMode: true, throwOnError: true })
    assert.ok(html.includes(output === 'html' ? 'katex-html' : '<math'), `${owner}: ${output} 출력 실패`)
  }
  assert.throws(() => katex.renderToString(invalidFormula, { throwOnError: true }), `${owner}: 수식 오류를 감지하지 못했습니다.`)
  assert.match(katex.renderToString(invalidFormula, { strict: 'ignore', throwOnError: false }), /katex-error/, `${owner}: 수식 오류 대체 표시가 없습니다.`)
}

const [{ default: rehypeKatex }, { VFile }, { micromark }, { math, mathHtml }] = await Promise.all([
  importDependency(nextraRequire, 'rehype-katex'),
  importDependency(rehypeRequire, 'vfile'),
  importDependency(markdownRequire, 'micromark'),
  importDependency(remarkMathRequire, 'micromark-extension-math'),
])

function descendants(node) {
  return [node, ...(node.children || []).flatMap(descendants)]
}

for (const displayMode of [false, true]) {
  const tree = {
    type: 'root',
    children: [{
      type: 'element',
      tagName: 'code',
      properties: { className: [displayMode ? 'math-display' : 'math-inline'] },
      children: [{ type: 'text', value: formula }],
    }],
  }
  const file = new VFile()
  rehypeKatex()(tree, file)
  const elements = descendants(tree)
  assert.ok(elements.some(node => node.tagName === 'mfrac'), 'rehype-katex: 분수가 변환되지 않았습니다.')
  assert.equal(elements.some(node => node.properties?.className?.includes('katex-display')), displayMode, 'rehype-katex: 인라인 또는 블록 수식 구분이 바뀌었습니다.')
  assert.equal(file.messages.length, 0, 'rehype-katex: 정상 수식에서 오류가 발생했습니다.')

  const markdown = displayMode ? `$$\n${formula}\n$$` : `$${formula}$`
  const html = micromark(markdown, { extensions: [math()], htmlExtensions: [mathHtml()] })
  assert.match(html, /<mfrac>/, 'micromark-extension-math: 분수가 변환되지 않았습니다.')
  assert.equal(html.includes('katex-display'), displayMode, 'micromark-extension-math: 인라인 또는 블록 수식 구분이 바뀌었습니다.')
}

const { minimatch } = commonRequire('minimatch')
assert.equal(minimatch('/src/문서/a.ts', '/src/**/*.ts'), true, 'minimatch: 중첩된 한글 경로가 일치하지 않습니다.')
assert.equal(minimatch('/src/a.js', '/src/**/*.ts'), false, 'minimatch: 다른 확장자가 포함되었습니다.')
assert.equal(minimatch('/src/a.test.ts', '!**/*.test.ts'), false, 'minimatch: 제외 패턴이 적용되지 않았습니다.')

const { InMemoryFileSystemHost, Project } = nextraRequire('ts-morph')
const fileSystem = new InMemoryFileSystemHost()
for (const filename of ['/src/a.ts', '/src/문서/b.ts', '/src/a.test.ts', '/src/a.js', '/other/c.ts']) {
  fileSystem.writeFileSync(filename, 'export const value = 1')
}
const project = new Project({ fileSystem, skipAddingFilesFromTsConfig: true, skipLoadingLibFiles: true })
const patterns = ['/src/**/*.ts', '!/src/**/*.test.ts']
const expected = ['/src/a.ts', '/src/문서/b.ts'].sort()
assert.deepEqual(fileSystem.globSync(patterns).sort(), expected, 'ts-morph: 메모리 파일 시스템의 포함·제외 선택이 바뀌었습니다.')
assert.deepEqual(project.addSourceFilesAtPaths(patterns).map(file => file.getFilePath()).sort(), expected, 'ts-morph: 프로젝트에 잘못된 파일이 추가되었습니다.')
assert.deepEqual(project.getSourceFiles('/src/문서/**/*.ts').map(file => file.getFilePath()), ['/src/문서/b.ts'], 'ts-morph: 프로젝트 파일의 경로 검색이 바뀌었습니다.')

console.log('의존성 호환 검사 통과: Nextra 문장 부호, 문서 URL, KaTeX 소비처 3개, rehype-katex·micromark 수식 변환, minimatch·ts-morph 파일 선택')
