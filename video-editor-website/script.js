// FFmpeg setup for v0.9.0 (no SharedArrayBuffer required)
const { createFFmpeg, fetchFile } = FFmpeg;
let ffmpeg = null;
let ffmpegLoaded = false;
let useFallbackMode = false;

// Load FFmpeg on page load
async function loadFFmpeg() {
    try {
        ffmpeg = createFFmpeg({ 
            log: true,
            corePath: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.9.0/dist/ffmpeg-core.js'
        });
        await ffmpeg.load();
        ffmpegLoaded = true;
        console.log('FFmpeg loaded successfully');
        showNotification('Video processor ready!', 'success');
    } catch (error) {
        console.error('Failed to load FFmpeg:', error);
        useFallbackMode = true;
        showNotification('Running in demo mode - real encoding requires server deployment', 'success');
    }
}

// Initialize FFmpeg when page loads
loadFFmpeg();

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Upload zone functionality
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const browseLink = document.querySelector('.browse-link');

// Click to upload
uploadZone.addEventListener('click', () => fileInput.click());
if (browseLink) {
    browseLink.addEventListener('click', (e) => {
        e.stopPropagation();
        fileInput.click();
    });
}

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileUpload(e.target.files[0]);
    }
});

function handleFileUpload(file) {
    if (!file.type.startsWith('video/')) {
        showNotification('Please upload a video file', 'error');
        return;
    }

    if (file.size > 500 * 1024 * 1024) {
        showNotification('File size must be less than 500MB for browser processing', 'error');
        return;
    }

    uploadedFile = file;
    showUploadProgress(file.name);
}

function showUploadProgress(filename) {
    const uploadContent = document.querySelector('.upload-content');
    
    uploadContent.innerHTML = `
        <div class="upload-progress">
            <div class="progress-ring">
                <svg viewBox="0 0 100 100">
                    <circle class="progress-ring-bg" cx="50" cy="50" r="45"></circle>
                    <circle class="progress-ring-fill" cx="50" cy="50" r="45"></circle>
                </svg>
                <span class="progress-percent">0%</span>
            </div>
            <h3>Loading ${filename}</h3>
            <p>Preparing for editing...</p>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .upload-progress { text-align: center; }
        .progress-ring { position: relative; width: 100px; height: 100px; margin: 0 auto 1rem; }
        .progress-ring svg { transform: rotate(-90deg); }
        .progress-ring circle { fill: none; stroke-width: 8; }
        .progress-ring-bg { stroke: var(--bg-light); }
        .progress-ring-fill { stroke: url(#gradient); stroke-dasharray: 283; stroke-dashoffset: 283; transition: stroke-dashoffset 0.3s; }
        .progress-percent { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 1.25rem; font-weight: 700; background: var(--gradient); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .encoding-progress { margin-top: 1.5rem; }
        .encoding-progress .progress-bar { width: 100%; height: 8px; background: var(--bg-light); border-radius: 4px; overflow: hidden; margin-top: 0.5rem; }
        .encoding-progress .progress-fill { height: 100%; background: var(--gradient); border-radius: 4px; transition: width 0.3s; width: 0%; }
    `;
    document.head.appendChild(style);

    setTimeout(() => {
        const svg = document.querySelector('.progress-ring svg');
        if (svg) {
            svg.innerHTML = `
                <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#6366f1" />
                        <stop offset="50%" style="stop-color:#ec4899" />
                        <stop offset="100%" style="stop-color:#8b5cf6" />
                    </linearGradient>
                </defs>
            ` + svg.innerHTML;
        }
    }, 0);

    let progress = 0;
    const progressFill = document.querySelector('.progress-ring-fill');
    const progressPercent = document.querySelector('.progress-percent');
    
    const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 100) progress = 100;
        
        const offset = 283 - (283 * progress / 100);
        if (progressFill) progressFill.style.strokeDashoffset = offset;
        if (progressPercent) progressPercent.textContent = Math.round(progress) + '%';
        
        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                showEditingInterface(filename);
            }, 500);
        }
    }, 100);
}

