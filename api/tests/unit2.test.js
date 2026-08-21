const test = require('node:test');
const assert = require('node:assert/strict');
const recommendation = require('../services/recommendation');
const report = require('../services/report');

const CURRICULUM = {
  lessons: [
    { id: 'p21-airport', title: 'A', skill: 'speaking', situation: 'travel', topic: 'Airport check-in', goal: 'g' },
    { id: 'p21-interview', title: 'I', skill: 'speaking', situation: 'interviews', topic: 'Job interview', goal: 'g' },
    { id: 'p21-directions', title: 'D', skill: 'listening', situation: 'daily-life', topic: 'Understanding directions', goal: 'g' },
    { id: 'p21-shopping', title: 'S', skill: 'vocabulary', situation: 'shopping', topic: 'Shopping words', goal: 'g' },
    { id: 'p21-smalltalk', title: 'ST', skill: 'conversation', situation: 'social', topic: 'Small talk', goal: 'g' },
  ],
};

test('Recommendation: usa la habilidad mǭs dǸbil del perfil', () => {
  const profile = { needsImprovement: ['listening', 'speaking'], strongestSkill: 'vocabulary' };
  const { mission, lesson } = recommendation.buildDailyPractice({ profile, curriculum: CURRICULUM, progress: {} });
  assert.equal(mission.weakSkill, 'listening');
  assert.equal(lesson.id, 'p21-directions');
  assert.equal(mission.blocks.length, 3);
});

test('Recommendation: sin perfil usa speaking', () => {
  const { mission } = recommendation.buildDailyPractice({ profile: null, curriculum: CURRICULUM, progress: {} });
  assert.equal(mission.weakSkill, 'speaking');
  assert.equal(mission.blocks[0].block, 'Vocabulary');
});

test('Recommendation: rota para no repetir temas practicados', () => {
  const profile = { needsImprovement: ['speaking'] };
  const progress = { dailyPractice: { '2026-08-14': { topic: 'Airport check-in' } } };
  const { lesson } = recommendation.buildDailyPractice({ profile, curriculum: CURRICULUM, progress });
  assert.equal(lesson.id, 'p21-interview');
});

test('Report: semana con práctica y precisión', async () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const progress = {
    completedDays: [21],
    practiceDays: ['2026-08-12', '2026-08-13', '2026-08-14'],
    totalXp: 810,
    exercisesCompleted: 12,
    speakingSessions: 2,
  };
  const attempts = [
    { userId: 'u1', correct: true, at: '2026-08-13T10:00:00Z' },
    { userId: 'u1', correct: false, at: '2026-08-14T10:00:00Z' },
    { userId: 'u1', correct: true, at: '2026-08-06T10:00:00Z' }, // fuera de ventana (7 d��as)
  ];
  const fakeStore = {
    getDoc: async (kind) => {
      if (kind === 'profiles') return { profile: { strongestSkill: 'vocabulary', needsImprovement: ['speaking'] } };
      return progress;
    },
    listDocs: async () => attempts,
    queryDocs: async function(col, options = {}) {
      const { filters = [], orderBy = null, limit = null } = options;
      let docs = await this.listDocs(col);
      // apply filters
      if (filters.length > 0) {
        docs = docs.filter(doc => {
          return filters.every(f => {
            if (f.op === '==') return doc[f.field] == f.value;
            // default to equality
            return doc[f.field] == f.value;
          });
        });
      }
      // apply orderBy
      if (orderBy) {
        const direction = orderBy.direction || 'asc';
        docs.sort((a, b) => {
          const av = a[orderBy.field];
          const bv = b[orderBy.field];
          if (av < bv) return direction === 'asc' ? -1 : 1;
          if (av > bv) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      // apply limit
      if (limit !== null && limit !== undefined) {
        docs = docs.slice(0, limit);
      }
      return docs;
    },
  };

  const r = await report.weeklyReport('u1', today, { store: fakeStore });

  assert.equal(r.practiceMinutes, 3 * report.MINUTES_PER_PRACTICE_DAY + 2 * report.MINUTES_PER_SPEAKING_SESSION);
  assert.equal(r.accuracy, 50);
  assert.equal(r.daysPracticed, 3);
  assert.equal(r.strongestSkill, 'vocabulary');
  assert.equal(r.focusNextWeek, 'speaking');
  assert.equal(r.currentStreak, 3);
});

test('Report: semana vacía devuelve ceros', async () => {
  const today = new Date('2026-08-14T12:00:00Z');
  const fakeStore = {
    getDoc: async () => ({}),
    listDocs: async () => [],
    queryDocs: async function(col, options = {}) {
      const { filters = [], orderBy = null, limit = null } = options;
      let docs = await this.listDocs(col);
      // apply filters
      if (filters.length > 0) {
        docs = docs.filter(doc => {
          return filters.every(f => {
            if (f.op === '==') return doc[f.field] == f.value;
            // default to equality
            return doc[f.field] == f.value;
          });
        });
      }
      // apply orderBy
      if (orderBy) {
        const direction = orderBy.direction || 'asc';
        docs.sort((a, b) => {
          const av = a[orderBy.field];
          const bv = b[orderBy.field];
          if (av < bv) return direction === 'asc' ? -1 : 1;
          if (av > bv) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      // apply limit
      if (limit !== null && limit !== undefined) {
        docs = docs.slice(0, limit);
      }
      return docs;
    },
  };

  const r = await report.weeklyReport('u1', today, { store: fakeStore });

  assert.equal(r.practiceMinutes, 0);
  assert.equal(r.accuracy, 0);
  assert.equal(r.daysPracticed, 0);
});
