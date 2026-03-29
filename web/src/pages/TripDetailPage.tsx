import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Receipt, Users, ArrowRightLeft, Trash2, Edit3, ChevronLeft, CreditCard } from 'lucide-react';
import api from '../api/client';
import { Trip, Bill, SplitResult, User } from '../types';

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
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchData = async () => {
    try {
      const tripRes = await api.post('/trip/find_by_id', { id });
      setTrip(tripRes.data.data);
      const billRes = await api.post('/bill/find_by_trip_id', { trip_id: id });
      setBills(billRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
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
      const costCent = Math.round(parseFloat(newBill.cost_yuan) * 100);
      await api.post('/bill/add', {
        ...newBill,
        cost_cent: costCent,
        trip_id: id,
        creator: user.id,
      });
      setShowAddBillModal(false);
      setNewBill({ name: '', cost_yuan: '', category: 1, description: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to add bill:', error);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    try {
      const updatedMembers = [...(trip.members || []), newMemberId];
      await api.post('/trip/update_by_id', {
        ...trip,
        members: updatedMembers,
      });
      setShowAddMemberModal(false);
      setNewMemberId('');
      fetchData();
    } catch (error) {
      console.error('Failed to add member:', error);
    }
  };

  const handleSplit = async () => {
    try {
      const response = await api.post('/trip/split', { id });
      setSplitResults(response.data.data || []);
      setActiveTab('split');
    } catch (error) {
      console.error('Failed to split:', error);
    }
  };

  const toYuan = (cents: number) => (cents / 100).toFixed(2);

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-gray-500 animate-pulse">加载中...</p>
    </div>
  );
  if (!trip) return <div className="text-center py-10">旅行不存在</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-gray-400 hover:text-blue-600 transition-colors text-sm mb-2"
          >
            <ChevronLeft size={16} />
            <span>返回列表</span>
          </button>
          <h2 className="text-3xl font-extrabold text-gray-900">{trip.name}</h2>
          <p className="text-gray-500 text-sm max-w-xl">{trip.description}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {trip.members?.map((m, i) => (
              <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                {m === user.id ? '我' : m.substring(0, 8)}
              </span>
            ))}
            <button 
              onClick={() => setShowAddMemberModal(true)}
              className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold hover:bg-blue-100 transition-colors flex items-center gap-1"
            >
              <Plus size={12} />
              添加成员
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddBillModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <Receipt size={20} />
            记一笔
          </button>
          <button
            onClick={handleSplit}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-sm font-medium"
          >
            <ArrowRightLeft size={20} />
            一键分账
          </button>
        </div>
      </div>

      <div className="flex border-b border-gray-100 sticky top-16 bg-gray-50 z-10 pt-2">
        <button
          onClick={() => setActiveTab('bills')}
          className={`px-6 py-3 text-sm font-bold transition-all relative ${
            activeTab === 'bills' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          账单明细 ({bills.length})
          {activeTab === 'bills' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
        </button>
        <button
          onClick={() => setActiveTab('split')}
          className={`px-6 py-3 text-sm font-bold transition-all relative ${
            activeTab === 'split' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          分账结果
          {activeTab === 'split' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full"></div>}
        </button>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'bills' ? (
          <div className="space-y-3">
            {bills.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <Receipt size={40} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400">还没有账单，快去记一笔吧</p>
              </div>
            ) : (
              bills.map((bill) => (
                <div key={bill.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                      <Receipt size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{bill.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{bill.description || '暂无说明'} · {new Date(bill.create_time).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-gray-900">￥{toYuan(bill.cost_cent)}</p>
                    <p className="text-xs text-gray-400 mt-1">付款人: {bill.creator === user.id ? '我' : bill.creator.substring(0, 8)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {splitResults.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-100">
                <ArrowRightLeft size={40} className="mx-auto text-gray-200 mb-4" />
                <p className="text-gray-400">点击“一键分账”生成结算清单</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard size={18} className="text-blue-600" />
                    转账清单
                  </h4>
                </div>
                <div className="divide-y divide-gray-50">
                  {splitResults.map((res, i) => (
                    <div key={i} className="p-5 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-gray-400 mb-1">付款人</span>
                          <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 shadow-sm">
                            {res.from === user.id ? '我' : res.from.substring(0, 8)}
                          </span>
                        </div>
                        <ArrowRightLeft size={16} className="text-blue-500 mx-2 mt-4" />
                        <div className="flex flex-col items-center">
                          <span className="text-xs font-bold text-gray-400 mb-1">收款人</span>
                          <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 shadow-sm">
                            {res.to === user.id ? '我' : res.to.substring(0, 8)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-emerald-600">￥{toYuan(res.amount_cent)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showAddBillModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-blue-600 text-white">
              <h3 className="text-lg font-bold">记一笔账</h3>
              <button onClick={() => setShowAddBillModal(false)}>
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddBill} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">账单项名称</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="如：午餐、打车"
                  value={newBill.name}
                  onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">金额 (元)</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-400 font-bold">￥</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-lg"
                    placeholder="0.00"
                    value={newBill.cost_yuan}
                    onChange={(e) => setNewBill({ ...newBill, cost_yuan: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">说明 (可选)</label>
                <textarea
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="添加一些补充说明..."
                  rows={2}
                  value={newBill.description}
                  onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-bold transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-blue-600 text-white">
              <h3 className="text-lg font-bold">添加成员</h3>
              <button onClick={() => setShowAddMemberModal(false)}>
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">成员 ID</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="请输入成员的用户 ID"
                  value={newMemberId}
                  onChange={(e) => setNewMemberId(e.target.value)}
                />
                <p className="text-[10px] text-gray-400 mt-2 italic">目前通过用户唯一标识符添加成员</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 font-bold transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all"
                >
                  添加
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
