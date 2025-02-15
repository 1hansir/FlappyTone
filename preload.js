
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    requestMicrophone: async () => {
        try {
            console.log('Requesting microphone access from preload...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                },
                video: false
            });
            console.log('Microphone stream obtained:', stream);
            return stream;
        } catch (error) {
            console.error('Microphone access error in preload:', error);
            throw error;
        }
    }
});
