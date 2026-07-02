import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

interface RevenueByTime {
    time_period: string
    total_revenue: number
    total_bookings: number
    avg_booking_value: number
}

interface RevenueByShowtime {
    showtime_id: string
    total_revenue: number
    total_bookings: number
    total_tickets: number
}

interface GetRevenueByTimeResponse {
    success: boolean
    message: string
    data: RevenueByTime[]
}

interface GetRevenueByShowtimeResponse {
    success: boolean
    message: string
    data: RevenueByShowtime[]
}

interface GetTotalRevenueResponse {
    success: boolean
    message: string
    total_revenue: number
}

interface BookingServiceClient {
    GetRevenueByTime(
        request: { start_date: string; end_date: string; limit: number },
        callback: (error: grpc.ServiceError | null, response: GetRevenueByTimeResponse) => void,
    ): void

    GetRevenueByShowtime(
        request: { start_date: string; end_date: string; showtime_id: string; limit: number },
        callback: (error: grpc.ServiceError | null, response: GetRevenueByShowtimeResponse) => void,
    ): void

    GetTotalRevenue(
        request: { start_date: string; end_date: string },
        callback: (error: grpc.ServiceError | null, response: GetTotalRevenueResponse) => void,
    ): void
}

class BookingGrpcClient {
    private client: BookingServiceClient | null = null

    connect(): BookingServiceClient {
        if (this.client) {
            return this.client
        }

        const PROTO_PATH = path.join(__dirname, '../../proto/booking.proto')
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        })

        const proto = grpc.loadPackageDefinition(packageDefinition) as any
        const bookingServiceUrl = process.env.BOOKING_SERVICE_GRPC_URL || 'localhost:50052'

        this.client = new proto.pb.BookingService(
            bookingServiceUrl,
            grpc.credentials.createInsecure(),
        ) as BookingServiceClient

        return this.client
    }

    async getRevenueByTime(
        startDate: string,
        endDate: string,
        limit: number = 100,
    ): Promise<RevenueByTime[]> {
        const client = this.connect()

        return new Promise((resolve, reject) => {
            client.GetRevenueByTime(
                { start_date: startDate, end_date: endDate, limit },
                (error, response) => {
                    if (error) {
                        reject(error)
                        return
                    }

                    if (!response.success) {
                        resolve([])
                        return
                    }

                    resolve(response.data)
                },
            )
        })
    }

    async getRevenueByShowtime(
        startDate: string,
        endDate: string,
        showtimeId: string = '',
        limit: number = 50,
    ): Promise<RevenueByShowtime[]> {
        const client = this.connect()

        return new Promise((resolve, reject) => {
            client.GetRevenueByShowtime(
                { start_date: startDate, end_date: endDate, showtime_id: showtimeId, limit },
                (error, response) => {
                    if (error) {
                        reject(error)
                        return
                    }

                    if (!response.success) {
                        resolve([])
                        return
                    }

                    resolve(response.data)
                },
            )
        })
    }

    async getTotalRevenue(startDate: string, endDate: string): Promise<number> {
        const client = this.connect()

        return new Promise((resolve, reject) => {
            client.GetTotalRevenue(
                { start_date: startDate, end_date: endDate },
                (error, response) => {
                    if (error) {
                        reject(error)
                        return
                    }

                    if (!response.success) {
                        resolve(0)
                        return
                    }

                    resolve(response.total_revenue)
                },
            )
        })
    }
}

export default new BookingGrpcClient()
