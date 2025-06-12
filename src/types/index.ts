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
  isTimeConfirmed: boolean;
  assignedPlans: string[];
  role?: string;
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