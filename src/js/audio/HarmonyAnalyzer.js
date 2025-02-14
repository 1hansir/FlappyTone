class HarmonyAnalyzer {
    constructor(songDatabase) {
        this.songDatabase = songDatabase;
        this.currentNote = null;
        this.targetNote = null;
    }

    // Convert frequency to note name
    frequencyToNote(frequency) {
        // A4 = 440Hz
        const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
        const a4 = 440;
        if (frequency === 0) return "---";
        
        const halfStepsFromA4 = Math.round(12 * Math.log2(frequency / a4));
        const octave = Math.floor((halfStepsFromA4 + 57) / 12);
        const noteIndex = ((halfStepsFromA4 + 57) % 12 + 12) % 12;
        
        return noteNames[noteIndex] + octave;
    }

    analyze(pitch) {
        // Get current note directly from SongDatabase
        this.targetNote = this.songDatabase.getCurrentNote();
        
        // Convert pitch to note name
        this.currentNote = this.frequencyToNote(pitch);
        
        // Update the display
        document.getElementById('current-note').textContent = `Current Note: ${this.currentNote}`;
        document.getElementById('target-note').textContent = 
            `Target Note: ${this.targetNote ? this.targetNote.note : '---'}`;
    }
} 