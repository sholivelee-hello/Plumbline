// 100일 1독 통독표. 사용자 제공 데이터에서 1:1로 펼침.
// 각 row가 통독 카드의 한 체크 항목이 된다.

export type BookCode =
  | "창" | "출" | "레" | "민" | "신"
  | "수" | "삿" | "룻" | "삼상" | "삼하"
  | "왕상" | "왕하" | "대상" | "대하" | "스" | "느" | "에"
  | "욥" | "시" | "잠" | "전" | "아"
  | "사" | "렘" | "애" | "겔" | "단"
  | "호" | "욜" | "암" | "옵" | "욘" | "미" | "나" | "합" | "습" | "학" | "슥" | "말"
  | "마" | "막" | "눅" | "요" | "행"
  | "롬" | "고전" | "고후" | "갈" | "엡" | "빌" | "골" | "살전" | "살후"
  | "딤전" | "딤후" | "딛" | "몬" | "히" | "약" | "벧전" | "벧후"
  | "요1" | "요2" | "요3" | "유" | "계";

export const BOOK_FULL_NAME: Record<BookCode, string> = {
  창: "창세기", 출: "출애굽기", 레: "레위기", 민: "민수기", 신: "신명기",
  수: "여호수아", 삿: "사사기", 룻: "룻기", 삼상: "사무엘상", 삼하: "사무엘하",
  왕상: "열왕기상", 왕하: "열왕기하", 대상: "역대상", 대하: "역대하",
  스: "에스라", 느: "느헤미야", 에: "에스더",
  욥: "욥기", 시: "시편", 잠: "잠언", 전: "전도서", 아: "아가",
  사: "이사야", 렘: "예레미야", 애: "예레미야애가", 겔: "에스겔", 단: "다니엘",
  호: "호세아", 욜: "요엘", 암: "아모스", 옵: "오바댜", 욘: "요나",
  미: "미가", 나: "나훔", 합: "하박국", 습: "스바냐", 학: "학개",
  슥: "스가랴", 말: "말라기",
  마: "마태복음", 막: "마가복음", 눅: "누가복음", 요: "요한복음", 행: "사도행전",
  롬: "로마서", 고전: "고린도전서", 고후: "고린도후서", 갈: "갈라디아서",
  엡: "에베소서", 빌: "빌립보서", 골: "골로새서",
  살전: "데살로니가전서", 살후: "데살로니가후서",
  딤전: "디모데전서", 딤후: "디모데후서", 딛: "디도서", 몬: "빌레몬서",
  히: "히브리서", 약: "야고보서", 벧전: "베드로전서", 벧후: "베드로후서",
  요1: "요한1서", 요2: "요한2서", 요3: "요한3서", 유: "유다서", 계: "요한계시록",
};

export const BOOK_TOTAL_CHAPTERS: Record<BookCode, number> = {
  창: 50, 출: 40, 레: 27, 민: 36, 신: 34,
  수: 24, 삿: 21, 룻: 4, 삼상: 31, 삼하: 24,
  왕상: 22, 왕하: 25, 대상: 29, 대하: 36,
  스: 10, 느: 13, 에: 10,
  욥: 42, 시: 150, 잠: 31, 전: 12, 아: 8,
  사: 66, 렘: 52, 애: 5, 겔: 48, 단: 12,
  호: 14, 욜: 3, 암: 9, 옵: 1, 욘: 4,
  미: 7, 나: 3, 합: 3, 습: 3, 학: 2,
  슥: 14, 말: 4,
  마: 28, 막: 16, 눅: 24, 요: 21, 행: 28,
  롬: 16, 고전: 16, 고후: 13, 갈: 6,
  엡: 6, 빌: 4, 골: 4,
  살전: 5, 살후: 3,
  딤전: 6, 딤후: 4, 딛: 3, 몬: 1,
  히: 13, 약: 5, 벧전: 5, 벧후: 3,
  요1: 5, 요2: 1, 요3: 1, 유: 1, 계: 22,
};

export type Segment =
  | { kind: "range"; book: BookCode; from: number; to: number }
  | { kind: "single"; book: BookCode; chapter: number }
  | { kind: "whole"; book: BookCode }
  | { kind: "verses"; book: BookCode; chapter: number; verseFrom: number; verseTo: number };

const range = (book: BookCode, from: number, to: number): Segment => ({ kind: "range", book, from, to });
const single = (book: BookCode, chapter: number): Segment => ({ kind: "single", book, chapter });
const whole = (book: BookCode): Segment => ({ kind: "whole", book });
const verses = (book: BookCode, chapter: number, verseFrom: number, verseTo: number): Segment =>
  ({ kind: "verses", book, chapter, verseFrom, verseTo });

