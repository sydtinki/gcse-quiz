(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const screens = {
    start: $('start-screen'),
    quiz: $('quiz-screen'),
    result: $('result-screen'),
  };

  let questions = [];
  let current = 0;
  let answers = {};      // { questionId: 'A' | 'B' | 'C' | 'D' }
  let playerName = '';

  function show(name) {
    Object.entries(screens).forEach(([key, el]) => { el.hidden = key !== name; });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function api(url, options) {
    const res = await fetch(url, options);
    let data = {};
    try { data = await res.json(); } catch (_) { /* ignore */ }
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  /* ---------- Start ---------- */
  async function startQuiz(e) {
    e.preventDefault();
    $('start-error').textContent = '';
    playerName = $('player-name').value.trim();

    try {
      const data = await api('/api/questions');   // CHANGED (was api/questions.php)
      if (!data.questions.length) throw new Error('No questions found.');
      questions = data.questions;
      current = 0;
      answers = {};
      renderQuestion();
      show('quiz');
    } catch (err) {
      $('start-error').textContent = err.message;
    }
  }

  /* ---------- Quiz ---------- */
  function renderQuestion() {
    const q = questions[current];
    const isLast = current === questions.length - 1;

    $('progress-text').textContent = `Question ${current + 1} of ${questions.length}`;
    $('progress-bar').style.width = `${((current + 1) / questions.length) * 100}%`;
    $('q-topic').textContent = q.topic;
    $('q-text').textContent = q.question;
    $('quiz-error').textContent = '';

    const box = $('options');
    box.replaceChildren();

    Object.entries(q.options).forEach(([letter, text]) => {
      const label = document.createElement('label');
      label.className = 'option';

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'option';
      input.value = letter;
      input.checked = answers[q.id] === letter;
      input.addEventListener('change', () => {
        answers[q.id] = letter;
        updateButtons();
      });

      const badge = document.createElement('span');
      badge.className = 'letter';
      badge.textContent = letter;

      const content = document.createElement('span');
      content.textContent = text;

      label.append(input, badge, content);
      box.appendChild(label);
    });

    $('prev-btn').disabled = current === 0;
    $('next-btn').hidden = isLast;
    $('submit-btn').hidden = !isLast;
    updateButtons();
  }

  function updateButtons() {
    const answered = Boolean(answers[questions[current].id]);
    $('next-btn').disabled = !answered;
    $('submit-btn').disabled = !answered;
  }

  function go(step) {
    current = Math.min(Math.max(current + step, 0), questions.length - 1);
    renderQuestion();
  }

  async function submitQuiz() {
    const btn = $('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    $('quiz-error').textContent = '';

    try {
      const data = await api('/api/submit', {      // CHANGED (was api/submit.php)
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: playerName, answers }),
      });
      renderResults(data);
      show('result');
    } catch (err) {
      $('quiz-error').textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Submit answers';
    }
  }

  /* ---------- Results ---------- */
  function renderResults(data) {
    $('score-text').textContent = `${data.score} / ${data.total}`;
    $('score-percent').textContent = `${data.percent}%`;
    $('score-feedback').textContent = data.feedback;

    const review = $('review');
    review.replaceChildren();

    data.results.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = `review-item ${r.is_correct ? 'correct' : 'wrong'}`;

      const title = document.createElement('h3');
      title.textContent = `${i + 1}. ${r.topic}`;

      const question = document.createElement('p');
      question.textContent = r.question;

      const status = document.createElement('p');
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = r.is_correct ? 'Correct' : (r.selected ? 'Incorrect' : 'Not answered');
      status.append(tag);

      const yours = document.createElement('p');
      yours.textContent = `Your answer: ${r.selected ? `${r.selected}. ${r.selected_text}` : '—'}`;

      item.append(title, question, status, yours);

      if (!r.is_correct) {
        const right = document.createElement('p');
        right.textContent = `Correct answer: ${r.correct}. ${r.correct_text}`;
        item.append(right);
      }

      const why = document.createElement('p');
      why.className = 'why';
      why.textContent = r.explanation;
      item.append(why);

      review.appendChild(item);
    });
  }

  /* ---------- Events ---------- */
  $('start-form').addEventListener('submit', startQuiz);
  $('prev-btn').addEventListener('click', () => go(-1));
  $('next-btn').addEventListener('click', () => go(1));
  $('submit-btn').addEventListener('click', submitQuiz);
  $('retry-btn').addEventListener('click', () => {
    $('start-error').textContent = '';
    show('start');
  });
})();