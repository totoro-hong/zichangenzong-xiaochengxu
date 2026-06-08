const app = getApp();
const db = wx.cloud.database();
const util = require('../../utils/util');
const dbHelper = require('../../utils/db');

Page({
  data: {
    loading: true,
    group: null,
    members: [],
    totalAssets: 0,
    totalCost: 0,
    assetCount: 0,
    formattedTotal: '¥0',
    openId: '',
    isOwner: false,
  },

  async onLoad(options) {
    if (!app.globalData.hasLogin) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    this.setData({ openId: app.globalData.openId });

    if (options.id) {
      await this.loadGroupDetail(options.id);
    } else {
      this.setData({ loading: false });
    }
  },

  async loadGroupDetail(groupId) {
    this.setData({ loading: true });
    try {
      const detail = await dbHelper.getGroupDetail(groupId);
      const openId = app.globalData.openId;

      this.setData({
        loading: false,
        group: detail.group,
        members: detail.members,
        totalAssets: detail.totalAssets,
        totalCost: detail.totalCost,
        assetCount: detail.assetCount,
        formattedTotal: util.formatCurrency(detail.totalAssets),
        isOwner: detail.members.some(m => m.userId === openId && m.role === 'owner'),
      });
    } catch (err) {
      console.error('Load group detail error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  // Copy invite info
  copyInviteInfo() {
    const group = this.data.group;
    if (!group) return;

    wx.setClipboardData({
      data: `群组：${group.name}\n群组ID：${group._id}\n\n请告知群主你的用户ID以加入群组`,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
    });
  },
});
