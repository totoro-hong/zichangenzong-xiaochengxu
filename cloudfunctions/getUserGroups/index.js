const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { openId } = event;
  const wxContext = cloud.getWXContext();
  const userId = openId || wxContext.OPENID;

  const memberRes = await db.collection('group_members')
    .where({ userId })
    .get();

  const groupIds = memberRes.data.map(m => m.groupId);
  if (groupIds.length === 0) return { code: 0, data: [] };

  const groupsRes = await db.collection('groups')
    .where({ _id: _.in(groupIds) })
    .get();

  const groups = groupsRes.data.map(g => {
    const members = memberRes.data.filter(m => m.groupId === g._id);
    const myMembership = members.find(m => m.userId === userId);
    return {
      ...g,
      memberCount: members.length,
      myRole: myMembership ? myMembership.role : 'member',
    };
  });

  return { code: 0, data: groups };
};
