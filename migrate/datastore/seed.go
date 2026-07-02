package datastore

import (
	"context"
	"fmt"
	"time"

	"migrate-cmd/models"

	"github.com/google/uuid"
	"github.com/pgvector/pgvector-go"
	"github.com/uptrace/bun"
)

func SeedRoles(ctx context.Context, db *bun.DB) error {
	roles := []*models.Role{
		{
			Id:          uuid.New().String(),
			Name:        "admin",
			Description: stringPtr("System administrator with full access"),
			CreatedAt:   time.Now(),
		},
		{
			Id:          uuid.New().String(),
			Name:        "manager_staff",
			Description: stringPtr("Cinema manager staff"),
			CreatedAt:   time.Now(),
		},
		{
			Id:          uuid.New().String(),
			Name:        "ticket_staff",
			Description: stringPtr("Cinema ticket staff"),
			CreatedAt:   time.Now(),
		},
		{
			Id:          uuid.New().String(),
			Name:        "customer",
			Description: stringPtr("Regular customer"),
			CreatedAt:   time.Now(),
		},
	}

	_, err := db.NewInsert().Model(&roles).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed roles: %w", err)
	}

	fmt.Println("Roles seeded successfully!")
	return nil
}

func SeedPermissions(ctx context.Context, db *bun.DB) error {
	permissionsData := []struct {
		Name        string
		Code        string
		Description *string
	}{
		{"Movie Manage", "movie_manage", stringPtr("Manage movies (create, update, delete)")},
		{"Showtime Manage", "showtime_manage", stringPtr("Manage movie showtimes")},
		{"Seat Manage", "seat_manage", stringPtr("Manage cinema seats")},
		{"Report View", "report_view", stringPtr("View analytics and operational reports")},
		{"Profile View", "profile_view", stringPtr("View profile details")},
		{"Profile Update", "profile_update", stringPtr("Update profile details")},
		{"Booking Create", "booking_create", stringPtr("Create bookings")},
		{"Booking Manage", "booking_manage", stringPtr("Manage bookings")},
		{"Ticket Issue", "ticket_issue", stringPtr("Issue or print tickets")},
		{"Payment Process", "payment_process", stringPtr("Handle payments for bookings")},
		{"Ticket View", "ticket_view", stringPtr("View tickets")},
		{"Staff Manage", "staff_manage", stringPtr("Manage staff accounts")},
		{"News Manage", "news_manage", stringPtr("Manage news articles and summaries")},
		{"Permission Manage", "permission_manage", stringPtr("Manage role permissions (assign/unassign)")},
	}

	var permissions []*models.Permission
	for _, permData := range permissionsData {
		permissions = append(permissions, &models.Permission{
			Id:          uuid.New().String(),
			Name:        permData.Name,
			Code:        permData.Code,
			Description: permData.Description,
			CreatedAt:   time.Now(),
		})
	}

	_, err := db.NewInsert().Model(&permissions).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed permissions: %w", err)
	}

	fmt.Println("Permissions seeded successfully!")
	return nil
}

func SeedRolePermissions(ctx context.Context, db *bun.DB) error {
	var roles []models.Role
	if err := db.NewSelect().Model(&roles).Scan(ctx); err != nil {
		return fmt.Errorf("failed to get roles: %w", err)
	}

	var permissions []models.Permission
	if err := db.NewSelect().Model(&permissions).Scan(ctx); err != nil {
		return fmt.Errorf("failed to get permissions: %w", err)
	}

	if len(roles) == 0 || len(permissions) == 0 {
		return fmt.Errorf("roles or permissions missing; seed roles and permissions first")
	}

	roleNameToId := map[string]string{}
	for _, r := range roles {
		roleNameToId[r.Name] = r.Id
	}

	permCodeToId := map[string]string{}
	for _, p := range permissions {
		permCodeToId[p.Code] = p.Id
	}

	allCodes := []string{}
	for code := range permCodeToId {
		allCodes = append(allCodes, code)
	}

	managerStaffCodes := []string{
		"movie_manage",
		"showtime_manage",
		"seat_manage",
		"news_manage",
		"report_view",
		"profile_view",
		"profile_update",
	}

	ticketStaffCodes := []string{
		"booking_create",
		"booking_manage",
		"ticket_issue",
		"payment_process",
		"ticket_view",
		"profile_view",
		"profile_update",
	}

	customerCodes := []string{
		"booking_create",
		"booking_manage",
		"ticket_view",
		"profile_view",
		"profile_update",
	}

	var rolePerms []*models.RolePermission

	// Admin -> all permissions
	if adminId, ok := roleNameToId["admin"]; ok {
		for _, code := range allCodes {
			if pid, ok := permCodeToId[code]; ok {
				rolePerms = append(rolePerms, &models.RolePermission{Id: uuid.New().String(), RoleId: adminId, PermissionId: pid, CreatedAt: time.Now()})
			}
		}
	}

	// Manager staff
	if rid, ok := roleNameToId["manager_staff"]; ok {
		for _, code := range managerStaffCodes {
			if pid, ok := permCodeToId[code]; ok {
				rolePerms = append(rolePerms, &models.RolePermission{Id: uuid.New().String(), RoleId: rid, PermissionId: pid, CreatedAt: time.Now()})
			}
		}
	}

	// Ticket staff
	if rid, ok := roleNameToId["ticket_staff"]; ok {
		for _, code := range ticketStaffCodes {
			if pid, ok := permCodeToId[code]; ok {
				rolePerms = append(rolePerms, &models.RolePermission{Id: uuid.New().String(), RoleId: rid, PermissionId: pid, CreatedAt: time.Now()})
			}
		}
	}

	// Customer
	if rid, ok := roleNameToId["customer"]; ok {
		for _, code := range customerCodes {
			if pid, ok := permCodeToId[code]; ok {
				rolePerms = append(rolePerms, &models.RolePermission{Id: uuid.New().String(), RoleId: rid, PermissionId: pid, CreatedAt: time.Now()})
			}
		}
	}

	if _, err := db.NewInsert().Model(&rolePerms).Exec(ctx); err != nil {
		return fmt.Errorf("failed to seed role_permissions: %w", err)
	}

	fmt.Println("Role permissions seeded successfully!")
	return nil
}

