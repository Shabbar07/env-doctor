/**
 * Levenshtein distance between two strings
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp: number[][] = [];

  for (let i = 0; i <= a.length; i++) {
    dp[i] = [i];
  }

  for (let j = 0; j <= b.length; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost, // substitution
      );
    }
  }

  return dp[a.length][b.length];
}

/**
 * Given a variable name and a collection of candidate variable names,
 * returns all candidates with Levenshtein distance <= maxDistance, sorted by closeness.
 */
export function findTypoSuggestions(
  targetVar: string,
  candidates: Iterable<string>,
  maxDistance = 2,
): string[] {
  const matches: { name: string; dist: number }[] = [];

  for (const candidate of candidates) {
    if (candidate === targetVar) continue;
    const dist = levenshtein(targetVar, candidate);
    if (dist <= maxDistance) {
      matches.push({ name: candidate, dist });
    }
  }

  matches.sort((a, b) => a.dist - b.dist || a.name.localeCompare(b.name));
  return matches.map((m) => m.name);
}
