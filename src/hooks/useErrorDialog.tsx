'use client';

/**
 * Shared error dialog for auth (and other) screens — replaces inline `{error && (...)}` blocks with
 * the app's standard dialog (useDialog / DialogViewer), matching the existing style used across the
 * app (e.g. roles-page). Keep driving your existing `error` state; mirror it into the dialog:
 *
 *   const { showError, close, errorDialogNode } = useErrorDialog();
 *   useEffect(() => { if (error) showError(error); else close(); }, [error]);  // eslint-disable-line
 *   ...
 *   {errorDialogNode}
 */
import { useDialog } from '@academix-admin/dialog-viewer';
import { useLanguage } from '@/context/LanguageContext';
import { useTheme } from '@/context/ThemeContext';

export function useErrorDialog(onDismiss?: () => void) {
  const dialog = useDialog();
  const { t } = useLanguage();
  const { theme } = useTheme();

  const showError = (message: string | null | undefined) => {
    if (!message) return;
    dialog.open(<div style={{ textAlign: 'center' }}><p>{message}</p></div>);
  };

  // Dismiss = close + let the caller clear any driving error state (so it can't re-open).
  const dismiss = () => { dialog.close(); onDismiss?.(); };

  const errorDialogNode = (
    <dialog.DialogViewer
      title={t('error_text')}
      buttons={[{ text: t('ok_text'), variant: 'primary', onClick: dismiss }]}
      showCancel={false}
      closeOnBackdrop={false}
      layoutProp={{
        backgroundColor: theme === 'light' ? '#fff' : '#121212',
        margin: '16px 16px',
        titleColor: theme === 'light' ? '#1a1a1a' : '#fff',
      }}
    />
  );

  return { showError, close: dismiss, errorDialogNode };
}
