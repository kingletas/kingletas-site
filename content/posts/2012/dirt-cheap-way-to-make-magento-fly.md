---
title: "Dirt cheap way to make magento fly"
date: 2012-07-27T16:47:00.001-04:00
lastmod: 2012-07-27T16:59:58.134-04:00
url: /2012/07/dirt-cheap-way-to-make-magento-fly.html
tags: ["development", "magento", "performance", "system administration"]
---

There are several ways to accomplish the same task and some are more elegant than others.

This one makes any Magento community edition fly and is cheap and quick (read no Magento compliant - because it modifies the templates)

In other words while this trick can help you boost your Magento store server response I am not too proud of it.

Why is that a big deal? I am not a huge fan or changing templates, even if they are "allowed".

But let's forget about that and get down to business

Your actual cache helper class

```php
class Performance_CacheHelper_Helper_Data extends Mage_Core_Helper_Data {

    //###########################################
    //Cache related functions and variables
    //###########################################
    /**
     * cache key
     * @var string|mixed 
     */
    protected $key;

    /**
     *
     * @var Mage_Core_Model_Cache 
     */
    protected $_cache;

    /**
     * data container
     * @var string|mixed 
     */
    protected $data;
    protected $tags = array(__CLASS__);

    public function canUseCache() {
        //verify if the cache is enabled
        return Mage::app()->useCache('block_html');
    }

    /**
     * Gets the cache object
     * @return Mage_Core_Model_Cache 
     */
    protected function _getCacheObject() {
        if (!$this->_cache) {
            $this->_cache = Mage::app()->getCache();
        }
        return $this->_cache;
    }

    public function getData() {
        return $this->data;
    }

    public function setData($data) {
        $this->data = $data;

        return $this;
    }

    public function getKey() {
        return $this->key;
    }

    public function setKey($key) {
        $this->key = $key;
        return $this;
    }

    /**
     * saves data in a serialize format to cache under the name of this class if the cache can be used
     * @return Performance_CacheHelper_Helper_Data 
     */
    public function saveDataInCache() {
        if ($this->canUseCache()) {
            $cookie = Mage::getModel('core/cookie');
            $this->_getCacheObject()->save(
                    serialize($this->data), $this->key, $this->tags, $cookie->getLifetime());
        }
        return $this;
    }

    /**
     *
     * @param string $key
     * @return mixed
     */
    public function getDataFromCache($key) {
        $this->key = $key;
        return $this->_getCachedData();
    }

    /**
     * gets the data saved in cache, if it finds it then it unserializes itF
     * @param string|mixed $key
     * @return bool | string
     */
    protected function _getCachedData($key = null) {
        if ($key !== null) {
            $this->key = $key;
        }
        /**
         * clear the data variable 
         */
        $this->data = false;
        //ensure cache can be used
        if ($data = $this->_getCacheObject()->load($this->key)) {
            $this->data = unserialize($data);
        }
        return $this->data;
    }

}
```

In your current template:

```php
                
         //this code has been modified so the highligthing works right                   
        $helper = Mage::helper('cachehelper');
        $cachingEnabled = array('catalog');
        $key = md5(Mage::helper('core/url')->getCurrentUrl());
        $currentModule = Mage::app()->getRequest()->getModuleName();
        if (in_array($currentModule, $cachingEnabled)){
         if ($content = $helper->getDataFromCache($key)){
         //nothing do $content now has the data
         }else{
             $content = $this->getChildHtml('content');
             $helper->setKey($key)->setData($content)->saveDataInCache();
            
        }else{
         $content = $this->getChildHtml('content');
        }
```

```html
  <div class="col-main"><? echo $content; ?></div>
```

siege -t1m -c5 -b -d -i http://mage.dev/apparel

**Examples with File Based cache**

**Without the "dirt cheap trick"**

| Transactions: | 324 hits |
|---|---|
| Availability: | 100.00 % |
| Elapsed time: | 59.94 secs |
| Data transferred: | 2.13 MB |
| Response time: | 0.92 secs |
| Transaction rate: | 5.41 trans/sec |
| Throughput: | 0.04 MB/sec |
| Concurrency: | 4.95 |
| Successful transactions: | 324 |
| Failed transactions: | 0 |
| Longest transaction: | 2.32 |
| Shortest transaction: | 0.63 |

**With the "dirt cheap trick"**

| Transactions: | 475 hits |
|---|---|
| Availability: | 100.00 % |
| Elapsed time: | 59.56 secs |
| Data transferred: | 3.14 MB |
| Response time: | 0.62 secs |
| Transaction rate: | 7.98 trans/sec |
| Throughput: | 0.05 MB/sec |
| Concurrency: | 4.97 |
| Successful transactions: | 475 |
| Failed transactions: | 0 |
| Longest transaction: | 1.45 |
| Shortest transaction: | 0.37 |

