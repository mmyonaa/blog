import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SECTIONS, type SectionDef, type SectionId } from "./topics.js";

const SECTION_IDS = Object.keys(SECTIONS) as SectionId[];

/**
 * 심화도(depth) 티어별 목표 분량 밴드.
 * LLM이 주제 성격에 맞춰 티어를 고르고, 아래 밴드를 목표로 본문 길이를 잡는다.
 */
const DEPTH_BANDS = {
  quick: { label: "quick", range: "600~900자", min: 600, hint: "개념 한입 · 짧은 정리" },
  standard: { label: "standard", range: "1200~1600자", min: 1200, hint: "기본 · 개념 + 예제" },
  deep: { label: "deep", range: "2000~2800자", min: 2000, hint: "구현/튜토리얼 · 단계별 심화" },
  epic: { label: "epic", range: "4000~7000자", min: 4000, hint: "장문 · 심층 가이드/여러 절 구성" },
} as const;

type Depth = keyof typeof DEPTH_BANDS;

// ── daily·research 프롬프트 공유 블록(#17) — 문구의 단일 출처. 수정은 여기서만. ──

const STYLE_RULES: string[] = [
  `   - 톤: 군더더기 없이 명확하게. 과장·클리셰 지양`,
  `   - 이모지 금지: 제목·본문·표 어디에도 이모지를 쓰지 않는다. 표의 지원 여부 표시는 ✅·✖ 같은 이모지 대신 O/△/X 문자로 한다.`,
  `   - 고유명사·용어 표기: 원어(영문)가 표준인 고유명사·표기법·인명 기반 알고리즘·제품·기법 이름은 한글로 음차하지 말고 원어 그대로 쓴다(예: "빅오"→"Big-O", "디피헬만"→"Diffie-Hellman", "제이슨"→"JSON"). 다만 한국에서 관용으로 굳어진 표기(자바스크립트, 파이썬 등)와 일반 기술 용어(프로세스·스레드·트랜잭션·캐시 등)는 그대로 둔다. 태그도 같은 원칙을 따른다.`,
  `   - 사실 접지: 확실치 않은 사실은 단정하지 않는다. 버전 번호·수치·날짜·인용문·통계는 확신이 없으면 쓰지 말고, 일반적 서술로 돌리거나 "대략"·"버전에 따라 다름"처럼 불확실성을 드러낸다. 존재를 모르는 API·명령어·옵션·라이브러리는 지어내지 않는다.`,
  `   - 코드/명령 예제: 자기완결적이고 그대로 실행 가능한 것만 넣는다. 특정 버전에서만 되는 동작이나 미검증 플래그는 넣지 말고, 넣는다면 전제(버전·환경)를 함께 밝힌다. 확신 없는 예제는 빼는 편이 낫다.`,
];

const SELF_REVIEW_ITEMS: string[] = [
  `   1) 사실 접지: 확신 없이 단정한 수치·버전·날짜·인용·통계가 있나? 있으면 불확실성을 드러내거나 뺀다.`,
  `   2) 코드/명령 실행성: 예제가 그대로 실행되나? 존재하지 않는 API·옵션·미검증 플래그는 없나?`,
  `   3) 자기완결성: "다음 글에서…" 같은 예고나, 이 글만으로 안 풀리는 미완결 서술은 없나?`,
  `   4) 중복: 1단계에서 읽은 지난 글과 논지·예제가 겹치지 않나?`,
  `   5) 구조·톤: 도입부가 실질적인가? 과장·클리셰·불필요한 반복은 없나? 소제목 흐름이 자연스러운가? 이모지가 남아 있지 않나?`,
  `   6) 표기: 원어가 표준인 고유명사·표기법·인명 기반 알고리즘을 한글로 음차한 곳(예: "빅오"·"디피헬만")은 없나? 있으면 원어(Big-O·Diffie-Hellman)로 바꾸고, 같은 대상을 글·제목·태그에서 다르게 표기한 흔들림도 통일한다. 관용 표기(자바스크립트 등)와 일반 용어는 예외.`,
];

