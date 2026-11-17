"use client";

import Image, { type ImageProps } from "next/image";
import { Link } from "nextra-theme-docs";
import { type ComponentProps, createContext, useContext, useId } from "react";
import styles from "./markdown-image.module.css";

const MarkdownLinkContext = createContext(false);

export function MarkdownLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  const descriptionId = useId();
  // Nextra Anchor는 HTTP(S) 문자열 링크에만 기본 target="_blank"를 적용한다.
  const defaultTarget =
    typeof props.href === "string" && /^https?:\/\//.test(props.href)
      ? "_blank"
      : undefined;
  const target = "target" in props ? props.target : defaultTarget;
  const opensInNewTab = target === "_blank";
  const describedBy = opensInNewTab
    ? [props["aria-describedby"], descriptionId].filter(Boolean).join(" ")
    : props["aria-describedby"];

  return (
    <MarkdownLinkContext.Provider value={true}>
      <Link {...props} aria-describedby={describedBy}>{children}</Link>
      {opensInNewTab && (
        <span id={descriptionId} className="x:sr-only" data-pagefind-ignore="all">새 탭에서 열림</span>
      )}
    </MarkdownLinkContext.Provider>
  );
}

export function MarkdownImage({ src, ...props }: ImageProps) {
  const isInsideLink = useContext(MarkdownLinkContext);
  const image =
    src && typeof src === "object" ? (
      <Image {...props} src={src} />
    ) : (
      <img {...props} src={typeof src === "string" ? src : undefined} />
    );
  const originalUrl =
    typeof src === "string"
      ? src
      : src && ("default" in src ? src.default.src : src.src);

  if (isInsideLink || !originalUrl) {
    return image;
  }

  const actionLabel = "이미지 원본을 새 탭에서 열기";

  return (
    <a
      href={originalUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.originalImageLink}
      title={actionLabel}
      aria-label={props.alt ? `${props.alt}: ${actionLabel}` : actionLabel}
    >
      {image}
    </a>
  );
}
