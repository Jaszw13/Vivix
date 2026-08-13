import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X, Star } from 'lucide-react';
import { useTrialStore } from '@/store/trialStore';
import { OVERLAY_SCRIM } from '@/data/theme';

interface FeedbackModalProps {
  show: boolean;
}

export function FeedbackModal({ show }: FeedbackModalProps) {
  const { submitFeedback, dismissFeedback } = useTrialStore();
  const [frequency, setFrequency] = useState('');
  const [favorite, setFavorite] = useState('');
  const [issue, setIssue] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const buildMessage = () => {
    const lines = [
      '📱 IRONPULSE 反饋',
      '',
      `⭐ 評分：${rating}/5`,
      `🔢 使用頻率：${frequency || '未填'}`,
      `❤️ 最喜歡：${favorite || '未填'}`,
      `⚠️ 遇到問題：${issue || '無'}`,
      `💡 建議：${suggestion || '無'}`,
    ];
    return encodeURIComponent(lines.join('\n'));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    submitFeedback();
    // 打開 WhatsApp，帶預填訊息（無指定號碼，讓用戶選擇聯絡人）
    const message = buildMessage();
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handleDismiss = () => {
    dismissFeedback();
  };

  return (
    <AnimatePresence>
      {show && !submitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: OVERLAY_SCRIM.background }}
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[480px] bg-bg-primary rounded-t-card max-h-[90vh] overflow-y-auto"
          >
            {/* 拖把 */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* 標題 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-accent" />
                <h2 className="font-display text-lg tracking-wide uppercase text-text-primary">
                  使用反饋
                </h2>
              </div>
              <button
                onClick={handleDismiss}
                className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              <p className="text-xs text-text-secondary">
                感謝使用 IRONPULSE！花 30 秒告訴我們你的想法，幫助我們做得更好。
              </p>

              {/* 評分 */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-text-secondary mb-2 block">
                  整體評分
                </label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setRating(n)}
                      className="w-10 h-10 flex items-center justify-center"
                    >
                      <Star
                        size={22}
                        className={n <= rating ? 'text-accent' : 'text-border'}
                        fill={n <= rating ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* 使用頻率 */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-text-secondary mb-2 block">
                  這週用了幾次？
                </label>
                <div className="flex gap-2">
                  {['0', '1-2', '3-4', '5+'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setFrequency(opt)}
                      className={`flex-1 h-10 rounded-button text-xs font-bold transition-all ${
                        frequency === opt
                          ? 'bg-accent text-bg-primary'
                          : 'bg-bg-secondary text-text-secondary border border-border'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              {/* 最喜歡的功能 */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-text-secondary mb-2 block">
                  最喜歡的功能？
                </label>
                <input
                  type="text"
                  value={favorite}
                  onChange={(e) => setFavorite(e.target.value)}
                  placeholder="例如：組間休息計時器"
                  className="w-full h-11 px-3 bg-bg-secondary rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              {/* 遇到的問題 */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-text-secondary mb-2 block">
                  遇到什麼問題？
                </label>
                <textarea
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  placeholder="描述遇到的 bug 或不順的地方"
                  rows={2}
                  className="w-full px-3 py-2.5 bg-bg-secondary rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* 建議 */}
              <div>
                <label className="text-[10px] uppercase tracking-widest text-text-secondary mb-2 block">
                  有什麼建議？
                </label>
                <textarea
                  value={suggestion}
                  onChange={(e) => setSuggestion(e.target.value)}
                  placeholder="想加的功能、改進的想法"
                  rows={2}
                  className="w-full px-3 py-2.5 bg-bg-secondary rounded-button border border-border text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-accent focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* 提交 */}
              <button
                onClick={handleSubmit}
                disabled={rating === 0}
                className="w-full h-12 bg-accent text-bg-primary rounded-button text-sm font-bold uppercase tracking-wider disabled:opacity-40 disabled:pointer-events-none active:translate-y-px transition-all flex items-center justify-center gap-2"
              >
                <Send size={16} />
                送出反饋
              </button>
              <p className="text-[10px] text-text-secondary/60 text-center">
                送出後將打開 WhatsApp，請選擇發送給開發者
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 送出成功 */}
      <AnimatePresence>
        {show && submitted && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            style={{ background: OVERLAY_SCRIM.background }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-bg-card rounded-card p-6 max-w-sm w-full text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-accent-soft flex items-center justify-center mb-4">
                <Send size={24} className="text-accent" />
              </div>
              <h3 className="font-display text-xl tracking-wide uppercase text-text-primary mb-2">
                感謝反饋
              </h3>
              <p className="text-xs text-text-secondary mb-4">
                已為你打開 WhatsApp，請選擇聯絡人發送。
                <br />
                若 WhatsApp 未開啟，請手動複製以下訊息：
              </p>
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(decodeURIComponent(buildMessage()));
                }}
                className="text-xs text-accent underline"
              >
                複製反饋訊息
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}
