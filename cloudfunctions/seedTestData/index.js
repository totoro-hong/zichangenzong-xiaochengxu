const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const openId = event.openId || (cloud.getWXContext().OPENID);
  var log = [];

  log.push('为用户 ' + openId + ' 生成测试数据');

  // 1. Get categories
  var catRes = await db.collection('asset_categories').get();
  var categories = catRes.data;

  // 2. Find or create group
  var memberRes = await db.collection('group_members')
    .where({ userId: openId })
    .get();

  var groupId;
  if (memberRes.data.length > 0) {
    groupId = memberRes.data[0].groupId;
    log.push('使用已有群组: ' + groupId);
  } else {
    var groupRes = await db.collection('groups').add({
      data: { name: '我的资产', createdBy: openId, createdAt: db.serverDate() }
    });
    groupId = groupRes._id;
    await db.collection('group_members').add({
      data: { groupId: groupId, userId: openId, nickName: '用户', role: 'owner', createdAt: db.serverDate() }
    });
    log.push('创建新群组: ' + groupId);
  }

  // 3. Delete existing assets for this group
  var existing = await db.collection('assets').where({ groupId: groupId }).count();
  if (existing.total > 0) {
    log.push('已有 ' + existing.total + ' 条资产，先清除');
    while (true) {
      var oldAssets = await db.collection('assets').where({ groupId: groupId }).limit(20).get();
      if (oldAssets.data.length === 0) break;
      for (var i = 0; i < oldAssets.data.length; i++) {
        await db.collection('assets').doc(oldAssets.data[i]._id).remove();
      }
    }
  }

  // 4. Insert test assets
  var testAssets = [
    { name: '余额宝', ci: 0, cost: 50000, value: 51200, date: '2025-06-01', note: '日常零钱' },
    { name: '零钱通', ci: 0, cost: 30000, value: 30500, date: '2025-08-15', note: '' },
    { name: '银行定期存款', ci: 0, cost: 100000, value: 103500, date: '2025-01-10', note: '年利率2.5%' },
    { name: '易方达蓝筹精选', ci: 1, cost: 20000, value: 16800, date: '2025-03-20', note: '行业配置' },
    { name: '招商中证白酒', ci: 1, cost: 15000, value: 13200, date: '2025-04-05', note: '' },
    { name: '沪深300指数增强', ci: 1, cost: 30000, value: 31800, date: '2025-02-18', note: '' },
    { name: '纳斯达克ETF联接', ci: 1, cost: 10000, value: 12400, date: '2025-07-01', note: '' },
    { name: '债券基金', ci: 1, cost: 50000, value: 51600, date: '2025-05-10', note: '稳健型' },
    { name: '贵州茅台', ci: 2, cost: 18000, value: 19800, date: '2025-09-15', note: '' },
    { name: '腾讯控股', ci: 2, cost: 32000, value: 35600, date: '2025-06-20', note: '港股通' },
    { name: '宁德时代', ci: 2, cost: 15000, value: 12800, date: '2025-11-01', note: '' },
    { name: '比亚迪', ci: 2, cost: 12000, value: 14500, date: '2025-08-08', note: '' },
    { name: '自住房产', ci: 3, cost: 2000000, value: 2150000, date: '2024-12-01', note: '' },
    { name: '投资公寓', ci: 3, cost: 800000, value: 760000, date: '2025-03-15', note: '月租金3500' },
    { name: '数字货币', ci: 4, cost: 10000, value: 8500, date: '2025-10-10', note: '' },
    { name: '黄金积存', ci: 4, cost: 20000, value: 21800, date: '2025-07-20', note: '' },
    { name: '理财产品', ci: 4, cost: 80000, value: 82400, date: '2025-05-01', note: '90天定期' },
  ];

  var count = 0;
  var errors = [];

  for (var i = 0; i < testAssets.length; i++) {
    var item = testAssets[i];
    var cat = categories[item.ci % categories.length];
    try {
      await db.collection('assets').add({
        data: {
          groupId: groupId,
          createdBy: openId,
          categoryId: cat._id,
          categoryName: cat.name,
          categoryColor: cat.color,
          name: item.name,
          purchaseAmount: item.cost,
          currentValue: item.value,
          purchaseDate: item.date,
          note: item.note,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        }
      });
      count++;
    } catch (e) {
      errors.push(item.name + ': ' + e.message);
    }
  }

  log.push('成功生成 ' + count + ' 条资产数据');

  return {
    code: 0,
    message: '成功生成 ' + count + ' 条资产',
    log: log,
    errors: errors,
    groupId: groupId,
  };
};