/** publish_post 인자 규칙 공통 문구 — sec·minChars가 박힌다. */
function publishRuleLines(sec: SectionId, minChars: number): string[] {
  return [
    `   - \`section: "${sec}"\`을 반드시 넘긴다.`,
    `   - \`slug\`에 짧은 영문 kebab-case를 **반드시** 넘긴다(URL 안정용). 시드 주제면 그 \`id\`를 그대로 slug로 쓰고, 자유 주제면 내용을 요약한 영문 슬러그를 만든다. 생략하면 한글 슬러그가 되어 URL이 지저분해지니 절대 비워두지 않는다.`,
    `   - \`tags\`는 3~5개. **글이 실제로 다룬 구체적 소재**를 태그로 삼는다 — 제품·기술·기법·고유명사(예: SAP, MCP, 패치튜즈데이, 제로데이, 요청스머글링)를 우선하고, 그 섹션 글 대부분에 해당하는 포괄어(예: 보안 섹션의 \`보안\`·\`취약점\`)만으로 채우지 않는다. 여러 소재를 묶은 글(다이제스트 등)은 주요 항목마다 그 소재를 대표하는 태그를 하나씩 단다. 다만 기존 글과 같은 대상을 가리키면 1단계에서 읽은 \`blog://posts\`의 표기를 재사용해 흔들림(typescript/ts, mcp/MCP)을 막고, 소문자 영문 또는 한글로 일관되게 쓴다.`,
    `   - 분량 하한을 지키도록 \`minChars: ${minChars}\`를 함께 넘긴다. 본문이 이보다 짧으면 도구가 발행을 거부하니, 그때는 내용을 더 채워 다시 호출한다.`,
  ];
}

/**
 * `write_daily_post` 프롬프트를 서버에 등록한다.
 *
 * "오늘의 글쓰기" 워크플로 전체를 하나의 재사용 프롬프트로 패키징한다.
 * 프롬프트 자체는 아무것도 실행하지 않고, LLM(오케스트레이터/Claude Code)이
 * 리소스·도구를 순서대로 쓰도록 안내하는 메시지만 돌려준다.
 */
export function registerWriteDailyPostPrompt(server: McpServer): void {
  server.registerPrompt(
    "write_daily_post",
    {
      title: "오늘의 블로그 글 쓰기",
      description:
        "지난 글을 참고해 겹치지 않는 주제로 한국어 기술 블로그 한 편을 쓰고 발행하는 워크플로 지침.",
      argsSchema: {
        topic: z
          .string()
          .optional()
          .describe("직접 지정할 주제(생략 시 suggest_topic 후보 중 선택)"),
        depth: z
          .enum(["quick", "standard", "deep", "epic"])
          .optional()
          .describe(
            "글의 심화도(분량 밴드). quick=개념 한입(600~900자), standard=기본(1200~1600자), deep=구현/튜토리얼 심화(2000~2800자), epic=장문(4000~7000자). 생략 시 standard. 주제 성격에 맞춰 조정 가능.",
          ),
        length: z
          .string()
          .optional()
          .describe(
            "목표 글자 수를 직접 지정(대략, 상한 없음). 지정하면 depth 밴드보다 우선한다. 아주 긴 글은 여기에 큰 값(예: 10000)을 넣는다.",
          ),
        section: z
          .string()
          .optional()
          .describe(`어느 섹션의 글인가. ${SECTION_IDS.join(" | ")} 중 하나. 생략 시 mcp.`),
      },
    },
    ({ topic, depth, length, section }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: buildWriteDailyPostText({ topic, depth, length, section }),
          },
        },
      ],
    }),
  );
}

