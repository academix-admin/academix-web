'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './edit-profile.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalizeWords } from '@/utils/textUtils';
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { useDialog } from '@/lib/DialogViewer';

interface ViewProps {
  onEditing: (id: string | null) => void;
}

interface DeviceImageInfo {
  path: string | null;
  name: string | null;
  extension: string | null;
  data: string;
}

// Common validation functions
const isEmail = (value: string): boolean => {
  const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/i;
  return emailRegex.test(value);
};

const containsUpperCase = (value: string): boolean => /[A-Z]/.test(value);

const getSpecialCharacters = (value: string): string[] => {
  const specialCharactersRegExp = /[^a-zA-Z0-9]/g;
  const matches = value.match(specialCharactersRegExp);
  return matches ? matches : [];
};

// Common edit button component
const EditButton = ({ onClick }: { onClick: () => void }) => (
  <svg
    role="button"
    onClick={onClick}
    fill="none"
    height="22"
    viewBox="0 0 22 22"
    width="22"
    xmlns="http://www.w3.org/2000/svg"
    className={styles.editButton}
  >
    <path
      clipRule="evenodd"
      d="M4.77514 0.342973C8.91238 -0.114324 13.0875 -0.114324 17.2248 0.342973C19.5155 0.599286 21.3635 2.40015 21.6323 4.69496C22.1226 8.88407 22.1226 13.1159 21.6323 17.305C21.3635 19.5998 19.5155 21.4007 17.2248 21.657C13.0875 22.1143 8.91238 22.1143 4.77514 21.657C2.48446 21.4007 0.636401 19.5998 0.367617 17.305C-0.122539 13.1164 -0.122539 8.88497 0.367617 4.69629C0.503571 3.58143 1.01267 2.54506 1.81241 1.75516C2.61215 0.965259 3.65565 0.468118 4.7738 0.344308M11 4.33452C11.266 4.33452 11.5211 4.44 11.7091 4.62777C11.8972 4.81554 12.0029 5.0702 12.0029 5.33574V9.99878H16.6738C16.9398 9.99878 17.1949 10.1043 17.383 10.292C17.5711 10.4798 17.6768 10.7345 17.6768 11C17.6768 11.2655 17.5711 11.5202 17.383 11.708C17.1949 11.8957 16.9398 12.0012 16.6738 12.0012H12.0029V16.6643C12.0029 16.9298 11.8972 17.1845 11.7091 17.3722C11.5211 17.56 11.266 17.6655 11 17.6655C10.734 17.6655 10.4789 17.56 10.2908 17.3722C10.1027 17.1845 9.99704 16.9298 9.99704 16.6643V12.0012H5.32608C5.06009 12.0012 4.80499 11.8957 4.6169 11.708C4.42882 11.5202 4.32315 11.2655 4.32315 11C4.32315 10.7345 4.42882 10.4798 4.6169 10.292C4.80499 10.1043 5.06009 9.99878 5.32608 9.99878H9.99704V5.33574C9.99704 5.0702 10.1027 4.81554 10.2908 4.62777C10.4789 4.44 10.734 4.33452 11 4.33452Z"
      fill="#1C6B1E"
      fillRule="evenodd"
    />
  </svg>
);

// Common action buttons component
const ActionButtons = ({
  onCancel,
  onSave,
  saveDisabled,
  saveLoading,
  t
}: {
  onCancel: () => void;
  onSave: () => void;
  saveDisabled: boolean;
  saveLoading: boolean;
  t: (key: string) => string;
}) => (
  <div className={styles.actionsRow}>
    <button
      type="button"
      className={styles.cancelButton}
      onClick={onCancel}
    >
      {t('cancel_text')}
    </button>
    <button
      onClick={onSave}
      className={styles.saveButton}
      disabled={saveDisabled || saveLoading}
    >
      {saveLoading ? <span className={styles.spinner}></span> : t('save_text')}
    </button>
  </div>
);

