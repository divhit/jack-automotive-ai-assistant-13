import { test, expect } from '@playwright/test';

test.describe('Jack Automotive AI Assistant - Production Deployment', () => {
  test('homepage loads successfully with Redis and Supabase', async ({ page }) => {
    // Navigate to the production URL
    await page.goto('https://jack-automotive-ai-assistant.onrender.com');
    
    // Check that the page title loads correctly
    await expect(page).toHaveTitle(/Jack.*Automotive AI Assistant/);
    
    // Verify no Supabase configuration errors in console
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Supabase')) {
        consoleErrors.push(msg.text());
      }
    });
    
    // Wait for React app to load
    await page.waitForSelector('#root', { timeout: 10000 });
    
    // Check that there are no Supabase configuration errors
    expect(consoleErrors).toHaveLength(0);
    
    // Verify the page content loaded (React mounted)
    const rootContent = await page.locator('#root').innerHTML();
    expect(rootContent.length).toBeGreaterThan(100);
  });

  test('backend health endpoint is healthy', async ({ request }) => {
    // Test the backend API health
    const response = await request.get('https://jack-automotive-ai-assistant.onrender.com/api/health');
    
    expect(response.status()).toBe(200);
    
    const healthData = await response.json();
    expect(healthData.status).toBe('healthy');
    
    // Verify Redis is working
    expect(healthData.redis.adapter.status).toBe('healthy');
    expect(healthData.redis.cache.redis.status).toBe('healthy');
  });

  test('cache statistics endpoint works', async ({ request }) => {
    // Test the cache statistics endpoint
    const response = await request.get('https://jack-automotive-ai-assistant.onrender.com/api/cache/stats');
    
    expect(response.status()).toBe(200);
    
    const cacheData = await response.json();
    expect(cacheData.status).toBe('success');
    expect(cacheData.cache.redisEnabled).toBe(true);
    expect(cacheData.cache.cache.redis.isConnected).toBe(true);
  });

  test('static assets load correctly', async ({ page }) => {
    await page.goto('https://jack-automotive-ai-assistant.onrender.com');
    
    // Check that CSS and JS assets load without 404 errors
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push(request.url());
    });
    
    await page.waitForLoadState('networkidle');
    
    // Filter out only asset failures (CSS, JS)
    const assetFailures = failedRequests.filter(url => 
      url.includes('/assets/') || url.endsWith('.css') || url.endsWith('.js')
    );
    
    expect(assetFailures).toHaveLength(0);
  });
});