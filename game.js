// Unburnt: Saving History from the Flames — Game Engine v2
// Structure: 4 Categories × 4 Stages = 16 total playable levels

const fireImg = new Image();
fireImg.src = 'images/fire.jpg';

const scrollImg = new Image();
scrollImg.src = 'images/scroll.jpg';

let processedFire = null;
let processedScroll = null;

function removeBlackBackground(img, tolerance) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] <= tolerance && data[i+1] <= tolerance && data[i+2] <= tolerance) {
      data[i+3] = 0;
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return c;
}

fireImg.onload = () => { processedFire = removeBlackBackground(fireImg, 25); };
scrollImg.onload = () => { processedScroll = removeBlackBackground(scrollImg, 20); };

class UnburntGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    // States: MENU | CATEGORY_SELECT | LEVEL_SELECT | LEVEL_INTRO | PLAYING | HISTORY_UNLOCK | RESULT
    this.state = 'MENU';

    // Navigation
    this.currentCategoryIndex = 0;
    this.currentStoryIndex = 0;

    // Progress (4 categories × 4 stories)
    this.unlockedLevels = this.loadProgress('unburnt_unlocked', this.defaultUnlocked());
    this.completedLevels = this.loadProgress('unburnt_complete', this.defaultComplete());

    // Gameplay state
    this.scrolls = [];
    this.particles = [];
    this.lives = 3;
    this.score = 0;
    this.savedCount = 0;
    this.totalToSave = 0;
    this.wordQueue = [];
    this.typedBuffer = '';
    this.activeScroll = null;

    // Endless mode state
    this.isEndlessMode = false;
    this.endlessWave = 1;
    this.waveTargetCount = 10;
    this.waveSavedCount = 0;
    this.waveSpawnedCount = 0;
    this.wavePowerUpIndices = [];
    this.waveTransition = false;
    this.waveBanner = null;
    this.endlessHighScore = parseInt(localStorage.getItem('unburnt_endless_highscore')) || 0;
    this.endlessBestWave = parseInt(localStorage.getItem('unburnt_endless_bestwave')) || 1;

    // Spawning
    this.spawnTimer = 0;
    this.spawnInterval = 3000;
    this.baseSpeed = 0.8;

    // Stats
    this.startTime = 0;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;

    // Canvas
    this.width = 0;
    this.height = 0;
    this.resizeCanvas();

    // Screen refs
    this.screens = {
      MENU:             document.getElementById('screen-main-menu'),
      CATEGORY_SELECT:  document.getElementById('screen-category-select'),
      LEVEL_SELECT:     document.getElementById('screen-level-select'),
      LEVEL_INTRO:      document.getElementById('screen-level-intro'),
      STAGE_CLEARED:    document.getElementById('screen-stage-cleared-popup'),
      HISTORY_UNLOCK:   document.getElementById('screen-history-modal'),
      RESULT:           document.getElementById('screen-game-result'),
    };

    this.bindEvents();
    this.initHUDLives();

    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  // ─── Progress helpers ───────────────────────────────────────────
  defaultUnlocked() {
    // Only first story of first category unlocked by default
    return CATEGORIES.map((cat, ci) =>
      cat.stories.map((_, si) => ci === 0 && si === 0)
    );
  }

  defaultComplete() {
    return CATEGORIES.map(cat => cat.stories.map(() => false));
  }

  loadProgress(key, def) {
    try {
      const s = localStorage.getItem(key);
      if (!s) return def;
      const parsed = JSON.parse(s);
      // Must be a matching 2D array structure
      if (!Array.isArray(parsed) || !Array.isArray(parsed[0]) || parsed.length !== CATEGORIES.length) {
        localStorage.removeItem(key);
        return def;
      }
      return parsed;
    } catch {
      return def;
    }
  }

  saveProgress(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  get currentStory() {
    return CATEGORIES[this.currentCategoryIndex].stories[this.currentStoryIndex];
  }

  // ─── Resize & Arena Coordinates ─────────────────────────────────
  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Keep virtual keyboard display state synced with viewport width
    const virtualKb = document.getElementById('virtual-keyboard');
    if (virtualKb) {
      if (this.state === 'PLAYING' && window.innerWidth <= 850) {
        virtualKb.style.display = 'flex';
      } else {
        virtualKb.style.display = 'none';
      }
    }
  }

  getCenterY() {
    if (window.innerWidth <= 850) {
      // Top header is ~42px, elevated floating virtual keyboard occupies ~202px at the bottom
      const topBoundary = 42;
      const bottomBoundary = Math.max(topBoundary + 100, this.height - 202);
      return Math.round((topBoundary + bottomBoundary) / 2);
    }
    return this.height / 2;
  }

  isScrollVisible(s) {
    if (!s || s.isSaved || s.isBurnt) return false;
    const isMobile = this.width < 600 || window.innerWidth <= 850;
    const zoom = isMobile ? 0.76 : 1.0;
    const cx = this.width / 2, cy = this.getCenterY();
    // Convert world coordinate to actual visible screen coordinate
    const screenX = cx + (s.x - cx) * zoom;
    const screenY = cy + (s.y - cy) * zoom;
    // Typing detection spans entire screen (+80px margin so it's typable the moment it appears)
    return screenX >= -80 && screenX <= this.width + 80 &&
           screenY >= -80 && screenY <= this.height + 80;
  }

  // ─── Event Bindings ─────────────────────────────────────────────
  bindEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    // ── Main Menu ──
    document.getElementById('btn-play-journey').addEventListener('click', () => {
      unburntAudio.init();
      this.switchState('CATEGORY_SELECT');
    });

    // ── Category Select ──
    document.getElementById('btn-category-back').addEventListener('click', () => {
      this.switchState('MENU');
    });

    // ── Level Select ──
    document.getElementById('btn-level-back').addEventListener('click', () => {
      this.switchState('CATEGORY_SELECT');
    });

    // ── Level Intro ──
    document.getElementById('btn-intro-back').addEventListener('click', () => {
      this.switchState('LEVEL_SELECT');
    });
    document.getElementById('btn-start-level').addEventListener('click', () => {
      this.startLevel();
    });

    // ── Stage Cleared Popup ──
    document.getElementById('btn-view-history').addEventListener('click', () => {
      this.switchState('HISTORY_UNLOCK');
    });

    // ── History Modal ──
    document.getElementById('btn-history-next').addEventListener('click', () => {
      // Mark complete & unlock next
      this.completedLevels[this.currentCategoryIndex][this.currentStoryIndex] = true;
      this.saveProgress('unburnt_complete', this.completedLevels);

      // Try to unlock next story in same category
      const nextStory = this.currentStoryIndex + 1;
      const catStories = CATEGORIES[this.currentCategoryIndex].stories;
      if (nextStory < catStories.length && !catStories[nextStory].isComingSoon) {
        this.unlockedLevels[this.currentCategoryIndex][nextStory] = true;
        this.saveProgress('unburnt_unlocked', this.unlockedLevels);
        this.switchState('LEVEL_SELECT');
      } else {
        this.switchState('CATEGORY_SELECT');
      }
    });

    // ── Endless Mode Trigger ──
    const endlessBtn = document.getElementById('btn-start-endless');
    if (endlessBtn) {
      endlessBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        unburntAudio.init();
        this.startEndlessMode();
      });
    }
    const endlessBanner = document.getElementById('btn-endless-mode');
    if (endlessBanner) {
      endlessBanner.addEventListener('click', () => {
        unburntAudio.init();
        this.startEndlessMode();
      });
    }

    // ── Result Screen ──
    document.getElementById('btn-result-action').addEventListener('click', () => {
      if (this.isEndlessMode) {
        this.startEndlessMode();
      } else {
        this.switchState('LEVEL_INTRO');
      }
    });
    document.getElementById('btn-result-menu').addEventListener('click', () => {
      if (this.isEndlessMode) {
        this.switchState('CATEGORY_SELECT');
      } else {
        this.switchState('LEVEL_SELECT');
      }
    });

    // ── Global Home Button ──
    document.getElementById('btn-home').addEventListener('click', () => {
      if (this.state === 'PLAYING') {
        // During gameplay — show confirm modal
        this.state = 'PAUSED';
        document.getElementById('screen-quit-confirm').style.display = 'flex';
      } else {
        // Anywhere else — go straight to main menu
        this.switchState('MENU');
      }
    });

    document.getElementById('btn-quit-yes').addEventListener('click', () => {
      document.getElementById('screen-quit-confirm').style.display = 'none';
      this.scrolls = [];
      this.particles = [];
      this.typedBuffer = '';
      this.activeScroll = null;
      this.isEndlessMode = false;
      this.switchState('MENU');
    });

    document.getElementById('btn-quit-no').addEventListener('click', () => {
      document.getElementById('screen-quit-confirm').style.display = 'none';
      this.state = 'PLAYING';
    });

    // ── Audio Toggle ──
    document.getElementById('btn-audio-toggle').addEventListener('click', () => {
      const muted = unburntAudio.toggleMute();
      document.getElementById('svg-audio-on').style.display = muted ? 'none' : 'block';
      document.getElementById('svg-audio-off').style.display = muted ? 'block' : 'none';
    });

    // ── Virtual On-Screen Keyboard (Mobile & Touch) ──
    const virtualKb = document.getElementById('virtual-keyboard');
    if (virtualKb) {
      virtualKb.querySelectorAll('.kb-key').forEach(btn => {
        const handleTouchKey = (e) => {
          e.preventDefault();
          e.stopPropagation();
          unburntAudio.init(); // unlock audio on user interaction

          const key = btn.getAttribute('data-key');
          if (!key) return;

          btn.classList.add('kb-pressed');
          setTimeout(() => btn.classList.remove('kb-pressed'), 100);

          if (this.state === 'PLAYING') {
            this.processKey(key);
          }
        };

        btn.addEventListener('pointerdown', handleTouchKey);
      });
    }

    // ── Hardware Keyboard (Desktop) ──
    window.addEventListener('keydown', e => {
      if (this.state !== 'PLAYING') return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Backspace' || e.key === 'Enter' || e.key.length === 1) {
        this.processKey(e.key);
        if (e.key === 'Backspace' || e.key === 'Enter') e.preventDefault();
      }
    });
  }

  // ─── State Machine ───────────────────────────────────────────────
  switchState(newState) {
    this.state = newState;

    // Global Header Visibility (Hide on Main Menu for immersive background)
    const mainHeader = document.getElementById('main-header');
    if (mainHeader) {
      if (newState === 'MENU') {
        mainHeader.style.display = 'none';
      } else {
        mainHeader.style.display = 'flex';
      }
    }

    // Hide quit modal
    const quitModal = document.getElementById('screen-quit-confirm');
    if (quitModal) quitModal.style.display = 'none';

    // Hide all overlay screens
    Object.values(this.screens).forEach(s => s && s.classList.remove('visible'));

    // HUD, Input Overlay & Virtual Keyboard visibility
    const hud = document.getElementById('hud-controls');
    const inputOverlay = document.getElementById('input-overlay');
    const virtualKb = document.getElementById('virtual-keyboard');

    if (newState === 'PLAYING') {
      hud.style.display = 'flex';
      inputOverlay.style.display = 'block';
      if (virtualKb && window.innerWidth <= 850) {
        virtualKb.style.display = 'flex';
      }
    } else {
      hud.style.display = 'none';
      inputOverlay.style.display = 'none';
      if (virtualKb) {
        virtualKb.style.display = 'none';
      }
    }

    // Show appropriate screen
    switch (newState) {
      case 'MENU':           this.screens.MENU.classList.add('visible'); break;
      case 'CATEGORY_SELECT':
        try { this.renderCategoryGrid(); } catch(e) { console.error('Category grid error:', e); }
        try { this.updateEndlessMenuStats(); } catch(e) { console.error('Endless stats error:', e); }
        this.screens.CATEGORY_SELECT.classList.add('visible');
        break;
      case 'LEVEL_SELECT':
        try { this.renderLevelGrid(); } catch(e) { console.error('Level grid error:', e); }
        this.screens.LEVEL_SELECT.classList.add('visible');
        break;
      case 'LEVEL_INTRO':
        try { this.setupLevelIntroScreen(); } catch(e) { console.error('Level intro error:', e); }
        this.screens.LEVEL_INTRO.classList.add('visible');
        break;
      case 'STAGE_CLEARED':
        if (this.screens.STAGE_CLEARED) this.screens.STAGE_CLEARED.classList.add('visible');
        break;
      case 'HISTORY_UNLOCK':
        try { this.setupHistoryScreen(); } catch(e) { console.error('History screen error:', e); }
        this.screens.HISTORY_UNLOCK.classList.add('visible');
        break;
      case 'RESULT':
        this.screens.RESULT.classList.add('visible');
        break;
    }
  }

  // ─── Category Grid Renderer ──────────────────────────────────────
  renderCategoryGrid() {
    const grid = document.getElementById('category-selection-grid');
    grid.innerHTML = '';

    CATEGORIES.forEach((cat, catIdx) => {
      const card = document.createElement('div');
      card.style.setProperty('--cat-color', cat.color);

      if (cat.isAvailable) {
        card.className = 'category-card';
        const playableStories = cat.stories.filter(s => !s.isComingSoon).length;
        const completed = (this.completedLevels[catIdx] || []).filter(Boolean).length;
        card.innerHTML = `
          <span class="category-icon">${cat.icon}</span>
          <div class="category-title">${cat.title}</div>
          <div class="category-subtitle">${cat.subtitle}</div>
          <div class="category-progress" style="color:${cat.color}">
            ${completed}/${playableStories} stages completed
          </div>
        `;
        card.style.cursor = 'pointer';
        card.addEventListener('click', () => {
          this.currentCategoryIndex = catIdx;
          this.switchState('LEVEL_SELECT');
        });
      } else {
        card.className = 'category-card coming-soon';
        card.innerHTML = `
          <span class="category-icon">${cat.icon}</span>
          <div class="category-title">${cat.title}</div>
          <div class="category-subtitle">${cat.subtitle}</div>
          <div class="category-progress" style="color:var(--text-muted)">
            🔒 Coming Soon
          </div>
        `;
      }

      grid.appendChild(card);
    });
  }

  // ─── Level Grid Renderer ─────────────────────────────────────────
  renderLevelGrid() {
    const cat = CATEGORIES[this.currentCategoryIndex];
    document.getElementById('level-select-icon').textContent = cat.icon;
    document.getElementById('level-select-title').textContent = cat.title;

    const grid = document.getElementById('level-selection-grid');
    grid.innerHTML = '';

    cat.stories.forEach((story, stIdx) => {
      const card = document.createElement('div');

      if (story.isComingSoon) {
        card.className = 'level-card locked coming-soon';
        card.innerHTML = `
          <div class="level-num" style="color:var(--text-muted)">Stage 4</div>
          <div class="level-title">Coming Soon</div>
          <div class="level-desc">More historical stories are currently being archived from national records.</div>
          <span class="level-badge" style="background:rgba(255,255,255,0.04);color:var(--secondary);border:0.5px solid rgba(255,193,7,0.3)">Coming Soon</span>
        `;
      } else {
        const isUnlocked = (this.unlockedLevels[this.currentCategoryIndex] || [])[stIdx];
        const isComplete = (this.completedLevels[this.currentCategoryIndex] || [])[stIdx];

        card.className = `level-card${isUnlocked ? '' : ' locked'}`;

        let badge = '';
        if (!isUnlocked) {
          badge = `<span class="level-badge" style="background:rgba(255,255,255,0.04);color:var(--text-muted);border:0.5px solid rgba(255,255,255,0.08)">Locked</span>`;
        } else if (isComplete) {
          badge = `<span class="level-badge complete">✓ Done</span>`;
        } else {
          badge = `<span class="level-badge unlocked">Available</span>`;
        }

        card.innerHTML = `
          <div class="level-num" style="color:${cat.color}">Stage ${stIdx + 1}</div>
          <div class="level-title">${story.title}</div>
          <div class="level-desc">${story.introduction.substring(0, 85)}…</div>
          ${badge}
        `;

        if (isUnlocked) {
          card.addEventListener('click', () => {
            this.currentStoryIndex = stIdx;
            this.switchState('LEVEL_INTRO');
          });
        }
      }

      grid.appendChild(card);
    });
  }

  // ─── Level Intro Screen ──────────────────────────────────────────
  setupLevelIntroScreen() {
    try {
      const story = this.currentStory;
      // Only set elements that still exist in the HTML
      const titleEl = document.getElementById('intro-title-text');
      if (titleEl) titleEl.innerText = story.title;

      const preview = document.getElementById('intro-preview-container');
      if (preview) {
        preview.innerHTML = this.generateNarrativePreview(story.narrative, story.words);
      }
    } catch(e) {
      console.error('Level intro setup error:', e);
    }
  }

  generateNarrativePreview(narrative, words) {
    let preview = narrative;
    const sorted = [...words].sort((a, b) => b.length - a.length);
    sorted.forEach(word => {
      const regex = new RegExp('\\b' + word.replace(/'/g, "'") + '\\b', 'gi');
      const dots = `<span class="scroll-missing-word">${'.'.repeat(word.length)}</span>`;
      preview = preview.replace(regex, dots);
    });
    return preview;
  }

  // ─── History Screen ──────────────────────────────────────────────
  setupHistoryScreen() {
    const story = this.currentStory;
    document.getElementById('history-badge-era').innerText = story.theme;
    document.getElementById('history-title-text-unlocked').innerText = story.title;
    
    let fullText = story.narrative;
    if (story.source) {
      fullText += `\n\n[Source: ${story.source}]`;
    }
    document.getElementById('history-narrative-text').innerText = fullText;

    const frame = document.getElementById('history-artwork-frame');
    frame.innerHTML = '';
    const cat = CATEGORIES[this.currentCategoryIndex];

    if (story.image) {
      frame.innerHTML = `
        <img src="${story.image}" alt="${story.title}" style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top center;
          border-radius: 6px;
          display: block;
        " />
      `;
    } else {
      // Stylised placeholder using category color
      frame.innerHTML = `
        <div style="
          width:100%; height:100%;
          display:flex; flex-direction:column;
          justify-content:center; align-items:center;
          background: radial-gradient(circle, ${cat.colorGlow} 0%, rgba(0,0,0,0.6) 100%);
          padding: 20px; text-align: center;
        ">
          <div style="font-size:52px; margin-bottom:12px;">${cat.icon}</div>
          <div style="font-family:'Outfit',sans-serif; font-weight:800; font-size:13px; color:${cat.color}; text-transform:uppercase; letter-spacing:1px;">
            ${cat.title}
          </div>
          <div style="font-size:11px; color:rgba(255,255,255,0.35); margin-top:8px;">Scroll Restored</div>
        </div>
      `;
    }
  }

  // ─── Result Screen ───────────────────────────────────────────────
  showResult(win) {
    const header = document.getElementById('result-header-text');
    const sub = document.getElementById('result-subheader-text');

    const mins = (performance.now() - this.startTime) / 60000;
    const wpm = mins > 0 ? Math.round((this.correctKeystrokes / 5) / mins) : 0;
    const acc = this.totalKeystrokes > 0
      ? Math.round((this.correctKeystrokes / this.totalKeystrokes) * 100) : 0;

    document.getElementById('stat-score').innerText = this.score;
    document.getElementById('stat-accuracy').innerText = `${acc}%`;
    document.getElementById('stat-wpm').innerText = wpm;

    if (this.isEndlessMode) {
      const isNewHigh = (this.score >= this.endlessHighScore && this.score > 0);
      if (isNewHigh) {
        header.className = 'result-title win';
        header.innerText = 'New High Score! 🏆';
        sub.innerText = `You conquered until Wave ${this.endlessWave} with ${this.score.toLocaleString()} points!`;
      } else {
        header.className = 'result-title lose';
        header.innerText = 'Trial Concluded';
        sub.innerText = `You reached Wave ${this.endlessWave}. Best: Wave ${this.endlessBestWave} (${this.endlessHighScore.toLocaleString()} pts).`;
      }
      document.getElementById('btn-result-action').innerText = 'Play Endless Again';
      document.getElementById('btn-result-menu').innerText = 'Choose Path';
    } else {
      if (win) {
        header.className = 'result-title win';
        header.innerText = 'History Saved!';
        sub.innerText = 'You successfully rescued all the ancient scrolls.';
        document.getElementById('btn-result-action').innerText = 'Play Again';
      } else {
        header.className = 'result-title lose';
        header.innerText = 'Scribe Failed';
        sub.innerText = 'Too many scrolls crumbled in the fire.';
        document.getElementById('btn-result-action').innerText = 'Try Again';
      }
      document.getElementById('btn-result-menu').innerText = 'All Levels';
    }

    this.switchState('RESULT');
  }

  // ─── HUD Helpers ─────────────────────────────────────────────────
  initHUDLives() {
    const c = document.getElementById('hud-lives-container');
    c.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const s = document.createElement('div');
      s.className = 'shield-life active';
      s.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24">
        <path d="M12 2C8 2 4 4.5 4 9c0 5 4.5 9.5 8 11 3.5-1.5 8-6 8-11 0-4.5-4-7-8-7zm0 2c2.8 0 6 1.8 6 5.5 0 3.7-3.6 7.5-6 8.7-2.4-1.2-6-5-6-8.7 0-3.7 3.2-5.5 6-5.5z" fill="#ffc107"/>
        <path d="M12 5v12c1.8-.8 4.5-3.8 4.5-6.5C16.5 7.8 14.5 6 12 5z" fill="#ff5722"/>
      </svg>`;
      c.appendChild(s);
    }
  }

  updateHUDLives() {
    const shields = document.getElementById('hud-lives-container').children;
    for (let i = 0; i < 3; i++) {
      shields[i].className = i < this.lives ? 'shield-life active' : 'shield-life lost';
    }
  }

  // ─── Level Start ─────────────────────────────────────────────
  startLevel() {
    this.isEndlessMode = false;
    const story = this.currentStory;

    this.lives = 3;
    this.score = 0;
    this.savedCount = 0;
    this.scrolls = [];
    this.particles = [];
    this.typedBuffer = '';
    this.activeScroll = null;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.startTime = performance.now();

    this.totalToSave = story.targetWordCount || story.words.length;
    this.wordQueue = [...story.words].sort(() => Math.random() - 0.5).slice(0, this.totalToSave);

    // Base speed for x2.0 floor scale
    this.baseSpeed = 0.35 + (this.currentCategoryIndex * 0.06) + (this.currentStoryIndex * 0.03);
    // Target: always keep this many scrolls moving toward the fire
    this.targetScrollCount = 5;

    this.updateHUDLives();
    this.updateBufferUI();
    document.getElementById('hud-level-label').innerText = 'Stage';
    document.getElementById('hud-level-val').innerText = `${this.currentStoryIndex + 1}`;
    document.getElementById('hud-saved-label').innerText = 'Saved';
    document.getElementById('hud-saved-val').innerText = `0 / ${this.totalToSave}`;
    document.getElementById('hud-score-val').innerText = '0';
    const hsItem = document.getElementById('hud-highscore-item');
    if (hsItem) hsItem.style.display = 'none';

    // Spawn 5 scrolls immediately when the game starts
    const burst = Math.min(5, this.wordQueue.length);
    for (let i = 0; i < burst; i++) this.spawnScroll();

    this.lastSpawnTime = Date.now(); // Track time for the 2-second interval
    this.totalSpawned = burst;      // Track total scrolls spawned for powerup timing
    this.frozenUntil = 0;           // Timestamp when freeze ends (0 = not frozen)

    this.switchState('PLAYING');
  }

  // ─── Endless Mode Engine ─────────────────────────────────────────
  startEndlessMode() {
    this.isEndlessMode = true;
    this.endlessWave = 1;
    this.score = 0;
    this.lives = 3;
    this.totalKeystrokes = 0;
    this.correctKeystrokes = 0;
    this.startTime = performance.now();
    this.particles = [];
    this.scrolls = [];
    this.typedBuffer = '';
    this.activeScroll = null;
    this.frozenUntil = 0;
    this.waveTransition = false;

    this.startEndlessWave(1);
  }

  startEndlessWave(waveNum) {
    this.endlessWave = waveNum;
    if (this.endlessWave > this.endlessBestWave) {
      this.endlessBestWave = this.endlessWave;
      localStorage.setItem('unburnt_endless_bestwave', this.endlessBestWave);
    }

    // Scroll count increases by 5 each wave: Wave 1 = 10, Wave 2 = 15, Wave 3 = 20...
    this.waveTargetCount = 10 + (waveNum - 1) * 5;
    this.waveSavedCount = 0;
    this.waveSpawnedCount = 0;
    this.scrolls = [];
    this.typedBuffer = '';
    this.activeScroll = null;

    // Base speed increases with wave number
    this.baseSpeed = 0.35 + (waveNum - 1) * 0.06;

    // 2 power-ups per wave at ~40% and ~75% of wave scrolls
    this.wavePowerUpIndices = [
      Math.max(3, Math.floor(this.waveTargetCount * 0.4)),
      Math.max(6, Math.floor(this.waveTargetCount * 0.75))
    ];

    // Build balanced word queue of short, medium, and long words
    this.wordQueue = this.generateEndlessWords(this.waveTargetCount);

    // Update HUD
    document.getElementById('hud-level-label').innerText = 'Wave';
    document.getElementById('hud-level-val').innerText = `${this.endlessWave}`;
    document.getElementById('hud-saved-label').innerText = 'Wave';
    document.getElementById('hud-saved-val').innerText = `0 / ${this.waveTargetCount}`;
    document.getElementById('hud-score-val').innerText = `${this.score}`;

    const hsItem = document.getElementById('hud-highscore-item');
    if (hsItem) {
      hsItem.style.display = 'flex';
      document.getElementById('hud-highscore-val').innerText = `${this.endlessHighScore.toLocaleString()}`;
    }

    this.updateHUDLives();
    this.updateBufferUI();

    // Visual wave banner
    this.waveBanner = {
      title: `WAVE ${this.endlessWave}`,
      sub: `${this.waveTargetCount} Scrolls Incoming • Speed Level ${this.endlessWave}`,
      timer: 130,
      maxTimer: 130
    };

    // Burst: Spawn 5 scrolls immediately at wave start
    const burst = Math.min(5, this.wordQueue.length);
    for (let i = 0; i < burst; i++) {
      this.spawnScroll();
    }

    this.lastSpawnTime = Date.now();
    this.switchState('PLAYING');
  }

  generateEndlessWords(count) {
    const pools = (typeof ENDLESS_WORDS !== 'undefined') ? ENDLESS_WORDS : {
      short: ["Zik", "Nok", "Owo", "Aba", "Kano", "Bida", "Edo", "Oyo", "Fire", "Ash", "King", "Oba", "Ooni", "Hero", "Gold"],
      medium: ["Balewa", "Bello", "Kaduna", "Benin", "Ibadan", "Empire", "Kingdom", "Legend", "Bronze", "Monarch", "Courage", "History"],
      long: ["Azikiwe", "Independence", "Parliamentary", "Constitutional", "Colonialism", "Resistance", "Revolution", "Civilization"]
    };

    const shortCount = Math.max(2, Math.round(count * 0.35));
    const mediumCount = Math.max(3, Math.round(count * 0.45));
    const longCount = Math.max(1, count - shortCount - mediumCount);

    const pick = (arr, n) => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      const res = [];
      for (let i = 0; i < n; i++) {
        res.push(shuffled[i % shuffled.length]);
      }
      return res;
    };

    const selected = [
      ...pick(pools.short, shortCount),
      ...pick(pools.medium, mediumCount),
      ...pick(pools.long, longCount)
    ];

    return selected.sort(() => Math.random() - 0.5);
  }

  handleEndlessWaveCleared() {
    if (this.waveTransition) return;
    this.waveTransition = true;

    const waveBonus = this.endlessWave * 250;
    this.score += waveBonus;
    if (this.score > this.endlessHighScore) {
      this.endlessHighScore = this.score;
      localStorage.setItem('unburnt_endless_highscore', this.endlessHighScore);
      const hsVal = document.getElementById('hud-highscore-val');
      if (hsVal) hsVal.innerText = this.endlessHighScore.toLocaleString();
    }
    document.getElementById('hud-score-val').innerText = this.score;

    this.spawnExplosion(this.width / 2, this.getCenterY(), '#ffd54f', 40);
    this.spawnExplosion(this.width / 2, this.getCenterY(), '#ff9100', 30);
    unburntAudio.playSave();

    this.waveBanner = {
      title: `WAVE ${this.endlessWave} CLEARED!`,
      sub: `+${waveBonus} Wave Bonus! Advancing to Wave ${this.endlessWave + 1}...`,
      timer: 120,
      maxTimer: 120
    };

    setTimeout(() => {
      this.waveTransition = false;
      if (this.state === 'PLAYING') {
        this.startEndlessWave(this.endlessWave + 1);
      }
    }, 2200);
  }

  updateEndlessMenuStats() {
    const hsEl = document.getElementById('endless-meta-highscore');
    const bwEl = document.getElementById('endless-meta-bestwave');
    if (hsEl) hsEl.innerText = this.endlessHighScore.toLocaleString();
    if (bwEl) bwEl.innerText = `Wave ${this.endlessBestWave}`;
  }

  // ─── Scroll Spawning ─────────────────────────────────────────────
  // Speed by word length with gentle scaling:
  // Shortest 2 tiers (<=3 and 4-5 letters) stay steady and only increase after Wave 5.
  // Other tiers (>5 letters) increase moderately each stage / wave.
  wordSpeed(word) {
    const len = word.replace(/[^a-zA-Z]/g, '').length;

    let waveProg = 0;
    let stageProg = 0;
    if (this.isEndlessMode) {
      waveProg = Math.max(0, (this.endlessWave || 1) - 1);
    } else {
      stageProg = (this.currentCategoryIndex || 0) * 0.5 + (this.currentStoryIndex || 0);
    }

    let spd;
    if (len <= 3) {
      // Tier 1 (<= 3 letters, e.g. "Ash", "Zik", "Oyo"):
      // Steady for Waves 1-5 / early stages; increases gently only after Wave 5 (+0.12/wave)
      const bonusWaves = this.isEndlessMode ? Math.max(0, (this.endlessWave || 1) - 5) : 0;
      spd = 2.15 + bonusWaves * 0.12;
    } else if (len <= 5) {
      // Tier 2 (4-5 letters, e.g. "Kano", "Bida", "Fire", "King"):
      // Steady for Waves 1-5 / early stages; increases gently only after Wave 5 (+0.08/wave)
      const bonusWaves = this.isEndlessMode ? Math.max(0, (this.endlessWave || 1) - 5) : 0;
      spd = 0.85 + bonusWaves * 0.08;
    } else if (len <= 7) {
      // Tier 3 (6-7 letters): increases smoothly after each stage / wave (+0.06/wave)
      const prog = this.isEndlessMode ? waveProg * 0.06 : stageProg * 0.05;
      spd = 0.45 + prog;
    } else if (len <= 9) {
      // Tier 4 (8-9 letters): increases smoothly after each stage / wave (+0.05/wave)
      const prog = this.isEndlessMode ? waveProg * 0.05 : stageProg * 0.04;
      spd = 0.40 + prog;
    } else {
      // Tier 5 (10+ letters): increases smoothly after each stage / wave (+0.04/wave)
      const prog = this.isEndlessMode ? waveProg * 0.04 : stageProg * 0.03;
      spd = 0.32 + prog;
    }

    return Math.max(0.15, spd);
  }

  spawnScroll() {
    if (this.wordQueue.length === 0) return;
    const word = this.wordQueue.pop();
    const speed = this.wordSpeed(word);

    // Power-up check
    let isPowerUp = false;
    if (this.isEndlessMode) {
      this.waveSpawnedCount = (this.waveSpawnedCount || 0) + 1;
      isPowerUp = Boolean(this.wavePowerUpIndices && this.wavePowerUpIndices.includes(this.waveSpawnedCount));
    } else {
      const spawnIndex = (this.totalSpawned || 0) + 1;
      this.totalSpawned = spawnIndex;
      isPowerUp = (spawnIndex === 7 || spawnIndex === 13);
    }

    const cx = this.width / 2, cy = this.getCenterY();
    const isMobile = this.width < 600 || window.innerWidth <= 850;
    const zoom = isMobile ? 0.76 : 1.0;
    const radius = (Math.max(this.width, this.height) / (2 * zoom)) + 80;
    const angle = Math.random() * Math.PI * 2;
    const sx = cx + Math.cos(angle) * radius;
    const sy = cy + Math.sin(angle) * radius;
    const dx = cx - sx, dy = cy - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.scrolls.push({
      word, speed,
      x: sx, y: sy,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      progress: 0,
      height: 48,
      rotation: Math.random() * 0.14 - 0.07,
      isSaved: false, isBurnt: false,
      fade: 1.0, burnProg: 0,
      isPowerUp
    });
  }

  // ─── Input Processing ───────────────────────────────────────────
  processKey(key) {
    if (this.state !== 'PLAYING') return;

    // ── Backspace: Delete progress ──
    if (key === 'Backspace') {
      if (this.typedBuffer.length > 0) {
        this.typedBuffer = this.typedBuffer.slice(0, -1);
        if (this.activeScroll) {
          this.activeScroll.progress = this.typedBuffer.length;
          if (this.typedBuffer.length === 0) this.activeScroll = null;
        }
        unburntAudio.playClick();
        this.updateBufferUI();
      }
      return;
    }

    // ── Enter Key: Cycle to next scroll sharing the same initial letter ──
    if (key === 'Enter') {
      if (!this.activeScroll || this.typedBuffer.length === 0) return;

      const firstLetter = this.typedBuffer[0].toLowerCase();
      const cx = this.width / 2, cy = this.getCenterY();

      // Find all eligible visible scrolls that share the initial letter
      const matchingScrolls = this.scrolls.filter(s =>
        this.isScrollVisible(s) &&
        s.word.toLowerCase().startsWith(firstLetter)
      );

      // Sort consistently: shorter word length first, then closer to fire
      matchingScrolls.sort((a, b) => {
        if (a.word.length !== b.word.length) {
          return a.word.length - b.word.length;
        }
        const distA = (a.x - cx) ** 2 + (a.y - cy) ** 2;
        const distB = (b.x - cx) ** 2 + (b.y - cy) ** 2;
        return distA - distB;
      });

      if (matchingScrolls.length > 1) {
        const curIdx = matchingScrolls.indexOf(this.activeScroll);
        const nextIdx = curIdx >= 0 ? (curIdx + 1) % matchingScrolls.length : 0;
        const nextScroll = matchingScrolls[nextIdx];

        // Reset progress on previous scroll
        if (this.activeScroll) {
          this.activeScroll.progress = 0;
        }

        // Calculate common prefix between current buffer and nextScroll.word
        let commonLen = 0;
        while (
          commonLen < this.typedBuffer.length &&
          commonLen < nextScroll.word.length &&
          this.typedBuffer[commonLen].toLowerCase() === nextScroll.word[commonLen].toLowerCase()
        ) {
          commonLen++;
        }
        if (commonLen === 0) commonLen = 1; // at least initial letter matches

        this.activeScroll = nextScroll;
        this.typedBuffer = this.typedBuffer.substring(0, commonLen);
        this.activeScroll.progress = commonLen;

        unburntAudio.playClick();
        this.updateBufferUI();
      }
      return;
    }

    if (key.length !== 1) return;
    this.totalKeystrokes++;

    const next = this.typedBuffer + key;

    if (!this.activeScroll) {
      // Find all eligible candidate scrolls matching the typed letter
      const cx = this.width / 2, cy = this.getCenterY();
      const candidates = this.scrolls.filter(s =>
        this.isScrollVisible(s) &&
        s.word.toLowerCase().startsWith(next.toLowerCase())
      );

      if (candidates.length > 0) {
        // Priority rule:
        // 1. Shorter word has more priority (e.g. "Ash" over "Aeroplane")
        // 2. Tie-breaker: closer to center fire
        candidates.sort((a, b) => {
          if (a.word.length !== b.word.length) {
            return a.word.length - b.word.length;
          }
          const distA = (a.x - cx) ** 2 + (a.y - cy) ** 2;
          const distB = (b.x - cx) ** 2 + (b.y - cy) ** 2;
          return distA - distB;
        });

        this.activeScroll = candidates[0];
        this.typedBuffer = next;
        this.activeScroll.progress = next.length;
        this.correctKeystrokes++;
        unburntAudio.playClick();
        this.updateBufferUI();
        this.checkCompletion();
      } else {
        this.triggerError();
      }
    } else {
      const expected = this.activeScroll.word[this.typedBuffer.length];
      if (expected && expected.toLowerCase() === key.toLowerCase()) {
        this.typedBuffer = next;
        this.activeScroll.progress = next.length;
        this.correctKeystrokes++;
        unburntAudio.playClick();
        this.updateBufferUI();
        this.checkCompletion();
      } else {
        this.triggerError();
      }
    }
  }

  // Legacy keydown wrapper
  handleKeyPress(e) {
    if (this.state !== 'PLAYING') return;
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    this.processKey(e.key);
    if (e.key === 'Backspace' || e.key === 'Enter') e.preventDefault();
  }

  checkCompletion() {
    if (!this.activeScroll) return;
    if (this.activeScroll.progress < this.activeScroll.word.length) return;

    const s = this.activeScroll;

    // ── Power-Up collected! ──
    if (s.isPowerUp) {
      s.isSaved = true;
      this.frozenUntil = Date.now() + 5000; // Freeze all scrolls for 5 seconds
      this.spawnExplosion(s.x, s.y, '#42a5f5', 35); // Blue explosion
      unburntAudio.playSave();
      this.typedBuffer = '';
      this.activeScroll = null;
      this.updateBufferUI();

      if (this.isEndlessMode) {
        this.waveSavedCount++;
        document.getElementById('hud-saved-val').innerText = `${this.waveSavedCount} / ${this.waveTargetCount}`;
        if (this.waveSavedCount >= this.waveTargetCount) {
          this.handleEndlessWaveCleared();
        }
      } else {
        this.savedCount++;
        document.getElementById('hud-saved-val').innerText = `${this.savedCount} / ${this.totalToSave}`;
      }
      return;
    }

    s.isSaved = true;

    const cx = this.width / 2, cy = this.getCenterY();
    const dist = Math.sqrt((s.x - cx) ** 2 + (s.y - cy) ** 2);
    const proximity = Math.max(1, 2 - dist / (this.width / 2));
    this.score += Math.round(s.word.length * 10 * proximity);

    if (this.isEndlessMode) {
      this.waveSavedCount++;
      if (this.score > this.endlessHighScore) {
        this.endlessHighScore = this.score;
        localStorage.setItem('unburnt_endless_highscore', this.endlessHighScore);
        const hsVal = document.getElementById('hud-highscore-val');
        if (hsVal) hsVal.innerText = this.endlessHighScore.toLocaleString();
      }
      document.getElementById('hud-score-val').innerText = this.score;
      document.getElementById('hud-saved-val').innerText = `${this.waveSavedCount} / ${this.waveTargetCount}`;
    } else {
      this.savedCount++;
      document.getElementById('hud-score-val').innerText = this.score;
      document.getElementById('hud-saved-val').innerText = `${this.savedCount} / ${this.totalToSave}`;
    }

    unburntAudio.playSave();
    this.spawnExplosion(s.x, s.y, '#ffd54f', 25);

    this.typedBuffer = '';
    this.activeScroll = null;
    this.updateBufferUI();

    if (this.isEndlessMode) {
      if (this.waveSavedCount >= this.waveTargetCount) {
        this.handleEndlessWaveCleared();
      }
    } else {
      if (this.savedCount === this.totalToSave) {
        // Mark level completed & unlock next level
        if (this.completedLevels[this.currentCategoryIndex]) {
          this.completedLevels[this.currentCategoryIndex][this.currentStoryIndex] = true;
          this.saveProgress('unburnt_complete', this.completedLevels);
        }
        if (this.unlockedLevels[this.currentCategoryIndex] && this.unlockedLevels[this.currentCategoryIndex][this.currentStoryIndex + 1] !== undefined) {
          this.unlockedLevels[this.currentCategoryIndex][this.currentStoryIndex + 1] = true;
          this.saveProgress('unburnt_unlocked', this.unlockedLevels);
        }

        setTimeout(() => this.switchState('STAGE_CLEARED'), 600);
      }
    }
  }

  triggerError() {
    const el = document.getElementById('typed-buffer');
    el.classList.add('error');
    setTimeout(() => el.classList.remove('error'), 150);
  }

  updateBufferUI() {
    const el = document.getElementById('typed-buffer');
    if (!el) return;

    if (this.activeScroll && this.typedBuffer.length > 0) {
      const word = this.activeScroll.word;
      const typed = word.substring(0, this.typedBuffer.length);
      const untyped = word.substring(this.typedBuffer.length);

      // Check if multiple visible scrolls share this initial letter
      const firstLetter = this.typedBuffer[0].toLowerCase();
      const candidateCount = this.scrolls.filter(s =>
        this.isScrollVisible(s) &&
        s.word.toLowerCase().startsWith(firstLetter)
      ).length;

      let hintHtml = '';
      if (candidateCount > 1) {
        hintHtml = `<span class="buf-hint">↵ switch</span>`;
      }

      let powerupPrefix = '';
      if (this.activeScroll.isPowerUp) {
        powerupPrefix = '<span style="margin-right:6px; color:#64b5f6;">❄</span>';
      }

      el.innerHTML = `${powerupPrefix}<span class="buf-typed">${typed}</span><span class="buf-untyped">${untyped}</span>${hintHtml}`;
      el.className = this.activeScroll.isPowerUp ? 'active buf-powerup' : 'active';
    } else if (this.typedBuffer.length > 0) {
      el.innerHTML = `<span class="buf-typed">${this.typedBuffer}</span>`;
      el.className = 'active';
    } else {
      el.innerHTML = '';
      el.className = '';
    }
  }

  triggerDamage() {
    this.lives--;
    this.updateHUDLives();
    const gc = document.getElementById('game-container');
    gc.classList.add('shake-screen');
    setTimeout(() => gc.classList.remove('shake-screen'), 400);
    if (this.lives <= 0) {
      setTimeout(() => this.showResult(false), 800);
    }
  }

  // ─── Particles ───────────────────────────────────────────────────
  spawnExplosion(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 1 + Math.random() * 4;
      this.particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
        radius: 1.5 + Math.random()*3, color, life: 1.0, decay: 0.02 + Math.random()*0.03 });
    }
  }

  spawnFireParticle() {
    const cx = this.width / 2, cy = this.getCenterY();
    const isMobile = this.width < 600 || window.innerWidth <= 850;
    const a = Math.random() * Math.PI * 2;
    const offset = (isMobile ? 5 : 18) + Math.random() * (isMobile ? 12 : 45); // Spread within fire pit area
    const r = Math.random();

    if (r < 0.25) {
      // Smoke puff: large, grey, slow, drifts up
      this.particles.push({
        type: 'smoke',
        x: cx + Math.cos(a) * offset, y: cy + Math.sin(a) * offset,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.5 - Math.random() * 0.8,
        radius: (14 + Math.random() * 20) * (isMobile ? 0.35 : 1.0),
        life: 1.0, decay: 0.007 + Math.random() * 0.008
      });
    } else if (r < 0.65) {
      // Flame tongue: teardrop shape, orange/yellow
      const hue = Math.random() < 0.5 ? '#ff6d00' : '#ffca28';
      this.particles.push({
        type: 'flame',
        x: cx + Math.cos(a) * (offset * 0.6), y: cy + Math.sin(a) * (offset * 0.6),
        vx: (Math.random() - 0.5) * 0.6,
        vy: -1.2 - Math.random() * 2.0,
        radius: (5 + Math.random() * 9) * (isMobile ? 0.35 : 1.0),
        color: hue,
        angle: Math.random() * Math.PI * 2,
        life: 1.0, decay: 0.022 + Math.random() * 0.018
      });
    } else {
      // Ember spark: tiny, bright, shoots outward
      const sparkColors = ['#ffea00', '#ff9100', '#ffffff', '#ff3d00'];
      this.particles.push({
        type: 'ember',
        x: cx + Math.cos(a) * offset * 0.8, y: cy + Math.sin(a) * offset * 0.8,
        vx: Math.cos(a) * (1.5 + Math.random() * 3),
        vy: Math.sin(a) * (1.5 + Math.random() * 3) - 1.5,
        radius: (1.5 + Math.random() * 2.5) * (isMobile ? 0.45 : 1.0),
        color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
        life: 1.0, decay: 0.03 + Math.random() * 0.04
      });
    }
  }

  // ─── Game Loop ───────────────────────────────────────────────────
  loop(ts) {
    const delta = ts - this.lastTime;
    this.lastTime = ts;
    if (this.state === 'PLAYING') this.update(delta);
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  }

  update(delta) {
    // Spawning logic: Every 2 seconds, spawn 3 more words (if not in wave transition)
    if (this.wordQueue.length > 0 && !this.waveTransition) {
      const now = Date.now();
      if (now - this.lastSpawnTime >= 2000) {
        const toSpawn = Math.min(3, this.wordQueue.length);
        for (let i = 0; i < toSpawn; i++) this.spawnScroll();
        this.lastSpawnTime = now;
      }
    }

    // Freeze effect — skip scroll movement while frozen
    const isFrozen = Date.now() < this.frozenUntil;
    const cx = this.width / 2, cy = this.getCenterY();
    const fireR = (this.width < 600 || window.innerWidth <= 850) ? 14 : 40; // scrolls reach the center before burning

    for (let i = this.scrolls.length - 1; i >= 0; i--) {
      const s = this.scrolls[i];

      if (s.isSaved) {
        s.y -= 2.0; s.fade -= 0.04;
        if (s.fade <= 0) this.scrolls.splice(i, 1);
        continue;
      }
      if (s.isBurnt) {
        s.fade -= 0.08; s.burnProg += 0.08;
        if (s.fade <= 0) this.scrolls.splice(i, 1);
        continue;
      }

      // Only move if not frozen (power-up scrolls are exempt from freeze)
      if (!isFrozen || s.isPowerUp) {
        s.x += s.vx; s.y += s.vy;
      }

      const dx = cx - s.x, dy = cy - s.y;
      if (Math.sqrt(dx*dx + dy*dy) < fireR) {
        s.isBurnt = true;
        unburntAudio.playBurn();
        this.spawnExplosion(s.x, s.y, '#e65100', 15);
        // Return word to queue so it comes back
        this.wordQueue.unshift(s.word);
        this.triggerDamage();
        if (this.activeScroll === s) {
          this.activeScroll = null;
          this.typedBuffer = '';
          this.updateBufferUI();
        }
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= p.decay;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Realistic ember + smoke particle spawning
    const fireFactor = 1 + (this.currentCategoryIndex * 0.3);
    for (let i = 0; i < Math.ceil(fireFactor * 1.5); i++) {
      if (Math.random() < 0.55) this.spawnFireParticle();
    }
  }

  // ─── Draw ────────────────────────────────────────────────────────
  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const cx = this.width / 2, cy = this.getCenterY();
    const isMobile = this.width < 600 || window.innerWidth <= 850;
    const zoom = isMobile ? 0.76 : 1.0;

    this.ctx.save();
    if (zoom !== 1.0) {
      this.ctx.translate(cx, cy);
      this.ctx.scale(zoom, zoom);
      this.ctx.translate(-cx, -cy);
    }

    this.drawCentralFire();
    if (this.state === 'PLAYING') {
      this.drawTargetLine();
      this.drawScrolls();
    }
    this.drawParticles();

    this.ctx.restore();

    // Wave banner drawn in screen coordinates so text remains crisp and unscaled
    if (this.state === 'PLAYING') {
      this.drawWaveBanner();
    }
  }

  drawCentralFire() {
    const cx = this.width / 2, cy = this.getCenterY();
    const isMobile = this.width < 600 || window.innerWidth <= 850;
    const fireDrawSize = isMobile ? 90 : 270; // 1/3 scale on mobile
    const rimRadius = isMobile ? 44 : 132;
    const fireRadius = isMobile ? 40 : 120;
    this.ctx.save();
    
    if (processedFire) {
      this.ctx.drawImage(processedFire, cx - fireDrawSize / 2, cy - fireDrawSize / 2, fireDrawSize, fireDrawSize);
    } else {
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, rimRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#3e2723';
      this.ctx.lineWidth = isMobile ? 6 : 18;
      this.ctx.stroke();

      const g = this.ctx.createRadialGradient(cx, cy, 3, cx, cy, fireRadius);
      g.addColorStop(0, '#ffff8d');
      g.addColorStop(0.3, '#ff9100');
      g.addColorStop(0.7, '#d84315');
      g.addColorStop(1, 'transparent');
      this.ctx.beginPath();
      this.ctx.arc(cx, cy, fireRadius, 0, Math.PI * 2);
      this.ctx.fillStyle = g;
      this.ctx.fill();
    }
    this.ctx.restore();
  }

  drawScrolls() {
    this.scrolls.forEach(s => {
      this.ctx.save();
      this.ctx.globalAlpha = s.fade;
      this.ctx.translate(s.x, s.y);
      this.ctx.rotate(s.rotation);

      this.ctx.font = 'bold 14px "Outfit", sans-serif';
      const textW = this.ctx.measureText(s.word).width;
      const cW = Math.max(110, textW + 36);
      const cH = s.height;

      // Shadow
      this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
      this.ctx.shadowBlur = 8;
      this.ctx.shadowOffsetY = 4;

      if (processedScroll) {
        this.ctx.drawImage(processedScroll, -cW/2 - 15, -cH/2 - 15, cW + 30, cH + 30);
        this.ctx.shadowColor = 'transparent';
      } else {
        // Parchment gradient
        const pg = this.ctx.createLinearGradient(-cW/2, 0, cW/2, 0);
        pg.addColorStop(0, '#c7a783');
        pg.addColorStop(0.15, '#e4cdb4');
        pg.addColorStop(0.5, '#f4e3d3');
        pg.addColorStop(0.85, '#e4cdb4');
        pg.addColorStop(1, '#c7a783');
        this.ctx.fillStyle = pg;
        this.ctx.fillRect(-cW/2, -cH/2, cW, cH);
        this.ctx.shadowColor = 'transparent';

        // Wooden handles
        this.ctx.fillStyle = '#5d4037';
        this.ctx.fillRect(-cW/2-8, -cH/2-4, 8, cH+8);
        this.ctx.fillRect(cW/2, -cH/2-4, 8, cH+8);
        this.ctx.fillStyle = '#8d6e63';
        [-cW/2-4, cW/2+4].forEach(hx => {
          [-cH/2, cH/2].forEach(hy => {
            this.ctx.beginPath();
            this.ctx.arc(hx, hy, 5, 0, Math.PI*2);
            this.ctx.fill();
          });
        });
        this.ctx.strokeStyle = '#8d6e63';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(-cW/2, -cH/2, cW, cH);
      }

      // Text — typed portion highlighted, rest dark
      this.ctx.textAlign = 'left';
      this.ctx.textBaseline = 'middle';
      const typed = s.word.substring(0, s.progress);
      const rest = s.word.substring(s.progress);
      const typedW = this.ctx.measureText(typed).width;
      const totalW = typedW + this.ctx.measureText(rest).width;
      let startX = -totalW/2;

      if (s.isPowerUp) {
        // Power-up: render blue glow border + blue text
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 200); // pulsing glow
        this.ctx.shadowColor = `rgba(66,165,245,${pulse})`;
        this.ctx.shadowBlur = 18;
        this.ctx.strokeStyle = `rgba(66,165,245,${pulse})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.strokeRect(-cW/2 - 2, -cH/2 - 2, cW + 4, cH + 4);
        this.ctx.shadowBlur = 0;

        // ❄ ice icon
        this.ctx.font = '12px sans-serif';
        this.ctx.fillText('❄', -cW/2 + 6, -cH/2 + 8);
        this.ctx.font = 'bold 14px "Outfit", sans-serif';

        if (s.progress > 0) {
          this.ctx.fillStyle = '#90caf9';
          this.ctx.fillText(typed, startX, 0);
        }
        this.ctx.fillStyle = '#1565c0';
        this.ctx.fillText(rest, startX + typedW, 0);
      } else {
        if (s.progress > 0) {
          this.ctx.fillStyle = '#e64a19';
          this.ctx.fillText(typed, startX, 0);
        }
        this.ctx.fillStyle = '#3e2723';
        this.ctx.fillText(rest, startX + typedW, 0);
      }

      // Active glow border & candidate indicators
      if (this.activeScroll === s) {
        const pulse = 0.8 + 0.2 * Math.sin(Date.now() / 150);
        this.ctx.strokeStyle = `rgba(255, 171, 0, ${pulse})`;
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#ff9100';
        this.ctx.shadowBlur = 14;
        this.ctx.strokeRect(-cW/2-2, -cH/2-2, cW+4, cH+4);
        this.ctx.shadowBlur = 0;
      } else if (
        this.activeScroll &&
        this.typedBuffer.length > 0 &&
        !s.isSaved && !s.isBurnt &&
        s.word.toLowerCase().startsWith(this.typedBuffer[0].toLowerCase())
      ) {
        // Alternative candidate starting with same letter — subtle dashed indicator
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(255, 193, 7, 0.5)';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([4, 4]);
        this.ctx.strokeRect(-cW/2-1, -cH/2-1, cW+2, cH+2);
        this.ctx.restore();
      }

      // Burn overlay
      if (s.isBurnt) {
        this.ctx.fillStyle = `rgba(33,33,33,${s.burnProg})`;
        this.ctx.fillRect(-cW/2, -cH/2, cW, cH);
      }

      this.ctx.restore();
    });
  }

  drawTargetLine() {
    if (!this.activeScroll) return;
    const cx = this.width / 2, cy = this.getCenterY();
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(cx, cy);
    this.ctx.lineTo(this.activeScroll.x, this.activeScroll.y);
    this.ctx.strokeStyle = 'rgba(255,87,34,0.25)';
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([4, 6]);
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawParticles() {
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.globalAlpha = p.life;

      if (p.type === 'smoke') {
        // Draw smoke as soft radial gradient circle
        const g = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        g.addColorStop(0, `rgba(80, 70, 65, ${p.life * 0.45})`);
        g.addColorStop(0.5, `rgba(60, 55, 50, ${p.life * 0.25})`);
        g.addColorStop(1, `rgba(40, 35, 30, 0)`);
        this.ctx.globalAlpha = 1;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = g;
        this.ctx.fill();

      } else if (p.type === 'flame') {
        // Draw flame as teardrop using bezier curves
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate(p.angle + performance.now() * 0.001);
        const r = p.radius;
        const g = this.ctx.createLinearGradient(0, -r * 1.8, 0, r * 0.8);
        g.addColorStop(0, 'rgba(255,255,150,0)');
        g.addColorStop(0.3, p.color);
        g.addColorStop(1, 'rgba(200,50,0,0.9)');
        this.ctx.beginPath();
        // Teardrop: start at bottom, curve up to tip
        this.ctx.moveTo(0, r * 0.8);
        this.ctx.bezierCurveTo(-r * 0.9, 0, -r * 0.6, -r * 1.2, 0, -r * 1.8);
        this.ctx.bezierCurveTo(r * 0.6, -r * 1.2, r * 0.9, 0, 0, r * 0.8);
        this.ctx.fillStyle = g;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 12;
        this.ctx.fill();

      } else if (p.type === 'ember') {
        // Draw ember as a bright glowing dot
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color;
        this.ctx.shadowColor = p.color;
        this.ctx.shadowBlur = 10;
        this.ctx.fill();

      } else {
        // Legacy fallback
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = p.color || '#ff6d00';
        this.ctx.fill();
      }

      this.ctx.restore();
    });
  }

  // ─── Wave Banner Drawer ──────────────────────────────────────────
  drawWaveBanner() {
    if (!this.waveBanner || this.waveBanner.timer <= 0) return;
    this.waveBanner.timer--;

    const b = this.waveBanner;
    const progress = b.timer / b.maxTimer;
    let alpha = 1.0;
    if (progress > 0.8) alpha = (1 - progress) / 0.2;
    else if (progress < 0.2) alpha = Math.max(0, progress / 0.2);

    const isMobile = this.width < 600 || window.innerWidth <= 850;
    const cx = this.width / 2;
    const cy = isMobile ? Math.max(52, Math.min(84, this.height * 0.14)) : this.height * 0.22;

    this.ctx.save();
    this.ctx.globalAlpha = Math.min(1, Math.max(0, alpha));

    this.ctx.font = '900 24px "Outfit", sans-serif';
    const titleW = this.ctx.measureText(b.title).width;
    this.ctx.font = '600 12px "Inter", sans-serif';
    const subW = this.ctx.measureText(b.sub).width;
    const boxW = Math.max(titleW, subW) + 50;
    const boxH = 66;

    this.ctx.fillStyle = 'rgba(18, 9, 5, 0.9)';
    this.ctx.strokeStyle = 'rgba(255, 193, 7, 0.6)';
    this.ctx.lineWidth = 1.5;
    this.ctx.shadowColor = 'rgba(255, 87, 34, 0.5)';
    this.ctx.shadowBlur = 16;

    this.ctx.beginPath();
    if (this.ctx.roundRect) {
      this.ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 8);
    } else {
      this.ctx.rect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    }
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.shadowBlur = 0;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.font = '900 22px "Outfit", sans-serif';
    this.ctx.fillStyle = '#ffc107';
    this.ctx.fillText(b.title, cx, cy - 11);

    this.ctx.font = '600 12px "Inter", sans-serif';
    this.ctx.fillStyle = '#f7f1eb';
    this.ctx.fillText(b.sub, cx, cy + 15);

    this.ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.gameEngine = new UnburntGame();
});
