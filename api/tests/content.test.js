const test = require('node:test');
const assert = require('node:assert/strict');
const content = require('../lib/content');

const TOPIC_DAYS = [1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20];
const REVIEW_DAYS = [7, 14, 21];
const EXERCISE_TYPES = ['mcq', 'gapfill', 'translate', 'order'];

function allDays() {
  const days = [];
  for (let n = 1; n <= 21; n++) {
    const d = content.getDay(n);
    assert.ok(d, `day-${String(n).padStart(2, '0')} no existe`);
    days.push(d);
  }
  return days;
}

test('Contenido: los 21 días existen y están publicados', () => {
  for (const d of allDays()) {
    assert.equal(d.status, 'published', `${d.id} debe estar published`);
    assert.ok(d.title && d.goal, `${d.id} necesita title y goal`);
    assert.ok(Array.isArray(d.vocabulary) && d.vocabulary.length >= 8, `${d.id} necesita >=8 vocabulario`);
    assert.ok(Array.isArray(d.phrases) && d.phrases.length >= 5, `${d.id} necesita >=5 frases`);
    for (const v of d.vocabulary) {
      assert.ok(typeof v.en === 'string' && v.en.trim(), `${d.id}: vocab en inválido`);
      assert.ok(typeof v.es === 'string' && v.es.trim(), `${d.id}: vocab es inválido`);
    }
  }
});

test('Contenido: días de tema tienen lección, pronunciación y ejercicios', () => {
  for (const n of TOPIC_DAYS) {
    const d = content.getDay(n);
    assert.ok(d.lesson, `${d.id} necesita lesson`);
    assert.ok(d.lesson.title && d.lesson.rule, `${d.id}: lesson sin title/rule`);
    assert.ok(Array.isArray(d.lesson.examples) && d.lesson.examples.length >= 2, `${d.id}: lesson necesita >=2 ejemplos`);
    assert.ok(d.pronunciationTip && d.pronunciationTip.length > 0, `${d.id} necesita pronunciationTip`);
    assert.ok(Array.isArray(d.exercises) && d.exercises.length >= 3, `${d.id} necesita >=3 ejercicios`);
  }
});

test('Contenido: ejercicios con estructura y respuesta válidas', () => {
  for (const n of TOPIC_DAYS) {
    const d = content.getDay(n);
    for (const [i, ex] of d.exercises.entries()) {
      assert.ok(EXERCISE_TYPES.includes(ex.type), `${d.id} ex${i + 1}: tipo inválido '${ex.type}'`);
      assert.ok(ex.prompt && ex.prompt.length > 0, `${d.id} ex${i + 1}: sin prompt`);
      if (ex.type === 'mcq' || ex.type === 'gapfill') {
        assert.ok(Array.isArray(ex.options) && ex.options.length >= 3, `${d.id} ex${i + 1}: necesita >=3 opciones`);
        assert.ok(typeof ex.answer === 'number' && ex.answer >= 0 && ex.answer < ex.options.length, `${d.id} ex${i + 1}: answer no es índice válido`);
      } else if (ex.type === 'translate') {
        assert.ok(typeof ex.answer === 'string' && ex.answer.trim().length > 0, `${d.id} ex${i + 1}: answer vacía`);
      } else if (ex.type === 'order') {
        assert.ok(Array.isArray(ex.words) && ex.words.length >= 3, `${d.id} ex${i + 1}: necesita words`);
        const answer = ex.answer;
        assert.ok(Array.isArray(answer) && answer.length === ex.words.length, `${d.id} ex${i + 1}: answer no es permutación`);
        const sorted = [...answer].sort((a, b) => a - b);
        for (let k = 0; k < sorted.length; k++) {
          assert.equal(sorted[k], k, `${d.id} ex${i + 1}: answer no cubre todos los índices`);
        }
      }
    }
  }
});

test("Contenido: días de examen (7, 14, 21) tienen preguntas y pasan sin 'practice'", () => {
  for (const n of REVIEW_DAYS) {
    const d = content.getDay(n);
    assert.ok(d.review, `${d.id} necesita review`);
    assert.ok(d.review.title && d.review.title.length > 0, `${d.id}: review sin título`);
    assert.ok(d.review.passScore > 0 && d.review.passScore <= 100, `${d.id}: passScore inválido`);
    assert.ok(Array.isArray(d.review.questions) && d.review.questions.length >= 8, `${d.id}: review necesita >=8 preguntas`);
    assert.ok(!d.steps.includes('practice'), `${d.id}: el día de examen no debe tener paso practice`);
    for (const [i, q] of d.review.questions.entries()) {
      assert.ok(EXERCISE_TYPES.includes(q.type) && q.type !== 'order', `${d.id} preg${i + 1}: tipo inválido '${q.type}'`);
      assert.ok(q.prompt && q.prompt.length > 0, `${d.id} preg${i + 1}: sin prompt`);
      if (q.type === 'mcq' || q.type === 'gapfill') {
        assert.ok(Array.isArray(q.options) && q.options.length >= 3, `${d.id} preg${i + 1}: necesita opciones`);
        assert.ok(typeof q.answer === 'number' && q.answer >= 0 && q.answer < q.options.length, `${d.id} preg${i + 1}: answer inválido`);
      } else if (q.type === 'translate') {
        assert.ok(typeof q.answer === 'string' && q.answer.trim().length > 0, `${d.id} preg${i + 1}: answer vacía`);
      }
    }
  }
});