'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './profile-title.module.css';
import { useLanguage, SUPPORTED_LANGUAGES, LANGUAGE_NAMES, SupportedLang } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { useUserData } from '@/lib/stacks/user-stack';
import { useAwaitableRouter } from "@/hooks/useAwaitableRouter";
import { supabaseBrowser } from '@/lib/supabase/client';
import { StateStack } from '@/lib/state-stack';
import { useDialog } from '@/lib/DialogViewer';
import { useRouter } from 'next/navigation';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import DialogCancel from '@/components/DialogCancel';

interface LanguageOption {
  code: SupportedLang;
  name: string;
}

const LanguageItem = ({ onClick, text }: { onClick: () => void; text: string }) => {
  const { theme } = useTheme();
  return (
    <div
      className={styles.languageItem}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {text}
    </div>
  );
};

export default function ProfileTitle({ onStateChange }: ComponentStateProps) {
  const { theme, storedTheme, cycleTheme } = useTheme();
  const { t, lang, setLang } = useLanguage();
  const { userData, userData$, __meta } = useUserData();
  const { replaceAndWait } = useAwaitableRouter();
  const router = useRouter();
  const signOutDialog = useDialog();
  const confirmDialog = useDialog();
  const [signingOut, setSigningOut] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption | null>(null);
  const [languageSelectId, languageSelectController, languageSelectIsOpen, languageSelectionState] = useSelectionController();

  const languages: LanguageOption[] = SUPPORTED_LANGUAGES
    .filter(code => code !== lang)
    .map(code => ({
      code,
      name: LANGUAGE_NAMES[code]
    }));

  useEffect(() => {
    onStateChange?.("data");
  }, [onStateChange]);

  const handleSignOut = async () => {
    signOutDialog.open(
      <div style={{ textAlign: 'center' }}>
        <p>{t('confirm_sign_out')}</p>
        {signingOut && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              display: 'inline-block',
              width: '24px',
              height: '24px',
              border: '3px solid #f3f3f3',
              borderTop: '3px solid #007AFF',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        )}
      </div>
    );
  };

  const confirmSignOut = async () => {
    if (userData) {
      try {
        setSigningOut(true);
        await supabaseBrowser.auth.signOut();
        await StateStack.core.clearScope('secondary_flow');
        await StateStack.core.clearScope('mission_flow');
        await StateStack.core.clearScope('achievements_flow');
        await StateStack.core.clearScope('payment_flow');
        sessionStorage.clear();
        __meta.clear();
        await replaceAndWait("/");
      } catch (error) {
        console.error('Sign out error:', error);
        setSigningOut(false);
      }
    }
  };

  const handleLanguageSwitch = () => {
    languageSelectController.setSelectionState("data");
    languageSelectController.open();
  };

  const handleLanguageSelect = (language: LanguageOption) => {
    setSelectedLanguage(language);
    languageSelectController.close();
    confirmDialog.open(
      <div style={{ textAlign: 'center' }}>
        <p>{t('confirm_language_switch')}</p>
        <p style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '8px' }}>
          {t('page_will_reload')}
        </p>
      </div>
    );
  };

  const confirmLanguageSwitch = async () => {
    if (!selectedLanguage) return;
    try {
      setChangingLanguage(true);
      setLang(selectedLanguage.code);
      window.location.reload();
    } catch (error) {
      console.error('Language switch error:', error);
      setChangingLanguage(false);
    }
  };

  return (
    <div className={`${styles.mainSection} ${styles[`mainSection_${theme}`]}`}>
      <div className={`${styles.titleSection} ${styles[`titleSection_${theme}`]}`}>
        <h1 className={`${styles.titleTop} ${styles[`titleTop_${theme}`]}`}>
          {t('profile_text')}
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div role="button" onClick={handleLanguageSwitch} className={styles.iconButton} title={t('switch_language')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="currentColor"/>
          </svg>
        </div>

        <div role="button" onClick={cycleTheme} className={styles.iconButton} title={t('switch_theme')}>
          {storedTheme === 'light' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : storedTheme === 'dark' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        <div role="button" onClick={handleSignOut} className={styles.iconButton} title={t('sign_out')}>
          <svg fill="none" height="20" viewBox="0 0 26 20" width="26" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.6431 16.8182V10.9091H9.22783C8.98155 10.9091 8.74537 10.8133 8.57122 10.6428C8.39708 10.4723 8.29924 10.2411 8.29924 10C8.29924 9.75889 8.39708 9.52766 8.57122 9.35718C8.74537 9.18669 8.98155 9.09091 9.22783 9.09091H17.6431V3.18182C17.6422 2.33822 17.2995 1.52944 16.6902 0.93293C16.0809 0.336419 15.2548 0.000902401 14.3931 0H3.25005C2.38837 0.000902401 1.56224 0.336419 0.952937 0.93293C0.343633 1.52944 0.000921753 2.33822 0 3.18182V16.8182C0.000921753 17.6618 0.343633 18.4706 0.952937 19.0671C1.56224 19.6636 2.38837 19.9991 3.25005 20H14.3931C15.2548 19.9991 16.0809 19.6636 16.6902 19.0671C17.2995 18.4706 17.6422 17.6618 17.6431 16.8182ZM22.8299 10.9091L19.7725 13.9028C19.6057 14.0747 19.5141 14.3036 19.5172 14.5406C19.5203 14.7777 19.6179 15.0042 19.7891 15.1718C19.9603 15.3395 20.1917 15.435 20.4338 15.438C20.676 15.441 20.9097 15.3514 21.0853 15.1881L25.7282 10.6426C25.9022 10.4721 26 10.241 26 10C26 9.759 25.9022 9.52786 25.7282 9.35739L21.0853 4.81193C20.9097 4.64864 20.676 4.55895 20.4338 4.56199C20.1917 4.56502 19.9603 4.66054 19.7891 4.82818C19.6179 4.99582 19.5203 5.22231 19.5172 5.45937C19.5141 5.69642 19.6057 5.92528 19.7725 6.09716L22.8299 9.09091H17.6431V10.9091H22.8299Z" fill="#FF0000" />
          </svg>
        </div>
      </div>

      <signOutDialog.DialogViewer
        title={t('sign_out')}
        buttons={[
          {
            text: signingOut ? '' : t('yes_text'),
            variant: 'primary',
            loading: signingOut,
            onClick: async () => {
              await confirmSignOut();
            }
          },
          {
            text: t('no_text'),
            variant: 'secondary',
            disabled: signingOut,
            onClick: () => signOutDialog.close()
          }
        ]}
        showCancel={false}
        closeOnBackdrop={!signingOut}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff'
        }}
      />

      <SelectionViewer
        id={languageSelectId}
        isOpen={languageSelectIsOpen}
        onClose={languageSelectController.close}
        titleProp={{
          text: t('language'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: languageSelectController.close,
          view: <DialogCancel />
        }}
        layoutProp={{
          gapBetweenHandleAndTitle: "16px",
          gapBetweenTitleAndSearch: "8px",
          gapBetweenSearchAndContent: "16px",
          backgroundColor: theme === 'light' ? "#fff" : "#121212",
          handleColor: "#888",
          handleWidth: "48px",
        }}
        childrenDirection="vertical"
        snapPoints={[0, 1]}
        initialSnap={1}
        minHeight="40vh"
        maxHeight="60vh"
        closeThreshold={0.2}
        selectionState={languageSelectionState}
        zIndex={1000}
      >
        {languages.map((language) => (
          <LanguageItem
            key={language.code}
            onClick={() => handleLanguageSelect(language)}
            text={language.name}
          />
        ))}
      </SelectionViewer>

      <confirmDialog.DialogViewer
        title={t('switch_language')}
        buttons={[
          {
            text: changingLanguage ? '' : t('yes_text'),
            variant: 'primary',
            loading: changingLanguage,
            onClick: async () => {
              await confirmLanguageSwitch();
            }
          },
          {
            text: t('no_text'),
            variant: 'secondary',
            disabled: changingLanguage,
            onClick: () => confirmDialog.close()
          }
        ]}
        showCancel={false}
        closeOnBackdrop={!changingLanguage}
        layoutProp={{
          backgroundColor: theme === 'light' ? '#fff' : '#121212',
          margin: '16px 16px',
          titleColor: theme === 'light' ? '#1a1a1a' : '#fff'
        }}
      />
    </div>
  );
}