**Examples with memcache**

**Without the "dirt cheap trick"**

| Transactions: | 329 hits |
|---|---|
| Availability: | 100.00 % |
| Elapsed time: | 59.65 secs |
| Data transferred: | 2.17 MB |
| Response time: | 0.90 secs |
| Transaction rate: | 5.52 trans/sec |
| Throughput: | 0.04 MB/sec |
| Concurrency: | 4.95 |
| Successful transactions: | 329 |
| Failed transactions: | 0 |
| Longest transaction: | 1.60 |
| Shortest transaction: | 0.68 |

**With the "dirt cheap trick"**

| Transactions: | 507 hits |
|---|---|
| Availability: | 100.00 % |
| Elapsed time: | 59.47 secs |
| Data transferred: | 3.35 MB |
| Response time: | 0.58 secs |
| Transaction rate: | 8.53 trans/sec |
| Throughput: | 0.06 MB/sec |
| Concurrency: | 4.97 |
| Successful transactions: | 507 |
| Failed transactions: | 0 |
| Longest transaction: | 1.91 |
| Shortest transaction: | 0.40 |

Pretty awesome right?
Don't think siege is a good testing tool and this is not  a good indication? What about jmeter?

Here is the test plan I used:

```xml
      <?xml version="1.0" encoding="UTF-8"?>
      <jmeterTestPlan version="1.2" properties="2.1">
         <hashTree>
            <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Test Plan" enabled="true">
               <stringProp name="TestPlan.comments"></stringProp>
               <boolProp name="TestPlan.functional_mode">false</boolProp>
               <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
               <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
                  <collectionProp name="Arguments.arguments" />
               </elementProp>
               <stringProp name="TestPlan.user_define_classpath"></stringProp>
            </TestPlan>
            <hashTree>
               <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Thread Group" enabled="true">
                  <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" testname="Loop Controller" enabled="true">
                     <boolProp name="LoopController.continue_forever">false</boolProp>
                     <stringProp name="LoopController.loops">1</stringProp>
                  </elementProp>
                  <stringProp name="ThreadGroup.num_threads">10</stringProp>
                  <stringProp name="ThreadGroup.ramp_time">1</stringProp>
                  <longProp name="ThreadGroup.start_time">1340804136000</longProp>
                  <longProp name="ThreadGroup.end_time">1340804136000</longProp>
                  <boolProp name="ThreadGroup.scheduler">false</boolProp>
                  <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
                  <stringProp name="ThreadGroup.duration"></stringProp>
                  <stringProp name="ThreadGroup.delay"></stringProp>
               </ThreadGroup>
               <hashTree>
                  <HTTPSampler guiclass="HttpTestSampleGui" testclass="HTTPSampler" testname="/apparel" enabled="true">
                     <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" enabled="true">
                        <collectionProp name="Arguments.arguments" />
                     </elementProp>
                     <stringProp name="HTTPSampler.domain">mage.dev</stringProp>
                     <stringProp name="HTTPSampler.port"></stringProp>
                     <stringProp name="HTTPSampler.connect_timeout"></stringProp>
                     <stringProp name="HTTPSampler.response_timeout"></stringProp>
                     <stringProp name="HTTPSampler.protocol"></stringProp>
                     <stringProp name="HTTPSampler.contentEncoding"></stringProp>
                     <stringProp name="HTTPSampler.path">/apparel</stringProp>
                     <stringProp name="HTTPSampler.method">GET</stringProp>
                     <boolProp name="HTTPSampler.follow_redirects">false</boolProp>
                     <boolProp name="HTTPSampler.auto_redirects">true</boolProp>
                     <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
                     <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
                     <stringProp name="HTTPSampler.FILE_NAME"></stringProp>
                     <stringProp name="HTTPSampler.FILE_FIELD"></stringProp>
                     <stringProp name="HTTPSampler.mimetype"></stringProp>
                     <boolProp name="HTTPSampler.monitor">false</boolProp>
                     <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
                  </HTTPSampler>
                  <hashTree>
                     <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">
                        <collectionProp name="HeaderManager.headers">
                           <elementProp name="Accept-Language" elementType="Header">
                              <stringProp name="Header.name">Accept-Language</stringProp>
                              <stringProp name="Header.value">en-us,en;q=0.5</stringProp>
                           </elementProp>
                           <elementProp name="Accept" elementType="Header">
                              <stringProp name="Header.name">Accept</stringProp>
                              <stringProp name="Header.value">text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8</stringProp>
                           </elementProp>
                           <elementProp name="User-Agent" elementType="Header">
                              <stringProp name="Header.name">User-Agent</stringProp>
                              <stringProp name="Header.value">Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:13.0) Gecko/20100101 Firefox/13.0.1</stringProp>
                           </elementProp>
                           <elementProp name="Accept-Encoding" elementType="Header">
                              <stringProp name="Header.name">Accept-Encoding</stringProp>
                              <stringProp name="Header.value">gzip, deflate</stringProp>
                           </elementProp>
                        </collectionProp>
                     </HeaderManager>
                     <hashTree />
                  </hashTree>
                  <HTTPSampler guiclass="HttpTestSampleGui" testclass="HTTPSampler" testname="/furniture/living-room" enabled="true">
                     <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" enabled="true">
                        <collectionProp name="Arguments.arguments" />
                     </elementProp>
                     <stringProp name="HTTPSampler.domain">mage.dev</stringProp>
                     <stringProp name="HTTPSampler.port"></stringProp>
                     <stringProp name="HTTPSampler.connect_timeout"></stringProp>
                     <stringProp name="HTTPSampler.response_timeout"></stringProp>
                     <stringProp name="HTTPSampler.protocol"></stringProp>
                     <stringProp name="HTTPSampler.contentEncoding"></stringProp>
                     <stringProp name="HTTPSampler.path">/furniture/living-room</stringProp>
                     <stringProp name="HTTPSampler.method">GET</stringProp>
                     <boolProp name="HTTPSampler.follow_redirects">false</boolProp>
                     <boolProp name="HTTPSampler.auto_redirects">true</boolProp>
                     <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
                     <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
                     <stringProp name="HTTPSampler.FILE_NAME"></stringProp>
                     <stringProp name="HTTPSampler.FILE_FIELD"></stringProp>
                     <stringProp name="HTTPSampler.mimetype"></stringProp>
                     <boolProp name="HTTPSampler.monitor">false</boolProp>
                     <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
                  </HTTPSampler>
                  <hashTree>
                     <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">
                        <collectionProp name="HeaderManager.headers">
                           <elementProp name="Accept-Language" elementType="Header">
                              <stringProp name="Header.name">Accept-Language</stringProp>
                              <stringProp name="Header.value">en-us,en;q=0.5</stringProp>
                           </elementProp>
                           <elementProp name="Accept" elementType="Header">
                              <stringProp name="Header.name">Accept</stringProp>
                              <stringProp name="Header.value">text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8</stringProp>
                           </elementProp>
                           <elementProp name="User-Agent" elementType="Header">
                              <stringProp name="Header.name">User-Agent</stringProp>
                              <stringProp name="Header.value">Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:13.0) Gecko/20100101 Firefox/13.0.1</stringProp>
                           </elementProp>
                           <elementProp name="Accept-Encoding" elementType="Header">
                              <stringProp name="Header.name">Accept-Encoding</stringProp>
                              <stringProp name="Header.value">gzip, deflate</stringProp>
                           </elementProp>
                        </collectionProp>
                     </HeaderManager>
                     <hashTree />
                  </hashTree>
                  <HTTPSampler guiclass="HttpTestSampleGui" testclass="HTTPSampler" testname="/furniture/bedroom" enabled="true">
                     <elementProp name="HTTPsampler.Arguments" elementType="Arguments" guiclass="HTTPArgumentsPanel" testclass="Arguments" enabled="true">
                        <collectionProp name="Arguments.arguments" />
                     </elementProp>
                     <stringProp name="HTTPSampler.domain">mage.dev</stringProp>
                     <stringProp name="HTTPSampler.port"></stringProp>
                     <stringProp name="HTTPSampler.connect_timeout"></stringProp>
                     <stringProp name="HTTPSampler.response_timeout"></stringProp>
                     <stringProp name="HTTPSampler.protocol"></stringProp>
                     <stringProp name="HTTPSampler.contentEncoding"></stringProp>
                     <stringProp name="HTTPSampler.path">/furniture/bedroom</stringProp>
                     <stringProp name="HTTPSampler.method">GET</stringProp>
                     <boolProp name="HTTPSampler.follow_redirects">false</boolProp>
                     <boolProp name="HTTPSampler.auto_redirects">true</boolProp>
                     <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
                     <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
                     <stringProp name="HTTPSampler.FILE_NAME"></stringProp>
                     <stringProp name="HTTPSampler.FILE_FIELD"></stringProp>
                     <stringProp name="HTTPSampler.mimetype"></stringProp>
                     <boolProp name="HTTPSampler.monitor">false</boolProp>
                     <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
                  </HTTPSampler>
                  <hashTree>
                     <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager" enabled="true">
                        <collectionProp name="HeaderManager.headers">
                           <elementProp name="Accept-Language" elementType="Header">
                              <stringProp name="Header.name">Accept-Language</stringProp>
                              <stringProp name="Header.value">en-us,en;q=0.5</stringProp>
                           </elementProp>
                           <elementProp name="Accept" elementType="Header">
                              <stringProp name="Header.name">Accept</stringProp>
                              <stringProp name="Header.value">text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8</stringProp>
                           </elementProp>
                           <elementProp name="User-Agent" elementType="Header">
                              <stringProp name="Header.name">User-Agent</stringProp>
                              <stringProp name="Header.value">Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:13.0) Gecko/20100101 Firefox/13.0.1</stringProp>
                           </elementProp>
                           <elementProp name="Accept-Encoding" elementType="Header">
                              <stringProp name="Header.name">Accept-Encoding</stringProp>
                              <stringProp name="Header.value">gzip, deflate</stringProp>
                           </elementProp>
                        </collectionProp>
                     </HeaderManager>
                     <hashTree />
                  </hashTree>
               </hashTree>
               <ResultCollector guiclass="SummaryReport" testclass="ResultCollector" testname="Summary Report" enabled="true">
                  <boolProp name="ResultCollector.error_logging">false</boolProp>
                  <objProp>
                     <name>saveConfig</name>
                     <value class="SampleSaveConfiguration">
                        <time>true</time>
                        <latency>true</latency>
                        <timestamp>true</timestamp>
                        <success>true</success>
                        <label>true</label>
                        <code>true</code>
                        <message>true</message>
                        <threadName>true</threadName>
                        <dataType>true</dataType>
                        <encoding>false</encoding>
                        <assertions>true</assertions>
                        <subresults>true</subresults>
                        <responseData>false</responseData>
                        <samplerData>false</samplerData>
                        <xml>true</xml>
                        <fieldNames>false</fieldNames>
                        <responseHeaders>false</responseHeaders>
                        <requestHeaders>false</requestHeaders>
                        <responseDataOnError>false</responseDataOnError>
                        <saveAssertionResultsFailureMessage>false</saveAssertionResultsFailureMessage>
                        <assertionsResultsToSave>0</assertionsResultsToSave>
                        <bytes>true</bytes>
                     </value>
                  </objProp>
                  <stringProp name="filename"></stringProp>
               </ResultCollector>
               <hashTree />
            </hashTree>
         </hashTree>
      </jmeterTestPlan>
      
```

