/* ===================================================
   ai.js — Zombie AI: walk toward player, jump, attack
   Simple state machine: wander / chase / attack
   =================================================== */

'use strict';

const AI = (() => {

  const STATE = {
    WANDER: 'wander',
    CHASE:  'chase',
    ATTACK: 'attack'
  };

  const DETECT_RANGE = 400;
  const ATTACK_RANGE = 40;   // melee distance
  const LOSE_RANGE   = 700;

  function createAI() {
    return {
      state: STATE.WANDER,
      wanderDir: Math.random() < 0.5 ? -1 : 1,
      wanderTimer: Utils.randFloat(1, 3),
      attackCooldown: 0,
      thinkTimer: 0,
      jumpCooldown: 0
    };
  }

  /**
   * Update zombie AI. Returns melee damage dealt this frame (0 if none).
   */
  function update(enemy, player, dt) {
    const ai = enemy.ai;
    if (ai.attackCooldown > 0) ai.attackCooldown -= dt;
    if (ai.thinkTimer > 0) ai.thinkTimer -= dt;
    if (ai.jumpCooldown > 0) ai.jumpCooldown -= dt;

    const dx = player.x + player.w / 2 - (enemy.x + enemy.w / 2);
    const dy = player.y - enemy.y;
    const dist = Math.abs(dx);
    const playerAlive = player.alive;

    // --- State transitions ---
    if (ai.thinkTimer <= 0) {
      ai.thinkTimer = 0.25;

      switch (ai.state) {
        case STATE.WANDER:
          if (playerAlive && dist < DETECT_RANGE) ai.state = STATE.CHASE;
          break;
        case STATE.CHASE:
          if (!playerAlive || dist > LOSE_RANGE) {
            ai.state = STATE.WANDER;
            ai.wanderTimer = Utils.randFloat(1, 3);
          } else if (dist < ATTACK_RANGE) {
            ai.state = STATE.ATTACK;
          }
          break;
        case STATE.ATTACK:
          if (!playerAlive || dist > ATTACK_RANGE * 2) ai.state = STATE.CHASE;
          break;
      }
    }

    let meleeDamage = 0;

    // --- Behavior ---
    switch (ai.state) {

      case STATE.WANDER:
        ai.wanderTimer -= dt;
        if (ai.wanderTimer <= 0) {
          ai.wanderDir *= -1;
          ai.wanderTimer = Utils.randFloat(1.5, 4);
        }
        enemy.vx = ai.wanderDir * enemy.speed * 0.35;
        enemy.facingRight = ai.wanderDir > 0;
        break;

      case STATE.CHASE:
        // Walk toward player
        enemy.vx = Math.sign(dx) * enemy.speed;
        enemy.facingRight = dx > 0;

        // Jump if player is above and zombie is grounded
        if (dy < -60 && enemy.grounded && ai.jumpCooldown <= 0) {
          enemy.vy = -enemy.jumpForce;
          enemy.grounded = false;
          ai.jumpCooldown = 1.2;
        }
        break;

      case STATE.ATTACK:
        // Slow down and attack
        enemy.vx = Math.sign(dx) * enemy.speed * 0.2;
        enemy.facingRight = dx > 0;

        if (ai.attackCooldown <= 0) {
          meleeDamage = enemy.damage;
          ai.attackCooldown = 1 / enemy.attackRate;
        }
        break;
    }

    return meleeDamage;
  }

  return { createAI, update, STATE };
})();
