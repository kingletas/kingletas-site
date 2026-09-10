---
title: "Full Page cache with nginx and memcache"
date: 2012-08-01T12:32:00.000-04:00
lastmod: 2012-08-01T12:32:11.047-04:00
url: /2012/08/full-page-cache-with-nginx-and-memcache.html
tags: ["development", "magento", "performance"]
---

Since the cool kids at Google, Microsoft and Amazon researched how performance and scalability affect conversion rates, page load time has become the topic of every eCommerce store.

Magento was once a resource hog that consumated everything available to it and you had to be a magician to pull off some awesome benchmarks without using any reverse proxy or full page cache mechanism. Creating a full page cache with nginx and memcache is really simple (right after hours of research).

Words of warning first:

Don't use this instead of varnish or Magento's full page caching. This implemenation of full page cache is very simple, heck it will be even troublesome to clean the cache consistently because guess what, there is no holepunching but you could enhance the configuration file to read cookies and serve directly from the backend server instead.

Another problem is that you'll need to ensure that a TwoLevel caching is used to be able to flush specific urls.

Now that is out of the way, let's focus on the matter at hand.

I have tried this configuration file with both Magento enterprise and community and also with WordPress.

```
#memcache servers load balanced
upstream memcached {
        server     server_ip_1:11211 weight=5 max_fails=3  fail_timeout=30s;
        server     server_ip_2:11211 weight=3 max_fails=3  fail_timeout=30s;
        server    server_ip_3:11211;
 keepalive 1024 single;
}
#fastcgi - little load balancer
upstream phpbackend{
 server     server_ip_1:9000 weight=5 max_fails=5  fail_timeout=30s;
        server     server_ip_2:9000 weight=3 max_fails=3  fail_timeout=30s;
        server    server_ip_3:9000;
}
server {
    listen   80; ## listen for ipv4; this line is default and implied
    root /var/www/vhosts/kingletas.dev/www;
    server_name kingletas.dev;
    index index.php index.html index.htm;

    client_body_timeout  1460;
    client_header_timeout 1460;
    send_timeout 1460;
    client_max_body_size 10m;
    keepalive_timeout 1300;

    location /app/                { deny all; }
    location /includes/           { deny all; }
    location /lib/                { deny all; }
    location /media/downloadable/ { deny all; }
    location /pkginfo/            { deny all; }
    location /report/config.xml   { deny all; }
    location /var/                { deny all; }

   location ~* \.(jpg|png|gif|css|js|swf|flv|ico)$ {
     expires max;
     tcp_nodelay off;
     tcp_nopush on;
    }
    location / {
  
        try_files $uri $uri/ @handler;
        expires 30d;
    }
   location @handler {
 rewrite / /index.php;
    }

    location ~ \.php$ {
        if (!-e $request_filename) { 
            rewrite / /index.php last; 
        }  
        expires        off; ## Do not cache dynamic content
        default_type       text/html; charset utf-8;
        if ($request_method = GET) { # I know if statements are evil but don't know how else to do this
            set $memcached_key $request_uri; Catalog request modal 
            memcached_pass     memcached;
            error_page         404 502 = @cache_miss;
            add_header x-header-memcached true;
  }
  if ($request_method != GET) {
   fastcgi_pass phpbackend;
  }
    }
    location @cache_miss {
        # are we using a reverse proxy?
        proxy_set_header  X-Real-IP  $remote_addr;
        proxy_set_header  X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_max_temp_file_size 0;
        
        #configure fastcgi
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_send_timeout  5m;
        fastcgi_read_timeout 5m;
        fastcgi_connect_timeout 5m;
        fastcgi_buffer_size 256k;
        fastcgi_buffers 4 512k;
        fastcgi_busy_buffers_size 768k;
        fastcgi_param GEOIP_COUNTRY_CODE $geoip_country_code; 
        fastcgi_param GEOIP_COUNTRY_NAME $geoip_country_name; 
        fastcgi_param  PHP_VALUE "memory_limit = 32M";
        fastcgi_param  PHP_VALUE "max_execution_time = 18000";
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
    location ~ /\. {
  deny all;
 }
}
#if you want to make it even better your own cdn
#server {
#      listen 80; 
#      server_name media.kingletas.dev;
#      root /var/www/vhosts/kingletas.dev/www;
#}
#server {
#      listen 80; 
#      server_name css.kingletas.dev;
#      root /var/www/vhosts/kingletas.dev/www;
#}
#server {
#      listen 80; 
#      server_name js.kingletas.dev;
#      root /var/www/vhosts/kingletas.dev/www;
#}
```

One major topic to remember is that nginx will try to read from memory not write to it. In other words you still need to write the contents to memcache. For WordPress this is what I did in the index.php

```php
/**
* Front to the WordPress application. This file doesn't do anything, but loads
* wp-blog-header.php which does and tells WordPress to load the theme.
 *
* @package WordPress
 */

/**
* Tells WordPress to load the WordPress theme and output it.
 *
* @var bool
 */
ini_set("memcache.compress_threshold",4294967296); //2^32
ob_start();

define('WP_USE_THEMES', true);

/** Loads the WordPress Environment and Template */
require('./wp-blog-header.php');

$buffer = ob_get_contents();

ob_end_clean();

$memcache_obj = memcache_connect("localhost", 11211);
memcache_add($memcache_obj,$_SERVER['REQUEST_URI'],$buffer,0);

echo $buffer;
```

Notice that I had to change the memcache.compress_threshold setting to HUGE number, that is because memcache will ignore the no compress setting when this threshold is exceeded and compress the content, while this is good and dandy the results in the browser are not.

So there you have it an easy way to implement full page caching with nginx and memcache for WordPress or Magento and the rest of the framework world.
