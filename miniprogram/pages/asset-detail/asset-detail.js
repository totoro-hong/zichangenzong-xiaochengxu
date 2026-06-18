const app = getApp();
const db = wx.cloud.database();
const util = require('../../utils/util');
const dbHelper = require('../../utils/db');

Page({
  data: {
    asset: null,
    loading: true,
    deleting: false,
    // Computed display values
    returnRate: '0%',
    returnPositive: true,
    formattedPurchaseAmount: '¥0',
    formattedCurrentValue: '¥0',
    formattedCreatedAt: '',
    formattedUpdatedAt: '',
    // Holding & annualized return
    holdingDisplay: '',
    annualizedReturn: '--',
    annualizedPositive: true,
  },

  onLoad(options) {
    if (!app.globalData.hasLogin) {
      wx.showToast({ title: '请先登录后再查看资产', icon: 'none' });
      setTimeout(() => {
        wx.navigateTo({ url: '/pages/login/login' });
      }, 500);
      return;
    }
    if (options.id) {
      this.loadAsset(options.id);
    } else {
      this.setData({ loading: false });
    }
  },

  async loadAsset(id) {
    this.setData({ loading: true });
    try {
      const res = await db.collection('assets').doc(id).get();
      const asset = res.data;

      const purchaseAmount = Number(asset.purchaseAmount || 0);
      const currentValue = Number(asset.currentValue || 0);
      const returnRate = util.calcReturnRate(purchaseAmount, currentValue);

      // Holding period & annualized return
      const holdingDays = util.calcHoldingDays(asset.purchaseDate);
      const annualizedReturn = util.calcAnnualizedReturn(purchaseAmount, currentValue, holdingDays);

      this.setData({
        asset,
        loading: false,
        returnRate: (returnRate >= 0 ? '+' : '') + returnRate.toFixed(1) + '%',
        returnPositive: returnRate >= 0,
        formattedPurchaseAmount: util.formatCurrency(purchaseAmount),
        formattedCurrentValue: util.formatCurrency(currentValue),
        formattedCreatedAt: util.formatDateTime(asset.createdAt),
        formattedUpdatedAt: util.formatDateTime(asset.updatedAt),
        holdingDisplay: util.formatHoldingDays(holdingDays),
        annualizedReturn: annualizedReturn !== 0 ? (annualizedReturn >= 0 ? '+' : '') + annualizedReturn.toFixed(2) + '%' : '--',
        annualizedPositive: annualizedReturn >= 0,
      });
    } catch (err) {
      console.error('Load asset error:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  goEdit() {
    wx.navigateTo({
      url: `/pages/asset-edit/asset-edit?id=${this.data.asset._id}`,
    });
  },

  deleteAsset() {
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${that.data.asset.name}」吗？`,
      success: async (res) => {
        if (res.confirm) {
          that.setData({ deleting: true });
          try {
            await dbHelper.deleteAsset(that.data.asset._id);
            wx.showToast({ title: '删除成功', icon: 'success' });
            setTimeout(() => {
              wx.navigateBack();
            }, 1000);
          } catch (err) {
            console.error('Delete error:', err);
            wx.showToast({ title: '删除失败', icon: 'none' });
            that.setData({ deleting: false });
          }
        }
      },
    });
  },
});
