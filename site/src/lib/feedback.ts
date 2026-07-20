// 의견 창구 링크의 단일 출처 (#46).
// - FEEDBACK_FORM_URL: 익명 의견 폼(Google Form 등). 폼을 만들면 여기만 채우면
//   글 하단 안내와 푸터 링크가 함께 폼을 가리킨다.
// - null이면 익명 안내 문구는 렌더되지 않고, 푸터 '의견 남기기'는 Discussions로 간다.
export const FEEDBACK_FORM_URL: string | null = null;

export const DISCUSSIONS_URL = "https://github.com/mmyonaa/mcp/discussions";

export const FEEDBACK_URL = FEEDBACK_FORM_URL ?? DISCUSSIONS_URL;
