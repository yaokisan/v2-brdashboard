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
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20">
          <p className="text-gray-600">プロジェクトが見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
            <p className="text-pink-100">BEAUTY ROAD 収録プロジェクト</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">収録日</h3>
                  <p className="mt-1 text-lg text-gray-900 font-medium">{project.recordingDate}</p>
                </div>
                <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">総収録時間</h3>
                  <p className="mt-1 text-lg text-gray-900 font-medium">{project.totalRecordingTime}</p>
                </div>
              </div>
              <div className="space-y-4">
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
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                出演者一覧
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {project.performers.map((performer) => (
                  <div
                    key={performer.id}
                    className="group bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 cursor-pointer"
                    onClick={() => router.push(`/project/${project.id}/performer/${performer.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 group-hover:text-pink-600 transition-colors">
                          {performer.name}
                        </h4>
                        {performer.role && (
                          <p className="text-sm text-gray-600">{performer.role}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <svg className="w-5 h-5 text-pink-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    {(performer.startTime || performer.endTime) && (
                      <div className="mt-3 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {performer.startTime && `入り: ${performer.startTime}`}
                            {performer.startTime && performer.endTime && ' / '}
                            {performer.endTime && `終わり: ${performer.endTime}`}
                          </span>
                        </div>
                        {!performer.isTimeConfirmed && (
                          <span className="inline-block mt-2 px-2 py-1 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 rounded-full text-xs font-medium">
                            仮
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {project.performers.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="mt-2 text-gray-500">まだ出演者が登録されていません</p>
                </div>
              )}
            </div>

            {project.plans.length > 0 && (
              <div className="border-t border-gray-100 pt-6 mt-6">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  企画一覧
                </h3>
                <div className="space-y-3">
                  {project.plans
                    .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                    .map((plan) => (
                      <div key={plan.id} className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-white/50 shadow-md hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{plan.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{plan.scheduledTime} ({plan.duration})</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                              plan.isConfirmed
                                ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                                : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
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