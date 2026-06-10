const app = getApp();
const db = wx.cloud.database();
const _ = db.command;
const util = require('../../utils/util');

Page({
  data: {
    loading: true,
    seeding: false,
    hasGroups: false,
    hasAssets: false,
    // Stats
    totalValue: '¥0',
    totalReturn: '¥0',
    returnRate: '0%',
    returnPositive: true,
    // Category data for pie chart
    categoryData: [],
    // Grouped assets
    groupedAssets: [],
    // User info
    nickName: '',
    avatarUrl: '',
    // Groups count
    groupCount: 0,
  },

  async onShow() {
    if (!app.globalData.hasLogin) {
      wx.reLaunch({ url: '/pages/login/login' });
      return;
    }

    this.setData({
      nickName: app.globalData.userInfo?.nickName || '用户',
      avatarUrl: app.globalData.userInfo?.avatarUrl || '',
    });

    await this.loadDashboard();
  },

  async loadDashboard() {
    this.setData({ loading: true });

    try {
      const openId = app.globalData.openId;
      const { result } = await wx.cloud.callFunction({
        name: 'getDashboardData',
        data: { openId },
      });

      if (!result || result.code !== 0 || !result.data) {
        throw new Error('获取数据失败');
      }

      const dashData = result.data;

      if (dashData.groups.length === 0) {
        this.setData({
          loading: false,
          hasGroups: false,
          hasAssets: false,
          groupedAssets: [],
          categoryData: [],
        });
        return;
      }

      const fmt = util.formatCurrency;
      const returnPositive = dashData.totalReturn >= 0;

      this.setData({
        loading: false,
        hasGroups: true,
        hasAssets: dashData.assets.length > 0,
        totalValue: fmt(dashData.totalValue),
        totalReturn: (returnPositive ? '+' : '') + fmt(Math.abs(dashData.totalReturn)),
        returnRate: (returnPositive ? '+' : '') + dashData.returnRate.toFixed(1) + '%',
        returnPositive,
        categoryData: dashData.categoryData,
        groupedAssets: dashData.groupedAssets,
        groupCount: dashData.groups.length,
      });

      // Draw pie chart after data is ready
      if (dashData.categoryData.length > 0) {
        setTimeout(() => this.drawPieChart(), 200);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  drawPieChart() {
    const query = wx.createSelectorQuery();
    query.select('#pieChart')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) return;
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        // Scale for device pixel ratio
        const dpr = wx.getSystemInfoSync().pixelRatio;
        const width = res[0].width;
        const height = res[0].height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);

        const data = this.data.categoryData;
        if (!data || data.length === 0) return;

        const total = data.reduce((s, d) => s + d.total, 0);
        if (total === 0) return;

        const cx = width / 2;
        const cy = height / 2 - 10;
        const radius = Math.min(cx, cy) - 20;
        const innerRadius = radius * 0.5; // Donut

        // Draw pie slices
        let startAngle = -Math.PI / 2;
        const colors = ['#3b9e6e', '#d4a854', '#e74c4c', '#5b7fff', '#9b6bcc'];

        data.forEach((item, i) => {
          const sliceAngle = (item.total / total) * Math.PI * 2;
          const endAngle = startAngle + sliceAngle;
          const color = item.color || colors[i % colors.length];

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();

          // Draw inner circle (donut hole)
          startAngle = endAngle;
        });

        // Draw inner white circle for donut
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.0)';
        ctx.fill();

        // Draw labels
        startAngle = -Math.PI / 2;
        data.forEach((item, i) => {
          const sliceAngle = (item.total / total) * Math.PI * 2;
          const midAngle = startAngle + sliceAngle / 2;
          const pct = ((item.total / total) * 100).toFixed(1);

          const labelRadius = radius + 24;
          const lx = cx + Math.cos(midAngle) * labelRadius;
          const ly = cy + Math.sin(midAngle) * labelRadius;

          // Only show label if slice is big enough
          if (parseFloat(pct) > 5) {
            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#7a8f84';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pct + '%', lx, ly);
          }

          startAngle = endAngle;
        });

        // Draw center text
        ctx.font = 'bold 16px sans-serif';
        ctx.fillStyle = '#1a241f';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('资产分布', cx, cy + 4);

        // Draw outer ring line
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
  },

  // Seed test data
  async seedTestData() {
    this.setData({ seeding: true });
    try {
      await wx.cloud.callFunction({
        name: 'seedTestData',
        data: { openId: app.globalData.openId },
      });
      wx.showToast({ title: '示例数据已生成', icon: 'success' });
      await this.loadDashboard();
    } catch (err) {
      console.error('Seed error:', err);
      wx.showToast({ title: '生成失败', icon: 'none' });
      this.setData({ seeding: false });
    }
  },

  // Navigations
  goToAssetAdd() {
    wx.navigateTo({ url: '/pages/asset-add/asset-add' });
  },

  goToAssets() {
    wx.switchTab({ url: '/pages/assets/assets' });
  },

  goToAssetEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/asset-edit/asset-edit?id=${id}` });
  },

  goToGroups() {
    wx.navigateTo({ url: '/pages/groups/groups' });
  },

  goToGroupDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/group-detail/group-detail?id=${id}` });
  },
});
