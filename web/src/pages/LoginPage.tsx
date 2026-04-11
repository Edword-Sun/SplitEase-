import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Phone, ShieldCheck } from 'lucide-react';
import api from '../api/client';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    account_name: '',
    password: '',
    email: '',
    phone_number: '',
    is_simple: 1, // 1: standard (false), 2: simple (true)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // According to user: POST /login accepts { identity, password }
        const response = await api.post('/user/login', {
          identity: formData.account_name,
          password: formData.password,
        });
        
        // Mock token since actual API might not return it based on README
        const user = response.data.data || response.data;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'mock_token');
        navigate('/');
      } else {
        // According to router/user.go: POST /register
        const registerData = {
          user: {
            name: formData.name,
            account_name: formData.account_name,
            password: formData.password,
            email: formData.email,
            phone_number: formData.phone_number,
          },
          is_simple: formData.is_simple,
        };
        const response = await api.post('/user/register', registerData);
        const user = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'mock_token');
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-xl bg-blue-100 text-blue-600 mb-4">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isLogin ? '欢迎回来' : '开启分账之旅'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isLogin ? '登录以管理您的分账记录' : '注册 SplitEase 账户'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="请输入昵称"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">账号</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="请输入账号"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_simple"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={formData.is_simple === 2}
                  onChange={(e) => setFormData({ ...formData, is_simple: e.target.checked ? 2 : 1 })}
                />
                <label htmlFor="is_simple" className="text-sm text-gray-600 font-medium">
                  启用简易模式 (跳过密码规范校验)
                </label>
              </div>
            )}

            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    邮箱 <span className="text-gray-400 font-normal">(可选)</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="email"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="请输入邮箱"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    手机号 <span className="text-gray-400 font-normal">(可选)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="tel"
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="请输入手机号"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
            >
              {loading ? '正在处理...' : isLogin ? '立即登录' : '注册账号'}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400 font-bold tracking-wider">或者</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;
                const guestUser = {
                  id: guestId,
                  name: `游客_${guestId.substring(6)}`,
                  account_name: 'guest',
                  email: 'guest@splitease.com',
                  phone_number: '00000000000',
                  isGuest: true
                };
                localStorage.setItem('user', JSON.stringify(guestUser));
                localStorage.setItem('token', 'guest_token');
                navigate('/');
              }}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border-2 border-gray-100 text-sm font-bold rounded-xl text-gray-600 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all active:scale-[0.98]"
            >
              <span>以游客身份进入</span>
            </button>
          </div>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-blue-600 hover:text-blue-500 font-medium"
          >
            {isLogin ? '没有账号？立即注册' : '已有账号？返回登录'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
