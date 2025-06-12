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