const UserNameView = ({ onEditing }: ViewProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData, userData$, __meta } = useUserData();
  const errorDialog = useDialog();

  const [editingValue, setEditingValue] = useState('');
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [userNameState, setUserNameState] = useState('initial');

  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const latestValidationIdRef = useRef(0);

  useEffect(() => {
    if (__meta.isHydrated && userData?.usersUsername) {
      setEditingValue(userData.usersUsername.replace('@', ''));
    }
  }, [userData, __meta.isHydrated]);

  const handleSave = async () => {
    if (!userData) return;
    setSaveLoading(true);

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob,
      );

      if (!paramatical) {
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      const { data, error } = await supabaseBrowser.rpc('update_user_username', {
        p_username: `@${editingValue}`,
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
      });

      if (error) {
        console.error('Username Error:', error);
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      if (data.status === 'ProfileStatus.success') {
        userData$.set(UserData.from(userData).copyWith({ usersUsername: data.profile_value }));
        setEditing(false);
      } else {
        errorDialog.open(<p>{data.status}</p>);
      }
      setSaveLoading(false);
    } catch (err) {
      console.error(err);
      setSaveLoading(false);
      errorDialog.open(<p>{t('error_occurred')}</p>);
    }
  };

  const validateUsername = async (cleanValue: string, validationId: number) => {
    if (validationId !== latestValidationIdRef.current) return;

    try {
      setUserNameState('checking');
      const { data: exists, error } = await supabaseBrowser.rpc('check_username_exist', {
        p_username: `@${cleanValue}`
      });

      if (validationId !== latestValidationIdRef.current) return;
      if (error) throw error;

      setUserNameState(exists ? 'exists' : 'valid');
    } catch (err) {
      if (validationId === latestValidationIdRef.current) {
        setUserNameState('error');
        console.error('Failed to check username:', err);
      }
    }
  };

  const handleUserNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    const cleanValue = value.replace('@', '');
    setEditingValue(cleanValue);

    if (cleanValue.length === 0) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
      setUserNameState('initial');
      return;
    }

    // Format validation
    if (isEmail(cleanValue) || containsUpperCase(cleanValue) ||
        !getSpecialCharacters(cleanValue).every(c => c === '.' || c === '_')) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
        validationTimeoutRef.current = null;
      }
      setUserNameState('wrongFormat');
      return;
    }

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    latestValidationIdRef.current += 1;
    const currentValidationId = latestValidationIdRef.current;

    setUserNameState('checking');
    validationTimeoutRef.current = setTimeout(() => {
      validateUsername(cleanValue, currentValidationId);
    }, 500);
  };
  if(!userData)return null;

  if (!editing) {
    return (
      <div className={styles.profileField}>
        <div className={styles.fieldContent}>
          <div className={styles.fieldIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="currentColor"/>
            </svg>
          </div>
          <div className={styles.fieldInfo}>
            <span className={styles.fieldLabel}>{t('username_label')}</span>
            <span className={styles.fieldValue}>{userData.usersUsername}</span>
          </div>
        </div>
        <EditButton onClick={() => setEditing(true)} />
      </div>
    );
  }


  return (
    <div className={styles.editSection}>
      <div className={styles.formGroup}>
        <label htmlFor="username" className={styles.label}>{t('username_label')}</label>
        <div className={styles.usernameInputContainer}>
          <span className={styles.prefix}>@</span>
          <input
            type="text"
            id="username"
            name="username"
            value={editingValue}
            onChange={handleUserNameChange}
            placeholder={t('username_placeholder')}
            className={styles.input}
            required
            autoCapitalize="none"
          />
        </div>

        {userNameState === 'wrongFormat' && (
          <p className={styles.errorText}>{t('username_wrong_format')}</p>
        )}
        {userNameState === 'exists' && (
          <p className={styles.errorText}>{t('username_exist')}</p>
        )}
        {userNameState === 'error' && (
          <p className={styles.errorText}>{t('username_error')}</p>
        )}
        {userNameState === 'valid' && (
          <p className={styles.validText}>{t('username_valid')}</p>
        )}
        {userNameState === 'checking' && (
          <span className={styles.usernameSpinner}></span>
        )}
      </div>

      <ActionButtons
        onCancel={() => setEditing(false)}
        onSave={handleSave}
        saveDisabled={userNameState !== 'valid' || saveLoading || editingValue === userData.usersUsername.replace('@', '')}
        saveLoading={saveLoading}
        t={t}
      />
      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px 16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
    </div>
  );
};

