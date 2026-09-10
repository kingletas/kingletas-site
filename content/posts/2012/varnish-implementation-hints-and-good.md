---
title: "Varnish implementation hints and good to know"
date: 2012-07-17T00:30:00.000-04:00
lastmod: 2012-07-17T00:30:17.412-04:00
url: /2012/07/varnish-implementation-hints-and-good.html
tags: ["development", "magento", "varnish"]
---

Sharing knowledge is always a good idea. Lately I have been doing lots of integration with Varnish and Magento with different clients and it will be interesting to find out if you have any ideas or suggestions (read improvements) to make it better and ultimately help the community even more:

## Setting up varnish in switch mode:

In my home directory I always have a bash aliases (vim ~/.bash_aliases) file where I add the following iptable rules:

```
alias ipforward='sysctl net.ipv4.ip_forward=1'
alias varnishon='iptables -t nat  -A PREROUTING -i eth0 -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 8888'
alias varnishmasq='iptables -t nat -A POSTROUTING -j MASQUERADE'
alias varnishoff='iptables -t nat -D PREROUTING -i eth0 -p tcp -m tcp --dport 80 -j REDIRECT --to-ports 8888'
alias varnishstatus='iptables -L -t nat | grep -q 8888; if [ "test$?" = "test0" ]; then echo "Varnish On"; else echo "Varnish Off"; fi'
```

This allows me to switch varnish on and off without changing the existing architecture. The best thing about this is that if something were to go wrong I can immediately turn varnish off and test the web server alone. Also internal routes won't go through varnish which let's me test side by side the pages and speeds.

## Setting up a varnish on flag:

When Implementing ESI, always set a variable to tell you whether varnish is on or not.

For instance on my varnish configuration file (/etc/varnish/default.vcl), at the very end I have:

```
   
/**
   * Set a flag for web store to check if varnish is on or not
   * Very important when doing switch on / off installations with ESI  
  **/

 set req.http.X-Varnish-On = 1;
```

```php
    if (isset($_SERVER['HTTP_X_VARNISH_ON'])): 
           <!--esi <esi:include src="<?php echo $this->getEsiUrl() " />-->
    else: 
           <?php  echo $this->getNormalContent() ?>
   endif;
```

I have it a the very because, all of the whitelist and passes have already been checked – so I am assure that the only pages left are “varnished” pages.

## Remove all the cookies

The only cookie value Magento requires is the frontend cookie:

```
//check that the cookie is still set
if (req.http.Cookie){

 set req.http.X-Cookie = ";" +req.http.Cookie;
 set req.http.X-Cookie = regsuball(req.http.X-Cookie, "; +", ";");
 set req.http.X-Cookie = regsuball(req.http.X-Cookie, ";(frontend)=", "; \1=");
 set req.http.X-Cookie = regsuball(req.http.X-Cookie, ";[^ ][^;]*", "");
 set req.http.X-Cookie = regsuball(req.http.X-Cookie, "^[; ]+|[; ]+$", "");
}

// Remove cookies
unset req.http.Cookie;
```

Then assuming you only have the x-cookie set for the frontend, in your php before the headers are sent:

```php
$_frontend = isset ($_SERVER['HTTP_X_COOKIE']) ? $_SERVER['HTTP_X_COOKIE'] : null;
if ($_frontend){
    list ($name,$value) = explode("=",$_frontend);
    $_COOKIE[$name] = $value; //setCookie didn't work for me here
}
```

## Clear Cms / Product / Category pages

Update the content frequently? When you save a cms page, product or category page simply hear the corresponding event and “purge” or “refresh” that URL. The important thing to remember is that if you can: 1-) use cURL in BASH over PHP's cURL and 2-) when clearing the product URLs you also need to clean the categories as well.

In the terminal you could do:

```
curl -X PURGE URL_TO_CLEAN
```

## Clear / Refresh all pages

A favorite of mine – when finding all of the URLs in the system, use Magento's sitemap resource collections:

```php
    //get all the url rewrites urls and cms pages (including the home page)
    public function getAllUrls() {

        $collections = array('sitemap/catalog_category', 'sitemap/catalog_product', 'sitemap/cms_page');

        $baseUrl = Mage::app()->getStore()->getBaseUrl();
        $storeId = Mage::app()->getStore()->getId();
        $urls = array();

        foreach ($collections as $collection) {
            $collection = Mage::getResourceModel($collection)->getCollection($storeId);
            $key = md5(serialize($collection));
            if ($data = $this->getDataFromCache($key)) {
                $urls = array_merge($urls, $data);
            } else {
                foreach ($collection as $url) {
                    $urls[] = htmlspecialchars($baseUrl . $url->getUrl());
                }
                $this->setKey($key)
                        ->setData($urls)
                        ->saveDataInCache();
            }
            unset($collection);
        }

        $urls = array_merge($urls, $this->getSearchUrls());
        //account for the homepage 
        $urls[] = $baseUrl;

        return $urls;
    }
     public function getSearchUrls() {
        $urls = array();
        $collection = Mage::getResourceModel('catalogsearch/query_collection')
                ->setPopularQueryFilter(Mage::app()->getStore()->getId())
                ->setOrder('popularity', 'DESC');

        $catalogSearchHelper = Mage::helper('catalogsearch');
        foreach ($collection as $search) {
            $urls[] = $catalogSearchHelper->getResultUrl($search->getData('name'));
        }

        return $urls;
    }
```

Please note that I use some extra functions here: setKey, setData, saveDataInCache & getDataFromCache. Ultimately is all about performance and I rely on Magento's cache to save the collection of urls.

That will get you all of Magento URLs that your system might be caching.

Now you could iterate that array and either refresh or purge varnish's cache
