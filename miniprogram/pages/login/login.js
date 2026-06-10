const app = getApp();

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

      // Init user group via cloud function (ensures userId is set properly)
      try {
        await wx.cloud.callFunction({ name: 'initUserGroup' });
      } catch (e) {
        console.error('Init user group error:', e);
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
