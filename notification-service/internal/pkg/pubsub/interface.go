package pubsub

import "context"

type Message struct {
	Topic string
	Data  interface{}
}

type PubSub interface {
	Publish(ctx context.Context, message *Message) error
	Subscribe(ctx context.Context, topics []string, unmarshalFunc func([]byte) (interface{}, error)) (Subscriber, error)
}

type Subscriber interface {
	MessageChan() <-chan *Message
	Unsubscribe(ctx context.Context) error
}
