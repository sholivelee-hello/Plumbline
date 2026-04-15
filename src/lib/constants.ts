// 1인 전용 앱 - 고정 user_id
// 배포 환경에서는 NEXT_PUBLIC_USER_ID 환경변수로 오버라이드 가능
export const FIXED_USER_ID =
  process.env.NEXT_PUBLIC_USER_ID ?? "00000000-0000-0000-0000-000000000001";
