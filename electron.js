const { app, BrowserWindow, systemPreferences, session } = require('electron');
const path = require('path');

let mainWindow;

async function requestMicrophoneAccess() {
    console.log('Requesting microphone access...');
    console.log('Platform:', process.platform);
    
    if (process.platform === 'darwin') {
        try {
            const micStatus = systemPreferences.getMediaAccessStatus('microphone');
            console.log('Initial microphone access status:', micStatus);

            if (micStatus !== 'granted') {
                console.log('Requesting macOS microphone permission...');
                const granted = await systemPreferences.askForMediaAccess('microphone');
                console.log('macOS microphone permission result:', granted);
                return granted;
            }
            console.log('Microphone access already granted on macOS');
            return true;
        } catch (error) {
            console.error('Error requesting macOS microphone access:', error);
            return false;
        }
    } else {
        // For Windows and Linux, we'll rely on the browser API
        console.log('Non-macOS platform, will request through browser API');
        return true;
    }
}

async function createWindow() {
    console.log('Creating window...');
    
    try {
        // Request microphone access first
        const hasMicrophoneAccess = await requestMicrophoneAccess();
        console.log('Has microphone access:', hasMicrophoneAccess);
        
        if (!hasMicrophoneAccess) {
            console.error('Microphone access denied');
            app.quit();
            return;
        }

        // Set up session permissions before creating window
        session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
            console.log('Permission requested:', permission);
            if (permission === 'media' || 
                permission === 'microphone' || 
                permission === 'audio-capture') {
                callback(true);
            } else {
                callback(false);
            }
        });

        mainWindow = new BrowserWindow({
            width: 850,
            height: 650,
            webPreferences: {
                contextIsolation: true,
                nodeIntegration: false,
                webSecurity: true,
                sandbox: false,
                preload: path.join(__dirname, 'preload.js'),
                webgl: true,
                enableWebAudio: true,
                audioPlayback: true
            }
        });

        // Handle renderer process crashes with recovery
        mainWindow.webContents.on('render-process-gone', async (event, details) => {
            console.error('Renderer process gone:', details.reason, details);
            
            if (details.reason === 'crashed' || details.reason === 'killed') {
                try {
                    // Don't try to execute JavaScript in the crashed renderer
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    if (!mainWindow.isDestroyed()) {
                        // Create a new window instead of reloading
                        const oldWindow = mainWindow;
                        await createWindow();
                        if (oldWindow && !oldWindow.isDestroyed()) {
                            oldWindow.close();
                        }
                    }
                } catch (error) {
                    console.error('Error during crash recovery:', error);
                    if (!mainWindow.isDestroyed()) {
                        mainWindow.reload();
                    } else {
                        app.quit();
                    }
                }
            }
        });

        // Handle unresponsive window
        mainWindow.on('unresponsive', () => {
            console.error('Window became unresponsive');
            if (!mainWindow.isDestroyed()) {
                mainWindow.reload();
            }
        });

        if (process.env.NODE_ENV === 'development') {
            await mainWindow.loadFile('src/index.html');
            mainWindow.webContents.openDevTools();
        } else {
            await mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
        }

        // Ensure audio is properly initialized
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('Window loaded successfully');
            mainWindow.webContents.audioMuted = false;
            mainWindow.webContents.setAudioMuted(false);
        });

    } catch (error) {
        console.error('Error creating window:', error);
        app.quit();
    }
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
