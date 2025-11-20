'use client';

import { use, useEffect, useState, useMemo, useLayoutEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { getSupportedLang } from '@/context/LanguageContext';
import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/providers/AuthProvider'


interface Config {
  showHeader: boolean;
  backgroundColor: Record<string, string> | null;
}

const iosConfig: Config = {
  showHeader: false,
  backgroundColor: { 'light': '#fff', 'dark': '#212121' }
};

const androidConfig: Config = {
  showHeader: false,
  backgroundColor: { 'light': '#fff', 'dark': '#232323' }
};

const rewardConfig: Config = {
  showHeader: false,
  backgroundColor: null
};

const defaultConfig: Config = {
  showHeader: true,
  backgroundColor: null
};

const getConfig = (req: string | null): Config => {
  const configMap: Record<string, Config> = {
    'ios': iosConfig,
    'android': androidConfig,
    'reward': rewardConfig
  };
  return configMap[req || ''] || defaultConfig;
};

// Educational content data
const rewardData = {
  en: {
    academixRatio: {
      title: "Academix Ratio",
      description: "Your overall engagement score that determines how you rank with others",
      factors: [
        "Daily streaks consistency",
        "14 days period",
        "Quiz participation & performance",
        "Mission completions",
        "Achievement unlocks",
        "Friend referrals activity"
      ],
      example: "4.2"
    },

    streaks: {
      title: "Daily Streaks",
      description: "Maintain consistency by daily check-in taps",
      cycle: "7-day weekly cycles, 30-day streak period",
      total: "10 ADC",
      example: "Complete 30 days → 10 ADC redeem code"
    },

    milestones: {
      title: "Milestones",
      missions: {
        title: "Missions",
        description: "Special time-limited challenges",
        reward: "50 ADC per mission",
        example: "First Quiz mission → 50 ADC reward"
      },
      achievements: {
        title: "Achievements",
        description: "Permanent accomplishments",
        reward: "100 ADC per achievement",
        example: "Quiz Master achievement → 100 ADC"
      }
    },

    friends: {
      title: "Friends",
      description: "Earn by inviting friends to join Academix",
      requirements: [
        "Friend registers with your @username",
        "Makes first deposit of 1000+",
        "Plays at least one quiz or waits 24 hours"
      ],
      reward: "300 ADC per qualified friend",
      example: "Use friend's username as redeem code to claim"
    }
  }
};

type StringOrNull = string | null;

interface Params {
  col: StringOrNull;
  lan: StringOrNull;
  req: StringOrNull;
  to: StringOrNull;
  [key: string]: string | null;
}

const useAppParams = <
  T extends Record<string, StringOrNull> = Params
>(
  fallbackParams?: Partial<T>
): T => {
  const searchParams = useSearchParams();

  // ✅ Start with a clean object that only has string | null values
  const params: Record<string, StringOrNull> = {};

  if (fallbackParams) {
    for (const key in fallbackParams) {
      const value = fallbackParams[key];
      params[key] = value ?? null; // ✅ ensure no undefined
    }
  }

  // ✅ Merge URL search params
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // ✅ Ensure all fallback keys exist
  if (fallbackParams) {
    for (const key of Object.keys(fallbackParams)) {
      if (!(key in params)) params[key] = null;
    }
  }

  return params as T;
};


interface RewardsPageProps {
  searchParams: Promise<Partial<Params>>;
}

export default function Rewards({ searchParams }: RewardsPageProps) {
  const resolvedSearchParams = use(searchParams);
  const { col, lan, req, to } = useAppParams(resolvedSearchParams);
  const { theme } = useTheme();
  const { t, tNode, lang } = useLanguage();
  const { initialized } = useAuthContext();
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [calledFind, setCalledFind] = useState(false);
  const [activeSection, setActiveSection] = useState('academix-ratio');

  const config = getConfig(req);
  const resolvedTheme = col || theme;
  const resolvedLang = getSupportedLang(lan) || lang;
  const content = rewardData[resolvedLang as keyof typeof rewardData] || rewardData.en;

  // Data for demonstration
  const exampleData = {
    academixRatio: 4.2,
    streaks: [
      { day: 'Sun', completed: true },
      { day: 'Mon', completed: true },
      { day: 'Tue', completed: true },
      { day: 'Wed', completed: true },
      { day: 'Thu', completed: false },
      { day: 'Fri', completed: false },
      { day: 'Sat', completed: false }
    ],
    friends: [
      { name: 'Casperthefather', username: '@fathercasper', date: 'Apr 27' },
      { name: 'Creator', username: '@creator1', date: 'Feb 1' }
    ]
  };

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);


  const getBackgroundStyle = (): React.CSSProperties => {
    if (config.backgroundColor && config.backgroundColor[resolvedTheme]) {
      return {
        background: config.backgroundColor[resolvedTheme],
        color: resolvedTheme === 'dark' ? '#ffffff' : '#000000'
      } as React.CSSProperties;
    }
    return {};
  };

  const getContainerClass = () => {
    const baseClass = styles.container;
    if (config.backgroundColor) {
      return baseClass;
    }
    return `${baseClass} ${styles[`container_${resolvedTheme}`]}`;
  };

  const goBack = () => {
    if (initialized) {
      router.replace('/main');
      return;
    }
    if (window.history.length <= 1) {
      router.replace('/main');
    } else {
      router.back();
    }
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  };

  useLayoutEffect(() => {
    if (calledFind) return;

    const targetSection = to || window.location.hash.replace('#', '');

    if (targetSection) {
      setCalledFind(true);
      setActiveSection(targetSection);

      // Small delay to ensure the next paint cycle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const element = document.getElementById(targetSection);
          if (element) {
            element.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });
          }
        });
      });
    }
  }, [to, calledFind]);

  const navigation = {
        academix: t('academix_ratio'),
        streaks:  t('streaks_text'),
        milestones:  t('milestone_text'),
        friends: t('friends_text')
      }

  return (
    <main
      className={getContainerClass()}
      style={getBackgroundStyle()}
    >
      {config.showHeader && (
        <header className={`${styles.header} ${styles[`header_${resolvedTheme}`]}`}>
          <div className={styles.headerContent}>
            {(canGoBack || initialized) && (
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
            )}

            <h1 className={styles.title}>{t('reward_text')}</h1>

            {!initialized && <Link className={styles.logoContainer} href="/">
              <Image
                className={styles.logo}
                src="/assets/image/academix-logo.png"
                alt="Academix Logo"
                width={40}
                height={40}
                priority
              />
            </Link>}
          </div>
        </header>
      )}

      <div className={`${styles.innerBody} ${styles[`innerBody_${req}`]}`}>

        {/* Quick Navigation */}
        <nav className={styles.quickNav}>
          {Object.entries(navigation).map(([key, label]) => (
            <button
              key={key}
              onClick={() => {
                const id = key === 'academix' ? 'academix-ratio' : key;
                scrollToSection(id);
                setActiveSection(id);
                setCalledFind(true);
              }}
              className={`${styles.navButton} ${
                activeSection === (key === 'academix' ? 'academix-ratio' : key) ? styles.navButtonActive : ''
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Academix Ratio Section */}
          <section id="academix-ratio" className={styles.section}>
            <div className={`${styles.sectionCard} ${styles[`sectionCard_${resolvedTheme}`]}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{content.academixRatio.title}</h2>
                <div className={styles.ratioBadge}>{exampleData.academixRatio}</div>
              </div>

              <div className={styles.ratioContent}>
                <p className={styles.description}>{content.academixRatio.description}</p>

                <div className={styles.ratioVisualization}>
                  <div className={styles.ratioMeter}>
                    <div
                      className={styles.ratioFill}
                      style={{ width: `${(exampleData.academixRatio / 10) * 100}%` }}
                    ></div>
                  </div>
                  <div className={styles.ratioLabels}>
                    <span>0</span>
                    <span>5</span>
                    <span>10</span>
                  </div>
                </div>

                <div className={styles.factorsGrid}>
                  <h4 className={styles.factorsTitle}>What contributes to your ratio:</h4>
                  <div className={styles.factorsList}>
                    {content.academixRatio.factors.map((factor, index) => (
                      <div key={index} className={styles.factorItem}>
                        <span className={styles.checkmark}>✓</span>
                        <span>{factor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.exampleBox}>
                  <div className={styles.exampleIcon}>💡</div>
                  <div className={styles.exampleContent}>
                    <strong>Example:</strong> {content.academixRatio.example}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Streaks Section */}
          <section id="streaks" className={styles.section}>
            <div className={`${styles.sectionCard} ${styles[`sectionCard_${resolvedTheme}`]}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{content.streaks.title}</h2>
                <div className={styles.streakCount}>
                  {exampleData.streaks.filter(s => s.completed).length}/7 days
                </div>
              </div>

              <div className={styles.streakContent}>
                <p className={styles.description}>{content.streaks.description}</p>

                <div className={styles.streakInfo}>
                  <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Cycle:</span>
                    <span className={styles.infoValue}>{content.streaks.cycle}</span>
                  </div>
                </div>

                <div className={styles.streakVisualization}>
                  <div className={styles.streakGrid}>
                    {exampleData.streaks.map((day, index) => (
                      <div key={index} className={styles.streakDay}>
                        <div className={`${styles.streakCircle} ${day.completed ? styles.completed : styles.pending}`}>
                          {day.completed ? '✓' : day.day.slice(0, 1)}
                        </div>
                        <span className={styles.dayLabel}>{day.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.exampleBox}>
                  <div className={styles.exampleIcon}>💡</div>
                  <div className={styles.exampleContent}>
                    <strong>Example:</strong> {content.streaks.example}
                  </div>
                </div>

                <div className={styles.totalReward}>
                  <span className={styles.totalLabel}>Period Potential:</span>
                  <span className={styles.totalValue}>{content.streaks.total}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Milestones Section */}
          <section id="milestones" className={styles.section}>
            <div className={`${styles.sectionCard} ${styles[`sectionCard_${resolvedTheme}`]} ${styles.milestonesCard}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{content.milestones.title}</h2>
              </div>

              <div className={styles.milestonesGrid}>
                <div className={styles.milestoneType}>
                  <div className={styles.milestoneHeader}>
                    <h3>{content.milestones.missions.title}</h3>
                    <div className={styles.rewardTag}>+50 ADC</div>
                  </div>
                  <p className={styles.milestoneDescription}>
                    {content.milestones.missions.description}
                  </p>
                  <div className={styles.exampleBox}>
                    <div className={styles.exampleIcon}>🎯</div>
                    <div className={styles.exampleContent}>
                      <strong>Example:</strong> {content.milestones.missions.example}
                    </div>
                  </div>
                </div>

                <div className={styles.milestoneType}>
                  <div className={styles.milestoneHeader}>
                    <h3>{content.milestones.achievements.title}</h3>
                    <div className={styles.rewardTag}>+100 ADC</div>
                  </div>
                  <p className={styles.milestoneDescription}>
                    {content.milestones.achievements.description}
                  </p>
                  <div className={styles.exampleBox}>
                    <div className={styles.exampleIcon}>🏆</div>
                    <div className={styles.exampleContent}>
                      <strong>Example:</strong> {content.milestones.achievements.example}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.redeemNote}>
                <div className={styles.noteIcon}>🔑</div>
                <p>All milestone rewards are automatically converted to redeem codes and can be redeemed to play quiz</p>
              </div>
            </div>
          </section>

          {/* Friends Section */}
          <section id="friends" className={styles.section}>
            <div className={`${styles.sectionCard} ${styles[`sectionCard_${resolvedTheme}`]}`}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{content.friends.title}</h2>
                <div className={styles.friendsCount}>{exampleData.friends.length} examples</div>
              </div>

              <div className={styles.friendsContent}>
                <p className={styles.description}>{content.friends.description}</p>

                <div className={styles.requirements}>
                  <h4>Requirements:</h4>
                  <ol className={styles.requirementsList}>
                    {content.friends.requirements.map((requirement, index) => (
                      <li key={index} className={styles.requirementItem}>
                        <span className={styles.stepNumber}>{index + 1}</span>
                        <span>{requirement}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className={styles.friendsExamples}>
                  <h4>Example Friends:</h4>
                  <div className={styles.friendsList}>
                    {exampleData.friends.map((friend, index) => (
                      <div key={index} className={styles.friendExample}>
                        <div className={styles.friendAvatar}>
                          {friend.name.charAt(0)}
                        </div>
                        <div className={styles.friendInfo}>
                          <div className={styles.friendName}>{friend.name}</div>
                          <div className={styles.friendUsername}>{friend.username}</div>
                        </div>
                        <div className={styles.friendReward}>+300 ADC</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.exampleBox}>
                  <div className={styles.exampleIcon}>💡</div>
                  <div className={styles.exampleContent}>
                    <strong>How to claim:</strong> {content.friends.example}
                  </div>
                </div>

                <div className={styles.rewardHighlight}>
                  <span className={styles.rewardAmount}>+300 ADC</span>
                  <span className={styles.rewardDescription}>per qualified friend</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}