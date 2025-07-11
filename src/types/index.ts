export interface Project {
  id: string;
  title: string;
  recordingDate: string;
  totalRecordingTime: string;
  location: string;
  address?: string;
  locationMapUrl?: string;
  performers: Performer[];
  plans: Plan[];
  createdAt: string;
  updatedAt: string;
}

export interface Performer {
  id: string;
  name: string;
  startTime?: string;
  endTime?: string;
  availableStartTime?: string;
  availableEndTime?: string;
  isTimeConfirmed: boolean;
  assignedPlans: string[];
  role?: string;
  belongings?: string;
  programItems?: string;
}

export interface Plan {
  id: string;
  title: string;
  scheduledTime: string;
  duration: string;
  performers: PlanPerformer[];
  scriptUrl?: string;
  hasScript: boolean;
  notes?: string;
  referenceVideoUrl?: string;
  isConfirmed: boolean;
}

export interface PlanPerformer {
  performerId: string;
  role: string;
  customRole?: string;
}

export interface Schedule {
  performerId: string;
  timeline: ScheduleItem[];
}

export interface ScheduleItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: 'recording' | 'break' | 'preparation';
  isConfirmed: boolean;
}

// 香盤表エディター用の型
export interface TimelineItem {
  id: string;
  type: 'plan' | 'break' | 'preparation' | 'custom';
  title: string;
  startTime: string;
  duration: number; // 分単位
  planId?: string; // typeがplanの場合
  performers?: string[]; // 参加出演者のID
  isMovable: boolean;
  color?: string;
  dbId?: string; // データベースのID（休憩・準備時間・カスタム用）
}

export interface PerformerAvailability {
  performerId: string;
  name: string;
  startTime: string;
  endTime: string;
  isConfirmed: boolean;
}

export interface ScheduleEditorState {
  items: TimelineItem[];
  totalStartTime: string;
  totalEndTime: string;
  performerAvailabilities: PerformerAvailability[];
}

// 企画書関連の型定義
export interface Proposal {
  id: string;
  title: string;
  titleNote?: string;
  recordingDateText: string;
  recordingTimeText: string;
  locationText: string;
  overview?: string;
  youtubeUrl?: string;
  youtubeEmbedId?: string;
  videoDescription?: string;
  appearanceFeeType: 'promotional' | 'paid' | 'custom';
  appearanceFeeText?: string;
  transportationType: 'self_expense' | 'provided' | 'custom';
  transportationText?: string;
  expenseNote?: string;
  slug: string;
  isPublished: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}