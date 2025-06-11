'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProject } from '@/lib/database';
import { Project, Performer, Plan } from '@/types';

export default function PerformerPage({ 
  params 
}: { 
  params: Promise<{ id: string; performerId: string }> 
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [performer, setPerformer] = useState<Performer | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const resolvedParams = await params;
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
            プロジェクトに戻る
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{performer.name}</h1>
            <p className="text-pink-100">{project.title} - 出演者詳細</p>
            {performer.role && (
              <p className="text-pink-200 mt-1">役割: {performer.role}</p>
            )}
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">収録日</h3>
                  <p className="mt-1 text-lg text-gray-900 font-medium">{project.recordingDate}</p>
                </div>
                <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">収録場所</h3>
                  <div className="mt-1 flex items-center space-x-2">
                    <p className="text-lg text-gray-900 font-medium">{project.location}</p>
                    {project.locationMapUrl && (
                      <a
                        href={project.locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700 text-sm font-medium transition-colors"
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
              </div>
              <div className="space-y-4">
                {performer.startTime && (
                  <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">入り時間</h3>
                    <div className="mt-1 flex items-center space-x-2">
                      <p className="text-lg text-gray-900 font-medium">{performer.startTime}</p>
                      {!performer.isTimeConfirmed && (
                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 rounded-full text-xs font-medium">
                          仮
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {performer.endTime && (
                  <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">終わり時間</h3>
                    <div className="mt-1 flex items-center space-x-2">
                      <p className="text-lg text-gray-900 font-medium">{performer.endTime}</p>
                      {!performer.isTimeConfirmed && (
                        <span className="px-2 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 rounded-full text-xs font-medium">
                          仮
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {performerPlans.length > 0 && (
              <div className="border-t border-gray-100 pt-6 mb-8">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">出演予定企画</h3>
                <div className="space-y-4">
                  {performerPlans
                    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                    .map((plan) => {
                      const performerRole = plan.performers.find(p => p.performerId === performer.id);
                      const otherPerformers = plan.performers.filter(p => p.performerId !== performer.id);
                      
                      return (
                        <div key={plan.id} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-md hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-gray-900 text-lg">{plan.title}</h4>
                              <div className="text-sm text-gray-600 mt-1">
                                {plan.scheduledTime} ({plan.duration})
                              </div>
                              {performerRole?.role && (
                                <div className="text-sm text-blue-600 mt-1">
                                  あなたの役割: {performerRole.role}
                                </div>
                              )}
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              plan.isConfirmed
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                            }`}>
                              {plan.isConfirmed ? '確定' : '仮'}
                            </span>
                          </div>
                          
                          {otherPerformers.length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-sm font-medium text-gray-700 mb-1">共演者</h5>
                              <div className="text-sm text-gray-600">
                                {otherPerformers.map(p => {
                                  const coPerformer = project.performers.find(perf => perf.id === p.performerId);
                                  return coPerformer ? `${coPerformer.name} (${p.role})` : '';
                                }).join(', ')}
                              </div>
                            </div>
                          )}
                          
                          <div className="border-t pt-3 space-y-2">
                            <div>
                              <span className="text-sm font-medium text-gray-700">台本: </span>
                              {plan.hasScript && plan.scriptUrl ? (
                                <a 
                                  href={plan.scriptUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-pink-600 hover:text-pink-700 text-sm font-medium transition-colors inline-flex items-center gap-1"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                  台本を見る
                                </a>
                              ) : (
                                <span className="text-sm text-gray-500">台本なし</span>
                              )}
                            </div>
                            
                            {plan.notes && (
                              <div>
                                <span className="text-sm font-medium text-gray-700">補足情報: </span>
                                <p className="text-sm text-gray-600 mt-1">{plan.notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {timeline.length > 0 && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">当日のスケジュール</h3>
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
                                {item.time} - {item.title}
                              </p>
                              {'role' in item && (item as any).role && (
                                <p className="text-sm text-blue-600">役割: {(item as any).role}</p>
                              )}
                              {'duration' in item && (item as any).duration && (
                                <p className="text-sm text-gray-600">収録時間: {(item as any).duration}</p>
                              )}
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