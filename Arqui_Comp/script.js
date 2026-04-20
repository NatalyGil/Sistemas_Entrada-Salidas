// =============================================
// IO Systems 2026 - Arquitectura Modular
// =============================================
// Paradigmas: Programación funcional, Defensive Programming,
//              Separación de responsabilidades, Inmutabilidad
// =============================================

'use strict';

(() => {
  // =============================================
  // 0. CONSTANTES Y CONFIGURACIÓN CENTRALIZADA
  // =============================================

  const COLORS = Object.freeze({
    primary: '#ffffff',
    blue: '#3b82f6',
    purple: '#a855f7',
    green: '#22c55e',
    orange: '#fb923c',
    yellow: '#eab308',
    red: '#ef4444',
    cyan: '#06b6d4',
    slate: '#64748b',
    bgDark: '#0f172a',
    bgDarker: '#0c1222',
    textPrimary: '#f1f5f9',
    textSecondary: '#e2e8f0',
    textMuted: '#94a3b8',
  });

  const DOM = Object.freeze({
    backgroundCanvas: 'backgroundCanvas',
    timeline: 'timeline-canvas',
    inputSim: 'input-simulador',
    btnStart: 'btn-iniciar-cpu',
    btnStop: 'btn-detener-cpu',
    btnKey: 'btn-simular-tecla',
    cpuState: 'cpu-state-indicator',
    cpuStatus: 'cpu-status-text',
    eventIndicator: 'event-indicator',
    mainProgress: 'main-progress',
    levelIndicator: 'level-indicator',
    dmaCanvas: 'dma-canvas',
    dmaResult: 'dma-result',
    dmaBlocks: 'dma-blocks',
    dmaCycles: 'dma-cycles',
    dmaTime: 'dma-time',
    dmaCpuLoad: 'dma-cpu-load',
    dmaModeIndicator: 'dma-mode-indicator',
    btnDmaCpu: 'btn-dma-cpu',
    btnDmaDma: 'btn-dma-dma',
    archCanvas: 'architecture-canvas',
    busInfoPanel: 'bus-info-panel',
    quizCounter: 'quiz-counter',
    quizPregunta: 'pregunta',
    quizOpciones: 'opciones',
    quizContent: 'quiz-content',
    quizResult: 'quiz-result',
    quizScore: 'puntuacion-final',
  });

  const LEVELS = Object.freeze(['intro', 'interrupciones', 'dma', 'buses', 'avances', 'quiz', 'ia']);

  // =============================================
  // 1. UTILIDADES PURAS (Helpers)
  // =============================================

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => document.querySelectorAll(sel);
  const noop = () => {};

  const safely = (fn, fallback = null) => {
    try { return fn(); }
    catch (err) { console.warn('[Safe]', err.message); return fallback; }
  };

  const getCtx = (canvas) => safely(() => canvas?.getContext('2d'), null);

  const setEnabled = (id, enabled) => {
    const el = $(id);
    if (!el) return;
    el.disabled = !enabled;
    el.classList.toggle('opacity-50', !enabled);
    el.classList.toggle('cursor-not-allowed', !enabled);
  };

  const setHTML = (id, html) => {
    const el = $(id);
    if (el) el.innerHTML = html;
  };

  const setText = (id, text) => {
    const el = $(id);
    if (el) el.textContent = text;
  };

  const addClass = (id, ...cls) => $(id)?.classList.add(...cls);
  const removeClass = (id, ...cls) => $(id)?.classList.remove(...cls);
  const toggleClass = (id, cls, on) => $(id)?.classList.toggle(cls, on);

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  // Canvas helpers puros
  const clearCanvas = (ctx, w, h, color = COLORS.bgDark) => {
    if (!ctx) return;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
  };

  const drawRoundedRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const drawCircle = (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  };

  const setFont = (ctx, { size = 12, bold = false, family = '"Segoe UI", Arial, sans-serif' } = {}) => {
    ctx.font = `${bold ? 'bold ' : ''}${size}px ${family}`;
  };

  const setTextAlign = (ctx, align = 'center', baseline = 'middle') => {
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
  };

  const drawLine = (ctx, x1, y1, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  };

  const drawBezier = (ctx, x1, y1, cx1, cy1, cx2, cy2, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    ctx.stroke();
  };

  // =============================================
  // 2. VISIBILITY MANAGER
  // =============================================

  const visibilityManager = (() => {
    const observers = new Map();
    const activeModules = new Set();

    const observe = (elementId, { onVisible = noop, onHidden = noop } = {}) => {
      if (!elementId || observers.has(elementId)) return;
      const element = $(elementId);
      if (!element) return;

      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          onVisible();
          activeModules.add(elementId);
        } else {
          onHidden();
          activeModules.delete(elementId);
        }
      }, { threshold: 0.1 });

      observer.observe(element);
      observers.set(elementId, observer);
    };

    return Object.freeze({ observe });
  })();

  // =============================================
  // 3. FONDO DE PARTÍCULAS
  // =============================================

  function createMovingBackground() {
    const canvas = $(DOM.backgroundCanvas);
    if (!canvas) return;
    const ctx = getCtx(canvas);
    if (!ctx) return;

    let particles = [];
    let running = false;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const createParticle = (w, h) => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2 + 1,
      speedX: (Math.random() - 0.5) * 0.8,
      speedY: (Math.random() - 0.5) * 0.8,
      color: `rgba(${100 + Math.floor(Math.random() * 100)}, 180, 255, ${0.1 + Math.random() * 0.5})`,
    });

    const updateParticle = (p, w, h) => {
      p.x += p.speedX;
      p.y += p.speedY;
      if (p.x < 0 || p.x > w) p.speedX *= -1;
      if (p.y < 0 || p.y > h) p.speedY *= -1;
    };

    const drawParticle = (p) => {
      ctx.fillStyle = p.color;
      drawCircle(ctx, p.x, p.y, p.size);
      ctx.fill();
    };

        const drawConnections = (items, maxDistance = 120) => {
      ctx.save();
      ctx.lineWidth = 1;
      for (let i = 0; i < items.length; i++) {
        for (let j = i + 1; j < items.length; j++) {
          const a = items[i];
          const b = items[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.hypot(dx, dy);
          if (dist > maxDistance) continue;
          const alpha = 1 - dist / maxDistance;
          ctx.strokeStyle = `rgba(170, 200, 255, ${alpha * 0.25})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.restore();
    };

    particles = Array.from({ length: 200 }, () => createParticle(canvas.width, canvas.height));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        updateParticle(p, canvas.width, canvas.height);
        drawParticle(p);
      });
      drawConnections(particles, 150);
      if (running) requestAnimationFrame(animate);
    };

    visibilityManager.observe(DOM.backgroundCanvas, {
      onVisible: () => { running = true; window.addEventListener('resize', resize); animate(); },
      onHidden: () => { running = false; window.removeEventListener('resize', resize); },
    });
  }

  // =============================================
  // 4. SISTEMA DE NAVEGACIÓN
  // =============================================

  const navigation = (() => {
   const activateSection = (id) => {
     if (!LEVELS.includes(id)) return;

     // ==================== DETENER TODAS LAS SIMULACIONES ====================
     if (irqSimulator && typeof irqSimulator.stop === 'function') {
       irqSimulator.stop();
     }
     if (typeof detenerSimuladorWifi === 'function') {
       detenerSimuladorWifi();
     }

     // Detener animación del DMA
     if (dmaState && dmaState.animFrame) {
       cancelAnimationFrame(dmaState.animFrame);
       dmaState.animFrame = null;
     }
     if (dmaState && dmaState.stepTimer) {
       clearTimeout(dmaState.stepTimer);
       dmaState.stepTimer = null;
     }

     // Detener animación de la arquitectura de buses
     if (architectureState && architectureState.animationFrame) {
       cancelAnimationFrame(architectureState.animationFrame);
       architectureState.animationFrame = null;
     }
     architectureState.running = false;

      $$('.level-content').forEach((s) => s.classList.remove('active'));
      $$('.nav-btn').forEach((b) => { 
        b.classList.remove('active'); 
        b.setAttribute('aria-selected', 'false'); 
      });

      const section = $(id);
      const btn = document.querySelector(`.nav-btn[data-target="${id}"]`);
      if (!section || !btn) return;

      section.classList.add('active');
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // ==================== CAMBIAR SECCIÓN Y ACTUALIZAR ====================
      handleSectionCanvas(id);
      updateProgress(id);
      window.scrollTo({ top: 0, behavior: 'smooth' });

    // ==================== REINICIAR ANIMACIONES ESPECÍFICAS ====================
    if (id === 'interrupciones') {
      // Aquí puedes reiniciar el simulador de interrupciones si quieres
      // Ejemplo: irqSimulator.start();  (solo si deseas auto-inicio)
    } 
    else if (id === 'dma') {
      // Reiniciar / preparar el canvas del DMA
      if (typeof dmaSimulator.initCanvas === 'function') {
        dmaSimulator.initCanvas();
      }
    } 
    else if (id === 'buses') {
      // Activar la animación del diagrama de arquitectura
      architectureState.running = true;
      // Forzar redraw inmediato
      const archCanvas = $(DOM.archCanvas);
      if (archCanvas) {
        safely(() => archRenderer.draw(archCanvas));
      }
    }
    };

    const handleSectionCanvas = (id) => {
      // DMA canvas
      if (id === 'dma') {
        safely(() => dmaSimulator.initCanvas());
      } else {
        if (dmaState.animFrame) {
          cancelAnimationFrame(dmaState.animFrame);
          dmaState.animFrame = null;
        }
      }

      // Architecture canvas
      if (id === 'buses') {
        const canvas = $(DOM.archCanvas);
        if (canvas) {
          const parent = canvas.parentElement;
          canvas.width = parent?.clientWidth ?? Math.min(window.innerWidth * 0.65, 800);
          canvas.height = 500;
          architectureState.running = true;
          safely(() => archRenderer.draw(canvas));
        }
      } else {
        architectureState.running = false;
        if (architectureState.animationFrame) {
          cancelAnimationFrame(architectureState.animationFrame);
          architectureState.animationFrame = null;
        }
      }
    };

    const updateProgress = (id) => {
      const index = LEVELS.indexOf(id);
      const pct = ((index + 1) / LEVELS.length) * 100;
      const el = $(DOM.mainProgress);
      if (el) el.style.width = `${pct}%`;
      setText(DOM.levelIndicator, `Módulo ${index + 1} de ${LEVELS.length}`);
    };

    const init = () => {
      $$('.nav-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => activateSection(e.currentTarget.dataset.target));
      });

      document.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        const activeSection = document.querySelector('.level-content.active');
        const currentIndex = activeSection ? LEVELS.indexOf(activeSection.id) : 0;
        if (currentIndex < 0) return;

        const nextIndex = e.key === 'ArrowRight'
          ? Math.min(currentIndex + 1, LEVELS.length - 1)
          : Math.max(currentIndex - 1, 0);

        if (nextIndex !== currentIndex) {
          e.preventDefault();
          activateSection(LEVELS[nextIndex]);
        }
      });
    };

    return Object.freeze({ init, activate: activateSection, updateProgress });
  })();

  // =============================================
  // 5. SIMULADOR: INTERRUPCIONES (TIMELINE)
  // =============================================

  const irqSimulator = (() => {
    const MAX_DATA_POINTS = 100;
    const ISR_DURATION = 40;
    const ISR_LOAD_MIN = 85;
    const ISR_LOAD_RANGE = 10;
    const NORMAL_LOAD_BASE = 8;
    const NORMAL_LOAD_RANGE = 5;
    const TICK_RATE = 0.05;

    let canvas = null;
    let ctx = null;
    let data = [];
    let running = false;
    let time = 0;
    let load = 0;
    let animId = null;
    let irqGeneration = 0;
    let pendingTimeouts = [];
    let isrInterval = null;

    const addTimeout = (fn, delay) => {
      const gen = irqGeneration;
      const id = setTimeout(() => {
        if (gen === irqGeneration) fn();
      }, delay);
      pendingTimeouts.push(id);
      return id;
    };

    const clearAllTimeouts = () => {
      pendingTimeouts.forEach((id) => clearTimeout(id));
      pendingTimeouts = [];
      if (isrInterval) { clearInterval(isrInterval); isrInterval = null; }
    };

    const init = () => {
      canvas = $(DOM.timeline);
      if (!canvas) return;
      ctx = getCtx(canvas);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width || 600;
      data = Array(MAX_DATA_POINTS).fill(0);
      draw();
    };

    const getLoadColor = (value) => {
      if (value >= 50) return COLORS.red;
      if (value >= 15) return COLORS.yellow;
      if (value > 0) return COLORS.blue;
      return '#1e293b';
    };

    const draw = () => {
      if (!ctx || !canvas) return;
      const w = canvas.width;
      const h = canvas.height;
      const barW = w / data.length;

      clearCanvas(ctx, w, h);

      // Grid
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < data.length; i += 10) {
        drawLine(ctx, i * barW, 0, i * barW, h);
      }

      // Bars
      data.forEach((value, i) => {
        const barH = (value / 100) * h;
        ctx.fillStyle = getLoadColor(value);
        ctx.fillRect(i * barW, h - barH, barW - 1, barH);
      });

      // Current time line
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      drawLine(ctx, (data.length - 1) * barW, 0, (data.length - 1) * barW, h);
    };

    const pushData = (value) => {
      data.push(value);
      if (data.length > MAX_DATA_POINTS) data.shift();
    };

    const animate = () => {
      if (!running) return;
      load = NORMAL_LOAD_BASE + Math.sin(time * TICK_RATE) * NORMAL_LOAD_RANGE;
      pushData(load);
      time++;
      draw();
      
      // Actualizar estado del CPU con porcentaje actual
      if (running) {
        setHTML(DOM.cpuState, `<i class="fas fa-microchip text-blue-300"></i> En ejecución (${Math.round(load)}%)`);
      }
      
      if (running) animId = requestAnimationFrame(animate);
    };

    const start = () => {
      if (running) return;
      running = true;
      time = 0;
      data = Array(MAX_DATA_POINTS).fill(0);

      setEnabled(DOM.btnStart, false);
      setEnabled(DOM.btnStop, true);
      setEnabled(DOM.btnKey, true);

      const inputSim = $(DOM.inputSim);
      if (inputSim) { inputSim.disabled = false; inputSim.focus(); }

      setHTML(DOM.cpuState, `<i class="fas fa-microchip text-blue-300"></i> En ejecución (${Math.round(load)}%)`);
      setHTML(DOM.cpuStatus, '<span class="text-blue-400"><i class="fas fa-cog fa-spin"></i> Proceso: Videojuego...</span>');

      $(DOM.inputSim)?.focus();
      animate();
    };

    const stop = () => {
      irqGeneration++;
      running = false;
      clearAllTimeouts();
      setEnabled(DOM.btnStart, true);
      setEnabled(DOM.btnStop, false);
      setEnabled(DOM.btnKey, false);
      const inputSim = $(DOM.inputSim);
      if (inputSim) inputSim.disabled = true;
      setHTML(DOM.cpuState, '<i class="fas fa-circle-notch fa-spin"></i> Detenido (0%)');
      setHTML(DOM.cpuStatus, '<span class="text-slate-400"><i class="fas fa-stop"></i> Sistema detenido</span>');
      if (animId) cancelAnimationFrame(animId);
    };

    const executeIRQ = (source) => {
      if (!running) return;
      running = false;
      const gen = irqGeneration;
      setEnabled(DOM.btnKey, false);

      setHTML(DOM.eventIndicator, `<i class="fas fa-circle-exclamation text-red-400"></i> ${source} detectada`);
      setHTML(DOM.cpuStatus, '<span class="text-red-500 font-bold"><i class="fas fa-exclamation-triangle animate-pulse"></i> ¡INTERRUPCIÓN! Guardando contexto...</span>');
      setHTML(DOM.cpuState, '<i class="fas fa-clock text-yellow-400"></i> Guardando estado');

      addTimeout(() => {
        const isrStart = time;
        isrInterval = setInterval(() => {
          if (gen !== irqGeneration) { clearInterval(isrInterval); isrInterval = null; return; }
          if (time - isrStart < ISR_DURATION) {
            load = ISR_LOAD_MIN + Math.random() * ISR_LOAD_RANGE;
            pushData(load);
            time++;
            draw();
            // Actualizar estado durante ISR
            setHTML(DOM.cpuState, `<i class="fas fa-exclamation-triangle text-red-400"></i> ISR (${Math.round(load)}%)`);
          } else {
            clearInterval(isrInterval);
            isrInterval = null;
            setHTML(DOM.cpuStatus, '<span class="text-green-400"><i class="fas fa-check"></i> ISR completada. Restaurando CPU...</span>');
            setHTML(DOM.cpuState, `<i class="fas fa-check text-green-400"></i> Restaurado (${Math.round(load)}%)`);

            addTimeout(() => {
              setHTML(DOM.cpuStatus, '<span class="text-blue-400"><i class="fas fa-cog fa-spin"></i> Continuando: Videojuego...</span>');
              setHTML(DOM.eventIndicator, '<i class="fas fa-clock"></i> Completado');
              running = true;
              setEnabled(DOM.btnKey, true);
              animate();
            }, 800);
          }
        }, 50);
      }, 600);
    };

    const simulateKeyPress = () => {
      if (running) executeIRQ('Tecla simulada');
    };

    return Object.freeze({ init, start, stop, simulateKeyPress, executeIRQ });
  })();
  
  // Expose to global scope for event listeners
  window.irqSimulator = irqSimulator;

  // Navigation helper for onclick attributes in HTML
  window.navegarA = (seccion) => {
    navigation.activate(seccion);
  };

  // Keyboard simulator helper
  window.simularPresionTecla = () => {
    if (typeof irqSimulator.simulateKeyPress === 'function') {
      irqSimulator.simulateKeyPress();
    }
  };

  // Expose IRQ animation functions globally
  let irqAnimacionActiva = false;
  window.animarFlujoIRQ = function() {
    if (irqAnimacionActiva) return;
    irqAnimacionActiva = true;
    const circles = [
      document.getElementById("irq-circle-1"),
      document.getElementById("irq-circle-2"),
      document.getElementById("irq-circle-3"),
      document.getElementById("irq-circle-4"),
      document.getElementById("irq-circle-5"),
      document.getElementById("irq-circle-6")
    ];
    const btnIniciar = document.getElementById("btn-iniciar-cpu");
    const btnDetener = document.getElementById("btn-detener-cpu");
    const btnSimular = document.getElementById("btn-simular-tecla");
    const inputSim = document.getElementById("input-simulador");
    if (btnIniciar) { btnIniciar.disabled = true; btnIniciar.classList.add("opacity-50", "cursor-not-allowed"); }
    if (btnDetener) { btnDetener.disabled = true; btnDetener.classList.add("opacity-50", "cursor-not-allowed"); }
    if (btnSimular) { btnSimular.disabled = true; btnSimular.classList.add("opacity-50", "cursor-not-allowed"); }
    if (inputSim) { inputSim.disabled = true; inputSim.classList.add("opacity-50", "cursor-not-allowed"); }
    const timings = [0, 600, 1200, 1800, 2400, 3000];
    circles.forEach((circle, i) => {
      if (!circle) return;
      setTimeout(() => {
        circle.style.transform = "scale(1.4)";
        circle.style.transition = "transform 0.3s ease";
        setTimeout(() => { circle.style.transform = "scale(1)"; }, 500);
      }, timings[i]);
    });
    setTimeout(() => {
      irqAnimacionActiva = false;
      if (btnIniciar) { btnIniciar.disabled = false; btnIniciar.classList.remove("opacity-50", "cursor-not-allowed"); }
      if (btnSimular) { btnSimular.disabled = false; btnSimular.classList.remove("opacity-50", "cursor-not-allowed"); }
      if (inputSim) { inputSim.disabled = false; inputSim.classList.remove("opacity-50", "cursor-not-allowed"); }
      if (btnDetener) { btnDetener.disabled = false; btnDetener.classList.remove("opacity-50", "cursor-not-allowed"); }
    }, 3500);
  };

  // Keyboard input for IRQ simulator
  const inputSim = $(DOM.inputSim);
  if (inputSim) {
    inputSim.addEventListener('input', (e) => {
      if (e.target.value) {
        const key = e.target.value;
        irqSimulator.executeIRQ(`Tecla "${key}" presionada`);
        animarFlujoIRQ();
        setTimeout(() => { e.target.value = ''; }, 100);
      }
    });
  }
  
  document.addEventListener('keydown', (e) => {
    const input = $(DOM.inputSim);
    if (document.activeElement === input && e.key?.length === 1) {
      irqSimulator.executeIRQ(`Tecla "${e.key}" presionada`);
        animarFlujoIRQ();
        setTimeout(() => { input.value = ''; }, 100);
    }
  });

  // =============================================
  // 6. SIMULADOR: DMA (Canvas interactivo)
  // =============================================

  const dmaState = {
    running: false, mode: null, step: 0,
    blocks: 0, totalBlocks: 16, cycles: 0,
    startTime: 0, cpuLoad: 5,
    animFrame: null, stepTimer: null,
    canvas: null, ctx: null,
    irqProgress: 0,
  };

  const DMA_NODES = (w, h) => Object.freeze({
    cpu: { x: w * 0.5, y: h * 0.18, w: 110, h: 55, label: 'CPU', color: COLORS.blue, icon: '\uf2db' },
    ram: { x: w * 0.5, y: h * 0.82, w: 100, h: 50, label: 'RAM', color: COLORS.purple, icon: '\uf538' },
    io:  { x: w * 0.12, y: h * 0.5, w: 90, h: 50, label: 'Disco I/O', color: COLORS.orange, icon: '\uf1c0' },
    dma: { x: w * 0.5, y: h * 0.5, w: 105, h: 50, label: 'Controlador DMA', color: COLORS.yellow, icon: '\uf085' },
  });

  const DMA_STEPS = Object.freeze([
    '',
    '1: SOLICITUD (DRQ)',
    '2: CONCESIÓN (HOLD/HLDA)',
    '3: TRANSFERENCIA POR BUS',
    '4: FINALIZACIÓN (TC + IRQ)',
  ]);

  const DMA_STEP_COLORS = Object.freeze(['', COLORS.yellow, COLORS.blue, COLORS.green, COLORS.purple]);

  const DMA_STEP_SIGNALS = Object.freeze([
    '',
    'DRQ',
    'HOLD → HLDA',
    'Datos por bus',
    'TC + IRQ',
  ]);

  const dmaSimulator = (() => {
    const drawNode = (ctx, node, isActive) => {
      const glow = isActive ? node.color + '60' : 'transparent';
      const alpha = isActive ? 'ff' : '88';

      ctx.shadowColor = glow;
      ctx.shadowBlur = isActive ? 20 : 0;
      ctx.fillStyle = isActive ? node.color + '25' : '#1e293b';
      ctx.strokeStyle = node.color + alpha;
      ctx.lineWidth = isActive ? 2.5 : 1.5;

      const x = node.x - node.w / 2;
      const y = node.y - node.h / 2;
      drawRoundedRect(ctx, x, y, node.w, node.h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawLabels = (ctx, nodes) => {
      Object.entries(nodes).forEach(([key, node]) => {
        // Icono Font Awesome
        ctx.fillStyle = node.color + 'cc';
        ctx.font = `900 ${Math.min(node.w * 0.25, 18)}px "Font Awesome 6 Free"`;
        setTextAlign(ctx);
        ctx.fillText(node.icon, node.x, node.y - 6);

        ctx.fillStyle = COLORS.textPrimary;
        setFont(ctx, { size: Math.min(node.w * 0.13, 11), bold: true });
        setTextAlign(ctx);
        ctx.fillText(node.label, node.x, node.y + 10);

        if (key === 'cpu') {
          if (dmaState.step === 2 && dmaState.running) {
            ctx.fillStyle = COLORS.cyan;
            setFont(ctx, { size: 10, bold: true, family: 'monospace' });
            ctx.fillText('HOLD ACK', node.x, node.y + 24);
          } else {
            ctx.fillStyle = dmaState.cpuLoad > 50 ? COLORS.red : COLORS.green;
            setFont(ctx, { size: 10, family: 'monospace' });
            ctx.fillText(`Carga: ${dmaState.cpuLoad}%`, node.x, node.y + 24);
          }
        }
        if (key === 'dma' && dmaState.step >= 3 && dmaState.step < 4) {
          ctx.fillStyle = COLORS.yellow;
          setFont(ctx, { size: 10, family: 'monospace' });
          ctx.fillText(`Bloque ${dmaState.blocks}/${dmaState.totalBlocks}`, node.x, node.y + 24);
        }
        if (key === 'io' && dmaState.step === 1 && dmaState.running) {
          const time = performance.now();
          const pulse = 0.5 + Math.sin(time * 0.006) * 0.5;
          ctx.fillStyle = COLORS.yellow;
          ctx.globalAlpha = 0.5 + pulse * 0.5;
          setFont(ctx, { size: 9, bold: true, family: 'monospace' });
          ctx.fillText('DRQ!', node.x, node.y + 24);
          ctx.globalAlpha = 1;
        }
      });
    };

    const drawConnections = (ctx, nodes, color, width, dashed) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      if (dashed) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);

      drawLine(ctx, nodes.io.x + nodes.io.w / 2, nodes.io.y, nodes.dma.x - nodes.dma.w / 2, nodes.dma.y);
      drawLine(ctx, nodes.dma.x, nodes.dma.y + nodes.dma.h / 2, nodes.ram.x, nodes.ram.y - nodes.ram.h / 2);
      drawLine(ctx, nodes.cpu.x, nodes.cpu.y + nodes.cpu.h / 2, nodes.dma.x, nodes.dma.y - nodes.dma.h / 2);

      ctx.setLineDash([]);
    };

    const drawSignalLabel = (ctx, x, y, label, color, pulse) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.6 + pulse * 0.4;
      setFont(ctx, { size: 9, bold: true, family: 'monospace' });
      setTextAlign(ctx);

      const tw = ctx.measureText(label).width + 10;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      drawRoundedRect(ctx, x - tw / 2, y - 9, tw, 18, 4);
      ctx.fill();
      ctx.strokeStyle = color + '80';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = color;
      ctx.fillText(label, x, y + 1);
      ctx.globalAlpha = 1;
    };

    const drawSignalArrow = (ctx, x1, y1, x2, y2, color, label, progress) => {
      const time = performance.now();
      const pulse = 0.5 + Math.sin(time * 0.006) * 0.5;

      // Animated dashed line
      const dashOffset = (time * 0.05) % 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -dashOffset;
      ctx.globalAlpha = 0.4 + pulse * 0.6;
      drawLine(ctx, x1, y1, x2, y2);
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
      ctx.globalAlpha = 1;

      // Arrow head
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = 8;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - size * Math.cos(angle - 0.4), y2 - size * Math.sin(angle - 0.4));
      ctx.lineTo(x2 - size * Math.cos(angle + 0.4), y2 - size * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;

      // Label
      if (label) {
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        drawSignalLabel(ctx, mx + 15, my - 12, label, color, pulse);
      }
    };

    const drawStepBar = (ctx, w, h, step) => {
      if (step < 1 || step > 4) return;
      ctx.fillStyle = DMA_STEP_COLORS[step] + '20';
      ctx.fillRect(0, 0, w, 24);
      ctx.strokeStyle = DMA_STEP_COLORS[step] + '60';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, w, 24);
      ctx.fillStyle = DMA_STEP_COLORS[step];
      setFont(ctx, { size: 11, bold: true });
      setTextAlign(ctx, 'left', 'middle');
      ctx.fillText('▸ ' + DMA_STEPS[step], 12, 12);
    };

    const drawBits = (ctx, nodes, mode, blockProgress) => {
      const time = performance.now();
      const color = mode === 'cpu' ? COLORS.red : COLORS.green;
      const speed = mode === 'cpu' ? 0.6 : 2.5; // CPU es ~4x más lento

      const ioRight   = { x: nodes.io.x + nodes.io.w / 2,   y: nodes.io.y };
      const dmaLeft   = { x: nodes.dma.x - nodes.dma.w / 2, y: nodes.dma.y };
      const dmaBottom = { x: nodes.dma.x,                   y: nodes.dma.y + nodes.dma.h / 2 };
      const cpuBottom = { x: nodes.cpu.x,                   y: nodes.cpu.y + nodes.cpu.h / 2 };
      const cpuRight  = { x: nodes.cpu.x + nodes.cpu.w / 2, y: nodes.cpu.y };
      const ramTop    = { x: nodes.ram.x,                   y: nodes.ram.y - nodes.ram.h / 2 };
      const ramLeft   = { x: nodes.ram.x - nodes.ram.w / 2, y: nodes.ram.y };

      let routes;
      if (mode === 'cpu') {
        // Programmed I/O: CPU lee de IO (izq), luego escribe a RAM (abajo)
        routes = [
          { from: ioRight,  to: cpuRight,  label: 'IN',  period: 2800 },
          { from: cpuBottom, to: ramTop,    label: 'OUT', period: 2800 },
        ];
      } else {
        // DMA: IO → DMA (solicitud de datos), DMA → RAM (escritura directa)
        routes = [
          { from: ioRight,   to: dmaLeft,   label: null,  period: 1200 },
          { from: dmaBottom, to: ramTop,    label: null,  period: 1200 },
        ];
      }

      routes.forEach((seg, si) => {
        const numBits = mode === 'cpu' ? 3 : 6;
        for (let i = 0; i < numBits; i++) {
          const rawT = ((time * speed + i * (seg.period / numBits) + si * (seg.period / 2)) % seg.period) / seg.period;
          const x = lerp(seg.from.x, seg.to.x, rawT);
          const y = lerp(seg.from.y, seg.to.y, rawT);
          const alpha = clamp(Math.min(rawT * 5, (1 - rawT) * 5), 0, 1);
          const bit = (Math.floor(time * speed / 350) + i + si) % 2;

          ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.9})`;
          drawCircle(ctx, x, y, 7);
          ctx.fill();

          ctx.fillStyle = color;
          ctx.globalAlpha = alpha;
          setFont(ctx, { size: 10, bold: true, family: 'monospace' });
          setTextAlign(ctx);
          ctx.fillText(bit.toString(), x, y);
          ctx.globalAlpha = 1;
        }

        // IN/OUT labels for CPU mode
        if (seg.label) {
          const mx = (seg.from.x + seg.to.x) / 2;
          const my = (seg.from.y + seg.to.y) / 2;
          drawSignalLabel(ctx, mx, my - 14, seg.label, color, 0.5 + Math.sin(time * 0.004) * 0.5);
        }
      });

      // DMA mode: show bus grant indicator (dashed line from CPU showing it's off the bus)
      if (mode === 'dma') {
        const pulse = 0.3 + Math.sin(time * 0.003) * 0.3;
        ctx.strokeStyle = COLORS.blue + '40';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 8]);
        ctx.lineDashOffset = -(time * 0.02) % 20;
        drawLine(ctx, nodes.cpu.x, nodes.cpu.y + nodes.cpu.h / 2, nodes.dma.x, nodes.dma.y - nodes.dma.h / 2);
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // "Bus libre" label on CPU
        ctx.fillStyle = COLORS.blue;
        ctx.globalAlpha = 0.4 + pulse;
        setFont(ctx, { size: 9, bold: true, family: 'monospace' });
        setTextAlign(ctx);
        ctx.fillText('BUS LIBERADO', nodes.cpu.x, nodes.cpu.y + nodes.cpu.h / 2 + 14);
        ctx.globalAlpha = 1;
      }
    };

    const drawIRQSignal = (ctx, nodes, progress) => {
      const time = performance.now();

      const dmaTop    = { x: nodes.dma.x, y: nodes.dma.y - nodes.dma.h / 2 };
      const cpuBottom = { x: nodes.cpu.x, y: nodes.cpu.y + nodes.cpu.h / 2 };
      const dmaBottom = { x: nodes.dma.x, y: nodes.dma.y + nodes.dma.h / 2 };
      const ramTop    = { x: nodes.ram.x, y: nodes.ram.y - nodes.ram.h / 2 };

      // Phase 1 (0-0.4): TC signal from DMA to IO (terminal count)
      // Phase 2 (0.3-1): IRQ signal from DMA to CPU
      const tcProgress = clamp(progress / 0.4, 0, 1);
      const irqProgress = clamp((progress - 0.3) / 0.7, 0, 1);

      // TC signal: DMA → IO (termination)
      if (tcProgress > 0 && tcProgress < 1) {
        const pulse = 0.5 + Math.sin(time * 0.01) * 0.5;
        ctx.strokeStyle = COLORS.orange + '60';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -(time * 0.04) % 16;
        drawLine(ctx, nodes.dma.x - nodes.dma.w / 2, nodes.dma.y, nodes.io.x + nodes.io.w / 2, nodes.io.y);
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // TC bit traveling to IO
        const tcT = tcProgress;
        const tcX = lerp(nodes.dma.x - nodes.dma.w / 2, nodes.io.x + nodes.io.w / 2, tcT);
        const tcY = lerp(nodes.dma.y, nodes.io.y, tcT);
        ctx.fillStyle = `rgba(15, 23, 42, 0.9)`;
        drawCircle(ctx, tcX, tcY, 8);
        ctx.fill();
        ctx.fillStyle = COLORS.orange;
        ctx.globalAlpha = clamp(Math.min(tcT * 4, (1 - tcT) * 4), 0, 1);
        setFont(ctx, { size: 9, bold: true, family: 'monospace' });
        setTextAlign(ctx);
        ctx.fillText('TC', tcX, tcY + 1);
        ctx.globalAlpha = 1;

        // TC label
        const tcMx = (nodes.dma.x + nodes.io.x) / 2;
        const tcMy = (nodes.dma.y + nodes.io.y) / 2;
        drawSignalLabel(ctx, tcMx, tcMy - 14, 'Terminal Count', COLORS.orange, pulse);
      }

      // IRQ signal: DMA → CPU (interrupt)
      if (irqProgress > 0) {
        const pulse = 0.5 + Math.sin(time * 0.008) * 0.5;

        // Pulsing connection line
        ctx.strokeStyle = COLORS.purple + '80';
        ctx.lineWidth = 2 + pulse * 2;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = -(time * 0.05) % 16;
        drawLine(ctx, dmaTop.x, dmaTop.y, cpuBottom.x, cpuBottom.y);
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Bits flowing upward (DMA → CPU)
        const numBits = 3;
        for (let i = 0; i < numBits; i++) {
          const bitT = ((irqProgress * 2 + i / numBits) % 1);
          const x = lerp(dmaTop.x, cpuBottom.x, bitT);
          const y = lerp(dmaTop.y, cpuBottom.y, bitT);
          const alpha = clamp(Math.min(bitT * 4, (1 - bitT) * 4), 0, 1) * Math.min(irqProgress * 3, 1);

          ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.9})`;
          drawCircle(ctx, x, y, 8);
          ctx.fill();
          ctx.strokeStyle = COLORS.purple + '60';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = COLORS.purple;
          ctx.globalAlpha = alpha;
          setFont(ctx, { size: 10, bold: true, family: 'monospace' });
          setTextAlign(ctx);
          ctx.fillText('1', x, y);
          ctx.globalAlpha = 1;
        }

        // IRQ label
        const mx = (dmaTop.x + cpuBottom.x) / 2;
        const my = (dmaTop.y + cpuBottom.y) / 2;
        drawSignalLabel(ctx, mx + 20, my - 10, 'IRQ', COLORS.purple, pulse);

        // Arrow
        const angle = Math.atan2(cpuBottom.y - dmaTop.y, cpuBottom.x - dmaTop.x);
        const size = 7;
        ctx.fillStyle = COLORS.purple;
        ctx.globalAlpha = 0.5 + pulse * 0.5;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - size * Math.cos(angle - 0.4), my - size * Math.sin(angle - 0.4));
        ctx.lineTo(mx - size * Math.cos(angle + 0.4), my - size * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Bus release indicator (fading dashed line)
      if (progress > 0.5) {
        const fade = 1 - (progress - 0.5) * 2;
        ctx.strokeStyle = COLORS.blue + Math.floor(fade * 80).toString(16).padStart(2, '0');
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 6]);
        drawLine(ctx, nodes.cpu.x, nodes.cpu.y + nodes.cpu.h / 2, nodes.dma.x, nodes.dma.y - nodes.dma.h / 2);
        ctx.setLineDash([]);

        ctx.fillStyle = COLORS.blue;
        ctx.globalAlpha = fade * 0.6;
        setFont(ctx, { size: 9, bold: true, family: 'monospace' });
        setTextAlign(ctx);
        ctx.fillText('BUS RECUPERADO', nodes.cpu.x, nodes.cpu.y + nodes.cpu.h / 2 + 14);
        ctx.globalAlpha = 1;
      }

      return { dmaTop, cpuBottom };
    };

    const drawArrow = (ctx, x1, y1, x2, y2, color) => {
      const time = performance.now();
      const pulse = 0.5 + Math.sin(time * 0.005) * 0.5;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const size = 6;

      ctx.fillStyle = color;
      ctx.globalAlpha = 0.5 + pulse * 0.5;
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx - size * Math.cos(angle - 0.4), my - size * Math.sin(angle - 0.4));
      ctx.lineTo(mx - size * Math.cos(angle + 0.4), my - size * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    };

    const render = () => {
      if (!dmaState.running && dmaState.step === 0) return;
      const { ctx, canvas } = dmaState;
      if (!ctx || !canvas) return;

      const w = canvas.width;
      const h = canvas.height;
      const nodes = DMA_NODES(w, h);

      clearCanvas(ctx, w, h);
      drawStepBar(ctx, w, h, dmaState.step);

      // Base connection lines (dimm when not active)
      const connColor = dmaState.mode === 'cpu' ? COLORS.red + '30' : COLORS.green + '30';
      drawConnections(ctx, nodes, connColor, 1.5, dmaState.step < 3);

      // Step-specific visuals
      if (dmaState.step === 1) {
        // DRQ: IO → DMA
        drawSignalArrow(ctx,
          nodes.io.x + nodes.io.w / 2, nodes.io.y,
          nodes.dma.x - nodes.dma.w / 2, nodes.dma.y,
          COLORS.yellow, 'DRQ', 1
        );
      }

      if (dmaState.step === 2) {
        // HOLD: DMA → CPU
        drawSignalArrow(ctx,
          nodes.dma.x, nodes.dma.y - nodes.dma.h / 2,
          nodes.cpu.x, nodes.cpu.y + nodes.cpu.h / 2,
          COLORS.blue, 'HOLD', 1
        );
        // HLDA: CPU → DMA (slightly offset)
        const time = performance.now();
        const pulse = 0.5 + Math.sin(time * 0.005) * 0.5;
        ctx.strokeStyle = COLORS.cyan + '60';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 5]);
        ctx.lineDashOffset = -(time * 0.03) % 16;
        drawLine(ctx, nodes.cpu.x + 8, nodes.cpu.y + nodes.cpu.h / 2, nodes.dma.x + 8, nodes.dma.y - nodes.dma.h / 2);
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;
        const mx = (nodes.cpu.x + nodes.dma.x) / 2 + 20;
        const my = (nodes.cpu.y + nodes.cpu.h / 2 + nodes.dma.y - nodes.dma.h / 2) / 2;
        drawSignalLabel(ctx, mx, my, 'HLDA', COLORS.cyan, pulse);

        // CPU WAIT indicator
        ctx.fillStyle = COLORS.blue;
        ctx.globalAlpha = 0.4 + pulse * 0.4;
        setFont(ctx, { size: 9, bold: true, family: 'monospace' });
        setTextAlign(ctx);
        ctx.fillText('WAIT', nodes.cpu.x, nodes.cpu.y + nodes.cpu.h / 2 + 14);
        ctx.globalAlpha = 1;
      }

      if (dmaState.step >= 3 && dmaState.step < 4 && dmaState.running) {
        drawBits(ctx, nodes, dmaState.mode, dmaState.blocks / dmaState.totalBlocks);

        // Data path arrows
        const arrowColor = dmaState.mode === 'cpu' ? COLORS.red : COLORS.green;
        if (dmaState.mode === 'cpu') {
          drawArrow(ctx, nodes.io.x + 45, nodes.io.y, nodes.cpu.x + 55, nodes.cpu.y, arrowColor);
          drawArrow(ctx, nodes.cpu.x, nodes.cpu.y + 28, nodes.ram.x, nodes.ram.y - 25, arrowColor);
        } else {
          drawArrow(ctx, nodes.io.x + 45, nodes.io.y, nodes.dma.x - 53, nodes.dma.y, arrowColor);
          drawArrow(ctx, nodes.dma.x, nodes.dma.y + 25, nodes.ram.x, nodes.ram.y - 25, arrowColor);
        }

        // DMA mode: show "CONTROLA BUS" on DMA node
        if (dmaState.mode === 'dma') {
          const time = performance.now();
          const pulse = 0.5 + Math.sin(time * 0.004) * 0.5;
          ctx.fillStyle = COLORS.yellow;
          ctx.globalAlpha = 0.4 + pulse * 0.4;
          setFont(ctx, { size: 9, bold: true, family: 'monospace' });
          setTextAlign(ctx);
          ctx.fillText('CONTROLA BUS', nodes.dma.x, nodes.dma.y - nodes.dma.h / 2 - 12);
          ctx.globalAlpha = 1;
        }
      }

      if (dmaState.step === 4 && dmaState.running) {
        drawIRQSignal(ctx, nodes, dmaState.irqProgress);
      }

      // Draw nodes with active highlighting
      Object.entries(nodes).forEach(([key, node]) => {
        const isActive = dmaState.running && (
          (dmaState.step === 1 && key === 'io') ||
          (dmaState.step === 2 && (key === 'dma' || key === 'cpu')) ||
          (dmaState.step === 3 && dmaState.mode === 'cpu' && ['cpu', 'ram', 'io'].includes(key)) ||
          (dmaState.step === 3 && dmaState.mode === 'dma' && ['dma', 'ram', 'io'].includes(key)) ||
          (dmaState.step === 4 && ['dma', 'cpu'].includes(key))
        );
        drawNode(ctx, node, isActive);
      });
      drawLabels(ctx, nodes);

      dmaState.animFrame = requestAnimationFrame(render);
    };

    const updateUI = () => {
      const elapsed = dmaState.elapsedTime || (dmaState.running ? Date.now() - dmaState.startTime : 0);
      setText(DOM.dmaBlocks, `${dmaState.blocks} / ${dmaState.totalBlocks}`);
      setText(DOM.dmaCycles, dmaState.cycles.toLocaleString());
      setText(DOM.dmaTime, `${elapsed} ms`);

      const loadEl = $(DOM.dmaCpuLoad);
      if (loadEl) {
        loadEl.textContent = `${dmaState.cpuLoad}%`;
        loadEl.className = 'text-xl font-bold font-mono ' + (dmaState.cpuLoad > 50 ? 'text-red-400' : 'text-green-400');
      }

      $$('.dma-step').forEach((el) => {
        const s = parseInt(el.dataset.step);
        const iconEl = el.querySelector('.text-2xl');
        el.classList.remove('bg-slate-800/60', 'border-slate-700', 'bg-brand-500/20', 'border-brand-400', 'scale-105', 'bg-green-900/20', 'border-green-600');
        iconEl?.classList.remove('text-slate-600', 'text-brand-400', 'text-green-400');

        if (s === dmaState.step) {
          el.classList.add('bg-brand-500/20', 'border-brand-400', 'scale-105');
          iconEl?.classList.add('text-brand-400');
        } else if (s < dmaState.step) {
          el.classList.add('bg-green-900/20', 'border-green-600');
          iconEl?.classList.add('text-green-400');
        } else {
          el.classList.add('bg-slate-800/60', 'border-slate-700');
          iconEl?.classList.add('text-slate-600');
        }
      });

      const indicator = $(DOM.dmaModeIndicator);
      if (indicator && dmaState.running) {
        const modeText = dmaState.mode === 'cpu' ? 'Programmed I/O (CPU)' : 'DMA Transfer';
        const modeColor = dmaState.mode === 'cpu' ? 'text-red-400' : 'text-green-400';
        const signal = DMA_STEP_SIGNALS[dmaState.step] || '';
        indicator.innerHTML = `<span class="${modeColor} font-bold">${modeText}</span> — Paso ${dmaState.step}/4: <span class="text-slate-300">${signal}</span>`;
      }
    };

    const resetState = () => {
      if (dmaState.animFrame) cancelAnimationFrame(dmaState.animFrame);
      if (dmaState.stepTimer) clearInterval(dmaState.stepTimer);
      Object.assign(dmaState, { running: false, mode: null, step: 0, blocks: 0, cycles: 0, cpuLoad: 5, irqProgress: 0, elapsedTime: 0 });

      $$('.dma-step').forEach((el) => {
        const iconEl = el.querySelector('.text-2xl');
        el.classList.add('bg-slate-800/60', 'border-slate-700');
        el.classList.remove('bg-brand-500/20', 'border-brand-400', 'scale-105', 'bg-green-900/20', 'border-green-600');
        iconEl?.classList.add('text-slate-600');
        iconEl?.classList.remove('text-brand-400', 'text-green-400');
      });

      setText(DOM.dmaModeIndicator, 'Selecciona un modo para comenzar la simulación');
      updateUI();
    };

    const drawIdle = () => {
      const { ctx, canvas } = dmaState;
      if (!ctx || !canvas) return;
      const nodes = DMA_NODES(canvas.width, canvas.height);
      clearCanvas(ctx, canvas.width, canvas.height);
      drawConnections(ctx, nodes, '#334155', 1, true);
      Object.entries(nodes).forEach(([key, node]) => drawNode(ctx, node, false));
      drawLabels(ctx, nodes);
    };

    const initCanvas = () => {
      const canvas = $(DOM.dmaCanvas);
      if (!canvas) return;
      const parent = canvas.parentElement;
      canvas.width = parent?.clientWidth ?? 700;
      canvas.height = 280;
      dmaState.canvas = canvas;
      dmaState.ctx = getCtx(canvas);
      drawIdle();
    };

    const transferBlocks = (mode) => {
      // CPU: ~200ms per byte (slow, each byte needs IN+OUT instruction)
      // DMA: ~40ms per block (fast, hardware-driven bus transfer)
      const interval = mode === 'cpu' ? 220 : 40;
      const cyclesPerBlock = mode === 'cpu' ? 15000 : 50;

      dmaState.stepTimer = setInterval(() => {
        if (!dmaState.running || dmaState.blocks >= dmaState.totalBlocks) {
          clearInterval(dmaState.stepTimer);
          if (dmaState.running) finish();
          return;
        }
        dmaState.blocks++;
        dmaState.cycles += cyclesPerBlock;
        // CPU mode: CPU at ~95% load doing the transfers
        // DMA mode: CPU at ~2% (just idling, bus released)
        dmaState.cpuLoad = mode === 'cpu' ? 92 + Math.floor(Math.random() * 8) : 1 + Math.floor(Math.random() * 3);
        updateUI();
      }, interval);
    };

    const finish = () => {
      dmaState.step = 4;
      dmaState.irqProgress = 0;
      const elapsed = Date.now() - dmaState.startTime;
      dmaState.elapsedTime = elapsed;
      const resultEl = $(DOM.dmaResult);

      // Animate IRQ signal from DMA to CPU
      const IRQ_DURATION = 1500;
      const irqStart = performance.now();
      const animateIRQ = () => {
        const elapsed_irq = performance.now() - irqStart;
        dmaState.irqProgress = clamp(elapsed_irq / IRQ_DURATION, 0, 1);
        updateUI();

        if (dmaState.irqProgress < 1) {
          dmaState.animFrame = requestAnimationFrame(animateIRQ);
        } else {
          // IRQ animation complete — now stop
          dmaState.running = false;
          if (dmaState.animFrame) cancelAnimationFrame(dmaState.animFrame);

          if (dmaState.mode === 'cpu') {
            resultEl.innerHTML = `<span class="text-red-400">Transferencia por CPU completada en ${elapsed}ms</span><br><span class="text-slate-400 text-sm">CPU bloqueado durante ${dmaState.cycles.toLocaleString()} ciclos</span>`;
          } else {
            resultEl.innerHTML = `<span class="text-green-400">Transferencia DMA completada en ${elapsed}ms</span><br><span class="text-slate-400 text-sm">Solo ~200 ciclos de CPU usados (setup). CPU libre el 99.9%</span>`;
          }

          updateUI();
          setTimeout(() => {
            setEnabled(DOM.btnDmaCpu, true);
            setEnabled(DOM.btnDmaDma, true);
            drawIdle();
          }, 2000);
        }
      };

      dmaState.animFrame = requestAnimationFrame(animateIRQ);
    };

    const start = (mode) => {
      if (dmaState.running) return;
      resetState();
      Object.assign(dmaState, { running: true, mode, step: 1, startTime: Date.now() });

      setHTML(DOM.dmaResult, '');
      setEnabled(DOM.btnDmaCpu, false);
      setEnabled(DOM.btnDmaDma, false);

      updateUI();
      render();

      // Step 1 -> Step 2 (DRQ received, DMA sends HOLD)
      setTimeout(() => {
        if (!dmaState.running) return;
        dmaState.step = 2;
        updateUI();
      }, 900);

      // Step 2 -> Step 3 (CPU acknowledges HLDA, transfer begins)
      setTimeout(() => {
        if (!dmaState.running) return;
        dmaState.step = 3;
        dmaState.cpuLoad = mode === 'cpu' ? 95 : 2;
        updateUI();
        transferBlocks(mode);
      }, 2200);
    };

    return Object.freeze({ initCanvas, start, getState: () => dmaState });
  })();
  
  // Expose to global scope for event listeners
  window.dmaSimulator = dmaSimulator;

  // DMA keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && $('dma')?.classList.contains('active')) {
      e.preventDefault();
      if (!dmaState.running) {
        dmaSimulator.start(dmaState.mode === 'cpu' ? 'dma' : 'cpu');
      }
    }
  });

  // =============================================
  // 7. SIMULADOR: ARQUITECTURA DE BUSES
  // =============================================

  const BUS_DATA = Object.freeze({
    memoria: { title: 'Bus de Memoria', desc: 'Conecta la CPU directamente con la RAM. El bus más rápido del sistema.', speed: '~50-80 GB/s', color: COLORS.purple },
    pcie: { title: 'Bus PCIe (GPU)', desc: 'Conexión punto a punto de alta velocidad para GPU y NVMe directo.', speed: 'PCIe 5.0 x16: ~64 GB/s', color: COLORS.green },
    nvme_directo: { title: 'NVMe Directo (CPU)', desc: 'SSD NVMe conectado directamente a la CPU por PCIe. Máxima velocidad.', speed: 'PCIe 5.0 x4: ~14 GB/s', color: COLORS.cyan },
    chipset: { title: 'Enlace DMI / PCH', desc: 'Puente entre el CPU y periféricos de menor velocidad gestionados por el PCH.', speed: 'DMI 4.0 x8: ~16 GB/s', color: COLORS.orange },
    nvme_pch: { title: 'NVMe (PCH)', desc: 'SSD NVMe conectado al PCH. Velocidad moderada.', speed: 'PCIe 4.0 x4: ~8 GB/s', color: COLORS.cyan },
    usb: { title: 'Bus USB', desc: 'Interfaz universal para dispositivos externos. USB4 v2 alcanza 80 Gbps.', speed: 'USB4 v2: 80 Gbps', color: COLORS.yellow },
    sata: { title: 'Bus SATA (Legacy)', desc: 'Tecnología legacy para discos duros. Reemplazado por NVMe.', speed: 'SATA III: 600 MB/s', color: COLORS.red },
    lan: { title: 'Ethernet LAN (PCIe)', desc: 'Controlador de red Intel I225/I226 conectado por PCIe al PCH. 2.5 GbE estándar en 2026.', speed: '2.5 GbE estándar', color: COLORS.slate },
  });

  const ARCH_COMPONENTS = Object.freeze({
    // 🔵 Nivel 0
    cpu:  { x: 0.5,  y: 0.18, width: 0.18, height: 0.09, label: 'CPU', color: COLORS.blue },

    // 🟣 Nivel 1
    ram:  { x: 0.10, y: 0.39, width: 0.15, height: 0.08, label: 'RAM', color: COLORS.purple },
    gpu:  { x: 0.32, y: 0.39, width: 0.15, height: 0.08, label: 'GPU', color: COLORS.green },
    nvme1:{ x: 0.54, y: 0.39, width: 0.15, height: 0.08, label: 'NVMe', color: COLORS.cyan },
    pch:  { x: 0.84, y: 0.39, width: 0.15, height: 0.08, label: 'PCH', color: COLORS.orange },

    // 🟠 Nivel 2
    nvme2:{ x: 0.12, y: 0.70, width: 0.13, height: 0.07, label: 'NVMe', color: COLORS.cyan },
    usb:  { x: 0.32, y: 0.70, width: 0.13, height: 0.07, label: 'USB', color: COLORS.yellow },
    sata: { x: 0.52, y: 0.70, width: 0.13, height: 0.07, label: 'SATA', color: COLORS.red },
    lan:  { x: 0.72, y: 0.70, width: 0.13, height: 0.07, label: 'LAN', color: COLORS.slate },
  });

  const ARCH_BUSES = Object.freeze([
    { from: 'cpu',  to: 'ram',    id: 'memoria',     offset: -30 },
    { from: 'cpu',  to: 'gpu',    id: 'pcie',        offset: -10 },
    { from: 'cpu',  to: 'nvme1',  id: 'nvme_directo', offset: 10 },
    { from: 'cpu',  to: 'pch',    id: 'chipset',     offset: 30 },
    { from: 'pch',  to: 'nvme2',  id: 'nvme_pch',    offset: -25 },
    { from: 'pch',  to: 'usb',    id: 'usb',         offset: -8 },
    { from: 'pch',  to: 'sata',   id: 'sata',        offset: 10 },
    { from: 'pch',  to: 'lan',    id: 'lan',         offset: 28 },
  ]);

  const ARCH_LEVELS = Object.freeze([
    { y: 0.08, label: 'Nivel 0 — CPU (Controlador Central)', color: COLORS.blue },
    { y: 0.28, label: 'Nivel 1 — Memoria, PCIe Directo, PCH', color: COLORS.purple },
    { y: 0.50, label: 'Nivel 2 — Periféricos PCH', color: COLORS.orange },
  ]);

  const COMPONENT_INFO = Object.freeze({
    cpu: { name: 'Procesador (CPU)', desc: 'Control central del sistema. Ejecuta instrucciones y coordina la jerarquía de buses.', specs: ['Núcleos: 8-16', 'Frecuencia: 3.5-5.5 GHz', 'TDP: 105-253W'], nivel: 'Nivel 0' },
    ram: { name: 'Memoria RAM DDR5', desc: 'Conectada directamente al CPU por el controlador de memoria integrado.', specs: ['Velocidad: 50-80 GB/s', 'Capacidad: 32-256 GB', 'Latencia: 42-65 ns'], nivel: 'Nivel 1' },
    gpu: { name: 'GPU', desc: 'Conectada por PCIe directo al CPU. Alta velocidad para renderizado y cómputo paralelo.', specs: ['VRAM: 6-24 GB', 'Ancho de banda: 600-900 GB/s', 'PCIe 5.0 x16'], nivel: 'Nivel 1' },
    nvme1: { name: 'NVMe Directo (CPU)', desc: 'SSD NVMe conectado directamente a la CPU por PCIe. Máxima velocidad.', specs: ['PCIe 5.0 x4: ~14 GB/s', 'Latencia: ~10 μs', 'Directo a CPU'], nivel: 'Nivel 1' },
    pch: { name: 'Controlador PCH', desc: 'Chipset que gestiona periféricos de menor velocidad. Conectado por enlace DMI.', specs: ['Conexiones: USB, SATA, PCIe', 'DMI 4.0: ~16 GB/s', 'Gestión de I/O'], nivel: 'Nivel 1' },
    nvme2: { name: 'NVMe (PCH)', desc: 'SSD NVMe conectado al PCH. Velocidad moderada.', specs: ['PCIe 4.0 x4: ~8 GB/s', 'Latencia: ~20 μs', 'Vía PCH'], nivel: 'Nivel 2' },
    usb: { name: 'Puertos USB', desc: 'Interfaz universal para dispositivos externos.', specs: ['USB 3.2: 20 Gbps', 'USB4 v2: 80 Gbps', 'Hot-plug'], nivel: 'Nivel 2' },
    sata: { name: 'SATA (Legacy)', desc: 'Interfaz legacy para discos duros y SSDs de 2.5".', specs: ['SATA III: 600 MB/s', 'Estado: Legacy', 'Reemplazado por NVMe'], nivel: 'Nivel 2' },
    lan: { name: 'Red Ethernet (LAN)', desc: 'Controlador Intel I225/I226 2.5GbE conectado por PCIe al PCH.', specs: ['2.5 GbE estándar', '10 GbE gama alta', 'Conexión PCIe vía PCH'], nivel: 'Nivel 2' },
  });

  const architectureState = {
    hoveredBus: null, selectedBus: null, hoveredComponent: null,
    animationFrame: null, time: 0, running: false,
  };

  let archEventsAttached = false;

  const archRenderer = (() => {
    const drawLevelGuides = (ctx, w, h) => {
      ARCH_LEVELS.forEach((lv, i) => {
        const ly = lv.y * h;
        
        // Línea horizontal del nivel
        ctx.strokeStyle = lv.color + '40';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(30, ly);
        ctx.lineTo(w - 30, ly);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Texto del nivel a la izquierda
        ctx.fillStyle = lv.color;
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(lv.label, 35, ly - 5);
      });
    };

    const drawBusLine = (ctx, w, h, from, to, color, isHovered, isSelected, busId, offset) => {
      const fromX = from.x * w;
      const fromY = from.y * h + (from.height * h) / 2 + 6;
      const toX = to.x * w;
      const toY = to.y * h - (to.height * h) / 2 - 6;
      const midY = (fromY + toY) / 2;
      const offX = (offset || 0);

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (isHovered || isSelected) {
        ctx.shadowColor = color;
        ctx.shadowBlur = isSelected ? 18 : 10;
      }

      ctx.strokeStyle = isSelected ? color : (isHovered ? color + 'cc' : color + '55');
      ctx.lineWidth = isHovered || isSelected ? 3.5 : 2;
      drawBezier(ctx, fromX + offX, fromY, fromX + offX, toY, toX + offX, fromY, toX + offX, toY);

      if (isHovered || isSelected) {
        ctx.strokeStyle = color + '30';
        ctx.lineWidth = isSelected ? 10 : 7;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      drawDataBits(ctx, fromX + offX, fromY, toX + offX, toY, color, midY);

      // Bus label positioned to the side of the curve
      const info = BUS_DATA[busId];
      if (info) {
        const shortLabel = info.title.replace('Bus ', '').replace('Enlace ', '').split('/')[0].trim();
        const labelX = (fromX + toX) / 2 + offX + 30;
        const labelY = midY;
        setFont(ctx, { size: 10, bold: true });
        setTextAlign(ctx, 'left', 'middle');
        const tw = ctx.measureText(shortLabel).width + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        drawRoundedRect(ctx, labelX - 5, labelY - 10, tw, 20, 5);
        ctx.fill();
        ctx.strokeStyle = color + '60';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = color + (isHovered || isSelected ? 'ff' : 'bb');
        ctx.fillText(shortLabel, labelX, labelY + 1);
      }
    };

    const drawDataBits = (ctx, fromX, fromY, toX, toY, color, midY) => {
      const time = Date.now() % 3000;
      for (let i = 0; i < 4; i++) {
        const progress = ((time + i * 750) % 3000) / 3000;
        const bit = (Math.floor(time / 500) + i) % 2;
        const t = progress;
        const mt = 1 - t;
        const x = mt * mt * mt * fromX + 3 * mt * mt * t * fromX + 3 * mt * t * t * toX + t * t * t * toX;
        const y = mt * mt * mt * fromY + 3 * mt * mt * t * midY + 3 * mt * t * t * midY + t * t * t * toY;
        const offX = (i % 2 === 0 ? 1 : -1) * 8;
        const alpha = clamp(Math.min(progress * 5, (1 - progress) * 5), 0, 1);

        ctx.fillStyle = `rgba(15, 23, 42, ${alpha * 0.85})`;
        drawCircle(ctx, x + offX, y, 6);
        ctx.fill();

        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        setFont(ctx, { size: 9, bold: true, family: 'monospace' });
        setTextAlign(ctx);
        ctx.fillText(bit.toString(), x + offX, y);
        ctx.globalAlpha = 1;
      }
    };

    const drawComponent = (ctx, w, h, comp, isHovered, time) => {
      const x = comp.x * w;
      const y = comp.y * h;
      const cw = comp.width * w;
      const ch = comp.height * h;
      const scale = isHovered ? 1 + Math.sin(time * 3) * 0.05 : 1;
      const sw = cw * scale;
      const sh = ch * scale;
      const sx = x - sw / 2;
      const sy = y - sh / 2;
      const r = 10;

      ctx.shadowColor = comp.color + (isHovered ? '60' : '30');
      ctx.shadowBlur = isHovered ? 20 : 8;
      ctx.shadowOffsetY = 3;

      const grad = ctx.createLinearGradient(sx, sy, sx, sy + sh);
      grad.addColorStop(0, comp.color + (isHovered ? '50' : '30'));
      grad.addColorStop(1, comp.color + (isHovered ? '25' : '15'));
      ctx.fillStyle = grad;

      drawRoundedRect(ctx, sx, sy, sw, sh, r);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      ctx.strokeStyle = comp.color + (isHovered ? 'ee' : '88');
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.stroke();

      // Inner border
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      drawRoundedRect(ctx, sx + 2, sy + 2, sw - 4, sh - 4, r - 2);
      ctx.stroke();

      // Text
      const fontSize = clamp(sw * 0.18, 11, 16);
      setFont(ctx, { size: fontSize, bold: true });
      setTextAlign(ctx);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillText(comp.label, x + 1, y + 1);
      ctx.fillStyle = COLORS.textPrimary;
      ctx.fillText(comp.label, x, y);

      // Decorative line
      const lineW = sw * 0.4;
      const lineY = y + fontSize * 0.7;
      ctx.strokeStyle = comp.color + '60';
      ctx.lineWidth = 1.5;
      drawLine(ctx, x - lineW / 2, lineY, x + lineW / 2, lineY);
    };

    const drawTooltip = (ctx, text, x, y, color) => {
      setFont(ctx, { size: 11, bold: true });
      setTextAlign(ctx);
      const tw = ctx.measureText(text).width;
      const pad = 8;

      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.fillRect(x - tw / 2 - pad, y - 12, tw + pad * 2, 24);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x - tw / 2 - pad, y - 12, tw + pad * 2, 24);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    };

    const draw = (canvas) => {
      const ctx = getCtx(canvas);
      if (!ctx) return;
      const w = canvas.width;
      const h = canvas.height;

      if (!w || !h || w < 100 || h < 100) {
        // Canvas no visible aún, no reintentar indefinidamente
        return;
      }

      architectureState.time += 0.016;

      const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
      bgGrad.addColorStop(0, COLORS.bgDarker);
      bgGrad.addColorStop(1, COLORS.bgDark);
      clearCanvas(ctx, w, h, bgGrad);

      drawLevelGuides(ctx, w, h);

      // Buses (from separate ARCH_BUSES array)
      ARCH_BUSES.forEach((bus) => {
        const from = ARCH_COMPONENTS[bus.from];
        const to = ARCH_COMPONENTS[bus.to];
        const info = BUS_DATA[bus.id];
        if (from && to && info) {
          drawBusLine(ctx, w, h, from, to, info.color,
            architectureState.hoveredBus === bus.id,
            architectureState.selectedBus === bus.id,
            bus.id, bus.offset
          );
        }
      });

      // Components
      Object.entries(ARCH_COMPONENTS).forEach(([key, comp]) => {
        drawComponent(ctx, w, h, comp, architectureState.hoveredComponent === key, architectureState.time);
      });

      // Tooltips
      if (architectureState.hoveredComponent) {
        const comp = ARCH_COMPONENTS[architectureState.hoveredComponent];
        if (comp) drawTooltip(ctx, 'Click para detalles', comp.x * w, comp.y * h - (comp.height * h) / 2 - 35, comp.color);
      } else if (architectureState.hoveredBus) {
        const info = BUS_DATA[architectureState.hoveredBus];
        if (info) drawTooltip(ctx, `${info.title} — ${info.speed}`, w / 2, 35, info.color);
      }

      if (architectureState.running) {
        architectureState.animationFrame = requestAnimationFrame(() => draw(canvas));
      }
    };

    return Object.freeze({ draw, getState: () => architectureState });
  })();
  
  // Expose to global scope for event listeners
  window.archRenderer = archRenderer;

  const detectComponentHover = (x, y, comp) =>
    x >= comp.x - comp.width / 2 && x <= comp.x + comp.width / 2 &&
    y >= comp.y - comp.height / 2 && y <= comp.y + comp.height / 2;

  const detectBusHover = (mx, my, from, to, tolerance, offset) => {
    const canvas = $('architecture-canvas');
    const cw = canvas?.width || 800;
    const ch = canvas?.height || 500;
    const offNorm = (offset || 0) / cw;

    // Endpoints matching drawBusLine (normalized)
    const p0x = from.x + offNorm;
    const p0y = from.y + from.height / 2 + 6 / ch;
    const p3x = to.x + offNorm;
    const p3y = to.y - to.height / 2 - 6 / ch;

    // S-curve control points: CP1(p0x, p3y), CP2(p3x, p0y)
    // Sample the cubic bezier
    const steps = 40;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x = u*u*u*p0x + 3*u*u*t*p0x + 3*u*t*t*p3x + t*t*t*p3x;
      const y = u*u*u*p0y + 3*u*u*t*p3y + 3*u*t*t*p0y + t*t*t*p3y;
      if (Math.hypot(mx - x, my - y) <= tolerance) return true;
    }
    return false;
  };

  const handleCanvasMouseMove = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / canvas.width;
    const y = (e.clientY - rect.top) / canvas.height;

    architectureState.hoveredBus = null;
    architectureState.hoveredComponent = null;

    // Check buses first (they're thinner, easier to miss)
    for (const bus of ARCH_BUSES) {
      const from = ARCH_COMPONENTS[bus.from];
      const to = ARCH_COMPONENTS[bus.to];
      if (from && to && detectBusHover(x, y, from, to, 0.06, bus.offset)) {
        architectureState.hoveredBus = bus.id;
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    // Then check components (larger targets)
    for (const [key, comp] of Object.entries(ARCH_COMPONENTS)) {
      if (detectComponentHover(x, y, comp)) {
        architectureState.hoveredComponent = key;
        canvas.style.cursor = 'pointer';
        return;
      }
    }

    canvas.style.cursor = 'default';
  };

  const handleCanvasClick = (e, canvas) => {
    if (architectureState.hoveredComponent) {
      const comp = ARCH_COMPONENTS[architectureState.hoveredComponent];
      const info = COMPONENT_INFO[architectureState.hoveredComponent];
      if (!info || !comp) return;

      const panel = $(DOM.busInfoPanel);
      if (!panel) return;
      const specsHTML = info.specs.map((s) => `<li class="text-xs text-slate-300">• ${s}</li>`).join('');
      const nivelHTML = info.nivel ? `<div class="inline-block bg-slate-700 text-brand-400 text-xs font-bold px-3 py-1 rounded-full mb-3">${info.nivel}</div>` : '';
      panel.innerHTML = `
        <div class="text-left">
          ${nivelHTML}
          <h3 class="text-2xl font-bold text-brand-400 mb-2"><i class="fas fa-microchip text-xl mr-2"></i> ${info.name}</h3>
          <p class="text-slate-300 text-sm mb-4 leading-relaxed">${info.desc}</p>
          <div class="bg-slate-800 border-l-4 px-4 py-3 rounded" style="border-left-color: ${comp.color}">
            <div class="text-xs text-slate-400 mb-2 font-semibold">ESPECIFICACIONES</div>
            <ul class="space-y-1">${specsHTML}</ul>
          </div>
        </div>`;
      animatePanel(panel);
      return;
    }

    if (architectureState.hoveredBus) {
      architectureState.selectedBus = architectureState.hoveredBus;
      const data = BUS_DATA[architectureState.hoveredBus];
      if (!data) return;

      const panel = $(DOM.busInfoPanel);
      if (!panel) return;
      panel.innerHTML = `
        <div class="text-left">
          <h3 class="text-xl font-bold text-brand-400 mb-3 flex items-center gap-2">
            <i class="fas fa-network-wired"></i> ${data.title}
          </h3>
          <p class="text-slate-300 text-sm mb-4 leading-relaxed">${data.desc}</p>
          <div class="bg-slate-800 border-l-4 px-4 py-3 rounded" style="border-left-color: ${data.color}">
            <div class="text-xs text-slate-400 mb-1">VELOCIDAD</div>
            <div class="font-mono text-sm" style="color: ${data.color}">${data.speed}</div>
          </div>
        </div>`;
      animatePanel(panel);
    }
  };

  const animatePanel = (panel) => {
    panel.style.opacity = '0.7';
    panel.style.transform = 'scale(0.95)';
    setTimeout(() => {
      panel.style.transition = 'all 0.3s ease';
      panel.style.opacity = '1';
      panel.style.transform = 'scale(1)';
    }, 10);
  };

  const initArchEvents = () => {
    if (archEventsAttached) return;
    const canvas = $(DOM.archCanvas);
    if (!canvas) return;
    canvas.addEventListener('mousemove', (e) => handleCanvasMouseMove(e, canvas));
    canvas.addEventListener('click', (e) => handleCanvasClick(e, canvas));
    canvas.addEventListener('mouseleave', () => { architectureState.hoveredBus = null; architectureState.hoveredComponent = null; });
    archEventsAttached = true;
  };

  // =============================================
  // 8. SISTEMA DE QUIZ
  // =============================================

const quiz = (() => {
const QUESTIONS = Object.freeze([
      { q: '¿Qué componente permite liberar al procesador durante transferencias pesadas?', opts: ['Bus DMI', 'Controlador DMA', 'Memoria Caché L3', 'Interrupciones'], ans: 1, explain: 'El Controlador DMA toma el control del bus de datos, permitiendo que la CPU continúe ejecutando otras instrucciones mientras se transfieren bloques de datos entre periféricos y RAM.' },
      { q: '¿Cómo funcionan las interrupciones con las tarjetas de red?', opts: ['La CPU pregunta constantemente a la red', 'La tarjeta de red genera una IRQ cuando llegan datos', 'Solo funciona con cable Ethernet', 'No usa interrupciones'], ans: 1, explain: 'Cuando llegan paquetes de datos a la tarjeta de red (Ethernet o WiFi), esta genera una IRQ para notificar a la CPU. Esto permite procesar los datosreceived sin que la CPU esté constantemente preguntando.' },
      { q: 'Arrastra cada concepto hacia su definición correcta:', type: 'drag', pairs: [
        { id: 'irq', label: 'Interrupción (IRQ)', def: 'Señal de hardware que altera asíncronamente el flujo del CPU para ejecutar una rutina especial.' },
        { id: 'dma', label: 'Controlador DMA', def: 'Mueve grandes bloques de datos directamente entre periférico y RAM sin usar la CPU.' },
        { id: 'polling', label: 'Polling (Busy-Waiting)', def: 'La CPU desperdicia ciclos preguntando constantemente al dispositivo si tiene datos listos.' },
      ]},
      { q: 'En 2026, ¿qué estándar unifica pantalla, datos y carga a 80 Gbps?', opts: ['SATA IV', 'PCIe 5.0', 'USB4 v2', 'Ethernet 10G'], ans: 2, explain: 'USB4 v2 alcanza 80 Gbps bidireccional (hasta 120 Gbps asimétrico), unificando datos, video 8K y energía de hasta 240W en un conector Tipo-C.' },
      { q: '¿Qué problema resuelven las Interrupciones (IRQ) frente al Polling?', opts: ['Aumenta espacio en disco', 'Evita que la CPU desperdicie ciclos', 'Mejora resolución gráfica', 'Acelera ventiladores'], ans: 1, explain: 'Con Polling, la CPU desperdicia ciclos preguntando constantemente. Las IRQ permiten que el dispositivo notifique a la CPU solo cuando necesita servicio.' },
      { q: 'Arrastra cada tecnología hacia su descripción correcta:', type: 'drag', pairs: [
        { id: 'pcie6', label: 'PCIe 6.0', def: 'Usa modulación PAM4 para alcanzar 128 GT/s sin aumentar frecuencia.' },
        { id: 'usb4v2', label: 'USB4 v2', def: 'Unifica datos, video 8K y carga de hasta 240W en un conector Tipo-C.' },
        { id: 'cx14', label: 'CXL 4.0', def: 'Permite coherencia de caché entre CPU, GPU y aceleradores para memoria compartida.' },
      ]},
      { q: '¿Cuál es el bus más rápido en una PC moderna (2026)?', opts: ['Bus SATA III', 'Bus USB 3.2', 'Bus de Memoria (CPU-RAM)', 'Bus DMI'], ans: 2, explain: 'El bus de memoria conecta la CPU directamente con la RAM DDR5, alcanzanado ~50-80 GB/s. Es el más rápido del sistema.' },
      { q: 'En la transferencia DMA, ¿qué ocurre en paso de Concesión (HOLD/HLDA)?', opts: ['El disco envía datos a la RAM', 'La CPU libera el bus y concede acceso al DMA', 'El DMA envía una interrupción al CPU', 'Se reinicia el sistema'], ans: 1, explain: 'El DMA envía HOLD al CPU, que responde con HLDA liberando el bus para que el DMA transfiera datos.' },
      { q: '¿Qué es PCIe 6.0 y qué modulación usa para duplicar su velocidad?', opts: ['Modulación QAM para WiFi', 'Modulación PAM4 para buses punto a punto', 'Modulación NRZ para SATA', 'Modulación FM para audio'], ans: 1, explain: 'PCIe 6.0 usa PAM4 (2 bits por símbolo), duplicando el ancho de banda sin aumentar la frecuencia.' },
      { q: 'Arrastra cada estándar hacia su velocidad máxima:', type: 'drag', pairs: [
        { id: 'pcie5', label: 'PCIe 5.0', def: '64 GT/s (x16 bidireccional)' },
        { id: 'pcie7', label: 'PCIe 7.0', def: '256 GT/s (x16 bidireccional)' },
        { id: 'usb4v1', label: 'USB4 v1', def: '40 Gbps (hasta 120 Gbps asimétrico)' },
      ]},
      { q: '¿Qué tecnología permite que CPU, GPU y aceleradores compartan memoria de forma coherente?', opts: ['SATA Express', 'Thunderbolt 3', 'CXL (Compute Express Link)', 'AGP'], ans: 2, explain: 'CXL opera sobre PCIe permitiendo coherencia de caché entre CPU, GPU y aceleradores para memoria compartida.' },
      { q: '¿Cuál es la diferencia principal entre un bus compartido y punto a punto como PCIe?', opts: ['El compartido es más rápido', 'El punto a punto dedica ancho de banda a cada dispositivo', 'No hay diferencia', 'El compartido usa más energía'], ans: 1, explain: 'En buses compartidos todos compiten por el mismo ancho de banda. PCIe usa lanes dedicadas.' },
      { q: '¿Qué es una IRQ (Interrupt Request)?', opts: ['Una instrucción de CPU', 'Una señal que envía un dispositivo para solicitar atención de la CPU', 'Un tipo de memoria', 'Un protocolo de red'], ans: 1, explain: 'Una IRQ es una señal de hardware que envía un dispositivo periférico a la CPU para solicitar atención inmediata.' },
      { q: '¿Cuál es la función principal del APIC?', opts: ['Almacenar datos', 'Gestionar y prioritzar las interrupciones', 'Conectar la CPU a la RAM', 'Controlar ventiladores'], ans: 1, explain: 'El APIC (Advanced Programmable Interrupt Controller) gestiona y prioriza las interrupciones antes de enviarlas a la CPU.' },
      { q: '¿Qué es la ISR (Interrupt Service Routine)?', opts: ['Un programa de instalación', 'Una rutina que se ejecuta cuando ocurre una interrupción', 'Un tipo de bus', 'Una memoria caché'], ans: 1, explain: 'La ISR es el código que ejecuta la CPU en respuesta a una interrupción específica.' },
      { q: '¿Cuál de estos es un ejemplo de interrupción de software?', opts: ['Presionar una tecla', 'Recibir un paquete de red', 'Una llamada al sistema (syscall)', 'Insertar un USB'], ans: 2, explain: 'Las llamadas al sistema (syscalls) son interrupciones de software generadas por programas para pedir servicios al SO.' },
      { q: '¿Qué tipo de transferencia permite el DMA?', opts: ['CPU a CPU', 'Periférico a RAM sin pasar por la CPU', 'RAM a RAM', 'Solo dentro de la caché'], ans: 1, explain: 'DMA permite transferir datos directamente entre periférico y memoria RAM sin intervención de la CPU.' },
      { q: '¿Qué señal envía el dispositivo al DMA para solicitar transferencia?', opts: ['IRQ', 'DRQ (DMA Request)', 'HLDA', 'HOLD'], ans: 1, explain: 'DRQ (DMA Request) es la señal que envía el dispositivo al controlador DMA para solicitar acceso al bus.' },
      { q: '¿Qué significa HLDA en el proceso DMA?', opts: ['High Level Data Access', 'Hold Acknowledge - la CPU libera el bus', 'Host Local Data Address', 'High Latency Data Array'], ans: 1, explain: 'HLDA (Hold Acknowledge) es la respuesta de la CPU indicando que ha liberado el bus para el DMA.' },
      { q: '¿Qué es el modo Burst en DMA?', opts: ['Transferencia byte a byte', 'Transferencia continua de múltiples datos sin intervención de la CPU', 'Solo un dato por ciclo', 'Modo de bajo consumo'], ans: 1, explain: 'El modo Burst transfiere múltiples datos de forma continua sin que la CPU intervenga.' },
      { q: '¿Cuál es el bus más cercano a la CPU en una PC moderna?', opts: ['PCIe', 'USB', 'Bus de memoria (CPU-RAM)', 'SATA'], ans: 2, explain: 'El bus de memoria conecta directamente la CPU con la RAM y es el más rápido del sistema.' },
      { q: '¿Qué es un Root Port en PCIe?', opts: ['Un puerto USB', 'El punto de conexión principal del Root Complex al bus PCIe', 'Un tipo de SSD', 'Un concentrador de red'], ans: 1, explain: 'El Root Port es el punto de conexión principal desde la CPU/Chipset al bus PCIe.' },
      { q: '¿Para qué sirve un Switch PCIe?', opts: ['Para apagar el sistema', 'Para conectar múltiples dispositivos PCIe y dirigir el tráfico', 'Para aumentar la memoria', 'Para conectar monitores'], ans: 1, explain: 'Un Switch PCIe conecta múltiples dispositivos y permite compartir enlaces.' },
      { q: '¿Qué velocidad alcanza PCIe 7.0 (x16)?', opts: ['64 GT/s', '128 GT/s', '256 GT/s', '512 GT/s'], ans: 2, explain: 'PCIe 7.0 alcanza 256 GT/s en configuración x16.' },
      { q: '¿Qué modulación usa PCIe 6.0 para duplicar velocidad?', opts: ['NRZ', 'PAM4', 'QAM', 'FSK'], ans: 1, explain: 'PCIe 6.0 usa PAM4 (2 bits por símbolo) para duplicar el ancho de banda.' },
      { q: '¿Cuántos GT/s alcanza CXL 4.0?', opts: ['32 GT/s', '64 GT/s', '128 GT/s', '256 GT/s'], ans: 2, explain: 'CXL 4.0 alcanza hasta 128 GT/s.' },
      { q: '¿Quién desarrolló originalmente CXL?', opts: ['AMD', 'NVIDIA', 'Intel', 'Google'], ans: 2, explain: 'Intel desarrolló originalmente CXL y lo donó al Consortium en 2019.' },
      { q: '¿CXL es un estándar propiedad de una sola empresa?', opts: ['Sí, de Intel', 'Sí, de AMD', 'No, es un estándar abierto del Consortium', 'Sí, de NVIDIA'], ans: 2, explain: 'CXL es un estándar abierto gobernado por el CXL Consortium con múltiples empresas.' },
      { q: '¿Cuál es la diferencia entre el Root Port y el Switch en PCIe?', opts: ['El Root Port conecta monitores', 'El Switch permite conectar múltiples dispositivos', 'No hay diferencia', 'El Root Port es más lento'], ans: 1, explain: 'El Switch PCIe conecta múltiples dispositivos PCIe y dirige el tráfico entre ellos, mientras el Root Port es el punto de conexión principal del CPU al bus.' },
      { q: '¿Qué conexión unifica datos, video 8K y carga en un solo conector Tipo-C?', opts: ['USB 3.2', 'USB4 v2', 'HDMI', 'DisplayPort'], ans: 1, explain: 'USB4 v2 unifica datos, video 8K/16K y carga de hasta 240W en un conector Tipo-C.' },
      { q: '¿Cuál es la ventaja principal de CXL sobre PCIe?', opts: ['Mayor velocidad', 'Coherencia de caché entre dispositivos', 'Menor consumo', 'Más económico'], ans: 1, explain: 'CXL permite coherencia de caché entre CPU, GPU y aceleradores, compartiendo memoria de forma eficiente.' },
    ]);

    const SHUFFLED_QUESTIONS = [...QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 20);

    let current = 0;
    let score = 0;

    const load = () => {
      if (current >= SHUFFLED_QUESTIONS.length) return;
      const q = SHUFFLED_QUESTIONS[current];
      setText(DOM.quizCounter, `Pregunta ${current + 1}/${SHUFFLED_QUESTIONS.length}`);
      setText(DOM.quizPregunta, q.q);

      const optsEl = $(DOM.quizOpciones);
      if (!optsEl) return;

      let sibling = optsEl.nextElementSibling;
      while (sibling) {
        const next = sibling.nextElementSibling;
        if (sibling.classList.contains('mt-4') || sibling.id === 'quiz-next-btn') {
          sibling.remove();
        }
        sibling = next;
      }

      if (q.type === 'drag') {
        loadDragQuestion(q);
      } else {
        optsEl.innerHTML = q.opts
          .map((opt, i) => `<button data-idx="${i}" class="quiz-opt w-full text-left p-4 rounded-lg bg-slate-700 hover:bg-slate-600 border border-slate-500 transition-colors font-medium">${opt}</button>`)
          .join('');

        optsEl.querySelectorAll('.quiz-opt').forEach((btn) => {
          btn.addEventListener('click', () => answer(parseInt(btn.dataset.idx), btn));
        });
      }
    };

    const loadDragQuestion = (q) => {
      const optsEl = $(DOM.quizOpciones);
      if (!optsEl) return;
      
      const shuffled = [...q.pairs].sort(() => Math.random() - 0.5);
      const targets = [...q.pairs].sort(() => Math.random() - 0.5);
      
      optsEl.innerHTML = `
        <div class="flex flex-col md:flex-row gap-4 items-center justify-center w-full">
          <div class="flex flex-wrap gap-3 justify-center" id="quiz-drag-items">
            ${shuffled.map(p => `<div class="quiz-drag-item bg-blue-900/80 border-2 border-blue-400 rounded-lg font-semibold select-none cursor-pointer" data-id="${p.id}">${p.label}</div>`).join('')}
          </div>
          <div class="text-slate-500 text-2xl">→</div>
          <div class="flex flex-col gap-2" id="quiz-drop-zones">
            ${targets.map(t => `<div class="quiz-drop-zone bg-slate-800 border-2 border-dashed border-slate-600 rounded-lg p-3 cursor-pointer" data-target="${t.id}"><span class="text-slate-300">${t.def}</span></div>`).join('')}
          </div>
        </div>
        <div class="mt-3 flex items-center justify-center gap-3">
          <div class="flex-1 max-w-xs h-2 bg-slate-700 rounded-full overflow-hidden">
            <div id="quiz-drag-progress" class="h-full bg-green-500 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
          <span id="quiz-drag-counter" class="text-xs text-slate-400 font-mono">0 / ${q.pairs.length}</span>
        </div>
        <div id="quiz-drag-status" class="text-center text-sm mt-2 h-6"></div>
      `;
      
      initQuizDragDrop(q.pairs.length);
    };

    let dragMatched = 0;
    let dragTotal = 0;
    let selectedDrag = null;

    const initQuizDragDrop = (total) => {
      dragMatched = 0;
      dragTotal = total;
      selectedDrag = null;
      
      const dragItems = document.querySelectorAll('.quiz-drag-item');
      const dropZones = document.querySelectorAll('.quiz-drop-zone');
      
      dragItems.forEach(item => {
        item.addEventListener('click', () => {
          if (item.style.opacity === '0.5') return;
          dragItems.forEach(i => i.classList.remove('ring-2'));
          item.classList.add('ring-2');
          selectedDrag = item;
        });
      });
      
      dropZones.forEach(zone => {
        zone.addEventListener('click', () => {
          if (!selectedDrag) return;
          const id = selectedDrag.dataset.id;
          const target = zone.dataset.target;
          
          if (target === id) {
            selectedDrag.style.opacity = '0.5';
            selectedDrag.style.pointerEvents = 'none';
            selectedDrag.classList.remove('ring-2');
            zone.classList.remove('border-dashed', 'border-slate-600');
            zone.classList.add('border-solid', 'border-green-500', 'bg-green-900/30');
            dragMatched++;
            document.getElementById('quiz-drag-progress').style.width = (dragMatched / dragTotal * 100) + '%';
            document.getElementById('quiz-drag-counter').textContent = dragMatched + ' / ' + dragTotal;
            
            if (dragMatched === dragTotal) {
              document.getElementById('quiz-drag-status').innerHTML = '<span class="text-green-400 font-bold">¡Correcto! Todas las respuestas coinciden.</span>';
              score++;
              addDragNextButton();
            }
          } else {
            document.getElementById('quiz-drag-status').innerHTML = '<span class="text-red-400">Incorrecto, intenta de nuevo.</span>';
            setTimeout(() => document.getElementById('quiz-drag-status').textContent = '', 1500);
          }
          dragItems.forEach(i => i.classList.remove('ring-2'));
          selectedDrag = null;
        });
      });
    };

    const addDragNextButton = () => {
      const nextBtn = document.createElement('button');
      nextBtn.id = 'quiz-next-btn';
      nextBtn.className = 'mt-4 w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors';
      nextBtn.textContent = current < SHUFFLED_QUESTIONS.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultados';
      nextBtn.addEventListener('click', () => {
        current++;
        if (current < SHUFFLED_QUESTIONS.length) load();
        else showResults();
      });
      $(DOM.quizOpciones)?.after(nextBtn);
    };

    const answer = (idx, btn) => {
      const btns = $(DOM.quizOpciones)?.querySelectorAll('button');
      if (!btns) return;
      btns.forEach((b) => { b.disabled = true; b.classList.add('cursor-not-allowed', 'opacity-70'); });

const correct = SHUFFLED_QUESTIONS[current].ans;
      const isCorrect = idx === correct;
      if (isCorrect) {
        btn.classList.replace('bg-slate-700', 'bg-green-600');
        btn.classList.replace('border-slate-500', 'border-green-400');
      } else {
        btn.classList.replace('bg-slate-700', 'bg-red-600');
        btn.classList.replace('border-slate-500', 'border-red-400');
        btns[correct].classList.replace('bg-slate-700', 'bg-green-600');
      }

      const explain = SHUFFLED_QUESTIONS[current].explain;
      if (explain) {
        const el = document.createElement('div');
        el.className = 'mt-4 p-4 rounded-lg text-sm leading-relaxed ' + (isCorrect ? 'bg-green-900/30 border border-green-700 text-green-200' : 'bg-red-900/30 border border-red-700 text-red-200');
        el.innerHTML = '<strong>' + (isCorrect ? 'Correcto.' : 'Incorrecto.') + '</strong> ' + explain;
        $(DOM.quizOpciones)?.after(el);
      }

      const nextBtn = document.createElement('button');
      nextBtn.id = 'quiz-next-btn';
      nextBtn.className = 'mt-4 w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors';
      nextBtn.textContent = current < SHUFFLED_QUESTIONS.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultados';
      nextBtn.addEventListener('click', () => {
        current++;
        if (current < SHUFFLED_QUESTIONS.length) load();
        else showResults();
      });
      $(DOM.quizOpciones)?.after(nextBtn);
    };

    const showResults = () => {
      addClass(DOM.quizContent, 'hidden');
      addClass(DOM.quizCounter, 'hidden');
      const panel = $(DOM.quizResult);
      if (panel) {
        panel.classList.remove('hidden');
        panel.classList.add('flex');
      }
      setHTML(DOM.quizScore, `Has acertado <strong>${score}</strong> de <strong>${SHUFFLED_QUESTIONS.length}</strong> preguntas.`);
    };

    const reset = () => {
      current = 0;
      score = 0;
      removeClass(DOM.quizContent, 'hidden');
      removeClass(DOM.quizCounter, 'hidden');
      const panel = $(DOM.quizResult);
      if (panel) {
        panel.classList.add('hidden');
        panel.classList.remove('flex');
      }
      load();
    };

    return Object.freeze({ load, reset });
  })();

  // =============================================
  // 10. INICIALIZACIÓN
  // =============================================

   const init = () => {
     safely(() => irqSimulator.init());
     safely(() => initArchEvents());
     safely(() => dmaSimulator.initCanvas());
     safely(() => createMovingBackground());
     safely(() => navigation.init());
     safely(() => quiz.load());
     safely(() => navigation.updateProgress(LEVELS[0]));
     safely(() => wifiEthSim.initListeners());
   };

  window.addEventListener('load', () => setTimeout(init, 100));

  // Expose functions needed by HTML onclick handlers
  window.iniciarSimuladorCPU = () => safely(() => irqSimulator.start());
  window.detenerSimuladorCPU = () => safely(() => irqSimulator.stop());
  window.simularPresionTecla = () => safely(() => {
  irqSimulator.simulateKeyPress();
  animarFlujoIRQ();});
  window.dmaStartSimulation = (mode) => safely(() => dmaSimulator.start(mode));
  window.navegarA = (id) => safely(() => navigation.activate(id));
  window.reiniciarQuiz = () => safely(() => quiz.reset());

  // WiFi vs Ethernet Simulator (sección Interrupciones - simCanvas2)
  const wifiEthSim = (() => {
    let running = false;
    let time = 0;
    let ethIRQ = 3400, wifiIRQ = 2500;
    let ethCpu = 38, wifiCpu = 26;
    let baseLoad = 60, napi = true, stress = false;
    let animId = null;
    let canvasW = 700;
    let canvasH = 420;

    const draw = () => {
      const canvas = $('simCanvas2');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const w = canvasW;
      const h = canvasH;

      if (!running) return;

      ctx.clearRect(0, 0, w, h);
      
      // Fondo transparente (se ve el fondo de la página)
      
      const ethX = w * 0.25;
      const wifiX = w * 0.75;

      // Ethernet box
      ctx.fillStyle = '#113366';
      ctx.fillRect(ethX-60, 25, 120, 60);
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 4;
      ctx.strokeRect(ethX-60, 25, 120, 60);
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('ETHERNET', ethX, 60);

      // WiFi box
      ctx.fillStyle = '#662244';
      ctx.fillRect(wifiX-60, 25, 120, 60);
      ctx.strokeStyle = '#ff44aa';
      ctx.lineWidth = 4;
      ctx.strokeRect(wifiX-60, 25, 120, 60);
      ctx.fillStyle = '#ff44aa';
      ctx.fillText('WIFI', wifiX, 60);

      // Cálculos
      const lf = baseLoad / 100;
      let ethT = 3400 + lf * 14000, wifiT = 2500 + lf * 8700;
      if (stress) { ethT = 16800 + Math.random()*7200; wifiT = 10200 + Math.random()*5800; }
      if (!napi) { ethT *= 2.25; wifiT *= 1.95; }
      ethIRQ = ethIRQ * 0.73 + ethT * 0.27;
      wifiIRQ = wifiIRQ * 0.73 + wifiT * 0.27;

      let ethCT = ethIRQ / 170, wifiCT = wifiIRQ / 200;
      if (napi) { ethCT *= 0.38; wifiCT *= 0.40; }
      if (stress) { ethCT *= 1.55; wifiCT *= 1.48; }
      ethCpu = Math.min(98, ethCpu * 0.76 + ethCT * 0.24);
      wifiCpu = Math.min(97, wifiCpu * 0.76 + wifiCT * 0.24);

      // Rayos IRQ
      if (Math.random() < 0.87) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(ethX, 90); ctx.lineTo(ethX, 220); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 12px Arial';
        ctx.fillText('⚡ IRQ', ethX+30, 160);
      }
      if (Math.random() < 0.78) {
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([3, 7]);
        ctx.beginPath(); ctx.moveTo(wifiX, 90); ctx.lineTo(wifiX, 220); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffff00';
        ctx.fillText('⚡ IRQ', wifiX+28, 155);
      }

      // Ondas WiFi
      let r = (time * 4) % 80;
      ctx.strokeStyle = `rgba(255, 70, 180, ${0.7 - r/200})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(wifiX, 70, r + 25, 0, Math.PI*2);
      ctx.stroke();

      // CPU boxes
      ctx.fillStyle = '#334455';
      ctx.fillRect(ethX-50, 260, 100, 50);
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 2;
      ctx.strokeRect(ethX-50, 260, 100, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('CPU', ethX, 275);
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = ethCpu > 70 ? '#ff4444' : (ethCpu > 40 ? '#ffaa00' : '#00ff88');
      ctx.fillText(Math.floor(ethCpu) + '%', ethX, 295);

      ctx.fillStyle = '#334455';
      ctx.fillRect(wifiX-50, 260, 100, 50);
      ctx.strokeStyle = '#ff44aa';
      ctx.lineWidth = 2;
      ctx.strokeRect(wifiX-50, 260, 100, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Arial';
      ctx.fillText('CPU', wifiX, 275);
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = wifiCpu > 70 ? '#ff4444' : (wifiCpu > 40 ? '#ffaa00' : '#00ff88');
      ctx.fillText(Math.floor(wifiCpu) + '%', wifiX, 295);

      // NAPI indicator
      if (napi && baseLoad > 35) {
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 5]);
        ctx.beginPath(); ctx.moveTo(ethX-58, 245); ctx.lineTo(ethX+58, 245); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(wifiX-58, 245); ctx.lineTo(wifiX+58, 245); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('NAPI', ethX, 258);
        ctx.fillText('NAPI', wifiX, 258);
      }

      // Contadores IRQ con fondo
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(ethX - 90, 330, 180, 35);
      ctx.strokeStyle = '#00ccff';
      ctx.lineWidth = 1;
      ctx.strokeRect(ethX - 90, 330, 180, 35);
      ctx.fillStyle = '#00ccff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Ethernet: ' + Math.floor(ethIRQ) + ' IRQ/s', ethX, 353);
      
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(wifiX - 90, 330, 180, 35);
      ctx.strokeStyle = '#ff44aa';
      ctx.lineWidth = 1;
      ctx.strokeRect(wifiX - 90, 330, 180, 35);
      ctx.fillStyle = '#ff44aa';
      ctx.font = 'bold 16px Arial';
      ctx.fillText('WiFi: ' + Math.floor(wifiIRQ) + ' IRQ/s', wifiX, 353);

      // Gauges CPU - removed

      // Medidores de Coalescing
      const ethCoalescing = napi ? Math.min(95, 65 + baseLoad * 0.3) : Math.min(70, 30 + baseLoad * 0.25);
      const wifiCoalescing = napi ? Math.min(60, 25 + baseLoad * 0.2) : Math.min(45, 15 + baseLoad * 0.15);
      
      const ethBar = $('ethCoalescingBar');
      const wifiBar = $('wifiCoalescingBar');
      const ethText = $('ethCoalescingText');
      const wifiText = $('wifiCoalescingText');
      
      if (ethBar && wifiBar && ethText && wifiText) {
        ethBar.style.width = ethCoalescing + '%';
        wifiBar.style.width = wifiCoalescing + '%';
        ethText.textContent = Math.floor(ethCoalescing) + '%';
        wifiText.textContent = Math.floor(wifiCoalescing) + '%';
        
        // Colores según eficiencia
        ethBar.className = ethCoalescing > 60 ? 'h-full bg-green-500 transition-all duration-300' : (ethCoalescing > 40 ? 'h-full bg-yellow-500 transition-all duration-300' : 'h-full bg-red-500 transition-all duration-300');
        wifiBar.className = wifiCoalescing > 50 ? 'h-full bg-green-500 transition-all duration-300' : (wifiCoalescing > 30 ? 'h-full bg-yellow-500 transition-all duration-300' : 'h-full bg-red-500 transition-all duration-300');
        
        ethText.className = ethCoalescing > 60 ? 'text-xs text-green-400 mt-1' : (ethCoalescing > 40 ? 'text-xs text-yellow-400 mt-1' : 'text-xs text-red-400 mt-1');
        wifiText.className = wifiCoalescing > 50 ? 'text-xs text-green-400 mt-1' : (wifiCoalescing > 30 ? 'text-xs text-yellow-400 mt-1' : 'text-xs text-red-400 mt-1');
      }

      // Título
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Interrupciones (IRQs): WiFi vs Ethernet', w/2, 25);

      time++;
      if (running) animId = requestAnimationFrame(draw);
    };

    const start = () => {
      if (running) return;
      
      const canvas = $('simCanvas2');
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        canvasW = Math.floor(rect.width) || 700;
        canvasH = Math.floor(rect.height) || 420;
        canvas.width = canvasW;
        canvas.height = canvasH;
      }
      
      running = true;
      setEnabled('startBtn2', false);
      setEnabled('stopBtn2', true);
      draw();
    };

    const stop = () => {
      running = false;
      if (animId) cancelAnimationFrame(animId);
      setEnabled('startBtn2', true);
      setEnabled('stopBtn2', false);
    };

    const reset = () => {
      time = 0;
      ethIRQ = 3400; wifiIRQ = 2500;
      ethCpu = 38; wifiCpu = 26;
      baseLoad = 60; napi = true; stress = false;
      const canvas = $('simCanvas2');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const w = canvasW;
        const h = canvasH;
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#050520';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#00ccff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Haz clic en INICIAR', w/2, h/2);
      }
      setEnabled('startBtn2', true);
      setEnabled('stopBtn2', false);
      const loadVal = $('loadValue2');
      if (loadVal) loadVal.textContent = '60%';
      const loadSlider = $('loadSlider2');
      if (loadSlider) loadSlider.value = 60;
      const napiBtn = $('napiBtn2');
      if (napiBtn) {
        napiBtn.textContent = 'NAPI (ON)';
        napiBtn.classList.add('bg-cyan-600');
        napiBtn.classList.remove('bg-slate-600');
      }
      const stressBtn = $('stressBtn2');
      if (stressBtn) {
        stressBtn.classList.remove('active');
        stressBtn.style.background = '';
        stressBtn.style.color = '';
      }
    };

    // Inicializar listeners cuando el DOM esté listo
    const init = () => {
      $('startBtn2')?.addEventListener('click', start);
      $('stopBtn2')?.addEventListener('click', stop);
      $('loadSlider2')?.addEventListener('input', e => {
        baseLoad = +e.target.value;
        $('loadValue2').textContent = baseLoad + '%';
      });
      $('napiBtn2')?.addEventListener('click', e => {
        napi = !napi;
        e.target.textContent = napi ? 'NAPI (ON)' : 'NAPI (OFF)';
        e.target.classList.toggle('bg-cyan-600', napi);
        e.target.classList.toggle('bg-slate-600', !napi);
      });
      $('stressBtn2')?.addEventListener('click', e => {
        stress = !stress;
        e.target.classList.toggle('active', stress);
        e.target.style.background = stress ? '#ef4444' : '';
        e.target.style.color = stress ? '#fff' : '';
      });
      // Dibujar frame inicial
      reset();
    };

    // Auto-inicializar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    return { start, stop, reset, setSize: (w, h) => { canvasW = w; canvasH = h; } };
  })();

  window.iniciarSimuladorWifi = () => safely(() => wifiEthSim.start());
  window.detenerSimuladorWifi = () => safely(() => wifiEthSim.stop());

})();


