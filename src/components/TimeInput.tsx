interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
}

export default function TimeInput({ value, onChange, className = '', required = false }: TimeInputProps) {
  // 10分刻みの時間選択肢を生成
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 10) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  // 値を正規化（HH:MM:SS形式の場合はHH:MMに変換）
  const normalizedValue = value ? value.split(':').slice(0, 2).join(':') : '';

  return (
    <select
      value={normalizedValue}
      onChange={handleChange}
      className={className}
      required={required}
    >
      <option value="">時間を選択</option>
      {generateTimeOptions().map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}