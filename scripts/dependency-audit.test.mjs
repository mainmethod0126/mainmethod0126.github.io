import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { evaluateAuditReport, parseAuditResult } from './lib/dependency-audit.mjs'

const fixture = JSON.parse(readFileSync(new URL('../tests/fixtures/dependency-audit-picomatch.json', import.meta.url), 'utf8'))
const advisory = 'GHSA-fc5q-39xc-vjpf'
const exception = {
  advisory,
  package: 'picomatch',
  expiresAt: '2026-11-25T00:00:00+09:00',
  reason: '공식 수정 버전이 없는 picomatch 권고의 승인된 임시 예외',
  issue: 'https://github.com/mainmethod0126/mainmethod0126.github.io/issues/50',
  references: [`https://github.com/advisories/${advisory}`]
}
const expiresAt = Date.parse(exception.expiresAt)
const now = Date.parse('2026-11-18T12:00:00+09:00')
const options = { exceptions: [exception], now }
const packageNames = Object.keys(fixture.vulnerabilities).sort()
const names = entries => entries.map(entry => entry.name).sort()
const evaluate = report => evaluateAuditReport(report, options)

function recount(report) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 }
  for (const vulnerability of Object.values(report.vulnerabilities)) {
    counts[vulnerability.severity] += 1
    counts.total += 1
  }
  report.metadata.vulnerabilities = counts
  return report
}

function cleanReport() {
  const report = structuredClone(fixture)
  report.vulnerabilities = {}
  return recount(report)
}

function addVulnerability(report, name, id, severity = 'low') {
  const vulnerability = structuredClone(fixture.vulnerabilities.picomatch)
  Object.assign(vulnerability, { name, severity, effects: [], nodes: [`node_modules/${name}`], fixAvailable: false })
  Object.assign(vulnerability.via[0], { name, dependency: name, severity, url: `https://github.com/advisories/${id}` })
  report.vulnerabilities[name] = vulnerability
  return recount(report)
}

test('실제 감사 보고서의 11개 영향 패키지를 승인된 단일 권고로 추적한다', () => {
  const result = evaluate(structuredClone(fixture))
  assert.equal(packageNames.length, 11)
  assert.deepEqual(names(result.allowed), packageNames)
  assert.deepEqual(result.blocked, [])
  for (const entry of result.allowed) assert.deepEqual(entry.advisories, [advisory])
  assert.deepEqual(result.usedExceptions, [exception])
})

test('예외가 없으면 동일한 보고서의 모든 영향 패키지를 차단한다', () => {
  const result = evaluateAuditReport(structuredClone(fixture), { exceptions: [], now })
  assert.deepEqual(result.allowed, [])
  assert.deepEqual(names(result.blocked), packageNames)
  assert.deepEqual(result.usedExceptions, [])
  for (const entry of result.blocked) assert.ok(typeof entry.reason === 'string' && entry.reason.trim())
})

test('예외 만료 직전까지만 허용하고 정각과 이후에는 차단한다', () => {
  for (const offset of [-1, 0, 1]) {
    const result = evaluateAuditReport(structuredClone(fixture), { exceptions: [exception], now: expiresAt + offset })
    assert.deepEqual(names(result.allowed), offset < 0 ? packageNames : [], `만료 시각과의 차이: ${offset}ms`)
    assert.deepEqual(names(result.blocked), offset < 0 ? [] : packageNames)
    assert.deepEqual(result.usedExceptions, offset < 0 ? [exception] : [])
  }
})

test('취약점이 없는 보고서는 만료된 예외가 있어도 예외를 사용하지 않는다', () => {
  assert.deepEqual(evaluateAuditReport(cleanReport(), { exceptions: [exception], now: expiresAt }), {
    allowed: [], blocked: [], usedExceptions: []
  })
})

test('별도로 추가된 낮은 위험도의 다른 권고는 차단한다', () => {
  const report = addVulnerability(structuredClone(fixture), 'another-package', 'GHSA-c2c7-rcm5-vvqj')
  const result = evaluate(report)
  assert.deepEqual(names(result.allowed), packageNames)
  assert.deepEqual(names(result.blocked), ['another-package'])
  assert.deepEqual(result.usedExceptions, [exception])
})

test('동일한 패키지에 다른 권고가 섞이면 이를 참조하는 모든 패키지를 차단한다', () => {
  const report = structuredClone(fixture)
  report.vulnerabilities.picomatch.via.push({
    ...report.vulnerabilities.picomatch.via[0],
    url: 'https://github.com/advisories/GHSA-c2c7-rcm5-vvqj',
    severity: 'low'
  })
  const result = evaluate(report)
  assert.deepEqual(result.allowed, [])
  assert.deepEqual(names(result.blocked), packageNames)
  assert.deepEqual(result.usedExceptions, [])
})

test('같은 권고 ID라도 다른 패키지에는 예외를 적용하지 않는다', () => {
  const result = evaluate(addVulnerability(structuredClone(fixture), 'another-package', advisory))
  assert.deepEqual(names(result.allowed), packageNames)
  assert.deepEqual(names(result.blocked), ['another-package'])
})

test('권고 URL의 호스트나 전체 경로가 다르면 예외를 적용하지 않는다', () => {
  for (const url of [
    `https://example.com/advisories/${advisory}`,
    `https://github.com/advisories/${advisory}/`,
    `https://github.com/advisories/${advisory}?accepted=true`
  ]) {
    const report = structuredClone(fixture)
    report.vulnerabilities.picomatch.via[0].url = url
    const result = evaluate(report)
    assert.deepEqual(result.allowed, [], url)
    assert.deepEqual(names(result.blocked), packageNames, url)
  }
})

