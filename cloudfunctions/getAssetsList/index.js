const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const { keyword, categoryId, groupId, page = 1, pageSize = 20 } = event;
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // Get user's groups
    const memberRes = await db.collection('group_members')
      .where({ userId: openId })
      .get();

    if (memberRes.data.length === 0) {
      return { code: 0, data: { list: [], total: 0, hasMore: false } };
    }

    let groupIds = memberRes.data.map(m => m.groupId);
    if (groupId) {
      groupIds = groupIds.filter(id => id === groupId);
      if (groupIds.length === 0) {
        return { code: 0, data: { list: [], total: 0, hasMore: false } };
      }
    }

    const conditions = [{ groupId: _.in(groupIds) }];
    if (categoryId) conditions.push({ categoryId });
    if (keyword) conditions.push({ name: db.RegExp({ regexp: keyword, options: 'i' }) });

    const query = conditions.length > 1 ? _.and(conditions) : conditions[0];

    const countRes = await db.collection('assets').where(query).count();
    const assetsRes = await db.collection('assets')
      .where(query)
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    return {
      code: 0,
      data: {
        list: assetsRes.data,
        total: countRes.total,
        hasMore: page * pageSize < countRes.total,
      },
    };
  } catch (err) {
    return { code: -1, message: err.message };
  }
};
