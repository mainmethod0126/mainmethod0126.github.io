const severities = ['info', 'low', 'moderate', 'high', 'critical']
const advisoryPattern = /^GHSA-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}-[23456789cfghjmpqrvwx]{4}$/
const timestampPattern = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

function requireValue(condition, message) {
  if (!condition) throw new Error(message)
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isText(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function isHttpsUrl(value) {
  if (!isText(value) || value !== value.trim()) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

function expirationTime(value) {
  requireValue(typeof value === 'string' && timestampPattern.test(value), '예외 만료일에는 ISO 날짜와 시간대가 필요합니다.')
  const time = Date.parse(value)
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  requireValue(Number.isFinite(time) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10), '예외 만료일이 유효하지 않습니다.')
  return time
}

function validateExceptions(exceptions) {
  requireValue(Array.isArray(exceptions), '예외 정책은 배열이어야 합니다.')
  const policies = new Map()
  for (const entry of exceptions) {
    requireValue(isRecord(entry), '예외 정책 항목이 유효하지 않습니다.')
    requireValue(typeof entry.advisory === 'string' && advisoryPattern.test(entry.advisory), '예외 정책의 GHSA 식별자가 유효하지 않습니다.')
    requireValue(isText(entry.package) && entry.package === entry.package.trim(), '예외 정책의 패키지 이름이 유효하지 않습니다.')
    requireValue(isText(entry.reason), '예외 정책에는 승인 사유가 필요합니다.')
    requireValue(isHttpsUrl(entry.issue), '예외 정책에는 HTTPS Issue URL이 필요합니다.')
    requireValue(Array.isArray(entry.references) && entry.references.length > 0 && entry.references.every(isHttpsUrl), '예외 정책에는 HTTPS 참고 URL 배열이 필요합니다.')
    const expiresAt = expirationTime(entry.expiresAt)
    const key = `${entry.package}\0https://github.com/advisories/${entry.advisory}`
    requireValue(!policies.has(key), `중복된 예외 정책입니다: ${entry.advisory} (${entry.package})`)
    policies.set(key, { entry, expiresAt })
  }
  return policies
}

// 프로세스 실행은 호출자가 담당한다. 실행 실패를 정상 감사 결과로 해석하지 않는다.
export function parseAuditResult({ status, signal, error, stdout }) {
  requireValue(error == null, 'npm audit 실행 오류가 있습니다.')
  requireValue(signal == null, 'npm audit 프로세스가 신호로 종료되었습니다.')
  requireValue(status === 0 || status === 1, `npm audit 종료 상태가 유효하지 않습니다: ${status}`)
  requireValue(typeof stdout === 'string', 'npm audit 출력은 JSON 문자열이어야 합니다.')
  let report
  try {
    report = JSON.parse(stdout)
  } catch {
    throw new Error('npm audit 출력을 JSON으로 해석할 수 없습니다.')
  }
  requireValue(!isRecord(report) || !Object.hasOwn(report, 'error'), 'npm audit 보고서에 실행 오류가 있습니다.')
  requireValue(status !== 1 || report?.metadata?.vulnerabilities?.total !== 0, 'npm audit 종료 상태와 취약점 개수가 일치하지 않습니다.')
  // 호출자의 --audit-level=low 계약을 확인한다. 집계 구조는 evaluateAuditReport가 검증한다.
  const actionableCounts = ['low', 'moderate', 'high', 'critical']
    .map(severity => report?.metadata?.vulnerabilities?.[severity])
  requireValue(status !== 0 || !actionableCounts.some(count => typeof count === 'number' && count > 0), 'npm audit 종료 상태 0이 --audit-level=low 검사 결과와 일치하지 않습니다.')
  requireValue(status !== 1 || !actionableCounts.every(count => count === 0), 'npm audit 종료 상태 1이 --audit-level=low 검사 결과와 일치하지 않습니다.')
  return report
}

// 보고서·정책·명시적 시각만 판정한다. 파일, 네트워크, 현재 시각에는 접근하지 않는다.
// 잘못된 입력에는 오류를 던지고, 유효한 보고서의 미승인 권고는 blocked로 반환한다.
export function evaluateAuditReport(report, { exceptions, now }) {
  requireValue(typeof now === 'number' && Number.isFinite(now) && Number.isFinite(new Date(now).getTime()), '판정 시각은 유효한 epoch milliseconds여야 합니다.')
  const policies = validateExceptions(exceptions)
  requireValue(isRecord(report) && report.auditReportVersion === 2, 'npm audit JSON v2 보고서가 필요합니다.')
  requireValue(!Object.hasOwn(report, 'error'), 'npm audit 보고서에 실행 오류가 있습니다.')
  requireValue(isRecord(report.vulnerabilities), '취약점 목록이 유효하지 않습니다.')
  requireValue(isRecord(report.metadata) && isRecord(report.metadata.vulnerabilities), '취약점 집계가 없습니다.')

  const vulnerabilities = new Map(Object.entries(report.vulnerabilities))
  const counts = Object.fromEntries(severities.map(severity => [severity, 0]))
  for (const [name, entry] of vulnerabilities) {
    requireValue(isText(name) && isRecord(entry) && entry.name === name, `취약점 패키지 이름이 일치하지 않습니다: ${name}`)
    requireValue(severities.includes(entry.severity), `취약점 심각도가 유효하지 않습니다: ${name}`)
    requireValue(Array.isArray(entry.via) && entry.via.length > 0, `취약점 원인 목록이 없습니다: ${name}`)
    counts[entry.severity] += 1
  }
  for (const severity of [...severities, 'total']) {
    const reported = report.metadata.vulnerabilities[severity]
    const expected = severity === 'total' ? vulnerabilities.size : counts[severity]
    requireValue(Number.isSafeInteger(reported) && reported >= 0 && reported === expected, `취약점 집계가 일치하지 않습니다: ${severity}`)
  }

  const resolved = new Map()
  const visiting = new Set()
  function resolveAdvisories(name) {
    if (resolved.has(name)) return resolved.get(name)
    requireValue(vulnerabilities.has(name), `취약점 원인 참조가 없습니다: ${name}`)
    requireValue(!visiting.has(name), `취약점 원인 참조가 순환합니다: ${name}`)
    visiting.add(name)
    const roots = new Map()
    for (const via of vulnerabilities.get(name).via) {
      if (typeof via === 'string') {
        requireValue(isText(via), `취약점 원인 참조가 비어 있습니다: ${name}`)
        for (const [key, advisory] of resolveAdvisories(via)) roots.set(key, advisory)
      } else {
        requireValue(isRecord(via) && via.name === name && via.dependency === name, `권고의 패키지 이름이 일치하지 않습니다: ${name}`)
        requireValue(isHttpsUrl(via.url) && severities.includes(via.severity), `권고 URL 또는 심각도가 유효하지 않습니다: ${name}`)
        roots.set(`${name}\0${via.url}`, via)
      }
    }
    visiting.delete(name)
    resolved.set(name, roots)
    return roots
  }

  const allowed = []
  const blocked = []
  const used = new Set()
  for (const name of vulnerabilities.keys()) {
    const advisories = new Set()
    const matched = []
    const reasons = []
    for (const [key, advisory] of resolveAdvisories(name)) {
      const policy = policies.get(key)
      if (!policy) {
        reasons.push(`승인된 예외가 없습니다: ${advisory.url} (${advisory.name})`)
      } else if (now >= policy.expiresAt) {
        reasons.push(`예외가 만료되었습니다: ${policy.entry.advisory} (${policy.entry.expiresAt})`)
      } else {
        advisories.add(policy.entry.advisory)
        matched.push(policy.entry)
      }
    }
    if (reasons.length > 0) {
      blocked.push({ name, reason: reasons.join('; ') })
    } else {
      allowed.push({ name, advisories: [...advisories].sort() })
      for (const entry of matched) used.add(entry)
    }
  }
  return { allowed, blocked, usedExceptions: exceptions.filter(entry => used.has(entry)) }
}
