// 댓글(Cusdis) 설정의 단일 출처 (#51).
// - CUSDIS_APP_ID: https://cusdis.com 가입 → 사이트 등록 후 발급되는 App ID(공개 값).
//   여기만 채우면 글 상세에 댓글 섹션이 활성화된다. null이면 섹션 자체를 렌더하지 않는다.
// - 댓글은 로그인 없이(익명) 작성 가능하고, 대시보드에서 승인해야 공개된다.
export const CUSDIS_APP_ID: string | null = null;

export const CUSDIS_HOST = "https://cusdis.com";

export const COMMENTS_ENABLED = CUSDIS_APP_ID !== null;
