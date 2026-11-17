"use client";

import type { ImageProps } from "next/image";
import { Image } from "nextra/components";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImageViewerDialog } from "./image-viewer-dialog";
import styles from "./document-image.module.css";

function originalImageSource(src: ImageProps["src"]): string {
  if (typeof src === "string") return src;
  return "default" in src ? src.default.src : src.src;
}

/** 본문 렌더링은 Nextra에 맡기고 링크 없는 이미지의 보기 동작만 연결한다. */
export function DocumentImage({ src, alt, ...props }: ImageProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [canOpen, setCanOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const originalSrc = originalImageSource(src);
  const closeViewer = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    const updateAvailability = () => {
      setCanOpen(
        image.complete &&
          image.naturalWidth > 0 &&
          !image.closest("a, button"),
      );
    };

    updateAvailability();
    image.addEventListener("load", updateAvailability);
    image.addEventListener("error", updateAvailability);
    return () => {
      image.removeEventListener("load", updateAvailability);
      image.removeEventListener("error", updateAvailability);
    };
  }, [src]);

  const label = alt
    ? `이미지 원본 크기로 보기: ${alt}`
    : "이미지 원본 크기로 보기";

  return (
    <>
      <span className={styles.root}>
        <Image {...props} src={src} alt={alt} ref={imageRef} />
        {canOpen && originalSrc && (
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            title={label}
            data-pagefind-ignore="all"
            onClick={() => {
              triggerRef.current?.focus({ preventScroll: true });
              setIsOpen(true);
            }}
          />
        )}
      </span>
      {isOpen && originalSrc &&
        createPortal(
          <ImageViewerDialog
            key={originalSrc}
            src={originalSrc}
            alt={alt}
            onClose={closeViewer}
          />,
          document.body,
        )}
    </>
  );
}
