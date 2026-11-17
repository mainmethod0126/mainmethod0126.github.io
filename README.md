# 신우섭의 도서관 v2

[블로그](https://mainmethod0126.github.io)는 Next.js와 Nextra로 만든 기술 문서 사이트입니다. 문서와 이미지를 저장소에서 관리하고, 정적 파일로 빌드하여 GitHub Pages에 배포합니다.

## 개발 환경

Node.js 24와 npm을 사용합니다. GitHub Actions도 Node.js 24를 사용합니다. 의존성은 `package-lock.json`으로 고정하며, 다른 패키지 관리자의 잠금 파일을 함께 관리하지 않습니다.

```bash
npm ci
npm run dev
```

개발 서버 주소는 `http://localhost:3000`입니다. 문서 본문은 `content`에서 수정합니다.

## 파일 구조와 책임

| 경로 | 책임 |
| --- | --- |
| `content/` | Markdown·MDX 문서, 상대 경로 이미지, 문서 메뉴 순서 |
| `content/**/_meta.js` | 해당 디렉터리의 문서 제목과 메뉴 구성 |
| `app/layout.tsx` | 공통 화면, 탐색 메뉴, 사이트 메타데이터 |
| `app/[[...mdxPath]]/page.tsx` | 문서 경로를 정적 페이지로 변환 |
| `mdx-components.tsx` | Nextra 기본 Markdown 컴포넌트와 본문 이미지 연결 |
| `components/document-image.tsx` | Nextra 본문 이미지 표시와 링크 없는 이미지의 보기 동작 |
| `components/image-viewer-dialog.tsx` | 원본 이미지 로드, 배율, 스크롤과 대화상자 수명 관리 |
| `components/` | 이미지 보기, 댓글과 탐색 메뉴 제목 등 화면 기능 |
| `lib/` | 문서 URL, 원문 문장 부호, 목차 표시 계약 |
| `public/` | 주소를 유지해야 하는 공개 파일과 검색 포털 소유권 확인 파일 |
| `next.config.mjs` | Nextra 연결과 정적 내보내기 설정 |
| `scripts/generate-sitemap.mjs` | 현재 문서 경로로 사이트맵 생성 |
| `scripts/verify-content.mjs` | 원본 문서와 정적 출력 비교, 선택적 이전 기준 비교 |
| `.github/workflows/nextjs.yml` | 의존성 검사, 빌드, 문서 검증, GitHub Pages 배포 |

`content/index.mdx`는 `/`에 대응합니다. 나머지 문서는 `content` 아래의 상대 경로를 URL로 사용합니다. 기존 문서의 파일 이름과 디렉터리를 바꾸면 공개 주소와 댓글 연결이 달라질 수 있으므로 유지합니다. 문서 옆의 `images` 디렉터리도 상대 위치를 유지합니다.

## 빌드와 검증

```bash
npm audit --audit-level=low
npm run typecheck
npm run verify:dependencies
npm run build
npm run verify:content
```

`npm run build`는 정적 페이지를 `out`에 생성합니다. 빌드 후 Pagefind 검색 색인과 사이트맵을 생성합니다. 별도의 `next export` 명령은 사용하지 않습니다.

`npm run verify:content`는 문서 보존 조건과 정적 출력 결과를 검사합니다. 프레임워크나 의존성을 변경할 때는 문서 본문, 이미지, 기존 URL의 보존을 함께 확인합니다. 브라우저에서는 문서 탐색, 검색, 코드 블록, 이미지 원본 크기와 배율 조절, 댓글 연결을 확인합니다.

본문 이미지는 Nextra의 공개 `Image` 컴포넌트로 표시합니다. 이미지 클릭·Enter·모바일 터치로 이미지 보기 대화상자를 열면 매번 원본 크기인 100%로 시작합니다. 원본 주소에서 읽은 `naturalWidth`·`naturalHeight`를 CSS 픽셀 크기로 사용하며, 화면에 맞춰 자동으로 늘리거나 줄이지 않습니다. 화면보다 큰 이미지는 대화상자 안에서 가로·세로로 스크롤합니다.

확대·축소 버튼은 25~400% 범위에서 25% 단위로 배율을 조절합니다. 현재 배율을 표시하고 원본 크기 버튼으로 100%로 돌아갈 수 있습니다. Escape 키나 닫기 버튼으로 닫으면 이미지 열기 버튼으로 초점이 복귀합니다. 작성자가 이미지에 링크를 지정하면 대화상자를 열지 않고 해당 링크를 따릅니다. 기본 Nextra 링크는 유지합니다.

`ImageViewerDialog`가 원본 크기와 배율을 소유합니다. Nextra `ImageZoom`과 `react-medium-image-zoom`의 화면 맞춤 배율이나 내부 스타일은 사용하지 않습니다. 대화상자는 열 때만 생성하여 정적 본문의 이미지 개수와 검색 색인을 유지합니다.

Pagefind 검색 색인은 정적 빌드 결과를 사용합니다. 검색 검증은 검색 색인을 포함한 `out`을 정적 웹 서버로 제공한 환경에서 수행합니다. `npm run dev`만 실행한 상태와 정적 배포 결과를 구분합니다.

의존성 취약점 검사는 개발 의존성도 포함합니다. 취약점이 발견되면 원인 의존성을 확인하고 수정한 뒤 검증 명령을 다시 실행합니다. 버전만 강제로 교체하거나 검사 실패를 무시하지 않습니다.

Nextra 4.6.1의 간접 의존성에 남은 보안 수정은 `package.json`의 `overrides`로 관리합니다. Nextra 하위의 KaTeX는 `0.19.1`, `@ts-morph/common`이 사용하는 minimatch는 `11.0.9`로 한정합니다. 상위 패키지가 수정 버전을 정식 의존성으로 채택하면 해당 설정을 제거하고 설치, 취약점 검사, 수식·파일 선택·문서 렌더링 검증을 다시 수행합니다. TypeScript는 Nextra의 Twoslash가 지원하는 `6.0.3`을 사용합니다.

`patches/nextra-theme-docs+4.6.1.patch`는 [Nextra 원본 수정 #4990](https://github.com/shuding/nextra/pull/4990)을 배포된 코드에 적용합니다. `Layout`의 전체 속성을 검증한 뒤 `children`을 테마 설정에서 제외하여 최신 Zod와 호환되게 합니다. 블로그의 의존성 유지보수 범위에서 관리하는 패치이며, `npm ci`의 `postinstall`에서 적용 실패 시 설치를 중단합니다. 공식 수정이 포함된 Nextra 배포판으로 갱신하면 패치를 제거하고 깨끗한 재설치와 전체 빌드·문서 검증을 수행합니다.

동일한 패키지 버전의 패치 내용을 변경했다면 이전 `.next` 빌드 캐시를 제거하고 검증합니다. 문장 부호 자동 변환은 꺼 두며, 목차에는 비대화형 텍스트만 전달해 본문 이미지 링크와 목차 링크가 중첩되지 않게 합니다. 댓글은 공식 Giscus React 컴포넌트가 관리하며 기존 문서 경로로 연결합니다.

과거 문서의 내용은 평상시 검사에서 고정하지 않습니다. 프레임워크 이전 시 저장한 기준 자료가 있다면 `node scripts/verify-content.mjs --baseline <기준자료디렉터리> --compare-ref <기준커밋>`으로 문서와 이미지 바이트, 메뉴, 제목 고정 링크, 문단·목록·표를 추가로 비교할 수 있습니다.

## GitHub Pages 배포

`main` 대상 Pull Request에서는 의존성 취약점 검사, TypeScript 검사, 정적 빌드, 문서 검증을 실행합니다. Pull Request에서는 배포하지 않습니다.

`main`에 푸시하거나 `main`에서 작업 흐름을 수동 실행하면 같은 검증을 통과한 `out`을 GitHub Pages에 배포합니다. `public`의 소유권 확인 파일은 빌드 과정에서 `out`으로 복사됩니다. 배포 권한은 배포 작업에만 부여합니다.

GitHub Actions는 확인한 릴리스의 전체 커밋 해시로 고정합니다. 의존성 또는 GitHub Actions를 갱신할 때는 공식 변경 사항과 호환성을 확인하고 Pull Request의 검증 결과를 확인합니다.

## 원본과 라이선스

이 저장소는 Shu Ding의 [Nextra Docs Template](https://github.com/shuding/nextra-docs-template)에서 시작했습니다. 현재 구성은 [Nextra 공식 문서](https://nextra.site/docs)와 [Next.js 공식 문서](https://nextjs.org/docs)를 기준으로 관리합니다.

라이선스는 [MIT](LICENSE)입니다.
