'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getProject, 
  updateProject, 
  createPerformer, 
  updatePerformer, 
  deletePerformer,
  createPlan,
  updatePlan,
  deletePlan,
  addPerformerToPlan,
  removePerformerFromPlan,
  updatePlanPerformerRole
} from '@/lib/database';
import { Project, Performer, Plan } from '@/types';
import TimeInput from '@/components/TimeInput';
import { calculateEndTime } from '@/lib/utils';

export default function ProjectEditPage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'performers' | 'plans' | 'schedule'>('basic');
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = document.cookie.includes('auth=true');
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    const loadProject = async () => {
      const resolvedParams = await params;
      const projectData = await getProject(resolvedParams.id);
      if (!projectData) {
        router.push('/admin');
        return;
      }
      
      setProject(projectData);
      setLoading(false);
    };

    loadProject();
  }, [params, router]);

  const updateProjectData = async (updates: Partial<Project>) => {
    if (!project) return;
    const updated = await updateProject(project.id, updates);
    if (updated) {
      setProject(updated);
    }
  };

  const addPerformer = async () => {
    if (!project) return;
    const newPerformer = await createPerformer(project.id, {
      name: '',
      isTimeConfirmed: false
    });
    
    if (newPerformer) {
      setProject({
        ...project,
        performers: [...project.performers, newPerformer]
      });
    }
  };

  const updatePerformerData = async (performerId: string, updates: Partial<Performer>) => {
    if (!project) return;
    const success = await updatePerformer(performerId, updates);
    if (success) {
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
      }
    }
  };

  const removePerformer = async (performerId: string) => {
    if (!project) return;
    const success = await deletePerformer(performerId);
    if (success) {
      setProject({
        ...project,
        performers: project.performers.filter(p => p.id !== performerId)
      });
    }
  };

  const addPlan = async () => {
    if (!project) return;
    const newPlan = await createPlan(project.id, {
      title: '新しい企画',
      scheduledTime: '09:00',
      duration: '30分',
      hasScript: false,
      isConfirmed: false
    });
    
    if (newPlan) {
      setProject({
        ...project,
        plans: [...project.plans, newPlan]
      });
    }
  };

  const updatePlanData = async (planId: string, updates: Partial<Plan>) => {
    if (!project) return;
    const success = await updatePlan(planId, updates);
    if (success) {
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
      }
    }
  };

  const removePlan = async (planId: string) => {
    if (!project) return;
    const success = await deletePlan(planId);
    if (success) {
      setProject({
        ...project,
        plans: project.plans.filter(p => p.id !== planId)
      });
    }
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
          <p className="text-gray-600">プロジェクトが見つかりません</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <nav className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-pink-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                戻る
              </button>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {project.title} - 編集ページ
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'basic', label: '基本情報' },
                { key: 'performers', label: '出演者管理' },
                { key: 'plans', label: '企画管理' },
                { key: 'schedule', label: '香盤表' }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-pink-500 text-pink-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {activeTab === 'basic' && (
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">基本情報</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">プロジェクト名</label>
                  <input
                    type="text"
                    value={project.title}
                    onChange={(e) => updateProjectData({ title: e.target.value })}
                    className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">収録日</label>
                  <input
                    type="date"
                    value={project.recordingDate}
                    onChange={(e) => updateProjectData({ recordingDate: e.target.value })}
                    className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">収録時間</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">開始時間</label>
                      <TimeInput
                        value={project.totalRecordingTime.includes('-') ? project.totalRecordingTime.split('-')[0].trim() : '09:00'}
                        onChange={(newStartTime) => {
                          const endTime = project.totalRecordingTime.includes('-') ? project.totalRecordingTime.split('-')[1].trim() : '18:00';
                          updateProjectData({ totalRecordingTime: `${newStartTime}-${endTime}` });
                        }}
                        className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">終了時間</label>
                      <TimeInput
                        value={project.totalRecordingTime.includes('-') ? project.totalRecordingTime.split('-')[1].trim() : '18:00'}
                        onChange={(newEndTime) => {
                          const startTime = project.totalRecordingTime.includes('-') ? project.totalRecordingTime.split('-')[0].trim() : '09:00';
                          updateProjectData({ totalRecordingTime: `${startTime}-${newEndTime}` });
                        }}
                        className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        required
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    スタジオ全体の収録時間帯（10分単位で設定可能）
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">収録場所</label>
                  <input
                    type="text"
                    value={project.location}
                    onChange={(e) => updateProjectData({ location: e.target.value })}
                    className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">住所</label>
                  <input
                    type="text"
                    value={project.address || ''}
                    onChange={(e) => updateProjectData({ address: e.target.value })}
                    placeholder="例: 東京都渋谷区1-1-1"
                    className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Google Map URL</label>
                  <input
                    type="url"
                    value={project.locationMapUrl || ''}
                    onChange={(e) => updateProjectData({ locationMapUrl: e.target.value })}
                    className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    alert('基本情報が保存されました。');
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105"
                >
                  保存
                </button>
              </div>
            </div>
          )}

          {activeTab === 'performers' && (
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">出演者管理</h3>
                <button
                  onClick={addPerformer}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:scale-105 transition-all duration-200 shadow-md flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  出演者追加
                </button>
              </div>
              <div className="space-y-4">
                {project.performers.map((performer) => (
                  <div key={performer.id} id={`performer-${performer.id}`} className="border rounded-xl p-6 bg-white/50 backdrop-blur-sm transition-all duration-300">
                    <div className="space-y-4">
                      {/* 名前欄 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">出演者名</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={performer.name}
                            onChange={(e) => updatePerformerData(performer.id, { name: e.target.value })}
                            className="w-full border-gray-200 rounded-xl px-4 py-2.5 pr-12 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                            placeholder="名前を入力"
                          />
                          <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">様</span>
                        </div>
                      </div>

                      {/* 時間設定 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">入り時間</label>
                          <input
                            type="time"
                            value={performer.startTime || ''}
                            onChange={(e) => updatePerformerData(performer.id, { startTime: e.target.value })}
                            className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">終わり時間</label>
                          <input
                            type="time"
                            value={performer.endTime || ''}
                            onChange={(e) => updatePerformerData(performer.id, { endTime: e.target.value })}
                            className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                          />
                        </div>
                      </div>

                      {/* 時間確定チェックボックス */}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={performer.isTimeConfirmed}
                            onChange={(e) => updatePerformerData(performer.id, { isTimeConfirmed: e.target.checked })}
                            className="rounded border-gray-300 text-pink-600 shadow-sm focus:border-pink-300 focus:ring focus:ring-pink-200 focus:ring-opacity-50"
                          />
                          <span className="ml-2 text-sm text-gray-700">時間を確定する</span>
                        </label>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <button
                          onClick={() => router.push(`/project/${project.id}/performer/${performer.id}`)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>プレビュー</span>
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`${performer.name}様を削除してもよろしいですか？`)) {
                              // 削除アニメーション
                              const element = document.getElementById(`performer-${performer.id}`);
                              if (element) {
                                element.style.transform = 'scale(0.8)';
                                element.style.opacity = '0';
                                setTimeout(() => removePerformer(performer.id), 300);
                              } else {
                                removePerformer(performer.id);
                              }
                            }
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>削除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {project.performers.length === 0 && (
                  <p className="text-gray-500 text-center py-8">出演者が登録されていません</p>
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    alert('出演者情報が保存されました。');
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105"
                >
                  保存
                </button>
              </div>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">企画管理</h3>
                <button
                  onClick={addPlan}
                  className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:scale-105 transition-all duration-200 shadow-md flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  企画追加
                </button>
              </div>
              
              {/* 企画概要セクション */}
              {project.plans.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-6 border border-blue-100">
                  <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2-2V7a2 2 0 012-2h2a2 2 0 002 2v2a2 2 0 002 2v6a2 2 0 01-2 2z" />
                    </svg>
                    企画概要
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-white/80 rounded-lg p-3">
                      <div className="text-xl font-bold text-blue-600">{project.plans.length}</div>
                      <div className="text-xs text-blue-500 font-medium">総企画数</div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <div className="text-xl font-bold text-green-600">{project.plans.filter(p => p.isConfirmed).length}</div>
                      <div className="text-xs text-green-500 font-medium">確定済み</div>
                    </div>
                    <div className="bg-white/80 rounded-lg p-3">
                      <div className="text-xl font-bold text-orange-600">{project.plans.filter(p => p.hasScript).length}</div>
                      <div className="text-xs text-orange-500 font-medium">台本あり</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {project.plans.map((plan) => (
                  <div key={plan.id} className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="grid grid-cols-1 gap-6">
                      {/* 企画名 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">企画名</label>
                        <input
                          type="text"
                          value={plan.title}
                          onChange={(e) => updatePlanData(plan.id, { title: e.target.value })}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                          placeholder="企画名を入力"
                        />
                      </div>

                      {/* 収録時間と予定時間 */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">収録時間</label>
                          <input
                            type="text"
                            value={plan.duration}
                            placeholder="例: 30分、1時間30分"
                            onChange={(e) => updatePlanData(plan.id, { duration: e.target.value })}
                            className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">開始時間</label>
                            <input
                              type="time"
                              value={plan.scheduledTime}
                              onChange={(e) => updatePlanData(plan.id, { scheduledTime: e.target.value })}
                              className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">終了時間（自動計算）</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={calculateEndTime(plan.scheduledTime, plan.duration)}
                                readOnly
                                className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-gray-50 text-gray-600 cursor-not-allowed"
                                placeholder="自動計算されます"
                              />
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">状態</label>
                            <label className="flex items-center justify-center bg-white/70 rounded-xl px-4 py-2.5 border border-gray-200 h-full">
                              <input
                                type="checkbox"
                                checked={plan.isConfirmed}
                                onChange={(e) => updatePlanData(plan.id, { isConfirmed: e.target.checked })}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                              />
                              <span className="ml-2 text-sm font-medium text-gray-700">確定済み</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* 台本URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">台本URL</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="url"
                            value={plan.scriptUrl || ''}
                            onChange={(e) => updatePlanData(plan.id, { scriptUrl: e.target.value, hasScript: !!e.target.value })}
                            className="flex-1 border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                            placeholder="台本のURLを入力"
                          />
                          <button
                            onClick={() => updatePlanData(plan.id, { scriptUrl: '', hasScript: false })}
                            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            台本なし
                          </button>
                        </div>
                      </div>

                      {/* 補足・参考動画URL */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">補足・参考動画URL</label>
                        <textarea
                          value={plan.notes || ''}
                          onChange={(e) => updatePlanData(plan.id, { notes: e.target.value })}
                          rows={3}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                          placeholder="補足情報や参考動画URLを入力"
                        />
                      </div>

                      {/* アクションボタン */}
                      <div className="flex justify-end pt-4 border-t border-gray-200">
                        <button
                          onClick={() => {
                            if (window.confirm(`「${plan.title}」を削除してもよろしいですか？`)) {
                              removePlan(plan.id);
                            }
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>削除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {project.plans.length === 0 && (
                  <p className="text-gray-500 text-center py-8">企画が登録されていません</p>
                )}
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    alert('企画情報が保存されました。');
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105"
                >
                  保存
                </button>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
              <div className="flex items-center gap-3 mb-6">
                <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">香盤表</h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>確定済み</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span>仮決定</span>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 rounded-tl-xl">
                        時間
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        企画名
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        収録時間
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        終了予定
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        出演者
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 rounded-tr-xl">
                        状態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {project.plans
                      .sort((a, b) => {
                        // 確定済みを優先し、その中で時間順にソート
                        if (a.isConfirmed && !b.isConfirmed) return -1;
                        if (!a.isConfirmed && b.isConfirmed) return 1;
                        return a.scheduledTime.localeCompare(b.scheduledTime);
                      })
                      .map((plan, index) => (
                        <tr key={plan.id} className={`hover:bg-gray-50/50 transition-colors ${
                          plan.isConfirmed ? 'bg-green-50/30' : 'bg-yellow-50/30'
                        }`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-8 rounded-full ${
                                plan.isConfirmed ? 'bg-green-500' : 'bg-yellow-500'
                              }`}></div>
                              <span className="text-sm font-medium text-gray-900">
                                {plan.scheduledTime}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{plan.title}</div>
                            {plan.hasScript && (
                              <div className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                台本あり
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {plan.duration}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {calculateEndTime(plan.scheduledTime, plan.duration) || '---'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            <div className="flex flex-wrap gap-1">
                              {plan.performers.map(p => {
                                const performer = project.performers.find(perf => perf.id === p.performerId);
                                return performer ? (
                                  <span key={p.performerId} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                                    {performer.name}
                                    {p.role && ` (${p.role})`}
                                  </span>
                                ) : null;
                              })}
                              {plan.performers.length === 0 && (
                                <span className="text-gray-400 text-xs">出演者未設定</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              plan.isConfirmed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {plan.isConfirmed ? (
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                              {plan.isConfirmed ? '確定' : '仮'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {project.plans.length === 0 && (
                  <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-gray-500">企画が登録されていません</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}