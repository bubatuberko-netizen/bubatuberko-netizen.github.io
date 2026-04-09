/* ===================================================
   main.js — Entry point: wires UI callbacks to Game
   =================================================== */

'use strict';

(function boot() {

  Game.init();

  UI.init({
    onPlay() {
      const classKey = UI.getSelectedClass();
      Game.start(classKey);
    },
    onPause() {
      Game.togglePause();
    },
    onResume() {
      Game.resume();
    },
    onQuitToMenu() {
      Game.stop();
    }
  });

  UI.showMenu();

})();
