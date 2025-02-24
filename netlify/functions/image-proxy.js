exports.handler = async (event, context) => {
  // Chuẩn hóa URL và tạo cache key
  const url = new URL(event.rawUrl);
  const normalizedPath = url.pathname.toLowerCase();
  
  // Chỉ giữ lại các query parameters cần thiết
  const allowedParams = ['size', 'width', 'height'];
  const paramString = new URLSearchParams(
    Array.from(new URLSearchParams(url.search))
      .filter(([key]) => allowedParams.includes(key))
      .sort((a, b) => a[0].localeCompare(b[0]))
  ).toString();
  
  // Tạo cache key nhất quán
  const cacheKey = `${normalizedPath}${paramString ? `?${paramString}` : ''}`;

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
    const targetUrl = new URL(url);
    targetUrl.hostname = config.targetHost;
    targetUrl.pathname = config.pathTransform(normalizedPath, prefix);
    targetUrl.search = paramString;

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
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000',
        'Surrogate-Control': 'public, max-age=31536000',
        'ETag': `"${etag}"`,
        'Link': response.headers.get('link'),
        'X-Cache': response.headers.get('x-nc'),
        'X-Served-By': `Netlify Functions & ${config.service}`,
        'X-Cache-Key': cacheKey,
        'Vary': 'Accept-Encoding'
      },
      body: Buffer.from(buffer).toString('base64'),
      isBase64Encoded: true,
      ttl: 31536000
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal Server Error' })
    };
  }
};