// 1일차 ~ 100일차 (DAY_PLAN[0] = 1일차)
export const DAY_PLAN: ReadonlyArray<ReadonlyArray<Segment>> = [
  /*  1 */ [range("창", 1, 10), range("시", 1, 3)],
  /*  2 */ [range("창", 11, 20), range("시", 4, 5)],
  /*  3 */ [range("창", 21, 30), range("시", 6, 7)],
  /*  4 */ [range("창", 31, 40), range("시", 8, 9)],
  /*  5 */ [range("창", 41, 50), single("시", 10)],
  /*  6 */ [range("출", 1, 10), range("시", 11, 12)],
  /*  7 */ [range("출", 11, 20), range("시", 13, 14)],
  /*  8 */ [range("출", 21, 30), range("시", 15, 16)],
  /*  9 */ [range("출", 31, 40), single("시", 17)],
  /* 10 */ [range("레", 1, 10), single("시", 18)],
  /* 11 */ [range("레", 11, 18), range("시", 19, 21)],
  /* 12 */ [range("레", 19, 27), single("시", 22)],
  /* 13 */ [range("민", 1, 8), range("시", 23, 24)],
  /* 14 */ [range("민", 9, 18), range("시", 25, 26)],
  /* 15 */ [range("민", 19, 28), range("시", 27, 28)],
  /* 16 */ [range("민", 29, 36), range("신", 1, 2), range("시", 29, 30)],
  /* 17 */ [range("신", 3, 12), single("시", 31)],
  /* 18 */ [range("신", 13, 25), range("시", 32, 33)],
  /* 19 */ [range("신", 26, 34), single("시", 34)],
  /* 20 */ [range("수", 1, 12), single("시", 35)],
  /* 21 */ [range("수", 13, 24), single("시", 36)],
  /* 22 */ [range("삿", 1, 11), single("시", 37)],
  /* 23 */ [range("삿", 12, 21), single("시", 38)],
  /* 24 */ [whole("룻"), range("삼상", 1, 7), single("시", 39)],
  /* 25 */ [range("삼상", 8, 16), single("시", 40)],
  /* 26 */ [range("삼상", 17, 25), single("시", 41)],
  /* 27 */ [range("삼상", 26, 31), range("삼하", 1, 6), range("시", 42, 43)],
  /* 28 */ [range("삼하", 7, 16), single("시", 44)],
  /* 29 */ [range("삼하", 17, 24), single("시", 45)],
  /* 30 */ [range("왕상", 1, 7), range("시", 46, 47)],
  /* 31 */ [range("왕상", 8, 14), range("시", 48, 49)],
  /* 32 */ [range("왕상", 15, 22), single("시", 50)],
  /* 33 */ [range("왕하", 1, 8), single("시", 51)],
  /* 34 */ [range("왕하", 9, 17), range("시", 52, 53)],
  /* 35 */ [range("왕하", 18, 25), range("시", 54, 55)],
  /* 36 */ [range("대상", 1, 9), single("시", 56)],
  /* 37 */ [range("대상", 10, 19), range("시", 57, 58)],
  /* 38 */ [range("대상", 20, 29), single("시", 59)],
  /* 39 */ [range("대하", 1, 10), range("시", 60, 61)],
  /* 40 */ [range("대하", 11, 20), range("시", 62, 63)],
  /* 41 */ [range("대하", 21, 29), range("시", 64, 65)],
  /* 42 */ [range("대하", 30, 36), range("시", 66, 67)],
  /* 43 */ [range("스", 1, 10), single("시", 68)],
  /* 44 */ [range("느", 1, 13), single("시", 69)],
  /* 45 */ [range("에", 1, 10), range("시", 70, 71)],
  /* 46 */ [range("욥", 1, 15), single("시", 72)],
  /* 47 */ [range("욥", 16, 30), single("시", 73)],
  /* 48 */ [range("욥", 31, 42), single("시", 74)],
  /* 49 */ [range("전", 1, 12), single("시", 75)],
  /* 50 */ [range("아", 1, 8), range("시", 76, 77)],
  /* 51 */ [range("사", 1, 12), verses("시", 78, 1, 42)],
  /* 52 */ [range("사", 13, 25), verses("시", 78, 43, 72)],
  /* 53 */ [range("사", 26, 35), single("시", 79)],
  /* 54 */ [range("사", 36, 45), single("시", 80)],
  /* 55 */ [range("사", 46, 56), range("시", 81, 82)],
  /* 56 */ [range("사", 57, 66), single("시", 83)],
  /* 57 */ [range("렘", 1, 9), range("시", 84, 85)],
  /* 58 */ [range("렘", 10, 19), single("시", 86)],
  /* 59 */ [range("렘", 20, 29), single("시", 87)],
  /* 60 */ [range("렘", 30, 38), single("시", 88)],
  /* 61 */ [range("렘", 39, 49), single("시", 89)],
  /* 62 */ [range("렘", 50, 52), whole("애"), single("시", 90)],
  /* 63 */ [range("겔", 1, 12), single("시", 91)],
  /* 64 */ [range("겔", 13, 20), range("시", 92, 93)],
  /* 65 */ [range("겔", 21, 30), range("시", 94, 95)],
  /* 66 */ [range("겔", 31, 39), range("시", 96, 97)],
  /* 67 */ [range("겔", 40, 48), single("시", 98)],
  /* 68 */ [range("단", 1, 12), single("시", 99)],
  /* 69 */ [range("호", 1, 14), range("시", 100, 102)],
  /* 70 */ [whole("욜"), whole("암"), range("시", 103, 104)],
  /* 71 */ [whole("옵"), whole("욘"), whole("미"), whole("나"), single("시", 105)],
  /* 72 */ [whole("합"), whole("습"), whole("학"), range("시", 106, 107)],
  /* 73 */ [whole("슥"), whole("말"), single("시", 108)],
  /* 74 */ [range("마", 1, 10), range("시", 109, 110)],
  /* 75 */ [range("마", 11, 20), single("시", 111)],
  /* 76 */ [range("마", 21, 28), single("시", 112)],
  /* 77 */ [range("막", 1, 9), single("시", 113)],
  /* 78 */ [range("막", 10, 16), range("시", 114, 116)],
  /* 79 */ [range("눅", 1, 8), range("시", 117, 118)],
  /* 80 */ [range("눅", 9, 16), verses("시", 119, 1, 40)],
  /* 81 */ [range("눅", 17, 24), verses("시", 119, 41, 88)],
  /* 82 */ [range("요", 1, 7), verses("시", 119, 89, 136)],
  /* 83 */ [range("요", 8, 14), verses("시", 119, 137, 176)],
  /* 84 */ [range("요", 15, 21), range("시", 120, 122)],
  /* 85 */ [range("행", 1, 9), range("시", 123, 124)],
  /* 86 */ [range("행", 10, 18), single("시", 125)],
  /* 87 */ [range("행", 19, 28), single("시", 126)],
  /* 88 */ [range("롬", 1, 8), range("시", 127, 128)],
  /* 89 */ [range("롬", 9, 16), range("시", 129, 131)],
  /* 90 */ [range("고전", 1, 9), range("시", 132, 134)],
  /* 91 */ [range("고전", 10, 16), range("시", 135, 136)],
  /* 92 */ [whole("고후"), range("시", 137, 138)],
  /* 93 */ [whole("갈"), whole("엡"), single("시", 139)],
  /* 94 */ [whole("빌"), whole("골"), whole("살전"), whole("살후"), single("시", 140)],
  /* 95 */ [whole("딤전"), whole("딤후"), whole("딛"), whole("몬"), single("시", 141)],
  /* 96 */ [range("히", 1, 13), single("시", 142)],
  /* 97 */ [whole("약"), whole("벧전"), whole("벧후"), range("시", 143, 144)],
  /* 98 */ [whole("요1"), whole("요2"), whole("요3"), whole("유"), range("시", 145, 146)],
  /* 99 */ [range("계", 1, 11), range("시", 147, 148)],
  /*100 */ [range("계", 12, 22), range("시", 149, 150)],
];

export interface ReadingRow {
  ord: number;
  label: string;
}

export function expandDay(day: number): ReadingRow[] {
  if (day < 1 || day > 100) return [];
  const segments = DAY_PLAN[day - 1];
  const labels: string[] = [];
  for (const seg of segments) {
    const name = BOOK_FULL_NAME[seg.book];
    if (seg.kind === "range") {
      for (let c = seg.from; c <= seg.to; c++) {
        labels.push(`${name} ${c}`);
      }
    } else if (seg.kind === "single") {
      labels.push(`${name} ${seg.chapter}`);
    } else if (seg.kind === "whole") {
      const total = BOOK_TOTAL_CHAPTERS[seg.book];
      if (total === 1) {
        labels.push(name);
      } else {
        for (let c = 1; c <= total; c++) {
          labels.push(`${name} ${c}`);
        }
      }
    } else {
      labels.push(`${name} ${seg.chapter}:${seg.verseFrom}-${seg.verseTo}`);
    }
  }
  return labels.map((label, i) => ({ ord: i, label }));
}

export const READING_CYCLE_LENGTH = 100;
export const MEDITATION_CYCLE_LENGTH = 150;
