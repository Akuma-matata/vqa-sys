const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all videos (admin only - for now all authenticated users)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, COUNT(c.id) as clip_count
       FROM videos v
       LEFT JOIN clips c ON v.id = c.video_id
       GROUP BY v.id
       ORDER BY v.uploaded_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting videos:', error);
    res.status(500).json({ error: 'Failed to get videos' });
  }
});

// Add new video and generate clips
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, url, durationSeconds } = req.body;
    
    // Validate input
    if (!title || !url || !durationSeconds) {
      return res.status(400).json({ error: 'Title, URL, and duration are required' });
    }
    
    if (durationSeconds < 10) {
      return res.status(400).json({ error: 'Video must be at least 10 seconds long' });
    }
    
    if (durationSeconds > 1020) { // 17 minutes max
      return res.status(400).json({ error: 'Video cannot be longer than 17 minutes' });
    }
    
    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert video
      const videoResult = await client.query(
        'INSERT INTO videos (title, url, duration_seconds) VALUES ($1, $2, $3) RETURNING *',
        [title, url, durationSeconds]
      );
      
      const video = videoResult.rows[0];
      
      // Generate all possible 10-second clips
      const clips = [];
      for (let start = 0; start <= durationSeconds - 10; start++) {
        clips.push({
          video_id: video.id,
          start_time: start,
          end_time: start + 10
        });
      }
      
      // Bulk insert clips
      if (clips.length > 0) {
        const values = clips.map((clip, index) => {
          const base = index * 3;
          return `($${base + 1}, $${base + 2}, $${base + 3})`;
        }).join(',');
        
        const params = clips.flatMap(clip => [clip.video_id, clip.start_time, clip.end_time]);
        
        await client.query(
          `INSERT INTO clips (video_id, start_time, end_time) VALUES ${values}`,
          params
        );
        
        // Update video with clip count
        await client.query(
          'UPDATE videos SET total_clips_generated = $1 WHERE id = $2',
          [clips.length, video.id]
        );
      }
      
      await client.query('COMMIT');
      
      res.status(201).json({
        video: { ...video, total_clips_generated: clips.length },
        clipsGenerated: clips.length
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Failed to create video and clips' });
  }
});

// Get video statistics
router.get('/:id/stats', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        v.*,
        COUNT(DISTINCT c.id) as total_clips,
        COUNT(DISTINCT c.id) FILTER (WHERE c.is_dry = true) as dry_clips,
        COUNT(DISTINCT q.id) as total_questions,
        COUNT(DISTINCT cv.user_id) as unique_viewers,
        SUM(c.served_count) as total_views
      FROM videos v
      LEFT JOIN clips c ON v.id = c.video_id
      LEFT JOIN questions q ON c.id = q.clip_id
      LEFT JOIN clip_views cv ON c.id = cv.clip_id
      WHERE v.id = $1
      GROUP BY v.id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting video stats:', error);
    res.status(500).json({ error: 'Failed to get video statistics' });
  }
});

module.exports = router;