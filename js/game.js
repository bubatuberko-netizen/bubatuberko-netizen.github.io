/* ===================================================
   game.js — Side-scrolling game engine with gravity,
   platforms, wave spawning, and pixel-art background
   =================================================== */

'use strict';

const Game = (() => {

  /* ---------- Constants ---------- */
  const WORLD_W  = 3000;
  const WORLD_H  = 1200;
  const GROUND_Y = 1020;   // where entities stand
  const GRAVITY  = 1200;   // px/s²
  const PX       = 4;      // pixel-art block size for background
  const PLAT_H   = 12;     // platform thickness

  const ENEMIES_PER_WAVE_BASE = 5;
  const ENEMIES_PER_WAVE_GROWTH = 3;

  /* Platforms — wooden planks at various heights */
  const PLATFORMS = [
    { x: 160,  y: 880, w: 180 },
    { x: 460,  y: 800, w: 160 },
    { x: 750,  y: 880, w: 140 },
    { x: 1000, y: 780, w: 200 },
    { x: 1300, y: 860, w: 160 },
    { x: 1580, y: 780, w: 180 },
    { x: 1850, y: 880, w: 140 },
    { x: 2100, y: 760, w: 200 },
    { x: 2400, y: 860, w: 160 },
    { x: 2680, y: 800, w: 140 },
  ];

  /* ---------- State ---------- */
  let canvas, ctx;
  let running = false;
  let lastTime = 0;
  let player = null;
  let enemies = [];
  let score = 0;
  let wave = 1;
  let enemiesRemaining = 0;
  let enemiesSpawned = 0;
  let enemiesInWave = 0;
  let spawnTimer = 0;

  /* Camera */
  let camX = 0, camY = 0;
  let viewW = 0, viewH = 0;

  /* Input */
  const input = {
    keys: {},
    mouseX: 0, mouseY: 0,
    mouseWorldX: 0, mouseWorldY: 0,
    mouseDown: false
  };

  /* Bullet pool */
  const bulletPool = new Utils.ObjectPool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, damage: 0, radius: 3, color: '#fff', life: 0, isPlayer: false, active: false }),
    (b) => { b.active = false; b.life = 0; },
    100
  );

  /* Particle pool */
  const particlePool = new Utils.ObjectPool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, radius: 2, color: '#fff', active: false }),
    (p) => { p.active = false; p.life = 0; },
    80
  );

  /* ---------- Init ---------- */

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    bindInput();
  }

  function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    canvas.width = viewW;
    canvas.height = viewH;
  }

  /* ---------- Input ---------- */

  function bindInput() {
    window.addEventListener('keydown', e => { input.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup',   e => { input.keys[e.key.toLowerCase()] = false; });
    canvas.addEventListener('mousemove', e => {
      input.mouseX = e.clientX;
      input.mouseY = e.clientY;
      input.mouseWorldX = e.clientX + camX;
      input.mouseWorldY = e.clientY + camY;
    });
    canvas.addEventListener('mousedown', e => { if (e.button === 0) input.mouseDown = true; });
    canvas.addEventListener('mouseup',   e => { if (e.button === 0) input.mouseDown = false; });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  /* ---------- Start / Stop ---------- */

  function start(classKey) {
    const classDef = ClassDefs.getClass(classKey);

    player = PlayerModule.create(classDef);
    player.x = WORLD_W / 2 - player.w / 2;
    player.y = GROUND_Y - player.h;

    enemies = [];
    score = 0;
    wave = 1;
    spawnTimer = 0;
    bulletPool.releaseAll();
    particlePool.releaseAll();

    startWave();
    UI.initHUD(classDef.name);
    UI.showGame();

    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function stop() {
    running = false;
    input.mouseDown = false;
    input.keys = {};
  }

  /* ---------- Waves ---------- */

  function startWave() {
    enemiesInWave = ENEMIES_PER_WAVE_BASE + (wave - 1) * ENEMIES_PER_WAVE_GROWTH;
    enemiesSpawned = 0;
    enemiesRemaining = enemiesInWave;
    spawnTimer = 1;
  }

  /* ---------- Game Loop ---------- */

  function loop(timestamp) {
    if (!running) return;
    let dt = (timestamp - lastTime) / 1000;
    if (dt > 0.05) dt = 0.05;
    lastTime = timestamp;

    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* ---------- Update ---------- */

  function update(dt) {
    input.mouseWorldX = input.mouseX + camX;
    input.mouseWorldY = input.mouseY + camY;

    // Player
    PlayerModule.update(player, input, dt, GRAVITY, WORLD_W, GROUND_Y, PLATFORMS);

    // Player shooting
    const playerBullets = PlayerModule.tryShoot(player, input);
    playerBullets.forEach(pb => {
      const b = bulletPool.acquire();
      Object.assign(b, pb, { active: true });
    });

    // Enemy spawning
    if (enemiesSpawned < enemiesInWave) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        enemies.push(EnemyModule.create(wave, WORLD_W, GROUND_Y, player.x));
        enemiesSpawned++;
        spawnTimer = Math.max(0.4, 2 - wave * 0.1);
      }
    }

    // Enemy update
    enemies.forEach(enemy => {
      if (!enemy.alive) return;
      enemy.invulnTimer -= dt;

      // AI returns melee damage
      const meleeDmg = AI.update(enemy, player, dt);

      // Apply melee damage
      if (meleeDmg > 0 && player.alive) {
        // Check if close enough to actually hit
        const ex = enemy.x + enemy.w / 2;
        const px = player.x + player.w / 2;
        const dist = Math.abs(ex - px);
        const vertDist = Math.abs(enemy.y - player.y);
        if (dist < 50 && vertDist < 60) {
          PlayerModule.takeDamage(player, meleeDmg);
          UI.triggerShake();
          spawnHitParticles(player.x + player.w / 2, player.y + player.h / 2, '#ff4444');
          if (!player.alive) {
            Utils.AudioMgr.playDeath();
            onPlayerDeath();
          }
        }
      }

      // Physics
      EnemyModule.applyPhysics(enemy, dt, GRAVITY, GROUND_Y, PLATFORMS);
    });

    // Bullets
    const toRelease = [];
    bulletPool.active.forEach(b => {
      if (!b.active) return;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.life <= 0 || b.x < -30 || b.x > WORLD_W + 30 || b.y < -30 || b.y > WORLD_H + 30) {
        toRelease.push(b);
        return;
      }

      // Player bullets vs enemies
      if (b.isPlayer) {
        for (const e of enemies) {
          if (!e.alive) continue;
          if (Utils.rectOverlap(b.x - b.radius, b.y - b.radius, b.radius * 2, b.radius * 2,
                                e.x, e.y, e.w, e.h)) {
            const killed = EnemyModule.takeDamage(e, b.damage);
            spawnHitParticles(b.x, b.y, '#5a7a4a');
            Utils.AudioMgr.playHit();
            if (killed) {
              score += e.scoreValue;
              enemiesRemaining--;
              spawnDeathParticles(e.x + e.w / 2, e.y + e.h / 2, '#5a7a4a');
            }
            toRelease.push(b);
            break;
          }
        }
      }
    });
    toRelease.forEach(b => bulletPool.release(b));

    // Clean dead
    enemies = enemies.filter(e => e.alive);

    // Next wave
    if (enemiesRemaining <= 0 && enemiesSpawned >= enemiesInWave) {
      wave++;
      startWave();
    }

    // Particles
    updateParticles(dt);

    // Camera: follow player, smooth
    const targetCamX = player.x + player.w / 2 - viewW / 2;
    const targetCamY = player.y + player.h / 2 - viewH / 2 + 80; // slightly below center
    camX = Utils.lerp(camX, Utils.clamp(targetCamX, 0, WORLD_W - viewW), 6 * dt);
    camY = Utils.lerp(camY, Utils.clamp(targetCamY, 0, WORLD_H - viewH), 6 * dt);

    UI.updateHUD(player, score, wave);
  }

  /* ---------- Particles ---------- */

  function spawnHitParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const p = particlePool.acquire();
      const a = Math.random() * Math.PI * 2;
      const spd = Utils.randFloat(60, 200);
      Object.assign(p, {
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd,
        life: Utils.randFloat(0.15, 0.35), maxLife: 0.35,
        radius: Utils.randFloat(1.5, 3), color, active: true
      });
    }
  }

  function spawnDeathParticles(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const p = particlePool.acquire();
      const a = Math.random() * Math.PI * 2;
      const spd = Utils.randFloat(80, 260);
      Object.assign(p, {
        x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 100,
        life: Utils.randFloat(0.3, 0.7), maxLife: 0.7,
        radius: Utils.randFloat(2, 5), color, active: true
      });
    }
  }

  function updateParticles(dt) {
    const toRelease = [];
    particlePool.active.forEach(p => {
      if (!p.active) return;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 400 * dt; // particles have gravity
      p.life -= dt;
      if (p.life <= 0) toRelease.push(p);
    });
    toRelease.forEach(p => particlePool.release(p));
  }

  /* ---------- Death ---------- */

  function onPlayerDeath() {
    Leaderboard.addScore(UI.getUsername(), score);
    setTimeout(() => UI.showDeath(score, wave), 600);
  }

  /* ---------- Render ---------- */

  function render() {
    ctx.clearRect(0, 0, viewW, viewH);

    // Background
    drawGround();

    // Platforms
    drawPlatforms();

    // Enemies
    enemies.forEach(e => EnemyModule.draw(ctx, e, camX, camY));

    // Player
    PlayerModule.draw(ctx, player, camX, camY);

    // Bullets
    bulletPool.active.forEach(b => {
      if (!b.active) return;
      const sx = b.x - camX;
      const sy = b.y - camY;
      if (sx < -10 || sx > viewW + 10 || sy < -10 || sy > viewH + 10) return;
      ctx.save();
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 8;
      Utils.fillCircle(ctx, sx, sy, b.radius, b.color);
      ctx.restore();
    });

    // Particles
    particlePool.active.forEach(p => {
      if (!p.active) return;
      const sx = p.x - camX;
      const sy = p.y - camY;
      ctx.globalAlpha = Utils.clamp(p.life / p.maxLife, 0, 1);
      Utils.fillCircle(ctx, sx, sy, p.radius, p.color);
    });
    ctx.globalAlpha = 1;

    // Crosshair
    drawCrosshair();
  }

  /* ---------- Draw Platforms ---------- */

  function drawPlatforms() {
    PLATFORMS.forEach(plat => {
      const sx = plat.x - camX;
      const sy = plat.y - camY;
      if (sx + plat.w < 0 || sx > viewW || sy + PLAT_H < 0 || sy > viewH) return;

      // Wooden plank
      ctx.fillStyle = '#7a5a30';
      ctx.fillRect(sx, sy, plat.w, PLAT_H);

      // Wood grain lines
      ctx.fillStyle = '#6a4a28';
      for (let lx = 0; lx < plat.w; lx += 18) {
        ctx.fillRect(sx + lx, sy + 3, 12, 1);
        ctx.fillRect(sx + lx + 6, sy + 7, 10, 1);
      }

      // Top highlight
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(sx, sy, plat.w, 2);

      // Bottom shadow
      ctx.fillStyle = '#5a3a18';
      ctx.fillRect(sx, sy + PLAT_H - 2, plat.w, 2);

      // Support posts at ends
      ctx.fillStyle = '#5c3a1e';
      ctx.fillRect(sx + 4, sy + PLAT_H, 6, 20);
      ctx.fillRect(sx + plat.w - 10, sy + PLAT_H, 6, 20);
    });
  }

  /* ---------- Crosshair ---------- */

  function drawCrosshair() {
    const mx = input.mouseX;
    const my = input.mouseY;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx - 10, my); ctx.lineTo(mx - 4, my);
    ctx.moveTo(mx + 4, my); ctx.lineTo(mx + 10, my);
    ctx.moveTo(mx, my - 10); ctx.lineTo(mx, my - 4);
    ctx.moveTo(mx, my + 4); ctx.lineTo(mx, my + 10);
    ctx.stroke();
  }

  /* ======================================================
     Pixel-Art Background — Western Village
     Pre-rendered to offscreen canvas, blitted each frame
     ====================================================== */

  const BPX = PX; // background pixel size
  let bgCanvas = null;

  function px(b, x, y, color) {
    b.fillStyle = color;
    b.fillRect(x * BPX, y * BPX, BPX, BPX);
  }

  function pxRect(b, x, y, w, h, color) {
    b.fillStyle = color;
    b.fillRect(x * BPX, y * BPX, w * BPX, h * BPX);
  }

  function buildBackground() {
    if (bgCanvas) return;
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = WORLD_W;
    bgCanvas.height = WORLD_H;
    const b = bgCanvas.getContext('2d');
    b.imageSmoothingEnabled = false;

    const cols = Math.ceil(WORLD_W / BPX);
    const rows = Math.ceil(WORLD_H / BPX);
    const skyEnd = Math.floor(rows * 0.55); // sky takes more space in side view
    const groundRow = Math.floor(GROUND_Y / BPX);

    // --- Sky gradient (dusk) ---
    for (let y = 0; y < skyEnd; y++) {
      const t = y / skyEnd;
      const r = Math.floor(30 + t * 190);
      const g = Math.floor(15 + t * 140);
      const bl = Math.floor(90 - t * 30);
      for (let x = 0; x < cols; x++) {
        px(b, x, y, `rgb(${r},${g},${bl})`);
      }
    }

    // Stars
    const seeded = (s) => { let v = s; return () => { v = (v * 16807) % 2147483647; return v / 2147483647; }; };
    const sr = seeded(42);
    for (let i = 0; i < 80; i++) {
      const sx = Math.floor(sr() * cols);
      const sy = Math.floor(sr() * skyEnd * 0.5);
      const bright = Math.floor(180 + sr() * 75);
      px(b, sx, sy, `rgb(${bright},${bright},${bright - 20})`);
    }

    // Moon
    const moonX = Math.floor(cols * 0.8);
    const moonY = Math.floor(skyEnd * 0.15);
    for (let dy = -5; dy <= 5; dy++) {
      for (let dx = -5; dx <= 5; dx++) {
        if (dx * dx + dy * dy <= 25) px(b, moonX + dx, moonY + dy, '#ffeedd');
        if (dx * dx + dy * dy <= 18 && dx * dx + dy * dy > 8) px(b, moonX + dx, moonY + dy, '#fff5e0');
      }
    }

    // --- Mountains (3 layers, parallax feel) ---
    const mtBase = skyEnd;
    const mtColors = ['#5c3a1e', '#4a2e14', '#3a2010'];
    for (let layer = 0; layer < 3; layer++) {
      const amp = 18 - layer * 4;
      const freq = 0.01 + layer * 0.006;
      const baseY = mtBase - 14 + layer * 8;
      const col = mtColors[layer];
      for (let x = 0; x < cols; x++) {
        const h = Math.floor(Math.sin(x * freq) * amp + Math.sin(x * freq * 2.3 + 1) * amp * 0.4);
        for (let y = baseY - h; y < mtBase + 10; y++) {
          px(b, x, y, col);
        }
      }
    }

    // --- Desert ground fill from mountains down ---
    const sandColors = ['#c9a84c', '#c4a046', '#caaa52', '#bfa048', '#d0ad55'];
    for (let y = mtBase; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = ((x * 7 + y * 13) % 5);
        px(b, x, y, sandColors[n]);
      }
    }

    // Darker ground layer near bottom (below GROUND_Y)
    const dirtColors = ['#a08040', '#8b6e30', '#9a7a3a'];
    for (let y = groundRow; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const n = ((x * 3 + y * 7) % 3);
        px(b, x, y, dirtColors[n]);
      }
    }
    // Ground surface line
    for (let x = 0; x < cols; x++) {
      px(b, x, groundRow, '#6b5020');
      px(b, x, groundRow + 1, '#7a6030');
    }

    // --- Buildings (background scenery) ---
    function drawBuilding(bx, by, w, h, wallColor, roofColor, trimColor, label) {
      pxRect(b, bx, by - h, w, h, wallColor);
      for (let yy = by - h + 2; yy < by; yy += 3) {
        for (let xx = bx; xx < bx + w; xx++) {
          if ((xx + yy) % 7 === 0) px(b, xx, yy, trimColor);
        }
      }
      const roofH = 5;
      const ovh = 2;
      pxRect(b, bx - ovh, by - h - roofH, w + ovh * 2, roofH, roofColor);
      for (let xx = bx - ovh; xx < bx + w + ovh; xx++) {
        px(b, xx, by - h - roofH, '#3a2010');
        px(b, xx, by - h - 1, '#3a2010');
      }
      // Door
      const doorX = bx + Math.floor(w / 2) - 1;
      pxRect(b, doorX, by - 6, 3, 6, '#3a2010');
      px(b, doorX + 2, by - 3, '#c9a84c');
      // Windows
      if (w >= 10) {
        pxRect(b, bx + 2, by - h + 5, 2, 3, '#6aafe8');
        pxRect(b, bx + w - 4, by - h + 5, 2, 3, '#6aafe8');
        pxRect(b, bx + 2, by - h + 4, 2, 1, '#3a2010');
        pxRect(b, bx + w - 4, by - h + 4, 2, 1, '#3a2010');
      }
      // Sign
      if (label) {
        const sw = label.length + 2;
        const signX = bx + Math.floor(w / 2) - Math.floor(sw / 2);
        pxRect(b, signX, by - h - roofH - 4, sw, 3, '#5c3a1e');
        for (let xx = signX; xx < signX + sw; xx++) {
          px(b, xx, by - h - roofH - 4, '#3a2010');
          px(b, xx, by - h - roofH - 2, '#3a2010');
        }
      }
    }

    // Place buildings along a street line in mid-background
    const streetY = groundRow - 2;

    // Main street buildings
    drawBuilding(30,  streetY, 18, 22, '#a0744f', '#6b4020', '#8a6a40', 'SALOON');
    drawBuilding(65,  streetY, 15, 18, '#b08050', '#5c3a1e', '#907050', 'SHERIFF');
    drawBuilding(100, streetY, 14, 24, '#907040', '#4a2e14', '#806838', 'BANK');
    drawBuilding(135, streetY, 20, 20, '#a87848', '#6b4020', '#986840', 'GENERAL');
    drawBuilding(175, streetY, 16, 17, '#986a3c', '#5c3a1e', '#886040', null);
    drawBuilding(210, streetY, 14, 22, '#a08050', '#4a2e14', '#8a6a40', 'HOTEL');
    drawBuilding(250, streetY, 18, 19, '#8a6838', '#6b4020', '#7a5830', 'STABLE');
    drawBuilding(290, streetY, 14, 16, '#a07844', '#5c3a1e', '#906838', 'BARBER');
    drawBuilding(330, streetY, 16, 24, '#987050', '#4a2e14', '#886040', 'CHURCH');
    drawBuilding(370, streetY, 14, 18, '#a08848', '#6b4020', '#907a40', 'JAIL');
    drawBuilding(410, streetY, 18, 20, '#a0744f', '#5c3a1e', '#8a6a40', null);
    drawBuilding(450, streetY, 14, 16, '#b08050', '#4a2e14', '#907050', null);
    drawBuilding(490, streetY, 16, 22, '#907040', '#6b4020', '#806838', null);
    drawBuilding(530, streetY, 20, 18, '#a87848', '#5c3a1e', '#986840', null);
    drawBuilding(570, streetY, 14, 20, '#986a3c', '#4a2e14', '#886040', null);
    drawBuilding(610, streetY, 16, 16, '#a08050', '#6b4020', '#8a6a40', null);
    drawBuilding(650, streetY, 14, 24, '#8a6838', '#5c3a1e', '#7a5830', null);
    drawBuilding(690, streetY, 18, 18, '#a07844', '#4a2e14', '#906838', null);

    // --- Water towers ---
    function drawWaterTower(tx, ty) {
      pxRect(b, tx, ty - 14, 1, 14, '#5c3a1e');
      pxRect(b, tx + 8, ty - 14, 1, 14, '#5c3a1e');
      for (let i = 0; i < 9; i++) px(b, tx + i, ty - 7 - Math.floor(i * 0.4), '#5c3a1e');
      pxRect(b, tx - 1, ty - 24, 11, 10, '#6b4020');
      pxRect(b, tx, ty - 23, 9, 8, '#8b5e3c');
      for (let xx = tx - 1; xx < tx + 10; xx++) px(b, xx, ty - 20, '#4a2e14');
      pxRect(b, tx - 2, ty - 25, 13, 1, '#4a2e14');
      pxRect(b, tx, ty - 26, 9, 1, '#3a2010');
    }
    drawWaterTower(160, streetY);
    drawWaterTower(350, streetY);
    drawWaterTower(550, streetY);

    // --- Cacti ---
    function drawCactus(cx, cy, sz) {
      pxRect(b, cx, cy - sz * 5, 2, sz * 5, '#2a6e2a');
      px(b, cx, cy - sz * 5, '#3a8a3a');
      pxRect(b, cx - 2, cy - sz * 3, 2, 1, '#2a6e2a');
      pxRect(b, cx - 2, cy - sz * 3 - 2, 1, 2, '#2a6e2a');
      px(b, cx - 2, cy - sz * 3 - 2, '#3a8a3a');
      pxRect(b, cx + 2, cy - sz * 2, 2, 1, '#2a6e2a');
      pxRect(b, cx + 3, cy - sz * 2 - 2, 1, 2, '#2a6e2a');
      px(b, cx + 3, cy - sz * 2 - 2, '#3a8a3a');
    }

    const cacti = [
      [20, 0.90], [55, 0.88], [95, 0.92], [140, 0.87], [185, 0.91],
      [225, 0.89], [265, 0.93], [310, 0.88], [360, 0.91], [400, 0.87],
      [440, 0.90], [480, 0.92], [520, 0.88], [560, 0.91], [600, 0.89],
      [640, 0.93], [680, 0.88], [720, 0.91], [15, 0.85], [730, 0.86],
    ];
    cacti.forEach(([cx, ry]) => drawCactus(cx, Math.floor(rows * ry), Utils.randInt(1, 2)));

    // --- Fences ---
    function drawFence(fx, fy, len) {
      for (let i = 0; i < len; i++) {
        if (i % 4 === 0) {
          pxRect(b, fx + i, fy - 5, 1, 5, '#5c3a1e');
          px(b, fx + i, fy - 5, '#8a6a40');
        }
        px(b, fx + i, fy - 4, '#8b5e3c');
        px(b, fx + i, fy - 2, '#8b5e3c');
      }
    }
    drawFence(5, groundRow, 25);
    drawFence(cols - 30, groundRow, 25);
    drawFence(50, groundRow, 15);
    drawFence(195, groundRow, 12);
    drawFence(400, groundRow, 18);
    drawFence(600, groundRow, 14);

    // --- Barrels ---
    function drawBarrel(bx, by) {
      pxRect(b, bx, by - 5, 3, 5, '#6b4020');
      pxRect(b, bx, by - 4, 3, 1, '#4a2e14');
      pxRect(b, bx, by - 2, 3, 1, '#4a2e14');
      px(b, bx + 1, by - 5, '#8a6a40');
    }
    [48, 110, 198, 280, 380, 460, 560, 660].forEach(bx => drawBarrel(bx, groundRow));

    // --- Tumbleweeds ---
    function drawTumbleweed(tx, ty) {
      const c1 = '#8a7a50', c2 = '#7a6a40', c3 = '#6a5a30';
      px(b, tx, ty, c1); px(b, tx + 1, ty, c2);
      px(b, tx - 1, ty + 1, c3); px(b, tx, ty + 1, c2); px(b, tx + 1, ty + 1, c1); px(b, tx + 2, ty + 1, c3);
      px(b, tx, ty + 2, c3); px(b, tx + 1, ty + 2, c2);
    }
    [30, 120, 230, 340, 450, 560, 670, 720].forEach((tx, i) => {
      drawTumbleweed(tx, groundRow + 2 + (i % 3));
    });

    // Dust drifts
    for (let i = 0; i < 50; i++) {
      const dx = ((i * 97 + 13) % cols);
      const dy = mtBase + ((i * 53 + 7) % (rows - mtBase));
      const dw = 3 + (i % 4);
      for (let xx = 0; xx < dw; xx++) {
        if (xx % 2 === 0) px(b, dx + xx, dy, 'rgba(210,190,140,0.25)');
      }
    }
  }

  function drawGround() {
    buildBackground();
    const sx = Math.max(0, Math.floor(camX));
    const sy = Math.max(0, Math.floor(camY));
    const sw = Math.min(WORLD_W - sx, viewW);
    const sh = Math.min(WORLD_H - sy, viewH);
    const dx = Math.max(0, -Math.floor(camX));
    const dy = Math.max(0, -Math.floor(camY));

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(bgCanvas, sx, sy, sw, sh, dx, dy, sw, sh);
    ctx.imageSmoothingEnabled = true;
  }

  /* ---------- Public API ---------- */
  return { init, start, stop };
})();