// ==================== SIMULADOR PCIe 5.0 / 6.0 / 7.0 ====================
// Datos basados en especificaciones oficiales PCI-SIG
// PCIe 5.0: 64 GT/s, NRZ, 128b/130b (Nov 2019)
// PCIe 6.0: 128 GT/s, PAM4, FEC+FLIT (Ene 2022)
// PCIe 7.0: 256 GT/s, PAM4 mejorado, FEC avanzado (Jun 2025)
const PCIeSimulator = (() => {
  const PCIE = {
    pcie5: {
      maxGBps: 64,       // x16 bidireccional teórico
      gtPerSec: 64,       // 64 GT/s
      encoding: 'NRZ',    // 128b/130b → overhead ~1.5%
      eficiencia: 0.85,   // ~85% eficiencia realista (encoding + protocolo)
      latencia: 200       // μs
    },
    pcie6: {
      maxGBps: 128,       // x16 bidireccional teórico
      gtPerSec: 128,      // 128 GT/s
      encoding: 'PAM4',   // FLIT + FEC → overhead ~3%
      eficiencia: 0.90,   // ~90% eficiencia (FEC mejora robustez)
      latencia: 150       // μs
    },
    pcie7: {
      maxGBps: 256,       // x16 bidireccional teórico
      gtPerSec: 256,      // 256 GT/s
      encoding: 'PAM4+',  // FEC avanzado → overhead ~2.5%
      eficiencia: 0.88,   // ~88% (más overhead por FEC más complejo)
      latencia: 100       // μs (mejora por hardware dedicado)
    }
  };

  const DEVICES = {
    none: Infinity,
    ssd_gen4: 7,
    ssd_gen5: 14,
    gpu: 64
  };

  let running = false;
  let timers = [];
  let animationId = null;

  const $ = (id) => document.getElementById(id);
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  const getLanes = () => parseInt($('lanes')?.value) || 16;
  const getDevice = () => $('device')?.value || 'none';
  const getMode = () => $('mode')?.value || 'realista';
  const getDirectionFactor = () => $('directionMode')?.value === 'bidirectional' ? 2 : 1;
  const getDirectionModeStr = () => $('directionMode')?.value === 'bidirectional' ? 'Bidireccional' : 'Unidireccional';
  const getDataAmount = () => clamp(parseFloat($('dataAmount')?.value) || 64, 1, 10000);

  // Velocidad real: velocidad base × (lanes/16) × eficiencia (modo realista), limitada por dispositivo
  const calcularVelocidadReal = (baseSpeed, pcieVersion, lanes, device, mode) => {
    let velocidad = baseSpeed * (lanes / 16);
    if (mode === 'realista') velocidad *= PCIE[pcieVersion].eficiencia;
    return Math.min(velocidad, DEVICES[device] || Infinity);
  };

  const calcularLatenciaReal = (pcieVersion, mode) => {
    return mode === 'realista' ? PCIE[pcieVersion].latencia : 0;
  };

  const formatTime = (t) => {
    if (!isFinite(t) || t <= 0) return '∞';
    if (t < 0.001) return `${(t * 1e6).toFixed(0)} μs`;
    if (t < 1) return `${(t * 1000).toFixed(1)} ms`;
    return `${t.toFixed(2)} s`;
  };

  const setText = (id, text) => { const el = $(id); if (el) el.textContent = text; };

  const actualizarSliders = () => {
    const slider5 = $('speed5');
    const slider6 = $('speed6');
    const slider7 = $('speed7');
    if (slider5) {
      slider5.max = PCIE.pcie5.maxGBps;
      if (parseFloat(slider5.value) > parseFloat(slider5.max)) slider5.value = slider5.max;
    }
    if (slider6) {
      slider6.max = PCIE.pcie6.maxGBps;
      if (parseFloat(slider6.value) > parseFloat(slider6.max)) slider6.value = slider6.max;
    }
    if (slider7) {
      slider7.max = PCIE.pcie7.maxGBps;
      if (parseFloat(slider7.value) > parseFloat(slider7.max)) slider7.value = slider7.max;
    }
  };

  const actualizarValores = () => {
    actualizarSliders();

    const lanes = getLanes();
    const device = getDevice();
    const mode = getMode();
    const factor = getDirectionFactor();
    const isUni = getDirectionModeStr() === 'Unidireccional';
    const data = getDataAmount();

    const s5 = clamp(parseFloat($('speed5')?.value || 64), 16, PCIE.pcie5.maxGBps);
    const s6 = clamp(parseFloat($('speed6')?.value || 128), 32, PCIE.pcie6.maxGBps);
    const s7 = clamp(parseFloat($('speed7')?.value || 256), 64, PCIE.pcie7.maxGBps);

    // Velocidades base (por dirección)
    const base5 = calcularVelocidadReal(s5, 'pcie5', lanes, device, mode);
    const base6 = calcularVelocidadReal(s6, 'pcie6', lanes, device, mode);
    const base7 = calcularVelocidadReal(s7, 'pcie7', lanes, device, mode);

    // Latencias
    const lat5 = calcularLatenciaReal('pcie5', mode);
    const lat6 = calcularLatenciaReal('pcie6', mode);
    const lat7 = calcularLatenciaReal('pcie7', mode);

    // Tiempos: data / velocidad + latencia
    // En bidireccional: el tiempo de ida es data/base, el ida/vuelta es data/base * 2
    const t5 = data / base5 + lat5 / 1e6;
    const t6 = data / base6 + lat6 / 1e6;
    const t7 = data / base7 + lat7 / 1e6;

    // Display velocidades
    if (isUni) {
      setText('value5', `${base5.toFixed(1)} GB/s`);
      setText('value6', `${base6.toFixed(1)} GB/s`);
      setText('value7', `${base7.toFixed(1)} GB/s`);
      setText('tiempo5', `${formatTime(t5)}`);
      setText('tiempo6', `${formatTime(t6)}`);
      setText('tiempo7', `${formatTime(t7)}`);
    } else {
      setText('value5', `${base5.toFixed(1)} GB/s | ${(base5 * 2).toFixed(1)} GB/s total`);
      setText('value6', `${base6.toFixed(1)} GB/s | ${(base6 * 2).toFixed(1)} GB/s total`);
      setText('value7', `${base7.toFixed(1)} GB/s | ${(base7 * 2).toFixed(1)} GB/s total`);
      setText('tiempo5', `${formatTime(t5)} ida | ${formatTime(t5 * 2)} ida/vuelta`);
      setText('tiempo6', `${formatTime(t6)} ida | ${formatTime(t6 * 2)} ida/vuelta`);
      setText('tiempo7', `${formatTime(t7)} ida | ${formatTime(t7 * 2)} ida/vuelta`);
    }

    // Mostrar latencia solo en modo realista
    if (mode === 'realista') {
      setText('latencia5', `Latencia: ${(lat5 / 1000).toFixed(2)} ms`);
      setText('latencia6', `Latencia: ${(lat6 / 1000).toFixed(2)} ms`);
      setText('latencia7', `Latencia: ${(lat7 / 1000).toFixed(2)} ms`);
    } else {
      setText('latencia5', 'Latencia: --');
      setText('latencia6', 'Latencia: --');
      setText('latencia7', 'Latencia: --');
    }

    setText('range5', `x1: ${(PCIE.pcie5.maxGBps / 16).toFixed(0)} | x4: ${(PCIE.pcie5.maxGBps / 4).toFixed(0)} | x8: ${(PCIE.pcie5.maxGBps / 2).toFixed(0)} | x16: ${PCIE.pcie5.maxGBps} GB/s`);
    setText('range6', `x1: ${(PCIE.pcie6.maxGBps / 16).toFixed(0)} | x4: ${(PCIE.pcie6.maxGBps / 4).toFixed(0)} | x8: ${(PCIE.pcie6.maxGBps / 2).toFixed(0)} | x16: ${PCIE.pcie6.maxGBps} GB/s`);
    setText('range7', `x1: ${(PCIE.pcie7.maxGBps / 16).toFixed(0)} | x4: ${(PCIE.pcie7.maxGBps / 4).toFixed(0)} | x8: ${(PCIE.pcie7.maxGBps / 2).toFixed(0)} | x16: ${PCIE.pcie7.maxGBps} GB/s`);

    const descEl = $('simulador-desc');
    if (descEl) {
      descEl.textContent = isUni
        ? `Transferencia unidireccional de ${data} GB. PCIe 7.0 es ${(t5 / Math.max(t7, 0.001)).toFixed(1)}x más rápido que PCIe 5.0.`
        : `Transferencia bidireccional de ${data} GB. PCIe 7.0 completa el ciclo ${(t5 * 2 / Math.max(t7 * 2, 0.001)).toFixed(1)}x más rápido que PCIe 5.0.`;
    }

    // Mostrar latencia solo en modo realista
    if (mode === 'realista') {
      setText('latencia5', `Latencia: ${(lat5 / 1000).toFixed(2)} ms`);
      setText('latencia6', `Latencia: ${(lat6 / 1000).toFixed(2)} ms`);
      setText('latencia7', `Latencia: ${(lat7 / 1000).toFixed(2)} ms`);
    } else {
      setText('latencia5', 'Latencia: --');
      setText('latencia6', 'Latencia: --');
      setText('latencia7', 'Latencia: --');
    }

    calcularPicos();
  };

  const toggleSliders = (enabled) => {
    ['speed5', 'speed6', 'speed7'].forEach(id => {
      const el = $(id);
      if (el) el.disabled = !enabled;
    });
  };

  const clearTimers = () => {
    timers.forEach(clearTimeout);
    timers = [];
  };

  const getLimits = (particleId, trackId) => {
    const p = $(particleId);
    const t = $(trackId);
    if (!p || !t || !t.parentElement) return null;
    const container = t.parentElement.getBoundingClientRect();
    const track = t.getBoundingClientRect();
    const width = p.getBoundingClientRect().width || 28;
    const start = track.left - container.left;
    return { start, end: start + track.width - width };
  };

  const animateParticle = (particleId, trackId, tiempoBase, factor, color) => {
    const p = $(particleId);
    const limits = getLimits(particleId, trackId);
    if (!p || !limits || !isFinite(tiempoBase)) return;

    const { start, end } = limits;
    p.style.transition = 'none';
    p.style.left = `${start}px`;
    p.style.animation = '';
    p.querySelectorAll('.packet-indicator, .data-sphere').forEach(el => el.remove());

    const createIndicator = (text) => {
      p.querySelectorAll('.packet-indicator').forEach(el => el.remove());
      const ind = document.createElement('div');
      ind.className = 'packet-indicator';
      ind.style.cssText = `
        position: absolute; top: -28px; left: 50%; transform: translateX(-50%);
        font-size: 10px; font-family: monospace; color: white;
        background: rgba(0,0,0,0.95); padding: 4px 10px; border-radius: 5px;
        white-space: nowrap; z-index: 20; border: 1.5px solid ${color};
        box-shadow: 0 0 8px ${color};
      `;
      ind.textContent = text;
      p.appendChild(ind);
    };

    const animateMove = (from, to, durMs, label, onDone) => {
      const t0 = performance.now();
      createIndicator(label);

      const step = (now) => {
        if (!running) return;
        const prog = Math.min((now - t0) / durMs, 1);
        // Easing: ease-out para que empiece rápido y vaya desacelerando
        const eased = 1 - Math.pow(1 - prog, 2.5);
        p.style.left = `${from + (to - from) * eased}px`;
        const ind = p.querySelector('.packet-indicator');
        if (ind) ind.textContent = `${label} ${Math.round(prog * 100)}%`;
        if (prog < 1) {
          const fid = requestAnimationFrame(step);
          timers.push(setTimeout(() => cancelAnimationFrame(fid), durMs + 100));
        } else {
          if (onDone) onDone();
        }
      };
      const fid = requestAnimationFrame(step);
      timers.push(setTimeout(() => cancelAnimationFrame(fid), durMs + 100));
    };

    const dur = tiempoBase * 1000;

    const loop = () => {
      if (!running) return;
      p.style.left = `${start}px`;

      animateMove(start, end, dur, '→ TRANSFIRIENDO', () => {
        if (!running) return;
        createIndicator('✓ COMPLETADO');
        timers.push(setTimeout(() => {
          if (!running) return;
          p.style.transition = 'left 0.3s ease-out';
          p.style.left = `${start}px`;
          p.querySelectorAll('.packet-indicator').forEach(el => el.remove());
        }, 400));
      });

      timers.push(setTimeout(loop, dur + 1200));
    };
    loop();
  };

  const start = () => {
    if (running) return;
    running = true;
    clearTimers();

    $('btn-iniciar-pcie')?.classList.add('hidden');
    $('btn-detener-pcie')?.classList.remove('hidden');
    toggleSliders(false);

    const factor = getDirectionFactor();
    const isUni = getDirectionModeStr() === 'Unidireccional';
    const lanes = getLanes();
    const device = getDevice();
    const mode = getMode();
    const data = getDataAmount();

    const s5 = clamp(parseFloat($('speed5')?.value || 64), 16, PCIE.pcie5.maxGBps);
    const s6 = clamp(parseFloat($('speed6')?.value || 128), 32, PCIE.pcie6.maxGBps);
    const s7 = clamp(parseFloat($('speed7')?.value || 256), 64, PCIE.pcie7.maxGBps);

    // Velocidad efectiva por dirección
    const eff5 = calcularVelocidadReal(s5, 'pcie5', lanes, device, mode);
    const eff6 = calcularVelocidadReal(s6, 'pcie6', lanes, device, mode);
    const eff7 = calcularVelocidadReal(s7, 'pcie7', lanes, device, mode);

    // Tiempo base (una dirección)
    const t5 = eff5 > 0 ? data / eff5 : Infinity;
    const t6 = eff6 > 0 ? data / eff6 : Infinity;
    const t7 = eff7 > 0 ? data / eff7 : Infinity;

    // Latencias
    const lat5 = calcularLatenciaReal('pcie5', mode);
    const lat6 = calcularLatenciaReal('pcie6', mode);
    const lat7 = calcularLatenciaReal('pcie7', mode);

    // Tiempo de animación: en bidireccional, el ciclo completo es ida+vuelta = t * 2
    // Pero la animación muestra un ciclo completo proporcional
    const animT5 = isUni ? t5 + lat5 / 1e6 : (t5 * 2) + lat5 / 1e6;
    const animT6 = isUni ? t6 + lat6 / 1e6 : (t6 * 2) + lat6 / 1e6;
    const animT7 = isUni ? t7 + lat7 / 1e6 : (t7 * 2) + lat7 / 1e6;

    // Mantener proporciones de velocidad reales
    // PCIe 7.0 debe ser 4x más rápido que PCIe 5.0
    // Escalar a rango visible (3-8 segundos) mantiendo proporciones
    const minVisibleTime = 3;
    const maxVisibleTime = 8;
    const maxAnimT = Math.max(animT5, animT6, animT7);
    
    const normalize = (t) => {
      if (maxAnimT === 0) return minVisibleTime;
      const ratio = t / maxAnimT;  // Cuanto mayor t, mayor ratio = más lento
      // Mapeo directo: más tiempo de transferencia = más tiempo de animación
      return minVisibleTime + (ratio * (maxVisibleTime - minVisibleTime));
    };

    const norm5 = normalize(animT5);
    const norm6 = normalize(animT6);
    const norm7 = normalize(animT7);

    animateParticle('particle5', 'track5', norm5, factor, 'rgb(96, 165, 250)');
    animateParticle('particle6', 'track6', norm6, factor, 'rgb(103, 232, 249)');
    animateParticle('particle7', 'track7', norm7, factor, 'rgb(250, 204, 21)');

    // Iniciar animación de señales
    animateSenales();

    // Actualizar tiempos reales en UI
    setText('tiempo5', `${formatTime(t5)}${!isUni ? ' ida | ' + formatTime(t5 * 2) + ' ida/vuelta' : ''}`);
    setText('tiempo6', `${formatTime(t6)}${!isUni ? ' ida | ' + formatTime(t6 * 2) + ' ida/vuelta' : ''}`);
    setText('tiempo7', `${formatTime(t7)}${!isUni ? ' ida | ' + formatTime(t7 * 2) + ' ida/vuelta' : ''}`);
    
    // Mostrar latencia solo en modo realista
    if (mode === 'realista') {
      setText('latencia5', `Latencia: ${(lat5 / 1000).toFixed(2)} ms`);
      setText('latencia6', `Latencia: ${(lat6 / 1000).toFixed(2)} ms`);
      setText('latencia7', `Latencia: ${(lat7 / 1000).toFixed(2)} ms`);
    } else {
      setText('latencia5', 'Latencia: --');
      setText('latencia6', 'Latencia: --');
      setText('latencia7', 'Latencia: --');
    }
  };

  const stop = () => {
    running = false;
    clearTimers();

    $('btn-iniciar-pcie')?.classList.remove('hidden');
    $('btn-detener-pcie')?.classList.add('hidden');
    toggleSliders(true);

    ['particle5', 'particle6', 'particle7'].forEach(id => {
      const p = $(id);
      if (p) {
        p.style.transition = 'left 0.3s ease-out';
        p.style.left = '-45px';
        p.style.animation = '';
        p.querySelectorAll('.packet-indicator, .data-sphere').forEach(el => el.remove());
      }
    });

    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };

  // ========================================
  // CANVAS: Ondas de señal por generación
  // ========================================
  const calcularPicos = () => {
    const lanes = getLanes();
    const device = getDevice();
    const mode = getMode();

    const s5 = clamp(parseFloat($('speed5')?.value || 64), 16, PCIE.pcie5.maxGBps);
    const s6 = clamp(parseFloat($('speed6')?.value || 128), 32, PCIE.pcie6.maxGBps);
    const s7 = clamp(parseFloat($('speed7')?.value || 256), 64, PCIE.pcie7.maxGBps);

    const eff5 = calcularVelocidadReal(s5, 'pcie5', lanes, device, mode);
    const eff6 = calcularVelocidadReal(s6, 'pcie6', lanes, device, mode);
    const eff7 = calcularVelocidadReal(s7, 'pcie7', lanes, device, mode);

    dibujarSenales($('picos-canvas'), eff5, eff6, eff7, PCIE.pcie5.maxGBps, PCIE.pcie6.maxGBps, PCIE.pcie7.maxGBps);
  };

  // ========================================
  // GRÁFICA DE SEÑALES: Ondas en el tiempo
  // ========================================
  let signalPhase = 0;
  
  const dibujarSenales = (canvas, eff5, eff6, eff7, max5, max6, max7) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const padding = { top: 20, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const centerY = height / 2;

    // Ejes
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padding.left, centerY);
    ctx.lineTo(width - padding.right, centerY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Etiquetas eje Y (amplitud)
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('+A', padding.left - 5, padding.top + 5);
    ctx.fillText('0', padding.left - 5, centerY + 3);
    ctx.fillText('-A', padding.left - 5, height - padding.bottom - 3);

    // Etiquetas eje X (tiempo)
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
      const x = padding.left + (chartW / 5) * i;
      ctx.fillText(`${i}t`, x, height - padding.bottom + 15);
    }

    // Función para dibujar señal sinusoidal
    const dibujarSenal = (velocidad, maxVel, color, frecuenciaBase, offsetY) => {
      if (velocidad <= 0) return;
      
      const normalizedSpeed = velocidad / maxVel;
      // Mayor velocidad = mayor frecuencia (más ondas en el mismo espacio)
      const frecuencia = frecuenciaBase * (1 + normalizedSpeed * 2);
      // Mayor velocidad = mayor amplitud (ondas más altas)
      const amplitud = (chartH / 2.5) * normalizedSpeed;
      // Mayor velocidad = línea más gruesa
      const lineWidth = 2 + normalizedSpeed * 2;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6 + normalizedSpeed * 12;
      ctx.beginPath();

      for (let x = 0; x <= chartW; x++) {
        const t = (x / chartW) * Math.PI * 4 + signalPhase;
        const y = centerY - offsetY + Math.sin(t * frecuencia) * amplitud;
        if (x === 0) ctx.moveTo(padding.left + x, y);
        else ctx.lineTo(padding.left + x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    // Dibujar las 3 señales ( PCIe 5.0, 6.0, 7.0 )
    // Cada una con offset vertical diferente para que no se superpongan completamente
    dibujarSenal(eff7, max7, '#facc15', 3, -20);   // PCIe 7.0 - arriba (más rápida)
    dibujarSenal(eff6, max6, '#67e8f9', 2.5, 0);   // PCIe 6.0 - centro
    dibujarSenal(eff5, max5, '#60a5fa', 2, 20);    // PCIe 5.0 - abajo (más lenta)

    // Leyenda
    const legendY = padding.top + 10;
    ctx.font = '11px sans-serif';
    
    ctx.fillStyle = '#60a5fa';
    ctx.fillText('● PCIe 5.0', padding.left + 10, legendY);
    ctx.fillStyle = '#67e8f9';
    ctx.fillText('● PCIe 6.0', padding.left + 90, legendY);
    ctx.fillStyle = '#facc15';
    ctx.fillText('● PCIe 7.0', padding.left + 170, legendY);

    // Título
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Señales de Transferencia: Frecuencia ∝ Velocidad', width / 2, 12);
  };

  // Animación de las señales
  const animateSenales = () => {
    if (!running) return;
    signalPhase += 0.15;
    
    const lanes = getLanes();
    const device = getDevice();
    const mode = getMode();
    const s5 = clamp(parseFloat($('speed5')?.value || 64), 16, PCIE.pcie5.maxGBps);
    const s6 = clamp(parseFloat($('speed6')?.value || 128), 32, PCIE.pcie6.maxGBps);
    const s7 = clamp(parseFloat($('speed7')?.value || 256), 64, PCIE.pcie7.maxGBps);
    
    const eff5 = calcularVelocidadReal(s5, 'pcie5', lanes, device, mode);
    const eff6 = calcularVelocidadReal(s6, 'pcie6', lanes, device, mode);
    const eff7 = calcularVelocidadReal(s7, 'pcie7', lanes, device, mode);
    
    dibujarSenales($('picos-canvas'), eff5, eff6, eff7, PCIE.pcie5.maxGBps, PCIE.pcie6.maxGBps, PCIE.pcie7.maxGBps);
    
    if (running) {
      animationId = requestAnimationFrame(animateSenales);
    }
  };

  const init = () => {
    ['speed5', 'speed6', 'speed7'].forEach(id => {
      $(id)?.addEventListener('input', actualizarValores);
    });

    $('directionMode')?.addEventListener('change', actualizarValores);
    $('mode')?.addEventListener('change', actualizarValores);
    $('dataAmount')?.addEventListener('input', actualizarValores);
    $('lanes')?.addEventListener('change', actualizarValores);
    $('device')?.addEventListener('change', actualizarValores);

    $('btn-iniciar-pcie')?.addEventListener('click', start);
    $('btn-detener-pcie')?.addEventListener('click', stop);

    actualizarValores();

    // Dibujar señales iniciales
    dibujarSenales(
      $('picos-canvas'),
      calcularVelocidadReal(64, 'pcie5', 16, 'none', 'realista'),
      calcularVelocidadReal(128, 'pcie6', 16, 'none', 'realista'),
      calcularVelocidadReal(256, 'pcie7', 16, 'none', 'realista'),
      PCIE.pcie5.maxGBps, PCIE.pcie6.maxGBps, PCIE.pcie7.maxGBps
    );
  };

  return { init, start, stop };
})();

// Fix canvas DPR con debounce
let resizeTimeout = null;
const fixCanvasDPR = (canvasId) => {
  const canvas = $(canvasId);
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.scale(dpr, dpr);
};

// Auto-resize simple
const handleResize = () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    const canvas = $('simCanvas2');
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const newW = Math.floor(rect.width) || 700;
    const newH = Math.floor(rect.height) || 420;
    
    canvas.width = newW;
    canvas.height = newH;
    
    // Actualizar tamano en el simulador
    if (wifiEthSim) {
      wifiEthSim.setSize(newW, newH);
    }
    
  }, 500);
};

