const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const clipService = require('../services/clipService');

const router = express.Router();

// Get random clip
router.get('/random', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const clip = await clipService.getRandomClip(userId);
    
    if (!clip) {
      return res.status(404).json({ error: 'No clips available' });
    }
    
    res.json(clip);
  } catch (error) {
    console.error('Error getting random clip:', error);
    res.status(500).json({ error: 'Failed to get clip' });
  }
});

// Mark clip as dry
router.post('/:id/mark-dry', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Verify clip exists
    const clipResult = await pool.query(
      'SELECT id FROM clips WHERE id = $1',
      [id]
    );
    
    if (clipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    // Update clip
    await pool.query(
      'UPDATE clips SET is_dry = true WHERE id = $1',
      [id]
    );
    
    // Log the action
    await pool.query(
      'INSERT INTO clip_views (clip_id, user_id, session_duration) VALUES ($1, $2, $3)',
      [id, userId, 0]
    );
    
    res.json({ message: 'Clip marked as dry' });
  } catch (error) {
    console.error('Error marking clip as dry:', error);
    res.status(500).json({ error: 'Failed to mark clip as dry' });
  }
});

// Get clip details with questions
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get clip details
    const clipResult = await pool.query(`
      SELECT c.*, v.url, v.title as video_title
      FROM clips c
      JOIN videos v ON c.video_id = v.id
      WHERE c.id = $1
    `, [id]);
    
    if (clipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    const clip = clipResult.rows[0];
    
    // Get questions for this clip
    const questionsResult = await pool.query(`
      SELECT q.*, u.username
      FROM questions q
      JOIN users u ON q.user_id = u.id
      WHERE q.clip_id = $1
      ORDER BY q.created_at DESC
    `, [id]);
    
    clip.questions = questionsResult.rows;
    
    res.json(clip);
  } catch (error) {
    console.error('Error getting clip details:', error);
    res.status(500).json({ error: 'Failed to get clip details' });
  }
});

module.exports = router;