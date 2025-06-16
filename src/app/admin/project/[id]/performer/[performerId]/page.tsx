'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  getProject, 
  updatePerformer,
  addPerformerToPlan,
  removePerformerFromPlan,
  updatePlanPerformerRole
} from '@/lib/database';
import { Project, Performer, Plan } from '@/types';

export default function AdminPerformerEditPage({ 
  params 
}: { 
  params: Promise<{ id: string; performerId: string }> 
}) {
  const [project, setProject] = useState<Project | null>(null);
  const [performer, setPerformer] = useState<Performer | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = document.cookie.includes('auth=true');
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    const loadData = async () => {
      const resolvedParams = await params;
      const projectData = await getProject(resolvedParams.id);
      if (!projectData) {
        router.push('/admin');
        return;
      }
      
      const performerData = projectData.performers.find(p => p.id === resolvedParams.performerId);
      if (!performerData) {
        router.push(`/admin/project/${resolvedParams.id}`);
        return;
      }
      
      setProject(projectData);
      setPerformer(performerData);
      setLoading(false);
    };

    loadData();
  }, [params, router]);

  const updatePerformerData = async (updates: Partial<Performer>) => {
    if (!project || !performer) return;
    
    const success = await updatePerformer(performer.id, updates);
    if (success) {
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
        const updatedPerformer = updatedProject.performers.find(p => p.id === performer.id);
        if (updatedPerformer) {
          setPerformer(updatedPerformer);
        }
      }
    }
  };

  const togglePlanAssignment = async (planId: string) => {
    if (!project || !performer) return;
    
    const plan = project.plans.find(p => p.id === planId);
    if (!plan) return;
    
    const isAssigned = plan.performers.some(p => p.performerId === performer.id);
    
    let success = false;
    if (isAssigned) {
      success = await removePerformerFromPlan(planId, performer.id);
    } else {
      success = await addPerformerToPlan(planId, performer.id, '');
    }
    
    if (success) {
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
      }
    }
  };

  const updatePlanRole = async (planId: string, role: string) => {
    if (!project || !performer) return;
    
    const success = await updatePlanPerformerRole(planId, performer.id, role);
    if (success) {
      const updatedProject = await getProject(project.id);
      if (updatedProject) {
        setProject(updatedProject);
      }
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <nav className="bg-white/90 backdrop-blur-sm shadow-lg border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/admin/project/${project.id}`)}
                className="text-gray-600 hover:text-pink-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                プロジェクトに戻る
              </button>
              <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                {performer.name} - 詳細編集
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">名前</label>
                <input
                  type="text"
                  value={performer.name}
                  onChange={(e) => updatePerformerData({ name: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">役割</label>
                <input
                  type="text"
                  value={performer.role || ''}
                  onChange={(e) => updatePerformerData({ role: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={performer.isTimeConfirmed}
                    onChange={(e) => updatePerformerData({ isTimeConfirmed: e.target.checked })}
                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                  />
                  <span className="ml-2 text-sm text-gray-700">時間確定済み</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">調整可能時間</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">調整可能開始時間</label>
                <input
                  type="time"
                  value={performer.availableStartTime || ''}
                  onChange={(e) => updatePerformerData({ availableStartTime: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">調整可能終了時間</label>
                <input
                  type="time"
                  value={performer.availableEndTime || ''}
                  onChange={(e) => updatePerformerData({ availableEndTime: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              香盤エディタで表示される出演者の参加可能時間です。企画の調整時に参考にする時間枠を設定してください。
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">入り時間・終わり時間</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">入り時間</label>
                <input
                  type="time"
                  value={performer.startTime || ''}
                  onChange={(e) => updatePerformerData({ startTime: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">終わり時間</label>
                <input
                  type="time"
                  value={performer.endTime || ''}
                  onChange={(e) => updatePerformerData({ endTime: e.target.value })}
                  className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              香盤表や出演者向けページに表示される実際の入り・終わり時間です。
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">持ち物一覧</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">持参していただく物</label>
              <textarea
                value={performer.belongings || ''}
                onChange={(e) => updatePerformerData({ belongings: e.target.value })}
                placeholder="例：&#10;・台本&#10;・名札&#10;・筆記用具&#10;・水分&#10;・タオル"
                rows={6}
                className="w-full border-gray-200 rounded-xl px-4 py-3 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200 resize-none"
              />
              <p className="text-xs text-gray-500 mt-2">
                改行で区切って入力してください。演者側のページでは見やすく表示されます。
              </p>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">企画への参加設定</h3>
            <div className="space-y-4">
              {project.plans.map((plan) => {
                const isAssigned = plan.performers.some(p => p.performerId === performer.id);
                const performerRole = plan.performers.find(p => p.performerId === performer.id);
                
                return (
                  <div key={plan.id} className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => togglePlanAssignment(plan.id)}
                              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 cursor-pointer"
                            />
                            <span className="ml-2 font-medium text-gray-900">{plan.title}</span>
                          </label>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            plan.isConfirmed
                              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                              : 'bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800'
                          }`}>
                            {plan.isConfirmed ? '確定' : '仮'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {plan.scheduledTime} ({plan.duration})
                        </div>
                        
                        {isAssigned && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              この企画での役割
                            </label>
                            <input
                              type="text"
                              value={performerRole?.role || ''}
                              onChange={(e) => updatePlanRole(plan.id, e.target.value)}
                              placeholder="例: MC, ゲスト, サポート"
                              className="w-full max-w-xs border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                          </div>
                        )}
                        
                        {isAssigned && plan.performers.filter(p => p.performerId !== performer.id).length > 0 && (
                          <div className="mt-2">
                            <span className="text-sm font-medium text-gray-700">共演者: </span>
                            <span className="text-sm text-gray-600">
                              {plan.performers
                                .filter(p => p.performerId !== performer.id)
                                .map(p => {
                                  const coPerformer = project.performers.find(perf => perf.id === p.performerId);
                                  return coPerformer ? `${coPerformer.name} (${p.role})` : '';
                                })
                                .join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {project.plans.length === 0 && (
                <p className="text-gray-500 text-center py-8">企画が登録されていません</p>
              )}
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-2xl p-6 border border-white/20">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent mb-4">プレビュー</h3>
            <div className="text-sm text-gray-600 mb-4">
              出演者側から見える情報のプレビューです
            </div>
            <button
              onClick={() => router.push(`/project/${project.id}/performer/${performer.id}`)}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:scale-105 transition-all duration-200 shadow-md flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              出演者ページを確認
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}