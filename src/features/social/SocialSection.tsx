import { useEffect, useState } from 'react';
import { UserPlus, Users, Copy, Check, X, UserMinus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useSocialStore } from '@/features/social/socialStore';
import { isSocialConfigured } from '@/features/social/supabaseClient';
import { useTelemetryStore } from '@/features/partner/stores/telemetryStore';
import { useProfileStore } from '@/store/profileStore';

/**
 * P2B：設定頁的「好友」區塊。
 * - 預設關閉；未設定 Supabase env 時顯示「尚未開放」。
 * - 只同步訓練有無與週目標進度，不同步重量/體重/照片。
 */
export function SocialSection() {
  const social = useSocialStore();
  const profileName = useProfileStore((s) => s.profile.name);
  const [nameInput, setNameInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [addResult, setAddResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (social.enabled) void social.refreshFriends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [social.enabled]);

  if (!isSocialConfigured()) {
    return (
      <Card className="p-4">
        <p className="text-sm text-text-secondary">
          好友功能尚未開放（需要連接後端）。目前所有資料都只存在這台裝置上。
        </p>
      </Card>
    );
  }

  const handleEnable = async () => {
    setBusy(true);
    const ok = await social.enableSocial(nameInput || profileName);
    setBusy(false);
    if (ok) {
      useTelemetryStore.getState().log('social_enabled');
    } else {
      setAddResult('連線失敗，請稍後再試');
    }
  };

  const handleAdd = async () => {
    setBusy(true);
    const result = await social.addFriendByCode(codeInput);
    setBusy(false);
    setCodeInput('');
    const messages: Record<string, string> = {
      ok: '邀請已送出，等對方接受',
      not_found: '找不到這個代碼',
      already: '已經是好友或邀請中',
      self: '不能加自己',
      error: '發生錯誤，請稍後再試',
    };
    setAddResult(messages[result] ?? null);
    if (result === 'ok') useTelemetryStore.getState().log('friend_invite_sent');
  };

  const copyCode = async () => {
    if (!social.friendCode) return;
    try {
      await navigator.clipboard.writeText(social.friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard 不可用就略過 */
    }
  };

  if (!social.enabled) {
    return (
      <Card className="p-4 space-y-3">
        <p className="text-[11px] text-text-secondary leading-snug">
          開啟後可以和好友互相看到「本週有沒有練」。只同步訓練次數與週目標進度，重量、體重、照片都不會上傳。
        </p>
        <input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder={profileName || '顯示給好友的名字'}
          maxLength={20}
          className="w-full h-11 px-3 rounded-button bg-bg-secondary border border-border/60 text-sm text-text-primary"
        />
        <Button size="sm" fullWidth onClick={handleEnable} disabled={busy}>
          {busy ? '連線中…' : '開啟好友功能'}
        </Button>
        {addResult && <p className="text-[11px] text-auxiliary">{addResult}</p>}
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      {/* 我的好友代碼 */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-text-secondary mb-1.5">
          我的好友代碼
        </div>
        <button
          onClick={copyCode}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-button bg-bg-secondary border border-border/60"
        >
          <span className="font-mono text-lg font-bold tracking-[0.3em] text-accent">
            {social.friendCode}
          </span>
          {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} className="text-text-secondary" />}
        </button>
      </div>

      {/* 加好友 */}
      <div className="flex gap-2">
        <input
          type="text"
          value={codeInput}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
          placeholder="輸入對方代碼"
          maxLength={8}
          className="flex-1 h-11 px-3 rounded-button bg-bg-secondary border border-border/60 text-sm font-mono text-text-primary"
        />
        <Button size="sm" onClick={handleAdd} disabled={busy || codeInput.trim().length < 6}>
          <UserPlus size={16} />
          加好友
        </Button>
      </div>
      {addResult && <p className="text-[11px] text-text-secondary">{addResult}</p>}

      {/* 待接受邀請 */}
      {social.incomingRequests.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary">
            好友邀請
          </div>
          {social.incomingRequests.map((req) => (
            <div
              key={req.friendshipId}
              className="flex items-center justify-between px-3 py-2 rounded-button bg-accent/5 border border-accent/20"
            >
              <span className="text-sm text-text-primary">{req.fromName}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => void social.acceptRequest(req.friendshipId)}
                  className="w-8 h-8 rounded-full bg-accent text-bg-primary flex items-center justify-center"
                  aria-label="接受"
                >
                  <Check size={14} />
                </button>
                <button
                  onClick={() => void social.declineRequest(req.friendshipId)}
                  className="w-8 h-8 rounded-full bg-bg-secondary border border-border/60 text-text-secondary flex items-center justify-center"
                  aria-label="拒絕"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 好友列表 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-widest text-text-secondary">
            好友（{social.friends.length}）
          </div>
          {social.outgoingCount > 0 && (
            <span className="text-[10px] text-text-secondary">
              {social.outgoingCount} 個邀請等待中
            </span>
          )}
        </div>
        {social.friends.length === 0 ? (
          <p className="text-[11px] text-text-secondary">
            還沒有好友。把你的代碼分享給朋友，或輸入對方的代碼。
          </p>
        ) : (
          social.friends.map((f) => (
            <div
              key={f.userId}
              className="flex items-center justify-between px-3 py-2 rounded-button bg-bg-secondary/60"
            >
              <div className="flex items-center gap-2">
                <Users size={14} className="text-text-secondary" />
                <span className="text-sm text-text-primary">{f.displayName}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[11px] text-text-secondary">
                  本週 {f.trainingDays}/{f.weeklyGoal}
                  {f.trainedToday && <span className="text-accent ml-1">· 今天有練</span>}
                </span>
                <button
                  onClick={() => void social.removeFriend(f.userId)}
                  className="text-text-secondary hover:text-auxiliary"
                  aria-label="移除好友"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Button variant="ghost" size="sm" fullWidth onClick={() => social.disableSocial()}>
        關閉好友功能
      </Button>
    </Card>
  );
}