window.addEventListener('resize', handleResize);

// Exponer PCIeSimulator globalmente
window.PCIeSimulator = PCIeSimulator;

// Init seguro
document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', PCIeSimulator.init)
  : PCIeSimulator.init();

function animarFlujoIRQ() {
  const kb = document.getElementById("irq-keyboard");
  const ctrl = document.getElementById("irq-controller");
  const cpu = document.getElementById("irq-cpu");
  const retorno = document.getElementById("irq-retorno");
  const stepIndicator = document.getElementById("irq-step-indicator");
  if (!kb || !ctrl || !cpu || !retorno) return;
  kb.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
  ctrl.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
  cpu.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
  retorno.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
  if (stepIndicator) stepIndicator.textContent = "1. Teclado detecta tecla...";
  setTimeout(() => {
    kb.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border-2 border-blue-400 transition-all duration-500 text-center bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]";
    if (stepIndicator) stepIndicator.textContent = "2. Teclado envía IRQ";
  }, 300);
  setTimeout(() => {
    ctrl.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border-2 border-yellow-400 transition-all duration-500 text-center bg-yellow-500 shadow-[0_0_20px_rgba(202,138,134,0.8)]";
    if (stepIndicator) stepIndicator.textContent = "3. Controlador recibe y prioriza IRQ";
  }, 800);
  setTimeout(() => {
    cpu.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border-2 border-red-400 transition-all duration-500 text-center bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]";
    if (stepIndicator) stepIndicator.textContent = "4. CPU ejecuta ISR";
  }, 1300);
  setTimeout(() => {
    retorno.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border-2 border-green-400 transition-all duration-500 text-center bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]";
    if (stepIndicator) stepIndicator.textContent = "5. CPU retorna al programa";
  }, 2000);
  setTimeout(() => {
    kb.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
    ctrl.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
    cpu.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
    retorno.className = "flex-shrink-0 w-[110px] h-24 p-3 rounded-lg border border-slate-600 transition-all duration-500 text-center bg-slate-800";
    if (stepIndicator) stepIndicator.textContent = "Listo para nueva IRQ";
  }, 3000);
}

