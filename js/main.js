/* ===================================================
   main.js — Entry point: wires UI callbacks to Game
   =================================================== */

'use strict';

(function boot() {

  // Initialize game engine (sets up canvas, input)
  Game.init();

  // Initialize UI with callbacks
  UI.init({
    onPlay() {
      const classKey = UI.getSelectedClass();
      Game.start(classKey);
    }
  });

  // Show main menu on load
  UI.showMenu();

})();
