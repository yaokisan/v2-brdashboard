'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getProposal, updateProposal } from '@/lib/database';
import { Proposal } from '@/types';

export default function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    titleNote: '',
    recordingDateText: '',
    recordingTimeText: '',
    locationText: '',
    overview: '',
    youtubeUrl: '',
    videoDescription: '',
    appearanceFeeType: 'promotional' as 'promotional' | 'paid' | 'custom',
    appearanceFeeText: '',
    transportationType: 'self_expense' as 'self_expense' | 'provided' | 'custom',
    transportationText: '',
    expenseNote: '',
    slug: '',
    isPublished: false,
    expiresAt: ''
  });

  useEffect(() => {
    const isAuthenticated = document.cookie.includes('auth=true');
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    loadProposal();
  }, [resolvedParams.id, router]);

  const loadProposal = async () => {
    const data = await getProposal(resolvedParams.id);
    if (data) {
      setProposal(data);
      setFormData({
        title: data.title,
        titleNote: data.titleNote || '',
        recordingDateText: data.recordingDateText,
        recordingTimeText: data.recordingTimeText,
        locationText: data.locationText,
        overview: data.overview || '',
        youtubeUrl: data.youtubeUrl || '',
        videoDescription: data.videoDescription || '',
        appearanceFeeType: data.appearanceFeeType,
        appearanceFeeText: data.appearanceFeeText || '',
        transportationType: data.transportationType,
        transportationText: data.transportationText || '',
        expenseNote: data.expenseNote || '',
        slug: data.slug,
        isPublished: data.isPublished,
        expiresAt: data.expiresAt || ''
      });
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updates: Partial<Proposal> = {
        ...formData,
        expiresAt: formData.expiresAt || undefined
      };

      const updated = await updateProposal(resolvedParams.id, updates);
      if (updated) {
        router.push('/admin');
      } else {
        alert('企画書の更新に失敗しました。');
      }
    } catch (error) {
      console.error('Error updating proposal:', error);
      alert('エラーが発生しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDefaultExpenseText = () => {
    if (formData.appearanceFeeType === 'promotional' && formData.transportationType === 'self_expense') {
      return `本番組では、出演者様の活動や作品を番組内でご紹介させていただく
「宣伝枠」としての出演をお願いしております。

そのため、出演料および交通費は原則として出演者様のご負担と
なりますが、番組内での十分な宣伝時間を確保させていただきます。

ご自身の活動をPRする絶好の機会として、ぜひご活用ください。`;
    }
    return '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">企画書が見つかりません</p>
          <button
            onClick={() => router.push('/admin')}
            className="mt-4 px-6 py-2 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors"
          >
            管理画面に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      {/* Header */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100/50 rounded-xl transition-all duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">企画書編集</h1>
                <p className="text-xs sm:text-sm text-gray-600">{proposal.title}</p>
              </div>
            </div>
            {formData.isPublished && (
              <button
                onClick={() => window.open(`/proposal/${formData.slug}`, '_blank')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="hidden sm:inline">公開ページを見る</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 基本情報 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">1</span>
              基本情報
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  企画タイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  placeholder="例: BEAUTY ROAD 新企画「美容トレンド2025」"
                  required
                />
                <input
                  type="text"
                  value={formData.titleNote}
                  onChange={(e) => setFormData({...formData, titleNote: e.target.value})}
                  className="w-full mt-2 px-4 py-2 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200 text-sm"
                  placeholder="仮タイトルの場合の注記（例: ※仮タイトル）"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    収録予定日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.recordingDateText}
                    onChange={(e) => setFormData({...formData, recordingDateText: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                    placeholder="例: 2025年3月予定"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    収録時間 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.recordingTimeText}
                    onChange={(e) => setFormData({...formData, recordingTimeText: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                    placeholder="例: 3時間程度"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    収録場所 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.locationText}
                    onChange={(e) => setFormData({...formData, locationText: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                    placeholder="例: 都内スタジオ"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  企画概要
                </label>
                <textarea
                  value={formData.overview}
                  onChange={(e) => setFormData({...formData, overview: e.target.value})}
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  placeholder="企画の概要や内容を記入してください"
                />
              </div>
            </div>
          </div>

          {/* 参考動画 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">2</span>
              参考動画
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={formData.youtubeUrl}
                  onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  動画の補足説明
                </label>
                <textarea
                  value={formData.videoDescription}
                  onChange={(e) => setFormData({...formData, videoDescription: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  placeholder="例: この動画は過去の収録の様子です / あくまで参考イメージとなります"
                />
              </div>
            </div>
          </div>

          {/* 出演条件 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">3</span>
              出演条件
            </h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    出演料
                  </label>
                  <select
                    value={formData.appearanceFeeType}
                    onChange={(e) => setFormData({...formData, appearanceFeeType: e.target.value as any})}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  >
                    <option value="promotional">宣伝枠（無償）</option>
                    <option value="paid">出演料あり</option>
                    <option value="custom">カスタム</option>
                  </select>
                  {formData.appearanceFeeType !== 'promotional' && (
                    <input
                      type="text"
                      value={formData.appearanceFeeText}
                      onChange={(e) => setFormData({...formData, appearanceFeeText: e.target.value})}
                      className="w-full mt-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                      placeholder="詳細を入力"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    交通費
                  </label>
                  <select
                    value={formData.transportationType}
                    onChange={(e) => setFormData({...formData, transportationType: e.target.value as any})}
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  >
                    <option value="self_expense">実費</option>
                    <option value="provided">支給あり</option>
                    <option value="custom">カスタム</option>
                  </select>
                  {formData.transportationType !== 'self_expense' && (
                    <input
                      type="text"
                      value={formData.transportationText}
                      onChange={(e) => setFormData({...formData, transportationText: e.target.value})}
                      className="w-full mt-2 px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                      placeholder="詳細を入力"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  費用に関する説明
                </label>
                <textarea
                  value={formData.expenseNote || getDefaultExpenseText()}
                  onChange={(e) => setFormData({...formData, expenseNote: e.target.value})}
                  rows={6}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  placeholder="出演条件の詳細説明"
                />
              </div>
            </div>
          </div>

          {/* 公開設定 */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center text-white text-sm font-bold mr-3">4</span>
              公開設定
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  URLスラッグ
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({...formData, slug: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                  placeholder="URLに使用される識別子"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  公開URL: /proposal/{formData.slug}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  有効期限
                </label>
                <input
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-400 focus:bg-white transition-all duration-200"
                />
                <p className="text-xs text-gray-500 mt-1">
                  設定した日付を過ぎると自動的に非公開になります
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="isPublished"
                  checked={formData.isPublished}
                  onChange={(e) => setFormData({...formData, isPublished: e.target.checked})}
                  className="w-5 h-5 text-orange-500 rounded focus:ring-orange-400"
                />
                <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
                  公開する
                </label>
              </div>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors duration-200"
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '保存中...' : '変更を保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}