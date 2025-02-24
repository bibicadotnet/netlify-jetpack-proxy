// netlify/functions/image-proxy.js
exports.handler = async (event, context) => {
  // Normalize URL và loại bỏ query parameters không cần thiết
  const url = new URL(event.rawUrl);
  const normalizedPath = url.pathname.toLowerCase();
  
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

  const rule = Object.entries(rules).find(([prefix]) => normalizedPath.startsWith(prefix));

  if (!rule) {
    return {
      statusCode: 404,
      body: `Path not supported: ${normalizedPath}`
    };
  }

  try {
    const [prefix, config] = rule;
    const targetUrl = new URL(event.rawUrl);
    targetUrl.hostname = config.targetHost;
    targetUrl.pathname = config.pathTransform(normalizedPath, prefix);
    
    // Chỉ giữ lại các query parameters cần thiết
    const allowedParams = ['size', 'width', 'height'];
    const newSearchParams = new URLSearchParams();
    for (const [key, value] of new URLSearchParams(url.search)) {
      if (allowedParams.includes(key)) {
        newSearchParams.append(key, value);
      }
    }
    targetUrl.search = newSearchParams.toString();

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': event.headers.accept || '*/*'
      }
    });

    const buffer = await response.arrayBuffer();
    const etag = Buffer.from(buffer).toString('base64').substring(0, 16);

    return {
      statusCode: response.status,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000',
        'CDN-Cache-Control': 'public, max-age=31536000',
        'ETag': `"${etag}"`,
        'Link': response.headers.get('link'),
        'X-Cache': response.headers.get('x-nc'),
        'X-Served-By': `Netlify Functions & ${config.service}`,
        'Vary': 'Accept-Encoding',
        'X-Cache-Key': `${normalizedPath}${targetUrl.search}`
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
