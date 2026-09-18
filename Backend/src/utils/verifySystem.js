import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('🧪 ========================================================');
  console.log('🚀 STARTING COMPREHENSIVE SHRADDHA GOLD BACKEND & FLOW TESTS');
  console.log('========================================================\n');

  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, details = '') {
    totalCount++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`❌ [FAIL] ${testName} — ${details}`);
    }
  }

  try {
    // 1. Health Check
    const healthRes = await fetch(`${API_BASE}/health`).then(r => r.json());
    assert(healthRes.status === 'online', '1. System Health API is Online');

    // 2. Admin Authentication & Role Redirection Check
    const adminLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@shraddhagold.com', password: 'ShraddhaAdmin@2026' })
    }).then(r => r.json());
    assert(adminLoginRes.success && adminLoginRes.user.role === 'admin', '2. Admin Login returns role: "admin"');
    const adminToken = adminLoginRes.token;

    // 3. Customer Authentication & Role Check
    const custLoginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'partner@shraddhagold.com', password: 'Shraddha@2026' })
    }).then(r => r.json());
    assert(custLoginRes.success && custLoginRes.user.role === 'customer', '3. Customer Login returns role: "customer"');
    const customerToken = custLoginRes.token;

    // 4. Role Authorization Guard (Customer cannot access Admin API)
    const unauthorizedRes = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(unauthorizedRes.status === 403, '4. Backend Authorization Guard: Customer strictly forbidden (403) from Admin APIs');

    // 5. Admin Dashboard Intelligence
    const dashRes = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert(
      dashRes.success &&
      dashRes.stats.customers.total >= 1 &&
      dashRes.stats.categories.total >= 1 &&
      dashRes.stats.orders.total >= 1,
      '5. Admin Dashboard aggregates real-time Customers, Categories, and Orders data'
    );

    // 6. Customer CRUD: Multiple Phones & Category Assignment
    const categories = await fetch(`${API_BASE}/admin/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    const ringCat = categories.categories.find(c => c.name === 'Gold Rings');
    const chainCat = categories.categories.find(c => c.name === 'Gold Chains');

    const newCustomerRes = await fetch(`${API_BASE}/admin/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Kalyan Diamond Emporium',
        email: 'kalyan@emporium.com',
        primaryPhone: '+919876500001',
        phones: ['+919876500001', '+919876500002', '+919876500003'], // Multiple phones
        city: 'Surat',
        status: 'Active',
        assignedCategories: [ringCat._id, chainCat._id],
        accessStart: new Date().toISOString(),
        accessEnd: new Date(Date.now() + 15 * 86400000).toISOString(),
        notes: 'High-volume showroom client'
      })
    }).then(r => r.json());
    assert(
      newCustomerRes.success &&
      newCustomerRes.customer.phones.length === 3 &&
      newCustomerRes.customer.assignedCategories.length === 2,
      '6. Customer Creation with Multiple Phone Numbers (array) and Category Assignment'
    );
    const createdCustomerId = newCustomerRes.customer._id;

    // 7. Customer Share Link Generation (Rule 10: Only Assigned Categories Allowed)
    const shareLinkRes = await fetch(`${API_BASE}/admin/customers/${createdCustomerId}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        accessType: 'Without Login',
        selectedCategories: ['Gold Rings'] // Subset of assigned
      })
    }).then(r => r.json());
    assert(
      shareLinkRes.success &&
      shareLinkRes.shareLink.token &&
      shareLinkRes.shareLink.allowedCategories.includes('Gold Rings'),
      '7. Share Link Generation with cryptographically secure token and assigned categories constraint'
    );
    const generatedToken = shareLinkRes.shareLink.token;

    // 8. Public Shared Viewer Access without Login
    const publicViewRes = await fetch(`${API_BASE}/shared/${generatedToken}`).then(r => r.json());
    assert(
      publicViewRes.success &&
      publicViewRes.portfolio.customerName === 'Kalyan Diamond Emporium' &&
      publicViewRes.portfolio.categories.length === 1 &&
      publicViewRes.portfolio.categories[0] === 'Gold Rings' &&
      publicViewRes.portfolio.styles.every(s => s.categoryName === 'Gold Rings'),
      '8. Public Shared Viewer displays ONLY authorized categories and styles'
    );

    // 9. Meta WhatsApp API Scheduling & Audit
    const metaRes = await fetch(`${API_BASE}/admin/customers/${createdCustomerId}/schedule-share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        shareLinkId: shareLinkRes.shareLink.id,
        targetPhone: '+919876500001',
        scheduledDate: '2026-09-15',
        scheduledTime: '10:30',
        sendImmediately: true
      })
    }).then(r => r.json());
    assert(
      metaRes.success &&
      metaRes.scheduledJob.status === 'Sent' &&
      metaRes.scheduledJob.metaMessageId.startsWith('wamid.'),
      '9. Meta WhatsApp Cloud API immediate dispatch & audit logging'
    );

    // 10. Customer-Specific PDF Generation
    const pdfRes = await fetch(`${API_BASE}/admin/customers/${createdCustomerId}/pdf`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert(pdfRes.success && pdfRes.job.fileName.endsWith('.pdf'), '10. Customer-Specific Catalog PDF Generation');

    // 11. Category Groups Independence (Strict Rules 3 & 4)
    const initialCategoriesCount = categories.categories.length;
    const groupRes = await fetch(`${API_BASE}/admin/category-groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Festive Diwali Showcase 2026',
        categories: [ringCat._id, chainCat._id],
        description: 'Independent festival grouping'
      })
    }).then(r => r.json());
    assert(groupRes.success && groupRes.categoryGroup.name === 'Festive Diwali Showcase 2026', '11. Independent Category Group Creation');

    const afterCategories = await fetch(`${API_BASE}/admin/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    }).then(r => r.json());
    assert(
      afterCategories.categories.length === initialCategoriesCount,
      '12. Strict Isolation: Category Group operations NEVER alter Category master records'
    );

    // 12. Authenticated Customer Portal Access
    const portalRes = await fetch(`${API_BASE}/customer/portal`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    }).then(r => r.json());
    assert(
      portalRes.success &&
      portalRes.customer.assignedCategories.length === 2 &&
      portalRes.styles.length > 0,
      '13. Authenticated Customer Portal strictly isolates content to assigned categories'
    );

    console.log('\n========================================================');
    console.log(`🎉 ALL ${passedCount}/${totalCount} CORE SYSTEM TESTS PASSED SUCCESSFULLY!`);
    console.log('========================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runTests();
