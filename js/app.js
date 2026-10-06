/* ============================================================
   Smallpox Learning App — application logic
   Views, module rendering, quizzes, timeline, progress (localStorage)
   ============================================================ */

(function () {
  'use strict';

  const STORAGE_KEY = 'smallpox-learn-progress-v1';
  let memoryProgress = { read: {}, quiz: {} };

  /* ---------- Progress store ---------- */
  const Progress = {
    load() {
      try {
        const d = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return d && d.read && d.quiz ? d : memoryProgress;
      } catch (e) {
        return memoryProgress;
      }
    },
    save(data) {
      memoryProgress = data;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        /* storage may be unavailable; app still works in-session */
      }
    },
    markRead(id) {
      const d = this.load();
      d.read[id] = true;
      this.save(d);
    },
    setQuiz(id, score, total) {
      const d = this.load();
      const prev = d.quiz[id];
      // keep the best score
      if (!prev || score > prev.score) d.quiz[id] = { score, total };
      this.save(d);
    },
    reset() {
      this.save({ read: {}, quiz: {} });
    }
  };

  /* ---------- Icons (inline SVG) ---------- */
  const ICONS = {
    origin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>',
    virus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>',
    clinical: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-2 5 5 0 0 1 9 2c-2 4.5-9 9-9 9z"/></svg>',
    past: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    current: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    vaccine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><path d="M18 2l4 4M17 3l4 4M15 5l4 4-8 8-4 1 1-4z"/><path d="M9 15l-5 5"/></svg>',
    myths: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" width="22" height="22"><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>'
  };

  /* ---------- Utilities ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  // Fisher-Yates shuffle — returns a new shuffled array of indices [0..n-1]
  function shuffledOrder(n) {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  }

  function sourcesHtml(sources) {
    return (
      '<div class="sources"><h4>Sources</h4><ol>' +
      sources.map((s) => `<li><a href="${s.u}" target="_blank" rel="noopener">${s.t}</a></li>`).join('') +
      '</ol></div>'
    );
  }

  /* ---------- View router ---------- */
  const views = {};
  function showView(name, opts) {
    $$('.view').forEach((v) => v.classList.remove('active'));
    const el = views[name];
    if (el) el.classList.add('active');
    // nav highlight
    $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === name));
    // close mobile nav
    $('.nav-links').classList.remove('open');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'module' && opts && opts.id) renderModule(opts.id);
    if (name === 'quiz' && opts && opts.id) renderQuiz(opts.id);
    if (name === 'home') renderModuleCards();
    if (name === 'progress') renderProgress();
    if (name === 'quizzes') renderQuizzesHub();
    // update hash for shareable/bookmarkable state
    const hash = name === 'home' ? '' : opts && opts.id ? `#${name}/${opts.id}` : `#${name}`;
    if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash);
  }
  window.showView = showView;

  function routeFromHash() {
    const h = location.hash.replace(/^#/, '');
    if (!h) return showView('home');
    const [name, id] = h.split('/');
    if ((name === 'module' || name === 'quiz') && id) return showView(name, { id });
    if (['timeline', 'quizzes', 'progress', 'about'].includes(name)) return showView(name);
    showView('home');
  }

  /* ---------- Home: module cards ---------- */
  function renderModuleCards() {
    const grid = $('#module-cards');
    const prog = Progress.load();
    grid.innerHTML = MODULES.map((m) => {
      const done = prog.read[m.id];
      const quiz = prog.quiz[m.id];
      return `
        <a class="module-card" href="#module/${m.id}" data-nav="module" data-id="${m.id}">
          <div class="module-card-media">
            <span class="module-num">${m.num}</span>
            <img src="assets/module-${m.id}.svg" alt="Illustration for ${m.title}" loading="lazy" />
          </div>
          <div class="module-card-body">
            <h3>${m.title}</h3>
            <p>${m.summary}</p>
            <div class="module-card-foot">
              <span class="chip ${done ? 'done' : ''}">${done ? '✓ Completed' : m.readingMinutes + ' min read'}</span>
              ${quiz ? `<span class="chip done">Quiz ${quiz.score}/${quiz.total}</span>` : `<span class="arrow">Start →</span>`}
            </div>
          </div>
        </a>`;
    }).join('');
  }

  /* ---------- Module reading view ---------- */
  function renderModule(id) {
    const m = MODULES.find((x) => x.id === id);
    if (!m) return showView('home');


    const idx = MODULES.findIndex((x) => x.id === id);
    const prev = MODULES[idx - 1];
    const next = MODULES[idx + 1];

    const toc = m.sections
      .map((s, i) => `<a href="#s-${i}" data-scroll="s-${i}">${s.h}</a>`)
      .join('') +
      (m.timeline && m.timeline.length
        ? `<a href="#s-timeline" data-scroll="s-timeline">${m.timelineHeading || 'Timeline of the outbreak'}</a>`
        : '');

    const body = m.sections
      .map((s, i) => {
        let html = `<h3 id="s-${i}">${s.h}</h3>`;
        s.p.forEach((p) => { html += `<p>${p}</p>`; });
        if (s.img) {
          html += `<figure class="reader-figure"><img src="${s.img.src}" alt="${s.img.alt || ''}" loading="lazy" />` +
            (s.img.caption ? `<figcaption>${s.img.caption}</figcaption>` : '') + `</figure>`;
        }
        return html;
      })
      .join('');

    // Optional embedded video (e.g., YouTube)
    const videoHtml = m.video
      ? `<figure class="reader-figure video-embed">
           <div class="video-frame"><iframe src="${m.video.embed}" title="${m.video.title || 'Video'}"
             frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
             referrerpolicy="strict-origin-when-cross-origin" allowfullscreen loading="lazy"></iframe></div>
           ${m.video.caption ? `<figcaption>${m.video.caption}</figcaption>` : ''}
         </figure>`
      : '';

    // Optional in-module detailed timeline
    const moduleTimeline = m.timeline && m.timeline.length
      ? `<h3 id="s-timeline">${m.timelineHeading || 'Timeline of the outbreak'}</h3>
         <div class="mini-timeline">` +
        m.timeline.map((t) =>
          `<div class="mt-item"><div class="mt-date">${t.date}</div>
             <div class="mt-body"><p>${t.text}</p>` +
          (t.src ? `<p class="mt-src"><a href="${t.src.u}" target="_blank" rel="noopener">${t.src.t}</a></p>` : '') +
          `</div></div>`).join('') +
        `</div>`
      : '';

    const keyFacts =
      `<div class="keyfacts"><h4>Key facts</h4><ul>` +
      m.keyFacts.map((f) => `<li>${f}</li>`).join('') +
      `</ul></div>`;

    views.module.innerHTML = `
      <section class="section">
        <div class="container">
          <div style="margin-bottom:var(--space-8)">
            <a class="nav-link" href="#" data-nav="home" style="padding-left:0">← All modules</a>
          </div>
          <div class="reader">
            <aside class="reader-toc">
              <h4>Module ${m.num}</h4>
              ${toc}
              <div style="margin-top:var(--space-6)">
                <a class="btn btn-primary" style="width:100%" href="#quiz/${m.id}" data-nav="quiz" data-id="${m.id}">Take the quiz</a>
              </div>
            </aside>
            <article class="reader-body">
              <div class="section-eyebrow">Module ${m.num} · ${m.readingMinutes} min read</div>
              <h2>${m.title}</h2>
              <p class="lead">${m.subtitle}</p>
              ${keyFacts}
              ${videoHtml}
              ${body}
              ${moduleTimeline}
              ${sourcesHtml(m.sources)}
              <button class="btn btn-ghost" id="mark-read">${Progress.load().read[id] ? "✓ Lesson completed" : "Mark lesson complete"}</button>
              <div class="reader-nav">
                ${prev ? `<a class="btn btn-ghost" href="#module/${prev.id}" data-nav="module" data-id="${prev.id}">← ${prev.title}</a>` : '<span></span>'}
                ${next ? `<a class="btn btn-primary" href="#module/${next.id}" data-nav="module" data-id="${next.id}">${next.title} →</a>` : `<a class="btn btn-primary" href="#quiz/${m.id}" data-nav="quiz" data-id="${m.id}">Take the quiz →</a>`}
              </div>
            </article>
          </div>
        </div>
      </section>`;

    $('#mark-read').addEventListener('click', () => { Progress.markRead(id); $('#mark-read').textContent = '✓ Lesson completed'; });

    // TOC scroll spy
    const tocLinks = $$('.reader-toc a[data-scroll]', views.module);
    tocLinks.forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = $('#' + a.dataset.scroll, views.module);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ---------- Quiz view ---------- */
  const quizState = {};
  function renderQuiz(id) {
    const m = MODULES.find((x) => x.id === id);
    const questions = QUIZZES[id];
    if (!m || !questions) return showView('home');

    quizState[id] = { i: 0, correct: 0, answered: false };
    views.quiz.innerHTML = `
      <section class="section">
        <div class="container">
          <div style="margin-bottom:var(--space-8)">
            <a class="nav-link" href="#module/${id}" data-nav="module" data-id="${id}" style="padding-left:0">← Back to ${m.title}</a>
          </div>
          <div class="section-head" style="text-align:center;margin-inline:auto">
            <div class="section-eyebrow">Module ${m.num} quiz</div>
            <h2>${m.title}</h2>
          </div>
          <div class="quiz-card" id="quiz-card"></div>
        </div>
      </section>`;
    paintQuestion(id);
  }

  function paintQuestion(id) {
    const questions = QUIZZES[id];
    const st = quizState[id];
    const card = $('#quiz-card');
    const total = questions.length;

    if (st.i >= total) {
      // results
      Progress.setQuiz(id, st.correct, total);
      const pct = Math.round((st.correct / total) * 100);
      const msg =
        pct === 100 ? 'Perfect score. You really know this one.' :
        pct >= 75 ? 'Nice work. You\u2019ve got a solid grip on this.' :
        pct >= 50 ? 'Good start. A quick reread will fill in the gaps.' :
        'Give the lesson another read, then come back and try again.';
      const circ = 2 * Math.PI * 52;
      const off = circ * (1 - st.correct / total);
      card.innerHTML = `
        <div class="quiz-result">
          <svg class="quiz-score-ring" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-surface-offset-2)" stroke-width="10"/>
            <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-primary)" stroke-width="10"
              stroke-linecap="round" stroke-dasharray="${circ}" stroke-dashoffset="${off}"
              transform="rotate(-90 60 60)"/>
            <text x="60" y="58" text-anchor="middle" font-size="26" font-weight="700" fill="var(--color-text)">${st.correct}/${total}</text>
            <text x="60" y="78" text-anchor="middle" font-size="12" fill="var(--color-text-muted)">${pct}%</text>
          </svg>
          <h3>${st.correct} of ${total} correct</h3>
          <p>${msg}</p>
          <div class="quiz-actions" style="justify-content:center">
            <button class="btn btn-ghost" id="retry">Try again</button>
            <a class="btn btn-primary" href="#module/${id}" data-nav="module" data-id="${id}">Review module</a>
          </div>
        </div>`;
      $('#retry').addEventListener('click', () => {
        quizState[id] = { i: 0, correct: 0, answered: false };
        paintQuestion(id);
      });
      return;
    }

    const q = questions[st.i];
    st.answered = false;
    const barPct = (st.i / total) * 100;
    const letters = ['A', 'B', 'C', 'D', 'E'];
    // Shuffle option order so the correct answer isn't always in the same slot.
    const order = shuffledOrder(q.options.length);
    st.order = order;
    // Position (in the shuffled display) that holds the correct answer.
    st.correctPos = order.indexOf(q.correct);
    card.innerHTML = `
      <div class="quiz-progress">
        <span>Question ${st.i + 1} of ${total}</span>
        <span>${st.correct} correct</span>
      </div>
      <div class="quiz-bar"><span style="width:${barPct}%"></span></div>
      <p class="quiz-question">${q.q}</p>
      <div class="quiz-options" id="opts">
        ${order
          .map(
            (origIdx, pos) =>
              `<button class="quiz-option" data-i="${pos}"><span class="marker">${letters[pos]}</span><span>${q.options[origIdx]}</span></button>`
          )
          .join('')}
      </div>
      <div class="quiz-feedback" id="fb" role="status" aria-live="polite"></div>
      <div class="quiz-actions">
        <button class="btn btn-primary" id="nextq" style="display:none">${st.i + 1 >= total ? 'See results' : 'Next question'} →</button>
      </div>`;

    $$('#opts .quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (st.answered) return;
        st.answered = true;
        const chosen = parseInt(btn.dataset.i, 10);
        const correct = st.correctPos;
        $$('#opts .quiz-option').forEach((b) => {
          const bi = parseInt(b.dataset.i, 10);
          b.disabled = true;
          if (bi === correct) b.classList.add('correct');
          else if (bi === chosen) b.classList.add('wrong');
        });
        const fb = $('#fb');
        if (chosen === correct) {
          st.correct++;
          fb.className = 'quiz-feedback ok show';
          fb.innerHTML = `<strong>Correct.</strong> ${q.why}`;
        } else {
          fb.className = 'quiz-feedback no show';
          fb.innerHTML = `<strong>Not quite.</strong> ${q.why}`;
        }
        $('.quiz-progress').children[1].textContent = st.correct + ' correct';
        $('#nextq').style.display = 'inline-flex';
      });
    });

    $('#nextq').addEventListener('click', () => {
      st.i++;
      paintQuestion(id);
    });
  }

  /* ---------- Quizzes hub ---------- */
  function renderQuizzesHub() {
    const grid = $('#quiz-cards');
    const prog = Progress.load();
    grid.innerHTML = MODULES.map((m) => {
      const quiz = prog.quiz[m.id];
      return `
        <a class="module-card" href="#quiz/${m.id}" data-nav="quiz" data-id="${m.id}">
          <div class="module-card-body">
            <div class="section-eyebrow">Module ${m.num}</div>
            <h3>${m.title}</h3>
            <p>${QUIZZES[m.id].length} questions with instant feedback and explanations.</p>
            <div class="module-card-foot">
              ${quiz ? `<span class="chip done">Best: ${quiz.score}/${quiz.total}</span>` : `<span class="chip">Not attempted</span>`}
              <span class="arrow">${quiz ? 'Retake →' : 'Start →'}</span>
            </div>
          </div>
        </a>`;
    }).join('');
  }

  /* ---------- Timeline ---------- */
  function renderTimeline() {
    const wrap = $('#timeline-list');
    wrap.innerHTML = TIMELINE.map(
      (t) => `
      <div class="tl-item ${t.era ? 'era' : ''}">
        <div class="tl-year">${t.year}</div>
        <div class="tl-title">${t.title}</div>
        <p>${t.text}</p>
        <p class="tl-src"><a href="${t.src.u}" target="_blank" rel="noopener">${t.src.t}</a></p>
      </div>`
    ).join('');
  }

  /* ---------- Progress dashboard ---------- */
  function renderProgress() {
    const prog = Progress.load();
    const readCount = MODULES.filter((m) => prog.read[m.id]).length;
    const quizCount = MODULES.filter((m) => prog.quiz[m.id]).length;
    let totalScore = 0, totalPossible = 0;
    MODULES.forEach((m) => {
      if (prog.quiz[m.id]) {
        totalScore += prog.quiz[m.id].score;
        totalPossible += prog.quiz[m.id].total;
      }
    });
    const avg = totalPossible ? Math.round((totalScore / totalPossible) * 100) : 0;

    $('#progress-stats').innerHTML = `
      <div class="stat-card"><div class="big">${readCount}/${MODULES.length}</div><div class="cap">Lessons completed</div></div>
      <div class="stat-card"><div class="big">${quizCount}/${MODULES.length}</div><div class="cap">Quizzes completed</div></div>
      <div class="stat-card"><div class="big">${avg}%</div><div class="cap">Average quiz score</div></div>
      <div class="stat-card"><div class="big">${totalScore}/${totalPossible || 0}</div><div class="cap">Total questions correct</div></div>`;

    $('#progress-detail').innerHTML = MODULES.map((m) => {
      const read = prog.read[m.id];
      const quiz = prog.quiz[m.id];
      return `
        <div class="module-card" style="cursor:default">
          <div class="module-card-body">
            <h3>${m.num}. ${m.title}</h3>
            <div class="module-card-foot" style="margin-top:var(--space-3)">
              <span class="chip ${read ? 'done' : ''}">${read ? '✓ Completed' : 'Not completed'}</span>
              <span class="chip ${quiz ? 'done' : ''}">${quiz ? `Quiz ${quiz.score}/${quiz.total}` : 'No quiz yet'}</span>
              <a class="arrow" href="#module/${m.id}" data-nav="module" data-id="${m.id}">Open →</a>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  /* ---------- Global click delegation for data-nav ---------- */
  document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-nav]');
    if (link) {
      e.preventDefault();
      const name = link.dataset.nav;
      const id = link.dataset.id;
      showView(name, id ? { id } : undefined);
    }
  });

  /* ---------- Boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    ['home', 'module', 'quiz', 'quizzes', 'timeline', 'progress', 'about'].forEach((n) => {
      views[n] = document.getElementById('view-' + n);
    });

    // inject module icons into any placeholders (about page etc.)
    $$('[data-icon]').forEach((el) => {
      el.innerHTML = ICONS[el.dataset.icon] || '';
    });

    renderModuleCards();
    renderQuizzesHub();
    renderTimeline();

    // mobile nav toggle
    const toggle = $('.nav-toggle');
    if (toggle) toggle.addEventListener('click', () => $('.nav-links').classList.toggle('open'));

    // theme toggle
    (function () {
      const t = $('[data-theme-toggle]'), r = document.documentElement;
      let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
      const stored = (function () { try { return localStorage.getItem('smallpox-theme'); } catch (e) { return null; } })();
      if (stored) d = stored;
      r.setAttribute('data-theme', d);
      setIcon();
      function setIcon() {
        if (!t) return;
        t.innerHTML = d === 'dark'
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
      if (t) t.addEventListener('click', () => {
        d = d === 'dark' ? 'light' : 'dark';
        r.setAttribute('data-theme', d);
        try { localStorage.setItem('smallpox-theme', d); } catch (e) {}
        setIcon();
      });
    })();

    // reset progress button
    const resetBtn = $('#reset-progress');
    if (resetBtn) resetBtn.addEventListener('click', () => {
      if (confirm('Reset all your reading and quiz progress on this device?')) {
        Progress.reset();
        renderProgress();
        renderModuleCards();
        renderQuizzesHub();
      }
    });

    window.addEventListener('hashchange', routeFromHash);
    routeFromHash();
  });
})();
