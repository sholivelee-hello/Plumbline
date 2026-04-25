# Plumbline — 인프라 & 배포 컨텍스트

> 미래 세션의 Claude가 이 프로젝트를 다룰 때 빠르게 상황을 파악하기 위한 메모.

## 프로젝트 개요

- **이름**: plumbline
- **프레임워크**: Next.js 15 (App Router) + React 19
- **백엔드**: Supabase (DB + Auth — `NEXT-SESSION.md` 기준 auth는 제거 예정)
- **PWA**: `@serwist/next`
- **차트**: recharts
- **테스트**: vitest

## Vercel 배포 정보

- **Vercel scope**: `shinhee-s-projects` (personal account)
- **Project name**: `plumbline`
- **Project ID**: `prj_P7wpq8Tw1xpVlvp2ivsM0S0DV1wc`
- **Org/Team ID**: `team_qkGp8oiF2rZWf9v0dBYJJfg1`
- **Production URL**: https://plumbline-nine.vercel.app
- **Node 런타임**: 24.x
- **연결 방식**: **CLI 배포** (Git repository 미연결 — 자동 배포 안 됨)
- **로컬 링크 파일**: `.vercel/project.json` (gitignore 처리됨)

## 환경변수 (Vercel에 등록되어 있음)

`.env.local` 에 pull되어 있음 (gitignore 처리됨):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `VERCEL_OIDC_TOKEN` (CLI가 자동 생성)

> ⚠️ `.env.local`은 절대 커밋하지 말 것.

## 코드 수정 → 재배포 워크플로우

이 프로젝트는 **Git 연동이 안 되어 있어서** 푸시로 자동 배포되지 않음. 모든 배포는 CLI에서 수동으로 트리거해야 함.

```bash
# 1) (선택) 로컬에서 빌드 검증
npm run build

# 2) Preview 배포 (먼저 미리보기 URL로 검증 권장)
vercel

# 3) 문제 없으면 Production 배포
vercel --prod
```

배포 후 도메인 확인:
```bash
vercel ls           # 최근 배포 목록
vercel inspect <url>   # 특정 배포 상세
```

## 환경변수 동기화

Vercel 대시보드/다른 PC에서 환경변수가 바뀌었을 때:
```bash
vercel env pull .env.local       # development 환경 pull (기본)
vercel env pull .env.production --environment=production
vercel env add NEW_VAR           # 새 변수 추가 (모든 환경 묻고 입력)
vercel env ls                    # 등록된 변수 목록
```

## 향후 개선 — Git 연동 (권장)

현재는 CLI에서 사람이 매번 `vercel --prod` 쳐야 배포됨. GitHub에 레포 만들고 Vercel과 연결하면:

- `git push` → 자동 production 배포
- PR 생성 → preview URL 자동 발급
- 롤백/이력 관리 용이

설정 절차 (실행 시점에 결정):

```bash
git init
git add .
git commit -m "initial"
gh repo create plumbline --private --source=. --push   # 또는 수동 push
# 그 다음 Vercel 대시보드 → Settings → Git → Connect Git Repository
```

> 주의: `.gitignore`가 이미 Vercel CLI에 의해 `.env.local`, `.vercel/`을 포함하도록 업데이트됨. `git init` 후 첫 commit 전에 반드시 확인.

## Vercel CLI 명령 치트시트

| 작업 | 명령 |
|---|---|
| 로그인 | `vercel login` |
| 프로젝트 연결 | `vercel link` |
| Preview 배포 | `vercel` |
| Production 배포 | `vercel --prod` |
| 빌드 로그 | `vercel logs <url>` |
| 환경변수 pull | `vercel env pull .env.local` |
| 배포 목록 | `vercel ls` |
| 프로젝트 정보 | `vercel project ls` |

## Vercel MCP (Claude Code)

`/mcp`에 vercel 플러그인이 떠 있지만 **이 사용자 계정에 대한 접근 권한이 없음** (모든 호출 403 Forbidden). 따라서 Claude는 MCP 대신 **Vercel CLI**를 직접 쓰는 것을 우선해야 함.

CLI는 `~/Library/Application Support/com.vercel.cli/auth.json` 토큰 기반으로 동작하므로, `vercel login` 한 번 했으면 이 머신에서는 그대로 사용 가능.

## 작업 시 주의

- `NEXT-SESSION.md`에 큰 UX 개편 계획(Phase 1~6) 정리되어 있음 — 작업 착수 전 확인.
- 상세 계획은 `.omc/plans/plumbline-ux-overhaul.md` 참조 (있다면).
- 모바일 퍼스트(PWA), 외부 차트 라이브러리 지양(SVG/CSS 직접), 44px 터치 타겟 유지.
