'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './LandingFeatures.module.css';

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
        'Earn life-time earnings from academix using the *specific roles* you fit in and a *one-time buy in*',
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
        background: { light: '#FFE1BF', dark: '#3C2F1F' },
        title: { light: '#000000', dark: '#FFD180' },
        text: { light: '#000000', dark: '#FFD180' },
      },
      description:
        'Stay *consistent* — stay active in a defined row of days and redeem your code. Break the streak? Start again *stronger*.',
      imageUrl: '/assets/image/l/4.jpg',
      imageDirection: 'left',
      imagePosition: 'mid',
    },
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
