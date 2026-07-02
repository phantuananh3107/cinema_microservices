import request from 'supertest';
import express from 'express';
import router, { parseFilters } from '../analytics-routes';
import analyticsService from '../../services/analytics-service';

jest.mock('../../services/analytics-service');

const app = express();
app.use(express.json());
app.use('/', router);

describe('Analytics Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseFilters', () => {
    test('should parse limit and offset as numbers', () => {
      const query = { limit: '10', offset: '20', genre: 'Action' };
      const result = parseFilters(query);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(20);
      expect(result.genre).toBe('Action');
    });

    test('should handle missing limit and offset', () => {
      const query = { start_date: '2024-01-01' };
      const result = parseFilters(query);
      expect(result.limit).toBeUndefined();
      expect(result.offset).toBeUndefined();
      expect(result.start_date).toBe('2024-01-01');
    });

    test('should return all other filters as is', () => {
      const query = {
        start_date: 'S',
        end_date: 'E',
        movie_id: 'M',
        showtime_id: 'SH',
        genre: 'G',
        status: 'ST',
        booking_type: 'B'
      };
      const result = parseFilters(query);
      expect(result).toEqual(expect.objectContaining(query));
    });

    test('should handle empty query', () => {
      const result = parseFilters({});
      expect(result).toEqual({
        start_date: undefined,
        end_date: undefined,
        movie_id: undefined,
        showtime_id: undefined,
        genre: undefined,
        status: undefined,
        booking_type: undefined,
        limit: undefined,
        offset: undefined
      });
    });
  });

  describe('GET /revenue/time', () => {
    test('should return revenue data successfully', async () => {
      (analyticsService.getRevenueByTime as jest.Mock).mockResolvedValue([{ date: '2024-01-01', amount: 100 }]);
      const res = await request(app).get('/revenue/time?limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    test('should handle service errors', async () => {
      (analyticsService.getRevenueByTime as jest.Mock).mockRejectedValue(new Error('DB Error'));
      const res = await request(app).get('/revenue/time');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /revenue/by-movie', () => {
    test('should return revenue per movie', async () => {
      (analyticsService.getRevenueByMovie as jest.Mock).mockResolvedValue([{ title: 'Movie 1', total: 500 }]);
      const res = await request(app).get('/revenue/by-movie');
      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe('Movie 1');
    });

    test('should handle errors in by-movie', async () => {
      (analyticsService.getRevenueByMovie as jest.Mock).mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/revenue/by-movie');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /revenue/by-showtime', () => {
    test('should return revenue per showtime', async () => {
      (analyticsService.getRevenueByShowtime as jest.Mock).mockResolvedValue([{ id: 's1', total: 200 }]);
      const res = await request(app).get('/revenue/by-showtime');
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    test('should handle errors in by-showtime', async () => {
      (analyticsService.getRevenueByShowtime as jest.Mock).mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/revenue/by-showtime');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /revenue/by-genre', () => {
    test('should return revenue per genre', async () => {
      (analyticsService.getRevenueByGenre as jest.Mock).mockResolvedValue([{ genre: 'Action', total: 300 }]);
      const res = await request(app).get('/revenue/by-genre');
      expect(res.status).toBe(200);
      expect(res.body.data[0].genre).toBe('Action');
    });

    test('should handle errors in by-genre', async () => {
      (analyticsService.getRevenueByGenre as jest.Mock).mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/revenue/by-genre');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /revenue/total', () => {
    test('should return total revenue summary', async () => {
      (analyticsService.getTotalRevenueSummary as jest.Mock).mockResolvedValue({ total: 1000 });
      const res = await request(app).get('/revenue/total');
      expect(res.status).toBe(200);
      expect(res.body.data.total).toBe(1000);
    });

    test('should handle errors in total summary', async () => {
      (analyticsService.getTotalRevenueSummary as jest.Mock).mockRejectedValue(new Error('Fail'));
      const res = await request(app).get('/revenue/total');
      expect(res.status).toBe(500);
    });
  });
});
