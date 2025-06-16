'use client';

import React, { useMemo } from 'react';
import { Project, Plan, Performer } from '@/types';
import { formatTimeShort, parseDurationToMinutes, calculateEndTime } from '@/lib/utils';

interface ComprehensiveScheduleProps {
  project: Project;
}

interface ScheduleBlock {
  id: string;
  type: 'plan' | 'gap';
  title: string;
  startTime: string;
  endTime: string;
  duration: number;
  plan?: Plan;
  performers?: Performer[];
  isGap?: boolean;
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

  // プロジェクトの収録時間範囲を取得
  const recordingTimeRange = useMemo(() => {
    if (!project.totalRecordingTime.includes('-')) {
      return { start: '09:00', end: '18:00' };
    }
    const [start, end] = project.totalRecordingTime.split('-');
    return { start: start.trim(), end: end.trim() };
  }, [project.totalRecordingTime]);

  // スケジュールブロックを生成（企画 + 空き時間）
  const scheduleBlocks = useMemo((): ScheduleBlock[] => {
    const blocks: ScheduleBlock[] = [];
    const sortedPlans = project.plans
      .filter(plan => plan.scheduledTime)
      .sort((a, b) => timeToMinutes(a.scheduledTime) - timeToMinutes(b.scheduledTime));

    let currentTime = timeToMinutes(recordingTimeRange.start);
    const endTime = timeToMinutes(recordingTimeRange.end);

    sortedPlans.forEach((plan, index) => {
      const planStartMinutes = timeToMinutes(plan.scheduledTime);
      const planDurationMinutes = parseDurationToMinutes(plan.duration);
      const planEndMinutes = planStartMinutes + planDurationMinutes;

      // 前の企画との間に空き時間がある場合
      if (planStartMinutes > currentTime) {
        const gapDuration = planStartMinutes - currentTime;
        blocks.push({
          id: `gap-${index}`,
          type: 'gap',
          title: `空き時間（${gapDuration}分）`,
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(planStartMinutes),
          duration: gapDuration,
          isGap: true
        });
      }

      // 企画ブロック
      const planPerformers = plan.performers.map(p => 
        project.performers.find(performer => performer.id === p.performerId)
      ).filter(Boolean) as Performer[];

      blocks.push({
        id: plan.id,
        type: 'plan',
        title: plan.title,
        startTime: plan.scheduledTime,
        endTime: calculateEndTime(plan.scheduledTime, plan.duration),
        duration: planDurationMinutes,
        plan,
        performers: planPerformers
      });

      currentTime = planEndMinutes;
    });

    // 最後の企画の後に空き時間がある場合
    if (currentTime < endTime) {
      const gapDuration = endTime - currentTime;
      blocks.push({
        id: 'gap-final',
        type: 'gap',
        title: `空き時間（${gapDuration}分）`,
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(endTime),
        duration: gapDuration,
        isGap: true
      });
    }

    return blocks;
  }, [project.plans, project.performers, recordingTimeRange]);

  // 出演者ごとのスケジュール
  const performerSchedules = useMemo(() => {
    return project.performers.map(performer => {
      const participatingPlans = project.plans.filter(plan =>
        plan.performers.some(p => p.performerId === performer.id)
      ).sort((a, b) => timeToMinutes(a.scheduledTime) - timeToMinutes(b.scheduledTime));

      return {
        performer,
        plans: participatingPlans,
        totalTime: participatingPlans.reduce((total, plan) => 
          total + parseDurationToMinutes(plan.duration), 0
        )
      };
    });
  }, [project.performers, project.plans]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
          総合香盤表
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-blue-600 font-medium">収録日</div>
            <div className="text-blue-900 font-semibold">{project.recordingDate}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-green-600 font-medium">収録時間</div>
            <div className="text-green-900 font-semibold">{project.totalRecordingTime}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="text-purple-600 font-medium">企画数</div>
            <div className="text-purple-900 font-semibold">{project.plans.length}件</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="text-orange-600 font-medium">出演者数</div>
            <div className="text-orange-900 font-semibold">{project.performers.length}名</div>
          </div>
        </div>
      </div>

      {/* タイムライン表示 */}
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">収録タイムライン</h3>
        <div className="space-y-2">
          {scheduleBlocks.map((block, index) => (
            <div
              key={block.id}
              className={`rounded-lg p-4 border-l-4 ${
                block.type === 'plan'
                  ? block.plan?.isConfirmed
                    ? 'bg-green-50 border-green-500'
                    : 'bg-yellow-50 border-yellow-500'
                  : 'bg-gray-50 border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium text-gray-900">
                      {formatTimeShort(block.startTime)} - {formatTimeShort(block.endTime)}
                    </div>
                    <div className="text-lg font-semibold text-gray-900">
                      {block.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      ({block.duration}分)
                    </div>
                    {block.plan && (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        block.plan.isConfirmed
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {block.plan.isConfirmed ? '確定' : '仮'}
                      </span>
                    )}
                  </div>
                  
                  {block.performers && block.performers.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {block.performers.map(performer => {
                        const role = block.plan?.performers.find(p => p.performerId === performer.id)?.role;
                        return (
                          <span
                            key={performer.id}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-100 text-purple-800"
                          >
                            {performer.name}様
                            {role && <span className="ml-1 text-purple-600">({role})</span>}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {block.plan?.notes && (
                    <div className="mt-2 text-sm text-gray-600">
                      📝 {block.plan.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 出演者別スケジュール */}
      <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">出演者別スケジュール</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {performerSchedules.map(({ performer, plans, totalTime }) => (
            <div key={performer.id} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">{performer.name}様</h4>
                  <div className="text-sm text-gray-600">
                    {performer.startTime && performer.endTime && (
                      <>
                        参加時間: {formatTimeShort(performer.startTime)} - {formatTimeShort(performer.endTime)}
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">収録時間</div>
                  <div className="font-semibold text-gray-900">{totalTime}分</div>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                    performer.isTimeConfirmed
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {performer.isTimeConfirmed ? '確定' : '仮'}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                {plans.length > 0 ? (
                  plans.map(plan => (
                    <div key={plan.id} className="bg-white rounded p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{plan.title}</span>
                        <span className="text-gray-600">
                          {formatTimeShort(plan.scheduledTime)} ({plan.duration})
                        </span>
                      </div>
                      <div className="text-gray-600 mt-1">
                        役割: {plan.performers.find(p => p.performerId === performer.id)?.role || '未設定'}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    参加企画なし
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 印刷用ボタン */}
      <div className="flex justify-center">
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
    </div>
  );
}