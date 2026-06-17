const app = getApp();
const dbHelper = require('../../utils/db');

Page({
  data: {
    loading: true,
    groups: [],
  },

  onShow() {
    if (!app.globalData.hasLogin) {
      wx.showToast({ title: '请先登录后再管理群组', icon: 'none' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 500);
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

  goToGroupJoin() {
    wx.navigateTo({ url: '/pages/group-join/group-join' });
  },
});