const PhoneNumberView = ({ onEditing }: ViewProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData, userData$, __meta } = useUserData();
  const errorDialog = useDialog();

  const [editingValue, setEditingValue] = useState('');
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [phoneNumberState, setPhoneNumberState] = useState('initial');

  useEffect(() => {
    if (userData?.usersPhone && __meta.isHydrated ) {
      setEditingValue(userData.usersPhone.replace('+', ''));
    }
  }, [userData, __meta.isHydrated]);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!userData)return;
    const { value } = e.target;
    const regex = /^\d+$/;
    const valid = regex.test(value);
    const length = userData?.usersPhone?.replace('+', '').length || 0;

    if (value.length <= length) {
      setEditingValue(value);
    }

    if (valid && value.length === length) {
      setPhoneNumberState('valid');
    } else if (!valid) {
      setPhoneNumberState('invalid');
    } else {
      setPhoneNumberState('initial');
    }
  };

  const handleSave = async () => {
    if (!userData) return;
    setSaveLoading(true);

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      const { data, error } = await supabaseBrowser.rpc('update_user_phone', {
        p_phone: `+${editingValue}`,
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
      });

      if (error) {
        console.error('Phone Error:', error);
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      if (data.status === 'ProfileStatus.success') {
        userData$.set(UserData.from(userData).copyWith({ usersPhone: data.profile_value }));
        setEditing(false);
      } else {
        errorDialog.open(<p>{data.status}</p>);
      }
      setSaveLoading(false);
    } catch (err) {
      console.error(err);
      setSaveLoading(false);
      errorDialog.open(<p>{t('error_occurred')}</p>);
    }
  };
  if(!userData)return null;

  if (!editing) {
    return (
      <div className={styles.profileField}>
        <div className={styles.fieldContent}>
          <div className={styles.fieldIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.62 10.79C8.06 13.62 10.38 15.94 13.21 17.38L15.41 15.18C15.69 14.9 16.08 14.82 16.43 14.93C17.55 15.3 18.75 15.5 20 15.5C20.55 15.5 21 15.95 21 16.5V20C21 20.55 20.55 21 20 21C10.61 21 3 13.39 3 4C3 3.45 3.45 3 4 3H7.5C8.05 3 8.5 3.45 8.5 4C8.5 5.25 8.7 6.45 9.07 7.57C9.18 7.92 9.1 8.31 8.82 8.59L6.62 10.79Z" fill="currentColor"/>
            </svg>
          </div>
          <div className={styles.fieldInfo}>
            <span className={styles.fieldLabel}>{t('phone_number_label')}</span>
            <span className={styles.fieldValue}>{userData.usersPhone}</span>
          </div>
        </div>
        <EditButton onClick={() => setEditing(true)} />
      </div>
    );
  }

  return (
    <div className={styles.editSection}>
      <div className={styles.formGroup}>
        <label htmlFor="phoneNumber" className={styles.label}>{t('phone_number_label')}</label>
        <div className={styles.phoneInputContainer}>
          <span className={styles.prefix}>+</span>
          <input
            type="text"
            id="phoneNumber"
            name="phoneNumber"
            value={editingValue}
            maxLength={userData?.usersPhone?.replace('+', '').length || 0}
            onChange={handlePhoneNumberChange}
            placeholder={t('phone_number_placeholder')}
            className={styles.input}
            inputMode="numeric"
            pattern="[0-9]*"
            required
          />
        </div>
        {phoneNumberState === 'invalid' && (
          <p className={styles.errorText}>{t('phone_number_invalid')}</p>
        )}
        {phoneNumberState === 'valid' && (
          <p className={styles.validText}>{t('phone_number_valid')}</p>
        )}
      </div>

      <ActionButtons
        onCancel={() => setEditing(false)}
        onSave={handleSave}
        saveDisabled={phoneNumberState !== 'valid' || saveLoading || editingValue === (userData?.usersPhone?.replace('+', '') || '')}
        saveLoading={saveLoading}
        t={t}
      />
      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px 16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
    </div>
  );
};

