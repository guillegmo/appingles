// services/entitlement.js
// ÚNICA fuente de verdad para accesos Free/Premium IA (V7).
// Modelo: el reto de 21 días es PERMANENTE y GRATIS. Todo lo relacionado con IA
// (Tutor IA, lecciones IA on-demand, score de pronunciación, banco de vocabulario,
// analytics avanzados) es PREMIUM con suscripción recurrente Hotmart.
// El free tiene 3 mensajes IA/día de muestra para probar el valor.

const PLAN_CONFIG = {
  free: {
    maxChallengeDay: 21,           // Reto 21 días completo: permanente y gratis
    aiMessagesPerDay: 3,           // Muestra de la IA para enganchar
    canUseVoice: true,             // Web Speech no tiene coste
    canUseRoleplay: false,
    canAccessSmartReview: true,    // SRS no es IA
    canAccessAdvancedStats: false,
    canGenerateLessons: false,
    canScorePronunciation: false,
    canUseVocabularyBank: false,
  },
  premium: {
    maxChallengeDay: 21,
    aiMessagesPerDay: 60,
    canUseVoice: true,
    canUseRoleplay: true,
    canAccessSmartReview: true,
    canAccessAdvancedStats: true,
    canGenerateLessons: true,
    canScorePronunciation: true,
    canUseVocabularyBank: true,
  },
};

// Los planes de pago pueden ser 'premium', 'premium-monthly' o 'premium-annual';
// todos se resuelven al entitlement premium.
const PREMIUM_PLANS = ['premium', 'premium-monthly', 'premium-annual'];

function planOf(subscription = {}) {
  const status = subscription.status || 'free';
  if (status === 'trialing' || status === 'active') {
    return PREMIUM_PLANS.includes(subscription.plan) ? 'premium' : 'free';
  }
  return 'free';
}

function buildEntitlements(subscription = {}) {
  const plan = planOf(subscription);
  const cfg = PLAN_CONFIG[plan];
  return {
    plan,
    canAccessDay: (day) => day <= cfg.maxChallengeDay,
    maxChallengeDay: cfg.maxChallengeDay,
    canUseAI: () => cfg.aiMessagesPerDay > 0,
    aiMessagesPerDay: cfg.aiMessagesPerDay,
    canUseVoice: cfg.canUseVoice,
    canUseRoleplay: cfg.canUseRoleplay,
    canAccessSmartReview: cfg.canAccessSmartReview,
    canAccessAdvancedStats: cfg.canAccessAdvancedStats,
    canGenerateLessons: cfg.canGenerateLessons,
    canScorePronunciation: cfg.canScorePronunciation,
    canUseVocabularyBank: cfg.canUseVocabularyBank,
  };
}

function serializableEntitlements(subscription = {}) {
  const plan = planOf(subscription);
  const cfg = PLAN_CONFIG[plan];
  return {
    plan,
    maxChallengeDay: cfg.maxChallengeDay,
    aiMessagesPerDay: cfg.aiMessagesPerDay,
    canUseVoice: cfg.canUseVoice,
    canUseRoleplay: cfg.canUseRoleplay,
    canAccessSmartReview: cfg.canAccessSmartReview,
    canAccessAdvancedStats: cfg.canAccessAdvancedStats,
    canGenerateLessons: cfg.canGenerateLessons,
    canScorePronunciation: cfg.canScorePronunciation,
    canUseVocabularyBank: cfg.canUseVocabularyBank,
  };
}

module.exports = { PLAN_CONFIG, PREMIUM_PLANS, planOf, buildEntitlements, serializableEntitlements };