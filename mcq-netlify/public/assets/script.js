(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SCREENS = ['loading', 'login', 'list', 'quiz', 'result'];
  const DEVICE_KEY = 'sydschool_device_id';

  let quiz = null;        // the quiz being taken
  let current = 0;
  let answers = {};       // { questionId: 'A' | 'B' | 'C' | 'D' }
  let lastResult = null;

  /* ---------- Helpers ---------- */
  function show(name) {
    SCREENS.forEach((s) => { $(`${s}-screen`).hidden = s !== name; });
    $('topbar').hidden = name === 'login' || name === 'loading';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function newDeviceId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  // A random ID kept in this browser. The server uses it to allow one device per account.
  function deviceId() {
    let id = null;
    try { id = localStorage.getItem(DEVICE_KEY); } catch (_) { /* storage blocked */ }
    if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
      id = newDeviceId();
      try { localStorage.setItem(DEVICE_KEY, id); } catch (_) { /* storage blocked */ }
    }
    return id;
  }

  function showLogin(message) {
    $('login-error').textContent = message || '';
    show('login');
  }

  async function api(url, options = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...options });
    let data = {};
    try { data = await res.json(); } catch (_) { /* ignore */ }
    if (res.status === 401 && url !== '/api/login') {
      showLogin(data.error);
      throw new Error(data.error || 'Please log in.');
    }
    if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
    return data;
  }

  /* ---------- Start-up: are we already logged in? ---------- */
  async function init() {
    show('loading');
    try {
      const res = await fetch('/api/me', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await enterApp(data.username);
      } else {
        showLogin(data.reason && data.reason !== 'none' ? data.error : '');
      }
    } catch (_) {
      showLogin('Could not reach the server. Check your internet connection.');
    }
  }

  async function enterApp(username) {
    $('who').textContent = `Signed in as ${username}`;
    await loadList();
  }

  /* ---------- Login / logout ---------- */
  async function doLogin(e) {
    e.preventDefault();
    const btn = $('login-btn');
    btn.disabled = true;
    $('login-error').textContent = '';
    try {
      const data = await api('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: $('username').value,
          password: $('password').value,
          deviceId: deviceId(),
        }),
      });
      $('password').value = '';
      await enterApp(data.username);
    } catch (err) {
      $('login-error').textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  }

  async function doLogout() {
    try { await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }); } catch (_) { /* ignore */ }
    quiz = null;
    $('username').value = '';
    showLogin('');
  }

  /* ---------- Quiz list (home) ---------- */
  async function loadList() {
    $('list-error').textContent = '';
    try {
      const data = await api('/api/quizzes');
      const list = $('quiz-list');
      list.replaceChildren();

      data.quizzes.forEach((q) => {
        const li = document.createElement('li');
        if (q.main) li.className = 'main';

        const link = document.createElement('a');
        link.href = '#';
        link.textContent = q.name;
        link.addEventListener('click', (ev) => { ev.preventDefault(); startQuiz(q.id); });

        const meta = document.createElement('span');
        meta.className = 'meta';
        meta.textContent = q.best === null
          ? `${q.count} questions`
          : `${q.count} questions - best: ${q.best}/${q.total}`;

        li.append(link, meta);
        list.appendChild(li);
      });
      show('list');
    } catch (err) {
      if ($('login-screen').hidden) {
        show('list');
        $('list-error').textContent = err.message;
      }
    }
  }

  /* ---------- Taking a quiz ---------- */
  async function startQuiz(id) {
    try {
      quiz = await api(`/api/quiz?id=${encodeURIComponent(id)}`);
      current = 0;
      answers = {};
      $('quiz-title').textContent = quiz.name;
      renderQuestion();
      show('quiz');
    } catch (err) {
      $('list-error').textContent = err.message;
    }
  }

  function renderQuestion() {
    const q = quiz.questions[current];
    const isLast = current === quiz.questions.length - 1;

    $('progress-text').textContent = `Question ${current + 1} of ${quiz.questions.length}`;
    $('progress-bar').style.width = `${((current + 1) / quiz.questions.length) * 100}%`;
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
    const answered = Boolean(answers[quiz.questions[current].id]);
    $('next-btn').disabled = !answered;
    $('submit-btn').disabled = !answered;
  }

  function go(step) {
    current = Math.min(Math.max(current + step, 0), quiz.questions.length - 1);
    renderQuestion();
  }

  async function submitQuiz() {
    const btn = $('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting...';
    $('quiz-error').textContent = '';

    try {
      const data = await api('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quiz.id, answers }),
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
    lastResult = data;
    $('result-title').textContent = data.quizName;
    $('score-text').textContent = `${data.score} / ${data.total}`;
    $('score-percent').textContent = `${data.percent}%`;
    $('score-feedback').textContent = data.feedback;
    $('only-wrong').checked = false;

    // Score by topic (useful for the 150-question Main Quiz)
    const byTopic = $('by-topic');
    byTopic.replaceChildren();
    byTopic.hidden = !data.main;
    if (data.main) {
      const tally = new Map();
      data.results.forEach((r) => {
        const t = tally.get(r.topic) || { right: 0, count: 0 };
        t.count++;
        if (r.is_correct) t.right++;
        tally.set(r.topic, t);
      });
      const heading = document.createElement('h2');
      heading.textContent = 'Score by topic';
      byTopic.appendChild(heading);
      tally.forEach((t, topic) => {
        const row = document.createElement('div');
        row.className = 'topic-row';
        const name = document.createElement('span');
        name.textContent = topic;
        const score = document.createElement('strong');
        score.textContent = `${t.right} / ${t.count}`;
        row.append(name, score);
        byTopic.appendChild(row);
      });
    }
    renderReview();
  }

  function renderReview() {
    const onlyWrong = $('only-wrong').checked;
    const review = $('review');
    review.replaceChildren();

    lastResult.results.forEach((r) => {
      if (onlyWrong && r.is_correct) return;

      const item = document.createElement('div');
      item.className = `review-item ${r.is_correct ? 'correct' : 'wrong'}`;

      const title = document.createElement('h3');
      title.textContent = `${r.id}. ${r.topic}`;

      const question = document.createElement('p');
      question.textContent = r.question;

      const status = document.createElement('p');
      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = r.is_correct ? 'Correct' : (r.selected ? 'Incorrect' : 'Not answered');
      status.append(tag);

      const yours = document.createElement('p');
      yours.textContent = `Your answer: ${r.selected ? `${r.selected}. ${r.selected_text}` : '-'}`;

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

    if (!review.children.length) {
      const none = document.createElement('p');
      none.className = 'muted';
      none.textContent = 'Nothing to show here.';
      review.appendChild(none);
    }
  }

  /* ---------- Events ---------- */
  $('login-form').addEventListener('submit', doLogin);
  $('logout-btn').addEventListener('click', doLogout);
  $('home-btn').addEventListener('click', () => {
    const inQuiz = !$('quiz-screen').hidden;
    if (inQuiz && !confirm('Leave this quiz? Your answers so far will be lost.')) return;
    loadList();
  });
  $('prev-btn').addEventListener('click', () => go(-1));
  $('next-btn').addEventListener('click', () => go(1));
  $('submit-btn').addEventListener('click', submitQuiz);
  $('only-wrong').addEventListener('change', renderReview);
  $('retry-btn').addEventListener('click', () => startQuiz(quiz.id));
  $('back-btn').addEventListener('click', loadList);

  init();
})();
