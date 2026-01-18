import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3000';

async function testProfile() {
    console.log('🚀 Testing User Profile & Stats...');

    // 1. Auth
    const email = `profile-test-${Date.now()}@example.com`;
    const password = 'password123';

    await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Stats User' })
    });

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const { access_token } = await loginRes.json();
    const authHeader = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };
    console.log('✅ Logged in');

    // 2. Create a receipt (manual for speed)
    console.log('\n--- Creating Receipt ---');
    const receiptRes = await fetch(`${BASE_URL}/receipts`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({
            name: "Test Receipt for Stats",
            subtotal: 100,
            tax: 10,
            service: 5,
            total: 115,
            items: [
                { name: "Item A", price: 60, quantity: 1 },
                { name: "Item B", price: 40, quantity: 1 }
            ]
        })
    });
    const receipt = await receiptRes.json();
    console.log('✅ Receipt created:', receipt.id);

    // 3. Assign Item A to self
    await fetch(`${BASE_URL}/receipts/items/${receipt.items[0].id}/assign`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ userId: receipt.creatorId })
    });
    console.log('✅ Item assigned to self');

    // 4. Add Payment (50)
    await fetch(`${BASE_URL}/receipts/${receipt.id}/payments`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ amount: 50, userId: receipt.creatorId })
    });
    console.log('✅ Payment recorded');

    // 5. Check Profile (Total)
    console.log('\n--- Checking Full Profile ---');
    const profileRes = await fetch(`${BASE_URL}/users/profile`, { headers: authHeader });
    const profile = await profileRes.json();

    console.log('User:', profile.user.name);
    console.log('Stats:', profile.stats);
    // Expected Spent: 60 (base) + (15 fees * 0.6 share) = 60 + 9 = 69
    // Expected Balance: 69 - 50 = 19

    if (profile.stats.totalSpent === 69 && profile.stats.totalPaid === 50) {
        console.log('✅ Stats (Total) are CORRECT');
    } else {
        console.log('❌ Stats (Total) are INCORRECT');
        console.log('Expected: spent 69, paid 50');
    }

    // 6. Check Profile (Filtered by Current Month)
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    console.log(`\n--- Checking Filtered Profile (${year}-${month}) ---`);
    const filteredRes = await fetch(`${BASE_URL}/users/profile?year=${year}&month=${month}`, { headers: authHeader });
    const filtered = await filteredRes.json();
    console.log('Filtered Stats:', filtered.stats);

    if (filtered.stats.totalSpent === 69) {
        console.log('✅ Monthly Filter is working');
    } else {
        console.log('❌ Monthly Filter failed');
    }

    // 7. Check Profile (Wrong Month)
    console.log('\n--- Checking Filtered Profile (Wrong Month: 2025-01) ---');
    const wrongRes = await fetch(`${BASE_URL}/users/profile?year=2025&month=1`, { headers: authHeader });
    const empty = await wrongRes.json();
    console.log('Empty Stats:', empty.stats);

    if (empty.stats.totalSpent === 0) {
        console.log('✅ Date filtering returns 0 for no data months');
    }
}

testProfile().catch(console.error);
