'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './quiz-image-viewer.module.css';
import { useLanguage } from '@/context/LanguageContext';
import { getLastNameOrSingle, capitalize } from '@/utils/textUtils';
import Image from 'next/image';

interface QuizImageViewerProps {
  imageUrl?: string | null;
  identity: string;
}

export default function QuizImageViewer({ imageUrl, identity }: QuizImageViewerProps) {
  const { theme } = useTheme();
  const { t } = useLanguage();

  const getInitials = (text: string): string => {
    const words = text.trim().split(' ');
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
  };

  return (
    <div className={styles.experienceContainer}>
       {
                       imageUrl ? (
                     <Image
                       className={styles.logo}
                       src={imageUrl}
                       alt="ImageIdentity"
                       width={40}
                       height={40}
                     />
                   ) :
               (
                     <div className={styles.initials}>{getInitials(identity)}</div>
                   )}
    </div>
  );
}