class SongDatabase {
    constructor() {
        this.songs = [];
        this.currentSong = null;
        this.audioContext = null;
        this.currentTime = 0;
        this.isPlaying = false;
        this.beatDuration = 2.0; // Increased from 1.0 to 2.0 seconds per beat
        this.startTime = null;
        this.lastBeat = -1;
        this.currentOscillator = null;
        this.gainNode = null;
        this.nextBeatTime = 0;
        this.guideOscillator = null;
        this.guideGain = null;
        this.auxiliaryDelay = 0.2; // 200ms delay for auxiliary voice
        this.isFirstMelody = true;
        this.warmupBeats = 2; // Number of warmup beats before obstacles start
        this.isWarmupPhase = true;
        this.currentMelodyStartTime = null;
        this.initialStartTime = null;  // Add this to track the very first start time

        // Define scale for melody generation (C4 major scale)
        this.scale = [
            { note: "C4", frequency: 261.63 },
            { note: "D4", frequency: 293.66 },
            { note: "E4", frequency: 329.63 },
            { note: "F4", frequency: 349.23 },
            { note: "G4", frequency: 392.00 },
            { note: "A4", frequency: 440.00 },
            { note: "B4", frequency: 493.88 },
            { note: "C5", frequency: 523.25 }
        ];

        // Add common melodic patterns
        this.patterns = [
            [0, 2, 4, 2], // C-E-G-E pattern
            [0, 1, 2, 3], // Ascending pattern
            [4, 2, 1, 0], // Descending pattern
            [0, 2, 1, 3], // Mixed pattern
        ];
        
        this.lastPattern = -1;
    }

    async loadSongs() {
        this.songs = [
            {
                id: 1,
                title: "Simple Melody",
                tempo: 30,
                melody: [
                    { note: "C4", frequency: 261.63, duration: this.beatDuration, time: 0 },
                    { note: "E4", frequency: 329.63, duration: this.beatDuration, time: this.beatDuration },
                    { note: "G4", frequency: 392.00, duration: this.beatDuration, time: this.beatDuration * 2 },
                    { note: "C5", frequency: 523.25, duration: this.beatDuration, time: this.beatDuration * 3 },
                    { note: "E5", frequency: 659.25, duration: this.beatDuration, time: this.beatDuration * 4 },
                    { note: "G5", frequency: 783.99, duration: this.beatDuration, time: this.beatDuration * 5 }
                ],
                harmony: [
                    { note: "E4", frequency: 329.63, duration: this.beatDuration, time: 0 },
                    { note: "G4", frequency: 392.00, duration: this.beatDuration, time: this.beatDuration },
                    { note: "B4", frequency: 493.88, duration: this.beatDuration, time: this.beatDuration * 2 },
                    { note: "E5", frequency: 659.25, duration: this.beatDuration, time: this.beatDuration * 3 },
                    { note: "G5", frequency: 783.99, duration: this.beatDuration, time: this.beatDuration * 4 },
                    { note: "B5", frequency: 987.77, duration: this.beatDuration, time: this.beatDuration * 5 }
                ]
            }
        ];
    }

