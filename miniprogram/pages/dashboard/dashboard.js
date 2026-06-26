const app = getApp();
const util = require('../../utils/util');
const dbHelper = require('../../utils/db');

Page({
  data: {
    loading: false,
    isGuest: false,
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
    // Pie chart interaction
    selectedCategory: null,
    // Grouped assets
    groupedAssets: [],
    // User info
    nickName: '',
    avatarUrl: '',
    // Groups count
    groupCount: 0,
    // Group filter
    groupList: [],
    selectedGroupId: '',
    selectedGroupName: '全部群组',
  },

  onShow() {
    if (!app.globalData.hasLogin) {
      app.setGuestMode();
      this.setData({ isGuest: true, loading: false });
      return;
    }

    this.setData({
      isGuest: false,
      nickName: app.globalData.userInfo?.nickName || '用户',
      avatarUrl: app.globalData.userInfo?.avatarUrl || '',
    });

    // 有缓存 → 秒开
    const cached = app.getCache();
    if (cached) {
      console.log('[DASHBOARD] 使用缓存渲染');
      this.renderDashboard(cached);
    } else {
      console.log('[DASHBOARD] 无缓存，显示加载');
      this.setData({ loading: true });
    }

    this.loadDashboard().catch(e => console.error(e));
  },

  goToLogin() {
    wx.reLaunch({ url: '/pages/login/login' });
  },

  async loadDashboard(groupId) {
    if (groupId !== undefined) {
      this.setData({ selectedGroupId: groupId, loading: true });
    }

    try {
      const openId = app.globalData.openId;
      const currentGroupId = groupId !== undefined ? groupId : this.data.selectedGroupId;
      let dashData;

      try {
        const { result } = await wx.cloud.callFunction({
          name: 'getDashboardData',
          data: { openId, groupId: currentGroupId || '' },
        });
        if (result && result.code === 0 && result.data) {
          dashData = result.data;
        } else {
          throw new Error('云函数返回异常');
        }
      } catch (cfErr) {
        console.warn('云函数调用失败，使用客户端查询:', cfErr);
        dashData = await dbHelper.getDashboardData(openId, currentGroupId);
      }

      if (dashData.groups.length === 0) {
        this.setData({
          loading: false,
          hasGroups: false,
          hasAssets: false,
          groupedAssets: [],
          categoryData: [],
          groupList: [],
          selectedGroupId: currentGroupId || '',
        });
        return;
      }

      // 缓存全量数据（无筛选时才缓存）
      if (!currentGroupId) {
        app.setCache(dashData);
      }

      this.renderDashboard(dashData);
    } catch (err) {
      console.error('Dashboard load error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  renderDashboard(dashData) {
    console.log('[DASHBOARD] 渲染数据, groupCount:', dashData.groups?.length, 'assets:', dashData.assets?.length);
    const groupList = (dashData.groupSummaries || []).map(g => ({
      _id: g._id, name: g.name, totalValue: g.totalValue, assetCount: g.assetCount,
    }));
    const fmt = util.formatCurrency;
    const returnPositive = dashData.totalReturn >= 0;

    this.setData({
      loading: false,
      hasGroups: true,
      hasAssets: dashData.assets.length > 0,
      totalValue: fmt(dashData.totalValue),
      totalReturn: fmt(dashData.totalReturn),
      returnRate: (returnPositive ? '+' : '') + dashData.returnRate.toFixed(1) + '%',
      returnPositive,
      categoryData: dashData.categoryData,
      groupedAssets: dashData.groupedAssets,
      groupCount: dashData.groups.length,
      groupList,
      selectedGroupName: dashData.selectedGroup?.name || '全部群组',
      selectedCategory: null,
    });

    if (dashData.categoryData.length > 0) {
      setTimeout(() => this.drawPieChart(), 200);
    }
  },

  selectGroup(e) {
    const id = e.currentTarget.dataset.id || '';
    this.loadDashboard(id);
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
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

        data.forEach((item, i) => {
          const sliceAngle = (item.total / total) * Math.PI * 2;
          const endAngle = startAngle + sliceAngle;
          const color = item.color;

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, startAngle, endAngle);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.fill();

          startAngle = endAngle;
        });

        // Clear center for donut hole
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.restore();

        // Draw labels
        startAngle = -Math.PI / 2;
        data.forEach((item, i) => {
          const sliceAngle = (item.total / total) * Math.PI * 2;
          const endAngle = startAngle + sliceAngle;
          const midAngle = startAngle + sliceAngle / 2;
          const pct = ((item.total / total) * 100).toFixed(1);

          const labelRadius = radius + 24;
          const lx = cx + Math.cos(midAngle) * labelRadius;
          const ly = cy + Math.sin(midAngle) * labelRadius;

          if (parseFloat(pct) > 5) {
            ctx.font = '11px sans-serif';
            ctx.fillStyle = '#7a8f84';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(pct + '%', lx, ly);
          }

          startAngle = endAngle;
        });

        // Draw outer ring line
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.04)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
  },

  onLegendTap(e) {
    const index = e.currentTarget.dataset.index;
    const data = this.data.categoryData;
    if (!data || index < 0 || index >= data.length) return;

    const item = data[index];
    const total = data.reduce((s, d) => s + d.total, 0);
    if (total === 0) return;

    // Toggle: if already selected, deselect
    if (this.data.selectedCategory && this.data.selectedCategory.name === item.name) {
      this.setData({ selectedCategory: null }, () => this.drawPieChart());
    } else {
      const pct = ((item.total / total) * 100).toFixed(1);
      this.setData({
        selectedCategory: {
          name: item.name,
          color: item.color,
          amount: util.formatCurrency(item.total),
          pct: pct + '%',
        },
      }, () => this.drawPieChart());
    }
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
    if (app.globalData.isGuest) {
      wx.showToast({ title: '请先登录后再添加资产', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/asset-add/asset-add' });
  },

  goToAssets() {
    wx.switchTab({ url: '/pages/assets/assets' });
  },

  goToAssetEdit(e) {
    if (app.globalData.isGuest) {
      wx.showToast({ title: '请先登录后再编辑资产', icon: 'none' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/asset-edit/asset-edit?id=${id}` });
  },

  goToGroups() {
    if (app.globalData.isGuest) {
      wx.showToast({ title: '请先登录后再管理群组', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/groups/groups' });
  },

  goToGroupDetail(e) {
    if (app.globalData.isGuest) {
      wx.showToast({ title: '请先登录后再查看群组', icon: 'none' });
      return;
    }
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/group-detail/group-detail?id=${id}` });
  },
});
