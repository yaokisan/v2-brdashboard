'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, createProject } from '@/lib/database';
import { Project } from '@/types';

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    recordingDate: '',
    totalRecordingTime: '',
    location: '',
    locationMapUrl: ''
  });
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = document.cookie.includes('auth=true');
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    
    const loadProjects = async () => {
      const projectData = await getProjects();
      setProjects(projectData);
    };
    
    loadProjects();
  }, [router]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const newProject = await createProject({
      ...formData
    });
    
    if (newProject) {
      setProjects([...projects, newProject]);
      setFormData({
        title: '',
        recordingDate: '',
        totalRecordingTime: '',
        location: '',
        locationMapUrl: ''
      });
      setShowCreateForm(false);
    }
  };

  const handleLogout = () => {
    document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
            <button
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              ログアウト
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">プロジェクト一覧</h2>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
            >
              新規プロジェクト作成
            </button>
          </div>

          {showCreateForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-medium mb-4">新規プロジェクト作成</h3>
                <form onSubmit={handleCreateProject} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">プロジェクト名</label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">収録日</label>
                    <input
                      type="date"
                      value={formData.recordingDate}
                      onChange={(e) => setFormData({...formData, recordingDate: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">総収録時間</label>
                    <input
                      type="text"
                      value={formData.totalRecordingTime}
                      placeholder="例: 8時間"
                      onChange={(e) => setFormData({...formData, totalRecordingTime: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">収録場所</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Google Map URL (任意)</label>
                    <input
                      type="url"
                      value={formData.locationMapUrl}
                      onChange={(e) => setFormData({...formData, locationMapUrl: e.target.value})}
                      className="mt-1 block w-full border-gray-300 rounded-md px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700"
                    >
                      作成
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                    >
                      キャンセル
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{project.title}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>収録日: {project.recordingDate}</p>
                    <p>総収録時間: {project.totalRecordingTime}</p>
                    <p>場所: {project.location}</p>
                    <p>出演者数: {project.performers.length}名</p>
                    <p>企画数: {project.plans.length}件</p>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button
                      onClick={() => router.push(`/admin/project/${project.id}`)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => router.push(`/project/${project.id}`)}
                      className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                    >
                      公開ページ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">まだプロジェクトがありません。新規作成してください。</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}