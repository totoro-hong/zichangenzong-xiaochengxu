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
    groupList: [],
    selectedGroupId: '',
    selectedGroupName: '全部群组',
  },

  onShow() {
    // Not logged in — auto treat as guest so user can browse first
    if (!app.globalData.hasLogin) {
      app.setGuestMode();
      this.setData({ isGuest: true, loading: false });
      return;
    }

    this.setData({ isGuest: false });

    // 有缓存 → 直接渲染，后台静默刷新
    const cached = app.getCache();
    if (cached) {
      console.log('[ASSETS] 使用缓存渲染');
      this.renderAssets(cached);
      this.setData({ loading: false });
    } else {
      console.log('[ASSETS] 无缓存，显示加载');
      this.setData({ loading: true });
    }

    this.loadData().catch(e => console.error(e));
  },

  goToLogin() {
    wx.reLaunch({ url: '/pages/login/login' });
  },

  async loadData() {
    // 无缓存时显示 loading；有缓存时后台静默刷新
    if (!app.hasCache()) {
      this.setData({ loading: true });
    }

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

      if (dashData.groups.length === 0) {
        this.setData({ loading: false, hasData: false });
        return;
      }

      app.setCache(dashData);
      this.renderAssets(dashData);
    } catch (err) {
      console.error('Load assets error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  renderAssets(dashData) {
    const assets = dashData.assets || [];
    const categories = util.CATEGORIES;
    const groupList = (dashData.groupSummaries || []).map(g => ({
      _id: g._id, name: g.name,
    }));

    this.setData({
      loading: false,
      hasData: assets.length > 0,
      assets,
      filteredAssets: assets,
      categories: [{ id: '', name: '全部', color: '#999' }, ...categories],
      groupList,
    });
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

  filterByGroup(e) {
    const id = e.currentTarget.dataset.id || '';
    this.setData({ selectedGroupId: id });
    this.filterAssets();
  },

  filterAssets() {
    const { assets, searchKeyword, activeCategory, selectedGroupId } = this.data;
    let filtered = [...assets];

    if (selectedGroupId) {
      filtered = filtered.filter(a => a.groupId === selectedGroupId);
    }

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