func SeedMovies(ctx context.Context, db *bun.DB) error {
	now := time.Now()
	releaseDate1 := time.Date(2024, 3, 15, 0, 0, 0, 0, time.UTC)
	releaseDate2 := time.Date(2024, 4, 20, 0, 0, 0, 0, time.UTC)
	releaseDate3 := time.Date(2024, 5, 10, 0, 0, 0, 0, time.UTC)
	releaseDate4 := time.Date(2025, 6, 15, 0, 0, 0, 0, time.UTC)
	releaseDate5 := time.Date(2024, 2, 1, 0, 0, 0, 0, time.UTC)

	movies := []*models.Movie{
		{
			Id:          uuid.New().String(),
			Title:       "Avengers: Endgame",
			Slug:        "avengers-endgame",
			Director:    "Anthony Russo, Joe Russo",
			Cast:        "Robert Downey Jr., Chris Evans, Mark Ruffalo, Chris Hemsworth",
			Duration:    181,
			ReleaseDate: &releaseDate1,
			Description: "After the devastating events of Avengers: Infinity War, the universe is in ruins due to the efforts of the Mad Titan, Thanos.",
			TrailerURL:  "https://www.youtube.com/watch?v=TcMBFSGVi1c",
			PosterURL:   "https://image.tmdb.org/t/p/w500/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
			Status:      "SHOWING",
			CreatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "Spider-Man: No Way Home",
			Slug:        "spider-man-no-way-home",
			Director:    "Jon Watts",
			Cast:        "Tom Holland, Zendaya, Benedict Cumberbatch, Jacob Batalon",
			Duration:    148,
			ReleaseDate: &releaseDate2,
			Description: "With Spider-Man's identity now revealed, Peter asks Doctor Strange for help. When a spell goes wrong, dangerous foes from other worlds start to appear.",
			TrailerURL:  "https://www.youtube.com/watch?v=JfVOs4VSpmA",
			PosterURL:   "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg",
			Status:      "SHOWING",
			CreatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "Top Gun: Maverick",
			Slug:        "top-gun-maverick",
			Director:    "Joseph Kosinski",
			Cast:        "Tom Cruise, Miles Teller, Jennifer Connelly, Jon Hamm",
			Duration:    130,
			ReleaseDate: &releaseDate3,
			Description: "After thirty years, Maverick is still pushing the envelope as a top naval aviator, but must confront ghosts of his past when he leads TOP GUN's elite graduates on a mission.",
			TrailerURL:  "https://www.youtube.com/watch?v=g4U4BQW9OEk",
			PosterURL:   "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
			Status:      "UPCOMING",
			CreatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "Dune",
			Slug:        "dune",
			Director:    "Denis Villeneuve",
			Cast:        "Timothée Chalamet, Rebecca Ferguson, Oscar Isaac, Josh Brolin",
			Duration:    155,
			ReleaseDate: &releaseDate1,
			Description: "Paul Atreides, a brilliant and gifted young man born into a great destiny beyond his understanding, must travel to the most dangerous planet in the universe.",
			TrailerURL:  "https://www.youtube.com/watch?v=8g18jFHCLXk",
			PosterURL:   "https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg",
			Status:      "SHOWING",
			CreatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "The Batman",
			Slug:        "the-batman",
			Director:    "Matt Reeves",
			Cast:        "Robert Pattinson, Zoë Kravitz, Paul Dano, Jeffrey Wright",
			Duration:    176,
			ReleaseDate: &releaseDate2,
			Description: "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption and question his family's involvement.",
			TrailerURL:  "https://www.youtube.com/watch?v=mqqft2x_Aa4",
			PosterURL:   "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
			Status:      "SHOWING",
			CreatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "Zootopia",
			Slug:        "zootopia",
			Director:    "Byron Howard, Rich Moore",
			Cast:        "Ginnifer Goodwin, Jason Bateman, Idris Elba, Jenny Slate",
			Duration:    108,
			ReleaseDate: &releaseDate4,
			Description: "In a city of anthropomorphic animals, a rookie bunny cop and a cynical con artist fox must work together to uncover a conspiracy.",
			TrailerURL:  "https://www.youtube.com/watch?v=jWM0ct-OLsM",
			PosterURL:   "https://artofthemovies.co.uk/cdn/shop/files/IMG_1521_1024x1024@2x.jpg?v=1762441851",
			Status:      "UPCOMING",
			CreatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "Inception",
			Slug:        "inception",
			Director:    "Christopher Nolan",
			Cast:        "Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy",
			Duration:    148,
			ReleaseDate: &releaseDate5,
			Description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
			TrailerURL:  "https://www.youtube.com/watch?v=YoHD9XEInc0",
			PosterURL:   "https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
			Status:      "SHOWING",
			CreatedAt:   &now,
		},
	}

	_, err := db.NewInsert().Model(&movies).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed movies: %w", err)
	}

	fmt.Println("Movies seeded successfully!")
	return nil
}

func SeedRooms(ctx context.Context, db *bun.DB) error {
	now := time.Now()
	rooms := []*models.Room{
		{
			Id:         uuid.New().String(),
			RoomNumber: 1,
			Capacity:   120,
			RoomType:   "STANDARD",
			Status:     "ACTIVE",
			CreatedAt:  now,
		},
		{
			Id:         uuid.New().String(),
			RoomNumber: 2,
			Capacity:   150,
			RoomType:   "STANDARD",
			Status:     "ACTIVE",
			CreatedAt:  now,
		},
		{
			Id:         uuid.New().String(),
			RoomNumber: 3,
			Capacity:   200,
			RoomType:   "IMAX",
			Status:     "ACTIVE",
			CreatedAt:  now,
		},
		{
			Id:         uuid.New().String(),
			RoomNumber: 4,
			Capacity:   80,
			RoomType:   "VIP",
			Status:     "ACTIVE",
			CreatedAt:  now,
		},
		{
			Id:         uuid.New().String(),
			RoomNumber: 5,
			Capacity:   100,
			RoomType:   "STANDARD",
			Status:     "ACTIVE",
			CreatedAt:  now,
		},
	}

	_, err := db.NewInsert().Model(&rooms).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed rooms: %w", err)
	}

	fmt.Println("Rooms seeded successfully!")
	return nil
}

