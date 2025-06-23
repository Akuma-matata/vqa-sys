import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User } from 'lucide-react';

function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Video Q&A Platform</h1>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <User size={20} />
              <span>{user?.username}</span>
            </div>
            
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;