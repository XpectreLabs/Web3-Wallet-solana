import { test, expect } from '@playwright/test';

test.describe('API Endpoint: GET /api/v1/price', () => {
  test('should return 200 OK with SOL market price payload', async ({ request }) => {
    const response = await request.get('/api/v1/price');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('symbol', 'SOL');
    expect(typeof body.priceUsd).toBe('number');
    expect(body.priceUsd).toBeGreaterThan(0);
    expect(body).toHaveProperty('updatedAt');
  });

  test('should return 405 Method Not Allowed for POST request', async ({ request }) => {
    const response = await request.post('/api/v1/price', {
      data: {},
    });
    expect(response.status()).toBe(405);
  });
});
