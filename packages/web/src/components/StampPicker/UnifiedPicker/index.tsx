import EmojiPicker, { Categories, type EmojiClickData } from 'emoji-picker-react';
import type { Stamp } from '@comet/shared';

interface UnifiedPickerProps {
  customStamps: Stamp[];
  onSelectStamp: (stamp: Stamp) => void;
}

/**
 * カテゴリ表示名の日本語化。先頭に「カスタム」を置き、
 * アップロードしたスタンプを標準絵文字と同じピッカーで探せるようにする
 */
const CATEGORIES = [
  { category: Categories.CUSTOM, name: 'カスタム' },
  { category: Categories.SUGGESTED, name: 'よく使う' },
  { category: Categories.SMILEYS_PEOPLE, name: 'スマイリー・人' },
  { category: Categories.ANIMALS_NATURE, name: '動物・自然' },
  { category: Categories.FOOD_DRINK, name: '食べ物・飲み物' },
  { category: Categories.TRAVEL_PLACES, name: '旅行・場所' },
  { category: Categories.ACTIVITIES, name: 'アクティビティ' },
  { category: Categories.OBJECTS, name: '物' },
  { category: Categories.SYMBOLS, name: '記号' },
  { category: Categories.FLAGS, name: '旗' },
];

/**
 * 標準絵文字とカスタムスタンプを1つにまとめたピッカー
 * emoji-picker-react はバンドルの大半を占めるため、このモジュールごと遅延ロードする
 */
export default function UnifiedPicker({
  customStamps,
  onSelectStamp,
}: UnifiedPickerProps) {
  const customEmojis = customStamps.map((stamp) => ({
    id: stamp.id,
    names: [stamp.name],
    imgUrl: stamp.imageUrl,
  }));

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

  return (
    <EmojiPicker
      onEmojiClick={handleEmojiClick}
      customEmojis={customEmojis}
      categories={CATEGORIES}
      width="100%"
      height="400px"
      searchPlaceHolder="スタンプを検索..."
      previewConfig={{ showPreview: false }}
      autoFocusSearch={false}
      skinTonesDisabled
    />
  );
}
