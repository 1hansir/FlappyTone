const { contextBridge, webFrame } = require('electron');

// Ensure MediaStream is available in the renderer
webFrame.executeJavaScript(`
    if (typeof MediaStream === 'undefined') {
        window.MediaStream = window.MediaStream || window.webkitMediaStream;
    }
`);

contextBridge.exposeInMainWorld('electronAPI', {
    requestMicrophone: async () => {
        try {
            console.log('Preload: Starting microphone request');
            
            if (!navigator.mediaDevices) {
                throw new Error('MediaDevices API not available');
            }

            // Only return the constraints, let renderer handle stream creation
            return {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                    channelCount: 1
                },
                video: false
            };
        } catch (error) {
            console.error('Preload: Microphone access error:', error);
            throw error;
        }
    },
    testMicrophone: async () => {
        try {
            console.log('Testing microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false,
                    channelCount: 1
                },
                video: false
            });
            
            // Create an audio context to test the stream
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            source.connect(analyser);
            
            // Get audio data
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);
            
            // Clean up
            audioContext.close();
            
            return {
                success: true,
                message: 'Microphone is working correctly',
                tracks: stream.getAudioTracks().map(track => ({
                    label: track.label,
                    enabled: track.enabled,
                    muted: track.muted
                }))
            };
        } catch (error) {
            console.error('Microphone test failed:', error);
            throw error;
        }
    }
});
