import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Receipt, ArrowRightLeft, ChevronLeft, CreditCard, Users, Trash2, Search, Pencil, ArrowRight, CheckCircle2 } from 'lucide-react';
import api from '../api/client';
import { Trip, Bill, SplitResult, User, SplitResponseData } from '../types';
import { formatCentToYuan, formatYuanToCent, formatDate } from '../utils/format';
import { BILL_CATEGORIES, getCategoryById } from '../utils/constants';

const TripDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [splitResults, setSplitResults] = useState<SplitResponseData | null>(null);
  const [creatorTrips, setCreatorTrips] = useState<Trip[]>([]);
  const [memberTrips, setMemberTrips] = useState<Trip[]>([]);
  const [showOtherTrips, setShowOtherTrips] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bills' | 'split'>('bills');
  const [showAddBillModal, setShowAddBillModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newBill, setNewBill] = useState({ 
    name: '', 
    cost_yuan: '', 
    category: 1, 
    description: '', 
    involved_members: [] as string[],
    payer_id: user.id
  });
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [newMemberId, setNewMemberId] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSearchedUsers, setTotalSearchedUsers] = useState(0);
  const [error, setError] = useState('');
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [filterCategory, setFilterCategory] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const tripRes = await api.post('/trip/find_by_id', { id });
      setTrip(tripRes.data.data);

      // Fetch member names
      const members = tripRes.data.data.members || [];
      const namesMap: Record<string, string> = {};
      for (const memberId of members) {
        try {
          const userRes = await api.post('/user/find_by_id', { id: memberId });
          namesMap[memberId] = userRes.data.data.name;
        } catch (userErr: any) {
          console.warn(`Failed to fetch name for member ${memberId}:`, userErr.message);
          namesMap[memberId] = `未知用户 (${memberId.substring(0, 8)}...)`; // Fallback name
        }
      }
      setMemberNames(namesMap);
      
      // Fixed endpoint and parameter name to match backend: /bill/find_by_trip_id
      try {
        const billRes = await api.post('/bill/find_by_trip_id', { id });
        const fetchedBills = billRes.data.data || [];
        // Ensure reverse chronological order by create_time
        const sortedBills = [...fetchedBills].sort((a: Bill, b: Bill) => 
          new Date(b.create_time).getTime() - new Date(a.create_time).getTime()
        );
        setBills(sortedBills);
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

  const fetchTripsByMember = async () => {
    try {
      const response = await api.post('/trip/find_by_member', { member_id: user.id });
      setMemberTrips(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch member trips:', err);
    }
  };

  const fetchTripsByCreator = async () => {
    try {
      const response = await api.post('/trip/find_by_creator_id', { creator_id: user.id });
      setCreatorTrips(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch creator trips:', err);
    }
  };

  const searchUsers = async (keyword: string, page: number) => {
    setSearchLoading(true);
    setError(''); // 重置错误状态
    try {
      const response = await api.post('/user/list', { keyword, page, size: 5 }); // 每页显示5个用户
      // 后端结构是 {code: 0, data: [...], total: 10}
      if (response.data && response.data.code === 0) {
        setSearchedUsers(response.data.data || []);
        setTotalSearchedUsers(response.data.total || 0);
      } else {
        const errorMsg = response.data?.message || '搜索失败，请重试';
        console.error('Failed to search users:', errorMsg);
        setError(errorMsg);
        setSearchedUsers([]);
        setTotalSearchedUsers(0);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || '网络错误，请稍后重试';
      console.error('Failed to search users:', err);
      setError(errorMsg);
      setSearchedUsers([]);
      setTotalSearchedUsers(0);
    } finally {
      setSearchLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    if (user.id) {
      fetchTripsByCreator();
      fetchTripsByMember();
    }
  }, [id, user.id]);

  useEffect(() => {
    if (showAddMemberModal) {
      searchUsers('', 1);
    }
  }, [showAddMemberModal]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    searchUsers(searchKeyword, newPage);
  };

  const handleSearchClick = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setCurrentPage(1);
    searchUsers(searchKeyword, 1);
  };

  const handleCloseAddMemberModal = () => {
    setShowAddMemberModal(false);
    setSearchKeyword('');
    setSearchedUsers([]);
    setCurrentPage(1);
    setNewMemberId('');
  };

  const handleAddBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const costCent = formatYuanToCent(newBill.cost_yuan);
      if (costCent <= 0) {
        alert('请输入有效金额');
        return;
      }
      
      const payload = {
        ...newBill,
        cost_cent: costCent,
        trip_id: id,
        creator: user.id, // 记录谁录入的
        payer_id: newBill.payer_id, // 记录谁付钱的
        involved_members: newBill.involved_members,
      };

      if (editingBillId) {
        await api.post('/bill/update_by_id', {
          ...payload,
          id: editingBillId,
        });
      } else {
        await api.post('/bill/add', payload);
      }

      setShowAddBillModal(false);
      setEditingBillId(null);
      setNewBill({ name: '', cost_yuan: '', category: 1, description: '', involved_members: [], payer_id: user.id });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || '账单保存失败');
    }
  };

  const handleEditClick = (bill: Bill) => {
    setNewBill({
      name: bill.name,
      cost_yuan: formatCentToYuan(bill.cost_cent),
      category: bill.category,
      description: bill.description,
      involved_members: bill.involved_members || [],
      payer_id: bill.payer_id || bill.creator || user.id
    });
    setEditingBillId(bill.id);
    setShowAddBillModal(true);
  };

  const handleAddMember = async (memberIdToAdd: string) => {
    if (!trip || !memberIdToAdd.trim()) return;

    if (trip.members && trip.members.includes(memberIdToAdd)) {
      alert('该成员已在旅行中，无需重复添加。');
      return;
    }

    try {
      const updatedMembers = [...(trip.members || []), memberIdToAdd.trim()];
      await api.post('/trip/update_by_id', {
        ...trip,
        members: updatedMembers,
      });
      handleCloseAddMemberModal();
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || '添加成员失败');
    }
  };

  const handleSplit = async () => {
    try {
      const response = await api.post('/trip/split', { trip_id: id });
      setSplitResults(response.data.data);
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

  const handleDeleteMember = async (memberIdToDelete: string) => {
    if (!trip) return;

    if (!window.confirm(`确定要将 ${memberNames[memberIdToDelete] || memberIdToDelete.substring(0, 8) + '...'} 从旅行中移除吗？`)) {
      return;
    }

    try {
      const updatedMembers = (trip.members || []).filter(m => m !== memberIdToDelete);
      await api.post('/trip/update_by_id', {
        ...trip,
        members: updatedMembers,
      });
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || '移除成员失败');
    }
  };

  if (loading && !trip) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
      <p className="text-gray-500 animate-pulse">加载中...</p>
    </div>
  );

  if (error && !trip) return (
    <div className="text-center py-12 text-gray-400 text-sm font-medium">
      {error}
    </div>
  );

  if (!trip) return (
    <div className="text-center py-12 text-gray-400 text-sm font-medium">
      未找到相关旅行信息
    </div>
  );

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
          <p className="text-gray-500 text-xs max-w-xl">{trip.description || '暂无描述'}</p>
          <div className="flex flex-wrap gap-2 pt-1 items-center">
            <div className="flex items-center gap-1 text-gray-400 text-base mr-2">
              <Users size={18} />
              <span>成员:</span>
            </div>
            {trip.members?.map((m, i) => {
              const isCreator = trip.creator === m;
              const isCurrentUser = user.id === m;
              return (
                <div 
                  key={i} 
                  className={`group relative flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm ${
                    isCreator 
                      ? 'bg-yellow-100 border border-yellow-300 text-yellow-800' 
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  <span>{isCurrentUser ? `${memberNames[user.id]} (我)` : (memberNames[m] || m.substring(0, 8) + '...')}</span>
                  {!isCreator && ( // 创作者不能被删除
                    <button 
                      onClick={() => handleDeleteMember(m)}
                      className="ml-1 p-0.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="移除成员"
                    >
                      <Trash2 size={10} />
                    </button>
                  )}
                </div>
              );
            })}
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
            onClick={() => {
              setEditingBillId(null);
              setNewBill({ 
                name: '', 
                cost_yuan: '', 
                category: 1, 
                description: '', 
                involved_members: trip?.members || [],
                payer_id: user.id
              });
              setShowAddBillModal(true);
            }}
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
          <div className="space-y-6">
            {/* Category Filter */}
            {bills.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2">
                <button
                  onClick={() => setFilterCategory(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                    filterCategory === null 
                      ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'border-gray-100 bg-white text-gray-400 hover:border-blue-200'
                  }`}
                >
                  全部
                </button>
                {Object.values(BILL_CATEGORIES)
                  .sort((a, b) => {
                    if (a.id === 0) return 1;
                    if (b.id === 0) return -1;
                    return a.id - b.id;
                  })
                  .map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border-2 ${
                        filterCategory === cat.id 
                          ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100' 
                          : 'border-gray-100 bg-white text-gray-400 hover:border-blue-200'
                      }`}
                    >
                      <cat.icon size={14} />
                      {cat.label}
                    </button>
                  ))}
              </div>
            )}

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
              <div className="space-y-4">
                {(() => {
                  const filtered = bills.filter(bill => filterCategory === null || bill.category === filterCategory);
                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                        <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                          <Receipt size={32} />
                        </div>
                        <p className="text-gray-400 font-medium">该分类下暂无账单</p>
                        <button 
                          onClick={() => setFilterCategory(null)}
                          className="mt-4 text-blue-600 font-bold text-sm hover:underline"
                        >
                          查看全部
                        </button>
                      </div>
                    );
                  }
                  return filtered.map((bill) => {
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
                            付款人: <span className="text-gray-600 font-medium">
                              {(() => {
                                const actualPayerId = bill.payer_id || bill.creator;
                                if (actualPayerId === user.id) return '(我)';
                                return memberNames[actualPayerId] || actualPayerId?.substring(0, 8) || '未知';
                              })()}
                            </span>
                          </span>
                            </div>
                            {bill.involved_members && bill.involved_members.length > 0 && (
                              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto no-scrollbar max-w-[200px] md:max-w-xs">
                                <span className="text-[10px] text-gray-300 font-bold uppercase tracking-tighter whitespace-nowrap">分摊:</span>
                                <div className="flex -space-x-1.5">
                                  {bill.involved_members.map((mId, idx) => (
                                    <div 
                                      key={mId} 
                                      className="w-5 h-5 rounded-full border border-white bg-blue-50 flex items-center justify-center text-[8px] font-bold text-blue-500 shadow-sm"
                                      title={memberNames[mId] || '未知用户'}
                                    >
                                      {memberNames[mId]?.[0] || 'U'}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium truncate">
                                  {bill.involved_members.length === (trip?.members?.length || 0) 
                                    ? '全员' 
                                    : bill.involved_members.map(id => memberNames[id] || '未知').join(', ')}
                                </span>
                                {bill.involved_members.length > 0 && bill.involved_members.length < (trip?.members?.length || 0) && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-600 text-[8px] font-black rounded-md uppercase">
                                    ￥{formatCentToYuan(Math.ceil(bill.cost_cent / bill.involved_members.length))}/人
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-2xl font-black text-gray-900">￥{formatCentToYuan(bill.cost_cent)}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5 italic">{category.label}</p>
                          </div>
                          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleEditClick(bill)}
                              className="p-2 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                              title="编辑"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteBill(bill.id)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                              title="删除"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {!splitResults ? (
              <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                  <ArrowRightLeft size={32} />
                </div>
                <p className="text-gray-400 font-medium">点击上方“分账”生成结算清单</p>
                <p className="text-xs text-gray-300 mt-2">系统将自动计算最简还款路径</p>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{splitResults.trip_name} 分账概览</h3>
                  <div className="flex justify-between items-center text-sm text-gray-600">
                    <span>总支出: <span className="font-bold text-gray-900">￥{splitResults.total_costs}</span></span>
                  </div>
                </div>

                {/* Bill Details Section */}
                {splitResults.bill_details && splitResults.bill_details.length > 0 && (
                  <div className="p-6 border-b border-gray-50">
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                      <Receipt size={18} className="text-blue-600" />
                      账单分摊明细
                    </h4>
                    <div className="space-y-4">
                      {splitResults.bill_details.map((bill, idx) => (
                        <div key={idx} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h5 className="font-bold text-gray-900">{bill.bill_name}</h5>
                              <p className="text-[10px] text-gray-400 font-medium">付款人: {bill.payer_name}</p>
                            </div>
                            <span className="text-sm font-black text-gray-900">￥{bill.total_costs}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {bill.splits.map((split, sIdx) => (
                              <div key={sIdx} className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-2 shadow-sm">
                                <span className="text-[10px] font-bold text-gray-600">{split.name}</span>
                                <span className="text-[10px] font-black text-blue-600">￥{split.share}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-6 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <CreditCard size={18} className="text-blue-600" />
                    结算还款方案
                  </h4>
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Generated By SplitEase</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {splitResults.details.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={24} />
                      </div>
                      <p className="text-gray-400 font-bold">账目已清，无需转账</p>
                    </div>
                  ) : (
                    splitResults.details.map((detail: string, i: number) => {
                      const match = detail.match(/(.+) 支付给 (.+): (.+) 元/);
                      if (!match) return <div key={i} className="p-6 text-gray-700 font-medium">{detail}</div>;
                      const [_, from, to, amount] = match;
                      return (
                        <div key={i} className="p-6 flex items-center justify-between hover:bg-blue-50/20 transition-all group">
                          {/* From User */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black text-sm border border-red-100 flex-shrink-0 shadow-sm">
                              {from[0]}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-black text-gray-900 truncate">{from}</span>
                              <span className="text-[10px] text-red-400 font-bold uppercase tracking-tighter">付款人</span>
                            </div>
                          </div>
                          
                          {/* Flow Arrow & Amount */}
                          <div className="flex flex-col items-center px-4 group-hover:scale-110 transition-transform duration-300">
                            <div className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-100 mb-2">
                              ￥{amount}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-8 h-[2px] bg-gradient-to-r from-red-100 to-emerald-100 rounded-full"></div>
                              <ArrowRight size={14} className="text-blue-500 animate-pulse" />
                            </div>
                          </div>

                          {/* To User */}
                          <div className="flex items-center gap-3 flex-1 justify-end min-w-0 text-right">
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-black text-gray-900 truncate">{to}</span>
                              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-tighter">收款人</span>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-sm border border-emerald-100 flex-shrink-0 shadow-sm">
                              {to[0]}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
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
              <h3 className="text-xl font-bold">{editingBillId ? '编辑账单' : '新增账单'}</h3>
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
                    className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-base text-gray-900"
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
                      className="w-full pl-10 pr-5 py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-xl text-gray-900"
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
                <label className="block text-sm font-bold text-gray-700 mb-3">付款人</label>
                <div className="flex flex-wrap gap-2">
                  {trip?.members?.map((memberId) => {
                    const isSelected = newBill.payer_id === memberId;
                    return (
                      <button
                        key={memberId}
                        type="button"
                        onClick={() => setNewBill({ ...newBill, payer_id: memberId })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                            : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {memberNames[memberId]?.[0] || 'U'}
                        </div>
                        {memberNames[memberId] || '未知用户'}
                        {memberId === user.id && <span className="ml-1 opacity-50">(我)</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-bold text-gray-700">分摊成员 ({newBill.involved_members.length}/{trip?.members?.length || 0})</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewBill({ ...newBill, involved_members: trip?.members || [] })}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                    >
                      全选
                    </button>
                    <span className="text-gray-200">|</span>
                    <button
                      type="button"
                      onClick={() => setNewBill({ ...newBill, involved_members: [] })}
                      className="text-[10px] font-black text-gray-400 hover:text-gray-500 uppercase tracking-wider"
                    >
                      全不选
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trip?.members?.map((memberId) => {
                    const isSelected = newBill.involved_members.includes(memberId);
                    return (
                      <button
                        key={memberId}
                        type="button"
                        onClick={() => {
                          const current = newBill.involved_members;
                          if (isSelected) {
                            setNewBill({ ...newBill, involved_members: current.filter(id => id !== memberId) });
                          } else {
                            setNewBill({ ...newBill, involved_members: [...current, memberId] });
                          }
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border-2 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 text-blue-600' 
                            : 'border-gray-100 bg-gray-50 text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'
                        }`}>
                          {memberNames[memberId]?.[0] || 'U'}
                        </div>
                        {memberNames[memberId] || '未知用户'}
                      </button>
                    );
                  })}
                  {(!trip?.members || trip.members.length === 0) && (
                    <p className="text-sm text-red-500 font-medium">请先添加旅行成员</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">说明 (可选)</label>
                <textarea
                  className="w-full px-5 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-base text-gray-900"
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
                  {editingBillId ? '确认更新' : '确认记账'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-10 duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-blue-600 text-white">
              <h3 className="text-xl font-bold">邀请成员</h3>
              <button onClick={handleCloseAddMemberModal}>
                <Plus size={28} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSearchClick(e); }} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">搜索用户并添加</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-5 py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-base text-gray-900"
                    placeholder="输入用户名/邮箱/手机号"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSearchClick}
                    className="px-6 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Search size={18} />
                    搜索
                  </button>
                </div>

                <div className="mt-6 min-h-[200px] flex flex-col">
                  {searchLoading ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-10">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">搜索中...</p>
                    </div>
                  ) : error ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-red-400 text-sm font-bold">{error}</p>
                      <button 
                        type="button"
                        onClick={() => searchUsers(searchKeyword, 1)}
                        className="mt-2 text-blue-600 text-xs font-bold hover:underline"
                      >
                        点击重试
                      </button>
                    </div>
                  ) : searchedUsers.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-10 text-center">
                      <p className="text-gray-400 text-sm font-bold">
                        {searchKeyword ? `未找到与 "${searchKeyword}" 相关的用户` : '暂无更多用户'}
                      </p>
                      <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-tighter">Try a different keyword</p>
                    </div>
                  ) : (
                    <>
                      <div className="border border-gray-100 rounded-2xl max-h-60 overflow-y-auto shadow-inner bg-gray-50/30">
                        {searchedUsers.map((u) => {
                          const isAlreadyMember = trip?.members?.includes(u.id);
                          return (
                            <div 
                              key={u.id} 
                              className="flex items-center justify-between p-4 border-b border-gray-50 last:border-b-0 hover:bg-white cursor-pointer transition-colors"
                              onClick={() => !isAlreadyMember && handleAddMember(u.id)}
                            >
                              <div>
                                <p className="font-bold text-gray-800">{u.name}</p>
                                <p className="text-xs text-gray-400 font-medium">@{u.account_name}</p>
                              </div>
                              {isAlreadyMember ? (
                                <span className="text-[10px] text-gray-300 font-black bg-gray-100 px-3 py-1 rounded-full uppercase">已经在旅行中</span>
                              ) : (
                                <button 
                                  type="button" 
                                  className="px-4 py-1.5 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95"
                                  onClick={(e) => { e.stopPropagation(); handleAddMember(u.id); }}
                                >
                                  选择
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      <div className="flex justify-between items-center mt-6 text-sm">
                        <button
                          type="button"
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border border-gray-100 rounded-xl text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          上一页
                        </button>
                        <span className="text-gray-400 font-bold text-[11px] uppercase tracking-wider">
                          Page {currentPage} / {Math.ceil(totalSearchedUsers / 5)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage * 5 >= totalSearchedUsers}
                          className="px-4 py-2 border border-gray-100 rounded-xl text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          下一页
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-2 p-5 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                <p className="text-[11px] text-blue-600 font-bold leading-relaxed flex gap-2">
                  <span className="shrink-0">💡</span>
                  <span>提示：点击搜索或按回车键查找用户。如果您知道对方的确切 ID，也可以直接在搜索框输入 ID 进行查找。</span>
                </p>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleCloseAddMemberModal}
                  className="flex-1 px-6 py-4 border border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 font-bold transition-all active:scale-95"
                >
                  关闭
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