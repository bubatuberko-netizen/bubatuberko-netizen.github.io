// --- DOM Elements ---
const screens = {
    menu: document.getElementById('menu-screen'),
    game: document.getElementById('game-screen'),
    scoreboard: document.getElementById('scoreboard-screen')
};
const usernameInput = document.getElementById('username');
const btnStart = document.getElementById('btn-start');
const btnScores = document.getElementById('btn-scores');
const btnBack = document.getElementById('btn-back');
const scoreDisplay = document.getElementById('score-display');
const nameDisplay = document.getElementById('player-name-display');
const scoreList = document.getElementById('score-list');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Game State ---
let isPlaying = false;
let animationId;
let score = 0;
let frames = 0;
let username = localStorage.getItem('wwz_username') || '';

// --- Entity Arrays ---
let bullets = [];
let zombies = [];
let particles = [];

// --- Input Handling ---
const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false };
const mouse = { x: canvas.width/2, y: canvas.height/2, isDown: false };

window.addEventListener('keydown', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; });
window.addEventListener('keyup', e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });
canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});
canvas.addEventListener('mousedown', () => mouse.isDown = true);
canvas.addEventListener('mouseup', () => mouse.isDown = false);

// --- Player Object ---
const player = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 24,
    speed: 3,
    color: '#3498db',
    cooldown: 0,
    maxCooldown: 15
};

// --- Procedural Pixel Art Generator ---
// We draw shapes using a grid of squares to mimic pixel art
function drawPixelSprite(ctx, x, y, size, matrix, colors) {
    const pixelSize = size / matrix[0].length;
    ctx.save();
    ctx.translate(x - size/2, y - size/2);
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            const val = matrix[row][col];
            if (val !== 0) {
                ctx.fillStyle = colors[val];
                ctx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
            }
        }
    }
    ctx.restore();
}

// 1:Hat(brown), 2:Skin(peach), 3:Shirt(blue), 4:Pants(dark blue)
const cowboyMatrix = [
    [0,1,1,1,1,1,1,0],
    [1,1,1,1,1,1,1,1],
    [0,0,2,2,2,2,0,0],
    [0,0,2,2,2,2,0,0],
    [0,3,3,3,3,3,3,0],
    [3,3,3,3,3,3,3,3],
    [0,0,4,4,4,4,0,0],
    [0,0,4,0,0,4,0,0]
];
const cowboyColors = { 1: '#5c3a21', 2: '#ffcc99', 3: '#2980b9', 4: '#2c3e50' };

// 1:Skin(green), 2:Blood(red), 3:Clothes(grey), 4:Pants(dark grey)
const zombieMatrix = [
    [0,0,1,1,1,1,0,0],
    [0,1,1,2,1,1,1,0],
    [0,1,1,1,1,1,1,0],
    [1,3,3,3,3,3,3,1],
    [1,3,3,2,3,3,3,1],
    [0,0,3,3,3,3,0,0],
    [0,0,4,4,4,4,0,0],
    [0,0,4,0,0,4,0,0]
];
const zombieColors = { 1: '#5c8001', 2: '#8b0000', 3: '#7f8c8d', 4: '#34495e' };

// --- Game Logic ---
function init() {
    usernameInput.value = username;
    switchScreen('menu');
    
    btnStart.addEventListener('click', () => {
        username = usernameInput.value.trim() || 'Nameless Drifter';
        localStorage.setItem('wwz_username', username);
        startGame();
    });

    btnScores.addEventListener('click', () => {
        renderScoreboard();
        switchScreen('scoreboard');
    });

    btnBack.addEventListener('click', () => {
        switchScreen('menu');
    });
}

function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function startGame() {
    score = 0;
    frames = 0;
    bullets = [];
    zombies = [];
    particles = [];
    player.x = canvas.width / 2;
    player.y = canvas.height / 2;
    
    scoreDisplay.innerText = score;
    nameDisplay.innerText = username;
    
    switchScreen('game');
    isPlaying = true;
    gameLoop();
}

function gameOver() {
    isPlaying = false;
    cancelAnimationFrame(animationId);
    saveScore(username, score);
    setTimeout(() => {
        switchScreen('menu');
    }, 1000); // 1 second delay to see death
}

function spawnZombie() {
    // Difficulty increases over time: spawn faster and move faster
    const spawnRate = Math.max(30, 100 - Math.floor(frames / 100)); 
    if (frames % spawnRate !== 0) return;

    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? 0 - 30 : canvas.width + 30;
        y = Math.random() * canvas.height;
    } else {
        x = Math.random() * canvas.width;
        y = Math.random() < 0.5 ? 0 - 30 : canvas.height + 30;
    }

    const baseSpeed = 1 + (frames / 2000);

    zombies.push({
        x: x,
        y: y,
        size: 24,
        speed: baseSpeed + Math.random() * 0.5 
    });
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 20,
            color: color
        });
    }
}

