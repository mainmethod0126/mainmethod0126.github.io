"use client";

import Giscus from "@giscus/react";
import { usePathname } from "next/navigation";
import { useTheme } from "nextra-theme-docs";

/** 문서 경로별 댓글 연결을 유지하고 프레임 수명 관리는 공식 Giscus 컴포넌트에 맡긴다. */
export function GiscusComments() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  return (
    <section aria-label="댓글" data-pagefind-ignore="all">
      <Giscus
        key={pathname}
        repo="mainmethod0126/mainmethod0126.github.io"
        repoId="R_kgDOKL-MAw"
        category="comments"
        categoryId="DIC_kwDOKL-MA84CejFl"
        mapping="pathname"
        strict="0"
        reactionsEnabled="1"
        emitMetadata="0"
        inputPosition="bottom"
        theme={resolvedTheme || "preferred_color_scheme"}
        lang="ko"
      />
    </section>
  );
}
