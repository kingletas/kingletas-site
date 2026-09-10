---
title: "PHP offloading for better performance"
date: 2012-07-24T22:19:00.000-04:00
lastmod: 2012-07-26T18:09:21.319-04:00
url: /2012/07/php-offloading-for-better-performance.html
tags: ["development", "magento", "performance", "system administration", "varnish"]
---

So you recently launched your PHP application (read [Magento](http://www.magentocommerce.com/)) just to realize that it is really slow even though you have state of the art hardware, software and it is configured to kick ass. You decided to install [varnish](https://www.varnish-cache.org/) to help full page caching and your CDN, which it only has gzipped merged and minified assets,  to serve content faster now your site seems to be flying but [New Relic](http://newrelic.com/) still reveals so many bottlenecks specially for the fillers you needed to keep some dynamic content rocking.

You decide to run promotion that would bring 20K plus customers and decided to add more servers, virtual machines and the cloud can be so awesome. Soon to realize that your site is now really slow specially when checking out and some time later your site is DOWN!!! WHY!?!!!

Because your reverse proxy is not serving all of the customers let alone is not serving the whole content from cache as it has to fetch some from the server, more on this later. So believe it or not, your server is still getting hammered and might be even worse than before.

Reverse proxies are really awesome but if applied to a inefficient application, it will come back to hunt you and be your worst nightmare.

Caching is supposed to be good but nowadays it has become the best way to hide all of the snafus and foobars in the application.

So what is the problem? For once almost everyone does development one way through the programming language they know and rarely, if any, venture or dare to think of a possible world outside of that realm. Aside from the copy paste dogma of course.

One problem is that most people tend to try to keep the dynamic content in the page through a hybrid combination of fresh content (retrieved from the server) and cached content. Most caching systems have developed sophisticated algorithm to make it work which adds a new layer of complexity.

Let's go back to your PHP application, one of the areas that usually needs to be hole-punched is the header because it contains the cart widget, the account (log-in or out) and wishlist links. But do we really need to hole-punched it? Nop!

**PHP offloading is a very useful technique to improve performance**, it refers to efficently distribute the workload among all the servers or other programming languages in the sytem. Also known as Operation Driven Development (ODD) where the type of operation dictates in which server or programming language the task it will take place.

So let's take the cart widget and see how we could do it without having to even think about hole-punching:

Every time an operation that involves the cart object takes place, this one gets saved. This means when you remove, add or update an item in your shopping cart you get this event **checkout_cart_save_after** so why don't we create a cookie that contains off all the items information?

Snippets below, I assume you do Magento development:

In your module etc/config.xml add:

```xml
 <frontend>
        <events>
            <checkout_cart_save_after>
                <observers>
                    <po_checkout_cart_save_after>
                        <class>phpoffloading/observer</class>
                        <method>cartUpdate</method>
                    </po_checkout_cart_save_after>
                </observers>
            </checkout_cart_save_after>
        </events>
        <layout>
            <updates>
                <phpoffloading module="Php_Offloading">
                    <file>phpoffloading.xml</file>
                
            </phpoffloading></updates>
        </layout>
    </frontend>
```

Replace phpoffloading with the name of your model class.

Now in your observer add:

```php
    /**
     * Process all the cart / quote updates to ensure we update the cookie correctly
     * @param type $observer 
     */
    public function cartUpdate($observer) {
        // using singleton instead of the event to use the same function for different events
        $cart = Mage::getSingleton('checkout/cart');
        $quote = $cart->getQuote();

        /**
         * @var $totals needed for the subtotal 
         */
        $totals = $quote->getTotals();
        /**
         * @var $checkouthelper used for translation and price formatting 
         */
        $checkoutHelper = Mage::helper('checkout');
        $items = (int) $cart->getSummaryQty();
        if ($items > 0) {
            $cartInfo = array(
                'subtotal' => $checkoutHelper->formatPrice($totals['subtotal']->getValue()),
                'items' => $items,
                'itemsmsg' => $items == 1 ? "item" : "items",
                'viewcart' => $checkoutHelper->__('View Cart')
            );
            $cartInfo = json_encode($cartInfo);
             $this->setCookie('cart_cookie', $cartInfo);
        } else {
            $this->deleteCartCookie();
        }
        return $this;
    }
```

In your template:

```html
<div id="template_container">
<div class="top-cart">
<div id="cart_items_container">
<div class="cart-contents">
</div>
<div class="cart-action">
<button class="button" onclick="setLocation('<?php echo $this->getUrl('checkout/cart'); ?>')" type="button"><span id="viewcart"></span></button>
            </div>
</div>
<div class="empty" id="empty_message">
You have no items in your cart.</div>
</div>
</div>
```

You can have this javascript either on the same template or add it as an external file:

```javascript
<script type="text/javascript">
    //set the variables
    var cartCookie = Mage.Cookies.get('cart_cookie') 
    var emptyMessage = $("empty_message")
    var cartContainer = $("cart_items_container")
    
    if (!cartCookie){
        emptyMessage.show()
        cartContainer.hide()
    }
    else{
        //parse the json response, is this the fastest way?
        cartCookie = cartCookie.evalJSON(true);
        
        //update the html
        $('cart_total').update(cartCookie.subtotal)
        $('viewcart').update(cartCookie.viewcart.replace("+"," "))
        $('cart_amount').update(cartCookie.items +" " + cartCookie.itemsmsg + ":")
        emptyMessage.hide()
        cartContainer.show()
    }    
</script>
```

Every time a page gets loaded now instead of going to the server the content will remain in the browser and you don't need to request content from the server again. This is a very small change how much improvement do I get? Say you go from 750ms to 2ms in the server response time what would you say? This is because varnish 1-) doesn't need to understand what ESI is and 2-) all of the content is served from cache. This doesn't apply solely to varnish but to Magento's own full page caching solution.

This approach works fine for: wishlist, logged in/out but it doesn't work quite well with recently viewed items. For that we'll do a follow up article.
