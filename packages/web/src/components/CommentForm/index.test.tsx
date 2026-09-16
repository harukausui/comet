import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useInMemoryLocalStorage } from '../../test-utils/local-storage';
import { CommentForm } from '.';

const STORAGE_KEY = 'comet_comment_style_settings';

describe('CommentForm', () => {
  useInMemoryLocalStorage();
  afterEach(cleanup);

  it('does not submit while a Room is joining', () => {
    const onSubmit = vi.fn();
    render(<CommentForm disabled onSubmit={onSubmit} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('previews the entered comment with the selected appearance', () => {
    render(<CommentForm onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'プレビューするコメント' },
    });
    fireEvent.click(screen.getByRole('button', { name: '赤' }));
    fireEvent.click(screen.getByRole('button', { name: '大' }));
    fireEvent.click(screen.getByRole('button', { name: 'バウンド' }));

    const preview = screen.getByLabelText('コメントのプレビュー');
    const text = preview.querySelector<HTMLElement>('.comment-preview-text');
    expect(text?.textContent).toBe('プレビューするコメント');
    expect(text?.style.color).toBe('rgb(255, 0, 0)');
    expect(text?.style.fontSize).toBe('120px');
    expect(text?.classList.contains('comment-preview-animation-bounce')).toBe(
      true
    );
  });

  it('shows guidance before a comment is entered', () => {
    render(<CommentForm onSubmit={vi.fn()} />);
    expect(
      screen.getByText('コメントを入力するとプレビューできます')
    ).toBeTruthy();
  });

  it('does not save style settings unless the persist toggle is on', () => {
    render(<CommentForm onSubmit={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '大' }));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('saves style settings while the persist toggle is on and clears them when turned off', () => {
    render(<CommentForm onSubmit={vi.fn()} />);
    const toggle = screen.getByRole('checkbox', { name: '設定を保存する' });

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: '大' }));
    fireEvent.click(screen.getByRole('button', { name: '速い' }));

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!)).toMatchObject(
      { size: 'large', speedOption: 'fast' }
    );

    fireEvent.click(toggle);
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('restores saved style settings and starts with the persist toggle on', () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        color: '#FF0000',
        size: 'large',
        speedOption: 'fast',
        animation: 'bounce',
      })
    );
    const onSubmit = vi.fn();
    render(<CommentForm onSubmit={onSubmit} />);

    expect(
      screen.getByRole<HTMLInputElement>('checkbox', { name: '設定を保存する' })
        .checked
    ).toBe(true);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.submit(input.closest('form')!);
    expect(onSubmit).toHaveBeenCalledWith('hello', {
      color: '#FF0000',
      size: 'large',
      speed: expect.any(Number),
      animation: 'bounce',
    });
  });
});