const EmailView = ({ onEditing }: ViewProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData, userData$, __meta } = useUserData();
  const errorDialog = useDialog();

  const [editingValue, setEditingValue] = useState('');
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (userData?.usersEmail && __meta.isHydrated) {
      setEditingValue(userData.usersEmail);
    }
  }, [userData, __meta.isHydrated]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  };

  const handleSave = async () => {
    if (!userData) return;
    setSaveLoading(true);

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      const { data, error } = await supabaseBrowser.rpc('update_user_email', {
        p_email: editingValue,
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
      });

      if (error) {
        console.error('Email Error:', error);
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      if (data.status === 'ProfileStatus.success') {
        userData$.set(UserData.from(userData).copyWith({ usersEmail: data.profile_value }));
        setEditing(false);
      } else {
        errorDialog.open(<p>{data.status}</p>);
      }
      setSaveLoading(false);
    } catch (err) {
      console.error(err);
      setSaveLoading(false);
      errorDialog.open(<p>{t('error_occurred')}</p>);
    }
  };

  const isEmailValid = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(editingValue);
  if(!userData)return null;

  if (!editing) {
    return (
      <div className={styles.profileField}>
        <div className={styles.fieldContent}>
          <div className={styles.fieldIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 4H4C2.9 4 2.01 4.9 2.01 6L2 18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z" fill="currentColor"/>
            </svg>
          </div>
          <div className={styles.fieldInfo}>
            <span className={styles.fieldLabel}>{t('email_label')}</span>
            <span className={styles.fieldValue}>{userData.usersEmail}</span>
          </div>
        </div>
        <EditButton onClick={() => setEditing(true)} />
      </div>
    );
  }

  return (
    <div className={styles.editSection}>
      <div className={styles.formGroup}>
        <label htmlFor="email" className={styles.label}>{t('email_label')}</label>
        <input
          type="email"
          id="email"
          name="email"
          value={editingValue}
          onChange={handleChange}
          placeholder={t('email_placeholder')}
          className={styles.input}
          disabled={saveLoading}
          required
        />
        {!isEmailValid && (
          <p className={styles.errorText}>{t('email_invalid')}</p>
        )}
      </div>

      <ActionButtons
        onCancel={() => setEditing(false)}
        onSave={handleSave}
        saveDisabled={!isEmailValid || saveLoading || editingValue === userData.usersEmail}
        saveLoading={saveLoading}
        t={t}
      />
      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px 16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
    </div>
  );
};