func SeedUsers(ctx context.Context, db *bun.DB) error {
	var roles []models.Role
	err := db.NewSelect().Model(&roles).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get roles: %w", err)
	}

	if len(roles) == 0 {
		return fmt.Errorf("no roles found, please seed roles first")
	}

	var adminRoleId, managerStaffRoleId, ticketStaffRoleId, customerRoleId string
	for _, role := range roles {
		switch role.Name {
		case "admin":
			adminRoleId = role.Id
		case "manager_staff":
			managerStaffRoleId = role.Id
		case "ticket_staff":
			ticketStaffRoleId = role.Id
		case "customer":
			customerRoleId = role.Id
		}
	}

	now := time.Now()
	users := []*models.User{
		{
			Id:          uuid.New().String(),
			Name:        "Admin User",
			Email:       "admin@cinema.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			PhoneNumber: stringPtr("+1234567890"),
			RoleId:      &adminRoleId,
			Dob:         time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:      "male",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Manager Staff",
			Email:       "manager@cinema.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			PhoneNumber: stringPtr("+1234567891"),
			RoleId:      &managerStaffRoleId,
			Address:     stringPtr("123 Manager Street"),
			Dob:         time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:      "male",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Ticket Staff",
			Email:       "ticket@cinema.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			PhoneNumber: stringPtr("+1234567892"),
			RoleId:      &ticketStaffRoleId,
			Address:     stringPtr("123 Ticket Street"),
			Dob:         time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:      "male",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Ticket Staff 2",
			Email:       "ticket2@cinema.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			PhoneNumber: stringPtr("+1234567892"),
			RoleId:      &ticketStaffRoleId,
			Address:     stringPtr("123 Ticket Street"),
			Dob:         time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:      "female",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Alice",
			Email:       "alice@email.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			Address:     stringPtr("123 Alice Street"),
			PhoneNumber: stringPtr("+1234567893"),
			RoleId:      &customerRoleId,
			Dob:         time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:      "female",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Bob",
			Email:       "bob@email.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			PhoneNumber: stringPtr("+1234567893"),
			Address:     stringPtr("123 Bob Street"),
			RoleId:      &customerRoleId,
			Dob:         time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:      "male",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Emma Wilson",
			Email:       "emma@email.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			PhoneNumber: stringPtr("+1234567894"),
			RoleId:      &customerRoleId,
			Address:     stringPtr("123 Emma Street"),
			Dob:         time.Date(1990, 1, 1, 0, 0, 0, 0, time.UTC),
			Gender:      "female",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Quang Nguyen",
			Email:       "quangnguyenngoc314@gmail.com",
			Password:    "$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi", // password
			PhoneNumber: stringPtr("+1234567894"),
			RoleId:      &customerRoleId,
			Address:     stringPtr("123 Emma Street"),
			Dob:         time.Date(2003, 10, 5, 0, 0, 0, 0, time.UTC),
			Gender:      "male",
			Status:      "ACTIVE",
			CreatedAt:   now,
		},
	}

	_, err = db.NewInsert().Model(&users).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed users: %w", err)
	}

	fmt.Println("Users seeded successfully!")
	return nil
}

func SeedBookings(ctx context.Context, db *bun.DB) error {
	var users []models.User
	err := db.NewSelect().Model(&users).Where("role_id IN (SELECT id FROM roles WHERE name = 'customer')").Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get users: %w", err)
	}

	var showtimes []models.Showtime
	err = db.NewSelect().Model(&showtimes).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get showtimes: %w", err)
	}

	if len(users) == 0 || len(showtimes) == 0 {
		return fmt.Errorf("no users or showtimes found")
	}

	now := time.Now()
	var bookings []models.Booking

	// Generate bookings for the past 6 months
	// Create bookings with varied dates and amounts
	bookingAmounts := []float64{100000, 150000, 200000, 250000, 300000, 350000, 400000, 450000, 500000}
	statuses := []string{"CONFIRMED", "CONFIRMED", "CONFIRMED", "CONFIRMED", "CONFIRMED", "PENDING", "CANCELLED"}

	// Generate 10-20 bookings per month for the past 6 months
	for monthsAgo := 0; monthsAgo < 6; monthsAgo++ {
		bookingsInMonth := 10 + (monthsAgo % 11) // Vary between 10-20 bookings per month

		for i := 0; i < bookingsInMonth; i++ {
			// Random day in the month
			daysAgo := (monthsAgo * 30) + (i % 28) // Distribute throughout the month
			createdAt := now.AddDate(0, 0, -daysAgo)

			userIdx := (monthsAgo*bookingsInMonth + i) % len(users)
			showtimeIdx := (monthsAgo*bookingsInMonth + i) % len(showtimes)
			amountIdx := (monthsAgo + i) % len(bookingAmounts)
			statusIdx := i % len(statuses)

			booking := models.Booking{
				Id:          uuid.New().String(),
				UserId:      users[userIdx].Id,
				ShowtimeId:  showtimes[showtimeIdx].Id,
				TotalAmount: bookingAmounts[amountIdx],
				Status:      statuses[statusIdx],
				BookingType: []string{"ONLINE", "OFFLINE"}[i%2],
				CreatedAt:   createdAt,
			}
			bookings = append(bookings, booking)
		}
	}

	// Batch insert bookings
	batchSize := 100
	for i := 0; i < len(bookings); i += batchSize {
		end := i + batchSize
		if end > len(bookings) {
			end = len(bookings)
		}

		batch := bookings[i:end]
		_, err = db.NewInsert().Model(&batch).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to insert bookings batch %d-%d: %w", i, end, err)
		}
	}

	fmt.Printf("Bookings seeded successfully! Total: %d bookings\n", len(bookings))
	return nil
}

