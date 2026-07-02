package entity

import "encoding/json"

type SePayWebhook struct {
	Id              int64   `json:"id"`
	Gateway         string  `json:"gateway"`
	TransactionDate string  `json:"transactionDate"`
	AccountNumber   string  `json:"accountNumber"`
	Code            *string `json:"code"`
	Content         string  `json:"content"`
	TransferType    string  `json:"transferType"`
	TransferAmount  float64 `json:"transferAmount"`
	Accumulated     float64 `json:"accumulated"`
	SubAccount      *string `json:"subAccount"`
	ReferenceCode   string  `json:"referenceCode"`
	Description     string  `json:"description"`
}

func (w *SePayWebhook) ToPayload() (string, error) {
	payloadBytes, err := json.Marshal(w)
	if err != nil {
		return "", err
	}
	return string(payloadBytes), nil
}
