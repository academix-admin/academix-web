'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import Image from 'next/image';
import styles from './pool-members.module.css';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useNav } from "@/lib/NavigationStack";
import { capitalizeWords, capitalize } from '@/utils/textUtils';
import { getParamatical } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { UserData } from '@/models/user-data';
import { BackendPoolMemberModel } from '@/models/pool-member';
import { PoolMemberModel } from '@/models/pool-member';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';
import { checkLocation, checkFeatures, fetchUserPartialDetails, fetchUserDetails } from '@/utils/checkers';
import { useDemandState } from '@/lib/state-stack';
import { PaginateModel } from '@/models/paginate-model';
import { StateStack } from '@/lib/state-stack';
import { usePoolMemberModel } from '@/lib/stacks/pool-member-stack';

interface PoolMembersProps {
  poolsId: string;
}

const PoolMemberCard: React.FC<{ poolMember: PoolMemberModel }> = ({ poolMember }) => {
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);

   const getInitials = (text: string): string => {
     if (!text) return '?';
     return text.split(' ')
       .map(word => word.charAt(0).toUpperCase())
       .slice(0, 2)
       .join('');
   };

  return (
    <div
      className={`${styles.membersCard} ${styles[`membersCard_${theme}`]}`}
    >
      <div className={styles.cardContent}>
        {/* Pool Image/Initials */}
        <div className={styles.membersImageContainer}>
          {poolMember.userDetails.image && !imageError ? (
            <Image
              src={poolMember.userDetails.image}
              alt={poolMember.userDetails.name}
              width={60}
              height={60}
              className={styles.membersImage}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={styles.membersInitials}>
              {getInitials(poolMember.userDetails.name)}
            </div>
          )}
        </div>

        {/* members Info */}
        <div className={styles.membersInfo}>
          <div className={styles.membersHeader}>
            <h3 className={`${styles.membersTitle} ${styles[`membersTitle_${theme}`]}`}>
              {capitalize(poolMember.userDetails.name)}
            </h3>
            <span className={`${styles.membersDate} ${styles[`membersDate_${theme}`]}`}>
              {poolMember.userDetails.rolesDetails.identity}
            </span>
          </div>

          {/* Creator Info */}
          <div className={styles.creatorInfo}>
            <div className={styles.creatorDetails}>
              <span className={`${styles.creatorName} ${styles[`creatorName_${theme}`]}`}>
                {poolMember.userDetails.username}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PoolMembers(props: PoolMembersProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const nav = useNav();
  const { poolsId } = props;
  const { userData, userData$ } = useUserData();
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const [paginateModel, setPaginateModel] = useState<PaginateModel>(new PaginateModel());
  const [fetchLoading, setFetchLoading] = useState(false);
  const [error, setError] = useState('');
  const [empty, setEmpty] = useState(false);


  const [poolMembers, demandPoolMembers, setPoolMembers] = usePoolMemberModel(lang);


  useEffect(() => {
        if (!loaderRef.current) return;

     const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting) {
                callPaginate();
            }
        },
        { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

        return () => {
            if (loaderRef.current) observer.unobserve(loaderRef.current);
        };
    }, [poolMembers, paginateModel]);

  const fetchPoolMembers = useCallback(async (userData: UserData, limitBy: number, paginateModel: PaginateModel): Promise<PoolMemberModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_pool_members", {
        p_user_id: paramatical.usersId,
        p_pool_id: poolsId,
        p_locale: paramatical.locale,
        p_country: paramatical.country,
        p_gender: paramatical.gender,
        p_age: paramatical.age,
        p_limit_by: limitBy,
        p_for_ranking: true,
        p_after_pool_members: paginateModel.toJson(),
      });

      if (error) {
        console.error("[poolMembers] error:", error);
        setError(t('error_occurred'));
        return [];
      }
      setError('');
      return (data || []).map((row: BackendPoolMemberModel) => new PoolMemberModel(row));
    } catch (err) {
      console.error("[poolMembers] error:", err);
      setError(t('error_occurred'));
      return [];
    }
  }, [lang]);

  const extractLatest = (poolMembers: PoolMemberModel[]) => {
    if (poolMembers.length > 0) {
      const lastItem = poolMembers[poolMembers.length - 1];
      setPaginateModel(new PaginateModel({ sortId: lastItem.sortCreatedId }));
    }
  };

  const processPoolMembersPaginate = (poolMembers: PoolMemberModel[]) => {
    const oldPoolMembersIds = poolMembers.map((e) => e.userDetails.userId);
    const newPoolMembers = [...poolMembers];

    for (const members of poolMembers) {
      if (!oldPoolMembersIds.includes(members.userDetails.userId)) {
        newPoolMembers.push(members);
      }
    }

    setPoolMembers(newPoolMembers);
  };


  useEffect(() => {
    demandPoolMembers(async ({ get, set }) => {
      if (!userData) return;
      setFetchLoading(true);
      const poolMembersModel = await fetchPoolMembers(userData, 15,  new PaginateModel());
      extractLatest(poolMembersModel);
      set(poolMembersModel);
      setEmpty(poolMembersModel.length === 0);
      setFetchLoading(false);
      if(poolMembersModel.length < 15)refreshData();
    });
  }, [demandPoolMembers]);


  const callPaginate = async () => {
    if (!userData || poolMembers.length <= 15) return;
    setFetchLoading(true);
    const poolMembersModel = await fetchPoolMembers(userData, 10, paginateModel);
    setFetchLoading(false);
    if (poolMembersModel.length > 0) {
      extractLatest(poolMembersModel);
      processPoolMembersPaginate(poolMembersModel);
    }
  };

  const refreshData = async () => {
    if (!userData) return;

    try {
      const poolMembersModel = await fetchPoolMembers(userData, 15, paginateModel);

      const isEmpty = poolMembersModel.length === 0;
      setEmpty(isEmpty);

      if (!isEmpty) {
        extractLatest(poolMembersModel);
        setPoolMembers(poolMembersModel);
      }else{
        setPoolMembers([]);
      }

      // Schedule next call if still mounted
      if (isMountedRef.current) {
        const shouldContinue = poolMembersModel.length < 15;
        timeoutRef.current = setTimeout(() => {
          if (shouldContinue) refreshData();
        }, 10000);
      }
    } catch (error) {
      console.error('Error fetching data:', error);

      if (isMountedRef.current) {
        timeoutRef.current = setTimeout(refreshData, 15000);
      }
    }
  };



  useEffect(() => {
    isMountedRef.current = true;
    // Cleanup function
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

    const goBack = async () => {
      await nav.pop();
      StateStack.core.clearScope('pool_member_flow');
    };

  return (
    <main className={`${styles.container} ${styles[`container_${theme}`]}`}>
      <header className={`${styles.header} ${styles[`header_${theme}`]}`}>
        <div className={styles.headerContent}>
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
          <h1 className={styles.title}>{t('pool_members')}</h1>
          <div className={styles.headerSpacer} />
        </div>
      </header>

      <div className={styles.content}>
        {poolMembers.length === 0  && fetchLoading && <LoadingView />}

        {poolMembers.length === 0 && error && (
          <ErrorView
            text={error}
            buttonText="Try Again"
            onButtonClick={refreshData}
          />
        )}

        {poolMembers.length === 0 && empty && !error && !fetchLoading && (
          <NoResultsView
            text="No result"
            buttonText="Try Again"
            onButtonClick={refreshData}
          />
        )}

         {poolMembers.map((poolMember) => (
                 <PoolMemberCard key={poolMember.userDetails.userId} poolMember={poolMember}/>
         ))}

         {poolMembers.length > 15 && <div ref={loaderRef} className={styles.loadMoreSentinel}></div>}
      </div>
    </main>
  );
}

