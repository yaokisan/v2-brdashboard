'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProject } from '@/lib/database';
import { Project, Performer, Plan } from '@/types';
import { formatRecordingTime, getDayOfWeek, formatTimeShort, calculateEndTime } from '@/lib/utils';
import demoData from '@/data/demo-data.json';

export default function PerformerPage({ 
  params 
}: { 
  params: Promise<{ id: string; performerId: string }> 
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [performer, setPerformer] = useState<Performer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const resolvedParams = await params;
      
      // デモモードの判定
      if (resolvedParams.id === demoData.project.id) {
        setIsDemoMode(true);
        
        // セッションストレージからデモデータを取得
        const sessionKey = 'beauty-road-demo-data';
        const sessionData = sessionStorage.getItem(sessionKey);
        
        let projectData;
        if (sessionData) {
          const parsedData = JSON.parse(sessionData);
          projectData = parsedData.project;
        } else {
          // セッションにない場合は初期データを使用
          projectData = {
            ...demoData.project,
            performers: demoData.performers,
            plans: demoData.plans.map(plan => ({
              ...plan,
              performers: plan.performers
            }))
          };
          
          // セッションストレージに保存
          sessionStorage.setItem(sessionKey, JSON.stringify({
            project: projectData,
            scheduleItems: demoData.scheduleItems
          }));
        }
        
        const performerData = projectData.performers.find((p: any) => p.id === resolvedParams.performerId);
        if (!performerData) {
          router.push(`/project/${resolvedParams.id}`);
          return;
        }
        
        setProject(projectData as Project);
        setPerformer(performerData);
      } else {
        // 通常モード：データベースから取得
        const projectData = await getProject(resolvedParams.id);
        if (!projectData) {
          router.push('/');
          return;
        }
        
        const performerData = projectData.performers.find(p => p.id === resolvedParams.performerId);
        if (!performerData) {
          router.push(`/project/${resolvedParams.id}`);
          return;
        }
        
        setProject(projectData);
        setPerformer(performerData);
      }
      
      setLoading(false);
    };

    loadData();
  }, [params, router]);

  const getPerformerPlans = (): Plan[] => {
    if (!project || !performer) return [];
    return project.plans.filter(plan => 
      plan.performers.some(p => p.performerId === performer.id)
    );
  };

  const generateTimeline = () => {
    if (!project || !performer) return [];
    
    const performerPlans = getPerformerPlans();
    const timeline = [];
    
    if (performer.startTime) {
      timeline.push({
        time: performer.startTime,
        title: '入り時間',
        type: 'arrival',
        isConfirmed: performer.isTimeConfirmed
      });
    }
    
    performerPlans
      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
      .forEach(plan => {
        const performerRole = plan.performers.find(p => p.performerId === performer.id);
        timeline.push({
          time: plan.scheduledTime,
          title: plan.title,
          type: 'recording',
          role: performerRole?.role,
          duration: plan.duration,
          isConfirmed: plan.isConfirmed,
          hasScript: plan.hasScript,
          scriptUrl: plan.scriptUrl,
          notes: plan.notes
        });
      });
    
    if (performer.endTime) {
      timeline.push({
        time: performer.endTime,
        title: '終わり時間',
        type: 'departure',
        isConfirmed: performer.isTimeConfirmed
      });
    }
    
    return timeline.sort((a, b) => a.time.localeCompare(b.time));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!project || !performer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <p className="text-gray-600">データが見つかりません</p>
        </div>
      </div>
    );
  }

  const performerPlans = getPerformerPlans();
  const timeline = generateTimeline();

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/project/${project.id}`)}
            className="text-gray-600 hover:text-pink-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isDemoMode ? 'デモプロジェクトに戻る' : 'プロジェクトに戻る'}
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-3">{performer.name}様</h1>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <p className="text-xl font-semibold text-white drop-shadow-sm">
                {isDemoMode ? 'デモ - 出演者詳細ページ' : '出演者詳細ページ'}
              </p>
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-pink-100">{project.title}</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    収録日
                  </h3>
                  <p className="mt-1 text-lg text-gray-900 font-medium">
                    {project.recordingDate} ({getDayOfWeek(project.recordingDate)})
                  </p>
                </div>
                <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">収録場所</h3>
                  <div className="mt-1 space-y-2">
                    <p className="text-lg text-gray-900 font-medium">{project.location}</p>
                    {project.address && (
                      <p className="text-sm text-gray-600">{project.address}</p>
                    )}
                    {project.locationMapUrl && (
                      <a
                        href={project.locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all duration-200"
                      >
                        <span className="inline-flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          地図を見る
                        </span>
                      </a>
                    )}
                  </div>
                </div>
                {project.entryMethod && (
                  <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                      入館方法
                    </h3>
                    <div className="mt-1 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {project.entryMethod}
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {(performer.startTime || performer.endTime) && (
                  <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">あなたの時間</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {performer.startTime && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">入り時間</p>
                          <p className="text-xl font-bold text-gray-900">{formatTimeShort(performer.startTime)}</p>
                        </div>
                      )}
                      {performer.endTime && (
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-1">終わり時間</p>
                          <p className="text-xl font-bold text-gray-900">{formatTimeShort(performer.endTime)}</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 text-center">
                      {!performer.isTimeConfirmed && (
                        <div className="mb-2">
                          <svg className="w-8 h-8 text-orange-500 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                      )}
                      <span className={`px-5 py-2.5 rounded-xl text-base font-bold inline-block ${performer.isTimeConfirmed ? 'bg-green-500 text-white' : 'bg-orange-500 text-white animate-pulse shadow-lg'}`}>
                        {performer.isTimeConfirmed ? '✓ 時間確定済み' : '⚠ 時間は仮決定です'}
                      </span>
                      {!performer.isTimeConfirmed && (
                        <p className="text-sm text-orange-600 mt-2 font-medium">変更の可能性があります</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(performer.belongings || performer.programItems) && (
              <div className="border-t border-gray-100 pt-6 mb-8">
                {performer.belongings && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      持ち物チェックリスト
                    </h3>
                    <div className="space-y-2">
                      {performer.belongings.split('\n').filter(item => item.trim()).map((item, index) => (
                        <div key={index} className="flex items-start gap-3 p-2 bg-white/70 rounded-lg border border-blue-200/50">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-4 h-4 border-2 border-blue-400 rounded bg-white"></div>
                          </div>
                          <span className="text-gray-700 flex-1">{item.replace(/^[・・・]+/, '').trim()}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-blue-100/70 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        💡 当日忘れ物がないよう、事前にご確認をお願いいたします。
                      </p>
                    </div>
                  </div>
                )}
                
                {performer.programItems && (
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      番組側準備物
                    </h3>
                    <div className="whitespace-pre-wrap text-gray-700">{performer.programItems}</div>
                  </div>
                )}
              </div>
            )}

            {performerPlans.length > 0 && (
              <div className="border-t border-gray-100 pt-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">出演予定企画</h3>
                  {performerPlans.some(plan => !plan.isConfirmed) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-lg">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium text-orange-700">一部企画は仮決定です</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {performerPlans
                    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                    .map((plan) => {
                      const performerRole = plan.performers.find(p => p.performerId === performer.id);
                      const otherPerformers = plan.performers.filter(p => p.performerId !== performer.id);
                      
                      return (
                        <details key={plan.id} className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/50 shadow-md group hover:shadow-lg transition-all">
                          <summary className="p-3 sm:p-4 cursor-pointer hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-purple-50/50 transition-all rounded-xl list-none">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                                  <h4 className="font-semibold text-gray-900 text-base sm:text-lg truncate">{plan.title}</h4>
                                  <span className={`self-start px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${plan.isConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {plan.isConfirmed ? '確定' : '仮'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <span className="font-medium">{formatTimeShort(plan.scheduledTime)}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>{plan.duration}</span>
                                  </div>
                                  {performerRole?.role && (
                                    <div className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full text-xs font-medium shadow-sm">
                                      あなたの役割: {performerRole.role === 'Main' ? 'メイン' : performerRole.role === 'Guest' ? 'ゲスト' : performerRole.role}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-xs text-gray-500 group-open:hidden hidden sm:block">タップして詳細を見る</span>
                                <span className="text-xs text-gray-500 hidden group-open:block">タップして閉じる</span>
                                <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center group-hover:from-pink-600 group-hover:to-purple-600 transition-all shadow-md">
                                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </summary>
                          
                          <div className="border-t border-gray-100 p-4 space-y-4">
                            {otherPerformers.length > 0 && (
                              <div>
                                <h5 className="text-sm font-semibold text-gray-700 mb-2">共演者</h5>
                                <div className="flex flex-wrap gap-2">
                                  {otherPerformers.map(p => {
                                    const coPerformer = project.performers.find(perf => perf.id === p.performerId);
                                    return coPerformer ? (
                                      <span key={p.performerId} className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                                        {coPerformer.name} (役割: {p.role === 'Main' ? 'メイン' : p.role === 'Guest' ? 'ゲスト' : p.role})
                                      </span>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div className="space-y-2">
                                <span className="text-sm font-medium text-gray-700 block">台本:</span>
                                {plan.scriptUrl && plan.scriptUrl !== '台本なし' ? (
                                  <a 
                                    href={plan.scriptUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg text-base font-medium hover:from-pink-600 hover:to-purple-600 transition-all duration-200 inline-flex items-center justify-center gap-2 w-full sm:w-4/5 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    台本を見る
                                  </a>
                                ) : plan.scriptUrl === '台本なし' ? (
                                  <span className="px-6 py-3 bg-gray-100 text-gray-600 rounded-lg text-base font-medium inline-flex items-center justify-center w-full sm:w-4/5">
                                    台本なし
                                  </span>
                                ) : (
                                  <span className="px-6 py-3 bg-gray-50 text-gray-500 rounded-lg text-base font-medium inline-flex items-center justify-center gap-2 w-full sm:w-4/5 border border-dashed border-gray-300">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    準備中
                                  </span>
                                )}
                              </div>
                              
                              <div>
                                <span className="text-sm font-medium text-gray-700 block mb-1">補足情報:</span>
                                {plan.notes ? (
                                  <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap">
                                    {plan.notes.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                                      if (part.match(/^https?:\/\//)) {
                                        return (
                                          <a
                                            key={index}
                                            href={part}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:text-blue-800 underline"
                                          >
                                            {part}
                                          </a>
                                        );
                                      }
                                      return <span key={index}>{part}</span>;
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">なし</p>
                                )}
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                </div>
              </div>
            )}

            {timeline.length > 0 && (
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">当日のスケジュール</h3>
                  {timeline.some(item => item.isConfirmed === false) && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-lg">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm font-medium text-orange-700">一部時間は仮決定です</span>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-pink-300 to-purple-300"></div>
                  <div className="space-y-6">
                    {timeline.map((item, index) => (
                      <div key={index} className="relative flex items-start">
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white shadow-md ${
                          item.type === 'arrival' ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                          item.type === 'departure' ? 'bg-gradient-to-r from-red-400 to-pink-500' :
                          'bg-gradient-to-r from-blue-400 to-indigo-500'
                        }`}></div>
                        <div className="ml-10 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.type === 'recording' && 'duration' in item && (item as any).duration ? 
                                  `${formatTimeShort(item.time)} - ${formatTimeShort(calculateEndTime(item.time, (item as any).duration))} ${item.title}` :
                                  `${formatTimeShort(item.time)} - ${item.title}`
                                }
                              </p>
                            </div>
                            {item.isConfirmed !== undefined && (
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                item.isConfirmed
                                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                  : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                              }`}>
                                {item.isConfirmed ? '確定' : '仮'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* 飲み会情報 */}
            {project.hasAfterParty && (
              <div className="border-t border-gray-100 pt-6 mb-8">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200/70 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                        収録後の飲み会
                      </h3>
                    </div>
                  </div>

                  {/* 任意参加の案内 */}
                  {project.afterPartyNote && (
                    <div className="bg-white/60 rounded-lg p-3 mb-4 border border-amber-100">
                      <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-line">
                        {project.afterPartyNote}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {project.afterPartyStartTime && (
                      <div className="bg-white/80 rounded-xl p-4 border border-amber-100">
                        <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          開始時間
                        </p>
                        <p className="text-lg font-bold text-gray-900">{project.afterPartyStartTime}〜</p>
                      </div>
                    )}
                    {project.afterPartyLocation && (
                      <div className="bg-white/80 rounded-xl p-4 border border-amber-100">
                        <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          会場
                        </p>
                        <p className="text-lg font-bold text-gray-900">{project.afterPartyLocation}</p>
                        {project.afterPartyAddress && (
                          <p className="text-sm text-gray-600 mt-1">{project.afterPartyAddress}</p>
                        )}
                        {project.afterPartyMapUrl && (
                          <a
                            href={project.afterPartyMapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium hover:from-amber-600 hover:to-orange-600 transition-all duration-200"
                          >
                            <span className="inline-flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              地図を見る
                            </span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 出欠確認ボタン */}
                  <div className="text-center mt-6">
                    <button
                      onClick={() => router.push(`/project/${project.id}/attendance?name=${encodeURIComponent(performer.name)}`)}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-full text-base font-bold shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      出欠確認はこちら
                    </button>
                    <p className="text-xs text-amber-700/70 mt-2">参加・不参加の回答と参加者の確認ができます</p>
                  </div>
                </div>
              </div>
            )}

            {performerPlans.length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-gray-500">まだ企画が割り当てられていません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}