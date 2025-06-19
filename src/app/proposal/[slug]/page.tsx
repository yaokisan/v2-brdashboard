'use client';

import { useState, useEffect, use } from 'react';
import { getProposalBySlug } from '@/lib/database';
import { Proposal } from '@/types';

export default function ProposalPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProposal();
  }, [resolvedParams.slug]);

  const loadProposal = async () => {
    try {
      const data = await getProposalBySlug(resolvedParams.slug);
      if (data) {
        setProposal(data);
      } else {
        setError('企画書が見つからないか、公開期限が切れています。');
      }
    } catch (err) {
      setError('企画書の読み込みに失敗しました。');
      console.error('Error loading proposal:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getExpenseText = () => {
    if (proposal?.expenseNote) return proposal.expenseNote;
    
    if (proposal?.appearanceFeeType === 'promotional' && proposal?.transportationType === 'self_expense') {
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
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="flex items-center justify-center w-24 h-24 bg-gradient-to-r from-orange-100 to-red-100 rounded-full mx-auto mb-6">
            <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">企画書が見つかりません</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden border border-white/20">
          {/* ヘッダーセクション */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 px-4 py-12 text-white relative overflow-hidden">
            {/* 背景装飾 */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10"></div>
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            
            <div className="relative max-w-2xl mx-auto text-center">
              {/* 企画書バッジ */}
              <div className="inline-flex items-center px-5 py-2.5 bg-white/20 backdrop-blur-lg rounded-full border border-white/30 mb-8 shadow-lg">
                <svg className="w-5 h-5 text-white mr-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-white font-medium tracking-wider">企画概要書</span>
              </div>
              
              {/* タイトル */}
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight tracking-tight mb-4 break-words hyphens-auto">
                  {proposal.title}
                </h1>
                {proposal.titleNote && (
                  <div className="inline-flex items-center px-4 py-2 bg-yellow-400/20 backdrop-blur-sm rounded-full border border-yellow-300/40 shadow-lg">
                    <svg className="w-4 h-4 text-yellow-200 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-yellow-100 font-medium">{proposal.titleNote}</span>
                  </div>
                )}
              </div>
              
              {/* サブタイトル */}
              <div className="flex items-center justify-center space-x-3">
                <div className="w-8 h-0.5 bg-white/40 rounded-full"></div>
                <p className="text-lg font-semibold text-white/90 tracking-wide">出演打診概要</p>
                <div className="w-8 h-0.5 bg-white/40 rounded-full"></div>
              </div>
            </div>
          </div>
          
          {/* 収録情報セクション */}
          <div className="bg-gradient-to-br from-orange-50/80 to-red-50/80 backdrop-blur-sm border-b border-orange-100/50 p-8">
            <div className="max-w-3xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-2">
                  収録情報
                </h2>
                <div className="w-16 h-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-full mx-auto"></div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg text-center">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    収録予定日
                  </h3>
                  <p className="text-xl text-gray-900 font-bold">
                    {proposal.recordingDateText}
                  </p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg text-center">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    収録時間
                  </h3>
                  <p className="text-xl text-gray-900 font-bold">
                    {proposal.recordingTimeText}
                  </p>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg text-center">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    収録場所
                  </h3>
                  <p className="text-xl text-gray-900 font-bold">{proposal.locationText}</p>
                </div>
              </div>
            </div>
          </div>

          {/* コンテンツセクション */}
          <div className="p-6">
            {/* 企画概要 */}
            {proposal.overview && (
              <div className="border-t border-gray-100 pt-6 mb-8">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4">
                  企画概要
                </h3>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-md">
                  <p className="text-gray-700 text-lg leading-relaxed whitespace-pre-line">
                    {proposal.overview}
                  </p>
                </div>
              </div>
            )}

            {/* 参考動画 */}
            {proposal.youtubeEmbedId && (
              <div className="border-t border-gray-100 pt-6 mb-8">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-4 flex items-center">
                  <svg className="w-6 h-6 text-red-500 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                  参考動画
                </h3>
                <div className="bg-white/70 backdrop-blur-sm rounded-xl p-6 border border-white/50 shadow-md">
                  {/* YouTube埋め込み - スマホ対応 */}
                  <div className="relative w-full mb-4" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${proposal.youtubeEmbedId}`}
                      title="参考動画"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute top-0 left-0 w-full h-full rounded-xl shadow-lg border border-gray-200"
                    ></iframe>
                  </div>

                  {proposal.videoDescription && (
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {proposal.videoDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 出演条件 */}
            <div className="border-t border-gray-100 pt-6 mb-8">
              <h3 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
                出演条件について
              </h3>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/50 shadow-md">
                <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-lg p-3 sm:p-4 border border-orange-200 mb-3">
                  <p className="text-gray-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                    {getExpenseText()}
                  </p>
                </div>

                {/* 詳細条件 */}
                {(proposal.appearanceFeeType !== 'promotional' || proposal.transportationType !== 'self_expense') && (
                  <div className="space-y-2 sm:grid sm:grid-cols-2 sm:gap-3 sm:space-y-0">
                    {proposal.appearanceFeeType !== 'promotional' && (
                      <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-200">
                        <h4 className="font-semibold text-gray-900 text-xs mb-1.5 flex items-center">
                          <svg className="w-3 h-3 mr-1 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          出演料
                        </h4>
                        <p className="text-gray-700 text-xs">
                          {proposal.appearanceFeeType === 'paid' ? '出演料あり' : proposal.appearanceFeeText}
                        </p>
                      </div>
                    )}

                    {proposal.transportationType !== 'self_expense' && (
                      <div className="bg-green-50 rounded-lg p-2.5 border border-green-200">
                        <h4 className="font-semibold text-gray-900 text-xs mb-1.5 flex items-center">
                          <svg className="w-3 h-3 mr-1 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                          交通費
                        </h4>
                        <p className="text-gray-700 text-xs">
                          {proposal.transportationType === 'provided' ? '支給あり' : proposal.transportationText}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="border-t border-gray-100 pt-6 text-center">
              <img 
                src="/brandmark-design (2).png" 
                alt="BEAUTY ROAD" 
                className="mx-auto block sm:hidden"
                style={{ maxHeight: '24px', maxWidth: '100%', height: 'auto' }}
              />
              <img 
                src="/brandmark-design (2).png" 
                alt="BEAUTY ROAD" 
                className="mx-auto hidden sm:block"
                style={{ maxHeight: '36px', maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}