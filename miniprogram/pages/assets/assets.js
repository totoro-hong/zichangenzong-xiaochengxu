const app = getApp();
const util = require('../../utils/util');
const dbHelper = require('../../utils/db');

Page({
  data: {
    loading: false,
    isGuest: false,
    assets: [],
    filteredAssets: [],
    searchKeyword: '',
    categories: [],
    activeCategory: '',
    showValues: true,
    hasData: false,
  },

  async onShow() {
    // Not logged in — auto treat as guest so user can browse first
    if (!app.globalData.hasLogin) {
      app.setGuestMode();
      this.setData({ isGuest: true, loading: false });
      return;
    }

    this.setData({ isGuest: false });
    await this.loadData();
  },

  goToLogin() {
    wx.reLaunch({ url: '/pages/login/login' });
  },

  async loadData() {
    this.setData({ loading: true });

    try {
      const openId = app.globalData.openId;
      let dashData;

      // Try cloud function first, fall back to client SDK if needed
      try {
        const { result } = await wx.cloud.callFunction({
          name: 'getDashboardData',
          data: { openId },
        });
        if (result && result.code === 0 && result.data) {
          dashData = result.data;
        } else {
          throw new Error('云函数返回异常');
        }
      } catch (cfErr) {
        console.warn('云函数调用失败，使用客户端查询:', cfErr);
        dashData = await dbHelper.getDashboardData(openId);
      }

      const assets = dashData.assets || [];
      const groups = dashData.groups || [];

      if (groups.length === 0) {
        this.setData({ loading: false, hasData: false });
        return;
      }

      // Get categories from local
      let categories = util.CATEGORIES;

      this.setData({
        loading: false,
        hasData: assets.length > 0,
        assets,
        filteredAssets: assets,
        categories: [{ id: '', name: '全部', color: '#999' }, ...categories],
      });
    } catch (err) {
      console.error('Load assets error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onSearchInput(e) {
    const keyword = e.detail.value.toLowerCase();
    this.setData({ searchKeyword: keyword });
    this.filterAssets();
  },

  filterByCategory(e) {
    const catId = e.currentTarget.dataset.id;
    this.setData({ activeCategory: catId });
    this.filterAssets();
  },

  filterAssets() {
    const { assets, searchKeyword, activeCategory } = this.data;
    let filtered = [...assets];

    if (searchKeyword) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchKeyword)
      );
    }

    if (activeCategory) {
      filtered = filtered.filter(a => a.categoryId === activeCategory);
    }

    this.setData({ filteredAssets: filtered });
  },

  toggleValues() {
    this.setData({ showValues: !this.data.showValues });
  },

  goToAssetAdd() {
    if (app.globalData.isGuest) {
      wx.showToast({ title: '请先登录后再添加资产', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/asset-add/asset-add' });
  },

  goToAssetEdit(e) {
    if (app.globalData.isGuest) {
      wx.showToast({ title: '请先登录后再编辑资产', icon: 'none' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/asset-edit/asset-edit?id=${id}` });
  },

  goToAssetDetail(e) {
    if (app.globalData.isGuest) {
      wx.showToast({ title: '请先登录后再查看详情', icon: 'none' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/asset-detail/asset-detail?id=${id}` });
  },
});
