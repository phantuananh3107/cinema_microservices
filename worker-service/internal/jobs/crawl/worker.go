package crawl

import (
	"context"
	"fmt"
	"time"

	"worker-service/internal/datastore"
	"worker-service/internal/models"

	"github.com/samber/do"
	"github.com/sirupsen/logrus"
)

const MaxArticlesPerSource = 5

type Worker struct {
	newsRepo datastore.NewsArticleRepository
}

func NewWorker(ctn *do.Injector) (*Worker, error) {
	newsRepo, err := do.Invoke[datastore.NewsArticleRepository](ctn)
	if err != nil {
		return nil, err
	}

	return &Worker{
		newsRepo: newsRepo,
	}, nil
}

func (w *Worker) Start(ctx context.Context) error {
	logrus.Info("Starting crawl worker...")

	ticker := time.NewTicker(1 * time.Hour)
	defer ticker.Stop()

	if err := w.crawl(ctx); err != nil {
		logrus.Errorf("Initial crawl failed: %v", err)
	}

	for {
		select {
		case <-ctx.Done():
			logrus.Info("Crawl worker stopped")
			return ctx.Err()
		case <-ticker.C:
			if err := w.crawl(ctx); err != nil {
				logrus.Error("Crawl failed: %v", err)
			}
		}
	}
}

func (w *Worker) crawl(ctx context.Context) error {
	logrus.Info("Starting crawl job...")

	sources := GetNewsSources()
	totalArticles := 0
	totalErrors := 0

	for _, source := range sources {
		logrus.Infof("Crawling source: %s (%s)", source.Name, source.URL)

		articles, err := w.crawlSource(ctx, source)
		if err != nil {
			logrus.Errorf("Failed to crawl source %s: %v", source.Name, err)
			totalErrors++
			continue
		}

		if len(articles) > MaxArticlesPerSource {
			articles = articles[:MaxArticlesPerSource]
			logrus.Infof("Limited to top %d articles from %s", MaxArticlesPerSource, source.Name)
		}

		saved, err := w.saveArticles(ctx, articles)
		if err != nil {
			logrus.Errorf("Failed to save articles from %s: %v", source.Name, err)
			totalErrors++
			continue
		}

		logrus.Infof("Saved %d articles from %s", saved, source.Name)
		totalArticles += saved
	}

	logrus.Infof("Crawl job completed - Total: %d articles, Errors: %d", totalArticles, totalErrors)
	return nil
}

func (w *Worker) crawlSource(ctx context.Context, source NewsSource) ([]*models.NewsArticle, error) {
	switch source.Type {
	case "rss":
		return w.crawlRSSSource(ctx, source)
	default:
		return nil, fmt.Errorf("unsupported source type: %s", source.Type)
	}
}

func (w *Worker) crawlRSSSource(ctx context.Context, source NewsSource) ([]*models.NewsArticle, error) {
	feed, err := FetchRSSFeed(ctx, source.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch RSS feed: %w", err)
	}

	articles, err := ParseRSSToArticles(feed, source)
	if err != nil {
		return nil, fmt.Errorf("failed to parse RSS feed: %w", err)
	}

	return articles, nil
}

func (w *Worker) saveArticles(ctx context.Context, articles []*models.NewsArticle) (int, error) {
	if len(articles) == 0 {
		return 0, nil
	}

	saved := 0
	for _, article := range articles {
		err := w.newsRepo.UpsertArticle(ctx, article)
		if err != nil {
			logrus.Errorf("Failed to save article %s: %v", article.SourceURL, err)
			continue
		}

		saved++
	}

	return saved, nil
}
