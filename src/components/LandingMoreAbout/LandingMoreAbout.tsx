'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './LandingMoreAbout.module.css';

interface StepColors {
  light: string;
  dark: string;
}

interface StepConfig {
  title: string;
  colors: {
    background: StepColors;
    number: StepColors;
    title: StepColors;
    text: StepColors;
  };
  items: string[];
  typeBackground?: StepColors;
  types?: string[];
}

export default function LandingMoreAbout() {
  const { t } = useLanguage();
  const { theme } = useTheme();



  const stepsConfig: StepConfig[] = [
    {
      title: 'Sign up',
      colors: {
        background: { light: '#E8F0FF', dark: '#0D1B2A' },
        number: { light: '#1A73E8', dark: '#1A73E8' },
        title: { light: '#1A73E8', dark: '#A5CCFF' },
        text: { light: '#1A73E8', dark: '#A5CCFF' }
      },
      items: [
        'Create your account',
        'Choose account *type*'
      ],
      typeBackground: { light: '#1A73E8', dark: '#1A73E8' },
      types: ['Student', 'Reviewer', 'Creator', 'Organization']
    },
    {
      title: 'Complete Account',
      colors: {
        background: { light: '#EDFDF2', dark: '#0F1F17' },
        number: { light: '#2F855A', dark: '#2F855A' },
        title: { light: '#2F855A', dark: '#88E3B5' },
        text: { light: '#2F855A', dark: '#88E3B5' }
      },
      items: ['*Verify* your details', 'Obtain *KYC* verification']
    },
    {
      title: 'Setup Profile',
      colors: {
        background: { light: '#E6FAF8', dark: '#0D1F1E' },
        number: { light: '#319795', dark: '#319795' },
        title: { light: '#319795', dark: '#98D7D6' },
        text: { light: '#319795', dark: '#98D7D6' }
      },
      items: [
        'Set up your profile and manage your quiz topic *preferences*',
        '*Top up* wallet balance add add *withdrawal* profiles'
      ]
    },
    {
      title: 'Play a Quiz',
      colors: {
        background: { light: '#F5EAFE', dark: '#1A0D2A' },
        number: { light: '#9F7AEA', dark: '#9F7AEA' },
        title: { light: '#9F7AEA', dark: '#C1A5FA' },
        text: { light: '#9F7AEA', dark: '#C1A5FA' }
      },
      items: [
        'Join a quiz challenge in your topic *interest*',
        'Answer the *best* ways you can'
      ]
    },
    {
      title: 'Get Rewarded',
      colors: {
        background: { light: '#FFF9E6', dark: '#2A210D' },
        number: { light: '#D69E2E', dark: '#D69E2E' },
        title: { light: '#D69E2E', dark: '#FFDA8F' },
        text: { light: '#D69E2E', dark: '#FFDA8F' }
      },
      items: [
        'Get *paid* even when you *lose*',
        'Refer *friends* for *discounts*',
        'Earn periodically daily *Streaks*',
        'Redeem *Missions* & *Achievements*'
      ]
    },
    {
      title: 'Earn your value',
      colors: {
        background: { light: '#F7F7F7', dark: '#1A1A1A' },
        number: { light: '#000000', dark: '#000000' },
        title: { light: '#000000', dark: '#DCD5D5' },
        text: { light: '#000000', dark: '#DCD5D5' }
      },
      items: [
        'Exchange your tokens to *real value* into verified payment account',
        'View statistics, player ratio and earnings'
      ]
    }
  ];

  // Helper function to get color based on theme with fallback
  const getThemeColor = (colors: StepColors, property: keyof StepConfig['colors']) => {
    return colors[theme] || colors.light;
  };

  return (
    <div className={styles.container}>
      <h1 className={`${styles.title} ${styles[`title_${theme}`]}`}>
        {t('what_academix_abt_part1')}{' '}
        <span className={`${styles.academixText} ${styles[`academixText_${theme}`]}`}>
          {t('what_academix_abt_part2')}
        </span>{' '}
        {t('what_academix_abt_part3')}
      </h1>
      <h4 className={`${styles.description} ${styles[`description_${theme}`]}`}>
              {t('what_academix_is_desc')}
            </h4>
      <div className={styles.stepsContainer}>
        {stepsConfig.map((step, index) => {
          return (
            <div
              key={index}
              className={styles.step}
              style={{
                backgroundColor: getThemeColor(step.colors.background, 'background')
              }}
            >
              <div className={styles.stepHeader}>
                <span
                  className={styles.stepNumber}
                  style={{
                    backgroundColor: getThemeColor(step.colors.number, 'number'),
                    color: '#fff'
                  }}
                >
                  {index + 1}
                </span>
                <h3
                  className={styles.stepTitle}
                  style={{
                    color: getThemeColor(step.colors.title, 'title')
                  }}
                >
                  {step.title}
                </h3>
              </div>
              <ul className={styles.stepItems}>
                {step.items.map((item, itemIndex) => (
                  <li
                    key={itemIndex}
                    className={styles.stepItem}
                    style={{ color: getThemeColor(step.colors.text, 'text') }}
                  >
                    <span dangerouslySetInnerHTML={{
                      __html: item.replace(
                        /\*(.*?)\*/g,
                        `<strong style="color: ${getThemeColor(step.colors.title, 'title')}">$1</strong>`
                      )
                    }} />
                  </li>
                ))}
              </ul>
              {step.types && step.types.length > 0 && (
                <select
                  key="account-type"
                  className={styles.stepItem}
                  style={{
                    width: '100%',
                    minHeight: '38px',
                    color: 'white',
                    backgroundColor: step.typeBackground[theme] || getThemeColor(step.colors.title, 'title'),
                    border: 'none',
                    borderRadius: '4px'
                  }}
                >
                  {step.types.map((type, typeIndex) => (
                    <option key={typeIndex} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}