/**
 * write_daily_post 프롬프트의 본문 텍스트를 만든다.
 *
 * MCP 프롬프트 등록과 헤드리스 래퍼(scripts/daily-post.sh)가 공유하는 단일 출처.
 * 헤드리스에서는 MCP 슬래시 프롬프트 발동이 안 되므로(2026-08-10 확인),
 * 래퍼가 print-prompt.ts로 이 텍스트를 뽑아 `claude -p`에 직접 주입한다.
 */
export function buildWriteDailyPostText({
  topic,
  depth,
  length,
  section,
}: {
  topic?: string;
  depth?: Depth;
  length?: string;
  section?: string;
}): string {
  const sec: SectionId = section && (section in SECTIONS) ? (section as SectionId) : "mcp";
      // 자격증 시험 섹션이면 레지스트리가 시험 이름을 준다(하드코딩 대신 SECTIONS 파생).
      const exam = (SECTIONS[sec] as SectionDef).exam;
      const chosen: Depth = depth ?? "standard";
      const explicitLen = length && length.trim() !== "" ? length : null;
      const explicitNum = explicitLen ? Number(explicitLen) : NaN;
      // 직접 지정 분량이 있으면 그 85%를 하한으로, 아니면 티어 하한.
      const minChars = Number.isFinite(explicitNum) ? Math.round(explicitNum * 0.85) : DEPTH_BANDS[chosen].min;
      const lengthLine = explicitLen
        ? `   - 분량: 약 ${explicitLen}자 (직접 지정)`
        : `   - 분량: ${DEPTH_BANDS[chosen].range} (심화도 ${chosen} — 주제가 더 얕거나 깊으면 아래 티어에서 조정)`;
      const depthTable = (Object.keys(DEPTH_BANDS) as Depth[])
        .map((k) => `     · ${DEPTH_BANDS[k].label}: ${DEPTH_BANDS[k].range} (${DEPTH_BANDS[k].hint})`)
        .join("\n");
      const topicLine = topic && topic.trim() !== ""
        ? `4. 주제는 "${topic}"으로 한다. (시드 밖 주제이므로 topicId는 없다)`
        : `4. \`suggest_topic\`을 \`section: "${sec}"\`로 호출해 안 겹치는 후보를 받고, 그중 하나를 고른다. 후보는 영역이 섞여 나오니 최근 글과 다른 영역을 우선 고려한다. 각 후보의 \`[id: ...]\`를 기억해 둔다.`;

      // 섹션별 본문 형식 지침(자격증 섹션은 개념 정리형, 그 외는 개발 튜토리얼형).
      const formatLine = exam
        ? "   - 형식: 개념 정리형 — 정의 → 핵심 원리 → 예시 → 시험에 자주 나오는 포인트. 표나 코드는 도움이 될 때만."
        : "   - 형식: 마크다운. 적절한 소제목과, 가능하면 코드 예제 1개 이상 포함";
      const audienceLine = exam
        ? `   - 대상: ${exam}를 준비하는 사람 (개념을 처음 정리하는 수준)`
        : "   - 대상: 개발을 배우는 독자";

      const text = [
        `당신은 이 블로그의 정기 필자다. 이번 글의 섹션은 "${SECTIONS[sec].label}"(section="${sec}")이다. 아래 순서로 글 한 편을 작성하고 발행하라.`,
        "",
        "1. `blog://posts` 리소스를 읽어 지금까지 발행된 글의 제목·태그를 파악한다(같은 섹션 글과 겹치지 않게).",
        "2. 최근 글과 주제·내용이 겹치지 않도록 한다. 각 글은 그 자체로 완결되게 쓰고, \"다음 글에서는...\" 같은 예고는 넣지 않는다.",
        "3. 필요하면 특정 지난 글을 `blog://posts/{slug}`로 열어 맥락을 확인한다.",
        topicLine,
        "5. 다음 기준으로 본문을 작성한다:",
        "   - 언어: 한국어",
        lengthLine,
        "   - 심화도 티어(참고):",
        depthTable,
        "     (분량은 공백 포함 글자 수 기준. 하한에 걸치지 말고 밴드 중간값을 목표로 한다.)",
        audienceLine,
        formatLine,
        ...STYLE_RULES,
        "6. **발행 전 자기 검토(1회)**: 방금 쓴 초안을 이번엔 필자가 아니라 깐깐한 편집자의 눈으로 다시 읽고, 아래 항목을 점검한다. 걸리는 게 있으면 그 부분을 고쳐 쓴 뒤 발행한다(이 검토→수정은 한 번만 돈다. 완벽을 좇아 반복하지 않는다).",
        ...SELF_REVIEW_ITEMS,
        "7. `publish_post` 도구로 발행한다. `title`, `body`(프론트매터 제외한 본문), `tags`, 필요시 `description`을 채운다. `date`는 생략하면 오늘로 설정된다.",
        ...publishRuleLines(sec, minChars),
        "   - suggest_topic 후보에서 고른 주제라면 그 후보의 `id`를 `topicId`로 꼭 넘긴다(중복 재제안 방지). 시드 밖 주제면 생략한다.",
        "8. 발행 결과(파일명)를 사람에게 한 줄로 보고한다.",
      ].join("\n");

  return text;
}

