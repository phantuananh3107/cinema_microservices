package redis

import (
	"context"

	"movie-service/internal/pkg/pubsub"

	"github.com/redis/go-redis/v9"
)

type RedisSubscriber struct {
	pubsub        *redis.PubSub
	unmarshalFunc func([]byte) (interface{}, error)
}

func (r *RedisSubscriber) MessageChan() <-chan *pubsub.Message {
	ch := make(chan *pubsub.Message)
	go func() {
		defer close(ch)
		for msg := range r.pubsub.Channel() {
			data, err := r.unmarshalFunc([]byte(msg.Payload))
			if err != nil {
				continue
			}

			ch <- &pubsub.Message{
				Topic: msg.Channel,
				Data:  data,
			}
		}
	}()
	return ch
}

func (r *RedisSubscriber) Unsubscribe(ctx context.Context) error {
	return r.pubsub.Unsubscribe(ctx)
}
