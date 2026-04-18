import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Receipt, ArrowRightLeft, ChevronLeft, CreditCard, Users, Trash2, Search, Pencil, ArrowRight, CheckCircle2, Info, ArrowDown, ChevronDown } from 'lucide-react';
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
  const [virtualMemberName, setVirtualMemberName] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSearchedUsers, setTotalSearchedUsers] = useState(0);
  const [error, setError] = useState('');
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [showPayerDropdown, setShowPayerDropdown] = useState(false);
  const payerDropdownRef = useRef<HTMLDivElement>(null);

  const getDisplayName = (memberId: string) => {
    if (memberId === user.id) return '我';
    if (memberNames[memberId]) return memberNames[memberId];
    if (memberId.startsWith('virtual/')) return memberId.replace('virtual/', '');
    return memberId.substring(0, 8) + '...';
  };

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
        if (memberId.startsWith('virtual/')) {
          namesMap[memberId] = memberId.replace('virtual/', '');
          continue;
        }
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
    const handleClickOutside = (event: MouseEvent) => {
      if (payerDropdownRef.current && !payerDropdownRef.current.contains(event.target as Node)) {
        setShowPayerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setVirtualMemberName('');
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
                  <span>{getDisplayName(m)}{isCurrentUser ? ' (我)' : ''}</span>
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
      <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6 sm:mb-8 sticky top-[72px] sm:top-[88px] z-30 shadow-sm backdrop-blur-md bg-white/50 border border-white/20">
        <button
          onClick={() => setActiveTab('bills')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl font-bold transition-all ${
            activeTab === 'bills' 
              ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Receipt size={18} className="hidden sm:block" />
          <span className="text-sm sm:text-base">账单明细</span>
        </button>
        <button
          onClick={() => setActiveTab('split')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl font-bold transition-all ${
            activeTab === 'split' 
              ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowRightLeft size={18} className="hidden sm:block" />
          <span className="text-sm sm:text-base">分账结果</span>
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
                                return getDisplayName(actualPayerId) + (actualPayerId === user.id ? ' (我)' : '');
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
                                      title={getDisplayName(mId)}
                                    >
                                      {getDisplayName(mId)[0] || 'U'}
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] text-gray-400 font-medium truncate">
                                  {bill.involved_members.length === (trip?.members?.length || 0) 
                                    ? '全员' 
                                    : bill.involved_members.map(id => getDisplayName(id)).join(', ')}
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
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!splitResults ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-[32px] py-16 sm:py-24 px-8 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-[24px] flex items-center justify-center mx-auto mb-6">
                  <ArrowRightLeft className="text-gray-300" size={32} />
                </div>
                <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-2">点击上方“分账”生成结算清单</h3>
                <p className="text-sm text-gray-400 font-medium max-w-xs mx-auto">添加账单后，我们将自动计算成员间的转账方案。</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-100 rounded-[24px] p-6 mb-6">
                  <div className="flex items-center gap-3 text-blue-700 mb-2">
                    <Info size={18} />
                    <h4 className="font-bold text-sm sm:text-base">分账方案已生成</h4>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-600 font-medium leading-relaxed">
                    基于所有账单，我们计算出了最优的转账方案。只需按照以下步骤转账即可清空所有债务。
                  </p>
                </div>

                <div className="grid gap-4">
                  {splitResults.details.map((detail: string, idx: number) => {
                    const match = detail.match(/(.+) 支付给 (.+): (.+) 元/);
                    if (!match) return <div key={idx} className="p-6 text-gray-700 font-medium">{detail}</div>;
                    const [_, rawFrom, rawTo, amount] = match;
                    const from = rawFrom.replace(/^virtual\//, '');
                    const to = rawTo.replace(/^virtual\//, '');
                    return (
                      <div key={idx} className="group bg-white border border-gray-100 p-4 sm:p-6 rounded-[24px] hover:shadow-xl hover:shadow-gray-100 transition-all duration-300">
                        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                          <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">付款人</p>
                            <div className="flex items-center justify-center sm:justify-start gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-lg">
                                {from[0]}
                              </div>
                              <span className="font-black text-gray-900 text-base sm:text-lg">{from}</span>
                            </div>
                          </div>

                          <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className="px-4 py-1.5 bg-gray-50 rounded-full text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                              转账
                            </div>
                            <div className="flex flex-col items-center py-2">
                              <div className="text-xl sm:text-2xl font-black text-blue-600 tracking-tighter">
                                <span className="text-sm mr-0.5">￥</span>{amount}
                              </div>
                              <ArrowRight className="text-blue-200 mt-1 hidden sm:block" size={24} />
                              <ArrowDown className="text-blue-200 mt-1 sm:hidden" size={24} />
                            </div>
                          </div>

                          <div className="flex-1 w-full sm:w-auto text-center sm:text-right">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">收款人</p>
                            <div className="flex flex-row-reverse items-center justify-center sm:justify-start gap-3">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center font-black text-lg">
                                {to[0]}
                              </div>
                              <span className="font-black text-gray-900 text-base sm:text-lg">{to}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Bill Modal */}
      {showAddBillModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-2xl rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[95vh] flex flex-col">
            <div className="px-6 sm:px-8 py-5 sm:py-6 border-b flex items-center justify-between bg-blue-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold leading-none">{editingBillId ? '编辑账单' : '记一笔'}</h3>
                  <p className="text-[10px] sm:text-xs text-blue-100 mt-1 uppercase tracking-wider font-bold">
                    {editingBillId ? '修改账单详情' : '记录新的旅行开支'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowAddBillModal(false)} className="hover:rotate-90 transition-all duration-300 p-1">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            
            <form onSubmit={handleAddBill} className="p-6 sm:p-8 space-y-5 sm:space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">账单名称</label>
                  <input
                    type="text"
                    required
                    className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-base text-gray-900"
                    placeholder="如：成都老火锅"
                    value={newBill.name}
                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">金额 (元)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-3 sm:top-3.5 text-gray-400 font-black">￥</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      className="w-full pl-10 pr-4 sm:pr-5 py-3 sm:py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-lg sm:text-xl text-gray-900"
                      placeholder="0.00"
                      value={newBill.cost_yuan}
                      onChange={(e) => setNewBill({ ...newBill, cost_yuan: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">选择类别</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {Object.values(BILL_CATEGORIES).map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setNewBill({ ...newBill, category: cat.id })}
                        className={`flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-2xl transition-all border-2 ${
                          newBill.category === cat.id 
                            ? 'bg-blue-50 border-blue-500 text-blue-600 scale-105 shadow-md shadow-blue-50' 
                            : 'bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={20} className="sm:w-6 sm:h-6" />
                        <span className="text-[10px] sm:text-xs font-bold">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">谁付的钱？</label>
                  <div className="relative" ref={payerDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setShowPayerDropdown(!showPayerDropdown)}
                      className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-900 text-base shadow-sm hover:border-blue-200"
                    >
                      <span className="truncate">{getDisplayName(newBill.payer_id)} {newBill.payer_id === user.id ? '(我)' : ''}</span>
                      <ChevronDown size={18} className={`text-gray-400 transition-transform duration-200 ${showPayerDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showPayerDropdown && (
                      <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        {trip?.members?.map(memberId => (
                          <button
                            key={memberId}
                            type="button"
                            onClick={() => {
                              setNewBill({ ...newBill, payer_id: memberId });
                              setShowPayerDropdown(false);
                            }}
                            className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors hover:bg-blue-50 ${
                              newBill.payer_id === memberId ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="truncate">{getDisplayName(memberId)} {memberId === user.id ? '(我)' : ''}</span>
                              {newBill.payer_id === memberId && <CheckCircle2 size={16} className="text-blue-500" />}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-bold text-gray-700 mb-2">说明 (可选)</label>
                  <textarea
                    className="w-full px-4 sm:px-5 py-3 sm:py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-base text-gray-900"
                    placeholder="添加备注..."
                    rows={1}
                    value={newBill.description}
                    onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  谁参与了分摊？ 
                  <span className="text-gray-400 font-normal text-xs ml-2">默认全选</span>
                </label>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {trip?.members?.map(memberId => (
                    <button
                      key={memberId}
                      type="button"
                      onClick={() => {
                        const newInvolved = newBill.involved_members.includes(memberId)
                          ? newBill.involved_members.filter(id => id !== memberId)
                          : [...newBill.involved_members, memberId];
                        setNewBill({ ...newBill, involved_members: newInvolved });
                      }}
                      className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all border-2 ${
                        newBill.involved_members.includes(memberId)
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100'
                          : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {getDisplayName(memberId)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 pt-2 sm:pt-4 pb-6 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setShowAddBillModal(false)}
                  className="flex-1 px-4 sm:px-6 py-3.5 sm:py-4 border border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 font-bold transition-all text-sm sm:text-base"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 sm:px-6 py-3.5 sm:py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-xl shadow-blue-100 transition-all active:scale-95 text-sm sm:text-base"
                >
                  {editingBillId ? '确认更新' : '确认记账'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[95vh] flex flex-col">
            <div className="px-6 sm:px-8 py-5 sm:py-6 border-b flex items-center justify-between bg-blue-600 text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold leading-none">邀请成员</h3>
                  <p className="text-[10px] sm:text-xs text-blue-100 mt-1 uppercase tracking-wider font-bold">
                    邀请好友加入旅行
                  </p>
                </div>
              </div>
              <button onClick={handleCloseAddMemberModal} className="hover:rotate-90 transition-all duration-300 p-1">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSearchClick(e); }} className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">1. 搜索并添加站内用户</label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    className="flex-1 px-4 sm:px-5 py-3.5 sm:py-4 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-base text-gray-900"
                    placeholder="输入用户名/邮箱/手机号"
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleSearchClick}
                    className="px-4 sm:px-6 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-blue-100 gap-2"
                  >
                    <Search size={18} />
                    搜索
                  </button>
                </div>

                <div className="mt-4 min-h-[120px] flex flex-col">
                  {searchLoading ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-6">
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">搜索中...</p>
                    </div>
                  ) : error ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-6 text-center">
                      <p className="text-red-400 text-sm font-bold">{error}</p>
                    </div>
                  ) : searchedUsers.length === 0 ? (
                    <div className="flex-grow flex flex-col items-center justify-center py-6 text-center border-2 border-dashed border-gray-50 rounded-2xl">
                      <p className="text-gray-300 text-xs font-bold">
                        {searchKeyword ? '未找到相关用户' : '输入关键字搜索好友'}
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="border border-gray-100 rounded-2xl max-h-40 overflow-y-auto shadow-inner bg-gray-50/30">
                        {searchedUsers.map((u) => {
                          const isAlreadyMember = trip?.members?.includes(u.id);
                          return (
                            <div 
                              key={u.id} 
                              className="flex items-center justify-between p-3 border-b border-gray-50 last:border-b-0 hover:bg-white cursor-pointer transition-colors"
                              onClick={() => !isAlreadyMember && handleAddMember(u.id)}
                            >
                              <div className="min-w-0">
                                <p className="font-bold text-gray-800 truncate text-sm">{u.name}</p>
                                <p className="text-[10px] text-gray-400 font-medium truncate">@{u.account_name}</p>
                              </div>
                              {isAlreadyMember ? (
                                <span className="text-[10px] text-gray-300 font-black bg-gray-100 px-3 py-1 rounded-full uppercase shrink-0">已在列</span>
                              ) : (
                                <button 
                                  type="button" 
                                  className="px-3 py-1.5 bg-blue-500 text-white rounded-xl text-[10px] font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 active:scale-95 shrink-0"
                                  onClick={(e) => { e.stopPropagation(); handleAddMember(u.id); }}
                                >
                                  添加
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination */}
                      <div className="flex justify-between items-center mt-4 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-2 py-1 border border-gray-100 rounded-lg text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-30 transition-colors"
                        >
                          上页
                        </button>
                        <span className="text-gray-400 font-bold uppercase tracking-wider">
                          {currentPage} / {Math.ceil(totalSearchedUsers / 5)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage * 5 >= totalSearchedUsers}
                          className="px-2 py-1 border border-gray-100 rounded-lg text-gray-600 font-bold hover:bg-gray-50 disabled:opacity-30 transition-colors"
                        >
                          下页
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">2. 添加虚拟/临时成员</label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    className="flex-1 px-4 sm:px-5 py-3.5 sm:py-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-base text-gray-900"
                    placeholder="输入姓名，如：小明"
                    value={virtualMemberName}
                    onChange={(e) => setVirtualMemberName(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!virtualMemberName.trim()) {
                        alert('请输入成员姓名');
                        return;
                      }
                      handleAddMember(`virtual/${virtualMemberName.trim()}`);
                    }}
                    className="px-4 sm:px-6 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center shadow-lg shadow-emerald-100 gap-2"
                  >
                    <Plus size={18} />
                    创建
                  </button>
                </div>
                <p className="mt-2 text-[10px] text-emerald-600 font-medium">
                  虚拟成员仅存在于当前旅行，无需注册账号。
                </p>
              </div>

              <div className="flex gap-4 pt-2 pb-6 sm:pb-0">
                <button
                  type="button"
                  onClick={handleCloseAddMemberModal}
                  className="flex-1 px-6 py-3.5 sm:py-4 border border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 font-bold transition-all active:scale-95 text-sm sm:text-base"
                >
                  取消
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