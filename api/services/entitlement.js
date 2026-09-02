// services/entitlement.js
// ÚNICA fuente de verdad para accesos Free/Premium IA (V9 — producto único).
// Modelo: ya no hay upsell interno. El acceso a la app (ver routes/access.js,
// hasAccess) y el nivel de funcionalidades son el MISMO eje: cualquier compra
// aprobada (Reto de 21 Días, Premium de por vida, o legacy monthly/annual) deja
// al usuario en status active/trialing/past_due, y ESO YA da acceso completo —
// no existe un usuario "adentro pero limitado". PLAN_CONFIG.free solo aplica a
// quien nunca compró nada (bloqueado antes de esto por el gate de acceso) o
// como defensa en profundidad si algún endpoint se llama sin pasar por el gate.
// premium-monthly/premium-annual (legacy) siguen dando acceso igual; no se
// venden más desde el paywall.

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
    aiMessagesPerDay: 30,
    canUseVoice: true,
    canUseRoleplay: true,
    canAccessSmartReview: true,
    canAccessAdvancedStats: true,
    canGenerateLessons: true,
    canScorePronunciation: true,
    canUseVocabularyBank: true,
  },
};

// Mismo set de estados que ACCESS_STATUSES en services/hotmartProcessor.js
// (deben mantenerse sincronizados): si el estado ya deja pasar al usuario por
// el gate de acceso, también le da el nivel de funcionalidades completo.
const ENTITLED_STATUSES = ['active', 'trialing', 'past_due'];

function planOf(subscription = {}) {
  const status = subscription.status || 'free';
  return ENTITLED_STATUSES.includes(status) ? 'premium' : 'free';
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

module.exports = { PLAN_CONFIG, ENTITLED_STATUSES, planOf, buildEntitlements, serializableEntitlements };