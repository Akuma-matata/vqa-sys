const { pool } = require('../config/database');

class AnalyticsService {
  async getClipAnalytics(timeRange = '7d') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await pool.query(`
        SELECT 
          COUNT(DISTINCT c.id) as total_clips,
          COUNT(DISTINCT c.id) FILTER (WHERE c.is_dry = true) as dry_clips,
          AVG(question_count) as avg_questions_per_clip,
          SUM(c.served_count) as total_views,
          COUNT(DISTINCT cv.user_id) as unique_viewers
        FROM clips c
        LEFT JOIN (
          SELECT clip_id, COUNT(*) as question_count
          FROM questions
          WHERE created_at >= $1
          GROUP BY clip_id
        ) q ON c.id = q.clip_id
        LEFT JOIN clip_views cv ON c.id = cv.clip_id AND cv.viewed_at >= $1
        WHERE c.created_at >= $1
      `, [timeFilter]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in getClipAnalytics:', error);
      throw error;
    }
  }
  
  async getUserEngagement(timeRange = '7d') {
    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      const result = await pool.query(`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT u.id) FILTER (WHERE u.last_login >= NOW() - INTERVAL '24 hours') as active_today,
          AVG(user_stats.question_count) as avg_questions_per_user,
          AVG(user_stats.session_count) as avg_sessions_per_user
        FROM users u
        LEFT JOIN (
          SELECT 
            user_id,
            COUNT(DISTINCT q.id) as question_count,
            COUNT(DISTINCT DATE(cv.viewed_at)) as session_count
          FROM users u2
          LEFT JOIN questions q ON u2.id = q.user_id AND q.created_at >= $1
          LEFT JOIN clip_views cv ON u2.id = cv.user_id AND cv.viewed_at >= $1
          GROUP BY user_id
        ) user_stats ON u.id = user_stats.user_id
        WHERE u.created_at <= $1 OR u.last_login >= $1
      `, [timeFilter]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in getUserEngagement:', error);
      throw error;
    }
  }
  
  async getQuestionQuality() {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_questions,
          AVG(LENGTH(question_text)) as avg_question_length,
          AVG(LENGTH(answer_text)) as avg_answer_length,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(question_text)) as median_question_length,
          PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(answer_text)) as median_answer_length
        FROM questions
      `);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error in getQuestionQuality:', error);
      throw error;
    }
  }
  
  async getVideoPerformance() {
    try {
      const result = await pool.query(`
        SELECT 
          v.id,
          v.title,
          v.duration_seconds,
          COUNT(DISTINCT c.id) as total_clips,
          COUNT(DISTINCT c.id) FILTER (WHERE c.is_dry = true) as dry_clips,
          COUNT(DISTINCT q.id) as total_questions,
          AVG(c.served_count) as avg_clip_views,
          COUNT(DISTINCT cv.user_id) as unique_viewers,
          CASE 
            WHEN COUNT(DISTINCT c.id) > 0 
            THEN COUNT(DISTINCT q.id)::FLOAT / COUNT(DISTINCT c.id)
            ELSE 0 
          END as questions_per_clip_ratio
        FROM videos v
        LEFT JOIN clips c ON v.id = c.video_id
        LEFT JOIN questions q ON c.id = q.clip_id
        LEFT JOIN clip_views cv ON c.id = cv.clip_id
        GROUP BY v.id
        ORDER BY questions_per_clip_ratio DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error in getVideoPerformance:', error);
      throw error;
    }
  }
  
  async getHourlyActivity() {
    try {
      const result = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM viewed_at) as hour,
          COUNT(*) as view_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM clip_views
        WHERE viewed_at >= NOW() - INTERVAL '7 days'
        GROUP BY hour
        ORDER BY hour
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Error in getHourlyActivity:', error);
      throw error;
    }
  }
  
  getTimeFilter(timeRange) {
    const now = new Date();
    switch (timeRange) {
      case '24h':
        return new Date(now - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new AnalyticsService();