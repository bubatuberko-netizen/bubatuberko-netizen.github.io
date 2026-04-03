/* ===================================================
   player.js — Side-scrolling player with gravity, jumping,
   and pixel-art Clint Eastwood–inspired cowboy sprite
   =================================================== */

'use strict';

const PlayerModule = (() => {

  /* ---------- Pixel-Art Cowboy Sprite ----------
     Inspired by Clint Eastwood's "Man with No Name":
     Wide flat hat, squinting eyes, poncho, boots.
     14 wide × 22 tall pixels, drawn at scale 3 = 42×66 px on screen */

  const PAL = {
    '.': null,
    'o': '#0e0800',    // outline / darkest
    'H': '#5c3a1e',    // hat crown
    'h': '#3a2010',    // hat dark
    'D': '#8a6838',    // hat band detail
    's': '#d4a574',    // skin
    'S': '#b48858',    // skin shadow
    'e': '#0a0a0a',    // eyes
    'u': '#907050',    // stubble
    'p': '#c9a84c',    // poncho
    'P': '#9a7830',    // poncho fold
    'A': '#b09040',    // poncho mid
    'g': '#606060',    // gun metal
    'G': '#ccaa44',    // belt buckle
    'j': '#443855',    // jeans
    'J': '#554865',    // jeans highlight
    'b': '#3a2010',    // boots
    'B': '#2a1508',    // boot sole
  };

  // Idle / standing frame
  const IDLE = [
    '...ohhhhho...',  // 0  hat brim edge
    '..ohHHHHHho..',  // 1  hat brim
    '..oHHHHHHho..',  // 2  hat brim
    '...hDDDDHh...',  // 3  hat band
    '...HHHHHH....',  // 4  hat crown
    '...HHHHHH....',  // 5  hat crown top
    '....ssssss...',  // 6  forehead
    '...SseeSes...',  // 7  squinting eyes
    '....ssssss...',  // 8  nose
    '....suuuss...',  // 9  stubble mouth
    '....ssssss...',  // 10 chin
    '...pppppppp..',  // 11 poncho collar
    '..pppAPAPpp..',  // 12 poncho top
    '.ppPPAPAPPpp.',  // 13 poncho wide
    '.ppPPPPPPPpp.',  // 14 poncho body
    '..pPPPPPPPp..',  // 15 poncho
    '...pppppppp..',  // 16 poncho bottom
    '....pGgpp....',  // 17 belt + buckle + holster
    '....jjjjj....',  // 18 jeans
    '....jj.jj....',  // 19 legs
    '...obb.bbo...',  // 20 boots
    '...BBB.BBB...',  // 21 boot soles
  ];

  // Walk frame 1 — left leg forward
  const WALK1 = [
    '...ohhhhho...',
    '..ohHHHHHho..',
    '..oHHHHHHho..',
    '...hDDDDHh...',
    '...HHHHHH....',
    '...HHHHHH....',
    '....ssssss...',
    '...SseeSes...',
    '....ssssss...',
    '....suuuss...',
    '....ssssss...',
    '...pppppppp..',
    '..pppAPAPpp..',
    '.ppPPAPAPPpp.',
    '.ppPPPPPPPpp.',
    '..pPPPPPPPp..',
    '...pppppppp..',
    '....pGgpp....',
    '....jjjjj....',
    '...jj...jj...',
    '..obb...bbo..',
    '..BBB...BBB..',
  ];

  // Walk frame 2 — right leg forward
  const WALK2 = [
    '...ohhhhho...',
    '..ohHHHHHho..',
    '..oHHHHHHho..',
    '...hDDDDHh...',
    '...HHHHHH....',
    '...HHHHHH....',
    '....ssssss...',
    '...SseeSes...',
    '....ssssss...',
    '....suuuss...',
    '....ssssss...',
    '...pppppppp..',
    '..pppAPAPpp..',
    '.ppPPAPAPPpp.',
    '.ppPPPPPPPpp.',
    '..pPPPPPPPp..',
    '...pppppppp..',
    '....pGgpp....',
    '....jjjjj....',
    '....jj.jj....',
    '...obb.bbo...',
    '...BBB.BBB...',
  ];

  const SPRITE_SCALE = 3;
  const FRAMES = [IDLE, WALK1, WALK2, WALK1]; // 4-frame walk cycle

  /* ---------- Create ---------- */

  function create(classDef) {
    return {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      w: IDLE[0].length * SPRITE_SCALE,   // collision width
      h: IDLE.length * SPRITE_SCALE,       // collision height
      facingRight: true,
      grounded: false,
      health: classDef.maxHealth,
      maxHealth: classDef.maxHealth,
      speed: classDef.speed,
      jumpForce: classDef.jumpForce,
      damage: classDef.damage,
      fireRate: classDef.fireRate,
      bulletSpeed: classDef.bulletSpeed,
      bulletCount: classDef.bulletCount,
      spread: classDef.spread,
      bulletColor: classDef.bulletColor,
      className: classDef.name,
      fireCooldown: 0,
      alive: true,
      invulnTimer: 0,
      animTimer: 0,
      animFrame: 0,
      walking: false
    };
  }

  /* ---------- Update ---------- */

  function update(p, input, dt, gravity, worldW, groundY, platforms) {
    if (!p.alive) return;

    // --- Horizontal movement ---
    let mx = 0;
    if (input.keys['a'] || input.keys['arrowleft'])  mx -= 1;
    if (input.keys['d'] || input.keys['arrowright']) mx += 1;

    p.vx = mx * p.speed;
    p.walking = mx !== 0;

    // Face direction of movement (keep facing when idle)
    if (mx > 0) p.facingRight = true;
    else if (mx < 0) p.facingRight = false;

    // --- Jump ---
    if ((input.keys['w'] || input.keys[' '] || input.keys['arrowup']) && p.grounded) {
      p.vy = -p.jumpForce;
      p.grounded = false;
    }

    // --- Apply gravity ---
    p.vy += gravity * dt;
    if (p.vy > 800) p.vy = 800; // terminal velocity

    // --- Move ---
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // --- Clamp horizontal ---
    p.x = Utils.clamp(p.x, 0, worldW - p.w);

    // --- Ground collision ---
    p.grounded = false;
    if (p.y + p.h >= groundY) {
      p.y = groundY - p.h;
      p.vy = 0;
      p.grounded = true;
    }

    // --- Platform collision (one-way: can jump through from below) ---
    if (p.vy >= 0) { // only when falling or standing
      for (const plat of platforms) {
        const feetY = p.y + p.h;
        const prevFeetY = feetY - p.vy * dt;
        if (prevFeetY <= plat.y &&
            feetY >= plat.y &&
            p.x + p.w > plat.x &&
            p.x < plat.x + plat.w) {
          p.y = plat.y - p.h;
          p.vy = 0;
          p.grounded = true;
          break;
        }
      }
    }

    // --- Timers ---
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    if (p.invulnTimer > 0) p.invulnTimer -= dt;

    // --- Animation ---
    if (p.walking) {
      p.animTimer += dt * 8; // 8 frames/sec walk cycle
      p.animFrame = Math.floor(p.animTimer) % FRAMES.length;
    } else {
      p.animTimer = 0;
      p.animFrame = 0;
    }
  }

  /* ---------- Shoot ---------- */

  function tryShoot(p, input) {
    if (!p.alive || !input.mouseDown || p.fireCooldown > 0) return [];

    p.fireCooldown = 1 / p.fireRate;
    Utils.AudioMgr.playShoot();

    // Aim toward mouse in world coords
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h * 0.4; // shoot from chest height
    const aimAngle = Utils.angle(cx, cy, input.mouseWorldX, input.mouseWorldY);

    // Face aim direction
    p.facingRight = Math.cos(aimAngle) >= 0;

    const bullets = [];
    for (let i = 0; i < p.bulletCount; i++) {
      let a = aimAngle;
      if (p.bulletCount > 1) {
        const step = p.spread / (p.bulletCount - 1);
        a = aimAngle - p.spread / 2 + step * i;
      }
      a += Utils.randFloat(-p.spread * 0.15, p.spread * 0.15);

      bullets.push({
        x: cx + Math.cos(aimAngle) * 20,
        y: cy + Math.sin(aimAngle) * 10,
        vx: Math.cos(a) * p.bulletSpeed,
        vy: Math.sin(a) * p.bulletSpeed,
        damage: p.damage,
        radius: 4,
        color: p.bulletColor,
        life: 1.5,
        isPlayer: true
      });
    }
    return bullets;
  }

  /* ---------- Damage ---------- */

  function takeDamage(p, amount) {
    if (!p.alive || p.invulnTimer > 0) return;
    p.health -= amount;
    p.invulnTimer = 0.15;
    if (p.health <= 0) {
      p.health = 0;
      p.alive = false;
    }
  }

  /* ---------- Draw ---------- */

  function draw(ctx, p, camX, camY) {
    if (!p.alive) return;

    const sx = Math.round(p.x - camX);
    const sy = Math.round(p.y - camY);

    // Invulnerability flicker
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 30) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    const frame = FRAMES[p.animFrame];
    Utils.drawSprite(ctx, frame, PAL, sx, sy, SPRITE_SCALE, !p.facingRight);

    ctx.globalAlpha = 1;
  }

  return { create, update, tryShoot, takeDamage, draw, SPRITE_SCALE };
})();
