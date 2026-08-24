// Autorización de acceso al producto (distinta de la autenticación).
// Un usuario autenticado solo entra a la app si su compra está vigente:
// el backend es la fuente de verdad (subscriptions/{uid}); esta lista replica
// la semántica del endpoint GET /api/access/status.
const ACCESS_STATUSES = ['active', 'trialing', 'past_due'] as const;

type SubscriptionLike = { status?: string; trialEnd?: string } | null | undefined;

export function hasProductAccess(subscription: SubscriptionLike): boolean {
  if (!subscription) return false;
  if (!ACCESS_STATUSES.includes(subscription.status as (typeof ACCESS_STATUSES)[number])) return false;
  // Trial vencido = sin acceso (misma regla que subscriptionService.effectiveStatus).
  if (subscription.status === 'trialing' && subscription.trialEnd) {
    return new Date(subscription.trialEnd) > new Date();
  }
  return true;
}
