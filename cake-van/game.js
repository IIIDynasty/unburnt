// Cake & Ice Cream Van - Core Game Logic & SVG Renderer

// Product configurations as requested
const PRODUCTS = {
  CAKE: 'cake',
  ICE_CREAM: 'ice_cream'
};

const FLAVORS = {
  // Cake flavors
  CHOCOLATE: 'chocolate',
  VANILLA: 'vanilla',
  // Ice cream flavors
  STRAWBERRY: 'strawberry'
};

const TOPPINGS = {
  // Cake toppings
  STRAWBERRY_TOPPING: 'strawberry',
  CHOCOLATE_TOPPING: 'chocolate',
  // Ice cream toppings
  CHOCO_SYRUP: 'chocolate_syrup',
  SPRINKLES: 'sprinkles',
  NONE: 'none'
};

// Customer definitions with character types
const CHARACTERS = [
  { id: 'bunny', name: 'Mia Bunny', color: '#FFF' },
  { id: 'bear', name: 'Ollie Bear', color: '#C48A54' },
  { id: 'cat', name: 'Luna Kitten', color: '#FFD3B6' },
  { id: 'boy', name: 'Sammy', color: '#FCE0D2' },
  { id: 'girl', name: 'Daisy', color: '#FCD5B5' },
  { id: 'fox', name: 'Felix Fox', color: '#FF9E64' }
];

class CakeVanGame {
  constructor() {
    this.totalMoney = 0;
    this.currentRound = 1;
    this.customerIndexInRound = 0;
    this.totalCustomersInRound = 3;
    
    // Round statistics
    this.roundServedCount = 0;
    this.roundLeftCount = 0;
    this.roundEarnedMoney = 0;

    // Current Customer State
    this.currentCustomer = null;
    this.customerTimer = null;
    this.timeRemaining = 0;
    this.maxTime = 28;

    // Player current creation
    this.currentCreation = {
      product: null,
      flavor: null,
      topping: null
    };

    // DOM references
    this.dom = {};
    this.initDOM();
    this.bindEvents();
    this.renderWorkbenchButtons();
    this.updateAssemblyVisual();
  }

  initDOM() {
    this.dom.app = document.getElementById('game-app');
    this.dom.hudRound = document.getElementById('hud-round-val');
    this.dom.hudMoney = document.getElementById('hud-money-val');
    this.dom.hudCustomerCount = document.getElementById('hud-customer-val');
    this.dom.hudMuteBtn = document.getElementById('btn-mute');
    this.dom.hudHelpBtn = document.getElementById('btn-help');

    // Customer / Stage
    this.dom.customerContainer = document.getElementById('customer-character-slot');
    this.dom.speechBubble = document.getElementById('speech-bubble');
    this.dom.speechTitle = document.getElementById('bubble-customer-greeting');
    this.dom.bubbleOrderPills = document.getElementById('bubble-order-items');
    this.dom.patienceFill = document.getElementById('patience-bar-fill');
    this.dom.patienceText = document.getElementById('patience-seconds-text');

    // Workbench
    this.dom.plateSlot = document.getElementById('plate-visual-slot');
    this.dom.assemblyName = document.getElementById('assembly-item-names');
    this.dom.btnTrash = document.getElementById('btn-trash');
    this.dom.btnServe = document.getElementById('btn-serve');

    // Panels
    this.dom.productButtons = document.querySelectorAll('.product-btn');
    this.dom.flavorOptionsGrid = document.getElementById('flavor-options-grid');
    this.dom.toppingOptionsGrid = document.getElementById('topping-options-grid');

    // Overlays
    this.dom.startScreen = document.getElementById('start-screen');
    this.dom.resultsScreen = document.getElementById('results-screen');
    this.dom.helpModal = document.getElementById('help-modal');
    this.dom.btnStartGame = document.getElementById('btn-start-game');
    this.dom.btnNextRound = document.getElementById('btn-next-round');
    this.dom.btnCloseHelp = document.getElementById('btn-close-help');

    // Results items
    this.dom.resultsTitle = document.getElementById('results-title');
    this.dom.resultsServed = document.getElementById('results-served-val');
    this.dom.resultsLeft = document.getElementById('results-left-val');
    this.dom.resultsMoney = document.getElementById('results-round-money');
    this.dom.resultsTotalMoney = document.getElementById('results-total-money');
    this.dom.starsContainer = document.getElementById('results-stars');
    this.dom.confettiCanvas = document.getElementById('confetti-canvas');
  }