func SeedTickets(ctx context.Context, db *bun.DB) error {
	var bookings []models.Booking
	err := db.NewSelect().Model(&bookings).Where("status = ?", "CONFIRMED").Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get bookings: %w", err)
	}

	var seats []models.Seat
	err = db.NewSelect().Model(&seats).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get seats: %w", err)
	}

	if len(bookings) == 0 || len(seats) == 0 {
		return fmt.Errorf("no confirmed bookings or seats found")
	}

	var tickets []models.Ticket
	ticketsPerBooking := []int{1, 2, 2, 3, 4} // Vary number of tickets per booking

	for i, booking := range bookings {
		numTickets := ticketsPerBooking[i%len(ticketsPerBooking)]

		for j := 0; j < numTickets; j++ {
			seatIdx := (i*10 + j) % len(seats)

			ticket := models.Ticket{
				Id:         uuid.New().String(),
				BookingId:  booking.Id,
				ShowtimeId: booking.ShowtimeId,
				Status:     models.TicketStatusUsed,
				SeatId:     seats[seatIdx].Id,
				CreatedAt:  booking.CreatedAt,
			}
			tickets = append(tickets, ticket)
		}
	}

	// Batch insert tickets
	batchSize := 500
	for i := 0; i < len(tickets); i += batchSize {
		end := i + batchSize
		if end > len(tickets) {
			end = len(tickets)
		}

		batch := tickets[i:end]
		_, err = db.NewInsert().Model(&batch).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to insert tickets batch %d-%d: %w", i, end, err)
		}
	}

	fmt.Printf("Tickets seeded successfully! Total: %d tickets\n", len(tickets))
	return nil
}

func SeedNotifications(ctx context.Context, db *bun.DB) error {
	var users []models.User
	err := db.NewSelect().Model(&users).Limit(3).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get users: %w", err)
	}

	if len(users) == 0 {
		return fmt.Errorf("no users found, please seed users first")
	}

	now := time.Now()
	yesterday := now.Add(-24 * time.Hour)

	notifications := []*models.Notification{
		{
			Id:        uuid.New().String(),
			UserId:    users[0].Id,
			Title:     "Welcome to Cinema",
			Content:   "Thank you for joining our cinema! Enjoy your movie experience.",
			Status:    models.NotificationStatusSent,
			CreatedAt: &now,
			UpdatedAt: &now,
		},
		{
			Id:        uuid.New().String(),
			UserId:    users[1].Id,
			Title:     "New Movie Release",
			Content:   "Spider-Man: No Way Home is now showing! Book your tickets now.",
			Status:    models.NotificationStatusSent,
			CreatedAt: &now,
			UpdatedAt: &now,
		},
		{
			Id:        uuid.New().String(),
			UserId:    users[2].Id,
			Title:     "Special Offer",
			Content:   "Get 20% off on weekend bookings! Use code WEEKEND20",
			Status:    models.NotificationStatusSent,
			CreatedAt: &now,
			UpdatedAt: &now,
		},
		{
			Id:        uuid.New().String(),
			UserId:    users[0].Id,
			Title:     "Booking Confirmation",
			Content:   "Your booking for Avengers: Endgame has been confirmed.",
			Status:    models.NotificationStatusRead,
			CreatedAt: &yesterday,
			UpdatedAt: &yesterday,
		},
		{
			Id:        uuid.New().String(),
			UserId:    users[1].Id,
			Title:     "System Maintenance",
			Content:   "System will be under maintenance on Sunday from 2 AM to 4 AM.",
			Status:    models.NotificationStatusPending,
			CreatedAt: &now,
			UpdatedAt: &now,
		},
	}

	_, err = db.NewInsert().Model(&notifications).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed notifications: %w", err)
	}

	fmt.Println("Notifications seeded successfully!")
	return nil
}

func SeedStaffProfiles(ctx context.Context, db *bun.DB) error {
	var users []models.User
	err := db.NewSelect().Model(&users).
		Where("role_id IN (SELECT id FROM roles WHERE name IN (?))", bun.In([]string{"admin", "manager_staff", "ticket_staff"})).
		Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get staff users: %w", err)
	}

	if len(users) == 0 {
		return fmt.Errorf("no staff users found, please seed users first")
	}

	now := time.Now()
	profiles := make([]*models.StaffProfile, 0, len(users))

	for idx, user := range users {
		position := "Ticket Staff"
		department := "Operations"
		salary := 12000000

		switch user.Email {
		case "admin@cinema.com":
			position = "System Admin"
			department = "Administration"
			salary = 30000000
		case "manager@cinema.com":
			position = "Cinema Manager"
			department = "Management"
			salary = 22000000
		}

		profiles = append(profiles, &models.StaffProfile{
			Id:         uuid.New().String(),
			UserId:     user.Id,
			Salary:     salary + (idx * 250000),
			Position:   position,
			Department: department,
			HireDate:   now.AddDate(-(idx + 1), 0, -(idx * 3)),
			IsActive:   true,
		})
	}

	_, err = db.NewInsert().Model(&profiles).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed staff_profile: %w", err)
	}

	fmt.Printf("Staff profiles seeded successfully! Total: %d profiles\n", len(profiles))
	return nil
}

func SeedCustomerProfiles(ctx context.Context, db *bun.DB) error {
	var users []models.User
	err := db.NewSelect().Model(&users).
		Where("role_id IN (SELECT id FROM roles WHERE name = 'customer')").
		Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get customer users: %w", err)
	}

	if len(users) == 0 {
		return fmt.Errorf("no customer users found, please seed users first")
	}

	profiles := make([]*models.CustomerProfile, 0, len(users))

	for idx, user := range users {
		profiles = append(profiles, &models.CustomerProfile{
			Id:                   uuid.New().String(),
			UserId:               user.Id,
			TotalPaymentAmount:   (idx + 1) * 350000,
			Point:                (idx + 1) * 35,
			OnchainWalletAddress: fmt.Sprintf("0x%040x", idx+1),
		})
	}

	_, err = db.NewInsert().Model(&profiles).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed customer_profile: %w", err)
	}

	fmt.Printf("Customer profiles seeded successfully! Total: %d profiles\n", len(profiles))
	return nil
}

