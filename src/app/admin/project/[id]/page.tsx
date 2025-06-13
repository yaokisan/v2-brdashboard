'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { calculateEndTime, formatTimeShort } from '@/lib/utils';

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

  const updateProjectData = useCallback(async (updates: Partial<Project>) => {
    if (!project) return;
    
    // ローカル状態を先に更新
    setProject(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates };
    });
    
    // バックグラウンドでデータベースを更新
    try {
      await updateProject(project.id, updates);
    } catch (error) {
      console.error('Failed to update project:', error);
      // エラー時は元のデータを再取得
      const originalProject = await getProject(project.id);
      if (originalProject) {
        setProject(originalProject);
      }
    }
  }, [project]);

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
      
      // 新しい出演者が追加されたことを通知
      setTimeout(() => {
        const element = document.querySelector(`details:last-of-type`);
        if (element && element instanceof HTMLDetailsElement) {
          element.open = true;
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // ハイライト効果
          element.style.transform = 'scale(1.02)';
          element.style.transition = 'transform 0.3s ease';
          setTimeout(() => {
            element.style.transform = 'scale(1)';
          }, 300);
        }
      }, 100);
    }
  };

  const updatePerformerData = useCallback(async (performerId: string, updates: Partial<Performer>) => {
    if (!project) return;
    
    // ローカル状態を先に更新
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        performers: prev.performers.map(p => 
          p.id === performerId ? { ...p, ...updates } : p
        )
      };
    });
    
    // バックグラウンドでデータベースを更新
    try {
      await updatePerformer(performerId, updates);
    } catch (error) {
      console.error('Failed to update performer:', error);
      // エラー時は元のデータを再取得
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
      }
    }
  }, [project]);

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

  const updatePlanData = useCallback(async (planId: string, updates: Partial<Plan>) => {
    if (!project) return;
    
    // ローカル状態を先に更新
    setProject(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map(p => 
          p.id === planId ? { ...p, ...updates } : p
        )
      };
    });
    
    // バックグラウンドでデータベースを更新
    try {
      await updatePlan(planId, updates);
    } catch (error) {
      console.error('Failed to update plan:', error);
      // エラー時は元のデータを再取得
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
      }
    }
  }, [project]);

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
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-pink-600 transition-colors flex items-center gap-1 flex-shrink-0"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden xs:inline">戻る</span>
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent truncate">
                  <span className="hidden sm:inline">{project.title} - 編集ページ</span>
                  <span className="sm:hidden">{project.title}</span>
                </h1>
                <p className="text-xs text-gray-500 sm:hidden">編集ページ</p>
              </div>
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
              <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>変更は自動的に保存されます</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performers' && (
            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
              <div className="flex justify-between items-center mb-6">
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

              {/* 確定済み出演者 */}
              {project.performers.filter(p => p.isTimeConfirmed).length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <h4 className="text-lg font-semibold text-green-800">確定済み出演者</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {project.performers.filter(p => p.isTimeConfirmed).length}名
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.performers.filter(p => p.isTimeConfirmed).map((performer) => (
                      <PerformerCard 
                        key={performer.id} 
                        performer={performer} 
                        project={project}
                        updatePerformerData={updatePerformerData}
                        removePerformer={removePerformer}
                        router={router}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 未確定出演者 */}
              {project.performers.filter(p => !p.isTimeConfirmed).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                    <h4 className="text-lg font-semibold text-orange-800">未確定出演者</h4>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      {project.performers.filter(p => !p.isTimeConfirmed).length}名
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.performers.filter(p => !p.isTimeConfirmed).map((performer) => (
                      <PerformerCard 
                        key={performer.id} 
                        performer={performer} 
                        project={project}
                        updatePerformerData={updatePerformerData}
                        removePerformer={removePerformer}
                        router={router}
                      />
                    ))}
                  </div>
                </div>
              )}

              {project.performers.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <p className="mt-2 text-gray-500">出演者が登録されていません</p>
                </div>
              )}

              <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>変更は自動的に保存されます</span>
                </div>
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
              
              
              {/* 確定済み企画 */}
              {project.plans.filter(p => p.isConfirmed).length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <h4 className="text-lg font-semibold text-green-800">確定済み企画</h4>
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                      {project.plans.filter(p => p.isConfirmed).length}件
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.plans.filter(p => p.isConfirmed).map((plan) => (
                      <PlanCard 
                        key={plan.id} 
                        plan={plan} 
                        updatePlanData={updatePlanData}
                        removePlan={removePlan}
                        calculateEndTime={calculateEndTime}
                        project={project}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 未確定企画 */}
              {project.plans.filter(p => !p.isConfirmed).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
                    <h4 className="text-lg font-semibold text-orange-800">未確定企画</h4>
                    <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                      {project.plans.filter(p => !p.isConfirmed).length}件
                    </span>
                  </div>
                  <div className="space-y-3">
                    {project.plans.filter(p => !p.isConfirmed).map((plan) => (
                      <PlanCard 
                        key={plan.id} 
                        plan={plan} 
                        updatePlanData={updatePlanData}
                        removePlan={removePlan}
                        calculateEndTime={calculateEndTime}
                        project={project}
                      />
                    ))}
                  </div>
                </div>
              )}

              {project.plans.length === 0 && (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-gray-500">企画が登録されていません</p>
                </div>
              )}
              
              <div className="mt-6 flex justify-center">
                <div className="flex items-center gap-2 text-sm text-gray-600 bg-green-50 px-4 py-2 rounded-lg border border-green-200">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>変更は自動的に保存されます</span>
                </div>
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

// 企画カードコンポーネント
function PlanCard({ 
  plan, 
  updatePlanData, 
  removePlan, 
  calculateEndTime,
  project
}: {
  plan: Plan;
  updatePlanData: (id: string, updates: Partial<Plan>) => void;
  removePlan: (id: string) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  project: Project;
}) {
  return (
    <details className="group bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
      <summary className="p-3 sm:p-4 cursor-pointer hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-purple-50/50 transition-all rounded-xl list-none">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h5 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
                {plan.title || '企画名未入力'}
              </h5>
              <span className={`self-start px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                plan.isConfirmed ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {plan.isConfirmed ? '確定済み' : '未確定'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-sm text-gray-600">
              {plan.scheduledTime && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{plan.scheduledTime}</span>
                  {plan.duration && calculateEndTime(plan.scheduledTime, plan.duration) && (
                    <span>〜{calculateEndTime(plan.scheduledTime, plan.duration)}</span>
                  )}
                </span>
              )}
              {plan.duration && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  {plan.duration}
                </span>
              )}
              {plan.hasScript && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                  台本あり
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-gray-500 group-open:hidden hidden sm:block">タップして編集</span>
            <span className="text-xs text-gray-500 hidden group-open:block">タップして閉じる</span>
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center group-hover:from-pink-600 group-hover:to-purple-600 transition-all shadow-md">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </summary>
      
      <div className="border-t border-gray-100 p-3 sm:p-4 space-y-4">
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

        {/* 収録時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">収録時間</label>
          <select
            value={plan.duration}
            onChange={(e) => updatePlanData(plan.id, { duration: e.target.value })}
            className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
          >
            <option value="">収録時間を選択</option>
            {Array.from({ length: 18 }, (_, i) => (i + 1) * 10).map(minutes => (
              <option key={minutes} value={`${minutes}分`}>
                {minutes}分{minutes >= 60 && ` (${Math.floor(minutes / 60)}時間${minutes % 60 ? `${minutes % 60}分` : ''})`}
              </option>
            ))}
          </select>
        </div>

        {/* 開始時間・終了時間・確定ボタン */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">開始時間</label>
            <input
              type="time"
              value={plan.scheduledTime}
              onChange={(e) => updatePlanData(plan.id, { scheduledTime: e.target.value })}
              className="w-full border-gray-200 rounded-xl px-3 py-2 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">終了時間（自動計算）</label>
            <input
              type="text"
              value={calculateEndTime(plan.scheduledTime, plan.duration)}
              readOnly
              className="w-full border-gray-200 rounded-xl px-3 py-2 border bg-gray-50 text-gray-600 cursor-not-allowed text-sm"
              placeholder="自動計算されます"
            />
          </div>
        </div>

        {/* 台本設定 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">台本</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              value={plan.scriptUrl || ''}
              onChange={(e) => updatePlanData(plan.id, { scriptUrl: e.target.value, hasScript: !!e.target.value })}
              className="flex-1 border-gray-200 rounded-xl px-3 py-2 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 text-sm"
              placeholder="台本のURLを入力"
            />
            <button
              onClick={() => updatePlanData(plan.id, { scriptUrl: '台本なし', hasScript: false })}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 whitespace-nowrap"
            >
              台本なし
            </button>
          </div>
        </div>

        {/* 出演者選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">出演者</label>
          <div className="space-y-2">
            {project.performers.map((performer) => {
              const isSelected = plan.performers.some(p => p.performerId === performer.id);
              const selectedPerformer = plan.performers.find(p => p.performerId === performer.id);
              
              return (
                <div key={performer.id} className="flex items-center gap-3 p-2 bg-gray-50/50 rounded-lg">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // 出演者を追加
                        const updatedPerformers = [...plan.performers, { performerId: performer.id, role: 'Main' }];
                        updatePlanData(plan.id, { performers: updatedPerformers });
                      } else {
                        // 出演者を削除
                        const updatedPerformers = plan.performers.filter(p => p.performerId !== performer.id);
                        updatePlanData(plan.id, { performers: updatedPerformers });
                      }
                    }}
                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{performer.name}様</span>
                  
                  {isSelected && (
                    <select
                      value={selectedPerformer?.role || 'Main'}
                      onChange={(e) => {
                        const role = e.target.value;
                        const updatedPerformers = plan.performers.map(p =>
                          p.performerId === performer.id ? { ...p, role } : p
                        );
                        updatePlanData(plan.id, { performers: updatedPerformers });
                      }}
                      className="text-xs border-gray-200 rounded-lg px-2 py-1 bg-white border focus:outline-none focus:ring-1 focus:ring-pink-500"
                    >
                      <option value="MC">MC</option>
                      <option value="Guest">ゲスト</option>
                      <option value="Main">メイン</option>
                      <option value="Other">その他</option>
                    </select>
                  )}
                  
                  {isSelected && selectedPerformer?.role === 'Other' && (
                    <input
                      type="text"
                      value={selectedPerformer?.customRole || ''}
                      onChange={(e) => {
                        const customRole = e.target.value;
                        const updatedPerformers = plan.performers.map(p =>
                          p.performerId === performer.id ? { ...p, customRole } : p
                        );
                        updatePlanData(plan.id, { performers: updatedPerformers });
                      }}
                      placeholder="役割を入力"
                      className="text-xs border-gray-200 rounded-lg px-2 py-1 bg-white border focus:outline-none focus:ring-1 focus:ring-pink-500 w-20"
                    />
                  )}
                </div>
              );
            })}
            
            {project.performers.length === 0 && (
              <p className="text-sm text-gray-500 italic">出演者が登録されていません</p>
            )}
          </div>
        </div>

        {/* 補足・参考動画URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">補足・参考動画URL</label>
          <textarea
            value={plan.notes || ''}
            onChange={(e) => updatePlanData(plan.id, { notes: e.target.value })}
            rows={2}
            className="w-full border-gray-200 rounded-xl px-3 py-2 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 text-sm"
            placeholder="補足情報や参考動画URLを入力"
          />
        </div>

        {/* 確定チェックボックスとアクションボタン */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-4 border-t border-gray-200">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={plan.isConfirmed}
              onChange={(e) => updatePlanData(plan.id, { isConfirmed: e.target.checked })}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">企画を確定する</span>
          </label>
          <button
            onClick={() => {
              if (window.confirm(`「${plan.title}」を削除してもよろしいですか？`)) {
                removePlan(plan.id);
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>削除</span>
          </button>
        </div>
      </div>
    </details>
  );
}

// 出演者カードコンポーネント
function PerformerCard({ 
  performer, 
  project, 
  updatePerformerData, 
  removePerformer, 
  router 
}: {
  performer: Performer;
  project: Project;
  updatePerformerData: (id: string, updates: Partial<Performer>) => void;
  removePerformer: (id: string) => void;
  router: any;
}) {
  return (
    <details className="group bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl shadow-md hover:shadow-lg transition-all duration-200">
      <summary className="p-4 cursor-pointer hover:bg-gradient-to-r hover:from-pink-50/50 hover:to-purple-50/50 transition-all rounded-xl list-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h5 className="font-semibold text-gray-900 text-lg truncate">
                {performer.name || '名前未入力'}様
              </h5>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-600">
                {performer.startTime && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTimeShort(performer.startTime)}〜{performer.endTime ? formatTimeShort(performer.endTime) : '未設定'}
                  </span>
                )}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  performer.isTimeConfirmed 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-orange-100 text-orange-800'
                }`}>
                  {performer.isTimeConfirmed ? '確定済み' : '未確定'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 group-open:hidden hidden sm:block">タップして編集</span>
            <span className="text-sm text-gray-500 hidden group-open:block">タップして閉じる</span>
            <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center group-hover:from-pink-600 group-hover:to-purple-600 transition-all shadow-md">
              <svg className="w-4 h-4 text-white transition-transform duration-300 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </summary>
      
      <div className="border-t border-gray-100 p-4 space-y-4">
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">入り時間</label>
            <input
              type="time"
              value={performer.startTime || ''}
              onChange={(e) => updatePerformerData(performer.id, { startTime: e.target.value })}
              className="w-full border-gray-200 rounded-xl px-3 py-2 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">終わり時間</label>
            <input
              type="time"
              value={performer.endTime || ''}
              onChange={(e) => updatePerformerData(performer.id, { endTime: e.target.value })}
              className="w-full border-gray-200 rounded-xl px-3 py-2 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 text-sm"
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
              className="rounded border-gray-300 text-green-600 shadow-sm focus:border-green-300 focus:ring focus:ring-green-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">時間を確定する</span>
          </label>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <button
            onClick={() => router.push(`/project/${project.id}/performer/${performer.id}`)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center space-x-1"
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
                removePerformer(performer.id);
              }
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>削除</span>
          </button>
        </div>
      </div>
    </details>
  );
}