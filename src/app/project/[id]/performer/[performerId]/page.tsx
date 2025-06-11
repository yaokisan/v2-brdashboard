'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProject } from '@/lib/database';
import { Project, Performer, Plan } from '@/types';

export default function PerformerPage({ 
  params 
}: { 
  params: { id: string; performerId: string } 
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [performer, setPerformer] = useState<Performer | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const projectData = await getProject(params.id);
      if (!projectData) {
        router.push('/');
        return;
      }
      
      const performerData = projectData.performers.find(p => p.id === params.performerId);
      if (!performerData) {
        router.push(`/project/${params.id}`);
        return;
      }
      
      setProject(projectData);
      setPerformer(performerData);
      setLoading(false);
    };

    loadData();
  }, [params.id, params.performerId, router]);

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
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!project || !performer) {
    return <div className="min-h-screen flex items-center justify-center">データが見つかりません</div>;
  }

  const performerPlans = getPerformerPlans();
  const timeline = generateTimeline();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/project/${project.id}`)}
            className="text-gray-600 hover:text-gray-900 flex items-center"
          >
            ← プロジェクトに戻る
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">収録日</h3>
                  <p className="mt-1 text-lg text-gray-900">{project.recordingDate}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">収録場所</h3>
                  <div className="mt-1 flex items-center space-x-2">
                    <p className="text-lg text-gray-900">{project.location}</p>
                    {project.locationMapUrl && (
                      <a
                        href={project.locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        📍 地図を見る
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {performer.startTime && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">入り時間</h3>
                    <div className="mt-1 flex items-center space-x-2">
                      <p className="text-lg text-gray-900">{performer.startTime}</p>
                      {!performer.isTimeConfirmed && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          仮
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {performer.endTime && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">終わり時間</h3>
                    <div className="mt-1 flex items-center space-x-2">
                      <p className="text-lg text-gray-900">{performer.endTime}</p>
                      {!performer.isTimeConfirmed && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          仮
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {performerPlans.length > 0 && (
              <div className="border-t pt-6 mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">出演予定企画</h3>
                <div className="space-y-4">
                  {performerPlans
                    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                    .map((plan) => {
                      const performerRole = plan.performers.find(p => p.performerId === performer.id);
                      const otherPerformers = plan.performers.filter(p => p.performerId !== performer.id);
                      
                      return (
                        <div key={plan.id} className="bg-gray-50 rounded-lg p-4">
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
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              plan.isConfirmed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
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
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
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
              <div className="border-t pt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">当日のスケジュール</h3>
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-300"></div>
                  <div className="space-y-6">
                    {timeline.map((item, index) => (
                      <div key={index} className="relative flex items-start">
                        <div className={`absolute left-2 w-4 h-4 rounded-full border-2 border-white ${
                          item.type === 'arrival' ? 'bg-green-500' :
                          item.type === 'departure' ? 'bg-red-500' :
                          'bg-blue-500'
                        }`}></div>
                        <div className="ml-10 min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {item.time} - {item.title}
                              </p>
                              {item.role && (
                                <p className="text-sm text-blue-600">役割: {item.role}</p>
                              )}
                              {item.duration && (
                                <p className="text-sm text-gray-600">収録時間: {item.duration}</p>
                              )}
                            </div>
                            {item.isConfirmed !== undefined && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                item.isConfirmed
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
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
              <div className="text-center py-8">
                <p className="text-gray-500">まだ企画が割り当てられていません</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}