function animIRQCircles() {
  const circles = [
    document.getElementById("irq-circle-1"),
    document.getElementById("irq-circle-2"),
    document.getElementById("irq-circle-3"),
    document.getElementById("irq-circle-4"),
    document.getElementById("irq-circle-5"),
    document.getElementById("irq-circle-6")
  ];
  const timings = [0, 600, 1200, 1800, 2400, 3000];
  circles.forEach((circle, i) => {
    if (!circle) return;
    setTimeout(() => {
      circle.style.transform = "scale(1.4)";
      setTimeout(() => { circle.style.transform = "scale(1)"; }, 500);
    }, timings[i]);
  });
}

// ==================== FIXES CRÍTICOS ====================
const originalActivate = navigation.activate;
navigation.activate = (id) => {
  if (id !== 'dma' && typeof dmaSimulator?.resetState === 'function') {
    dmaSimulator.resetState();
  }
  // Inicializar simulador de red cuando se navega a redes
  if (id === 'redes' && window.networkSimulator) {
    window.networkSimulator.init();
  }
  originalActivate(id);
};

window.addEventListener('visibilitychange', () => {
  // Detener IRQ simulator
  if (document.hidden && window.irqSimulator && window.irqSimulator.running) {
    window.irqSimulator.stop();
  }
  
  // Detener DMA simulator
  if (document.hidden && window.dmaSimulator && window.dmaSimulator.getState().running) {
    const dma = window.dmaSimulator.getState();
    if (dma.animFrame) cancelAnimationFrame(dma.animFrame);
    if (dma.stepTimer) clearInterval(dma.stepTimer);
    dma.running = false;
    setEnabled(DOM.btnDmaCpu, true);
    setEnabled(DOM.btnDmaDma, true);
  }
  
  // Detener Arquitectura de buses
  if (document.hidden && window.archRenderer && window.archRenderer.getState().running) {
    const arch = window.archRenderer.getState();
    if (arch.animationFrame) cancelAnimationFrame(arch.animationFrame);
    arch.running = false;
  }
  
  // Detener simulador de red
  if (document.hidden && window.networkSimulator && window.networkSimulator.getState().running) {
    window.networkSimulator.stop();
  }
});

