import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// 1인 전용 앱 - auth 제거됨. 단순 pass-through.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|manifest.json).*)",
  ],
};
