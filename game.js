/**
 * Cyber-Scroller Game Engine
 * A Mario-like platformer with custom pixel art.
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const FRICTION = 0.85;
const TILE_SIZE = 40;

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

let imagesLoaded = 0;
const totalImages = Object.keys(assets).length;

function onImageLoad() {
    imagesLoaded++;
}

assets.player.onload = onImageLoad;
assets.tileset.onload = onImageLoad;
assets.enemy.onload = onImageLoad;

// Game State
let score = 0;
let lives = 3;
let isStarted = false;
let gameOver = false;
let scrollOffset = 0;

const keys = {
    ArrowRight: false,
    ArrowLeft: false,
    ArrowUp: false,
};

window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false;
});

// Sound placeholders
function playJumpSound() { /* Future implementation */ }
function playCoinSound() { /* Future implementation */ }

// Platform Class
class Platform {
    constructor(x, y, width, height, type = 'ground') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'ground', 'float', 'goal'
    }

    draw() {
        if (!assets.tileset.complete) return;
        
        // Use different parts of the tileset based on type
        // tileset is 1024x1024, our tile size is 40
        // Source coords (approximate from our generated tileset)
        let sx = 0, sy = 0;
        if (this.type === 'float') { sx = 512; sy = 0; } // Neon platform
        if (this.type === 'goal') { sx = 512; sy = 512; } // Goal

        ctx.drawImage(assets.tileset, sx, sy, 512, 512, this.x, this.y, this.width, this.height);
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
    }

    update(platforms) {
        // Input logic
        if (keys.ArrowRight) {
            this.vx += this.speed;
            this.facingRight = true;
        }
        if (keys.ArrowLeft) {
            this.vx -= this.speed;
            this.facingRight = false;
        }

        // Apply friction
        this.vx *= FRICTION;

        // Vertical movement (Jump)
        if (keys.ArrowUp && this.onGround) {
            this.vy = this.jumpPower;
            this.onGround = false;
        }

        // Gravity
        this.vy += GRAVITY;

        // Move Y first for collision
        this.y += this.vy;
        this.onGround = false;

        platforms.forEach(platform => {
            if (this.collidesWith(platform)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= platform.y) {
                    this.y = platform.y - this.height;
                    this.vy = 0;
                    this.onGround = true;
                } else if (this.vy < 0 && this.y - this.vy >= platform.y + platform.height) {
                    this.y = platform.y + platform.height;
                    this.vy = 0;
                }
            }
        });

        // Move X
        this.x += this.vx;

        platforms.forEach(platform => {
            if (this.collidesWith(platform)) {
                if (this.vx > 0 && this.x + this.width - this.vx <= platform.x) {
                    this.x = platform.x - this.width;
                    this.vx = 0;
                } else if (this.vx < 0 && this.x - this.vx >= platform.x + platform.width) {
                    this.x = platform.x + platform.width;
                    this.vx = 0;
                }
            }
        });

        // Die by falling
        if (this.y > CANVAS_HEIGHT) {
            this.livesLost();
        }
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
            scrollOffset = 0;
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
    }
}

// Enemy Class
class Enemy {
    constructor(x, y, range = 100) {
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
        ctx.fillStyle = '#ffdf00'; // Gold
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ffdf00';
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

// Level Setup
const platforms = [
    new Platform(0, 560, 400, 40),      // Start ground
    new Platform(500, 560, 800, 40),    // Main ground
    new Platform(200, 440, 200, 40, 'float'),
    new Platform(450, 320, 150, 40, 'float'),
    new Platform(700, 450, 200, 40, 'float'),
    new Platform(1000, 350, 250, 40, 'float'),
    new Platform(1400, 560, 600, 40),   // End ground
    new Platform(1800, 480, 40, 80, 'goal') // Goal
];

const enemies = [
    new Enemy(600, 520, 150),
    new Enemy(1100, 310, 100),
    new Enemy(1500, 520, 200)
];

const collectibles = [
    new Collectible(250, 390),
    new Collectible(500, 270),
    new Collectible(750, 400),
    new Collectible(1100, 300),
    new Collectible(1600, 510)
];

const player = new Player();

// Game Loop
function gameLoop() {
    if (!isStarted || gameOver) return;

    // Camera scrolling logic
    if (player.x > scrollOffset + 400) {
        scrollOffset = player.x - 400;
    }

    // Clear and draw background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Parallax background
    ctx.fillStyle = '#1e1e3f';
    for (let i = 0; i < 50; i++) {
        let bx = (i * 100 - scrollOffset * 0.2) % (CANVAS_WIDTH + 100);
        ctx.fillRect(bx, i * 15, 2, 2);
    }

    ctx.save();
    ctx.translate(-scrollOffset, 0);

    // Update & Draw Platforms
    platforms.forEach(p => p.draw());

    // Update & Draw Enemies
    enemies.forEach(enemy => {
        enemy.update();
        enemy.draw();
        
        // Player-Enemy collision
        if (!enemy.dead && player.collidesWith(enemy)) {
            if (player.vy > 0 && player.y + player.height - player.vy <= enemy.y + 10) {
                // Stomp enemy
                enemy.dead = true;
                player.vy = -10; // Bounce
                score += 100;
                document.getElementById('score').innerText = score;
            } else {
                // Hit enemy
                player.livesLost();
            }
        }
    });

    // Draw Collectibles
    collectibles.forEach(item => {
        item.draw();
        if (!item.collected && player.collidesWith(item)) {
            item.collected = true;
            score += 50;
            document.getElementById('score').innerText = score;
        }
    });

    // Check Goal
    platforms.forEach(p => {
        if (p.type === 'goal' && player.collidesWith(p)) {
            isStarted = false;
            document.getElementById('win-screen').classList.remove('hidden');
            document.getElementById('final-score').innerText = score;
        }
    });

    // Update & Draw Player
    player.update(platforms);
    player.draw();

    ctx.restore();

    requestAnimationFrame(gameLoop);
}

// UI Setup
const startBtn = document.getElementById('start-btn');
const startScreen = document.getElementById('start-screen');
const restartBtn = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');

startBtn.addEventListener('click', () => {
    isStarted = true;
    startScreen.classList.add('hidden');
    gameLoop();
});

const reload = () => location.reload();
restartBtn.addEventListener('click', reload);
playAgainBtn.addEventListener('click', reload);
