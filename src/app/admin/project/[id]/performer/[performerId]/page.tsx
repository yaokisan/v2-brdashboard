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
  params: { id: string; performerId: string } 
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
      const projectData = await getProject(params.id);
      if (!projectData) {
        router.push('/admin');
        return;
      }
      
      const performerData = projectData.performers.find(p => p.id === params.performerId);
      if (!performerData) {
        router.push(`/admin/project/${params.id}`);
        return;
      }
      
      setProject(projectData);
      setPerformer(performerData);
      setLoading(false);
    };

    loadData();
  }, [params.id, params.performerId, router]);

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
    return <div className="min-h-screen flex items-center justify-center">読み込み中...</div>;
  }

  if (!project || !performer) {
    return <div className="min-h-screen flex items-center justify-center">データが見つかりません</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/admin/project/${project.id}`)}
                className="text-gray-600 hover:text-gray-900"
              >
                ← プロジェクトに戻る
              </button>
              <h1 className="text-xl font-bold text-gray-900">{performer.name} - 詳細編集</h1>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">基本情報</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">名前</label>
                <input
                  type="text"
                  value={performer.name}
                  onChange={(e) => updatePerformerData({ name: e.target.value })}
                  className="w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">役割</label>
                <input
                  type="text"
                  value={performer.role || ''}
                  onChange={(e) => updatePerformerData({ role: e.target.value })}
                  className="w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">入り時間</label>
                <input
                  type="time"
                  value={performer.startTime || ''}
                  onChange={(e) => updatePerformerData({ startTime: e.target.value })}
                  className="w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">終わり時間</label>
                <input
                  type="time"
                  value={performer.endTime || ''}
                  onChange={(e) => updatePerformerData({ endTime: e.target.value })}
                  className="w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={performer.isTimeConfirmed}
                    onChange={(e) => updatePerformerData({ isTimeConfirmed: e.target.checked })}
                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">時間確定済み</span>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">企画への参加設定</h3>
            <div className="space-y-4">
              {project.plans.map((plan) => {
                const isAssigned = plan.performers.some(p => p.performerId === performer.id);
                const performerRole = plan.performers.find(p => p.performerId === performer.id);
                
                return (
                  <div key={plan.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={isAssigned}
                              onChange={() => togglePlanAssignment(plan.id)}
                              className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                            />
                            <span className="ml-2 font-medium text-gray-900">{plan.title}</span>
                          </label>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            plan.isConfirmed
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
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

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium mb-4">プレビュー</h3>
            <div className="text-sm text-gray-600 mb-4">
              出演者側から見える情報のプレビューです
            </div>
            <button
              onClick={() => router.push(`/project/${project.id}/performer/${performer.id}`)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              出演者ページを確認
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}