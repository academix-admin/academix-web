import React, { useState, useMemo, useCallback, useEffect} from "react";

interface CustomScrollDatePickerProps {
  id?: string;
  onChange: (date: Date) => void;
  defaultDate?: boolean;
  quickDate?: boolean;
  opacity?: number;
  itemExtent?: number;
  useMagnifier?: boolean;
  magnification?: number;
  startFromDate?: Date | null;
  textSize?: number;
  height?: number;
  backgroundColor?: string;
  primaryTextColor?: string;
  secondaryTextColor?: string;
  todayText?: string;
  yesterdayText?: string;
  formatMonthsNames?: ((monthIndex: number) => string) | string;
  minYear?: number;
  maxYear?: number;
  maxDate?: Date;
  minDate?: Date;
};

interface WheelColumnProps {
  id: string;
  options: (string | number)[];
  selectedIndex: number;
  onChange: (index: number) => void;
  itemExtent: number;
  height: number;
  magnification: number;
  useMagnifier: boolean;
  opacity: number;
  primaryTextColor: string;
  secondaryTextColor: string;
  textSize: number;
}

const defaultMonthNames = [
  "JAN","FEB","MAR","APR","MAY","JUN",
  "JUL","AUG","SEP","OCT","NOV","DEC",
];

const monthDays = [31,28,31,30,31,30,31,31,30,31,30,31];
const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const getDaysInMonth = (month : number, year: number) =>
  (month === 1 && isLeapYear(year) ? 29 : monthDays[month]);

const getStyles = (id: string) => `
  #${id}.date-picker-container {
    padding: 32px 16px 16px 16px;
    border-radius: 8px;
  }

  #${id} .wheel-column {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
    -webkit-overflow-scrolling: touch;
    mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%);
  }

  #${id} .wheel-column::-webkit-scrollbar {
    display: none;
  }

  #${id} .wheel-item {
    display: flex;
    align-items: center;
    justify-content: center;
    scroll-snap-align: center;
    transition: all 0.2s ease;
    cursor: pointer;
  }

  #${id} .pickers-wrapper {
    display: flex;
    justify-content: center;
  }

  #${id} .quick-buttons {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 32px;
  }

  #${id} .quick-button {
    background: none;
    border: none;
    cursor: pointer;
  }
`;

const useInjectStyles = (id: string) => {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    
    const styleId = `datepicker-styles-${id}`;
    if (document.getElementById(styleId)) return;

    const styleTag = document.createElement('style');
    styleTag.id = styleId;
    styleTag.innerHTML = getStyles(id);
    document.head.appendChild(styleTag);

    return () => {
      const tag = document.getElementById(styleId);
      if (tag) document.head.removeChild(tag);
    };
  }, [id]);
};

const WheelColumn = ({
  id,
  options,
  selectedIndex,
  onChange,
  itemExtent,
  height,
  magnification,
  useMagnifier,
  opacity,
  primaryTextColor,
  secondaryTextColor,
  textSize,
}: WheelColumnProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  // Initial scroll on mount
  React.useEffect(() => {
    if (containerRef.current && !mounted) {
      containerRef.current.scrollTop = selectedIndex * itemExtent;
      setMounted(true);
    }
  }, [selectedIndex, itemExtent]);

  // Sync scroll position when selectedIndex changes
  React.useEffect(() => {
    if (containerRef.current && mounted) {
      containerRef.current.scrollTo({
        top: selectedIndex * itemExtent,
        behavior: "smooth",
      });
    }
  }, [selectedIndex, itemExtent, mounted]);

  // Snap on scroll end
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const rawIndex = Math.round(el.scrollTop / itemExtent);
        const newIndex = Math.max(0, Math.min(options.length - 1, rawIndex));
        el.scrollTo({ top: newIndex * itemExtent, behavior: "smooth" });
        if (newIndex !== selectedIndex) onChange(newIndex);
      }, 100);
    };

    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(timeout);
    };
  }, [itemExtent, options.length, selectedIndex, onChange]);

  return (
    <div
      ref={containerRef}
      className="wheel-column"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      onWheel={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        height,
        touchAction: 'pan-y',
      }}
    >
      {/* top spacer */}
      <div style={{ height: height / 2 - itemExtent / 2 }} />

      {options.map((opt, index) => {
        const isSelected = index === selectedIndex;
        return (
          <div
            key={index}
            className="wheel-item"
            onClick={() => {
              const el = containerRef.current;
              if (el) {
                el.scrollTo({
                  top: index * itemExtent,
                  behavior: "smooth",
                });
              }
              onChange(index);
            }}
            style={{
              height: itemExtent,
              fontSize: textSize,
              fontWeight: isSelected ? "bold" : "normal",
              color: isSelected ? primaryTextColor : secondaryTextColor,
              transform: `scale(${
                isSelected && useMagnifier ? magnification : 1
              })`,
              opacity: isSelected ? 1 : opacity,
            }}
          >
            {opt}
          </div>
        );
      })}

      {/* bottom spacer */}
      <div style={{ height: height / 2 - itemExtent / 2 }} />
    </div>
  );
};

