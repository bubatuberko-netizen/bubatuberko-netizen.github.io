/* ===================================================
   enemy.js — Zombie enemies with pixel-art sprites,
   ground physics, and health
   =================================================== */

'use strict';

const EnemyModule = (() => {

  /* ---------- Zombie Pixel-Art Sprite ----------
     Shambling undead: green skin, red eyes, torn
     clothes, arms reaching forward.
     12 wide × 20 tall pixels, drawn at scale 3 */

  const PAL = {
    '.': null,
    'o': '#0a0a05',    // outline
    'g': '#5a7a4a',    // green skin
    'G': '#4a6a38',    // green shadow
    'd': '#3a5a28',    // dark green
    'e': '#cc2222',    // red eye
    'E': '#ff4444',    // bright eye glow
    'm': '#1a1a0a',    // mouth cavity
    'w': '#8a8a78',    // bone / wound
    't': '#6a5a48',    // torn shirt
    'T': '#4a3a28',    // shirt shadow
    'r': '#4a3828',    // torn pants
    'R': '#3a2818',    // pants dark
    'f': '#3a3828',    // feet
    'F': '#2a2818',    // feet dark
  };

  // Walk frame 1 — arms reaching forward (right)
  const WALK1 = [
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

  // Walk frame 2 — legs swapped, slight bob
  const WALK2 = [
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

  const SPRITE_SCALE = 3;
  const FRAMES = [WALK1, WALK2];

  /* ---------- Zombie types scale with wave ---------- */
  const TEMPLATES = [
    { name: 'Walker',  healthMul: 1.0, speedMul: 0.7, damageMul: 1.0, attackRate: 1.2, jumpMul: 0.8 },
    { name: 'Runner',  healthMul: 0.5, speedMul: 1.5, damageMul: 0.6, attackRate: 1.8, jumpMul: 1.2 },
    { name: 'Brute',   healthMul: 2.0, speedMul: 0.4, damageMul: 1.8, attackRate: 0.7, jumpMul: 0.6 },
  ];

  /* ---------- Create ---------- */

  function create(wave, worldW, groundY, playerX) {
    // Pick template: walkers early, runners/brutes mixed in later
    let templateIdx;
    if (wave <= 2) {
      templateIdx = 0; // walkers only
    } else {
      const roll = Math.random();
      templateIdx = roll < 0.5 ? 0 : roll < 0.8 ? 1 : 2;
    }
    const tmpl = TEMPLATES[templateIdx];

    const scale = 1 + (wave - 1) * 0.08;
    const baseHealth = 50;
    const baseSpeed = 120;
    const baseDamage = 12;
    const baseJump = 400;

    // Spawn from left or right edge
    const spawnLeft = Math.random() < 0.5;
    const sx = spawnLeft ? -40 : worldW + 40;
    const sprW = WALK1[0].length * SPRITE_SCALE;
    const sprH = WALK1.length * SPRITE_SCALE;

    return {
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
      speed: baseSpeed * tmpl.speedMul * Math.min(scale, 2),
      damage: Math.round(baseDamage * tmpl.damageMul * scale),
      attackRate: tmpl.attackRate,
      jumpForce: baseJump * tmpl.jumpMul,
      alive: true,
      invulnTimer: 0,
      scoreValue: Math.round(10 * scale * (templateIdx === 2 ? 2 : 1)),
      name: tmpl.name,
      animTimer: Math.random() * 4, // offset so zombies don't animate in sync
      animFrame: 0,
      ai: AI.createAI()
    };
  }

  /* ---------- Physics (gravity + platforms) ---------- */

  function applyPhysics(e, dt, gravity, groundY, platforms) {
    e.vy += gravity * dt;
    if (e.vy > 800) e.vy = 800;

    e.x += e.vx * dt;
    e.y += e.vy * dt;

    // Ground
    e.grounded = false;
    if (e.y + e.h >= groundY) {
      e.y = groundY - e.h;
      e.vy = 0;
      e.grounded = true;
    }

    // Platforms (one-way)
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

    // Hit flash
    if (enemy.invulnTimer > 0) ctx.globalAlpha = 0.5;

    // Animate walk
    enemy.animTimer += 0.016 * 4; // ~4 fps walk anim
    const frame = FRAMES[Math.floor(enemy.animTimer) % FRAMES.length];
    Utils.drawSprite(ctx, frame, PAL, sx, sy, SPRITE_SCALE, !enemy.facingRight);

    ctx.globalAlpha = 1;

    // Health bar above
    const barW = enemy.w;
    const barH = 4;
    const bx = sx;
    const by = sy - 8;
    const hpRatio = enemy.health / enemy.maxHealth;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#44bb44' : hpRatio > 0.25 ? '#ccaa22' : '#cc2222';
    ctx.fillRect(bx, by, barW * hpRatio, barH);
  }

  return { create, applyPhysics, takeDamage, draw, SPRITE_SCALE };
})();
