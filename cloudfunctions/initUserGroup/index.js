const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const nickName = event.nickName || '用户';

  // Check if user already has a group
  const memberRes = await db.collection('group_members')
    .where({ userId: openId })
    .get();

  if (memberRes.data.length > 0) {
    return { code: 0, message: '已有群组', groupId: memberRes.data[0].groupId };
  }

  // Create default group
  const groupRes = await db.collection('groups').add({
    data: {
      name: nickName ? `${nickName}的资产` : '我的资产',
      createdBy: openId,
      createdAt: db.serverDate()
    }
  });

  await db.collection('group_members').add({
    data: {
      groupId: groupRes._id,
      userId: openId,
      nickName,
      role: 'owner',
      createdAt: db.serverDate()
    }
  });

  return { code: 0, message: '群组创建成功', groupId: groupRes._id };
};
