/**
 * Format a number as CNY currency string
 */
function formatCurrency(amount) {
  if (amount === undefined || amount === null) return '¥0';
  const num = Number(amount);
  if (isNaN(num)) return '¥0';
  const abs = Math.abs(num);
  const prefix = num < 0 ? '-¥' : '¥';

  if (abs >= 100000000) {
    return prefix + (abs / 100000000).toFixed(2) + '亿';
  }
  if (abs >= 10000) {
    return prefix + (abs / 10000).toFixed(2) + '万';
  }
  return prefix + abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Format date string to YYYY-MM-DD
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format datetime to readable string
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${min}`;
}

/**
 * Calculate return rate
 */
function calcReturnRate(purchaseAmount, currentValue) {
  if (!purchaseAmount || Number(purchaseAmount) === 0) return 0;
  return ((Number(currentValue) - Number(purchaseAmount)) / Number(purchaseAmount)) * 100;
}

/**
 * Get today's date as YYYY-MM-DD
 */
function getToday() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Category definitions matching web version
 */
const CATEGORIES = [
  { id: 'cash', name: '现金存款', color: '#3b9e6e', icon: 'wallet' },
  { id: 'fund', name: '基金理财', color: '#d4a854', icon: 'trending-up' },
  { id: 'stock', name: '股票', color: '#e74c4c', icon: 'bar-chart' },
  { id: 'property', name: '房产', color: '#5b7fff', icon: 'home' },
  { id: 'other', name: '其他投资', color: '#9b6bcc', icon: 'more-horizontal' },
];

const CATEGORY_MAP = {};
CATEGORIES.forEach(c => { CATEGORY_MAP[c.id] = c; });

function getCategory(id) {
  return CATEGORY_MAP[id] || { id: 'other', name: '未分类', color: '#999' };
}

const ROLE_MAP = {
  owner: '所有者',
  admin: '管理员',
  member: '成员',
};

function getRoleLabel(role) {
  return ROLE_MAP[role] || role;
}

module.exports = {
  formatCurrency,
  formatDate,
  formatDateTime,
  calcReturnRate,
  getToday,
  CATEGORIES,
  CATEGORY_MAP,
  getCategory,
  ROLE_MAP,
  getRoleLabel,
};
