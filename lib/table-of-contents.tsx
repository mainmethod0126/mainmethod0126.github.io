import type { Heading } from "nextra";
import { Children, isValidElement, type ReactNode } from "react";

function navigationText(value: ReactNode): string {
  return Children.toArray(value)
    .map((node) => {
      if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") {
        return String(node);
      }
      if (isValidElement<{ alt?: unknown; children?: ReactNode }>(node)) {
        return typeof node.props.alt === "string"
          ? node.props.alt
          : navigationText(node.props.children);
      }
      return "";
    })
    .join("");
}

/** 목차 링크의 이름만 텍스트로 만들고 본문 제목과 고정 링크 식별자는 보존한다. */
export function createTextTableOfContents(toc: readonly Heading[]): Heading[] {
  return toc.map((heading) => ({
    ...heading,
    value: navigationText(heading.value),
  }));
}
