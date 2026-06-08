const app = getApp();
const dbHelper = require('../../utils/db');

Page({
  data: {
    loading: true,
    groups: [],
  },

  onShow() {
    if (!app.globalData.hasLogin) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }
    this.loadGroups();
  },

  async loadGroups() {
    this.setData({ loading: true });
    try {
      const openId = app.globalData.openId;
      const groups = await dbHelper.getUserGroups(openId);
      this.setData({ groups, loading: false });
    } catch (err) {
      console.error('Load groups error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  goToGroupDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/group-detail/group-detail?id=${id}` });
  },

  goToGroupCreate() {
    wx.navigateTo({ url: '/pages/group-create/group-create' });
  },
});
