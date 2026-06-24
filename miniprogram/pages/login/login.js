const app = getApp();
const { SERVICE_AGREEMENT, PRIVACY_POLICY } = require('../../utils/agreements');

Page({
  data: {
    loading: false,
    agreedAll: false,
  },

  onLoad() {
    // If already logged in, skip login page
    if (app.globalData.hasLogin) {
      wx.reLaunch({ url: '/pages/dashboard/dashboard' });
    }
  },

  toggleAgreeAll() {
    this.setData({ agreedAll: !this.data.agreedAll });
  },

  showPrivacyDetail(e) {
    const type = e.currentTarget.dataset.type;
    const titles = { service: '用户服务协议', privacy: '隐私政策' };
    const contents = { service: SERVICE_AGREEMENT, privacy: PRIVACY_POLICY };
    wx.showModal({
      title: titles[type] || '协议',
      content: contents[type] || '',
      showCancel: true,
      cancelText: '关闭',
      confirmText: '同意',
      success: (res) => {
        if (res.confirm) {
          this.setData({ agreedAll: true });
        }
      },
    });
  },

  async handleLogin() {
    const that = this;
    if (!this.data.agreedAll) {
      wx.showToast({ title: '请先阅读并同意协议', icon: 'none' });
      return;
    }

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

      // 尝试获取用户微信昵称（需要用户点击授权）
      let nickName = '用户';
      let avatarUrl = '';
      try {
        const profile = await wx.getUserProfile({ desc: '用于在群组中显示你的昵称' });
        if (profile && profile.userInfo) {
          nickName = profile.userInfo.nickName || '用户';
          avatarUrl = profile.userInfo.avatarUrl || '';
        }
      } catch (e) {
        // 用户拒绝授权或 getUserProfile 不可用，使用默认昵称
        console.warn('获取用户信息失败，使用默认昵称:', e);
      }

      const userInfo = { nickName, avatarUrl };
      app.setUserInfo(userInfo, openId);

      // Init user group via cloud function (ensures userId is set properly)
      try {
        await wx.cloud.callFunction({
          name: 'initUserGroup',
          data: { nickName },
        });
      } catch (e) {
        console.error('Init user group error:', e);
      }

      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/dashboard/dashboard' }) });
      }, 500);
    } catch (err) {
      console.error('Login error:', err);
      wx.showToast({ title: '登录失败', icon: 'none' });
      that.setData({ loading: false });
    }
  },

  handleCancelLogin() {
    app.setGuestMode();
    wx.navigateBack({ fail: () => wx.reLaunch({ url: '/pages/dashboard/dashboard' }) });
  },
});
