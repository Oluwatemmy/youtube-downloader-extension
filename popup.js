// popup.js - Handles the popup logic for the video downloader extension

const fetchBtn = document.getElementById("fetch");
const downloadBtn = document.getElementById("download");
const urlInput = document.getElementById("url");
const resolutionsSelect = document.getElementById("resolutions");
const message = document.getElementById("message");
const loadingDiv = document.getElementById("loading");

const API_BASE = "http://localhost:8000";  // deployed backend URL 

function setLoading(isLoading) {
    loadingDiv.style.display = isLoading ? "block" : "none";
    fetchBtn.disabled = isLoading;
    downloadBtn.disabled = isLoading;
    urlInput.disabled = isLoading;
}

fetchBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    if (!url) return (message.textContent = "❌ Please enter a URL.");

    message.textContent = "⏳ Fetching resolutions...";

    try {
        const res = await fetch(`${API_BASE}/info?url=${encodeURIComponent(url)}`);
        const data = await res.json();

        if (res.ok && data.available_formats.length > 0) {
            resolutionsSelect.innerHTML = "";
            data.available_formats.forEach(format => {
                const option = document.createElement("option");
                option.value = format.resolution;
                option.textContent = `${format.resolution} (${format.ext}, ${format.filesize})`;
                resolutionsSelect.appendChild(option);
            });

            resolutionsSelect.hidden = false;
            downloadBtn.hidden = false;
            message.textContent = `✅ Found ${data.available_formats.length} formats for "${data.title}"`;
        } else {
            message.textContent = "❌ No valid formats found.";
        }
    } catch (err) {
        console.error(err);
        message.textContent = "❌ Failed to fetch video info.";
    }
});

downloadBtn.addEventListener("click", async () => {
    const url = urlInput.value.trim();
    const resolution = resolutionsSelect.value;

    if (!url || !resolution) {
        return (message.textContent = "❌ Please enter URL and choose a resolution.");
    }

    message.textContent = "⬇️ Downloading...";

    try {
        const res = await fetch(`${API_BASE}/download`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ url, resolution })
        });

        if (!res.ok) throw new Error("Download failed");

        const blob = await res.blob();
        const contentDisposition = res.headers.get("Content-Disposition");
        let filename = "video.mp4";

        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+)"?/);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            }
        }

        const downloadUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(downloadUrl);

        message.textContent = `✅ Downloaded: ${filename}`;
    } catch (err) {
        console.error(err);
        message.textContent = "❌ Download failed.";
    } finally {
        setLoading(false);
    }
});
