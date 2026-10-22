import type { AppProps } from "next/app";
import { MarkdownImage, MarkdownLink } from "../components/markdown-image";

const markdownComponents = {
  img: MarkdownImage,
  a: MarkdownLink,
};

export default function App({ Component, pageProps }: AppProps) {
  // Nextra 2의 기본 이미지 컴포넌트보다 페이지의 components 속성이 우선한다.
  return <Component {...pageProps} components={markdownComponents} />;
}