/**
 * `write_research_post` 프롬프트(#17)를 서버에 등록한다.
 *
 * 웹 리서치(search_web/read_url) 기반 글쓰기 워크플로. 핵심 가드레일:
 * 다중 소스(3+) 정독, 교차검증(2+ 일치만 단정), 출처 기재(읽은 것만),
 * 부가가치(요약 나열 금지), 표절 금지(항상 재서술). 스타일·검토·발행 규칙은
 * write_daily_post와 공유 블록(STYLE_RULES 등)으로 단일 출처를 유지한다.
 */
export function registerWriteResearchPostPrompt(server: McpServer): void {
  server.registerPrompt(
    "write_research_post",
    {
      title: "리서치 종합 글 쓰기 (Mode R)",
      description:
        "웹 검색·출처 정독·교차검증을 거쳐 시사성 글 한 편을 쓰고 발행하는 워크플로 지침. 출처는 sources 메타로 기록된다.",
      argsSchema: {
        topic: z
          .string()
          .optional()
          .describe("리서치 주제(생략 시 search_web으로 최근 소식에서 직접 발굴)"),
        section: z
          .string()
          .optional()
          .describe(`어느 섹션의 글인가. ${SECTION_IDS.join(" | ")} 중 하나. 생략 시 security.`),
        depth: z
          .enum(["quick", "standard", "deep", "epic"])
          .optional()
          .describe("글의 심화도(분량 밴드). 생략 시 standard."),
      },
    },
    ({ topic, section, depth }) => ({
      messages: [
        {
          role: "user" as const,
          content: {
            type: "text" as const,
            text: buildWriteResearchPostText({ topic, section, depth }),
          },
        },
      ],
    }),
  );
}

