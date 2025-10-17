'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-status-info.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';


interface QuizStatusInfoProps {
  status: string;
}

export default function QuizStatusInfo({ status }: QuizStatusInfoProps) {
  const { theme } = useTheme();
  const { t, tNode } = useLanguage();


  return (
    <div className={styles.experienceContainer}>
      <h2 className={`${styles.details} ${styles[`details_${theme}`]}`}>
        ℹ️ {tNode('status_change_after_expiry',{status: <strong>{status}</strong>})}
      </h2>
    </div>
  );
}