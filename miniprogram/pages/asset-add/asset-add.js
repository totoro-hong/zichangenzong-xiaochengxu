const app = getApp();
const db = wx.cloud.database();
const util = require('../../utils/util');
const dbHelper = require('../../utils/db');

Page({
  data: {
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
    purchaseDate: util.getToday(),
    note: '',
    submitting: false,
    error: '',

    categories: util.CATEGORIES,
    groups: [],
    categoryNames: [],
    groupNames: [],
  },

  async onLoad() {
    if (!app.globalData.hasLogin) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    await this.loadGroups();
  },

  async loadGroups() {
    try {
      const openId = app.globalData.openId;
      const groups = await dbHelper.getUserGroups(openId);
      this.setData({
        groups,
        groupNames: groups.map(g => g.name),
      });
      if (groups.length > 0) {
        this.setData({
          groupId: groups[0]._id,
          groupName: groups[0].name,
          groupIndex: 0,
        });
      }
    } catch (err) {
      console.error('Load groups error:', err);
    }
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
    // Validation
    if (!this.data.name.trim()) {
      this.setData({ error: '请输入资产名称' });
      return;
    }
    if (this.data.categoryIndex < 0) {
      this.setData({ error: '请选择分类' });
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
    if (!this.data.purchaseDate) {
      this.setData({ error: '请选择购入日期' });
      return;
    }

    if (this.data.submitting) return;
    this.setData({ submitting: true, error: '' });

    try {
      await dbHelper.createAsset({
        groupId: this.data.groupId,
        createdBy: app.globalData.openId,
        categoryId: this.data.categoryId,
        categoryName: this.data.categoryName,
        categoryColor: this.data.categoryColor,
        name: this.data.name.trim(),
        purchaseAmount: Number(this.data.purchaseAmount),
        currentValue: Number(this.data.currentValue),
        purchaseDate: this.data.purchaseDate,
        note: this.data.note,
      });

      wx.showToast({ title: '添加成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (err) {
      console.error('Add asset error:', err);
      this.setData({ error: '保存失败，请重试', submitting: false });
    }
  },
});
