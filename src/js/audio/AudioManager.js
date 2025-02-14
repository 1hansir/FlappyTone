class AudioManager {
    constructor() {
        this.pitchDetector = null;
        this.isInitialized = false;
        this.stream = null;
    }

    async start(stream) {
        console.log('AudioManager: Starting...');
        if (!stream) {
            console.error('AudioManager: No stream provided');
            throw new Error('No audio stream provided');
        }
        
        this.stream = stream;
        
        // Create new PitchDetector instance
        this.pitchDetector = new PitchDetector();
        
        try {
            await this.pitchDetector.init(stream);
            // Make sure pitch detection starts
            await this.pitchDetector.startPitchDetection();
            this.isInitialized = true;
            console.log('AudioManager: Initialized successfully');
        } catch (error) {
            console.error('AudioManager: Failed to initialize audio:', error);
            throw error;
        }
    }

    cleanup(stopStream = true) {
        if (this.pitchDetector) {
            this.pitchDetector.cleanup();
            this.pitchDetector = null;
        }
        
        // Only stop the stream if explicitly requested
        if (stopStream && this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            this.stream = null;
        }
        
        this.isInitialized = false;
    }
} 