export interface VocabularyItem {
  en: string;
  es: string;
}

export interface PhraseItem {
  en: string;
  es: string;
}

export interface DayContent {
  id: string;
  day: number;
  title: string;
  topic: string;
  goal: string;
  estimatedTime: number;
  skill: string;
  grammarFocus: string;
  vocabulary: VocabularyItem[];
  phrases: PhraseItem[];
  speak: string;
  challenge: string;
  xpReward: number;
  premium: boolean;
  completed: boolean;
  steps: string[];
}

export interface ChallengeDay {
  day: number;
  id: string;
  title: string;
  topic: string;
  week: number;
  weekLabel: string;
  locked: boolean;
  completed: boolean;
}

export interface Entitlements {
  plan: 'free' | 'premium';
  maxChallengeDay: number;
  aiMessagesPerDay: number;
  canUseVoice: boolean;
  canUseRoleplay: boolean;
  canAccessSmartReview: boolean;
  canAccessAdvancedStats: boolean;
  canGenerateLessons: boolean;
  canScorePronunciation: boolean;
  canUseVocabularyBank: boolean;
}

export interface ChallengeIndex {
  challenge: string;
  days: ChallengeDay[];
  entitlements: Entitlements;
  onboardingCompleted?: boolean;
}

export interface Streaks {
  currentStreak: number;
  longestStreak: number;
  todayPracticed: boolean;
}

export interface LevelProgress {
  pct: number;
  current: { key: string; label: string };
  next: { key: string; label: string } | null;
}

export interface ProgressResponse {
  daysCompleted: number;
  completedDays: number[];
  totalXp: number;
  level: string;
  levelProgress: LevelProgress;
  streaks: Streaks;
  streakFreezes: number;
  badges: string[];
  allBadges: { id: string; label: string; desc: string }[];
  profile: { level: string; strongestSkill: string; needsImprovement: string[]; averageScore: number } | null;
}

export interface AssessmentSection {
  key: string;
  label: string;
  items: number;
  type: string;
}

export interface Assessment {
  id: string;
  title: string;
  description: string;
  sections: AssessmentSection[];
  scoreFields: string[];
}

export interface EnglishProfile {
  level: string;
  strongestSkill: string;
  needsImprovement: string[];
  averageScore: number;
  scores: Record<string, number>;
  recommendedPractice: string;
}

export interface AssessmentResult {
  userId: string;
  profile: EnglishProfile;
  plan: { planId: string; weeks: { week: number; focus: string; skill: string; dailyMinutes: number }[] };
  completedAt: string;
}

export interface SubscriptionStatus {
  subscription: {
    status: 'free' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
    plan: string;
    trialStart?: string;
    trialEnd?: string;
    nextBillingDate?: string;
  };
  entitlements: Entitlements;
}

export interface PlanOption {
  id: 'monthly' | 'annual';
  label: string;
  price: number;
  period: 'month' | 'year';
  pricePerMonth: number;
}

export interface PracticeBlock {
  block: string;
  minutes: number;
  contentType: string;
}

export interface DailyMission {
  id: string;
  topic: string;
  weakSkill: string;
  goal: string;
  blocks: PracticeBlock[];
  lessonId: string | null;
  estimatedTime: number;
  done: boolean;
}

export interface Post21LessonSummary {
  id: string;
  title: string;
  skill: string;
  situation: string;
  topic: string;
  estimatedTime: number;
  difficulty: number;
  goal: string;
}

export interface Post21Index {
  skills: string[];
  situations: string[];
  lessons: Post21LessonSummary[];
}

export interface Post21LessonDetail extends Post21LessonSummary {
  level: string;
  premium: boolean;
  contentType: string;
  vocabulary: VocabularyItem[];
  phrases: PhraseItem[];
  speak: string;
  challenge: string;
}

export interface DailyPracticeToday {
  mission: DailyMission;
  lesson: { id: string; title: string; skill: string; situation: string; topic: string; vocabulary: VocabularyItem[]; phrases: PhraseItem[] } | null;
}

export interface WeeklyReport {
  period: { start: string; end: string };
  practiceMinutes: number;
  speakingMinutes: number;
  vocabulary: number;
  accuracy: number;
  strongestSkill: string;
  focusNextWeek: string;
  daysPracticed: number;
  currentStreak: number;
  longestStreak: number;
}

export interface ReviewItem {
  day: number;
  word: string;
  es: string;
  attempts: number;
}

export interface SmartReview {
  items: ReviewItem[];
  total: number;
}

export interface ReviewCard {
  id: string;
  key: string;
  day: number;
  word: string;
  es: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  lastResult: number | null;
}

export interface DueCards {
  items: ReviewCard[];
  total: number;
}

export interface AdminDraftSummary {
  id: string;
  title: string;
  skill: string;
  situation: string;
  topic: string;
  status: string;
  createdAt?: string;
  mock?: boolean;
}

export interface SeasonRetico {
  id: string;
  title: string;
  description: string;
  metric: string;
  target: number;
  current: number;
  done: boolean;
  reward: number;
}

export interface SeasonResponse {
  season: { key: string; start: string; end: string };
  retos: SeasonRetico[];
  reward: number;
  rewardClaimed: number;
  allDone: boolean;
  seasonDays: number;
  canClaim: boolean;
}

export interface TutorMode {
  id: string;
  label: string;
  description: string;
}

export interface TutorModes {
  modes: TutorMode[];
  stuck: TutorMode;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  at?: string;
}

export interface TutorReply {
  reply: string;
  mode: string;
  used: number;
  limit: number;
  mock: boolean;
}

export interface TutorHistory {
  mode: string;
  messages: TutorMessage[];
}

export interface TutorUsage {
  used: number;
  limit: number;
  premium: boolean;
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  name: string;
  totalXp: number;
  weeklyDays: number;
  daysCompleted: number;
}

export interface Leaderboard {
  allTime: LeaderboardRow[];
  weekly: LeaderboardRow[];
  me: LeaderboardRow | null;
}

export interface AdvancedStats {
  period: { days: number; end: string };
  overview: {
    totalXp: number;
    exercisesCompleted: number;
    speakingSessions: number;
    daysCompleted: number;
    vocabularyCount: number;
    practiceThisWeek: number;
    currentStreak: number;
    longestStreak: number;
    streakFreezes: number;
    badges: string[];
  };
  accuracy: {
    overall: { attempts: number; correct: number; accuracyPct: number };
    lastN: { attempts: number; correct: number; accuracyPct: number };
  };
  series: { date: string; attempts: number; correct: number; accuracyPct: number; xp: number }[];
  pronunciation: {
    attempts: number;
    averageScore: number;
    bestScore: number;
    recent: { target: string; score: number; at: string }[];
  };
  ai: { totalSessions: number; totalTokens: number; usedToday: number };
  skills: {
    level: string;
    strongestSkill: string;
    needsImprovement: string[];
    averageScore: number;
  } | null;
}
