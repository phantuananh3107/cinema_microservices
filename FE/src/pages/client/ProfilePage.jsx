import { useEffect, useState } from 'react'
import {
  FaCalendarAlt,
  FaEdit,
  FaEnvelope,
  FaEyeSlash,
  FaMapMarkerAlt,
  FaPhone,
  FaSave,
  FaTimes,
  FaUser,
  FaWallet,
  FaBitcoin,
  FaEthereum,
  FaCheckCircle,
  FaExclamationTriangle,
} from 'react-icons/fa'
import { ethers } from 'ethers'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/Header'
import { userService } from '../../services/userService'
import { bookingService } from '../../services/bookingService'

export default function ProfilePage() {
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [userData, setUserData] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState('')
  const [walletBalance, setWalletBalance] = useState({})
  const [isConnecting, setIsConnecting] = useState(false)
  const [recentBookings, setRecentBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'))
        if (user && user.id) {
          const response = await userService.getUserById(user.id)
          if (response.success) {
            setUserData(response.data)
            setEditForm(response.data)
          } else {
            console.error('Error fetching user data:', response.message)
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    fetchUserData()
    checkWalletConnection()
  }, [])

  useEffect(() => {
    if (userData && userData.id) {
      fetchRecentBookings()
    }
  }, [userData])

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          setWalletConnected(true)
          setWalletAddress(accounts[0].address)
          await fetchWalletBalance(accounts[0].address, provider)
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('MetaMask chưa được cài đặt. Vui lòng cài đặt MetaMask để tiếp tục.')
      return
    }

    setIsConnecting(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      
      if (accounts.length > 0) {
        setWalletConnected(true)
        setWalletAddress(accounts[0])
        await fetchWalletBalance(accounts[0], provider)
        alert('Kết nối ví thành công!')
      }
    } catch (error) {
      alert('Không thể kết nối ví. Vui lòng thử lại.')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletConnected(false)
    setWalletAddress('')
    setWalletBalance({})
    alert('Đã ngắt kết nối ví')
  }

  const fetchWalletBalance = async (address, provider) => {
    try {
      const balance = await provider.getBalance(address)
      const ethBalance = ethers.formatEther(balance)
      
      // Simulate other token balances (in real app, you'd query token contracts)
      const balances = {
        ETH: parseFloat(ethBalance).toFixed(4),
        BTC: '0.01',
        USDT: '1000'
      }
      setWalletBalance(balances)
    } catch (error) {
      console.error('Error fetching wallet balance:', error)
    }
  }

  const fetchRecentBookings = async () => {
    if (!userData?.id) return
    
    setLoadingBookings(true)
    try {
      const response = await bookingService.getUserBookings(1, 3)
      if (response.code === 200) {
        setRecentBookings(response.data.bookings || [])
      }
    } catch (error) {
      console.error('Error fetching recent bookings:', error)
    } finally {
      setLoadingBookings(false)
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const handleEdit = () => {
    setIsEditing(true)
    setEditForm({ ...userData })
  }

  const handleSave = async () => {
    try {
      const { email, ...updateData } = editForm
      const response = await userService.updateUser(userData.id, updateData)
      if (response.success) {
        setUserData({ ...editForm })
        setIsEditing(false)
        console.log('User data updated successfully:', response.message)
      } 
    } catch (error) {
      console.error('Error updating user data:', error)
    }
  }

  const handleCancel = () => {
    setEditForm({ ...userData })
    setIsEditing(false)
  }

  const handleInputChange = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('vi-VN')
  }

  const getMembershipColor = (type) => {
    switch (type) {
      case 'VIP':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
      case 'Premium':
        return 'bg-gradient-to-r from-purple-400 to-purple-600'
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-600'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-600/20 text-green-400'
      case 'PENDING':
        return 'bg-yellow-600/20 text-yellow-400'
      case 'CANCELLED':
        return 'bg-red-600/20 text-red-400'
      default:
        return 'bg-gray-600/20 text-gray-400'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Đã xác nhận'
      case 'pending':
        return 'Đang chờ'
      case 'cancelled':
        return 'Đã hủy'
      default:
        return status
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price)
  }

  if (!userData) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-gray-900 rounded-2xl p-8 mb-8">
          <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
            {/* Avatar */}
            <div className="relative">
              <img
                src={
                  userData.avatar ||
                  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face'
                }
                alt="Avatar"
                className="w-32 h-32 rounded-full object-cover border-4 border-red-600"
              />
              <div
                className={`absolute -bottom-2 -right-2 px-3 py-1 rounded-full text-xs font-bold text-white ${getMembershipColor(userData.membershipType)}`}
              >
                {userData.membershipType}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 text-center lg:text-left">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
                <h1 className="text-3xl font-bold text-white mb-2 lg:mb-0">{userData.name}</h1>
                {!isEditing ? (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors duration-300 flex items-center space-x-2 mx-auto lg:mx-0"
                  >
                    <FaEdit />
                    <span>Chỉnh sửa</span>
                  </button>
                ) : (
                  <div className="flex space-x-2 mx-auto lg:mx-0">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 flex items-center space-x-2"
                    >
                      <FaSave />
                      <span>Lưu</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors duration-300 flex items-center space-x-2"
                    >
                      <FaTimes />
                      <span>Hủy</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-gray-300">
                <div className="text-center lg:text-left">
                  <p className="text-gray-400 text-sm">Tham gia từ</p>
                  <p className="font-medium">
                    {userData.joinDate ? formatDate(userData.joinDate) : 'N/A'}
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-gray-400 text-sm">Tổng số vé đã đặt</p>
                  <p className="font-medium text-red-400">
                    {userData.totalBookings ? `${userData.totalBookings} vé` : 'N/A'}
                  </p>
                </div>
                <div className="text-center lg:text-left">
                  <p className="text-gray-400 text-sm">Thể loại yêu thích</p>
                  <p className="font-medium">
                    {userData.favoriteGenres ? userData.favoriteGenres.join(', ') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <div className="bg-gray-900 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
              <FaUser className="text-red-600" />
              <span>Thông tin cá nhân</span>
            </h2>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Họ và tên</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full bg-black border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-600"
                  />
                ) : (
                  <p className="text-white">{userData.name}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2 flex items-center space-x-2">
                  <FaEnvelope className="w-4 h-4" />
                  <span>Email</span>
                </label>
                <p className="text-white bg-gray-800 px-3 py-2 rounded-lg">{userData.email}</p>
                <p className="text-gray-500 text-xs mt-1">Email không thể thay đổi</p>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2 flex items-center space-x-2">
                  <FaPhone className="w-4 h-4" />
                  <span>Số điện thoại</span>
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={editForm.phone_number}
                    onChange={(e) => handleInputChange('phone_number', e.target.value)}
                    className="w-full bg-black border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-600"
                  />
                ) : (
                  <p className="text-white">{userData.phone_number}</p>
                )}
              </div>

              {/* Birth Date */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2 flex items-center space-x-2">
                  <FaCalendarAlt className="w-4 h-4" />
                  <span>Ngày sinh</span>
                </label>
                {isEditing ? (
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className="w-full bg-black border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-600"
                  />
                ) : (
                  <p className="text-white">{formatDate(userData.dob)}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">Giới tính</label>
                {isEditing ? (
                  <select
                    value={editForm.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                    className="w-full bg-black border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-600"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                ) : (
                  <p className="text-white">
                    {userData.gender === 'male'
                      ? 'Nam'
                      : userData.gender === 'female'
                        ? 'Nữ'
                        : 'Khác'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Address & Security */}
          <div className="space-y-8">
            {/* Address Information */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <FaMapMarkerAlt className="text-red-600" />
                <span>Địa chỉ</span>
              </h2>

              <div>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  Địa chỉ hiện tại
                </label>
                {isEditing ? (
                  <textarea
                    value={editForm.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    rows="3"
                    className="w-full bg-black border border-gray-600 text-white px-3 py-2 rounded-lg focus:outline-none focus:border-red-600 resize-none"
                  />
                ) : (
                  <p className="text-white">{userData.address}</p>
                )}
              </div>
            </div>

            {/* Wallet Integration */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <FaWallet className="text-red-600" />
                <span>Ví Blockchain</span>
              </h2>

              {walletConnected ? (
                <div className="space-y-4">
                  <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaCheckCircle className="text-green-400" />
                      <span className="text-green-400 font-medium">Ví đã kết nối</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Địa chỉ: <code className="bg-gray-800 px-2 py-1 rounded text-xs">{formatAddress(walletAddress)}</code>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-white font-medium">Số dư ví</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <FaEthereum className="text-blue-400" />
                          <span className="text-white">Ethereum</span>
                        </div>
                        <span className="text-white font-medium">{walletBalance.ETH || '0'} ETH</span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <FaBitcoin className="text-orange-400" />
                          <span className="text-white">Bitcoin</span>
                        </div>
                        <span className="text-white font-medium">{walletBalance.BTC || '0'} BTC</span>
                      </div>
                      <div className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                          <span className="text-white">USDT</span>
                        </div>
                        <span className="text-white font-medium">{walletBalance.USDT || '0'} USDT</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={disconnectWallet}
                    className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-300"
                  >
                    Ngắt kết nối ví
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaExclamationTriangle className="text-yellow-400" />
                      <span className="text-yellow-400 font-medium">Chưa kết nối ví</span>
                    </div>
                    <p className="text-gray-300 text-sm">
                      Kết nối ví MetaMask để thanh toán bằng tiền điện tử
                    </p>
                  </div>

                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2"
                  >
                    {isConnecting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Đang kết nối...</span>
                      </>
                    ) : (
                      <>
                        <FaWallet />
                        <span>Kết nối MetaMask</span>
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <p className="text-gray-400 text-xs">
                      Chưa có MetaMask? 
                      <a 
                        href="https://metamask.io/download/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 ml-1"
                      >
                        Tải về ngay
                      </a>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Security */}
            <div className="bg-gray-900 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Bảo mật</h2>

              <div className="space-y-4">
                <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors duration-300 flex items-center justify-center space-x-2">
                  <FaEyeSlash />
                  <span>Đổi mật khẩu</span>
                </button>

                <button className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors duration-300">
                  Bảo mật hai lớp
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* Booking History Preview */}
        <div className="bg-gray-900 rounded-2xl p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">Lịch sử đặt vé gần đây</h2>
            <button 
              onClick={() => navigate('/booking-history')}
              className="text-red-400 hover:text-red-300 font-medium transition-colors duration-300"
            >
              Xem tất cả
            </button>
          </div>

          {loadingBookings ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : recentBookings.length > 0 ? (
            <div className="space-y-4">
              {recentBookings.map((booking) => (
                <div key={booking.id} className="bg-black/50 rounded-lg p-4 border border-gray-700">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{booking.movie_title || 'Phim không xác định'}</h3>
                      <p className="text-gray-400 text-sm mb-1">
                        {booking.showtime_date ? formatDate(booking.showtime_date) : 'N/A'} - {booking.seat_numbers || 'Ghế không xác định'}
                      </p>
                      <p className="text-red-400 text-sm font-medium">
                        {formatPrice(booking.total_amount || 0)}
                      </p>
                    </div>
                    <div className="mt-2 md:mt-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}
                      >
                        {getStatusText(booking.status)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Chưa có lịch sử đặt vé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
