#!/usr/bin/env node

/**
 * Video Upload Script
 * 
 * This script allows bulk uploading of videos to the Video Q&A Platform.
 * It reads video metadata from a CSV file and creates videos with clips.
 * 
 * Usage: node upload-videos.js <csv-file> <api-url> <auth-token>
 * 
 * CSV Format:
 * title,url,duration_seconds
 * "Introduction to Physics","https://youtube.com/watch?v=abc123",300
 * "Chemistry Basics","https://youtube.com/watch?v=def456",420
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const csv = require('csv-parser');

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error('Usage: node upload-videos.js <csv-file> <api-url> <auth-token>');
  console.error('Example: node upload-videos.js videos.csv http://localhost:3001/api your-jwt-token');
  process.exit(1);
}

const [csvFile, apiUrl, authToken] = args;

// Validate CSV file exists
if (!fs.existsSync(csvFile)) {
  console.error(`Error: CSV file "${csvFile}" not found`);
  process.exit(1);
}

// Configure axios
const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  }
});

// Video upload function
async function uploadVideo(video) {
  try {
    console.log(`Uploading: ${video.title}`);
    
    const response = await api.post('/videos', {
      title: video.title,
      url: video.url,
      durationSeconds: parseInt(video.duration_seconds)
    });
    
    console.log(`✅ Success: ${video.title} - ${response.data.clipsGenerated} clips generated`);
    return { success: true, video: response.data };
  } catch (error) {
    console.error(`❌ Failed: ${video.title} - ${error.response?.data?.error || error.message}`);
    return { success: false, error: error.message };
  }
}

// Main function
async function main() {
  const videos = [];
  const results = {
    successful: 0,
    failed: 0,
    totalClips: 0
  };
  
  console.log('🎥 Video Q&A Platform - Bulk Video Upload');
  console.log('=========================================');
  console.log(`Reading CSV file: ${csvFile}`);
  console.log(`API URL: ${apiUrl}`);
  console.log('');
  
  // Read CSV file
  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFile)
      .pipe(csv())
      .on('data', (row) => {
        // Validate row data
        if (row.title && row.url && row.duration_seconds) {
          videos.push({
            title: row.title.trim(),
            url: row.url.trim(),
            duration_seconds: row.duration_seconds.trim()
          });
        } else {
          console.warn('⚠️  Skipping invalid row:', row);
        }
      })
      .on('end', resolve)
      .on('error', reject);
  });
  
  console.log(`Found ${videos.length} videos to upload\n`);
  
  // Upload videos with rate limiting
  for (const video of videos) {
    const result = await uploadVideo(video);
    
    if (result.success) {
      results.successful++;
      results.totalClips += result.video.clipsGenerated;
    } else {
      results.failed++;
    }
    
    // Rate limiting - wait 1 second between uploads
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Print summary
  console.log('\n📊 Upload Summary');
  console.log('=================');
  console.log(`Total videos processed: ${videos.length}`);
  console.log(`Successful uploads: ${results.successful}`);
  console.log(`Failed uploads: ${results.failed}`);
  console.log(`Total clips generated: ${results.totalClips}`);
  
  // Create report file
  const reportFile = `upload-report-${Date.now()}.json`;
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    csvFile,
    apiUrl,
    results,
    videos
  }, null, 2));
  
  console.log(`\n📄 Detailed report saved to: ${reportFile}`);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

// Run the script
main().catch(console.error);

/**
 * Sample CSV file (videos.csv):
 * 
 * title,url,duration_seconds
 * "Introduction to Physics - Newton's Laws","https://www.youtube.com/watch?v=kHSJk8R0H_Q",420
 * "Chemistry Basics - Periodic Table","https://www.youtube.com/watch?v=VgOXJmd4JgI",360
 * "Mathematics - Calculus Fundamentals","https://www.youtube.com/watch?v=WUvTyaaNkzM",540
 * "Biology - Cell Structure","https://www.youtube.com/watch?v=URUJD5NEXC8",300
 * "Computer Science - Algorithms","https://www.youtube.com/watch?v=8hly31xKli0",480
 */