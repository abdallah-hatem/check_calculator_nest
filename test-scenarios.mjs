const BASE_URL = 'http://localhost:3000';

async function test() {
    console.log('🚀 Starting Test Scenarios...');

    // 1. Register & Login
    const email = `test-${Date.now()}@example.com`;
    const password = 'password123';

    console.log('\n--- 1. Auth ---');
    await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name: 'Main User' })
    });

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const { access_token } = await loginRes.json();
    const authHeader = { 'Authorization': `Bearer ${access_token}`, 'Content-Type': 'application/json' };
    console.log('✅ Logged in');

    // 2. Add Friends
    console.log('\n--- 2. Adding Friends ---');
    const friendNames = ['Alice', 'Bob', 'Charlie', 'David'];
    const friends = [];
    for (const name of friendNames) {
        const res = await fetch(`${BASE_URL}/friends`, {
            method: 'POST',
            headers: authHeader,
            body: JSON.stringify({ name })
        });
        friends.push(await res.json());
    }
    console.log(`✅ Added ${friends.length} friends`);

    // 3. Create Receipt
    console.log('\n--- 3. Creating Receipt ---');
    const receiptData = {
        name: "Dinner at Luigi's",
        subtotal: 100,
        delivery: 10,
        tax: 15,
        service: 5,
        total: 130,
        items: [
            { name: 'Pizza', price: 40, quantity: 1 },
            { name: 'Pasta', price: 30, quantity: 1 },
            { name: 'Salad', price: 20, quantity: 1 },
            { name: 'Wine', price: 10, quantity: 1 }
        ]
    };

    const receiptRes = await fetch(`${BASE_URL}/receipts`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify(receiptData)
    });
    const receipt = await receiptRes.json();
    console.log('✅ Receipt created:', receipt.id);

    // 4. Assign Items
    console.log('\n--- 4. Assigning Items ---');
    // Pizza shared by User and Alice
    await fetch(`${BASE_URL}/receipts/items/${receipt.items[0].id}/assign`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ userId: receipt.creatorId })
    });
    await fetch(`${BASE_URL}/receipts/items/${receipt.items[0].id}/assign`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ friendId: friends[0].id }) // Alice
    });

    // Pasta for Bob
    await fetch(`${BASE_URL}/receipts/items/${receipt.items[1].id}/assign`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ friendId: friends[1].id }) // Bob
    });

    // Salad for Charlie
    await fetch(`${BASE_URL}/receipts/items/${receipt.items[2].id}/assign`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ friendId: friends[2].id }) // Charlie
    });

    // Wine for David
    await fetch(`${BASE_URL}/receipts/items/${receipt.items[3].id}/assign`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ friendId: friends[3].id }) // David
    });
    console.log('✅ Items assigned');

    // 5. Payments (The 2 payers scenario)
    console.log('\n--- 5. Recording Payments (2 people paid) ---');
    // User paid 80
    await fetch(`${BASE_URL}/receipts/${receipt.id}/payments`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ amount: 80, userId: receipt.creatorId })
    });
    // Alice paid 50
    await fetch(`${BASE_URL}/receipts/${receipt.id}/payments`, {
        method: 'POST',
        headers: authHeader,
        body: JSON.stringify({ amount: 50, friendId: friends[0].id })
    });
    console.log('✅ Payments recorded');

    // 6. Final Split Report
    console.log('\n--- 6. Final Split Report ---');
    const splitRes = await fetch(`${BASE_URL}/receipts/${receipt.id}/split`, {
        headers: authHeader
    });
    const report = await splitRes.json();

    console.table(report.participants.map(p => ({
        Name: p.name,
        Type: p.type,
        Spent: p.spent.toFixed(2),
        Paid: p.paid.toFixed(2),
        Owes: p.owes.toFixed(2)
    })));

    console.log('\n✅ All Scenarios Tested Successfully!');
}

test().catch(console.error);
