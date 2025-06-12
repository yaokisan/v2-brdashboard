'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProject } from '@/lib/database';
import { Project } from '@/types';
import { formatRecordingTime, getDayOfWeek, formatTimeShort } from '@/lib/utils';

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
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-3">{project.title}</h1>
            <p className="text-xl font-semibold text-white drop-shadow-sm">収録概要ダッシュボード</p>
          </div>
          
          {/* Main Dashboard Information Section */}
          <div className="bg-gradient-to-br from-pink-50/80 to-purple-50/80 backdrop-blur-sm border-b border-pink-100/50 p-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  収録情報
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full mx-auto"></div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg text-center">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    収録日
                  </h3>
                  <p className="text-xl text-gray-900 font-bold">
                    {project.recordingDate} ({getDayOfWeek(project.recordingDate)})
                  </p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg text-center">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    収録時間
                  </h3>
                  <p className="text-xl text-gray-900 font-bold">
                    {formatRecordingTime(project.totalRecordingTime)}
                  </p>
                  <p className="text-sm text-gray-600 mt-2 font-medium">
                    ※スタジオ全体の収録時間帯
                  </p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg text-center">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    収録場所
                  </h3>
                  <div className="space-y-3">
                    <p className="text-xl text-gray-900 font-bold">{project.location}</p>
                    <p className="text-sm text-gray-600">東京都渋谷区1-1-1</p>
                    {project.locationMapUrl && (
                      <a
                        href={project.locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:from-pink-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                      >
                        <span className="inline-flex items-center gap-2">
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
          </div>

          {/* Performer List Section */}
          <div className="p-6">
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
                      </div>
                      <div className="text-right">
                        <svg className="w-5 h-5 text-pink-500 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                    {(performer.startTime || performer.endTime) && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {performer.startTime && `入り: ${formatTimeShort(performer.startTime)}`}
                            {performer.startTime && performer.endTime && ' / '}
                            {performer.endTime && `終わり: ${formatTimeShort(performer.endTime)}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {!performer.isTimeConfirmed && (
                            <svg className="w-5 h-5 text-orange-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          )}
                          <span className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                            performer.isTimeConfirmed
                              ? 'bg-green-500 text-white'
                              : 'bg-orange-500 text-white animate-pulse'
                          }`}>
                            {performer.isTimeConfirmed ? '✓ 時間確定' : '⚠ 時間仮決定'}
                          </span>
                        </div>
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

          </div>
        </div>
      </div>
    </div>
  );
}