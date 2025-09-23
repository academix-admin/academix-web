'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './payment-profile.module.css';
import { useNav } from "@/lib/NavigationStack";
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendPaymentProfileModel } from '@/models/payment-profile-model';
import { PaymentProfileModel } from '@/models/payment-profile-model';
import { PaginateModel } from '@/models/paginate-model';
import { SelectionViewer, useSelectionController } from "@/lib/SelectionViewer";
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import DialogCancel from '@/components/DialogCancel';
import { usePaymentProfileModel } from '@/lib/stacks/payment-profile-stack';

interface PaymentProfileProps {
  profileType: string;
  methodId: string;
  methodType: string;
  onProfileSelect: (profile: PaymentProfileModel) => void;
  onCreateProfile: () => void;
}

interface ProfileItemProps {
  onClick: () => void;
  profile: PaymentProfileModel;
  methodType: string;
  isSelected?: boolean;
}


const ProfileItem = ({ onClick, profile, methodType, isSelected }: ProfileItemProps) => {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const buildProfileView = (profile: PaymentProfileModel, methodType: string) => {

    switch (methodType) {
      case 'PaymentMethod.mobile_money':
        return (
          <div className={styles.profileItem}>
              <div className={styles.bankDetails}>
                <div className={styles.bankDetailRow}>
                {profile.paymentDetails?.phone || t('error_text')}
                </div>
                <div className={styles.bankDetailRow}>
                  {profile.paymentDetails?.network || t('error_text')}
                </div>
                </div>
          </div>
        );

      case 'PaymentMethod.private_account':
        return (
          <div className={styles.profileItem}>
             {t('private_account')}
          </div>
        );

      case 'PaymentMethod.e_naira':
        return (
          <div className={styles.profileItem}>
             {t('e_naira_text')}
          </div>
        );

      case 'PaymentMethod.direct_debit':
        return (
          <div className={styles.profileItem}>
           {t('direct_debit_text')}
          </div>
        );

      case 'PaymentMethod.ussd':
        return (
          <div className={styles.profileItem}>
            {profile.paymentDetails?.bankName}
          </div>
        );

      case 'PaymentMethod.opay':
        return (
          <div className={styles.profileItem}>
            {t('opay_text')}
          </div>
        );

      case 'PaymentMethod.bank_transfer':
        return (
          <div className={styles.profileItem}>
              <div className={styles.bankDetails}>
                <div className={styles.bankDetailRow}>
                  {profile.paymentDetails?.fullname || t('error_text')}
                </div>
                <div className={styles.bankDetailRow}>
                  {profile.paymentDetails?.accountNumber || t('error_text')}
                </div>
                <div className={styles.bankDetailRow}>
                  {profile.paymentDetails?.bankName || t('error_text')}
                </div>
            </div>
          </div>
        );

      default:
        return (
          <div className={styles.profileItem}>
            <div className={styles.profileItemLeft}>
              <span className={styles.profileLabel}>{t('profile_text')}</span>
            </div>
            <div className={styles.profileItemRight}>
              <span className={styles.profileValue}>
                {t('error_text')}
              </span>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`${styles.profileItemContainer} ${styles[`profileItemContainer_${theme}`]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      {buildProfileView(profile, methodType)}
    </div>
  );
};

export default function PaymentProfile({ profileType, methodId, methodType, onProfileSelect, onCreateProfile }: PaymentProfileProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [profileData, setProfileData] = useState<PaymentProfileModel | null>(null);
  const [userProfileState, setUserProfileState] = useState<'initial' | 'loading' | 'data' | 'error'>('initial');

  const [profileSelectId, profileSelectController, profileSelectIsOpen, profileSelectionState] = useSelectionController();
  const [searchProfileQuery, setProfileQuery] = useState('');

  const [profilesModel, demandPaymentProfileModel, setPaymentProfileModel] = usePaymentProfileModel(lang);

  useEffect(() => {
    if (!profileData) return;
    onProfileSelect(profileData);
  }, [profileData, onProfileSelect]);

  useEffect(() => {
    if (profilesModel.length <= 0)setProfileData(null);
  }, [profilesModel]);

  const fetchPaymentProfileModel = useCallback(async (
    userData: UserData,
    limitBy: number,
    paginateModel: PaginateModel
  ): Promise<PaymentProfileModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc(profileType === 'ProfileType.buy' ? "fetch_top_up_profiles" : "fetch_withdraw_profiles", {
        p_user_id: paramatical.usersId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_method_id: methodId,
        p_after_profiles: paginateModel.toJson(),
      });

      if (error) {
        console.error("[PaymentProfileModel] error:", error);
        return [];
      }
      return (data || []).map((row: BackendPaymentProfileModel) => new PaymentProfileModel(row));
    } catch (err) {
      console.error("[PaymentProfileModel] error:", err);
      return [];
    }
  }, [lang, methodId]);

  const extractLatest = useCallback((userPaymentProfileModel: PaymentProfileModel[]) => {
    if (userPaymentProfileModel.length > 0) {
      const lastItem = userPaymentProfileModel[userPaymentProfileModel.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  }, []);

  const processPaymentProfileModelPaginate = useCallback((userPaymentProfileModel: PaymentProfileModel[]) => {
    const oldPaymentProfileModelIds = profilesModel.map((e) => e.paymentProfileId);
    const newPaymentProfileModel = [...profilesModel];

    for (const profile of userPaymentProfileModel) {
      if (!oldPaymentProfileModelIds.includes(profile.paymentProfileId)) {
        newPaymentProfileModel.push(profile);
      }
    }

    setPaymentProfileModel(newPaymentProfileModel);
  }, [profilesModel, setPaymentProfileModel]);

  const callPaginate = useCallback(async (): Promise<boolean> => {
    if (!userData || profilesModel.length <= 0) return false;

    const profiles = await fetchPaymentProfileModel(userData, 20, paginateModel);
    if (profiles.length > 0) {
      extractLatest(profiles);
      processPaymentProfileModelPaginate(profiles);
      return true;
    }
    return false;
  }, [userData, profilesModel, paginateModel, fetchPaymentProfileModel, extractLatest, processPaymentProfileModelPaginate]);

  const refreshData = useCallback(async () => {
    if (!userData || profilesModel.length > 0) return;

    const profiles = await fetchPaymentProfileModel(userData, 100, paginateModel);
    if (profiles.length > 0) {
      extractLatest(profiles);
      setPaymentProfileModel(profiles);
    }
  }, [userData, profilesModel, paginateModel, fetchPaymentProfileModel, extractLatest, setPaymentProfileModel]);

  const loadProfiles = useCallback(() => {
    demandPaymentProfileModel(async ({ get, set }) => {
      profileSelectController.setSelectionState("loading");
      const profiles = await fetchPaymentProfileModel(userData!, 100, new PaginateModel());

      if (!profiles) {
        profileSelectController.setSelectionState("error");
        return;
      }

      extractLatest(profiles);
      if (profiles.length > 0) {
        set(profiles);
        profileSelectController.setSelectionState("data");
      } else {
        profileSelectController.setSelectionState("empty");
      }
    });
  }, [demandPaymentProfileModel, fetchPaymentProfileModel, userData, extractLatest, profileSelectController]);

  const openProfile = useCallback(() => {
    if (!userData) return;
    profileSelectController.toggle();
    loadProfiles();
  }, [userData, profileSelectController, loadProfiles]);

  const handleProfileSearch = useCallback((query: string) => {
    setProfileQuery(query);
  }, []);

  const filteredProfiles = useMemo(() => {
    if (!searchProfileQuery) return profilesModel;

    const filters = profilesModel.filter(item => {
      const searchTerm = searchProfileQuery.toLowerCase();
      const payment = item.paymentDetails;

      return (
        payment?.email?.toLowerCase().includes(searchTerm) ||
        payment?.phone?.toLowerCase().includes(searchTerm) ||
        payment?.country?.toLowerCase().includes(searchTerm) ||
        payment?.network?.toLowerCase().includes(searchTerm) ||
        payment?.fullname?.toLowerCase().includes(searchTerm) ||
        payment?.bankName?.toLowerCase().includes(searchTerm) ||
        payment?.accountNumber?.toLowerCase().includes(searchTerm)
      );
    });

    if (filters.length <= 0 && profilesModel.length > 0) {
      profileSelectController.setSelectionState("empty");
    }

    return filters;
  }, [profilesModel, searchProfileQuery, profileSelectController]);

  const handleProfileSelect = useCallback((profile: PaymentProfileModel) => {
    setProfileData(profile);
    profileSelectController.close();
  }, [profileSelectController]);

const buildProfileView = (profile: PaymentProfileModel, methodType: string) => {
  const getDefaultView = (mainText: string | null | undefined, subText?: string | null | undefined) => (
    <div className={styles.selectedProfile}>
      <div className={styles.profileInfo}>
        <div className={styles.profileMainText}>{mainText || t('error_text')}</div>
        {subText && <div className={styles.profileSubText}>{subText}</div>}
      </div>
    </div>
  );

  const getErrorText = () => t('error_text');

  switch (methodType) {
    case 'PaymentMethod.mobile_money':
      return getDefaultView(
        profile.paymentDetails?.phone,
        profile.paymentDetails?.network
      );

    case 'PaymentMethod.bank_transfer':
      return (
        <div className={styles.selectedProfile}>
          <div className={styles.profileInfo}>
            <div className={styles.profileMainText}>
              {profile.paymentDetails?.fullname || getErrorText()}
            </div>
            {profile.paymentDetails?.accountNumber && (
              <div className={styles.profileSubText}>
                {profile.paymentDetails.accountNumber}
              </div>
            )}
            {profile.paymentDetails?.bankName && (
              <div className={styles.profileSubText}>
                {profile.paymentDetails.bankName}
              </div>
            )}
          </div>
        </div>
      );

    case 'PaymentMethod.private_account':
      return getDefaultView(t('private_account'));

    case 'PaymentMethod.e_naira':
      return getDefaultView(t('e_naira_text'));

    case 'PaymentMethod.direct_debit':
      return getDefaultView(t('direct_debit_text'));

    case 'PaymentMethod.ussd':
      return getDefaultView(profile.paymentDetails?.bankName);

    case 'PaymentMethod.opay':
      return getDefaultView(t('opay_text'));

    default:
      return getDefaultView(getErrorText());
  }
};

   const createNewProfile = async () => {
     profileSelectController.close();
     onCreateProfile();
   };

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('payment_profile_text')}
      </h2>

      <div className={styles.formGroup}>
        <button onClick={openProfile} className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`}>
          {profileData ? (
             buildProfileView(profileData, methodType)
          ) : (
            <div className={styles.placeholder}>
              {t('select_payment_profile')}
            </div>
          )}
          <svg className={styles.chevron} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
      </div>

      <SelectionViewer
        id={profileSelectId}
        isOpen={profileSelectIsOpen}
        onClose={profileSelectController.close}
        onPaginate={callPaginate}
        titleProp={{
          text: t('select_payment_profile'),
          textColor: theme === 'light' ? "#000" : "#fff"
        }}
        cancelButton={{
          position: "right",
          onClick: profileSelectController.close,
          view: <DialogCancel />
        }}
        searchProp={{
          text: t('search'),
          onChange: handleProfileSearch,
          background: theme === 'light' ? "#f5f5f5" : "#272727",
          textColor: theme === 'light' ? "#000" : "#fff",
          padding: { l: "4px", r: "4px", t: "0px", b: "0px" },
          autoFocus: false,
        }}
        loadingProp={{
          view: <LoadingView text={t('loading')} />,
        }}
        noResultProp={{
          view: <NoResultsView text={t('no_results')} buttonText={t('create_profile')} onButtonClick={createNewProfile} />,
        }}
        errorProp={{
          view: <ErrorView text={t('error_occurred')} buttonText={t('try_again')} onButtonClick={loadProfiles} />,
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
        snapPoints={[1]}
        initialSnap={1}
        minHeight="65vh"
        maxHeight="90vh"
        closeThreshold={0.2}
        selectionState={profileSelectionState}
        zIndex={1000}
      >
        {filteredProfiles.map((item) => (
          <ProfileItem
            key={item.paymentProfileId}
            onClick={() => handleProfileSelect(item)}
            profile={item}
            methodType={methodType}
            isSelected={profileData?.paymentProfileId === item.paymentProfileId}
          />
        ))}
      </SelectionViewer>
    </div>
  );
}