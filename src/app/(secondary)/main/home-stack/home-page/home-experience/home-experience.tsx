'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './home-experience.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import { getParamatical, ParamaticalData} from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { useDemandState } from '@/lib/state-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserEngagementModel } from '@/models/user-engagement';
import { ComponentStateProps } from '@/hooks/use-component-state';

export default function HomeExperience({ onStateChange }: ComponentStateProps) {
  const { theme } = useTheme();
  const { t, lang, tNode } = useLanguage();
  const { userData, userData$ } = useUserData();

  const [userEngagement, demandUserEngagement, setUserEngagement] = useDemandState<UserEngagementModel | null>(
    null,
    {
      key: "engagementData",
      persist: true,
//       ttl: 3600,
      scope: "secondary_flow",
      deps: [lang],
    }
  );

  useEffect(() => {
    demandUserEngagement(async ({ get, set }) => {
      if(!userData)return;
      onStateChange?.('loading');
      try {
        const paramatical = await getParamatical(
          userData.usersId,
          lang,
          userData.usersSex,
          userData.usersDob
        );
        if(!paramatical)return;
        const { data, error } = await supabaseBrowser.rpc("get_user_engagement", {
          p_user_id: paramatical.usersId,
          p_locale: paramatical.locale,
          p_country: paramatical.country,
          p_gender: paramatical.gender,
          p_age: paramatical.age,
        });

        if (error || data?.error) throw error || data.error;

        const engagement = new UserEngagementModel(data.user_engagement_details);

        if (data.status === "EngagementStatus.success") {
          set(engagement);
                onStateChange?.('data');

        }
      } catch (err) {
        console.error("[HomeExperience] demand error:", err);
      }
    });
  }, [lang, userData, demandUserEngagement]);

    useEffect(() => {
        if(userEngagement){
            onStateChange?.('data');
        }else{
           onStateChange?.('none');
        }
    }, [userEngagement]);

  if (!userEngagement) return null;

  const progress = userEngagement.userEngagementProgressPointsDetails;

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('experience_points')}
      </h2>
      <div className={styles.experienceSection}>
        <div className={styles.levelInfo}>
          <div className={styles.levelIcon}>
            <svg viewBox="0 0 19 17" width="19" height="17">
              <path
                d="M9.22222 15L2 6.51389L4.05653 2H14.3879L16.4444 6.51389L9.22222 15Z"
                fill="white"
              />
            </svg>
          </div>
          <div className={styles.levelText}>
            <div className={styles.levelName}>
              {progress.engagementLevelsIdentity}
            </div>
            <div className={styles.pointsToNext}>
              {t('point_next_level', { value: progress.pointsToNextLevel.toFixed(0) })}
            </div>
          </div>
        </div>

        <div className={styles.progressWrapper}>
          <div className={styles.levelBadge}>{progress.engagementLevelsId}</div>

          <div className={styles.progressContainer}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress.currentProgressPercent}%` }}
              />
            </div>
            { progress.currentProgressPercent > 5 && (
                <div
                              className={styles.progressMarker}
                              style={{ left: `${progress.currentProgressPercent}%` }}
                            >
                              P
                            </div>
                )}
          </div>

          <div className={styles.levelBadge}>{progress.nextEngagementLevelsId}</div>
        </div>
      </div>
    </div>
  );
}