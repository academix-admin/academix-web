'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './page.module.css';
import { GroupNavigationStack } from "@/lib/NavigationStack";
import NavigationBar from "@/lib/NavigationBar";
import SideBar from "@/lib/SideBar";
import { HomeStack } from './home-stack/home-stack';
import { RewardsStack } from './rewards-stack/rewards-stack';
import { QuizStack } from './quiz-stack/quiz-stack';
import { PaymentStack } from './payment-stack/payment-stack';
import { ProfileStack } from './profile-stack/profile-stack';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import { UserData } from '@/models/user-data';
import { useUserData } from '@/lib/stacks/user-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { StateStack } from '@/lib/state-stack';

const Main = () => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const [active, setActive] = useState('home-stack');
   const { userData, userData$, __meta } = useUserData();

useEffect(() => {

  const handleSignOut = async () => {
    if (!userData && __meta.isHydrated) {
      try {
        await supabaseBrowser.auth.signOut();
        await StateStack.core.clearScope('secondary_flow');
        await StateStack.core.clearScope('mission_flow');
        await StateStack.core.clearScope('achievements_flow');
        await StateStack.core.clearScope('payment_flow');
        sessionStorage.clear();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }
  };

  handleSignOut();
}, [userData,__meta.isHydrated]);


  const navStackMap = new Map([
    ['home-stack', <HomeStack />],
    ['rewards-stack', <RewardsStack />],
    ['quiz-stack', <QuizStack />],
    ['payment-stack', <PaymentStack />],
    ['profile-stack', <ProfileStack />],
  ]);

  const navigationItems = [
    {
      id: 'home-stack',
      text: t('home_text'),
      svg: (
        <svg fill="none" height="1.30em" viewBox="0 0 24 22" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M11.056 0.357854C11.3064 0.12872 11.646 0 12 0C12.354 0 12.6936 0.12872 12.944 0.357854L20.9549 7.69127L23.6252 10.1357C23.8684 10.3663 24.003 10.675 24 10.9955C23.9969 11.3159 23.8565 11.6225 23.6089 11.8491C23.3614 12.0757 23.0265 12.2043 22.6764 12.207C22.3264 12.2098 21.9891 12.0866 21.7373 11.864L21.3461 11.5059V19.5555C21.3461 20.2038 21.0648 20.8256 20.564 21.284C20.0632 21.7425 19.384 22 18.6758 22H14.6703C14.3162 22 13.9766 21.8712 13.7262 21.642C13.4758 21.4128 13.3352 21.1019 13.3352 20.7778V17.1111H10.6648V20.7778C10.6648 21.1019 10.5242 21.4128 10.2738 21.642C10.0234 21.8712 9.68379 22 9.32969 22H5.32422C4.61601 22 3.9368 21.7425 3.43602 21.284C2.93524 20.8256 2.65391 20.2038 2.65391 19.5555V11.5059L2.2627 11.864C2.01089 12.0866 1.67363 12.2098 1.32355 12.207C0.973481 12.2043 0.638607 12.0757 0.391058 11.8491C0.14351 11.6225 0.00309252 11.3159 5.04724e-05 10.9955C-0.00299157 10.675 0.131585 10.3663 0.374794 10.1357L3.04511 7.69127L11.056 0.357854Z"
                fill="currentColor"
                fillRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'rewards-stack',
      text: t('reward_text'),
      svg: (
        <svg fill="none" height="1.30em" viewBox="0 0 22 22" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M2.75 0C1.232 0 0 1.12009 0 2.50021V4.8244C0.00058588 5.35913 0.158347 5.88399 0.456955 6.34467C0.755563 6.80535 1.18417 7.18511 1.6984 7.44462L8.0256 10.6429C6.70031 11.2512 5.63931 12.2479 5.014 13.4721C4.3887 14.6963 4.23562 16.0764 4.5795 17.3894C4.92338 18.7024 5.74413 19.8717 6.90915 20.7083C8.07417 21.5449 9.51541 22 11 22C12.4846 22 13.9258 21.5449 15.0908 20.7083C16.2559 19.8717 17.0766 18.7024 17.4205 17.3894C17.7644 16.0764 17.6113 14.6963 16.986 13.4721C16.3607 12.2479 15.2997 11.2512 13.9744 10.6429L20.3038 7.44662C20.818 7.18668 21.2463 6.8065 21.5445 6.34546C21.8428 5.88441 22 5.35927 22 4.8244V2.50021C22 1.12009 20.768 0 19.25 0H2.75ZM8.8 8.74473V2.00017H13.2V8.74473L11 9.85683L8.8 8.74473ZM15.4 16.0013C15.4 17.0623 14.9364 18.0798 14.1113 18.83C13.2861 19.5802 12.167 20.0017 11 20.0017C9.83305 20.0017 8.71389 19.5802 7.88873 18.83C7.06357 18.0798 6.6 17.0623 6.6 16.0013C6.6 14.9404 7.06357 13.9229 7.88873 13.1727C8.71389 12.4225 9.83305 12.001 11 12.001C12.167 12.001 13.2861 12.4225 14.1113 13.1727C14.9364 13.9229 15.4 14.9404 15.4 16.0013Z"
                fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'quiz-stack',
      text: t('quiz_text'),
      svg: (
        <svg fill="none" height="1.30em" viewBox="0 0 24 23" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M12.7898 0.0239615C10.9391 -0.0900544 9.08569 0.203904 7.37582 0.88264C5.66312 1.56162 4.14117 2.60795 2.93042 3.93881C1.71545 5.27218 0.842557 6.85253 0.37972 8.55681C-0.0831179 10.2611 -0.123415 12.0433 0.261965 13.7647C0.64436 15.4856 1.44274 17.0997 2.59471 18.4808C3.74391 19.8596 5.21594 20.9677 6.89507 21.718C8.57136 22.4679 10.4094 22.8387 12.2636 22.8011C14.1178 22.7635 15.9373 22.3185 17.578 21.5015C17.6306 21.4761 17.6894 21.4643 17.7483 21.4674C17.8073 21.4704 17.8644 21.4881 17.9137 21.5187C19.4718 22.5046 21.3097 23.0209 23.1847 22.9994C23.229 22.9996 23.2729 22.9915 23.3139 22.9756C23.3549 22.9598 23.3921 22.9363 23.4234 22.9067C23.4547 22.8771 23.4795 22.842 23.4964 22.8032C23.5132 22.7645 23.5217 22.723 23.5214 22.6812V18.8114C23.5219 18.7358 23.4941 18.6625 23.4429 18.6044C23.3916 18.5463 23.3203 18.5073 23.2415 18.4942C22.8558 18.4361 22.479 18.3334 22.1198 18.1885C22.0528 18.1601 21.9976 18.1117 21.9626 18.0507C21.9276 17.9898 21.9147 17.9196 21.9261 17.8511C21.9319 17.8054 21.9493 17.7617 21.9768 17.7237C23.1483 16.0575 23.8371 14.1302 23.9745 12.1341C24.1119 10.1379 23.693 8.14263 22.7598 6.34713C21.8289 4.55435 20.415 3.02469 18.6602 1.9119C16.9096 0.801584 14.8795 0.147982 12.7756 0.0172531L12.7898 0.0239615ZM4.74083 11.4024C4.73975 10.0373 5.16487 8.70216 5.96299 7.56423C6.76023 6.43006 7.89476 5.5441 9.22376 5.0179C10.5521 4.49286 12.0161 4.35449 13.4282 4.62049C14.8404 4.8865 16.1363 5.54478 17.15 6.51101C18.1672 7.47997 18.8594 8.71088 19.1399 10.0497C19.4204 11.3885 19.2769 12.7758 18.7272 14.0379C18.1773 15.2985 17.2445 16.377 16.0465 17.1371C14.6488 18.0223 12.9689 18.4207 11.2945 18.264C9.62016 18.1074 8.05553 17.4054 6.8687 16.2785C5.50474 14.9823 4.7381 13.2293 4.73576 11.4014L4.74083 11.4024Z"
                fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'payment-stack',
      text: t('payment_text'),
      svg: (
        <svg fill="none" height="1.30em" viewBox="0 0 26 23" width="1.50em" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M0.5 2.4036C0.5 1.03604 1.74286 0 3.17857 0H22.8214C24.2571 0 25.5 1.03604 25.5 2.4036V11.6865C25.5 13.0541 24.2571 14.0901 22.8214 14.0901H3.17857C1.74286 14.0901 0.5 13.0541 0.5 11.6865V2.4036ZM16.5714 7.04504C16.5714 7.92432 16.1952 8.76758 15.5254 9.38933C14.8556 10.0111 13.9472 10.3604 13 10.3604C12.0528 10.3604 11.1444 10.0111 10.4746 9.38933C9.80485 8.76758 9.42857 7.92432 9.42857 7.04504C9.42857 6.16577 9.80485 5.3225 10.4746 4.70076C11.1444 4.07902 12.0528 3.72973 13 3.72973C13.9472 3.72973 14.8556 4.07902 15.5254 4.70076C16.1952 5.3225 16.5714 6.16577 16.5714 7.04504ZM6.75 7.45946C6.75 7.29619 6.71536 7.13453 6.64805 6.98369C6.58075 6.83285 6.4821 6.6958 6.35773 6.58035C6.23337 6.46491 6.08573 6.37333 5.92324 6.31085C5.76075 6.24837 5.58659 6.21622 5.41071 6.21622C5.23484 6.21622 5.06068 6.24837 4.89819 6.31085C4.7357 6.37333 4.58806 6.46491 4.46370 6.58035C4.33933 6.6958 4.24068 6.83285 4.17338 6.98369C4.10607 7.13453 4.07143 7.29619 4.07143 7.45946C4.07143 7.78919 4.21253 8.10541 4.46370 8.33856C4.71486 8.57172 5.05551 8.7027 5.41071 8.7027C5.76591 8.7027 6.10657 8.57172 6.35773 8.33856C6.60890 8.10541 6.75 7.78919 6.75 7.45946ZM20.5893 6.21622C20.9445 6.21622 21.2851 6.3472 21.5363 6.58035C21.7875 6.81351 21.9286 7.12973 21.9286 7.45946C21.9286 7.78919 21.7875 8.10541 21.5363 8.33856C21.2851 8.57172 20.9445 8.7027 20.5893 8.7027C20.2341 8.7027 19.8934 8.57172 19.6423 8.33856C19.3911 8.10541 19.25 7.78919 19.25 7.45946C19.25 7.12973 19.3911 6.81351 19.6423 6.58035C19.8934 6.3472 20.2341 6.21622 20.5893 6.21622ZM9.65179 17.4054C9.65179 17.1306 9.53420 16.8671 9.32490 16.6728C9.11559 16.4785 8.83171 16.3694 8.53571 16.3694C8.23971 16.3694 7.95584 16.4785 7.74653 16.6728C7.53723 16.8671 7.41964 17.1306 7.41964 17.4054V20.7207C7.41964 20.9955 7.53723 21.259 7.74653 21.4533C7.95584 21.6476 8.23971 21.7568 8.53571 21.7568C8.83171 21.7568 9.11559 21.6476 9.32490 21.4533C9.53420 21.259 9.65179 20.9955 9.65179 20.7207V17.4054ZM17.4643 16.3694C18.0804 16.3694 18.5804 16.8335 18.5804 17.4054V20.7207C18.5804 20.8568 18.5515 20.9915 18.4954 21.1172C18.4393 21.2429 18.3571 21.3571 18.2535 21.4533C18.1498 21.5495 18.0268 21.6258 17.8914 21.6779C17.7560 21.73 17.6108 21.7568 17.4643 21.7568C17.3177 21.7568 17.1726 21.73 17.0372 21.6779C16.9018 21.6258 16.7787 21.5495 16.6751 21.4533C16.5715 21.3571 16.4893 21.2429 16.4332 21.1172C16.3771 20.9915 16.3482 20.8568 16.3482 20.7207V17.4054C16.3482 16.8335 16.8482 16.3694 17.4643 16.3694ZM13 17.6126C13.6161 17.6126 14.1161 18.0768 14.1161 18.6486V21.9640C14.1161 22.2387 13.9985 22.5023 13.7892 22.6966C13.5799 22.8908 13.2960 23 13 23C12.7040 23 12.4201 22.8908 12.2108 22.6966C12.0015 22.5023 11.8839 22.2387 11.8839 21.9640V18.6486C11.8839 18.0768 12.3839 17.6126 13 17.6126Z"
                fill="currentColor"
                fillRule="evenodd" />
        </svg>
      ),
    },
    {
      id: 'profile-stack',
      text: t('profile_text'),
      svg: (
        <svg fill="none" height="1.30em" viewBox="0 0 22 22" width="1.30em" xmlns="http://www.w3.org/2000/svg">
            <path clipRule="evenodd" d="M6.11111 4.88889C6.11111 3.59227 6.62619 2.34877 7.54303 1.43192C8.45988 0.515078 9.70339 0 11 0C12.2966 0 13.5401 0.515078 14.457 1.43192C15.3738 2.34877 15.8889 3.59227 15.8889 4.88889C15.8889 6.18550 15.3738 7.42901 14.457 8.34586C13.5401 9.26270 12.2966 9.77778 11 9.77778C9.70339 9.77778 8.45988 9.26270 7.54303 8.34586C6.62619 7.42901 6.11111 6.18550 6.11111 4.88889ZM6.11111 12.2222C4.49034 12.2222 2.93596 12.8661 1.78990 14.0121C0.643847 15.1582 0 16.7126 0 18.3333C0 19.3058 0.386309 20.2384 1.07394 20.9261C1.76158 21.6137 2.69421 22 3.66667 22H18.3333C19.3058 22 20.2384 21.6137 20.9261 20.9261C21.6137 20.2384 22 19.3058 22 18.3333C22 16.7126 21.3562 15.1582 20.2101 14.0121C19.0640 12.8661 17.5097 12.2222 15.8889 12.2222H6.11111Z"
                fill="currentColor"
                fillRule="evenodd" />
        </svg>
      ),
    },
  ];

  const backgroundColor = theme === 'light' ? "#fff" : "#121212";
  const borderColor = theme === 'light' ? "#e5e7eb" : "#2a2a2a";

  return (
    <div className={`${styles.mainContainer} ${styles[`mainContainer_${theme}`]}`}>
      <div className={styles.contentWrapper}>
        <div className={styles.sidebarContainer}>
          <SideBar
            navKeys={navigationItems}
            activeId={active}
            activeColor={theme === 'light' ? "#166534" : "#4ade80"}
            inactiveColor={theme === 'light' ? "#6b7280" : "#9ca3af"}
            hoverColor={theme === 'light' ? "#22c55e" : "#86efac"}
            backgroundColor={backgroundColor}
            textSize="14px"
            fontWeight={600}
            iconSize="18px"
            widthExpanded = "220px"
            widthCollapsed = "60px"
            onChange={(id) => setActive(id)}
            className={styles.mainSide}
            logo={<Image
                                className={styles.logo}
                                src="/assets/image/academix-logo.png"
                                alt="Academix Logo"
                                width={25}
                                height={25}
                                priority
                              />}
          />
        </div>

        <div className={styles.contentArea}>
          <GroupNavigationStack
            id="main-group"
            navStack={navStackMap}
            current={active}
            onCurrentChange={setActive}
            persist
          />
        </div>
      </div>

      <div className={styles.navigationContainer}>
        <NavigationBar
          navKeys={navigationItems}
          mode="autohide"
          activeId={active}
          activeColor={theme === 'light' ? "#166534" : "#4ade80"}
          inactiveColor={theme === 'light' ? "#6b7280" : "#9ca3af"}
          hoverColor={theme === 'light' ? "#22c55e" : "#86efac"}
          backgroundColor={backgroundColor}
          normalHeight="70px"
          shrinkHeight="0px"
          iconSize="18px"
          textSize="12px"
          fontWeight={600}
          itemSpacing="8px"
          paddingY="0px"
          paddingX="0px"

          /* Bar visuals */
          barBorderTop={`1px solid ${borderColor}`}
          barBorderRadius="16px 16px 0 0"
          barShadow={theme === 'light' ? "0 -4px 20px rgba(0,0,0,0.1)" : "0 -4px 20px rgba(0,0,0,0.3)"}

          /* Floating button */
          floatingButton={
            <svg xmlns="http://www.w3.org/2000/svg"
                 viewBox="0 0 24 24"
                 height="1.5em"
                 width="1.5em"
                 fill="currentColor">
              <path d="M3 6h18M3 12h18M3 18h18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"/>
            </svg>
          }
          floatingButtonPosition="left"
          floatingButtonBottom="16px"
          floatingButtonPadding="16px"
          floatingButtonColor={theme === 'light' ? "#10b981" : "#059669"}
          floatingButtonTextColor="#fff"
          floatingButtonRadius="50%"
          floatingButtonShadow={theme === 'light' ? "0 6px 12px rgba(0,0,0,0.25)" : "0 6px 12px rgba(0,0,0,0.4)"}
          onChange={(id) => setActive(id)}
          className={styles.mainNavigation}
        />
      </div>
    </div>
  );
};

export default Main;