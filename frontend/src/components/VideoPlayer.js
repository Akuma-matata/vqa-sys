import React, { useState, useEffect, useRef } from 'react';
import { clipsAPI, questionsAPI } from '../services/api';
import QuestionForm from './QuestionForm';
import { PlayCircle, SkipForward, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';

function VideoPlayer() {
  const [clip, setClip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [clipMarkedDry, setClipMarkedDry] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  
  const videoRef = useRef(null);

  const loadRandomClip = async () => {
    setLoading(true);
    setError(null);
    setClipMarkedDry(false);
    setQuestions([]);
    setShowQuestionForm(false);
    setVideoEnded(false);

    try {
      const response = await clipsAPI.getRandomClip();
      setClip(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load clip');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRandomClip();
  }, []);

  useEffect(() => {
    if (clip && videoRef.current) {
      videoRef.current.currentTime = clip.start_time;
      videoRef.current.play().catch(e => {
        console.error('Failed to play video:', e);
      });
    }
  }, [clip]);

  const handleTimeUpdate = () => {
    if (videoRef.current && clip) {
      if (videoRef.current.currentTime >= clip.end_time) {
        videoRef.current.pause();
        setVideoEnded(true);
      }
    }
  };

  const handleReplay = () => {
    if (videoRef.current && clip) {
      videoRef.current.currentTime = clip.start_time;
      videoRef.current.play();
      setVideoEnded(false);
    }
  };

  const handleMarkDry = async () => {
    if (!clip) return;

    try {
      await clipsAPI.markDry(clip.id);
      setClipMarkedDry(true);
      
      // Load next clip after 2 seconds
      setTimeout(() => {
        loadRandomClip();
      }, 2000);
    } catch (err) {
      console.error('Failed to mark clip as dry:', err);
    }
  };

  const handleQuestionSubmitted = (question) => {
    setQuestions([...questions, question]);
    setShowQuestionForm(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-xl text-gray-400">Loading clip...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 text-red-400" size={48} />
          <p className="text-xl text-red-400 mb-4">{error}</p>
          <button
            onClick={loadRandomClip}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Video Section */}
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl">
            {clip ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={clip.url}
                  className="w-full aspect-video bg-black"
                  onTimeUpdate={handleTimeUpdate}
                  onError={(e) => console.error('Video error:', e)}
                />
                
                {/* Video Controls Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <p className="font-medium">{clip.video_title}</p>
                      <p className="text-gray-400">
                        Clip: {clip.start_time}s - {clip.end_time}s
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleReplay}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        title="Replay"
                      >
                        <RotateCcw size={20} />
                      </button>
                      <button
                        onClick={loadRandomClip}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        title="Next Clip"
                      >
                        <SkipForward size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gray-900">
                <p className="text-gray-400">No clip loaded</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {clip && !clipMarkedDry && (
            <div className="flex gap-4">
              <button
                onClick={() => setShowQuestionForm(true)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <PlayCircle size={20} />
                Add Question
              </button>
              <button
                onClick={handleMarkDry}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Mark as Dry
              </button>
            </div>
          )}

          {clipMarkedDry && (
            <div className="flex items-center justify-center gap-2 py-4 text-yellow-400 bg-yellow-900/20 rounded-lg">
              <CheckCircle size={20} />
              Clip marked as dry. Loading next clip...
            </div>
          )}
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          {showQuestionForm && clip && (
            <QuestionForm
              clipId={clip.id}
              onSubmit={handleQuestionSubmitted}
              onCancel={() => setShowQuestionForm(false)}
            />
          )}

          {/* Questions List */}
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">
              Questions ({questions.length})
            </h3>
            
            {questions.length === 0 ? (
              <p className="text-gray-400">
                No questions yet. Watch the clip and add a question!
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {questions.map((q, index) => (
                  <div key={q.id || index} className="bg-gray-700 rounded-lg p-4">
                    <p className="font-medium mb-2">Q: {q.question_text}</p>
                    <p className="text-gray-300">A: {q.answer_text}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Added {new Date(q.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Prompt for more questions */}
          {questions.length > 0 && !showQuestionForm && !clipMarkedDry && (
            <div className="bg-gray-800 rounded-lg p-6 text-center shadow-xl">
              <p className="mb-4 text-lg">
                Would you like to add another question for this clip?
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => setShowQuestionForm(true)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Yes, Add Another
                </button>
                <button
                  onClick={loadRandomClip}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  No, Next Clip
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;