const app = getApp();
const db = wx.cloud.database();
const util = require('../../utils/util');
const dbHelper = require('../../utils/db');

Page({
  data: {
    loading: true,
    joining: false,
    group: null,
    members: [],
    totalAssets: 0,
    totalCost: 0,
    assetCount: 0,
    formattedTotal: '¥0',
    openId: '',
    isOwner: false,
    isMember: false,
    joinSuccess: false,
  },

  async onLoad(options) {
    if (!app.globalData.hasLogin) {
      wx.showToast({ title: '请先登录后再查看群组', icon: 'none' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 500);
      return;
    }

    this.setData({ openId: app.globalData.openId });

    if (options.id) {
      await this.loadGroupDetail(options.id);
    } else {
      this.setData({ loading: false });
    }
  },

  onShareAppMessage() {
    const group = this.data.group;
    if (!group) return { title: '资产跟踪', path: '/pages/dashboard/dashboard' };
    return {
      title: `邀请你加入群组「${group.name}」`,
      path: `/pages/group-detail/group-detail?id=${group._id}`,
    };
  },

  async loadGroupDetail(groupId) {
    this.setData({ loading: true });
    try {
      const detail = await dbHelper.getGroupDetail(groupId);
      const openId = app.globalData.openId;

      const isMember = detail.members.some(m => m.userId === openId);
      const isOwner = detail.members.some(m => m.userId === openId && m.role === 'owner');

      this.setData({
        loading: false,
        group: detail.group,
        members: detail.members,
        totalAssets: detail.totalAssets,
        totalCost: detail.totalCost,
        assetCount: detail.assetCount,
        formattedTotal: util.formatCurrency(detail.totalAssets),
        isOwner,
        isMember,
        joinSuccess: false,
      });
    } catch (err) {
      console.error('Load group detail error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  async handleJoinGroup() {
    if (this.data.joining) return;
    this.setData({ joining: true });

    try {
      const nickName = app.globalData.userInfo?.nickName || '用户';
      const result = await dbHelper.joinGroup(
        this.data.group._id,
        this.data.openId,
        nickName
      );

      if (result) {
        this.setData({ joinSuccess: true, isMember: true, joining: false });
        wx.showToast({ title: '已加入群组', icon: 'success' });
        await this.loadGroupDetail(this.data.group._id);
      } else {
        this.setData({ joining: false });
        wx.showToast({ title: '你已在群组中', icon: 'none' });
      }
    } catch (err) {
      console.error('Join group error:', err);
      this.setData({ joining: false });
      wx.showToast({ title: '加入失败', icon: 'none' });
    }
  },

  copyInviteInfo() {
    const group = this.data.group;
    if (!group) return;

    wx.setClipboardData({
      data: `群组：${group.name}\n群组ID：${group._id}\n\n在「资产跟踪」小程序中，进入「我的群组」→「加入群组」，输入群组ID即可加入`,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
    });
  },
});
