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
                {project.title} - 編集
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">総収録時間</label>
                  <input
                    type="text"
                    value={project.totalRecordingTime}
                    onChange={(e) => updateProjectData({ totalRecordingTime: e.target.value })}
                    className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                  />
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
                  <div key={performer.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
                        <input
                          type="text"
                          value={performer.name}
                          onChange={(e) => updatePerformerData(performer.id, { name: e.target.value })}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">役割</label>
                        <input
                          type="text"
                          value={performer.role || ''}
                          onChange={(e) => updatePerformerData(performer.id, { role: e.target.value })}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        />
                      </div>
                      <div className="flex items-end space-x-2">
                        <button
                          onClick={() => router.push(`/admin/project/${project.id}/performer/${performer.id}`)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
                        >
                          詳細編集
                        </button>
                        <button
                          onClick={() => removePerformer(performer.id)}
                          className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {project.performers.length === 0 && (
                  <p className="text-gray-500 text-center py-8">出演者が登録されていません</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'plans' && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">企画管理</h3>
                <button
                  onClick={addPlan}
                  className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
                >
                  企画追加
                </button>
              </div>
              <div className="space-y-4">
                {project.plans.map((plan) => (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">企画名</label>
                        <input
                          type="text"
                          value={plan.title}
                          onChange={(e) => updatePlanData(plan.id, { title: e.target.value })}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">予定時間</label>
                        <input
                          type="time"
                          value={plan.scheduledTime}
                          onChange={(e) => updatePlanData(plan.id, { scheduledTime: e.target.value })}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">収録時間</label>
                        <input
                          type="text"
                          value={plan.duration}
                          placeholder="例: 30分"
                          onChange={(e) => updatePlanData(plan.id, { duration: e.target.value })}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">台本URL</label>
                        <input
                          type="url"
                          value={plan.scriptUrl || ''}
                          onChange={(e) => updatePlanData(plan.id, { scriptUrl: e.target.value, hasScript: !!e.target.value })}
                          className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                        />
                      </div>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">補足・参考動画URL</label>
                      <textarea
                        value={plan.notes || ''}
                        onChange={(e) => updatePlanData(plan.id, { notes: e.target.value })}
                        rows={3}
                        className="w-full border-gray-200 rounded-xl px-4 py-2.5 border bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-200"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={plan.isConfirmed}
                          onChange={(e) => updatePlanData(plan.id, { isConfirmed: e.target.checked })}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">確定済み</span>
                      </label>
                      <button
                        onClick={() => removePlan(plan.id)}
                        className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
                {project.plans.length === 0 && (
                  <p className="text-gray-500 text-center py-8">企画が登録されていません</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium mb-4">香盤表</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        企画名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        収録時間
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        出演者
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {project.plans
                      .sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
                      .map((plan) => (
                        <tr key={plan.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {plan.scheduledTime}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {plan.title}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {plan.duration}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {plan.performers.map(p => {
                              const performer = project.performers.find(perf => perf.id === p.performerId);
                              return performer ? `${performer.name} (${p.role})` : '';
                            }).join(', ')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              plan.isConfirmed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {plan.isConfirmed ? '確定' : '仮'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {project.plans.length === 0 && (
                  <p className="text-gray-500 text-center py-8">企画が登録されていません</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}