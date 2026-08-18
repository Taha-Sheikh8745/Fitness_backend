/**
 * Helper to calculate the 'previous' equivalent date range for comparisons.
 * e.g. If user selects Today, the previous period is Yesterday.
 * If user selects last 7 days, previous period is 7-14 days ago.
 */
const getPreviousPeriod = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date();
  const end = endDate ? new Date(endDate) : new Date();
  
  if (!startDate && !endDate) {
     // Default to Today vs Yesterday if dates missing but functionally called
     start.setHours(0,0,0,0);
     end.setHours(23,59,59,999);
  }

  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // How many days are in the current selected period

  const prevStart = new Date(start);
  prevStart.setDate(prevStart.getDate() - diffDays);

  const prevEnd = new Date(end);
  prevEnd.setDate(prevEnd.getDate() - diffDays);

  return { prevStart, prevEnd, diffDays };
};

const calculateTrend = (currentValue, previousValue) => {
    if (previousValue === 0) {
        if (currentValue === 0) return { percentageChange: 0, absoluteDifference: 0, direction: 'neutral' };
        return { percentageChange: 100, absoluteDifference: currentValue, direction: 'up' };
    }
    
    const absoluteDifference = currentValue - previousValue;
    const percentageChange = Number(((absoluteDifference / previousValue) * 100).toFixed(1));
    
    let direction = 'neutral';
    if (percentageChange > 0) direction = 'up';
    if (percentageChange < 0) direction = 'down';

    return { percentageChange, absoluteDifference, direction };
};

module.exports = {
  getPreviousPeriod,
  calculateTrend
};
