const parseDate = (dStr: any) => {
    if (!dStr || typeof dStr !== 'string') return dStr;
    const trimmed = dStr.trim();
    const dmyMatch = trimmed.match(/^(\d{1,2})[\s\-\/](\d{1,2})[\s\-\/](\d{2,4})$/);
    if (dmyMatch) {
      const [_, d, m, y] = dmyMatch;
      const fullYear = y.length === 2 ? `20${y}` : y;
      return `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return trimmed;
  };

console.log("Parsing '02-02-2026':", parseDate('02-02-2026'));
console.log("Parsing '03-02-2026':", parseDate('03-02-2026'));
console.log("Parsing '2-12-2026':", parseDate('2-12-2026'));
console.log("Parsing '02-12-2026':", parseDate('02-12-2026'));
console.log("Parsing '12-02-2026':", parseDate('12-02-2026'));
