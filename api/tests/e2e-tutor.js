const BASE = 'http://localhost:3001/api';
async function call(method, path, { user, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (user) headers['X-Dev-User'] = user;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  const out = [];
  let r = await call('POST', '/tutor/message', { user: 'tutor-free', body: { mode: 'conversation', message: 'Hello' } });
  out.push(`free: ${r.status} ${r.data.error}`);
  await call('POST', '/subscription/activate', { user: 'tutor-user', body: { plan: 'premium', trialDays: 7 } });

  r = await call('GET', '/tutor/modes', { user: 'tutor-user' });
  out.push(`modes: ${r.data.modes.length} + stuck=${r.data.stuck.id}`);

  r = await call('POST', '/tutor/message', { user: 'tutor-user', body: { mode: 'roleplay', message: 'Hi, I want to order food' } });
  out.push(`msg1: used=${r.data.used}/${r.data.limit} mock=${r.data.mock} reply="${r.data.reply.slice(0, 55)}..."`);

  r = await call('POST', '/tutor/message', { user: 'tutor-user', body: { mode: 'roleplay', message: 'I like pizza' } });
  out.push(`msg2: used=${r.data.used}/${r.data.limit}`);

  // V10: ya no hay GET /tutor/history (no se persiste en Firestore) — el
  // cliente manda su propio historial en cada request; esto confirma que el
  // backend lo acepta y responde bien con contexto incluido.
  r = await call('POST', '/tutor/message', {
    user: 'tutor-user',
    body: { mode: 'roleplay', message: 'What did I just say I like?', history: [{ role: 'user', content: 'I like pizza' }, { role: 'assistant', content: 'Nice! What size would you like?' }] },
  });
  out.push(`msg-with-history: used=${r.data.used}/${r.data.limit} reply="${r.data.reply?.slice(0, 55)}..."`);

  r = await call('GET', '/tutor/usage', { user: 'tutor-user' });
  out.push(`usage: used=${r.data.used}/${r.data.limit} premium=${r.data.premium}`);

  r = await call('POST', '/tutor/stuck', { user: 'tutor-user', body: { message: "I don't understand present perfect" } });
  out.push(`stuck: used=${r.data.used} reply-len=${r.data.reply.length} mock=${r.data.mock}`);

  r = await call('POST', '/tutor/message', { user: 'tutor-user', body: { mode: 'nope', message: 'x' } });
  out.push(`invalid-mode: ${r.status} ${r.data.error}`);

  // límite diario: usar un perfil premium pero simular 60 mensajes previos en aiUsage
  const { store } = require('../services/aiUsage');
  const today = new Date().toISOString().slice(0, 10);
  await store.setDoc('aiUsage', `tutor-limit_${today}`, { userId: 'tutor-limit', date: today, tutor: { count: 60, tokens: 0, estimatedCost: 0 } });
  await call('POST', '/subscription/activate', { user: 'tutor-limit', body: { plan: 'premium', trialDays: 7 } });
  r = await call('POST', '/tutor/message', { user: 'tutor-limit', body: { mode: 'conversation', message: 'Hello' } });
  out.push(`limit-reached: ${r.status} ${r.data.error} used=${r.data.used}/${r.data.limit}`);

  console.log(out.join('\n'));
  process.exit(0);
})();
