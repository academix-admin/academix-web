'use client';

import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './mission-page.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalize } from '@/utils/textUtils';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import TabMilestone from "@/models/tab-milestone";

// Define the Mission type
interface Mission {
  id: string;
  title: string;
  description: string;
  points: number;
  status: 'active' | 'pending' | 'completed';
  icon?: string;
  progress?: number;
  totalSteps?: number;
  completedSteps?: number;
  expiresAt?: string;
}

export default function MissionPage() {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();

  const [activeTabs, setActiveTabs] = useState<TabMilestone[]>([
    { id: 'active', label: t('active_text'), active: true },
    { id: 'pending', label: t('pending_text'), active: false },
    { id: 'completed', label: t('completed_text'), active: false }
  ]);

  const [missions, setMissions] = useState<Mission[]>([]);
  const [filteredMissions, setFilteredMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tabsRef = useRef<HTMLDivElement>(null);

  // Get active tab
  const activeTab = activeTabs.find(tab => tab.active)?.id || 'active';

  // Set active tab
  const setActiveTab = (id: string) => {
    setActiveTabs(prev => prev.map(tab => ({
      ...tab,
      active: tab.id === id
    })));
  };

  // Fetch missions from Supabase or API
  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setLoading(true);

        // In a real app, you would fetch from your database/API
        // const { data, error } = await supabaseBrowser
        //   .from('missions')
        //   .select('*')
        //   .order('created_at', { ascending: false });

        // For demo purposes, using mock data
        const mockMissions: Mission[] = [
          {
            id: '1',
            title: 'Complete Profile',
            description: 'Fill out all sections of your profile',
            points: 100,
            status: 'active',
            progress: 60,
            totalSteps: 5,
            completedSteps: 3
          },
          {
            id: '2',
            title: 'First Check-in',
            description: 'Check in at any location for the first time',
            points: 50,
            status: 'active',
            icon: '📍'
          },
          {
            id: '3',
            title: 'Refer a Friend',
            description: 'Share the app with a friend who signs up',
            points: 200,
            status: 'pending',
            expiresAt: '2023-12-31'
          },
          {
            id: '4',
            title: 'Weekly Challenge',
            description: 'Complete 5 check-ins this week',
            points: 150,
            status: 'completed',
            icon: '🏆'
          },
          {
            id: '5',
            title: 'Explore 10 Locations',
            description: 'Discover 10 different places',
            points: 300,
            status: 'active',
            progress: 30,
            totalSteps: 10,
            completedSteps: 3
          }
        ];

        setMissions(mockMissions);
      } catch (err) {
        setError(t('mission_fetch_error') || 'Failed to load missions');
        console.error('Error fetching missions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, [t]);

  // Filter missions based on active tab
  useEffect(() => {
    if (missions.length > 0) {
      const filtered = missions.filter(mission => mission.status === activeTab);
      setFilteredMissions(filtered);
    }
  }, [activeTab, missions]);

  const handleMissionClick = (mission: Mission) => {
    // Navigate to mission details or perform action
    console.log('Mission clicked:', mission);
    // nav.push('/mission-details', { missionId: mission.id });
  };

  const renderMissionCard = (mission: Mission) => {
    return (
      <div
        key={mission.id}
        className={`${styles.missionCard} ${styles[`missionCard_${theme}`]}`}
        onClick={() => handleMissionClick(mission)}
      >
        <div className={styles.missionHeader}>
          <div className={styles.missionIcon}>
            {mission.icon || '🎯'}
          </div>
          <div className={styles.missionInfo}>
            <h3 className={styles.missionTitle}>{mission.title}</h3>
            <p className={styles.missionDescription}>{mission.description}</p>
          </div>
          <div className={styles.missionPoints}>
            <span className={styles.points}>{mission.points}</span>
            <span className={styles.pointsLabel}>{t('points_text')}</span>
          </div>
        </div>

        {mission.progress !== undefined && mission.totalSteps && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(mission.progress / mission.totalSteps) * 100}%` }}
              ></div>
            </div>
            <div className={styles.progressText}>
              {mission.completedSteps}/{mission.totalSteps} {t('completed_text')}
            </div>
          </div>
        )}

        {mission.expiresAt && (
          <div className={styles.expiry}>
            {t('expires_text')}: {new Date(mission.expiresAt).toLocaleDateString()}
          </div>
        )}

        <div className={styles.missionStatus}>
          <span className={`${styles.statusBadge} ${styles[`status_${mission.status}`]}`}>
            {t(`${mission.status}_text`)}
          </span>
        </div>
      </div>
    );
  };

  const renderEmptyState = () => {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>📋</div>
        <h3 className={styles.emptyTitle}>{t('no_missions_title')}</h3>
        <p className={styles.emptyDescription}>
          {t(`no_missions_${activeTab}_description`)}
        </p>
      </div>
    );
  };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
          <button
            className={styles.backButton}
            onClick={() => nav.pop()}
            aria-label="Go back"
          >
            <svg className={styles.backIcon} viewBox="0 0 16 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M10.0424 0.908364L1.01887 8.84376C0.695893 9.12721 0.439655 9.46389 0.264823 9.83454C0.089992 10.2052 0 10.6025 0 11.0038C0 11.405 0.089992 11.8024 0.264823 12.173C0.439655 12.5437 0.695893 12.8803 1.01887 13.1638L10.0424 21.0992C12.2373 23.0294 16 21.6507 16 18.9239V3.05306C16 0.326231 12.2373 -1.02187 10.0424 0.908364Z"
                fill="currentColor"
              />
            </svg>
          </button>
          <h1 className={styles.title}>{t('missions_text')}</h1>
        </div>
      </header>

      <div className={styles.innerBody}>
        <div className={styles.tab_switcher} ref={tabsRef}>
          {activeTabs.map((tab) => (
            <button
              key={tab.id}
              className={`${styles.tab} ${tab.active ? styles.tab_active : ''} ${styles[`tab_${theme}`]}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {capitalize(tab.label)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>{t('loading_missions_text')}</p>
          </div>
        ) : error ? (
          <div className={styles.errorContainer}>
            <p className={styles.errorText}>{error}</p>
            <button
              className={styles.retryButton}
              onClick={() => window.location.reload()}
            >
              {t('retry_text')}
            </button>
          </div>
        ) : (
          <div className={styles.missionsList}>
            {filteredMissions.length > 0
              ? filteredMissions.map(renderMissionCard)
              : renderEmptyState()
            }
          </div>
        )}
      </div>
    </main>
  );
}