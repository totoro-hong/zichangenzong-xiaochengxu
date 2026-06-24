const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const { name, openId, nickName } = event;
  const wxContext = cloud.getWXContext();
  const callerOpenId = wxContext.OPENID;

  const groupRes = await db.collection('groups').add({
    data: {
      name,
      createdBy: openId || callerOpenId,
      createdAt: db.serverDate(),
    }
  });

  await db.collection('group_members').add({
    data: {
      groupId: groupRes._id,
      userId: openId || callerOpenId,
      nickName: nickName || '',
      role: 'owner',
      createdAt: db.serverDate(),
    }
  });

  return { code: 0, data: { _id: groupRes._id } };
};