func SeedPayments(ctx context.Context, db *bun.DB) error {
	var bookings []models.Booking
	err := db.NewSelect().Model(&bookings).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get bookings: %w", err)
	}

	if len(bookings) == 0 {
		return fmt.Errorf("no bookings found, please seed bookings first")
	}

	paymentMethods := []string{"CASH", "VNPAY", "MOMO", "METAMASK"}
	payments := make([]*models.Payment, 0, len(bookings))
	now := time.Now()

	for idx, booking := range bookings {
		status := "PENDING"
		if booking.Status == "CONFIRMED" {
			status = "PAID"
		} else if booking.Status == "CANCELLED" {
			status = "FAILED"
		}

		transactionID := stringPtr(fmt.Sprintf("TXN-%04d-%s", idx+1, booking.Id[:8]))
		payload := stringPtr(fmt.Sprintf(`{"booking_id":"%s","method":"%s","status":"%s"}`,
			booking.Id,
			paymentMethods[idx%len(paymentMethods)],
			status,
		))

		paymentDate := booking.CreatedAt.Add(5 * time.Minute)
		if paymentDate.After(now) {
			paymentDate = now
		}

		payments = append(payments, &models.Payment{
			Id:            uuid.New().String(),
			BookingId:     booking.Id,
			Amount:        booking.TotalAmount,
			PaymentDate:   paymentDate,
			PaymentMethod: paymentMethods[idx%len(paymentMethods)],
			TransactionId: transactionID,
			Status:        status,
			Payload:       payload,
			CreatedAt:     booking.CreatedAt,
		})
	}

	batchSize := 200
	for i := 0; i < len(payments); i += batchSize {
		end := i + batchSize
		if end > len(payments) {
			end = len(payments)
		}

		batch := payments[i:end]
		_, err = db.NewInsert().Model(&batch).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to insert payments batch %d-%d: %w", i, end, err)
		}
	}

	fmt.Printf("Payments seeded successfully! Total: %d payments\n", len(payments))
	return nil
}

func SeedOutboxEvents(ctx context.Context, db *bun.DB) error {
	now := time.Now()
	events := []*models.OutboxEvent{
		{
			EventType: string(models.EventTypeBookingCreated),
			Payload:   `{"booking_id":"mock-booking-1","user_id":"mock-user-1","amount":150000}`,
			Status:    string(models.OutboxStatusPending),
			CreatedAt: now.Add(-2 * time.Hour),
			UpdatedAt: now.Add(-2 * time.Hour),
		},
		{
			EventType: string(models.EventTypePaymentCompleted),
			Payload:   `{"booking_id":"mock-booking-2","payment_id":"mock-payment-2","amount":250000}`,
			Status:    string(models.OutboxStatusSent),
			CreatedAt: now.Add(-90 * time.Minute),
			UpdatedAt: now.Add(-85 * time.Minute),
		},
		{
			EventType: string(models.EventTypeNotificationSent),
			Payload:   `{"notification_id":"mock-noti-3","channel":"websocket","result":"ok"}`,
			Status:    string(models.OutboxStatusFailed),
			CreatedAt: now.Add(-45 * time.Minute),
			UpdatedAt: now.Add(-30 * time.Minute),
		},
	}

	_, err := db.NewInsert().Model(&events).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed outbox_events: %w", err)
	}

	fmt.Printf("Outbox events seeded successfully! Total: %d events\n", len(events))
	return nil
}

func SeedNewsArticles(ctx context.Context, db *bun.DB) error {
	now := time.Now()
	published1 := now.AddDate(0, 0, -1)
	published2 := now.AddDate(0, 0, -2)
	published3 := now.AddDate(0, 0, -3)

	articles := []*models.NewsArticle{
		{
			Id:          uuid.New().String(),
			Title:       "Doanh thu phòng vé cuối tuần tăng mạnh nhờ bom tấn mới",
			Slug:        "doanh-thu-phong-ve-cuoi-tuan-tang-manh",
			Source:      "Cinema Daily",
			SourceURL:   "https://news.cinema.local/articles/box-office-weekend-1",
			Author:      "Editorial Team",
			Content:     "Phòng vé cuối tuần ghi nhận mức tăng trưởng ấn tượng tại nhiều cụm rạp lớn.",
			Summary:     "Doanh thu tăng nhờ lịch chiếu tối ưu và phim mới thu hút khán giả.",
			ImageURL:    "https://images.cinema.local/news/box-office-1.jpg",
			Category:    "box-office",
			Tags:        []string{"box-office", "cinema", "weekend"},
			Language:    "vi",
			PublishedAt: &published1,
			Status:      "published",
			CreatedAt:   &now,
			UpdatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "Xu hướng đặt vé online tăng 30% trong quý I",
			Slug:        "xu-huong-dat-ve-online-tang-30-quy-1",
			Source:      "Tech Cinema",
			SourceURL:   "https://news.cinema.local/articles/online-booking-trend-q1",
			Author:      "Data Desk",
			Content:     "Khách hàng ưu tiên ứng dụng di động và thanh toán không tiền mặt khi đặt vé.",
			Summary:     "Đặt vé online tăng mạnh nhờ cải thiện trải nghiệm người dùng.",
			ImageURL:    "https://images.cinema.local/news/online-booking.jpg",
			Category:    "domestic",
			Tags:        []string{"online-booking", "digital", "payment"},
			Language:    "vi",
			PublishedAt: &published2,
			Status:      "summarized",
			CreatedAt:   &now,
			UpdatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "International release calendar reshapes local screening plans",
			Slug:        "international-release-calendar-reshapes-local-screening-plans",
			Source:      "Global Film Wire",
			SourceURL:   "https://news.cinema.local/articles/international-release-calendar",
			Author:      "World Desk",
			Content:     "Studios adjust release windows, affecting room allocation and peak slots.",
			Summary:     "Local cinemas are rebalancing showtimes to match global release shifts.",
			ImageURL:    "https://images.cinema.local/news/international-calendar.jpg",
			Category:    "international",
			Tags:        []string{"release-calendar", "international", "showtimes"},
			Language:    "en",
			PublishedAt: &published3,
			Status:      "published",
			CreatedAt:   &now,
			UpdatedAt:   &now,
		},
	}

	_, err := db.NewInsert().Model(&articles).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed news_articles: %w", err)
	}

	fmt.Printf("News articles seeded successfully! Total: %d articles\n", len(articles))
	return nil
}

