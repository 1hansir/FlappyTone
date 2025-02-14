class Game {
    constructor() {
        console.log('Game: Initializing...');
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Game: Could not find canvas element!');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.bird = new Bird();
        this.obstacles = [];
        this.songDatabase = new SongDatabase();
        this.audioManager = new AudioManager();
        // Pass songDatabase to HarmonyAnalyzer
        this.harmonyAnalyzer = new HarmonyAnalyzer(this.songDatabase);
        
        this.score = 0;
        this.isRunning = false;
        this.isAudioInitialized = false;
        
        this.gameUI = document.getElementById('game-ui');
        this.gameStats = document.getElementById('game-stats');
        this.gameOverUI = document.getElementById('game-over');
        
        this.isGameOver = false;
        
        this.microphoneStream = null;
        
        this.lastFrameTime = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        
        this.frameCount = 0;
        this.lastFPSUpdate = 0;
        this.fpsUpdateInterval = 1000; // Update FPS every second
        this.currentFPS = 0;
        
        this.init();
        console.log('Game: Initialization complete');
        
        // Add window unload handler
        window.addEventListener('beforeunload', () => {
            if (this.microphoneStream) {
                this.microphoneStream.getTracks().forEach(track => track.stop());
            }
        });
    }

    init() {
        console.log('Game: Setting up canvas and event listeners');
        // Set canvas size
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        // Event listeners
        const startBtn = document.getElementById('start-btn');
        if (!startBtn) {
            console.error('Game: Could not find start button!');
            return;
        }
        startBtn.addEventListener('click', () => {
            console.log('Game: Start button clicked');
            this.start();
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            this.hideGameOver();
            this.start();
        });
    }

    async start() {
        console.log('Game: Starting game...');
        try {
            // Hide start UI and show game stats
            this.gameUI.style.display = 'none';
            this.gameStats.style.display = 'block';

            // Request microphone access if we don't have it
            if (!this.microphoneStream) {
                this.microphoneStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: false
                    }
                });
                console.log('Game: Microphone access granted');
            }

            // Clean up existing audio resources first
            if (this.audioManager) {
                this.audioManager.cleanup(false);
            }

            // Create new AudioManager and initialize with stream
            this.audioManager = new AudioManager();
            await this.audioManager.start(this.microphoneStream);
            console.log('Game: AudioManager initialized');

            // Clean up and reinitialize SongDatabase
            if (this.songDatabase) {
                this.songDatabase.cleanup();
            }
            this.songDatabase = new SongDatabase();
            await this.songDatabase.init();

            // Initialize game state
            this.obstacles = [];
            this.bird = new Bird();
            this.score = 0;
            this.isGameOver = false;

            // Start the game and audio
            this.isRunning = true;
            this.songDatabase.generateNewMelody();
            this.songDatabase.playMelody();
            
            // Reset HarmonyAnalyzer
            this.harmonyAnalyzer = new HarmonyAnalyzer(this.songDatabase);
            
            console.log('Game: Starting game loop');
            this.gameLoop();

        } catch (error) {
            console.error('Game: Failed to start game:', error);
            this.gameUI.style.display = 'block';
            this.gameStats.style.display = 'none';
        }
    }

    gameLoop(currentTime) {
        if (!this.lastFrameTime) {
            this.lastFrameTime = currentTime;
            this.lastFPSUpdate = currentTime;
        }

        const deltaTime = currentTime - this.lastFrameTime;

        // FPS calculation
        this.frameCount++;
        if (currentTime - this.lastFPSUpdate >= this.fpsUpdateInterval) {
            this.currentFPS = Math.round((this.frameCount * 1000) / (currentTime - this.lastFPSUpdate));
            console.log('FPS:', this.currentFPS, 'Frame Time:', Math.round(deltaTime), 'ms');
            this.frameCount = 0;
            this.lastFPSUpdate = currentTime;
        }

        if (deltaTime >= this.frameInterval) {
            // Update game state
            if (this.isRunning && !this.isGameOver) {
                this.update();
                this.draw();
            }

            this.lastFrameTime = currentTime - (deltaTime % this.frameInterval);
        }

        // Request next frame
        if (this.isRunning) {
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }

    update() {
        if (this.isGameOver) return;
        
        // Get current pitch from audio input
        const currentPitch = this.audioManager.pitchDetector.getCurrentPitch();
        
        // Update bird position based on pitch
        this.bird.updatePosition(currentPitch);
        
        // Update obstacles
        this.updateObstacles();
        
        // Check collisions
        this.checkCollisions();
        
        // Update harmony analysis
        this.harmonyAnalyzer.analyze(currentPitch);
    }

    updateObstacles() {
        // Use filter with index to avoid creating new array
        let i = 0;
        while (i < this.obstacles.length) {
            if (this.obstacles[i].isOffscreen()) {
                this.obstacles.splice(i, 1);
            } else {
                this.obstacles[i].update();
                i++;
            }
        }
        
        // Don't add obstacles during warmup
        if (this.songDatabase.isWarmupPeriod()) return;
        
        // Calculate timing using current FPS
        const birdX = this.bird.x;
        const timeToReachBird = this.songDatabase.beatDuration;
        const distanceToTravel = this.canvas.width - birdX;
        const requiredSpeed = distanceToTravel / (timeToReachBird * this.currentFPS);
        
        // Add new obstacle if needed
        const lastObstacle = this.obstacles[this.obstacles.length - 1];
        const nextNote = this.songDatabase.getCurrentNote();
        
        if (nextNote && (!lastObstacle || lastObstacle.x < this.canvas.width - distanceToTravel)) {
            // Create new obstacle
            const obstacle = new Obstacle(this.canvas.width, nextNote);
            obstacle.speed = requiredSpeed;
            this.obstacles.push(obstacle);
            console.log('Added new obstacle with speed:', requiredSpeed, 'for note:', nextNote.note);
        }

        console.log('Obstacle Update:', {
            currentTime: this.songDatabase.audioContext?.currentTime,
            beatDuration: this.songDatabase.beatDuration,
            obstaclePositions: this.obstacles.map(o => o.x),
            targetSpeed: requiredSpeed,
            currentBeat: this.songDatabase.getCurrentBeat()
        });
    }

    checkCollisions() {
        this.obstacles.forEach(obstacle => {
            const birdInXRange = this.bird.x + this.bird.size > obstacle.x && 
                this.bird.x - this.bird.size < obstacle.x + obstacle.width;
                
            if (birdInXRange) {
                if (this.bird.y - this.bird.size < obstacle.gapStart || 
                    this.bird.y + this.bird.size > obstacle.gapStart + obstacle.gap) {
                    this.gameOver();
                } else if (!obstacle.scoreAdded) {
                    this.score++;
                    obstacle.scoreAdded = true;
                }
            }
        });
    }

    scheduleObstacleNote(frequency, delay) {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const playTime = this.audioContext.currentTime + delay;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, playTime);
        
        gainNode.gain.setValueAtTime(0, playTime);
        gainNode.gain.linearRampToValueAtTime(0.3, playTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, playTime + 0.3);
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.start(playTime);
        oscillator.stop(playTime + 0.3);
    }

    gameOver() {
        if (this.isGameOver) return;
        
        this.isGameOver = true;
        
        // Stop all audio and melody generation
        if (this.songDatabase) {
            this.songDatabase.cleanup();
        }
        
        // Clean up audio manager but keep the stream and detector
        if (this.audioManager) {
            this.audioManager.cleanup(false);
        }
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        
        // Show game over UI
        this.gameStats.style.display = 'none';
        this.gameUI.style.display = 'block';
        this.gameOverUI.style.display = 'block';
        this.gameOverUI.style.opacity = '1';
        document.getElementById('final-score').textContent = `Score: ${this.score}`;
    }

    hideGameOver() {
        this.gameOverUI.style.display = 'none';
        this.gameUI.style.display = 'none';
    }

    draw() {
        // Clear the entire canvas with clearRect
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Fill with sky blue background
        this.ctx.fillStyle = '#87CEEB';  // Sky blue background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw obstacles
        this.obstacles.forEach(obstacle => obstacle.draw(this.ctx));
        
        // Draw bird
        this.bird.draw(this.ctx);
        
        // Update score display
        document.getElementById('score').textContent = `Score: ${this.score}`;
        
        // Update current frequency display
        const currentPitch = this.audioManager.pitchDetector.getCurrentPitch();
        document.getElementById('current-note').textContent = 
            `Current Freq: ${Math.round(currentPitch)} Hz`;
        
        // Update target note display
        const currentNote = this.songDatabase.getCurrentNote();
        if (currentNote) {
            document.getElementById('target-note').textContent = 
                `Target Note: ${currentNote.note} (${Math.round(currentNote.frequency)} Hz)`;
        }

        // this.drawDebugInfo(this.ctx);
    }

    drawDebugInfo(ctx) {
        ctx.font = '12px Arial';
        ctx.fillStyle = 'black';
        const debugInfo = {
            'Beat Time': this.songDatabase.audioContext?.currentTime - this.songDatabase.initialStartTime,
            'Current Beat': this.songDatabase.getCurrentBeat(),
            'Next Note': this.songDatabase.getCurrentNote()?.note,
            'Obstacle Count': this.obstacles.length,
            'Last Obstacle X': this.obstacles[this.obstacles.length - 1]?.x || 'none'
        };

        let y = 50;
        for (const [key, value] of Object.entries(debugInfo)) {
            ctx.fillText(`${key}: ${value}`, 500, y);
            y += 20;
        }
    }

    // Helper method to map frequency to x position
    mapFrequencyToX(frequency, startX, width) {
        const minFreq = 200;  // C4 is around 261.63 Hz
        const maxFreq = 600;  // Above C5 (523.25 Hz)
        const normalizedFreq = (frequency - minFreq) / (maxFreq - minFreq);
        return startX + normalizedFreq * width;
    }

    drawLegendIllustrations() {
        this.drawTargetFrequency();
        this.drawCurrentFrequency();
    }

    drawTargetFrequency() {
        const canvas = document.getElementById('target-freq-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw target frequency indicator (green square)
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(5, 5, 20, 20);
        
        // Draw center line
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(5, 15);
        ctx.lineTo(25, 15);
        ctx.stroke();
    }

    drawCurrentFrequency() {
        const canvas = document.getElementById('current-freq-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw current frequency indicator (red circle)
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.arc(15, 15, 10, 0, Math.PI * 2);
        ctx.fill();
    }

    monitorPerformance() {
        const metrics = {
            fps: 1000 / (performance.now() - this.lastFrameTime),
            audioLatency: this.audioContext?.baseLatency || 0,
            obstacleCount: this.obstacles.length,
            timeSinceStart: (this.audioContext?.currentTime - this.songDatabase.initialStartTime) || 0
        };
        
        console.table(metrics);
    }
} 