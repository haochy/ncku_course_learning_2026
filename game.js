/**
 * Cyber-Scroller Game Engine - Endless Edition
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const FRICTION = 0.85;
const DEBUG = false; // Set to true to see hitboxes

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Assets
const assets = {
    player: new Image(),
    tileset: new Image(),
    enemy: new Image()
};

assets.player.src = 'assets/player.png';
assets.tileset.src = 'assets/tileset.png';
assets.enemy.src = 'assets/enemy.png';

// Game State
let score = 0;
let lives = 3;
let isStarted = false;
let gameOver = false;
let scrollOffset = 0;
let lastChunkX = 0;

const keys = {
    ArrowRight: false,
    ArrowLeft: false,
    ArrowUp: false,
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
    if (e.code === 'Space' && gameOver) location.reload();
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Entities
let platforms = [];
let enemies = [];
let collectibles = [];

// Platform Class
class Platform {
    constructor(x, y, width, height, type = 'ground') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'ground', 'float'
        
        // Refine hitbox to avoid "air walls" (slightly smaller than visual)
        this.hitbox = {
            x: this.x + 2,
            y: this.y + 2,
            width: this.width - 4,
            height: this.height - 4
        };
    }

    draw() {
        if (!assets.tileset.complete) return;
        
        let sx = 0, sy = 0;
        if (this.type === 'float') { sx = 512; sy = 0; }
        
        ctx.drawImage(assets.tileset, sx, sy, 512, 512, this.x, this.y, this.width, this.height);

        if (DEBUG) {
            ctx.strokeStyle = 'cyan';
            ctx.strokeRect(this.hitbox.x, this.hitbox.y, this.hitbox.width, this.hitbox.height);
        }
    }
}

// Enemy Class
class Enemy {
    constructor(x, y, range = 150) {
        this.x = x;
        this.startX = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.vx = 2;
        this.range = range;
        this.dead = false;
    }

    update() {
        if (this.dead) return;
        this.x += this.vx;
        if (Math.abs(this.x - this.startX) > this.range) {
            this.vx *= -1;
        }
    }

    draw() {
        if (this.dead || !assets.enemy.complete) return;
        ctx.drawImage(assets.enemy, this.x, this.y, this.width, this.height);
    }
}

// Collectible Class (Coin)
class Collectible {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.collected = false;
    }

    draw() {
        if (this.collected) return;
        ctx.fillStyle = '#ffdf00';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffdf00';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Player Class
class Player {
    constructor() {
        this.width = 40;
        this.height = 60;
        this.reset();
        this.vx = 0;
        this.vy = 0;
        this.speed = 0.8;
        this.maxSpeed = 7;
        this.jumpPower = -12;
        this.onGround = false;
        this.facingRight = true;
    }

    reset() {
        this.x = 100;
        this.y = 400;
        this.vx = 0;
        this.vy = 0;
        this.onGround = false;
    }

    update() {
        if (keys.ArrowRight) {
            this.vx += this.speed;
            this.facingRight = true;
        }
        if (keys.ArrowLeft) {
            this.vx -= this.speed;
            this.facingRight = false;
        }

        this.vx *= FRICTION;
        if (keys.ArrowUp && this.onGround) {
            this.vy = this.jumpPower;
            this.onGround = false;
        }

        this.vy += GRAVITY;
        this.y += this.vy;
        this.onGround = false;

        // Vertical collision
        platforms.forEach(p => {
            if (this.collidesWith(p.hitbox)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= p.hitbox.y) {
                    this.y = p.hitbox.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                } else if (this.vy < 0 && this.y - this.vy >= p.hitbox.y + p.hitbox.height) {
                    this.y = p.hitbox.y + p.hitbox.height;
                    this.vy = 0;
                }
            }
        });

        this.x += this.vx;

        // Horizontal collision
        platforms.forEach(p => {
            if (this.collidesWith(p.hitbox)) {
                if (this.vx > 0 && this.x + this.width - this.vx <= p.hitbox.x) {
                    this.x = p.hitbox.x - this.width;
                    this.vx = 0;
                } else if (this.vx < 0 && this.x - this.vx >= p.hitbox.x + p.hitbox.width) {
                    this.x = p.hitbox.x + p.hitbox.width;
                    this.vx = 0;
                }
            }
        });

        if (this.y > CANVAS_HEIGHT) this.livesLost();
        if (this.x < scrollOffset) this.x = scrollOffset;
    }

    collidesWith(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }

    livesLost() {
        lives--;
        document.getElementById('lives').innerText = lives;
        if (lives <= 0) {
            gameOver = true;
            document.getElementById('game-over').classList.remove('hidden');
        } else {
            this.reset();
            // Reset world to allow player to start over from x=100
            scrollOffset = 0;
            platforms = [];
            enemies = [];
            collectibles = [];
            platforms.push(new Platform(0, 560, 1000, 40));
            lastChunkX = 1000;
            generateChunk(1000);
            generateChunk(1800);
        }
    }

    draw() {
        if (!assets.player.complete) return;
        ctx.save();
        if (!this.facingRight) {
            ctx.translate(this.x + this.width, this.y);
            ctx.scale(-1, 1);
            ctx.drawImage(assets.player, 0, 0, this.width, this.height);
        } else {
            ctx.drawImage(assets.player, this.x, this.y, this.width, this.height);
        }
        ctx.restore();
        if (DEBUG) {
            ctx.strokeStyle = 'red';
            ctx.strokeRect(this.x, this.y, this.width, this.height);
        }
    }
}

const player = new Player();

// Level Generation
function generateChunk(startX) {
    const chunkWidth = 800;
    
    // Base floor with gaps
    if (Math.random() > 0.2) {
        platforms.push(new Platform(startX, 560, chunkWidth, 40));
    } else {
        platforms.push(new Platform(startX, 560, 300, 40));
        platforms.push(new Platform(startX + 500, 560, 300, 40));
    }

    // Floating platforms
    for (let i = 0; i < 3; i++) {
        let px = startX + Math.random() * (chunkWidth - 200);
        let py = 200 + Math.random() * 250;
        platforms.push(new Platform(px, py, 150 + Math.random() * 100, 40, 'float'));
        
        // Spawn coin on platform
        if (Math.random() > 0.5) {
            collectibles.push(new Collectible(px + 60, py - 40));
        }
    }

    // Enemies
    if (Math.random() > 0.4) {
        enemies.push(new Enemy(startX + 400, 520, 150));
    }

    lastChunkX = startX + chunkWidth;
}

// Initial Level
platforms.push(new Platform(0, 560, 1000, 40));
generateChunk(1000);
generateChunk(1800);

// Game Loop
function gameLoop() {
    if (!isStarted || gameOver) return;

    // Procedural generation trigger
    if (player.x + 1000 > lastChunkX) {
        generateChunk(lastChunkX);
    }

    // Memory Cleanup (Optional but good)
    if (platforms.length > 50) {
        platforms = platforms.filter(p => p.x + p.width > scrollOffset - 1000);
        enemies = enemies.filter(e => e.x + e.width > scrollOffset - 1000);
        collectibles = collectibles.filter(c => c.x + c.width > scrollOffset - 1000);
    }

    // Camera
    if (player.x > scrollOffset + 400) {
        scrollOffset = player.x - 400;
    }

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Parallax
    ctx.fillStyle = '#1e1e3f';
    for (let i = 0; i < 50; i++) {
        let bx = (i * 100 - scrollOffset * 0.2) % (CANVAS_WIDTH + 100);
        ctx.fillRect(bx, i * 15, 2, 2);
    }

    ctx.save();
    ctx.translate(-scrollOffset, 0);

    platforms.forEach(p => p.draw());

    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
        if (!enemy.dead && player.collidesWith(enemy)) {
            if (player.vy > 0 && player.y + player.height - player.vy <= enemy.y + 10) {
                enemy.dead = true;
                player.vy = -10;
                score += 100;
                document.getElementById('score').innerText = score;
            } else {
                player.livesLost();
            }
        }
    });

    collectibles.forEach(item => {
        item.draw();
        if (!item.collected && player.collidesWith(item)) {
            item.collected = true;
            score += 50;
            document.getElementById('score').innerText = score;
        }
    });

    player.update();
    player.draw();

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// UI Setup
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const restartBtn = document.getElementById('restart-btn');

startBtn.addEventListener('click', () => {
    isStarted = true;
    startScreen.classList.add('hidden');
    gameLoop();
});

restartBtn.addEventListener('click', () => location.reload());
