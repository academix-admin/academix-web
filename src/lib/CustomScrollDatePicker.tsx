import React, { useState, useMemo, useCallback, useEffect} from "react";

interface CustomScrollDatePickerProps {
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
  formatMonthsNames?: ((monthIndex: number) => string) | string; // Make this optional
  minYear?: number;
  maxYear?: number;
};

interface WheelColumnProps {
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


const WheelColumn = ({
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
  const containerRef = React.useRef<HTMLDivElement>(null); // Add proper type here

  // Sync scroll position when selectedIndex changes
  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: selectedIndex * itemExtent,
        behavior: "smooth",
      });
    }
  }, [selectedIndex, itemExtent]);

  // Snap on scroll end
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let timeout: NodeJS.Timeout; // Add explicit type here
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const rawIndex = Math.round(el.scrollTop / itemExtent);
        const newIndex = Math.max(0, Math.min(options.length - 1, rawIndex));
        el.scrollTo({ top: newIndex * itemExtent, behavior: "smooth" });
        if (newIndex !== selectedIndex) onChange(newIndex);
      }, 100); // wait for scroll to finish
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
      style={{
        flex: 1,
        height,
        overflowY: "auto",
        overflowX: "hidden",
        scrollSnapType: "y mandatory",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        WebkitOverflowScrolling: "touch",
        maskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)",
      }}
    >
      {/* top spacer */}
      <div style={{ height: height / 2 }} />

      {options.map((opt, index) => {
        const isSelected = index === selectedIndex;
        return (
          <div
            key={index}
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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: textSize,
              scrollSnapAlign: "center",
              fontWeight: isSelected ? "bold" : "normal",
              color: isSelected ? primaryTextColor : secondaryTextColor,
              transform: `scale(${
                isSelected && useMagnifier ? magnification : 1
              })`,
              opacity: isSelected ? 1 : opacity,
              transition: "all 0.2s ease",
            }}
          >
            {opt}
          </div>
        );
      })}

      {/* bottom spacer */}
      <div style={{ height: height / 2 }} />
    </div>
  );
};



const CustomScrollDatePicker : React.FC<CustomScrollDatePickerProps> =  ({
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
}) => {
  const today = new Date();
  const initDate = useMemo(
    () => (defaultDate ? startFromDate || today : new Date(minYear, 0, 1)),
    [defaultDate, startFromDate, today, minYear]
  );

  const years = useMemo(
    () => Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i),
    [minYear, maxYear]
  );

  const [selectedDate, setSelectedDate] = useState(initDate);
  const [dayIndex, setDayIndex] = useState(initDate.getDate() - 1);
  const [monthIndex, setMonthIndex] = useState(initDate.getMonth());
  const [yearIndex, setYearIndex] = useState(initDate.getFullYear() - minYear);

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
        // Handle string format types if needed
        return defaultMonthNames; // or implement format logic based on string
      }
      return defaultMonthNames;
    }, [formatMonthsNames]);



  const updateDate = useCallback(
    (d: number, m: number, y: number) => {
      const newDate = new Date(y, m, d);
      setSelectedDate(newDate);
    },
    [onChange]
  );

  useEffect(() => {
      onChange?.(selectedDate);
    }, [selectedDate]);

  const handleDayChange = (index: number) => {
    setDayIndex(index);
    updateDate(index + 1, monthIndex, years[yearIndex]);
  };
  const handleMonthChange = (index: number) => {
    setMonthIndex(index);
    const maxDay = getDaysInMonth(index, years[yearIndex]);
    const day = Math.min(dayIndex + 1, maxDay);
    updateDate(day, index, years[yearIndex]);
    if (day !== dayIndex + 1) setDayIndex(day - 1);
  };
  const handleYearChange = (index: number) => {
    setYearIndex(index);
    const year = years[index];
    const maxDay = getDaysInMonth(monthIndex, year);
    const day = Math.min(dayIndex + 1, maxDay);
    updateDate(day, monthIndex, year);
    if (day !== dayIndex + 1) setDayIndex(day - 1);
  };

  // quick actions
  const setToToday = () => {
    const d = new Date();
    setDayIndex(d.getDate() - 1);
    setMonthIndex(d.getMonth());
    setYearIndex(d.getFullYear() - minYear);
    updateDate(d.getDate(), d.getMonth(), d.getFullYear());
  };

  const setToYesterday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    setDayIndex(d.getDate() - 1);
    setMonthIndex(d.getMonth());
    setYearIndex(d.getFullYear() - minYear);
    updateDate(d.getDate(), d.getMonth(), d.getFullYear());
  };

  return (
    <div
      style={{
        backgroundColor,
        padding: "32px 16px 16px 16px",
        borderRadius: "8px",
        color: primaryTextColor,
      }}
    >
      {/* Pickers */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: quickDate ? "32px" : "16px",
        }}
      >
        <WheelColumn
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
        <div style={{ display: "flex", justifyContent: "center", gap: "24px" }}>
          <button
            onClick={setToYesterday}
            style={{
              background: "none",
              border: "none",
              color: isYesterday ? primaryTextColor : secondaryTextColor,
              fontSize: textSize * 0.8,
              cursor: "pointer",
            }}
          >
            {yesterdayText}
          </button>
          <button
            onClick={setToToday}
            style={{
              background: "none",
              border: "none",
              color: isToday ? primaryTextColor : secondaryTextColor,
              fontSize: textSize * 0.8,
              cursor: "pointer",
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
