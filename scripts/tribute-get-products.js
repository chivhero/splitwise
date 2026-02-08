#!/usr/bin/env node
/**
 * Получить список товаров из Tribute API
 * Usage: TRIBUTE_API_KEY=your_key node scripts/tribute-get-products.js
 */

const TRIBUTE_API_KEY = process.env.TRIBUTE_API_KEY;

async function getProducts() {
  if (!TRIBUTE_API_KEY) {
    console.error('❌ Ошибка: Установите переменную TRIBUTE_API_KEY');
    console.log('Usage: TRIBUTE_API_KEY=your_key node scripts/tribute-get-products.js');
    process.exit(1);
  }

  try {
    console.log('🔍 Получаем список товаров из Tribute...\n');

    const response = await fetch('https://tribute.tg/api/v1/products?type=digital', {
      headers: {
        'Api-Key': TRIBUTE_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Ошибка API:', error);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('📦 Найдено товаров:', data.meta?.total || 0);
    console.log('');

    if (data.rows && data.rows.length > 0) {
      data.rows.forEach(product => {
        console.log('─────────────────────────────────────');
        console.log(`ID: ${product.id}`);
        console.log(`Название: ${product.name}`);
        console.log(`Цена: ${product.amount} ${product.currency.toUpperCase()}`);
        console.log(`Тип: ${product.type}`);
        console.log(`Статус: ${product.status}`);
        console.log(`Ссылка: ${product.link}`);
        console.log('');
      });
      
      console.log('─────────────────────────────────────');
      console.log('');
      console.log('💡 Используйте ID товара для интеграции:');
      console.log(`   TRIBUTE_PRODUCT_ID=${data.rows[0].id}`);
    } else {
      console.log('⚠️  Товары не найдены. Создайте товар в @tribute_bot');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

getProducts();