function showEditingInterface(filename) {
    const uploadZone = document.getElementById('uploadZone');
    
    uploadZone.innerHTML = `
        <div class="editing-interface">
            <div class="video-preview-area">
                <video id="previewVideo" controls style="max-width: 100%; max-height: 100%; border-radius: 8px;">
                    <source src="${URL.createObjectURL(uploadedFile)}" type="${uploadedFile.type}">
                </video>
            </div>
            <div class="export-options">
                <h3>Export Settings</h3>
                <div class="option-group">
                    <label>Resolution</label>
                    <div class="option-buttons">
                        <button class="option-btn" data-res="1920:1080">1080p</button>
                        <button class="option-btn active" data-res="3840:2160">4K</button>
                    </div>
                </div>
                <div class="option-group">
                    <label>Frame Rate</label>
                    <div class="option-buttons">
                        <button class="option-btn" data-fps="60">60 FPS</button>
                        <button class="option-btn active" data-fps="120">120 FPS</button>
                    </div>
                </div>
                <div class="option-group">
                    <label>Video Quality</label>
                    <div class="option-buttons">
                        <button class="option-btn" data-crf="28">Standard</button>
                        <button class="option-btn active" data-crf="18">High</button>
                    </div>
                </div>
                <div class="encoding-progress" style="display: none;">
                    <label>Encoding Progress</label>
                    <div class="progress-bar">
                        <div class="progress-fill"></div>
                    </div>
                    <span class="encoding-percent">0%</span>
                </div>
                <button class="btn-primary export-btn">
                    <i class="fas fa-magic"></i>
                    Create Godly Edit
                </button>
            </div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        .editing-interface { text-align: left; }
        .video-preview-area { background: var(--bg-dark); border-radius: 12px; height: 250px; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; overflow: hidden; }
        .video-preview-area video { max-width: 100%; max-height: 100%; }
        .export-options h3 { margin-bottom: 1rem; }
        .option-group { margin-bottom: 1.5rem; }
        .option-group label { display: block; color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 0.875rem; }
        .option-buttons { display: flex; gap: 0.5rem; }
        .option-btn { flex: 1; padding: 0.75rem; background: var(--bg-light); border: 1px solid var(--border); border-radius: 8px; color: var(--text-secondary); cursor: pointer; transition: all 0.3s; }
        .option-btn.active { background: var(--primary); color: white; border-color: var(--primary); }
        .encoding-progress { margin-bottom: 1.5rem; }
        .encoding-progress label { display: flex; justify-content: space-between; color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem; }
        .export-btn { width: 100%; margin-top: 1rem; }
        .export-btn:disabled { opacity: 0.7; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const group = this.closest('.option-group');
            group.querySelectorAll('.option-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
        });
    });

    document.querySelector('.export-btn').addEventListener('click', processVideo);
}

async function processVideo() {
    const exportBtn = document.querySelector('.export-btn');
    const progressDiv = document.querySelector('.encoding-progress');
    
    // Get selected settings
    const activeRes = document.querySelector('[data-res].active');
    const activeFps = document.querySelector('[data-fps].active');
    const activeCrf = document.querySelector('[data-crf].active');
    
    const resolution = activeRes ? activeRes.dataset.res : '3840:2160';
    const fps = activeFps ? activeFps.dataset.fps : '120';
    const quality = activeCrf ? (activeCrf.dataset.crf === '18' ? 'High' : 'Standard') : 'High';
    
    exportBtn.disabled = true;
    progressDiv.style.display = 'block';
    
    // Fallback mode - simulate processing
    if (useFallbackMode || !ffmpegLoaded) {
        exportBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Processing (Demo Mode)...';
        
        // Simulate progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            updateEncodingProgress(progress);
            
            if (progress >= 100) {
                clearInterval(interval);
                showNotification('Demo: Video would be ready now! (Deploy to enable real encoding)', 'success');
                exportBtn.innerHTML = '<i class="fas fa-check"></i> Demo Complete';
                exportBtn.disabled = false;
            }
        }, 150);
        return;
    }
    
    // Real FFmpeg processing
    exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Initializing...';
    
    try {
        const inputName = 'input' + uploadedFile.name.substring(uploadedFile.name.lastIndexOf('.'));
        const outputName = 'output_godlyedit.mp4';
        
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading video...';
        ffmpeg.FS('writeFile', inputName, await fetchFile(uploadedFile));
        
        exportBtn.innerHTML = '<i class="fas fa-cog fa-spin"></i> Encoding...';
        
        const args = [
            '-i', inputName,
            '-vf', `scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=${fps}`,
            '-c:v', 'libx264',
            '-crf', activeCrf ? activeCrf.dataset.crf : '18',
            '-preset', 'medium',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-movflags', '+faststart',
            '-y',
            outputName
        ];
        
        await ffmpeg.exec(args);
        
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Finalizing...';
        const data = ffmpeg.FS('readFile', outputName);
        
        const blob = new Blob([data], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = uploadedFile.name.replace(/\.[^/.]+$/, '') + '_godlyedit_4k120fps.mp4';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        ffmpeg.FS('unlink', inputName);
        ffmpeg.FS('unlink', outputName);
        
        showNotification('Video exported successfully!', 'success');
        exportBtn.innerHTML = '<i class="fas fa-check"></i> Downloaded!';
        
    } catch (error) {
        console.error('Encoding error:', error);
        showNotification('Encoding failed: ' + error.message, 'error');
        exportBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Failed - Try Again';
        exportBtn.disabled = false;
    }
}

function updateEncodingProgress(percent) {
    const progressFill = document.querySelector('.encoding-progress .progress-fill');
    const progressPercent = document.querySelector('.encoding-percent');
    
    if (progressFill && progressPercent) {
        progressFill.style.width = percent + '%';
        progressPercent.textContent = Math.round(percent) + '%';
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    const style = document.createElement('style');
    style.textContent = `
        .notification { position: fixed; top: 100px; right: 2rem; background: var(--bg-card); border: 1px solid var(--border); padding: 1rem 1.5rem; border-radius: 12px; display: flex; align-items: center; gap: 0.75rem; z-index: 10000; animation: slideIn 0.3s ease; }
        .notification.success { border-color: #22c55e; }
        .notification.success i { color: #22c55e; }
        .notification.error { border-color: #ef4444; }
        .notification.error i { color: #ef4444; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.background = window.scrollY > 50 ? 'rgba(10, 10, 15, 0.95)' : 'rgba(10, 10, 15, 0.8)';
    }
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.feature-card, .step, .pricing-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

const playButton = document.querySelector('.play-button');
if (playButton) {
    playButton.addEventListener('click', () => showNotification('Demo video coming soon!', 'success'));
}
