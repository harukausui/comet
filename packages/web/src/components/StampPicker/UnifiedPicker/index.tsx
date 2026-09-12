import { useEffect, useRef, useState } from 'react';
import EmojiPicker, {
  Categories,
  type EmojiClickData,
} from 'emoji-picker-react';
import type { Stamp } from '@comet/shared';
import { CATEGORY_ICONS, SEARCH_TAB_ICON_CLASS } from './categoryIcons';

interface UnifiedPickerProps {
  customStamps: Stamp[];
  onSelectStamp: (stamp: Stamp) => void;
}

/**
 * カテゴリの並びと日本語表示名（Slackの絵文字ピッカーと同じ情報設計）
 * 「よく使う」を先頭、標準カテゴリ、最後にアップロードした「カスタム」を置く。
 * 先頭タブは検索タブとして扱い、選択中だけ検索欄を表示する。
 * タブのアイコンは categoryIcons.tsx の線画に差し替え、色は style.scss で制御する
 */
const CATEGORIES = [
  { category: Categories.SUGGESTED, name: 'よく使う絵文字' },
  { category: Categories.SMILEYS_PEOPLE, name: 'スマイリー・人' },
  { category: Categories.ANIMALS_NATURE, name: '動物・自然' },
  { category: Categories.FOOD_DRINK, name: '食べ物・飲み物' },
  { category: Categories.TRAVEL_PLACES, name: '旅行・場所' },
  { category: Categories.ACTIVITIES, name: 'アクティビティ' },
  { category: Categories.OBJECTS, name: '物' },
  { category: Categories.SYMBOLS, name: '記号' },
  { category: Categories.FLAGS, name: '旗' },
  { category: Categories.CUSTOM, name: 'カスタム' },
];

/**
 * emoji-picker-react は customEmojis が空だとカスタムカテゴリ自体を隠してしまう。
 * スタンプが0件でもセクションとタブを出し続けるため、CSSで非表示にする
 * プレースホルダーを常に1件混ぜておく（style.scss の .epr-emoji[data-unified] 参照）
 */
export const CUSTOM_PLACEHOLDER_ID = '__custom_placeholder__';
const CUSTOM_PLACEHOLDER = {
  id: CUSTOM_PLACEHOLDER_ID,
  // names が空だとライブラリ側の aria-label 生成で落ちるため、
  // 検索にヒットしないゼロ幅スペースを入れておく
  names: ['\u200b'],
  // \u753b\u50cf\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3059\u308b\u3068\u300c\u5931\u6557\u3057\u305f\u7d75\u6587\u5b57\u300d\u3068\u3057\u3066\u96a0\u3055\u308c\u3001\u30ab\u30c6\u30b4\u30ea\u3054\u3068\u6d88\u3048\u308b\u305f\u3081
  // \u78ba\u5b9f\u306b\u30ed\u30fc\u30c9\u3067\u304d\u308b\u900f\u660eSVG\u3092\u4f7f\u3046
  imgUrl:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/%3E",
};

/**
 * 標準絵文字とカスタムスタンプを1つにまとめたピッカー
 * emoji-picker-react はバンドルの大半を占めるため、このモジュールごと遅延ロードする
 */
export default function UnifiedPicker({
  customStamps,
  onSelectStamp,
}: UnifiedPickerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // 先頭タブ（検索タブ）を選択中か。ライブラリの epr-active はスクロール位置で決まり、
  // 「よく使う」が空のときは検索タブに付かないため、こちらで別に管理する
  const [isSearchTab, setIsSearchTab] = useState(false);

  const customEmojis = [
    ...customStamps.map((stamp) => ({
      id: stamp.id,
      names: [stamp.name],
      imgUrl: stamp.imageUrl,
    })),
    CUSTOM_PLACEHOLDER,
  ];

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (emojiData.isCustom) {
      // カスタム絵文字の unified には登録時の id が入る
      const stamp = customStamps.find((s) => s.id === emojiData.unified);
      if (stamp) onSelectStamp(stamp);
      return;
    }

    onSelectStamp({
      id: `emoji-${emojiData.unified}`,
      name: emojiData.emoji,
      imageUrl: '',
      category: 'emotion',
    });
  };

  // カテゴリタブのクリックで検索タブの選択状態を切り替える。
  // 検索欄の表示・非表示と下線は style.scss の .is-search-tab で制御する
  const handleWrapperClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const button = (event.target as HTMLElement).closest('.epr-cat-btn');
    if (!button) return;
    // どのタブかはアイコン要素のマーカークラスで判定する（categoryIcons.tsx 参照）
    setIsSearchTab(button.querySelector(`.${SEARCH_TAB_ICON_CLASS}`) !== null);
  };

  // 検索タブを開いたら、表示された検索欄にそのままフォーカスする
  useEffect(() => {
    if (!isSearchTab) return;
    wrapperRef.current
      ?.querySelector<HTMLInputElement>('.epr-search-container input')
      ?.focus();
  }, [isSearchTab]);

  return (
    <div
      ref={wrapperRef}
      className={`unified-picker${isSearchTab ? ' is-search-tab' : ''}`}
      onClick={handleWrapperClick}
    >
      <EmojiPicker
        onEmojiClick={handleEmojiClick}
        customEmojis={customEmojis}
        categories={CATEGORIES}
        categoryIcons={CATEGORY_ICONS}
        width="100%"
        // 高さは style.scss の --stamp-picker-height で決める（モバイル幅では低くする）
        height="var(--stamp-picker-height)"
        searchPlaceHolder="スタンプを検索..."
        previewConfig={{ showPreview: false }}
        autoFocusSearch={false}
        skinTonesDisabled
      />
    </div>
  );
}