Here are the results, sorry about the formatting:

**Without the "dirt cheap trick"**

| sampler_label | aggregate_report_count | average | aggregate_report_min | aggregate_report_max | aggregate_report_stddev | aggregate_report_error% | aggregate_report_rate | aggregate_report_bandwidth | average_bytes |
|---|---|---|---|---|---|---|---|---|---|
| /apparel | 10 | 1710 | 1274 | 2180 | 290.2423125597 | 0 | 4.5724737083 | 199.8358553384 | 44753 |
| /furniture/living-room | 10 | 896 | 618 | 1272 | 254.8664159908 | 0 | 7.5757575758 | 227.1173650568 | 30699 |
| /furniture/bedroom | 10 | 747 | 565 | 953 | 137.6 | 0 | 7.3637702504 | 204.8623895434 | 28488 |
| TOTAL | 30 | 1117 | 565 | 2180 | 484.8805133455 | 0 | 7.2904009721 | 246.6680589307 | 34646.6666666667 |

**With the "dirt cheap trick"**

| sampler_label | aggregate_report_count | average | aggregate_report_min | aggregate_report_max | aggregate_report_stddev | aggregate_report_error% | aggregate_report_rate | aggregate_report_bandwidth | average_bytes |
|---|---|---|---|---|---|---|---|---|---|
| /apparel | 10 | 675 | 434 | 904 | 147.3737086457 | 0 | 6.1199510404 | 268.3156269125 | 44895 |
| /furniture/living-room | 10 | 741 | 581 | 950 | 107.7506844526 | 0 | 5.4436581383 | 164.0678160724 | 30862.6 |
| /furniture/bedroom | 10 | 631 | 389 | 827 | 157.5221889132 | 0 | 7.3691967576 | 206.1388863301 | 28644.4 |
| TOTAL | 30 | 682 | 389 | 950 | 146.3524057427 | 0 | 10.8577633008 | 369.0013685306 | 34800.6666666667 |

As you can see this is trick helps a lot but it doesn't compete with Magento's FPC or Varnish and it still needs lots of polishing. The good think is that is doesn't require holepunching or lots of Magento knowledge.
Now a few pointers... this is not the full implementation, as this code doesn't work with load balancers and there is not a way to clear it here. But implementing both is trivial.
