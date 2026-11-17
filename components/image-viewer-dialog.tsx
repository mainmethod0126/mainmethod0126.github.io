"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import styles from "./image-viewer-dialog.module.css";

type ImageViewerDialogProps = {
  src: string;
  alt: string;
  onClose: () => void;
};

type ImageState =
  | { src: string; status: "loading" | "error" }
  | { src: string; status: "ready"; width: number; height: number };

const MIN_ZOOM_PERCENT = 25;
const MAX_ZOOM_PERCENT = 400;
const ZOOM_STEP_PERCENT = 25;

/** 원본 이미지의 크기, 배율, 스크롤과 모달 수명을 관리한다. */
export function ImageViewerDialog({ src, alt, onClose }: ImageViewerDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const mountedRef = useRef(false);
  const pendingCenterRef = useRef<{ x: number; y: number } | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [imageState, setImageState] = useState<ImageState>({
    src,
    status: "loading",
  });
  const readyImage =
    imageState.src === src && imageState.status === "ready" ? imageState : null;
  const hasError = imageState.src === src && imageState.status === "error";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const opener = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const bodyStyle = document.body.style;
    const previousOverflow = bodyStyle.getPropertyValue("overflow");
    const previousPriority = bodyStyle.getPropertyPriority("overflow");

    mountedRef.current = true;
    dialog.showModal();
    bodyStyle.setProperty("overflow", "hidden");
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      mountedRef.current = false;
      if (dialog.open) dialog.close();
      if (previousOverflow) {
        bodyStyle.setProperty("overflow", previousOverflow, previousPriority);
      } else {
        bodyStyle.removeProperty("overflow");
      }
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);

  useLayoutEffect(() => {
    setZoomPercent(100);
    pendingCenterRef.current = null;
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    }
  }, [src]);

  useLayoutEffect(() => {
    const center = pendingCenterRef.current;
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!center || !viewport || !image || !readyImage) return;

    pendingCenterRef.current = null;
    const viewportBounds = viewport.getBoundingClientRect();
    const imageBounds = image.getBoundingClientRect();
    // 실제 이미지 크기가 바뀐 뒤 같은 원본 지점을 화면 중심에 유지한다.
    viewport.scrollLeft = Math.max(0,
      viewport.scrollLeft + imageBounds.left + imageBounds.width * center.x
        - viewportBounds.left - viewport.clientLeft - viewport.clientWidth / 2,
    );
    viewport.scrollTop = Math.max(0,
      viewport.scrollTop + imageBounds.top + imageBounds.height * center.y
        - viewportBounds.top - viewport.clientTop - viewport.clientHeight / 2,
    );
  }, [zoomPercent, readyImage]);

  function changeZoom(nextPercent: number, button: HTMLButtonElement) {
    if (!readyImage) return;
    const next = Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, nextPercent));
    if (next === zoomPercent) return;

    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (viewport && image) {
      const viewportBounds = viewport.getBoundingClientRect();
      const imageBounds = image.getBoundingClientRect();
      if (imageBounds.width > 0 && imageBounds.height > 0) {
        pendingCenterRef.current = {
          x: Math.min(1, Math.max(0,
            (viewportBounds.left + viewport.clientLeft + viewport.clientWidth / 2
              - imageBounds.left) / imageBounds.width,
          )),
          y: Math.min(1, Math.max(0,
            (viewportBounds.top + viewport.clientTop + viewport.clientHeight / 2
              - imageBounds.top) / imageBounds.height,
          )),
        };
      }
    }

    if ((next === MIN_ZOOM_PERCENT || next === MAX_ZOOM_PERCENT)
      && document.activeElement === button) {
      // 조작한 버튼이 비활성화되더라도 키보드 포커스를 대화상자 안에 유지한다.
      resetButtonRef.current?.focus({ preventScroll: true });
    }
    setZoomPercent(next);
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-pagefind-ignore="all"
      onClose={(event) => {
        // 개발 환경의 Effect 재실행으로 닫았다 다시 연 대화상자는 유지한다.
        if (mountedRef.current && !event.currentTarget.open) onClose();
      }}
    >
      <div className={styles.layout}>
        <header className={styles.toolbar}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>이미지 보기</h2>
            <p id={descriptionId} className={styles.description} title={alt || undefined}>
              <span className={styles.alt}>{alt || "이미지"}</span>
              {readyImage && (
                <span className={styles.dimensions}>
                  {readyImage.width} × {readyImage.height}px
                </span>
              )}
            </p>
          </div>

          <div className={styles.controls} role="group" aria-label="이미지 배율">
            <button
              type="button"
              className={styles.button}
              aria-label="축소"
              disabled={!readyImage || zoomPercent === MIN_ZOOM_PERCENT}
              onClick={(event) => changeZoom(zoomPercent - ZOOM_STEP_PERCENT, event.currentTarget)}
            >−</button>
            <output className={styles.zoomPercent} aria-label="배율" aria-live="polite" aria-atomic="true">
              {zoomPercent}%
            </output>
            <button
              type="button"
              className={styles.button}
              aria-label="확대"
              disabled={!readyImage || zoomPercent === MAX_ZOOM_PERCENT}
              onClick={(event) => changeZoom(zoomPercent + ZOOM_STEP_PERCENT, event.currentTarget)}
            >+</button>
            <button
              ref={resetButtonRef}
              type="button"
              className={styles.button}
              disabled={!readyImage}
              onClick={(event) => changeZoom(100, event.currentTarget)}
            >원본 크기</button>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            className={`${styles.button} ${styles.closeButton}`}
            onClick={() => dialogRef.current?.close()}
          >닫기</button>
        </header>

        <div
          ref={viewportRef}
          className={styles.viewport}
          role="region"
          aria-label="이미지 스크롤 영역"
          aria-busy={!readyImage && !hasError}
          tabIndex={readyImage ? 0 : -1}
        >
          <div className={styles.stage}>
            <img
              key={src}
              ref={imageRef}
              src={src}
              alt={alt}
              className={styles.image}
              draggable={false}
              loading="eager"
              style={readyImage ? {
                width: readyImage.width * zoomPercent / 100,
                height: readyImage.height * zoomPercent / 100,
              } : { display: "none" }}
              onLoad={(event) => {
                const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
                setImageState(width > 0 && height > 0
                  ? { src, status: "ready", width, height }
                  : { src, status: "error" });
              }}
              onError={() => setImageState({ src, status: "error" })}
            />
            {!readyImage && (
              <p className={styles.message} role={hasError ? "alert" : "status"}>
                {hasError ? "이미지를 불러오지 못했습니다." : "이미지를 불러오는 중입니다."}
              </p>
            )}
          </div>
        </div>
      </div>
    </dialog>
  );
}
