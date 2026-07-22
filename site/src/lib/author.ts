/**
 * 만든 사람 정보 단일 출처. Footer의 About 컬럼과 /about/ 페이지가 함께 쓴다.
 * 이메일은 봇 스크래핑을 피해 평문으로 두지 않고, user/domain으로 쪼갠 뒤
 * 클라이언트 스크립트가 mailto로 조립한다(Footer·About 공통).
 */
export const AUTHOR = {
  name: "Hyona Lim",
  avatar: "https://github.com/mmyonaa.png",
  portfolio: "https://mmyonaa.github.io",
  portfolioLabel: "mmyonaa.github.io",
  github: "https://github.com/mmyonaa",
  linkedin: "https://www.linkedin.com/in/hyona-lim-a3a626319/",
  mailUser: "apddfhsajrwk",
  mailDomain: "gmail.com",
} as const;

/** 프로젝트 소스 저장소. */
export const REPO_URL = "https://github.com/mmyonaa/mcp";
