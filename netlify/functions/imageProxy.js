const fetch = require('node-fetch'); // Yêu cầu thêm thư viện node-fetch

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

  // Tìm quy tắc phù hợp với đường dẫn
  const rule = Object.entries(rules).find(([prefix]) => url.pathname.startsWith(prefix));

  if (!rule) {
    return {
      statusCode: 404,
      body: `Path not supported: ${url.pathname}`
    };
  }

  const [prefix, config] = rule;
  const targetUrl = new URL(event.rawUrl);

  // Cập nhật hostname và pathname dựa trên quy tắc
  targetUrl.hostname = config.targetHost;
  targetUrl.pathname = config.pathTransform(url.pathname, prefix);
  targetUrl.search = url.search;

  try {
    // Gửi yêu cầu đến máy chủ đích
    const response = await fetch(targetUrl.toString(), {
      headers: {
        'Accept': event.headers.accept || '*/*'
      }
    });

    // Kiểm tra phản hồi từ máy chủ đích
    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Error from target server: ${response.statusText}`
      };
    }

    // Đọc dữ liệu hình ảnh dưới dạng ArrayBuffer
    const body = await response.arrayBuffer();

    // Trả về phản hồi với dữ liệu hình ảnh
    return {
      statusCode: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/webp',
        'Link': response.headers.get('link'),
        'X-Cache': response.headers.get('x-nc'),
        'X-Served-By': `Netlify Functions & ${config.service}`
      },
      body: Buffer.from(body).toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    // Xử lý lỗi nếu có
    return {
      statusCode: 500,
      body: `Error fetching image: ${error.message}`
    };
  }
};
