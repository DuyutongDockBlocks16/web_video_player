const express = require('express');
const { Storage } = require('@google-cloud/storage');
const fs = require('fs')
const path = require('path');
const os = require('os');


const app = express();
const PORT = process.env.PORT || 8080;

// Set up Google Cloud Storage
const storage = new Storage({
  keyFilename: 'credentials.json',
  projectId: 'cse4265-2024-101481573', // FIXME: put your projectID here
});
const bucketName = 'cse4265-2024-101481573.appspot.com'; // FIXME: put your bucket name here


// Route to serve video files from root
app.get('/video/:filename', async (req, res, next) => {
  try {
    // 1. Retrieve file name from request parameters
    const fileName = req.params.filename;

    // 2. Retrieve the file from storage bucket
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileName);

    // 3. Pipe the read stream to the response
    const readStream = file.createReadStream();

    // Set headers for the response
    res.setHeader('Content-Type', 'video/mp4'); // 假设视频为MP4格式，根据需要调整
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);

    // Handle errors
    readStream.on('error', (err) => {
      console.error('Error reading the file:', err);
      res.status(500).send('Failed to stream video.');
    });

    // Pipe the file stream to the response
    readStream.pipe(res);

  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).send('Failed to process request.');
  }
});
              // TODO:
              // 1. retrieve file name from request parameters
              // 2. retireve the file from storage bucket
              // 3. Pipe the read stream to the response >> https://cloud.google.com/storage/docs/streaming-downloads


// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});