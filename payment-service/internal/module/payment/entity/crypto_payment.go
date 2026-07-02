package entity

type CryptoVerificationRequest struct {
	BookingId   string  `json:"booking_id" binding:"required"`
	TxHash      string  `json:"tx_hash" binding:"required"`
	FromAddress string  `json:"from_address" binding:"required"`
	ToAddress   string  `json:"to_address" binding:"required"`
	AmountEth   string  `json:"amount_eth" binding:"required"`
	AmountVnd   float64 `json:"amount_vnd" binding:"required"`
	Network     string  `json:"network" binding:"required"`
}
