'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getProject,
  getAfterPartyAttendances,
  createAfterPartyAttendance,
  updateAfterPartyAttendance
} from '@/lib/database';
import { Project, AfterPartyAttendance } from '@/types';
import { getDayOfWeek } from '@/lib/utils';
import demoData from '@/data/demo-data.json';

export default function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const [project, setProject] = useState<Project | null>(null);
  const [attendances, setAttendances] = useState<AfterPartyAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'attending' | 'not_attending' | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadData = async () => {
      const resolvedParams = await params;

      // デモモードの判定
      if (resolvedParams.id === demoData.project.id) {
        setIsDemoMode(true);

        const sessionKey = 'beauty-road-demo-data';
        const sessionData = sessionStorage.getItem(sessionKey);
        if (sessionData) {
          const parsedData = JSON.parse(sessionData);
          setProject(parsedData.project);
          setAttendances(parsedData.attendances || []);
        } else {
          setProject({
            ...demoData.project,
            performers: demoData.performers,
            plans: demoData.plans
          } as unknown as Project);
        }
      } else {
        const projectData = await getProject(resolvedParams.id);
        if (!projectData) {
          router.push('/');
          return;
        }
        setProject(projectData);

        const attendanceData = await getAfterPartyAttendances(resolvedParams.id);
        setAttendances(attendanceData);
      }

      // 出演者個別ページからの遷移時は名前をプリセット
      const searchParams = new URLSearchParams(window.location.search);
      const presetName = searchParams.get('name');
      if (presetName) {
        setName(presetName);
      }

      setLoading(false);
    };

    loadData();
  }, [params, router]);

  const saveDemoAttendances = (updated: AfterPartyAttendance[]) => {
    const sessionKey = 'beauty-road-demo-data';
    const sessionData = sessionStorage.getItem(sessionKey);
    if (sessionData) {
      const parsedData = JSON.parse(sessionData);
      parsedData.attendances = updated;
      sessionStorage.setItem(sessionKey, JSON.stringify(parsedData));
    }
  };

  const isDeadlinePassed = project?.afterPartyDeadline
    ? new Date(`${project.afterPartyDeadline}T23:59:59`) < new Date()
    : false;

  const attendingList = attendances.filter(a => a.status === 'attending');

  const startEdit = (attendance: AfterPartyAttendance) => {
    setEditingId(attendance.id);
    setName(attendance.name);
    setStatus(attendance.status);
    setComment(attendance.comment || '');
    setShowComment(!!attendance.comment);
    setSuccessMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setName('');
    setStatus(null);
    setComment('');
    setShowComment(false);
  };

  const handleSubmit = async () => {
    if (!project || submitting) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      alert('お名前を入力してください。');
      return;
    }
    if (!status) {
      alert('参加・不参加を選択してください。');
      return;
    }

    setSubmitting(true);
    try {
      // 編集中でなくても、同じ名前の回答があれば上書き（回答の変更）
      const normalized = trimmedName.replace(/\s+/g, '').toLowerCase();
      const existing = editingId
        ? attendances.find(a => a.id === editingId)
        : attendances.find(a => a.name.replace(/\s+/g, '').toLowerCase() === normalized);

      if (existing && !editingId) {
        const ok = confirm(`「${existing.name}」さんの回答は既に登録されています。回答を更新しますか？`);
        if (!ok) {
          setSubmitting(false);
          return;
        }
      }

      const trimmedComment = comment.trim();

      if (existing) {
        // 更新
        if (isDemoMode) {
          const updated = attendances.map(a =>
            a.id === existing.id
              ? { ...a, name: trimmedName, status, comment: trimmedComment || undefined, updatedAt: new Date().toISOString() }
              : a
          );
          setAttendances(updated);
          saveDemoAttendances(updated);
        } else {
          const success = await updateAfterPartyAttendance(existing.id, {
            name: trimmedName,
            status,
            comment: trimmedComment
          });
          if (!success) {
            alert('回答の更新に失敗しました。もう一度お試しください。');
            setSubmitting(false);
            return;
          }
          setAttendances(prev => prev.map(a =>
            a.id === existing.id
              ? { ...a, name: trimmedName, status, comment: trimmedComment || undefined }
              : a
          ));
        }
        setSuccessMessage(`${trimmedName}さんの回答を更新しました。`);
      } else {
        // 新規登録
        if (isDemoMode) {
          const now = new Date().toISOString();
          const newEntry: AfterPartyAttendance = {
            id: `demo-attendance-${Date.now()}`,
            projectId: project.id,
            name: trimmedName,
            status,
            comment: trimmedComment || undefined,
            createdAt: now,
            updatedAt: now
          };
          const updated = [...attendances, newEntry];
          setAttendances(updated);
          saveDemoAttendances(updated);
        } else {
          const created = await createAfterPartyAttendance(project.id, {
            name: trimmedName,
            status,
            comment: trimmedComment || undefined
          });
          if (!created) {
            alert('回答の登録に失敗しました。もう一度お試しください。');
            setSubmitting(false);
            return;
          }
          setAttendances(prev => [...prev, created]);
        }
        setSuccessMessage(`${trimmedName}さんの回答を受け付けました。`);
      }

      cancelEdit();
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!project || !project.hasAfterParty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/20 text-center">
          <p className="text-gray-600 mb-4">飲み会の情報が見つかりません</p>
          {project && (
            <button
              onClick={() => router.push(`/project/${project.id}`)}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              ダッシュボードに戻る
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 戻るリンク */}
        <button
          onClick={() => router.push(`/project/${project.id}`)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm mb-6 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          収録会ダッシュボードに戻る
        </button>

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
            飲み会 出欠確認
          </h1>
          <div className="w-16 h-1 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full mx-auto mb-3"></div>
          <p className="text-sm text-gray-600">{project.title}</p>
        </div>

        {/* 飲み会情報サマリー */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-amber-200/50 shadow-lg mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">日時</p>
              <p className="font-bold text-gray-900">
                {project.recordingDate}（{getDayOfWeek(project.recordingDate)}）
                {project.afterPartyStartTime && ` ${project.afterPartyStartTime}〜`}
              </p>
            </div>
            {project.afterPartyLocation && (
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">会場</p>
                <p className="font-bold text-gray-900">{project.afterPartyLocation}</p>
                {project.afterPartyAddress && (
                  <p className="text-xs text-gray-600 mt-0.5">{project.afterPartyAddress}</p>
                )}
              </div>
            )}
          </div>
          {project.afterPartyDeadline && (
            <div className={`mt-4 rounded-xl px-4 py-2.5 text-sm font-medium text-center ${
              isDeadlinePassed
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              {isDeadlinePassed
                ? '回答期限を過ぎました。変更がある場合はスタッフまでご連絡ください。'
                : `回答期限: ${project.afterPartyDeadline}（${getDayOfWeek(project.afterPartyDeadline)}）まで`}
            </div>
          )}
        </div>

        {/* 成功メッセージ */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-green-800">{successMessage}</p>
              <p className="text-xs text-green-700 mt-0.5">付き添いの方がいらっしゃる場合は、続けてお一人ずつご登録ください。</p>
            </div>
          </div>
        )}

        {/* 回答フォーム */}
        {!isDeadlinePassed && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {editingId ? '回答を変更する' : '出欠を回答する'}
            </h2>
            <p className="text-xs text-gray-500 mb-5">
              付き添いの方（マネージャー様など）がいらっしゃる場合は、お一人ずつご登録をお願いします。
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">お名前</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 山田花子"
                  className="w-full border-gray-200 rounded-xl px-4 py-3 border bg-white/80 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">出欠</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus('attending')}
                    className={`py-4 rounded-xl font-bold text-base border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                      status === 'attending'
                        ? 'border-green-500 bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg scale-[1.02]'
                        : 'border-gray-200 bg-white/80 text-gray-600 hover:border-green-300 hover:bg-green-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    参加
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('not_attending')}
                    className={`py-4 rounded-xl font-bold text-base border-2 transition-all duration-200 flex items-center justify-center gap-2 ${
                      status === 'not_attending'
                        ? 'border-gray-500 bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg scale-[1.02]'
                        : 'border-gray-200 bg-white/80 text-gray-600 hover:border-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    不参加
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl bg-white/80 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowComment(prev => !prev)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50/70 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700">
                      コメント <span className="text-xs font-normal text-gray-400">（任意）</span>
                    </span>
                    {!showComment && comment.trim() && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{comment}</p>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${showComment ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showComment && (
                  <div className="px-4 pb-4">
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={2}
                      autoFocus
                      placeholder="例: 少し遅れて参加します／アレルギーがあります など"
                      className="w-full border-gray-200 rounded-lg px-3 py-2.5 border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all duration-200 resize-y"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? '送信中...' : editingId ? '回答を更新する' : '回答を送信する'}
                </button>
                {editingId && (
                  <button
                    onClick={cancelEdit}
                    className="px-6 py-3.5 rounded-xl font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  >
                    キャンセル
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">
                回答は後からこのページで変更できます（同じお名前で再送信すると上書きされます）
              </p>
            </div>
          </div>
        )}

        {/* 参加者一覧 */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/60 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">参加予定のみなさん</h2>
            <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold px-3 py-1 rounded-full">
              {attendingList.length}名
            </span>
          </div>

          {attendingList.length > 0 && !isDeadlinePassed && (
            <p className="text-xs text-gray-400 mb-3">※ ご自身以外の回答の変更はお控えください</p>
          )}

          {attendingList.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">まだ参加の回答がありません。ぜひご参加ください！</p>
          ) : (
            <div className="space-y-2">
              {attendingList.map((attendance) => (
                <div
                  key={attendance.id}
                  className="flex items-center gap-3 bg-gradient-to-r from-green-50/70 to-emerald-50/70 border border-green-100 rounded-xl px-4 py-3"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{attendance.name}</p>
                    {attendance.comment && (
                      <p className="text-xs text-gray-600 mt-0.5 break-words">{attendance.comment}</p>
                    )}
                  </div>
                  {!isDeadlinePassed && (
                    <button
                      onClick={() => startEdit(attendance)}
                      className="text-xs text-amber-600 hover:text-amber-700 font-medium flex-shrink-0"
                    >
                      変更
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
