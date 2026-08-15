// services/entitlement.js
// ÚNICA fuente de verdad para accesos Free/Premium.
// En V1 el plan default es 'free'; la integración Hotmart (V4) alimentará
// subscriptionStatus/plan/entitlements desde el backend.

const PLAN_CONFIG = {
  free: {
    maxChallengeDay: 7,        // Free: acceso a Días 1-7 del reto
    aiMessagesPerDay: 3,
    canUseVoice: true,
    canUseRoleplay: false,
    canAccessSmartReview: false,
    canAccessAdvancedStats: false,
  },
  premium: {
    maxChallengeDay: 21,
    aiMessagesPerDay: 60,
    canUseVoice: true,
    canUseRoleplay: true,
    canAccessSmartReview: true,
    canAccessAdvancedStats: true,
  },
};

function planOf(subscription = {}) {
  const status = subscription.status || 'free';
  if (status === 'trialing' || status === 'active') {
    return subscription.plan === 'premium' ? 'premium' : 'free';
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
  };
}

module.exports = { PLAN_CONFIG, planOf, buildEntitlements, serializableEntitlements };
