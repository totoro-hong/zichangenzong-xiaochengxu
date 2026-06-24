/**
 * Database helper functions for asset tracker mini program
 */
const db = wx.cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

/**
 * Initialize asset categories in cloud database
 */
async function initCategories() {
  const collection = db.collection('asset_categories');
  const { total } = await collection.count();
  if (total > 0) return;

  const categories = [
    { name: '现金存款', color: '#3b9e6e', icon: 'wallet', order: 1 },
    { name: '理财', color: '#f0a030', icon: 'trending-up', order: 2 },
    { name: '基金', color: '#d4a854', icon: 'bar-chart', order: 3 },
    { name: '股票', color: '#e74c4c', icon: 'bar-chart', order: 4 },
    { name: '房产', color: '#5b7fff', icon: 'home', order: 5 },
    { name: '其他投资', color: '#9b6bcc', icon: 'more-horizontal', order: 6 },
  ];

  const promises = categories.map(c => collection.add({ data: c }));
  await Promise.all(promises);
}

/**
 * Fetch all categories
 */
async function getCategories() {
  const { data } = await db.collection('asset_categories')
    .orderBy('order', 'asc')
    .get();
  return data;
}

/**
 * Get or create a default group for the user
 */
async function getOrCreateDefaultGroup(openId, nickName) {
  const memberRes = await db.collection('group_members')
    .where({ userId: openId })
    .get();

  if (memberRes.data.length > 0) {
    // Return the first group the user belongs to
    const groupRes = await db.collection('groups')
      .doc(memberRes.data[0].groupId)
      .get();
    if (groupRes.data) {
      return { group: groupRes.data, isNew: false };
    }
  }

  // Create a default group
  const groupRes = await db.collection('groups').add({
    data: {
      name: nickName ? `${nickName}的资产` : '我的资产',
      createdBy: openId,
      createdAt: db.serverDate(),
    }
  });

  await db.collection('group_members').add({
    data: {
      groupId: groupRes._id,
      userId: openId,
      nickName: nickName || '',
      role: 'owner',
      createdAt: db.serverDate(),
    }
  });

  const group = await db.collection('groups').doc(groupRes._id).get();
  return { group: group.data, isNew: true };
}

/**
 * Fetch user's groups with member info
 */
async function getUserGroups(openId) {
  const { result } = await wx.cloud.callFunction({
    name: 'getUserGroups',
    data: { openId },
  });

  if (result.code !== 0) return [];
  return result.data || [];
}

/**
 * Fetch assets for given group IDs
 */
async function getGroupAssets(groupIds) {
  if (!groupIds || groupIds.length === 0) return [];

  const { data } = await db.collection('assets')
    .where({ groupId: _.in(groupIds) })
    .orderBy('createdAt', 'desc')
    .get();

  return data;
}

/**
 * Fetch all data needed for dashboard
 */
async function getDashboardData(openId) {
  const groups = await getUserGroups(openId);
  if (groups.length === 0) {
    return { groups: [], assets: [], totalValue: 0, totalCost: 0, totalReturn: 0, returnRate: 0, categoryData: [] };
  }

  const groupIds = groups.map(g => g._id);
  const assets = await getGroupAssets(groupIds);

  return computeDashboardStats(assets, groups, openId);
}

/**
 * Compute dashboard statistics from assets
 */
function computeDashboardStats(assets, groups, openId) {
  const totalValue = assets.reduce((s, a) => s + Number(a.currentValue || 0), 0);
  const totalCost = assets.reduce((s, a) => s + Number(a.purchaseAmount || 0), 0);
  const totalReturn = totalValue - totalCost;
  const returnRate = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  // Category aggregation
  const catMap = new Map();
  for (const asset of assets) {
    const catName = asset.categoryName || '未分类';
    const catColor = asset.categoryColor || '#999';
    const existing = catMap.get(catName) || { name: catName, color: catColor, total: 0, count: 0 };
    existing.total += Number(asset.currentValue || 0);
    existing.count += 1;
    catMap.set(catName, existing);
  }
  const categoryData = Array.from(catMap.values()).sort((a, b) => b.total - a.total);

  // Group assets by category
  const groupedAssets = new Map();
  for (const asset of assets) {
    const catName = asset.categoryName || '未分类';
    if (!groupedAssets.has(catName)) groupedAssets.set(catName, []);
    groupedAssets.get(catName).push(asset);
  }

  return {
    groups,
    assets,
    totalValue,
    totalCost,
    totalReturn,
    returnRate,
    categoryData,
    groupedAssets: Array.from(groupedAssets.entries()).map(([name, items]) => ({
      name,
      color: items[0]?.categoryColor || '#999',
      assets: items,
    })),
  };
}

/**
 * Create a new asset
 */
async function createAsset(data) {
  return await db.collection('assets').add({
    data: {
      groupId: data.groupId,
      createdBy: data.createdBy,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      categoryColor: data.categoryColor,
      name: data.name,
      purchaseAmount: Number(data.purchaseAmount),
      currentValue: Number(data.currentValue),
      purchaseDate: data.purchaseDate,
      note: data.note || '',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
  });
}

/**
 * Update an existing asset
 */
async function updateAsset(id, data) {
  return await db.collection('assets').doc(id).update({
    data: {
      name: data.name,
      categoryId: data.categoryId,
      categoryName: data.categoryName,
      categoryColor: data.categoryColor,
      groupId: data.groupId,
      purchaseAmount: Number(data.purchaseAmount),
      currentValue: Number(data.currentValue),
      purchaseDate: data.purchaseDate,
      note: data.note || '',
      updatedAt: db.serverDate(),
    }
  });
}

/**
 * Delete an asset
 */
async function deleteAsset(id) {
  return await db.collection('assets').doc(id).remove();
}

/**
 * Create a new group
 */
async function createGroup(name, openId, nickName) {
  const { result } = await wx.cloud.callFunction({
    name: 'createGroup',
    data: { name, openId, nickName },
  });

  if (result.code !== 0) {
    throw new Error(result.message || '创建失败');
  }

  return result.data._id;
}

/**
 * Get group details with members
 */
async function getGroupDetail(groupId) {
  const { result } = await wx.cloud.callFunction({
    name: 'getGroupDetail',
    data: { groupId },
  });

  if (result.code !== 0 || !result.data) {
    throw new Error('获取群组详情失败');
  }

  return result.data;
}

/**
 * Join a group (for invite functionality)
 */
async function joinGroup(groupId, openId, nickName) {
  const { result } = await wx.cloud.callFunction({
    name: 'joinGroup',
    data: { groupId, openId, nickName },
  });

  return result.code === 0;
}

/**
 * Delete a group and all its data
 */
async function deleteGroup(groupId) {
  const { result } = await wx.cloud.callFunction({
    name: 'deleteGroup',
    data: { groupId },
  });

  if (result.code !== 0) {
    throw new Error(result.message || '删除失败');
  }

  return true;
}

module.exports = {
  initCategories,
  getCategories,
  getOrCreateDefaultGroup,
  getUserGroups,
  getGroupAssets,
  getDashboardData,
  computeDashboardStats,
  createAsset,
  updateAsset,
  deleteAsset,
  createGroup,
  getGroupDetail,
  joinGroup,
  deleteGroup,
};
