import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // 允许跨域携带 Cookie
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：自动注入 Authorization Header
api.interceptors.request.use((config) => {
  const sessionID = localStorage.getItem('sessionID');
  if (sessionID) {
    config.headers.Authorization = sessionID;
  }
  return config;
});

// 响应拦截器：统一处理 401 未授权
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // 清除本地过期的用户信息
      localStorage.removeItem('user');
      // 跳转到登录页
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
