const app = getApp();
const dbHelper = require('../../utils/db');

Page({
  data: {
    name: '',
    submitting: false,
    error: '',
  },

  onInput(e) {
    this.setData({ name: e.detail.value, error: '' });
  },

  async submit() {
    const name = this.data.name.trim();
    if (!name) {
      this.setData({ error: '请输入群组名称' });
      return;
    }
    if (name.length > 20) {
      this.setData({ error: '群组名称不能超过20个字符' });
      return;
    }

    if (this.data.submitting) return;
    this.setData({ submitting: true, error: '' });

    if (!app.globalData.hasLogin) {
      this.setData({ submitting: false });
      wx.showToast({ title: '请先登录后再创建群组', icon: 'none' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 500);
      return;
    }

    try {
      const openId = app.globalData.openId;
      const nickName = app.globalData.userInfo?.nickName || '用户';
      await dbHelper.createGroup(name, openId, nickName);

      wx.showToast({ title: '创建成功', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack();
      }, 1000);
    } catch (err) {
      console.error('Create group error:', err);
      this.setData({ error: '创建失败，请重试', submitting: false });
    }
  },
});
