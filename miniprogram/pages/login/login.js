const app = getApp();
const db = wx.cloud.database();

Page({
  data: {
    loading: false,
  },

  onLoad() {
    // Auto-login if already logged in
    if (app.globalData.hasLogin) {
      wx.reLaunch({ url: '/pages/dashboard/dashboard' });
    }
  },

  async handleLogin() {
    const that = this;
    that.setData({ loading: true });

    try {
      const { code } = await wx.login();
      const { result } = await wx.cloud.callFunction({
        name: 'getOpenId',
        data: { code },
      });

      if (!result || !result.openid) {
        throw new Error('登录失败');
      }

      const openId = result.openid;
      const userInfo = { nickName: '用户', avatarUrl: '' };
      app.setUserInfo(userInfo, openId);

      try {
        await initUserData(openId, '用户');
      } catch (e) {
        console.error('Init user data error:', e);
      }

      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        wx.reLaunch({ url: '/pages/dashboard/dashboard' });
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      wx.showToast({ title: '登录失败', icon: 'none' });
      that.setData({ loading: false });
    }
  },

});

async function initUserData(openId, nickName) {
  const db = wx.cloud.database();
  const _ = db.command;

  // Init categories if not exist
  const catCount = await db.collection('asset_categories').count();
  if (catCount.total === 0) {
    const categories = [
      { name: '现金存款', color: '#3b9e6e', icon: 'wallet', order: 1 },
      { name: '基金理财', color: '#d4a854', icon: 'trending-up', order: 2 },
      { name: '股票', color: '#e74c4c', icon: 'bar-chart', order: 3 },
      { name: '房产', color: '#5b7fff', icon: 'home', order: 4 },
      { name: '其他投资', color: '#9b6bcc', icon: 'more-horizontal', order: 5 },
    ];
    for (const c of categories) {
      await db.collection('asset_categories').add({ data: c });
    }
  }

  // Create default group if user has no groups
  const memberRes = await db.collection('group_members')
    .where({ userId: openId })
    .get();

  if (memberRes.data.length === 0) {
    const groupRes = await db.collection('groups').add({
      data: { name: nickName ? `${nickName}的资产` : '我的资产', createdBy: openId, createdAt: db.serverDate() }
    });
    await db.collection('group_members').add({
      data: { groupId: groupRes._id, userId: openId, nickName, role: 'owner', createdAt: db.serverDate() }
    });
  }
}
