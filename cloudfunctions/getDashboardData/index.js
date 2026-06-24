const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = event.openId || wxContext.OPENID;
  const filterGroupId = event.groupId || ''; // 可选，筛选某个群组

  // Get all groups the user belongs to
  const memberRes = await db.collection('group_members')
    .where({ userId: openId })
    .get();

  if (memberRes.data.length === 0) {
    return { code: 0, data: { groups: [], assets: [], totalValue: 0, totalCost: 0, totalReturn: 0, returnRate: 0, categoryData: [], groupedAssets: [], groupSummaries: [], selectedGroup: null } };
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

  // Build per-group summaries
  const groupSummaries = [];
  for (var i = 0; i < groups.length; i++) {
    var g = groups[i];
    var gAssets = await db.collection('assets')
      .where({ groupId: g._id })
      .get();
    var gValue = gAssets.data.reduce(function(s, a) { return s + Number(a.currentValue || 0); }, 0);
    var gCost = gAssets.data.reduce(function(s, a) { return s + Number(a.purchaseAmount || 0); }, 0);
    groupSummaries.push({
      _id: g._id,
      name: g.name,
      memberCount: g.memberCount,
      myRole: g.myRole,
      totalValue: gValue,
      totalCost: gCost,
      assetCount: gAssets.data.length,
    });
  }

  // Determine which groups to query assets for
  var queryGroupIds = groupIds;
  var selectedGroup = null;
  if (filterGroupId && groupIds.indexOf(filterGroupId) !== -1) {
    queryGroupIds = [filterGroupId];
    selectedGroup = groupSummaries.find(function(s) { return s._id === filterGroupId; }) || null;
  }

  // Get assets for the selected groups
  const assetRes = await db.collection('assets')
    .where({ groupId: _.in(queryGroupIds) })
    .orderBy('createdAt', 'desc')
    .get();

  const assets = assetRes.data;

  // Compute stats
  const totalValue = assets.reduce(function(s, a) { return s + Number(a.currentValue || 0); }, 0);
  const totalCost = assets.reduce(function(s, a) { return s + Number(a.purchaseAmount || 0); }, 0);
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
  var categoryData = Object.values(catMap).sort(function(a, b) { return b.total - a.total; });

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
      groupSummaries,
      selectedGroup,
    }
  };
};
