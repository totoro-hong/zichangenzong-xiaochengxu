App({
  globalData: {
    userInfo: null,
    openId: null,
    hasLogin: false,
  },

  onLaunch() {
    const that = this;
    wx.cloud.init({
      env: 'cloud1-d9gs37uj5e998acf1',
      traceUser: true,
    });

    // Check login state
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.hasLogin = true;
    }
  },

  setUserInfo(userInfo, openId) {
    this.globalData.userInfo = userInfo;
    this.globalData.openId = openId;
    this.globalData.hasLogin = true;
    wx.setStorageSync('token', openId || 'logged');
  },

  logout() {
    this.globalData.userInfo = null;
    this.globalData.openId = null;
    this.globalData.hasLogin = false;
    wx.removeStorageSync('token');
    wx.reLaunch({ url: '/pages/login/login' });
  },
});
