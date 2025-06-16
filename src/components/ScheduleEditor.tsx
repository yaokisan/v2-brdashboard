'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Project, Plan, Performer, TimelineItem, PerformerAvailability } from '@/types';
import { formatTimeShort, parseDurationToMinutes, calculateEndTime } from '@/lib/utils';

interface ScheduleEditorProps {
  project: Project;
  onScheduleUpdate: (planId: string, newStartTime: string) => void;
  onDurationUpdate?: (planId: string, newDuration: string) => void;
}

export default function ScheduleEditor({ project, onScheduleUpdate, onDurationUpdate }: ScheduleEditorProps) {
  // 編集モードの状態管理
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<number>(0);
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

  // プロジェクトの収録時間範囲を取得
  const recordingTimeRange = useMemo(() => {
    if (!project.totalRecordingTime.includes('-')) {
      return { start: '09:00', end: '18:00' };
    }
    const [start, end] = project.totalRecordingTime.split('-');
    return { start: start.trim(), end: end.trim() };
  }, [project.totalRecordingTime]);

  // 出演者の参加可能時間を取得
  const performerAvailabilities = useMemo((): PerformerAvailability[] => {
    return project.performers.map(performer => ({
      performerId: performer.id,
      name: performer.name,
      startTime: performer.startTime || recordingTimeRange.start,
      endTime: performer.endTime || recordingTimeRange.end,
      isConfirmed: performer.isTimeConfirmed
    }));
  }, [project.performers, recordingTimeRange]);

  // 企画をタイムライン項目に変換
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(() => {
    return project.plans.map(plan => ({
      id: plan.id,
      type: 'plan' as const,
      title: plan.title,
      startTime: plan.scheduledTime || recordingTimeRange.start,
      duration: parseDurationToMinutes(plan.duration),
      planId: plan.id,
      performers: plan.performers.map(p => p.performerId),
      isMovable: true,
      color: plan.isConfirmed ? '#10b981' : '#f59e0b'
    }));
  });

  // スケジュールアイテム（休憩・準備時間）をロード
  useEffect(() => {
    const loadScheduleItems = async () => {
      try {
        const { getScheduleItems } = await import('@/lib/database');
        const scheduleItems = await getScheduleItems(project.id);
        
        const scheduleTimelineItems = scheduleItems.map((item: any) => ({
          id: item.id,
          type: item.type as 'break' | 'preparation',
          title: item.title,
          startTime: item.start_time,
          duration: item.duration,
          isMovable: true,
          color: item.type === 'break' ? '#6b7280' : '#8b5cf6',
          dbId: item.id // データベースのIDを保持
        }));

        setTimelineItems(prev => {
          // 企画アイテムのみを保持し、スケジュールアイテムを追加
          const planItems = prev.filter(item => item.type === 'plan');
          const existingScheduleItems = prev.filter(item => item.type !== 'plan');
          
          // 既存のスケジュールアイテムがある場合は、ローカルの変更を保持
          const finalScheduleItems = scheduleTimelineItems.map(dbItem => {
            const existingItem = existingScheduleItems.find(localItem => localItem.dbId === dbItem.id);
            if (existingItem) {
              return {
                ...dbItem,
                startTime: existingItem.startTime,
                duration: existingItem.duration
              };
            }
            return dbItem;
          });
          
          return [...planItems, ...finalScheduleItems];
        });
      } catch (error) {
        console.error('Failed to load schedule items:', error);
      }
    };

    loadScheduleItems();
  }, [project.id]);

  // タイムライン全体の範囲（分単位）
  const timelineStart = timeToMinutes(recordingTimeRange.start);
  const timelineEnd = timeToMinutes(recordingTimeRange.end);
  const timelineDuration = timelineEnd - timelineStart;

  // 時間軸のグリッド（10分刻み）
  const timeGrid = useMemo(() => {
    const grid = [];
    for (let i = timelineStart; i < timelineEnd; i += 10) {
      const isHour = i % 60 === 0;
      const isHalfHour = i % 30 === 0;
      grid.push({
        time: minutesToTime(i),
        minutes: i,
        position: ((i - timelineStart) / timelineDuration) * 100,
        isHour,
        isHalfHour
      });
    }
    return grid;
  }, [timelineStart, timelineEnd, timelineDuration]);

  // アイテムの位置とサイズを計算
  const getItemStyle = (item: TimelineItem) => {
    const startMinutes = timeToMinutes(item.startTime);
    const left = ((startMinutes - timelineStart) / timelineDuration) * 100;
    const width = (item.duration / timelineDuration) * 100;
    
    // 時間に正確に対応する横幅を計算（最小幅は維持しつつ、時間比率を正確に反映）
    const clampedLeft = Math.max(0, Math.min(100, left));
    const clampedWidth = Math.max(0, Math.min(100 - clampedLeft, width));
    
    return {
      left: `${clampedLeft}%`,
      width: `${clampedWidth}%`,
      backgroundColor: item.color,
      minWidth: '40px', // 最小幅を小さくして正確性を優先
    };
  };

  // 出演者の参加可能時間のスタイル
  const getPerformerAvailabilityStyle = (availability: PerformerAvailability) => {
    const startMinutes = timeToMinutes(availability.startTime);
    const endMinutes = timeToMinutes(availability.endTime);
    const left = ((startMinutes - timelineStart) / timelineDuration) * 100;
    const width = ((endMinutes - startMinutes) / timelineDuration) * 100;
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.min(100 - Math.max(0, left), width)}%`,
    };
  };

  // ドラッグ&ドロップの状態管理
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [resizingItem, setResizingItem] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<'left' | 'right' | null>(null);
  const [resizeStartX, setResizeStartX] = useState(0);
  const [resizeStartTime, setResizeStartTime] = useState<string>('');
  const [resizeStartDuration, setResizeStartDuration] = useState(0);

  // ドラッグ開始
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    const rect = e.currentTarget.getBoundingClientRect();
    const timelineRect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (timelineRect) {
      setDragOffset(e.clientX - rect.left);
    }
  }, []);

  // 10分刻みにスナップする関数
  const snapToTenMinutes = (minutes: number): number => {
    return Math.round(minutes / 10) * 10;
  };

  // ドラッグオーバー
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - timelineRect.left - dragOffset;
    const percentage = Math.max(0, Math.min(100, (relativeX / timelineRect.width) * 100));
    const rawStartMinutes = timelineStart + (percentage / 100) * timelineDuration;
    
    // 10分刻みにスナップ
    const snappedStartMinutes = snapToTenMinutes(rawStartMinutes);
    
    setTimelineItems(prev => prev.map(item => {
      if (item.id === draggedItem) {
        const clampedStartMinutes = Math.max(timelineStart, Math.min(timelineEnd - item.duration, snappedStartMinutes));
        const newStartTime = minutesToTime(clampedStartMinutes);
        return { ...item, startTime: newStartTime };
      }
      return item;
    }));
  }, [draggedItem, dragOffset, timelineStart, timelineEnd, timelineDuration]);

  // ドロップ処理
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const item = timelineItems.find(i => i.id === draggedItem);
    if (item && item.planId) {
      onScheduleUpdate(item.planId, item.startTime);
    }
    
    setDraggedItem(null);
    setDragOffset(0);
  }, [draggedItem, timelineItems, onScheduleUpdate]);

  // 休憩・準備時間を追加
  const addBreakOrPreparation = useCallback(async (type: 'break' | 'preparation', defaultStartTime: string) => {
    // 現在の時間を10分刻みにスナップ
    const currentMinutes = timeToMinutes(defaultStartTime);
    const snappedMinutes = snapToTenMinutes(currentMinutes);
    const snappedStartTime = minutesToTime(snappedMinutes);
    
    const title = type === 'break' ? '休憩時間' : '準備時間';
    
    try {
      const { createScheduleItem } = await import('@/lib/database');
      const success = await createScheduleItem(project.id, type, title, snappedStartTime, 10);
      
      if (success) {
        // データベースから最新のデータを再取得
        const { getScheduleItems } = await import('@/lib/database');
        const scheduleItems = await getScheduleItems(project.id);
        
        const scheduleTimelineItems = scheduleItems.map((item: any) => ({
          id: item.id,
          type: item.type as 'break' | 'preparation',
          title: item.title,
          startTime: item.start_time,
          duration: item.duration,
          isMovable: true,
          color: item.type === 'break' ? '#6b7280' : '#8b5cf6',
          dbId: item.id
        }));

        setTimelineItems(prev => {
          // 企画アイテムと現在編集中のスケジュールアイテムを保持
          const planItems = prev.filter(item => item.type === 'plan');
          const existingScheduleItems = prev.filter(item => item.type !== 'plan');
          
          // 既存のスケジュールアイテムを更新し、新しいアイテムを追加
          const updatedScheduleItems = scheduleTimelineItems.map(dbItem => {
            const existingItem = existingScheduleItems.find(localItem => localItem.dbId === dbItem.id);
            if (existingItem) {
              // 既存のローカル変更を保持
              return {
                ...dbItem,
                startTime: existingItem.startTime,
                duration: existingItem.duration
              };
            }
            return dbItem;
          });
          
          return [...planItems, ...updatedScheduleItems];
        });
      }
    } catch (error) {
      console.error('Failed to add schedule item:', error);
    }
  }, [project.id]);

  // アイテムを削除（企画以外のみ）
  const removeItem = useCallback(async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation(); // ドラッグイベントの干渉を防ぐ
    
    const item = timelineItems.find(i => i.id === itemId);
    if (!item || item.type === 'plan') return;

    try {
      if (item.dbId) {
        const { deleteScheduleItem } = await import('@/lib/database');
        const success = await deleteScheduleItem(item.dbId);
        
        if (success) {
          setTimelineItems(prev => prev.filter(i => i.id !== itemId));
        }
      } else {
        // dbIdがない場合はローカルのみ削除（一時的なアイテム）
        setTimelineItems(prev => prev.filter(i => i.id !== itemId));
      }
    } catch (error) {
      console.error('Failed to delete schedule item:', error);
    }
  }, [timelineItems]);

  // 尺編集を開始
  const startDurationEdit = useCallback((e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const item = timelineItems.find(i => i.id === itemId);
    if (item) {
      setEditingItem(itemId);
      setEditingDuration(item.duration);
    }
  }, [timelineItems]);

  // 尺編集を保存
  const saveDurationEdit = useCallback(async () => {
    if (!editingItem) return;
    
    const snappedDuration = Math.max(10, Math.round(editingDuration / 10) * 10); // 最低10分、10分刻み
    const item = timelineItems.find(i => i.id === editingItem);
    if (!item) return;
    
    try {
      // 企画の場合は親コンポーネントに通知
      if (item.type === 'plan' && item.planId && onDurationUpdate) {
        const hours = Math.floor(snappedDuration / 60);
        const minutes = snappedDuration % 60;
        const durationString = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
        onDurationUpdate(item.planId, durationString);
      }
      
      // 休憩・準備時間の場合はデータベースを更新
      if (item.type !== 'plan' && item.dbId) {
        const { updateScheduleItem } = await import('@/lib/database');
        await updateScheduleItem(item.dbId, { duration: snappedDuration });
      }
      
      // ローカル状態を更新
      setTimelineItems(prev => prev.map(i => 
        i.id === editingItem ? { ...i, duration: snappedDuration } : i
      ));
      
    } catch (error) {
      console.error('Failed to update duration:', error);
    }
    
    setEditingItem(null);
    setEditingDuration(0);
  }, [editingItem, editingDuration, timelineItems, onDurationUpdate]);

  // 尺編集をキャンセル
  const cancelDurationEdit = useCallback(() => {
    setEditingItem(null);
    setEditingDuration(0);
  }, []);

  // リサイズ開始
  const handleResizeStart = useCallback((e: React.MouseEvent, itemId: string, direction: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    
    const item = timelineItems.find(i => i.id === itemId);
    if (!item) return;
    
    setResizingItem(itemId);
    setResizeDirection(direction);
    setResizeStartX(e.clientX);
    setResizeStartTime(item.startTime);
    setResizeStartDuration(item.duration);
    
    document.body.style.cursor = 'col-resize';
  }, [timelineItems]);

  // リサイズ中
  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingItem || !resizeDirection) return;
    
    const deltaX = e.clientX - resizeStartX;
    const timelineRect = document.querySelector('[data-timeline]')?.getBoundingClientRect();
    if (!timelineRect) return;
    
    const deltaPercentage = (deltaX / timelineRect.width) * 100;
    const deltaMinutes = (deltaPercentage / 100) * timelineDuration;
    const snappedDeltaMinutes = snapToTenMinutes(deltaMinutes);
    
    setTimelineItems(prev => prev.map(item => {
      if (item.id === resizingItem) {
        if (resizeDirection === 'right') {
          // 右端をドラッグ：尺を変更
          const newDuration = Math.max(10, resizeStartDuration + snappedDeltaMinutes);
          return { ...item, duration: newDuration };
        } else {
          // 左端をドラッグ：開始時間と尺を変更
          const newStartMinutes = timeToMinutes(resizeStartTime) + snappedDeltaMinutes;
          const clampedStartMinutes = Math.max(timelineStart, Math.min(timelineEnd - 10, newStartMinutes));
          const newStartTime = minutesToTime(clampedStartMinutes);
          const newDuration = Math.max(10, resizeStartDuration - (clampedStartMinutes - timeToMinutes(resizeStartTime)));
          
          return { ...item, startTime: newStartTime, duration: newDuration };
        }
      }
      return item;
    }));
  }, [resizingItem, resizeDirection, resizeStartX, resizeStartTime, resizeStartDuration, timelineDuration, timelineStart, timelineEnd]);

  // リサイズ終了
  const handleResizeEnd = useCallback(() => {
    if (!resizingItem) return;
    
    const item = timelineItems.find(i => i.id === resizingItem);
    if (item) {
      // 企画の場合は開始時間と尺の変更を通知
      if (item.type === 'plan' && item.planId) {
        onScheduleUpdate(item.planId, item.startTime);
        if (onDurationUpdate) {
          const hours = Math.floor(item.duration / 60);
          const minutes = item.duration % 60;
          const durationString = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
          onDurationUpdate(item.planId, durationString);
        }
      }
      
      // 休憩・準備時間の場合はデータベースを更新
      if (item.type !== 'plan' && item.dbId) {
        const updateItem = async () => {
          try {
            const { updateScheduleItem } = await import('@/lib/database');
            await updateScheduleItem(item.dbId!, { 
              start_time: item.startTime, 
              duration: item.duration 
            });
          } catch (error) {
            console.error('Failed to update schedule item:', error);
          }
        };
        updateItem();
      }
    }
    
    setResizingItem(null);
    setResizeDirection(null);
    setResizeStartX(0);
    setResizeStartTime('');
    setResizeStartDuration(0);
    document.body.style.cursor = '';
  }, [resizingItem, timelineItems, onScheduleUpdate, onDurationUpdate]);

  // マウスイベントリスナーを設定
  useEffect(() => {
    if (resizingItem) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [resizingItem, handleResizeMove, handleResizeEnd]);

  // 全体保存機能
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const saveAllChanges = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // 全ての企画の変更を保存
      const planUpdates = timelineItems
        .filter(item => item.type === 'plan' && item.planId)
        .map(async (item) => {
          if (item.planId) {
            await onScheduleUpdate(item.planId, item.startTime);
            if (onDurationUpdate) {
              const hours = Math.floor(item.duration / 60);
              const minutes = item.duration % 60;
              const durationString = hours > 0 ? `${hours}時間${minutes}分` : `${minutes}分`;
              await onDurationUpdate(item.planId, durationString);
            }
          }
        });
      
      // 全てのスケジュールアイテムの変更を保存
      const scheduleUpdates = timelineItems
        .filter(item => item.type !== 'plan' && item.dbId)
        .map(async (item) => {
          if (item.dbId) {
            const { updateScheduleItem } = await import('@/lib/database');
            await updateScheduleItem(item.dbId, {
              start_time: item.startTime,
              duration: item.duration
            });
          }
        });
      
      // 全ての更新を並行実行
      await Promise.all([...planUpdates, ...scheduleUpdates]);
      
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('保存に失敗しました。再度お試しください。');
    } finally {
      setIsSaving(false);
    }
  }, [timelineItems, onScheduleUpdate, onDurationUpdate]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            香盤表エディター
          </h2>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                最終保存: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={saveAllChanges}
              disabled={isSaving}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  保存中...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  保存
                </>
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>収録時間: {project.totalRecordingTime}</span>
          <span>収録日: {project.recordingDate}</span>
          <span>場所: {project.location}</span>
        </div>
      </div>

      {/* ツールバー */}
      <div className="bg-white/90 backdrop-blur-sm shadow-lg rounded-xl p-4 border border-white/20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => addBreakOrPreparation('break', '12:00')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            休憩時間を追加
          </button>
          <button
            onClick={() => addBreakOrPreparation('preparation', '09:00')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            準備時間を追加
          </button>
        </div>
      </div>

      {/* メインタイムライン */}
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
        
        {/* 時間軸 */}
        <div className="relative mb-8">
          <div className="flex items-end h-8 border-b border-gray-300">
            {timeGrid.map((gridItem) => (
              <div
                key={gridItem.time}
                className="absolute transform -translate-x-1/2"
                style={{ left: `${gridItem.position}%` }}
              >
                {gridItem.isHour && (
                  <div className="text-xs text-gray-700 font-semibold mb-1">{formatTimeShort(gridItem.time)}</div>
                )}
                {gridItem.isHalfHour && !gridItem.isHour && (
                  <div className="text-xs text-gray-500 mb-1">{formatTimeShort(gridItem.time)}</div>
                )}
                <div className={`w-px ${
                  gridItem.isHour ? 'h-6 bg-gray-400' : 
                  gridItem.isHalfHour ? 'h-4 bg-gray-300' : 
                  'h-2 bg-gray-200'
                }`}></div>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            10分刻みで調整可能（時刻マークにスナップします）
          </div>
        </div>

        {/* 出演者参加可能時間の表示 */}
        <div className="space-y-2 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">出演者参加可能時間</h3>
          {performerAvailabilities.map((availability) => (
            <div key={availability.performerId} className="relative">
              <div className="flex items-center mb-1">
                <span className="text-xs text-gray-600 w-16">{availability.name}様</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  availability.isConfirmed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {availability.isConfirmed ? '確定' : '仮'}
                </span>
              </div>
              <div className="relative h-4 bg-gray-100 rounded">
                <div
                  className={`absolute h-full rounded ${
                    availability.isConfirmed ? 'bg-green-200' : 'bg-orange-200'
                  } opacity-60`}
                  style={getPerformerAvailabilityStyle(availability)}
                ></div>
              </div>
            </div>
          ))}
        </div>

        {/* タイムラインアイテム */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">収録スケジュール</h3>
          <div className="relative">
            <div 
              className="h-20 bg-gray-50 rounded-lg relative overflow-visible"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              data-timeline
            >
              {timelineItems
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                .map((item, index) => (
                <div
                  key={item.id}
                  className={`absolute h-16 top-2 rounded-lg border-2 border-white shadow-lg hover:shadow-xl transition-all ${
                    draggedItem === item.id ? 'opacity-50' : ''
                  } ${resizingItem === item.id ? 'ring-2 ring-blue-400' : ''}`}
                  style={{
                    ...getItemStyle(item),
                    zIndex: 10 + index,
                  }}
                  draggable={item.isMovable && editingItem !== item.id && !resizingItem}
                  onDragStart={(e) => editingItem === item.id || resizingItem ? e.preventDefault() : handleDragStart(e, item.id)}
                >
                  {/* 左リサイズハンドル */}
                  <div
                    className="absolute left-0 top-0 w-2 h-full cursor-col-resize bg-black/20 hover:bg-black/40 rounded-l-lg flex items-center justify-center"
                    onMouseDown={(e) => handleResizeStart(e, item.id, 'left')}
                    title="左端をドラッグして開始時間を調整"
                  >
                    <div className="w-0.5 h-6 bg-white/60"></div>
                  </div>
                  
                  {/* 右リサイズハンドル */}
                  <div
                    className="absolute right-0 top-0 w-2 h-full cursor-col-resize bg-black/20 hover:bg-black/40 rounded-r-lg flex items-center justify-center"
                    onMouseDown={(e) => handleResizeStart(e, item.id, 'right')}
                    title="右端をドラッグして尺を調整"
                  >
                    <div className="w-0.5 h-6 bg-white/60"></div>
                  </div>
                  
                  {/* メインコンテンツエリア */}
                  <div 
                    className={`mx-2 h-full cursor-move ${
                      resizingItem === item.id ? 'cursor-col-resize' : 'cursor-move'
                    }`}
                  >
                    <div className={`p-1.5 h-full flex flex-col text-white text-xs relative group ${
                      editingItem === item.id ? 'bg-black/20 backdrop-blur-sm' : ''
                    }`}>
                      {/* ホバー時の時間情報表示 */}
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity z-40 whitespace-nowrap">
                        {formatTimeShort(item.startTime)} - {calculateEndTime(item.startTime, `${item.duration}分`)} ({item.duration}分)
                      </div>
                      
                      {/* 編集中のオーバーレイ */}
                      {editingItem === item.id && (
                        <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg p-3 shadow-lg" onClick={(e) => e.stopPropagation()}>
                            <div className="text-gray-800 text-sm font-medium mb-2">尺を編集</div>
                            <div className="flex items-center gap-2 mb-3">
                              <input
                                type="number"
                                value={editingDuration}
                                onChange={(e) => setEditingDuration(parseInt(e.target.value) || 0)}
                                className="w-16 h-6 text-sm text-black rounded px-2 border"
                                min="10"
                                step="10"
                                autoFocus
                              />
                              <span className="text-gray-600 text-sm">分</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); saveDurationEdit(); }}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                              >
                                保存
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); cancelDurationEdit(); }}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-xs"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* タイトル部分 - より大きく表示 */}
                      <div className="font-medium text-center flex-1 flex items-center justify-center text-sm leading-tight" title={item.title}>
                        {item.title.length > 15 ? `${item.title.substring(0, 15)}...` : item.title}
                      </div>
                      
                      {/* ボタン類（最下部に固定） */}
                      <div className="flex justify-center items-end">
                        {item.type !== 'plan' && (
                          <button
                            onClick={(e) => removeItem(e, item.id)}
                            className="bg-red-500 hover:bg-red-600 rounded w-4 h-4 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity"
                            title="削除"
                          >
                            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 操作説明 */}
          <div className="text-xs text-gray-500 space-y-1">
            <div>💡 <strong>時間調整:</strong> ブロック中央をドラッグして移動</div>
            <div>📏 <strong>尺調整:</strong> ブロックの左右端をドラッグして開始時間・終了時間を調整</div>
            <div>⚙️ <strong>詳細編集:</strong> 「○分」をクリックして数値入力</div>
          </div>
        </div>

        {/* 凡例 */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>確定済み企画</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span>未確定企画</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-500 rounded"></div>
            <span>休憩時間</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span>準備時間</span>
          </div>
        </div>
      </div>
    </div>
  );
}