import axios from 'axios'
import { useState } from 'react'
import { FaEnvelope, FaEye, FaEyeSlash, FaLock } from 'react-icons/fa'
import { Link, useNavigate } from 'react-router-dom'
import websocketService from '../../services/websocketService'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password })
      if (res.data?.user?.role && res.data.user.role !== 'customer') {
        setError('Tài khoản không thuộc khách hàng. Vui lòng đăng nhập tại trang quản trị.')
        return
      }
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('user', JSON.stringify(res.data.user))

      if (res.data.user && res.data.user.id) {
        websocketService.connect(res.data.user.id.toString())
      }

      if (onLogin) onLogin()
      navigate('/')
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.requireVerification) {
        navigate(`/verify?email=${encodeURIComponent(errorData.email)}`)
        return
      }
      setError(errorData?.message || 'Đăng nhập thất bại')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-black/80 backdrop-blur-sm border border-red-600/30 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">HQ</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Đăng Nhập</h1>
            <p className="text-gray-400 text-sm">Trải nghiệm điện ảnh đỉnh cao</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaEnvelope className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-3 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
                  placeholder="Nhập email của bạn"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Mật khẩu</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-12 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-red-500 transition-colors duration-300"
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 text-red-600 bg-gray-800 border-gray-600 rounded focus:ring-red-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-300">Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                className="text-sm text-red-400 hover:text-red-300 transition-colors duration-300"
              >
                Quên mật khẩu?
              </button>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-600/25"
            >
              ĐĂNG NHẬP
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm">
              Chưa có tài khoản?{' '}
              <Link
                to="/register"
                className="text-red-400 hover:text-red-300 font-medium transition-colors duration-300"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
