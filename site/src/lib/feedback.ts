// 의견 창구 설정의 단일 출처 (#46 → #49).
// - WEB3FORMS_ACCESS_KEY: https://web3forms.com 에서 이메일로 발급받는 공개 키.
//   클라이언트 노출용으로 설계된 키라 코드에 넣어도 된다. 여기만 채우면
//   /feedback/ 폼이 활성화되고 글 하단 안내·푸터 링크가 함께 폼 페이지를 가리킨다.
// - null이면 익명 안내 문구는 렌더되지 않고, 진입점은 Discussions로 폴백한다.
export const WEB3FORMS_ACCESS_KEY: string | null =
  "fede36d3-d31e-4c6d-b425-cbe9b8725383";

export const DISCUSSIONS_URL = "https://github.com/mmyonaa/mcp/discussions";

export const FEEDBACK_ENABLED = WEB3FORMS_ACCESS_KEY !== null;

const base = import.meta.env.BASE_URL.replace(/\/$/, "");
export const FEEDBACK_PAGE = `${base}/feedback/`;

// 푸터 등 공통 진입점이 가리킬 곳: 폼이 준비되면 /feedback/, 전까진 Discussions.
export const FEEDBACK_URL = FEEDBACK_ENABLED ? FEEDBACK_PAGE : DISCUSSIONS_URL;
