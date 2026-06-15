App({
  globalData: {
    userInfo: null,
    openId: null,
    hasLogin: false,
    isGuest: false,
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
    this.globalData.isGuest = false;
    wx.setStorageSync('token', openId || 'logged');
  },

  setGuestMode() {
    this.globalData.isGuest = true;
  },

  logout() {
    this.globalData.userInfo = null;
    this.globalData.openId = null;
    this.globalData.hasLogin = false;
    this.globalData.isGuest = false;
    wx.removeStorageSync('token');
    wx.reLaunch({ url: '/pages/login/login' });
  },
});
