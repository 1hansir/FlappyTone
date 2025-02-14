class Bird {
    constructor() {
        this.x = 150;
        this.y = 300;
        this.size = 25; // Slightly smaller bird
        this.velocity = 0;
        this.gravity = 1.2;     // Increased gravity
        this.maxVelocity = 20;  // Increased max velocity
        this.liftForce = -12;   // Stronger lift force
        this.sensitivity = 1.0;  // Increased sensitivity
    }

    updatePosition(pitch) {
        if (pitch > 0) {
            // Remove the octave shift multiplication
            const octaveShift = 2;
            const targetY = this.mapPitchToY(pitch * octaveShift);
            const diff = targetY - this.y;
            this.velocity = diff * 0.2;
        }

        // Apply gravity
        this.velocity += this.gravity;
        this.velocity = Math.max(-this.maxVelocity, Math.min(this.velocity, this.maxVelocity));
        
        // Update position
        this.y += this.velocity;
        
        // Keep bird within canvas bounds
        this.y = Math.max(this.size, Math.min(this.y, 600 - this.size));
    }

    // New method to map pitch to vertical position
    mapPitchToY(pitch) {
        // Map frequency range (Hz) to canvas position
        const minFreq = 100;  // Lowest expected frequency
        const maxFreq = 1000; // Highest expected frequency
        const normalizedPitch = Math.max(minFreq, Math.min(pitch, maxFreq));
        
        // Convert to logarithmic scale (which better matches musical perception)
        const logMin = Math.log2(minFreq);
        const logMax = Math.log2(maxFreq);
        const logPitch = Math.log2(normalizedPitch);
        
        // Normalize to 0-1 range
        const normalizedValue = (logPitch - logMin) / (logMax - logMin);
        
        // Map to canvas height (inverted, since lower frequencies should be lower on screen)
        return 600 - (normalizedValue * 500); // Leave some margin at top and bottom
    }

    draw(ctx) {
        // Cache bird properties
        const { x, y, size } = this;
        
        // Save context state
        ctx.save();
        
        // Draw bird
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Restore context state
        ctx.restore();
    }
} 