    async init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.isPlaying = true;
        console.log('SongDatabase initialized');
        return Promise.resolve();
    }

    selectSong(id) {
        this.currentSong = this.songs.find(song => song.id === id);
        return this.currentSong;
    }

    getHarmonyOptions(currentBeat) {
        // Return possible harmony notes for the current position in the song
        if (!this.currentSong) return [];
        
        // Implement harmony suggestion logic
        return [];
    }

    // Get the target harmony note at the current time
    getTargetNote(time) {
        if (!this.currentSong) return null;
        
        const beatDuration = 60 / this.currentSong.tempo;
        const currentBeat = Math.floor(time / beatDuration);
        return this.currentSong.harmony[currentBeat % this.currentSong.harmony.length];
    }

    generateNewMelody() {
        // Select a random pattern
        let patternIndex;
        do {
            patternIndex = Math.floor(Math.random() * this.patterns.length);
        } while (patternIndex === this.lastPattern);
        this.lastPattern = patternIndex;
        
        const pattern = this.patterns[patternIndex];
        console.log('Selected pattern:', pattern);
        
        // Generate melody using the pattern
        const melody = pattern.map(index => {
            const note = this.scale[index];
            console.log('Creating note from index:', index, 'Note:', note);
            return {
                note: note.note,
                frequency: note.frequency
            };
        });
        
        // Create harmony (target notes) - for now, same as melody
        const harmony = [...melody];
        
        this.currentSong = {
            melody: melody,
            harmony: harmony
        };
        
        console.log('New melody generated:', {
            pattern: pattern,
            melody: melody.map(n => n.note)
        });
    }

    playMelody() {
        if (!this.currentSong || !this.audioContext) return;
        
        console.log('Starting melody playback');
        this.isPlaying = true;
        
        // Only set the initial start time once when we first start playing
        if (!this.initialStartTime) {
            this.initialStartTime = this.audioContext.currentTime;
        }
        
        // Use the current time as the start for this melody, but keep initial time for beat counting
        this.startTime = this.audioContext.currentTime;

        // Schedule all notes in the melody
        this.currentSong.melody.forEach((note, index) => {
            const noteTime = this.startTime + (index * this.beatDuration);
            this.scheduleNote(note.frequency, noteTime);
        });

        // Schedule next melody
        const totalDuration = this.currentSong.melody.length * this.beatDuration;
        setTimeout(() => {
            if (this.isPlaying) {
                this.generateNewMelody();
                this.playMelody();
            }
        }, (totalDuration - 0.1) * 1000);
    }

    scheduleNote(frequency, startTime) {
        const oscillator = this.audioContext.createOscillator();
        const noteGain = this.audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, startTime);
        
        noteGain.gain.setValueAtTime(0, startTime);
        noteGain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
        noteGain.gain.linearRampToValueAtTime(0, startTime + this.beatDuration - 0.05);
        
        oscillator.connect(noteGain);
        noteGain.connect(this.audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + this.beatDuration);
    }

    // New method to play continuous guide tone
    startGuideVoice() {
        if (this.guideOscillator) {
            this.guideOscillator.stop();
        }

        this.guideOscillator = this.audioContext.createOscillator();
        this.guideOscillator.type = 'sine';
        this.guideOscillator.connect(this.guideGain);
        
        // Update frequency based on current harmony note
        const updateFrequency = () => {
            if (!this.isPlaying) return;
            
            const currentNote = this.getCurrentNote();
            if (currentNote) {
                this.guideOscillator.frequency.setValueAtTime(
                    currentNote.frequency,
                    this.audioContext.currentTime
                );
            }
            
            // Schedule next update
            setTimeout(updateFrequency, 100);
        };

        this.guideOscillator.start();
        updateFrequency();
    }

    stopGuideVoice() {
        if (this.guideOscillator) {
            this.guideOscillator.stop();
            this.guideOscillator = null;
        }
    }

    cleanup() {
        this.isPlaying = false;
        
        // Stop the guide voice
        if (this.guideOscillator) {
            this.guideOscillator.stop();
            this.guideOscillator = null;
        }
        
        if (this.guideGain) {
            this.guideGain.disconnect();
            this.guideGain = null;
        }
        
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.currentTime = 0;
        this.startTime = null;
        this.lastBeat = -1;
        this.nextBeatTime = 0;
        this.currentSong = null;
        this.isFirstMelody = true;
        this.isWarmupPhase = true;
    }

    getCurrentBeat() {
        if (!this.isPlaying || !this.initialStartTime || !this.audioContext) return 0;
        const currentTime = this.audioContext.currentTime - this.initialStartTime;
        const currentBeat = Math.floor(currentTime / this.beatDuration);
        console.log('Current beat:', currentBeat, 'Time:', currentTime);
        return currentBeat;
    }

    isNewBeat() {
        if (!this.isPlaying || !this.startTime) return false;
        
        const currentTime = this.audioContext.currentTime - this.startTime;
        const currentBeat = Math.floor(currentTime / this.beatDuration);
        
        console.log('Current beat:', currentBeat, 'Last beat:', this.lastBeat); // Debug log
        
        if (currentBeat > this.lastBeat) {
            this.lastBeat = currentBeat;
            return true;
        }
        return false;
    }

    getCurrentNote() {
        if (!this.isPlaying || !this.initialStartTime || !this.audioContext) {
            console.log('getCurrentNote: Missing required state', {
                hasSong: !!this.currentSong,
                isPlaying: this.isPlaying,
                initialStartTime: this.initialStartTime
            });
            return null;
        }
        
        const currentTime = this.audioContext.currentTime - this.initialStartTime;
        const currentBeat = Math.floor(currentTime / this.beatDuration);
        
        // During warmup phase, return first note of melody
        if (this.isWarmupPhase && currentBeat < this.warmupBeats) {
            return this.currentSong.melody[0];
        }
        
        const noteIndex = currentBeat % this.currentSong.melody.length;
        return this.currentSong.melody[noteIndex];
    }

    stop() {
        this.isPlaying = false;
        if (this.audioContext) {
            this.audioContext.close();
        }
        this.currentSong = null;
        this.startTime = null;
    }

    isWarmupPeriod() {
        const currentBeat = this.getCurrentBeat();
        console.log('Checking warmup period. Current beat:', currentBeat, 'Warmup beats:', this.warmupBeats);
        return currentBeat < this.warmupBeats;
    }
} 