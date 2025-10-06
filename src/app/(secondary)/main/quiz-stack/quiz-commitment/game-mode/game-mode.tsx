'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './game-mode.module.css';
import { useNav } from "@/lib/NavigationStack";
import { getParamatical, ParamaticalData } from '@/utils/checkers';
import { useUserData } from '@/lib/stacks/user-stack';
import { supabaseBrowser } from '@/lib/supabase/client';
import { UserData } from '@/models/user-data';
import { BackendGameModeModel } from '@/models/user-display-quiz-topic-model';
import { GameModeModel } from '@/models/user-display-quiz-topic-model';
import { PaginateModel } from '@/models/paginate-model';
import LoadingView from '@/components/LoadingView/LoadingView';
import NoResultsView from '@/components/NoResultsView/NoResultsView';
import ErrorView from '@/components/ErrorView/ErrorView';

interface GameModeProps {
  topicsId: string,
  onModeSelect: (gameMode: GameModeModel) => void;
}

interface GameModeItemProps {
  onClick: () => void;
  gameMode: GameModeModel;
  isSelected?: boolean;
}

const GameModeItem = ({ onClick, gameMode, isSelected }: GameModeItemProps) => {
  const { theme } = useTheme();
  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div
      className={`${styles.gameModeItem} ${styles[`gameModeItem_${theme}`]} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      aria-label={`Select ${gameMode.gameModeIdentity}`}
      role="button"
      tabIndex={0}
    >
        <div className={styles.gameModeItemName}>{gameMode.gameModeIdentity}</div>
    </div>
  );
};


export default function GameMode({ onModeSelect, topicsId }: GameModeProps) {
  const { theme } = useTheme();
  const { t, lang } = useLanguage();
  const { userData } = useUserData();

  const loaderRef = useRef<HTMLDivElement | null>(null);
  const [firstLoaded, setFirstLoaded] = useState(false);
  const [gameModeLoading, setGameModeLoading] = useState(false);
  const [error, setError] = useState('');

  const [selectedGameModeModel, setSelectedGameModeModel] = useState<GameModeModel | null>(null);
  const [gameModeModel, setGameModeModel] = useState<GameModeModel[]>([]);



  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && gameModeModel.length > 0 && !gameModeLoading) {
          callPaginate();
        }
      },
      { threshold: 1.0 }
    );

    observer.observe(loaderRef.current);

    return () => {
      if (loaderRef.current) observer.unobserve(loaderRef.current);
    };
  }, [gameModeModel, gameModeLoading]);

  const fetchGameModeModel = useCallback(async (userData: UserData): Promise<GameModeModel[]> => {
    if (!userData) return [];

    try {
      const paramatical = await getParamatical(
        userData.usersId,
        lang,
        userData.usersSex,
        userData.usersDob
      );

      if (!paramatical) return [];

      const { data, error } = await supabaseBrowser.rpc("fetch_quiz_modes", {
              p_user_id: paramatical.usersId,
              p_locale: paramatical.locale,
              p_country: paramatical.country,
              p_gender: paramatical.gender,
              p_age: paramatical.age,
              p_topic_id: topicsId
            });

      if (error) {
        console.error("[GameModeModel] error:", error);
        setError(t('error_fetching_game_modes'));
        return [];
      }

      setError('');
      console.log(data);
      console.log((data || []).map((row: BackendGameModeModel) => new GameModeModel(row)));
      return (data || []).map((row: BackendGameModeModel) => new GameModeModel(row));
    } catch (err) {
      console.error("[GameModeModel] error:", err);
      setError(t('error_fetching_game_modes'));
      setGameModeLoading(false);
      return [];
    }
  }, [lang, t]);


  const processGameModeModelPaginate = (userGameModeModel: GameModeModel[]) => {
    const oldGameModeModelIds = gameModeModel.map((e) => e.gameModeId);
    const newGameModeModel = [...gameModeModel];

    for (const gameMode of userGameModeModel) {
      if (!oldGameModeModelIds.includes(gameMode.gameModeId)) {
        newGameModeModel.push(gameMode);
      }
    }
    setGameModeModel(newGameModeModel);
  };

  useEffect(() => {
    if (!userData || gameModeModel.length > 0 || gameModeLoading) return;

    const loadGameModes = async () => {
      setGameModeLoading(true);
      const gameModeModels = await fetchGameModeModel(userData);
      setGameModeModel(gameModeModels);
      setFirstLoaded(true);
      setGameModeLoading(false);
    };

    loadGameModes();
  }, [userData, gameModeLoading, gameModeModel.length]);


  const callPaginate = async () => {
    if (!userData || gameModeModel.length <= 0 || gameModeLoading) return;
    setGameModeLoading(true);
    const gameModeModels = await fetchGameModeModel(userData);
    setGameModeLoading(false);
    if (gameModeModels.length > 0) {
      processGameModeModelPaginate(gameModeModels);
    }
  };

  const refreshData = async () => {
    if (!userData) return;
    setGameModeLoading(true);
    setGameModeModel([]);
    const gameModeModels = await fetchGameModeModel(userData);
    setGameModeLoading(false);
    if (gameModeModels.length > 0) {
      setGameModeModel(gameModeModels);
    }
  };

  // Handle game mode selection
  const handleGameModeSelect = useCallback((gameMode: GameModeModel) => {
    setSelectedGameModeModel(gameMode);
    onModeSelect(gameMode);
  }, [onModeSelect]);

  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.experienceTitle} ${styles[`experienceTitle_${theme}`]}`}>
        {t('select_a_game_mode')}
      </h2>
      <h3 className={`${styles.experienceDesc} ${styles[`experienceDesc_${theme}`]}`}>
        {t('click_to_select')}
      </h3>

    <div className={styles.gameModeList}>

           {gameModeModel.map((gameMode) => (
                   <GameModeItem key={gameMode.gameModeId} gameMode={gameMode} onClick={()=>handleGameModeSelect(gameMode)} isSelected={selectedGameModeModel?.gameModeId === gameMode.gameModeId}/>
           ))}
    </div>
             {gameModeLoading && gameModeModel.length === 0 && <LoadingView />}
             {!gameModeLoading && gameModeModel.length === 0 && !error && (<NoResultsView text="No result" buttonText="Try Again" onButtonClick={refreshData} />)}
             {!gameModeLoading && gameModeModel.length === 0 && error && (<ErrorView text={error} buttonText="Try Again" onButtonClick={refreshData} />)}

    </div>
  );
}