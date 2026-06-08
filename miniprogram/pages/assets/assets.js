const app = getApp();
const util = require('../../utils/util');

Page({
  data: {
    loading: true,
    assets: [],
    filteredAssets: [],
    searchKeyword: '',
    categories: [],
    activeCategory: '',
    showValues: true,
    hasData: false,
  },

  async onShow() {
    if (!app.globalData.hasLogin) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    await this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });

    try {
      const openId = app.globalData.openId;
      const { result } = await wx.cloud.callFunction({
        name: 'getDashboardData',
        data: { openId },
      });

      if (!result || result.code !== 0 || !result.data) {
        throw new Error('获取数据失败');
      }

      const dashData = result.data;
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
    wx.navigateTo({ url: '/pages/asset-add/asset-add' });
  },

  goToAssetEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/asset-edit/asset-edit?id=${id}` });
  },

  goToAssetDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/asset-detail/asset-detail?id=${id}` });
  },
});
