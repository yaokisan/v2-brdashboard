'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getProjects, createProject, deleteProject, getProposals, deleteProposal, duplicateProposal } from '@/lib/database';
import { Project, Proposal } from '@/types';
import { formatRecordingTime, getDayOfWeek } from '@/lib/utils';

export default function AdminDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
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
    
    const loadData = async () => {
      const [projectData, proposalData] = await Promise.all([
        getProjects(),
        getProposals()
      ]);
      setProjects(projectData);
      setProposals(proposalData);
    };
    
    loadData();
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

  const handleDeleteProject = async (projectId: string, projectTitle: string) => {
    if (window.confirm(`「${projectTitle}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
      const success = await deleteProject(projectId);
      if (success) {
        setProjects(projects.filter(p => p.id !== projectId));
      } else {
        alert('プロジェクトの削除に失敗しました。');
      }
    }
  };

  const handleDeleteProposal = async (proposalId: string, proposalTitle: string) => {
    if (window.confirm(`「${proposalTitle}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
      const success = await deleteProposal(proposalId);
      if (success) {
        setProposals(proposals.filter(p => p.id !== proposalId));
      } else {
        alert('企画書の削除に失敗しました。');
      }
    }
  };

  const handleDuplicateProposal = async (proposalId: string) => {
    const duplicated = await duplicateProposal(proposalId);
    if (duplicated) {
      setProposals([duplicated, ...proposals]);
    } else {
      alert('企画書の複製に失敗しました。');
    }
  };

  const handleLogout = () => {
    document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    router.push('/');
  };

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
                <p className="text-xs sm:text-sm text-gray-600 truncate">管理者ダッシュボード</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-xl transition-all duration-200"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">プロジェクト一覧</h2>
              <p className="text-gray-600 mt-1">収録プロジェクトの管理</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新規プロジェクト作成</span>
            </button>
          </div>

          {/* Modern Create Project Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white/95 backdrop-blur-lg rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-white/20 transform transition-all duration-300">
                {/* Modal Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">新規プロジェクト作成</h3>
                      <p className="text-gray-600 text-sm">収録プロジェクトの基本情報を入力してください</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleCreateProject} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        プロジェクト名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:bg-white transition-all duration-200"
                        placeholder="例: BEAUTY ROAD Vol.12"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        収録日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.recordingDate}
                        onChange={(e) => setFormData({...formData, recordingDate: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:bg-white transition-all duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        収録時間 <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">開始時間</label>
                          <input
                            type="time"
                            step="600"
                            value={formData.totalRecordingTime.includes('-') ? formData.totalRecordingTime.split('-')[0].trim() : '09:00'}
                            onInput={(e) => {
                              const time = (e.target as HTMLInputElement).value;
                              const [hours, minutes] = time.split(':');
                              const roundedMinutes = Math.round(parseInt(minutes) / 10) * 10;
                              const adjustedTime = `${hours}:${roundedMinutes.toString().padStart(2, '0')}`;
                              (e.target as HTMLInputElement).value = adjustedTime;
                            }}
                            onChange={(e) => {
                              const time = e.target.value;
                              const [hours, minutes] = time.split(':');
                              const roundedMinutes = Math.round(parseInt(minutes) / 10) * 10;
                              const adjustedTime = `${hours}:${roundedMinutes.toString().padStart(2, '0')}`;
                              const endTime = formData.totalRecordingTime.includes('-') ? formData.totalRecordingTime.split('-')[1].trim() : '18:00';
                              setFormData({...formData, totalRecordingTime: `${adjustedTime}-${endTime}`});
                            }}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:bg-white transition-all duration-200"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">終了時間</label>
                          <input
                            type="time"
                            step="600"
                            value={formData.totalRecordingTime.includes('-') ? formData.totalRecordingTime.split('-')[1].trim() : '18:00'}
                            onInput={(e) => {
                              const time = (e.target as HTMLInputElement).value;
                              const [hours, minutes] = time.split(':');
                              const roundedMinutes = Math.round(parseInt(minutes) / 10) * 10;
                              const adjustedTime = `${hours}:${roundedMinutes.toString().padStart(2, '0')}`;
                              (e.target as HTMLInputElement).value = adjustedTime;
                            }}
                            onChange={(e) => {
                              const time = e.target.value;
                              const [hours, minutes] = time.split(':');
                              const roundedMinutes = Math.round(parseInt(minutes) / 10) * 10;
                              const adjustedTime = `${hours}:${roundedMinutes.toString().padStart(2, '0')}`;
                              const startTime = formData.totalRecordingTime.includes('-') ? formData.totalRecordingTime.split('-')[0].trim() : '09:00';
                              setFormData({...formData, totalRecordingTime: `${startTime}-${adjustedTime}`});
                            }}
                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:bg-white transition-all duration-200"
                            required
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        スタジオ全体の収録時間帯（10分単位で設定可能）
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        収録場所 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        placeholder="例: 渋谷スタジオA"
                        onChange={(e) => setFormData({...formData, location: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:bg-white transition-all duration-200"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Google Map URL <span className="text-gray-400">(任意)</span>
                      </label>
                      <input
                        type="url"
                        value={formData.locationMapUrl}
                        placeholder="https://maps.google.com/..."
                        onChange={(e) => setFormData({...formData, locationMapUrl: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-400 focus:bg-white transition-all duration-200"
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-4 pt-6 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors duration-200"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-[1.02]"
                    >
                      プロジェクト作成
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Project Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="group bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                {/* Card Header */}
                <div className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-4">
                  <h3 className="text-xl font-bold text-white mb-1">{project.title}</h3>
                  <p className="text-pink-100 text-sm">収録プロジェクト</p>
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
                        <span>編集</span>
                      </button>
                      <button
                        onClick={() => window.open(`/project/${project.id}`, '_blank')}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>表示</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleDeleteProject(project.id, project.title)}
                      className="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
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
          </div>

          {/* 企画書一覧セクション */}
          <div className="mt-16">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">企画書一覧</h2>
                <p className="text-gray-600 mt-1">出演打診用の企画書管理</p>
              </div>
              <button
                onClick={() => router.push('/admin/proposal/new')}
                className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>新規企画書作成</span>
              </button>
            </div>

            {/* 企画書カードグリッド */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="group bg-white/90 backdrop-blur-sm overflow-hidden shadow-lg rounded-2xl border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  {/* カードヘッダー */}
                  <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-white mb-1">{proposal.title}</h3>
                        {proposal.titleNote && (
                          <p className="text-orange-100 text-xs">{proposal.titleNote}</p>
                        )}
                      </div>
                      {proposal.isPublished ? (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full font-medium">公開中</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-500 text-white text-xs rounded-full font-medium">非公開</span>
                      )}
                    </div>
                  </div>
                  
                  {/* カード内容 */}
                  <div className="p-6">
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m-6 0V2m6 5v6a1 1 0 01-1 1H9a1 1 0 01-1-1V7m10-5v13a2 2 0 01-2 2H5a2 2 0 01-2-2V2a2 2 0 012-2h14a2 2 0 012 2z" />
                        </svg>
                        <span className="text-sm text-gray-600">収録: <span className="font-medium text-gray-900">{proposal.recordingDateText}</span></span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm text-gray-600">時間: <span className="font-medium text-gray-900">{proposal.recordingTimeText}</span></span>
                      </div>
                      {proposal.expiresAt && (
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          <span className="text-sm text-gray-600">期限: <span className="font-medium text-gray-900">{proposal.expiresAt}</span></span>
                        </div>
                      )}
                    </div>
                    
                    {/* アクションボタン */}
                    <div className="space-y-2">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => router.push(`/admin/proposal/${proposal.id}`)}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>編集</span>
                        </button>
                        {proposal.isPublished && (
                          <button
                            onClick={() => window.open(`/proposal/${proposal.slug}`, '_blank')}
                            className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>表示</span>
                          </button>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleDuplicateProposal(proposal.id)}
                          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>複製</span>
                        </button>
                        <button
                          onClick={() => handleDeleteProposal(proposal.id, proposal.title)}
                          className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H8a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>削除</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 企画書が無い場合 */}
            {proposals.length === 0 && (
              <div className="text-center py-16">
                <div className="max-w-md mx-auto">
                  <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-r from-orange-100 to-red-100 rounded-full mx-auto mb-6">
                    <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">企画書がありません</h3>
                  <p className="text-gray-600 mb-6">出演打診用の企画書を作成してみましょう</p>
                  <button
                    onClick={() => router.push('/admin/proposal/new')}
                    className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>新規企画書作成</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {projects.length === 0 && (
            <div className="text-center py-16">
              <div className="max-w-md mx-auto">
                <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-r from-pink-100 to-purple-100 rounded-full mx-auto mb-6">
                  <svg className="w-12 h-12 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">プロジェクトがありません</h3>
                <p className="text-gray-600 mb-6">最初の収録プロジェクトを作成して始めましょう</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="inline-flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-pink-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>新規プロジェクト作成</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}