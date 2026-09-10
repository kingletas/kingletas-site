---
title: "PHP Offloading... Nginx helps so much!"
date: 2012-07-26T18:06:00.000-04:00
lastmod: 2012-07-26T18:08:54.643-04:00
url: /2012/07/php-offloading-nginx-helps-so-much.html
tags: []
---

So let's continue our attempt to improve Magento's performance and this time around let's focus on the web server itself.

There are a bunch of [web servers](http://en.wikipedia.org/wiki/Web_server) out there but the most known are, a least to me: [Apache](http://www.apache.org/), [Nginx](http://www.nginx.org/) and [Lighttpd](http://www.lighttpd.net/)

My favorite, and of course I am biased here, is Nginx and it approach to serving content. As you may all know Nginx is an event-based web server and the main advantage of this asynchronous approach is scalability.

Because at the end of the day what we are going to have is a complete static page (after it has been cached once) being served from the web server.

Apache is out of the question because nginx is faster at serving static files and consumes much less memory for concurrent requests. As Nginx is event-based it doesn't need to spawn new processes or threads for each request, so its memory usage is very low and that is the key.

We could use lighttpd (it's even more compatible with apache) but the cpu and memory fingerprint is bigger than nginx and we are all about performance aren't we?

So here are my recommended configurations for both Nginx and fast-cgi, of course suggestions are welcome:

```
server {
    listen 80 default;
    listen 443 default ssl;
    ssl_certificate /etc/pki/tls/certs/2014-www.example.com.pem;
    ssl_certificate_key /etc/pki/tls/certs/2014-www.example.com.pem;
    server_name www.example.com example.com; ## Domain is here twice so server_name_in_redirect will favour the www
    root /var/www/vhosts/example.com;
 
    location / {
        index index.html index.php;
        try_files $uri $uri/ @handler; 
        expires 30d; ## Assume all files are cachable
    }
 
    ## These locations would be hidden by .htaccess normally
    location /app/                { deny all; }
    location /includes/           { deny all; }
    location /lib/                { deny all; }
    location /media/downloadable/ { deny all; }
    location /pkginfo/            { deny all; }
    location /report/config.xml   { deny all; }
    location /var/                { deny all; }
 
#    location /var/export/ { 
#        auth_basic           "Restricted"; ## Message shown in login window
#        auth_basic_user_file htpasswd; ## See /etc/nginx/htpassword
#        autoindex            on;
#    }
 
    location  /. { ## Disable .htaccess and other hidden files
        return 404;
    }
 
    location @handler { ## Magento uses a common front handler
        rewrite / /index.php;
    }
 
    location ~ .php/ { ## Forward paths like /js/index.php/x.js to relevant handler
        rewrite ^(.*.php)/ $1 last;
    }
 
    location ~ .php$ { ## Execute PHP scripts
        if (!-e $request_filename) { rewrite / /index.php last; } ## Catch 404s that try_files miss
 
        expires        off; ## Do not cache dynamic content
 fastcgi_read_timeout 120;
 fastcgi_buffer_size 128k;
 fastcgi_buffers 4 256k;
 fastcgi_busy_buffers_size 256k;
        fastcgi_pass   unix:/var/run/php-fpm/php-fpm.sock;
        fastcgi_param  HTTPS $fastcgi_https;
        fastcgi_param  PHP_VALUE "memory_limit = 341M";
 fastcgi_param  PHP_VALUE "max_execution_time = 18000";
        fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
        fastcgi_param  MAGE_RUN_CODE default; ## Store code is defined in administration > Configuration > Manage Stores
        fastcgi_param  MAGE_RUN_TYPE store;
        #fastcgi_param  MAGE_IS_DEVELOPER_MODE true; //enable developer mode?
        include        fastcgi_params; ## See /etc/nginx/fastcgi_params
    }
}
```

```
; Start a new pool named 'www'.
[www]

listen = /var/run/php-fpm/php-fpm.sock
user = apache
group = apache
pm = dynamic
pm.max_children = 50
pm.start_servers = 5
pm.min_spare_servers = 5
pm.max_spare_servers = 50
pm.max_requests = 500

pm.status_path = /phpfpm-status
request_terminate_timeout = 5m
request_slowlog_timeout = 2m
slowlog = /var/log/php-fpm/www-slow.log

php_admin_value[error_log] = /var/log/php-fpm/www-error.log
php_admin_flag[log_errors] = on
```

Contents of /etc/nginx/fastcgi_params

```
fastcgi_param  QUERY_STRING       $query_string;
fastcgi_param  REQUEST_METHOD     $request_method;
fastcgi_param  CONTENT_TYPE       $content_type;
fastcgi_param  CONTENT_LENGTH     $content_length;

fastcgi_param  SCRIPT_NAME        $fastcgi_script_name;
fastcgi_param  REQUEST_URI        $request_uri;
fastcgi_param  DOCUMENT_URI       $document_uri;
fastcgi_param  DOCUMENT_ROOT      $document_root;
fastcgi_param  SERVER_PROTOCOL    $server_protocol;
fastcgi_param  HTTPS              $https if_not_empty;

fastcgi_param  GATEWAY_INTERFACE  CGI/1.1;
fastcgi_param  SERVER_SOFTWARE    nginx/$nginx_version;

fastcgi_param  REMOTE_ADDR        $remote_addr;
fastcgi_param  REMOTE_PORT        $remote_port;
fastcgi_param  SERVER_ADDR        $server_addr;
fastcgi_param  SERVER_PORT        $server_port;
fastcgi_param  SERVER_NAME        $server_name;

# PHP only, required if PHP was built with --enable-force-cgi-redirect
fastcgi_param  REDIRECT_STATUS    200;
```
