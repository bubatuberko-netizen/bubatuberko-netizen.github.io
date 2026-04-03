/* ===================================================
   utils.js — Shared utility functions & object pooling
   =================================================== */

'use strict';

const Utils = (() => {

  /* ---------- Math Helpers ---------- */

  /** Distance between two points */
  function dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Angle from (x1,y1) toward (x2,y2) in radians */
  function angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  /** Clamp value between min and max */
  function clamp(val, min, max) {
    return val < min ? min : val > max ? max : val;
  }

  /** Random float in [min, max) */
  function randFloat(min, max) {
    return Math.random() * (max - min) + min;
  }

  /** Random integer in [min, max] inclusive */
  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Linear interpolation */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /** Normalize angle to [-PI, PI] */
  function normalizeAngle(a) {
    while (a > Math.PI)  a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  /* ---------- Collision ---------- */

  /** Circle vs circle overlap */
  function circleCollide(x1, y1, r1, x2, y2, r2) {
    const d = dist(x1, y1, x2, y2);
    return d < r1 + r2;
  }

  /** Point inside rectangle */
  function pointInRect(px, py, rx, ry, rw, rh) {
    return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
  }

  /* ---------- Object Pool ---------- */

  /**
   * Generic object pool to avoid GC pressure.
   * @param {Function} factory  — creates a new instance
   * @param {Function} reset    — resets an instance for reuse
   * @param {number}   initSize — pre-allocated count
   */
  class ObjectPool {
    constructor(factory, reset, initSize = 20) {
      this._factory = factory;
      this._reset = reset;
      this._pool = [];
      this.active = [];
      for (let i = 0; i < initSize; i++) {
        this._pool.push(this._factory());
      }
    }

    /** Get an object from pool (or create new) */
    acquire() {
      const obj = this._pool.length > 0 ? this._pool.pop() : this._factory();
      this.active.push(obj);
      return obj;
    }

    /** Return an object to pool */
    release(obj) {
      const idx = this.active.indexOf(obj);
      if (idx !== -1) {
        this.active.splice(idx, 1);
        this._reset(obj);
        this._pool.push(obj);
      }
    }

    /** Release all active objects */
    releaseAll() {
      while (this.active.length > 0) {
        const obj = this.active.pop();
        this._reset(obj);
        this._pool.push(obj);
      }
    }
  }

  /* ---------- Simple Audio Manager ---------- */

  const AudioMgr = (() => {
    const ctx = typeof AudioContext !== 'undefined'
      ? new AudioContext()
      : typeof webkitAudioContext !== 'undefined'
        ? new webkitAudioContext()
        : null;

    function resumeCtx() {
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }

    /** Play a short procedural sound effect */
    function playShoot() {
      if (!ctx) return;
      resumeCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.1);
    }

    function playHit() {
      if (!ctx) return;
      resumeCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.15);
    }

    function playDeath() {
      if (!ctx) return;
      resumeCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.5);
    }

    function playClick() {
      if (!ctx) return;
      resumeCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain).connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.05);
    }

    return { playShoot, playHit, playDeath, playClick };
  })();

  /* ---------- Canvas Helpers ---------- */

  /** Draw a filled circle */
  function fillCircle(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }

  /** Draw a stroked circle */
  function strokeCircle(ctx, x, y, r, color, lineWidth = 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  /* ---------- Pixel-Art Sprite Renderer ---------- */

  /**
   * Draw a pixel-art sprite from a string-array definition.
   * @param {CanvasRenderingContext2D} c   — canvas context
   * @param {string[]} sprite             — rows of characters
   * @param {Object}   palette            — char → CSS color (null = transparent)
   * @param {number}   x                  — top-left x
   * @param {number}   y                  — top-left y
   * @param {number}   scale              — size of each pixel block
   * @param {boolean}  flipX              — mirror horizontally
   */
  function drawSprite(c, sprite, palette, x, y, scale, flipX) {
    const rows = sprite.length;
    const cols = sprite[0].length;
    for (let r = 0; r < rows; r++) {
      const row = sprite[r];
      for (let col = 0; col < cols; col++) {
        const ch = row[col];
        if (ch === '.' || !palette[ch]) continue;
        const px = flipX ? (cols - 1 - col) : col;
        c.fillStyle = palette[ch];
        c.fillRect(x + px * scale, y + r * scale, scale, scale);
      }
    }
  }

  /** Get the pixel dimensions of a sprite at a given scale */
  function spriteSize(sprite, scale) {
    return { w: sprite[0].length * scale, h: sprite.length * scale };
  }

  /** AABB overlap test */
  function rectOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  /* ---------- Public API ---------- */
  return {
    dist, angle, clamp, randFloat, randInt, lerp, normalizeAngle,
    circleCollide, pointInRect, rectOverlap,
    ObjectPool,
    AudioMgr,
    fillCircle, strokeCircle,
    drawSprite, spriteSize
  };

})();
