'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatRecordingTime, getDayOfWeek } from '@/lib/utils';
import demoData from '@/data/demo-data.json';

export default function DemoAdminDashboard() {
  const [project, setProject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // デモデータを初期化
    const initializeDemoData = () => {
      const sessionKey = 'beauty-road-demo-data';
      let sessionData = sessionStorage.getItem(sessionKey);
      
      if (!sessionData) {
        // 初回アクセス時：デモデータをセッションストレージに保存
        const initialData = {
          project: {
            ...demoData.project,
            performers: demoData.performers,
            plans: demoData.plans.map(plan => ({
              ...plan,
              performers: plan.performers
            }))
          },
          scheduleItems: demoData.scheduleItems
        };
        
        sessionStorage.setItem(sessionKey, JSON.stringify(initialData));
        setProject(initialData.project);
      } else {
        // 既存のセッションデータがある場合
        const parsedData = JSON.parse(sessionData);
        setProject(parsedData.project);
      }
      
      setLoading(false);
    };

    initializeDemoData();
  }, []);

  const handleLogout = () => {
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Modern Header */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl shadow-lg">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent truncate">
                  BEAUTY ROAD
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 truncate">デモ管理者ダッシュボード</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 rounded-lg">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="text-sm font-medium text-amber-700">デモモード</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">ログインに戻る</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Demo Notice */}
          <div className="mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">デモモードで動作中</h3>
                  <p className="text-sm text-amber-800">
                    Beauty Road管理システムの全機能をお試しいただけます。変更内容はセッション中のみ保持され、ブラウザを閉じるとリセットされます。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">デモプロジェクト</h2>
              <p className="text-gray-600 mt-1">収録プロジェクトの管理機能を体験</p>
            </div>
          </div>

          {/* Demo Project Card */}
          {project && (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 max-w-4xl">
              <div className="group bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] relative">
                {/* Demo Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold shadow-lg">
                    DEMO
                  </span>
                </div>

                {/* Card Header */}
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4">
                  <h3 className="text-xl font-bold text-white mb-1">{project.title}</h3>
                  <p className="text-pink-100 text-sm">デモ収録プロジェクト</p>
                </div>
                
                {/* Card Content */}
                <div className="p-6">
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0V2m6 5v6a1 1 0 01-1 1H9a1 1 0 01-1-1V7m10-5v13a2 2 0 01-2 2H5a2 2 0 01-2-2V2a2 2 0 012-2h14a2 2 0 012 2z" />
                      </svg>
                      <span className="text-sm text-gray-600">収録日: <span className="font-medium text-gray-900">{project.recordingDate} ({getDayOfWeek(project.recordingDate)})</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm text-gray-600">時間: <span className="font-medium text-gray-900">{formatRecordingTime(project.totalRecordingTime)}</span></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-600">場所: <span className="font-medium text-gray-900">{project.location}</span></span>
                    </div>
                  </div>
                  
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-r from-pink-50 to-pink-100 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-pink-600">{project.performers.length}</div>
                      <div className="text-xs text-pink-500 font-medium">出演者</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-purple-600">{project.plans.length}</div>
                      <div className="text-xs text-purple-500 font-medium">企画</div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => router.push(`/admin/project/${project.id}`)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>管理画面で編集</span>
                      </button>
                      <button
                        onClick={() => window.open(`/project/${project.id}`, '_blank')}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>出演者ページ表示</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature Overview Card */}
              <div className="bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-white/20 p-6">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  体験できる機能
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">基本情報管理</p>
                      <p className="text-sm text-gray-600">プロジェクト詳細の編集</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">出演者管理</p>
                      <p className="text-sm text-gray-600">出演者情報の追加・編集</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">企画管理</p>
                      <p className="text-sm text-gray-600">収録企画の作成・編集</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">香盤エディタ</p>
                      <p className="text-sm text-gray-600">ドラッグ&ドロップでスケジュール編集</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">総合香盤表</p>
                      <p className="text-sm text-gray-600">印刷対応の香盤表生成</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}