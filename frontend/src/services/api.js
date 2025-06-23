import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  register: (username, password) => 
    api.post('/auth/register', { username, password }),
  
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
};

// Clips endpoints
export const clipsAPI = {
  getRandomClip: () => 
    api.get('/clips/random'),
  
  markDry: (clipId) => 
    api.post(`/clips/${clipId}/mark-dry`),
  
  getClipDetails: (clipId) => 
    api.get(`/clips/${clipId}`),
};

// Questions endpoints
export const questionsAPI = {
  createQuestion: (clipId, questionText, answerText) => 
    api.post('/questions', { clipId, questionText, answerText }),
  
  getClipQuestions: (clipId) => 
    api.get(`/questions/clip/${clipId}`),
  
  getUserQuestions: () => 
    api.get('/questions/user'),
  
  updateQuestion: (questionId, updates) => 
    api.put(`/questions/${questionId}`, updates),
};

// Videos endpoints
export const videosAPI = {
  getVideos: () => 
    api.get('/videos'),
  
  createVideo: (title, url, durationSeconds) => 
    api.post('/videos', { title, url, durationSeconds }),
  
  getVideoStats: (videoId) => 
    api.get(`/videos/${videoId}/stats`),
};

export default api;