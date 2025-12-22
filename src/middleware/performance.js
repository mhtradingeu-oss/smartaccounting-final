const compression = require('compression');
const helmet = require('helmet');
const responseTime = require('response-time');
const cluster = require('cluster');
const os = require('os');
const logger = require('../lib/logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      totalResponseTime: 0,
      slowRequests: 0,
    };
  }

  recordRequest(durationMs, isError = false) {
    this.metrics.requests += 1;
    this.metrics.totalResponseTime += durationMs;
    if (isError) {
      this.metrics.errors += 1;
    }
    if (durationMs > 1000) {
      this.metrics.slowRequests += 1;
    }
  }

  getAverageResponseTime() {
    if (!this.metrics.requests) {return 0;}
    return Number((this.metrics.totalResponseTime / this.metrics.requests).toFixed(2));
  }

  getErrorRate() {
    if (!this.metrics.requests) {return 0;}
    return Number(((this.metrics.errors / this.metrics.requests) * 100).toFixed(2));
  }

  getSlowRequestRate() {
    if (!this.metrics.requests) {return 0;}
    return Number(((this.metrics.slowRequests / this.metrics.requests) * 100).toFixed(2));
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTime: this.getAverageResponseTime(),
      errorRate: this.getErrorRate(),
      slowRequestRate: this.getSlowRequestRate(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      load: os.loadavg(),
    };
  }
}

const performanceMonitor = new PerformanceMonitor();


function createPerformanceMiddleware() {
  return [
    compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {return false;}
        return compression.filter(req, res);
      },
    }),
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          scriptSrc: ['\'self\'', '\'unsafe-inline\''],
          styleSrc: ['\'self\'', '\'unsafe-inline\'', 'https:'],
          fontSrc: ['\'self\'', 'https:'],
          imgSrc: ['\'self\'', 'data:', 'https:'],
          connectSrc: ['\'self\'', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
    responseTime((req, res, time) => {
      const durationMs = Number(time.toFixed(2));
      const isError = res.statusCode >= 400;
      performanceMonitor.recordRequest(durationMs, isError);
      res.set('X-Response-Time', `${durationMs}ms`);
      if (durationMs > 1000) {
        logger.warn('Slow request detected', {
          method: req.method,
          path: req.path,
          durationMs,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });
      }
    }),
    (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
      }
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg)$/)) {
        res.set('Cache-Control', 'public, max-age=86400');
      }
      next();
    },
  ];
}

const setupCluster = () => {
  if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
    const numWorkers = Math.min(os.cpus().length, 4);
    logger.info(`Primary process is forking ${numWorkers} workers`);

    for (let i = 0; i < numWorkers; i += 1) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.error('Worker exited unexpectedly', {
        worker: worker.process.pid,
        code,
        signal,
      });
      cluster.fork();
    });

    return false;
  }

  return true;
};

module.exports = {
  createPerformanceMiddleware,
  performanceMonitor,
  setupCluster,
};
