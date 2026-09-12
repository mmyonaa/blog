// 소제목 앵커를 ASCII로 만든다.
//
// Astro 기본 슬러거(github-slugger)는 한글 제목을 그대로 id로 써서
// `#ecb--가장-단순하지만-위험한-모드` 같은 앵커가 나온다. 동작엔 문제없지만
// 링크를 복사하면 퍼센트 인코딩으로 길어져 공유하기 지저분하다.
//
// 규칙: 제목 앞머리의 영문/숫자 토큰을 슬러그로 쓰고("ECB — 가장 …" → `ecb`),
// 없으면 문서 내 소제목 순번으로 대체한다(`section-4`).
//
// Astro는 사용자 rehype 플러그인을 rehypeHeadingIds보다 **먼저** 돌리고,
// id가 이미 있으면 그대로 두므로(@astrojs/markdown-remark의 rehype-collect-headings)
// 여기서 심은 id가 본문 앵커와 getHeadings()의 slug 양쪽에 그대로 쓰인다.
// 의존성을 늘리지 않으려고 unist-util-visit 대신 직접 순회한다.

const TEXT_NODES = new Set(["text", "raw"]);

/** 제목 노드의 텍스트만 이어 붙인다. */
function textOf(node) {
  if (TEXT_NODES.has(node.type)) return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

/** 앞머리 ASCII 토큰 → 슬러그. 한글 등 비ASCII를 만나면 거기서 끊는다. */
function leadingAsciiSlug(text) {
  const head = text.match(/^[\x20-\x7e]+/);
  if (!head) return "";
  return head[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function rehypeAsciiHeadingIds() {
  return (tree) => {
    const used = new Set();
    let n = 0;

    const walk = (node) => {
      if (node.type === "element" && /^h[1-6]$/.test(node.tagName)) {
        n += 1;
        node.properties = node.properties || {};
        if (typeof node.properties.id !== "string") {
          let id = leadingAsciiSlug(textOf(node)) || `section-${n}`;
          if (used.has(id)) {
            let i = 2;
            while (used.has(`${id}-${i}`)) i += 1;
            id = `${id}-${i}`;
          }
          used.add(id);
          node.properties.id = id;
        }
      }
      for (const child of node.children ?? []) walk(child);
    };

    walk(tree);
  };
}
