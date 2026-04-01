// --- CLASSES ---
 
class Player {
    constructor(canvas) {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.hp = 100;
        this.size = 30;
    }
 
    draw(ctx) {
        ctx.fillStyle = '#5d4037'; // Brown Coat
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
        ctx.fillStyle = '#000'; // Hat
        ctx.fillRect(this.x - 20, this.y - 5, 40, 6);
    }
 
    update(keys) {
        const speed = 4;
        if (keys['KeyW'] || keys['ArrowUp']) this.y -= speed;
        if (keys['KeyS'] || keys['ArrowDown']) this.y += speed;
        if (keys['KeyA'] || keys['ArrowLeft']) this.x -= speed;
        if (keys['KeyD'] || keys['ArrowRight']) this.x += speed;
    }
}
 
class Bullet {
    constructor(x, y, targetX, targetY) {
        this.x = x;
        this.y = y;
        const angle = Math.atan2(targetY - y, targetX - x);
        this.vx = Math.cos(angle) * 10;
        this.vy = Math.sin(angle) * 10;
    }
 
    update() {
        this.x += this.vx;
        this.y += this.vy;
    }
 
    draw(ctx) {
        ctx.fillStyle = 'gold';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
        ctx.fill();
    }
}
 
class Zombie {
    constructor(playerX, playerY, wave) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 800; // Spawn distance
        this.x = playerX + Math.cos(angle) * dist;
        this.y = playerY + Math.sin(angle) * dist;
        this.speed = 1 + (wave * 0.2);
        this.hp = 1 + Math.floor(wave / 5);
        this.size = 30;
    }
 
    update(playerX, playerY) {
        const angle = Math.atan2(playerY - this.y, playerX - this.x);
        this.x += Math.cos(angle) * this.speed;
        this.y += Math.sin(angle) * this.speed;
    }
 
    draw(ctx) {
        ctx.fillStyle = '#4e5d37'; // Zombie Green
        ctx.fillRect(this.x - 15, this.y - 15, 30, 30);
    }
}
 
// --- GAME ENGINE ---
 
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
 
        this.player = new Player(this.canvas);
        this.zombies = [];
        this.bullets = [];
        this.keys = {};
        this.wave = 0;
        this.active = false;
 
        this.initInputs();
    }
 
    initInputs() {
        window.addEventListener('keydown', e => this.keys[e.code] = true);
        window.addEventListener('keyup', e => this.keys[e.code] = false);
        window.addEventListener('mousedown', e => this.shoot(e.clientX, e.clientY));
        window.addEventListener('touchstart', e => {
            this.shoot(e.touches[0].clientX, e.touches[0].clientY);
        });
        document.getElementById('start-btn').onclick = () => this.start();
    }
 
    start() {
        document.getElementById('menu').style.display = 'none';
        this.active = true;
        this.spawnWave();
        this.loop();
    }
 
    spawnWave() {
        this.wave++;
        document.getElementById('wave-val').innerText = this.wave;
        const ann = document.getElementById('announcer');
        ann.innerText = `WAVE ${this.wave} HAS STARTED`;
        ann.style.display = 'block';
        setTimeout(() => ann.style.display = 'none', 2000);
 
        const count = 5 + (this.wave * 3);
        for (let i = 0; i < count; i++) {
            this.zombies.push(new Zombie(this.player.x, this.player.y, this.wave));
        }
    }
 
    shoot(tx, ty) {
        if (!this.active) return;
        this.bullets.push(new Bullet(this.player.x, this.player.y, tx, ty));
    }
 
    update() {
        this.player.update(this.keys);
 
        // Bullets
        this.bullets.forEach((b, i) => {
            b.update();
            if (b.x < 0 || b.x > this.canvas.width || b.y < 0 || b.y > this.canvas.height) {
                this.bullets.splice(i, 1);
            }
        });
 
        // Zombies
        this.zombies.forEach((z, zi) => {
            z.update(this.player.x, this.player.y);
 
            // Collision with bullet
            this.bullets.forEach((b, bi) => {
                if (Math.hypot(z.x - b.x, z.y - b.y) < 20) {
                    z.hp--;
                    this.bullets.splice(bi, 1);
                    if (z.hp <= 0) this.zombies.splice(zi, 1);
                }
            });
 
            // Collision with player
            if (Math.hypot(z.x - this.player.x, z.y - this.player.y) < 25) {
                this.player.hp -= 0.5;
                document.getElementById('hp-val').innerText = Math.ceil(this.player.hp);
            }
        });
 
        if (this.zombies.length === 0) this.spawnWave();
        if (this.player.hp <= 0) this.gameOver();
    }
 
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.player.draw(this.ctx);
        this.bullets.forEach(b => b.draw(this.ctx));
        this.zombies.forEach(z => z.draw(this.ctx));
    }
 
    gameOver() {
        this.active = false;
        document.getElementById('game-over').style.display = 'flex';
        document.getElementById('final-stats').innerText = `Waves Cleared: ${this.wave - 1}`;
    }
 
    loop() {
        if (!this.active) return;
        this.update();
        this.draw();
        requestAnimationFrame(() => this.loop());
    }
}
 
// Start the game
new Game();
