// Check if an item is purchased weekly (6–9 days interval)
export function isWeeklyPattern(dates: Date[]): boolean {
    if (dates.length < 3) return false;

    const gaps: number[] = [];
    for (let i = 0; i < dates.length - 1; i++) {
        const diff =
            (dates[i].getTime() - dates[i + 1].getTime()) /
            (1000 * 60 * 60 * 24);
        gaps.push(diff);
    }

    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;

    return avg >= 6 && avg <= 9;
}

// Check if next weekly purchase is due
export function dueForPurchase(lastPurchase: Date): boolean {
    const diff =
        (Date.now() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 6;
}