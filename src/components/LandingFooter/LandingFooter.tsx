'use client';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './LandingFooter.module.css';
import Image from 'next/image';

const SOCIAL_LINKS = [
  {
    name: 'twitter',
    url: '#',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" height="1.30em" width="1.30em" fill="currentColor">
        <path d="M389.2 48h70.6L305.6 224.2 487 464H345L233.7 318.6 106.5 464H35.8L200.7 275.5 26.8 48H172.4L272.9 180.9 389.2 48zM364.4 421.8h39.1L151.1 88h-42L364.4 421.8z"/>
      </svg>
    )
  },
  {
    name: 'facebook',
    url: '#',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" height="1.30em" width="1.30em" fill="currentColor">
        <path d="M504 256C504 119 393 8 256 8S8 119 8 256c0 123.78 90.69 226.38 209.25 245V327.69h-63V256h63v-54.64c0-62.15 37-96.48 93.67-96.48 27.14 0 55.52 4.84 55.52 4.84v61h-31.28c-30.8 0-40.41 19.12-40.41 38.73V256h68.78l-11 71.69h-57.78V501C413.31 482.38 504 379.78 504 256z"/>
      </svg>
    )
  },
  {
    name: 'instagram',
    url: '#',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" height="1.30em" width="1.30em" fill="currentColor">
        <path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/>
      </svg>
    )
  },
  {
    name: 'linkedin',
    url: '#',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" height="1.30em" width="1.30em" fill="currentColor">
        <path d="M416 32H31.9C14.3 32 0 46.5 0 64.3v383.4C0 465.5 14.3 480 31.9 480H416c17.6 0 32-14.5 32-32.3V64.3c0-17.8-14.4-32.3-32-32.3zM135.4 416H69V202.2h66.5V416zm-33.2-243c-21.3 0-38.5-17.3-38.5-38.5S80.9 96 102.2 96c21.2 0 38.5 17.3 38.5 38.5 0 21.3-17.2 38.5-38.5 38.5zm282.1 243h-66.4V312c0-24.8-.5-56.7-34.5-56.7-34.6 0-39.9 27-39.9 54.9V416h-66.4V202.2h63.7v29.2h.9c8.9-16.8 30.6-34.5 62.9-34.5 67.2 0 79.7 44.3 79.7 101.9V416z"/>
      </svg>
    )
  },
];

const FOOTER_NAV_LINKS = [
  { key: 'how_2_play', href: '#how-to-play' },
  { key: 'features_text', href: '#features' },
  { key: 'developer_text', href: '#developer' }
];

const LEGAL_LINKS = [
  { key: 'privacy_policy', href: '#' },
  { key: 'terms_of_service', href: '#' },
  { key: 'contact_us', href: '#' },
  { key: 'faq', href: '#' },
];

export default function LandingFooter() {
  const { theme } = useTheme();
  const { t } = useLanguage();

  return (
    <footer className={`${styles.footer} ${styles[`footer_${theme}`]}`}>
      <div className={styles.footerContainer}>
        <div className={styles.footerTop}>
          <div className={styles.brandSection}>
            <Image
              src="/assets/image/academix-logo.png"
              alt="Logo"
              className={styles.logo}
              width={50}
              height={50}
            />
            <p className={styles.tagline}>{t('footer_tagline')}</p>
            <div className={styles.socialLinks}>
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  className={`${styles.socialLink} ${styles[`socialLink_${theme}`]}`}
                  aria-label={social.name}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className={styles.linksSection}>
            <h3 className={styles.linksHeading}>{t('quick_links')}</h3>
            <ul className={styles.linksList}>
              {FOOTER_NAV_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className={`${styles.footerLink} ${styles[`footerLink_${theme}`]}`}
                  >
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.linksSection}>
            <h3 className={styles.linksHeading}>{t('legal')}</h3>
            <ul className={styles.linksList}>
              {LEGAL_LINKS.map((link) => (
                <li key={link.key}>
                  <a
                    href={link.href}
                    className={`${styles.footerLink} ${styles[`footerLink_${theme}`]}`}
                  >
                    {t(link.key)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.newsletterSection}>
            <h3 className={styles.linksHeading}>{t('newsletter')}</h3>
            <p className={styles.newsletterText}>{t('newsletter_text')}</p>
            <form className={styles.newsletterForm}>
              <input
                type="email"
                placeholder={t('email_placeholder')}
                className={`${styles.emailInput} ${styles[`emailInput_${theme}`]}`}
                required
              />
              <button
                type="submit"
                className={`${styles.subscribeButton} ${styles[`subscribeButton_${theme}`]}`}
              >
                {t('subscribe')}
              </button>
            </form>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.copyright}>
            {t('copyright')}
          </p>
          <div className={styles.legalLinks}>
            {LEGAL_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className={`${styles.legalLink} ${styles[`legalLink_${theme}`]}`}
              >
                {t(link.key)}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}