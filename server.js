const express = require('express');
const path = require('path');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

// Set up Google Cloud Storage
const storage = new Storage({
  keyFilename: 'credentials.json',
  projectId: 'cse4265-2024-101481573',
});
const bucketName = 'cse4265-2024-101481573.appspot.com';

// Serve static files (e.g., HTML, CSS, JS) from the "public" directory
// app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send('<h1>Welcome to my server!</h1>');
});

// http://localhost:8080/C2_2/manifest.mpd
// https://cse4265-2024-101481573.lm.r.appspot.com/C2_2/manifest.mpd
app.get('/:foldername/:filename', async (req, res) => {

  try {
    const folderName = req.params.foldername
    const fileName = req.params.filename
    const bucket = storage.bucket(bucketName);
    const fullFilePath = `${folderName}/${fileName}`;
    const file = bucket.file(fullFilePath);

    // 使用 Google Cloud Storage 的 `createReadStream` 来读取文件
    const readStream = file.createReadStream();

    // 设置正确的 MIME 类型，假设你的文件是 MPD 文件
    res.setHeader('Content-Type', 'application/xml');

    // 通过管道将文件流传递给响应对象
    readStream.pipe(res);

    // 处理读取流的错误
    readStream.on('error', (err) => {
      console.error('Error reading file from Cloud Storage:', err);
      res.status(500).send('Error reading file');
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Failed to process request.');
  }
});

// http://localhost:8080/player
// https://cse4265-2024-101481573.lm.r.appspot.com/player
app.get('/player', async (req, res) => {

  try {

    let html_path = path.join(__dirname, 'dash_player.html');

    res.sendFile(html_path);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Failed to process request.');
  }
});

app.get('/playerv2', async (req, res) => {

  try {

    let html_path = path.join(__dirname, 'dash_player_v2.html');

    res.sendFile(html_path);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Failed to process request.');
  }
});

app.get('/playerv3', async (req, res) => {

  try {

    let html_path = path.join(__dirname, 'dash_player_v3.html');

    res.sendFile(html_path);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Failed to process request.');
  }
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


app.get('/video/cdn/:filename', async (req, res) => {

  try {
    // const folderName = req.params.foldername
    const fileName = req.params.filename
    const bucket = storage.bucket(bucketName);
    const fullFilePath = `hfr_dash_video/${fileName}`;
    const file = bucket.file(fullFilePath);

    // 使用 Google Cloud Storage 的 `createReadStream` 来读取文件
    const readStream = file.createReadStream();

    // 设置正确的 MIME 类型，假设你的文件是 MPD 文件
    res.setHeader('Content-Type', 'application/xml');

    // 通过管道将文件流传递给响应对象
    readStream.pipe(res);

    // 处理读取流的错误
    readStream.on('error', (err) => {
      console.error('Error reading file from Cloud Storage:', err);
      res.status(500).send('Error reading file');
    });

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Failed to process request.');
  }
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});