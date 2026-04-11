'use client';
import styles from './LandingHeader.module.css';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import LanguageSelector from '@/components/LanguageSelector/LanguageSelector';

// Navigation links configuration
const NAV_LINKS = [
  { key: 'instructions_text', href: '/instructions' },
  { key: 'about_text', href: '/about' },
  { key: 'payout_text', href: '/payout' },
  { key: 'rates_text', href: '/rates' },
  { key: 'rewards_text', href: '/rewards' },
  { key: 'rules_text', href: '/rules' },
];

export default function LandingHeader() {
  const { theme, storedTheme, cycleTheme } = useTheme();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.classList.add(styles.noScroll);
    } else {
      document.body.classList.remove(styles.noScroll);
    }

    return () => {
      document.body.classList.remove(styles.noScroll);
    };
  }, [mobileMenuOpen]);

  // Close menu when pressing escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMobileMenu();
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  const renderNavLink = (link: typeof NAV_LINKS[0], isMobile = false) => {
    const className = isMobile
      ? `${styles.mobileLink} ${styles[`mobileLink_${theme}`]}`
      : `${styles.link} ${styles[`link_${theme}`]}`;

    return (
      <a
        key={link.key}
        href={link.href}
        className={className}
        onClick={closeMobileMenu}
      >
        {t(link.key)}
      </a>
    );
  };

  return (
    <div className={styles.headerLayout} ref={headerRef}>
      <header className={`${styles.header} ${theme}`}>
        <div className={`${mobileMenuOpen ? styles.headerFixed : styles.headerContainer} ${mobileMenuOpen ? styles[`headerFixed_${theme}`] : styles[`headerContainer_${theme}`]}`}>
          <Image
            src="/assets/image/academix-logo.png"
            alt="Logo"
            className={styles.logo}
            width={50}
            height={50}
            priority
          />

          <div className={styles.desktopMenu}>
            {NAV_LINKS.map((link) => renderNavLink(link))}
            <button
              className={styles.themeSwitch}
              onClick={cycleTheme}
              aria-label="Toggle theme"
            >
              {storedTheme === 'light' ? '🌞' : storedTheme === 'dark' ? '🌙' : '💻'}
            </button>
            <Link className={`${styles.startButton} ${styles[`startButton_${theme}`]}`} href='/welcome'>
              {t('start_text')}
            </Link>
            <LanguageSelector />
          </div>

          <div className={styles.mobileMenu}>
            <LanguageSelector />
            <button
              className={styles.themeSwitch}
              onClick={cycleTheme}
              aria-label="Toggle theme"
            >
              {storedTheme === 'light' ? '🌞' : storedTheme === 'dark' ? '🌙' : '💻'}
            </button>
            <button
              className={`${styles.menuButton} ${styles[`menuButton_${theme}`]}`}
              onClick={toggleMobileMenu}
              aria-label="Toggle mobile menu"
              aria-expanded={mobileMenuOpen}
            >
              <div className={`${styles.menuIcon} ${mobileMenuOpen ? styles.menuIconOpen : ''}`}>
                <span className={`${styles.menuLine} ${styles[`menuLine_${theme}`]}`}></span>
                <span className={`${styles.menuLine} ${styles[`menuLine_${theme}`]}`}></span>
                <span className={`${styles.menuLine} ${styles[`menuLine_${theme}`]}`}></span>
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <div
        className={`${styles.mobileMenuContainer} ${
          mobileMenuOpen ? styles.mobileMenuContainerOpen : styles.mobileMenuContainerClosed
        }`}
        ref={mobileNavRef}
      >
        <div
          className={`${styles.overlay} ${
            mobileMenuOpen ? styles.overlayOpen : styles.overlayClosed
          } ${styles[`overlay_${theme}`]}`}
          onClick={closeMobileMenu}
        ></div>

        <div
          className={`${styles.mobileNav} ${styles[`mobileNav_${theme}`]} ${
            mobileMenuOpen ? styles.mobileNavOpen : styles.mobileNavClosed
          }`}
        >
          <div className={styles.mobileLinks}>
            {NAV_LINKS.map((link) => renderNavLink(link, true))}
          </div>

          <div className={styles.mobileFooter}>
            <Link
              className={`${styles.startButton} ${styles[`startButton_${theme}`]}`}
              href="/welcome"
            >
              {t('start_text')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}