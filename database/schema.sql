-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

-- Videos table
CREATE TABLE videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 10 AND duration_seconds <= 1020),
    total_clips_generated INTEGER DEFAULT 0,
    uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Clips table
CREATE TABLE clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    start_time INTEGER NOT NULL CHECK (start_time >= 0),
    end_time INTEGER NOT NULL,
    is_dry BOOLEAN DEFAULT FALSE,
    served_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT valid_clip_duration CHECK (end_time - start_time = 10),
    CONSTRAINT valid_clip_range CHECK (end_time > start_time)
);

-- Clip views table for tracking
CREATE TABLE clip_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT NOW(),
    session_duration INTEGER
);

-- Questions table
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL CHECK (LENGTH(question_text) >= 5 AND LENGTH(question_text) <= 500),
    answer_text TEXT NOT NULL CHECK (LENGTH(answer_text) >= 2 AND LENGTH(answer_text) <= 1000),
    created_at TIMESTAMP DEFAULT NOW(),
    quality_score INTEGER DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100)
);

-- Create indexes for better performance
CREATE INDEX idx_clip_user ON clip_views(clip_id, user_id);
CREATE INDEX idx_clip_questions ON questions(clip_id);
CREATE INDEX idx_clips_served ON clips(served_count, is_dry);
CREATE INDEX idx_clips_video ON clips(video_id);
CREATE INDEX idx_questions_user ON questions(user_id);
CREATE INDEX idx_clip_views_date ON clip_views(viewed_at);
CREATE INDEX idx_users_username ON users(username);

-- Sample data insertion (optional)
-- Insert a test video
INSERT INTO videos (title, url, duration_seconds) 
VALUES ('Sample Educational Video', 'https://example.com/video.mp4', 180);

-- Generate clips for the video (this would be done programmatically)
-- This creates clips from 0-10, 1-11, 2-12... up to 170-180
DO $$
DECLARE
    video_id UUID;
    i INTEGER;
BEGIN
    SELECT id INTO video_id FROM videos LIMIT 1;
    
    FOR i IN 0..170 LOOP
        INSERT INTO clips (video_id, start_time, end_time)
        VALUES (video_id, i, i + 10);
    END LOOP;
    
    UPDATE videos SET total_clips_generated = 171 WHERE id = video_id;
END $$;