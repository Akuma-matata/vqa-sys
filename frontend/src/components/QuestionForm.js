import React, { useState } from 'react';
import { questionsAPI } from '../services/api';
import { AlertCircle, Send, X } from 'lucide-react';

function QuestionForm({ clipId, onSubmit, onCancel }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
    if (!question.trim() || !answer.trim()) {
      setError('Please fill in both question and answer');
      return;
    }

    if (question.length < 5) {
      setError('Question must be at least 5 characters');
      return;
    }

    if (answer.length < 2) {
      setError('Answer must be at least 2 characters');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const response = await questionsAPI.createQuestion(
        clipId,
        question.trim(),
        answer.trim()
      );
      
      onSubmit(response.data);
      
      // Reset form
      setQuestion('');
      setAnswer('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Add a Question</h3>
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Question
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-colors"
            rows={3}
            placeholder="What question can be answered from this clip?"
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {question.length}/500 characters
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Answer
          </label>
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-colors"
            rows={4}
            placeholder="Provide the answer based on the clip content"
            maxLength={1000}
          />
          <p className="text-xs text-gray-500 mt-1">
            {answer.length}/1000 characters
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm bg-red-900/20 p-3 rounded-lg">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              'Submitting...'
            ) : (
              <>
                <Send size={18} />
                Submit Question
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      <div className="mt-4 p-3 bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-400">
          💡 Tip: Create questions that can be answered specifically from what you observed in this 10-second clip.
        </p>
      </div>
    </div>
  );
}

export default QuestionForm;