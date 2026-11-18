import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { evaluateAuditReport, parseAuditResult } from './lib/dependency-audit.mjs'

const projectRoot = fileURLToPath(new URL('../', import.meta.url))

function notice(level, message) {
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escaped = message.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A')
    console.log(`::${level}::${escaped}`)
  } else {
    console.log(`${level === 'error' ? '오류' : '경고'}: ${message}`)
  }
}

try {
  const npmCli = process.env.npm_execpath
  if (!npmCli) throw new Error('npm run audit:dependencies로 실행해야 합니다.')

  const policy = JSON.parse(readFileSync(new URL('../.github/dependency-audit-exceptions.json', import.meta.url), 'utf8'))
  // 취약점 데이터 수집은 npm이, 제한된 예외와 간접 원인 판정은 순수 모듈이 담당한다.
  const result = spawnSync(process.execPath, [
    npmCli, 'audit', '--json', '--audit-level=low',
    '--include=dev', '--include=optional', '--include=peer',
  ], {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  })
  const report = parseAuditResult(result)
  const { allowed, blocked, usedExceptions } = evaluateAuditReport(report, {
    exceptions: policy.exceptions,
    now: Date.now(),
  })

  console.log(`의존성 감사 결과: 보고 ${allowed.length + blocked.length}개, 임시 허용 ${allowed.length}개, 차단 ${blocked.length}개`)
  for (const exception of usedExceptions) {
    notice('warning', `${exception.advisory} (${exception.package}) 임시 허용. 만료: ${exception.expiresAt}. ${exception.reason} ${exception.issue}`)
  }
  if (allowed.length) console.log(`임시 허용된 영향 패키지: ${allowed.map(item => item.name).join(', ')}`)
  for (const item of blocked) notice('error', `${item.name}: ${item.reason}`)
  if (blocked.length) process.exitCode = 1
} catch (error) {
  notice('error', `의존성 취약점 검사를 완료하지 못했습니다: ${error.message}`)
  process.exitCode = 1
}
