/** 한국 공휴일 유틸리티 */

interface Holiday {
  date: string;
  title: string;
}

export function getKoreanHolidays(year: number): Holiday[] {
  const fixed = [
    { m: 1, d: 1, title: "신정" },
    { m: 3, d: 1, title: "삼일절" },
    { m: 5, d: 5, title: "어린이날" },
    { m: 6, d: 6, title: "현충일" },
    { m: 8, d: 15, title: "광복절" },
    { m: 10, d: 3, title: "개천절" },
    { m: 10, d: 9, title: "한글날" },
    { m: 12, d: 25, title: "크리스마스" },
  ];

  // 음력 공휴일 + 대체공휴일 + 선거일 (연도별)
  const yearly: Record<number, { m: number; d: number; title: string }[]> = {
    2025: [
      { m: 1, d: 28, title: "설날 연휴" }, { m: 1, d: 29, title: "설날" }, { m: 1, d: 30, title: "설날 연휴" },
      { m: 3, d: 3, title: "삼일절 대체공휴일" },
      { m: 5, d: 5, title: "석가탄신일" },
      { m: 5, d: 6, title: "어린이날 대체공휴일" },
      { m: 9, d: 5, title: "추석 연휴" }, { m: 9, d: 6, title: "추석" }, { m: 9, d: 7, title: "추석 연휴" },
      { m: 9, d: 8, title: "추석 대체공휴일" },
    ],
    2026: [
      { m: 2, d: 16, title: "설날 연휴" }, { m: 2, d: 17, title: "설날" }, { m: 2, d: 18, title: "설날 연휴" },
      { m: 3, d: 2, title: "삼일절 대체공휴일" },
      { m: 5, d: 24, title: "석가탄신일" },
      { m: 5, d: 25, title: "석가탄신일 대체공휴일" },
      { m: 6, d: 3, title: "지방선거" },
      { m: 9, d: 24, title: "추석 연휴" }, { m: 9, d: 25, title: "추석" }, { m: 9, d: 26, title: "추석 연휴" },
      { m: 9, d: 28, title: "추석 대체공휴일" },
    ],
    2027: [
      { m: 2, d: 6, title: "설날 연휴" }, { m: 2, d: 7, title: "설날" }, { m: 2, d: 8, title: "설날 연휴" },
      { m: 2, d: 9, title: "설날 대체공휴일" },
      { m: 5, d: 13, title: "석가탄신일" },
      { m: 10, d: 14, title: "추석 연휴" }, { m: 10, d: 15, title: "추석" }, { m: 10, d: 16, title: "추석 연휴" },
      { m: 10, d: 11, title: "한글날 대체공휴일" },
    ],
  };

  const all = [...fixed, ...(yearly[year] || [])];
  return all.map((h) => ({
    date: `${year}-${String(h.m).padStart(2, "0")}-${String(h.d).padStart(2, "0")}T00:00:00`,
    title: h.title,
  }));
}
