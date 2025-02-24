export default async function handler(request) {
  const url = new URL(request.url);
  
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
  targetUrl.search = url.search;

  const response = await fetch(targetUrl, {
    headers: {
      'Accept': request.headers.get('Accept') || '*/*'
    }
  });

  // Forward response trực tiếp thay vì tạo response mới
  return response;
}
