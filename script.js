class NeoFlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setupCanvas();
        
        // ゲーム状態
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.score = 0;
        this.bestScore = localStorage.getItem('bestScore') || 0;
        
        // バード設定
        this.selectedBird = 'classic';
        this.bird = {
            x: 100,
            y: 0,
            width: 40,
            height: 40,
            velocity: 0,
            gravity: 0.6,
            jumpForce: -12,
            rotation: 0
        };
        
        // パイプ設定
        this.pipes = [];
        this.pipeWidth = 80;
        this.pipeGap = 180;
        this.pipeSpeed = 3;
        
        // パワーアップ
        this.powerUps = [];
        this.activePowerUp = null;
        this.powerUpDuration = 0;
        
        // パーティクル
        this.particles = [];
        
        // アニメーション
        this.animationId = null;
        this.lastTime = 0;
        
        // 背景
        this.backgroundOffset = 0;
        this.backgroundSpeed = 1;
        
        this.setupEventListeners();
        this.resetGame();
    }
    
    setupCanvas() {
        this.canvas.width = Math.min(800, window.innerWidth - 40);
        this.canvas.height = Math.min(600, window.innerHeight - 40);
        this.bird.y = this.canvas.height / 2;
    }
    
    setupEventListeners() {
        // バード選択
        document.querySelectorAll('.bird-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.bird-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                this.selectedBird = option.dataset.bird;
            });
        });
        
        // ゲーム開始
        document.getElementById('startButton').addEventListener('click', () => {
            this.startGame();
        });
        
        // リスタート
        document.getElementById('restartButton').addEventListener('click', () => {
            this.startGame();
        });
        
        // メニューに戻る
        document.getElementById('backToMenuButton').addEventListener('click', () => {
            this.showMenu();
        });
        
        // 一時停止関連
        document.getElementById('resumeButton').addEventListener('click', () => {
            this.resumeGame();
        });
        
        document.getElementById('pauseMenuButton').addEventListener('click', () => {
            this.showMenu();
        });
        
        // キーボード入力
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                this.handleJump();
            } else if (e.code === 'Escape' && this.gameState === 'playing') {
                this.pauseGame();
            }
        });
        
        // マウス/タッチ入力
        this.canvas.addEventListener('click', () => {
            if (this.gameState === 'playing') {
                this.handleJump();
            }
        });
        
        // リサイズ対応
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });
    }
    
    handleJump() {
        if (this.gameState === 'playing') {
            this.bird.velocity = this.bird.jumpForce;
            this.createJumpParticles();
            this.playJumpSound();
        }
    }
    
    startGame() {
        this.resetGame();
        this.gameState = 'playing';
        this.showGameUI();
        this.gameLoop();
    }
    
    pauseGame() {
        this.gameState = 'paused';
        this.showPauseScreen();
    }
    
    resumeGame() {
        this.gameState = 'playing';
        this.hidePauseScreen();
        this.gameLoop();
    }
    
    showMenu() {
        this.gameState = 'menu';
        this.hideAllScreens();
        document.getElementById('startScreen').classList.remove('hidden');
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    showGameUI() {
        this.hideAllScreens();
        document.getElementById('gameUI').classList.remove('hidden');
    }
    
    showPauseScreen() {
        document.getElementById('pauseScreen').classList.remove('hidden');
    }
    
    hidePauseScreen() {
        document.getElementById('pauseScreen').classList.add('hidden');
    }
    
    showGameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalScore').textContent = `スコア: ${this.score}`;
        document.getElementById('bestScore').textContent = `ベストスコア: ${this.bestScore}`;
        document.getElementById('gameOverScreen').classList.remove('hidden');
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
            this.createCelebrationParticles();
        }
    }
    
    hideAllScreens() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById('gameUI').classList.add('hidden');
    }
    
    resetGame() {
        this.score = 0;
        this.bird.y = this.canvas.height / 2;
        this.bird.velocity = 0;
        this.bird.rotation = 0;
        this.pipes = [];
        this.powerUps = [];
        this.particles = [];
        this.activePowerUp = null;
        this.powerUpDuration = 0;
        this.backgroundOffset = 0;
        
        this.generateInitialPipes();
        this.updateScoreDisplay();
        this.hidePowerUpIndicator();
    }
    
    generateInitialPipes() {
        for (let i = 0; i < 3; i++) {
            this.addPipe(this.canvas.width + i * 300);
        }
    }
    
    addPipe(x) {
        const minGapY = 100;
        const maxGapY = this.canvas.height - this.pipeGap - 100;
        const gapY = Math.random() * (maxGapY - minGapY) + minGapY;
        
        this.pipes.push({
            x: x,
            topHeight: gapY,
            bottomY: gapY + this.pipeGap,
            passed: false,
            color: this.getRandomPipeColor()
        });
    }
    
    getRandomPipeColor() {
        const colors = ['#228B22', '#32CD32', '#006400', '#90EE90'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    addPowerUp(x, y) {
        const types = ['speed', 'shield', 'points'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        this.powerUps.push({
            x: x,
            y: y,
            type: type,
            collected: false,
            rotation: 0
        });
    }
    
    gameLoop(currentTime) {
        if (this.gameState !== 'playing') return;
        
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.draw();
        
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // バードの更新
        this.updateBird();
        
        // パイプの更新
        this.updatePipes();
        
        // パワーアップの更新
        this.updatePowerUps();
        
        // パーティクルの更新
        this.updateParticles();
        
        // 背景の更新
        this.updateBackground();
        
        // 衝突判定
        this.checkCollisions();
        
        // パワーアップ効果の更新
        this.updateActivePowerUp();
    }
    
    updateBird() {
        // 重力適用
        this.bird.velocity += this.bird.gravity;
        this.bird.y += this.bird.velocity;
        
        // 回転計算
        this.bird.rotation = Math.min(Math.max(this.bird.velocity * 3, -30), 30);
        
        // 境界チェック
        if (this.bird.y < 0 || this.bird.y + this.bird.height > this.canvas.height) {
            this.gameOver();
        }
    }
    
    updatePipes() {
        let currentSpeed = this.pipeSpeed;
        if (this.activePowerUp && this.activePowerUp.type === 'speed') {
            currentSpeed *= 0.5; // スピードパワーアップで半分の速度
        }
        
        for (let i = this.pipes.length - 1; i >= 0; i--) {
            const pipe = this.pipes[i];
            pipe.x -= currentSpeed;
            
            // スコア更新
            if (!pipe.passed && pipe.x + this.pipeWidth < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.updateScoreDisplay();
                this.createScoreParticles();
                
                // パワーアップ生成チャンス
                if (Math.random() < 0.3) {
                    this.addPowerUp(pipe.x + this.pipeWidth + 50, Math.random() * (this.canvas.height - 100) + 50);
                }
            }
            
            // 画面外のパイプを削除
            if (pipe.x + this.pipeWidth < 0) {
                this.pipes.splice(i, 1);
                this.addPipe(this.pipes[this.pipes.length - 1].x + 300);
            }
        }
    }
    
    updatePowerUps() {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.x -= this.pipeSpeed;
            powerUp.rotation += 2;
            
            if (powerUp.x + 30 < 0) {
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.1; // 重力
            particle.life--;
            particle.alpha = particle.life / particle.maxLife;
            
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    updateBackground() {
        this.backgroundOffset += this.backgroundSpeed;
        if (this.backgroundOffset >= this.canvas.width) {
            this.backgroundOffset = 0;
        }
    }
    
    updateActivePowerUp() {
        if (this.activePowerUp) {
            this.powerUpDuration--;
            this.updatePowerUpTimer();
            
            if (this.powerUpDuration <= 0) {
                this.activePowerUp = null;
                this.hidePowerUpIndicator();
            }
        }
    }
    
    checkCollisions() {
        // パイプとの衝突
        for (const pipe of this.pipes) {
            if (this.bird.x < pipe.x + this.pipeWidth &&
                this.bird.x + this.bird.width > pipe.x &&
                (this.bird.y < pipe.topHeight || 
                 this.bird.y + this.bird.height > pipe.bottomY)) {
                
                if (!this.activePowerUp || this.activePowerUp.type !== 'shield') {
                    this.gameOver();
                    return;
                }
            }
        }
        
        // パワーアップとの衝突
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            if (this.bird.x < powerUp.x + 30 &&
                this.bird.x + this.bird.width > powerUp.x &&
                this.bird.y < powerUp.y + 30 &&
                this.bird.y + this.bird.height > powerUp.y) {
                
                this.collectPowerUp(powerUp);
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    collectPowerUp(powerUp) {
        this.activePowerUp = powerUp;
        this.powerUpDuration = 300; // 5秒間（60FPS想定）
        this.createPowerUpParticles(powerUp.x, powerUp.y);
        this.showPowerUpIndicator(powerUp.type);
        
        if (powerUp.type === 'points') {
            this.score += 5;
            this.updateScoreDisplay();
        }
    }
    
    draw() {
        // 背景をクリア
        this.drawBackground();
        
        // パイプを描画
        this.drawPipes();
        
        // パワーアップを描画
        this.drawPowerUps();
        
        // バードを描画
        this.drawBird();
        
        // パーティクルを描画
        this.drawParticles();
    }
    
    drawBackground() {
        // グラデーション背景
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        const hue = (this.score * 10) % 360;
        gradient.addColorStop(0, `hsl(${200 + hue * 0.1}, 70%, 80%)`);
        gradient.addColorStop(1, `hsl(${120 + hue * 0.1}, 60%, 70%)`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 雲のような効果
        this.drawClouds();
    }
    
    drawClouds() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = 'white';
        
        for (let i = 0; i < 5; i++) {
            const x = (i * 200 - this.backgroundOffset * 0.5) % (this.canvas.width + 100);
            const y = 50 + Math.sin(i) * 30;
            
            this.ctx.beginPath();
            this.ctx.arc(x, y, 30, 0, Math.PI * 2);
            this.ctx.arc(x + 25, y, 35, 0, Math.PI * 2);
            this.ctx.arc(x + 50, y, 30, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    drawPipes() {
        for (const pipe of this.pipes) {
            // 上のパイプ
            this.drawPipe(pipe.x, 0, this.pipeWidth, pipe.topHeight, pipe.color);
            
            // 下のパイプ
            this.drawPipe(pipe.x, pipe.bottomY, this.pipeWidth, 
                         this.canvas.height - pipe.bottomY, pipe.color);
        }
    }
    
    drawPipe(x, y, width, height, color) {
        this.ctx.save();
        
        // メインパイプ
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
        
        // ハイライト
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(x, y, 5, height);
        
        // シャドウ
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(x + width - 5, y, 5, height);
        
        // パイプキャップ
        if (y === 0) { // 上のパイプ
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x - 5, height - 30, width + 10, 30);
        } else { // 下のパイプ
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x - 5, y, width + 10, 30);
        }
        
        this.ctx.restore();
    }
    
    drawPowerUps() {
        for (const powerUp of this.powerUps) {
            this.ctx.save();
            this.ctx.translate(powerUp.x + 15, powerUp.y + 15);
            this.ctx.rotate(powerUp.rotation * Math.PI / 180);
            
            // パワーアップの種類に応じて描画
            switch (powerUp.type) {
                case 'speed':
                    this.ctx.fillStyle = '#00ffff';
                    this.ctx.fillRect(-15, -15, 30, 30);
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('S', 0, 7);
                    break;
                case 'shield':
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = 'black';
                    this.ctx.font = '20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('🛡', 0, 7);
                    break;
                case 'points':
                    this.ctx.fillStyle = '#ff00ff';
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, 15, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '20px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.fillText('★', 0, 7);
                    break;
            }
            
            this.ctx.restore();
        }
    }
    
    drawBird() {
        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        this.ctx.rotate(this.bird.rotation * Math.PI / 180);
        
        // シールド効果
        if (this.activePowerUp && this.activePowerUp.type === 'shield') {
            this.ctx.strokeStyle = '#ffff00';
            this.ctx.lineWidth = 3;
            this.ctx.setLineDash([5, 5]);
            this.ctx.beginPath();
            this.ctx.arc(0, 0, 30, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.setLineDash([]);
        }
        
        // バードの種類に応じて描画
        this.drawBirdByType();
        
        this.ctx.restore();
    }
    
    drawBirdByType() {
        const halfWidth = this.bird.width / 2;
        const halfHeight = this.bird.height / 2;
        
        switch (this.selectedBird) {
            case 'classic':
                this.ctx.fillStyle = '#ffff00';
                this.ctx.fillRect(-halfWidth, -halfHeight, this.bird.width, this.bird.height);
                this.ctx.fillStyle = '#ff8800';
                this.ctx.fillRect(-halfWidth + 25, -5, 10, 10); // くちばし
                break;
            case 'fire':
                this.ctx.fillStyle = '#ff4500';
                this.ctx.fillRect(-halfWidth, -halfHeight, this.bird.width, this.bird.height);
                // 炎エフェクト
                this.createFireParticles();
                break;
            case 'ice':
                this.ctx.fillStyle = '#87ceeb';
                this.ctx.fillRect(-halfWidth, -halfHeight, this.bird.width, this.bird.height);
                // 氷エフェクト
                this.createIceParticles();
                break;
            case 'electric':
                this.ctx.fillStyle = '#ffff00';
                this.ctx.fillRect(-halfWidth, -halfHeight, this.bird.width, this.bird.height);
                // 電気エフェクト
                this.createElectricParticles();
                break;
        }
        
        // 目
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(-halfWidth + 5, -halfHeight + 5, 8, 8);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(-halfWidth + 7, -halfHeight + 7, 4, 4);
    }
    
    drawParticles() {
        for (const particle of this.particles) {
            this.ctx.save();
            this.ctx.globalAlpha = particle.alpha;
            this.ctx.fillStyle = particle.color;
            this.ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
            this.ctx.restore();
        }
    }
    
    createJumpParticles() {
        for (let i = 0; i < 5; i++) {
            this.particles.push({
                x: this.bird.x,
                y: this.bird.y + this.bird.height,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 2 + 1,
                size: Math.random() * 4 + 2,
                color: '#ffffff',
                life: 30,
                maxLife: 30,
                alpha: 1
            });
        }
    }
    
    createScoreParticles() {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width / 2,
                y: this.bird.y + this.bird.height / 2,
                vx: Math.random() * 6 - 3,
                vy: Math.random() * 6 - 3,
                size: Math.random() * 3 + 1,
                color: '#00ff00',
                life: 60,
                maxLife: 60,
                alpha: 1
            });
        }
    }
    
    createPowerUpParticles(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push({
                x: x + 15,
                y: y + 15,
                vx: Math.random() * 8 - 4,
                vy: Math.random() * 8 - 4,
                size: Math.random() * 4 + 2,
                color: '#ff00ff',
                life: 40,
                maxLife: 40,
                alpha: 1
            });
        }
    }
    
    createCelebrationParticles() {
        for (let i = 0; i < 50; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: Math.random() * 6 - 3,
                vy: Math.random() * 6 - 3,
                size: Math.random() * 6 + 2,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                life: 120,
                maxLife: 120,
                alpha: 1
            });
        }
    }
    
    createFireParticles() {
        if (Math.random() < 0.3) {
            this.particles.push({
                x: this.bird.x - 10,
                y: this.bird.y + Math.random() * this.bird.height,
                vx: -Math.random() * 3 - 1,
                vy: Math.random() * 2 - 1,
                size: Math.random() * 3 + 1,
                color: '#ff4500',
                life: 20,
                maxLife: 20,
                alpha: 1
            });
        }
    }
    
    createIceParticles() {
        if (Math.random() < 0.2) {
            this.particles.push({
                x: this.bird.x + Math.random() * this.bird.width,
                y: this.bird.y + Math.random() * this.bird.height,
                vx: Math.random() * 2 - 1,
                vy: -Math.random() * 2 - 1,
                size: Math.random() * 2 + 1,
                color: '#ffffff',
                life: 30,
                maxLife: 30,
                alpha: 1
            });
        }
    }
    
    createElectricParticles() {
        if (Math.random() < 0.4) {
            this.particles.push({
                x: this.bird.x + Math.random() * this.bird.width,
                y: this.bird.y + Math.random() * this.bird.height,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 4 - 2,
                size: 1,
                color: '#ffff00',
                life: 10,
                maxLife: 10,
                alpha: 1
            });
        }
    }
    
    updateScoreDisplay() {
        document.getElementById('score').textContent = this.score;
    }
    
    showPowerUpIndicator(type) {
        const indicator = document.getElementById('powerUpIndicator');
        const text = document.getElementById('powerUpText');
        
        const names = {
            speed: 'スピードダウン',
            shield: 'シールド',
            points: 'ボーナスポイント'
        };
        
        text.textContent = names[type];
        indicator.classList.remove('hidden');
    }
    
    hidePowerUpIndicator() {
        document.getElementById('powerUpIndicator').classList.add('hidden');
    }
    
    updatePowerUpTimer() {
        const timer = document.getElementById('powerUpTimer');
        const percentage = (this.powerUpDuration / 300) * 100;
        timer.style.setProperty('--timer-width', `${percentage}%`);
    }
    
    playJumpSound() {
        // Web Audio APIでサウンド効果（シンプルなビープ音）
        if (this.audioContext) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.createGameOverParticles();
        this.showGameOver();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
    
    createGameOverParticles() {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: this.bird.x + this.bird.width / 2,
                y: this.bird.y + this.bird.height / 2,
                vx: Math.random() * 10 - 5,
                vy: Math.random() * 10 - 5,
                size: Math.random() * 4 + 2,
                color: '#ff0000',
                life: 60,
                maxLife: 60,
                alpha: 1
            });
        }
    }
}

// ゲーム初期化
document.addEventListener('DOMContentLoaded', () => {
    // Web Audio Context の初期化
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioContext = new AudioContext();
        
        // ユーザーインタラクション後に Audio Context を有効化
        const enableAudio = () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            document.removeEventListener('click', enableAudio);
            document.removeEventListener('touchstart', enableAudio);
        };
        
        document.addEventListener('click', enableAudio);
        document.addEventListener('touchstart', enableAudio);
        
        window.game = new NeoFlappyBird();
        window.game.audioContext = audioContext;
    } catch (e) {
        console.log('Audio not supported');
        window.game = new NeoFlappyBird();
    }
    
    // デフォルトでクラシックバードを選択
    document.querySelector('.bird-option[data-bird="classic"]').classList.add('selected');
});