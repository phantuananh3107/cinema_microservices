import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

interface ShowtimeData {
    id: string
    movie_id: string
    room_id: string
    showtime_date: string
    showtime_time: string
    movie_title: string
    room_number: string
    seat_numbers: string[]
}

interface GetShowtimeResponse {
    success: boolean
    message: string
    data: ShowtimeData
}

interface GetShowtimesResponse {
    success: boolean
    message: string
    data: ShowtimeData[]
}

interface MovieServiceClient {
    GetShowtime(
        request: { id: string },
        callback: (error: grpc.ServiceError | null, response: GetShowtimeResponse) => void,
    ): void

    GetShowtimes(
        request: { ids: string[] },
        callback: (error: grpc.ServiceError | null, response: GetShowtimesResponse) => void,
    ): void
}

class MovieGrpcClient {
    private client: MovieServiceClient | null = null

    connect(): MovieServiceClient {
        if (this.client) {
            return this.client
        }

        const PROTO_PATH = path.join(__dirname, '../../proto/movie.proto')
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
        })

        const proto = grpc.loadPackageDefinition(packageDefinition) as any
        const movieServiceUrl = process.env.MOVIE_SERVICE_GRPC_URL || 'localhost:50053'

        this.client = new proto.pb.MovieService(
            movieServiceUrl,
            grpc.credentials.createInsecure(),
        ) as MovieServiceClient

        return this.client
    }

    async getShowtime(showtimeId: string): Promise<ShowtimeData | null> {
        const client = this.connect()

        return new Promise((resolve, reject) => {
            client.GetShowtime({ id: showtimeId }, (error, response) => {
                if (error) {
                    reject(error)
                    return
                }

                if (!response.success) {
                    resolve(null)
                    return
                }

                resolve(response.data)
            })
        })
    }

    async getShowtimes(showtimeIds: string[]): Promise<ShowtimeData[]> {
        const client = this.connect()

        return new Promise((resolve, reject) => {
            client.GetShowtimes({ ids: showtimeIds }, (error, response) => {
                if (error) {
                    reject(error)
                    return
                }

                if (!response.success) {
                    resolve([])
                    return
                }

                resolve(response.data)
            })
        })
    }
}

export default new MovieGrpcClient()
