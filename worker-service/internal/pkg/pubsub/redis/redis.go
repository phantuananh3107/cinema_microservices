package redis

import (
	"context"
	"encoding/json"

	"worker-service/internal/pkg/pubsub"

	"github.com/redis/go-redis/v9"
)

type RedisPubSub struct {
	readClient  redis.UniversalClient
	writeClient redis.UniversalClient
}

func NewRedisPubsub(readClient redis.UniversalClient, writeClient redis.UniversalClient) *RedisPubSub {
	return &RedisPubSub{
		readClient:  readClient,
		writeClient: writeClient,
	}
}

func (r *RedisPubSub) Publish(ctx context.Context, message *pubsub.Message) error {
	if message == nil {
		return nil
	}

	marshal, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return r.writeClient.Publish(ctx, message.Topic, marshal).Err()
}

func (r *RedisPubSub) Subscribe(ctx context.Context, topics []string, unmarshalFunc func([]byte) (interface{}, error)) (pubsub.Subscriber, error) {
	pubsub := r.readClient.Subscribe(ctx, topics...)

	return &RedisSubscriber{
		pubsub:        pubsub,
		unmarshalFunc: unmarshalFunc,
	}, nil
}
