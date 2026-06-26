App({
  globalData: {
    userInfo: null,
    openId: null,
    hasLogin: false,
    isGuest: false,
    cache: {
      data: null,
      timestamp: 0,
    },
  },

  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-d9gs37uj5e998acf1',
      traceUser: true,
    });

    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.hasLogin = true;
    }

    // 从本地存储恢复缓存，冷启动也能秒开
    this._restoreCache();
  },

  // --- 缓存 API ---
  _restoreCache() {
    try {
      const saved = wx.getStorageSync('dashboardCache');
      if (saved && saved.data && saved.timestamp) {
        this.globalData.cache.data = saved.data;
        this.globalData.cache.timestamp = saved.timestamp;
        console.log('[CACHE] 从存储恢复缓存, 资产数:', saved.data.assets?.length);
      }
    } catch (e) { /* ignore */ }
  },

  setCache(data) {
    this.globalData.cache.data = data;
    this.globalData.cache.timestamp = Date.now();
    console.log('[CACHE] 设置缓存, 资产数:', data.assets?.length);
    try {
      wx.setStorageSync('dashboardCache', { data, timestamp: Date.now() });
    } catch (e) { /* storage full — ignore */ }
  },

  getCache() {
    return this.globalData.cache.data;
  },

  hasCache() {
    const has = this.globalData.cache.data !== null;
    console.log('[CACHE] hasCache:', has);
    return has;
  },

  invalidateCache() {
    console.log('[CACHE] 失效缓存');
    this.globalData.cache.data = null;
    this.globalData.cache.timestamp = 0;
    try {
      wx.removeStorageSync('dashboardCache');
    } catch (e) { /* ignore */ }
  },
  // --- 缓存 API 结束 ---

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
