import React from 'react';

const RateLimitBanner = ({ message }) => (
  <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4" role="alert">
    <p className="font-bold">Rate Limit Exceeded</p>
    <p>{message || 'You have made too many requests. Please wait and try again.'}</p>
  </div>
);

export default RateLimitBanner;
