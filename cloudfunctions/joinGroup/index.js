const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { groupId, openId, nickName } = event;
  const wxContext = cloud.getWXContext();
  const callerOpenId = wxContext.OPENID;
  const userId = openId || callerOpenId;

  const existing = await db.collection('group_members')
    .where({ groupId, userId })
    .get();

  if (existing.data.length > 0) {
    return { code: 1, message: '已在群组中' };
  }

  await db.collection('group_members').add({
    data: {
      groupId,
      userId,
      nickName: nickName || '',
      role: 'member',
      createdAt: db.serverDate(),
    }
  });

  return { code: 0, message: '加入成功' };
};
