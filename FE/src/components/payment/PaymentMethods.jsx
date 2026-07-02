import { useEffect, useState } from 'react'
import { FaCopy, FaWallet, FaCheck, FaMoneyBillWave } from 'react-icons/fa'
import { ethers } from 'ethers'
import Toast from '../Toast'
import { buildSepayQrUrl, getBankTransferCode, getBankTransferDescription, paymentConfig } from '../../constants/paymentConfig'

const PaymentMethods = ({ booking, onPaymentSuccess, isBoxOffice = false, onManualConfirm = null, theme = 'dark' }) => {
  const [paymentMethod, setPaymentMethod] = useState(isBoxOffice ? 'cash' : 'vnd')
  const [qrCodeUrl, setQrCodeUrl] = useState('')

  const isLight = theme === 'light'
  const bgPrimary = isLight ? 'bg-white' : 'bg-gray-900'
  const bgSecondary = isLight ? 'bg-gray-50' : 'bg-gray-800'
  const textPrimary = isLight ? 'text-gray-900' : 'text-white'
  const textSecondary = isLight ? 'text-gray-600' : 'text-gray-400'
  const borderColor = isLight ? 'border-gray-200' : 'border-gray-800'
  const btnInactive = isLight ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'

  const [walletAddress, setWalletAddress] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [cryptoAmount, setCryptoAmount] = useState(0)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [ethUsdPrice, setEthUsdPrice] = useState(0)
  const [vndUsdRate, setVndUsdRate] = useState(0)
  const [loadingPrice, setLoadingPrice] = useState(true)
  const [confirmingManually, setConfirmingManually] = useState(false)

  const [toast, setToast] = useState(null)

  const PAYMENT_RECEIVER = paymentConfig.cryptoReceiver
  const SEPOLIA_CHAIN_ID = paymentConfig.cryptoChainId

  const showToast = (message, type = 'info', txHash = null) => {
    setToast({ message, type, txHash })
  }

  const closeToast = () => {
    setToast(null)
  }

  useEffect(() => {
    if (booking) {
      setQrCodeUrl(buildSepayQrUrl(booking.id, booking.total_amount))
    }
  }, [booking])

  useEffect(() => {
    fetchCryptoPrices().then()
    checkWalletConnection().then()
  }, [])

  useEffect(() => {
    if (booking && ethUsdPrice && vndUsdRate) {
      const usdAmount = booking.total_amount * vndUsdRate
      const ethAmount = usdAmount / ethUsdPrice
      setCryptoAmount(ethAmount)
    }
  }, [booking, ethUsdPrice, vndUsdRate])

  const fetchCryptoPrices = async () => {
    try {
      setLoadingPrice(true)
      const ethResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd')
      const ethData = await ethResponse.json()
      const ethPrice = ethData.ethereum.usd
      setEthUsdPrice(ethPrice)

      const vndResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const vndData = await vndResponse.json()
      const vndRate = 1 / vndData.rates.VND
      setVndUsdRate(vndRate)
    } catch (err) {
      setEthUsdPrice(2000)
      setVndUsdRate(0.000040)
    } finally {
      setLoadingPrice(false)
    }
  }

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.listAccounts()
        if (accounts.length > 0) {
          setWalletAddress(accounts[0].address)
        }
      } catch (err) {
        console.error('Error checking wallet connection:', err)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      showToast('Please install MetaMask to use crypto payment!', 'warning')
      window.open('https://metamask.io/download/', '_blank')
      return
    }

    try {
      setIsConnecting(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      await provider.send('eth_requestAccounts', [])

      const network = await provider.getNetwork()
      const currentChainId = '0x' + network.chainId.toString(16)

      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          })
        } catch (switchError) {
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: SEPOLIA_CHAIN_ID,
                  chainName: 'Sepolia Testnet',
                  nativeCurrency: {
                    name: 'SepoliaETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://rpc.sepolia.org'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }],
              })
            } catch (addError) {
              if (addError.code === 4001) {
                showToast('Bạn đã từ chối thêm mạng Sepolia vào MetaMask', 'warning')
              } else {
                showToast('Không thể thêm mạng Sepolia vào MetaMask', 'error')
              }
              setIsConnecting(false)
              return
            }
          } else if (switchError.code === 4001) {
            showToast('Bạn đã từ chối chuyển sang mạng Sepolia. Vui lòng chuyển mạng thủ công để sử dụng thanh toán crypto.', 'warning')
            setIsConnecting(false)
            return
          } else {
            showToast('Không thể chuyển sang mạng Sepolia', 'error')
            setIsConnecting(false)
            return
          }
        }
      }

      const signer = await provider.getSigner()
      const address = await signer.getAddress()
      setWalletAddress(address)
    } catch (err) {
      let errorMessage = 'Không thể kết nối ví'
      if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
        errorMessage = 'Bạn đã từ chối kết nối ví.'
      } else if (err.message) {
        if (err.message.includes('user rejected') || err.message.includes('User denied')) {
          errorMessage = 'Bạn đã từ chối kết nối ví.'
        } else {
          errorMessage = `Lỗi kết nối ví: ${err.message.substring(0, 100)}`
        }
      }
      showToast(errorMessage, 'error')
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress('')
  }

  const handleCryptoPayment = async () => {
    if (!walletAddress) {
      showToast('Please connect your wallet first!', 'warning')
      return
    }

    try {
      setIsPaying(true)
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      const tx = await signer.sendTransaction({
        to: PAYMENT_RECEIVER,
        value: ethers.parseEther(cryptoAmount.toFixed(6)),
      })

      showToast(`Transaction sent! Hash: ${tx.hash.substring(0, 10)}...`, 'success', tx.hash)

      await tx.wait()

      try {
        const token = isBoxOffice ? localStorage.getItem('adminToken') : localStorage.getItem('token')
        const verifyResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1'}/payments/crypto/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            booking_id: booking.id,
            tx_hash: tx.hash,
            from_address: walletAddress,
            to_address: PAYMENT_RECEIVER,
            amount_eth: cryptoAmount.toFixed(6),
            amount_vnd: booking.total_amount,
            network: 'ethereum',
          }),
        })

        if (!verifyResponse.ok) {
          throw new Error('Backend verification failed')
        }
      } catch (verifyErr) {
        console.error('Error verifying with backend:', verifyErr)
      }

      setPaymentSuccess(true)
      showToast('Payment successful! Transaction confirmed.', 'success')
      setTimeout(() => {
        onPaymentSuccess()
      }, 2000)
    } catch (err) {
      let errorMessage = 'Thanh toán thất bại'
      if (err.code === 'ACTION_REJECTED' || err.code === 4001) {
        errorMessage = 'Bạn đã từ chối giao dịch. Vui lòng thử lại nếu muốn thanh toán.'
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Số dư trong ví không đủ để thực hiện giao dịch.'
      } else if (err.code === 'NETWORK_ERROR') {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.'
      } else if (err.message && err.message.includes('insufficient funds')) {
        errorMessage = 'Số dư trong ví không đủ.'
      } else if (err.message) {
        errorMessage = `Lỗi: ${err.message.substring(0, 100)}`
      }
      showToast(errorMessage, 'error')
    } finally {
      setIsPaying(false)
    }
  }

  const handleCashPayment = async () => {
    if (!onManualConfirm) return

    try {
      setConfirmingManually(true)
      await onManualConfirm('CASH')
      setPaymentSuccess(true)
      showToast('Đã xác nhận thanh toán tiền mặt!', 'success')
      setTimeout(() => {
        onPaymentSuccess()
      }, 1500)
    } catch (err) {
      showToast('Lỗi xác nhận thanh toán: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setConfirmingManually(false)
    }
  }

  const handleManualConfirm = async () => {
    if (!onManualConfirm) return

    try {
      setConfirmingManually(true)
      const method = paymentMethod === 'vnd' ? 'BANK_TRANSFER' : 'CRYPTOCURRENCY'
      await onManualConfirm(method)
      setPaymentSuccess(true)
      showToast('Đã xác nhận thanh toán!', 'success')
      setTimeout(() => {
        onPaymentSuccess()
      }, 1500)
    } catch (err) {
      showToast('Lỗi xác nhận thanh toán: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setConfirmingManually(false)
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price)
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then()
    showToast('Đã sao chép!', 'success')
  }

  const shortenAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          txHash={toast.txHash}
          onClose={closeToast}
        />
      )}

      <div className="flex gap-4 mb-6">
        {isBoxOffice && (
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 ${
              paymentMethod === 'cash'
                ? 'bg-green-600 text-white'
                : btnInactive
            }`}
          >
            <FaMoneyBillWave /> Tiền mặt
          </button>
        )}
        <button
          onClick={() => setPaymentMethod('vnd')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors duration-300 ${
            paymentMethod === 'vnd'
              ? 'bg-red-600 text-white'
              : btnInactive
          }`}
        >
          Chuyển khoản VND
        </button>
        <button
          onClick={() => setPaymentMethod('crypto')}
          className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center gap-2 ${
            paymentMethod === 'crypto'
              ? 'bg-blue-600 text-white'
              : btnInactive
          }`}
        >
          <FaWallet /> Crypto
        </button>
      </div>

      <div className={`${bgPrimary} rounded-xl shadow-lg p-8 border ${borderColor}`}>
        {paymentSuccess && (
          <div className={`mb-6 p-4 ${isLight ? 'bg-green-50' : 'bg-green-900/50'} border border-green-600 rounded-lg flex items-center gap-3`}>
            <FaCheck className="text-green-400 text-2xl" />
            <div>
              <p className="text-green-400 font-semibold">Thanh toán thành công!</p>
              <p className={`${textSecondary} text-sm`}>Đang chuyển hướng...</p>
            </div>
          </div>
        )}

        {paymentMethod === 'cash' && isBoxOffice && (
          <div className="text-center">
            <h2 className={`text-2xl font-bold ${textPrimary} mb-4`}>Thanh toán tiền mặt</h2>
            <div className={`${bgSecondary} p-6 rounded-lg mb-6`}>
              <p className={`text-sm ${textSecondary} mb-2`}>Số tiền cần thanh toán</p>
              <p className="text-3xl font-bold text-green-400">{formatPrice(booking?.total_amount)}</p>
            </div>
            <button
              onClick={handleCashPayment}
              disabled={confirmingManually || paymentSuccess}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white py-4 rounded-lg font-bold text-lg transition-colors duration-300"
            >
              {confirmingManually ? 'Đang xác nhận...' : paymentSuccess ? 'Đã xác nhận' : 'Đã nhận tiền mặt'}
            </button>
          </div>
        )}

        {paymentMethod === 'vnd' && (
          <>
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Quét mã QR để thanh toán</h2>
              <p className={textSecondary}>Vui lòng chuyển khoản theo thông tin bên dưới</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex flex-col items-center">
                <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Mã QR thanh toán</h3>
                <div className="bg-white p-4 rounded-lg">
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className={`text-sm ${textSecondary} mt-4 text-center`}>
                  Quét mã QR bằng app ngân hàng để thanh toán
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <h3 className={`text-lg font-semibold ${textPrimary} mb-4`}>Thông tin chuyển khoản</h3>
                <div className="space-y-4">
                  <div className={`${bgSecondary} p-4 rounded-lg`}>
                    <p className={`text-sm ${textSecondary} mb-1`}>Ngân hàng</p>
                    <div className="flex justify-between items-center">
                      <p className={`${textPrimary} font-semibold`}>{paymentConfig.bankDisplayName} ({paymentConfig.bankCode})</p>
                      <button
                        onClick={() => copyToClipboard(paymentConfig.bankCode)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <FaCopy /> Sao chép
                      </button>
                    </div>
                  </div>

                  <div className={`${bgSecondary} p-4 rounded-lg`}>
                    <p className={`text-sm ${textSecondary} mb-1`}>Số tài khoản</p>
                    <div className="flex justify-between items-center">
                      <p className={`${textPrimary} font-semibold`}>{paymentConfig.bankAccountNumber}</p>
                      <button
                        onClick={() => copyToClipboard(paymentConfig.bankAccountNumber)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <FaCopy /> Sao chép
                      </button>
                    </div>
                  </div>

                  <div className={`${bgSecondary} p-4 rounded-lg`}>
                    <p className={`text-sm ${textSecondary} mb-1`}>Chủ tài khoản</p>
                    <div className="flex justify-between items-center">
                      <p className={`${textPrimary} font-semibold`}>{paymentConfig.bankAccountName}</p>
                      <button
                        onClick={() => copyToClipboard(paymentConfig.bankAccountName)}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <FaCopy /> Sao chép
                      </button>
                    </div>
                  </div>

                  <div className={`${bgSecondary} p-4 rounded-lg`}>
                    <p className={`text-sm ${textSecondary} mb-1`}>Số tiền</p>
                    <div className="flex justify-between items-center">
                      <p className="text-red-400 font-bold text-xl">
                        {formatPrice(booking?.total_amount)}
                      </p>
                      <button
                        onClick={() => copyToClipboard(Math.round(booking?.total_amount).toString())}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      >
                        <FaCopy /> Sao chép
                      </button>
                    </div>
                  </div>

                  <div className={`${bgSecondary} p-4 rounded-lg border-2 border-yellow-600`}>
                    <p className={`text-sm ${textSecondary} mb-1`}>Nội dung chuyển khoản</p>
                    <div className="flex justify-between items-center gap-3">
                      <p className="text-yellow-400 font-bold break-all pr-2">{getBankTransferDescription(booking?.id)}</p>
                      <button
                        onClick={() => copyToClipboard(getBankTransferDescription(booking?.id))}
                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 flex-shrink-0"
                      >
                        <FaCopy /> Sao chép
                      </button>
                    </div>
                    <p className="text-xs text-yellow-500 mt-2 break-words">
                      ⚠️ Vui lòng nhập chính xác nội dung để hệ thống tự động xác nhận thanh toán
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isBoxOffice && onManualConfirm && (
              <div className={`mt-6 pt-6 border-t ${borderColor}`}>
                <button
                  onClick={handleManualConfirm}
                  disabled={confirmingManually || paymentSuccess}
                  className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors duration-300"
                >
                  {confirmingManually ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền (Thủ công)'}
                </button>
                <p className={`text-xs ${textSecondary} mt-2 text-center`}>
                  Chỉ sử dụng khi đã kiểm tra tiền đã về tài khoản
                </p>
              </div>
            )}
          </>
        )}

        {paymentMethod === 'crypto' && (
          <>
            <div className="text-center mb-8">
              <h2 className={`text-2xl font-bold ${textPrimary} mb-2`}>Thanh toán bằng Cryptocurrency</h2>
              <p className={textSecondary}>Kết nối ví MetaMask để thanh toán</p>
            </div>

            <div className="max-w-2xl mx-auto space-y-6">
              {!walletAddress ? (
                <div className="text-center">
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-3 mx-auto transition-colors duration-300"
                  >
                    <FaWallet className="text-2xl" />
                    {isConnecting ? 'Đang kết nối...' : 'Kết nối ví MetaMask'}
                  </button>
                  <p className={`${textSecondary} text-sm mt-4`}>
                    Bạn cần cài đặt MetaMask extension để sử dụng tính năng này
                  </p>
                </div>
              ) : (
                <>
                  <div className={`${bgSecondary} p-6 rounded-lg`}>
                    <div className="flex justify-between items-center mb-2">
                      <p className={`text-sm ${textSecondary}`}>Ví đã kết nối</p>
                      <button
                        onClick={disconnectWallet}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Ngắt kết nối
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <FaWallet className="text-white" />
                      </div>
                      <div>
                        <p className={`${textPrimary} font-semibold`}>{shortenAddress(walletAddress)}</p>
                        <p className={`${textSecondary} text-xs`}>Sepolia Testnet</p>
                      </div>
                    </div>
                  </div>

                  <div className={`${bgSecondary} p-6 rounded-lg`}>
                    <p className={`text-sm ${textSecondary} mb-2`}>Số tiền thanh toán</p>
                    {loadingPrice ? (
                      <div className="flex items-center gap-2">
                        <div className={`animate-spin rounded-full h-5 w-5 border-b-2 ${isLight ? 'border-gray-900' : 'border-white'}`}></div>
                        <p className={textSecondary}>Đang tải giá...</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-3">
                          <p className={`text-3xl font-bold ${textPrimary}`}>{cryptoAmount.toFixed(6)} ETH</p>
                          <p className={textSecondary}>≈ {formatPrice(booking?.total_amount)}</p>
                        </div>
                        <p className={`text-xs ${textSecondary} mt-2`}>
                          Tỷ giá: 1 ETH = ${ethUsdPrice.toLocaleString()}
                        </p>
                      </>
                    )}
                  </div>

                  <div className={`${bgSecondary} p-6 rounded-lg space-y-3`}>
                    <div className="flex justify-between">
                      <p className={textSecondary}>Địa chỉ nhận</p>
                      <p className={`${textPrimary} font-mono text-sm`}>{shortenAddress(PAYMENT_RECEIVER)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p className={textSecondary}>Network</p>
                      <p className={textPrimary}>Sepolia Testnet</p>
                    </div>
                    <div className="flex justify-between">
                      <p className={textSecondary}>Transaction Data</p>
                      <p className="text-yellow-400 font-semibold">QH-{booking?.id}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleCryptoPayment}
                    disabled={isPaying || paymentSuccess}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-700 disabled:to-gray-700 text-white py-4 rounded-lg font-bold text-lg transition-all duration-300"
                  >
                    {isPaying ? 'Đang xử lý...' : paymentSuccess ? 'Đã thanh toán' : 'Xác nhận thanh toán'}
                  </button>

                  {isBoxOffice && onManualConfirm && (
                    <button
                      onClick={handleManualConfirm}
                      disabled={confirmingManually || paymentSuccess}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors duration-300"
                    >
                      {confirmingManually ? 'Đang xác nhận...' : 'Xác nhận đã nhận tiền (Thủ công)'}
                    </button>
                  )}

                  <p className={`text-center text-sm ${textSecondary}`}>
                    ⚠️ Vui lòng kiểm tra kỹ thông tin trước khi thanh toán. Giao dịch blockchain không thể hoàn tác.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

export default PaymentMethods
