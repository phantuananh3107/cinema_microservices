package gemini

import (
	"context"
	"fmt"
	"sync"

	"google.golang.org/genai"
)

type Client struct {
	clients []*genai.Client
	model   string
	index   int
	mu      sync.Mutex
}

func NewClient(apiKeys []string) *Client {
	if len(apiKeys) == 0 {
		panic("at least one API key is required")
	}

	clients := make([]*genai.Client, len(apiKeys))
	for i, apiKey := range apiKeys {
		client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
			APIKey: apiKey,
		})
		if err != nil {
			panic(fmt.Sprintf("failed to create genai client: %v", err))
		}
		clients[i] = client
	}

	return &Client{
		clients: clients,
		model:   "gemini-2.5-flash",
		index:   0,
	}
}

func (c *Client) getNextClient() *genai.Client {
	c.mu.Lock()
	defer c.mu.Unlock()

	client := c.clients[c.index]
	c.index = (c.index + 1) % len(c.clients)
	return client
}

func (c *Client) GenerateContent(ctx context.Context, prompt string) (string, error) {
	client := c.getNextClient()

	result, err := client.Models.GenerateContent(
		ctx,
		c.model,
		genai.Text(prompt),
		nil,
	)
	if err != nil {
		return "", fmt.Errorf("failed to generate content: %w", err)
	}

	text := result.Text()
	if text == "" {
		return "", fmt.Errorf("no content generated")
	}

	return text, nil
}

func (c *Client) SummarizeArticles(ctx context.Context, title string, language string) (string, error) {
	var prompt string
	if language == "vi" {
		prompt = fmt.Sprintf(`Bạn là một biên tập viên chuyên về tin tức điện ảnh.
Dưới đây là tiêu đề bài báo về phim ảnh:

%s

Hãy viết một đoạn tóm tắt ngắn gọn (2-3 câu) về nội dung chính của bài báo này dựa trên tiêu đề.
Tập trung vào thông tin quan trọng nhất.`, title)
	} else {
		prompt = fmt.Sprintf(`You are a film news editor.
Here is a film industry news article title:

%s

Write a concise summary (2-3 sentences) of what this article is likely about based on the title.
Focus on the most important information.`, title)
	}

	return c.GenerateContent(ctx, prompt)
}
