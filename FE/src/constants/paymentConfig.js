const defaultConfig = {
  bankCode: 'MBBANK',
  bankDisplayName: 'MB Bank',
  bankAccountNumber: '51020036688',
  bankAccountName: 'CINEMA BOOKING',
  qrBaseUrl: 'https://qr.sepay.vn/img',
  transferPrefix: 'QH',
  cryptoReceiver: '0x6721aDe7bfB76c6cfD97635Dc177Cb797F434087',
  cryptoChainId: '0xaa36a7',
}

export const paymentConfig = {
  bankCode: process.env.REACT_APP_PAYMENT_BANK_CODE || defaultConfig.bankCode,
  bankDisplayName: process.env.REACT_APP_PAYMENT_BANK_DISPLAY_NAME || defaultConfig.bankDisplayName,
  bankAccountNumber: process.env.REACT_APP_PAYMENT_BANK_ACCOUNT_NUMBER || defaultConfig.bankAccountNumber,
  bankAccountName: process.env.REACT_APP_PAYMENT_BANK_ACCOUNT_NAME || defaultConfig.bankAccountName,
  qrBaseUrl: process.env.REACT_APP_PAYMENT_QR_BASE_URL || defaultConfig.qrBaseUrl,
  transferPrefix: process.env.REACT_APP_PAYMENT_TRANSFER_PREFIX || defaultConfig.transferPrefix,
  cryptoReceiver: process.env.REACT_APP_PAYMENT_CRYPTO_RECEIVER || defaultConfig.cryptoReceiver,
  cryptoChainId: process.env.REACT_APP_PAYMENT_CRYPTO_CHAIN_ID || defaultConfig.cryptoChainId,
}

export const getBankTransferCode = (bookingId) => {
  return (bookingId || '').replace(/-/g, '').toUpperCase()
}

export const getBankTransferDescription = (bookingId) => {
  return `${paymentConfig.transferPrefix}${getBankTransferCode(bookingId)}`
}

export const buildSepayQrUrl = (bookingId, amount) => {
  const url = new URL(paymentConfig.qrBaseUrl)
  url.searchParams.set('acc', paymentConfig.bankAccountNumber)
  url.searchParams.set('bank', paymentConfig.bankCode)
  url.searchParams.set('amount', String(Math.round(amount || 0)))
  url.searchParams.set('des', getBankTransferDescription(bookingId))
  return url.toString()
}