const FullnameView = ({ onEditing }: ViewProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData, userData$, __meta } = useUserData();
  const errorDialog = useDialog();

  const [editingValue, setEditingValue] = useState('');
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    if (userData?.usersNames && __meta.isHydrated) {
      setEditingValue(userData.usersNames);
    }
  }, [userData, __meta.isHydrated]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingValue(e.target.value);
  };

  const handleSave = async () => {
    if (!userData) return;
    setSaveLoading(true);

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        console.error('Fullname Error:');
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      const { data, error } = await supabaseBrowser.rpc('update_user_fullname', {
        p_fullname: capitalizeWords(editingValue),
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
      });

      if (error) {
        console.error('Fullname Error:', error);
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      if (data.status === 'ProfileStatus.success') {
        userData$.set(UserData.from(userData).copyWith({ usersNames: data.profile_value }));
        setEditing(false);
      } else {
        errorDialog.open(<p>{data.status}</p>);
      }
      setSaveLoading(false);
    } catch (err) {
      console.error(err);
      setSaveLoading(false);
      errorDialog.open(<p>{t('error_occurred')}</p>);
    }
  };
  if(!userData)return null;

  if (!editing) {
    return (
      <div className={styles.profileField}>
        <div className={styles.fieldContent}>
          <div className={styles.fieldIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
            </svg>
          </div>
          <div className={styles.fieldInfo}>
            <span className={styles.fieldLabel}>{t('fullname_label')}</span>
            <span className={styles.fieldValue}>{userData.usersNames}</span>
          </div>
        </div>
        <EditButton onClick={() => setEditing(true)} />
      </div>
    );
  }

  return (
    <div className={styles.editSection}>
      <div className={styles.formGroup}>
        <label htmlFor="fullName" className={styles.label}>{t('fullname_label')}</label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          value={editingValue}
          onChange={handleChange}
          placeholder={t('fullname_placeholder')}
          className={styles.input}
          disabled={saveLoading}
          required
        />
      </div>

      <ActionButtons
        onCancel={() => setEditing(false)}
        onSave={handleSave}
        saveDisabled={!editingValue || saveLoading || editingValue === userData.usersNames}
        saveLoading={saveLoading}
        t={t}
      />
      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px 16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
    </div>
  );
};

