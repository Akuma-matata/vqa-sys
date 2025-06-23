const { pool } = require('../config/database');

class ClipService {
  async getRandomClip(userId) {
    try {
      // Get a random clip, preferring less-viewed ones
      // Using weighted random selection based on served_count
      const result = await pool.query(`
        SELECT c.*, v.url, v.title as video_title
        FROM clips c
        JOIN videos v ON c.video_id = v.id
        WHERE c.is_dry = false
        ORDER BY 
          c.served_count ASC,
          RANDOM()
        LIMIT 1
      `);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const clip = result.rows[0];
      
      // Update served count
      await pool.query(
        'UPDATE clips SET served_count = served_count + 1 WHERE id = $1',
        [clip.id]
      );
      
      // Record clip view
      await pool.query(
        'INSERT INTO clip_views (clip_id, user_id) VALUES ($1, $2)',
        [clip.id, userId]
      );
      
      return clip;
    } catch (error) {
      console.error('Error in getRandomClip:', error);
      throw error;
    }
  }
  
  async getClipsByTimeRange(videoId, startTime, endTime) {
    try {
      const result = await pool.query(
        `SELECT * FROM clips 
         WHERE video_id = $1 
         AND start_time >= $2 
         AND end_time <= $3
         ORDER BY start_time`,
        [videoId, startTime, endTime]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error in getClipsByTimeRange:', error);
      throw error;
    }
  }
  
  async getOverlappingClips(videoId, startTime, endTime) {
    try {
      const result = await pool.query(
        `SELECT * FROM clips 
         WHERE video_id = $1 
         AND (
           (start_time >= $2 AND start_time < $3) OR
           (end_time > $2 AND end_time <= $3) OR
           (start_time <= $2 AND end_time >= $3)
         )
         ORDER BY start_time`,
        [videoId, startTime, endTime]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error in getOverlappingClips:', error);
      throw error;
    }
  }
  
  async markClipQuality(clipId, qualityScore) {
    try {
      await pool.query(
        'UPDATE clips SET quality_score = $1 WHERE id = $2',
        [qualityScore, clipId]
      );
    } catch (error) {
      console.error('Error in markClipQuality:', error);
      throw error;
    }
  }
  
  async getPopularClips(limit = 10) {
    try {
      const result = await pool.query(
        `SELECT 
          c.*,
          v.title as video_title,
          COUNT(DISTINCT q.id) as question_count,
          COUNT(DISTINCT cv.user_id) as unique_viewers
         FROM clips c
         JOIN videos v ON c.video_id = v.id
         LEFT JOIN questions q ON c.id = q.clip_id
         LEFT JOIN clip_views cv ON c.id = cv.clip_id
         WHERE c.is_dry = false
         GROUP BY c.id, v.title
         HAVING COUNT(DISTINCT q.id) > 0
         ORDER BY question_count DESC, c.served_count DESC
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error in getPopularClips:', error);
      throw error;
    }
  }
}

module.exports = new ClipService();