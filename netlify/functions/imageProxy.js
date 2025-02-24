// netlify/edge-functions/imageProxy.js

export default async function handler(request, context) {
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname);
  
  let targetUrl = new URL('https://i0.wp.com');
  let service = 'Jetpack';
  
  if (path.startsWith('/avatar')) {
    targetUrl.hostname = 'secure.gravatar.com';
    targetUrl.pathname = '/avatar' + path.replace('/avatar', '');
    service = 'Gravatar';
  } else if (path.startsWith('/comment')) {
    targetUrl.hostname = 'i0.wp.com';
    targetUrl.pathname = '/comment.bibica.net/static/images' + path.replace('/comment', '');
    service = 'Artalk & Jetpack';
  } else {
    targetUrl.pathname = '/bibica.net/wp-content/uploads' + path;
  }
  
  targetUrl.search = url.search;

  const response = await fetch(targetUrl.toString());
  const body = await response.arrayBuffer();

  return new Response(body, {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000',
      'X-Served-By': `Netlify Functions & ${service}`
    }
  });
}
