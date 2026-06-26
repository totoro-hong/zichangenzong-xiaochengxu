const app = getApp();
const db = wx.cloud.database();
const util = require('../../utils/util');
const dbHelper = require('../../utils/db');

Page({
  data: {
    id: '',
    name: '',
    categoryId: '',
    categoryName: '',
    categoryColor: '',
    categoryIndex: -1,
    groupId: '',
    groupName: '',
    groupIndex: -1,
    purchaseAmount: '',
    currentValue: '',
    purchaseDate: '',
    note: '',
    submitting: false,
    error: '',
    loading: true,

    categories: util.CATEGORIES,
    groups: [],
    groupNames: [],
  },

  async onLoad(options) {
    if (!app.globalData.hasLogin) {
      wx.showToast({ title: '请先登录后再编辑资产', icon: 'none' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 500);
      return;
    }

    if (options.id) {
      this.setData({ id: options.id });
      await Promise.all([
        this.loadAsset(options.id),
        this.loadGroups(),
      ]);
    } else {
      this.setData({ loading: false });
    }
  },

  async loadAsset(id) {
    try {
      const res = await db.collection('assets').doc(id).get();
      const asset = res.data;

      const catIndex = this.data.categories.findIndex(c => c.id === asset.categoryId);
      const cat = this.data.categories[catIndex >= 0 ? catIndex : 0];

      this.setData({
        name: asset.name || '',
        categoryId: asset.categoryId || '',
        categoryName: asset.categoryName || cat?.name || '',
        categoryColor: asset.categoryColor || cat?.color || '',
        categoryIndex: catIndex >= 0 ? catIndex : 0,
        purchaseAmount: asset.purchaseAmount?.toString() || '',
        currentValue: asset.currentValue?.toString() || '',
        purchaseDate: asset.purchaseDate || util.getToday(),
        note: asset.note || '',
        loading: false,
      });
    } catch (err) {
      console.error('Load asset error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async loadGroups() {
    try {
      const openId = app.globalData.openId;
      const groups = await dbHelper.getUserGroups(openId);
      this.setData({
        groups,
        groupNames: groups.map(g => g.name),
      });

      // Set default group if available
      if (groups.length > 0) {
        // Try to match with asset's group
        const asset = await this.getCurrentAsset();
        const assetGroupIndex = asset ? groups.findIndex(g => g._id === asset.groupId) : -1;
        const idx = assetGroupIndex >= 0 ? assetGroupIndex : 0;
        this.setData({
          groupId: groups[idx]._id,
          groupName: groups[idx].name,
          groupIndex: idx,
        });
      }
    } catch (err) {
      console.error('Load groups error:', err);
    }
  },

  async getCurrentAsset() {
    if (!this.data.id) return null;
    try {
      const res = await db.collection('assets').doc(this.data.id).get();
      return res.data;
    } catch { return null; }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value, error: '' });
  },

  onCategoryChange(e) {
    const index = e.detail.value;
    const cat = this.data.categories[index];
    this.setData({
      categoryIndex: index,
      categoryId: cat.id,
      categoryName: cat.name,
      categoryColor: cat.color,
    });
  },

  onGroupChange(e) {
    const index = e.detail.value;
    const group = this.data.groups[index];
    if (group) {
      this.setData({
        groupIndex: index,
        groupId: group._id,
        groupName: group.name,
      });
    }
  },

  onDateChange(e) {
    this.setData({ purchaseDate: e.detail.value });
  },

  async submit() {
    if (!this.data.name.trim()) {
      this.setData({ error: '请输入资产名称' });
      return;
    }
    if (!this.data.groupId) {
      this.setData({ error: '请选择群组' });
      return;
    }
    if (!this.data.purchaseAmount || isNaN(Number(this.data.purchaseAmount))) {
      this.setData({ error: '请输入有效的买入金额' });
      return;
    }
    if (!this.data.currentValue || isNaN(Number(this.data.currentValue))) {
      this.setData({ error: '请输入有效的当前价值' });
      return;
    }

    if (this.data.submitting) return;
    this.setData({ submitting: true, error: '' });

    try {
      await dbHelper.updateAsset(this.data.id, {
        name: this.data.name.trim(),
        categoryId: this.data.categoryId,
        categoryName: this.data.categoryName,
        categoryColor: this.data.categoryColor,
        groupId: this.data.groupId,
        purchaseAmount: Number(this.data.purchaseAmount),
        currentValue: Number(this.data.currentValue),
        purchaseDate: this.data.purchaseDate,
        note: this.data.note,
      });

      app.invalidateCache();
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (err) {
      console.error('Update asset error:', err);
      this.setData({ error: '保存失败，请重试', submitting: false });
    }
  },

  async deleteAsset() {
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${that.data.name}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await dbHelper.deleteAsset(that.data.id);
            app.invalidateCache();
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack({ delta: 2 });
            }, 1000);
          } catch (err) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  },
});
