import React, { useEffect } from "react";
import { useRouter } from "next/router";
import { DocsThemeConfig } from "nextra-theme-docs";

const GiscusComments = () => {
  const router = useRouter();

  useEffect(() => {
    const scriptId = "giscus-script";
    const existingScript = document.getElementById(scriptId);

    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.setAttribute("data-repo", "mainmethod0126/mainmethod0126.github.io");
    script.setAttribute("data-repo-id", "R_kgDOKL-MAw");
    script.setAttribute("data-category", "comments");
    script.setAttribute("data-category-id", "DIC_kwDOKL-MA84CejFl");
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", "preferred_color_scheme");
    script.setAttribute("data-lang", "ko");
    script.crossOrigin = "anonymous";

    document.body.appendChild(script);
  }, [router.asPath]); // 페이지 경로가 변경될 때마다 스크립트 재로드

  return null;
};

const config: DocsThemeConfig = {
  main({ children }) {
    return (
      <div className="content-wrapper">
        {children}
        <div className="giscus">
          <GiscusComments />
        </div>
      </div>
    );
  },
  logo: <span>😸신우섭의 도서관 v2</span>,
  project: {
    link: "https://github.com/mainmethod0126",
  },
  chat: {
    link: "https://discord.com",
  },
  docsRepositoryBase:
    "https://github.com/mainmethod0126/mainmethod0126.github.io",
  footer: {
    text: "📧 mainmethod0126@gmail.com",
  },
  sidebar: {
    defaultMenuCollapseLevel: 1,
    titleComponent({ title, type }) {
      if (type === "separator") {
        return (
          <div style={{ background: "cyan", textAlign: "center" }}>{title}</div>
        );
      }
      if (title === "Introduction") {
        return <>👋 {title}</>;
      }
      if (title === "My Profile") {
        return <>🧑🏻‍💻 {title}</>;
      }
      if (title === "projects") {
        return <>🗄 {title}</>;
      }
      if (title === "search condition metadata") {
        return <>🗃 {title}</>;
      }
      if (title === "hiworks auto attendance") {
        return <>🗃 {title}</>;
      }
      if (title === "simple semantic version") {
        return <>🗃 {title}</>;
      }
      if (title === "sneaky chat games") {
        return <>🗃 {title}</>;
      }
      if (title === "annotation scanner") {
        return <>🗃 {title}</>;
      }
      if (title === "elasticsearch") {
        return <>📒 {title}</>;
      }
      if (title === "c++") {
        return <>📒 {title}</>;
      }
      if (title === "common") {
        return <>📒 {title}</>;
      }
      if (title === "network") {
        return <>📒 {title}</>;
      }
      if (title === "linux") {
        return <>📒 {title}</>;
      }
      if (title === "command") {
        return <>📒 {title}</>;
      }
      if (title === "java") {
        return <>📒 {title}</>;
      }
      if (title === "spring") {
        return <>📒 {title}</>;
      }
      if (title === "webflux") {
        return <>📒 {title}</>;
      }
      if (title === "r2dbc") {
        return <>📒 {title}</>;
      }
      if (title === "jpa") {
        return <>📒 {title}</>;
      }
      if (title === "rdb") {
        return <>📒 {title}</>;
      }
      if (title === "nginx") {
        return <>📒 {title}</>;
      }
      if (title === "security") {
        return <>📒 {title}</>;
      }
      if (title === "vue") {
        return <>📒 {title}</>;
      }
      if (title === "msa") {
        return <>📒 {title}</>;
      }
      if (title === "k8s") {
        return <>📒 {title}</>;
      }
      if (title === "docker") {
        return <>📒 {title}</>;
      }
      if (title === "kafka") {
        return <>📒 {title}</>;
      }
      if (title === "serialized data structure") {
        return <>📒 {title}</>;
      }
      if (title === "webRTC") {
        return <>📒 {title}</>;
      }
      if (title === "electron") {
        return <>📒 {title}</>;
      }
      if (title === "etc") {
        return <>📒 {title}</>;
      }
      if (type === "page") {
        return <>↗️ {title}</>;
      }
      return <>📃 {title}</>;
    },
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s - 신우섭의 도서관 v2",
    };
  },
};

export default config;