func SeedNewsSummaries(ctx context.Context, db *bun.DB) error {
	var articles []models.NewsArticle
	err := db.NewSelect().Model(&articles).Order("published_at DESC").Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get news articles: %w", err)
	}

	if len(articles) == 0 {
		return fmt.Errorf("no news articles found, please seed news articles first")
	}

	now := time.Now()
	active := true

	groupOneIds := []string{articles[0].Id}
	if len(articles) > 1 {
		groupOneIds = append(groupOneIds, articles[1].Id)
	}

	groupTwoIds := []string{articles[len(articles)-1].Id}

	summaries := []*models.NewsSummary{
		{
			Id:          uuid.New().String(),
			Title:       "Tổng hợp xu hướng phòng vé và đặt vé số",
			Summary:     "Doanh thu phòng vé được thúc đẩy bởi phim mới và kênh đặt vé online tăng trưởng ổn định.",
			ArticleIds:  groupOneIds,
			SourceCount: len(groupOneIds),
			Category:    "domestic",
			Language:    "vi",
			Tags:        []string{"box-office", "online-booking"},
			ImageURL:    "https://images.cinema.local/news/summary-domestic.jpg",
			Status:      "published",
			IsActive:    &active,
			CreatedAt:   &now,
			UpdatedAt:   &now,
		},
		{
			Id:          uuid.New().String(),
			Title:       "Global release impacts local scheduling",
			Summary:     "International release shifts require cinemas to optimize prime-time room allocation.",
			ArticleIds:  groupTwoIds,
			SourceCount: len(groupTwoIds),
			Category:    "international",
			Language:    "en",
			Tags:        []string{"release", "scheduling"},
			ImageURL:    "https://images.cinema.local/news/summary-international.jpg",
			Status:      "published",
			IsActive:    &active,
			CreatedAt:   &now,
			UpdatedAt:   &now,
		},
	}

	_, err = db.NewInsert().Model(&summaries).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed news_summaries: %w", err)
	}

	fmt.Printf("News summaries seeded successfully! Total: %d summaries\n", len(summaries))
	return nil
}

func SeedDocuments(ctx context.Context, db *bun.DB) error {
	now := time.Now()
	documents := []*models.Document{
		{
			ID:        uuid.New().String(),
			Title:     "Cinema Booking Policy",
			FilePath:  "/docs/policies/booking-policy.md",
			FileType:  "text/markdown",
			Size:      24576,
			Status:    "processed",
			CreatedAt: now.Add(-48 * time.Hour),
		},
		{
			ID:        uuid.New().String(),
			Title:     "Refund and Cancellation Terms",
			FilePath:  "/docs/policies/refund-terms.pdf",
			FileType:  "application/pdf",
			Size:      67584,
			Status:    "processed",
			CreatedAt: now.Add(-24 * time.Hour),
		},
	}

	_, err := db.NewInsert().Model(&documents).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed documents: %w", err)
	}

	fmt.Printf("Documents seeded successfully! Total: %d documents\n", len(documents))
	return nil
}

func SeedDocumentChunks(ctx context.Context, db *bun.DB) error {
	var documents []models.Document
	err := db.NewSelect().Model(&documents).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get documents: %w", err)
	}

	if len(documents) == 0 {
		return fmt.Errorf("no documents found, please seed documents first")
	}

	chunks := make([]*models.DocumentChunk, 0, len(documents)*2)
	now := time.Now()

	for docIndex, document := range documents {
		for chunkIndex := 0; chunkIndex < 2; chunkIndex++ {
			embedding := make([]float32, 3072)
			for i := range embedding {
				embedding[i] = float32((docIndex+1)*(chunkIndex+1)) * 0.001
			}

			startPos := chunkIndex * 500
			endPos := startPos + 499

			chunks = append(chunks, &models.DocumentChunk{
				ID:         uuid.New().String(),
				DocumentID: document.ID,
				ChunkIndex: chunkIndex,
				Content:    fmt.Sprintf("Chunk %d for document '%s' with policy and FAQ content.", chunkIndex+1, document.Title),
				Embedding:  pgvector.NewVector(embedding),
				StartPos:   startPos,
				EndPos:     endPos,
				TokenCount: 220 + (chunkIndex * 10),
				CreatedAt:  now,
			})
		}
	}

	_, err = db.NewInsert().Model(&chunks).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed document_chunks: %w", err)
	}

	fmt.Printf("Document chunks seeded successfully! Total: %d chunks\n", len(chunks))
	return nil
}

