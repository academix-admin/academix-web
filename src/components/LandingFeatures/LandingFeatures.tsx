'use client';
import styles from './LandingFeatures.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

export default function LandingFeatures() {
  const { theme } = useTheme();
  const { t } = useLanguage();


interface FeaturesColors {
  light: string;
  dark: string;
}
  const getThemeColor = (colors: FeaturesColors, property: String) => {
    return colors[theme] || colors.light;
  };

  const featuresConfig = [
    {
      title: 'Are you an Academix?',
      colors: {
        background: { light: '#D4FCDC', dark: '#1A3C1A' },
        title: { light: '#000000', dark: '#A5D6A7' },
        text: { light: '#000000', dark: '#A5D6A7' },
      },
      description:
        'Get a profile with academix and become an *ACADEMIX STUDENT*, *ACADEMIX CREATOR*, *ACADEMIX REVIEWER* and more...',
      imageUrl: '/assets/image/l/1.jpg',
      imageDirection: 'right',
      imagePosition: 'bot',
    },
    {
      title: 'How is my Revenue?',
      colors: {
        background: { light: '#F4DDFD', dark: '#3C1F27' },
        title: { light: '#000000', dark: '#F48FB1' },
        text: { light: '#000000', dark: '#F48FB1' },
      },
      description:
        'Earn life-time earnings from academix using the *specific roles* you fit in and a *one-time buy in.*',
      imageUrl: '/assets/image/l/2.png',
      imageDirection: 'left',
      imagePosition: 'mid',
    },
    {
      title: 'Redeem Code',
      colors: {
        background: { light: '#DCD4FD', dark: '#2C1F3C' },
        title: { light: '#000000', dark: '#CE93D8' },
        text: { light: '#000000', dark: '#CE93D8' },
      },
      description:
        'A *payment code* to be redeemed with *game play* and some *set of rules*.',
      imageUrl: '/assets/image/l/3.jpg',
      imageDirection: 'right',
      imagePosition: 'mid',
    },
    {
      title: 'Academix Streaks',
      colors: {
        background: { light: 'rgb(233 229 229)', dark: 'rgb(53 53 53)' },
        title: { light: '#000000', dark: 'rgb(201 201 201)' },
        text: { light: '#000000', dark: 'rgb(201 201 201)' },
      },
      description:
        'Stay *consistent* — stay active in a defined row of days and redeem your code. Break the streak? Start again *stronger*.',
      imageUrl: '/assets/image/l/4.jpg',
      imageDirection: 'left',
      imagePosition: 'mid',
    },
    {
      title: 'Academix Ratio',
      colors: {
        background: { light: '#FFE1BF', dark: '#3C2F1F' },
        title: { light: '#000000', dark: '#FFD180' },
        text: { light: '#000000', dark: '#FFD180' },
      },
      description:
        'We *measure* how well you *engage*, *perform* and *grow*. A fair system to know how you *compare* to others.',
      imageUrl: '/assets/image/l/9.jpg',
      imageDirection: 'right',
      imagePosition: 'mid',
    },
{
  title: 'Contribution & Review',
  colors: {
    background: { light: '#D4E8FD', dark: '#1A2C3C' },
    title: { light: '#000000', dark: '#90CAF9' },
    text: { light: '#000000', dark: '#90CAF9' },
  },
  description:
    'Create quality quizzes and help approve others. Earn as a *creator* or *reviewer* and shape the learning space.',
  imageUrl: '/assets/image/l/9.jpg',
  imageDirection: 'left',
  imagePosition: 'mid',
},
{
  title: 'Referral',
  colors: {
    background: { light: '#DCFDE6', dark: '#1A3C2A' },
    title: { light: '#000000', dark: '#A5D6A7' },
    text: { light: '#000000', dark: '#A5D6A7' },
  },
  description:
    'Refer a friend. *They top-up*, you earn a *redeem code* for a game play. They must *play* before *withdrawing.*',
  imageUrl: '/assets/image/l/6.png',
  imageDirection: 'right',
  imagePosition: 'mid',
},
{
  title: 'Withdraw & Top Up',
  colors: {
    background: { light: '#FFF3C2', dark: '#3C321F' },
    title: { light: '#000000', dark: '#FFEB3B' },
    text: { light: '#000000', dark: '#FFEB3B' },
  },
  description:
    'Easily *add ADC* tokens to join games or *withdraw* your earnings with supported payment methods. Simple and instant.',
  imageUrl: '/assets/image/l/7.jpg',
  imageDirection: 'left',
  imagePosition: 'mid',
},
{
  title: 'What’s Next?',
  colors: {
    background: { light: '#E1D4FD', dark: '#2A1C3C' },
    title: { light: '#000000', dark: '#B39DDB' },
    text: { light: '#000000', dark: '#B39DDB' },
  },
  description:
    'Expect more with *live events*, *daily spins*, *custom challenges*, and *Academix Facts* — all coming soon.',
  imageUrl: '/assets/image/l/8.png',
  imageDirection: 'right',
  imagePosition: 'mid',
}
  ];

  return (
    <div className={styles.lsf_span}>
      <div className={styles.badge}>Features</div>
      <h1 className={`${styles.title} ${styles[`title_${theme}`]}`}>{t('laas_platform')}</h1>
      <h4 className={`${styles.description} ${styles[`description_${theme}`]}`}>
        {t('laas_plat_desc')}
      </h4>

      <div className={styles.featuresContainer}>
        {featuresConfig.map((feature, index) => {
          const isImageLeft = feature.imageDirection === 'left';
          const imageClass =
            feature.imagePosition === 'top'
              ? styles.imageTop
              : feature.imagePosition === 'bot'
              ? styles.imageBot
              : styles.imageMid;

          return (
            <div
              key={index}
              className={styles.featureCard}
              style={{ backgroundColor: getThemeColor(feature.colors.background, 'background') }}
            >
              <div
                className={`${styles.featureContent} ${
                  isImageLeft ? styles.reverseRow : ''
                }`}
              >
                <img
                  src={feature.imageUrl}
                  alt={feature.title}
                  className={`${styles.featureImage} ${imageClass}`}
                />
                <div className={styles.featureText}>
                  <h3
                    className={styles.featureTitle}
                    style={{ color: getThemeColor(feature.colors.title, 'title') }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    className={styles.featureDescription}
                    style={{ color: getThemeColor(feature.colors.text, 'text') }}
                    dangerouslySetInnerHTML={{
                      __html: feature.description.replace(/\*(.*?)\*/g, '<strong>$1</strong>'),
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
