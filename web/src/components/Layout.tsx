import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Home, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { User } from '../types';

const Layout = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-blue-600 cursor-pointer" onClick={() => navigate('/')}>
              SplitEase
            </h1>
            <nav className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/')}
                className="flex items-center gap-1 text-gray-600 hover:text-blue-600 font-medium text-sm"
              >
                <Home size={18} />
                <span>首页</span>
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-700">
              <UserIcon size={18} />
              <span className="text-sm font-medium">{user.name}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
              title="登出"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-8 w-full">
        <Outlet />
      </main>

      <footer className="bg-white border-t py-6">
        <div className="max-w-4xl mx-auto px-4 text-center text-gray-400 text-xs">
          © 2026 SplitEase - 智能分账助手
        </div>
      </footer>
    </div>
  );
};

export default Layout;
