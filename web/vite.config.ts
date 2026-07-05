import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 根据当前工作目录中的 `mode` 加载 .env 文件
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      legacy({
        targets: ['defaults', 'not IE 11', 'android >= 6', 'ios >= 10'],
        additionalLegacyPolyfills: ['regenerator-runtime/runtime']
      })
    ],
    server: {
      port: Number(env.VITE_PORT) || 3000,
      host: true, // 允许局域网访问
      proxy: {
        [env.VITE_API_PREFIX || '/api']: {
          target: env.VITE_API_TARGET || 'http://localhost:8080',
          changeOrigin: true,
          rewrite: (path) => path.replace(new RegExp(`^${env.VITE_API_PREFIX || '/api'}`), '')
        }
      }
    },
    build: {
      target: ['es2015', 'chrome80', 'safari12'], // 提高移动端浏览器兼容性
      cssTarget: 'chrome80'
    }
  }
})
