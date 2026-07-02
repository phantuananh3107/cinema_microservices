import axios from 'axios'
import { useEffect, useState } from 'react'
import { FaCheckCircle, FaExclamationTriangle, FaKey } from 'react-icons/fa'
import { useNavigate, useSearchParams } from 'react-router-dom'

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const email = searchParams.get('email')
  const code = searchParams.get('code')

  useEffect(() => {
    // If we have a code from URL, auto-fill it
    if (code) {
      setOtp(code)
    }
  }, [code])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) {
      setError('Email không hợp lệ')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await axios.post(`${API_URL}/auth/verify-otp`, {
        email: email,
        otp: otp,
      })

      setSuccess('Xác thực thành công! Đang chuyển hướng...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Xác thực thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    if (!email) {
      setError('Email không hợp lệ')
      return
    }

    setLoading(true)
    try {
      await axios.post(`${API_URL}/auth/resend-otp`, { email })
      setSuccess('OTP mới đã được gửi đến email của bạn')
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi lại OTP')
    } finally {
      setLoading(false)
    }
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-black/80 backdrop-blur-sm border border-red-600/30 rounded-2xl p-8 shadow-2xl text-center">
            <FaExclamationTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-4">Lỗi xác thực</h1>
            <p className="text-gray-400 mb-6">Link xác thực không hợp lệ hoặc đã hết hạn</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
            >
              Về trang đăng nhập
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-black/80 backdrop-blur-sm border border-red-600/30 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-r from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg">
              <FaKey className="text-white text-2xl" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Xác thực OTP</h1>
            <p className="text-gray-400 text-sm">Nhập mã OTP được gửi đến:</p>
            <p className="text-red-400 text-sm font-medium">{email}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Mã OTP</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaKey className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  maxLength="6"
                  required
                  className="w-full pl-10 pr-3 py-3 bg-gray-800/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300 text-center text-lg tracking-widest"
                  placeholder="123456"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-900/50 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg text-sm flex items-center">
                <FaCheckCircle className="mr-2" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 disabled:from-gray-600 disabled:to-gray-800 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-red-600/25 disabled:transform-none disabled:shadow-none"
            >
              {loading ? 'Đang xác thực...' : 'Xác thực'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-400 text-sm mb-4">Không nhận được OTP?</p>
            <button
              onClick={handleResendOtp}
              disabled={loading}
              className="text-red-400 hover:text-red-300 font-medium transition-colors duration-300 disabled:text-gray-500"
            >
              Gửi lại OTP
            </button>
          </div>

          <div className="mt-6 text-center space-y-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full text-gray-400 hover:text-white text-sm transition-colors duration-300 py-2 border border-gray-600/50 rounded-lg hover:border-gray-500"
            >
              Xác thực sau (Sẽ được yêu cầu khi đăng nhập)
            </button>
            <p className="text-gray-500 text-xs">
              Nếu bỏ qua bây giờ, bạn sẽ cần xác thực OTP khi đăng nhập lần đầu
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
