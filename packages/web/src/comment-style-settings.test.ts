import { describe, expect, it } from 'vitest';
import { useInMemoryLocalStorage } from './test-utils/local-storage';
import {
  clearCommentStyleSettings,
  loadCommentStyleSettings,
  saveCommentStyleSettings,
} from './comment-style-settings';

const STORAGE_KEY = 'comet_comment_style_settings';

describe('comment-style-settings', () => {
  useInMemoryLocalStorage();

  it('returns null when nothing is saved', () => {
    expect(loadCommentStyleSettings()).toBeNull();
  });

  it('round-trips saved settings', () => {
    saveCommentStyleSettings({
      color: '#FF0000',
      size: 'large',
      speedOption: 'fast',
      animation: 'bounce',
    });
    expect(loadCommentStyleSettings()).toEqual({
      color: '#FF0000',
      size: 'large',
      speedOption: 'fast',
      animation: 'bounce',
    });
  });

  it('ignores values that are no longer valid options', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        color: '#123456',
        size: 'large',
        speedOption: 'fast',
        animation: 'bounce',
      })
    );
    expect(loadCommentStyleSettings()).toBeNull();
  });

  it('ignores broken JSON', () => {
    window.localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadCommentStyleSettings()).toBeNull();
  });

  it('clears saved settings', () => {
    saveCommentStyleSettings({
      color: '#FF0000',
      size: 'small',
      speedOption: 'slow',
      animation: 'none',
    });
    clearCommentStyleSettings();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
