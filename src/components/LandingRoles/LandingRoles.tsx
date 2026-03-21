// 'use client';

// import styles from './LandingRoles.module.css';
// import { Swiper, SwiperSlide } from 'swiper/react';
// import { Navigation, Autoplay } from 'swiper/modules';
// import 'swiper/css';
// import 'swiper/css/navigation';

// const data = [
//   {
//     role: 'Student',
//     buyIn: '0',
//     colorClass: styles.student,
//     perks: [
//       'Earn from participating in challenged quiz topics from creators.',
//       'Redeem daily rewards.',
//       'Top up & withdraw earnings.',
//       'Refer friends and earn.',
//     ],
//   },
//   {
//     role: 'Creator',
//     buyIn: '10,000',
//     colorClass: styles.creator,
//     perks: [
//       'Earn from created topic contents.',
//       'Earn from participating in challenged quiz topics from other creators.',
//       'Redeem daily rewards.',
//       'Top up & withdraw earnings.',
//       'Refer friends and earn.',
//     ],
//   },
//   {
//     role: 'Reviewer',
//     buyIn: '₭ 10,000',
//     colorClass: styles.reviewer,
//     perks: [
//       'Earn from approving topic contents.',
//       'Earn from participating in challenged quiz topics from creators.',
//       'Redeem daily rewards.',
//       'Top up & withdraw earnings.',
//       'Refer friends and earn.',
//     ],
//   },
// ];

// export default function LandingRoles() {
//   return (
//     <div className={styles.carouselContainer}>
//       <div className={`${styles.navButton} ${styles.navPrev}`}>
//         <svg viewBox="0 0 24 24" width="24" height="24">
//           <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
//         </svg>
//       </div>
//       <div className={`${styles.navButton} ${styles.navNext}`}>
//         <svg viewBox="0 0 24 24" width="24" height="24">
//           <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z"/>
//         </svg>
//       </div>

//       <Swiper
//        className={styles.swiper}
//        style={{
//                    padding: '2rem'}}
//         modules={[Navigation, Autoplay]}
//         loop={data.length > 1}
//         slidesPerView={1}
//         spaceBetween={20}
//         navigation={{
//           nextEl: `.${styles.navNext}`,
//           prevEl: `.${styles.navPrev}`,
//         }}
//         autoplay={{
//           delay: 5000,
//           disableOnInteraction: true,
//           pauseOnMouseEnter: true,
//         }}
//         breakpoints={{
//           640: { slidesPerView: 1, spaceBetween: 20 },
//           768: { slidesPerView: 2, spaceBetween: 24 },
//           1024: { slidesPerView: 3, spaceBetween: 32 },
//         }}
//       >
//         {data.map((card, idx) => (
//           <SwiperSlide key={idx}>
//             <div className={`${styles.card} ${card.colorClass}`}>
//               <h2 className={styles.role}>{card.role}</h2>
//               <p className={styles.buyIn}>
//                 <strong>Buy In:</strong> {card.buyIn}
//               </p>
//               <hr className={styles.divider} />
//               <ul className={styles.perks}>
//                 {card.perks.map((perk, i) => (
//                   <li key={i}>{perk}</li>
//                 ))}
//               </ul>
//               <button className={styles.more}>Learn More</button>
//             </div>
//           </SwiperSlide>
//         ))}
//       </Swiper>
//     </div>
//   );
// }

'use client';

import { useEffect, useState } from 'react';
import styles from './LandingRoles.module.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useLanguage } from '@/context/LanguageContext';
import { Role } from '@/lib/stacks/signup-stack';

export default function LandingRoles() {
  const { t, lang } = useLanguage();
  const [roles, setRoles] = useState<Role[]>([]);
  const [state, setState] = useState<'loading' | 'data' | 'error'>('loading');

  useEffect(() => {
    async function load() {
      setState('loading');
      try {
        const { data, error } = await supabaseBrowser.rpc('fetch_roles', {
          p_locale: lang,
        });
        if (error) throw error;
        setRoles(data ?? []);
        setState('data');
      } catch {
        setState('error');
      }
    }
    load();
  }, [lang]);

  if (state === 'loading') return null;
  if (state === 'error' || roles.length === 0) return null;

  return (
    <div className={styles.carouselContainer}>
      <div className={`${styles.navButton} ${styles.navPrev}`}>
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
        </svg>
      </div>
      <div className={`${styles.navButton} ${styles.navNext}`}>
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path fill="currentColor" d="M8.59 16.59L13.17 12l-4.58-4.59L10 6l6 6-6 6z" />
        </svg>
      </div>

      <Swiper
        className={styles.swiper}
        style={{ padding: '2rem' }}
        modules={[Navigation, Autoplay]}
        loop={roles.length > 1}
        slidesPerView={1}
        spaceBetween={20}
        navigation={{
          nextEl: `.${styles.navNext}`,
          prevEl: `.${styles.navPrev}`,
        }}
        autoplay={{
          delay: 5000,
          disableOnInteraction: true,
          pauseOnMouseEnter: true,
        }}
        breakpoints={{
          640: { slidesPerView: 1, spaceBetween: 20 },
          768: { slidesPerView: 2, spaceBetween: 24 },
          1024: { slidesPerView: 3, spaceBetween: 32 },
        }}
      >
        {roles.map((role) => (
          <SwiperSlide key={role.roles_id}>
            <div className={`${styles.card} ${styles[role.roles_checker.replace('Roles.', '').toLowerCase()]}`}>
              <h2 className={styles.role}>{role.roles_identity}</h2>

              <p className={styles.buyIn}>
                <strong>{t('buy_in')}</strong>{' '}
                {role.roles_buy_in && role.roles_buy_in > 0
                  ? role.roles_buy_in.toLocaleString() + ' ADC'
                  : t('free_text')}
              </p>

              <hr className={styles.divider} />

              <ul className={styles.perks}>
                {role.roles_perks.map((perk, i) => (
                  <li key={i}>{perk}</li>
                ))}
              </ul>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}