const app = getApp();
const dbHelper = require('../../utils/db');

Page({
  data: {
    groupId: '',
    searching: false,
    joining: false,
    group: null,
    members: [],
    error: '',
    joined: false,
  },

  onInput(e) {
    this.setData({ groupId: e.detail.value, error: '', group: null, joined: false });
  },

  async searchGroup() {
    const id = this.data.groupId.trim();
    if (!id) {
      this.setData({ error: '请输入群组ID' });
      return;
    }

    if (!app.globalData.hasLogin) {
      wx.showToast({ title: '请先登录', icon: 'none' });
      return;
    }

    this.setData({ searching: true, error: '', group: null, joined: false });

    try {
      const detail = await dbHelper.getGroupDetail(id);
      const openId = app.globalData.openId;
      const alreadyJoined = detail.members.some(m => m.userId === openId);

      this.setData({
        searching: false,
        group: detail.group,
        members: detail.members,
        alreadyJoined,
      });
    } catch (err) {
      console.error('Search group error:', err);
      this.setData({ error: '未找到该群组，请检查ID是否正确', searching: false });
    }
  },

  async handleJoin() {
    if (this.data.joining || this.data.alreadyJoined) return;
    this.setData({ joining: true, error: '' });

    try {
      const nickName = app.globalData.userInfo?.nickName || '用户';
      const openId = app.globalData.openId;

      const result = await dbHelper.joinGroup(
        this.data.group._id,
        openId,
        nickName
      );

      if (result) {
        this.setData({ joining: false, joined: true, alreadyJoined: true });
        app.invalidateCache();
        wx.showToast({ title: '已加入群组', icon: 'success' });
      } else {
        this.setData({ joining: false, alreadyJoined: true });
        wx.showToast({ title: '你已在群组中', icon: 'none' });
      }
    } catch (err) {
      console.error('Join group error:', err);
      this.setData({ joining: false });
      wx.showToast({ title: '加入失败', icon: 'none' });
    }
  },

  goToGroupDetail() {
    wx.redirectTo({ url: `/pages/group-detail/group-detail?id=${this.data.group._id}` });
  },
});
