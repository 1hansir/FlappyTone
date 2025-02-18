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
        
        try {
            // Store the stream directly
            this.stream = stream;
            
            // Create new PitchDetector instance
            this.pitchDetector = new PitchDetector();
            
            await this.pitchDetector.init(this.stream);
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