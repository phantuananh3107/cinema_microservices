package summarize

import (
	"worker-service/internal/models"
)

type ArticleGroup struct {
	Articles []*models.NewsArticle
	Category string
	Language string
}

func GroupArticles(articles []*models.NewsArticle) []*ArticleGroup {
	if len(articles) == 0 {
		return nil
	}

	groups := make([]*ArticleGroup, 0, len(articles))

	for _, article := range articles {
		group := &ArticleGroup{
			Articles: []*models.NewsArticle{article},
			Category: article.Category,
			Language: article.Language,
		}
		groups = append(groups, group)
	}

	return groups
}
