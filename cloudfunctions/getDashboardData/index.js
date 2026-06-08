const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = event.openId || wxContext.OPENID;

  // Get all groups the user belongs to
  const memberRes = await db.collection('group_members')
    .where({ userId: openId })
    .get();

  if (memberRes.data.length === 0) {
    return { code: 0, data: { groups: [], assets: [], totalValue: 0, totalCost: 0, totalReturn: 0, returnRate: 0, categoryData: [], groupedAssets: [] } };
  }

  const groupIds = memberRes.data.map(m => m.groupId);
  const groupRes = await db.collection('groups')
    .where({ _id: _.in(groupIds) })
    .get();

  const groups = groupRes.data.map(g => ({
    ...g,
    memberCount: memberRes.data.filter(m => m.groupId === g._id).length,
    myRole: memberRes.data.find(m => m.groupId === g._id)?.role || 'member',
  }));

  // Get all assets for these groups
  const assetRes = await db.collection('assets')
    .where({ groupId: _.in(groupIds) })
    .orderBy('createdAt', 'desc')
    .get();

  const assets = assetRes.data;

  // Compute stats
  const totalValue = assets.reduce((s, a) => s + Number(a.currentValue || 0), 0);
  const totalCost = assets.reduce((s, a) => s + Number(a.purchaseAmount || 0), 0);
  const totalReturn = totalValue - totalCost;
  const returnRate = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  // Category aggregation
  const catMap = {};
  for (var i = 0; i < assets.length; i++) {
    var a = assets[i];
    var catName = a.categoryName || '未分类';
    var catColor = a.categoryColor || '#999';
    if (!catMap[catName]) catMap[catName] = { name: catName, color: catColor, total: 0, count: 0 };
    catMap[catName].total += Number(a.currentValue || 0);
    catMap[catName].count += 1;
  }
  var categoryData = Object.values(catMap).sort((a, b) => b.total - a.total);

  // Group assets by category
  var groupedMap = {};
  for (var i = 0; i < assets.length; i++) {
    var a = assets[i];
    var catName = a.categoryName || '未分类';
    if (!groupedMap[catName]) groupedMap[catName] = [];
    groupedMap[catName].push(a);
  }
  var groupedAssets = Object.keys(groupedMap).map(function(name) {
    return { name: name, color: groupedMap[name][0]?.categoryColor || '#999', assets: groupedMap[name] };
  });

  return {
    code: 0,
    data: {
      groups,
      assets,
      totalValue,
      totalCost,
      totalReturn,
      returnRate,
      categoryData,
      groupedAssets,
    }
  };
};
