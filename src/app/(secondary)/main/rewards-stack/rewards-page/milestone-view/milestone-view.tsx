'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './milestone-view.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { MissionData } from '@/models/mission-data';
import { AchievementsData } from '@/models/achievements-data';
import { ComponentStateProps } from '@/hooks/use-component-state';
import { useNav } from "@/lib/NavigationStack";
import { useMissionData } from '@/lib/stacks/milestone-stack';
import { useAchievementsData } from '@/lib/stacks/milestone-stack';

export default function MilestoneView({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();
  const nav = useNav();
  const isTop = nav.isTop();

  const [missionData, demandMissionData, setMissionData] = useMissionData(lang);

  const [achievementsData, demandAchievementsData, setAchievementsData] = useAchievementsData(lang);

  useEffect(() => {
    if(!userData)return;
    demandMissionData(async ({ get, set }) => {
      try {
        onStateChange?.('loading');
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );
        if(!paramatical)return;
        const { data, error } = await supabaseBrowser.rpc("get_user_missions_count", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;

        const missionData = new MissionData(data.mission_data);

        if (data.status === "MissionStatus.success") {
          set(missionData);
          return;
        }
      } catch (err) {
        console.error("[Mission] demand error:", err);
        onStateChange?.('error');
      }
    });
  }, [lang, userData, demandMissionData]);

  useEffect(() => {
    if(!userData)return;
    demandAchievementsData(async ({ get, set }) => {
      try {
        onStateChange?.('loading');
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );
        if(!paramatical)return;
        const { data, error } = await supabaseBrowser.rpc("get_user_achievements_count", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;

        const achievementData = new AchievementsData(data.achievements_data);

        if (data.status === "AchievementStatus.success") {
          set(achievementData);
          return;
        }
      } catch (err) {
        console.error("[Achievements] demand error:", err);
        onStateChange?.('error');
      }
    });
  }, [lang, userData, demandAchievementsData]);

  useEffect(() => {
      if(missionData && achievementsData){
          onStateChange?.('data');
      }else{
         onStateChange?.('none');
      }
  }, [missionData, achievementsData]);

  const handleMissionClick = () => {
    // Navigate to mission screen
    nav.push('mission_page');
  };

  const handleAchievementClick = () => {
    // Navigate to achievement screen
        nav.push('achievement_page');

  };

  if (!missionData || !achievementsData) return null;

  return (
    <div className={styles.performanceContainer}>
      <h2 className={`${styles.performanceTitle} ${styles[`performanceTitle_${theme}`]}`}>
        {t('milestone_text')}
      </h2>

      <div className={styles.performanceSection}>
        <div className={styles.performanceGrid}>
          {/* Mission Card */}
          <div
            className={`${styles.performanceItem} ${styles[`performanceItem_${theme}`]}`}
            onClick={handleMissionClick}
            style={{cursor: 'pointer'}}
          >
            <div className={styles.performanceContent}>
              <div className={styles.performanceValueContainer}>
                <div className={styles.valueSection}>
                  <span className={`${styles.performanceValue} ${styles[`performanceValue_${theme}`]}`}>
                    {missionData.missionCompleted}/{missionData.missionCount}
                  </span>
                  <span className={`${styles.performanceLabel} ${styles[`performanceLabel_${theme}`]}`}>
                    {t('missions_text').toUpperCase()}
                  </span>
                </div>

                <div className={styles.rightSection}>
                  {missionData.missionNotRewarded > 0 && (
                    <div className={styles.redeemBadge}>
                      {missionData.missionNotRewarded}
                    </div>
                  )}
                  <div className={styles.arrowContainer}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Achievement Card */}
          <div
            className={`${styles.performanceItem} ${styles[`performanceItem_${theme}`]}`}
            onClick={handleAchievementClick}
            style={{cursor: 'pointer'}}
          >
            <div className={styles.performanceContent}>
              <div className={styles.performanceValueContainer}>
                <div className={styles.valueSection}>
                  <span className={`${styles.performanceValue} ${styles[`performanceValue_${theme}`]}`}>
                    {achievementsData.achievementsCompleted}/{achievementsData.achievementsCount}
                  </span>
                  <span className={`${styles.performanceLabel} ${styles[`performanceLabel_${theme}`]}`}>
                    {t('achievements_text').toUpperCase()}
                  </span>
                </div>

                <div className={styles.rightSection}>
                  {achievementsData.achievementsNotRewarded > 0 && (
                    <div className={styles.redeemBadge}>
                      {achievementsData.achievementsNotRewarded}
                    </div>
                  )}
                  <div className={styles.arrowContainer}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}