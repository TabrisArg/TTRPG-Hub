import React from 'react';

interface CampaignDateTimePickerProps {
  value: string;
  onChange: (formattedDateTime: string) => void;
  compact?: boolean;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function parseCampaignDateTime(rawStr: string): {
  dateIso: string;
  timeIso: string;
} {
  const defaultDate = '1998-10-14';
  const defaultTime = '22:00';

  if (!rawStr || !rawStr.trim()) {
    return { dateIso: defaultDate, timeIso: defaultTime };
  }

  const cleaned = rawStr
    .replace(
      /\s*\((?:Flashback:.*|.*?have passed|The next day|The previous day|A few .*? ago)\)\s*$/i,
      ''
    )
    .trim();

  // Match "Month DD, YYYY // HH:MM HRS" or "Month DD, YYYY // HHMM HRS"
  const milMatch = cleaned.match(
    /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:\s*\/\/\s*(\d{1,2}):?(\d{2})(?:\s*HRS)?)?/i
  );

  if (milMatch) {
    const monthName = milMatch[1].toLowerCase();
    const day = parseInt(milMatch[2], 10);
    const year = parseInt(milMatch[3], 10);
    const monthIdx = MONTH_NAMES.findIndex((m) =>
      m.toLowerCase().startsWith(monthName.slice(0, 3))
    );

    if (monthIdx !== -1 && year >= 1000 && day >= 1 && day <= 31) {
      const yyyy = String(year).padStart(4, '0');
      const mm = String(monthIdx + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const hh = milMatch[4]
        ? String(Math.min(23, Math.max(0, parseInt(milMatch[4], 10)))).padStart(
            2,
            '0'
          )
        : '22';
      const min = milMatch[5]
        ? String(Math.min(59, Math.max(0, parseInt(milMatch[5], 10)))).padStart(
            2,
            '0'
          )
        : '00';
      return {
        dateIso: `${yyyy}-${mm}-${dd}`,
        timeIso: `${hh}:${min}`,
      };
    }
  }

  // Fallback: try ISO YYYY-MM-DD or Date.parse
  const isoMatch = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = cleaned.match(/(\d{1,2}):(\d{2})/);
  if (isoMatch) {
    const hh = timeMatch
      ? String(parseInt(timeMatch[1], 10)).padStart(2, '0')
      : '22';
    const min = timeMatch ? timeMatch[2] : '00';
    return {
      dateIso: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`,
      timeIso: `${hh}:${min}`,
    };
  }

  const parsed = Date.parse(cleaned);
  if (!isNaN(parsed)) {
    const d = new Date(parsed);
    const yyyy = String(d.getFullYear()).padStart(4, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return {
      dateIso: `${yyyy}-${mm}-${dd}`,
      timeIso: `${hh}:${min}`,
    };
  }

  return { dateIso: defaultDate, timeIso: defaultTime };
}

export function formatCampaignDateTime(dateIso: string, timeIso: string): string {
  const [yStr, mStr, dStr] = (dateIso || '1998-10-14').split('-');
  const year = parseInt(yStr || '1998', 10);
  const monthIdx = Math.min(
    11,
    Math.max(0, parseInt(mStr || '10', 10) - 1)
  );
  const day = parseInt(dStr || '14', 10);

  const [hhStr, minStr] = (timeIso || '22:00').split(':');
  const hh = (hhStr || '22').padStart(2, '0');
  const min = (minStr || '00').padStart(2, '0');

  const monthLabel = MONTH_NAMES[monthIdx] || 'October';
  return `${monthLabel} ${day}, ${year} // ${hh}${min} HRS`;
}

export const CampaignDateTimePicker: React.FC<CampaignDateTimePickerProps> = ({
  value,
  onChange,
  compact = false,
}) => {
  const { dateIso, timeIso } = parseCampaignDateTime(value);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextDate = e.target.value;
    if (!nextDate) return;
    onChange(formatCampaignDateTime(nextDate, timeIso));
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = e.target.value;
    if (!nextTime) return;
    onChange(formatCampaignDateTime(dateIso, nextTime));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="date"
        value={dateIso}
        onChange={handleDateChange}
        onClick={(e) => {
          const el = e.currentTarget as HTMLInputElement & {
            showPicker?: () => void;
          };
          if (typeof el.showPicker === 'function') {
            try {
              el.showPicker();
            } catch {
              // fallback to native behavior
            }
          }
        }}
        aria-label="Campaign Date"
        className={`flex-1 min-w-[128px] bg-[#0B0E0D] border border-[#232B28] focus:border-[#FBBF24] rounded font-mono-tabular text-[#E2E6E4] focus:outline-none cursor-pointer ${
          compact ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-1.5 text-xs'
        }`}
      />
      <input
        type="time"
        value={timeIso}
        onChange={handleTimeChange}
        onClick={(e) => {
          const el = e.currentTarget as HTMLInputElement & {
            showPicker?: () => void;
          };
          if (typeof el.showPicker === 'function') {
            try {
              el.showPicker();
            } catch {
              // fallback to native behavior
            }
          }
        }}
        aria-label="Campaign Time"
        className={`w-[106px] bg-[#0B0E0D] border border-[#232B28] focus:border-[#FBBF24] rounded font-mono-tabular text-[#E2E6E4] focus:outline-none cursor-pointer ${
          compact ? 'px-2 py-1.5 text-xs' : 'px-2.5 py-1.5 text-xs'
        }`}
      />
    </div>
  );
};
