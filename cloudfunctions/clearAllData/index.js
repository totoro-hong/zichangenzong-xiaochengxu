const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  var result = {};
  var errors = [];

  const collections = ['assets', 'asset_categories', 'groups', 'group_members'];

  for (var ci = 0; ci < collections.length; ci++) {
    var name = collections[ci];
    try {
      var countRes = await db.collection(name).count();
      var total = countRes.total;
      result[name] = { found: total };

      // Delete in batches of 20 (WeChat Cloud limit)
      var deleted = 0;
      while (true) {
        var res = await db.collection(name).limit(20).get();
        if (res.data.length === 0) break;

        var ids = res.data.map(function (doc) { return doc._id; });
        // Delete one by one (batch delete requires admin SDK, this uses simple loop)
        for (var di = 0; di < ids.length; di++) {
          try {
            await db.collection(name).doc(ids[di]).remove();
            deleted++;
          } catch (e) {
            errors.push(name + '.' + ids[di] + ': ' + e.message);
          }
        }
      }
      result[name].deleted = deleted;
    } catch (e) {
      errors.push(name + ': ' + e.message);
      result[name] = { error: e.message };
    }
  }

  return {
    code: errors.length > 0 ? 1 : 0,
    message: errors.length > 0 ? '部分删除失败' : '所有数据已清空',
    result: result,
    errors: errors,
  };
};
