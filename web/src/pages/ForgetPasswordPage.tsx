import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ChevronLeft, ShieldCheck, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import api from '../api/client';

const ForgetPasswordPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    account_name: '',
    new_password: '',
    confirm_password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      setMessage({ type: 'error', text: '两次输入的密码不一致' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // 假设后端有一个重置密码的接口，这里根据常规逻辑模拟
      // 如果没有接口，这里仅做 UI 演示
      await api.post('/user/reset_pwd', {
        account_name: formData.account_name,
        password: formData.new_password,
      });
      
      setMessage({ type: 'success', text: '密码重置成功，请重新登录' });
      setTimeout(() => navigate('/login'), 1000);
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '重置失败，账号不存在或服务器错误' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <button 
          onClick={() => navigate('/login')}
          className="mb-4 sm:mb-8 flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors font-medium text-sm sm:text-base"
        >
          <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
          <span>返回登录</span>
        </button>

        <div className="bg-white py-6 px-5 sm:py-8 sm:px-10 shadow-2xl shadow-gray-200/50 rounded-[24px] sm:rounded-[32px] border border-gray-100">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-xl sm:rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-3 sm:mb-4">
              <ShieldCheck size={28} className="sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">找回密码</h2>
            <p className="text-gray-500 mt-1 sm:mt-2 text-xs sm:text-sm">请输入您的账号和新密码</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">账号名称</label>
                <input
                  type="text"
                  required
                  className="block w-full px-4 py-2.5 sm:py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm sm:text-base text-gray-900"
                  placeholder="请输入您的账号"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-[18px] sm:h-[18px]" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="block w-full pl-10 pr-12 py-2.5 sm:py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm sm:text-base text-gray-900"
                    placeholder="请输入新密码"
                    value={formData.new_password}
                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
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

              <div>
                <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">确认新密码</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 sm:w-[18px] sm:h-[18px]" size={16} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="block w-full pl-10 pr-12 py-2.5 sm:py-3 border border-gray-100 bg-gray-50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm sm:text-base text-gray-900"
                    placeholder="请再次输入新密码"
                    value={formData.confirm_password}
                    onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <Eye size={18} className="sm:w-5 sm:h-5" /> : <EyeOff size={18} className="sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>
            </div>

            {message.text && (
              <div className={`p-3 sm:p-4 rounded-xl border text-[11px] sm:text-sm font-bold ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
              }`}>
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 sm:py-3.5 px-4 border border-transparent text-sm sm:text-base font-black rounded-xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 transition-all shadow-lg shadow-blue-100 active:scale-[0.98]"
            >
              {loading ? '正在处理...' : '重置密码'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ForgetPasswordPage;
