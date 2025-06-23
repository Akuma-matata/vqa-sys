const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDatabase = async () => {
  try {
    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        duration_seconds INTEGER NOT NULL,
        total_clips_generated INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clips (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        is_dry BOOLEAN DEFAULT FALSE,
        served_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT valid_clip_duration CHECK (end_time - start_time = 10)
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clip_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        viewed_at TIMESTAMP DEFAULT NOW(),
        session_duration INTEGER
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        quality_score INTEGER DEFAULT 0
      )
    `);
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clip_user ON clip_views(clip_id, user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clip_questions ON questions(clip_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_clips_served ON clips(served_count, is_dry)');
    
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

module.exports = { pool, initDatabase };