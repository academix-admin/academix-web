'use client';
import Image from 'next/image';
import styles from './HeroLanding.module.css';

export default function HeroLanding() {
  return (
    <div className={styles.wrapper}>
      <Image
        src="/assets/svg/academix-landing-hero-2.svg"
        alt="Hero"
        width={1280}
        height={740}
        className={styles.heroLanding}
        priority
      />
    </div>
  );
}
