import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';

const AdminLoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account_name: '',
    password: '',
  });

  useEffect(() => {
    // 如果已经是 admin 登录状态，直接跳到后台管理页
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.account_name === 'admin') {
        navigate('/admin/dashboard');
      }
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/user/login', {
        identity: formData.account_name,
        password: formData.password,
      });
      
      const user = response.data.data || response.data;
      
      if (user.account_name !== 'admin') {
        setError('权限不足：该页面仅限管理员登录');
        return;
      }

      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', 'admin_token');
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-emerald-900/50 rotate-3">
            <Shield size={28} />
          </div>
        </div>
        <h2 className="text-center text-2xl font-black text-white tracking-tight">
          后台管理系统
        </h2>
        <p className="mt-2 text-center text-sm text-gray-400">
          请输入管理员凭据以继续
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full max-w-md">
        <div className="bg-gray-800/50 backdrop-blur-xl py-8 px-4 shadow-2xl rounded-3xl border border-gray-700/50 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                管理员账号
              </label>
              <div className="mt-1 relative">
                <input
                  type="text"
                  required
                  className="block w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-white text-sm transition-all outline-none"
                  placeholder="admin"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300">
                密码
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-white text-sm transition-all outline-none"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-900/20 p-3 rounded-xl border border-red-900/30">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? '验证中...' : '进入系统'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => navigate('/')}
              className="w-full flex justify-center items-center gap-2 py-2 text-xs font-medium text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ChevronLeft size={14} />
              返回前台首页
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