/** write_research_post 프롬프트 본문 — 등록과 헤드리스 래퍼(print-prompt)가 공유하는 단일 출처. */
export function buildWriteResearchPostText({
  topic,
  section,
  depth,
}: {
  topic?: string;
  section?: string;
  depth?: Depth;
}): string {
  const sec: SectionId = section && (section in SECTIONS) ? (section as SectionId) : "security";
  const secDef: SectionDef = SECTIONS[sec];
  const chosen: Depth = depth ?? "standard";
  const minChars = DEPTH_BANDS[chosen].min;
  // 섹션별 발굴 방향(레지스트리 단일 출처). 없으면 일반 문구만.
  const hintPart = secDef.researchHint ? ` 발굴 방향: ${secDef.researchHint}.` : "";
  const topicLine = topic && topic.trim() !== ""
    ? `2. 리서치 주제는 "${topic}"이다. \`search_web\`으로 이 주제의 최근 소식·배경을 찾는다(뉴스성이면 \`topic: "news"\`). 쿼리는 영문이 결과 폭이 넓다.`
    : `2. 소재 발굴: \`search_web\`(\`topic: "news"\`)으로 최근 소식을 훑고, 독자(개발자)에게 의미 있는 사건 하나를 주제로 확정한다.${hintPart} 쿼리는 영문이 결과 폭이 넓다. 1단계에서 본 기존 글과 겹치는 소재는 피한다.`;

  return [
    `당신은 이 블로그의 리서치 필자다. 웹 리서치를 종합해 "${SECTIONS[sec].label}"(section="${sec}") 섹션 글 한 편을 작성하고 발행하라. 출처를 요약해 나열하는 글이 아니라, 교차검증을 거쳐 재구성한 종합이어야 한다.`,
    "",
    "1. `blog://posts` 리소스를 읽어 기존 글의 제목·태그를 파악한다(중복 회피 + 태그 표기 통일).",
    topicLine,
    "3. **출처 정독(3건 이상)**: 검색 결과 중 유력한 출처를 골라 `read_url`로 본문을 실제로 읽는다. 검색 스니펫만 보고 쓰는 것은 금지 — 읽지 않은 출처는 본문 인용도, sources 기재도 하지 않는다. 1차 출처(공식 공지·저장소·권고문)를 언론 기사보다 우선한다.",
    "4. **교차검증**: 핵심 사실(수치·날짜·버전·영향 범위)은 2개 이상의 출처가 일치할 때만 단정한다. 한 출처에만 있는 정보는 \"~에 따르면\"으로 귀속시켜 쓴다. 출처끼리 어긋나면 어긋난다는 사실 자체를 기술한다.",
    "5. **부가가치**: 원문 번역·요약 나열이 아니라 이 블로그만의 재구성을 만든다 — 타임라인 표, 영향 범위·대응 체크리스트, 개발자 관점의 재설명 중 최소 하나를 넣는다. 출처의 문장을 그대로 옮기지 않는다(표절 금지 — 항상 자기 문장으로 재서술).",
    "6. 다음 기준으로 본문을 작성한다:",
    "   - 언어: 한국어",
    `   - 분량: ${DEPTH_BANDS[chosen].range} (심화도 ${chosen})`,
    "   - 대상: 개발을 배우는 독자",
    "   - 형식: 마크다운. 적절한 소제목 포함",
    ...STYLE_RULES,
    "7. **발행 전 자기 검토(1회)**: 초안을 깐깐한 편집자의 눈으로 다시 읽고 아래를 점검, 걸리면 고쳐 쓴 뒤 발행한다(검토→수정은 한 번만).",
    ...SELF_REVIEW_ITEMS,
    "   7) 출처 대응: 본문의 핵심 주장마다 근거 출처가 있나? sources에 읽지 않은 URL이 섞이지 않았나?",
    "   8) 표절: 출처 문장을 그대로 옮긴 곳이 없나? 있으면 자기 문장으로 재서술한다.",
    "8. `publish_post`로 발행한다. `title`, `body`, `tags`, `description`을 채운다.",
    ...publishRuleLines(sec, minChars),
    "   - `sources`에 **read_url로 실제 읽은** 출처를 `{url, title}`로 넘긴다(2건 미만이면 발행이 거부된다).",
    '   - `generated: "research-synthesis"`를 반드시 넘긴다(리서치 글 투명성 표시 — 글 하단에 참고 자료로 렌더된다).',
    "   - 시드 주제가 아니므로 `topicId`는 생략한다.",
    ...(secDef.researchArea
      ? [`   - \`area: "${secDef.researchArea}"\`를 넘긴다 — 시사 글은 topicId가 없어 세부 분류를 area로 잇는다.`]
      : []),
    "9. 발행 결과(파일명)와 사용한 출처 수를 사람에게 한 줄로 보고한다.",
  ].join("\n");
}
