import Image, { ImageProps } from "next/image";
import { Link } from "nextra-theme-docs";
import { ComponentProps, createContext, useContext } from "react";
import styles from "./markdown-image.module.css";

const MarkdownLinkContext = createContext(false);

export function MarkdownLink({
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <MarkdownLinkContext.Provider value={true}>
      <Link {...props}>{children}</Link>
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
