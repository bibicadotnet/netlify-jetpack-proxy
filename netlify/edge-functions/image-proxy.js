export default async function handler(request, context) {
  const url = new URL(request.url);
  
  // Xử lý và chuẩn hóa query parameters
  const allowedParams = ['w', 'h', 'size'];
  const filteredParams = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(url.search)) {
    if (allowedParams.includes(key)) {
      filteredParams.append(key, value);
    }
  }
  
  // Tạo cache key và cấu hình
  const cacheKey = `${url.pathname}`;
  context.cache = {
    edge: {
      maxAge: 31536000,
      varyBy: {
        query: false,
        headers: ['Accept-Encoding']
      }
    }
  };

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
    return new Response(`Path not supported: ${url.pathname}`, { status: 404 });
  }

  const targetUrl = new URL(request.url);
  const [prefix, config] = rule;
  targetUrl.hostname = config.targetHost;
  targetUrl.pathname = config.pathTransform(url.pathname, prefix);
  targetUrl.search = filteredParams.toString();

  const response = await fetch(targetUrl, {
    headers: {
      'Accept': request.headers.get('Accept') || '*/*'
    }
  });

  return new Response(response.body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Link': response.headers.get('link'),
      'X-Cache': response.headers.get('x-nc'),
      'X-Served-By': `Netlify Edge & ${config.service}`,
      'Vary': 'Accept-Encoding'
    }
  });
}
