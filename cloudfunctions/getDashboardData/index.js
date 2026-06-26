const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = event.openId || wxContext.OPENID;
  const filterGroupId = event.groupId || '';

  // 1. Get all groups the user belongs to
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

  // 2. Determine which groups to query assets for
  const queryGroupIds = filterGroupId && groupIds.includes(filterGroupId)
    ? [filterGroupId]
    : groupIds;

  // 3. Single assets query (was: per-group loop + redundant 2nd query)
  const assetRes = await db.collection('assets')
    .where({ groupId: _.in(queryGroupIds) })
    .orderBy('createdAt', 'desc')
    .get();

  const assets = assetRes.data;

  // 4. Build per-group summaries from the single asset result (was: N separate queries)
  const groupSummaries = groups.map(g => {
    const gAssets = assets.filter(a => a.groupId === g._id);
    const gValue = gAssets.reduce((s, a) => s + Number(a.currentValue || 0), 0);
    const gCost = gAssets.reduce((s, a) => s + Number(a.purchaseAmount || 0), 0);
    return {
      _id: g._id,
      name: g.name,
      memberCount: g.memberCount,
      myRole: g.myRole,
      totalValue: gValue,
      totalCost: gCost,
      assetCount: gAssets.length,
    };
  });

  const selectedGroup = filterGroupId
    ? groupSummaries.find(s => s._id === filterGroupId) || null
    : null;

  // 5. Compute stats
  const totalValue = assets.reduce((s, a) => s + Number(a.currentValue || 0), 0);
  const totalCost = assets.reduce((s, a) => s + Number(a.purchaseAmount || 0), 0);
  const totalReturn = totalValue - totalCost;
  const returnRate = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  // 6. Category aggregation
  const catMap = {};
  for (const a of assets) {
    const catName = a.categoryName || '未分类';
    const catColor = a.categoryColor || '#999';
    if (!catMap[catName]) catMap[catName] = { name: catName, color: catColor, total: 0, count: 0 };
    catMap[catName].total += Number(a.currentValue || 0);
    catMap[catName].count += 1;
  }
  const categoryData = Object.values(catMap).sort((a, b) => b.total - a.total);

  // 7. Group assets by category
  const groupedMap = {};
  for (const a of assets) {
    const catName = a.categoryName || '未分类';
    if (!groupedMap[catName]) groupedMap[catName] = [];
    groupedMap[catName].push(a);
  }
  const groupedAssets = Object.keys(groupedMap).map(name => ({
    name,
    color: groupedMap[name][0]?.categoryColor || '#999',
    assets: groupedMap[name],
  }));

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
