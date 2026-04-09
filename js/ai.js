/* ===================================================
   ai.js — Zombie AI: always aggressive.
   Supports melee walkers and ranged shooters.
   =================================================== */

'use strict';

const AI = (() => {

  const STATE = {
    CHASE:  'chase',
    ATTACK: 'attack',
    KITE:   'kite'   // shooters keeping distance
  };

  // Shooters engage from range
  const MELEE_RANGE   = 42;
  const RANGED_MIN    = 260;   // shooters try to stay at least this far
  const RANGED_MAX    = 520;   // but within this range

  function createAI() {
    return {
      state: STATE.CHASE,
      attackCooldown: Math.random() * 0.5,   // stagger first shot
      thinkTimer: 0,
      jumpCooldown: Math.random() * 1.5
    };
  }

  /**
   * Update zombie AI.
   * @returns {{meleeDamage: number, bullets: Array}}
   */
  function update(enemy, player, dt) {
    const ai = enemy.ai;
    const result = { meleeDamage: 0, bullets: [] };

    if (ai.attackCooldown > 0) ai.attackCooldown -= dt;
    if (ai.thinkTimer > 0)    ai.thinkTimer -= dt;
    if (ai.jumpCooldown > 0)  ai.jumpCooldown -= dt;

    const ex = enemy.x + enemy.w / 2;
    const ey = enemy.y + enemy.h / 2;
    const px = player.x + player.w / 2;
    const py = player.y + player.h / 2;
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const playerAlive = player.alive;

    if (!playerAlive) {
      // Wander lazily if player is dead
      enemy.vx = 0;
      return result;
    }

    // --- State selection ---
    if (ai.thinkTimer <= 0) {
      ai.thinkTimer = 0.2;
      if (enemy.isRanged) {
        // Shooter: engage if within range
        if (dist < RANGED_MIN) ai.state = STATE.KITE;
        else if (dist <= RANGED_MAX) ai.state = STATE.ATTACK;
        else ai.state = STATE.CHASE;
      } else {
        // Melee: chase until in range
        if (dist < MELEE_RANGE) ai.state = STATE.ATTACK;
        else ai.state = STATE.CHASE;
      }
    }

    // --- Behavior ---
    switch (ai.state) {

      case STATE.CHASE: {
        // Full aggression — run straight at player
        enemy.vx = Math.sign(dx) * enemy.speed;
        enemy.facingRight = dx > 0;
        // Jump if player is above or if close to vertical obstacle
        if (dy < -60 && enemy.grounded && ai.jumpCooldown <= 0) {
          enemy.vy = -enemy.jumpForce;
          enemy.grounded = false;
          ai.jumpCooldown = 1.0;
        }
        break;
      }

      case STATE.ATTACK: {
        enemy.facingRight = dx > 0;

        if (enemy.isRanged) {
          // Shooter: stand still, fire at player
          enemy.vx = Math.sign(dx) * enemy.speed * 0.15;
          if (ai.attackCooldown <= 0 && enemy.grounded) {
            ai.attackCooldown = 1 / enemy.attackRate;
            const a = Math.atan2(dy, dx);
            result.bullets.push({
              x: ex + Math.cos(a) * 22,
              y: ey + Math.sin(a) * 8,
              vx: Math.cos(a) * (enemy.bulletSpeed || 400),
              vy: Math.sin(a) * (enemy.bulletSpeed || 400),
              damage: enemy.damage,
              radius: 4,
              color: '#aaff44',    // sickly green acid projectile
              life: 1.8,
              isPlayer: false
            });
          }
        } else {
          // Melee: close the gap while swinging
          enemy.vx = Math.sign(dx) * enemy.speed * 0.3;
          if (ai.attackCooldown <= 0) {
            ai.attackCooldown = 1 / enemy.attackRate;
            result.meleeDamage = enemy.damage;
          }
        }
        break;
      }

      case STATE.KITE: {
        // Shooter too close — back away while still firing
        enemy.vx = -Math.sign(dx) * enemy.speed * 0.7;
        enemy.facingRight = dx > 0;
        if (ai.attackCooldown <= 0 && enemy.grounded) {
          ai.attackCooldown = 1 / enemy.attackRate;
          const a = Math.atan2(dy, dx);
          result.bullets.push({
            x: ex + Math.cos(a) * 22,
            y: ey + Math.sin(a) * 8,
            vx: Math.cos(a) * (enemy.bulletSpeed || 400),
            vy: Math.sin(a) * (enemy.bulletSpeed || 400),
            damage: enemy.damage,
            radius: 4,
            color: '#aaff44',
            life: 1.8,
            isPlayer: false
          });
        }
        break;
      }
    }

    return result;
  }

  return { createAI, update, STATE };
})();