function update() {
    frames++;

    // Player Movement
    let dx = 0, dy = 0;
    if (keys.w || keys.ArrowUp) dy -= 1;
    if (keys.s || keys.ArrowDown) dy += 1;
    if (keys.a || keys.ArrowLeft) dx -= 1;
    if (keys.d || keys.ArrowRight) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx*dx + dy*dy);
        dx /= length;
        dy /= length;
    }

    player.x += dx * player.speed;
    player.y += dy * player.speed;

    // Clamp to canvas bounds
    player.x = Math.max(player.size/2, Math.min(canvas.width - player.size/2, player.x));
    player.y = Math.max(player.size/2, Math.min(canvas.height - player.size/2, player.y));

    // Shooting
    if (player.cooldown > 0) player.cooldown--;
    if (mouse.isDown && player.cooldown === 0) {
        const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * 10,
            vy: Math.sin(angle) * 10,
            radius: 3
        });
        player.cooldown = player.maxCooldown;
    }

    // Update Bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        
        // Remove if off screen
        if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
            bullets.splice(i, 1);
        }
    }

    // Update Zombies & Check Collisions
    spawnZombie();
    for (let i = zombies.length - 1; i >= 0; i--) {
        const z = zombies[i];
        
        // Move towards player
        const angle = Math.atan2(player.y - z.y, player.x - z.x);
        z.x += Math.cos(angle) * z.speed;
        z.y += Math.sin(angle) * z.speed;

        // Zombie hits player
        const distToPlayer = Math.hypot(player.x - z.x, player.y - z.y);
        if (distToPlayer < (player.size/2 + z.size/2) - 4) { // slightly forgiving hitbox
            createParticles(player.x, player.y, '#8b0000');
            gameOver();
            return; // Halt update
        }

        // Bullet hits zombie
        for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j];
            const dist = Math.hypot(b.x - z.x, b.y - z.y);
            
            if (dist < z.size/2 + b.radius) {
                // Kill zombie
                createParticles(z.x, z.y, '#5c8001');
                zombies.splice(i, 1);
                bullets.splice(j, 1);
                score += 10;
                scoreDisplay.innerText = score;
                break; // Stop checking this zombie against other bullets
            }
        }
    }

    // Update Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function drawBackground() {
    ctx.fillStyle = '#c29b62'; // Desert sand
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some simple static cacti or rocks based on seeded pseudo-randomness
    // For simplicity, we'll just draw a few distinct ground markings
    ctx.fillStyle = '#b38b55';
    for(let i=0; i<10; i++) {
        const cx = (Math.sin(i * 123) * 0.5 + 0.5) * canvas.width;
        const cy = (Math.cos(i * 321) * 0.5 + 0.5) * canvas.height;
        ctx.fillRect(cx, cy, 15, 5);
    }
}

function draw() {
    drawBackground();

    // Draw Particles
    particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / 20;
        ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1.0; // reset

    // Draw Bullets (Lead color)
    ctx.fillStyle = '#333';
    bullets.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Zombies
    zombies.forEach(z => {
        drawPixelSprite(ctx, z.x, z.y, z.size, zombieMatrix, zombieColors);
    });

    // Draw Player
    // Calculate rotation towards mouse for the player sprite context
    ctx.save();
    ctx.translate(player.x, player.y);
    const angle = Math.atan2(mouse.y - player.y, mouse.x - player.x);
    // Add 90 degrees (PI/2) because our matrix faces "down" by default
    ctx.rotate(angle + Math.PI/2); 
    drawPixelSprite(ctx, 0, 0, player.size, cowboyMatrix, cowboyColors);
    ctx.restore();
    
    // Crosshair rendering
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(mouse.x, mouse.y, 8, 0, Math.PI * 2);
    ctx.moveTo(mouse.x - 12, mouse.y);
    ctx.lineTo(mouse.x + 12, mouse.y);
    ctx.moveTo(mouse.x, mouse.y - 12);
    ctx.lineTo(mouse.x, mouse.y + 12);
    ctx.stroke();
}

function gameLoop() {
    if (!isPlaying) return;
    update();
    draw();
    animationId = requestAnimationFrame(gameLoop);
}

// --- Leaderboard Logic ---
function getScores() {
    const scores = localStorage.getItem('wwz_scores');
    return scores ? JSON.parse(scores) : [];
}

function saveScore(name, newScore) {
    if (newScore === 0) return; // Don't save 0 point games

    let scores = getScores();
    scores.push({ name: name, score: newScore });
    
    // Sort descending
    scores.sort((a, b) => b.score - a.score);
    
    // Keep top 10
    if (scores.length > 10) scores = scores.slice(0, 10);
    
    localStorage.setItem('wwz_scores', JSON.stringify(scores));
}

function renderScoreboard() {
    const scores = getScores();
    scoreList.innerHTML = '';
    
    if (scores.length === 0) {
        scoreList.innerHTML = '<li>No bounties claimed yet.</li>';
        return;
    }

    scores.forEach((entry, index) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>#${index + 1} ${entry.name}</span> <span>$${entry.score}</span>`;
        scoreList.appendChild(li);
    });
}

// Initialize Application
init();
