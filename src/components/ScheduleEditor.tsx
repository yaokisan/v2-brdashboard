'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Project, Plan, Performer, TimelineItem, PerformerAvailability } from '@/types';
import { formatTimeShort, parseDurationToMinutes, calculateEndTime } from '@/lib/utils';
import demoData from '@/data/demo-data.json';

interface ScheduleEditorProps {
  project: Project;
  onScheduleUpdate: (planId: string, newStartTime: string) => void;
  onDurationUpdate?: (planId: string, newDuration: string) => void;
}

export default function ScheduleEditor({ project, onScheduleUpdate, onDurationUpdate }: ScheduleEditorProps) {
  // 編集モードの状態管理
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingDuration, setEditingDuration] = useState<number>(0);
  
  // 複数選択の状態管理
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [lastSelectedItem, setLastSelectedItem] = useState<string | null>(null);
  const [isDragSelecting, setIsDragSelecting] = useState(false);
  const [dragSelectStart, setDragSelectStart] = useState<{ x: number; y: number } | null>(null);
  const [dragSelectRect, setDragSelectRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  
  // Undo機能の履歴管理（個別アイテムベース）
  interface UndoAction {
    type: 'move' | 'resize';
    itemId: string;
    oldValue: { startTime: string; duration: number };
    newValue: { startTime: string; duration: number };
  }
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);

  // 履歴に追加する関数（個別アイテム）
  const addToUndoStack = useCallback((action: UndoAction) => {
    setUndoStack(prev => {
      const newStack = [...prev, action];
      // 最大50件まで保持
      if (newStack.length > 50) {
        newStack.shift();
      }
      return newStack;
    });
  }, []);

  // Undoを実行する関数
  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const lastAction = undoStack[undoStack.length - 1];
    
    // アイテムを元の状態に戻す
    setTimelineItems(prev => prev.map(item => {
      if (item.id === lastAction.itemId) {
        return {
          ...item,
          startTime: lastAction.oldValue.startTime,
          duration: lastAction.oldValue.duration
        };
      }
      return item;
    }));
    
    // スタックから削除
    setUndoStack(prev => prev.slice(0, -1));
    
    // データベースも更新（企画の場合）
    setTimeout(() => {
      setTimelineItems(current => {
        const item = current.find(i => i.id === lastAction.itemId);
        if (item && item.planId) {
          onScheduleUpdate(item.planId, lastAction.oldValue.startTime);
        }
        return current;
      });
    }, 0);
  }, [undoStack, onScheduleUpdate]);
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

  // 出演者の参加可能時間を取得（調整可能時間を優先、なければ入り時間・終わり時間を使用）
  const performerAvailabilities = useMemo((): PerformerAvailability[] => {
    return project.performers.map(performer => ({
      performerId: performer.id,
      name: performer.name,
      startTime: performer.availableStartTime || performer.startTime || recordingTimeRange.start,
      endTime: performer.availableEndTime || performer.endTime || recordingTimeRange.end,
      isConfirmed: performer.isTimeConfirmed
    }));
  }, [project.performers, recordingTimeRange]);

  // 時間外配置を検出する関数
  const getTimeConflicts = useCallback((item: TimelineItem) => {
    if (item.type !== 'plan' || !item.performers) return [];
    
    const itemStartMinutes = timeToMinutes(item.startTime);
    const itemEndMinutes = itemStartMinutes + item.duration;
    const conflicts: string[] = [];
    
    item.performers.forEach(performerId => {
      const availability = performerAvailabilities.find(a => a.performerId === performerId);
      if (!availability) return;
      
      const availableStartMinutes = timeToMinutes(availability.startTime);
      const availableEndMinutes = timeToMinutes(availability.endTime);
      
      if (itemStartMinutes < availableStartMinutes || itemEndMinutes > availableEndMinutes) {
        conflicts.push(availability.name);
      }
    });
    
    return conflicts;
  }, [performerAvailabilities]);

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

  // キーボードイベントリスナー（Ctrl/Cmd+Zでundo）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [undo]);


  // スケジュールアイテム（休憩・準備時間）をロード
  useEffect(() => {
    const loadScheduleItems = async () => {
      try {
        let scheduleItems;
        
        // デモモードの判定
        if (project.id === demoData.project.id) {
          // デモモード：セッションストレージから取得
          const sessionKey = 'beauty-road-demo-data';
          const sessionData = sessionStorage.getItem(sessionKey);
          if (sessionData) {
            const parsedData = JSON.parse(sessionData);
            scheduleItems = parsedData.scheduleItems || demoData.scheduleItems;
          } else {
            scheduleItems = demoData.scheduleItems;
          }
        } else {
          // 通常モード：データベースから取得
          const { getScheduleItems } = await import('@/lib/database');
          scheduleItems = await getScheduleItems(project.id);
        }
        
        const scheduleTimelineItems = scheduleItems.map((item: any) => ({
          id: item.id,
          type: item.type as 'break' | 'preparation' | 'custom',
          title: item.title,
          startTime: item.start_time,
          duration: item.duration,
          isMovable: true,
          color: item.type === 'break' ? '#6b7280' : item.type === 'preparation' ? '#8b5cf6' : '#ea580c',
          dbId: item.id // データベースのIDを保持
        }));

        setTimelineItems(prev => {
          // 企画アイテムのみを保持し、スケジュールアイテムを追加
          const planItems = prev.filter(item => item.type === 'plan');
          const existingScheduleItems = prev.filter(item => item.type !== 'plan');
          
          // 既存のスケジュールアイテムがある場合は、ローカルの変更を保持
          const finalScheduleItems = scheduleTimelineItems.map((dbItem: any) => {
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
    
    // 時間に正確に対応する横幅を計算（境界線を考慮して完全にフィット）
    const clampedLeft = Math.max(0, Math.min(100, left));
    const clampedWidth = Math.max(0, Math.min(100 - clampedLeft, width));
    
    // 非常に短いブロック（10分未満）には最小限の視認性を確保
    const isVeryShort = item.duration < 10;
    const finalWidth = isVeryShort ? Math.max(clampedWidth, 1.5) : clampedWidth; // 最小1.5%の幅を確保
    
    return {
      left: `${clampedLeft}%`,
      width: `${finalWidth}%`,
      backgroundColor: item.color,
      boxSizing: 'border-box' as const,
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
  
  // Undo用の操作開始時の状態保存
  const [dragStartState, setDragStartState] = useState<{itemId: string; startTime: string; duration: number} | null>(null);
  
  // カスタムアイテム追加のモーダル状態
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState(10);
  
  // 全体保存機能
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 複数選択のクリックハンドラー
  const handleItemClick = useCallback((e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + クリック：個別選択/解除
      setSelectedItems(prev => {
        const newSelected = new Set(prev);
        if (newSelected.has(itemId)) {
          newSelected.delete(itemId);
        } else {
          newSelected.add(itemId);
        }
        return newSelected;
      });
      setLastSelectedItem(itemId);
    } else if (e.shiftKey && lastSelectedItem) {
      // Shift + クリック：範囲選択
      const sortedItems = [...timelineItems].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
      const lastIndex = sortedItems.findIndex(item => item.id === lastSelectedItem);
      const currentIndex = sortedItems.findIndex(item => item.id === itemId);
      
      if (lastIndex !== -1 && currentIndex !== -1) {
        const startIndex = Math.min(lastIndex, currentIndex);
        const endIndex = Math.max(lastIndex, currentIndex);
        const rangeItems = sortedItems.slice(startIndex, endIndex + 1);
        
        setSelectedItems(() => {
          const newSelected = new Set<string>();
          rangeItems.forEach(item => newSelected.add(item.id));
          return newSelected;
        });
      }
    } else {
      // 通常のクリック：単一選択
      setSelectedItems(new Set([itemId]));
      setLastSelectedItem(itemId);
    }
  }, [selectedItems, lastSelectedItem, timelineItems]);

  // ドラッグ開始
  const handleDragStart = useCallback((e: React.DragEvent, itemId: string) => {
    // 選択されていないアイテムがドラッグされた場合、そのアイテムを選択
    if (!selectedItems.has(itemId)) {
      setSelectedItems(new Set([itemId]));
      setLastSelectedItem(itemId);
    }
    
    // Undo用にドラッグ開始時の状態を保存
    const item = timelineItems.find(i => i.id === itemId);
    if (item) {
      setDragStartState({
        itemId: item.id,
        startTime: item.startTime,
        duration: item.duration
      });
    }
    
    setDraggedItem(itemId);
    const rect = e.currentTarget.getBoundingClientRect();
    const timelineRect = e.currentTarget.parentElement?.getBoundingClientRect();
    if (timelineRect) {
      setDragOffset(e.clientX - rect.left);
    }
  }, [selectedItems, timelineItems]);

  // 10分刻みにスナップする関数
  const snapToTenMinutes = (minutes: number): number => {
    return Math.round(minutes / 10) * 10;
  };

  // ドラッグオーバー（複数選択対応）
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;
    
    const timelineRect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - timelineRect.left - dragOffset;
    const percentage = Math.max(0, Math.min(100, (relativeX / timelineRect.width) * 100));
    const rawStartMinutes = timelineStart + (percentage / 100) * timelineDuration;
    
    // 10分刻みにスナップ
    const snappedStartMinutes = snapToTenMinutes(rawStartMinutes);
    
    // ドラッグされたアイテムの元の位置を取得
    const draggedItemOriginal = timelineItems.find(item => item.id === draggedItem);
    if (!draggedItemOriginal) return;
    
    const originalStartMinutes = timeToMinutes(draggedItemOriginal.startTime);
    const offset = snappedStartMinutes - originalStartMinutes;
    
    setTimelineItems(prev => prev.map(item => {
      if (selectedItems.has(item.id)) {
        const itemStartMinutes = timeToMinutes(item.startTime) + offset;
        const clampedStartMinutes = Math.max(timelineStart, Math.min(timelineEnd - item.duration, itemStartMinutes));
        const newStartTime = minutesToTime(clampedStartMinutes);
        return { ...item, startTime: newStartTime };
      }
      return item;
    }));
  }, [draggedItem, dragOffset, timelineStart, timelineEnd, timelineDuration, selectedItems, timelineItems]);

  // ドロップ処理（複数選択対応）
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem || !dragStartState) return;
    
    // ドラッグされたアイテムの現在の状態を取得
    const currentItem = timelineItems.find(i => i.id === draggedItem);
    if (!currentItem) return;
    
    // 位置が変わった場合のみUndo履歴に追加
    if (dragStartState.startTime !== currentItem.startTime || dragStartState.duration !== currentItem.duration) {
      addToUndoStack({
        type: 'move',
        itemId: draggedItem,
        oldValue: {
          startTime: dragStartState.startTime,
          duration: dragStartState.duration
        },
        newValue: {
          startTime: currentItem.startTime,
          duration: currentItem.duration
        }
      });
    }
    
    // データベースを更新（企画の場合）
    if (currentItem.planId) {
      onScheduleUpdate(currentItem.planId, currentItem.startTime);
    }
    
    setDraggedItem(null);
    setDragOffset(0);
    setDragStartState(null);
  }, [draggedItem, dragStartState, timelineItems, onScheduleUpdate, addToUndoStack]);

  // 矩形選択のハンドラー
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 企画ブロック上でのクリックは除外
    if ((e.target as HTMLElement).closest('[data-item]')) return;
    
    // 右クリックやリサイズハンドラーは除外
    if (e.button !== 0 || (e.target as HTMLElement).closest('[data-resize-handle]')) return;
    
    // 常に既存の選択をクリア（何もないところをクリックした場合）
    setSelectedItems(new Set());
    setLastSelectedItem(null);
    
    // Ctrl/Cmd/Shiftが押されていない場合のみドラッグ選択を開始
    if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
      setIsDragSelecting(true);
      setDragSelectStart({ x: e.clientX, y: e.clientY });
      setDragSelectRect(null);
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragSelecting || !dragSelectStart) return;
    
    const rect = {
      x: Math.min(dragSelectStart.x, e.clientX),
      y: Math.min(dragSelectStart.y, e.clientY),
      width: Math.abs(e.clientX - dragSelectStart.x),
      height: Math.abs(e.clientY - dragSelectStart.y)
    };
    
    setDragSelectRect(rect);
    
    // 選択矩形内のアイテムを検出
    const timelineElement = document.querySelector('[data-timeline]');
    if (!timelineElement) return;
    
    const timelineRect = timelineElement.getBoundingClientRect();
    const newSelection = new Set<string>();
    
    timelineItems.forEach(item => {
      if (item.type !== 'plan') return;
      
      const itemElement = document.querySelector(`[data-item="${item.id}"]`);
      if (!itemElement) return;
      
      const itemRect = itemElement.getBoundingClientRect();
      
      // 矩形の重なりを判定
      const isIntersecting = !(
        rect.x + rect.width < itemRect.left ||
        rect.x > itemRect.right ||
        rect.y + rect.height < itemRect.top ||
        rect.y > itemRect.bottom
      );
      
      if (isIntersecting) {
        newSelection.add(item.id);
      }
    });
    
    setSelectedItems(newSelection);
  }, [isDragSelecting, dragSelectStart, timelineItems]);

  const handleMouseUp = useCallback(() => {
    setIsDragSelecting(false);
    setDragSelectStart(null);
    setDragSelectRect(null);
    
    // 最後に選択されたアイテムを設定
    if (selectedItems.size > 0) {
      const lastItem = Array.from(selectedItems).pop();
      if (lastItem) setLastSelectedItem(lastItem);
    }
  }, [selectedItems]);

  // グローバルイベントリスナー
  useEffect(() => {
    if (isDragSelecting) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!dragSelectStart) return;
        
        const rect = {
          x: Math.min(dragSelectStart.x, e.clientX),
          y: Math.min(dragSelectStart.y, e.clientY),
          width: Math.abs(e.clientX - dragSelectStart.x),
          height: Math.abs(e.clientY - dragSelectStart.y)
        };
        
        setDragSelectRect(rect);
      };
      
      const handleGlobalMouseUp = () => {
        setIsDragSelecting(false);
        setDragSelectStart(null);
        setDragSelectRect(null);
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragSelecting, dragSelectStart]);

  // 最も右端の時間を計算する関数
  const findRightmostTime = useCallback(() => {
    let rightmostTime = timelineStart;
    
    timelineItems.forEach(item => {
      const itemStartMinutes = timeToMinutes(item.startTime);
      const itemEndMinutes = itemStartMinutes + item.duration;
      rightmostTime = Math.max(rightmostTime, itemEndMinutes);
    });
    
    // 10分刻みにスナップ
    return snapToTenMinutes(rightmostTime);
  }, [timelineItems, timelineStart]);

  // 休憩・準備時間を追加
  const addBreakOrPreparation = useCallback(async (type: 'break' | 'preparation', defaultStartTime: string) => {
    // エディターの右端に配置
    const rightmostMinutes = findRightmostTime();
    const snappedStartTime = minutesToTime(rightmostMinutes);
    
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
          type: item.type as 'break' | 'preparation' | 'custom',
          title: item.title,
          startTime: item.start_time,
          duration: item.duration,
          isMovable: true,
          color: item.type === 'break' ? '#6b7280' : item.type === 'preparation' ? '#8b5cf6' : '#ea580c',
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
  }, [project.id, findRightmostTime]);

  // カスタムアイテムを追加
  const addCustomItem = useCallback(async () => {
    if (!customTitle.trim()) return;
    
    // エディターの右端に配置
    const rightmostMinutes = findRightmostTime();
    const snappedStartTime = minutesToTime(rightmostMinutes);
    
    try {
      const { createScheduleItem } = await import('@/lib/database');
      const success = await createScheduleItem(project.id, 'custom', customTitle, snappedStartTime, customDuration);
      
      if (success) {
        // データベースから最新のデータを再取得
        const { getScheduleItems } = await import('@/lib/database');
        const scheduleItems = await getScheduleItems(project.id);
        
        const scheduleTimelineItems = scheduleItems.map((item: any) => ({
          id: item.id,
          type: item.type as 'break' | 'preparation' | 'custom',
          title: item.title,
          startTime: item.start_time,
          duration: item.duration,
          isMovable: true,
          color: item.type === 'break' ? '#6b7280' : item.type === 'preparation' ? '#8b5cf6' : '#ea580c',
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
        
        // モーダルを閉じてリセット
        setShowCustomModal(false);
        setCustomTitle('');
        setCustomDuration(10);
      }
    } catch (error) {
      console.error('Failed to add custom item:', error);
    }
  }, [project.id, customTitle, customDuration, findRightmostTime]);

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

  // エディター外クリックで選択解除
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // data-timelineまたはdata-itemをクリックした場合は何もしない
    const target = e.target as HTMLElement;
    if (target.closest('[data-timeline]') || target.closest('[data-item]')) {
      return;
    }
    
    // それ以外の場所をクリックした場合は選択解除
    setSelectedItems(new Set());
    setLastSelectedItem(null);
  }, []);

  return (
    <div className="space-y-6" onClick={handleContainerClick}>
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
          <button
            onClick={() => setShowCustomModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            カスタム項目を追加
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
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              data-timeline
            >
              {timelineItems
                .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime))
                .map((item, index) => (
                <div
                  key={item.id}
                  data-item={item.id}
                  className={`absolute h-16 top-2 rounded-lg border shadow-lg hover:shadow-xl transition-all ${
                    draggedItem === item.id ? 'opacity-50' : ''
                  } ${resizingItem === item.id ? 'ring-2 ring-blue-400' : ''} ${
                    selectedItems.has(item.id) ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'
                  }`}
                  style={{
                    ...getItemStyle(item),
                    // 新しく追加されたアイテム（休憩・準備・カスタム）を最上位に表示
                    zIndex: selectedItems.has(item.id) ? 30 + index : 
                            (item.type !== 'plan' ? 20 + index : 10 + index),
                  }}
                  draggable={item.isMovable && editingItem !== item.id && !resizingItem}
                  onDragStart={(e) => editingItem === item.id || resizingItem ? e.preventDefault() : handleDragStart(e, item.id)}
                  onClick={(e) => handleItemClick(e, item.id)}
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
                      
                      {/* 時間外配置警告 */}
                      {(() => {
                        const conflicts = getTimeConflicts(item);
                        return conflicts.length > 0 && (
                          <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 z-50 group/warning">
                            <div className="bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            {/* ツールチップ */}
                            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-3 py-2 rounded text-xs opacity-0 group-hover/warning:opacity-100 transition-opacity z-50 whitespace-nowrap">
                              {conflicts.length === 1 
                                ? `${conflicts[0]}さんの調整可能時間外です`
                                : `${conflicts.join('、')}さんの調整可能時間外です`
                              }
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* タイトル部分 */}
                      <div className="font-medium text-center flex-1 flex items-center justify-center text-xs leading-tight" title={item.title}>
                        {item.title.length > 18 ? `${item.title.substring(0, 18)}...` : item.title}
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
              
              {/* 選択矩形の表示 */}
              {isDragSelecting && dragSelectRect && (
                <div
                  className="absolute border-2 border-blue-500 bg-blue-500/20 pointer-events-none z-50"
                  style={{
                    left: dragSelectRect.x - (document.querySelector('[data-timeline]')?.getBoundingClientRect().left || 0),
                    top: dragSelectRect.y - (document.querySelector('[data-timeline]')?.getBoundingClientRect().top || 0),
                    width: dragSelectRect.width,
                    height: dragSelectRect.height,
                  }}
                />
              )}
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
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded"></div>
            <span>カスタム項目</span>
          </div>
        </div>
      </div>

      {/* カスタム項目追加モーダル */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">カスタム項目を追加</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  項目名
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="例: 移動時間、セットアップ、その他"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  時間（分）
                </label>
                <input
                  type="number"
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value) || 10)}
                  min="10"
                  step="10"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={addCustomItem}
                disabled={!customTitle.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                追加
              </button>
              <button
                onClick={() => {
                  setShowCustomModal(false);
                  setCustomTitle('');
                  setCustomDuration(10);
                }}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}