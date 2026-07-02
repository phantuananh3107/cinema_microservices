package summarize

import (
	"context"
	"fmt"
	"time"

	"worker-service/internal/models"
	"worker-service/internal/pkg/gemini"

	"github.com/google/uuid"
	"github.com/samber/do"
	"github.com/sirupsen/logrus"
	"github.com/uptrace/bun"
)

type Worker struct {
	db            *bun.DB
	geminiClient  *gemini.Client
	batchSize     int
	checkInterval time.Duration
}

func NewWorker(ctn *do.Injector, geminiAPIKeys []string) (*Worker, error) {
	db, err := do.Invoke[*bun.DB](ctn)
	if err != nil {
		return nil, err
	}

	return &Worker{
		db:            db,
		geminiClient:  gemini.NewClient(geminiAPIKeys),
		batchSize:     10,
		checkInterval: time.Hour,
	}, nil
}

func (w *Worker) Start(ctx context.Context) error {
	logrus.Info("Starting summarization worker...")

	ticker := time.NewTicker(w.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			if err := w.processPendingArticles(ctx); err != nil {
				logrus.Errorf("Processing failed: %v", err)
			}
		}
	}
}

func (w *Worker) processPendingArticles(ctx context.Context) error {
	logrus.Info("Processing pending articles...")

	articles, err := w.fetchPendingArticles(ctx)
	if err != nil {
		return fmt.Errorf("failed to fetch pending articles: %w", err)
	}

	if len(articles) == 0 {
		logrus.Info("No pending articles to process")
		return nil
	}

	domesticCount := 0
	internationalCount := 0
	for _, article := range articles {
		if article.Category == "domestic" {
			domesticCount++
		} else {
			internationalCount++
		}
	}

	logrus.Infof("Found %d pending articles to summarize (%d domestic, %d international)",
		len(articles), domesticCount, internationalCount)

	groups := GroupArticles(articles)

	summariesCreated := 0

	for _, group := range groups {
		article := group.Articles[0]

		summary, err := w.createSummaryForGroup(ctx, group)
		if err != nil {
			logrus.Errorf("Failed to create summary for article (ID: %s, category: %s, language: %s): %v",
				article.Id, group.Category, group.Language, err)
			_ = w.markArticlesProcessed(ctx, group.Articles, "")
			continue
		}

		if err = w.markArticlesProcessed(ctx, group.Articles, summary.Id); err != nil {
			logrus.Errorf("Failed to mark article as processed: %v", err)
			continue
		}

		summariesCreated++
	}

	logrus.Infof("Processing completed - Summaries created: %d/%d", summariesCreated, len(articles))
	return nil
}

func (w *Worker) fetchPendingArticles(ctx context.Context) ([]*models.NewsArticle, error) {
	var domesticArticles []*models.NewsArticle
	var internationalArticles []*models.NewsArticle

	err := w.db.NewSelect().
		Model(&domesticArticles).
		Where("status = ?", "PENDING").
		Where("category = ?", "domestic").
		Order("published_at DESC").
		Limit(w.batchSize).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	err = w.db.NewSelect().
		Model(&internationalArticles).
		Where("status = ?", "PENDING").
		Where("category = ?", "international").
		Order("published_at DESC").
		Limit(w.batchSize).
		Scan(ctx)
	if err != nil {
		return nil, err
	}

	articles := append(domesticArticles, internationalArticles...)
	return articles, nil
}

func (w *Worker) createSummaryForGroup(ctx context.Context, group *ArticleGroup) (*models.NewsSummary, error) {
	article := group.Articles[0]
	imageURL := article.ImageURL

	logrus.Infof("Generating summary for article: '%s' (%s)", article.Title, group.Language)

	summaryText, err := w.geminiClient.SummarizeArticles(ctx, article.Title, group.Language)
	if err != nil {
		return nil, fmt.Errorf("failed to generate summary: %w", err)
	}

	tags := article.Tags
	if tags == nil {
		tags = make([]string, 0)
	}

	now := time.Now()
	isActive := true
	summary := &models.NewsSummary{
		Id:          uuid.New().String(),
		Title:       article.Title,
		Summary:     summaryText,
		ArticleIds:  []string{article.Id},
		SourceCount: 1,
		Category:    group.Category,
		Language:    group.Language,
		Tags:        tags,
		ImageURL:    imageURL,
		Status:      "PUBLISHED",
		IsActive:    &isActive,
		CreatedAt:   &now,
		UpdatedAt:   &now,
	}

	_, err = w.db.NewInsert().
		Model(summary).
		Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to insert summary: %w", err)
	}

	return summary, nil
}

func (w *Worker) markArticlesProcessed(ctx context.Context, articles []*models.NewsArticle, summaryId string) error {
	articleIds := make([]string, len(articles))
	for i, article := range articles {
		articleIds[i] = article.Id
	}

	now := time.Now()
	_, err := w.db.NewUpdate().
		Model((*models.NewsArticle)(nil)).
		Set("status = ?", "SUMMARIZED").
		Set("summary = ?", summaryId).
		Set("updated_at = ?", &now).
		Where("id IN (?)", bun.In(articleIds)).
		Exec(ctx)

	return err
}
