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
        id: user.id,
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
    <div className="max-w-2xl mx-auto space-y-4 pb-10">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shrink-0"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-black text-gray-900">个人设置</h2>
      </div>

      <div className="bg-white rounded-2xl border border-gray-50 shadow-sm overflow-hidden">
        <div className="h-20 bg-blue-600"></div>
        <div className="px-4 pb-6">
          <div className="relative -mt-8 mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="w-16 h-16 bg-white rounded-2xl p-1 shadow-lg">
              <div className="w-full h-full bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <UserIcon size={32} />
              </div>
            </div>
            <div className="pb-1">
              <h3 className="text-lg font-bold text-gray-900">{user.name}</h3>
              <p className="text-gray-400 text-[10px] font-medium uppercase tracking-wider">@{user.account_name}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-emerald-500 outline-none transition-all font-medium text-base text-gray-900"
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
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-emerald-500 outline-none transition-all font-medium text-base text-gray-900"
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
                    className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-emerald-500 outline-none transition-all font-medium text-base text-gray-900"
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
                className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 font-bold active:scale-95 disabled:opacity-50"
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

    </div>
  );
};

export default ProfilePage;
