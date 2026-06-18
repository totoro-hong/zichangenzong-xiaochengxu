const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const results = [];

  // Create collections
  const collections = ['asset_categories', 'groups', 'group_members', 'assets'];
  for (const name of collections) {
    try {
      await db.createCollection(name);
      results.push({ collection: name, status: 'created' });
    } catch (e) {
      if (e.message && e.message.includes('already exists')) {
        results.push({ collection: name, status: 'already exists' });
      } else {
        results.push({ collection: name, status: 'error', error: e.message });
      }
    }
  }

  // Seed categories
  try {
    const { total } = await db.collection('asset_categories').count();
    if (total === 0) {
      const categories = [
        { name: '现金存款', color: '#3b9e6e', icon: 'wallet', order: 1 },
        { name: '理财', color: '#f0a030', icon: 'trending-up', order: 2 },
        { name: '基金', color: '#d4a854', icon: 'bar-chart', order: 3 },
        { name: '股票', color: '#e74c4c', icon: 'bar-chart', order: 4 },
        { name: '房产', color: '#5b7fff', icon: 'home', order: 5 },
        { name: '其他投资', color: '#9b6bcc', icon: 'more-horizontal', order: 6 },
      ];
      for (const c of categories) {
        await db.collection('asset_categories').add({ data: c });
      }
      results.push({ seed: 'categories', status: 'seeded', count: categories.length });
    } else {
      results.push({ seed: 'categories', status: 'skipped', total });
    }
  } catch (e) {
    results.push({ seed: 'categories', status: 'error', error: e.message });
  }

  return { code: 0, results };
};
