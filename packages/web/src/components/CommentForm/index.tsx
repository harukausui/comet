import { useEffect, useRef, useState } from 'react';
import type {
  CommentStyle,
  CommentSize,
  CommentAnimation,
  SpeedOption,
} from '@comet/shared';
import {
  COMMENT_COLORS,
  COMMENT_SIZES,
  COMMENT_SIZE_OPTIONS,
  SPEED_OPTIONS,
  SPEED_VALUES,
  COMMENT_ANIMATIONS,
} from '@comet/shared';
import { SectionBase } from '../common/SectionBase';
import {
  clearCommentStyleSettings,
  loadCommentStyleSettings,
  saveCommentStyleSettings,
} from '../../comment-style-settings';
import {
  ANIMATION_LABELS,
  COLOR_LABELS,
  SIZE_LABELS,
  SPEED_LABELS,
} from '../../labels';
import './style.scss';

interface CommentFormProps {
  onSubmit: (content: string, style: CommentStyle) => void;
  disabled?: boolean;
}

// 連投による荒れ・過負荷を防ぐための送信クールダウン
const COMMENT_COOLDOWN_MS = 2000;
const DANMAKU_COOLDOWN_MS = 10000;
const PREVIEW_SIZE_SCALE = 0.65;

export function CommentForm({ onSubmit, disabled = false }: CommentFormProps) {
  // 保存済みの職人設定があれば初期値として復元し、「設定を保存する」もONで始める
  const [savedSettings] = useState(() => loadCommentStyleSettings());
  const [content, setContent] = useState('');
  const [color, setColor] = useState<string>(
    savedSettings?.color ?? COMMENT_COLORS.WHITE
  );
  const [size, setSize] = useState<CommentSize>(
    savedSettings?.size ?? 'medium'
  );
  const [speedOption, setSpeedOption] = useState<SpeedOption>(
    savedSettings?.speedOption ?? 'normal'
  );
  const [animation, setAnimation] = useState<CommentAnimation>(
    savedSettings?.animation ?? 'none'
  );
  const [shouldPersist, setShouldPersist] = useState(savedSettings !== null);
  const [isDanmakuMode, setIsDanmakuMode] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // 残り秒数
  const danmakuTimeoutsRef = useRef<number[]>([]);
  const cooldownTimerRef = useRef<number | null>(null);

  // アンマウント時に未発火のタイマーを破棄する
  useEffect(() => {
    return () => {
      danmakuTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      danmakuTimeoutsRef.current = [];
      if (cooldownTimerRef.current !== null) {
        window.clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, []);

  // 「設定を保存する」がONの間は変更のたびに保存し、OFFにしたら保存済みの設定を消す
  useEffect(() => {
    if (shouldPersist) {
      saveCommentStyleSettings({ color, size, speedOption, animation });
    } else {
      clearCommentStyleSettings();
    }
  }, [shouldPersist, color, size, speedOption, animation]);

  const startCooldown = (durationMs: number) => {
    const endAt = Date.now() + durationMs;
    setCooldownRemaining(Math.ceil(durationMs / 1000));

    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current);
    }
    cooldownTimerRef.current = window.setInterval(() => {
      const remaining = endAt - Date.now();
      if (remaining <= 0) {
        if (cooldownTimerRef.current !== null) {
          window.clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
        }
        setCooldownRemaining(0);
      } else {
        setCooldownRemaining(Math.ceil(remaining / 1000));
      }
    }, 250);
  };

  const getRandomColor = (): string => {
    const colors = Object.values(COMMENT_COLORS);
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const getRandomSize = (): CommentSize => {
    return COMMENT_SIZE_OPTIONS[
      Math.floor(Math.random() * COMMENT_SIZE_OPTIONS.length)
    ];
  };

  const getRandomSpeed = (): SpeedOption => {
    return SPEED_OPTIONS[Math.floor(Math.random() * SPEED_OPTIONS.length)];
  };

  const getRandomAnimation = (): CommentAnimation => {
    return COMMENT_ANIMATIONS[
      Math.floor(Math.random() * COMMENT_ANIMATIONS.length)
    ];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (disabled || !content.trim() || cooldownRemaining > 0) {
      return;
    }

    if (isDanmakuMode) {
      // 盛り上げモード: 20個のランダムなスタイルでコメントを送信
      for (let i = 0; i < 20; i++) {
        const randomSpeed = getRandomSpeed();
        const style: CommentStyle = {
          color: getRandomColor(),
          size: getRandomSize(),
          speed: SPEED_VALUES[randomSpeed],
          animation: getRandomAnimation(),
        };
        const timeoutId = window.setTimeout(() => {
          onSubmit(content, style);
        }, i * 100); // 100msずつずらして送信
        danmakuTimeoutsRef.current.push(timeoutId);
      }
    } else {
      // 通常モード: 選択したスタイルで1個送信
      const style: CommentStyle = {
        color,
        size,
        speed: SPEED_VALUES[speedOption],
        animation,
      };
      onSubmit(content, style);
    }

    startCooldown(isDanmakuMode ? DANMAKU_COOLDOWN_MS : COMMENT_COOLDOWN_MS);
    setContent('');

    // 盛り上げモードは1回送信したら自動でOFFに戻す（連続送信は意図的な操作にする）
    if (isDanmakuMode) {
      setIsDanmakuMode(false);
    }
  };

  const previewShadowColor = color === COMMENT_COLORS.WHITE ? '#000' : '#FFF';
  const previewText = content.trim();

  return (
    <SectionBase title="コメントフォーム" className="comment-form-section">
      <form className="comment-form" onSubmit={handleSubmit}>
        <div
          className="comment-preview"
          aria-label="コメントのプレビュー"
          aria-live="polite"
        >
          {isDanmakuMode ? (
            <p className="comment-preview-note">
              コメントを一気に送信して、画面を盛り上げます！
            </p>
          ) : !previewText ? (
            <p className="comment-preview-note">
              コメントを入力するとプレビューできます
            </p>
          ) : (
            <span
              key={`${previewText}-${color}-${size}-${animation}`}
              className="comment-preview-track"
            >
              <span
                className={`comment-preview-text comment-preview-animation-${animation}`}
                style={{
                  color,
                  fontSize: `${COMMENT_SIZES[size] * PREVIEW_SIZE_SCALE}px`,
                  textShadow: `-1px -1px 0 ${previewShadowColor}, 1px -1px 0 ${previewShadowColor}, -1px 1px 0 ${previewShadowColor}, 1px 1px 0 ${previewShadowColor}, 0 0 4px ${previewShadowColor}`,
                }}
              >
                {previewText}
              </span>
            </span>
          )}
        </div>

        {/* 入力してすぐ送れるように、入力欄と送信ボタンを同じ行に置く */}
        <div className="form-group comment-input-row">
          <input
            id="comment-input"
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="コメントを入力..."
            disabled={disabled}
            className="comment-input"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={disabled || !content.trim() || cooldownRemaining > 0}
            className="submit-button"
            aria-label="コメントを送信"
          >
            {cooldownRemaining > 0 ? `送信 (${cooldownRemaining}秒)` : '送信'}
          </button>
        </div>

        {/* 細かい見た目の調整は普段使わないので「職人設定」に折りたたんでおく */}
        <details className="artisan-settings">
          <summary className="artisan-settings-summary">職人設定</summary>
          <div className="form-row">
            <div className="form-group">
              <label>色</label>
              <div className="color-picker">
                {(
                  Object.entries(COMMENT_COLORS) as [
                    keyof typeof COMMENT_COLORS,
                    string,
                  ][]
                ).map(([name, value]) => (
                  <button
                    key={value}
                    type="button"
                    className={`color-button ${color === value ? 'selected' : ''}`}
                    style={{ backgroundColor: value }}
                    onClick={() => setColor(value)}
                    disabled={disabled}
                    title={COLOR_LABELS[name]}
                    aria-label={COLOR_LABELS[name]}
                  />
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>サイズ</label>
              <div className="size-picker">
                {COMMENT_SIZE_OPTIONS.map((sizeOption) => (
                  <button
                    key={sizeOption}
                    type="button"
                    className={`size-button ${size === sizeOption ? 'selected' : ''}`}
                    onClick={() => setSize(sizeOption)}
                    disabled={disabled}
                  >
                    {SIZE_LABELS[sizeOption]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>速度</label>
              <div className="speed-picker">
                {SPEED_OPTIONS.map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    className={`speed-button ${speedOption === speed ? 'selected' : ''}`}
                    onClick={() => setSpeedOption(speed)}
                    disabled={disabled}
                  >
                    {SPEED_LABELS[speed]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>アニメーション</label>
              <div className="animation-picker">
                {COMMENT_ANIMATIONS.map((anim) => (
                  <button
                    key={anim}
                    type="button"
                    className={`animation-button ${animation === anim ? 'selected' : ''}`}
                    onClick={() => setAnimation(anim)}
                    disabled={disabled}
                  >
                    {ANIMATION_LABELS[anim]}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group danmaku-toggle">
              <label>盛り上げモード</label>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={isDanmakuMode}
                  onChange={(e) => setIsDanmakuMode(e.target.checked)}
                  disabled={disabled}
                />
              </label>
            </div>

            <div className="form-group persist-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={shouldPersist}
                  onChange={(e) => setShouldPersist(e.target.checked)}
                />
                設定を保存する
              </label>
              <p className="persist-hint">
                色・サイズ・速度・アニメーションをこのブラウザに保存し、次回も同じ設定で開きます。
              </p>
            </div>
          </div>
        </details>
      </form>
    </SectionBase>
  );
}