const ImageView = ({ onEditing }: ViewProps) => {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData, userData$, __meta } = useUserData();
  const errorDialog = useDialog();
  const previewDialog = useDialog();
  const deleteDialog = useDialog();

  const [selectedEditingImage, setSelectedEditingImage] = useState<DeviceImageInfo | null>(null);
  const [editing, setEditing] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!userData || !selectedEditingImage) return;
    setError('');
    setSaveLoading(true);

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        console.error('Image Error: No paramatical data');
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      // Get media operation ID
      const { data: operationId, error: operationError } = await supabaseBrowser.rpc('get_media_operation_id', {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_path: userData.usersImage,
        p_type: 'MediaOperation.change_profile_picture'
      });

      if (operationError) {
        console.error('Operation ID Error:', operationError);
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      // Remove old image if exists
      if (userData.usersImage) {
        const { error: removeImageError } = await supabaseBrowser.storage
          .from('users-profile-bucket')
          .remove([userData.usersImage]);

        if (removeImageError) {
          console.error('Remove Image Error:', removeImageError);
          setSaveLoading(false);
          errorDialog.open(<p>{t('error_occurred')}</p>);
          return;
        }
      }

      const onlinePath = `${operationId}/${userData.usersId}`;

      // Convert base64 to Blob for upload
      const base64Data = selectedEditingImage.data.split(',')[1];
      const blob = await fetch(`data:image/${selectedEditingImage.extension};base64,${base64Data}`).then(res => res.blob());

      // Upload new image
      const { data: uploadData, error: uploadImageError } = await supabaseBrowser.storage
        .from('users-profile-bucket')
        .upload(onlinePath, blob, {
          upsert: true,
          contentType: `image/${selectedEditingImage.extension}`
        });

      if (uploadImageError) {
        console.error('Upload Image Error:', uploadImageError);
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      // Get public URL for the uploaded image
      const { data: publicUrlData } = supabaseBrowser.storage
        .from('users-profile-bucket')
        .getPublicUrl(uploadData.path);

      const imagePath = publicUrlData.publicUrl;

      // Update user record with new image path
      const { data, error } = await supabaseBrowser.rpc('update_user_image', {
        p_image_path: imagePath,
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_operation_id: operationId,
      });

      if (error) {
        console.error('Update Image Error:', error);
        setSaveLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      if (data) {
        userData$.changeImage(imagePath);
        setEditing(false);
        setSelectedEditingImage(null);
      } else {
        errorDialog.open(<p>{t('error_occurred')}</p>);
      }
      setSaveLoading(false);

    } catch (err) {
      console.error(err);
      setSaveLoading(false);
      errorDialog.open(<p>{t('error_occurred')}</p>);
    }
  };


  const confirmDelete = () => {
    deleteDialog.open(
      <p>{t('confirm_delete_image')}</p>
    );
  };

  const handleRemove = async () => {
    if (!userData || !userData.usersImage) return;
    deleteDialog.close();
    setError('');
    setDeleteLoading(true);

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) {
        console.error('Image Error: No paramatical data');
        setDeleteLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      // Get media operation ID
      const { data: operationId, error: operationError } = await supabaseBrowser.rpc('get_media_operation_id', {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_path: userData.usersImage,
        p_type: 'MediaOperation.remove_profile_picture'
      });

      if (operationError) {
        console.error('Operation ID Error:', operationError);
        setDeleteLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      // Remove old image
        const { error: removeImageError } = await supabaseBrowser.storage
          .from('users-profile-bucket')
          .remove([userData.usersImage]);

        if (removeImageError) {
          console.error('Remove Image Error:', removeImageError);
          setDeleteLoading(false);
          errorDialog.open(<p>{t('error_occurred')}</p>);
          return;
        }

      // Update user record with null
      const { data, error } = await supabaseBrowser.rpc('update_user_image', {
        p_image_path: null,
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_operation_id: operationId,
      });

      if (error) {
        console.error('Update Image Error:', error);
        setDeleteLoading(false);
        errorDialog.open(<p>{t('error_occurred')}</p>);
        return;
      }

      if (data) {
        userData$.changeImage(null);
      } else {
        errorDialog.open(<p>{t('error_occurred')}</p>);
      }
      setDeleteLoading(false);

    } catch (err) {
      console.error(err);
      setDeleteLoading(false);
      errorDialog.open(<p>{t('error_occurred')}</p>);
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      setError(t('invalid_image_file'));
      return;
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError(t('image_too_large'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const extension = file.name.split('.').pop() || 'jpg';
        setSelectedEditingImage({
          path: file.name,
          name: file.name,
          extension: extension,
          data: result
        });
        setError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };
  if(!userData)return null;

  const handleImagePreview = () => {
    if (!userData.usersImage) return;
    previewDialog.open(
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '1rem' }}>
        <Image
          src={userData.usersImage}
          alt={t('profile_image')}
          width={300}
          height={300}
          style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', objectFit: 'contain' }}
        />
      </div>
    );
  };

  if (!editing) {
    return (
      <div className={styles.profileImageSection}>
        <div 
          className={styles.profileImageContainer}
          onClick={handleImagePreview}
          style={{ cursor: userData.usersImage ? 'pointer' : 'default' }}
        >
          {userData.usersImage ? (
            <Image
              className={styles.profileImage}
              src={userData.usersImage}
              alt={t('profile_image')}
              width={100}
              height={100}
            />
          ) : (
            <div className={styles.profileInitials}>
              {getInitials(userData.usersNames)}
            </div>
          )}
        </div>
        <div className={styles.imageActionRow}>
        { userData.usersImage && <button
          className={styles.removeImageButton}
          onClick={confirmDelete}
          disabled={deleteLoading}
        >
          {deleteLoading ? <span className={styles.spinner}></span> : t('remove_photo')}
        </button> }
        <button
          className={styles.changeImageButton}
          onClick={() => setEditing(true)}
        >
          {t('change_photo')}
        </button>
      </div>
      <previewDialog.DialogViewer
        title={t('profile_image')}
        buttons={[{ text: t('close_text'), variant: 'secondary', onClick: () => previewDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
      <deleteDialog.DialogViewer
        title={t('delete_image_title')}
        buttons={[
          { text: t('cancel_text'), variant: 'secondary', onClick: () => deleteDialog.close() },
          { text: t('delete_text'), variant: 'primary', onClick: handleRemove }
        ]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
      </div>
    );
  }

  return (
    <div className={styles.editSection}>
      <div className={styles.formGroup}>
        <label htmlFor="profileImage" className={styles.label}>
          {t('profile_image')}
        </label>

        <input
          type="file"
          id="profileImage"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className={styles.fileInput}
        />

        <div className={styles.imageUploadContainer}>
          {selectedEditingImage ? (
            <div className={styles.imagePreview}>
              <div 
                className={styles.previewImageWrapper}
                onClick={() => previewDialog.open(
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '1rem' }}>
                    <img
                      src={selectedEditingImage.data}
                      alt={t('image_preview')}
                      style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', objectFit: 'contain', maxHeight: '70vh' }}
                    />
                  </div>
                )}
              >
                <img
                  src={selectedEditingImage.data}
                  alt={t('image_preview')}
                  className={styles.previewImage}
                />
              </div>
              <button
                onClick={triggerFileInput}
                className={styles.changeImageButton}
              >
                {t('choose_different_image')}
              </button>
            </div>
          ) : (
            <div
              className={styles.uploadPlaceholder}
              onClick={triggerFileInput}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M17 21v-2a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>{t('click_to_select_image')}</span>
              <span className={styles.uploadHint}>{t('image_upload_hint')}</span>
            </div>
          )}
        </div>

        {error && <p className={styles.errorText}>{error}</p>}
      </div>

      <ActionButtons
        onCancel={() => {
          setEditing(false);
          setSelectedEditingImage(null);
          setError('');
        }}
        onSave={handleSave}
        saveDisabled={!selectedEditingImage || saveLoading}
        saveLoading={saveLoading}
        t={t}
      />
      <previewDialog.DialogViewer
        title={t('image_preview')}
        buttons={[{ text: t('close_text'), variant: 'secondary', onClick: () => previewDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
      <errorDialog.DialogViewer
        title={t('error_text')}
        buttons={[{ text: t('ok_text'), variant: 'primary', onClick: () => errorDialog.close() }]}
        showCancel={false}
        closeOnBackdrop={true}
        layoutProp={{ backgroundColor: theme === 'light' ? '#fff' : '#121212', margin: '16px', titleColor: theme === 'light' ? '#1a1a1a' : '#fff' }}
      />
    </div>
  );
};

export default function EditProfile() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const nav = useNav();
  const { userData, userData$, __meta } = useUserData();

  const [fetchedUserData, setFetchedUserData] = useState<UserData | null>(null);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');

  const goBack = () => nav.pop();

  const fetchUserData = useCallback(async (): Promise<void> => {
    if (fetchedUserData) return;
    if (!userData || !__meta.isHydrated) return;

    try {
      setFetchLoading(true);
      setError('');

      const { data, error } = await supabaseBrowser.rpc("get_user_record", {
        p_user_id: userData.usersId
      });

      if (error) {
        console.error("[UserFetch] error:", error);
        setError(t('error_occurred'));
        setFetchLoading(false);
        return;
      }

      const getUserData = new UserData(data);
      setFetchedUserData(getUserData);
      setFetchLoading(false);
      userData$.set(getUserData);
    } catch (err) {
      console.error("[UserFetch] error:", err);
      setFetchLoading(false);
      setError(t('error_occurred'));
    }
  }, [userData, __meta.isHydrated, fetchedUserData, t, userData$]);

  useEffect(() => {
    if (userData && __meta.isHydrated && !fetchedUserData) {
      fetchUserData();
    }
  }, [userData, __meta.isHydrated, fetchedUserData, fetchUserData]);

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('edit_profile')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
        {fetchLoading && <LoadingView />}

        {!fetchLoading && error && (
          <ErrorView
            text={error}
            buttonText={t('try_again')}
            onButtonClick={fetchUserData}
          />
        )}

        {!fetchLoading && !error && !fetchedUserData && (
          <NoResultsView
            text={t('no_results')}
            buttonText={t('try_again')}
            onButtonClick={fetchUserData}
          />
        )}

        {fetchedUserData && (
          <div className={styles.profileContent}>
            <ImageView onEditing={(id) => console.log(id)} />
            <div className={styles.profileFields}>
              <FullnameView onEditing={(id) => console.log(id)} />
              <EmailView onEditing={(id) => console.log(id)} />
              <PhoneNumberView onEditing={(id) => console.log(id)} />
              <UserNameView onEditing={(id) => console.log(id)} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}