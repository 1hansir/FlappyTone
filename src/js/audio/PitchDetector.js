class PitchDetector {
    constructor() {
        console.log('PitchDetector: Creating instance');
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.isInitialized = false;
        this.currentPitch = 0;
        this.pitchModel = null;
        this.modelLoaded = false;
    }

    async waitForMl5() {
        return new Promise((resolve, reject) => {
            if (typeof ml5 !== 'undefined') {
                console.log('PitchDetector: ml5 already available');
                resolve();
                return;
            }

            const maxAttempts = 20;
            let attempts = 0;
            
            const checkMl5 = setInterval(() => {
                attempts++;
                console.log(`PitchDetector: Waiting for ml5... (${attempts}/${maxAttempts})`);
                
                if (typeof ml5 !== 'undefined') {
                    clearInterval(checkMl5);
                    console.log('PitchDetector: ml5 loaded successfully');
                    resolve();
                } else if (attempts >= maxAttempts) {
                    clearInterval(checkMl5);
                    reject(new Error('ml5.js failed to load'));
                }
            }, 250);
        });
    }

    async init(stream) {
        console.log('PitchDetector: Starting initialization...');
        
        try {
            // Wait for ml5 to load first
            await this.waitForMl5();
            
            // Initialize audio context and analyzer
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.audioContext.resume();
            
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            // Connect stream
            this.mediaStream = stream;
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            source.connect(this.analyser);

            // Initialize pitch detection
            this.pitchModel = await new Promise((resolve, reject) => {
                const model = ml5.pitchDetection(
                    'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/',
                    this.audioContext,
                    this.mediaStream,
                    () => {
                        console.log('PitchDetector: Model loaded');
                        this.modelLoaded = true;
                        resolve(model);
                    }
                );
            });

            this.isInitialized = true;
            this.startPitchDetection();
            console.log('PitchDetector: Initialized successfully');
        } catch (error) {
            console.error('PitchDetector: Error initializing:', error);
            throw error;
        }
    }

    async startPitchDetection() {
        const detectPitch = async () => {
            if (!this.isInitialized || !this.pitchModel) return;
            
            try {
                const pitch = await this.pitchModel.getPitch();
                this.currentPitch = pitch || 0;
                
                // Continue detection loop if initialized
                if (this.isInitialized) {
                    requestAnimationFrame(detectPitch);
                }
            } catch (error) {
                console.error('PitchDetector: Error getting pitch:', error);
            }
        };

        detectPitch();
    }

    getCurrentPitch() {
        return this.currentPitch;
    }

    cleanup() {
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }
        
        // Don't stop the mediaStream tracks since we want to reuse them
        this.analyser = null;
        this.mediaStream = null;
        this.currentPitch = 0;
        this.pitchModel = null;
        this.isInitialized = false;
        console.log('PitchDetector: Cleaned up resources');
    }
} 