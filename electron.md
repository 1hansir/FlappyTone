1. Set Up Electron App
First, ensure your Electron project is initialized. If you haven’t set it up yet, run:

bash
Copy
Edit
mkdir electron-mic-app && cd electron-mic-app
npm init -y
npm install electron
Then, create a basic Electron structure with:

bash
Copy
Edit
electron-mic-app/
│── main.js  # Main process
│── index.html  # Frontend UI
│── preload.js  # Preload script
│── package.json
2. Modify Info.plist to Request Mic Permission
On macOS, you must declare microphone access in your app's Info.plist file. If you don’t, the system will deny access silently.

Steps:
Create a file named Info.plist in the root of your project (or modify electron-builder settings).
Add this to Info.plist:
xml
Copy
Edit
<key>NSMicrophoneUsageDescription</key>
<string>This app requires microphone access to record audio.</string>
If you are using electron-builder for packaging, add this to package.json:
json
Copy
Edit
"build": {
  "mac": {
    "entitlements": "entitlements.mac.plist",
    "entitlementsInherit": "entitlements.mac.plist"
  }
}
Create an entitlements.mac.plist file:
xml
Copy
Edit
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.device.microphone</key>
    <true/>
</dict>
</plist>
3. Request Microphone Permission in Electron
Modify your main.js:

javascript
Copy
Edit
const { app, BrowserWindow, session } = require('electron');

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    // Reset microphone permissions (optional)
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (permission === 'media') {
            return true;
        }
    });

    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'media') {
            callback(true);
        } else {
            callback(false);
        }
    });
});
4. Handle Microphone in Renderer Process (index.html & preload.js)
Modify index.html:

html
Copy
Edit
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Electron Mic Access</title>
</head>
<body>
    <h1>Microphone Access Test</h1>
    <button id="request-mic">Request Microphone Access</button>
    <p id="status"></p>

    <script>
        document.getElementById('request-mic').addEventListener('click', async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                document.getElementById('status').innerText = "Microphone access granted ✅";
                console.log("Microphone access granted:", stream);
            } catch (error) {
                document.getElementById('status').innerText = "Microphone access denied ❌";
                console.error("Microphone access denied:", error);
            }
        });
    </script>
</body>
</html>
5. Run Your Electron App
Start your app:

bash
Copy
Edit
npx electron .
When you click "Request Microphone Access", macOS should prompt for microphone permissions.

6. Reset Permissions (If Needed)
If permissions are not appearing, reset them via Terminal:

bash
Copy
Edit
tccutil reset Microphone
If still not working:

Ensure NSMicrophoneUsageDescription is in Info.plist.
Run npx electron . outside of VS Code (sometimes VS Code suppresses prompts).
Try packaging the app with electron-builder and run the .app file.
7. Bonus: Check Mic Permission Programmatically
If you want to check microphone permission before requesting:

javascript
Copy
Edit
navigator.permissions.query({ name: 'microphone' }).then((result) => {
    console.log("Microphone permission status:", result.state);
});
