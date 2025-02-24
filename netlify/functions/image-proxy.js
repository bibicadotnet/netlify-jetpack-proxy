exports.handler = async (event, context) => {
  const url = new URL(event.rawUrl);
  
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

  try {
    const [prefix, config] = rule;
    const targetUrl = new URL(event.rawUrl);
    targetUrl.hostname = config.targetHost;
    targetUrl.pathname = config.pathTransform(url.pathname, prefix);
    targetUrl.search = url.search;

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': event.headers.accept || '*/*'
      }
    });

    const buffer = await response.arrayBuffer();

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000',
        'Link': response.headers.get('link'),
        'X-Cache': response.headers.get('x-nc'),
        'X-Served-By': `Netlify Functions & ${config.service}`
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
