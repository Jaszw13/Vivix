/**
 * 動態人格層 — 過場動畫 registry（P-FIX-0-A）
 *
 * 每個 StylePack.motion.transition 對應一組 framer-motion variant。
 * PageShell / modal / sheet 讀 getMotionForPack() 決定進出場動畫。
 * motionEnabled=false 時，duration 強制 0。
 */
import type { PackTransition } from '@/types/theme';
import { getStylePack } from './stylePacks';

export interface MotionVariant {
  duration: number;
  ease: number[];
  enter: { opacity?: number; y?: number; x?: number; scale?: number; rotate?: number };
  exit: { opacity?: number; y?: number; x?: number; scale?: number; rotate?: number };
}

const EASE_SMOOTH = [0.4, 0, 0.2, 1];
const EASE_SNAPPY = [0.2, 0.8, 0.2, 1];
const EASE_SPRING = [0.34, 1.56, 0.64, 1];
const EASE_BACK = [0.34, 1.56, 0.64, 1];

export const PACK_MOTION: Record<PackTransition, MotionVariant> = {
  smooth: { duration: 0.22, ease: EASE_SMOOTH, enter: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 8 } },
  snappy: { duration: 0.12, ease: EASE_SNAPPY, enter: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } },
  flip: { duration: 0.3, ease: EASE_BACK, enter: { opacity: 1, rotate: 0 }, exit: { opacity: 0, rotate: -8 } },
  spring: { duration: 0.35, ease: EASE_SPRING, enter: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 } },
  instant: { duration: 0.01, ease: EASE_SNAPPY, enter: { opacity: 1 }, exit: { opacity: 0 } },
  'slow-fade': { duration: 0.45, ease: EASE_SMOOTH, enter: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 0 } },
  elastic: { duration: 0.4, ease: EASE_BACK, enter: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } },
  stamp: { duration: 0.18, ease: EASE_SNAPPY, enter: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 12 } },
  bouncy: { duration: 0.45, ease: EASE_BACK, enter: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -16 } },
  jelly: { duration: 0.5, ease: EASE_BACK, enter: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.85 } },
};

/** motionEnabled=false 時回傳 duration=0 的靜態 variant */
export function getMotion(transition: PackTransition, motionEnabled: boolean): MotionVariant {
  const v = PACK_MOTION[transition];
  return motionEnabled ? v : { ...v, duration: 0, enter: { opacity: 1 }, exit: { opacity: 0 } };
}

/** packId → 該 pack 的 motion variant（含 null 保護與 motionEnabled 關閉邏輯） */
export function getMotionForPack(packId: string, motionEnabled: boolean): MotionVariant {
  const pack = getStylePack(packId);
  const transition: PackTransition = pack?.motion.transition ?? 'smooth';
  return getMotion(transition, motionEnabled);
}

/** MotionVariant → framer-motion variants
 *  `enter` 是「進場後」的目標態、`exit` 是「離場／起始」態，
 *  所以 hidden 必須對應 exit，visible 對應 enter。 */
export function toFramerVariants(v: MotionVariant) {
  return {
    hidden: { opacity: 0, ...v.exit },
    visible: { opacity: 1, ...v.enter },
  };
}

/** MotionVariant → framer-motion transition */
export function toFramerTransition(v: MotionVariant) {
  return { duration: v.duration, ease: v.ease };
}
