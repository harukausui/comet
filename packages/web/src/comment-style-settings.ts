import type { CommentAnimation, CommentSize, SpeedOption } from '@comet/shared';
import {
  COMMENT_ANIMATIONS,
  COMMENT_COLORS,
  COMMENT_SIZE_OPTIONS,
  SPEED_OPTIONS,
} from '@comet/shared';

const STORAGE_KEY = 'comet_comment_style_settings';

/**
 * 職人設定のうち、次回以降も使い回したい見た目の設定。
 * 盛り上げモードは1回送ると自動でOFFに戻る一時的な操作なので含めない。
 */
export interface CommentStyleSettings {
  color: string;
  size: CommentSize;
  speedOption: SpeedOption;
  animation: CommentAnimation;
}

const COLOR_VALUES: readonly string[] = Object.values(COMMENT_COLORS);

function isCommentStyleSettings(value: unknown): value is CommentStyleSettings {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.color === 'string' &&
    COLOR_VALUES.includes(v.color) &&
    (COMMENT_SIZE_OPTIONS as readonly string[]).includes(v.size as string) &&
    (SPEED_OPTIONS as readonly string[]).includes(v.speedOption as string) &&
    (COMMENT_ANIMATIONS as readonly string[]).includes(v.animation as string)
  );
}

/**
 * 保存済みの職人設定を返す。未保存・壊れている・Storageが使えない場合は null。
 * 選択肢が将来変わっても古い値を復元しないよう、現在の選択肢に含まれるかを検証する。
 */
export function loadCommentStyleSettings(): CommentStyleSettings | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCommentStyleSettings(parsed) ? parsed : null;
  } catch {
    // localStorageを禁止しているブラウザや壊れたJSONでは既定値で動かす。
    return null;
  }
}

export function saveCommentStyleSettings(settings: CommentStyleSettings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // 保存できなくてもコメント送信自体は続けられるようにする。
  }
}

export function clearCommentStyleSettings(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 削除できない場合も無視する。
  }
}
