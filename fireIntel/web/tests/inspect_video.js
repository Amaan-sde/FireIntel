const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("@playwright/test");

async function main() {
  const videoPath = path.resolve(__dirname, "../public/videos/earth_cinematic.mp4");
  const stat = fs.statSync(videoPath);
  console.log("Video file size:", stat.size, "bytes");

  // Create lightweight HTTP server supporting partial range requests
  const server = http.createServer((req, res) => {
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        "Content-Length": stat.size,
        "Content-Type": "video/mp4",
      });
      fs.createReadStream(videoPath).pipe(res);
      return;
    }

    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    });
    file.pipe(res);
  });

  await new Promise((resolve) => server.listen(3888, "127.0.0.1", resolve));
  console.log("Serving video on http://127.0.0.1:3888/video");

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  await page.setContent(`
    <html>
      <body style="margin:0; background:#000; display:flex; align-items:center; justify-content:center; height:100vh;">
        <video id="vid" src="http://127.0.0.1:3888/video" autoplay muted playsinline style="max-width:100%; max-height:100%;"></video>
      </body>
    </html>
  `);

  await page.waitForFunction(() => {
    const v = document.getElementById("vid");
    return v && v.readyState >= 2 && v.duration > 0;
  }, { timeout: 15000 });

  const meta = await page.evaluate(() => {
    const v = document.getElementById("vid");
    return {
      duration: v.duration,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
    };
  });
  console.log("Extracted video metadata:", meta);

  const screenshotDir = path.resolve(__dirname, "screenshots");
  const timestamps = [
    0.1,
    meta.duration * 0.25,
    meta.duration * 0.5,
    meta.duration * 0.75,
    meta.duration * 0.95,
  ];

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    await page.evaluate((seekTime) => {
      const v = document.getElementById("vid");
      v.pause();
      v.currentTime = seekTime;
    }, t);
    await page.waitForTimeout(500);
    const dest = path.join(screenshotDir, `uploaded_video_frame_${i}.png`);
    await page.screenshot({ path: dest });
    console.log(`Captured frame ${i} at ${t.toFixed(2)}s -> ${dest}`);
  }

  await browser.close();
  server.close();
  console.log("Video inspection completed successfully.");
}

main().catch((err) => {
  console.error("Error inspecting video:", err);
  process.exit(1);
});