test('손상되거나 해석할 수 없는 감사 보고서는 실패한다', () => {
  const changes = [
    ['네트워크 오류 응답', report => { report.error = { code: 'ENOTFOUND', summary: 'registry unavailable' } }],
    ['지원하지 않는 보고서 버전', report => { report.auditReportVersion = 3 }],
    ['취약점 목록 누락', report => { delete report.vulnerabilities }],
    ['잘못된 취약점 목록 구조', report => { report.vulnerabilities = [] }],
    ['경유 목록 누락', report => { delete report.vulnerabilities.picomatch.via }],
    ['빈 경유 목록', report => { report.vulnerabilities.picomatch.via = [] }],
    ['잘못된 경유 항목', report => { report.vulnerabilities.picomatch.via = [null] }],
    ['없는 패키지 참조', report => { report.vulnerabilities.micromatch.via = ['missing-package'] }],
    ['패키지 참조 순환', report => { report.vulnerabilities.picomatch.via.push('micromatch') }],
    ['패키지 이름 불일치', report => { report.vulnerabilities.picomatch.name = 'another-package' }],
    ['권고 패키지 이름 불일치', report => { report.vulnerabilities.picomatch.via[0].name = 'another-package' }],
    ['권고 의존 패키지 불일치', report => { report.vulnerabilities.picomatch.via[0].dependency = 'another-package' }],
    ['알 수 없는 위험도', report => { report.vulnerabilities.picomatch.severity = 'unknown' }],
    ['메타데이터 누락', report => { delete report.metadata }],
    ['취약점 합계 불일치', report => { report.metadata.vulnerabilities.total -= 1 }],
    ['위험도별 개수 불일치', report => { report.metadata.vulnerabilities.high -= 1; report.metadata.vulnerabilities.low += 1 }]
  ]
  for (const [label, change] of changes) {
    const report = structuredClone(fixture)
    change(report)
    assert.throws(() => evaluate(report), label)
  }
  for (const report of [null, [], 'invalid', {}]) assert.throws(() => evaluate(report))
})

test('중복되거나 불완전한 예외 정책과 잘못된 시각은 실패한다', () => {
  const policies = [
    ['중복 예외', [exception, { ...exception }]],
    ['날짜 형식 오류', [{ ...exception, expiresAt: 'invalid' }]],
    ['존재하지 않는 날짜', [{ ...exception, expiresAt: '2026-02-30T00:00:00+09:00' }]],
    ['시간대 누락', [{ ...exception, expiresAt: '2026-11-25T00:00:00' }]],
    ['예외 사유 누락', [{ ...exception, reason: '' }]],
    ['작업 항목 누락', [{ ...exception, issue: '' }]],
    ['근거 링크 누락', [{ ...exception, references: [] }]],
    ['잘못된 정책 구조', {}]
  ]
  for (const [label, exceptions] of policies) {
    assert.throws(() => evaluateAuditReport(structuredClone(fixture), { exceptions, now }), label)
  }
  for (const invalidNow of [NaN, Infinity, '2026-11-18']) {
    assert.throws(() => evaluateAuditReport(structuredClone(fixture), { exceptions: [exception], now: invalidNow }))
  }
})

test('npm audit의 정상 종료와 취약점 발견 종료를 구분해 보고서를 읽는다', () => {
  const infoOnly = addVulnerability(cleanReport(), 'another-package', 'GHSA-c2c7-rcm5-vvqj', 'info')
  for (const [status, report] of [[0, cleanReport()], [0, infoOnly], [1, fixture]]) {
    assert.deepEqual(parseAuditResult({ status, signal: null, stdout: JSON.stringify(report) }), report)
  }
})

test('npm audit 실행 실패와 불완전한 출력은 정상 결과로 처리하지 않는다', () => {
  const valid = { status: 1, signal: null, stdout: JSON.stringify(fixture) }
  const infoOnly = addVulnerability(cleanReport(), 'another-package', 'GHSA-c2c7-rcm5-vvqj', 'info')
  const failures = [
    ['예상하지 않은 종료 코드', { ...valid, status: 2 }],
    ['종료 코드 누락', { ...valid, status: null }],
    ['시그널로 종료', { ...valid, signal: 'SIGTERM' }],
    ['실행 시간 초과', { ...valid, error: { code: 'ETIMEDOUT' } }],
    ['네트워크 오류 JSON', { ...valid, stdout: JSON.stringify({ error: { code: 'ENOTFOUND', summary: 'registry unavailable' } }) }],
    ['손상된 JSON', { ...valid, stdout: '{' }],
    ['빈 출력', { ...valid, stdout: '' }],
    ['문자열이 아닌 출력', { ...valid, stdout: null }],
    ['취약점 발견 종료와 빈 보고서 불일치', { ...valid, stdout: JSON.stringify(cleanReport()) }],
    ['정상 종료와 높은 위험도 보고서 불일치', { ...valid, status: 0 }],
    ['취약점 발견 종료와 정보 수준 보고서 불일치', { ...valid, stdout: JSON.stringify(infoOnly) }]
  ]
  for (const [label, result] of failures) assert.throws(() => parseAuditResult(result), label)
})
