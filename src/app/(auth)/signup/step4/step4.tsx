'use client';

import { useEffect, useState, useCallback, useMemo,} from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './step4.module.css';
import Link from 'next/link';
import CachedLottie from '@/components/CachedLottie';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useStack, signupConfig} from '@/lib/stacks/signup-stack';
import { useDemandState } from '@/lib/state-stack';
import { useNav } from "@/lib/NavigationStack";
import { BottomViewer, useBottomController } from "@/lib/BottomViewer";
import CustomScrollDatePicker from "@/lib/CustomScrollDatePicker";
import DialogCancel from '@/components/DialogCancel';

interface GenderItemProps {
  onClick: () => void;
  text: string;
}

const GenderItem = ({ onClick, text }: GenderItemProps) => {
  const { theme } = useTheme();
  return (
    <div
      className={`${styles.item} ${styles[`item_${theme}`]}`}
      onClick={onClick}
      aria-label={`Option ${text}`}
      role="button"
      tabIndex={0}
    >
      {text}
    </div>
  );
};

export default function SignUpStep4() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { signup, signup$, __meta  } = useStack('signup', signupConfig, 'signup_flow');
  const nav = useNav();
  const isTop = nav.isTop();


  const [firstname, setFirstname] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [continueLoading, setContinueLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

 const [birthdayBottomViewerId, birthdayViewerController, birthdayViewerIsOpen] = useBottomController();
 const [genderBottomViewerId, genderBottomController, genderBottomIsOpen] = useBottomController();

  const [birthdayState, setBirthdayState] = useState('initial');

  useEffect(() => {
    if(!signup.fullName && __meta.isHydrated && isTop){nav.go('step1');}
    setFirstname(capitalize(getLastNameOrSingle(signup.fullName)));
  }, [signup.fullName,__meta.isHydrated, isTop]);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);


  useEffect(() => {
   const dateObj = typeof signup.birthday === 'string' ? new Date(signup.birthday) : signup.birthday;

    if(!!dateObj){
        const today = new Date();
            const fiveYearsAgo = new Date();
            fiveYearsAgo.setFullYear(today.getFullYear() - 5);
            if (dateObj > fiveYearsAgo) {
                setBirthdayState('less');
                setIsFormValid(false);
                return;
            }
            setIsFormValid(!!signup.gender);
            setBirthdayState('initial');}

  }, [signup.birthday, signup.gender]);

  const handleGender = (gender: string) => {
    signup$.setField({ field: 'gender', value: gender });
    genderBottomController.close();
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    setContinueLoading(true);
    signup$.setStep(5);
    nav.push('step5');
    setContinueLoading(false);
  };


  const formatBirthday = (date: Date | string | null) => {
    if (!date) return '';

    // Convert string to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) return '';

    const day = dateObj.getDate();
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();

    const shortMonthsMap: { [key: number]: string } = {
      0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr',
      4: 'May', 5: 'Jun', 6: 'Jul', 7: 'Aug',
      8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec'
    };

    return `${day} - ${shortMonthsMap[month]} - ${year}`;
  };

  const openBirthday = () => {
    birthdayViewerController.open();
  };
  const openGender = () => {
    genderBottomController.open();
  };

  const handleDateChange = (date: Date ) => {
    signup$.setField({ field: 'birthday', value: date });
    console.log('Selected date:', date);
  };

  const genderList = useMemo(() => {

        return ['Male', 'Female'];
  }, []);
  

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      {continueLoading && <div className={styles.continueLoadingOverlay} aria-hidden="true" />}

      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          {canGoBack && (
            <button
              className={styles.backButton}
              onClick={() => nav.pop()}
              aria-label="Go back"
              disabled={continueLoading}
            >
              <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}

          <h1 className={styles.title}>{t('sign_up')}</h1>

          <Link className={styles.logoContainer} href="/">
            <Image
              className={styles.logo}
              src="/assets/image/academix-logo.png"
              alt="Academix Logo"
              width={40}
              height={40}
              priority
            />
          </Link>
        </div>
      </header>

      <div className={styles.innerBody}>
        <CachedLottie
          id="signup-step2"
          src="/assets/lottie/sign_up_step_2_lottie_1.json"
          className={styles.welcome_wrapper}
          restoreProgress
        />

        <h2 className={styles.stepTitle}>{t('hi_name', { name: firstname })}</h2>
        <p className={styles.stepSubtitle}>{t('step_x_of_y', { current: 4, total: signupConfig.totalSteps })}</p>

        <div  className={styles.form}>
          <div  className={styles.formGroup}>
           <label htmlFor="birthday" className={styles.label}>
                        {t('birthday')}
            </label>
            <button onClick={openBirthday} className={styles.select}> {formatBirthday(signup.birthday) || 'Select'} </button>
            {birthdayState === 'less' && (
                                      <p className={`${styles.errorText} ${styles[`errorText_${theme}`]}`}>{t('date_less')}</p>
                                    )}
          </div>
          <div  className={styles.formGroup}>
           <label htmlFor="gender" className={styles.label}>
                        {t('gender')}
            </label>
            <button onClick={openGender} className={styles.select}> {signup.gender || 'Select'} </button>
          </div>
          <button
            type="submit"
            className={styles.continueButton}
            disabled={!isFormValid || continueLoading}
            aria-disabled={!isFormValid || continueLoading}
            onClick={handleSubmit}
          >
                {continueLoading ? <span className={styles.spinner}></span> : t('continue')}
          </button>
        </div>
      </div>



      <BottomViewer
                      id={birthdayBottomViewerId}
                      isOpen={birthdayViewerIsOpen}
                      onClose={birthdayViewerController.close}

                      cancelButton={{
                        position: "right",
                        onClick: birthdayViewerController.close,
                        view: <DialogCancel />
                        }}
                      layoutProp={{
                        backgroundColor:  theme === 'light' ?  "#fff" : "#121212",
                        handleColor: "#888",
                        handleWidth: "48px",
                      }}
                      closeThreshold={0.2}
                      zIndex={1000}
                    >
                      <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
                      <div className={`${styles.dialogHeaderContainer} ${styles[`dialogHeaderContainer_${theme}`]}`}>
                      <h3 className={`${styles.dialogTitle} ${styles[`dialogTitle_${theme}`]}`}>SELECT BIRTHDAY DATE</h3>
                      <span className={`${styles.dialogDescription} ${styles[`dialogDescription_${theme}`]}`}>*Age Rating: <strong>5+</strong></span>
                      </div>

                                <CustomScrollDatePicker
                                        onChange={handleDateChange}
                                        defaultDate={true}
                                        quickDate={true}
                                        opacity={0.5}
                                        itemExtent={30}
                                        useMagnifier={true}
                                        magnification={1.5}
                                        textSize={18}
                                        height={100}
                                        startFromDate={!!signup.birthday ? typeof signup.birthday === 'string' ? new Date(signup.birthday) : signup.birthday : null}
                                        backgroundColor="#f8f9fa"
                                        primaryTextColor="#2c3e50"
                                        secondaryTextColor="#95a5a6"
                                        todayText="Today"
                                        yesterdayText="Yesterday"
                                      />
                                      <div className={`${styles.dialogBottomContainer} ${styles[`dialogBottomContainer_${theme}`]}`}>
                                          <button className={`${styles.selectButton} ${styles[`selectButton_${theme}`]}`} onClick={birthdayViewerController.close}>Select Date</button>
                                      </div>
                              </div>
                    </BottomViewer>

      <BottomViewer
                      id={genderBottomViewerId}
                      isOpen={genderBottomIsOpen}
                      onClose={genderBottomController.close}
                      cancelButton={{
                        position: "right",
                        onClick: genderBottomController.close,
                        view: <DialogCancel />
                        }}
                      layoutProp={{
                        backgroundColor:  theme === 'light' ?  "#fff" : "#121212",
                        handleColor: "#888",
                        handleWidth: "48px",
                      }}
                      closeThreshold={0.2}
                      zIndex={1000}
                    >
                       <div className={`${styles.dialogContainer} ${styles[`dialogContainer_${theme}`]}`}>
                                            <div className={`${styles.dialogHeaderContainer} ${styles[`dialogHeaderContainer_${theme}`]}`}>
                                            <h3 className={`${styles.dialogTitle} ${styles[`dialogTitle_${theme}`]}`}>SELECT YOUR GENDER</h3>
                                            <div className={`${styles.itemContainer} ${styles[`itemContainer_${theme}`]}`} >
                                            {genderList.map((gender, index) => (
                                                                    <GenderItem
                                                                      key={index}
                                                                      onClick={() => handleGender(gender)}
                                                                      text={gender}
                                                                    />
                                            ))}
                                            </div>
                                            </div>

                      </div>
                    </BottomViewer>

    </main>
  );
}