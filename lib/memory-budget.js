const os = require('node:os');
function memoryBudget(totalMb = Math.floor(os.totalmem() / 1048576)) {
  if (!Number.isFinite(totalMb) || totalMb < 1024) return 1024;
  return Math.max(1024, Math.floor((totalMb - Math.max(1024, Math.min(2048, totalMb / 4))) / 256) * 256);
}
module.exports = { memoryBudget };
