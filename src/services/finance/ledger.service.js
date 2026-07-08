const previewFromApproval = (item) => ({
  type: item.toolId,
  amount: item.payload?.amount || 0,
  vat: item.payload?.vat || 0,
  vendor: item.payload?.vendor || null,
  note: 'SIMULATION',
});

const postFromApproval = async (item) => ({
  id: 'LE-' + Date.now(),
  status: 'posted',
  sourceApprovalId: item.approvalId,
});

module.exports = {
  previewFromApproval,
  postFromApproval,
};
