// Referencia a una imagen curada de un banco de stock (Pexels/Unsplash/Pixabay),
// resuelta en el backend a partir de content/images/manifest.json y adjuntada
// al vocabulario/ejercicios ya servidos — el frontend nunca busca imágenes.
export interface ImageAsset {
  provider: 'pexels' | 'unsplash' | 'pixabay';
  providerId: string;
  url: string;
  thumbnailUrl: string;
  alt: string;
  width: number;
  height: number;
  author: string;
  authorUrl?: string;
  license: string;
  sourceUrl: string;
  // false para fotos "de escena" (frases abstractas): no participan del quiz
  // "What is this?" porque no identifican una única palabra sin ambigüedad.
  quizzable?: boolean;
}

export interface VocabularyItem {
  en: string;
  es: string;
  image?: ImageAsset;
}

export interface PhraseItem {
  en: string;
  es: string;
}

export interface GrammarLesson {
  title: string;
  rule: string;
  examples: string[];
  commonMistakes?: string[];
}

export interface DayExercise {
  type: 'mcq' | 'gapfill' | 'translate' | 'order' | 'listening' | 'matching' | 'dialogue' | 'errorfix' | 'listen-type' | 'listen-order' | 'image-choice' | 'listen-image';
  prompt: string;
  options?: string[];
  answer: number | string | number[];
  words?: string[];
  audio?: string;
  pairs?: { en: string; es: string }[];
  context?: string;
  correctAnswer?: string;
  image?: ImageAsset; // image-choice: la imagen a identificar
  imageOptions?: { en: string; image: ImageAsset }[]; // listen-image: opciones visuales
}

export interface ReviewExam {
  title: string;
  questions: DayExercise[];
  passScore: number;
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
  lesson?: GrammarLesson;
  pronunciationTip?: string;
  exercises?: DayExercise[];
  review?: ReviewExam;
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
  canAccessSmartReviewFull: boolean; // nuevo: acceso total al repaso inteligente
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
  mustChangePassword: boolean;
  isAdmin: boolean;
}

export interface PlanOption {
  id: 'lifetime' | 'monthly' | 'annual';
  label: string;
  price: number;
  period: 'lifetime' | 'month' | 'year';
  pricePerMonth: number | null;
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
  qualityHistory?: number[]; // historial opcional para el modo "mis fallas"
}

export interface SmartReview {
  items: ReviewItem[];
  total: number;
  mode: 'due' | 'difficult' | 'pool'; // modo actual de visualización
  filter: 'all' | 'dueToday' | 'difficult'; // filtro aplicado
}

export interface ReviewCard {
  id: string;
  key: string;
  day: number;
  wordIndex: number; // índice dentro del vocabulary del día
  word: string;
  es: string;
  repetitions: number;
  qualityHistory: number[]; // últimos 5 quality (0-5)
  easeFactor: number;
  dueDate: string;
  lastResult: number | null;
  dominant: boolean; // true después de 3 quality-5 consecutivas
  example?: string | null;
  exampleEs?: string | null;
}

export interface ReviewResult {
  ok: boolean;
  card: ReviewCard;
  xpEarned: number;
  totalXp: number;
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

export interface AdminUserSummary {
  userId: string;
  email: string | null;
  name: string | null;
  plan: string;
  status: string;
  active: boolean;
  updatedAt: string | null;
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
    phrases: { target: string; bestScore: number; attempts: number; lastScore: number }[];
  };
  ai: { totalSessions: number; totalTokens: number; usedToday: number };
  skills: {
    level: string;
    strongestSkill: string;
    needsImprovement: string[];
    averageScore: number;
  } | null;
}