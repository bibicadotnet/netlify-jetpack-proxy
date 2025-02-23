// netlify/functions/imageProxy.js

exports.handler = async (event, context) => {
  try {
    const url = new URL(event.rawUrl);
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

    const response = await fetch(targetUrl.toString(), {
      cf: {
        cacheTtl: 31536000,
        cacheEverything: true
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream responded with ${response.status}`);
    }

    const body = await response.arrayBuffer();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'CDN-Cache-Control': 'public, max-age=31536000, immutable',
        'X-Served-By': `Netlify Functions & ${service}`,
        'Surrogate-Control': 'public, max-age=31536000',
        'Surrogate-Key': `image ${path.split('/').pop()}`
      },
      body: Buffer.from(body).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to proxy image' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
