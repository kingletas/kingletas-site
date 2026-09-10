---
title: "Magento 301 Redirects"
date: 2011-02-11T09:10:00.000-05:00
lastmod: 2012-07-28T23:23:13.934-04:00
url: /2011/02/magento-301-redirects.html
tags: ["development", "magento", "web", "zend framework"]
---

Did you ever want to create a redirect in a Magento Store without having to use htacess?

Using Observers and the powerful Request and Response objects from Zend Framework you can. In this example I will show how you can do it.

First you need to create the module, more on module creations here: http://goo.gl/vvT2j.

Create a directory under app/code/community and name it FooBar, then create another directory under FooBar and name it Redirect. Create two directories inside FooBar: etc and Model.

Inside etc create a config.xml file and paste this into it:

Note: For some reason blogger keeps putting all tags in lowercase, foobar_redirect should be FooBar_Redirect.

```xml
<config>
    <modules>
        <FooBar_Redirect>
            <version>0.1</version>
        </FooBar_Redirect>
    </modules>
    <global>        
        <models>
            <fooredirect>
                <class>FooBar_Redirect_Model</class>
            </fooredirect>
        </models>
        <events> 
            <controller_action_predispatch>
                <observers>
                    <fooredirect>
                        <type>singleton</type>
                        <class>fooredirect/observer</class>
                        <method>redirect</method>
                    </fooredirect>
                </observers>
            </controller_action_predispatch> 
        </events>
    </global>
</config>
```

Now in the Model directory create the Observer.php file and paste this into it:

```php
class FooBar_Redirect_Model_Observer
{
 /**
  * @var array
  */ 
    protected $blacklist = array('checkout');
 /**
  * Takes a request and redirects it a new url based on some params
  */ 
    public function redirect()
    {
        try
        {
            //Let's get the Request object
            $request = Mage::app()->getRequest();
            //We only want to redirect in the frontend and exclude the checkout 
            $storeId = Mage::app()->getStore()->getId();
            if(!in_array($request->getModuleName(), $this->blacklist) &&  $storeId != 0)
            {
                $response = Mage::app()->getResponse();

                $uri = $request->getServer("REQUEST_URI"); //requested url
                $temp = strtolower($uri); //lowercase version

                if(strcmp($uri, $temp) != 0) //if the url are different then redirect
                {
                     /**
                      * Dont need to do this but let's get fancy here 
                      */ 
                    $parsedUrl = parse_url(Mage::getBaseUrl());
                    $scheme = $parsedUrl['scheme'];
                    $host = $parsedUrl['host'];
                    $path = $parsedUrl['path'];
                     //build the url
                    $url = $scheme . '://' . $host . $temp;
                    /**
                     * return the response, note the sendHeaders() method
                     * If you don't add it Magento [Zend_Framework] won't redirect you
                     */ 
                    return $response->setRedirect($url, 301)->sendHeaders();
                }
            }
        }
        catch(Exception $e)
        {
            Mage::logException($e);
        }
    }
}
```

Let's enable this module, create an xml file under app/etc/modules and name it FooBar_Redirect.xml and add this to it:

```xml
<config>
    <modules>
        <FooBar_Redirect>
            <active>true</active>
            <codepool>community</codePool>
        </FooBar_Redirect>
    </modules>
</config>
```

Now just clear Magento's cache and simply visit your site. If you type http://mysite_url.com/UpperUrl you should be redirected to http://mysite_url.com/upperurl.

Now imagine what you can do with this when you have to create a 301 redirect for an entire site, isn't this easier than creating an htacces rule for each url?