func SeedChats(ctx context.Context, db *bun.DB) error {
	now := time.Now()
	chats := []*models.Chat{
		{
			ID:        uuid.New().String(),
			Question:  "Làm sao để đổi suất chiếu sau khi đã đặt vé?",
			Answer:    "Bạn vào mục lịch sử đặt vé, chọn đơn hàng và gửi yêu cầu hỗ trợ đổi suất trước giờ chiếu tối thiểu 2 tiếng.",
			CreatedAt: now.Add(-6 * time.Hour),
		},
		{
			ID:        uuid.New().String(),
			Question:  "Can I get a refund for a cancelled showtime?",
			Answer:    "Yes. Refunds for cancelled showtimes are processed automatically to your original payment method within 3-5 business days.",
			CreatedAt: now.Add(-3 * time.Hour),
		},
		{
			ID:        uuid.New().String(),
			Question:  "Rạp có hỗ trợ ghế đôi không?",
			Answer:    "Có. Một số phòng VIP và IMAX có khu vực ghế đôi, bạn có thể lọc theo loại ghế khi chọn chỗ ngồi.",
			CreatedAt: now.Add(-90 * time.Minute),
		},
	}

	_, err := db.NewInsert().Model(&chats).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed chats: %w", err)
	}

	fmt.Printf("Chats seeded successfully! Total: %d records\n", len(chats))
	return nil
}

func stringPtr(s string) *string {
	return &s
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func SeedSeats(ctx context.Context, db *bun.DB) error {
	var rooms []models.Room
	err := db.NewSelect().Model(&rooms).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get rooms: %w", err)
	}

	if len(rooms) == 0 {
		return fmt.Errorf("no rooms found, please seed rooms first")
	}

	now := time.Now()
	var seats []*models.Seat

	seatConfigs := map[string]struct {
		rows        []string
		seatsPerRow int
		regularRows []string
		vipRows     []string
		coupleRows  []string
	}{
		"STANDARD": {
			rows:        []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"},
			seatsPerRow: 8,
			regularRows: []string{"A", "B", "C", "D", "E"},
			vipRows:     []string{"F", "G", "H", "I", "J", "K", "L"},
			coupleRows:  []string{},
		},
		"IMAX": {
			rows:        []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"},
			seatsPerRow: 14,
			regularRows: []string{"A", "B", "C", "D", "E"},
			vipRows:     []string{"F", "G", "H", "I", "J", "K", "L"},
			coupleRows:  []string{"M", "N", "O"},
		},
		"VIP": {
			rows:        []string{"A", "B", "C", "D", "E", "F", "G", "H", "I", "J"},
			seatsPerRow: 8,
			regularRows: []string{"A", "B", "C"},
			vipRows:     []string{"D", "E", "F", "G", "H"},
			coupleRows:  []string{"I", "J"},
		},
	}

	for _, room := range rooms {
		config, exists := seatConfigs[room.RoomType]
		if !exists {
			continue
		}

		for _, row := range config.rows {
			seatsPerRow := config.seatsPerRow
			if contains(config.coupleRows, row) {
				seatsPerRow = 7
			}

			for seatNum := 1; seatNum <= seatsPerRow; seatNum++ {
				seatType := "REGULAR"

				for _, regularRow := range config.regularRows {
					if row == regularRow {
						seatType = "REGULAR"
						break
					}
				}

				for _, vipRow := range config.vipRows {
					if row == vipRow {
						seatType = "VIP"
						break
					}
				}

				for _, coupleRow := range config.coupleRows {
					if row == coupleRow {
						seatType = "COUPLE"
						break
					}
				}

				seat := &models.Seat{
					Id:         uuid.New().String(),
					RoomId:     room.Id,
					SeatNumber: fmt.Sprintf("%02d", seatNum),
					RowNumber:  row,
					SeatType:   seatType,
					Status:     "AVAILABLE",
					CreatedAt:  now,
				}
				seats = append(seats, seat)

				if seatType == "COUPLE" {
					seatNum++
					if seatNum <= seatsPerRow {
						coupleSeat := &models.Seat{
							Id:         uuid.New().String(),
							RoomId:     room.Id,
							SeatNumber: fmt.Sprintf("%02d", seatNum),
							RowNumber:  row,
							SeatType:   seatType,
							Status:     "AVAILABLE",
							CreatedAt:  now,
						}
						seats = append(seats, coupleSeat)
					}
				}
			}
		}
	}

	batchSize := 500
	for i := 0; i < len(seats); i += batchSize {
		end := i + batchSize
		if end > len(seats) {
			end = len(seats)
		}

		batch := seats[i:end]
		_, err = db.NewInsert().Model(&batch).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to seed seats batch %d-%d: %w", i, end, err)
		}
	}

	fmt.Printf("Seats seeded successfully! Total: %d seats\n", len(seats))
	return nil
}

