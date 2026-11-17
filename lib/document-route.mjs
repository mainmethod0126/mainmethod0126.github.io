/**
 * 기존 URL의 쉼표 등 경로 문자를 유지하고 URL 구분자만 이스케이프한다.
 * @param {string} route
 */
export function encodeDocumentRoute(route) {
  return encodeURI(route).replaceAll('?', '%3F').replaceAll('#', '%23')
}
