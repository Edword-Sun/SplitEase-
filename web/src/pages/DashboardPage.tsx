import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Users, ChevronRight, Wallet, MapPin, Search } from 'lucide-react';
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
    <div className="space-y-8 pb-20">
      {/* Header Section: Search & Actions */}
      <div className="flex flex-col md:flex-row items-center gap-6 px-1">
        <div className="relative flex-grow w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="搜索旅行名称或描述..."
            className="w-full h-[56px] pl-11 pr-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-blue-600 rounded-2xl px-5 h-[56px] flex items-center gap-3 text-white shadow-lg shadow-blue-100">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
              <MapPin size={16} />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-blue-100 text-[9px] font-bold uppercase tracking-wider leading-none">进行中</p>
              <p className="text-lg font-black mt-1 leading-none">{memberTrips.length} <span className="text-[10px] font-normal text-blue-100">个旅行</span></p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="h-[56px] flex items-center justify-center gap-2 bg-blue-600 text-white px-8 rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 font-bold active:scale-95 whitespace-nowrap text-sm"
          >
            <Plus size={18} />
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
          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">我参与的旅行 ({filteredMemberTrips.length})</h3>
          {filteredMemberTrips.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm">
              <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
                <Wallet size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">暂无参与的旅行记录</h3>
              <p className="text-gray-400 mt-2 max-w-xs mx-auto">
                {searchTerm ? '没有找到匹配的旅行，换个关键词试试？' : '加入一个旅行，开始记录您的开支。'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  清空搜索
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMemberTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="group bg-white p-7 rounded-[32px] border border-gray-50 shadow-sm hover:shadow-xl hover:border-blue-100 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 text-gray-200 group-hover:text-blue-500 transition-colors">
                    <ChevronRight size={28} />
                  </div>
                  
                  <div className="flex flex-col h-full">
                    <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors pr-8">
                      {trip.name}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-8 font-medium flex-grow">
                      {trip.description || '这趟旅行还没有添加描述...'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Calendar size={14} className="text-gray-300" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">{formatDate(trip.create_time).split(' ')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Users size={14} className="text-gray-300" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">{trip.members?.length || 0} 成员</span>
                        </div>
                      </div>
                      
                      {/* Avatar stack mock */}
                      <div className="flex -space-x-2">
                        {trip.members?.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400">
                            U{i+1}
                          </div>
                        ))}
                        {(trip.members?.length || 0) > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[8px] font-bold text-blue-400">
                            +{(trip.members?.length || 0) - 3}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 我创建的旅行 */}
          <h3 className="text-xl font-bold text-gray-900 mt-8 mb-4">我创建的旅行 ({filteredCreatorTrips.length})</h3>
          {filteredCreatorTrips.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[32px] border-2 border-dashed border-gray-100 shadow-sm">
              <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 mb-6">
                <Wallet size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">暂无创建的旅行记录</h3>
              <p className="text-gray-400 mt-2 max-w-xs mx-auto">
                {searchTerm ? '没有找到匹配的旅行，换个关键词试试？' : '点击右上角“创建新旅行”开始记录您的第一笔开支。'}
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  清空搜索
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCreatorTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trip/${trip.id}`)}
                  className="group bg-white p-7 rounded-[32px] border border-gray-50 shadow-sm hover:shadow-xl hover:border-blue-100 hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 text-gray-200 group-hover:text-blue-500 transition-colors">
                    <ChevronRight size={28} />
                  </div>
                  
                  <div className="flex flex-col h-full">
                    <h3 className="text-xl font-black text-gray-900 mb-2 group-hover:text-blue-600 transition-colors pr-8">
                      {trip.name}
                    </h3>
                    <p className="text-gray-400 text-sm line-clamp-2 mb-8 font-medium flex-grow">
                      {trip.description || '这趟旅行还没有添加描述...'}
                    </p>
                    
                    <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Calendar size={14} className="text-gray-300" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">{formatDate(trip.create_time).split(' ')[0]}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <Users size={14} className="text-gray-300" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">{trip.members?.length || 0} 成员</span>
                        </div>
                      </div>
                      
                      {/* Avatar stack mock */}
                      <div className="flex -space-x-2">
                        {trip.members?.slice(0, 3).map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-400">
                            U{i+1}
                          </div>
                        ))}
                        {(trip.members?.length || 0) > 3 && (
                          <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-[8px] font-bold text-blue-400">
                            +{(trip.members?.length || 0) - 3}
                          </div>
                        )}
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="px-8 py-6 border-b flex items-center justify-between bg-blue-600 text-white">
              <h3 className="text-xl font-bold">开启新旅程</h3>
              <button onClick={() => setShowAddModal(false)} className="hover:rotate-90 transition-all duration-300">
                <Plus size={28} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddTrip} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">旅行名称</label>
                <input
                  type="text"
                  required
                  autoFocus
                  className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  placeholder="例如：2026 成都美食之旅"
                  value={newTrip.name}
                  onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">简单描述</label>
                <textarea
                  className="w-full px-5 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  placeholder="这趟旅行有什么特别的计划吗？"
                  rows={3}
                  value={newTrip.description}
                  onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-4 border border-gray-100 text-gray-500 rounded-2xl hover:bg-gray-50 font-bold transition-all"
                >
                  算了吧
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-xl shadow-blue-100 transition-all active:scale-95"
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
