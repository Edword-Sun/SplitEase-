import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, User as UserIcon, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { User } from '../types';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            <div 
              className="flex items-center gap-2 cursor-pointer group" 
              onClick={() => navigate('/')}
            >
              <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-100 group-hover:scale-110 transition-all duration-300">
                <span className="text-base font-black italic">S</span>
              </div>
              <h1 className="text-lg font-black text-gray-900 tracking-tighter group-hover:text-blue-600 transition-colors">
                SplitEase
              </h1>
            </div>
            
            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => navigate('/')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                  location.pathname === '/' 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Home size={18} />
                <span>首页</span>
              </button>
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate('/profile')}
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-all hover:shadow-md active:scale-95 ${
                location.pathname === '/profile'
                  ? 'bg-blue-600 border-transparent text-white shadow-lg shadow-blue-100'
                  : 'bg-white border-gray-100 text-gray-700 hover:border-blue-200'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                location.pathname === '/profile' ? 'bg-white/20' : 'bg-blue-50 text-blue-500'
              }`}>
                <UserIcon size={12} />
              </div>
              <div className="flex flex-col items-start leading-none min-w-0">
                <span className="text-[10px] font-black truncate max-w-[80px]">我({user.name})</span>
                {(user as any).isGuest && <span className="text-[7px] font-black uppercase tracking-tighter text-emerald-400">游客</span>}
              </div>
            </button>

            <div className="w-[1px] h-5 bg-gray-100 mx-1"></div>

            <button 
              onClick={handleLogout}
              className="p-2 text-gray-300 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all duration-300 active:scale-90"
              title="退出登录"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-4 w-full animate-in fade-in duration-500">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-50 py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-2 opacity-50">
            <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center text-white">
              <span className="text-xs font-black italic">S</span>
            </div>
            <span className="text-sm font-black text-gray-900 tracking-tight">SplitEase</span>
          </div>
          <div className="w-[1px] h-4 bg-gray-100 hidden sm:block"></div>
          <p className="text-gray-400 text-xs font-medium">
            © 2026 SplitEase - 为旅行而生的智能分账助手
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
