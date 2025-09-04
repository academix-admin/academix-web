// // 'use client';
// //
// // import React, { useState, useEffect, useCallback, useMemo } from 'react';
// //
// // // Define NavigationMode as a strict type
// // export type NavigationModeType = 'normal' | 'expand' | 'float';
// //
// // export const NavigationMode: Record<NavigationModeType, NavigationModeType> = {
// //   normal: 'normal',
// //   expand: 'expand',
// //   float: 'float',
// // };
// //
// // // TypeScript interfaces
// // export interface NavigationItemProps {
// //   id: string;
// //   text: string;
// //   svg?: React.ReactNode;
// //   isActive?: boolean;
// //   onClick?: (id: string) => void;
// //   mode?: NavigationModeType;
// //   direction?: 'horizontal' | 'vertical';
// //   activeColor?: string;
// //   inactiveColor?: string;
// //   hoverColor?: string;
// //   expandPadding?: string;
// //   expandIconSize?: string;
// //   normalPadding?: string;
// //   normalIconSize?: string;
// //   textSizeExpand?: string;
// //   textSizeNormal?: string;
// //   fontWeight?: string | number;
// //   className?: string;
// //   itemClassName?: string;
// //   iconClassName?: string;
// //   textClassName?: string;
// // }
// //
// // export interface NavigationBarProps {
// //   id?: string;
// //   navKeys: NavigationItemProps[];
// //   current: string;
// //   onChange: (id: string) => void;
// //   direction?: 'horizontal' | 'vertical';
// //   scrollable?: boolean;
// //   specialMode?: Record<number, NavigationModeType>; // numeric breakpoints
// //   backgroundColor?: string;
// //   shadow?: string;
// //   zIndex?: string | number;
// //   horizontalHeight?: string;
// //   horizontalHeightFloat?: string;
// //   verticalWidthExpand?: string;
// //   verticalWidthNormal?: string;
// //   verticalPadding?: string;
// //   transitionDuration?: string;
// //   floatScrollThreshold?: number;
// //   className?: string;
// //   containerClassName?: string;
// // }
// //
// // // Navigation item component
// // const NavigationItem = React.memo(
// //   ({
// //     id,
// //     text,
// //     svg,
// //     isActive,
// //     onClick,
// //     mode,
// //     direction,
// //     activeColor,
// //     inactiveColor,
// //     hoverColor,
// //     expandPadding,
// //     expandIconSize,
// //     normalPadding,
// //     normalIconSize,
// //     textSizeExpand,
// //     textSizeNormal,
// //     fontWeight,
// //     className = '',
// //     itemClassName = '',
// //     iconClassName = '',
// //     textClassName = '',
// //   }: NavigationItemProps) => {
// //     const isHorizontal = direction === 'horizontal';
// //     const isExpandMode = mode === NavigationMode.expand;
// //
// //     const itemStyle = useMemo(() => {
// //       const base: React.CSSProperties = {
// //         color: isActive
// //           ? activeColor || 'var(--nav-active-color, #2563eb)'
// //           : inactiveColor || 'var(--nav-inactive-color, #4b5563)',
// //         padding: isExpandMode
// //           ? expandPadding || 'var(--nav-expand-padding, 12px)'
// //           : normalPadding || 'var(--nav-normal-padding, 8px)',
// //       };
// //
// //       if (hoverColor) {
// //         base['--custom-hover-color' as any] = hoverColor;
// //       }
// //
// //       return base;
// //     }, [isActive, activeColor, inactiveColor, isExpandMode, expandPadding, normalPadding, hoverColor]);
// //
// //     const handleClick = useCallback(() => {
// //       onClick?.(id);
// //     }, [onClick, id]);
// //
// //     const iconSize = isExpandMode
// //       ? expandIconSize || 'var(--nav-expand-icon-size, 24px)'
// //       : normalIconSize || 'var(--nav-normal-icon-size, 20px)';
// //
// //     const textSize = isExpandMode
// //       ? textSizeExpand || 'var(--nav-expand-text-size, 14px)'
// //       : textSizeNormal || 'var(--nav-normal-text-size, 12px)';
// //
// //     return (
// //       <button
// //         onClick={handleClick}
// //         style={itemStyle}
// //         className={`
// //           nav-item
// //           ${isHorizontal ? 'nav-item-horizontal' : 'nav-item-vertical'}
// //           ${isActive ? 'nav-item-active' : ''}
// //           ${className}
// //           ${itemClassName}
// //         `}
// //         aria-label={text}
// //         aria-current={isActive ? 'page' : undefined}
// //         role="link"
// //         tabIndex={0}
// //       >
// //         {svg && (
// //           <div
// //             className={`nav-icon ${iconClassName}`}
// //             style={{
// //               width: iconSize,
// //               height: iconSize,
// //             }}
// //           >
// //             {svg}
// //           </div>
// //         )}
// //           <span
// //             className={`nav-text ${textClassName}`}
// //             style={{
// //               fontSize: textSize,
// //               fontWeight: fontWeight || 'var(--nav-font-weight, 500)',
// //             }}
// //           >
// //             {text}
// //           </span>
// //
// //       </button>
// //     );
// //   }
// // );
// //
// // NavigationItem.displayName = 'NavigationItem';
// //
// // // Main NavigationBar component
// // const NavigationBar = ({
// //   id,
// //   navKeys,
// //   current,
// //   onChange,
// //   direction = 'horizontal',
// //   scrollable = false,
// //   specialMode = {},
// //   backgroundColor,
// //   shadow,
// //   zIndex,
// //   horizontalHeight = '80px',
// //   horizontalHeightFloat = '64px',
// //   verticalWidthExpand = '192px',
// //   verticalWidthNormal = '64px',
// //   verticalPadding,
// //   transitionDuration = '300ms',
// //   floatScrollThreshold = 50,
// //   className = '',
// //   containerClassName = '',
// // }: NavigationBarProps) => {
// //   const [mode, setMode] = useState<NavigationModeType>(NavigationMode.normal);
// //   const [isScrolled, setIsScrolled] = useState(false);
// //
// //   // Warn if no navigation items are provided
// //   useEffect(() => {
// //     if (!navKeys || navKeys.length === 0) {
// //       console.warn('NavigationBar: No navigation items provided. The navigation bar will be empty.');
// //     }
// //   }, [navKeys]);
// //
// //   // Handle window resize and specialMode breakpoints
// //   useEffect(() => {
// //     const handleResize = () => {
// //       let newMode: NavigationModeType = NavigationMode.normal;
// //       const breakpoints = Object.keys(specialMode)
// //         .map((bp) => Number(bp))
// //         .sort((a, b) => a - b);
// //
// //       for (const breakpoint of breakpoints) {
// //         if (window.innerWidth <= breakpoint) {
// //           newMode = specialMode[breakpoint];
// //           break;
// //         }
// //       }
// //
// //       setMode(newMode);
// //     };
// //
// //     handleResize();
// //     window.addEventListener('resize', handleResize);
// //     return () => window.removeEventListener('resize', handleResize);
// //   }, [specialMode]);
// //
// //   // Handle scroll for float mode with rAF optimization
// //   useEffect(() => {
// //     if (mode !== NavigationMode.float || direction !== 'horizontal') return;
// //
// //     let ticking = false;
// //     const handleScroll = () => {
// //       if (!ticking) {
// //         window.requestAnimationFrame(() => {
// //           setIsScrolled(window.scrollY > (floatScrollThreshold ?? 50));
// //           ticking = false;
// //         });
// //         ticking = true;
// //       }
// //     };
// //
// //     window.addEventListener('scroll', handleScroll, { passive: true });
// //     return () => window.removeEventListener('scroll', handleScroll);
// //   }, [mode, direction, floatScrollThreshold]);
// //
// //   // Handle item click
// //   const handleItemClick = useCallback(
// //     (itemId: string) => {
// //       if(onChange)onChange(itemId);
// //     },
// //     [onChange]
// //   );
// //
// //   // Determine container styles
// //   const isHorizontal = direction === 'horizontal';
// //   const isFloatMode = mode === NavigationMode.float;
// //   const isExpandMode = mode === NavigationMode.expand;
// //
// //   const containerStyle = useMemo(() => {
// //     const style: React.CSSProperties = {
// //       backgroundColor: backgroundColor || 'var(--nav-bg-color, #ffffff)',
// //       boxShadow:
// //         shadow ||
// //         'var(--nav-shadow, 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06))',
// //       zIndex: zIndex || 'var(--nav-z-index, 50)',
// //       transition: `all ${transitionDuration} ease-in-out`,
// //     };
// //
// //     if (isHorizontal) {
// //       style.display = 'flex';
// //       style.justifyContent = 'space-around';
// //       style.alignItems = 'center';
// //       style.height = isFloatMode
// //         ? isScrolled
// //           ? horizontalHeightFloat
// //           : horizontalHeight
// //         : horizontalHeight;
// //     } else {
// //       style.display = 'flex';
// //       style.flexDirection = 'column';
// //       style.justifyContent = 'flex-start';
// //       style.paddingTop = verticalPadding || '16px';
// //       style.width = isExpandMode ? verticalWidthExpand : verticalWidthNormal;
// //     }
// //
// //     if (scrollable) {
// //       style.overflow = isHorizontal ? 'auto hidden' : 'hidden auto';
// //     }
// //
// //     return style;
// //   }, [
// //     isHorizontal,
// //     isFloatMode,
// //     isExpandMode,
// //     isScrolled,
// //     backgroundColor,
// //     shadow,
// //     zIndex,
// //     transitionDuration,
// //     horizontalHeight,
// //     horizontalHeightFloat,
// //     verticalWidthExpand,
// //     verticalWidthNormal,
// //     verticalPadding,
// //     scrollable,
// //   ]);
// //
// //   return (
// //     <>
// //       <style jsx global>{`
// //         :root {
// //           --nav-bg-color: #ffffff;
// //           --nav-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1),
// //             0 -2px 4px -1px rgba(0, 0, 0, 0.06);
// //           --nav-z-index: 50;
// //           --nav-active-color: #2563eb;
// //           --nav-inactive-color: #4b5563;
// //           --nav-hover-color: #3b82f6;
// //           --nav-expand-padding: 12px;
// //           --nav-normal-padding: 8px;
// //           --nav-expand-icon-size: 24px;
// //           --nav-normal-icon-size: 20px;
// //           --nav-expand-text-size: 14px;
// //           --nav-normal-text-size: 12px;
// //           --nav-font-weight: 500;
// //         }
// //
// //         .nav-bar {
// //           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
// //             sans-serif;
// //         }
// //
// //         .nav-item {
// //           display: flex;
// //           align-items: center;
// //           justify-content: center;
// //           background: none;
// //           border: none;
// //           cursor: pointer;
// //           transition: all 0.3s ease;
// //           outline: none;
// //           color: inherit;
// //         }
// //
// //         .nav-item:focus-visible {
// //           outline: 2px solid var(--nav-active-color, #2563eb);
// //           outline-offset: 2px;
// //         }
// //
// //         .nav-item-horizontal {
// //           flex-direction: column;
// //           gap: 4px;
// //         }
// //
// //         .nav-item-vertical {
// //           flex-direction: row;
// //           gap: 8px;
// //         }
// //
// //         .nav-item:hover {
// //           color: var(--custom-hover-color, var(--nav-hover-color, #3b82f6));
// //         }
// //
// //         .nav-icon {
// //           display: flex;
// //           flex-shrink: 0;
// //           justify-content: center;
// //           align-items: center;
// //           transition: inherit;
// //         }
// //
// //         .nav-text {
// //           transition: inherit;
// //           white-space: nowrap;
// //           overflow: hidden;
// //           text-overflow: ellipsis;
// //         }
// //
// //         .nav-item-horizontal .nav-text {
// //           margin-top: 4px;
// //         }
// //
// //         @media (max-width: 768px) {
// //           .nav-bar {
// //             padding: 0 8px;
// //           }
// //
// //           .nav-item-vertical {
// //             justify-content: flex-start;
// //             padding-left: 16px;
// //           }
// //         }
// //
// //         /* Scrollable navigation */
// //         .nav-bar.scrollable-horizontal {
// //           padding: 0 16px;
// //           justify-content: flex-start;
// //           gap: 16px;
// //           overflow-x: auto;
// //         }
// //
// //         .nav-bar.scrollable-vertical {
// //           overflow-y: auto;
// //         }
// //
// //         /* Hide scrollbar for cleaner look */
// //         .nav-bar.scrollable-horizontal::-webkit-scrollbar,
// //         .nav-bar.scrollable-vertical::-webkit-scrollbar {
// //           display: none;
// //         }
// //
// //         .nav-bar.scrollable-horizontal,
// //         .nav-bar.scrollable-vertical {
// //           -ms-overflow-style: none;
// //           scrollbar-width: none;
// //         }
// //       `}</style>
// //
// //       <nav
// //         id={id}
// //         style={containerStyle}
// //         className={`
// //           nav-bar
// //           ${scrollable ? `scrollable-${direction}` : ''}
// //           ${className}
// //           ${containerClassName}
// //         `}
// //         role="navigation"
// //         aria-label="Main navigation"
// //       >
// //         {navKeys?.map((item, index) => (
// //           <NavigationItem
// //             key={item.id || index}
// //             {...item}
// //             isActive={current === item.id}
// //             onClick={handleItemClick}
// //             mode={mode}
// //             direction={direction}
// //           />
// //         ))}
// //       </nav>
// //     </>
// //   );
// // };
// //
// // export default NavigationBar;
//
// 'use client';
//
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
//
// // Define NavigationMode as a strict type
// export type NavigationModeType = 'normal' | 'expand' | 'float';
//
// export const NavigationMode: Record<NavigationModeType, NavigationModeType> = {
//   normal: 'normal',
//   expand: 'expand',
//   float: 'float',
// };
//
// // TypeScript interfaces
// export interface NavigationItemProps {
//   id: string;
//   text: string;
//   svg?: React.ReactNode;
//   isActive?: boolean;
//   onClick?: (id: string) => void;
//   mode?: NavigationModeType;
//   direction?: 'horizontal' | 'vertical';
//   activeColor?: string;
//   inactiveColor?: string;
//   hoverColor?: string;
//   expandPadding?: string;
//   expandIconSize?: string;
//   normalPadding?: string;
//   normalIconSize?: string;
//   textSizeExpand?: string;
//   textSizeNormal?: string;
//   fontWeight?: string | number;
//   className?: string;
//   itemClassName?: string;
//   iconClassName?: string;
//   textClassName?: string;
// }
//
// export interface NavigationBarProps {
//   id?: string;
//   navKeys: NavigationItemProps[];
//   current: string;
//   onChange: (id: string) => void;
//   direction?: 'horizontal' | 'vertical';
//   scrollable?: boolean;
//   specialMode?: Record<number, NavigationModeType>; // numeric breakpoints
//   backgroundColor?: string;
//   shadow?: string;
//   zIndex?: string | number;
//   horizontalHeight?: string;
//   horizontalHeightFloat?: string;
//   verticalWidthExpand?: string;
//   verticalWidthNormal?: string;
//   verticalPadding?: string;
//   transitionDuration?: string;
//   floatScrollThreshold?: number;
//   className?: string;
//   containerClassName?: string;
//   position?: 'static' | 'fixed' | 'absolute' | 'sticky';
//   positionPlacement?: 'top' | 'bottom' | 'left' | 'right';
// }
//
// // Hook to inject CSS once
// const useInjectStyles = () => {
//   useEffect(() => {
//     if (!document.getElementById("navigation-bar-styles")) {
//       const styleTag = document.createElement("style");
//       styleTag.id = "navigation-bar-styles";
//       styleTag.innerHTML = `
//         :root {
//           --nav-bg-color: #ffffff;
//           --nav-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06);
//           --nav-z-index: 50;
//           --nav-active-color: #2563eb;
//           --nav-inactive-color: #4b5563;
//           --nav-hover-color: #3b82f6;
//           --nav-expand-padding: 12px;
//           --nav-normal-padding: 8px;
//           --nav-expand-icon-size: 24px;
//           --nav-normal-icon-size: 20px;
//           --nav-expand-text-size: 14px;
//           --nav-normal-text-size: 12px;
//           --nav-font-weight: 500;
//         }
//
//         .nav-bar {
//           font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//         }
//
//         .nav-item {
//           display: flex;
//           align-items: center;
//           justify-content: center;
//           background: none;
//           border: none;
//           cursor: pointer;
//           transition: all 0.3s ease;
//           outline: none;
//           color: inherit;
//           border-radius: 8px;
//         }
//
//         .nav-item:focus-visible {
//           outline: 2px solid var(--nav-active-color, #2563eb);
//           outline-offset: 2px;
//         }
//
//         .nav-item-horizontal {
//           flex-direction: column;
//           gap: 4px;
//         }
//
//         .nav-item-vertical {
//           flex-direction: row;
//           gap: 8px;
//         }
//
//         .nav-item:hover {
//           color: var(--custom-hover-color, var(--nav-hover-color, #3b82f6));
//           background-color: rgba(0, 0, 0, 0.05);
//         }
//
//         .nav-icon {
//           display: flex;
//           flex-shrink: 0;
//           justify-content: center;
//           align-items: center;
//           transition: inherit;
//         }
//
//         .nav-text {
//           transition: inherit;
//           white-space: nowrap;
//           overflow: hidden;
//           text-overflow: ellipsis;
//         }
//
//         .nav-item-horizontal .nav-text {
//           margin-top: 4px;
//         }
//
//         .nav-item-active {
//           background-color: rgba(37, 99, 235, 0.1);
//         }
//
//         @media (max-width: 768px) {
//           .nav-bar {
//             padding: 0 8px;
//           }
//
//           .nav-item-vertical {
//             justify-content: flex-start;
//             padding-left: 16px;
//           }
//         }
//
//         /* Scrollable navigation */
//         .nav-bar.scrollable-horizontal {
//           padding: 0 16px;
//           justify-content: flex-start;
//           gap: 16px;
//           overflow-x: auto;
//         }
//
//         .nav-bar.scrollable-vertical {
//           overflow-y: auto;
//         }
//
//         /* Hide scrollbar for cleaner look */
//         .nav-bar.scrollable-horizontal::-webkit-scrollbar,
//         .nav-bar.scrollable-vertical::-webkit-scrollbar {
//           display: none;
//         }
//
//         .nav-bar.scrollable-horizontal,
//         .nav-bar.scrollable-vertical {
//           -ms-overflow-style: none;
//           scrollbar-width: none;
//         }
//
//         /* Float mode specific styles */
//         .nav-bar-float {
//           border-radius: 50px;
//           margin: 8px;
//           transition: all 0.3s ease;
//         }
//
//         .nav-bar-float-collapsed {
//           width: 60px;
//           padding: 0 8px;
//         }
//
//         .nav-item-float {
//           width: 44px;
//           height: 44px;
//           border-radius: 50%;
//           margin: 4px 0;
//         }
//
//         .nav-item-float .nav-text {
//           display: none;
//         }
//
//         /* Expand mode specific styles */
//         .nav-bar-expand {
//           transition: width 0.3s ease;
//         }
//
//         .nav-bar-expand:hover {
//           width: var(--vertical-width-expand, 192px) !important;
//         }
//
//         .nav-item-expand .nav-text {
//           opacity: 0;
//           transition: opacity 0.2s ease;
//         }
//
//         .nav-bar-expand:hover .nav-item-expand .nav-text {
//           opacity: 1;
//         }
//       `;
//       document.head.appendChild(styleTag);
//     }
//   }, []);
// };
//
// // Navigation item component
// const NavigationItem = React.memo(
//   ({
//     id,
//     text,
//     svg,
//     isActive,
//     onClick,
//     mode,
//     direction,
//     activeColor,
//     inactiveColor,
//     hoverColor,
//     expandPadding,
//     expandIconSize,
//     normalPadding,
//     normalIconSize,
//     textSizeExpand,
//     textSizeNormal,
//     fontWeight,
//     className = '',
//     itemClassName = '',
//     iconClassName = '',
//     textClassName = '',
//   }: NavigationItemProps) => {
//     const isHorizontal = direction === 'horizontal';
//     const isExpandMode = mode === NavigationMode.expand;
//     const isFloatMode = mode === NavigationMode.float;
//
//     const itemStyle = useMemo(() => {
//       const base: React.CSSProperties = {
//         color: isActive
//           ? activeColor || 'var(--nav-active-color, #2563eb)'
//           : inactiveColor || 'var(--nav-inactive-color, #4b5563)',
//         padding: isExpandMode
//           ? expandPadding || 'var(--nav-expand-padding, 12px)'
//           : normalPadding || 'var(--nav-normal-padding, 8px)',
//       };
//
//       if (hoverColor) {
//         base['--custom-hover-color' as any] = hoverColor;
//       }
//
//       return base;
//     }, [isActive, activeColor, inactiveColor, isExpandMode, expandPadding, normalPadding, hoverColor]);
//
//     const handleClick = useCallback(() => {
//       onClick?.(id);
//     }, [onClick, id]);
//
//     const iconSize = isExpandMode
//       ? expandIconSize || 'var(--nav-expand-icon-size, 24px)'
//       : normalIconSize || 'var(--nav-normal-icon-size, 20px)';
//
//     const textSize = isExpandMode
//       ? textSizeExpand || 'var(--nav-expand-text-size, 14px)'
//       : textSizeNormal || 'var(--nav-normal-text-size, 12px)';
//
//     return (
//       <button
//         onClick={handleClick}
//         style={itemStyle}
//         className={`
//           nav-item
//           ${isHorizontal ? 'nav-item-horizontal' : 'nav-item-vertical'}
//           ${isActive ? 'nav-item-active' : ''}
//           ${isFloatMode ? 'nav-item-float' : ''}
//           ${isExpandMode ? 'nav-item-expand' : ''}
//           ${className}
//           ${itemClassName}
//         `}
//         aria-label={text}
//         aria-current={isActive ? 'page' : undefined}
//         role="link"
//         tabIndex={0}
//       >
//         {svg && (
//           <div
//             className={`nav-icon ${iconClassName}`}
//             style={{
//               width: iconSize,
//               height: iconSize,
//             }}
//           >
//             {svg}
//           </div>
//         )}
//         <span
//           className={`nav-text ${textClassName}`}
//           style={{
//             fontSize: textSize,
//             fontWeight: fontWeight || 'var(--nav-font-weight, 500)',
//           }}
//         >
//           {text}
//         </span>
//       </button>
//     );
//   }
// );
//
// NavigationItem.displayName = 'NavigationItem';
//
// // Main NavigationBar component
// const NavigationBar = ({
//   id,
//   navKeys,
//   current,
//   onChange,
//   direction = 'horizontal',
//   scrollable = false,
//   specialMode = {},
//   backgroundColor,
//   shadow,
//   zIndex,
//   horizontalHeight = '80px',
//   horizontalHeightFloat = '64px',
//   verticalWidthExpand = '192px',
//   verticalWidthNormal = '64px',
//   verticalPadding,
//   transitionDuration = '300ms',
//   floatScrollThreshold = 50,
//   className = '',
//   containerClassName = '',
//   position = 'static',
//   positionPlacement = 'bottom',
// }: NavigationBarProps) => {
//   const [mode, setMode] = useState<NavigationModeType>(NavigationMode.normal);
//   const [isScrolled, setIsScrolled] = useState(false);
//   const [isExpanded, setIsExpanded] = useState(false);
//
//   // Inject default styles
//   useInjectStyles();
//
//   // Warn if no navigation items are provided
//   useEffect(() => {
//     if (!navKeys || navKeys.length === 0) {
//       console.warn('NavigationBar: No navigation items provided. The navigation bar will be empty.');
//     }
//   }, [navKeys]);
//
//   // Handle window resize and specialMode breakpoints
//   useEffect(() => {
//     const handleResize = () => {
//       let newMode: NavigationModeType = NavigationMode.normal;
//       const breakpoints = Object.keys(specialMode)
//         .map((bp) => Number(bp))
//         .sort((a, b) => a - b);
//
//       for (const breakpoint of breakpoints) {
//         if (window.innerWidth <= breakpoint) {
//           newMode = specialMode[breakpoint];
//           break;
//         }
//       }
//
//       setMode(newMode);
//     };
//
//     handleResize();
//     window.addEventListener('resize', handleResize);
//     return () => window.removeEventListener('resize', handleResize);
//   }, [specialMode]);
//
//   // Handle scroll for float mode with rAF optimization
//   useEffect(() => {
//     if (mode !== NavigationMode.float || direction !== 'horizontal') return;
//
//     let ticking = false;
//     const handleScroll = () => {
//       if (!ticking) {
//         window.requestAnimationFrame(() => {
//           setIsScrolled(window.scrollY > (floatScrollThreshold ?? 50));
//           ticking = false;
//         });
//         ticking = true;
//       }
//     };
//
//     window.addEventListener('scroll', handleScroll, { passive: true });
//     return () => window.removeEventListener('scroll', handleScroll);
//   }, [mode, direction, floatScrollThreshold]);
//
//   // Handle item click
//   const handleItemClick = useCallback(
//     (itemId: string) => {
//       onChange(itemId);
//     },
//     [onChange]
//   );
//
//   // Determine container styles
//   const isHorizontal = direction === 'horizontal';
//   const isFloatMode = mode === NavigationMode.float;
//   const isExpandMode = mode === NavigationMode.expand;
//
//   const containerStyle = useMemo(() => {
//     const style: React.CSSProperties = {
//       backgroundColor: backgroundColor || 'var(--nav-bg-color, #ffffff)',
//       boxShadow: shadow || 'var(--nav-shadow, 0 -4px 6px -1px rgba(0, 0, 0, 0.1), 0 -2px 4px -1px rgba(0, 0, 0, 0.06))',
//       zIndex: zIndex || 'var(--nav-z-index, 50)',
//       transition: `all ${transitionDuration} ease-in-out`,
//       position,
//     };
//
//     // Set position placement
//     if (position !== 'static') {
//       switch (positionPlacement) {
//         case 'top':
//           style.top = 0;
//           style.left = 0;
//           style.right = 0;
//           break;
//         case 'bottom':
//           style.bottom = 0;
//           style.left = 0;
//           style.right = 0;
//           break;
//         case 'left':
//           style.left = 0;
//           style.top = 0;
//           style.bottom = 0;
//           break;
//         case 'right':
//           style.right = 0;
//           style.top = 0;
//           style.bottom = 0;
//           break;
//       }
//     }
//
//     if (isHorizontal) {
//       style.display = 'flex';
//       style.justifyContent = 'space-around';
//       style.alignItems = 'center';
//       style.height = isFloatMode
//         ? isScrolled
//           ? horizontalHeightFloat
//           : horizontalHeight
//         : horizontalHeight;
//     } else {
//       style.display = 'flex';
//       style.flexDirection = 'column';
//       style.justifyContent = 'flex-start';
//       style.paddingTop = verticalPadding || '16px';
//       style.width = isExpandMode ? (isExpanded ? verticalWidthExpand : verticalWidthNormal) : verticalWidthNormal;
//     }
//
//     if (scrollable) {
//       style.overflow = isHorizontal ? 'auto hidden' : 'hidden auto';
//     }
//
//     // Float mode specific styles
//     if (isFloatMode && isHorizontal) {
//       style.borderRadius = '50px';
//       style.margin = '8px';
//       if (isScrolled) {
//         style.width = '60px';
//         style.padding = '0 8px';
//       }
//     }
//
//     return style;
//   }, [
//     isHorizontal,
//     isFloatMode,
//     isExpandMode,
//     isScrolled,
//     backgroundColor,
//     shadow,
//     zIndex,
//     transitionDuration,
//     horizontalHeight,
//     horizontalHeightFloat,
//     verticalWidthExpand,
//     verticalWidthNormal,
//     verticalPadding,
//     scrollable,
//     position,
//     positionPlacement,
//     isExpanded,
//   ]);
//
//   // Handle mouse enter/leave for expand mode
//   const handleMouseEnter = useCallback(() => {
//     if (isExpandMode && !isHorizontal) {
//       setIsExpanded(true);
//     }
//   }, [isExpandMode, isHorizontal]);
//
//   const handleMouseLeave = useCallback(() => {
//     if (isExpandMode && !isHorizontal) {
//       setIsExpanded(false);
//     }
//   }, [isExpandMode, isHorizontal]);
//
//   return (
//     <nav
//       id={id}
//       style={containerStyle}
//       className={`
//         nav-bar
//         ${scrollable ? `scrollable-${direction}` : ''}
//         ${isFloatMode ? 'nav-bar-float' : ''}
//         ${isFloatMode && isScrolled ? 'nav-bar-float-collapsed' : ''}
//         ${isExpandMode ? 'nav-bar-expand' : ''}
//         ${className}
//         ${containerClassName}
//       `}
//       role="navigation"
//       aria-label="Main navigation"
//       onMouseEnter={handleMouseEnter}
//       onMouseLeave={handleMouseLeave}
//     >
//       {navKeys?.map((item, index) => (
//         <NavigationItem
//           key={item.id || index}
//           {...item}
//           isActive={current === item.id}
//           onClick={handleItemClick}
//           mode={mode}
//           direction={direction}
//         />
//       ))}
//     </nav>
//   );
// };
//
// export default NavigationBar;