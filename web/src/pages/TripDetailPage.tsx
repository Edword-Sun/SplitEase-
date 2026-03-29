import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Receipt, ArrowRightLeft, ChevronLeft, CreditCard, Users, Trash2 } from 'lucide-react';
import api from '../api/client';
import { Trip, Bill, SplitResult, User } from '../types';
import { formatCentToYuan, formatYuanToCent, formatDate } from '../utils/format';
import { BILL_CATEGORIES, getCategoryById } from '../utils/constants';

const TripDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [splitResults, setSplitResults] = useState<SplitResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'split'>('bills');
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newBill, setNewBill] = useState({ name: '', cost_yuan: '', category: 1, description: '' });
  const [newMemberId, setNewMemberId] = useState('');
  const [error, setError] = useState('');
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const tripRes = await api.post('/trip/find_by_id', { id });
      setTrip(tripRes.data.data);
      
      // Note: This API might be missing from backend, handled gracefully
      try {
        const billRes = await api.post('/bill/find_by_trip_id', { trip_id: id });
        setBills(billRes.data.data || []);
      } catch (err: any) {
        console.warn('Bill listing API might be missing:', err.message);
        setBills([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '无法加载旅行详情');
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const costCent = formatYuanToCent(newBill.cost_yuan);
      if (costCent <= 0) {
        alert('请输入有效金额');
        return;
      }
      await api.post('/bill/add', {
        ...newBill,
        cost_cent: costCent,
        trip_id: id,
        creator: user.id,
      });
      setShowAddBillModal(false);
      setNewBill({ name: '', cost_yuan: '', category: 1, description: '' });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || '账单保存失败');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !newMemberId.trim()) return;
    try {
      const updatedMembers = [...(trip.members || []), newMemberId.trim()];
      await api.post('/trip/update_by_id', {
        ...trip,
        members: updatedMembers,
      });
      setShowAddMemberModal(false);
      setNewMemberId('');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || '添加成员失败');
    }
  };

  const handleSplit = async () => {
    try {
      const response = await api.post('/trip/split', { id });
      setSplitResults(response.data.data || []);
      setActiveTab('split');
    } catch (err: any) {
      alert(err.response?.data?.error || '分账计算失败，请检查是否已添加账单和成员');
    }
  };

  const handleDeleteBill = async (billId: string) => {
    if (!window.confirm('确定要删除这笔账单吗？')) return;
    try {
      await api.post('/bill/delete_by_id', { id: billId });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || '删除失败');
    }
  };

  if (loading && !trip) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-gray-500 animate-pulse">加载中...</p>
    </div>
  );

  if (error && !trip) return (
    <div className="text-center py-20 bg-white rounded-2xl border border-red-100 p-8 shadow-sm">
      <p className="text-red-500 font-bold text-lg">{error}</p>
      <button 
        onClick={() => navigate('/')}
        className="mt-6 text-blue-600 font-medium flex items-center gap-1 mx-auto hover:underline"
      >
        <ChevronLeft size={18} />
        返回列表
      </button>
    </div>
  );

  if (!trip) return <div className="text-center py-10">旅行不存在</div>;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors text-sm font-medium"
          >
            <ChevronLeft size={16} />
            返回列表
          </button>
          <h2 className="text-3xl font-extrabold text-gray-900 leading-tight">{trip.name}</h2>
          <p className="text-gray-500 text-sm max-w-xl">{trip.description || '暂无描述'}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <div className="flex items-center gap-1 text-gray-400 text-xs mr-2">
              <Users size={14} />
              <span>成员:</span>
            </div>
            {trip.members?.map((m, i) => (
              <span key={i} className="px-3 py-1 bg-white border border-gray-200 text-gray-600 rounded-full text-xs font-semibold shadow-sm">
                {m === user.id ? '我' : (m.length > 8 ? m.substring(0, 8) + '...' : m)}
              </span>
            ))}
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1 border border-blue-100"
            >
              <Plus size={12} />
              添加
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddBillModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-bold active:scale-95"
          >
            <Receipt size={20} />
            记一笔
          </button>
          <button
            onClick={handleSplit}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 font-bold active:scale-95"
          >
            <ArrowRightLeft size={20} />
            分账
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 sticky top-16 bg-gray-50 z-10 pt-4">
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-8 py-3 text-sm font-bold transition-all relative ${
            activeTab === 'bills' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          账单明细 ({bills.length})
          {activeTab === 'bills' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full shadow-[0_-2px_4px_rgba(37,99,235,0.2)]"></div>}
        </button>
        <button
          onClick={() => setActiveTab('split')}
          className={`px-8 py-3 text-sm font-bold transition-all relative ${
            activeTab === 'split' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          结算结果
          {activeTab === 'split' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full shadow-[0_-2px_4px_rgba(37,99,235,0.2)]"></div>}
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'bills' ? (
          <div className="space-y-4">
            {bills.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                  <Receipt size={32} />
                </div>
                <p className="text-gray-400 font-medium">还没有账单，快去记一笔吧</p>
                <button 
                  onClick={() => setShowAddBillModal(true)}
                  className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                >
                  立即添加第一笔
                </button>
              </div>
            ) : (
              bills.map((bill) => {
                const category = getCategoryById(bill.category);
                const Icon = category.icon;
                return (
                  <div key={bill.id} className="bg-white p-5 rounded-2xl border border-gray-50 shadow-sm flex items-center justify-between group hover:border-blue-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 ${category.color} rounded-2xl flex items-center justify-center transition-all shadow-sm`}>
                        <Icon size={28} />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-lg leading-tight">{bill.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{formatDate(bill.create_time)}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span className="text-xs text-gray-400">
                            付款人: <span className="text-gray-600 font-medium">{bill.creator === user.id ? '我' : (bill.creator.length > 8 ? bill.creator.substring(0, 8) : bill.creator)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900">￥{formatCentToYuan(bill.cost_cent)}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 italic">{category.label}</p>
                      </div>
                      <button 
                        onClick={() => handleDeleteBill(bill.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {splitResults.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                  <ArrowRightLeft size={32} />
                </div>
                <p className="text-gray-400 font-medium">点击上方“分账”生成结算清单</p>
                <p className="text-xs text-gray-300 mt-2">系统将自动计算最简还款路径</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard size={18} className="text-blue-600" />
                    结算还款方案
                  </h4>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Generated By SplitEase</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {splitResults.map((res, i) => (
                    <div key={i} className="p-6 flex items-center justify-between hover:bg-blue-50/20 transition-colors group">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center min-w-[80px]">
                          <span className="text-[10px] font-bold text-gray-300 mb-1 uppercase">Debtor</span>
                          <span className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 shadow-sm group-hover:bg-white group-hover:border-red-100 transition-all">
                            {res.from === user.id ? '我' : (res.from.length > 8 ? res.from.substring(0, 8) : res.from)}
                          </span>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blue-200 to-transparent relative">
                            <ArrowRightLeft size={14} className="text-blue-400 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-1 box-content" />
                          </div>
                          <span className="text-[10px] font-bold text-blue-400 mt-2">支付给</span>
                        </div>
                        <div className="flex flex-col items-center min-w-[80px]">
                          <span className="text-[10px] font-bold text-gray-300 mb-1 uppercase">Creditor</span>
                          <span className="px-4 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold text-gray-700 shadow-sm group-hover:bg-white group-hover:border-emerald-100 transition-all">
                            {res.to === user.id ? '我' : (res.to.length > 8 ? res.to.substring(0, 8) : res.to)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-8">
                        <span className="text-2xl font-black text-emerald-600">￥{formatCentToYuan(res.amount_cent)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      {showAddBillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-500 text-white">
              <h3 className="text-xl font-bold">新增账单</h3>
              <button onClick={() => setShowAddBillModal(false)} className="hover:rotate-90 transition-all duration-300 p-1">
                <Plus size={28} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddBill} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">账单名称</label>
                  <input
                    type="text"
                    required
                    className="w-full px-5 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                    placeholder="如：成都老火锅"
                    value={newBill.name}
                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2 md:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">金额 (元)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3.5 text-gray-400 font-black">￥</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full pl-10 pr-5 py-3.5 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-xl"
                      placeholder="0.00"
                      value={newBill.cost_yuan}
                      onChange={(e) => setNewBill({ ...newBill, cost_yuan: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">分类</label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {Object.values(BILL_CATEGORIES).map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = newBill.category === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewBill({ ...newBill, category: cat.id })}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border-2 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                            : 'border-transparent bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={24} />
                        <span className="text-[10px] font-bold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">说明 (可选)</label>
                <textarea
                  className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  placeholder="添加备注，如：火锅、电影、景点门票..."
                  rows={2}
                  value={newBill.description}
                  onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="flex-1 px-6 py-4 border border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 font-bold transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-xl shadow-blue-200 transition-all active:scale-95"
                >
                  确认记账
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-blue-600 text-white">
              <h3 className="text-xl font-bold">邀请成员</h3>
              <button onClick={() => setShowAddMemberModal(false)}>
                <Plus size={28} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">用户唯一标识 (ID)</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold"
                  placeholder="输入对方的用户ID"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                />
                <div className="mt-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[11px] text-blue-600 font-medium leading-relaxed">
                    💡 提示：目前请通过用户注册时的 ID 进行添加。对方加入后，所有账单将自动包含该成员。
                  </p>
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 px-6 py-4 border border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 font-bold transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all active:scale-95"
                >
                  加入成员
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripDetailPage;
