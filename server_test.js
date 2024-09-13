const express = require('express');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

// ffmpeg -i demo.mp4 -c:v libx265 -g 120 -keyint_min 120 -sc_threshold 0 -c:a copy -movflags +faststart demo_h265.mp4
// Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(progressive), 1280x720 [SAR 1:1 DAR 16:9], 600 kb/s, 30 fps, 30 tbr, 15360 tbn (default)

const app = express();
const PORT = process.env.PORT || 8080;

// Set up Google Cloud Storage
const storage = new Storage({
    keyFilename: 'credentials.json',
    projectId: 'cse4265-2024-101481573',
});
const bucketName = 'cse4265-2024-101481573.appspot.com';

// Serve static files (e.g., HTML, CSS, JS) from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.send('<h1>Welcome to my server!</h1>');
});

// Route to serve video files from Google Cloud Storage
app.get('/video/:filename', async (req, res) => {
    try {
        const fileName = req.params.filename;
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(fileName);

        const range = req.headers.range;
        if (range) {
            const [start, end] = range.replace(/bytes=/, "").split("-").map(Number);
            const startByte = start || 0;

            const [metadata] = await file.getMetadata();
            const fileSize = metadata.size;
            const endByte = end || fileSize - 1;

            if (startByte >= fileSize) {
                res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
                return res.end();
            }

            res.status(206);
            res.setHeader('Content-Range', `bytes ${startByte}-${endByte}/${fileSize}`);
            res.setHeader('Accept-Ranges', 'bytes');
            res.setHeader('Content-Length', endByte - startByte + 1);
            res.setHeader('Content-Type', 'video/mp4');

            const readStream = file.createReadStream({ start: startByte, end: endByte });
            readStream.on('error', (err) => {
                console.error('Error reading the file:', err);
                res.status(500).send('Failed to stream video.');
            });
            readStream.pipe(res);
        } else {
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
            const readStream = file.createReadStream();
            readStream.on('error', (err) => {
                console.error('Error reading the file:', err);
                res.status(500).send('Failed to stream video.');
            });
            readStream.pipe(res);
        }
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).send('Failed to process request.');
    }
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
