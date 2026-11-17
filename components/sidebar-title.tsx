import type { PageMapItem } from "nextra";
import type { ReactNode } from "react";

const titleIcons = new Map([
  ["Introduction", "👋"],
  ["My Profile", "🧑🏻‍💻"],
  ["Life Beyond Tech", "☕️"],
  ["projects", "🗄"],
  ["search condition metadata", "🗃"],
  ["hiworks auto attendance", "🗃"],
  ["simple semantic version", "🗃"],
  ["sneaky chat games", "🗃"],
  ["annotation scanner", "🗃"],
  ["오늘의 한식뷔페 메뉴가 궁금하다면? 밥고", "🗃"],
  ...[
    "elasticsearch", "c++", "common", "design patterns", "network", "linux",
    "command", "java", "spring", "webflux", "r2dbc", "jpa", "rdb", "nginx",
    "security", "javascript", "typescript", "nextjs", "nodejs", "vue", "msa",
    "k8s", "docker", "kafka", "jenkins", "serialized data structure", "webRTC",
    "electron", "etc",
  ].map((title): [string, string] => [title, "📒"]),
]);

function sidebarTitle(title: ReactNode, type?: string): ReactNode {
  if (typeof title !== "string" || !title) return title;
  if (type === "separator") {
    return <div style={{ background: "cyan", textAlign: "center" }}>{title}</div>;
  }
  return <>{titleIcons.get(title) || (type === "page" ? "↗️" : "📃")} {title}</>;
}

/** 문서 원본과 제목 메타데이터를 변경하지 않고 탐색에만 표시할 제목을 만든다. */
export function withSidebarTitles(pageMap: PageMapItem[]): PageMapItem[] {
  return pageMap.map((item) => {
    if ("data" in item) {
      return {
        ...item,
        data: Object.fromEntries(
          Object.entries(item.data).map(([name, meta]) => {
            if (typeof meta === "string") {
              return [name, { title: sidebarTitle(meta) }];
            }
            return [name, { ...meta, title: sidebarTitle(meta.title, meta.type) }];
          }),
        ),
      };
    }
    const titledItem = item as PageMapItem & { title?: ReactNode; type?: string };
    return {
      ...item,
      title: sidebarTitle(titledItem.title, titledItem.type),
      ...("children" in item ? { children: withSidebarTitles(item.children) } : {}),
    };
  });
}
