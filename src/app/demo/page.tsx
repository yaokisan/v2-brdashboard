'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import demoData from '@/data/demo-data.json';

export default function DemoPage() {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // セッションストレージからデモデータを取得または初期化
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
        setProject(initialData.project as Project);
      } else {
        // 既存のセッションデータがある場合
        const parsedData = JSON.parse(sessionData);
        setProject(parsedData.project);
      }
      
      setLoading(false);
    };

    initializeDemoData();
  }, []);

  const navigateToDemo = (path: string) => {
    // デモ用のプロジェクトIDを使用してナビゲート
    router.push(`/project/${demoData.project.id}${path}`);
  };

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
          <p className="text-gray-600">デモデータの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-pink-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            ログインに戻る
          </button>
        </div>

        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 px-6 py-8 text-white text-center">
            <h1 className="text-3xl font-bold mb-3">BEAUTY ROAD デモ</h1>
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-2 h-2 bg-white rounded-full"></div>
              <p className="text-xl font-semibold text-white drop-shadow-sm">システム体験版</p>
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
            <p className="text-pink-100">実際のプロジェクト管理システムをお試しいただけます</p>
          </div>
          
          <div className="p-6">
            <div className="mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-1">デモについて</h3>
                    <p className="text-sm text-blue-800">
                      このデモは実際のBeauty Roadプロジェクト管理システムの機能をご体験いただけます。
                      セッション中はデータの変更が保持されますが、ブラウザを閉じると初期状態にリセットされます。
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  デモプロジェクト情報
                </h3>
                <div className="mt-3 space-y-2">
                  <p className="text-lg text-gray-900 font-medium">{project.title}</p>
                  <p className="text-sm text-gray-600">収録日: {project.recordingDate}</p>
                  <p className="text-sm text-gray-600">場所: {project.location}</p>
                  <p className="text-sm text-gray-600">出演者: {project.performers.length}名</p>
                  <p className="text-sm text-gray-600">企画数: {project.plans.length}件</p>
                </div>
              </div>

              <div className="bg-gray-50/50 backdrop-blur-sm rounded-xl p-4 border border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">利用可能な機能</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    出演者専用ページの表示
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    スケジュール・企画情報の確認
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    持ち物チェック機能
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    時間確定状況の表示
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* 管理者機能 */}
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  管理者機能をお試しください
                </h3>
                <button
                  onClick={() => router.push('/admin/project/demo-project-1')}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>管理画面で全機能を試す</span>
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  基本情報・出演者管理・企画管理・香盤エディタなど、すべての管理機能をお試しいただけます。
                </p>
              </div>

              {/* 出演者ページ */}
              <div>
                <h3 className="text-xl font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">
                  出演者ページをお試しください
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {project.performers.map((performer) => (
                    <button
                      key={performer.id}
                      onClick={() => navigateToDemo(`/performer/${performer.id}`)}
                      className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-4 hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-purple-50/50 transition-all duration-200 hover:shadow-lg group"
                    >
                      <div className="text-center">
                        <div className="w-12 h-12 bg-gradient-to-r from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:from-pink-500 group-hover:to-purple-600 transition-all">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-gray-900 mb-1">{performer.name}様</h4>
                        <p className="text-sm text-gray-600">
                          {performer.startTime} - {performer.endTime}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            performer.isTimeConfirmed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {performer.isTimeConfirmed ? '時間確定' : '仮決定'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <div>
                    <h4 className="font-semibold text-purple-900 mb-1">システムの詳細について</h4>
                    <p className="text-sm text-purple-800">
                      実際のBeauty Roadシステムでは、管理者機能・香盤表エディター・総合スケジュール管理など、
                      より多くの機能をご利用いただけます。詳細については別途お問い合わせください。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}