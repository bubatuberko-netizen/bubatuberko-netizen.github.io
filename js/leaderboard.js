/* ===================================================
   leaderboard.js — Persistent leaderboard via localStorage
   Stores top 10 scores with username and date
   =================================================== */

'use strict';

const Leaderboard = (() => {

  const STORAGE_KEY = 'dustyduel_leaderboard';
  const MAX_ENTRIES = 10;

  /** Load scores from localStorage */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data;
    } catch {
      return [];
    }
  }

  /** Save scores to localStorage */
  function save(scores) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch {
      // Storage full or unavailable — silently fail
    }
  }

  /**
   * Add a new score entry.
   * @param {string} username
   * @param {number} score
   * @returns {number} rank (1-based) or -1 if not in top 10
   */
  function addScore(username, score) {
    const scores = load();
    const entry = {
      name: username,
      score: score,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    scores.push(entry);
    scores.sort((a, b) => b.score - a.score);

    // Keep only top entries
    if (scores.length > MAX_ENTRIES) {
      scores.length = MAX_ENTRIES;
    }

    save(scores);

    // Return rank
    const rank = scores.findIndex(s => s === entry);
    return rank !== -1 ? rank + 1 : -1;
  }

  /** Get sorted leaderboard entries */
  function getScores() {
    return load().sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
  }

  /** Clear all scores */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  return { addScore, getScores, clear };
})();