const CustomScrollDatePicker : React.FC<CustomScrollDatePickerProps> =  ({
  id: providedId,
  onChange,
  defaultDate = true,
  quickDate = true,
  opacity = 0.5,
  itemExtent = 40,
  useMagnifier = true,
  magnification = 1.5,
  startFromDate,
  textSize = 18,
  height = 120,
  backgroundColor = "#fff",
  primaryTextColor = "#000",
  secondaryTextColor = "#999",
  todayText = "Today",
  yesterdayText = "Yesterday",
  formatMonthsNames ,
  minYear = 1900,
  maxYear = new Date().getFullYear() + 1,
  maxDate,
  minDate,
}) => {
  const [id] = useState(() => providedId || `datepicker-${Math.random().toString(36).substr(2, 9)}`);
  useInjectStyles(id);

  const today = useMemo(() => new Date(), []);
  const effectiveMaxYear = useMemo(() => {
    if (maxDate) {
      return maxDate.getFullYear();
    }
    return maxYear;
  }, [maxDate, maxYear]);

  const effectiveMinYear = useMemo(() => {
    if (minDate) {
      return minDate.getFullYear();
    }
    return minYear;
  }, [minDate, minYear]);
  
  const initDate = useMemo(
    () => (defaultDate ? (startFromDate || today) : new Date(effectiveMinYear, 0, 1)),
    [defaultDate, startFromDate, effectiveMinYear]
  );

  const years = useMemo(
    () => Array.from({ length: effectiveMaxYear - effectiveMinYear + 1 }, (_, i) => effectiveMinYear + i),
    [effectiveMinYear, effectiveMaxYear]
  );

  const [selectedDate, setSelectedDate] = useState(initDate);
  const [dayIndex, setDayIndex] = useState(initDate.getDate() - 1);
  const [monthIndex, setMonthIndex] = useState(initDate.getMonth());
  const [yearIndex, setYearIndex] = useState(initDate.getFullYear() - effectiveMinYear);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isToday = selectedDate.toDateString() === today.toDateString();
  const isYesterday = selectedDate.toDateString() === yesterday.toDateString();

  const daysInMonth = getDaysInMonth(monthIndex, years[yearIndex]);
  const dayOptions = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const monthOptions = useMemo(() => {
      if (typeof formatMonthsNames === 'function') {
        return defaultMonthNames.map((_, i) => formatMonthsNames(i));
      } else if (typeof formatMonthsNames === 'string') {
        return defaultMonthNames;
      }
      return defaultMonthNames;
    }, [formatMonthsNames]);

  const updateDate = useCallback(
    (d: number, m: number, y: number) => {
      let newDate = new Date(y, m, d);
      
      // Enforce maxDate constraint
      if (maxDate && newDate > maxDate) {
        newDate = new Date(maxDate);
      }
      
      // Enforce minDate constraint
      if (minDate && newDate < minDate) {
        newDate = new Date(minDate);
      }
      
      setSelectedDate(newDate);
    },
    [maxDate, minDate]
  );

  useEffect(() => {
      onChange?.(selectedDate);
    }, [selectedDate]);

  const handleDayChange = (index: number) => {
    const proposedDay = index + 1;
    const proposedDate = new Date(years[yearIndex], monthIndex, proposedDay);
    
    // Check if proposed date exceeds maxDate
    if (maxDate && proposedDate > maxDate) {
      const maxDay = maxDate.getDate();
      const maxMonth = maxDate.getMonth();
      const maxYear = maxDate.getFullYear();
      
      if (years[yearIndex] === maxYear && monthIndex === maxMonth) {
        // Same month and year as maxDate, cap at maxDate's day
        setDayIndex(maxDay - 1);
        updateDate(maxDay, monthIndex, years[yearIndex]);
        return;
      }
    }
    
    // Check if proposed date is before minDate
    if (minDate && proposedDate < minDate) {
      const minDay = minDate.getDate();
      const minMonth = minDate.getMonth();
      const minYear = minDate.getFullYear();
      
      if (years[yearIndex] === minYear && monthIndex === minMonth) {
        // Same month and year as minDate, cap at minDate's day
        setDayIndex(minDay - 1);
        updateDate(minDay, monthIndex, years[yearIndex]);
        return;
      }
    }
    
    setDayIndex(index);
    updateDate(proposedDay, monthIndex, years[yearIndex]);
  };
  const handleMonthChange = (index: number) => {
    const proposedYear = years[yearIndex];
    const proposedDate = new Date(proposedYear, index, dayIndex + 1);
    
    // Check if proposed date exceeds maxDate
    if (maxDate && proposedDate > maxDate) {
      const maxMonth = maxDate.getMonth();
      const maxYear = maxDate.getFullYear();
      
      if (proposedYear === maxYear && index > maxMonth) {
        // Can't select a month beyond maxDate's month in the same year
        return;
      }
    }
    
    // Check if proposed date is before minDate
    if (minDate && proposedDate < minDate) {
      const minMonth = minDate.getMonth();
      const minYear = minDate.getFullYear();
      
      if (proposedYear === minYear && index < minMonth) {
        // Can't select a month before minDate's month in the same year
        return;
      }
    }
    
    setMonthIndex(index);
    const maxDay = getDaysInMonth(index, proposedYear);
    let day = Math.min(dayIndex + 1, maxDay);
    
    // Further constrain day if we're in maxDate's month/year
    if (maxDate && proposedYear === maxDate.getFullYear() && index === maxDate.getMonth()) {
      day = Math.min(day, maxDate.getDate());
    }
    
    // Further constrain day if we're in minDate's month/year
    if (minDate && proposedYear === minDate.getFullYear() && index === minDate.getMonth()) {
      day = Math.max(day, minDate.getDate());
    }
    
    updateDate(day, index, proposedYear);
    if (day !== dayIndex + 1) setDayIndex(day - 1);
  };
  const handleYearChange = (index: number) => {
    const proposedYear = years[index];
    const proposedDate = new Date(proposedYear, monthIndex, dayIndex + 1);
    
    // Check if proposed date exceeds maxDate
    if (maxDate && proposedDate > maxDate) {
      const maxYear = maxDate.getFullYear();
      
      if (proposedYear > maxYear) {
        // Can't select a year beyond maxDate's year
        return;
      }
    }
    
    // Check if proposed date is before minDate
    if (minDate && proposedDate < minDate) {
      const minYear = minDate.getFullYear();
      
      if (proposedYear < minYear) {
        // Can't select a year before minDate's year
        return;
      }
    }
    
    setYearIndex(index);
    const maxDay = getDaysInMonth(monthIndex, proposedYear);
    let day = Math.min(dayIndex + 1, maxDay);
    
    // Further constrain day if we're in maxDate's month/year
    if (maxDate && proposedYear === maxDate.getFullYear() && monthIndex === maxDate.getMonth()) {
      day = Math.min(day, maxDate.getDate());
    }
    
    // Further constrain day if we're in minDate's month/year
    if (minDate && proposedYear === minDate.getFullYear() && monthIndex === minDate.getMonth()) {
      day = Math.max(day, minDate.getDate());
    }
    
    updateDate(day, monthIndex, proposedYear);
    if (day !== dayIndex + 1) setDayIndex(day - 1);
  };

  // quick actions
  const setToToday = () => {
    const d = new Date();
    setDayIndex(d.getDate() - 1);
    setMonthIndex(d.getMonth());
    setYearIndex(d.getFullYear() - effectiveMinYear);
    updateDate(d.getDate(), d.getMonth(), d.getFullYear());
  };

  const setToYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDayIndex(d.getDate() - 1);
    setMonthIndex(d.getMonth());
    setYearIndex(d.getFullYear() - effectiveMinYear);
    updateDate(d.getDate(), d.getMonth(), d.getFullYear());
  };

  return (
    <div
      id={id}
      className="date-picker-container"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        backgroundColor,
        color: primaryTextColor,
        touchAction: 'pan-y',
      }}
    >
      {/* Pickers */}
      <div
        className="pickers-wrapper"
        style={{
          marginBottom: quickDate ? "32px" : "16px",
        }}
      >
        <WheelColumn
          id={id}
          options={dayOptions}
          selectedIndex={dayIndex}
          onChange={handleDayChange}
          {...{
            itemExtent,
            height,
            magnification,
            useMagnifier,
            opacity,
            primaryTextColor,
            secondaryTextColor,
            textSize,
          }}
        />
        <WheelColumn
          id={id}
          options={monthOptions}
          selectedIndex={monthIndex}
          onChange={handleMonthChange}
          {...{
            itemExtent,
            height,
            magnification,
            useMagnifier,
            opacity,
            primaryTextColor,
            secondaryTextColor,
            textSize,
          }}
        />
        <WheelColumn
          id={id}
          options={years}
          selectedIndex={yearIndex}
          onChange={handleYearChange}
          {...{
            itemExtent,
            height,
            magnification,
            useMagnifier,
            opacity,
            primaryTextColor,
            secondaryTextColor,
            textSize,
          }}
        />
      </div>

      {/* Quick buttons */}
      {quickDate && (
        <div className="quick-buttons">
          <button
            className="quick-button"
            onClick={setToYesterday}
            style={{
              color: isYesterday ? primaryTextColor : secondaryTextColor,
              fontSize: textSize * 0.8,
            }}
          >
            {yesterdayText}
          </button>
          <button
            className="quick-button"
            onClick={setToToday}
            style={{
              color: isToday ? primaryTextColor : secondaryTextColor,
              fontSize: textSize * 0.8,
            }}
          >
            {todayText}
          </button>
        </div>
      )}
    </div>
  );
};

export default CustomScrollDatePicker;
