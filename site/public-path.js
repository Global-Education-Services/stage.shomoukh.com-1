// Pages are served without their .html extension (/book-a-visit, not /book-a-visit.html).
export const publicPath = url => url.replace(/^\/index\.html(?=$|#)/, '/').replace(/^(\/[a-z0-9/_-]+)\.html(?=$|#)/i, '$1');
