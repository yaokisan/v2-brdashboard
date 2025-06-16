'use client';

import React, { useMemo } from 'react';
import { Project, Plan, Performer } from '@/types';
import { formatTimeShort, parseDurationToMinutes } from '@/lib/utils';

interface ComprehensiveScheduleProps {
  project: Project;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  minutes: number;
}

interface PerformerActivity {
  performerId: string;
  activity: 'plan' | 'wait' | 'arrival' | 'departure' | 'free';
  planId?: string;
  planTitle?: string;
  color?: string;
}

export default function ComprehensiveSchedule({ project }: ComprehensiveScheduleProps) {
  // 時間をHH:MM形式から分に変換
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // 分をHH:MM形式に変換
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // スケジュールアイテム（休憩・準備時間）を取得
  const [scheduleItems, setScheduleItems] = React.useState<any[]>([]);
  
  React.useEffect(() => {
    const loadScheduleItems = async () => {
      try {
        const { getScheduleItems } = await import('@/lib/database');
        const items = await getScheduleItems(project.id);
        setScheduleItems(items);
      } catch (error) {
        console.error('Failed to load schedule items:', error);
      }
    };
    
    loadScheduleItems();
  }, [project.id]);

  // プロジェクトの収録時間範囲を取得
  const recordingTimeRange = useMemo(() => {
    if (!project.totalRecordingTime.includes('-')) {
      return { start: '08:00', end: '18:00' };
    }
    const [start, end] = project.totalRecordingTime.split('-');
    return { start: start.trim(), end: end.trim() };
  }, [project.totalRecordingTime]);

  // 10分刻みのタイムスロットを生成
  const timeSlots = useMemo((): TimeSlot[] => {
    const startMinutes = timeToMinutes(recordingTimeRange.start);
    const endMinutes = timeToMinutes(recordingTimeRange.end);
    const slots: TimeSlot[] = [];

    for (let minutes = startMinutes; minutes < endMinutes; minutes += 10) {
      slots.push({
        startTime: minutesToTime(minutes),
        endTime: minutesToTime(minutes + 10),
        minutes
      });
    }

    return slots;
  }, [recordingTimeRange]);

  // 全アイテム（企画+休憩・準備時間）を統合してソート
  const allItems = useMemo(() => {
    const items: any[] = [];
    
    // 企画を追加
    project.plans.forEach(plan => {
      if (plan.scheduledTime) {
        items.push({
          type: 'plan',
          id: plan.id,
          title: plan.title,
          startTime: plan.scheduledTime,
          duration: parseDurationToMinutes(plan.duration),
          plan: plan
        });
      }
    });
    
    // 休憩・準備時間を追加
    scheduleItems.forEach(item => {
      items.push({
        type: item.type,
        id: item.id,
        title: item.title,
        startTime: item.start_time,
        duration: item.duration
      });
    });
    
    // 時間順にソート
    return items.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
  }, [project.plans, scheduleItems]);

  // 各出演者の各タイムスロットでの活動を計算
  const performerActivities = useMemo(() => {
    const activities: { [key: string]: { [key: number]: PerformerActivity } } = {};

    // 各出演者を初期化
    project.performers.forEach(performer => {
      activities[performer.id] = {};
      
      // 全タイムスロットを「自由時間」で初期化
      timeSlots.forEach(slot => {
        activities[performer.id][slot.minutes] = {
          performerId: performer.id,
          activity: 'free'
        };
      });

      // 出演者の参加時間内は「待機」に設定
      if (performer.startTime && performer.endTime) {
        const startMinutes = timeToMinutes(performer.startTime);
        const endMinutes = timeToMinutes(performer.endTime);
        
        timeSlots.forEach(slot => {
          if (slot.minutes >= startMinutes && slot.minutes < endMinutes) {
            activities[performer.id][slot.minutes] = {
              performerId: performer.id,
              activity: 'wait'
            };
          }
        });

        // 入り時間をマーク
        timeSlots.forEach(slot => {
          if (slot.minutes >= startMinutes && slot.minutes < startMinutes + 10) {
            activities[performer.id][slot.minutes] = {
              performerId: performer.id,
              activity: 'arrival'
            };
          }
        });

        // 終わり時間をマーク
        timeSlots.forEach(slot => {
          if (slot.minutes >= endMinutes - 10 && slot.minutes < endMinutes) {
            activities[performer.id][slot.minutes] = {
              performerId: performer.id,
              activity: 'departure'
            };
          }
        });
      }
    });

    // 全アイテム（企画・休憩・準備時間）の処理
    allItems.forEach((item, itemIndex) => {
      const itemStartMinutes = timeToMinutes(item.startTime);
      const itemEndMinutes = itemStartMinutes + item.duration;

      // 色を生成
      const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];
      const itemColor = colors[itemIndex % colors.length];

      if (item.type === 'plan') {
        // 企画の場合、参加出演者のみに適用
        item.plan.performers.forEach((performer: any) => {
          timeSlots.forEach(slot => {
            if (slot.minutes >= itemStartMinutes && slot.minutes < itemEndMinutes) {
              activities[performer.performerId][slot.minutes] = {
                performerId: performer.performerId,
                activity: 'plan',
                planId: item.id,
                planTitle: item.title,
                color: itemColor
              };
            }
          });
        });
      } else {
        // 休憩・準備時間の場合、全出演者に適用
        project.performers.forEach(performer => {
          if (performer.startTime && performer.endTime) {
            const performerStart = timeToMinutes(performer.startTime);
            const performerEnd = timeToMinutes(performer.endTime);
            
            timeSlots.forEach(slot => {
              // 出演者の参加時間内で、かつアイテムの時間内の場合
              if (slot.minutes >= Math.max(itemStartMinutes, performerStart) && 
                  slot.minutes < Math.min(itemEndMinutes, performerEnd)) {
                activities[performer.id][slot.minutes] = {
                  performerId: performer.id,
                  activity: item.type as 'plan',
                  planTitle: item.title,
                  color: item.type === 'break' ? '#6b7280' : '#8b5cf6'
                };
              }
            });
          }
        });
      }
    });

    return activities;
  }, [project.performers, timeSlots, allItems]);

  // 全体列の項目をタイムスロットごとに整理（セル結合対応）
  const itemByTimeSlot = useMemo(() => {
    const itemSlots: { [key: number]: { item: any; number: number; color: string; rowSpan: number } } = {};
    const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'];

    // 企画のみの番号を計算
    let planNumber = 0;

    allItems.forEach((item, index) => {
      const itemStartMinutes = timeToMinutes(item.startTime);
      const rowSpan = Math.ceil(item.duration / 10);
      const itemColor = colors[index % colors.length];

      // 企画の場合のみ番号をインクリメント
      if (item.type === 'plan') {
        planNumber++;
      }

      itemSlots[itemStartMinutes] = {
        item,
        number: item.type === 'plan' ? planNumber : 0, // 企画のみ番号付け
        color: item.type === 'break' ? '#6b7280' : item.type === 'preparation' ? '#8b5cf6' : itemColor,
        rowSpan
      };
    });

    return itemSlots;
  }, [allItems]);

  return (
    <div className="space-y-6">
      {/* ヘッダー情報 */}
      <div className="bg-orange-100 border border-orange-300 rounded-lg p-4">
        <div className="text-center space-y-2">
          <div className="text-lg font-bold">
            【収録現場】: {project.location} 
            {project.locationMapUrl && (
              <a href={project.locationMapUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-2">
                (地図リンク)
              </a>
            )}
          </div>
          <div className="text-md">
            【住所】: {project.address || '住所未設定'}
          </div>
        </div>
      </div>

      {/* 香盤表 */}
      <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full border-collapse">
          {/* ヘッダー */}
          <thead>
            <tr>
              <th className="bg-gray-200 border border-gray-400 p-2 text-sm font-bold w-16">種別</th>
              <th className="bg-orange-400 border border-gray-400 p-2 text-sm font-bold text-white w-24">全体</th>
              <th className="bg-blue-200 border border-gray-400 p-2 text-sm font-bold" colSpan={project.performers.length}>
                ご出演者様
              </th>
            </tr>
            <tr>
              <th className="bg-gray-200 border border-gray-400 p-2 text-sm font-bold">名前</th>
              <th className="bg-orange-400 border border-gray-400 p-2 text-sm font-bold text-white">-</th>
              {project.performers.map(performer => (
                <th key={performer.id} className="bg-blue-200 border border-gray-400 p-2 text-sm font-bold min-w-20">
                  {performer.name}様
                </th>
              ))}
            </tr>
          </thead>

          {/* タイムスロット */}
          <tbody>
            {timeSlots.map((slot, index) => {
              const itemInfo = itemByTimeSlot[slot.minutes];
              const isFirstRowOfItem = !!itemInfo;
              
              // 現在のスロットが既存のアイテムの範囲内かチェック
              const isInExistingItem = !isFirstRowOfItem && Object.values(itemByTimeSlot).some(item => {
                const itemStart = timeToMinutes(item.item.startTime);
                const itemEnd = itemStart + item.item.duration;
                return slot.minutes >= itemStart && slot.minutes < itemEnd;
              });
              
              return (
                <tr key={slot.minutes} className="border-b border-gray-300">
                  {/* 時間列 */}
                  <td className="bg-gray-100 border border-gray-400 p-1 text-xs text-center font-medium">
                    {formatTimeShort(slot.startTime)} ~ {formatTimeShort(slot.endTime)}
                  </td>

                  {/* 全体列（項目表示） */}
                  {isFirstRowOfItem ? (
                    <td 
                      className="border border-gray-400 p-1 text-xs text-center font-medium text-white"
                      style={{ backgroundColor: itemInfo.color }}
                      rowSpan={itemInfo.rowSpan}
                    >
                      {itemInfo.item.type === 'plan' ? (
                        <>
                          &lt;撮影{itemInfo.number}&gt;
                          <br />
                          {itemInfo.item.title}
                        </>
                      ) : (
                        itemInfo.item.title
                      )}
                    </td>
                  ) : !isInExistingItem && (
                    <td className="bg-gray-50 border border-gray-400 p-1"></td>
                  )}

                  {/* 出演者列 */}
                  {project.performers.map(performer => {
                    const activity = performerActivities[performer.id]?.[slot.minutes];
                    
                    // 前のスロットと同じ活動かチェック
                    const prevSlot = index > 0 ? timeSlots[index - 1] : null;
                    const prevActivity = prevSlot ? performerActivities[performer.id]?.[prevSlot.minutes] : null;
                    
                    // セル結合の判定
                    const shouldMerge = activity && prevActivity && 
                      activity.activity === prevActivity.activity &&
                      activity.planTitle === prevActivity.planTitle &&
                      activity.color === prevActivity.color;
                    
                    // 連続する同じ活動の最初のセルかどうか
                    const isFirstOfSequence = activity && (!prevActivity || 
                      activity.activity !== prevActivity.activity ||
                      activity.planTitle !== prevActivity.planTitle ||
                      activity.color !== prevActivity.color);
                    
                    // 連続する同じ活動の行数を計算
                    let rowSpan = 1;
                    if (isFirstOfSequence) {
                      for (let i = index + 1; i < timeSlots.length; i++) {
                        const nextSlot = timeSlots[i];
                        const nextActivity = performerActivities[performer.id]?.[nextSlot.minutes];
                        if (nextActivity &&
                            nextActivity.activity === activity.activity &&
                            nextActivity.planTitle === activity.planTitle &&
                            nextActivity.color === activity.color) {
                          rowSpan++;
                        } else {
                          break;
                        }
                      }
                    }

                    // セルを結合する場合（前のセルと同じ）はセルを出力しない
                    if (shouldMerge) {
                      return null;
                    }

                    let cellContent = '';
                    let bgColor = 'bg-white';
                    let textColor = 'text-black';

                    switch (activity?.activity) {
                      case 'plan':
                        cellContent = activity.planTitle || '';
                        bgColor = '';
                        textColor = 'text-white';
                        break;
                      case 'break':
                      case 'preparation':
                        cellContent = activity.planTitle || '';
                        bgColor = '';
                        textColor = 'text-white';
                        break;
                      case 'arrival':
                        cellContent = `入り時間 (${formatTimeShort(slot.startTime)})`;
                        bgColor = 'bg-yellow-300';
                        break;
                      case 'departure':
                        cellContent = `終わり時間 (${formatTimeShort(slot.endTime)})`;
                        bgColor = 'bg-yellow-300';
                        break;
                      case 'wait':
                        cellContent = '待機';
                        bgColor = 'bg-green-200';
                        break;
                      case 'free':
                      default:
                        cellContent = '';
                        bgColor = 'bg-white';
                        break;
                    }

                    return (
                      <td 
                        key={performer.id}
                        className={`border border-gray-400 p-1 text-xs text-center ${bgColor} ${textColor}`}
                        style={(activity?.activity === 'plan' || activity?.activity === 'break' || activity?.activity === 'preparation') ? { backgroundColor: activity.color } : {}}
                        rowSpan={rowSpan > 1 ? rowSpan : undefined}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 印刷用ボタン */}
      <div className="flex justify-center no-print">
        <button
          onClick={() => window.print()}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          香盤表を印刷
        </button>
      </div>

      {/* 印刷用CSS */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          table {
            font-size: 10px;
          }
          
          th, td {
            padding: 2px !important;
          }
        }
      `}</style>
    </div>
  );
}