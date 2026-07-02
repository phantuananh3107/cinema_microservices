package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
	"github.com/uptrace/bun/dialect/pgdialect"
	"github.com/uptrace/bun/driver/pgdriver"

	"migrate-cmd/datastore"

	_ "github.com/joho/godotenv/autoload"
	"github.com/uptrace/bun"
)

func main() {
	ctx := context.Background()
	sqldb := sql.OpenDB(pgdriver.NewConnector(
		pgdriver.WithDSN(os.Getenv("DB_DSN")),
		pgdriver.WithPassword(os.Getenv("DB_PASSWORD")),
	))

	db := bun.NewDB(sqldb, pgdialect.New())

	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "up":
			log.Println(MigrateAll(ctx, db))
			return
		case "down":
			log.Println(DropAllTables(ctx, db))
			return
		case "seed":
			log.Println(SeedAll(ctx, db))
			return
		case "reset":
			log.Println("Flushing Redis...")
			if err := FlushRedis(ctx); err != nil {
				log.Printf("Warning: Failed to flush Redis: %v\n", err)
			}
			log.Println("Dropping all tables...")
			if err := DropAllTables(ctx, db); err != nil {
				log.Fatal(err)
			}
			log.Println("Creating all tables...")
			if err := MigrateAll(ctx, db); err != nil {
				log.Fatal(err)
			}
			log.Println("Seeding all data...")
			log.Println(SeedAll(ctx, db))
			return
		default:
			log.Fatalf("Unknown command: %s", os.Args[1])
		}
	}
}

func MigrateAll(ctx context.Context, db *bun.DB) error {
	migrationFuncs := []func(context.Context, *bun.DB) error{
		datastore.CreateRoleTable,
		datastore.CreateUserTable,
		datastore.CreatePermissionTable,
		datastore.CreateRolePermissionTable,
		datastore.CreateMovieTable,
		datastore.CreateGenreTable,
		datastore.CreateMovieGenreTable,
		datastore.CreateRoomTable,
		datastore.CreateSeatTable,
		datastore.CreateShowtimeTable,
		datastore.CreateBookingTable,
		datastore.CreateTicketTable,
		datastore.CreatePaymentTable,
		datastore.CreateNotificationTable,
		datastore.CreateStaffProfileTable,
		datastore.CreateCustomerProfileTable,
		datastore.CreateOutboxEventTable,
		datastore.CreateNewsArticleTable,
		datastore.CreateNewsSummaryTable,
		datastore.CreateDocumentTable,
		datastore.CreateDocumentChunkTable,
		datastore.CreateChatTable,
	}

	for _, migrateFunc := range migrationFuncs {
		if err := migrateFunc(ctx, db); err != nil {
			return err
		}
	}

	fmt.Println("All tables created successfully!")
	return nil
}

func DropAllTables(ctx context.Context, db *bun.DB) error {
	dropFuncs := []func(context.Context, *bun.DB) error{
		datastore.DropChatTable,
		datastore.DropDocumentChunkTable,
		datastore.DropDocumentTable,
		datastore.DropNewsSummaryTable,
		datastore.DropNewsArticleTable,
		datastore.DropCustomerProfileTable,
		datastore.DropStaffProfileTable,
		datastore.DropNotificationTable,
		datastore.DropPaymentTable,
		datastore.DropTicketTable,
		datastore.DropBookingTable,
		datastore.DropShowtimeTable,
		datastore.DropSeatTable,
		datastore.DropRoomTable,
		datastore.DropMovieGenreTable,
		datastore.DropGenreTable,
		datastore.DropMovieTable,
		datastore.DropUserTable,
		datastore.DropRolePermissionTable,
		datastore.DropPermissionTable,
		datastore.DropRoleTable,
		datastore.DropOutboxEventTable,
	}

	for _, dropFunc := range dropFuncs {
		if err := dropFunc(ctx, db); err != nil {
			return err
		}
	}

	fmt.Println("All tables dropped successfully!")
	return nil
}

func SeedAll(ctx context.Context, db *bun.DB) error {
	seedFuncs := []func(context.Context, *bun.DB) error{
		datastore.SeedRoles,
		datastore.SeedPermissions,
		datastore.SeedRolePermissions,
		datastore.SeedGenres,
		datastore.SeedMovies,
		datastore.SeedMovieGenres,
		datastore.SeedRooms,
		datastore.SeedSeats,
		datastore.SeedShowtimes,
		datastore.SeedUsers,
		datastore.SeedStaffProfiles,
		datastore.SeedCustomerProfiles,
		datastore.SeedNotifications,
		datastore.SeedBookings,
		datastore.SeedTickets,
		datastore.SeedPayments,
		datastore.SeedOutboxEvents,
		datastore.SeedNewsArticles,
		datastore.SeedNewsSummaries,
		datastore.SeedDocuments,
		datastore.SeedDocumentChunks,
		datastore.SeedChats,
	}

	for _, seedFunc := range seedFuncs {
		if err := seedFunc(ctx, db); err != nil {
			return err
		}
	}

	fmt.Println("All data seeded successfully!")
	return nil
}

func FlushRedis(ctx context.Context) error {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "redis://localhost:6379/0"
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	client := redis.NewClient(opts)
	defer client.Close()

	// Test connection
	if err := client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to connect to Redis: %w", err)
	}

	// Flush all databases
	if err := client.FlushAll(ctx).Err(); err != nil {
		return fmt.Errorf("failed to flush Redis: %w", err)
	}

	fmt.Println("Redis flushed successfully!")
	return nil
}
