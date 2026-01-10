import React from 'react';
import PropTypes from 'prop-types';
import { formatDate } from '../lib/utils/formatting';

const resolveDate = (value) => {
  if (!value) {
    return 'Not available';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Not available';
  }
  return formatDate(date);
};

export default function AIMetadataLine({
  whyMatters,
  dataSource,
  lastEvaluated,
  className = '',
}) {
  const resolvedWhy = whyMatters || 'Supports review and prioritization.';
  const resolvedSource = dataSource || 'Accounting data';
  const resolvedDate = resolveDate(lastEvaluated);

  return (
    <div className={`text-xs text-gray-500 ${className}`}>
      Why this matters: {resolvedWhy} | Data source: {resolvedSource} | Last evaluated: {resolvedDate}
    </div>
  );
}

AIMetadataLine.propTypes = {
  whyMatters: PropTypes.string,
  dataSource: PropTypes.string,
  lastEvaluated: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
  className: PropTypes.string,
};
