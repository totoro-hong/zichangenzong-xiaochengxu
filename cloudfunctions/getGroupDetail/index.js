const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { groupId } = event;

  const groupRes = await db.collection('groups').doc(groupId).get();
  const membersRes = await db.collection('group_members')
    .where({ groupId })
    .get();
  const assetsRes = await db.collection('assets')
    .where({ groupId })
    .get();

  const totalValue = assetsRes.data.reduce((s, a) => s + Number(a.currentValue || 0), 0);
  const totalCost = assetsRes.data.reduce((s, a) => s + Number(a.purchaseAmount || 0), 0);

  return {
    code: 0,
    data: {
      group: groupRes.data,
      members: membersRes.data,
      totalAssets: totalValue,
      totalCost,
      assetCount: assetsRes.data.length,
    }
  };
};
