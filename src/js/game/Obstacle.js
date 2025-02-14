class Obstacle {
    constructor(x, noteInfo) {
        this.x = x;
        this.width = 60;
        this.speed = 2; // This will be dynamically updated by Game class
        this.gap = 200;
        this.noteInfo = noteInfo;
        this.gapStart = this.calculateGapStart(noteInfo.frequency); // Offset by half gap height so frequency is in middle
        this.soundPlayed = false;
        this.scoreAdded = false;
    }

    update() {
        this.x -= this.speed;
    }

    draw(ctx) {
        // Cache obstacle properties
        const { x, width, gapStart, gap } = this;
        
        // Save context state
        ctx.save();
        
        // Set fill style once
        ctx.fillStyle = '#2ecc71';
        
        // Draw pipes using a single path
        ctx.beginPath();
        // Top pipe
        ctx.rect(x, 0, width, gapStart);
        // Bottom pipe
        ctx.rect(x, gapStart + gap, width, 600 - (gapStart + gap));
        ctx.fill();
        
        // Draw target indicators only if in viewport
        if (x >= 0 && x <= ctx.canvas.width) {
            const gapCenter = gapStart + (gap / 2);
            
            // Draw target line
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 10, gapCenter);
            ctx.lineTo(x + width + 10, gapCenter);
            ctx.stroke();
            
            // Draw note name
            if (this.noteInfo) {
                ctx.fillStyle = '#000';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.noteInfo.note, x + width/2, gapStart - 10);
            }
        }
        
        // Restore context state
        ctx.restore();
    }

    isOffscreen() {
        return this.x + this.width < 0;
    }

    calculateGapStart(frequency) {
        // Map frequency range (Hz) to canvas position
        const minFreq = 100;  // Match Bird's frequency range
        const maxFreq = 1000; // Match Bird's frequency range
        const normalizedFreq = Math.max(minFreq, Math.min(frequency, maxFreq));
        
        // Convert to logarithmic scale (which better matches musical perception)
        const logMin = Math.log2(minFreq);
        const logMax = Math.log2(maxFreq);
        const logFreq = Math.log2(normalizedFreq);
        
        // Normalize to 0-1 range
        const normalizedValue = (logFreq - logMin) / (logMax - logMin);
        
        // Map to canvas height (inverted, since lower frequencies should be lower on screen)
        const basePosition = 600 - (normalizedValue * 500); // Same as Bird's mapping
        
        // Adjust for gap center position
        return basePosition - (this.gap / 2);
    }

    drawFrequencyDisplay() {
        const canvas = document.getElementById('target-frequency-display');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get current values
        const currentPitch = this.audioManager.pitchDetector.getCurrentPitch();
        const currentNote = this.songDatabase.getCurrentNote();
        const targetFreq = currentNote ? currentNote.frequency : 0;
        
        // Draw background circle
        ctx.beginPath();
        ctx.arc(50, 50, 45, 0, Math.PI * 2);
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        
        // Draw indicator line
        if (currentPitch > 0 && targetFreq > 0) {
            const angle = this.mapFrequencyToAngle(currentPitch, targetFreq);
            
            // Draw target marker
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(
                50 + Math.cos(Math.PI * 1.5) * 40,
                50 + Math.sin(Math.PI * 1.5) * 40
            );
            ctx.strokeStyle = '#4CAF50';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Draw current pitch indicator
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(
                50 + Math.cos(angle) * 40,
                50 + Math.sin(angle) * 40
            );
            ctx.strokeStyle = '#FF4444';
            ctx.lineWidth = 3;
            ctx.stroke();
        }
        
        // Draw center dot
        ctx.beginPath();
        ctx.arc(50, 50, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
    }

    mapFrequencyToAngle(current, target) {
        // Calculate cents difference
        const cents = 1200 * Math.log2(current / target);
        // Map cents to angle (-50 cents to +50 cents maps to full circle)
        return Math.PI * 1.5 + (cents / 50) * (Math.PI / 2);
    }
} 