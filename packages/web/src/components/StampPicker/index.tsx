import { useState, useEffect, lazy, Suspense } from 'react';
import { type Stamp } from '@comet/shared';
import { authHeaders, loadRuntimeConfig } from '../../auth';
import { SectionBase } from '../common/SectionBase';
import { GearIcon } from '../../assets/icons/GearIcon';
import { UploadDialog } from './UploadDialog';
import { ManageDialog } from './ManageDialog';
import './style.scss';

// emoji-picker-react を含むモジュールは重いので、初期表示後に遅延ロードする
const UnifiedPicker = lazy(() => import('./UnifiedPicker'));

interface StampPickerProps {
  onSelectStamp: (stamp: Stamp) => void;
  /** WebSocket で送信できない間は、HTTP API の管理操作を残してピッカーだけ無効にする */
  disabled?: boolean;
}

async function stampApiUrl(path: string): Promise<string> {
  const runtimeConfig = await loadRuntimeConfig();
  const baseUrl =
    runtimeConfig.stampApiUrl || import.meta.env.VITE_STAMP_API_URL;
  if (!baseUrl) {
    throw new Error('スタンプAPI URLが設定されていません');
  }
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

async function errorMessage(response: Response, fallback: string) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return fallback;
  const data = (await response.json().catch(() => ({}))) as { error?: string };
  return data.error || fallback;
}

// スタンプの追加・管理はHTTP APIで完結するため、WebSocketの接続状態には依存させない
export function StampPicker({
  onSelectStamp,
  disabled = false,
}: StampPickerProps) {
  const [customStamps, setCustomStamps] = useState<Stamp[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showManageDialog, setShowManageDialog] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchCustomStamps = async (signal?: AbortSignal) => {
    try {
      const response = await fetch(await stampApiUrl('/stamps'), {
        signal,
        headers: await authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setCustomStamps(data.stamps || []);
      } else {
        console.error('Failed to fetch custom stamps:', response.status);
      }
    } catch (error) {
      // アンマウントによる中断はエラー扱いしない
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('Failed to fetch custom stamps:', error);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchCustomStamps(controller.signal);
    return () => controller.abort();
  }, []);

  const handleDeleteStamp = async (
    stampId: string,
    event: React.MouseEvent
  ) => {
    event.stopPropagation();

    if (!confirm('このスタンプを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(
        await stampApiUrl(`/stamps/${encodeURIComponent(stampId)}`),
        {
          method: 'DELETE',
          headers: await authHeaders(),
        }
      );

      if (response.ok) {
        setCustomStamps((prev) => prev.filter((s) => s.id !== stampId));
      } else {
        const message = await errorMessage(response, '不明なエラー');
        alert(`削除に失敗しました: ${message}`);
      }
    } catch (error) {
      console.error('Failed to delete stamp:', error);
      alert('削除に失敗しました');
    }
  };

  const handleUpload = async (file: File, name: string) => {
    setUploading(true);

    try {
      const response = await fetch(await stampApiUrl('/upload'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeaders()),
        },
        body: JSON.stringify({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          stampName: name,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await errorMessage(response, 'アップロードURLの取得に失敗しました')
        );
      }

      const { uploadUrl, stampId } = await response.json();

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('画像のアップロードに失敗しました');
      }

      // アップロード完了をサーバに通知してスタンプを有効化する
      const confirmResponse = await fetch(
        await stampApiUrl(`/stamps/${encodeURIComponent(stampId)}/confirm`),
        { method: 'POST', headers: await authHeaders() }
      );

      if (!confirmResponse.ok) {
        throw new Error('スタンプの有効化に失敗しました');
      }

      setShowUploadDialog(false);
      await fetchCustomStamps();
      alert('スタンプをアップロードしました！');
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'アップロードに失敗しました';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const openUploadDialog = () => {
    setShowManageDialog(false);
    setShowUploadDialog(true);
  };

  return (
    <>
      <SectionBase
        title={
          <div className="stamp-section-title">
            <h3>スタンプ</h3>
            <div className="stamp-section-actions">
              <button
                type="button"
                className="stamp-header-button"
                onClick={openUploadDialog}
                title="カスタムスタンプを追加"
              >
                ＋ 追加
              </button>
              <button
                type="button"
                className="stamp-header-button stamp-header-icon-button"
                onClick={() => setShowManageDialog(true)}
                aria-label="カスタムスタンプを管理"
                title="カスタムスタンプを管理"
              >
                <GearIcon />
              </button>
            </div>
          </div>
        }
        className="stamp-picker"
      >
        <fieldset
          className="emoji-picker-wrapper emoji-picker-fieldset"
          disabled={disabled}
          aria-label="送信するスタンプを選ぶ"
        >
          <Suspense
            fallback={<div className="emoji-picker-loading">読み込み中...</div>}
          >
            <UnifiedPicker
              customStamps={customStamps}
              onSelectStamp={onSelectStamp}
            />
          </Suspense>
        </fieldset>
      </SectionBase>

      <ManageDialog
        isOpen={showManageDialog}
        stamps={customStamps}
        onClose={() => setShowManageDialog(false)}
        onDeleteStamp={handleDeleteStamp}
        onOpenUploadDialog={openUploadDialog}
      />

      <UploadDialog
        isOpen={showUploadDialog}
        onClose={() => setShowUploadDialog(false)}
        onUpload={handleUpload}
        uploading={uploading}
      />
    </>
  );
}
