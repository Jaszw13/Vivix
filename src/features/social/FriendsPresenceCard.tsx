import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useSocialStore } from '@/features/social/socialStore';

/**
 * P2B：首頁好友 presence 卡。
 * 只顯示「本週 N 位朋友有練」+ 各好友週進度；無 Feed、無按讚、無排行。
 */
export function FriendsPresenceCard() {
  const enabled = useSocialStore((s) => s.enabled);
  const friends = useSocialStore((s) => s.friends);
  const refreshFriends = useSocialStore((s) => s.refreshFriends);

  useEffect(() => {
    if (enabled) void refreshFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  if (!enabled || friends.length === 0) return null;

  const trainedThisWeek = friends.filter((f) => f.trainingDays > 0).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="mb-4"
    >
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-button bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
            <Users size={16} />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-text-secondary">
              好友動態
            </div>
            <div className="text-sm font-bold text-text-primary">
              本週 {trainedThisWeek} 位朋友有練
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {friends.map((f) => (
            <span
              key={f.userId}
              className={
                f.trainingDays > 0
                  ? 'text-[11px] px-2 py-1 rounded-button bg-accent/10 text-accent border border-accent/20'
                  : 'text-[11px] px-2 py-1 rounded-button bg-bg-secondary text-text-secondary border border-border/40'
              }
            >
              {f.displayName} {f.trainingDays}/{f.weeklyGoal}
              {f.trainedToday && ' · 今天'}
            </span>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
