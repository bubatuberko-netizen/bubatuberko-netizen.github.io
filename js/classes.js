/* ===================================================
   classes.js — Character class definitions
   Tuned for side-scrolling platformer gameplay
   =================================================== */

'use strict';

const ClassDefs = (() => {

  const CLASSES = {

    gunslinger: {
      name: 'Gunslinger',
      maxHealth: 100,
      speed: 260,           // horizontal walk speed (px/s)
      jumpForce: 480,       // initial upward velocity
      damage: 22,
      fireRate: 3.5,
      bulletSpeed: 600,
      bulletCount: 1,
      spread: 0.03,
      color: '#d4a54a',
      bulletColor: '#ffe066',
      weaponName: 'Revolver'
    },

    sheriff: {
      name: 'Sheriff',
      maxHealth: 160,
      speed: 190,
      jumpForce: 420,
      damage: 13,
      fireRate: 1.8,
      bulletSpeed: 500,
      bulletCount: 5,
      spread: 0.3,
      color: '#3a7bbf',
      bulletColor: '#ffcc44',
      weaponName: 'Shotgun'
    },

    outlaw: {
      name: 'Outlaw',
      maxHealth: 70,
      speed: 340,
      jumpForce: 520,
      damage: 10,
      fireRate: 7,
      bulletSpeed: 560,
      bulletCount: 1,
      spread: 0.07,
      color: '#cc3333',
      bulletColor: '#ff6644',
      weaponName: 'Dual Pistols'
    }
  };

  function getClass(name) {
    const c = CLASSES[name];
    if (!c) throw new Error(`Unknown class: ${name}`);
    return Object.assign({}, c);
  }

  function list() {
    return Object.keys(CLASSES);
  }

  return { getClass, list, CLASSES };
})();
