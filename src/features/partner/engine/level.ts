// 等級 XP 累進表（cumulative_xp）
export const LEVEL_THRESHOLDS: number[] = [
  0,    // Lv.1
  30,   // Lv.2
  80,   // Lv.3
  150,  // Lv.4
  240,  // Lv.5
  350,  // Lv.6
  480,  // Lv.7
  640,  // Lv.8
  820,  // Lv.9
  1020, // Lv.10
];

export const LEVEL_CAP = 10;

export function getLevelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    }
  }
  return Math.min(level, LEVEL_CAP);
}

export function getXpProgress(xp: number): {
  currentLevel: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  progress: number; // 0-1
} {
  const currentLevel = getLevelForXp(xp);
  if (currentLevel >= LEVEL_CAP) {
    return { currentLevel, xpInCurrentLevel: 0, xpForNextLevel: 0, progress: 1 };
  }
  const currentLevelXp = LEVEL_THRESHOLDS[currentLevel - 1];
  const nextLevelXp = LEVEL_THRESHOLDS[currentLevel];
  const xpInCurrentLevel = xp - currentLevelXp;
  const xpForNextLevel = nextLevelXp - currentLevelXp;
  const progress = xpForNextLevel > 0 ? xpInCurrentLevel / xpForNextLevel : 0;
  return { currentLevel, xpInCurrentLevel, xpForNextLevel, progress };
}
