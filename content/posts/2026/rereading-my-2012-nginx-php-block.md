---
title: "Rereading my 2012 nginx config: the block that runs your uploads"
date: 2026-09-24
description: "The server block in my 2012 PHP-FPM post sends any .php file it can find to PHP, including one somebody uploaded. Its clever 404 line stops the older trick and not this one, and try_files doesn't either. An allow-list does."
tags: ["nginx", "php", "security", "magento"]
series: ["Rereading 2012"]
---

The [PHP-FPM reread](/posts/2026/rereading-my-2012-php-fpm-config/) ended on a promise. The same July 2012 post, [PHP Offloading... Nginx helps so much!](/2012/07/php-offloading-nginx-helps-so-much.html), hands over an nginx server block, and one location in it has a problem that has nothing to do with performance:

```nginx
location ~ .php$ { ## Execute PHP scripts
    if (!-e $request_filename) { rewrite / /index.php last; } ## Catch 404s that try_files miss
    ...
    fastcgi_pass   unix:/var/run/php-fpm/php-fpm.sock;
    fastcgi_param  SCRIPT_FILENAME  $document_root$fastcgi_script_name;
    ...
}
```

"Execute PHP scripts" is exactly what it does. Any request ending in `.php` goes to PHP-FPM, and PHP-FPM runs whatever file nginx names. Nobody asks whether that file was ever meant to be a script. So if somebody can get a `.php` file into a folder the web server serves, through an avatar upload, an import, a product image field that checks the extension a bit too loosely, that file runs.

## Trying it

The 2012 block went into a container as published, minus the FastCGI buffer tuning, in front of PHP-FPM 8.4. The web root held three files: a normal `index.php`, an `uploads/avatar.php` standing in for something a visitor put there, and an `uploads/cat.jpg` with PHP code inside it.

```text
/index.php               index.php ran                            [200]
/uploads/avatar.php      avatar.php, an uploaded file, just ran   [200]
/uploads/cat.jpg/x.php   index.php ran                            [200]
```

The middle line is the problem. An uploaded file executed.

The last line is the 2012 config being half right. `cat.jpg/x.php` is an older trick: with PHP's `cgi.fix_pathinfo` on, PHP walks a path backwards looking for a real file, and can end up running an image as PHP. Here, `cat.jpg/x.php` doesn't exist as a file, so the `if` line rewrote it to `index.php` and the image never ran. Current PHP-FPM also blocks it with `security.limit_extensions`, which by default allows only `.php` and `.phar`. So that attack is closed twice. The upload isn't closed at all.

## try_files doesn't fix it

The usual advice is to add `try_files $uri =404;` to the PHP location. Same three requests:

```text
/index.php               index.php ran                            [200]
/uploads/avatar.php      avatar.php, an uploaded file, just ran   [200]
/uploads/cat.jpg/x.php   404 Not Found                            [404]
```

It turns the path trick into a clean 404, which is nicer than the 2012 rewrite. The upload still runs, because `avatar.php` is a real file, and a real file is all `try_files` checks for.

## An allow-list does

What actually closes it is flipping the question from "is this a `.php` file?" to "is this one of the scripts I meant to run?". Name the real entry points, and refuse PHP everywhere else:

```nginx
location ~ ^/(index|health_check)\.php$ {
    try_files $uri =404;
    fastcgi_pass 127.0.0.1:9000;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
    include fastcgi_params;
}

location ~* \.(php|phtml)$ {
    deny all;
}
```

```text
/index.php               index.php ran                            [200]
/uploads/avatar.php      403 Forbidden                            [403]
/uploads/cat.jpg/x.php   403 Forbidden                            [403]
```

This is also what Magento 2 does in its own `nginx.conf.sample`. It lists `index`, `get`, `static`, the error pages and `health_check` as the only scripts PHP may run, and a later block denies `.php`, `.phtml`, `.htaccess`, `.htpasswd` and `.git` everywhere else. If your store's nginx config started life as a copy of something from 2012, that's the file to compare it against.

Two more things are worth doing either way. Keep uploads outside the web root if you can, and if you can't, serve them from a location that refuses scripts. And run `nginx -t` before every reload, because a reload with a broken config fails and leaves the old one running, so the change you think you made never went live.

That's the last of this series for now. There are eight more posts from 2011 and 2012 still on this blog, waiting their turn.
