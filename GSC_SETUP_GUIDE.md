# Google Search Console Setup Guide

## 🎯 Quick Setup (5 minutes)

### Step 1: Create GSC Property
1. Go to: https://search.google.com/search-console
2. Click **"Add property"**
3. Choose **"URL prefix"** method
4. Enter: `https://validatestrategy.com`

### Step 2: Verify Ownership
**Option A: DNS Verification (Recommended)**
1. GSC will give you a TXT record
2. Go to your domain registrar (GoDaddy, Namecheap, etc.)
3. Add DNS TXT record:
   - Type: `TXT`
   - Name: `@` or leave blank
   - Value: `google-site-verification=XXXXX` (from GSC)
4. Wait 5-10 minutes for DNS propagation
5. Click **"Verify"** in GSC

### Step 3: Submit Sitemap
1. In GSC, go to **Sitemaps** (left sidebar)
2. Enter: `sitemap.xml`
3. Click **"Submit"**

## 📊 Weekly Monitoring
- Coverage Report (indexing errors)
- Search Performance (queries, clicks, CTR)
- Rich Results (structured data validation)

## 🔧 Testing Tools
- Rich Results Test: https://search.google.com/test/rich-results
- Mobile-Friendly Test: https://search.google.com/test/mobile-friendly
- PageSpeed Insights: https://pagespeed.web.dev/

**Last Updated:** January 5, 2026
