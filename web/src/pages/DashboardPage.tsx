import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Calendar, Users, ChevronRight, Wallet } from 'lucide-react';
import api from '../api/client';
import { Trip, User } from '../types';

const DashboardPage = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTrip, setNewTrip] = useState({ name: '', description: '' });
  const navigate = useNavigate();
  const user: User = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchTrips = async () => {
    try {
      const response = await api.post('/trip/find_by_creator', { creator: user.id });
      setTrips(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

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
      fetchTrips();
    } catch (error) {
      console.error('Failed to add trip:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">我的旅行</h2>
          <p className="text-gray-500 text-sm mt-1">管理您的所有分账活动</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>新建旅行</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <Wallet size={32} />
          </div>
          <h3 className="text-lg font-medium text-gray-900">暂无旅行</h3>
          <p className="text-gray-500 mt-1">点击右上角按钮开始您的第一次分账</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trips.map((trip) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="group bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 text-gray-300 group-hover:text-blue-500 transition-colors">
                <ChevronRight size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {trip.name}
              </h3>
              <p className="text-gray-500 text-sm line-clamp-2 mb-6 h-10">
                {trip.description || '暂无描述'}
              </p>
              <div className="flex items-center gap-4 text-gray-400 text-xs font-medium">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  <span>{new Date(trip.create_time).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users size={14} />
                  <span>{trip.members?.length || 0} 位成员</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">新建旅行</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddTrip} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">旅行名称</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="如：成都五日游"
                  value={newTrip.name}
                  onChange={(e) => setNewTrip({ ...newTrip, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  placeholder="简单描述一下这次旅行..."
                  rows={3}
                  value={newTrip.description}
                  onChange={(e) => setNewTrip({ ...newTrip, description: e.target.value })}
                />
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm transition-colors"
                >
                  创建
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
