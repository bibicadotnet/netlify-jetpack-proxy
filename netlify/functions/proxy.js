// netlify/functions/proxy.js
exports.handler = async (event, context) => {
  const request = event;
  const url = new URL(request.rawUrl);

  const rules = {
    '/avatar': {
      targetHost: 'secure.gravatar.com',
      pathTransform: (path, prefix) => '/avatar' + path.replace(prefix, ''),
      service: 'Gravatar'
    },
    '/comment': {
      targetHost: 'i0.wp.com',
      pathTransform: (path, prefix) => '/comment.bibica.net/static/images' + path.replace(prefix, ''),
      service: 'Artalk & Jetpack'
    },
    '/': {
      targetHost: 'i0.wp.com',
      pathTransform: (path) => '/bibica.net/wp-content/uploads' + path,
      service: 'Jetpack'
    }
  };

  const rule = Object.entries(rules).find(([prefix]) => url.pathname.startsWith(prefix));

  if (!rule) {
    return {
      statusCode: 404,
      body: `Path not supported: ${url.pathname}`
    };
  }

  const targetUrl = new URL(request.rawUrl);
  const [prefix, config] = rule;
  targetUrl.hostname = config.targetHost;
  targetUrl.pathname = config.pathTransform(url.pathname, prefix);
  targetUrl.search = url.search;

  try {
    const response = await fetch(targetUrl.toString(), {
      headers: { 'Accept': request.headers['accept'] || '*/*' }
    });

    const body = await response.arrayBuffer();

    return {
      statusCode: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'image/webp',
        'link': response.headers.get('link'),
        'X-Cache': response.headers.get('x-nc'),
        'X-Served-By': `Netlify & ${config.service}`
      },
      body: Buffer.from(body).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Internal Server Error: ${error.message}`
    };
  }
};
