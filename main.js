const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');
const fs = require('fs');

// Handle creating/removing shortcuts on Windows.
if (require('electron-squirrel-startup')) { app.quit(); }

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- HELPER: FIND FFMPEG ---
function getFfmpegPath() {
  // Common locations on macOS
  const paths = [
    '/opt/homebrew/bin/ffmpeg', // Apple Silicon
    '/usr/local/bin/ffmpeg',    // Intel Mac
    '/usr/bin/ffmpeg'           // System
  ];
  
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null; 
}

// --- API HANDLERS ---

// 1. AppleScript Executor
ipcMain.handle('run-applescript', async (event, script) => {
  return new Promise((resolve, reject) => {
    // 50MB Buffer for large libraries
    exec(`osascript -e '${script.replace(/'/g, "'\\''")}'`, { maxBuffer: 1024 * 1024 * 50 }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr || error.message);
      } else {
        resolve(stdout.trim());
      }
    });
  });
});

// 2. Select Folder
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.filePaths[0];
});

// 3. Download Video
ipcMain.handle('download-video', async (event, { url, format, folder, meta }) => {
  return new Promise((resolve, reject) => {
    const binaryPath = path.join(__dirname, 'bin', 'yt-dlp');
    const downloadPath = folder || app.getPath('downloads');
    const ffmpegPath = getFfmpegPath();

    let args = [
      url, 
      '-P', downloadPath,
      '--no-playlist',
      '--add-metadata',
      '--embed-thumbnail'
    ];

    // Only add the flag if we ACTUALLY found ffmpeg
    if (ffmpegPath) {
      args.push('--ffmpeg-location', ffmpegPath);
    }

    if (format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else {
      // Best video + best audio
      args.push('-f', 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b');
    }

    // Metadata Overrides
    if (meta.artist) args.push('--postprocessor-args', `Metadata:artist=${meta.artist}`);
    if (meta.album) args.push('--postprocessor-args', `Metadata:album=${meta.album}`);
    
    // Title Cleaning
    if (meta.cleanTitle) {
      args.push('--replace-in-metadata', 'title', '(?i)\\s*[(\\[].*(remaster|official|audio|video|lyric).*?[)\\]]', '');
      args.push('-o', '%(title)s.%(ext)s');
    } else {
      args.push('-o', '%(title)s.%(ext)s');
    }

    const child = spawn(binaryPath, args);
    let output = '';

    child.stdout.on('data', d => output += d.toString());
    child.stderr.on('data', d => output += d.toString());
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve(`Saved to: ${downloadPath}`);
      } else {
        // Provide a helpful error if MP3 failed but ffmpeg was missing
        if (format === 'mp3' && !ffmpegPath) {
            reject(`Error: MP3 conversion failed because FFmpeg was not found.\nPlease install it: brew install ffmpeg`);
        } else {
            reject(`Error (Code ${code}):\n${output}`);
        }
      }
    });
  });
});
