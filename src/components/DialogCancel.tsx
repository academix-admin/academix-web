'use client';
import { useTheme } from '@/context/ThemeContext';

export default function DialogCancel( ) {
  const { theme } = useTheme();

  return <svg
                                           xmlns="http://www.w3.org/2000/svg"
                                           width={16}
                                           height={16}
                                           viewBox="0 0 122.88 122.88"
                                         >
                                           <circle cx="61.44" cy="61.44" r="61.44" fill="#333333" />
                                           <path
                                             fill="white"
                                             fillRule="evenodd"
                                             d="M35.38 49.72c-2.16-2.13-3.9-3.47-1.19-6.1l8.74-8.53c2.77-2.8 4.39-2.66 7 0L61.68 46.86l11.71-11.71c2.14-2.17 3.47-3.91 6.1-1.2l8.54 8.74c2.8 2.77 2.66 4.4 0 7L76.27 61.44 88 73.21c2.65 2.58 2.79 4.21 0 7l-8.54 8.74c-2.63 2.71-4 1-6.1-1.19L61.68 76 49.9 87.81c-2.58 2.64-4.2 2.78-7 0l-8.74-8.53c-2.71-2.63-1-4 1.19-6.1L47.1 61.44 35.38 49.72Z"
                                           />
                                         </svg>;
}