func SeedShowtimes(ctx context.Context, db *bun.DB) error {
	var movies []models.Movie
	var rooms []models.Room

	err := db.NewSelect().Model(&movies).Where("status IN (?)", bun.In([]string{"SHOWING"})).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get movies: %w", err)
	}

	err = db.NewSelect().Model(&rooms).Where("status = ?", "ACTIVE").Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get rooms: %w", err)
	}

	if len(movies) == 0 {
		return fmt.Errorf("no movies found, please seed movies first")
	}

	if len(rooms) == 0 {
		return fmt.Errorf("no rooms found, please seed rooms first")
	}

	now := time.Now()
	var showtimes []*models.Showtime

	priceConfig := map[string]map[string]float64{
		"STANDARD": {
			"morning":   8000,
			"afternoon": 10000,
			"evening":   12000,
		},
		"VIP": {
			"morning":   15000,
			"afternoon": 18000,
			"evening":   22000,
		},
		"IMAX": {
			"morning":   12000,
			"afternoon": 15000,
			"evening":   18000,
		},
	}

	timeSlots := map[string][]string{
		"morning":   {"07:00"},
		"afternoon": {"13:00"},
		"evening":   {"19:00"},
	}

	for day := 0; day < 2; day++ {
		currentDate := now.AddDate(0, 0, day)

		for movieIdx, movie := range movies {
			if movie.ReleaseDate != nil && movie.ReleaseDate.After(now) {
				continue
			}

			selectedRooms := make([]models.Room, 0)
			selectedRooms = append(selectedRooms, rooms[movieIdx%len(rooms)])

			for _, room := range selectedRooms {
				selectedFormat := "2D"
				if room.RoomType == "IMAX" {
					selectedFormat = "IMAX"
				} else if (movieIdx+day)%3 == 0 {
					selectedFormat = "3D"
				}

				for period, times := range timeSlots {
					for _, timeStr := range times {
						startTime, err := time.Parse("15:04", timeStr)
						if err != nil {
							continue
						}

						showtimeStart := time.Date(
							currentDate.Year(), currentDate.Month(), currentDate.Day(),
							startTime.Hour(), startTime.Minute(), 0, 0, currentDate.Location(),
						)

						showtimeEnd := showtimeStart.Add(time.Duration(movie.Duration+30) * time.Minute)

						basePrice := priceConfig[room.RoomType][period]

						switch selectedFormat {
						case "3D":
							basePrice += 2000
						case "IMAX":
							basePrice += 5000
						}

						status := "SCHEDULED"
						if showtimeStart.Before(now) {
							if showtimeEnd.Before(now) {
								status = "COMPLETED"
							} else {
								status = "ONGOING"
							}
						}

						showtime := &models.Showtime{
							Id:        uuid.New().String(),
							MovieId:   movie.Id,
							RoomId:    room.Id,
							StartTime: showtimeStart,
							EndTime:   showtimeEnd,
							Format:    selectedFormat,
							BasePrice: basePrice,
							Status:    status,
							CreatedAt: now,
						}
						showtimes = append(showtimes, showtime)
					}
				}
			}
		}
	}

	batchSize := 100
	for i := 0; i < len(showtimes); i += batchSize {
		end := i + batchSize
		if end > len(showtimes) {
			end = len(showtimes)
		}

		batch := showtimes[i:end]
		_, err = db.NewInsert().Model(&batch).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to seed showtimes batch %d-%d: %w", i, end, err)
		}
	}

	fmt.Printf("Showtimes seeded successfully! Total: %d showtimes\n", len(showtimes))
	return nil
}

func SeedGenres(ctx context.Context, db *bun.DB) error {
	now := time.Now()
	genres := []*models.Genre{
		{
			Id:          uuid.New().String(),
			Name:        "Action",
			Slug:        "action",
			Description: stringPtr("Action-packed movies with intense sequences"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Adventure",
			Slug:        "adventure",
			Description: stringPtr("Exciting journeys and quests"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Comedy",
			Slug:        "comedy",
			Description: stringPtr("Light-hearted movies designed to make you laugh"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Drama",
			Slug:        "drama",
			Description: stringPtr("Serious, plot-driven movies"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Horror",
			Slug:        "horror",
			Description: stringPtr("Scary movies designed to frighten and thrill"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Romance",
			Slug:        "romance",
			Description: stringPtr("Love stories and romantic relationships"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Sci-Fi",
			Slug:        "sci-fi",
			Description: stringPtr("Science fiction and futuristic themes"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Thriller",
			Slug:        "thriller",
			Description: stringPtr("Suspenseful and intense storylines"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Fantasy",
			Slug:        "fantasy",
			Description: stringPtr("Magical and mythical worlds"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Animation",
			Slug:        "animation",
			Description: stringPtr("Animated movies for all ages"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Crime",
			Slug:        "crime",
			Description: stringPtr("Criminal activities and investigations"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Documentary",
			Slug:        "documentary",
			Description: stringPtr("Non-fiction films about real events"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Mystery",
			Slug:        "mystery",
			Description: stringPtr("Puzzling plots and detective stories"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "War",
			Slug:        "war",
			Description: stringPtr("Military conflicts and wartime stories"),
			CreatedAt:   now,
		},
		{
			Id:          uuid.New().String(),
			Name:        "Family",
			Slug:        "family",
			Description: stringPtr("Movies suitable for the whole family"),
			CreatedAt:   now,
		},
	}

	_, err := db.NewInsert().Model(&genres).Exec(ctx)
	if err != nil {
		return fmt.Errorf("failed to seed genres: %w", err)
	}

	fmt.Println("Genres seeded successfully!")
	return nil
}

func SeedMovieGenres(ctx context.Context, db *bun.DB) error {
	var movies []models.Movie
	err := db.NewSelect().Model(&movies).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get movies: %w", err)
	}

	var genres []models.Genre
	err = db.NewSelect().Model(&genres).Scan(ctx)
	if err != nil {
		return fmt.Errorf("failed to get genres: %w", err)
	}

	if len(movies) == 0 || len(genres) == 0 {
		return fmt.Errorf("movies or genres missing; seed movies and genres first")
	}

	genreNameToId := map[string]string{}
	for _, g := range genres {
		genreNameToId[g.Name] = g.Id
	}

	movieGenresMap := map[string][]string{
		"Avengers: Endgame":       {"Action", "Adventure", "Drama"},
		"Spider-Man: No Way Home": {"Action", "Adventure", "Sci-Fi"},
		"Top Gun: Maverick":       {"Action", "Drama"},
		"Dune":                    {"Action", "Adventure", "Drama", "Sci-Fi"},
		"The Batman":              {"Action", "Crime", "Drama"},
		"Zootopia":                {"Animation", "Comedy", "Adventure", "Family"},
		"Inception":               {"Action", "Sci-Fi", "Thriller"},
	}

	var movieGenres []*models.MovieGenre
	for _, movie := range movies {
		genreNames, exists := movieGenresMap[movie.Title]
		if !exists {
			continue
		}

		for _, genreName := range genreNames {
			if genreId, ok := genreNameToId[genreName]; ok {
				movieGenres = append(movieGenres, &models.MovieGenre{
					Id:        uuid.New().String(),
					MovieId:   movie.Id,
					GenreId:   genreId,
					CreatedAt: time.Now(),
				})
			}
		}
	}

	if len(movieGenres) > 0 {
		_, err = db.NewInsert().Model(&movieGenres).Exec(ctx)
		if err != nil {
			return fmt.Errorf("failed to seed movie_genres: %w", err)
		}
	}

	fmt.Printf("Movie-Genre relationships seeded successfully! Total: %d relationships\n", len(movieGenres))
	return nil
}