// ==================== SIMULADOR DE RED ====================
const networkSimulator = (() => {
  let canvas = null;
  let ctx = null;
  let initialized = false;
  
  let running = false;
  let animationId = null;
  let packets = [];
  let packetCount = 0;
  let lastTime = 0;
  
  const COLORS = {
    packet: '#22c55e',
    packetProcessed: '#eab308',
    packetDma: '#f97316',
    packetDone: '#10b981',
    network: '#3b82f6',
    ethernet: '#6366f1',
    irq: '#ef4444',
    dma: '#f59e0b',
    cpu: '#8b5cf6',
    ram: '#06b6d4'
  };
  
  const $ = (id) => document.getElementById(id);
  
  function init() {
    if (initialized) return;
    canvas = document.getElementById('network-canvas');
    ctx = canvas?.getContext('2d');
    if (canvas) {
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      drawNetwork();
      initialized = true;
    }
  }
  
  function resizeCanvas() {
    if (!canvas) return;
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.offsetWidth - 48;
    }
  }
  
  function drawNetwork() {
    if (!ctx || !canvas) return;
    
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    // Dibujar tarjeta de red (izquierda)
    const cardX = 40;
    const cardY = h / 2 - 30;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = COLORS.network;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, 80, 60, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = COLORS.network;
    ctx.font = '24px sans-serif';
    ctx.fillText('🔌', cardX + 28, cardY + 40);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Tarjeta de Red', cardX + 5, cardY + 75);
    
    // Dibujar IRQ (señal)
    const irqX = cardX + 90;
    const irqY = cardY + 20;
    
    // Dibujar CPU (arriba centro)
    const cpuX = w / 2 - 25;
    const cpuY = 30;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = COLORS.cpu;
    ctx.beginPath();
    ctx.roundRect(cpuX, cpuY, 50, 40, 6);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = COLORS.cpu;
    ctx.font = '20px Font Awesome 6 Free';
    ctx.fillText('⚡', cpuX + 15, cpuY + 28);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('CPU', cpuX + 15, cpuY + 55);
    
    // Dibujar DMA (centro)
    const dmaX = w / 2 - 20;
    const dmaY = h / 2 - 15;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = COLORS.dma;
    ctx.beginPath();
    ctx.roundRect(dmaX, dmaY, 40, 30, 4);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = COLORS.dma;
    ctx.font = '16px Font Awesome 6 Free';
    ctx.fillText('🔄', dmaX + 12, dmaY + 22);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '8px sans-serif';
    ctx.fillText('DMA', dmaX + 12, dmaY + 45);
    
    // Dibujar RAM (derecha)
    const ramX = w - 120;
    const ramY = h / 2 - 35;
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = COLORS.ram;
    ctx.beginPath();
    ctx.roundRect(ramX, ramY, 80, 70, 8);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = COLORS.ram;
    ctx.font = '28px Font Awesome 6 Free';
    ctx.fillText('💾', ramX + 26, ramY + 45);
    
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px sans-serif';
    ctx.fillText('Memoria RAM', ramX + 10, ramY + 90);
    
    // Dibujar paquetes
    packets.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    // Dibujar líneas de conexión
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1;
    
    // Línea tarjeta -> IRQ
    ctx.beginPath();
    ctx.moveTo(cardX + 80, cardY + 30);
    ctx.lineTo(irqX, irqY);
    ctx.stroke();
    
    // Línea IRQ -> CPU
    ctx.beginPath();
    ctx.moveTo(irqX, irqY);
    ctx.lineTo(cpuX + 25, cpuY + 40);
    ctx.stroke();
    
    // Línea tarjeta -> DMA
    ctx.beginPath();
    ctx.moveTo(cardX + 40, cardY + 60);
    ctx.lineTo(dmaX + 20, dmaY);
    ctx.stroke();
    
    // Línea DMA -> RAM
    ctx.beginPath();
    ctx.moveTo(dmaX + 40, dmaY + 15);
    ctx.lineTo(ramX, ramY + 35);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
  
  function update(deltaTime) {
    packets.forEach(p => {
      if (p.state === 0) {
        // Delante de la tarjeta -> IRQ
        p.x += p.vx * deltaTime * 0.05;
        if (p.x > 130 && p.x < 150 && p.y > 50 && p.y < 70) {
          p.state = 1;
          p.color = COLORS.irq;
        }
      } else if (p.state === 1) {
        // IRQ -> CPU
        p.x += p.vx * deltaTime * 0.05;
        p.y -= p.vy * deltaTime * 0.03;
        if (p.y < 70) {
          p.state = 2;
          p.color = COLORS.packetDma;
        }
      } else if (p.state === 2) {
        // CPU -> DMA
        p.y += p.vy * deltaTime * 0.04;
        if (p.y > h / 2 - 20) {
          p.state = 3;
          p.color = COLORS.packetProcessed;
        }
      } else if (p.state === 3) {
        // DMA -> RAM
        p.x += p.vx * deltaTime * 0.05;
        if (p.x > w - 130) {
          p.state = 4;
          p.color = COLORS.packetDone;
        }
      } else if (p.state === 4) {
        // En RAM, desvanecer
        p.alpha -= 0.02;
        if (p.alpha <= 0) {
          packets.splice(i, 1);
          packetCount++;
          updatePacketCount();
        }
      }
    });
  }
  
  function updatePacketCount() {
    const el = $('packet-count');
    if (el) el.textContent = packetCount;
  }
  
  function loop(timestamp) {
    if (!running) return;
    
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    update(deltaTime);
    drawNetwork();
    
    animationId = requestAnimationFrame(loop);
  }
  
  function spawnPacket() {
    if (!running) return;
    
    packets.push({
      x: 40,
      y: 110,
      vx: 80 + Math.random() * 40,
      vy: 60 + Math.random() * 30,
      state: 0,
      color: COLORS.packet,
      alpha: 1
    });
  }
  
  function start() {
    if (running) return;
    
    // Initialize canvas if not already done
    init();
    
    running = true;
    lastTime = performance.now();
    packetCount = 0;
    packets = [];
    updatePacketCount();
    
    // Actualizar estado visual
    const statusDot = $('network-status');
    const statusText = $('network-status-text');
    if (statusDot) {
      statusDot.classList.remove('bg-slate-500');
      statusDot.classList.add('bg-green-500');
    }
    if (statusText) {
      statusText.textContent = 'Transmitiendo';
      statusText.classList.remove('text-yellow-400');
      statusText.classList.add('text-green-400');
    }
    
    drawNetwork();
    animationId = requestAnimationFrame(loop);
    
    // Spawn packets cada 800ms
    const spawner = setInterval(() => {
      if (!running) {
        clearInterval(spawner);
        return;
      }
      spawnPacket();
      if (packets.length > 15) {
        packets.shift();
      }
    }, 800);
    
    window.networkSpawner = spawner;
  }
  
  function stop() {
    running = false;
    
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    if (window.networkSpawner) {
      clearInterval(window.networkSpawner);
      window.networkSpawner = null;
    }
    
    // Actualizar estado visual
    const statusDot = $('network-status');
    const statusText = $('network-status-text');
    if (statusDot) {
      statusDot.classList.remove('bg-green-500');
      statusDot.classList.add('bg-slate-500');
    }
    if (statusText) {
      statusText.textContent = 'Inactivo';
      statusText.classList.remove('text-green-400');
      statusText.classList.add('text-yellow-400');
    }
    
    drawNetwork();
  }
  
  function getState() {
    return { running, packets, packetCount };
  }
  
  // Inicializar
  if (canvas) {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    drawNetwork();
  }
  
  return {
    init,
    start,
    stop,
    getState
  };
})();

// Asignar a window para acceso global
window.networkSimulator = networkSimulator;

// Funciones globales para los botones
function startNetworkSim() {
  networkSimulator.start();
}

function stopNetworkSim() {
  networkSimulator.stop();
}

// Funciones para modal de imagen
window.abrirImagen = function(src) {
  const modal = document.getElementById('modal-imagen');
  const img = document.getElementById('modal-img-src');
  if (modal && img) {
    img.src = src;
    modal.classList.remove('hidden');
  }
};

window.cerrarImagen = function() {
  const modal = document.getElementById('modal-imagen');
  if (modal) {
    modal.classList.add('hidden');
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    cerrarImagen();
  }
});

