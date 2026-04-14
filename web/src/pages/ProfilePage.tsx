import { useState, useEffect } from 'react';
import { User, Mail, Phone, Shield, Save, User as UserIcon, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { User as UserType } from '../types';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const u = JSON.parse(storedUser);
      setUser(u);
      setFormData({
        name: u.name || '',
        email: u.email || '',
        phone_number: u.phone_number || '',
      });
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if ((user as any).isGuest) {
      setMessage({ type: 'error', text: '游客模式下无法修改资料，请注册正式账号' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await api.post('/user/update_by_id', {
        ...user,
        ...formData
      });
      
      const updatedUser = response.data.data || { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setMessage({ type: 'success', text: '个人资料已更新' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.error || '更新失败，请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 sm:space-y-8 pb-10">
      <div className="flex items-center gap-3 sm:gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shrink-0"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl sm:text-3xl font-black text-gray-900">个人设置</h2>
      </div>

      <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-gray-50 shadow-sm overflow-hidden">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
        <div className="px-5 sm:px-8 pb-8">
          <div className="relative -mt-10 sm:-mt-12 mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-[20px] sm:rounded-3xl p-1 shadow-lg">
              <div className="w-full h-full bg-blue-50 rounded-[18px] sm:rounded-2xl flex items-center justify-center text-blue-500">
                <UserIcon size={40} className="sm:size-[48px]" />
              </div>
            </div>
            <div className="pb-1 sm:pb-2">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{user.name}</h3>
              <p className="text-gray-400 text-xs sm:text-sm font-medium uppercase tracking-wider">@{user.account_name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            {message.text && (
              <div className={`p-4 rounded-2xl border ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
              } text-sm font-bold animate-in fade-in slide-in-from-top-2`}>
                {message.text}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">昵称</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  <input
                    type="text"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-base text-gray-900"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">用户 ID (不可更改)</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  <input
                    type="text"
                    disabled
                    className="w-full pl-12 pr-4 py-3.5 bg-gray-100 border-0 rounded-2xl text-gray-400 cursor-not-allowed font-mono text-xs"
                    value={user.id}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">邮箱地址</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-base text-gray-900"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 ml-1">手机号码</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-3.5 text-gray-300" size={18} />
                  <input
                    type="tel"
                    required
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-base text-gray-900"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 font-bold active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Save size={20} />
                )}
                <span>保存更改</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="p-5 sm:p-6 bg-amber-50 rounded-[24px] sm:rounded-[32px] border border-amber-100 flex gap-3 sm:gap-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 rounded-xl sm:rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
          <Shield size={20} className="sm:size-6" />
        </div>
        <div>
          <h4 className="font-bold text-amber-900 text-sm sm:text-base">安全提示</h4>
          <p className="text-xs sm:text-sm text-amber-700 mt-1 leading-relaxed">
            您的账户信息将被加密存储。如果需要修改登录密码或注销账户，请联系系统管理员或使用专用的安全管理工具。
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
