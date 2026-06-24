const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { groupId } = event;
  const wxContext = cloud.getWXContext();
  const callerOpenId = wxContext.OPENID;

  // 验证群组存在并获取信息
  const groupRes = await db.collection('groups').doc(groupId).get();
  if (!groupRes.data) {
    return { code: 1, message: '群组不存在' };
  }

  // 验证调用者是所有者
  const memberRes = await db.collection('group_members')
    .where({ groupId, userId: callerOpenId })
    .get();

  const myMembership = memberRes.data.find(m => m.userId === callerOpenId);
  if (!myMembership || myMembership.role !== 'owner') {
    return { code: 2, message: '只有群组所有者才能删除群组' };
  }

  // 删除群组内所有资产
  const assetsRes = await db.collection('assets')
    .where({ groupId })
    .get();
  const delAssetPromises = assetsRes.data.map(a =>
    db.collection('assets').doc(a._id).remove()
  );
  await Promise.all(delAssetPromises);

  // 删除所有群组成员记录
  const membersRes = await db.collection('group_members')
    .where({ groupId })
    .get();
  const delMemberPromises = membersRes.data.map(m =>
    db.collection('group_members').doc(m._id).remove()
  );
  await Promise.all(delMemberPromises);

  // 删除群组
  await db.collection('groups').doc(groupId).remove();

  return { code: 0, message: '群组已删除' };
};
