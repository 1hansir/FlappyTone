class PitchDetector {
    constructor() {
        console.log('PitchDetector: Creating instance');
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.isInitialized = false;
        this.currentPitch = 0;
        this.pitchModel = null;
    }

    async init(stream) {
        if (this.isInitialized) {
            console.log('PitchDetector: Already initialized');
            return;
        }

        try {
            if (!stream) {
                throw new Error('No audio stream provided');
            }

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await this.audioContext.resume();
            
            // Create and configure analyzer
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            
            // Connect stream to analyzer
            this.mediaStream = stream;
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);

            // Initialize ml5 pitch detection
            this.pitchModel = await ml5.pitchDetection(
                'https://cdn.jsdelivr.net/gh/ml5js/ml5-data-and-models/models/pitch-detection/crepe/',
                this.audioContext,
                stream,
                this.modelLoaded.bind(this)
            );

            this.isInitialized = true;
            this.startPitchDetection();
            console.log('PitchDetector: Initialized successfully');
        } catch (error) {
            console.error('PitchDetector: Error initializing:', error);
            throw error;
        }
    }

    modelLoaded() {
        console.log('PitchDetector: Model loaded');
        this.startPitchDetection();
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