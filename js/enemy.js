/* ===================================================
   enemy.js — Zombie enemies with 5 distinct variants:
   Walker, Runner, Brute, Sprinter, Shooter
   =================================================== */

'use strict';

const EnemyModule = (() => {

  /* ==========================================================
     Pixel-art sprite definitions.
     Each zombie type has its own palette + 2 walk frames.
     ========================================================== */

  /* ---------- WALKER (base green zombie) ---------- */
  const WALKER_PAL = {
    '.': null, 'o': '#0a0a05',
    'g': '#5a7a4a', 'G': '#4a6a38', 'd': '#3a5a28',
    'e': '#cc2222', 'E': '#ff4444', 'm': '#1a1a0a',
    't': '#6a5a48', 'T': '#4a3a28',
    'r': '#4a3828', 'R': '#3a2818',
    'f': '#3a3828', 'F': '#2a2818',
  };

  const WALKER_W1 = [
    '....oggo.....',
    '...oggGgo....',
    '..ogGgGGgo...',
    '..ogeogego...',
    '..oggmmggo...',
    '...oggggo....',
    '...otttto....',
    '..ottTTtto...',
    '..ottTTttogg.',
    '..ottttttogg.',
    '...otttto....',
    '....rrrr.....',
    '...rr..rr....',
    '..orr..rro...',
    '..off..ffo...',
    '..oFF..FFo...',
  ];

  const WALKER_W2 = [
    '....oggo.....',
    '...oggGgo....',
    '..ogGgGGgo...',
    '..ogeogego...',
    '..oggmmggo...',
    '...oggggo....',
    '...otttto....',
    '..ottTTtto...',
    '..ottTTttogg.',
    '..ottttttogg.',
    '...otttto....',
    '....rrrr.....',
    '...rr...rr...',
    '..orr...rro..',
    '..off...ffo..',
    '..oFF...FFo..',
  ];

  /* ---------- RUNNER (yellower, leaner) ---------- */
  const RUNNER_PAL = {
    '.': null, 'o': '#0a0a05',
    'g': '#7a8a3a', 'G': '#5a6a28', 'd': '#4a5a18',
    'e': '#cc2222', 'E': '#ff4444', 'm': '#1a1a0a',
    't': '#6a5a38', 'T': '#4a3a18',
    'r': '#3a2818', 'R': '#2a1808',
    'f': '#2a2818', 'F': '#1a1808',
  };
  // Runner uses walker sprite data but with its own palette (leaner pose works)
  const RUNNER_W1 = WALKER_W1;
  const RUNNER_W2 = WALKER_W2;

  /* ---------- BRUTE (bigger, darker, hulking) ---------- */
  const BRUTE_PAL = {
    '.': null, 'o': '#050200',
    'g': '#3a5a2a', 'G': '#2a4a18', 'd': '#1a3a08',
    'e': '#ff4444', 'E': '#ffaa22', 'm': '#000000',
    't': '#4a3828', 'T': '#2a1808',
    'r': '#2a1808', 'R': '#1a0800',
    'f': '#2a2818', 'F': '#0a0800',
    'w': '#aaaa88',   // exposed bone
  };

  const BRUTE_W1 = [
    '...oggggo....',
    '..oggdGgGo...',
    '..ogGdGdGo...',
    '..ogEogEgo...',
    '..ogmmmmgo...',
    '..oggwwggo...',
    '..otttttto...',
    '.ottTTTTtto..',
    '.ottTTTTttog.',
    '.otttttttogg.',
    '.otttttttog..',
    '..ottttto....',
    '...rrrrr.....',
    '..rrr.rrr....',
    '..rr...rr....',
    '..ff...ff....',
    '.oFF...FFo...',
  ];

  const BRUTE_W2 = [
    '...oggggo....',
    '..oggdGgGo...',
    '..ogGdGdGo...',
    '..ogEogEgo...',
    '..ogmmmmgo...',
    '..oggwwggo...',
    '..otttttto...',
    '.ottTTTTtto..',
    '.ottTTTTttog.',
    '.otttttttogg.',
    '.otttttttog..',
    '..ottttto....',
    '...rrrrr.....',
    '..rr...rrr...',
    '..rr....rr...',
    '..ff....ff...',
    '.oFF....FFo..',
  ];

  /* ---------- SPRINTER (hunched, leaning forward, fast) ---------- */
  const SPRINTER_PAL = {
    '.': null, 'o': '#0a0a05',
    'g': '#9aba4a', 'G': '#7a9a28', 'd': '#5a7a18',
    'e': '#ff2222', 'E': '#ffff44', 'm': '#1a1a0a',
    't': '#7a4a38', 'T': '#5a2a18',
    'r': '#4a2818', 'R': '#2a1808',
    'f': '#2a1808', 'F': '#1a0800',
  };

  const SPRINTER_W1 = [
    '.............',
    '.............',
    '....ogggo....',
    '...oggGgo....',
    '...ogEgEo....',
    '...oggmgo....',
    '..ogttttgo...',
    '.ottTTTTtog..',
    '.otttttttgg..',
    '..otttttgg...',
    '..orrrrrr....',
    '.orr...rro...',
    '.off....ff...',
    '.oFF.....Fo..',
    '.............',
    '.............',
  ];

  const SPRINTER_W2 = [
    '.............',
    '.............',
    '....ogggo....',
    '...oggGgo....',
    '...ogEgEo....',
    '...oggmgo....',
    '..ogttttgo...',
    '.ottTTTTtog..',
    '.otttttttgg..',
    '..otttttgg...',
    '..orrrrrr....',
    '..rr..rrro...',
    '.oFF..off....',
    '.oFo...oFF...',
    '.............',
    '.............',
  ];

  /* ---------- SHOOTER (upright, holding rifle) ---------- */
  const SHOOTER_PAL = {
    '.': null, 'o': '#0a0a05',
    'g': '#4a6a5a', 'G': '#3a5a48', 'd': '#2a4a38',
    'e': '#ffaa22', 'E': '#ffee44', 'm': '#1a1a0a',
    't': '#3a3a2a', 'T': '#1a1a08',
    'r': '#2a2828', 'R': '#1a1818',
    'f': '#2a1a08', 'F': '#1a0a00',
    'b': '#4a4a4a',   // rifle body
    'B': '#2a2a2a',   // rifle dark
    'y': '#8a6a20',   // rifle wood stock
  };

  const SHOOTER_W1 = [
    '....oggo.....',
    '...oggGgo....',
    '..ogGgGGgo...',
    '..ogEoEego...',
    '..oggmmggo...',
    '...oggggo....',
    '...otttto....',
    '..ottTTtto...',
    '.otttTTttyyb.',  // shoulder + wood stock + rifle
    '.ottttttyBBB.',  // arms holding rifle + barrel
    '..ottttt.....',
    '...otttt.....',
    '....rrrr.....',
    '...rr.rr.....',
    '..orr.rro....',
    '..oFF.FFo....',
  ];

  const SHOOTER_W2 = [
    '....oggo.....',
    '...oggGgo....',
    '..ogGgGGgo...',
    '..ogEoEego...',
    '..oggmmggo...',
    '...oggggo....',
    '...otttto....',
    '..ottTTtto...',
    '.otttTTttyyb.',
    '.ottttttyBBB.',
    '..ottttt.....',
    '...otttt.....',
    '....rrrr.....',
    '...rr..rr....',
    '..orr..rro...',
    '..oFF..FFo...',
  ];

  /* ---------- Type Templates ---------- */

  const TEMPLATES = {
    walker: {
      name:       'Walker',
      palette:    WALKER_PAL,
      frames:     [WALKER_W1, WALKER_W2],
      healthMul:  1.0,
      speedMul:   0.75,
      damageMul:  1.0,
      attackRate: 1.3,
      jumpMul:    0.8,
      isRanged:   false,
      scale:      3,
      scoreMul:   1,
    },
    runner: {
      name:       'Runner',
      palette:    RUNNER_PAL,
      frames:     [RUNNER_W1, RUNNER_W2],
      healthMul:  0.55,
      speedMul:   1.55,
      damageMul:  0.6,
      attackRate: 2.0,
      jumpMul:    1.15,
      isRanged:   false,
      scale:      3,
      scoreMul:   1.2,
    },
    brute: {
      name:       'Brute',
      palette:    BRUTE_PAL,
      frames:     [BRUTE_W1, BRUTE_W2],
      healthMul:  2.6,
      speedMul:   0.5,
      damageMul:  1.8,
      attackRate: 0.8,
      jumpMul:    0.5,
      isRanged:   false,
      scale:      4,
      scoreMul:   2.5,
    },
    sprinter: {
      name:       'Sprinter',
      palette:    SPRINTER_PAL,
      frames:     [SPRINTER_W1, SPRINTER_W2],
      healthMul:  0.35,
      speedMul:   2.3,         // very fast
      damageMul:  0.5,
      attackRate: 2.5,
      jumpMul:    1.3,
      isRanged:   false,
      scale:      3,
      scoreMul:   1.5,
    },
    shooter: {
      name:       'Shooter',
      palette:    SHOOTER_PAL,
      frames:     [SHOOTER_W1, SHOOTER_W2],
      healthMul:  0.7,
      speedMul:   0.6,
      damageMul:  0.9,
      attackRate: 0.9,
      jumpMul:    0.7,
      isRanged:   true,
      bulletSpeed: 420,
      scale:      3,
      scoreMul:   2.0,
    },
  };

  /* ---------- Spawn mix per wave ---------- */

  /** Select a type based on current wave number */
  function pickType(wave) {
    const roll = Math.random();
    if (wave <= 1) {
      return 'walker';
    } else if (wave === 2) {
      return roll < 0.7 ? 'walker' : 'runner';
    } else if (wave === 3) {
      return roll < 0.45 ? 'walker' : roll < 0.80 ? 'runner' : 'shooter';
    } else if (wave === 4) {
      return roll < 0.35 ? 'walker' : roll < 0.60 ? 'runner'
           : roll < 0.80 ? 'shooter' : 'brute';
    } else {
      // Wave 5+: full variety including sprinters
      return roll < 0.25 ? 'walker'
           : roll < 0.45 ? 'runner'
           : roll < 0.65 ? 'sprinter'
           : roll < 0.85 ? 'shooter'
           : 'brute';
    }
  }

  /* ---------- Create ---------- */

  function create(wave, worldW, groundY, playerX) {
    const typeKey = pickType(wave);
    const tmpl = TEMPLATES[typeKey];

    const scale = 1 + (wave - 1) * 0.10;
    const baseHealth = 50;
    const baseSpeed = 120;
    const baseDamage = 12;
    const baseJump = 400;

    const sprW = tmpl.frames[0][0].length * tmpl.scale;
    const sprH = tmpl.frames[0].length * tmpl.scale;

    // Spawn just INSIDE the world bounds so they can't walk off-screen
    const spawnLeft = Math.random() < 0.5;
    const margin = 20;
    const sx = spawnLeft ? margin : worldW - sprW - margin;

    return {
      type: typeKey,
      x: sx,
      y: groundY - sprH,
      vx: 0,
      vy: 0,
      w: sprW,
      h: sprH,
      facingRight: !spawnLeft,
      grounded: false,
      health: Math.round(baseHealth * tmpl.healthMul * scale),
      maxHealth: Math.round(baseHealth * tmpl.healthMul * scale),
      speed: baseSpeed * tmpl.speedMul * Math.min(scale, 2.5),
      damage: Math.round(baseDamage * tmpl.damageMul * scale),
      attackRate: tmpl.attackRate * (1 + (wave - 1) * 0.05),
      jumpForce: baseJump * tmpl.jumpMul,
      isRanged: tmpl.isRanged,
      bulletSpeed: tmpl.bulletSpeed || 0,
      alive: true,
      invulnTimer: 0,
      scoreValue: Math.round(10 * scale * tmpl.scoreMul),
      name: tmpl.name,
      sprite: tmpl,          // reference to template (frames, palette, scale)
      animTimer: Math.random() * 4,
      animFrame: 0,
      ai: AI.createAI(),
    };
  }

  /* ---------- Physics ---------- */

  function applyPhysics(e, dt, gravity, worldW, groundY, platforms) {
    e.vy += gravity * dt;
    if (e.vy > 800) e.vy = 800;

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // Clamp to world bounds so zombies can never walk off-screen
    if (e.x < 0) e.x = 0;
    if (e.x + e.w > worldW) e.x = worldW - e.w;

    // Ground
    e.grounded = false;
    if (e.y + e.h >= groundY) {
      e.y = groundY - e.h;
      e.vy = 0;
      e.grounded = true;
    }

    // Platforms (one-way from above)
    if (e.vy >= 0) {
      for (const plat of platforms) {
        const feetY = e.y + e.h;
        const prevFeetY = feetY - e.vy * dt;
        if (prevFeetY <= plat.y &&
            feetY >= plat.y &&
            e.x + e.w > plat.x &&
            e.x < plat.x + plat.w) {
          e.y = plat.y - e.h;
          e.vy = 0;
          e.grounded = true;
          break;
        }
      }
    }
  }

  /* ---------- Damage ---------- */

  function takeDamage(enemy, amount) {
    if (!enemy.alive) return false;
    enemy.health -= amount;
    enemy.invulnTimer = 0.06;
    if (enemy.health <= 0) {
      enemy.health = 0;
      enemy.alive = false;
      return true;
    }
    return false;
  }

  /* ---------- Draw ---------- */

  function draw(ctx, enemy, camX, camY) {
    if (!enemy.alive) return;

    const sx = Math.round(enemy.x - camX);
    const sy = Math.round(enemy.y - camY);

    if (enemy.invulnTimer > 0) ctx.globalAlpha = 0.5;

    enemy.animTimer += 0.016 * (4 + enemy.speed * 0.01);
    const frames = enemy.sprite.frames;
    const frame = frames[Math.floor(enemy.animTimer) % frames.length];

    Utils.drawSprite(ctx, frame, enemy.sprite.palette, sx, sy, enemy.sprite.scale, !enemy.facingRight);

    ctx.globalAlpha = 1;

    // Health bar
    const barW = enemy.w;
    const barH = 4;
    const bx = sx;
    const by = sy - 8;
    const hpRatio = enemy.health / enemy.maxHealth;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#44bb44' : hpRatio > 0.25 ? '#ccaa22' : '#cc2222';
    ctx.fillRect(bx, by, barW * hpRatio, barH);

    // Type label
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '10px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(enemy.name, sx + enemy.w / 2, by - 2);
    ctx.textAlign = 'left';
  }

  return { create, applyPhysics, takeDamage, draw };
})();
