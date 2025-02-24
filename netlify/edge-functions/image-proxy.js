export default async function handler(request, context) {
  const url = new URL(request.url);
  
  // Normalize URL và tạo cache key
  const normalizedPath = url.pathname.toLowerCase();
  const allowedParams = ['size', 'width', 'height'];
  const filteredParams = new URLSearchParams();
  
  for (const [key, value] of new URLSearchParams(url.search)) {
    if (allowedParams.includes(key)) {
      filteredParams.append(key, value);
    }
  }
  
  const cacheKey = `${normalizedPath}${filteredParams.toString() ? `?${filteredParams.toString()}` : ''}`;

  // Rules configuration
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
    return new Response(`Path not supported: ${normalizedPath}`, { status: 404 });
  }

  try {
    const [prefix, config] = rule;
    const targetUrl = new URL(request.url);
    targetUrl.hostname = config.targetHost;
    targetUrl.pathname = config.pathTransform(normalizedPath, prefix);
    targetUrl.search = filteredParams.toString();

    // Set cache key for context
    context.cache = {
      key: cacheKey,
      edge: {
        maxAge: 31536000,
        staleWhileRevalidate: 31536000,
        forcePrivate: false
      }
    };

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': request.headers.get('accept') || '*/*'
      }
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, immutable',
        'Surrogate-Key': cacheKey,
        'Link': response.headers.get('link'),
        'X-Cache': response.headers.get('x-nc'),
        'X-Served-By': `Netlify Edge & ${config.service}`,
        'X-Cache-Key': cacheKey
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
