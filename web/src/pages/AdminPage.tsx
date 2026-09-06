import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Trash2, Edit2, Plus, X, Search, ChevronLeft, Lock, MapPin, Briefcase, Receipt, ArrowRightLeft } from 'lucide-react';
import api from '../api/client';
import { User as UserType, Trip as TripType, Bill as BillType } from '../types';

const AdminPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit/Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<UserType> | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // User Trips Modal State
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [userTrips, setUserTrips] = useState<{ created: TripType[], participated: TripType[] }>({ created: [], participated: [] });
  const [tripLoading, setTripLoading] = useState(false);

  // Trip Detail Modal State (Bills & Transfers)
  const [isTripDetailModalOpen, setIsTripDetailModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripType | null>(null);
  const [tripDetail, setTripDetail] = useState<{
    bills: BillType[],
    transactions: string[],
    total_costs: string,
    user_names: Record<string, string>
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    const user = JSON.parse(storedUser);
    if (user.account_name !== 'admin') {
      navigate('/admin');
      return;
    }
    fetchUsers();
  }, [navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      const response = await api.post('/admin/user/list', {}, {
        headers: { 'X-Admin-Account': String(currentUser?.account_name || '') }
      });
      if (response.data.message === 'success') {
        setUsers(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingUser({
      name: '',
      account_name: '',
      password: '',
      email: '',
      phone_number: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (user: UserType) => {
    setEditingUser({
      ...user,
      password: '', // 编辑时不显示原密码，留空表示不修改
    });
    setIsModalOpen(true);
  };

  const handleViewTrips = async (user: UserType) => {
    setSelectedUser(user);
    setIsTripModalOpen(true);
    setTripLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      const response = await api.post('/admin/user/trips', { user_id: user.id }, {
        headers: { 'X-Admin-Account': String(currentUser?.account_name || '') }
      });
      if (response.data.message === 'success') {
        setUserTrips({
          created: response.data.data.created || [],
          participated: response.data.data.participated || []
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '获取旅行列表失败');
    } finally {
      setTripLoading(false);
    }
  };

  const handleViewTripDetail = async (trip: TripType) => {
    setSelectedTrip(trip);
    setIsTripDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      const response = await api.post('/admin/trip/details', { trip_id: trip.id }, {
        headers: { 'X-Admin-Account': String(currentUser?.account_name || '') }
      });
      if (response.data.message === 'success') {
        setTripDetail(response.data.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '获取旅行详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除该账号吗？')) return;
    
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      await api.post('/admin/user/delete', { id }, {
        headers: { 'X-Admin-Account': String(currentUser?.account_name || '') }
      });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setModalLoading(true);
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      const endpoint = editingUser.id ? '/admin/user/update' : '/admin/user/create';
      await api.post(endpoint, editingUser, {
        headers: { 'X-Admin-Account': String(currentUser?.account_name || '') }
      });
      setIsModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || '保存失败');
    } finally {
      setModalLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => navigate('/')}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="text-emerald-600" size={24} />
            后台管理系统
          </h1>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-all shadow-sm active:scale-95"
        >
          <Plus size={16} />
          新增账号
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* 搜索栏 */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="搜索账号名或昵称..."
          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-4 py-3 font-semibold text-gray-700">昵称</th>
                <th className="px-4 py-3 font-semibold text-gray-700">账号名</th>
                <th className="px-4 py-3 font-semibold text-gray-700">密码状态</th>
                <th className="px-4 py-3 font-semibold text-gray-700">邮箱/电话</th>
                <th className="px-4 py-3 font-semibold text-gray-700 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.name}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{u.id}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{u.account_name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Lock size={12} className="text-gray-400" />
                      <span className="text-gray-400 italic text-xs">已加密存储</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500">{u.email || '-'}</div>
                    <div className="text-xs text-gray-400">{u.phone_number || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleViewTrips(u)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="查看旅行"
                      >
                        <MapPin size={16} />
                      </button>
                      <button 
                        onClick={() => handleEdit(u)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑/新增弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold flex items-center gap-2">
                {editingUser?.id ? <Edit2 size={18} /> : <Plus size={18} />}
                {editingUser?.id ? '编辑账号' : '新增账号'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:rotate-90 transition-transform">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">昵称</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  value={editingUser?.name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser!, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">账号名</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  value={editingUser?.account_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser!, account_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">重置密码</label>
                <input
                  type="password"
                  placeholder={editingUser?.id ? "留空表示不修改密码" : "输入新账号密码"}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  value={editingUser?.password || ''}
                  onChange={(e) => setEditingUser({ ...editingUser!, password: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">邮箱</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={editingUser?.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser!, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">电话</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                    value={editingUser?.phone_number || ''}
                    onChange={(e) => setEditingUser({ ...editingUser!, phone_number: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all active:scale-95"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={modalLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 disabled:opacity-50"
              >
                {modalLoading ? '保存中...' : '确认提交'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip 详情弹窗 */}
      {isTripModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold flex items-center gap-2">
                <MapPin size={18} />
                {selectedUser?.name} 的旅行列表
              </h3>
              <button onClick={() => setIsTripModalOpen(false)} className="hover:rotate-90 transition-transform">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {tripLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* 我创建的 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-blue-600 rounded-full"></div>
                      我创建的 ({(userTrips.created || []).length})
                    </h4>
                    {(userTrips.created || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(userTrips.created || []).map(trip => (
                          <div 
                            key={trip.id} 
                            onClick={() => handleViewTripDetail(trip)}
                            className="p-3 border border-gray-100 rounded-xl bg-blue-50/30 hover:bg-blue-100/50 cursor-pointer transition-all"
                          >
                            <div className="font-bold text-sm text-gray-900 truncate">{trip.name}</div>
                            <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">{trip.description || '暂无描述'}</div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[9px] text-gray-400">成员: {(trip.members || []).length}人</span>
                              <span className="text-[9px] text-gray-400">{trip.create_time ? new Date(trip.create_time).toLocaleDateString() : '未知日期'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 text-xs">
                        暂无创建的旅行
                      </div>
                    )}
                  </div>

                  {/* 我参与的 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <div className="w-1 h-4 bg-emerald-600 rounded-full"></div>
                      我参与的 ({(userTrips.participated || []).length})
                    </h4>
                    {(userTrips.participated || []).length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(userTrips.participated || []).map(trip => (
                          <div 
                            key={trip.id} 
                            onClick={() => handleViewTripDetail(trip)}
                            className="p-3 border border-gray-100 rounded-xl bg-emerald-50/30 hover:bg-emerald-100/50 cursor-pointer transition-all"
                          >
                            <div className="font-bold text-sm text-gray-900 truncate">{trip.name}</div>
                            <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">{trip.description || '暂无描述'}</div>
                            <div className="flex items-center gap-3 mt-2">
                              <span className="text-[9px] text-gray-400">成员: {(trip.members || []).length}人</span>
                              <span className="text-[9px] text-gray-400">{trip.create_time ? new Date(trip.create_time).toLocaleDateString() : '未知日期'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-xl text-gray-400 text-xs">
                        暂无参与的旅行
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={() => setIsTripModalOpen(false)}
                className="w-full px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-200 transition-all active:scale-95"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip 账单与转账详情弹窗 */}
      {isTripDetailModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-900 px-6 py-4 flex items-center justify-between text-white">
              <div className="flex flex-col">
                <h3 className="font-bold flex items-center gap-2">
                  <Receipt size={18} />
                  旅行详情: {selectedTrip?.name}
                </h3>
                <span className="text-[10px] text-gray-400 font-normal mt-0.5">ID: {selectedTrip?.id}</span>
              </div>
              <button onClick={() => setIsTripDetailModalOpen(false)} className="hover:rotate-90 transition-transform">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              {detailLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                  <span className="text-sm text-gray-500 font-medium">加载账单与转账数据...</span>
                </div>
              ) : tripDetail && (
                <div className="space-y-8">
                  {/* 费用概览 */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">总支出</div>
                      <div className="text-2xl font-black text-gray-900">¥ {tripDetail.total_costs}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">账单总数</div>
                      <div className="text-xl font-bold text-gray-700">{tripDetail.bills.length} 笔</div>
                    </div>
                  </div>

                  {/* 账单列表 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Receipt size={16} className="text-blue-600" />
                      账单列表
                    </h4>
                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-4 py-3 font-bold text-gray-700">账单名称</th>
                            <th className="px-4 py-3 font-bold text-gray-700">付款人</th>
                            <th className="px-4 py-3 font-bold text-gray-700">金额</th>
                            <th className="px-4 py-3 font-bold text-gray-700">日期</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {tripDetail.bills.length > 0 ? (
                            tripDetail.bills.map(bill => (
                              <tr key={bill.id} className="hover:bg-gray-50/30 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="font-bold text-gray-900">{bill.name}</div>
                                  <div className="text-[9px] text-gray-400 line-clamp-1">{bill.description || '无描述'}</div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium text-[10px]">
                                    {tripDetail.user_names[bill.payer_id] || '未知'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-gray-900">
                                  ¥ {(bill.cost_cent / 100).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-gray-400">
                                  {new Date(bill.create_time).toLocaleDateString()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                                暂无账单数据
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 转账建议 */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <ArrowRightLeft size={16} className="text-emerald-600" />
                      结算转账金额
                    </h4>
                    {tripDetail.transactions.length > 0 ? (
                      <div className="space-y-2">
                        {tripDetail.transactions.map((t, idx) => (
                          <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-[10px]">
                              {idx + 1}
                            </div>
                            <div className="text-sm text-emerald-900 font-medium">{t}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-2xl text-gray-400 text-sm italic">
                        该旅行为平衡状态，无需转账
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 pt-0">
              <button
                onClick={() => setIsTripDetailModalOpen(false)}
                className="w-full px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-black transition-all active:scale-95 shadow-lg shadow-gray-200"
              >
                关闭详情
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