  bindEvents() {
    // Sound & Help
    this.dom.hudMuteBtn.addEventListener('click', () => {
      const isMuted = window.soundCtrl.toggleMute();
      this.dom.hudMuteBtn.textContent = isMuted ? '🔇' : '🔊';
      this.dom.hudMuteBtn.title = isMuted ? 'Unmute Sound' : 'Mute Sound';
    });

    this.dom.hudHelpBtn.addEventListener('click', () => {
      window.soundCtrl.playPop();
      this.dom.helpModal.style.display = 'flex';
    });

    this.dom.btnCloseHelp.addEventListener('click', () => {
      window.soundCtrl.playPop();
      this.dom.helpModal.style.display = 'none';
    });

    // Start Game
    this.dom.btnStartGame.addEventListener('click', () => {
      window.soundCtrl.playPop();
      window.soundCtrl.startBGM();
      this.dom.startScreen.style.display = 'none';
      this.startRound(1);
    });

    // Next Round
    this.dom.btnNextRound.addEventListener('click', () => {
      window.soundCtrl.playPop();
      this.dom.resultsScreen.style.display = 'none';
      this.startRound(this.currentRound + 1);
    });

    // Product selector buttons (Cake vs Ice Cream)
    this.dom.productButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const prod = btn.dataset.product;
        this.selectProduct(prod);
      });
    });

    // Trash / Clear button
    this.dom.btnTrash.addEventListener('click', () => {
      window.soundCtrl.playClear();
      this.clearCreation();
    });

    // Serve button
    this.dom.btnServe.addEventListener('click', () => {
      this.serveCustomer();
    });
  }

  // Set Product and update available flavor & topping options
  selectProduct(product) {
    window.soundCtrl.playPop();
    this.currentCreation.product = product;
    // reset flavor & topping if changing product category
    this.currentCreation.flavor = null;
    this.currentCreation.topping = null;

    // Highlight active product button
    this.dom.productButtons.forEach(b => {
      b.classList.toggle('selected', b.dataset.product === product);
    });

    this.renderWorkbenchButtons();
    this.updateAssemblyVisual();
  }

  // Render dynamic flavors and toppings depending on cake vs ice cream
  renderWorkbenchButtons() {
    const prod = this.currentCreation.product;

    // Clear grids
    this.dom.flavorOptionsGrid.innerHTML = '';
    this.dom.toppingOptionsGrid.innerHTML = '';

    if (!prod) {
      this.dom.flavorOptionsGrid.innerHTML = '<div style="color:#A09193;font-size:0.9rem;padding:8px;">👈 Pick Cake or Ice Cream first!</div>';
      this.dom.toppingOptionsGrid.innerHTML = '<div style="color:#A09193;font-size:0.9rem;padding:8px;">👈 Pick Cake or Ice Cream first!</div>';
      return;
    }

    // 1. FLAVORS
    let flavorList = [];
    if (prod === PRODUCTS.CAKE) {
      flavorList = [
        { id: FLAVORS.CHOCOLATE, name: 'Chocolate Sponge', icon: '🍫' },
        { id: FLAVORS.VANILLA, name: 'Vanilla Sponge', icon: '🍰' }
      ];
    } else {
      flavorList = [
        { id: FLAVORS.VANILLA, name: 'Vanilla Scoop', icon: '🍦' },
        { id: FLAVORS.CHOCOLATE, name: 'Chocolate Scoop', icon: '🍫' },
        { id: FLAVORS.STRAWBERRY, name: 'Strawberry Scoop', icon: '🍓' }
      ];
    }

    flavorList.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `select-btn ${this.currentCreation.flavor === item.id ? 'selected' : ''}`;
      btn.innerHTML = `<span class="option-icon">${item.icon}</span> <span>${item.name}</span>`;
      btn.addEventListener('click', () => {
        window.soundCtrl.playPop();
        this.currentCreation.flavor = item.id;
        this.renderWorkbenchButtons();
        this.updateAssemblyVisual();
      });
      this.dom.flavorOptionsGrid.appendChild(btn);
    });

    // 2. TOPPINGS
    let toppingList = [];
    if (prod === PRODUCTS.CAKE) {
      toppingList = [
        { id: TOPPINGS.STRAWBERRY_TOPPING, name: 'Fresh Strawberries', icon: '🍓' },
        { id: TOPPINGS.CHOCOLATE_TOPPING, name: 'Chocolate Curls', icon: '🍫' },
        { id: TOPPINGS.NONE, name: 'Plain (No Topping)', icon: '✨' }
      ];
    } else {
      toppingList = [
        { id: TOPPINGS.CHOCO_SYRUP, name: 'Chocolate Syrup', icon: '🍫' },
        { id: TOPPINGS.SPRINKLES, name: 'Rainbow Sprinkles', icon: '🍬' },
        { id: TOPPINGS.NONE, name: 'Plain (No Topping)', icon: '✨' }
      ];
    }

    toppingList.forEach(item => {
      const btn = document.createElement('button');
      btn.className = `select-btn ${this.currentCreation.topping === item.id ? 'selected' : ''}`;
      btn.innerHTML = `<span class="option-icon">${item.icon}</span> <span>${item.name}</span>`;
      btn.addEventListener('click', () => {
        if (item.id === TOPPINGS.SPRINKLES) {
          window.soundCtrl.playSprinkle();
        } else {
          window.soundCtrl.playPop();
        }
        this.currentCreation.topping = item.id;
        this.renderWorkbenchButtons();
        this.updateAssemblyVisual();
      });
      this.dom.toppingOptionsGrid.appendChild(btn);
    });
  }

  clearCreation() {
    this.currentCreation.product = null;
    this.currentCreation.flavor = null;
    this.currentCreation.topping = null;
    this.dom.productButtons.forEach(b => b.classList.remove('selected'));
    this.renderWorkbenchButtons();
    this.updateAssemblyVisual();
  }

  // Update visual plate and enable/disable Serve button
  updateAssemblyVisual() {
    const { product, flavor, topping } = this.currentCreation;

    // Check if ready to serve: product and flavor are required.
    const canServe = Boolean(product && flavor);
    this.dom.btnServe.disabled = !canServe;

    // Build text summary
    if (!product) {
      this.dom.assemblyName.textContent = 'Empty Plate — Choose an item below!';
      this.dom.plateSlot.innerHTML = this.renderEmptyPlateSVG();
      return;
    }

    let summary = '';
    if (product === PRODUCTS.CAKE) {
      summary = flavor ? `${this.formatName(flavor)} Cake` : 'Cake Base';
    } else {
      summary = flavor ? `${this.formatName(flavor)} Ice Cream` : 'Ice Cream Cone';
    }

    if (topping && topping !== TOPPINGS.NONE) {
      summary += ` with ${this.formatName(topping)}`;
    } else if (topping === TOPPINGS.NONE) {
      summary += ' (Plain)';
    }

    this.dom.assemblyName.textContent = summary;
    this.dom.plateSlot.innerHTML = this.renderTreatSVG(product, flavor, topping);
  }

  formatName(key) {
    if (!key) return '';
    return key.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  // ══════════════ ROUND & CUSTOMER LOGIC ══════════════
  startRound(roundNumber) {
    this.currentRound = roundNumber;
    this.customerIndexInRound = 0;
    // Round 1: 3 customers (as required). Future rounds scale up gently
    this.totalCustomersInRound = 2 + roundNumber; // R1: 3, R2: 4, R3: 5...
    this.roundServedCount = 0;
    this.roundLeftCount = 0;
    this.roundEarnedMoney = 0;

    // Time allowed per customer (R1: 28s, R2: 25s, R3: 22s...)
    this.maxTime = Math.max(16, 30 - roundNumber * 2);

    this.dom.hudRound.textContent = `Round ${this.currentRound}`;
    this.dom.hudMoney.textContent = `$${this.totalMoney}`;

    this.nextCustomer();
  }

  nextCustomer() {
    if (this.customerIndexInRound >= this.totalCustomersInRound) {
      this.finishRound();
      return;
    }

    this.customerIndexInRound++;
    this.dom.hudCustomerCount.textContent = `${this.customerIndexInRound} of ${this.totalCustomersInRound}`;

    // Clear workbench for new customer
    this.clearCreation();

    // Generate random customer
    this.currentCustomer = this.generateRandomCustomer();

    // Render customer character & speech bubble
    this.renderCustomerVisual('normal');
    this.renderSpeechBubble();

    // Sound alert
    window.soundCtrl.playDoorbell();

    // Start patience timer
    this.timeRemaining = this.maxTime;
    this.updatePatienceBar();

    if (this.customerTimer) clearInterval(this.customerTimer);
    this.customerTimer = setInterval(() => {
      this.timeRemaining -= 0.5;
      this.updatePatienceBar();

      // Tick audio in danger zone
      if (this.timeRemaining <= 5 && this.timeRemaining > 0 && Math.floor(this.timeRemaining) === this.timeRemaining) {
        window.soundCtrl.playTick();
      }

      if (this.timeRemaining <= 0) {
        this.customerTimerExpired();
      }
    }, 500);
  }

  generateRandomCustomer() {
    const char = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    // Random product: Cake or Ice Cream
    const product = Math.random() < 0.5 ? PRODUCTS.CAKE : PRODUCTS.ICE_CREAM;

    let flavor = '';
    let topping = TOPPINGS.NONE;

    if (product === PRODUCTS.CAKE) {
      const cakeFlavors = [FLAVORS.CHOCOLATE, FLAVORS.VANILLA];
      flavor = cakeFlavors[Math.floor(Math.random() * cakeFlavors.length)];

      // 70% chance of wanting a topping, 30% plain
      if (Math.random() < 0.75) {
        const cakeToppings = [TOPPINGS.STRAWBERRY_TOPPING, TOPPINGS.CHOCOLATE_TOPPING];
        topping = cakeToppings[Math.floor(Math.random() * cakeToppings.length)];
      }
    } else {
      const iceFlavors = [FLAVORS.VANILLA, FLAVORS.CHOCOLATE, FLAVORS.STRAWBERRY];
      flavor = iceFlavors[Math.floor(Math.random() * iceFlavors.length)];

      if (Math.random() < 0.75) {
        const iceToppings = [TOPPINGS.CHOCO_SYRUP, TOPPINGS.SPRINKLES];
        topping = iceToppings[Math.floor(Math.random() * iceToppings.length)];
      }
    }

    return {
      character: char,
      order: {
        product: product,
        flavor: flavor,
        topping: topping
      }
    };
  }

  updatePatienceBar() {
    const pct = Math.max(0, Math.min(100, (this.timeRemaining / this.maxTime) * 100));
    this.dom.patienceFill.style.width = `${pct}%`;
    this.dom.patienceText.textContent = `${Math.ceil(Math.max(0, this.timeRemaining))}s`;

    this.dom.patienceFill.classList.remove('warning', 'danger');
    if (pct < 30) {
      this.dom.patienceFill.classList.add('danger');
    } else if (pct < 60) {
      this.dom.patienceFill.classList.add('warning');
    }
  }

  renderCustomerVisual(expression = 'normal') {
    const char = this.currentCustomer.character;
    this.dom.customerContainer.innerHTML = this.renderCustomerSVG(char.id, expression);
    this.dom.customerContainer.className = 'customer-character arriving';
    if (expression === 'happy') {
      this.dom.customerContainer.classList.add('happy');
    }
  }

  renderSpeechBubble() {
    const { character, order } = this.currentCustomer;
    this.dom.speechTitle.textContent = `${character.name} wants:`;
    this.dom.bubbleOrderPills.innerHTML = '';

    // Product & Flavor Pill
    const treatPill = document.createElement('span');
    treatPill.className = 'order-pill flavor-pill';
    const prodIcon = order.product === PRODUCTS.CAKE ? '🎂' : '🍦';
    treatPill.innerHTML = `${prodIcon} ${this.formatName(order.flavor)} ${this.formatName(order.product)}`;
    this.dom.bubbleOrderPills.appendChild(treatPill);

    // Topping Pill
    const topPill = document.createElement('span');
    topPill.className = 'order-pill topping-pill';
    if (order.topping && order.topping !== TOPPINGS.NONE) {
      const topIcon = (order.topping === TOPPINGS.STRAWBERRY_TOPPING || order.topping === TOPPINGS.STRAWBERRY) ? '🍓' :
                      (order.topping === TOPPINGS.SPRINKLES) ? '🍬' : '🍫';
      topPill.innerHTML = `+ ${topIcon} ${this.formatName(order.topping)}`;
    } else {
      topPill.innerHTML = `✨ Plain (No Topping)`;
    }
    this.dom.bubbleOrderPills.appendChild(topPill);
  }

  // ══════════════ SERVING & MATCHING ══════════════
  serveCustomer() {
    if (!this.currentCustomer) return;

    const requested = this.currentCustomer.order;
    const served = this.currentCreation;

    // Check product match
    const prodMatch = requested.product === served.product;
    // Check flavor match
    const flavorMatch = requested.flavor === served.flavor;
    // Check topping match (note: null or 'none' both count as plain)
    const reqTop = requested.topping || TOPPINGS.NONE;
    const servedTop = served.topping || TOPPINGS.NONE;
    const toppingMatch = reqTop === servedTop;

    if (prodMatch && flavorMatch && toppingMatch) {
      // 🌟 ORDER CORRECT!
      this.orderSucceeded();
    } else {
      // ❌ ORDER INCORRECT!
      this.orderFailed();
    }
  }

  orderSucceeded() {
    if (this.customerTimer) clearInterval(this.customerTimer);

    window.soundCtrl.playSuccess();
    this.renderCustomerVisual('happy');

    // Base payout: $10
    let earned = 10;
    let hasSpeedBonus = false;

    // Speed bonus if served in the first half of max time
    if (this.timeRemaining >= this.maxTime * 0.45) {
      const bonus = 5;
      earned += bonus;
      hasSpeedBonus = true;
    }

    this.totalMoney += earned;
    this.roundEarnedMoney += earned;
    this.roundServedCount++;

    this.dom.hudMoney.textContent = `$${this.totalMoney}`;

    // Floating text feedback
    this.showFloatingMessage(`+$${earned}! Yum! 💖`, 'success', 0);
    if (hasSpeedBonus) {
      setTimeout(() => {
        this.showFloatingMessage(`⚡ Fast Service Bonus! +$5`, 'bonus', -30);
      }, 300);
    }

    // Customer walks away happily after 1.4s
    setTimeout(() => {
      this.dom.customerContainer.className = 'customer-character leaving';
      setTimeout(() => {
        this.nextCustomer();
      }, 500);
    }, 1200);
  }

  orderFailed() {
    window.soundCtrl.playError();
    this.renderCustomerVisual('sad');

    // Shake workbench plate to signal error
    this.dom.plateSlot.classList.add('shake-anim');
    setTimeout(() => {
      this.dom.plateSlot.classList.remove('shake-anim');
      if (this.timeRemaining > 0) {
        this.renderCustomerVisual('normal');
      }
    }, 800);

    this.showFloatingMessage("Oops! That's not my order! 🤔", 'wrong', 0);
    // Customer patience keeps running so kid can fix it!
  }

  customerTimerExpired() {
    if (this.customerTimer) clearInterval(this.customerTimer);

    window.soundCtrl.playCustomerSad();
    this.renderCustomerVisual('sad');
    this.roundLeftCount++;

    this.showFloatingMessage("Too slow! I'm leaving... 😢", 'wrong', 0);

    setTimeout(() => {
      this.dom.customerContainer.className = 'customer-character leaving';
      setTimeout(() => {
        this.nextCustomer();
      }, 500);
    }, 1200);
  }

  showFloatingMessage(text, type = 'success', offsetTop = 0) {
    const el = document.createElement('div');
    el.className = `floating-message ${type}`;
    el.textContent = text;
    el.style.left = '42%';
    el.style.top = `${180 + offsetTop}px`;

    this.dom.app.appendChild(el);
    setTimeout(() => {
      el.remove();
    }, 1300);
  }

  // ══════════════ ROUND RESULTS ══════════════
  finishRound() {
    if (this.customerTimer) clearInterval(this.customerTimer);

    window.soundCtrl.playRoundComplete();

    // Populate modal stats
    this.dom.resultsTitle.textContent = `Round ${this.currentRound} Complete! 🎉`;
    this.dom.resultsServed.textContent = `${this.roundServedCount} of ${this.totalCustomersInRound}`;
    this.dom.resultsLeft.textContent = `${this.roundLeftCount}`;
    this.dom.resultsMoney.textContent = `+$${this.roundEarnedMoney}`;
    this.dom.resultsTotalMoney.textContent = `$${this.totalMoney}`;

    // Star calculation
    const successRatio = this.roundServedCount / this.totalCustomersInRound;
    let starsEarned = 1;
    if (successRatio === 1) {
      starsEarned = 3;
    } else if (successRatio >= 0.6) {
      starsEarned = 2;
    }

    const starSpans = this.dom.starsContainer.querySelectorAll('.star-icon');
    starSpans.forEach((s, idx) => {
      s.classList.toggle('earned', idx < starsEarned);
    });

    // Launch celebratory confetti
    this.triggerConfetti();

    this.dom.resultsScreen.style.display = 'flex';
  }

  triggerConfetti() {
    const canvas = this.dom.confettiCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const colors = ['#FF6584', '#FFD166', '#06D6A0', '#70D6FF', '#FF9F1C', '#FFFFFF'];

    for (let i = 0; i < 70; i++) {
      particles.push({
        x: canvas.width * 0.5,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.7) * 14,
        size: Math.random() * 8 + 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        spin: (Math.random() - 0.5) * 10
      });
    }

    let frames = 0;
    const animate = () => {
      if (frames > 120) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }
      frames++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35; // gravity
        p.rotation += p.spin;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  // ══════════════ CUTE SVG GRAPHICS GENERATORS ══════════════

  renderEmptyPlateSVG() {
    return `
      <svg class="plate-svg" viewBox="0 0 100 100">
        <ellipse cx="50" cy="72" rx="42" ry="16" fill="#E8DED8"/>
        <ellipse cx="50" cy="70" rx="40" ry="14" fill="#FFFFFF" stroke="#FFCCD5" stroke-width="3"/>
        <ellipse cx="50" cy="70" rx="30" ry="9" fill="#FFF5F7"/>
        <text x="50" y="50" text-anchor="middle" font-size="28" fill="#D8C7C9">✨</text>
      </svg>
    `;
  }

  renderTreatSVG(product, flavor, topping) {
    if (product === PRODUCTS.ICE_CREAM) {
      // Ice Cream SVG
      let scoopColor = '#FFF9E6'; // Vanilla default
      if (flavor === FLAVORS.CHOCOLATE) scoopColor = '#5D4037';
      if (flavor === FLAVORS.STRAWBERRY) scoopColor = '#FF85A2';

      let toppingSVG = '';
      if (topping === TOPPINGS.CHOCO_SYRUP) {
        toppingSVG = `
          <!-- Glossy chocolate drip -->
          <path d="M28,42 C32,46 36,44 40,48 C44,45 48,46 52,43 C56,47 62,45 68,49 C72,43 74,38 72,34 C68,26 58,22 50,22 C42,22 32,26 28,34 Z" fill="#3E2723"/>
          <path d="M34,42 C34,48 37,50 37,44" stroke="#3E2723" stroke-width="4" stroke-linecap="round"/>
          <path d="M52,43 C52,52 56,53 56,46" stroke="#3E2723" stroke-width="4" stroke-linecap="round"/>
        `;
      } else if (topping === TOPPINGS.SPRINKLES) {
        toppingSVG = `
          <!-- Rainbow sprinkles -->
          <line x1="38" y1="30" x2="44" y2="33" stroke="#FF3366" stroke-width="3" stroke-linecap="round"/>
          <line x1="48" y1="26" x2="54" y2="28" stroke="#00D2D3" stroke-width="3" stroke-linecap="round"/>
          <line x1="58" y1="32" x2="64" y2="30" stroke="#FFD166" stroke-width="3" stroke-linecap="round"/>
          <line x1="42" y1="40" x2="48" y2="43" stroke="#9B51E0" stroke-width="3" stroke-linecap="round"/>
          <line x1="56" y1="41" x2="62" y2="39" stroke="#FF9F1C" stroke-width="3" stroke-linecap="round"/>
        `;
      }

      const scoopVisible = Boolean(flavor);

      return `
        <svg class="plate-svg" viewBox="0 0 100 100">
          <!-- Cone shadow & stand -->
          <ellipse cx="50" cy="90" rx="36" ry="7" fill="#E8DED8"/>
          
          <!-- Waffle Cone -->
          <polygon points="34,55 66,55 50,90" fill="#E0A96D" stroke="#C4884B" stroke-width="2"/>
          <path d="M38,62 L62,62 M42,70 L58,70 M46,78 L54,78" stroke="#C4884B" stroke-width="1.5"/>
          <path d="M40,56 L55,87 M60,56 L45,87" stroke="#BA7B3C" stroke-width="1.2" opacity="0.6"/>

          <!-- Scoop if flavor picked -->
          ${scoopVisible ? `
            <ellipse cx="50" cy="54" rx="20" ry="7" fill="${scoopColor}" opacity="0.9"/>
            <circle cx="50" cy="38" r="18" fill="${scoopColor}"/>
            <!-- Highlight shine -->
            <ellipse cx="44" cy="30" rx="6" ry="3" fill="#FFFFFF" opacity="0.45" transform="rotate(-25 44 30)"/>
            <!-- Topping overlay -->
            ${toppingSVG}
          ` : `
            <circle cx="50" cy="38" r="16" fill="none" stroke="#D3B8B8" stroke-dasharray="3,3" stroke-width="2"/>
            <text x="50" y="43" text-anchor="middle" font-size="16" fill="#B09999">?</text>
          `}
        </svg>
      `;
    } else {
      // Cake SVG
      let spongeColor = '#FFE8A3'; // Vanilla default
      let icingColor = '#FF8DA1'; // Strawberry icing
      if (flavor === FLAVORS.CHOCOLATE) {
        spongeColor = '#5D4037';
        icingColor = '#8D6E63';
      }

      let toppingSVG = '';
      if (topping === TOPPINGS.STRAWBERRY_TOPPING) {
        toppingSVG = `
          <!-- Fresh strawberries on top -->
          <g transform="translate(38, 22)">
            <path d="M0,8 C-4,2 0,-4 6,0 C12,-4 16,2 12,8 C9,13 3,13 0,8 Z" fill="#FF3366"/>
            <path d="M4,1 L6,-2 L8,1 Z" fill="#2ECC71"/>
            <circle cx="4" cy="6" r="0.7" fill="#FFF"/>
            <circle cx="7" cy="4" r="0.7" fill="#FFF"/>
          </g>
          <g transform="translate(52, 24) scale(0.85)">
            <path d="M0,8 C-4,2 0,-4 6,0 C12,-4 16,2 12,8 C9,13 3,13 0,8 Z" fill="#FF3366"/>
            <path d="M4,1 L6,-2 L8,1 Z" fill="#2ECC71"/>
          </g>
        `;
      } else if (topping === TOPPINGS.CHOCOLATE_TOPPING) {
        toppingSVG = `
          <!-- Chocolate drizzle & curls -->
          <path d="M30,36 C35,33 42,38 48,34 C54,38 60,33 70,36" stroke="#3E2723" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="42" cy="31" r="3" fill="#3E2723"/>
          <circle cx="58" cy="30" r="3.5" fill="#3E2723"/>
        `;
      }

      const cakeVisible = Boolean(flavor);

      return `
        <svg class="plate-svg" viewBox="0 0 100 100">
          <!-- Cake Plate -->
          <ellipse cx="50" cy="80" rx="42" ry="14" fill="#EAE0DC"/>
          <ellipse cx="50" cy="78" rx="39" ry="12" fill="#FFFFFF" stroke="#FFCCD5" stroke-width="2.5"/>

          ${cakeVisible ? `
            <!-- Lower Sponge Layer -->
            <path d="M25,58 C25,58 25,72 50,72 C75,72 75,58 75,58 L75,50 C75,50 75,58 50,58 C25,58 25,50 25,50 Z" fill="${spongeColor}"/>
            
            <!-- Cream Middle Layer -->
            <path d="M25,52 C25,52 25,56 50,56 C75,56 75,52 75,52 L75,48 C75,48 75,52 50,52 C25,52 25,48 25,48 Z" fill="#FFF9F0"/>
            
            <!-- Upper Sponge Layer -->
            <path d="M25,48 C25,48 25,54 50,54 C75,54 75,48 75,48 L75,40 C75,40 75,46 50,46 C25,46 25,40 25,40 Z" fill="${spongeColor}"/>

            <!-- Top Frosting -->
            <ellipse cx="50" cy="40" rx="25" ry="9" fill="${icingColor}"/>
            
            <!-- Topping overlay -->
            ${toppingSVG}
          ` : `
            <rect x="30" y="45" width="40" height="25" rx="6" fill="none" stroke="#D3B8B8" stroke-dasharray="3,3" stroke-width="2"/>
            <text x="50" y="62" text-anchor="middle" font-size="16" fill="#B09999">?</text>
          `}
        </svg>
      `;
    }
  }

  renderCustomerSVG(charId, expression = 'normal') {
    // Face expressions
    let mouthSVG = '<path d="M44,66 Q50,72 56,66" stroke="#4A3B32" stroke-width="3" fill="none" stroke-linecap="round"/>';
    let eyeLeftSVG = '<circle cx="40" cy="52" r="4.5" fill="#332219"/><circle cx="42" cy="50" r="1.5" fill="#FFF"/>';
    let eyeRightSVG = '<circle cx="60" cy="52" r="4.5" fill="#332219"/><circle cx="62" cy="50" r="1.5" fill="#FFF"/>';
    let blushSVG = '<ellipse cx="33" cy="60" rx="5" ry="3" fill="#FF85A2" opacity="0.6"/><ellipse cx="67" cy="60" rx="5" ry="3" fill="#FF85A2" opacity="0.6"/>';
    let extraSVG = '';

    if (expression === 'happy') {
      mouthSVG = '<path d="M42,64 Q50,78 58,64 Z" fill="#FF5376" stroke="#4A3B32" stroke-width="2.5"/><ellipse cx="50" cy="72" rx="4" ry="2" fill="#FFAEC0"/>';
      eyeLeftSVG = '<path d="M36,53 Q41,47 46,53" stroke="#332219" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
      eyeRightSVG = '<path d="M54,53 Q59,47 64,53" stroke="#332219" stroke-width="3.5" fill="none" stroke-linecap="round"/>';
      extraSVG = '<text x="18" y="32" font-size="16">💖</text><text x="74" y="30" font-size="16">✨</text>';
    } else if (expression === 'sad') {
      mouthSVG = '<path d="M43,70 Q50,62 57,70" stroke="#4A3B32" stroke-width="3" fill="none" stroke-linecap="round"/>';
      eyeLeftSVG = '<circle cx="40" cy="54" r="4" fill="#332219"/>';
      eyeRightSVG = '<circle cx="60" cy="54" r="4" fill="#332219"/>';
      extraSVG = '<ellipse cx="67" cy="62" rx="2.5" ry="4" fill="#70D6FF" opacity="0.85"/>';
    }

    if (charId === 'bunny') {
      return `
        <svg viewBox="0 0 100 110" style="width:100%;height:100%;">
          <!-- Bunny Ears -->
          <ellipse cx="38" cy="24" rx="8" ry="22" fill="#FFFFFF" stroke="#E5DCD8" stroke-width="2"/>
          <ellipse cx="38" cy="24" rx="4.5" ry="16" fill="#FFAEC0"/>
          <ellipse cx="62" cy="24" rx="8" ry="22" fill="#FFFFFF" stroke="#E5DCD8" stroke-width="2"/>
          <ellipse cx="62" cy="24" rx="4.5" ry="16" fill="#FFAEC0"/>
          
          <!-- Bunny Head -->
          <ellipse cx="50" cy="60" rx="26" ry="24" fill="#FFFFFF" stroke="#E5DCD8" stroke-width="2"/>
          <!-- Little nose -->
          <polygon points="48,60 52,60 50,63" fill="#FF8DA1"/>
          ${blushSVG}
          ${eyeLeftSVG}
          ${eyeRightSVG}
          ${mouthSVG}
          ${extraSVG}
        </svg>
      `;
    } else if (charId === 'bear') {
      return `
        <svg viewBox="0 0 100 110" style="width:100%;height:100%;">
          <!-- Bear Ears -->
          <circle cx="30" cy="38" r="12" fill="#C48A54" stroke="#9E6B3B" stroke-width="2"/>
          <circle cx="30" cy="38" r="6" fill="#FFD3B6"/>
          <circle cx="70" cy="38" r="12" fill="#C48A54" stroke="#9E6B3B" stroke-width="2"/>
          <circle cx="70" cy="38" r="6" fill="#FFD3B6"/>

          <!-- Bear Head -->
          <circle cx="50" cy="60" r="26" fill="#C48A54" stroke="#9E6B3B" stroke-width="2"/>
          <ellipse cx="50" cy="65" rx="13" ry="10" fill="#FFD3B6"/>
          <ellipse cx="50" cy="61" rx="4.5" ry="3" fill="#332219"/>
          ${blushSVG}
          ${eyeLeftSVG}
          ${eyeRightSVG}
          ${mouthSVG}
          ${extraSVG}
        </svg>
      `;
    } else if (charId === 'cat') {
      return `
        <svg viewBox="0 0 100 110" style="width:100%;height:100%;">
          <!-- Cat Ears -->
          <polygon points="26,45 36,25 46,45" fill="#FFD3B6" stroke="#E29578" stroke-width="2"/>
          <polygon points="30,42 36,30 42,42" fill="#FF85A2"/>
          <polygon points="54,45 64,25 74,45" fill="#FFD3B6" stroke="#E29578" stroke-width="2"/>
          <polygon points="58,42 64,30 70,42" fill="#FF85A2"/>

          <!-- Cat Head -->
          <ellipse cx="50" cy="60" rx="25" ry="22" fill="#FFD3B6" stroke="#E29578" stroke-width="2"/>
          <!-- Nose & Whiskers -->
          <polygon points="48,60 52,60 50,63" fill="#FF85A2"/>
          <line x1="28" y1="62" x2="18" y2="60" stroke="#8D6E63" stroke-width="1.5"/>
          <line x1="28" y1="65" x2="18" y2="67" stroke="#8D6E63" stroke-width="1.5"/>
          <line x1="72" y1="62" x2="82" y2="60" stroke="#8D6E63" stroke-width="1.5"/>
          <line x1="72" y1="65" x2="82" y2="67" stroke="#8D6E63" stroke-width="1.5"/>
          ${blushSVG}
          ${eyeLeftSVG}
          ${eyeRightSVG}
          ${mouthSVG}
          ${extraSVG}
        </svg>
      `;
    } else if (charId === 'fox') {
      return `
        <svg viewBox="0 0 100 110" style="width:100%;height:100%;">
          <!-- Fox Ears -->
          <polygon points="25,48 34,22 46,48" fill="#FF9E64" stroke="#D35400" stroke-width="2"/>
          <polygon points="29,44 34,28 42,44" fill="#FFFFFF"/>
          <polygon points="54,48 66,22 75,48" fill="#FF9E64" stroke="#D35400" stroke-width="2"/>
          <polygon points="58,44 66,28 71,44" fill="#FFFFFF"/>

          <!-- Fox Head -->
          <ellipse cx="50" cy="60" rx="25" ry="22" fill="#FF9E64" stroke="#D35400" stroke-width="2"/>
          <!-- White muzzle cheeks -->
          <path d="M28,64 Q38,76 50,74 Q62,76 72,64 Q50,60 28,64 Z" fill="#FFFFFF"/>
          <circle cx="50" cy="67" r="3" fill="#2C3E50"/>
          ${blushSVG}
          ${eyeLeftSVG}
          ${eyeRightSVG}
          ${mouthSVG}
          ${extraSVG}
        </svg>
      `;
    } else if (charId === 'boy') {
      return `
        <svg viewBox="0 0 100 110" style="width:100%;height:100%;">
          <!-- Hair & Cap -->
          <circle cx="50" cy="58" r="24" fill="#FCE0D2"/>
          <path d="M26,50 Q50,30 74,50" fill="#6D4C41"/>
          <!-- Blue baseball cap -->
          <path d="M26,50 C26,32 74,32 74,50 Z" fill="#3498DB" stroke="#2980B9" stroke-width="2"/>
          <path d="M68,46 Q84,46 88,52 L68,52 Z" fill="#2980B9"/>
          ${blushSVG}
          ${eyeLeftSVG}
          ${eyeRightSVG}
          ${mouthSVG}
          ${extraSVG}
        </svg>
      `;
    } else {
      // Girl with pigtails
      return `
        <svg viewBox="0 0 100 110" style="width:100%;height:100%;">
          <!-- Pigtails -->
          <circle cx="22" cy="48" r="10" fill="#FF7043"/>
          <circle cx="22" cy="48" r="3" fill="#FFD166"/>
          <circle cx="78" cy="48" r="10" fill="#FF7043"/>
          <circle cx="78" cy="48" r="3" fill="#FFD166"/>

          <!-- Head -->
          <circle cx="50" cy="58" r="24" fill="#FCD5B5"/>
          <!-- Bangs / Hair -->
          <path d="M26,50 Q36,36 50,42 Q64,36 74,50 C68,36 32,36 26,50 Z" fill="#FF7043"/>
          <!-- Pink Bow -->
          <path d="M46,36 L54,42 M54,36 L46,42" stroke="#FF4081" stroke-width="4" stroke-linecap="round"/>
          ${blushSVG}
          ${eyeLeftSVG}
          ${eyeRightSVG}
          ${mouthSVG}
          ${extraSVG}
        </svg>
      `;
    }
  }
}

// Instantiate game after DOM loads
window.addEventListener('DOMContentLoaded', () => {
  window.game = new CakeVanGame();
});
