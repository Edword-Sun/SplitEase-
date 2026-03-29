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
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // According to README: POST /login
        const response = await api.post('/user/login', {
          account_name: formData.account_name,
          password: formData.password,
        });
        
        // Mock token since actual API might not return it based on README
        const user = response.data;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'mock_token');
        navigate('/');
      } else {
        // According to README: POST /register
        const response = await api.post('/user/register', formData);
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
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="email"
                      required
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="请输入邮箱"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="tel"
                      required
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
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {loading ? '正在处理...' : isLogin ? '立即登录' : '注册账号'}
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
