import { test, expect } from '@playwright/test';

test.describe('API Endpoint: GET /api/v1/health', () => {
  test('should return 200 OK with valid health status payload', async ({ request }) => {
    const response = await request.get('/api/v1/health');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('status', 'ok');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('environment');
    expect(body).toHaveProperty('solanaRpc');
    expect(typeof body.uptimeSeconds).toBe('number');
  });

  test('should return 405 Method Not Allowed for non-GET requests', async ({ request }) => {
    const response = await request.post('/api/v1/health', {
      data: {},
    });
    expect(response.status()).toBe(405);
  });
});
