const { app, BrowserWindow, systemPreferences } = require('electron');
const path = require('path');

let mainWindow;

async function requestMicrophoneAccess() {
    if (process.platform === 'darwin') {
        try {
            const micStatus = systemPreferences.getMediaAccessStatus('microphone');
            console.log('Initial microphone access status:', micStatus);

            if (micStatus !== 'granted') {
                console.log('Requesting microphone access...');
                const granted = await systemPreferences.askForMediaAccess('microphone');
                console.log('Microphone access request result:', granted);
                return granted;
            }
            console.log('Microphone access already granted');
            return true;
        } catch (error) {
            console.error('Error requesting microphone access:', error);
            return false;
        }
    }
    return true;
}

async function createWindow() {
    console.log('Creating window...');
    
    // Request microphone access first
    const hasMicrophoneAccess = await requestMicrophoneAccess();
    console.log('Has microphone access:', hasMicrophoneAccess);
    
    if (!hasMicrophoneAccess) {
        console.error('Microphone access denied');
        app.quit();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 850,
        height: 650,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
            sandbox: false,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Set secure CSP headers with media permissions
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' https://unpkg.com",
                    "style-src 'self' 'unsafe-inline'",
                    "media-src 'self' blob: mediadevices:",
                    "connect-src 'self' blob: mediadevices: https://unpkg.com https://cdn.jsdelivr.net",
                    "img-src 'self' data: blob:"
                ].join('; ')
            }
        });
    });

    // Set permission handler with logging
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        console.log('Permission requested:', permission);
        if (permission === 'media' || permission === 'microphone') {
            console.log('Granting microphone permission');
            callback(true);
        } else {
            console.log('Denying permission:', permission);
            callback(false);
        }
    });

    // Enable audio
    mainWindow.webContents.audioMuted = false;

    // Load content
    if (process.env.NODE_ENV === 'development') {
        console.log('Loading in development mode...');
        await mainWindow.loadFile('src/index.html');
        // Always open DevTools in development
        mainWindow.webContents.openDevTools();
    } else {
        console.log('Loading in production mode...');
        mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
    }

    // Log window ready
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Window loaded successfully');
    });
}

// Initialize app
app.whenReady().then(async () => {
    console.log('App ready, creating window...');
    try {
        await createWindow();
    } catch (error) {
        console.error('Failed to create window:', error);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Handle errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

// Create preload script with proper permissions
const fs = require('fs');
const preloadContent = `
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
`;

fs.writeFileSync(path.join(__dirname, 'preload.js'), preloadContent); 