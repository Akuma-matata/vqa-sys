const express = require('express');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create question
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { clipId, questionText, answerText } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!clipId || !questionText || !answerText) {
      return res.status(400).json({ error: 'Clip ID, question, and answer are required' });
    }
    
    if (questionText.length < 5 || questionText.length > 500) {
      return res.status(400).json({ error: 'Question must be between 5 and 500 characters' });
    }
    
    if (answerText.length < 2 || answerText.length > 1000) {
      return res.status(400).json({ error: 'Answer must be between 2 and 1000 characters' });
    }
    
    // Verify clip exists
    const clipResult = await pool.query(
      'SELECT id FROM clips WHERE id = $1',
      [clipId]
    );
    
    if (clipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clip not found' });
    }
    
    // Insert question
    const result = await pool.query(
      `INSERT INTO questions (clip_id, user_id, question_text, answer_text) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, clip_id, user_id, question_text, answer_text, created_at`,
      [clipId, userId, questionText, answerText]
    );
    
    const question = result.rows[0];
    
    // Update clip to not dry if it was marked as dry
    await pool.query(
      'UPDATE clips SET is_dry = false WHERE id = $1 AND is_dry = true',
      [clipId]
    );
    
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Get questions for a clip
router.get('/clip/:clipId', authenticateToken, async (req, res) => {
  try {
    const { clipId } = req.params;
    
    const result = await pool.query(
      `SELECT q.*, u.username 
       FROM questions q 
       JOIN users u ON q.user_id = u.id 
       WHERE q.clip_id = $1 
       ORDER BY q.created_at DESC`,
      [clipId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting questions:', error);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Get user's questions
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT q.*, c.start_time, c.end_time, v.title as video_title
       FROM questions q
       JOIN clips c ON q.clip_id = c.id
       JOIN videos v ON c.video_id = v.id
       WHERE q.user_id = $1
       ORDER BY q.created_at DESC
       LIMIT 50`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting user questions:', error);
    res.status(500).json({ error: 'Failed to get user questions' });
  }
});

// Update question (own questions only)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { questionText, answerText } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!questionText && !answerText) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    // Check ownership
    const ownershipResult = await pool.query(
      'SELECT user_id FROM questions WHERE id = $1',
      [id]
    );
    
    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    if (ownershipResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You can only edit your own questions' });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (questionText) {
      updates.push(`question_text = $${paramCount}`);
      values.push(questionText);
      paramCount++;
    }
    
    if (answerText) {
      updates.push(`answer_text = $${paramCount}`);
      values.push(answerText);
      paramCount++;
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE questions SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

module.exports = router;