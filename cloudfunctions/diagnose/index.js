const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  var result = {};

  // Check collections existence and counts
  try {
    var assetsCount = await db.collection('assets').count();
    result.assetsCount = assetsCount.total;
  } catch (e) {
    result.assetsError = e.message;
  }

  try {
    var groupsCount = await db.collection('groups').count();
    result.groupsCount = groupsCount.total;
  } catch (e) {
    result.groupsError = e.message;
  }

  try {
    var membersCount = await db.collection('group_members').count();
    result.membersCount = membersCount.total;
  } catch (e) {
    result.membersError = e.message;
  }

  try {
    var catCount = await db.collection('asset_categories').count();
    result.categoriesCount = catCount.total;
  } catch (e) {
    result.categoriesError = e.message;
  }

  // Sample data
  try {
    var groups = await db.collection('groups').get();
    result.groups = groups.data.map(function(g) {
      return { _id: g._id, name: g.name, createdBy: g.createdBy };
    });
  } catch (e) {
    result.groupsSampleError = e.message;
  }

  try {
    var members = await db.collection('group_members').get();
    result.members = members.data.map(function(m) {
      return { _id: m._id, groupId: m.groupId, userId: m.userId, role: m.role };
    });
  } catch (e) {
    result.membersSampleError = e.message;
  }

  try {
    var assets = await db.collection('assets').limit(3).get();
    result.assetSample = assets.data.map(function(a) {
      return { name: a.name, groupId: a.groupId, createdBy: a.createdBy, categoryName: a.categoryName };
    });
  } catch (e) {
    result.assetsSampleError = e.message;
  }

  // Test query - what dashboard does
  try {
    var allAssets = await db.collection('assets').get();
    result.totalAssetsInDB = allAssets.data.length;
  } catch (e) {
    result.allAssetsError = e.message;
  }

  return result;
};
