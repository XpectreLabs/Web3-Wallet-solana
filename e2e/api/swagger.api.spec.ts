import { test, expect } from '@playwright/test';

test.describe('API Endpoint: GET /swagger.json & GET /api/hello', () => {
  test('should return 200 OK for OpenAPI 3.0 specification file', async ({ request }) => {
    const response = await request.get('/swagger.json');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('openapi', '3.0.0');
    expect(body).toHaveProperty('info');
    expect(body.info).toHaveProperty('title', 'Xpectre Solana DApp Backend REST API');
    expect(body).toHaveProperty('paths');
    expect(body.paths).toHaveProperty('/api/v1/health');
    expect(body.paths).toHaveProperty('/api/v1/price');
    expect(body.paths).toHaveProperty('/api/hello');
  });

  test('should return 200 OK for /api/hello route', async ({ request }) => {
    const response = await request.get('/api/hello');
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body).toHaveProperty('name', 'John Doe');
  });
});
