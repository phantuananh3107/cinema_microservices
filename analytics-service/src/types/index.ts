export interface Booking {
    id: string
    user_id: string
    showtime_id: string
    total_amount: number
    status: 'pending' | 'confirmed' | 'cancelled'
    booking_type: string
    created_at: Date
    updated_at?: Date
}

export interface RevenueByMovie {
    movie_id: string
    movie_title: string
    total_revenue: number
    total_bookings: number
    total_tickets: number
}

export interface RevenueByShowtime {
    showtime_id: string
    movie_title: string
    showtime_date: string
    showtime_time: string
    room_number: string
    total_revenue: number
    total_bookings: number
    total_tickets: number
    occupancy_rate: number
}

export interface RevenueByGenre {
    genre: string
    total_revenue: number
    total_bookings: number
    total_tickets: number
    movie_count: number
}

export interface Movie {
    id: string
    title: string
    genre: string
    duration: number
    status: string
}

export interface AnalyticsFilters {
    start_date?: string
    end_date?: string
    movie_id?: string
    showtime_id?: string
    genre?: string
    status?: string
    booking_type?: string
    limit?: number
    offset?: number
}
