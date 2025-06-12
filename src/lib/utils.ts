// 日付から曜日を取得する関数
export const getDayOfWeek = (dateString: string) => {
  const date = new Date(dateString);
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[date.getDay()];
};

// 収録時間を「何時から何時まで」の形式で表示する関数
export const formatRecordingTime = (timeString: string) => {
  if (!timeString) return '';
  
  // 「9:00-18:00」や「09:00-18:00」の形式をサポート
  if (timeString.includes('-')) {
    const [start, end] = timeString.split('-');
    return `${start.trim()}〜${end.trim()}`;
  }
  
  // 従来の形式（「8時間」など）はそのまま表示
  return timeString;
};

// 時間文字列を「10:00:00」から「10:00」形式に変換する関数
export const formatTimeShort = (timeString: string) => {
  if (!timeString) return '';
  
  // 「10:00:00」形式の場合は秒を削除
  if (timeString.includes(':')) {
    const parts = timeString.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
  }
  
  return timeString;
};

// 収録時間（例：「30分」）を分数に変換する関数
export const parseDurationToMinutes = (duration: string): number => {
  if (!duration) return 0;
  
  // 「30分」「1時間30分」「90分」などに対応
  const hourMatch = duration.match(/(\d+)時間/);
  const minuteMatch = duration.match(/(\d+)分/);
  
  let totalMinutes = 0;
  
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1]) * 60;
  }
  
  if (minuteMatch) {
    totalMinutes += parseInt(minuteMatch[1]);
  }
  
  // 数字のみの場合は分として扱う
  if (!hourMatch && !minuteMatch) {
    const numMatch = duration.match(/(\d+)/);
    if (numMatch) {
      totalMinutes = parseInt(numMatch[1]);
    }
  }
  
  return totalMinutes;
};

// 開始時間と収録時間から終了時間を計算する関数
export const calculateEndTime = (startTime: string, duration: string): string => {
  if (!startTime || !duration) return '';
  
  try {
    const [hours, minutes] = startTime.split(':').map(Number);
    const durationMinutes = parseDurationToMinutes(duration);
    
    if (isNaN(hours) || isNaN(minutes) || durationMinutes === 0) return '';
    
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    // 24時間を超える場合の処理
    const actualEndHours = endHours % 24;
    
    return `${actualEndHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  } catch (error) {
    return '';
  }
};