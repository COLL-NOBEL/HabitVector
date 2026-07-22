
export interface TimetableItem {
  id: string;
  taskId?: string; // Link to TodoItem
  weekIndex: number; // 0 = current week, 1 = next week, etc.
  day: string; // 'Monday', 'Tuesday', ...
  timeRange: string; // Editable now
  activity: string;
  category: string;
  description: string;
  colorPreset: string;
  status: 'pending' | 'completed' | 'failed';
}

export interface TodoItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  estimatedMinutes: number;
  atomicActionStep: string;
  resources: string[];
  status: 'pending' | 'completed';
  period: string;
  startDate?: string;
  endDate?: string;
}

export interface CoachingTip {
  rule: string;
  explanation: string;
  actionableChallenge: string;
}

export interface Opportunity {
  title: string;
  provider: string;
  type: string;
  description: string;
  benefits: string;
  requirements: string;
  actionLink: string;
  badge: string;
}

export interface OpportunitySource {
  title: string;
  url: string;
}

export interface HabitRecommendation {
  title: string;
  category: string;
  habitPrinciple: string;
  description: string;
  actionSteps: string;
  estimatedMinutes: number;
}

export interface UserGoalProfile {
  interests: string;
  educationLevel?: string;
  hoursPerDay: number;
  daysPerWeek: number;
  examDate: string;
  currentProblems: string;
  setupDone: boolean;
}

export interface Plan {
  id: string;
  name: string;
  objective: string;
  profile: UserGoalProfile;
  timetable: TimetableItem[];
  todoList: TodoItem[];
  coachingTips: CoachingTip[];
}
