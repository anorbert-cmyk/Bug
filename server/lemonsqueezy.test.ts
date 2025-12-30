import { describe, it, expect } from 'vitest';

describe('LemonSqueezy API Credentials', () => {
  it('should have valid LemonSqueezy API key that can fetch store info', async () => {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe('');
    expect(storeId).toBeDefined();
    expect(storeId).not.toBe('');
    
    // Test API key by fetching store info
    const response = await fetch(`https://api.lemonsqueezy.com/v1/stores/${storeId}`, {
      headers: {
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.id).toBe(storeId);
    expect(data.data.type).toBe('stores');
  });

  it('should have all required variant IDs configured', () => {
    const observerVariant = process.env.LEMONSQUEEZY_VARIANT_OBSERVER;
    const insiderVariant = process.env.LEMONSQUEEZY_VARIANT_INSIDER;
    const syndicateVariant = process.env.LEMONSQUEEZY_VARIANT_SYNDICATE;
    
    expect(observerVariant).toBeDefined();
    expect(observerVariant).toBe('1181739');
    
    expect(insiderVariant).toBeDefined();
    expect(insiderVariant).toBe('1181753');
    
    expect(syndicateVariant).toBeDefined();
    expect(syndicateVariant).toBe('1181754');
  });

  it('should have webhook secret configured', () => {
    const webhookSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    
    expect(webhookSecret).toBeDefined();
    expect(webhookSecret).not.toBe('');
  });
});
