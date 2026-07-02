package service

import (
	"context"
	"fmt"
	"math/big"
	"os"
	"regexp"
	"strconv"
	"strings"

	"github.com/sirupsen/logrus"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
)

type BlockchainService interface {
	VerifyTransaction(ctx context.Context, txHash string, expectedFrom string, expectedTo string, expectedAmount string) error
}

type blockchainService struct {
	rpcClient *ethclient.Client
	rpcURL    string
}

func NewBlockchainService() (BlockchainService, error) {
	rpcURL := os.Getenv("ETH_RPC_URL")
	if rpcURL == "" {
		rpcURL = "https://ethereum-sepolia-rpc.publicnode.com"
	}

	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		logrus.Warn("Not connected to blockchain")
		return nil, err
	}

	fmt.Println("client connected to blockchain:", client)

	return &blockchainService{
		rpcClient: client,
		rpcURL:    rpcURL,
	}, nil
}

// VerifyTransaction validates the transaction details
// TODO: In production, this should query an Ethereum RPC node to verify:
// - Transaction exists on-chain and is confirmed
// - From/To addresses match
// - Amount matches (converted from wei)
// - Data field contains the booking reference
// - Transaction has sufficient confirmations (e.g., 12 blocks)
func (s *blockchainService) VerifyTransaction(ctx context.Context, txHash string, expectedFrom string, expectedTo string, expectedAmount string) error {
	if !isValidTxHash(txHash) {
		return fmt.Errorf("invalid transaction hash format: %s", txHash)
	}

	if !isValidEthAddress(expectedFrom) || !isValidEthAddress(expectedTo) {
		return fmt.Errorf("invalid from or to address: from: %s to: %s", expectedFrom, expectedTo)
	}

	expectedAmountFloat, err := strconv.ParseFloat(expectedAmount, 64)
	if err != nil {
		return fmt.Errorf("invalid amount format: %s", expectedAmount)
	}
	if expectedAmountFloat <= 0 {
		return fmt.Errorf("amount must be positive: %f", expectedAmountFloat)
	}

	// Convert expectedAmount (ETH) to Wei for comparison
	// 1 ETH = 10^18 Wei
	expectedWei := new(big.Float).Mul(
		big.NewFloat(expectedAmountFloat),
		big.NewFloat(1e18),
	)
	expectedWeiInt, _ := expectedWei.Int(nil)

	// Query transaction from blockchain
	tx, isPending, err := s.rpcClient.TransactionByHash(ctx, common.HexToHash(txHash))
	if err != nil {
		return fmt.Errorf("transaction not found on blockchain: %w", err)
	}

	if isPending {
		return fmt.Errorf("transaction is still pending, not yet confirmed")
	}

	// Verify sender address
	msg, err := types.Sender(types.LatestSignerForChainID(tx.ChainId()), tx)
	if err != nil {
		return fmt.Errorf("failed to extract transaction sender: %w", err)
	}

	actualFrom := strings.ToLower(msg.Hex())
	normalizedExpectedFrom := strings.ToLower(expectedFrom)
	if actualFrom != normalizedExpectedFrom {
		return fmt.Errorf("sender address mismatch: expected %s, got %s", expectedFrom, actualFrom)
	}

	if tx.To() == nil {
		return fmt.Errorf("transaction is a contract creation, not a transfer")
	}
	actualTo := strings.ToLower(tx.To().Hex())
	normalizedExpectedTo := strings.ToLower(expectedTo)
	if actualTo != normalizedExpectedTo {
		return fmt.Errorf("receiver address mismatch: expected %s, got %s", expectedTo, actualTo)
	}

	// Verify amount (allow 1% tolerance for rounding)
	actualValue := tx.Value()
	tolerance := new(big.Int).Div(expectedWeiInt, big.NewInt(100)) // 1% tolerance
	minValue := new(big.Int).Sub(expectedWeiInt, tolerance)
	maxValue := new(big.Int).Add(expectedWeiInt, tolerance)

	if actualValue.Cmp(minValue) < 0 || actualValue.Cmp(maxValue) > 0 {
		return fmt.Errorf("amount mismatch: expected ~%s ETH, got %s Wei", expectedAmount, actualValue.String())
	}

	// Get transaction receipt to verify it succeeded
	receipt, err := s.rpcClient.TransactionReceipt(ctx, common.HexToHash(txHash))
	if err != nil {
		return fmt.Errorf("failed to get transaction receipt: %w", err)
	}

	if receipt.Status != types.ReceiptStatusSuccessful {
		return fmt.Errorf("transaction failed on-chain (status: %d)", receipt.Status)
	}

	// Check confirmations (optional, but recommended)
	//currentBlock, err := s.rpcClient.BlockNumber(ctx)
	//if err == nil {
	//	confirmations := currentBlock - receipt.BlockNumber.Uint64()
	//	if confirmations < 1 {
	//		return fmt.Errorf("transaction needs at least 1 confirmation, has %d", confirmations)
	//	}
	//	fmt.Printf("Transaction verified with %d confirmations\n", confirmations)
	//}

	return nil
}

func isValidTxHash(txHash string) bool {
	matched, _ := regexp.MatchString("^0x[0-9a-fA-F]{64}$", txHash)
	return matched
}

func isValidEthAddress(address string) bool {
	if !strings.HasPrefix(address, "0x") || len(address) != 42 {
		return false
	}
	matched, _ := regexp.MatchString("^0x[0-9a-fA-F]{40}$", address)
	return matched
}
