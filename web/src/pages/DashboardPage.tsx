import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Users, ChevronRight, Wallet, MapPin, Search, Trash2 } from 'lucide-react';
import api from '../api/client';
import { Trip, User } from '../types';
import { formatDate } from '../utils/format';

const DashboardPage = () => {
  const [trips, setTrips] = useState<Trip[]>([]); // This will now be creatorTrips
  const [memberTrips, setMemberTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: '', description: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchCreatorTrips = async () => {
    try {
      setLoading(true);
      // Fixed endpoint and parameter name to match backend: /trip/find_by_creator_id
      const response = await api.post('/trip/find_by_creator_id', { creator_id: user.id });
      setTrips(response.data.data || response.data.trips || []);
    } catch (error) {
      console.warn('Trip listing API might be missing or failed:', error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (e: React.MouseEvent, tripId: string, tripName: string) => {
    e.stopPropagation(); // 阻止跳转到详情页
    if (window.confirm(`确定要永久删除旅行“${tripName}”吗？\n该操作将同时抹除所有关联账单，且无法恢复。`)) {
      try {
        await api.post('/trip/delete_by_id', { id: tripId });
        await fetchCreatorTrips(); // 刷新列表
      } catch (err) {
        console.error('Failed to delete trip:', err);
        alert('删除失败，请稍后重试');
      }
    }
  };

  const fetchMemberTrips = async () => {
    try {
      const response = await api.post('/trip/find_by_member', { member_id: user.id });
      setMemberTrips(response.data.data || []);
    } catch (error) {
      console.warn('Member trip listing API might be missing or failed:', error);
      setMemberTrips([]);
    }
  };

  useEffect(() => {
    if (!user.id) {
      navigate('/login');
      return;
    }
    fetchCreatorTrips();
    fetchMemberTrips();
  }, [user.id]);

  const handleAddTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/trip/add', {
        ...newTrip,
        creator: user.id,
        members: [user.id], // Creator is the first member
      });
      setShowAddModal(false);
      setNewTrip({ name: '', description: '' });
      fetchCreatorTrips();
    } catch (error: any) {
      alert(error.response?.data?.error || '创建失败');
    }
  };

  const filteredCreatorTrips = trips.filter(trip => 
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMemberTrips = memberTrips.filter(trip => 
    trip.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trip.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header Section: Search & Actions */}
      <div className="flex flex-col gap-4 px-1">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="搜索旅行名称或描述..."
            className="w-full h-[44px] pl-11 pr-4 bg-white border border-gray-100 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-row items-center justify-between gap-3 w-full">
          <div className="bg-blue-600 rounded-xl px-3 h-[44px] flex items-center gap-2 text-white shadow-lg shadow-blue-100 flex-1 min-w-0">
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <MapPin size={12} />
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <p className="text-blue-100 text-[6px] font-bold uppercase tracking-wider leading-none">进行中</p>
              <p className="text-xs font-black mt-0.5 leading-none truncate">{memberTrips.length} <span className="text-[9px] font-normal text-blue-100">个旅行</span></p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="h-[44px] flex items-center justify-center gap-2 bg-blue-600 text-white px-4 rounded-xl hover:shadow-xl hover:shadow-blue-100 transition-all shadow-lg shadow-blue-50 font-bold active:scale-95 whitespace-nowrap text-xs flex-1"
          >
            <Plus size={14} />
            <span>新旅行</span>
          </button>
        </div>
      </div>

      {/* Trips Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-3xl"></div>
          ))}
        </div>
      ) : (
        <>
          {/* 我参与的旅行 */}
          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3 px-1">我参与的旅行 ({filteredMemberTrips.length})</h3>
          {filteredMemberTrips.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-gray-100 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                <Wallet size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">暂无参与的旅行记录</h3>
              <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto">
                {searchTerm ? '没有找到匹配的旅行，换个关键词试试？' : '加入一个旅行，开始记录您的开支。'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-emerald-600 text-sm font-bold hover:underline"
                >
                  清空搜索
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMemberTrips.map((trip) => (
                  <div
                    key={trip.id}
                    onClick={() => navigate(`/trip/${trip.id}`)}
                    className="group bg-white p-4 rounded-xl border border-gray-50 shadow-sm hover:shadow-xl hover:border-blue-100 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 text-gray-200 group-hover:text-blue-500 transition-colors">
                      <ChevronRight size={20} />
                    </div>
                    
                    <div className="flex flex-col h-full">
                      <h3 className="text-base font-black text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors pr-8 truncate">
                        {trip.name}
                      </h3>
                      <p className="text-gray-400 text-[11px] line-clamp-2 mb-4 font-medium flex-grow">
                        {trip.description || '这趟旅行还没有添加描述...'}
                      </p>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 text-gray-400">
                            <Calendar size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">{formatDate(trip.create_time).split(' ')[0]}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Users size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-tight">{trip.members?.length || 0} 成员</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          )}

          {/* 我创建的旅行 */}
          <h3 className="text-lg font-bold text-gray-900 mt-6 mb-3 px-1">我创建的旅行 ({filteredCreatorTrips.length})</h3>
          {filteredCreatorTrips.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-gray-100 shadow-sm">
              <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-4">
                <Wallet size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">暂无创建的旅行记录</h3>
              <p className="text-gray-400 mt-2 text-sm max-w-xs mx-auto">
                {searchTerm ? '没有找到匹配的旅行，换个关键词试试？' : '点击右上角“创建新旅行”开始记录您的第一笔开支。'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-3 text-emerald-600 text-sm font-bold hover:underline"
                >
                  清空搜索
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCreatorTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="group bg-white p-4 rounded-xl border border-gray-50 shadow-sm hover:shadow-xl hover:border-blue-100 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden"
                >
                  <button
                    onClick={(e) => handleDeleteTrip(e, trip.id, trip.name)}
                    className="absolute top-2.5 right-10 p-1 bg-red-50 text-red-500 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-red-100 z-10"
                    title="删除旅行"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className="absolute top-0 right-0 p-3 text-gray-200 group-hover:text-blue-500 transition-colors">
                    <ChevronRight size={20} />
                  </div>
                  
                  <div className="flex flex-col h-full">
                    <h3 className="text-base font-black text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors pr-10 truncate">
                      {trip.name}
                    </h3>
                    <p className="text-gray-400 text-[11px] line-clamp-2 mb-4 font-medium flex-grow">
                      {trip.description || '这趟旅行还没有添加描述...'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-gray-400">
                          <Calendar size={10} />
                          <span className="text-[9px] font-bold uppercase tracking-tight">{formatDate(trip.create_time).split(' ')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400">
                          <Users size={10} />
                          <span className="text-[9px] font-bold uppercase tracking-tight">{trip.members?.length || 0} 成员</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create Trip Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom sm:zoom-in duration-300 max-h-[95vh] flex flex-col">
            <div className="px-5 py-3.5 border-b flex items-center justify-between bg-blue-600 text-white shrink-0">
              <h3 className="text-base font-bold">开启新旅程</h3>
              <button onClick={() => setShowAddModal(false)} className="hover:rotate-90 transition-all duration-300 p-1">
                <Plus size={20} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddTrip} className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-2">旅行名称</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm text-gray-900"
                  placeholder="例如：2026 成都美食之旅"
                  value={newTrip.name}
                  onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-2">简单描述</label>
                <textarea
                  className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium text-sm text-gray-900"
                  placeholder="这趟旅行有什么特别的计划吗？"
                  rows={2}
                  value={newTrip.description}
                  onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 pt-2 pb-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-100 text-gray-500 rounded-xl hover:bg-gray-50 font-bold transition-all text-xs"
                >
                  算了吧
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-100 font-bold transition-all active:scale-95 text-xs"
                >
                  立即出发
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
