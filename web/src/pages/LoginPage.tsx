import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User as UserIcon, Phone, ShieldCheck, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';

const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    account_name: '',
    password: '',
    email: '',
    phone_number: '',
    is_simple: 2, // 1: strong security (false), 2: simple (true)
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const response = await api.post('/user/login', {
          identity: formData.account_name,
          password: formData.password,
        });
        
        const user = response.data.data || response.data;
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', 'mock_token');
        navigate('/');
      } else {
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
        await api.post('/user/register', registerData);
        setSuccessMessage('注册成功！正在跳转首页...');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-4 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex justify-center mb-4 sm:mb-8">
          <div className="w-10 h-10 sm:w-16 sm:h-16 bg-blue-600 rounded-[16px] sm:rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-blue-200 rotate-3">
            <span className="text-xl sm:text-3xl font-black italic">S</span>
          </div>
        </div>
        <h2 className="text-center text-xl sm:text-3xl font-black text-gray-900 tracking-tight">
          {isLogin ? '欢迎回来' : '开启分账之旅'}
        </h2>
        <p className="mt-1 sm:mt-2 text-center text-xs sm:text-base text-gray-500 font-medium">
          {isLogin ? '登录以管理您的分账记录' : '注册 SplitEase 账户'}
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-2xl shadow-gray-200/50 rounded-[24px] sm:rounded-[32px] border border-gray-100 relative">
          {!isLogin && (
            <button
              onClick={() => setIsLogin(true)}
              className="absolute left-5 top-6 sm:left-6 sm:top-8 flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-all font-bold group"
            >
              <ChevronLeft size={18} className="sm:w-5 sm:h-5 group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs sm:text-sm">返回</span>
            </button>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  昵称 <span className="text-gray-400 text-xs font-normal">(系统中显示的名字)</span> <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-[18px] sm:h-[18px]" size={16} />
                  <input
                    type="text"
                    required
                    className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-100 bg-white rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                    placeholder="请输入昵称"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                账号 {!isLogin && <span className="text-gray-400 text-[10px] sm:text-xs font-normal">(登入的账号名)</span>} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-[18px] sm:h-[18px]" size={16} />
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-2 sm:py-2.5 border border-gray-100 bg-white rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  placeholder="请输入账号"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                密码 {!isLogin && <span className="text-gray-400 text-[10px] sm:text-xs font-normal">(登入的密码)</span>} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-[18px] sm:h-[18px]" size={16} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-10 pr-12 py-2 sm:py-2.5 border border-gray-100 bg-white rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base text-gray-900"
                  placeholder="请输入密码"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <Eye size={18} className="sm:w-5 sm:h-5" /> : <EyeOff size={18} className="sm:w-5 sm:h-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_simple"
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  checked={formData.is_simple === 1}
                  onChange={(e) => setFormData({ ...formData, is_simple: e.target.checked ? 1 : 2 })}
                />
                <label htmlFor="is_simple" className="text-sm text-gray-600 font-medium">
                    强密码模式 (验证密码规范)
                  </label>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
              {successMessage}
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

          {isLogin && (
            <>
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
                >
                  注册
                </button>
              </div>

              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/forget-password')}
                  className="group relative w-[40%] flex justify-center py-2 px-4 text-sm font-bold rounded-xl text-gray-400 hover:text-blue-600 bg-transparent transition-all active:scale-[0.98]"
                >
                  忘记密码
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
                  <span>游客身份</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  </div>
);
};

export default LoginPage;
