import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
  jsonLd?: any;
  price?: number;
  currency?: string;
  availability?: string; // 'in stock' | 'out of stock'
  canonical?: string;
  noindex?: boolean;
  exactTitle?: boolean;
  siteName?: string;
}

const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords, 
  image = "/favicon.ico", 
  url = typeof window !== 'undefined' ? window.location.href : '', 
  type = "website",
  jsonLd,
  price,
  currency = "BDT",
  availability,
  canonical,
  noindex = false,
  exactTitle = false,
  siteName
}) => {
  const fullTitle = exactTitle ? title : `${title} | DEEP SHOP`;
  const resolvedSiteName = siteName || (exactTitle ? 'Loops' : 'DEEP SHOP');
  const resolvedPath = canonical
    ? canonical.startsWith('http')
      ? canonical
      : `https://www.deepshop.top${canonical.startsWith('/') ? canonical : `/${canonical}`}`
    : typeof window !== 'undefined' && !noindex
      ? `https://www.deepshop.top${window.location.pathname}`
      : undefined;
  const resolvedUrl = url && url.startsWith('http')
    ? url
    : resolvedPath || (typeof window !== 'undefined' ? window.location.href : 'https://www.deepshop.top/');
  const resolvedImage = image && image.startsWith('http')
    ? image
    : `https://www.deepshop.top${image?.startsWith('/') ? image : `/${image || 'favicon.png'}`}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {!noindex && resolvedPath && <link rel="canonical" href={resolvedPath} />}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      )}

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={resolvedImage} />
      <meta property="og:url" content={resolvedUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={resolvedSiteName} />

      {price !== undefined && <meta property="product:price:amount" content={price.toString()} />}
      {price !== undefined && <meta property="product:price:currency" content={currency} />}
      {availability && <meta property="product:availability" content={availability} />}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={resolvedImage} />

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
