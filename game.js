const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let animationFrameId;
let isGameRunning = false;

// Game State
let frames = 0;
let score = 0;
let gameSpeed = 6;
let isGameOver = false;
let restartCooldown = false; // Prevent accidental restarts
let audioCtx = null; // Web Audio API

// Sound Effects
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playJumpSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playCrashSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// Theme Colors (will be updated from CSS variables)
let theme = {
    bg: '#E0F7FA',
    border: '#37474F',
    accent: '#81D4FA',
    ground: '#FFFFFF',
    text: '#263238'
};

function updateTheme() {
    const style = getComputedStyle(document.body);
    theme.bg = style.getPropertyValue('--bg-color').trim() || '#E0F7FA';
    theme.border = style.getPropertyValue('--border-color').trim() || '#37474F';
    theme.accent = style.getPropertyValue('--accent-blue').trim() || '#81D4FA';
    theme.ground = style.getPropertyValue('--card-bg').trim() || '#FFFFFF';
    theme.text = style.getPropertyValue('--text-color').trim() || '#263238';
}

// Slope Angle
const slopeAngle = 15 * Math.PI / 180;

// Penguin Sprite (1=Border, 2=Body(White), 3=Beak/Feet)
const penguinMap = [
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 2, 2, 1, 1, 1, 0, 0],
    [0, 1, 2, 1, 2, 1, 1, 1, 1, 0],
    [0, 1, 2, 2, 2, 2, 1, 1, 1, 0],
    [1, 2, 2, 2, 2, 2, 2, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 1, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 3, 3, 0, 0, 3, 3, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

const pixelSize = 4;

const player = {
    x: 150,
    y: 300,
    width: 10 * pixelSize,
    height: 10 * pixelSize,
    dy: 0,
    jumpStrength: 10,
    gravity: 0.5,
    grounded: false,
    draw: function () {
        for (let row = 0; row < penguinMap.length; row++) {
            for (let col = 0; col < penguinMap[row].length; col++) {
                let c = penguinMap[row][col];
                if (c !== 0) {
                    // Use theme colors where appropriate, or stick to penguin colors
                    ctx.fillStyle = c === 1 ? theme.border : c === 2 ? '#FFF' : '#FFA500';
                    ctx.fillRect(this.x + col * pixelSize, this.y + row * pixelSize, pixelSize, pixelSize);
                }
            }
        }
    },
    update: function () {
        if (input.jump && this.grounded) {
            this.dy = -this.jumpStrength;
            this.grounded = false;
            playJumpSound();
        }
        this.dy += this.gravity;
        this.y += this.dy;

        if (this.y > 300) {
            this.y = 300;
            this.dy = 0;
            this.grounded = true;
        }
    }
};

const obstacles = [];
const clouds = []; // New cloud array
let framesSinceLastSpawn = 0;
const minSpawnGap = 70;

class Cloud {
    constructor() {
        this.x = canvas.width + 100;
        this.y = Math.random() * 200 - 100; // Random height in sky
        this.speed = Math.random() * 0.5 + 0.2; // Move slower than obstacles for parallax
        this.width = Math.random() * 60 + 40;
        this.height = this.width * 0.6;
        this.markedForDeletion = false;
    }

    update() {
        this.x -= this.speed;
        if (this.x + this.width < -100) this.markedForDeletion = true;
    }

    draw() {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        // Simple fluffy cloud shape composed of circles
        ctx.arc(this.x, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.arc(this.x + this.width / 2, this.y - this.height / 4, this.width / 3, 0, Math.PI * 2);
        ctx.arc(this.x + this.width, this.y, this.width / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Obstacle {
    constructor() {
        this.x = canvas.width + 100;
        this.type = Math.random() > 0.5 ? 'rock' : 'tree';
        this.markedForDeletion = false;

        if (this.type === 'rock') {
            this.width = 30;
            this.height = 20;
            this.y = 320;
            this.color = '#555';
        } else {
            this.width = 20;
            this.height = 40;
            this.y = 300;
            this.color = '#2E8B57';
        }
    }

    update() {
        this.x -= gameSpeed;
        if (this.x + this.width < -100) this.markedForDeletion = true;
    }

    draw() {
        if (this.type === 'rock') {
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            // Detail
            ctx.fillStyle = '#777';
            ctx.fillRect(this.x + 5, this.y + 5, 10, 5);
        } else {
            // Tree trunk
            ctx.fillStyle = '#5D4037';
            ctx.fillRect(this.x + 6, this.y + 20, 8, 20);
            // Tree top
            ctx.fillStyle = '#2E8B57';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y + 20);
            ctx.lineTo(this.x + 10, this.y);
            ctx.lineTo(this.x + 20, this.y + 20);
            ctx.fill();
        }
    }
}

function updateGameLogic() {
    // Cloud Spawning
    if (Math.random() < 0.01) {
        clouds.push(new Cloud());
    }

    // Clouds Update
    for (let i = 0; i < clouds.length; i++) {
        clouds[i].update();
        if (clouds[i].markedForDeletion) {
            clouds.splice(i, 1);
            i--;
        }
    }

    // Obstacle Spawning
    framesSinceLastSpawn++;
    if (framesSinceLastSpawn > minSpawnGap) {
        if (Math.random() < 0.03 + (score * 0.001)) {
            obstacles.push(new Obstacle());
            framesSinceLastSpawn = 0;
        }
    }

    // Player
    player.update();

    // Obstacles
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].update();

        // Collision
        if (
            player.x < obstacles[i].x + obstacles[i].width - 5 &&
            player.x + player.width > obstacles[i].x + 5 &&
            player.y < obstacles[i].y + obstacles[i].height &&
            player.y + player.height > obstacles[i].y
        ) {
            if (!isGameOver) {
                isGameOver = true;
                playCrashSound();
                restartCooldown = true;
                setTimeout(() => { restartCooldown = false; }, 1000);
            }
        }

        if (obstacles[i].markedForDeletion) {
            obstacles.splice(i, 1);
            score++;
            i--;
            if (score % 5 === 0) gameSpeed += 0.5;
        }
    }
}

function drawScene() {
    drawWorld();

    // Draw Sun
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.shadowColor = '#FFA500'; // Orange glow
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(100, -150, 40, 0, Math.PI * 2); // Positioned high up
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Draw Clouds
    for (const cloud of clouds) {
        cloud.draw();
    }

    // Draw obstacles
    for (const obs of obstacles) {
        obs.draw();
    }

    // Draw player
    player.draw();
}

function drawWorld() {
    // Ground
    ctx.fillStyle = theme.ground;
    ctx.fillRect(-100, 340, canvas.width + 400, 500);

    // Top layer representing snow
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-100, 340, canvas.width + 400, 10);

    // Decorative lines on ground
    ctx.strokeStyle = theme.accent;
    ctx.beginPath();
    ctx.moveTo(-100, 350);
    ctx.lineTo(canvas.width + 300, 350);
    ctx.stroke();
}

const input = { jump: false };

function handleInput() {
    initAudio();
    if (isGameOver) {
        if (!restartCooldown) resetGame();
    } else {
        input.jump = true;
    }
}

// Global listeners
window.addEventListener('keydown', e => {
    if (!isGameRunning) return;
    if (e.code === 'Space') {
        e.preventDefault();
        handleInput();
    }
});
canvas.addEventListener('mousedown', () => { if (isGameRunning) handleInput() });
canvas.addEventListener('touchstart', (e) => {
    if (isGameRunning) {
        e.preventDefault();
        handleInput();
    }
}, { passive: false });

window.addEventListener('keyup', e => { if (e.code === 'Space') input.jump = false; });
canvas.addEventListener('mouseup', () => input.jump = false);
canvas.addEventListener('touchend', () => input.jump = false);


function resetGame() {
    obstacles.length = 0;
    score = 0;
    frames = 0;
    gameSpeed = 6;
    framesSinceLastSpawn = 0;
    isGameOver = false;
}

function animate() {
    if (!isGameRunning) return;

    // UPDATE LOGIC (Only if game is active)
    if (!isGameOver) {
        updateGameLogic();
    }

    // DRAWING (Always draw, but scene is frozen if isGameOver)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, theme.accent);
    grad.addColorStop(1, theme.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Rotate Camera
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(slopeAngle);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    drawScene();

    // UI (No rotation)
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = theme.text;
    ctx.font = "24px 'Fredoka One'";
    ctx.fillText('Score: ' + score, 20, 50);

    if (isGameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.font = "48px 'Fredoka One'";
        ctx.fillText('CRASHED!', canvas.width / 2, canvas.height / 2);

        ctx.font = "24px 'Fredoka One'";
        ctx.fillText('Tap to Restart', canvas.width / 2, canvas.height / 2 + 50);

        ctx.textAlign = 'start';
    }

    frames++;
    animationFrameId = requestAnimationFrame(animate);
}

// Export control functions
window.game = {
    start: function () {
        if (isGameRunning) return;
        updateTheme();
        isGameRunning = true;
        resetGame();
        animate();
    },
    stop: function () {
        isGameRunning = false;
        cancelAnimationFrame(animationFrameId);
    }
};

// Mobile Jump Button
const jumpBtn = document.getElementById('mobile-jump-btn');
if (jumpBtn) {
    jumpBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent canvas touch
        handleInput();
    }, { passive: false });

    jumpBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleInput();
    });

    const releaseInput = (e) => {
        e.preventDefault();
        input.jump = false;
    };

    jumpBtn.addEventListener('touchend', releaseInput);
    jumpBtn.addEventListener('mouseup', releaseInput);
    jumpBtn.addEventListener('mouseleave', releaseInput);
}
