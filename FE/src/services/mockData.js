const generateMockBookings = () => {
  const movies = [
    { id: '1', title: 'Avengers: Endgame', genre: 'Action' },
    { id: '2', title: 'Spider-Man: No Way Home', genre: 'Action' },
    { id: '3', title: 'The Batman', genre: 'Action' },
    { id: '4', title: 'Top Gun: Maverick', genre: 'Action' },
    { id: '5', title: 'Black Panther', genre: 'Action' },
    { id: '6', title: 'Dune', genre: 'Sci-Fi' },
    { id: '7', title: 'No Time to Die', genre: 'Action' },
    { id: '8', title: 'Fast & Furious 9', genre: 'Action' },
  ]

  const bookings = []
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2024-12-31')

  for (let i = 0; i < 500; i++) {
    const randomDate = new Date(
      startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()),
    )
    const randomMovie = movies[Math.floor(Math.random() * movies.length)]
    const basePrice = 100000 // 100k VND base price
    const priceVariation = Math.random() * 50000 // 0-50k variation
    const quantity = Math.floor(Math.random() * 4) + 1 // 1-4 tickets

    bookings.push({
      id: `booking_${i + 1}`,
      customer_id: `customer_${Math.floor(Math.random() * 100) + 1}`,
      showtime_id: `showtime_${Math.floor(Math.random() * 50) + 1}`,
      total_amount: (basePrice + priceVariation) * quantity,
      status: ['COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'CANCELLED'][
        Math.floor(Math.random() * 5)
      ],
      staff_id: `staff_${Math.floor(Math.random() * 10) + 1}`,
      booking_type: ['online', 'counter'][Math.floor(Math.random() * 2)],
      created_at: randomDate.toISOString(),
      updated_at: randomDate.toISOString(),
      movie: randomMovie,
      ticket_count: quantity,
    })
  }

  return bookings.filter((booking) => booking.status === 'COMPLETED')
}

export const mockDataService = {
  getRevenueByMonth: () => {
    const bookings = generateMockBookings()
    const monthlyRevenue = {}

    bookings.forEach((booking) => {
      const month = new Date(booking.created_at).toISOString().slice(0, 7) // YYYY-MM
      if (!monthlyRevenue[month]) {
        monthlyRevenue[month] = 0
      }
      monthlyRevenue[month] += booking.total_amount
    })

    return Object.entries(monthlyRevenue)
      .map(([month, revenue]) => ({
        month,
        monthName: new Date(month + '-01').toLocaleDateString('vi-VN', {
          month: 'long',
          year: 'numeric',
        }),
        revenue: Math.round(revenue),
        revenueFormatted: new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(revenue),
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
  },

  getRevenueByMovie: () => {
    const bookings = generateMockBookings()
    const movieRevenue = {}

    bookings.forEach((booking) => {
      const movieTitle = booking.movie.title
      if (!movieRevenue[movieTitle]) {
        movieRevenue[movieTitle] = {
          title: movieTitle,
          genre: booking.movie.genre,
          revenue: 0,
          ticketsSold: 0,
        }
      }
      movieRevenue[movieTitle].revenue += booking.total_amount
      movieRevenue[movieTitle].ticketsSold += booking.ticket_count
    })

    return Object.values(movieRevenue)
      .map((movie) => ({
        ...movie,
        revenue: Math.round(movie.revenue),
        revenueFormatted: new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(movie.revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
  },

  getRevenueByGenre: () => {
    const bookings = generateMockBookings()
    const genreRevenue = {}

    bookings.forEach((booking) => {
      const genre = booking.movie.genre
      if (!genreRevenue[genre]) {
        genreRevenue[genre] = 0
      }
      genreRevenue[genre] += booking.total_amount
    })

    return Object.entries(genreRevenue)
      .map(([genre, revenue]) => ({
        genre,
        revenue: Math.round(revenue),
        revenueFormatted: new Intl.NumberFormat('vi-VN', {
          style: 'currency',
          currency: 'VND',
        }).format(revenue),
      }))
      .sort((a, b) => b.revenue - a.revenue)
  },

  getOverallStats: () => {
    const bookings = generateMockBookings()
    const totalRevenue = bookings.reduce((sum, booking) => sum + booking.total_amount, 0)
    const totalTickets = bookings.reduce((sum, booking) => sum + booking.ticket_count, 0)
    const averageTicketPrice = totalRevenue / totalTickets

    const uniqueMovies = new Set(bookings.map((b) => b.movie.title)).size
    const uniqueCustomers = new Set(bookings.map((b) => b.customer_id)).size

    return {
      totalRevenue: Math.round(totalRevenue),
      totalRevenueFormatted: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(totalRevenue),
      totalTickets,
      averageTicketPrice: Math.round(averageTicketPrice),
      averageTicketPriceFormatted: new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(averageTicketPrice),
      totalBookings: bookings.length,
      uniqueMovies,
      uniqueCustomers,
    }
  },
}
