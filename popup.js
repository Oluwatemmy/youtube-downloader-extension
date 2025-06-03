const API_BASE = 'http://localhost:5000/api';

let selectedFormat = null;
let currentVideoData = null;

// DOM Elements
const urlInput = document.getElementById('urlInput');
const detectBtn = document.getElementById('detectBtn');
const getInfoBtn = document.getElementById('getInfoBtn');
const btnText = document.getElementById('btnText');
const loadingSpinner = document.getElementById('loadingSpinner');
const videoInfo = document.getElementById('videoInfo');
const videoTitle = document.getElementById('videoTitle');
const formatGrid = document.getElementById('formatGrid');
const downloadBtn = document.getElementById('downloadBtn');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');

// Auto-detect YouTube URL from current tab (for browser extension)
detectBtn.addEventListener('click', async () => {
    try {
        // This would be implemented in the browser extension
        // const api = window.chrome || window.browser; // Detects Chrome or Firefox API
        if (typeof chrome !== 'undefined' && chrome.tabs) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab.url.includes('youtube.com/watch')) {
                urlInput.value = tab.url;
                showSuccess('URL detected from current tab!');
            } else {
                showError('Current tab is not a YouTube video');
            }
        } else {
            // For testing purposes
            showError('Auto-detect only works in browser extension');
        }
    } catch (error) {
        console.error('Error detecting URL:', error);
        showError('Failed to detect URL from current tab');
    }
});

// Get video info
getInfoBtn.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
        showError('Please enter a YouTube URL');
        return;
    }

    if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
        showError('Please enter a valid YouTube URL');
        return;
    }

    setLoading(true);
    hideMessages();

    try {
        const response = await fetch(`${API_BASE}/video-info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        currentVideoData = { url, ...data };
        displayVideoInfo(data);
        showSuccess('Video information loaded successfully!');

    } catch (error) {
        console.error('Error fetching video info:', error);
        showError(`Failed to get video info: ${error.message}`);
    } finally {
        setLoading(false);
    }
});

// Download video
downloadBtn.addEventListener('click', async () => {
    if (!selectedFormat || !currentVideoData) {
        showError('Please select a format first');
        return;
    }

    try {
        setDownloadLoading(true);
        hideMessages();

        const response = await fetch(`${API_BASE}/download-stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: currentVideoData.url,
                format_id: selectedFormat.format_id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Download failed');
        }

        // Create blob and download
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        // In browser extension, use chrome.downloads API
        if (typeof chrome !== 'undefined' && chrome.downloads) {
            chrome.downloads.download({
                url: downloadUrl,
                filename: `${currentVideoData.title}.mp4`,
                saveAs: false
            });
        } else {
            // Fallback for testing
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = `${currentVideoData.title}.mp4`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        window.URL.revokeObjectURL(downloadUrl);
        showSuccess('Download started! Check your Downloads folder.');

    } catch (error) {
        console.error('Download error:', error);
        showError(`Download failed: ${error.message}`);
    } finally {
        setDownloadLoading(false);
    }
});

// Helper functions
function displayVideoInfo(data) {
    videoTitle.innerHTML = `
                <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                ${data.title}
            `;

    formatGrid.innerHTML = '';
    data.formats.forEach(format => {
        const formatDiv = document.createElement('div');
        formatDiv.className = 'format-option';
        formatDiv.innerHTML = `
                    <div class="format-info">
                        <div class="format-quality">${format.resolution}</div>
                        <div class="format-details">
                            ${format.filesize_str}<br>
                            <small>${format.ext.toUpperCase()}</small>
                        </div>
                    </div>
                `;

        formatDiv.addEventListener('click', () => selectFormat(format, formatDiv));
        formatGrid.appendChild(formatDiv);
    });

    videoInfo.style.display = 'block';
    downloadBtn.style.display = 'flex';
}

function selectFormat(format, element) {
    document.querySelectorAll('.format-option').forEach(el => {
        el.classList.remove('selected');
    });

    element.classList.add('selected');
    selectedFormat = format;
}

function setLoading(loading) {
    const statusIndicator = getInfoBtn.querySelector('.status-indicator');

    if (loading) {
        getInfoBtn.disabled = true;
        btnText.textContent = 'Loading...';
        loadingSpinner.style.display = 'block';
        statusIndicator.className = 'status-indicator status-loading';
    } else {
        getInfoBtn.disabled = false;
        btnText.textContent = 'Get Video Info';
        loadingSpinner.style.display = 'none';
        statusIndicator.className = 'status-indicator status-ready';
    }
}

function setDownloadLoading(loading) {
    if (loading) {
        downloadBtn.disabled = true;
        downloadBtn.innerHTML = `
                    <div class="loading"></div>
                    <span>Downloading...</span>
                `;
    } else {
        downloadBtn.disabled = false;
        downloadBtn.innerHTML = `
                    <svg class="icon" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    <span>Download Video</span>
                `;
    }
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    successMessage.style.display = 'none';

    const statusIndicator = getInfoBtn.querySelector('.status-indicator');
    statusIndicator.className = 'status-indicator status-error';
}

function showSuccess(message) {
    successMessage.textContent = message;
    successMessage.style.display = 'block';
    errorMessage.style.display = 'none';
}

function hideMessages() {
    errorMessage.style.display = 'none';
    successMessage.style.display = 'none';
}

// Initialize
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        getInfoBtn.click();
    }
});