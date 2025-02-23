// netlify/functions/imageProxy.js

exports.handler = async (event, context) => {
  try {
    // Parse the incoming URL
    const url = new URL(event.rawUrl);
    const path = decodeURIComponent(url.pathname);
    
    // Default to i0.wp.com for image paths
    let targetUrl = new URL('https://i0.wp.com');
    
    if (path.startsWith('/avatar')) {
      targetUrl.hostname = 'secure.gravatar.com';
      targetUrl.pathname = '/avatar' + path.replace('/avatar', '');
    } else if (path.startsWith('/comment')) {
      targetUrl.hostname = 'i0.wp.com';
      targetUrl.pathname = '/comment.bibica.net/static/images' + path.replace('/comment', '');
    } else {
      // Handle regular image paths
      targetUrl.hostname = 'i0.wp.com';
      targetUrl.pathname = '/bibica.net/wp-content/uploads' + path;
    }
    
    // Copy over any query parameters
    targetUrl.search = url.search;

    console.log('Proxying request to:', targetUrl.toString());

    const response = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': event.headers.accept || '*/*',
        'User-Agent': event.headers['user-agent'] || 'Netlify Function'
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream server responded with ${response.status}`);
    }

    const body = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/webp';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
        'X-Served-By': 'Netlify Functions & WordPress',
      },
      body: Buffer.from(body).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to proxy image' }),
      headers: {
        'Content-Type': 'application/json'
      }
    };
  }
};
