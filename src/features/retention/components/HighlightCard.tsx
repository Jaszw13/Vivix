import { useRef, useState } from 'react';
import { Camera, Share2, X } from 'lucide-react';
import type { SessionHighlight } from '@/features/retention/highlight';
import { shareHighlightCard } from '@/features/sharing/shareHighlight';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface Props {
  highlight: SessionHighlight;
}

/**
 * P1-3：訓練高光卡（僅自己可見，可分享）。
 * 照片為當次 opt-in，只存在記憶體，不寫 localStorage。
 */
export function HighlightCard({ highlight }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const handlePhoto = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhoto(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await shareHighlightCard(highlight, { photoDataUrl: photo });
      useTelemetryStore.getState().log('highlight_shared', {
        result,
        withPhoto: photo !== null,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="relative overflow-hidden p-4 border-accent/40">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent pointer-events-none" />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-widest text-accent font-bold">
          訓練高光
        </div>

        {photo && (
          <div className="relative mt-3">
            <img
              src={photo}
              alt="本次訓練照片"
              className="w-full h-36 object-cover rounded-card border border-border/40"
            />
            <button
              onClick={() => setPhoto(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center"
              aria-label="移除照片"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <div className="mt-2 text-center">
          <div className="font-display text-lg tracking-wide uppercase text-text-primary">
            {highlight.dayName}
          </div>
          <div className="font-mono text-2xl font-bold text-accent mt-1">
            {highlight.bestSet
              ? highlight.bestSet.weight === 0
                ? `BW × ${highlight.bestSet.reps}`
                : `${highlight.bestSet.weight}kg × ${highlight.bestSet.reps}`
              : '—'}
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            {highlight.bestSet?.exerciseName ?? '今日最佳組'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border/40 text-center">
          <div>
            <div className="font-mono text-sm font-bold text-text-primary">
              {highlight.totalSets}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-text-secondary">
              完成組數
            </div>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-text-primary">
              {(highlight.totalVolume / 1000).toFixed(1)}t
            </div>
            <div className="text-[9px] uppercase tracking-widest text-text-secondary">
              總容量
            </div>
          </div>
          <div>
            <div className="font-mono text-sm font-bold text-text-primary">
              {highlight.newRecordCount}
            </div>
            <div className="text-[9px] uppercase tracking-widest text-text-secondary">
              新紀錄
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] text-text-secondary">
          <span>
            本週 {highlight.weekly.days} / {highlight.weekly.goal} 天
          </span>
          {highlight.volumeDeltaPct !== null && (
            <span className="font-mono">
              總量 {highlight.volumeDeltaPct > 0 ? '+' : ''}
              {highlight.volumeDeltaPct}%
            </span>
          )}
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileRef.current?.click()}
            aria-label={photo ? '更換照片' : '加入照片'}
          >
            <Camera size={16} />
            {photo ? '換照片' : '加照片'}
          </Button>
          <Button size="sm" onClick={handleShare} disabled={busy}>
            <Share2 size={16} />
            {busy ? '生成中…' : '分享高光'}
          </Button>
        </div>
        <p className="text-[10px] text-text-secondary/70 mt-2 leading-snug">
          卡片不含體重與姓名；照片只放在這張卡上，不會上傳或存進 app。
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handlePhoto(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
    </Card>
  );
}
