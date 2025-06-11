'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProject } from '@/lib/database';
import { Project } from '@/types';

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadProject = async () => {
      const resolvedParams = await params;
      const projectData = await getProject(resolvedParams.id);
      if (!projectData) {
        router.push('/');
        return;
      }
      
      setProject(projectData);
      setLoading(false);
    };

    loadProject();
  }, [params, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!project) {
    return <div className="min-h-screen flex items-center justify-center">プロジェクトが見つかりません</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            <p className="text-pink-100">BEAUTY ROAD 収録プロジェクト</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">収録日</h3>
                  <p className="mt-1 text-lg text-gray-900">{project.recordingDate}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">総収録時間</h3>
                  <p className="mt-1 text-lg text-gray-900">{project.totalRecordingTime}</p>
                </div>
              </div>
              <div className="space-y-4">
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
            </div>

            <div className="border-t pt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">出演者一覧</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.performers.map((performer) => (
                  <div
                    key={performer.id}
                    className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => router.push(`/project/${project.id}/performer/${performer.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{performer.name}</h4>
                        {performer.role && (
                          <p className="text-sm text-gray-600">{performer.role}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-blue-600">詳細 →</span>
                      </div>
                    </div>
                    {(performer.startTime || performer.endTime) && (
                      <div className="mt-2 text-sm text-gray-600">
                        {performer.startTime && `入り: ${performer.startTime}`}
                        {performer.startTime && performer.endTime && ' / '}
                        {performer.endTime && `終わり: ${performer.endTime}`}
                        {!performer.isTimeConfirmed && (
                          <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            仮
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {project.performers.length === 0 && (
                <p className="text-gray-500 text-center py-8">まだ出演者が登録されていません</p>
              )}
            </div>

            {project.plans.length > 0 && (
              <div className="border-t pt-6 mt-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">企画一覧</h3>
                <div className="space-y-3">
                  {project.plans
                    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                    .map((plan) => (
                      <div key={plan.id} className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{plan.title}</h4>
                            <div className="text-sm text-gray-600 mt-1">
                              {plan.scheduledTime} ({plan.duration})
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              plan.isConfirmed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {plan.isConfirmed ? '確定' : '仮'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}