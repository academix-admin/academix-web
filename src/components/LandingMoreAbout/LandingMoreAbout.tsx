'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './LandingMoreAbout.module.css';

interface Step {
  title: string;
  items: string[];
  types?: string[];
  color: string;
  numberColor: string;
  titleColor: string;
}

export default function LandingMoreAbout() {
  const { t } = useLanguage();
  const { theme } = useTheme();

  const steps: Step[] = [
    {
      title: 'Sign up',
      color: '#E8F0FF',
      numberColor: '#1A73E8',
      titleColor: '#1A73E8',
      items: [
        'Create your account',
        'Choose account *type*'
      ],
      types: [
           'Student',
           'Reviewer',
           'Creator',
           'Organization'
          ]
    },
    {
      title: 'Complete Account',
      color: '#EDFDF2',
      numberColor: '#2F855A',
      titleColor: '#2F855A',
      items: ['*Verify* your details', 'Obtain *KYC* verification']
    },
    {
      title: 'Setup Profile',
      color: '#E6FAF8',
      numberColor: '#319795',
      titleColor: '#319795',
      items: [
        'Set up your profile and manage your quiz topic *preferences*',
        '*Top up* wallet balance add add *withdrawal* profiles'
      ]
    },
    {
      title: 'Play a Quiz',
      color: '#F5EAFE',
      numberColor: '#9F7AEA',
      titleColor: '#9F7AEA',
      items: [
        'Join a quiz challenge in your topic *interest*',
        'Answer the *best* ways you can'
      ]
    },
    {
      title: 'Get Rewarded',
      color: '#FFF9E6',
      numberColor: '#D69E2E',
      titleColor: '#D69E2E',
      items: [
        'Get *paid* even when you *lose*',
        'Refer *friends* for *discounts*',
        'Earn periodically daily *Streaks*',
        'Redeem *Missions* & *Achievements*'
      ]
    },
    {
      title: 'Earn your value',
      color: '#F7F7F7',
      numberColor: '#000000',
      titleColor: '#000000',
      items: [
        'Exchange your tokens to *real value* into verified payment account',
        'View statistics, player ratio and earnings'
      ]
    }
  ];

  return (
    <div className={styles.container}>
      <h1 className={`${styles.title} ${styles[`title_${theme}`]}` } dangerouslySetInnerHTML={{ __html: t('what_academix_abt').replace('Academix', `<span class="${styles.academixText} ${styles.academixText}_${theme}">Academix</span>`) }} />      <div className={styles.stepsContainer}>
        {steps.map((step, index) => (
          <div
            key={index}
            className={styles.step}
            style={{ backgroundColor: step.color }}
          >
            <div className={styles.stepHeader}>
              <span
                className={styles.stepNumber}
                style={{
                  backgroundColor: step.numberColor,
                  color: '#fff'
                }}
              >
                {index + 1}
              </span>
              <h3 className={styles.stepTitle} style={{ color: step.titleColor }}>
                {step.title}
              </h3>
            </div>
            <ul className={styles.stepItems}>
              {step.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className={styles.stepItem}
                  style={{ color: step.titleColor }}
                ><span dangerouslySetInnerHTML={{
                                       __html: item.replace(/\*(.*?)\*/g, '<strong style="color: ' + step.titleColor + '">$1</strong>')
                                     }} /></li>
              ))}
            </ul>
            {step.types && step.types.length > 0 ? (
              <select
                key="account-type"
                className={styles.stepItem}
                style={{
                  width: '100%',
                  minHeight: '38px',
                  color: 'white',
                  backgroundColor: step.titleColor,
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
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
